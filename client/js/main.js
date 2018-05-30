var socket = io.connect('http://localhost:8080');
var on = (name, f) => socket.on(name, f);
var emit = (name, o) => socket.emit(name, o);

on('bonjour', (text) => alert(text));