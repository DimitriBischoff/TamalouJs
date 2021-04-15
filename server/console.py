
class Console:
    def __init__(self, game_manager):
        self.gm = game_manager
        self.loop = False

    def cmd(f):
        setattr(f, "_cmd_", True)
        return f

    def exec(self, cmd, *args):
        methods = dir(self)
        if cmd in methods:
            method = getattr(self, cmd)
            if hasattr(method, "_cmd_"):
                method(*args)

    def input(self):
        self.loop = True
        while self.loop:
            try:
                self.exec(*input().split(' '))
            except KeyboardInterrupt:
                break
            except Exception as e:
                print(e)

    @cmd
    def print(self, msg):
        print(msg)

    @cmd
    def exit(self):
        self.loop = False