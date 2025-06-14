class Sprite {
	constructor(name, src, nb_x=1, nb_y=1) {
		this.name = name;
		this.src = src;
		this.nb_x = nb_x;
		this.nb_y = nb_y;
		this.image = null;
		this.width = 0;
		this.height = 0;
	}

	set_image(image) {
		this.image = image;
		this.width = image.width / this.nb_x;
		this.height = image.height / this.nb_y;
	}

	draw(ctx, x, y, ix=0, iy=0) {
		ctx.drawImage(this.image, this.width * ix, this.height * iy, this.width, this.height, x, y, this.width, this.height);
	}
}

async function imageLoader(images_completes) {
	let promises = [];
	let images = {};

	for (let i = 0; i < images_completes.length; i++) {
		let image = new Image();

		promises.push(new Promise((resolve, reject) => {
			image.addEventListener('load', () => {
				images_completes[i].set_image(image);
				resolve(true);
			});
			image.addEventListener('error', (e) => {
				reject(e);
			});
		}));

		image.src = images_completes[i].src;
		images[images_completes[i].name] = images_completes[i];
	}

	await Promise.all(promises);

	return images;
}
