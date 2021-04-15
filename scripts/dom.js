var random_seed = function(seed) {
	return () => {
		var x = Math.sin(seed++) * 10000;
		return x - Math.floor(x);
	}
}

function Random(random, min, max) {
	return random() * (max - min) + min;
}

class DomPlayer {
	constructor(position, field_name, ground, hand) {
		this.position = position;
		this.field_name = field_name;
		this.ground = ground;
		this.hand = hand;
	}

	write_name(name) {
		this.field_name.innerHTML = name;
	}

	clear_ground() {
		this.ground.innerHTML = '';
	}

	active() {
		this.position.setAttribute('active', '');
	}

	deactive() {
		this.position.removeAttribute('active');
	}

	select() {
		this.position.setAttribute('select', '');
	}

	deselect() {
		this.position.removeAttribute('select');
	}
	
	ready() {
		this.position.setAttribute('ready', '');
	}

	tamalou() {
		this.position.setAttribute('tamalou', '');
	}

	deconnected() {
		this.position.setAttribute('deconnected', '');
	}
}

class DomButton {
	constructor(dom_button, onclick) {
		this.dom_button = dom_button;

		dom_button.addEventListener('click', () => {
			onclick();
		})
	}

	visible() {
		this.dom_button.removeAttribute('hidden');
	}

	hide() {
		this.dom_button.setAttribute('hidden', '');
	}
}

class DomManager {
	constructor(images) {
		this.images = images;
		this.dom_players = new Map();
		this.buttons = {};
		this.table = document.getElementById('table');
		this.view = new DomPlayer(null, document.querySelector('#view p'), document.querySelector('#view [ground]'));
		this.heap = document.querySelector('[position="heap"]');
		this.stack = null;

		this.init();
	}

	init() {
		let stack = document.createElement('canvas');
		stack.width = this.images['pixel_stack'].width;
		stack.height = this.images['pixel_stack'].height;
		document.querySelector('[position="stack"]').appendChild(stack);

		this.stack = stack;
		this.stack_update(54);

		options_button.appendChild(this.icon(0));
		fullscreen_button.appendChild(this.icon(1));
		swap_button.appendChild(this.icon(2));
	}

	icon(nb) {
		let image = this.images['icons'];
		let canvas = document.createElement('canvas');
		
		canvas.hasAttributeNS.images
		canvas.width = image.width;
		canvas.height = image.height;

		image.draw(canvas.getContext('2d'), 0 ,0, nb, 0);

		return canvas;
	}

	clear_all() {
		this.clear_players();
		this.view.clear_ground();
		this.stack_update(54);
		this.heap_clear();
	}

	add_button(name, dom_button, onclick) {
		this.buttons[name] = new DomButton(dom_button, onclick);
	}

	clear_players() {
		this.dom_players = new Map();

		for (let i = 0; i < this.table.childNodes.length;) {
			let elem = this.table.childNodes[i];

			if (elem.nodeName == "DIV" && elem.hasAttribute("player"))
				elem.parentNode.removeChild(elem);
			else i++;
		}
	}

	deselect_players() {
		for (const value of this.dom_players.values()) {
			value.deselect();
		}
	}

	select_player(player_id) {
		this.dom_players.get(player_id).select();
	}

	
	deactive_players() {
		for (const value of this.dom_players.values()) {
			value.deactive();
		}
	}

	active_player(player_id) {
		this.dom_players.get(player_id).active();
	}

	new_player(player,  onclick) {
		let position = document.createElement('div');
		let ground = document.createElement('div');
		let hand = document.createElement('div');
		let field_name = document.createElement('p');
		const player_index = this.dom_players.size;

		position.setAttribute('position', player_index + 1);
		position.setAttribute('player', '');

		ground.setAttribute('ground', '');
		field_name.innerHTML = player.name;

		hand.setAttribute('hand', '');

		position.appendChild(hand);
		position.appendChild(ground);
		position.appendChild(field_name);
		this.table.appendChild(position);

		position.addEventListener('click', () => {
			onclick(player.id);
		});

		let dom_player = new DomPlayer(position, field_name, ground, hand);

		if (!player.connected)
			dom_player.deconnected();

		this.dom_players.set(player.id, dom_player);

	}

