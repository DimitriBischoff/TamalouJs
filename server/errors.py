
class Error(Exception):
    message = "Tamalou Error"

class PlayerLimit(Error):
    message = "Player Limit"

class BadPassword(Error):
    message = "Bad Password"

class PlayerInGame(Error):
    message = "Player in Game"