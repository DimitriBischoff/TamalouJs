// Rework urgent: true_index <> fake_index

const POWER = {
    NOTHING: 0,
    SEE_MY_CARD: 1,
    SEE_YOU_CARD: 2,
    SWAP: 3,
    KING_PART_1: 4,
    KING_PART_2: 5
};

const STATE = {
    NOTHING: 0,
    GET_HEAP: 1,
    GET_STACK: 2,
    USE_POWER: 3,
    END: 4
};

class Player {
	constructor(id, name, position, connected) {
		this.id = id;
		this.name = name;
		this.position = position;
		this.connected = connected;
		this.ready = false;
		this.cards = new Array(8);
		this.hand = null;
		this.state = STATE.NOTHING;
		this.power = POWER.NOTHING;
		this.current = false;
	}
}

class GameManager {
	constructor(dom_manager, socket_client) {
		this.dm = dom_manager;
		this.sc = socket_client;
		this.players = {};
		this.players_index = [];
		this.players_true_index = {};
		this.players_true_index_tab = [];
		this.my_id = null;
		this.my_username = null;
		this.is_join = false;
		this.in_game = false;
		this.is_ready = false;
		this.player_selected = -1;
		this.cards_selected = {};
		this.scores = null;
		this.nb_parties = 0;
		this.game_list = [];
		this.statistics = null;
		this.stop_update = null;

		this.init_buttons();
		this.init_event();
	}

	init_buttons() {
		this.dm.add_button('stack', document.querySelector('[position="stack"]'), () => { this.click_stack(); });
		this.dm.add_button('heap', document.querySelector('[position="heap"]'), () => { this.click_heap(); });
		this.dm.add_button('swap', swap_button, () => { this.click_swap(); });
		this.dm.add_button('options', options_button, () => { this.click_options(); });
		this.dm.add_button('launch', launch_button, () => { this.click_launch(); });
		this.dm.add_button('ready', ready_button, () => { this.click_ready(); });
		
		games_list_search.oninput = () => {
			clearTimeout(games_list_search.timeout);

			games_list_search.timeout = setTimeout(() => {
				this.dm.games_list_update(this.game_list, games_list_search.value);
			}, 500);
		};
	}

	init_event() {
		this.sc.on('players', (data) => {
			this.update_players(data);
			this.dm.games_list_hide();
		});
		this.sc.on('gameList', (data) => {
			this.game_list = data;
			this.dm.games_list_update(this.game_list, games_list_search.value);
		});
		this.sc.on('game', async (data) => {

			await this.stop_update;

			console.log('update');

			this.is_join = true;

			if (this.is_ready && data.counter == 0) {
				this.fault = null;
				this.is_ready = false;
				this.dm.heap_clear();
				this.cards_selected = {};
			}

			this.game_update(data);
			
			if (this.fault) {
				this.players[this.fault.player_id].cards[this.fault.card_index] = 55;
				this.dm.ground_update(this.players[this.fault.player_id]);

				if (this.players_index[this.player_selected] == this.fault.player_id)
					this.view_update(this.fault.player_id);
			}
		});
		this.sc.on('selected', (data) => {
			this.cards_selected = {};

			for (let true_index in data) {
				let player_id = this.players_true_index_tab[true_index];
				let fake_index = this.players[player_id].position;

				this.cards_selected[fake_index] = data[true_index];
			}
		})
		this.sc.on('scores', (data) => {
			if (data.finish) {
				this.dm.buttons['launch'].hide();
			}
			this.scores = [];
			this.nb_parties = data.points.length;

			{
				let scores = [];

				for (let i = 0; i < this.players_index.length; i++) {
					let player_id = this.players_index[i];

					scores.push(this.players[player_id].name);
				}
				this.scores.push(scores);
			}
			
			for (let j = 0; j < data.points.length; j++) {
				let scores = [];

				for (let i = 0; i < this.players_index.length; i++) {
					let player_id = this.players_index[i];
					let score_game = data.points[j];

					scores.push(score_game[player_id]);
				}
				this.scores.push(scores);
			}
			
			this.dm.scores_show(this.scores);
		});
		this.sc.on('tchat', (data) => {
			tchat_message(data);
		});
		this.sc.on('statistics', (data) => {
			this.statistics = data;
			if (!this.in_join) {
				this.dm.statistics_show(this.my_username, this.statistics);
			}
		})
		this.sc.on('animate', async (data) => {
			if (data.length >= 4) {
				this.stop_update = new Promise(r => setTimeout(r, data.length * 20000 + data.length * 100));
				await this.dm.animate(data, true);
			}
			else {
				this.stop_update = new Promise(r => setTimeout(r, 200));
				await this.dm.animate(data, false);
			}
		});
	}

