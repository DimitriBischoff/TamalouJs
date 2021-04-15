# coding: utf-8

import string
import random
from errors import *


class Id:
    chars = string.ascii_letters + string.digits

    @staticmethod
    def generate(k):
        return ''.join(random.choices(Id.chars, k=k))


class Entity:
    def __init__(self):
        self.id = Id.generate(10)

class Statistics:
    def __init__(self):
        self.game_started = 0
        self.history_points = []

    @staticmethod
    def dump(s):
        return (
            s.game_started,
            tuple(s.history_points)
        )

    @staticmethod
    def load(game_started, history_points):
        s = Statistics()
        s.game_started = game_started
        s.history_points = list(history_points)
        return s


class Player(Entity):
    def __init__(self, ws):
        Entity.__init__(self)
        self.ws = ws
        self.name = None
        self.auth_id = None
        self.game_id = None
        self.statistics = Statistics()

    @staticmethod
    def dump(p):
        return (
            p.auth_id,
            p.name,
            p.game_id,
            Statistics.dump(p.statistics)
        )

    @staticmethod
    def load(auth_id, name, game_id, statistics):
        p = Player(None)
        p.name = name
        p.auth_id = auth_id
        p.game_id = game_id
        p.statistics = Statistics.load(*statistics)
        return p

