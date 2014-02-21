
/**
 * You can call the constructor with either, width and height, or "system". When
 * invoking the constructor with "system", the framebuffer will refer to the
 * system/default framebuffer.
 * 
 * @param {int}
 *            width
 * @param {int}
 *            height
 * @class create and handle FramebufferObjects
 * @see <a href="http://learningwebgl.com/blog/?p=1786">WebGL Lesson 16</a>
 */
function Framebuffer(width, height) {
	if (arguments[0] === inheriting)
		return;
	if (arguments[0] === "system") {
		this.framebuffer = null;
		this.initOtherStuff();
	} else {
		this.initBufferStuff(width, height);
		this.initOtherStuff();
	}
}

/**
 * 
 * @returns the system framebuffer
 */
Framebuffer.getSystemBuffer = function() {
	if (Framebuffer.systemBuffer == null) {
		Framebuffer.systemBuffer = new Framebuffer("system");
	}

	return Framebuffer.systemBuffer;
};

Framebuffer.getActiveBuffer = function() {
	if (Framebuffer.activeBuffer == null) {
		Framebuffer.activeBuffer = Framebuffer.getSystemBuffer();
	}

	return Framebuffer.activeBuffer;
};

Framebuffer.setActiveBuffer = function(buffer) {
	Framebuffer.activeBuffer = buffer;
};

/**
 * change size of the framebuffer.
 * 
 * @param {int}
 *            width
 * @param {int}
 *            height
 */
Framebuffer.prototype.setSize = function(width, height) {
	this.initBufferStuff(width, height);
};

/**
 * Initialize stuff like a vbo for screen quads.
 */
Framebuffer.prototype.initOtherStuff = function() {

	this.vbo = gl.createBuffer();
	this.texcoordvbo = gl.createBuffer();
	
	// create rectangle mesh buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
	var vertices = new Float32Array([ 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0 ]);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

	// create uv coords buffer
	gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordvbo);
	vertices = new Float32Array([ 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1 ]);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

};

/**
 * change size of screenQuad.
 * 
 * @param {[x,y]}
 *            start x and y must be values between 0 and 1
 * @param {[x,y]}
 *            end x and y must be values between 0 and 1
 */
Framebuffer.prototype.updateScreenQuad = function(start, end) {
	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
	var vertices = new Float32Array([ start[0], start[1], 0, end[0], start[1],
			0, end[0], end[1], 0, start[0], start[1], 0, end[0], end[1], 0,
			start[0], end[1], 0 ]);
	gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
};

/**
 * removes existing webgl color/render/frame-buffers and creates new ones
 * 
 * @param {int}
 *            width
 * @param {int}
 *            height
 */
Framebuffer.prototype.initBufferStuff = function(width, height) {
	if (this.width === width && this.height === height) {
		return;
	}

	this.width = width;
	this.height = height;

	// remove exiting buffers
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	if (this.texture != null) {
		gl.deleteTexture(this.texture.glid);
		this.texture = null;
	}
	if (this.renderbuffer != null) {
		gl.deleteRenderbuffer(this.renderbuffer);
		this.renderbuffer = null;
	}
	if (this.framebuffer != null) {
		gl.deleteFramebuffer(this.framebuffer);
		this.framebuffer = null;
	}

	// create new buffers
	this.framebuffer = gl.createFramebuffer();
	this.texture = new Texture();
	this.renderbuffer = gl.createRenderbuffer();
	
	// WEBGL_depth_texture not supported in firefox/ANGLE
//	this.depthTexture = new Texture();
//	this.depthTexture.glid = gl.createTexture();

	// framebuffer
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
	this.framebuffer.width = width;
	this.framebuffer.height = height;

	// colorbuffer
	this.initColorbuffer();

	// depthbuffer
	gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
			this.framebuffer.width, this.framebuffer.height);
	
	// WEBGL_depth_texture not supported in firefox/ANGLE
//	gl.bindTexture(gl.TEXTURE_2D, this.depthTexture.glid);
//	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
//	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
//	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
//	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
//	gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, this.framebuffer.width, this.framebuffer.height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_BYTE, null);
	

	// assemble buffers
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
			gl.TEXTURE_2D, this.texture.glid, 0);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
			gl.RENDERBUFFER, this.renderbuffer);
	
	// WEBGL_depth_texture not supported in firefox/ANGLE
