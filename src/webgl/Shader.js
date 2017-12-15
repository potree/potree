const THREE = require('three');
const WebGLTexture = require('./WebGLTexture');

module.exports = class Shader {
	constructor (gl, name, vsSource, fsSource) {
		this.gl = gl;
		this.name = name;
		this.vsSource = vsSource;
		this.fsSource = fsSource;

		this.vs = gl.createShader(gl.VERTEX_SHADER);
		this.fs = gl.createShader(gl.FRAGMENT_SHADER);
		this.program = gl.createProgram();

		this.uniformLocations = {};
		this.attributeLocations = {};

		this.update(vsSource, fsSource);
	}

	update (vsSource, fsSource) {
		this.vsSource = vsSource;
		this.fsSource = fsSource;

		this.linkProgram();
	}

	compileShader (shader, source) {
		let gl = this.gl;

		gl.shaderSource(shader, source);

		gl.compileShader(shader);

		let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (!success) {
			let info = gl.getShaderInfoLog(shader);
			throw new Error(`could not compile shader ${this.name}: ${info}`);
		}
	}

	linkProgram () {
		let gl = this.gl;

		this.uniformLocations = {};
		this.attributeLocations = {};

		gl.useProgram(null);

		this.compileShader(this.vs, this.vsSource);
		this.compileShader(this.fs, this.fsSource);

		let program = this.program;

		gl.attachShader(program, this.vs);
		gl.attachShader(program, this.fs);

		gl.linkProgram(program);

		gl.detachShader(program, this.vs);
		gl.detachShader(program, this.fs);

		let success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (!success) {
			let info = gl.getProgramInfoLog(program);
			throw new Error(`could not link program ${this.name}: ${info}`);
		}

		{ // attribute locations
			let numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

			for (let i = 0; i < numAttributes; i++) {
				let attribute = gl.getActiveAttrib(program, i);
				let location = gl.getAttribLocation(program, attribute.name);

				this.attributeLocations[attribute.name] = location;
			}
		}

		{ // uniform locations
			let numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

			for (let i = 0; i < numUniforms; i++) {
				let uniform = gl.getActiveUniform(program, i);

				let location = gl.getUniformLocation(program, uniform.name);

				this.uniformLocations[uniform.name] = location;
			}
		}
	}

	setUniformMatrix4 (name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniformMatrix4fv(location, false, value.elements);
	}

	setUniform1f (name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1f(location, value);
	}

	setUniformBoolean (name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1i(location, value);
	}

	setUniformTexture (name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1i(location, value);
	}

	setUniform2f (name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform2f(location, value[0], value[1]);
	}

	setUniform3f (name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform3f(location, value[0], value[1], value[2]);
	}

	setUniform (name, value) {
		if (value.constructor === THREE.Matrix4) {
			this.setUniformMatrix4(name, value);
		} else if (typeof value === 'number') {
			this.setUniform1f(name, value);
		} else if (typeof value === 'boolean') {
			this.setUniformBoolean(name, value);
		} else if (value instanceof WebGLTexture) {
			this.setUniformTexture(name, value);
		} else if (value instanceof Array) {
			if (value.length === 2) {
				this.setUniform2f(name, value);
			} else if (value.length === 3) {
				this.setUniform3f(name, value);
			}
		} else {
			console.error('unhandled uniform type: ', name, value);
		}
	}

	setUniform1i (name, value) {
		let gl = this.gl;
		let location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1i(location, value);
	}
};