	update_players(players) {
		this.in_game = false;
		this.is_join = true;
		this.players = {};
		this.players_index = [];
		
		this.dm.clear_players();

		let my_index = -1;

		if (this.my_id != null) {
			for (let i = 0; i < players.length; i++) {
				if (this.my_id == players[i].id) {
					my_index = i;
					break;
				}
			}
		}

		for (let i = my_index; i < players.length; i++) {
			this.new_player(players[i]);
		}

		for (let i = 0; i < my_index; i++) {
			this.new_player(players[i]);
		}

		if (players.length > 1 && players[my_index].launcher)
			this.dm.buttons['launch'].visible();
	}

	game_update(game) {
		let current_player_id = game.players[game.counter % game.players.length].id;

		this.in_game = true;
		this.players_true_index = {};
		this.players_true_index_tab = [];

		this.dm.buttons['launch'].hide();
		this.dm.buttons['ready'].hide();
		
		this.dm.stack_update(game.stack);
		this.dm.heap_update(game.heap, game.seed);

		if (game.counter > 0)
			this.is_ready = true;

		for (let i = 0; i < game.players.length; i++) {
			let p = game.players[i];

			this.players[p.id].ready = p.ready;
			this.players[p.id].hand = p.hand;
			this.players[p.id].cards = p.heap;
			this.players[p.id].state = p.state;
			this.players[p.id].power = p.power;
			this.players[p.id].current = false;

			if (game.counter == 0 && p.ready)
				this.dm.dom_players.get(p.id).ready();

			this.dm.ground_update(this.players[p.id]);

			if (p.id == this.my_id)
				this.dm.hand_update(this.players[p.id], (click_state) => {
					this.click_manager(this.my_id, -1, click_state);
					// if (is_dblclick && ![1,2].includes(this.players[p.id].state) && p.id == this.my_id) {
					// 	this.dblclick_card(this.players[p.id].position, -1);
					// }
				});
			else
				this.dm.hand_update(this.players[p.id]);
			
			this.players_true_index_tab.push(p.id);
			this.players_true_index[p.id] = i;
		}
		
		if (game.counter != 0) {
			this.dm.deactive_players();
			this.dm.active_player(current_player_id);
		}

		this.players[current_player_id].current = true;

		for (let player_index in this.cards_selected) {
			let card_selected = this.cards_selected[player_index];
			let player_id = this.players_index[player_index];

			this.dm.active_card_ground(player_id, card_selected);
		}

		if (game.counter == 0 && this.players[this.my_id].ready == false) {
			this.dm.buttons['ready'].visible();
			this.dm.buttons['swap'].visible();
		}

		if (this.players[this.my_id].state >= 3) {
			this.dm.buttons['ready'].visible();
		}

		if (this.player_selected != -1)
			this.click_player(this.players_index[this.player_selected]);
		else
			this.click_player(this.my_id);

		if (game.tamalou_lap != null) {
			let tamalou_index = game.tamalou_lap % game.players.length;
			let player_id = game.players[tamalou_index].id

			this.dm.dom_players.get(player_id).tamalou();
		}
	}

	new_player(player) {
		this.players[player.id] = new Player(player.id, player.name, this.players_index.length, player.connected);
		this.players_index.push(player.id);
		this.dm.new_player(player, (player_id) => {
			this.click_player(player_id);
		});
	}

	click_swap() {
		console.log('swap')
		if (this.in_game) {
			this.sc.send('swap')
		}
	}

	click_stack() {
		console.log('stack');
		if (this.in_game && this.players[this.my_id].state == STATE.NOTHING) {
			this.sc.send('pull', 'stack');
		}
	}

