# coding: utf-8

import random
import asyncio
from datetime import datetime
from entities import Entity
from errors import *

# POWER
# -1 tirer du tas
# 0 rien
# 1 voir sa carte
# 2 voir une carte adverse
# 3 echanger
# 4 roi part 1 (2)
# 5 roi part 2 (3)

# STATE
# 0 rien
# 1 echange avec le tas
# 2 a pris sur la pile
# 3 utilise un pouvoir
# 4 fin


class PlayerState:
    def __init__(self, player_auth_id):
        self.auth_id = player_auth_id
        self.heap = [55] * 8
        self.hand = None
        self.hand_origin = None
        self.ready = False
        self.power = 0
        self.is_full = False
        self.state = 0

    @staticmethod
    def dump(p):
        return (
            p.auth_id,
            tuple(p.heap),
            p.hand,
            p.hand_origin,
            p.ready,
            p.power,
            p.is_full,
            p.state
        )

    @staticmethod
    def load(auth_id, heap, hand, hand_origin, ready, power, is_full, state):
        p = PlayerState(auth_id)
        p.heap = list(heap)
        p.hand = hand
        p.hand_origin = hand_origin
        p.ready = ready
        p.power = power
        p.is_full = is_full
        p.state = state
        return p

    def is_empty(self):
        return all(map(lambda c: c == 55, self.heap))


class RoundState:
    def __init__(self, players_auth_ids):
        self.stack = [i for i in range(56) if i not in (55, 13)]
        self.heap = []
        self.players = [PlayerState(auth_id) for auth_id in players_auth_ids]
        self.players_index = {auth_id: i for i, auth_id in enumerate(players_auth_ids)}
        self.discard_locked = False
        self.counter = 0
        self.tamalou_lap = None

    @staticmethod
    def dump(rs):
        return (
            tuple(rs.stack),
            tuple(rs.heap),
            tuple(PlayerState.dump(p) for p in rs.players),
            rs.discard_locked,
            rs.counter,
            rs.tamalou_lap
        )

    @staticmethod
    def load(stack, heap, players, discard_locked, counter, tamalou_lap):
        rs = RoundState([])
        rs.stack = list(stack)
        rs.heap = list(heap)
        rs.players = [PlayerState.load(*p) for p in players]
        rs.players_index = {p[0]: i for i, p in enumerate(players)}
        rs.discard_locked = discard_locked
        rs.counter = counter
        rs.tamalou_lap = tamalou_lap
        return rs

    def card_equal(self, c1, c2):
        excluded = {13, 55}

        if c1 in excluded or c2 in excluded: return False
        return c1 % 14 == c2 % 14

    def find_empty(self, auth_id):
        player = self.player_by_auth(auth_id)

        pos_lock = -1
        if player.hand_origin is not None:
            player_index, card_index = player.hand_origin

            if self.players[player_index].auth_id == auth_id:
                pos_lock = card_index

        for i in [1,2,5,6,4,7,0,3]:
            if player.heap[i] == 55:
                if i != pos_lock:
                    return i
        return -1

    def fault(self, auth_id):
        player = self.player_by_auth(auth_id)
        pos_empty = self.find_empty(auth_id)

        if pos_empty != -1:
            player.heap[pos_empty] = self.stack.pop()
        else:
            player.is_full = True

    def player_by_auth(self, auth_id):
        index = self.players_index.get(auth_id)
        if index is not None:
            return self.players[index]

    def current_player(self):
        return self.players[self.counter % len(self.players)]

    def is_current_player(self, auth_id):
        return self.current_player().auth_id == auth_id

    @staticmethod
    def get_power(card):
        x = card % 14

        if 6 <= x <= 7: return 1
        if 8 <= x <= 9: return 2
        if 10 <= x <= 11: return 3
        if x == 12: return 4
        return 0

    def distribute(self):
        random.shuffle(self.stack)

        for player in self.players:
            player.heap[1] = self.stack.pop()
            player.heap[2] = self.stack.pop()

        for player in self.players:
            player.heap[5] = self.stack.pop()
            player.heap[6] = self.stack.pop()

    def start(self):
        self.heap += [self.stack.pop()]
        self.counter += 1

    def swap(self, p1, c1, p2, c2):
        player1 = self.player_by_auth(p1)
        player2 = self.player_by_auth(p2)

        if (player1 and player2) and (0 <= c1 < 8) and (0 <= c2 < 8):
            current_player = self.current_player()

            if (self.counter == 0 \
                and not player1.ready \
                and (p1 == p2 and c1 in {5,6} and c2 in {5,6})) \
                or \
                (self.counter > 0 \
                and (p1 != p2 and p1 == current_player.auth_id) \
                and current_player.power >= 3):

                player1.heap[c1], player2.heap[c2] = player2.heap[c2], player1.heap[c1]

    def stock(self, auth_id, card_index):
        player = self.player_by_auth(auth_id)

        self.heap += [player.heap[card_index]]
        player.heap[card_index] = player.hand
        player.hand = None
        player.power = 0
        self.discard_locked = False

    def discard(self, auth_id, card_index):
        player = self.player_by_auth(auth_id)

        if card_index == -1:
            self.heap += [player.hand]
            player.hand = None
            player.hand_origin = None
        else:
            self.heap += [player.heap[card_index]]
            player.heap[card_index] = 55

        if self.card_equal(*self.heap[-2:]):
            self.discard_locked = True
            return True
        return False

    def get(self, auth_id, player_index, card_index):
        player = self.player_by_auth(auth_id)
        other = self.players[player_index]

        player.hand = other.heap[card_index]
        player.hand_origin = (player_index, card_index)
        other.heap[card_index] = 55

    def set(self, auth_id, player_index, card_index):
        player = self.player_by_auth(auth_id)
        other = self.players[player_index]

        other.heap[card_index] = player.hand
        player.hand = None
        player.hand_origin = None

    def use(self, auth_id):
        player = self.player_by_auth(auth_id)

        self.heap += [player.hand]
        player.hand = None
        self.discard_locked = False

    def pull(self, auth_id, choice):
        player = self.player_by_auth(auth_id)

        if choice == 'heap':
            player.hand = self.heap.pop()
            player.state = 1
        elif choice == 'stack':
            player.hand = self.stack.pop()
            player.power = RoundState.get_power(player.hand)
            player.state = 2

    def tamalou(self):
        self.tamalou_lap = self.counter

    def next(self):
        current_player = self.current_player()

        if current_player.hand is not None and current_player.hand_origin is not None:
            self.set(current_player.auth_id, *current_player.hand_origin)

        current_player.power = 0
        current_player.state = 0
        
        if len(self.stack) == 0:
            self.stack, self.heap = self.heap[:-1][::-1], self.heap[-1:]

        self.counter += 1

    def if_stock(self, auth_id, card_index):
        player = self.player_by_auth(auth_id)

        return self.is_current_player(auth_id) \
            and 0 <= card_index < 8 \
            and player.heap[card_index] != 55 \
            and 1 <= player.state <= 2

    def if_pull(self, auth_id, choice):
        player = self.player_by_auth(auth_id)
        current_player = self.current_player()

        return auth_id == current_player.auth_id \
            and player.state == 0 \
            and player.hand is None \
            and self.counter > 0

    def if_discard(self, auth_id, card_index):
        player = self.player_by_auth(auth_id)
        current_player = self.current_player()

        base_rule = not self.discard_locked \
            and current_player.state != 1 \
            and self.counter > 0 \
            and len(self.heap) > 0
        valid_hand = (card_index == -1 \
            and player.hand is not None \
            and player.hand_origin is not None \
            and self.players[player.hand_origin[0]].auth_id == auth_id)
        valid_card = player.hand is None \
            and 0 <= card_index < 8 \
            and player.heap[card_index] != 55

        return base_rule and (valid_card or valid_hand)


