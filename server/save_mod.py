#!C:\venv\Scripts\python.exe
# coding: utf-8

import pickle

from datetime import datetime

from game_state import *
from errors import *
from entities import *
from socket_manager import Event


def save_state(file_path, obj):
    with open(file_path, 'wb') as file:
        raw = (
            tuple(Player.dump(p) for p in obj['players'].values()),
            tuple(GameState.dump(g) for g in obj['games'].values())
        )
        pickle.dump(raw, file)

    print(f'[{datetime.now()}] Server save')

def load_state(file_path):
    save = {}
    with open(file_path, 'rb') as file:
        players, games = pickle.load(file)
        
        print(*players, sep='\n')
        print(*games, sep='\n')

        if players:
            save['players'] = {p[0]: Player.load(*p) for p in players}
        if games:
            save['games'] = {g[0]: GameState.load(*g) for g in games}

    return save

state = load_state('C:\\Users\\Cewam\\Desktop\\TamalouJs\\server\\save_mod')
# print('')
# state['games'] = {k: g for k, g in state['games'].items() if g.name == 'Torcy'}
# save_state('save_mod', state)
