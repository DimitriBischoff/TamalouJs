var http = require('http');
var fs = require('fs');
var io = require('./js/event.io');

// Chargement du fichier index.html affiché au client

var server = http.createServer(function(req, res) {
	fs.readFile('api/index.html', 'utf-8', function(error, content) {
		res.writeHead(200);
		res.end(content);
	});
});

io(server);

server.listen(8080);