//	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depthTexture.glid, 0);

	this.checkBuffer();

	gl.bindTexture(gl.TEXTURE_2D, null);
	gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 * initializes the colourbuffer that'll be used as COLOR_ATTACHMENT0
 */
Framebuffer.prototype.initColorbuffer = function() {
	gl.bindTexture(gl.TEXTURE_2D, this.texture.glid);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.framebuffer.width,
			this.framebuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
};

/**
 * check if framebuffer was successfully created. Throws an exception if the
 * buffer is invalid.
 */
Framebuffer.prototype.checkBuffer = function checkBuffer() {
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

	var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	switch (status) {
	case gl.FRAMEBUFFER_COMPLETE:
		break;
	case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
		console.log("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT");
		throw "";
	case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
		console.log("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT");
		throw "";
	case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
		console.log("Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS");
		throw "";
	case gl.FRAMEBUFFER_UNSUPPORTED:
		console.log("Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED");
		throw "";
	default:
		console.log("Incomplete framebuffer: " + status);
		throw "";
	}
};

Framebuffer.bindDefault = function() {
	Framebuffer.activeBuffer = Framebuffer.getSystemBuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
};

/**
 * binds this framebuffer which makes it the target for all drawCalls and
 * framebuffer related calls.
 */
Framebuffer.prototype.bind = function() {
	Framebuffer.activeBuffer = this;
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
};

/**
 * 
 * @param {Texture}
 *            texture
 * @param {[x,y]}
 *            start
 * @param {[x,y]}
 *            end
 * 
 * @example drawTexture(abc, [-1,-1], [1,1])
 */
Framebuffer.prototype.drawTexture = function(texture, start, end) {
	this.bind();

	var mat = ShaderManager.getShader("drawTexture");
	gl.useProgram(mat.program);

	this.updateScreenQuad(start, end);
	
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	// uniforms
	if (this.framebuffer == null) {
		var canvas = document.getElementById("canvas");
		gl.uniform1f(mat.uniforms.uWidth, canvas.width);
		gl.uniform1f(mat.uniforms.uHeight, canvas.height);
	} else {
		gl.uniform1f(mat.uniforms.uWidth, this.width);
		gl.uniform1f(mat.uniforms.uHeight, this.height);
	}
	// texture
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture.glid);
	gl.uniform1i(mat.uniforms.uTexture, 0);
	// depth
	gl.activeTexture(gl.TEXTURE1);
	gl.bindTexture(gl.TEXTURE_2D, this.renderbuffer);
	gl.uniform1i(mat.uniforms.uDepth, 0);

	// vertex attributes
	gl.enableVertexAttribArray(mat.attributes.aVertexPosition);
	gl.enableVertexAttribArray(mat.attributes.aTexcoords);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
	gl.vertexAttribPointer(mat.attributes.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordvbo);
	gl.vertexAttribPointer(mat.attributes.aTexcoords, 2, gl.FLOAT, false, 0, 0);

	gl.disable(gl.DEPTH_TEST);
	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.disableVertexAttribArray(mat.attributes.aVertexPosition);
	gl.disableVertexAttribArray(mat.attributes.aTexcoords);
};

/**
 * draws a quad over the whole framebuffer using the provided material.
 * 
 * @param {Material}
 *            mat
 */
Framebuffer.prototype.drawFullscreenQuad = function(mat) {

	gl.useProgram(mat.program);

	this.updateScreenQuad([ -1, -1 ], [ 1, 1 ]);

	// vertex attributes
	gl.enableVertexAttribArray(mat.attributes.aVertexPosition);
	gl.enableVertexAttribArray(mat.attributes.aTexcoord);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
	gl.vertexAttribPointer(mat.attributes.aVertexPosition, 3, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordvbo);
	gl.vertexAttribPointer(mat.attributes.aTexcoord, 2, gl.FLOAT, false, 0, 0);

	gl.drawArrays(gl.TRIANGLES, 0, 6);

	gl.disableVertexAttribArray(mat.attributes.aVertexPosition);
	gl.disableVertexAttribArray(mat.attributes.aTexcoord);
};
