function eventIo(server) {
	var io = require('socket.io').listen(server);

	io.sockets.on('connection', (client) => {
		console.log("nouveau client");
		client.emit('bonjour', "Salut");
	});
}

module.exports = eventIo;

