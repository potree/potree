/**
 * adapted from http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
 */

Potree.TextSprite = function(text){
	var texture = new THREE.Texture();
	var spriteMaterial = new THREE.SpriteMaterial( 
		{ map: texture, useScreenCoordinates: false} );
	THREE.Sprite.call(this, spriteMaterial);
	
	this.borderThickness = 4;
	this.fontface = "Arial";
	this.fontsize = 28;
	this.borderColor = { r:0, g:0, b:0, a:1.0 };
	this.backgroundColor = { r:255, g:255, b:255, a:1.0 };
	this.text = "";
	
	this.setText(text);
};

Potree.TextSprite.prototype = new THREE.Sprite();

Potree.TextSprite.prototype.setText = function(text){
	this.text = text;
	
	this.update();
}

Potree.TextSprite.prototype.setBorderColor = function(color){
	this.borderColor = color;
	
	this.update();
}

Potree.TextSprite.prototype.setBackgroundColor = function(color){
	this.backgroundColor = color;
	
	this.update();
}

Potree.TextSprite.prototype.update = function(){

	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + this.fontsize + "px " + this.fontface;
	
	// get size data (height depends only on font size)
	var metrics = context.measureText( this.text );
	var textWidth = metrics.width;
	var spriteWidth = textWidth + 2 * this.borderThickness;
	var spriteHeight = this.fontsize * 1.4 + 2 * this.borderThickness;
	
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.canvas.width = spriteWidth;
	context.canvas.height = spriteHeight;
	context.font = "Bold " + this.fontsize + "px " + this.fontface;
	
	// background color
	context.fillStyle   = "rgba(" + this.backgroundColor.r + "," + this.backgroundColor.g + ","
								  + this.backgroundColor.b + "," + this.backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + this.borderColor.r + "," + this.borderColor.g + ","
								  + this.borderColor.b + "," + this.borderColor.a + ")";
								  
	context.lineWidth = this.borderThickness;
	this.roundRect(context, this.borderThickness/2, this.borderThickness/2, 
		textWidth + this.borderThickness, this.fontsize * 1.4 + this.borderThickness, 6);						  
		
	// text color
	
	
	context.strokeStyle = "rgba(0, 0, 0, 1.0)";
	context.strokeText( this.text, this.borderThickness, this.fontsize + this.borderThickness);
	
	context.fillStyle = "rgba(255, 255, 255, 1.0)";
	context.fillText( this.text, this.borderThickness, this.fontsize + this.borderThickness);
	
								  
	var texture = new THREE.Texture(canvas); 
	texture.needsUpdate = true;	
	
	//var spriteMaterial = new THREE.SpriteMaterial( 
	//	{ map: texture, useScreenCoordinates: false } );
	this.material.map = texture;
		
	this.scale.set(spriteWidth*0.01,spriteHeight*0.01,1.0);
		
	//this.material = spriteMaterial;						  
}

Potree.TextSprite.prototype.roundRect = function(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x+r, y);
	ctx.lineTo(x+w-r, y);
	ctx.quadraticCurveTo(x+w, y, x+w, y+r);
	ctx.lineTo(x+w, y+h-r);
	ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
	ctx.lineTo(x+r, y+h);
	ctx.quadraticCurveTo(x, y+h, x, y+h-r);
	ctx.lineTo(x, y+r);
	ctx.quadraticCurveTo(x, y, x+r, y);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();   
}


