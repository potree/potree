module.exports = (width, height) => {
	function gauss (x, y) {
		return (1 / (2 * Math.PI)) * Math.exp(-(x * x + y * y) / 2);
	};

	// map.magFilter = THREE.NearestFilter;
	let size = width * height;
	let data = new Uint8Array(3 * size);

	let chroma = [1, 1.5, 1.7];
	let max = gauss(0, 0);

	for (let x = 0; x < width; x++) {
		for (let y = 0; y < height; y++) {
			let u = 2 * (x / width) - 1;
			let v = 2 * (y / height) - 1;

			let i = x + width * y;
			let d = gauss(2 * u, 2 * v) / max;
			let r = (Math.random() + Math.random() + Math.random()) / 3;
			r = (d * 0.5 + 0.5) * r * 0.03;
			r = r * 0.4;

			// d = Math.pow(d, 0.6);

			data[3 * i + 0] = 255 * (d / 15 + 0.05 + r) * chroma[0];
			data[3 * i + 1] = 255 * (d / 15 + 0.05 + r) * chroma[1];
			data[3 * i + 2] = 255 * (d / 15 + 0.05 + r) * chroma[2];
		}
	}

	let texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
	texture.needsUpdate = true;

	return texture;
};
