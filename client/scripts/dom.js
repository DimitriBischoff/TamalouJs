const CLICK_STATE = {
	SIMPLE: 0,
	DOUBLE: 1,
	SWAP: 2,
};

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
		this.last_seed = null;

		this.init();
	}

	init() {
		let stack = document.createElement('canvas');
		stack.width = this.images['pixel_stack'].width;
		stack.height = this.images['pixel_stack'].height;
		document.querySelector('[position="stack"]').appendChild(stack);

		this.stack = stack;
		this.stack_update(54);
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
		this.last_seed = seed;
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

	view_update(player, onclick_card = null) {
		this.view.write_name(player.name);
		this.view.clear_ground();
		for (let i = 0; i < player.cards.length; i++)
			if (onclick_card)
				this.view.ground.appendChild(this.new_card(player.cards[i], (click_state) => {
					onclick_card(i, click_state);
				}));
			else
				this.view.ground.appendChild(this.new_card(player.cards[i]));
	}

	new_card(num, onclick = null) {
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
			canvas.style.top = '0px';
			canvas.style.left = '0px';
			canvas.nb_click = 0;

			function click() {
				if (canvas.nb_click == 0) {
					setTimeout(() => {
						if (canvas.nb_click > 1)
							onclick(CLICK_STATE.DOUBLE);
						else
							onclick(CLICK_STATE.SIMPLE);
						canvas.nb_click = 0;
					}, 100);
				}
				
				canvas.nb_click += 1;
			}

			
			function touchmove(e) {
				e.preventDefault();
				var x = 0;
				var y = 0;

				if (e.touches) {
					x = e.touches[0].clientX;
					y = e.touches[0].clientY;
				}
				else {
					x = e.clientX;
					y = e.clientY;
				}

				canvas.style.top = `${y - canvas.positionY}px`;
				canvas.style.left = `${x - canvas.positionX}px`;
			}

			function wintouchstart(e) {
				canvas.style.transitionDuration = '0s';
				canvas.style.top = '0px';
				canvas.style.left = '0px';
			}

			function cantouchstart(e) {
				e.preventDefault();
				canvas.style.transitionDuration = '0s';
				
				if (e.touches) {
					canvas.positionX = e.touches[0].clientX;
					canvas.positionY = e.touches[0].clientY;
				}
				else {
					canvas.positionX = e.clientX;
					canvas.positionY = e.clientY;
				}

				window.addEventListener('mousemove', touchmove);
				window.addEventListener('touchmove', touchmove);
			}

			function touchend(e) {
				const top = parseInt(canvas.style.top);
				const left = parseInt(canvas.style.left);
				const dist = Math.sqrt(top*top + left*left);

				if (Math.abs(top) / window.innerHeight * 100 <= 5 && dist < 5) {
					if (e.target == canvas) click();
					canvas.style.transitionDuration = '0s';
				}
				else {
					canvas.style.transitionDuration = '500ms';
				}

				if (e.target == canvas && parseInt(top) / window.innerHeight * 100 <= -20) {
					onclick(CLICK_STATE.SWAP);
					canvas.style.transitionDuration = '200ms';
					canvas.style.top = `${-canvas.positionY + window.innerHeight * 0.25}px`;
					canvas.style.left = `${window.innerWidth / 2 - canvas.positionX}px`;
				}
				else {
					canvas.style.top = '0px';
					canvas.style.left = '0px';
				}

				window.removeEventListener('mousemove', touchmove);
				window.removeEventListener('touchmove', touchmove);
			}

			canvas.addEventListener('transitionend', () => {
				if (parseInt(canvas.style.top) == 0 && parseInt(canvas.style.left) == 0) {
					canvas.style.transitionDuration = '0s';
				}
			});

			
			window.addEventListener('mouseup', touchend);
			window.addEventListener('mousedown', wintouchstart);
			canvas.addEventListener('mousedown', cantouchstart);

			window.addEventListener('touchend', touchend);
			window.addEventListener('touchstart', wintouchstart);
			canvas.addEventListener('touchstart', cantouchstart);
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
		password.innerHTML = game.password ? '&#x1F512;': ' ';

		let players = document.createElement('p');
		players.innerHTML = game.players;

		let locked = document.createElement('p');
		locked.innerHTML = game.locked ? '&#x231B;': ' ';

		li.appendChild(locked);
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

	add_profile_menu(name) {
		let li = document.createElement('li');
		let dom_name = document.createElement('p');
		dom_name.textContent = name;

		li.classList.add('profile');
		li.appendChild(dom_name);

		options_list.appendChild(li);
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

	async animate(data, wait=false) {

		const target = (e) => {
			switch(e) {
				case 'stack':
					return this.stack;
					break;
				case 'heap':
					return this.heap;
					break;
				default:
					if (e[1] == 'hand') {
						return this.dom_players.get(e[0]).hand;
					}
					else {
						return this.dom_players.get(e[0]).ground.children[e[1]];
					}
			}
		}
		const offsetTop = (e) => {  // calc rotate
			if (!e || e == table) return 0;
			return e.getBoundingClientRect().top - screen_.offsetTop | 0;
			// return e.offsetTop + offsetTop(e.offsetParent);
		}
		const offsetLeft = (e) => {  // calc rotate
			if (!e || e == table) return 0;
			return e.getBoundingClientRect().left - screen_.offsetLeft | 0;
			// return e.offsetLeft + offsetLeft(e.offsetParent);
		}
		const offsetRotate = (e) => {
			if (!e || e == table) return null;
			let matrice = window.getComputedStyle(e, null).transform;
			if (matrice != "none") return matrice;
			return offsetRotate(e.offsetParent);
		}

		// console.log(data);

		for (let anim of data) {
			let dest = target(anim[2]);

			if (dest != this.heap) {
				dest.setAttribute('move', '');
			}
		}

		for (let anim of data) {
			let card = anim[0];
			let src = target(anim[1]);
			let dest = target(anim[2]);

			// console.log('src', src);
			// console.log('dest', dest);

			let dom_card = this.new_card(card);

			if (src == this.heap) {
				src = this.heap.lastChild;
			}

			if (dest == this.heap) {
				dest = this.new_card_heap(card, this.last_seed)
				this.heap.appendChild(dest);
				dest.setAttribute('move', '');
			}

			dom_card.style.position = 'absolute';
			dom_card.style.left = `${offsetLeft(src)}px`;
			dom_card.style.top = `${offsetTop(src)}px`;
			dom_card.style.height = `${src.offsetHeight}px`;
			dom_card.style.width = `${src.offsetWidth}px`;

			let src_rotate = offsetRotate(src);

			if (src_rotate) {
				dom_card.style.transform = src_rotate;
			}

			dom_card.style.transitionDuration = '200ms';

			if (src != this.stack) {
				src.setAttribute('move', '');
			}
			table.appendChild(dom_card);

			dom_card.style.left = `${offsetLeft(dest)}px`;
			dom_card.style.top = `${offsetTop(dest)}px`;
			dom_card.style.height = `${dest.offsetHeight}px`;
			dom_card.style.width = `${dest.offsetWidth}px`;

			let dest_rotate = offsetRotate(dest);

			if (dest_rotate) {
				dom_card.style.transform = dest_rotate;
			}

			// console.log(src_rotate, dest_rotate);
			
			setTimeout(() => {
				table.removeChild(dom_card);
				src.removeAttribute('move');
				dest.removeAttribute('move');
			}, 200);

			if (wait) {
				await new Promise(r => setTimeout(r, 100));
			}
		}
	}
}