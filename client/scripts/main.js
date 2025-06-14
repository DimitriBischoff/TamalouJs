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
		if (tchat_last.innerHTML) {
			let last = document.createElement('p');
	
			last.innerHTML = tchat_last.innerHTML;
			tchat_last.innerHTML = '';
			
			tchat_history.appendChild(last);
		}
		if (tchat_history.childNodes.length >= 10) {
			tchat_history.removeChild(tchat_history.childNodes[0])
		}
	}
	if (tchat_last.timeout) {
		clearTimeout(tchat_last.timeout);
	}

	push_last_message();

	tchat_last.innerHTML = msg;
	
	// tchat_last.style.opacity = 1;

	tchat_last.removeAttribute('hidden');
	tchat_open.setAttribute('hidden', '');

	// setTimeout(() => {
	// 	tchat_last.style.opacity = 0;
	// }, 100);

	tchat_last.timeout = setTimeout(() => {
		tchat_last.setAttribute('hidden', '');
		tchat_open.removeAttribute('hidden');
		push_last_message();
	}, 6000);

}

let gm = null;

/* MAIN */
async function main() {
	await window.loaded;

	sc = new SocketClient(`ws://${location.hostname}:8081`);
	let future_images = imageLoader([
		new Sprite('pixel_cards', 'assets/images/pixel_cards.png', 14, 4),
		new Sprite('pixel_stack', 'assets/images/pixel_stack.png', 7, 1),
	]);
	
	let images = await future_images;

	let dm = new DomManager(images);
	gm = new GameManager(dm, sc);

	sc.on('authOk', (data) => {
		modalAuth.style.display = "none";
		gm.my_id = data;
	});
	sc.on('open', () => {
		const user = JSON.parse(localStorage.getItem('tamalou'));
		if (!user) return;

		gm.my_username = user.name;
		sc.send('auth', {
			'name': user.name,
			'auth_id': user.auth_id
		});
	});
	sc.run();

	if (!localStorage.getItem('tamalou')) {
		modalAuth.style.display = "block"; 
	}

	modalAuthOk.onclick = async function() {
		const name = modalName.value.trim();
		const auth_id = Array(16).fill('0').map(e => "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.random() * 62 |0]).join('');

		if (!name) return;

		gm.my_username = name;
		await sc.ready;

		localStorage.setItem('tamalou', JSON.stringify({'name': name, 'auth_id': auth_id}));

		sc.send('auth', {
			'name': name,
			'auth_id': auth_id
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
}

main();
