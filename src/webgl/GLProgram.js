
Potree.GLProgram = class GLProgram {
	constructor (gl, material) {
		this.gl = gl;
		this.material = material;
		this.program = gl.createProgram(); ;

		this.recompile();
	}

	compileShader (type, source) {
		let gl = this.gl;

		let vs = gl.createShader(type);

		gl.shaderSource(vs, source);
		gl.compileShader(vs);

		let success = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
		if (!success) {
			console.error('could not compile shader:');

			let log = gl.getShaderInfoLog(vs);
			console.error(log, source);

			return null;
		}

		return vs;
	}

	recompile () {
		let gl = this.gl;

		let vs = this.compileShader(gl.VERTEX_SHADER, this.material.vertexShader);
		let fs = this.compileShader(gl.FRAGMENT_SHADER, this.material.fragmentShader);

		if (vs === null || fs === null) {
			return;
		}

		// PROGRAM
		let program = this.program;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		let success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (!success) {
			console.error('could not compile/link program:');
			console.error(this.material.vertexShader);
			console.error(this.material.fragmentShader);

			return;
		}

		gl.detachShader(program, vs);
		gl.detachShader(program, fs);
		gl.deleteShader(vs);
		gl.deleteShader(fs);

		gl.useProgram(program);

		{ // UNIFORMS
			let uniforms = {};
			let n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

			for (let i = 0; i < n; i++) {
				let uniform = gl.getActiveUniform(program, i);
				let name = uniform.name;
				let loc = gl.getUniformLocation(program, name);

				uniforms[name] = loc;
			}

			this.uniforms = uniforms;
		}
	}
};
