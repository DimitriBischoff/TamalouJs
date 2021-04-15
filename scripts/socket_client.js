class SocketClient {
	constructor(url) {
		this.socket = null;
		this.ready = null;
		this.url = url;
		this._on = new Map();
	}

	run() {
		this.socket = new WebSocket(this.url);

		this.ready = new Promise((res, rej) => {
			this.socket.onopen = (event) => {
				this.onopen(event);

				this.socket.onclose = (event) => {
					this.onclose(event);
				}
				this.socket.onmessage = (event) => {
					this.onmessage(event);
				}
				res(true);
			}
			this.socket.onerror = (event) => {
				this.onerror(event);
				rej(false);
			}
		})
	}

	reconnexion() {
		if (this.socket.readyState == WebSocket.CLOSED) {
			this.run();
		}
	}

	send(name, data = null) {
		console.log('send', name, data);
		this.socket.send(JSON.stringify({
            'name': name,
            'data': data
        }));
	}

	onopen(event) {
		console.log("Connexion établie.");
		signal.setAttribute('connected', '');
		if (this._on.has('open'))
			this._on.get('open')();
	}

	onerror(error) {
		console.error(error);
		this.onclose();
	}

	onclose(event) {
		console.log("Connexion terminé.");
		signal.removeAttribute('connected');
		this.reconnexion();
	}

	onmessage(event) {
		let json = JSON.parse(event.data);

		console.log("Message:", json);

		console.log(this._on);

		if (this._on.has(json['name'])) {
			this._on.get(json['name'])(json.data);
		}
	}

	on(name, callback) {
		this._on.set(name, callback);
	}

}