	click_heap() {
		console.log('heap');
		if (this.in_game) {
			if (this.players[this.my_id].state == STATE.NOTHING) {
				this.sc.send('pull', 'heap');
			}
			else if (this.players[this.my_id].state == STATE.GET_STACK) {
				this.sc.send('use');
			}
		}
	}

	click_options() {
		console.log('options');
		
		if (options_list.hasAttribute('hidden')) {
			this.dm.clear_menu();
			
			this.dm.add_profile_menu(this.my_username);

			if (this.is_join) {
				this.dm.create_button_menu('Points', () => {
					console.log(this.scores);
					
					if (this.scores) {
						this.dm.scores_show(this.scores);
					}
					options_list.setAttribute('hidden', '');
				});
	
				this.dm.create_button_menu('Tamalou', () => {
					if (this.players[this.my_id].current && this.players[this.my_id].ready) {
						this.sc.send('tamalou');
					}
					options_list.setAttribute('hidden', '');
				});
				
				this.dm.create_button_menu('Deconnexion', () => {
					this.unjoin();
					options_list.setAttribute('hidden', '');
				});
			}
			else {
				this.dm.create_button_menu('Historique', () => {
					this.sc.send('statistics');
					options_list.setAttribute('hidden', '');

					if (this.statistics != null) {
						this.dm.statistics_show(this.my_username, this.statistics);
					}
				});
			}
		}
		
		options_list.toggleAttribute('hidden');
	}

	click_launch() {
		console.log('launch');
		if (this.is_join) {
			this.sc.send('launch');
			this.player_selected = -1
		}
	}

	click_ready() {
		console.log('ready');
		
		if (this.is_join) {
			if (this.players[this.my_id].state >= 3) {
				this.sc.send('next');
			}
			else {
				this.sc.send('ready');
				this.dm.buttons['swap'].hide();
			}
			this.dm.buttons['ready'].hide();
		}
	}

	unjoin() {
		this.sc.send('unjoin');
		this.is_join = false;
		this.in_game = false;
		this.is_ready = false;
		this.player_selected = -1;
		this.scores = null;
		this.game_counter = 0;
		this.cards_selected = {};
		this.dm.games_list_show();
		this.dm.buttons['ready'].hide();
		this.dm.buttons['swap'].hide();
		this.dm.buttons['launch'].hide();
		this.dm.clear_all();
	}

	click_player(player_id) {		
		if (this.in_game && this.players[this.my_id].ready == false && player_id == this.my_id)
			this.dm.buttons['swap'].visible();
		else
			this.dm.buttons['swap'].hide();

		this.dm.deselect_players();
		this.dm.select_player(player_id);
		this.view_update(player_id);

		this.player_selected = this.players[player_id].position;
		let card_selected = this.cards_selected[this.player_selected];

		if (card_selected)
			this.dm.active_card_view(card_selected);
	}

	click_manager(player_id, card_index, click_state) {
		switch (click_state) {
			case CLICK_STATE.SIMPLE: {
				console.log('simple', card_index);
				this.click_card(this.players[player_id].position, card_index);
			} break;
			case CLICK_STATE.DOUBLE: {
				console.log('double', card_index);
				this.click_card(this.players[player_id].position, card_index);
				// this.dblclick_card(this.players[player_id].position, card_index);
			} break;
			case CLICK_STATE.SWAP: {
				console.log('swap', card_index);
				this.swap_card(this.players[player_id].position, card_index);
			} break;
			default:
		}
	}

	view_update(player_id) {
		if (this.is_ready && (player_id == this.my_id || 
			(this.players[this.my_id].state == STATE.USE_POWER && [POWER.SEE_YOU_CARD, POWER.SWAP, POWER.KING_PART_1].includes(this.players[this.my_id].power))))
			this.dm.view_update(this.players[player_id], (card_index, click_state) => {
				this.click_manager(player_id, card_index, click_state);
			});
		else
			this.dm.view_update(this.players[player_id]);
	}

