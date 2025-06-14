import pickle

from datetime import datetime

from tamalou.game_state import GameState, RoundState, STATE, POWER
from tamalou.entities import Player
from tamalou.socket_manager import Event


CARD_HIDE = 13


class GameManager(Event):
    def __init__(self, socket):
        Event.__init__(self, socket)
        self.game_state = dict()
        self.players_ws = dict()
        self.players_id = dict()
        self.players_auth_id = dict()

        self.load()

    def save(self):
        with open('save', 'wb') as file:
            raw = (
                tuple(Player.dump(p) for p in self.players_auth_id.values()),
                tuple(GameState.dump(g) for g in self.game_state.values())
            )
            pickle.dump(raw, file)

        print(f'[{datetime.now()}] Server save')

    def load(self):
        try:
            with open('save', 'rb') as file:
                players, games = pickle.load(file)

                if players:
                    self.players_auth_id = {p[0]: Player.load(*p) for p in players}
                if games:
                    self.game_state = {g[0]: GameState.load(*g) for g in games}

        except FileNotFoundError: pass

    async def players_state_update(self, game_id, ws = None):
        game = self.game_state.get(game_id)
        
        if game is not None:
            if game.current is None:
                launcher_index = len(game.history) % len(game.players_auth_ids)
            else:
                launcher_index = -1

            players = [self.players_auth_id[auth_id] for auth_id in game.players_auth_ids]
            data = [{
                'id': p.id,
                'name': p.name,
                'connected': p.ws is not None and p.game_id == game.id,
                'launcher': launcher_index == i
            } for i, p in enumerate(players)]

            await self.socket.emit(ws or [p.ws for p in players if p.game_id == game.id], 'players', data)

    async def game_list_update(self, ws = None):
        game_list = [gs.get_infos() for gs in self.game_state.values() if gs.result is None]

        await self.socket.emit(ws or [pws for pws, p in self.players_ws.items() if p.game_id is None], 'gameList', game_list)

    async def game_state_update(self, game_id, ws = None, players_visible = False):
        game = self.game_state.get(game_id)

        if game is not None:

            if game.result is not None:
                await self.scores(game.id)
                return

            if game.current is None: return
            
            if ws is None:
                auth_ids = [auth_id for auth_id in game.players_auth_ids if self.players_auth_id[auth_id].game_id == game.id]
            else:
                auth_ids = [self.players_ws[ws].auth_id]
                
            count = game.current.counter

            for auth_id in auth_ids:

                player_ws = self.players_auth_id[auth_id].ws
                game_state = {
                    'seed': game.seed,
                    'counter': count,
                    'tamalou_lap': game.current.tamalou_lap,
                    'stack': len(game.current.stack),
                    'heap': game.current.heap,
                    'players': [{
                        'id': self.players_auth_id[p.auth_id].id,
                        'ready': p.ready,
                        'hand': p.hand if p.auth_id == auth_id or p.hand is None or players_visible else 13,
                        'power': p.power,
                        'state': p.state,
                        'heap': [c if (p.auth_id == auth_id and count == 0 and i in {5,6}) or c == 55 or players_visible else 13 for i, c in enumerate(p.heap)]
                        } for p in game.current.players]
                }

                await self.socket.emit(player_ws, 'game', game_state)

    async def event_log(self, msg, game = None, ws = None):
        if ws is None and game is None: return

        players_ws = ws or [self.players_auth_id[auth_id].ws for auth_id in game.players_auth_ids if self.players_auth_id[auth_id].game_id == game.id]
        await self.socket.emit(players_ws, 'tchat', msg)

    async def scores(self, game_id, ws = None):
        game = self.game_state.get(game_id)

        if game is not None and game.history:
            players_ws = ws or [self.players_auth_id[auth_id].ws for auth_id in game.players_auth_ids if self.players_auth_id[auth_id].game_id == game.id]
            history = [{self.players_auth_id[auth_id].id: point for auth_id, point in points.items()} for points in game.history]

            await self.socket.emit(players_ws, 'scores', {'finish': game.result is not None, 'points': history})


    async def game_card_selected(self, game_id, card_selected, ws = None):
        game = self.game_state.get(game_id)

        if game is None or game.current is None: return

        if ws is not None:
            await self.socket.emit(ws, 'selected', card_selected)
        else:
            players_ws = [self.players_auth_id.get(player_auth_id).ws for player_auth_id in game.players_auth_ids]
            await self.socket.emit(players_ws, 'selected', card_selected)


    async def game_update(self, game_id):
        await self.players_state_update(game_id)
        await self.game_state_update(game_id)


    async def game_finish(self, game):
        await self.game_state_update(game.id, players_visible=True)
        game.finish()

        if game.result is not None:
            for auth_id, point in game.result.items():
                self.players_auth_id[auth_id].statistics.history_points += [point]

        await game.stun(5)
        await self.scores(game.id)
        await self.game_update(game.id)
        

    async def game_next(self, game_id):
        game = self.game_state.get(game_id)

        if game is not None and game.current is not None:
            gc = game.current

            gc.next()

            if gc.tamalou_lap is not None and gc.counter > gc.tamalou_lap:
                tamalou_index = gc.tamalou_lap % len(gc.players)

                if gc.counter % len(gc.players) == tamalou_index:
                    await self.game_finish(game)
            else:
                await self.event_log(f'{self.players_auth_id[gc.current_player().auth_id].name} à toi de jouer !', game= game)


    async def emit_statistics(self, ws):
        player = self.players_ws[ws]
        statistics = player.statistics

        l = len(statistics.history_points)
        
        await self.socket.emit(ws, 'statistics', {
            'started': statistics.game_started,
            'finnished': l,
            'min': 0 if l == 0 else min(statistics.history_points),
            'max': 0 if l == 0 else max(statistics.history_points),
            'mean': 0 if l == 0 else sum(statistics.history_points) / l
        })

    async def broadcast(self, ws, game, name, data):
        if game is None: return

        players_ws = [self.players_auth_id[auth_id].ws for auth_id in game.players_auth_ids
                      if self.players_auth_id[auth_id].game_id == game.id
                      and self.players_auth_id[auth_id].ws != ws]
        await self.socket.emit(players_ws, name, data)

    async def all(self, game, name, data):
        if game is None: return

        players_ws = [self.players_auth_id[auth_id].ws for auth_id in game.players_auth_ids if self.players_auth_id[auth_id].game_id == game.id]
        await self.socket.emit(players_ws, name, data)

    @Event.on
    async def connected(self, ws):
        player = Player(ws)
        
        self.players_ws[ws] = player
        self.players_id[player.id] = player

        print(f'[{datetime.now()}] Connection {player.id} Visiteur')
        
        await self.game_list_update(ws)


    @Event.on
    async def deconnected(self, ws):
        if ws not in self.players_ws:
            return

        player = self.players_ws[ws]

        del self.players_ws[ws]
        del self.players_id[player.id]

        if player.auth_id:
            self.players_auth_id[player.auth_id].ws = None

        if player.game_id is not None:
            game = self.game_state.get(player.game_id)

            if game is not None:
                await self.game_update(game.id)

        print(f'[{datetime.now()}] Deconnection {player.id} {player.name or "Visiteur"}')


    @Event.on
    async def auth(self, ws, data):
        if ws not in self.players_ws:
            return

        name = data.get('name', '').strip()
        auth_id = data.get('auth_id')

        if not name or not auth_id: return

        player_id = self.players_ws[ws].id

        await self.socket.emit(ws, 'authOk', player_id)

        if auth_id in self.players_auth_id:
            player = self.players_auth_id[auth_id]
            player.ws = ws
            player.id = player_id

            self.players_ws[ws] = player
            self.players_id[player_id] = player

            if player.game_id is not None:
                await self.game_update(player.game_id)
                await self.scores(player.game_id, ws)
        else:
            self.players_ws[ws].name = name
            self.players_ws[ws].auth_id = auth_id
            self.players_auth_id[auth_id] = self.players_ws[ws]

        print(f'[{datetime.now()}] Authentification {player_id} {self.players_auth_id[auth_id].name}')


    @Event.on
    async def new_game(self, ws, data):
        name = data.get('name', '').strip()
        password = data.get('password')

        if len(name) > 0:
            game = GameState(name, password)
            self.game_state[game.id] = game

            await self.join(ws, {'id': game.id, 'password': password})

        
    @Event.on
    async def join(self, ws, data):
        game_id = data.get('id')
        password = data.get('password')

        game = self.game_state.get(game_id)
        if len(game.players_auth_ids) >= 8:
            return
            
        if game is not None:
            player = self.players_ws[ws]
            if game.join(player, password):
                player.game_id = game.id
                
                await self.game_update(game.id)
                await self.game_list_update()
                await self.scores(game.id, ws)


    @Event.on
    async def unjoin(self, ws, data):
        game_id = self.players_ws[ws].game_id

        game = self.game_state.get(game_id)
        if game is not None:
            player = self.players_ws[ws]
            game.unjoin(player)
            player.game_id = None

            if len(game.players_auth_ids) == 0:
                del self.game_state[game_id]
            else:
                await self.game_update(game.id)

            await self.game_list_update()


    @Event.on
    async def launch(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)
        
        if game is not None and game.current is None:
            index_launcher = len(game.history) % len(game.players_auth_ids)

            if len(game.players_auth_ids) > 1 and game.players_auth_ids[index_launcher] == player.auth_id:
                game.launch()

                if len(game.history) == 0:
                    for auth_id in game.players_auth_ids:
                        self.players_auth_id[auth_id].statistics.game_started += 1

                animations = []
                for i in range(2):
                    for player_state in game.current.players:
                        _player = self.players_auth_id[player_state.auth_id]
                        for j in range(2):
                            p = 1 + j if i == 0 else 5 + j
                            animations += [[CARD_HIDE, 'stack', [_player.id, p]]]

                await self.game_update(game.id)
                await self.all(game, 'animate', animations)
                await self.game_list_update()
                await self.event_log(f'{player.name} lance la partie', game= game)


    @Event.on
    async def swap(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)

        if game is not None and game.current is not None and not game.stunned:

            if game.current.counter == 0:
                player_state = game.current.player_by_auth(player.auth_id)

                card_a = player_state.heap[5]
                card_b = player_state.heap[6]
                game.current.swap(player.auth_id, 5, player.auth_id, 6)
                await self.socket.emit(ws, 'animate', [
                    [card_a, [player.id, 5], [player.id, 6]],
                    [card_b, [player.id, 6], [player.id, 5]]
                ])
                await self.broadcast(ws, game, 'animate', [
                    [CARD_HIDE, [player.id, 5], [player.id, 6]],
                    [CARD_HIDE, [player.id, 6], [player.id, 5]]
                ])
                await self.game_state_update(game.id, ws)


    @Event.on
    async def ready(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)

        if game is not None and game.current is not None:
            game.current.player_by_auth(player.auth_id).ready = True

            if all(map(lambda p: p.ready, game.current.players)):
                game.current.start()
            
            await self.game_update(game.id)


    @Event.on
    async def pull(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)

        if game is not None and game.current is not None and not game.stunned:

            if game.current.if_pull(player.auth_id, data):
                game.current.pull(player.auth_id, data)
                player_state = game.current.player_by_auth(player.auth_id)

                if data == 'stack':
                    await self.socket.emit(ws, 'animate', [
                        [player_state.hand, 'stack', [player.id, 'hand']]
                    ])
                    await self.broadcast(ws, game, 'animate', [
                        [CARD_HIDE, 'stack', [player.id, 'hand']]
                    ])
                    await self.game_state_update(game.id)
                    await self.event_log(f'{player.name} pioche dans la pile', game= game)
                    await self.event_log((
                        "Aucun pouvoir",
                        "Pouvoir: Regarde une de tes cartes",
                        "Pouvoir: Regarde la carte d'un adversaire",
                        "Pouvoir: Echange à l'aveugle",
                        "Pouvoir: Regarde une carte adverse et Echange si tu veux"
                    )[player_state.power], ws= ws)
                elif data == 'heap':
                    await self.socket.emit(ws, 'animate', [
                        [player_state.hand, 'heap', [player.id, 'hand']]
                    ])
                    await self.broadcast(ws, game, 'animate', [
                        [CARD_HIDE, 'heap', [player.id, 'hand']]
                    ])
                    await self.game_state_update(game.id)
                    await self.event_log(f'{player.name} pioche sur le tas', game= game)
                    await self.event_log("Aucun pouvoir", ws= ws)


    @Event.on
    async def stock(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)

        if game is not None and game.current is not None and not game.stunned:
            player_state = game.current.player_by_auth(player.auth_id)

            if game.current.if_stock(player.auth_id, data):
                card_heap = player_state.heap[data]
                card_hand = player_state.hand
                game.current.stock(player.auth_id, data)

                player_state.state = STATE.END
                player_index = game.current.players_index.get(player.auth_id)
                await self.socket.emit(ws, 'animate', [
                    [card_heap, [player.id, data], 'heap'],
                    [card_hand, [player.id, 'hand'], [player.id, data]]
                ])
                await self.broadcast(ws, game, 'animate', [
                    [card_heap, [player.id, data], 'heap'],
                    [CARD_HIDE, [player.id, 'hand'], [player.id, data]]
                ])
                await self.game_card_selected(game.id, {player_index: data})
                await self.game_state_update(game.id)
                await self.event_log(f'{player.name} garde la carte', game= game)
                

    @Event.on
    async def use(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)

        if game is not None and game.current is not None and not game.stunned:
            player_state = game.current.player_by_auth(player.auth_id)

            if game.current.is_current_player(player.auth_id) and player_state.state == STATE.GET_STACK:
                card = player_state.hand
                game.current.use(player.auth_id)
                
                if player_state.power != POWER.NOTHING:
                    player_state.state = STATE.USE_POWER
                else:
                    player_state.state = STATE.END

                await self.broadcast(ws, game, 'animate', [
                    [card, [player.id, 'hand'], 'heap']
                ])
                await self.game_state_update(game.id)
                await self.event_log(f'{player.name} jette la carte', game= game)


    @Event.on
    async def power(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)

        if game is not None and game.current is not None and not game.stunned:
            player_state = game.current.player_by_auth(player.auth_id)

            if game.current.is_current_player(player.auth_id) and player_state.state == STATE.USE_POWER:
                
                if player_state.power == POWER.SEE_MY_CARD:
                    if 0 <= data < 8 and player_state.heap[data] != 55:
                        my_index = game.current.players_index.get(player.auth_id)

                        card = player_state.heap[data]
                        game.current.get(player.auth_id, my_index, data)
                        player_state.state = STATE.END

                        await self.socket.emit(ws, 'animate', [
                            [card, [player.id, data], [player.id, 'hand']]
                        ])
                        await self.broadcast(ws, game, 'animate', [
                            [CARD_HIDE, [player.id, data], [player.id, 'hand']]
                        ])
                        await self.game_card_selected(game.id, {my_index: data})
                        await self.game_state_update(game.id)
                        await self.event_log(f'{player.name} regarde une de ses cartes', game= game)

                elif player_state.power in {POWER.SEE_YOU_CARD, POWER.KING_PART_1}:
                    if len(data) == 1:
                        other_index, card_index = [int(a) for a in tuple(data.items())[0]]
                        other_state = game.current.players[other_index]
                        other = self.players_auth_id[other_state.auth_id]
                        
                        if other_state.auth_id != player.auth_id and 0 <= card_index < 8 and other_state.heap[card_index] != 55:
                            card = other_state.heap[card_index]
                            game.current.get(player.auth_id, other_index, card_index)

                            if player_state.power == POWER.SEE_YOU_CARD:
                                player_state.state = STATE.END
                            if player_state.power == POWER.KING_PART_1:
                                player_state.power = POWER.KING_PART_2

                            await self.socket.emit(ws, 'animate', [
                                [card, [other.id, card_index], [player.id, 'hand']]
                            ])
                            await self.broadcast(ws, game, 'animate', [
                                [CARD_HIDE, [other.id, card_index], [player.id, 'hand']]
                            ])
                            await self.game_card_selected(game.id, data)
                            await self.game_state_update(game.id)
                            await self.event_log(game, f'{player.name} regarde une carte adverse')

                elif player_state.power == POWER.SWAP:
                    my_index = game.current.players_index.get(player.auth_id)

                    if str(my_index) in data and len(data) == 2:
                        c1 = data.pop(str(my_index))
                        other_index, c2 = [int(a) for a in tuple(data.items())[0]]
                        other_state = game.current.players[other_index]
                        other = self.players_auth_id[other_state.auth_id]

                        game.current.swap(player.auth_id, c1, other_state.auth_id, c2)

                        player_state.state = STATE.END
                        await self.all(game, 'animate', [
                            [CARD_HIDE, [other.id, c2], [player.id, c1]],
                            [CARD_HIDE, [player.id, c1], [other.id, c2]]
                        ])
                        await self.game_card_selected(game.id, {my_index: c1, other_index: c2})
                        await self.game_state_update(game.id)
                        await self.event_log(f'{player.name} échange les cartes', game= game)

                elif player_state.power == POWER.KING_PART_2:
                    if 0 <= data < 8 and player_state.heap[data] != 55 \
                        and player_state.hand is not None and player_state.hand_origin is not None:
                        
                        c1 = data
                        my_index = game.current.players_index.get(player.auth_id)
                        other_index, c2 = player_state.hand_origin
                        other_state = game.current.players[other_index]
                        other = self.players_auth_id[other_state.auth_id]

                        game.current.set(player.auth_id, other_index, c2)
                        game.current.swap(player.auth_id, c1, other_state.auth_id, c2)

                        player_state.state = STATE.END
                        await self.all(game, 'animate', [
                            [CARD_HIDE, [other.id, c2], [player.id, c1]],
                            [CARD_HIDE, [player.id, c1], [other.id, c2]]
                        ])
                        await self.game_card_selected(game.id, {my_index: c1, other_index: c2})
                        await self.game_state_update(game.id)
                        await self.event_log(f'{player.name} échange les cartes', game= game)


    @Event.on
    async def next(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)

        if game is not None and game.current is not None and not game.stunned:

            player_state = game.current.player_by_auth(player.auth_id)

            if game.current.is_current_player(player.auth_id) \
                and player_state.state in {STATE.USE_POWER, STATE.END}:
                    await self.game_next(game.id)
                    await self.game_card_selected(game.id, {})
                    await self.game_state_update(game.id)
                    self.save()


    @Event.on
    async def discard(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)

        if game is not None and game.current is not None and not game.stunned:
            if not game.current.if_discard(player.auth_id, data): return

            player_state = game.current.player_by_auth(player.auth_id)

            save_state = RoundState.dump(game.current)
            card_heap = player_state.heap[data]
            equal = game.current.discard(player.auth_id, data)

            await self.broadcast(ws, game, 'animate', [
                [card_heap, [player.id, data], 'heap']
            ])
            await self.game_state_update(game.id)
            await self.event_log(f'{player.name} se défausse d\'une carte', game= game)

            if not equal:
                await game.stun(2)
                await self.all(game, 'animate', [
                    [card_heap, 'heap', [player.id, data]]
                ])
                game.current = RoundState.load(*save_state)
                game.current.fault(player.auth_id)
                await self.game_state_update(game.id)

            player_state = game.current.player_by_auth(player.auth_id)
            if player_state.is_full or player_state.is_empty():
                await self.game_finish(game)


    @Event.on
    async def tamalou(self, ws, data):
        player = self.players_ws.get(ws)
        game = self.game_state.get(player.game_id)

        if game is not None and game.current is not None and not game.stunned:
            if game.current.is_current_player(player.auth_id) and game.current.tamalou_lap is None:

                if game.current.counter > 0:
                    game.current.tamalou()

                    players_ws = [self.players_auth_id[auth_id].ws for auth_id in game.players_auth_ids if self.players_auth_id[auth_id].game_id == game.id]

                    await self.event_log(f'{player.name} dit: TAMALOU !', game= game)


    @Event.on
    async def statistics(self, ws, data):
        if ws in self.players_ws:
            await self.emit_statistics(ws)

