const paramThreeToGL = require('../utils/paramThreeToGL');

module.exports = class WebGLTexture {
	constructor (gl, texture) {
		this.gl = gl;

		this.texture = texture;
		this.id = gl.createTexture();

		this.target = gl.TEXTURE_2D;
		this.version = -1;

		this.update(texture);
	}

	update () {
		let gl = this.gl;
		let texture = this.texture;

		if (texture.version <= this.version) {
			return;
		}

		this.target = gl.TEXTURE_2D;

		gl.bindTexture(this.target, this.id);

		let level = 0;
		let internalFormat = paramThreeToGL(gl, texture.format);
		let width = texture.image.width;
		let height = texture.image.height;
		let border = 0;
		let srcFormat = internalFormat;
		let srcType = paramThreeToGL(gl, texture.type);
		let data = texture.image.data;

		gl.texImage2D(this.target, level, internalFormat,
			width, height, border, srcFormat, srcType,
			data);

		gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

		gl.bindTexture(this.target, null);

		texture.needsUpdate = false;
	}
};
