screen.lockOrientationUniversal = screen.lockOrientation || screen.mozLockOrientation || screen.msLockOrientation;
// screen.lockOrientationUniversal('portrait');

fullscreen_button.addEventListener('click', () => {
	if (!document.fullscreenElement) {
		fullscreen_.requestFullscreen();
	}
	else {
		document.exitFullscreen();
	}
});


window.loaded = new Promise(resolve => {
	window.addEventListener('load', () => {
		resolve(true);
	})
})

window.addEventListener('click', function(event) {
	if (event.target == modalGame) {
		modalGame.style.display = "none";
	}
	if (event.target == modalJoin) {
		modalJoin.style.display = "none";
	}
})

new_game.onclick = () => {
	modalGame.style.display = "block";
}

closeModalGame.onclick = () => {
	modalGame.style.display = "none";
}

closeModalJoin.onclick = () => {
	modalJoin.style.display = "none";
}

closeScores.onclick = () => {
	scores_page.setAttribute('hidden', '');
}

tchat.onclick = () => {
	tchat_history.toggleAttribute('hidden');
}

function tchat_message(msg) {

	function push_last_message() {
		if (tchat_history.childNodes.length >= 10) {
			tchat_history.removeChild(tchat_history.childNodes[0])
		}
		if (tchat_last.innerHTML) {
			let last = document.createElement('p');
	
			last.innerHTML = tchat_last.innerHTML;
			tchat_last.innerHTML = '';
			
			tchat_history.appendChild(last);
		}
	}
	if (tchat_last.timeout) {
		clearTimeout(tchat_last.timeout);
	}

	push_last_message();

	tchat_last.innerHTML = msg;
	
	tchat_last.style.opacity = 1;

	tchat_last.removeAttribute('hidden');

	setTimeout(() => {
		tchat_last.style.opacity = 0;
	}, 100);

	tchat_last.timeout = setTimeout(() => {
		tchat_last.setAttribute('hidden', '');
		tchat_open.removeAttribute('hidden');
		push_last_message();
	}, 6000);

	tchat_open.setAttribute('hidden', '');
}

let gm = null;

/* MAIN */
async function main() {
	await window.loaded;

	sc = new SocketClient("ws://192.168.0.47:8081");
	// sc = new SocketClient("ws://88.165.64.91:45455");
	let future_images = imageLoader([
		new Sprite('pixel_cards', 'assets/images/pixel_cards.png', 14, 4),
		new Sprite('pixel_stack', 'assets/images/pixel_stack.png', 7, 1),
		new Sprite('icons', 'assets/images/icons.png', 4, 1)
	]);
	
	let images = await future_images;

	let dm = new DomManager(images);
	gm = new GameManager(dm, sc);

	sc.on('authOk', (data) => {
		myModal.style.display = "none";
		gm.my_id = data;
	});

	modalOk.onclick = async function() {
		var name = modalName.value.trim();
		var password = modalPassword.value;
		var salt = modalSalt.value.trim();

		if (!name || !password) return;

		gm.my_username = name;
		await sc.ready;

		sc.send('auth', {
			'name': name,
			'auth_id': SHA256(name + password + salt)
		});

		sc.on('open', () => {
			setTimeout(() => {
				sc.send('auth', {
					'name': name,
					'auth_id': SHA256(name + password + salt)
				});
			}, 500);
		});
	}

	modalGameOk.onclick = async function() {
		var name = modalGameName.value.trim();
		var password = modalGamePassword.value;

		if (!name) return;

		await sc.ready;

		modalGame.style.display = 'none';

		sc.send('new_game', {
			'name': name,
			'password': password ? SHA256(password) : null
		});
	}

	modalJoinOk.onclick = async function() {
		var id = modalJoinId.value;
		var password = modalJoinPassword.value.trim();

		if (modalJoinPasswordP.style.display != 'none' && !password) return;

		await sc.ready;

		modalJoin.style.display = 'none';

		sc.send('join', {
			'id': id,
			'password': password ? SHA256(password) : null
		});
	}

	sc.run();
}

main();
