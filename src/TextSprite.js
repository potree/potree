

// /**
//  * adapted from http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
//  */

import * as THREE from "../libs/three.js/build/three.module.js";

export class TextSprite extends THREE.Object3D{
	
	constructor(text){
		super();

		let texture = new THREE.Texture();
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		let spriteMaterial = new THREE.SpriteMaterial({
			map: texture,
			depthTest: false,
			depthWrite: false});

		this.texture = texture;

		this.material = spriteMaterial;
		//this.material = getRawMaterial(texture);
		this.sprite = new THREE.Sprite(this.material);
		this.add(this.sprite);

		this.borderThickness = 4;
		this.fontface = 'Arial';
		this.fontsize = 28;
		this.borderColor = { r: 0, g: 0, b: 0, a: 1.0 };
		this.backgroundColor = { r: 255, g: 255, b: 255, a: 1.0 };
		this.textColor = {r: 255, g: 255, b: 255, a: 1.0};
		this.text = '';

		this.setText(text);
	}

	setText(text){
		if (this.text !== text){
			this.text = text;

			this.update();
		}
	}

	setTextColor(color){
		this.textColor = color;

		this.update();
	}

	setBorderColor(color){
		this.borderColor = color;

		this.update();
	}

	setBackgroundColor(color){
		this.backgroundColor = color;

		this.update();
	}

	update(){
		let canvas = document.createElement('canvas');
		let context = canvas.getContext('2d');
		context.font = 'Bold ' + this.fontsize + 'px ' + this.fontface;

		// get size data (height depends only on font size)
		let metrics = context.measureText(this.text);
		let textWidth = metrics.width;
		let margin = 5;
		let spriteWidth = 2 * margin + textWidth + 2 * this.borderThickness;
		let spriteHeight = this.fontsize * 1.4 + 2 * this.borderThickness;

		context.canvas.width = spriteWidth;
		context.canvas.height = spriteHeight;
		context.font = 'Bold ' + this.fontsize + 'px ' + this.fontface;

		// background color
		context.fillStyle = 'rgba(' + this.backgroundColor.r + ',' + this.backgroundColor.g + ',' +
			this.backgroundColor.b + ',' + this.backgroundColor.a + ')';
		// border color
		context.strokeStyle = 'rgba(' + this.borderColor.r + ',' + this.borderColor.g + ',' +
			this.borderColor.b + ',' + this.borderColor.a + ')';

		context.lineWidth = this.borderThickness;
		this.roundRect(context, this.borderThickness / 2, this.borderThickness / 2,
			textWidth + this.borderThickness + 2 * margin, this.fontsize * 1.4 + this.borderThickness, 6);

		// text color
		context.strokeStyle = 'rgba(0, 0, 0, 1.0)';
		context.strokeText(this.text, this.borderThickness + margin, this.fontsize + this.borderThickness);

		context.fillStyle = 'rgba(' + this.textColor.r + ',' + this.textColor.g + ',' +
			this.textColor.b + ',' + this.textColor.a + ')';
		context.fillText(this.text, this.borderThickness + margin, this.fontsize + this.borderThickness);

		let texture = new THREE.Texture(canvas);
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.needsUpdate = true;
		//this.material.needsUpdate = true;

		// { // screen-space sprite
		// 	let [screenWidth, screenHeight] = [1620, 937];

		// 	let uniforms = this.sprite.material.uniforms;
		// 	let aspect = spriteHeight / spriteWidth;
		// 	let factor = 0.5;

		// 	let w = spriteWidth / screenWidth;
		// 	let h = spriteHeight / screenHeight;

		// 	uniforms.uScale.value = [2 * w, 2 * h];
		// 	//uniforms.uScale.value = [factor * 1, factor * aspect];
		//	this.sprite.material.uniforms.map.value = texture;
		// }

		this.sprite.material.map = texture;
		this.texture = texture;

		this.sprite.scale.set(spriteWidth * 0.01, spriteHeight * 0.01, 1.0);
	}

	roundRect(ctx, x, y, w, h, r){
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r);
		ctx.lineTo(x + w, y + h - r);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		ctx.lineTo(x + r, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r);
		ctx.lineTo(x, y + r);
		ctx.quadraticCurveTo(x, y, x + r, y);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}

}