class GameState(Entity):
    def __init__(self, name, password = None):
        Entity.__init__(self)
        self.create_ts = datetime.now()
        self.name = name
        self.seed = sum([ord(i) for i in self.id])
        self.password = password
        self.history = []
        self.current = None
        self.locked = False
        self.players_auth_ids = []
        self.stunned = False
        self.result = None

    @staticmethod
    def dump(gs):
        return (
            gs.id,
            gs.create_ts.timestamp(),
            gs.name,
            gs.seed,
            gs.password,
            tuple(gs.history),
            None if gs.current is None else RoundState.dump(gs.current),
            tuple(gs.players_auth_ids),
            gs.result
        )

    @staticmethod
    def load(id, create_ts, name, seed, password, history, current, players_auth_id, result):
        gs = GameState(None)
        gs.id = id
        gs.create_ts = datetime.fromtimestamp(create_ts)
        gs.name = name
        gs.seed = seed
        gs.password = password
        gs.history = list(history)
        if current: gs.current = RoundState.load(*current)
        gs.locked = len(history) != 0 or current is not None
        gs.players_auth_ids = list(players_auth_id)
        gs.result = result
        return gs

    def get_infos(self):
        return {
            'id': self.id,
            'name': self.name,
            'locked': self.locked,
            'players': len(self.players_auth_ids),
            'password': self.password != None}

    def join(self, player, password):
        if self.current is None \
            and self.password == password \
            and len(self.history) == 0 \
            and len(self.players_auth_ids) < 8 \
            and player.auth_id not in self.players_auth_ids:
            self.players_auth_ids += [player.auth_id]
            return True
        elif player.auth_id in self.players_auth_ids:
            return True
        return False

    def unjoin(self, player):
        if self.current is None and len(self.history) == 0:
            self.players_auth_ids = [p for p in self.players_auth_ids if p != player.auth_id]

    def points(self, player):
        def card_point(card):
            x = card % 14
            y = int(card / 14)
            
            if 9 <= x <= 11: return 10
            elif (x == 12 and y < 2) or x == 13: return 0
            elif x == 12: return 15
            else: return 1 + x

        if player.is_empty(): return -10
        if player.is_full: return 50

        result = sum([card_point(card) for card in player.heap])

        if result > 30: return 50
        if result > 15: return 30
        if result > 10: return 15
        if result > 5: return 10
        if result > 0: return 5
        return -5

    def finish(self):
        if self.current is not None:
            result = {
                p.auth_id: self.points(p) for p in self.current.players
            }
            self.history.append(result)
            
            total = {auth_id: 0 for auth_id in self.players_auth_ids}
            for h in self.history:
                for auth_id, point in h.items():
                    total[auth_id] += point

            for auth_id, point in total.items():
                if point <= -50 or point >= 100:
                    self.result = total
                    break

            self.current = None
            
    def launch(self):
        if self.current is None and self.result is None:
            d = len(self.history) % len(self.players_auth_ids)
            auth = self.players_auth_ids
            self.locked = True
            self.current = RoundState(auth[d:] + auth[:d])
            self.current.distribute()

    async def stun(self, seconds = 2):
        self.stunned = True
        await asyncio.sleep(seconds)
        self.stunned = False