

/**
 * 
 * @param {int} width
 * @param {int} height
 * 
 * @class Framebuffer with rgba format and floating point precision for each component.
 * requires OES_texture_float extension.
 * 
 * @augments Framebuffer
 */
function FramebufferFloat32(width, height){
	Framebuffer.call(this, width, height);
}

FramebufferFloat32.prototype = new Framebuffer(inheriting);
FramebufferFloat32.base = Framebuffer.prototype;

/**
 * creates a colourbuffer with gl.FLOAT precision
 */
FramebufferFloat32.prototype.initColorbuffer = function(){
	gl.bindTexture(gl.TEXTURE_2D, this.texture.glid);
//	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
//	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.framebuffer.width, this.framebuffer.height, 0, gl.RGBA, gl.FLOAT, null);
};







