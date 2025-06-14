import sys
import asyncio
from tamalou.game_manager import GameManager
from tamalou.socket_manager import SocketManager


async def main(host, port):
    try:
        sm = SocketManager(host, port)
        gm = GameManager(sm)
        await sm.run()
    finally:
        gm.save()

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print("usage:\npython server.py <host> <port>")
        exit()
    host, port = sys.argv[1:]
    asyncio.run(main(host, int(port)))
    # main('192.168.0.47', 8081)
