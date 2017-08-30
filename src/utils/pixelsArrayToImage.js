module.exports = (pixels, width, height) => {
	let canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;

	let context = canvas.getContext('2d');

	pixels = new pixels.constructor(pixels);

	for (let i = 0; i < pixels.length; i++) {
		pixels[i * 4 + 3] = 255;
	}

	let imageData = context.createImageData(width, height);
	imageData.data.set(pixels);
	context.putImageData(imageData, 0, 0);

	let img = new Image();
	img.src = canvas.toDataURL();
	// img.style.transform = "scaleY(-1)";

	return img;
};
