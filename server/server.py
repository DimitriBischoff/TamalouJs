#!C:\venv\Scripts\python.exe
# coding: utf-8

import sys
from game_manager import *
from socket_manager import SocketManager


def main(host, port):
    try:
        sm = SocketManager(host, port)
        gm = GameManager(sm)
        gm.run()
    finally:
        gm.save()

if __name__ == '__main__':
    _, host, port = sys.argv
    main(host, int(port))
    # main('192.168.0.47', 8081)

