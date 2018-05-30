class Player {
	constructor(player) {
		this.id = player.id;
		this.name = player.name;
		this.hand = new Deck(false);
		this.heap = new Deck(false);
	}
	//private
	transfer(src, dest, i) {
		var c = src.take(i);
		if (c == null)
			return false;
		dest.push(c);
		return true;
	}
	//public
	equal(player) {
		return (player == this.id);
	}
	heapToHand(i) {
		return this.transfer(this.heap, this.hand, i);
	}
	handToHeap(i) {
		return this.transfer(this.hand, this.heap, i);
	}
	heapPush(card) {
		this.heap.push(card);
	}
	handPush(card) {
		this.hand.push(card);
	}
	show() {
		console.log(this.id, this.name);
		this.hand.show();
		this.heap.show();
	}
}

class Players {
	constructor(players) {
		this.players = [];
		this.index = {};
		this.length = 0;
		players.forEach(p => this.add(p));
	}
	//private
	search(playerId) {
		return (playerId in this.index) ? this.index[playerId] : -1;
	}
	//public
	get(i) {
		if (i >= 0 && i < this.length)
			return this.players[i];
		return null;
	}
	getById(playerId) {
		return this.get(this.search(playerId));
	}
	add(player) {
		this.players.push(new Player(player));
		console.log("add player", player);
		this.index[player.id] = this.length;
		this.length = this.players.length;
	}
	remove(playerId) {
		var i = this.search(playerId);
		if (i != -1) {
			console.log("remove player", playerId);
			this.players.splice(i, 1);
			delete this.index[playerId];
		}
		this.length = this.players.length;
	}
	show() {
		console.log("*** Players ***", this.length);
		this.players.forEach(p => p.show());
	}
}

class Card {
	constructor(name, type, value) {
		this.name = name;
		this.type = type;
		this.value = value;
	}
	equal(card) {
		return (this.name == card.name);
	}
	show() {
		console.log(['|', this.name, this.type, this.value, '|'].join(' '));
	}
}

class Deck {
	constructor(init= true) {
		this.cards = [];
		if (init)
			this.cards = this._54();
	}
	//private
	_54() {
		const name = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 'valet', 'dame', 'roi'];
		const type = ['coeur', 'carreaux', 'trefle', 'pique'];
		var tmp = [];
		for (var j = 0; j < type.length; j++) {
			for (var i = 0; i < name.length; i++) {
				var value = (i < 10) ? name[i] : 10;
				if (name[i] == 'roi') {
					value = (['coeur', 'carreaux'].includes(type[j])) ? 0 : 15;
				}
				tmp.push(new Card(String(name[i]), type[j], value));
			}
		}
		tmp.push(new Card("joker", "rouge", 0));
		tmp.push(new Card("joker", "noir", 0));
		return tmp;
	}
	//public
	get(i) {
		if (i < 0)
			i = this.cards.length + i;
		return this.cards[i];
	}
	take(i) {
		if (i < 0 || i >= this.cards.length)
			return null;
		return this.cards.splice(i, 1)[0];
	}
	pose(card, i) {
		if (i < 0 || i >= this.cards.length)
			this.cards.splice(i, 1, card)[0];	
	}
	pop() {
		return this.cards.pop();
	}
	push(card) {
		this.cards.push(card);
	}
	transfer(i, deck, j) {
		var tmp = deck.cards.splice(j, 1, this.take(i))[0];
		this.cards.splice(i, 0, tmp);
	}
	show() {
		console.log("*** Cards ***", this.cards.length);
		this.cards.forEach(c => c.show());
	}
}

class Game {
	constructor(players) {
		this.pointer = 0;
		this.players = new Players(players);
		this.stack = new Deck();
		this.heap = new Deck(false);
		this.freezeHeap = false;
	}
	//private
	isDefault() {
		var min = 2;
		var max = 9;

		if (this.players.length < min || this.players.length >= max)
			return true;
		return false;
	}
	distribut() {
		for (var k = 0; k < 2; k++)
			for (var i = 0; i < this.players.length; i++)
				for (var j = 0; j < 2; j++) {
					var card = this.stack.pop();
					this.players.get(i).heapPush(card);
				}
	}
	playerCurrent() {
		return this.players.get(this.pointer);
	}
	//public
	start() {
		if (this.isDefault())
			return false;
		this.distribut();
		return true;
	}
	drawCard(playerId) {
		var playerCurr = this.playerCurrent();
		var player = this.players.getById(playerId)
		if (player) {
			player.hand.push(this.stack.pop());
			if (!playerCurr.equal(playerId))
				this.fault(playerId);
		}
	}
	discard(playerId, card) {
		var lastCard = this.heap.get(-1);
		console.log("discard", playerId, card, lastCard);
		if (lastCard.equal(card)) {
			this.heap.push(card);
			this.freezeHeap = true;
		}
		else {
			this.players.get(playerId).heap.push(card);
			this.fault(playerId);
			return false;
		}
		return true;
	}
	fault(playerId) {
		var p = this.players.getById(playerId);
		if (p != null) {
			console.log("fault player", playerId);
			p.heapPush(this.stack.pop());
		}
	}
	exchange(playerId1, playerId2, i, j) {
		var p1 = this.players.getById(playerId1);
		var p2 = this.players.getById(playerId2);
		if (p1 && p2)
			p1.heap.transfer(i, p2.heap, j);
	}
	see(playerId, i) {
		var p = this.players.getById(playerId);
		if (p)
			return p.heap.get(i);
	}
	endLap(playerId) {
		var playerCurr = this.playerCurrent();
		if (playerCurr.equal(playerId))
			this.pointer = (this.pointer + 1) % this.players.length;
	}
	show() {
		this.stack.show();
		this.heap.show();
		this.players.show();
		console.log("current player", this.playerCurrent().id);
	}
}

var unitest = function() {

var joueur = (function() {
	var id = 0;
	return (name) => {return {'name': name, 'id': id++}}
})()


var game = new Game([joueur('jean')]);
game.players.add(joueur('gaston'));
game.players.add(joueur('mouloud'));
game.players.remove(2);
game.players.remove(2);
if (game.start()) {
	game.heap.push(game.stack.pop());
	game.drawCard(2);
	game.drawCard(3);
	game.discard(1, game.players.getById(1).heap.take(1));
	game.drawCard(0);
	game.exchange(0, 1, 0, 0);
}
game.show();

}

unitest();

/*
ACTION
-prendre une carte sur la pile
-defaussez une carte
-regarder une carte dans nimporte quel jeux
-echanger une carte avec nimporte quel paquet
-finir son tour
-voter une faute de jeux
*/