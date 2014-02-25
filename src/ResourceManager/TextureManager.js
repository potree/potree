
/**
 * Textures have to be loaded first by invoking loadTexture(). Once its loaded, it can be accessed with getTexture()
 * 
 * @class
 */
function TextureManager(){
	
}

TextureManager.textures = new Array();


TextureManager.getTexture = function(name){
	for(var i = 0; i < this.textures.length; i++){
		var texture = this.textures[i];
		if(texture.name === name){
			return texture;
		}
	}
	
	return null;
};

/**
 * 
 * @param source
 * @param name each texture is stored with this unique name. this name can be used to retrieve the texture with getTexture 
 * @returns
 */
TextureManager.loadTexture = function(source, name){
	var image = new Image();
	image.onload = function() {
		var texture = new Texture();
		texture.source = source;
		texture.name = name;
		texture.image = image;
		
		gl.bindTexture(gl.TEXTURE_2D, texture.glid);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.bindTexture(gl.TEXTURE_2D, null);
			
		TextureManager.textures.push(texture);
	};
	image.src = source;
};

/**
 * @class
 */
function Texture(){
	this.glid = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, this.glid);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
	gl.bindTexture(gl.TEXTURE_2D, null);
}


Texture.prototype.setData = function(data, width, height){
	var border = 0;
	gl.bindTexture(gl.TEXTURE_2D, this.glid);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri ( gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT ) ;
    gl.texParameteri ( gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT ) ;
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, border, gl.RGBA, gl.UNSIGNED_BYTE, data);
	gl.bindTexture(gl.TEXTURE_2D, null);
};







