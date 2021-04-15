# coding: utf-8

import json
import asyncio
from websockets import serve, WebSocketServerProtocol, exceptions as WsExceptions
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
    
    async def handle(self, ws, path):
        try:
            await self.call('connected', ws)

            try:
                async for raw in ws:
                    try:
                        message = json.loads(raw)

                        if message['name'] not in {'connected', 'deconnected'}:
                            await self.call(message['name'], ws, message['data'])
                    except Exception as e:
                        print(f'[{datetime.now()}] {e}')
            finally:
                await self.call('deconnected', ws)

        except:
            print(f'[{datetime.now()}] Timeout')

    async def emit(self, websockets, name, data = None):
        message = json.dumps({
            'name': name,
            'data': data
        })

        print(f'[{datetime.now()}] [emit] {name} {type(websockets)} {data}')

        if websockets is None:
            return
        elif isinstance(websockets, WebSocketServerProtocol):
            await websockets.send(message)
        else:
            websockets = [ws for ws in websockets if isinstance(ws, WebSocketServerProtocol)]

            if len(websockets) == 0:
                return
            elif len(websockets) == 1:
                await websockets[0].send(message)
            else:
                await asyncio.wait([ws.send(message) for ws in websockets if ws])

    def on(self, name, callback):
        self.on_map[name] = callback

    def run(self):
        print(f'[{datetime.now()}] Server run {self.host}:{self.port}')
        self.server = serve(self.handle, self.host, self.port)
        asyncio.get_event_loop().run_until_complete(self.server)

    def wait(self):
        try:
            asyncio.get_event_loop().run_forever()
        except KeyboardInterrupt:
            pass


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