	stack_update(nb) {
		const stack_img = this.images['pixel_stack'];
		let ctx = this.stack.getContext('2d');

		ctx.clearRect(0, 0, this.stack.width, this.stack.height);

		if (nb > 50)
			stack_img.draw(ctx, 0, 0, 6, 0);
		else if (nb > 40)
			stack_img.draw(ctx, 0, 0, 5, 0);
		else if (nb > 30)
			stack_img.draw(ctx, 0, 0, 4, 0);
		else if (nb > 20)
			stack_img.draw(ctx, 0, 0, 3, 0);
		else if (nb > 10)
			stack_img.draw(ctx, 0, 0, 2, 0);
		else if (nb > 1)
			stack_img.draw(ctx, 0, 0, 1, 0);
		else if (nb > 0)
			stack_img.draw(ctx, 0, 0, 0, 0);
	}

	new_card_heap(card, seed) {
		let r = random_seed(seed + this.heap.childNodes.length * 3);
		let new_card = this.new_card(card);

		new_card.style.top = Random(r, 1, 7) + 'vh';
		new_card.style.left = Random(r, 1, 7) + 'vh';
		new_card.style.transform = 'rotate(' + Random(r, 0, 360) + 'deg)';
		return new_card;
	}

	heap_update(cards, seed) {
		if (this.heap.childNodes.length > cards.length)
			this.heap_clear();

		for(let i = this.heap.childNodes.length; i < cards.length; i++)
			this.heap.appendChild(this.new_card_heap(cards[i], seed));
	}

	heap_clear() {
		this.heap.innerHTML = '';
	}

	heap_pop(i = -1) {
		let card = this.heap.childNodes[i != -1 ? i : this.heap.childNodes.length - 1];
		card.parentNode.removeChild(card);
	}

	ground_update(player) {
		let dom_player = this.dom_players.get(player.id);
		
		dom_player.clear_ground();
		for (let i = 0; i < player.cards.length; i++)
			dom_player.ground.appendChild(this.new_card(player.cards[i]));
	}

	hand_update(player, onclick = null) {
		let dom_player = this.dom_players.get(player.id);

		dom_player.hand.innerHTML = '';
		if (player.hand != null) {
			dom_player.hand.appendChild(this.new_card(player.hand, onclick));
			dom_player.hand.removeAttribute('hidden');
		}
		else {
			dom_player.hand.setAttribute('hidden', '');
		}
	}

	active_card_ground(player_id, card_index) {
		let dom_player = this.dom_players.get(player_id);

		dom_player.ground.childNodes[card_index].setAttribute('active', '');
	}
	
	active_card_view(card_index) {
		this.view.ground.childNodes[card_index].setAttribute('active', '');
	}

	deactive_cards_ground(player_id) {
		let dom_player = this.dom_players.get(player_id);

		for (let j = 0; j < 8; j++) {
			dom_player.ground.childNodes[j].removeAttribute('active');
		}
	}

	deactive_cards_view() {
		for (let j = 0; j < 8; j++) {
			this.view.ground.childNodes[j].removeAttribute('active');
		}
	}

	card_hide(player_id, card_index) {
		let dom_player = this.dom_players.get(player_id);

		dom_player.ground.childNodes[card_index].style.opacity = 0;
	}

	card_visible(player_id, card_index) {
		let dom_player = this.dom_players.get(player_id);

		dom_player.ground.childNodes[card_index].style.opacity = 1;
	}

	view_update(player, onclick_card) {
		this.view.write_name(player.name);
		this.view.clear_ground();
		for (let i = 0; i < player.cards.length; i++)
			this.view.ground.appendChild(this.new_card(player.cards[i], (is_dblclick) => {
				onclick_card(i, is_dblclick);
			}));
	}

	new_card(num, onclick) {
		const cards_img = this.images['pixel_cards'];
		let canvas = document.createElement('canvas');
		let ctx = canvas.getContext('2d');

		canvas.width = cards_img.width;
		canvas.height = cards_img.height;

		if (num == 55) return canvas;

		let x = num % cards_img.nb_x;
		let y = num / cards_img.nb_x | 0;

		cards_img.draw(ctx, 0, 0, x, y);
		
		if (onclick) {
			canvas.nb_click = 0;

			canvas.onclick = () => {
				if (canvas.nb_click == 0) {
					setTimeout(() => {
						onclick(canvas.nb_click > 1);
						canvas.nb_click = 0;
					}, 250);
				}
				
				canvas.nb_click += 1;
			}
		}

		return canvas;
	}

