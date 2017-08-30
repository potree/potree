// code taken from three.js
// ImageUtils - generateDataTexture()
module.exports = (width, height, color) => {
	let size = width * height;
	let data = new Uint8Array(3 * width * height);

	let r = Math.floor(color.r * 255);
	let g = Math.floor(color.g * 255);
	let b = Math.floor(color.b * 255);

	for (let i = 0; i < size; i++) {
		data[ i * 3 ] = r;
		data[ i * 3 + 1 ] = g;
		data[ i * 3 + 2 ] = b;
	}

	let texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
	texture.needsUpdate = true;
	texture.magFilter = THREE.NearestFilter;

	return texture;
};
