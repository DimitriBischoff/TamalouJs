import json
import asyncio
import traceback
from websockets import exceptions as WsExceptions
from websockets.asyncio.server import serve, ServerConnection
from datetime import datetime


class SocketManager:
    def __init__(self, host, port):
        self.host = host
        self.port = port
        self.server = None
        self.on_map = dict()

    async def call(self, name, *args):
        print(f'[{datetime.now()}] [call] {name} {args}')
        if name in self.on_map:
            await self.on_map[name](*args)
    
    async def handle(self, ws):
        try:
            await self.call('connected', ws)

            try:
                async for raw in ws:
                    try:
                        message = json.loads(raw)

                        if message['name'] not in {'connected', 'deconnected'}:
                            await self.call(message['name'], ws, message['data'])
                    except Exception as e:
                        traceback.print_exc()
                        print(f'[{datetime.now()}] [error] {e}')
            finally:
                await self.call('deconnected', ws)

        except Exception as e:
            print(f'[{datetime.now()}] [error] {e}')

    async def emit(self, websockets, name, data = None):
        message = json.dumps({
            'name': name,
            'data': data
        })

        print(f'[{datetime.now()}] [emit] {name} {type(websockets)} {data}')

        if websockets is None:
            return
        elif isinstance(websockets, ServerConnection):
            await websockets.send(message)
        else:
            websockets = [ws for ws in websockets if isinstance(ws, ServerConnection)]

            if len(websockets) == 0:
                return
            elif len(websockets) == 1:
                await websockets[0].send(message)
            else:
                async with asyncio.TaskGroup() as tg:
                    [tg.create_task(ws.send(message)) for ws in websockets if ws]

    def on(self, name, callback):
        self.on_map[name] = callback

    async def run(self):
        try:
            print(f'[{datetime.now()}] Server run {self.host}:{self.port}')
            async with serve(self.handle, self.host, self.port) as server:
                await server.serve_forever()
        except asyncio.exceptions.CancelledError:
            print(f'[{datetime.now()}] Server stop')


class Event:
    def __init__(self, socket):
        self.socket = socket

        for m in dir(self):
            f = getattr(self, m)
            if hasattr(f, "_on_"):
                self.socket.on(f.__name__, f)

    def on(f):
        setattr(f, "_on_", True)
        return f