	swap_card(player_index, card_index) {
		let player_id = this.players_index[player_index];

		if (player_id != this.my_id) return;

		if (card_index == -1) {
			switch (this.players[player_id].state) {
				case STATE.GET_STACK: {
					this.sc.send('use');
				} break;
				case STATE.END: {
					this.sc.send('discard', -1);
				} break;
				default:
			}
		}
		else {
			if ([STATE.GET_STACK, STATE.GET_HEAP].includes(this.players[player_id].state)) {
				this.sc.send('stock', card_index);
			}
			else {
				this.sc.send('discard', card_index);
			}
		}
	}

	dblclick_card(player_index, card_index) {
		let player_id = this.players_index[player_index];

		console.log('double click', player_id, card_index);
		if (this.players[this.my_id].hand != null && card_index == -1) {
			this.sc.send('discard', -1);
		}
		else if (player_id == this.my_id && this.players[this.my_id].hand == null) {
			this.sc.send('discard', card_index);
		}
	}

	click_card(player_index, card_index) {
		if (!this.is_ready || this.players[this.my_id].state == 0) return;

		let player_id = this.players_index[player_index];

		console.log('click', card_index, this.players[player_id].cards[card_index]);
		if (this.players[player_id].cards[card_index] == 55) return;

		if (this.cards_selected[player_index] == card_index) {
			switch(this.players[this.my_id].state) {
				// case STATE.GET_HEAP: case STATE.GET_STACK: if (player_id == this.my_id) {
				// 	this.sc.send('stock', card_index);
				// }
				// break;
				case STATE.USE_POWER: this.power(player_index, card_index);
				break;
				default:
			}
		}
		else {
			switch (this.players[this.my_id].state) {
				// case STATE.GET_HEAP: case STATE.GET_STACK: if (player_id == this.my_id) {
				// 	this.select_card(player_index, card_index);
				// }
				// break;
				case STATE.USE_POWER: {
					switch (this.players[this.my_id].power) {
						case POWER.SEE_MY_CARD: case POWER.KING_PART_2: if (player_id == this.my_id) {
							this.select_card(player_index, card_index);
						}
						break;
						case POWER.SEE_YOU_CARD: case POWER.KING_PART_1: if (player_id != this.my_id) {
							this.select_card(player_index, card_index);
						}
						break;
						case POWER.SWAP: {
							if (player_id != this.my_id) {
								if (this.cards_selected.length >= 2) {
									let my_index = this.players[this.my_id].position;
									let my_card = this.cards_selected[my_index];

									this.cards_selected = {};

									if (my_card != undefined)
										this.cards_selected[my_index] = my_card;
								}
							}
							this.select_card(player_index, card_index);
						}
						break;
						default:
					}
				}
				break;
				default:
			}
		}

		console.log(player_index, this.players_index[player_index], card_index);
	}

	select_card(player_index, card_index) {
		let player_id = this.players_index[player_index];

		this.dm.deactive_cards_view();
		this.dm.deactive_cards_ground(player_id);

		if (this.cards_selected[player_index] != card_index) {
			this.cards_selected[player_index] = card_index;

			this.dm.active_card_ground(player_id, card_index);
			this.dm.active_card_view(card_index);
		}
		else {
			delete this.cards_selected[player_index];
		}
	}

	power(player_index, card_index) {
		let player_id = this.players_index[player_index];
		let player = this.players[player_id];
		let my_index = this.players[this.my_id].position;

		switch(this.players[this.my_id].power) {
			case POWER.SEE_MY_CARD: case POWER.KING_PART_2:
				if (player.id == this.my_id) {
					this.sc.send('power', card_index);
				}
			break;
			case POWER.SEE_YOU_CARD: case POWER.KING_PART_1: if (player_id != this.my_id) {
					let true_index = this.players_true_index[player_id];
					let data = {};

					data[true_index] = card_index;
					this.sc.send('power', data);
				}
			break;
			case POWER.SWAP: {
				if (Object.keys(this.cards_selected).length == 2 && my_index in this.cards_selected) {
					let cards_selected = {};

					for (let k in this.cards_selected) {
						let pid = this.players_index[k];
						let true_index = this.players_true_index[pid];

						cards_selected[true_index] = this.cards_selected[k];
					}

					this.sc.send('power', cards_selected);
				}
			}
			break;
			default:
		}
	}
}