	games_list_hide() {
		games_list.style.display = 'none';
		fullscreen_button.classList.remove('bottom');
		fullscreen_button.classList.add('middle');
	}

	games_list_show() {
		games_list.style.display = 'flex';
		fullscreen_button.classList.add('bottom');
		fullscreen_button.classList.remove('middle');
	}

	modal_join_show(game) {
		modalJoinId.value = game.id;

		if (game.password)
			modalJoinPasswordP.style.display = 'flex';
		else
			modalJoinPasswordP.style.display = 'none';

		modalJoinName.innerHTML = game.name;
		modalJoinPlayers.innerHTML = game.players;
		modalJoinPassword.value = null;

		modalJoin.style.display = 'block';
	}

	create_elem_game(game) {
		let li = document.createElement('li');
		
		li.onclick = () => {
			this.modal_join_show(game);
		};

		let name = document.createElement('p');
		name.innerHTML = game.name;

		let password = document.createElement('p');
		password.innerHTML = game.password ? 'Oui': 'Non';

		let players = document.createElement('p');
		players.innerHTML = game.players;

		if (game.locked) {
			li.appendChild(this.icon(3));
		}
		else {
			li.appendChild(document.createElement('canvas'));
		}

		li.appendChild(name);
		li.appendChild(password);
		li.appendChild(players);

		return li;
	}

	games_list_update(list, filter) {
		games_list_content.innerHTML = '';

		if (filter) {
			filter = filter.toLowerCase();
			for (let i = list.length - 1; i > -1; i--) {
				if (list[i].name.toLowerCase().includes(filter)) {
					games_list_content.appendChild(this.create_elem_game(list[i]));
				}
			}
		}
		else {
			for (let i = list.length - 1; i > -1; i--) {
				games_list_content.appendChild(this.create_elem_game(list[i]));
			}
		}
	}

	create_button_menu(name, onclick) {
		let li = document.createElement('li');
		
		li.onclick = () => {
			onclick();
		};

		let dom_name = document.createElement('p');
		dom_name.innerHTML = name;

		li.appendChild(dom_name);

		options_list.appendChild(li);
	}

	clear_menu() {
		options_list.innerHTML = '';
	}

	scores_show(scores) {
		scores_content.innerHTML = '';

		let total = new Array(scores[0].length).fill(0);

		let thead = document.createElement('thead');
		let tbody = document.createElement('tbody');
		let tfoot = document.createElement('tfoot');
		{
			let line = document.createElement('tr');
			for (let i = 0; i < total.length; i++) {
				let col = document.createElement('th');

				col.innerHTML = scores[0][i];
				
				line.appendChild(col);
			}
			thead.appendChild(line);
		}

		for (let j = 1; j < scores.length; j++) {
			let line = document.createElement('tr');

			for (let i = 0; i < scores[j].length; i++) {
				let col = document.createElement('td');

				if (j > 0)
					total[i] += scores[j][i];

				col.innerHTML = scores[j][i];
				line.appendChild(col);
			}
			tbody.appendChild(line);
		}

		{
			let line = document.createElement('tr');
			for (let i = 0; i < total.length; i++) {
				let col = document.createElement('td');

				col.innerHTML = total[i];
				
				line.appendChild(col);
			}
			tfoot.appendChild(line);
		}

		scores_content.appendChild(thead);
		scores_content.appendChild(tbody);
		scores_content.appendChild(tfoot);
		
		scores_page.removeAttribute('hidden');
	}

	statistics_show(name, statistics) {
		scores_content.innerHTML = '';

		let thead = document.createElement('thead');
		let tbody = document.createElement('tbody');
		let tfoot = document.createElement('tfoot');

		{
			let line = document.createElement('tr');
			let key = document.createElement('th');

			key.innerHTML = name;
			
			line.appendChild(key);
			thead.appendChild(line);
		}
		
		for (let k in statistics) {
			let line = document.createElement('tr');
			let key = document.createElement('th');
			let value = document.createElement('td');

			key.innerHTML = {
				'started': 'Commencé',
				'finnished': 'Fini',
				'min': 'Min',
				'max': 'Max',
				'mean': 'Moyenne'
			}[k];
			value.innerHTML = statistics[k];

			line.appendChild(key);
			line.appendChild(value);
			tbody.appendChild(line);
		}

		scores_content.appendChild(thead);
		scores_content.appendChild(tbody);
		scores_content.appendChild(tfoot);
		
		scores_page.removeAttribute('hidden');
	}
}