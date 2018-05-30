class Player {
	constructor(id) {
		this.id = id;
		this.hand = new Deck(false);
		this.heap = new Deck(false);
	}
	//private
	transfer(src, dest, i) {
		var c = src.get(i);
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
		console.log(this.id);
		this.hand.show();
		this.heap.show();
	}
}

class Players {
	constructor(players) {
		this.players = [];
		this.length = 0;
		players.forEach(p => this.add(p));
	}
	//private
	search(player) {
		for (var i = 0; i < this.players.length; i++)
			if (this.players[i].equal(player))
				return i;
		return -1;
	}
	//public
	get(i) {
		if (i >= 0 && i < this.length)
			return this.players[i];
		return null;
	}
	searchAndGet(player) {
		return this.get(this.search(player));
	}
	add(player) {
		this.players.push(new Player(player));
		console.log("add player", player);
		this.length = this.players.length;
	}
	remove(player) {
		var i = this.search(player);
		if (i != -1) {
			console.log("remove player", player);
			this.players.splice(i, 1);
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
	card(i) {
		if (i < 0)
			i = this.cards.length + i;
		return this.cards[i];
	}
	get(i) {
		if (i < 0 || i >= this.cards.length)
			return null;
		return this.cards.splice(i, 1)[0];
	}
	pop() {
		return this.cards.pop();
	}
	push(card) {
		this.cards.push(card);
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
	//public
	playerCurrent() {
		return this.players.get(this.pointer);
	}
	start() {
		if (this.isDefault())
			return false;
		this.distribut();
		return true;
	}
	endLap() {
		this.pointer = (this.pointer + 1) % this.players.length;
	}
	take(player) {
		var playerCurr = this.playerCurrent();
		playerCurr.hand.push(this.stack.pop());
		if (!playerCurr.equal(player))
			this.fault(player);
	}
	discard(player, card) {
		var lastCard = this.heap.card(-1);
		console.log("discard", player, card, lastCard);
		if (lastCard.equal(card))
			this.heap.push(card)
		else {
			this.players.searchAndGet(player).heap.push(card);
			this.fault(player);
			return false;
		}
		return true;
	}
	fault(player) {
		var p = this.players.searchAndGet(player);
		if (p != null) {
			console.log("fault player", player);
			p.heapPush(this.stack.pop());
		}
	}
	show() {
		this.stack.show();
		this.heap.show();
		this.players.show();
		console.log("current player", this.playerCurrent().id);
	}
}

var unitest = function() {

var game = new Game([1]);
game.players.add(2);
game.players.add(3);
game.players.remove(2);
game.players.remove(2);
if (game.start()) {
	game.heap.push(game.stack.pop());
	game.take(2);
	game.take(3);
	game.discard(1, game.players.searchAndGet(1).heap.get(1));
	game.take(1);
}
game.show();

}

unitest();