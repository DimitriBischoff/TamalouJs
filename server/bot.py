import json
import random
import asyncio
import websockets
from entities import Id


def auth_gen():
    return ''.join(random.choices("0123456789abcdef", k=64))


class Bot:
    def on(f):
        setattr(f, "_on_", True)
        return f

    def __init__(self, uri, auth_id, game_id):
        self.ws = None
        self._uri = uri
        self._game_id = game_id
        self._auth_id = auth_id
        self._id = None
        self._game_list = None
        self._players = None
        self._game = None

    async def _call(self, name, data):
        if hasattr(self, name):
            f = getattr(self, name)
            if hasattr(f, "_on_"):
                await f(data)

    def start(self):
        try:
            asyncio.get_event_loop().run_until_complete(self.run())
        except Exception as e:
            print(e)

    async def run(self):
        async with websockets.connect(self._uri) as websocket:
            self.ws = websocket

            await self.auth()

            while True:
                raw = await websocket.recv()
                message = json.loads(raw)

                print('Receive', *message.values())

                if 'name' in message:
                    await self._call(message['name'], message.get('data'))

        self.ws = None

    async def send(self, name, data = None):
        if self.ws is not None:
            print('Emit', name, data)
            await self.ws.send(json.dumps({
                'name': name,
                'data': data
            }))

    async def auth(self):
        await self.send('auth', {
            'name': 'Bot',
            'auth_id': self._auth_id
        })

    # Emit

    async def join(self, data):
        await self.send('join', {
            'id': data,
            'password': None
        })

    async def unjoin(self):
        await self.send('unjoin')

    async def ready(self, data):
        pass

    async def pull(self, data):
        pass

    async def stock(self, data):
        pass

    async def use(self, data):
        pass

    async def power(self, data):
        pass

    async def next(self, data):
        pass

    async def discard(self, data):
        pass

    async def tamalou(self, data):
        pass
    

    # Receive

    @on
    async def authOk(self, data):
        self._id = data

    @on
    async def gameList(self, data):
        self._game_list = data
        await self.join(self._game_id)
        # await self.unjoin()
    
    @on
    async def players(self, data):
        self._players = data
    
    @on
    async def game(self, data):
        if self._game is None:
            self._game = data
    
    @on
    async def selected(self, data):
        pass
    
    @on
    async def tchat(self, data):
        pass
    


if __name__ == '__main__':
    auth_id = '1730c9f802fcdd9a7083c79c641b7e24d7577b03999a5dfd4011855a6b682064'
    game_id = '60fVDgwFy7'
    bot = Bot('ws://192.168.0.47:8081', auth_id, game_id)
    bot.start()
    
