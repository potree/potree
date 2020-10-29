(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.Potree = {}));
}(this, (function (exports) { 'use strict';

	/**
	 * @author mrdoob / http://mrdoob.com/ https://github.com/mrdoob/eventdispatcher.js
	 * 
	 * with slight modifications by mschuetz, http://potree.org
	 * 
	 */

	// The MIT License
	// 
	// Copyright (c) 2011 Mr.doob
	// 
	// Permission is hereby granted, free of charge, to any person obtaining a copy
	// of this software and associated documentation files (the "Software"), to deal
	// in the Software without restriction, including without limitation the rights
	// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	// copies of the Software, and to permit persons to whom the Software is
	// furnished to do so, subject to the following conditions:
	// 
	// The above copyright notice and this permission notice shall be included in
	// all copies or substantial portions of the Software.
	// 
	// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	// THE SOFTWARE.





	class EventDispatcher{

		constructor(){
			this._listeners = {};
		}

		addEventListener(type, listener){

			const listeners = this._listeners;

			if(listeners[type] === undefined){
				listeners[type] = [];
			}

			if(listeners[type].indexOf(listener) === - 1){
				listeners[type].push( listener );
			}

		}

		hasEventListener(type, listener){

			const listeners = this._listeners;

			return listeners[type] !== undefined && listeners[type].indexOf(listener) !== - 1;
		}

		removeEventListener(type, listener){

			let listeners = this._listeners;
			let listenerArray = listeners[type];

			if (listenerArray !== undefined){

				let index = listenerArray.indexOf(listener);

				if(index !== - 1){
					listenerArray.splice(index, 1);
				}
			}

		}

		removeEventListeners(type){
			if(this._listeners[type] !== undefined){
				delete this._listeners[type];
			}
		};

		dispatchEvent(event){

			let listeners = this._listeners;
			let listenerArray = listeners[event.type];

			if ( listenerArray !== undefined ) {
				event.target = this;

				for(let listener of listenerArray.slice(0)){
					listener.call(this, event);
				}
			}

		}

	}

	class Action extends EventDispatcher {
		constructor (args = {}) {
			super();

			this.icon = args.icon || '';
			this.tooltip = args.tooltip;

			if (args.onclick !== undefined) {
				this.onclick = args.onclick;
			}
		}

		onclick (event) {

		}

		pairWith (object) {

		}

		setIcon (newIcon) {
			let oldIcon = this.icon;

			if (newIcon === oldIcon) {
				return;
			}

			this.icon = newIcon;

			this.dispatchEvent({
				type: 'icon_changed',
				action: this,
				icon: newIcon,
				oldIcon: oldIcon
			});
		}
	};

	//Potree.Actions = {};
	//
	//Potree.Actions.ToggleAnnotationVisibility = class ToggleAnnotationVisibility extends Potree.Action {
	//	constructor (args = {}) {
	//		super(args);
	//
	//		this.icon = Potree.resourcePath + '/icons/eye.svg';
	//		this.showIn = 'sidebar';
	//		this.tooltip = 'toggle visibility';
	//	}
	//
	//	pairWith (annotation) {
	//		if (annotation.visible) {
	//			this.setIcon(Potree.resourcePath + '/icons/eye.svg');
	//		} else {
	//			this.setIcon(Potree.resourcePath + '/icons/eye_crossed.svg');
	//		}
	//
	//		annotation.addEventListener('visibility_changed', e => {
	//			let annotation = e.annotation;
	//
	//			if (annotation.visible) {
	//				this.setIcon(Potree.resourcePath + '/icons/eye.svg');
	//			} else {
	//				this.setIcon(Potree.resourcePath + '/icons/eye_crossed.svg');
	//			}
	//		});
	//	}
	//
	//	onclick (event) {
	//		let annotation = event.annotation;
	//
	//		annotation.visible = !annotation.visible;
	//
	//		if (annotation.visible) {
	//			this.setIcon(Potree.resourcePath + '/icons/eye.svg');
	//		} else {
	//			this.setIcon(Potree.resourcePath + '/icons/eye_crossed.svg');
	//		}
	//	}
	//};

	class PathAnimation{
		
		constructor(path, start, end, speed, callback){
				this.path = path;
				this.length = this.path.spline.getLength();
				this.speed = speed;
				this.callback = callback;
				this.tween = null;
				this.startPoint = Math.max(start, 0);
				this.endPoint = Math.min(end, this.length);
				this.t = 0.0;
		}

		start(resume = false){
			if(this.tween){
				this.tween.stop();
				this.tween = null;
			}
		
			let tStart;
			if(resume){
				tStart = this.t;
			}else {
				tStart = this.startPoint / this.length;
			}
			let tEnd = this.endPoint / this.length;
			let animationDuration = (tEnd - tStart) * this.length * 1000 / this.speed;
		
			let progress = {t: tStart};
			this.tween = new TWEEN.Tween(progress).to({t: tEnd}, animationDuration);
			this.tween.easing(TWEEN.Easing.Linear.None);
			this.tween.onUpdate((e) => {
				this.t = progress.t;
				this.callback(progress.t);
			});
			this.tween.onComplete(() => {
				if(this.repeat){
					this.start();
				}
			});

			setTimeout(() => {
				this.tween.start();
			}, 0);
		}

		stop(){
			if(!this.tween){
				return;
			}
			this.tween.stop();
			this.tween = null;
			this.t = 0;
		}

		pause(){
			if(!this.tween){
				return;
			}
			
			this.tween.stop();
			TWEEN.remove(this.tween);
			this.tween = null;
		}

		resume(){
			this.start(true);
		}

		getPoint(t){
			return this.path.spline.getPoint(t);
		}

	}

	class AnimationPath{
		constructor (points = []) {
			this.points = points;
			this.spline = new THREE.CatmullRomCurve3(points);
			//this.spline.reparametrizeByArcLength(1 / this.spline.getLength().total);
		}

		get (t) {
			return this.spline.getPoint(t);
		}

		getLength () {
			return this.spline.getLength();
		}

		animate (start, end, speed, callback) {
			let animation = new PathAnimation(this, start, end, speed, callback);
			animation.start();

			return animation;
		}

		pause () {
			if (this.tween) {
				this.tween.stop();
			}
		}

		resume () {
			if (this.tween) {
				this.tween.start();
			}
		}

		getGeometry () {
			let geometry = new THREE.Geometry();

			let samples = 500;
			let i = 0;
			for (let u = 0; u <= 1; u += 1 / samples) {
				let position = this.spline.getPoint(u);
				geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);

				i++;
			}

			if(this.closed){
				let position = this.spline.getPoint(0);
				geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);
			}

			return geometry;
		}

		get closed(){
			return this.spline.closed;
		}

		set closed(value){
			this.spline.closed = value;
		}

	}
		
		/*
		{
			let target = new THREE.Vector3(589854.34, 231411.19, 692.77);
			let points = [
				new THREE.Vector3(589815.52, 231738.31, 959.48 ),
				new THREE.Vector3(589604.73, 231615.00, 968.10 ),
				new THREE.Vector3(589579.11, 231354.41, 1010.06),
				new THREE.Vector3(589723.00, 231169.95, 1015.57),
				new THREE.Vector3(589960.76, 231116.87, 978.60 ),
				new THREE.Vector3(590139.29, 231268.71, 972.33 )
			];
		
			let path = new Potree.AnimationPath(points);
		
			let geometry = path.getGeometry();
			let material = new THREE.LineBasicMaterial();
			let line = new THREE.Line(geometry, material);
			viewer.scene.scene.add(line);
		
			let [start, end, speed] = [0, path.getLength(), 10];
			path.animate(start, end, speed, t => {
				viewer.scene.view.position.copy(path.spline.getPoint(t));
			});
		
		}
		*/

	const XHRFactory = {
		config: {
			withCredentials: false,
			customHeaders: [
				{ header: null, value: null }
			]
		},

		createXMLHttpRequest: function () {
			let xhr = new XMLHttpRequest();

			if (this.config.customHeaders &&
				Array.isArray(this.config.customHeaders) &&
				this.config.customHeaders.length > 0) {
				let baseOpen = xhr.open;
				let customHeaders = this.config.customHeaders;
				xhr.open = function () {
					baseOpen.apply(this, [].slice.call(arguments));
					customHeaders.forEach(function (customHeader) {
						if (!!customHeader.header && !!customHeader.value) {
							xhr.setRequestHeader(customHeader.header, customHeader.value);
						}
					});
				};
			}

			return xhr;
		}
	};

	// /**
	//  * adapted from http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
	//  */

	// let vs2D = `
	// // precision mediump float;
	// // precision mediump int;

	// // attribute vec3 position;
	// // attribute vec4 color;
	// // attribute vec2 uv;

	// // uniform mat4 modelViewMatrix;
	// // uniform mat4 projectionMatrix;
	// // uniform mat3 uvTransform;

	// uniform vec2 uPosition;
	// uniform vec2 uScale;

	// varying vec2 vUv;


	// void main(){

	// 	vec2 pos = position.xy * uScale;

	// 	gl_Position = vec4(pos, 0.0, 1.0);

	// 	vUv = uv;



	// }

	// `;

	// let fs2D = `
	// precision mediump float;
	// precision mediump int;

	// uniform sampler2D map;

	// // varying vec3 vPosition;
	// // varying vec4 vColor;
	// varying vec2 vUv;


	// void main()	{

	// 	gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);

	// 	gl_FragColor = vec4(vUv, 0.0, 1.0);

	// 	vec4 texelColor = texture2D( map, vUv );
	// 	//texelColor = mapTexelToLinear( texelColor );

	// 	gl_FragColor = vec4(texelColor.xyz, 1.0);


	// }

	// `;

	// function getRawMaterial(map){
	// 	let material = new THREE.ShaderMaterial( {
	// 		uniforms: {
	// 			map: { type: "t", value: map },
	// 			uPosition: {type: "vec2", value: [0, 0]},
	// 			uScale: {type: "vec2", value: [1, 1]},
	// 		},
	// 		vertexShader: vs2D,
	// 		fragmentShader: fs2D,
	// 		side: THREE.DoubleSide,
	// 		transparent: false,

	// 	} );

	// 	return material;
	// }


	class TextSprite extends THREE.Object3D{
		
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

	class Volume extends THREE.Object3D {
		constructor (args = {}) {
			super();

			if(this.constructor.name === "Volume"){
				console.warn("Can't create object of class Volume directly. Use classes BoxVolume or SphereVolume instead.");
			}

			//console.log(this);
			//console.log(this.constructor);
			//console.log(this.constructor.name);

			this._clip = args.clip || false;
			this._visible = true;
			this.showVolumeLabel = true;
			this._modifiable = args.modifiable || true;

			this.label = new TextSprite('0');
			this.label.setBorderColor({r: 0, g: 255, b: 0, a: 0.0});
			this.label.setBackgroundColor({r: 0, g: 255, b: 0, a: 0.0});
			this.label.material.depthTest = false;
			this.label.material.depthWrite = false;
			this.label.material.transparent = true;
			this.label.position.y -= 0.5;
			this.add(this.label);

			this.label.updateMatrixWorld = () => {
				let volumeWorldPos = new THREE.Vector3();
				volumeWorldPos.setFromMatrixPosition(this.matrixWorld);
				this.label.position.copy(volumeWorldPos);
				this.label.updateMatrix();
				this.label.matrixWorld.copy(this.label.matrix);
				this.label.matrixWorldNeedsUpdate = false;

				for (let i = 0, l = this.label.children.length; i < l; i++) {
					this.label.children[ i ].updateMatrixWorld(true);
				}
			};

			{ // event listeners
				this.addEventListener('select', e => {});
				this.addEventListener('deselect', e => {});
			}

		}

		get visible(){
			return this._visible;
		}

		set visible(value){
			if(this._visible !== value){
				this._visible = value;

				this.dispatchEvent({type: "visibility_changed", object: this});
			}
		}

		getVolume () {
			console.warn("override this in subclass");
		}

		update () {
			
		};

		raycast (raycaster, intersects) {

		}

		get clip () {
			return this._clip;
		}

		set clip (value) {

			if(this._clip !== value){
				this._clip = value;

				this.update();

				this.dispatchEvent({
					type: "clip_changed",
					object: this
				});
			}
			
		}

		get modifieable () {
			return this._modifiable;
		}

		set modifieable (value) {
			this._modifiable = value;

			this.update();
		}
	};


	class BoxVolume extends Volume{

		constructor(args = {}){
			super(args);

			this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
			this.name = 'box_' + this.constructor.counter;

			let boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			boxGeometry.computeBoundingBox();

			let boxFrameGeometry = new THREE.Geometry();
			{
				let Vector3 = THREE.Vector3;

				boxFrameGeometry.vertices.push(

					// bottom
					new Vector3(-0.5, -0.5, 0.5),
					new Vector3(0.5, -0.5, 0.5),
					new Vector3(0.5, -0.5, 0.5),
					new Vector3(0.5, -0.5, -0.5),
					new Vector3(0.5, -0.5, -0.5),
					new Vector3(-0.5, -0.5, -0.5),
					new Vector3(-0.5, -0.5, -0.5),
					new Vector3(-0.5, -0.5, 0.5),
					// top
					new Vector3(-0.5, 0.5, 0.5),
					new Vector3(0.5, 0.5, 0.5),
					new Vector3(0.5, 0.5, 0.5),
					new Vector3(0.5, 0.5, -0.5),
					new Vector3(0.5, 0.5, -0.5),
					new Vector3(-0.5, 0.5, -0.5),
					new Vector3(-0.5, 0.5, -0.5),
					new Vector3(-0.5, 0.5, 0.5),
					// sides
					new Vector3(-0.5, -0.5, 0.5),
					new Vector3(-0.5, 0.5, 0.5),
					new Vector3(0.5, -0.5, 0.5),
					new Vector3(0.5, 0.5, 0.5),
					new Vector3(0.5, -0.5, -0.5),
					new Vector3(0.5, 0.5, -0.5),
					new Vector3(-0.5, -0.5, -0.5),
					new Vector3(-0.5, 0.5, -0.5),

				);

			}

			this.material = new THREE.MeshBasicMaterial({
				color: 0x00ff00,
				transparent: true,
				opacity: 0.3,
				depthTest: true,
				depthWrite: false});
			this.box = new THREE.Mesh(boxGeometry, this.material);
			this.box.geometry.computeBoundingBox();
			this.boundingBox = this.box.geometry.boundingBox;
			this.add(this.box);

			this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
			// this.frame.mode = THREE.Lines;
			this.add(this.frame);

			this.update();
		}

		update(){
			this.boundingBox = this.box.geometry.boundingBox;
			this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());

			if (this._clip) {
				this.box.visible = false;
				this.label.visible = false;
			} else {
				this.box.visible = true;
				this.label.visible = this.showVolumeLabel;
			}
		}

		raycast (raycaster, intersects) {
			let is = [];
			this.box.raycast(raycaster, is);

			if (is.length > 0) {
				let I = is[0];
				intersects.push({
					distance: I.distance,
					object: this,
					point: I.point.clone()
				});
			}
		}

		getVolume(){
			return Math.abs(this.scale.x * this.scale.y * this.scale.z);
		}

	};

	class SphereVolume extends Volume{

		constructor(args = {}){
			super(args);

			this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
			this.name = 'sphere_' + this.constructor.counter;

			let sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
			sphereGeometry.computeBoundingBox();

			this.material = new THREE.MeshBasicMaterial({
				color: 0x00ff00,
				transparent: true,
				opacity: 0.3,
				depthTest: true,
				depthWrite: false});
			this.sphere = new THREE.Mesh(sphereGeometry, this.material);
			this.sphere.visible = false;
			this.sphere.geometry.computeBoundingBox();
			this.boundingBox = this.sphere.geometry.boundingBox;
			this.add(this.sphere);

			this.label.visible = false;


			let frameGeometry = new THREE.Geometry();
			{
				let steps = 64;
				let uSegments = 8;
				let vSegments = 5;
				let r = 1;

				for(let uSegment = 0; uSegment < uSegments; uSegment++){

					let alpha = (uSegment / uSegments) * Math.PI * 2;
					let dirx = Math.cos(alpha);
					let diry = Math.sin(alpha);

					for(let i = 0; i <= steps; i++){
						let v = (i / steps) * Math.PI * 2;
						let vNext = v + 2 * Math.PI / steps;

						let height = Math.sin(v);
						let xyAmount = Math.cos(v);

						let heightNext = Math.sin(vNext);
						let xyAmountNext = Math.cos(vNext);

						let vertex = new THREE.Vector3(dirx * xyAmount, diry * xyAmount, height);
						frameGeometry.vertices.push(vertex);

						let vertexNext = new THREE.Vector3(dirx * xyAmountNext, diry * xyAmountNext, heightNext);
						frameGeometry.vertices.push(vertexNext);
					}
				}

				// creates rings at poles, just because it's easier to implement
				for(let vSegment = 0; vSegment <= vSegments + 1; vSegment++){

					//let height = (vSegment / (vSegments + 1)) * 2 - 1; // -1 to 1
					let uh = (vSegment / (vSegments + 1)); // -1 to 1
					uh = (1 - uh) * (-Math.PI / 2) + uh *(Math.PI / 2);
					let height = Math.sin(uh);

					console.log(uh, height);

					for(let i = 0; i <= steps; i++){
						let u = (i / steps) * Math.PI * 2;
						let uNext = u + 2 * Math.PI / steps;

						let dirx = Math.cos(u);
						let diry = Math.sin(u);

						let dirxNext = Math.cos(uNext);
						let diryNext = Math.sin(uNext);

						let xyAmount = Math.sqrt(1 - height * height);

						let vertex = new THREE.Vector3(dirx * xyAmount, diry * xyAmount, height);
						frameGeometry.vertices.push(vertex);

						let vertexNext = new THREE.Vector3(dirxNext * xyAmount, diryNext * xyAmount, height);
						frameGeometry.vertices.push(vertexNext);
					}
				}
			}

			this.frame = new THREE.LineSegments(frameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
			this.add(this.frame);

			let frameMaterial = new THREE.MeshBasicMaterial({wireframe: true, color: 0x000000});
			this.frame = new THREE.Mesh(sphereGeometry, frameMaterial);
			//this.add(this.frame);

			//this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
			// this.frame.mode = THREE.Lines;
			//this.add(this.frame);

			this.update();
		}

		update(){
			this.boundingBox = this.sphere.geometry.boundingBox;
			this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());

			//if (this._clip) {
			//	this.sphere.visible = false;
			//	this.label.visible = false;
			//} else {
			//	this.sphere.visible = true;
			//	this.label.visible = this.showVolumeLabel;
			//}
		}

		raycast (raycaster, intersects) {
			let is = [];
			this.sphere.raycast(raycaster, is);

			if (is.length > 0) {
				let I = is[0];
				intersects.push({
					distance: I.distance,
					object: this,
					point: I.point.clone()
				});
			}
		}
		
		// see https://en.wikipedia.org/wiki/Ellipsoid#Volume
		getVolume(){
			return (4 / 3) * Math.PI * this.scale.x * this.scale.y * this.scale.z;
		}

	};

	class Profile extends THREE.Object3D{

		constructor () {
			super();

			this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;

			this.name = 'Profile_' + this.constructor.counter;
			this.points = [];
			this.spheres = [];
			this.edges = [];
			this.boxes = [];
			this.width = 1;
			this.height = 20;
			this._modifiable = true;

			this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
			this.color = new THREE.Color(0xff0000);
			this.lineColor = new THREE.Color(0xff0000);
		}

		createSphereMaterial () {
			let sphereMaterial = new THREE.MeshLambertMaterial({
				//shading: THREE.SmoothShading,
				color: 0xff0000,
				depthTest: false,
				depthWrite: false}
			);

			return sphereMaterial;
		};

		getSegments () {
			let segments = [];

			for (let i = 0; i < this.points.length - 1; i++) {
				let start = this.points[i].clone();
				let end = this.points[i + 1].clone();
				segments.push({start: start, end: end});
			}

			return segments;
		}

		getSegmentMatrices () {
			let segments = this.getSegments();
			let matrices = [];

			for (let segment of segments) {
				let {start, end} = segment;

				let box = new THREE.Object3D();

				let length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
				box.scale.set(length, 10000, this.width);
				box.up.set(0, 0, 1);

				let center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
				let diff = new THREE.Vector3().subVectors(end, start);
				let target = new THREE.Vector3(diff.y, -diff.x, 0);

				box.position.set(0, 0, 0);
				box.lookAt(target);
				box.position.copy(center);

				box.updateMatrixWorld();
				matrices.push(box.matrixWorld);
			}

			return matrices;
		}

		addMarker (point) {
			this.points.push(point);

			let sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());

			this.add(sphere);
			this.spheres.push(sphere);

			// edges & boxes
			if (this.points.length > 1) {
				let lineGeometry = new THREE.Geometry();
				lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
				lineGeometry.colors.push(this.lineColor, this.lineColor, this.lineColor);
				let lineMaterial = new THREE.LineBasicMaterial({
					vertexColors: THREE.VertexColors,
					linewidth: 2,
					transparent: true,
					opacity: 0.4
				});
				lineMaterial.depthTest = false;
				let edge = new THREE.Line(lineGeometry, lineMaterial);
				edge.visible = false;

				this.add(edge);
				this.edges.push(edge);

				let boxGeometry = new THREE.BoxGeometry(1, 1, 1);
				let boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.2});
				let box = new THREE.Mesh(boxGeometry, boxMaterial);
				box.visible = false;

				this.add(box);
				this.boxes.push(box);
			}

			{ // event listeners
				let drag = (e) => {
					let I = Utils.getMousePointCloudIntersection(
						e.drag.end, 
						e.viewer.scene.getActiveCamera(), 
						e.viewer, 
						e.viewer.scene.pointclouds);

					if (I) {
						let i = this.spheres.indexOf(e.drag.object);
						if (i !== -1) {
							this.setPosition(i, I.location);
							//this.dispatchEvent({
							//	'type': 'marker_moved',
							//	'profile': this,
							//	'index': i
							//});
						}
					}
				};

				let drop = e => {
					let i = this.spheres.indexOf(e.drag.object);
					if (i !== -1) {
						this.dispatchEvent({
							'type': 'marker_dropped',
							'profile': this,
							'index': i
						});
					}
				};

				let mouseover = (e) => e.object.material.emissive.setHex(0x888888);
				let mouseleave = (e) => e.object.material.emissive.setHex(0x000000);

				sphere.addEventListener('drag', drag);
				sphere.addEventListener('drop', drop);
				sphere.addEventListener('mouseover', mouseover);
				sphere.addEventListener('mouseleave', mouseleave);
			}

			let event = {
				type: 'marker_added',
				profile: this,
				sphere: sphere
			};
			this.dispatchEvent(event);

			this.setPosition(this.points.length - 1, point);
		}

		removeMarker (index) {
			this.points.splice(index, 1);

			this.remove(this.spheres[index]);

			let edgeIndex = (index === 0) ? 0 : (index - 1);
			this.remove(this.edges[edgeIndex]);
			this.edges.splice(edgeIndex, 1);
			this.remove(this.boxes[edgeIndex]);
			this.boxes.splice(edgeIndex, 1);

			this.spheres.splice(index, 1);

			this.update();

			this.dispatchEvent({
				'type': 'marker_removed',
				'profile': this
			});
		}

		setPosition (index, position) {
			let point = this.points[index];
			point.copy(position);

			let event = {
				type: 'marker_moved',
				profile:	this,
				index:	index,
				position: point.clone()
			};
			this.dispatchEvent(event);

			this.update();
		}

		setWidth (width) {
			this.width = width;

			let event = {
				type: 'width_changed',
				profile:	this,
				width:	width
			};
			this.dispatchEvent(event);

			this.update();
		}

		getWidth () {
			return this.width;
		}

		update () {
			if (this.points.length === 0) {
				return;
			} else if (this.points.length === 1) {
				let point = this.points[0];
				this.spheres[0].position.copy(point);

				return;
			}

			let min = this.points[0].clone();
			let max = this.points[0].clone();
			let centroid = new THREE.Vector3();
			let lastIndex = this.points.length - 1;
			for (let i = 0; i <= lastIndex; i++) {
				let point = this.points[i];
				let sphere = this.spheres[i];
				let leftIndex = (i === 0) ? lastIndex : i - 1;
				// let rightIndex = (i === lastIndex) ? 0 : i + 1;
				let leftVertex = this.points[leftIndex];
				// let rightVertex = this.points[rightIndex];
				let leftEdge = this.edges[leftIndex];
				let rightEdge = this.edges[i];
				let leftBox = this.boxes[leftIndex];
				// rightBox = this.boxes[i];

				// let leftEdgeLength = point.distanceTo(leftVertex);
				// let rightEdgeLength = point.distanceTo(rightVertex);
				// let leftEdgeCenter = new THREE.Vector3().addVectors(leftVertex, point).multiplyScalar(0.5);
				// let rightEdgeCenter = new THREE.Vector3().addVectors(point, rightVertex).multiplyScalar(0.5);

				sphere.position.copy(point);

				if (this._modifiable) {
					sphere.visible = true;
				} else {
					sphere.visible = false;
				}

				if (leftEdge) {
					leftEdge.geometry.vertices[1].copy(point);
					leftEdge.geometry.verticesNeedUpdate = true;
					leftEdge.geometry.computeBoundingSphere();
				}

				if (rightEdge) {
					rightEdge.geometry.vertices[0].copy(point);
					rightEdge.geometry.verticesNeedUpdate = true;
					rightEdge.geometry.computeBoundingSphere();
				}

				if (leftBox) {
					let start = leftVertex;
					let end = point;
					let length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
					leftBox.scale.set(length, 1000000, this.width);
					leftBox.up.set(0, 0, 1);

					let center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
					let diff = new THREE.Vector3().subVectors(end, start);
					let target = new THREE.Vector3(diff.y, -diff.x, 0);

					leftBox.position.set(0, 0, 0);
					leftBox.lookAt(target);
					leftBox.position.copy(center);
				}

				centroid.add(point);
				min.min(point);
				max.max(point);
			}
			centroid.multiplyScalar(1 / this.points.length);

			for (let i = 0; i < this.boxes.length; i++) {
				let box = this.boxes[i];

				box.position.z = min.z + (max.z - min.z) / 2;
			}
		}

		raycast (raycaster, intersects) {
			for (let i = 0; i < this.points.length; i++) {
				let sphere = this.spheres[i];

				sphere.raycast(raycaster, intersects);
			}

			// recalculate distances because they are not necessarely correct
			// for scaled objects.
			// see https://github.com/mrdoob/three.js/issues/5827
			// TODO: remove this once the bug has been fixed
			for (let i = 0; i < intersects.length; i++) {
				let I = intersects[i];
				I.distance = raycaster.ray.origin.distanceTo(I.point);
			}
			intersects.sort(function (a, b) { return a.distance - b.distance; });
		};

		get modifiable () {
			return this._modifiable;
		}

		set modifiable (value) {
			this._modifiable = value;
			this.update();
		}

	}

	function createHeightLine(){
		let lineGeometry = new THREE.LineGeometry();

		lineGeometry.setPositions([
			0, 0, 0,
			0, 0, 0,
		]);

		let lineMaterial = new THREE.LineMaterial({ 
			color: 0x00ff00, 
			dashSize: 5, 
			gapSize: 2,
			linewidth: 2, 
			resolution:  new THREE.Vector2(1000, 1000),
		});

		lineMaterial.depthTest = false;
		const heightEdge = new THREE.Line2(lineGeometry, lineMaterial);
		heightEdge.visible = false;

		//this.add(this.heightEdge);
		
		return heightEdge;
	}

	function createHeightLabel(){
		const heightLabel = new TextSprite('');

		heightLabel.setTextColor({r: 140, g: 250, b: 140, a: 1.0});
		heightLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
		heightLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
		heightLabel.fontsize = 16;
		heightLabel.material.depthTest = false;
		heightLabel.material.opacity = 1;
		heightLabel.visible = false;

		return heightLabel;
	}

	function createAreaLabel(){
		const areaLabel = new TextSprite('');

		areaLabel.setTextColor({r: 140, g: 250, b: 140, a: 1.0});
		areaLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
		areaLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
		areaLabel.fontsize = 16;
		areaLabel.material.depthTest = false;
		areaLabel.material.opacity = 1;
		areaLabel.visible = false;
		
		return areaLabel;
	}

	function createCircleRadiusLabel(){
		const circleRadiusLabel = new TextSprite("");

		circleRadiusLabel.setTextColor({r: 140, g: 250, b: 140, a: 1.0});
		circleRadiusLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
		circleRadiusLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
		circleRadiusLabel.fontsize = 16;
		circleRadiusLabel.material.depthTest = false;
		circleRadiusLabel.material.opacity = 1;
		circleRadiusLabel.visible = false;
		
		return circleRadiusLabel;
	}

	function createCircleRadiusLine(){
		const lineGeometry = new THREE.LineGeometry();

		lineGeometry.setPositions([
			0, 0, 0,
			0, 0, 0,
		]);

		const lineMaterial = new THREE.LineMaterial({ 
			color: 0xff0000, 
			linewidth: 2, 
			resolution:  new THREE.Vector2(1000, 1000),
			gapSize: 1,
			dashed: true,
		});

		lineMaterial.depthTest = false;

		const circleRadiusLine = new THREE.Line2(lineGeometry, lineMaterial);
		circleRadiusLine.visible = false;

		return circleRadiusLine;
	}

	function createCircleLine(){
		const coordinates = [];

		let n = 128;
		for(let i = 0; i <= n; i++){
			let u0 = 2 * Math.PI * (i / n);
			let u1 = 2 * Math.PI * (i + 1) / n;

			let p0 = new THREE.Vector3(
				Math.cos(u0), 
				Math.sin(u0), 
				0
			);

			let p1 = new THREE.Vector3(
				Math.cos(u1), 
				Math.sin(u1), 
				0
			);

			coordinates.push(
				...p0.toArray(),
				...p1.toArray(),
			);
		}

		const geometry = new THREE.LineGeometry();
		geometry.setPositions(coordinates);

		const material = new THREE.LineMaterial({ 
			color: 0xff0000, 
			dashSize: 5, 
			gapSize: 2,
			linewidth: 2, 
			resolution:  new THREE.Vector2(1000, 1000),
		});

		material.depthTest = false;

		const circleLine = new THREE.Line2(geometry, material);
		circleLine.visible = false;
		circleLine.computeLineDistances();

		return circleLine;
	}

	function createCircleCenter(){
		const sg = new THREE.SphereGeometry(1, 32, 32);
		const sm = new THREE.MeshNormalMaterial();
		
		const circleCenter = new THREE.Mesh(sg, sm);
		circleCenter.visible = false;

		return circleCenter;
	}

	function createLine(){
		const geometry = new THREE.LineGeometry();

		geometry.setPositions([
			0, 0, 0,
			0, 0, 0,
		]);

		const material = new THREE.LineMaterial({ 
			color: 0xff0000, 
			linewidth: 2, 
			resolution:  new THREE.Vector2(1000, 1000),
			gapSize: 1,
			dashed: true,
		});

		material.depthTest = false;

		const line = new THREE.Line2(geometry, material);

		return line;
	}

	function createCircle(){

		const coordinates = [];

		let n = 128;
		for(let i = 0; i <= n; i++){
			let u0 = 2 * Math.PI * (i / n);
			let u1 = 2 * Math.PI * (i + 1) / n;

			let p0 = new THREE.Vector3(
				Math.cos(u0), 
				Math.sin(u0), 
				0
			);

			let p1 = new THREE.Vector3(
				Math.cos(u1), 
				Math.sin(u1), 
				0
			);

			coordinates.push(
				...p0.toArray(),
				...p1.toArray(),
			);
		}

		const geometry = new THREE.LineGeometry();
		geometry.setPositions(coordinates);

		const material = new THREE.LineMaterial({ 
			color: 0xff0000, 
			dashSize: 5, 
			gapSize: 2,
			linewidth: 2, 
			resolution:  new THREE.Vector2(1000, 1000),
		});

		material.depthTest = false;

		const line = new THREE.Line2(geometry, material);
		line.computeLineDistances();

		return line;

	}

	function createAzimuth(){

		const azimuth = {
			label: null,
			center: null,
			target: null,
			north: null,
			centerToNorth: null,
			centerToTarget: null,
			centerToTargetground: null,
			targetgroundToTarget: null,
			circle: null,

			node: null,
		};

		const sg = new THREE.SphereGeometry(1, 32, 32);
		const sm = new THREE.MeshNormalMaterial();

		{
			const label = new TextSprite("");

			label.setTextColor({r: 140, g: 250, b: 140, a: 1.0});
			label.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
			label.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
			label.fontsize = 16;
			label.material.depthTest = false;
			label.material.opacity = 1;

			azimuth.label = label;
		}

		azimuth.center = new THREE.Mesh(sg, sm);
		azimuth.target = new THREE.Mesh(sg, sm);
		azimuth.north = new THREE.Mesh(sg, sm);
		azimuth.centerToNorth = createLine();
		azimuth.centerToTarget = createLine();
		azimuth.centerToTargetground = createLine();
		azimuth.targetgroundToTarget = createLine();
		azimuth.circle = createCircle();

		azimuth.node = new THREE.Object3D();
		azimuth.node.add(
			azimuth.centerToNorth,
			azimuth.centerToTarget,
			azimuth.centerToTargetground,
			azimuth.targetgroundToTarget,
			azimuth.circle,
			azimuth.label,
			azimuth.center,
			azimuth.target,
			azimuth.north,
		);

		return azimuth;
	}

	class Measure extends THREE.Object3D {
		constructor () {
			super();

			this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;

			this.name = 'Measure_' + this.constructor.counter;
			this.points = [];
			this._showDistances = true;
			this._showCoordinates = false;
			this._showArea = false;
			this._closed = true;
			this._showAngles = false;
			this._showCircle = false;
			this._showHeight = false;
			this._showEdges = true;
			this._showAzimuth = false;
			this.maxMarkers = Number.MAX_SAFE_INTEGER;

			this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
			this.color = new THREE.Color(0xff0000);

			this.spheres = [];
			this.edges = [];
			this.sphereLabels = [];
			this.edgeLabels = [];
			this.angleLabels = [];
			this.coordinateLabels = [];

			this.heightEdge = createHeightLine();
			this.heightLabel = createHeightLabel();
			this.areaLabel = createAreaLabel();
			this.circleRadiusLabel = createCircleRadiusLabel();
			this.circleRadiusLine = createCircleRadiusLine();
			this.circleLine = createCircleLine();
			this.circleCenter = createCircleCenter();

			this.azimuth = createAzimuth();

			this.add(this.heightEdge);
			this.add(this.heightLabel);
			this.add(this.areaLabel);
			this.add(this.circleRadiusLabel);
			this.add(this.circleRadiusLine);
			this.add(this.circleLine);
			this.add(this.circleCenter);

			this.add(this.azimuth.node);

		}

		createSphereMaterial () {
			let sphereMaterial = new THREE.MeshLambertMaterial({
				//shading: THREE.SmoothShading,
				color: this.color,
				depthTest: false,
				depthWrite: false}
			);

			return sphereMaterial;
		};

		addMarker (point) {
			if (point instanceof THREE.Vector3) {
				point = {position: point};
			}else if(point instanceof Array){
				point = {position: new THREE.Vector3(...point)};
			}
			this.points.push(point);

			// sphere
			let sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());

			this.add(sphere);
			this.spheres.push(sphere);

			{ // edges
				let lineGeometry = new THREE.LineGeometry();
				lineGeometry.setPositions( [
						0, 0, 0,
						0, 0, 0,
				]);

				let lineMaterial = new THREE.LineMaterial({
					color: 0xff0000, 
					linewidth: 2, 
					resolution:  new THREE.Vector2(1000, 1000),
				});

				lineMaterial.depthTest = false;

				let edge = new THREE.Line2(lineGeometry, lineMaterial);
				edge.visible = true;

				this.add(edge);
				this.edges.push(edge);
			}

			{ // edge labels
				let edgeLabel = new TextSprite();
				edgeLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
				edgeLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
				edgeLabel.material.depthTest = false;
				edgeLabel.visible = false;
				edgeLabel.fontsize = 16;
				this.edgeLabels.push(edgeLabel);
				this.add(edgeLabel);
			}

			{ // angle labels
				let angleLabel = new TextSprite();
				angleLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
				angleLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
				angleLabel.fontsize = 16;
				angleLabel.material.depthTest = false;
				angleLabel.material.opacity = 1;
				angleLabel.visible = false;
				this.angleLabels.push(angleLabel);
				this.add(angleLabel);
			}

			{ // coordinate labels
				let coordinateLabel = new TextSprite();
				coordinateLabel.setBorderColor({r: 0, g: 0, b: 0, a: 1.0});
				coordinateLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 1.0});
				coordinateLabel.fontsize = 16;
				coordinateLabel.material.depthTest = false;
				coordinateLabel.material.opacity = 1;
				coordinateLabel.visible = false;
				this.coordinateLabels.push(coordinateLabel);
				this.add(coordinateLabel);
			}

			{ // Event Listeners
				let drag = (e) => {
					let I = Utils.getMousePointCloudIntersection(
						e.drag.end, 
						e.viewer.scene.getActiveCamera(), 
						e.viewer, 
						e.viewer.scene.pointclouds,
						{pickClipped: true});

					if (I) {
						let i = this.spheres.indexOf(e.drag.object);
						if (i !== -1) {
							let point = this.points[i];
							for (let key of Object.keys(I.point).filter(e => e !== 'position')) {
								point[key] = I.point[key];
							}

							this.setPosition(i, I.location);
						}
					}
				};

				let drop = e => {
					let i = this.spheres.indexOf(e.drag.object);
					if (i !== -1) {
						this.dispatchEvent({
							'type': 'marker_dropped',
							'measurement': this,
							'index': i
						});
					}
				};

				let mouseover = (e) => e.object.material.emissive.setHex(0x888888);
				let mouseleave = (e) => e.object.material.emissive.setHex(0x000000);

				sphere.addEventListener('drag', drag);
				sphere.addEventListener('drop', drop);
				sphere.addEventListener('mouseover', mouseover);
				sphere.addEventListener('mouseleave', mouseleave);
			}

			let event = {
				type: 'marker_added',
				measurement: this,
				sphere: sphere
			};
			this.dispatchEvent(event);

			this.setMarker(this.points.length - 1, point);
		};

		removeMarker (index) {
			this.points.splice(index, 1);

			this.remove(this.spheres[index]);

			let edgeIndex = (index === 0) ? 0 : (index - 1);
			this.remove(this.edges[edgeIndex]);
			this.edges.splice(edgeIndex, 1);

			this.remove(this.edgeLabels[edgeIndex]);
			this.edgeLabels.splice(edgeIndex, 1);
			this.coordinateLabels.splice(index, 1);

			this.remove(this.angleLabels[index]);
			this.angleLabels.splice(index, 1);

			this.spheres.splice(index, 1);

			this.update();

			this.dispatchEvent({type: 'marker_removed', measurement: this});
		};

		setMarker (index, point) {
			this.points[index] = point;

			let event = {
				type: 'marker_moved',
				measure:	this,
				index:	index,
				position: point.position.clone()
			};
			this.dispatchEvent(event);

			this.update();
		}

		setPosition (index, position) {
			let point = this.points[index];
			point.position.copy(position);

			let event = {
				type: 'marker_moved',
				measure:	this,
				index:	index,
				position: position.clone()
			};
			this.dispatchEvent(event);

			this.update();
		};

		getArea () {
			let area = 0;
			let j = this.points.length - 1;

			for (let i = 0; i < this.points.length; i++) {
				let p1 = this.points[i].position;
				let p2 = this.points[j].position;
				area += (p2.x + p1.x) * (p1.y - p2.y);
				j = i;
			}

			return Math.abs(area / 2);
		};

		getTotalDistance () {
			if (this.points.length === 0) {
				return 0;
			}

			let distance = 0;

			for (let i = 1; i < this.points.length; i++) {
				let prev = this.points[i - 1].position;
				let curr = this.points[i].position;
				let d = prev.distanceTo(curr);

				distance += d;
			}

			if (this.closed && this.points.length > 1) {
				let first = this.points[0].position;
				let last = this.points[this.points.length - 1].position;
				let d = last.distanceTo(first);

				distance += d;
			}

			return distance;
		}

		getAngleBetweenLines (cornerPoint, point1, point2) {
			let v1 = new THREE.Vector3().subVectors(point1.position, cornerPoint.position);
			let v2 = new THREE.Vector3().subVectors(point2.position, cornerPoint.position);

			// avoid the error printed by threejs if denominator is 0
			const denominator = Math.sqrt( v1.lengthSq() * v2.lengthSq() );
			if(denominator === 0){
				return 0;
			}else {
				return v1.angleTo(v2);
			}
		};

		getAngle (index) {
			if (this.points.length < 3 || index >= this.points.length) {
				return 0;
			}

			let previous = (index === 0) ? this.points[this.points.length - 1] : this.points[index - 1];
			let point = this.points[index];
			let next = this.points[(index + 1) % (this.points.length)];

			return this.getAngleBetweenLines(point, previous, next);
		}

		// updateAzimuth(){
		// 	// if(this.points.length !== 2){
		// 	// 	return;
		// 	// }

		// 	// const azimuth = this.azimuth;

		// 	// const [p0, p1] = this.points;

		// 	// const r = p0.position.distanceTo(p1.position);
			
		// }

		update () {
			if (this.points.length === 0) {
				return;
			} else if (this.points.length === 1) {
				let point = this.points[0];
				let position = point.position;
				this.spheres[0].position.copy(position);

				{ // coordinate labels
					let coordinateLabel = this.coordinateLabels[0];
					
					let msg = position.toArray().map(p => Utils.addCommas(p.toFixed(2))).join(" / ");
					coordinateLabel.setText(msg);

					coordinateLabel.visible = this.showCoordinates;
				}

				return;
			}

			let lastIndex = this.points.length - 1;

			let centroid = new THREE.Vector3();
			for (let i = 0; i <= lastIndex; i++) {
				let point = this.points[i];
				centroid.add(point.position);
			}
			centroid.divideScalar(this.points.length);

			for (let i = 0; i <= lastIndex; i++) {
				let index = i;
				let nextIndex = (i + 1 > lastIndex) ? 0 : i + 1;
				let previousIndex = (i === 0) ? lastIndex : i - 1;

				let point = this.points[index];
				let nextPoint = this.points[nextIndex];
				let previousPoint = this.points[previousIndex];

				let sphere = this.spheres[index];

				// spheres
				sphere.position.copy(point.position);
				sphere.material.color = this.color;

				{ // edges
					let edge = this.edges[index];

					edge.material.color = this.color;

					edge.position.copy(point.position);

					edge.geometry.setPositions([
						0, 0, 0,
						...nextPoint.position.clone().sub(point.position).toArray(),
					]);

					edge.geometry.verticesNeedUpdate = true;
					edge.geometry.computeBoundingSphere();
					edge.computeLineDistances();
					edge.visible = index < lastIndex || this.closed;
					
					if(!this.showEdges){
						edge.visible = false;
					}
				}

				{ // edge labels
					let edgeLabel = this.edgeLabels[i];

					let center = new THREE.Vector3().add(point.position);
					center.add(nextPoint.position);
					center = center.multiplyScalar(0.5);
					let distance = point.position.distanceTo(nextPoint.position);

					edgeLabel.position.copy(center);

					let suffix = "";
					if(this.lengthUnit != null && this.lengthUnitDisplay != null){
						distance = distance / this.lengthUnit.unitspermeter * this.lengthUnitDisplay.unitspermeter;  //convert to meters then to the display unit
						suffix = this.lengthUnitDisplay.code;
					}

					let txtLength = Utils.addCommas(distance.toFixed(2));
					edgeLabel.setText(`${txtLength} ${suffix}`);
					edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
				}

				{ // angle labels
					let angleLabel = this.angleLabels[i];
					let angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);

					let dir = nextPoint.position.clone().sub(previousPoint.position);
					dir.multiplyScalar(0.5);
					dir = previousPoint.position.clone().add(dir).sub(point.position).normalize();

					let dist = Math.min(point.position.distanceTo(previousPoint.position), point.position.distanceTo(nextPoint.position));
					dist = dist / 9;

					let labelPos = point.position.clone().add(dir.multiplyScalar(dist));
					angleLabel.position.copy(labelPos);

					let msg = Utils.addCommas((angle * (180.0 / Math.PI)).toFixed(1)) + '\u00B0';
					angleLabel.setText(msg);

					angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
				}
			}

			{ // update height stuff
				let heightEdge = this.heightEdge;
				heightEdge.visible = this.showHeight;
				this.heightLabel.visible = this.showHeight;

				if (this.showHeight) {
					let sorted = this.points.slice().sort((a, b) => a.position.z - b.position.z);
					let lowPoint = sorted[0].position.clone();
					let highPoint = sorted[sorted.length - 1].position.clone();
					let min = lowPoint.z;
					let max = highPoint.z;
					let height = max - min;

					let start = new THREE.Vector3(highPoint.x, highPoint.y, min);
					let end = new THREE.Vector3(highPoint.x, highPoint.y, max);

					heightEdge.position.copy(lowPoint);

					heightEdge.geometry.setPositions([
						0, 0, 0,
						...start.clone().sub(lowPoint).toArray(),
						...start.clone().sub(lowPoint).toArray(),
						...end.clone().sub(lowPoint).toArray(),
					]);

					heightEdge.geometry.verticesNeedUpdate = true;
					// heightEdge.geometry.computeLineDistances();
					// heightEdge.geometry.lineDistancesNeedUpdate = true;
					heightEdge.geometry.computeBoundingSphere();
					heightEdge.computeLineDistances();

					// heightEdge.material.dashSize = height / 40;
					// heightEdge.material.gapSize = height / 40;

					let heightLabelPosition = start.clone().add(end).multiplyScalar(0.5);
					this.heightLabel.position.copy(heightLabelPosition);

					let suffix = "";
					if(this.lengthUnit != null && this.lengthUnitDisplay != null){
						height = height / this.lengthUnit.unitspermeter * this.lengthUnitDisplay.unitspermeter;  //convert to meters then to the display unit
						suffix = this.lengthUnitDisplay.code;
					}

					let txtHeight = Utils.addCommas(height.toFixed(2));
					let msg = `${txtHeight} ${suffix}`;
					this.heightLabel.setText(msg);
				}
			}

			{ // update circle stuff
				const circleRadiusLabel = this.circleRadiusLabel;
				const circleRadiusLine = this.circleRadiusLine;
				const circleLine = this.circleLine;
				const circleCenter = this.circleCenter;

				const circleOkay = this.points.length === 3;

				circleRadiusLabel.visible = this.showCircle && circleOkay;
				circleRadiusLine.visible = this.showCircle && circleOkay;
				circleLine.visible = this.showCircle && circleOkay;
				circleCenter.visible = this.showCircle && circleOkay;

				if(this.showCircle && circleOkay){

					const A = this.points[0].position;
					const B = this.points[1].position;
					const C = this.points[2].position;
					const AB = B.clone().sub(A);
					const AC = C.clone().sub(A);
					const N = AC.clone().cross(AB).normalize();

					const center = Potree.Utils.computeCircleCenter(A, B, C);
					const radius = center.distanceTo(A);


					const scale = radius / 20;
					circleCenter.position.copy(center);
					circleCenter.scale.set(scale, scale, scale);

					//circleRadiusLine.geometry.vertices[0].set(0, 0, 0);
					//circleRadiusLine.geometry.vertices[1].copy(B.clone().sub(center));

					circleRadiusLine.geometry.setPositions( [
						0, 0, 0,
						...B.clone().sub(center).toArray()
					] );

					circleRadiusLine.geometry.verticesNeedUpdate = true;
					circleRadiusLine.geometry.computeBoundingSphere();
					circleRadiusLine.position.copy(center);
					circleRadiusLine.computeLineDistances();

					const target = center.clone().add(N);
					circleLine.position.copy(center);
					circleLine.scale.set(radius, radius, radius);
					circleLine.lookAt(target);
					
					circleRadiusLabel.visible = true;
					circleRadiusLabel.position.copy(center.clone().add(B).multiplyScalar(0.5));
					circleRadiusLabel.setText(`${radius.toFixed(3)}`);

				}
			}

			{ // update area label
				this.areaLabel.position.copy(centroid);
				this.areaLabel.visible = this.showArea && this.points.length >= 3;
				let area = this.getArea();

				let suffix = "";
				if(this.lengthUnit != null && this.lengthUnitDisplay != null){
					area = area / Math.pow(this.lengthUnit.unitspermeter, 2) * Math.pow(this.lengthUnitDisplay.unitspermeter, 2);  //convert to square meters then to the square display unit
					suffix = this.lengthUnitDisplay.code;
				}

				let txtArea = Utils.addCommas(area.toFixed(1));
				let msg =  `${txtArea} ${suffix}\u00B2`;
				this.areaLabel.setText(msg);
			}

			// this.updateAzimuth();
		};

		raycast (raycaster, intersects) {
			for (let i = 0; i < this.points.length; i++) {
				let sphere = this.spheres[i];

				sphere.raycast(raycaster, intersects);
			}

			// recalculate distances because they are not necessarely correct
			// for scaled objects.
			// see https://github.com/mrdoob/three.js/issues/5827
			// TODO: remove this once the bug has been fixed
			for (let i = 0; i < intersects.length; i++) {
				let I = intersects[i];
				I.distance = raycaster.ray.origin.distanceTo(I.point);
			}
			intersects.sort(function (a, b) { return a.distance - b.distance; });
		};

		get showCoordinates () {
			return this._showCoordinates;
		}

		set showCoordinates (value) {
			this._showCoordinates = value;
			this.update();
		}

		get showAngles () {
			return this._showAngles;
		}

		set showAngles (value) {
			this._showAngles = value;
			this.update();
		}

		get showCircle () {
			return this._showCircle;
		}

		set showCircle (value) {
			this._showCircle = value;
			this.update();
		}

		get showAzimuth(){
			return this._showAzimuth;
		}

		set showAzimuth(value){
			this._showAzimuth = value;
			this.update();
		}

		get showEdges () {
			return this._showEdges;
		}

		set showEdges (value) {
			this._showEdges = value;
			this.update();
		}

		get showHeight () {
			return this._showHeight;
		}

		set showHeight (value) {
			this._showHeight = value;
			this.update();
		}

		get showArea () {
			return this._showArea;
		}

		set showArea (value) {
			this._showArea = value;
			this.update();
		}

		get closed () {
			return this._closed;
		}

		set closed (value) {
			this._closed = value;
			this.update();
		}

		get showDistances () {
			return this._showDistances;
		}

		set showDistances (value) {
			this._showDistances = value;
			this.update();
		}

	}

	class PolygonClipVolume extends THREE.Object3D{
		
		constructor(camera){
			super();

			this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
			this.name = "polygon_clip_volume_" + this.constructor.counter;

			this.camera = camera.clone();
			this.camera.rotation.set(...camera.rotation.toArray()); // [r85] workaround because camera.clone() doesn't work on rotation
			this.camera.rotation.order = camera.rotation.order;
			this.camera.updateMatrixWorld();
			this.camera.updateProjectionMatrix();
			this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

			this.viewMatrix = this.camera.matrixWorldInverse.clone();
			this.projMatrix = this.camera.projectionMatrix.clone();

			// projected markers
			this.markers = [];
			this.initialized = false;
		}

		addMarker() {

			let marker = new THREE.Mesh();

			let cancel;

			let drag = e => {
				let size = e.viewer.renderer.getSize(new THREE.Vector2());
				let projectedPos = new THREE.Vector3(
					2.0 * (e.drag.end.x / size.width) - 1.0,
					-2.0 * (e.drag.end.y / size.height) + 1.0,
					0
				);

				marker.position.copy(projectedPos);
			};
			
			let drop = e => {	
				cancel();
			};
			
			cancel = e => {
				marker.removeEventListener("drag", drag);
				marker.removeEventListener("drop", drop);
			};
			
			marker.addEventListener("drag", drag);
			marker.addEventListener("drop", drop);


			this.markers.push(marker);
		}

		removeLastMarker() {
			if(this.markers.length > 0) {
				this.markers.splice(this.markers.length - 1, 1);
			}
		}

	};

	class Utils {
		static async loadShapefileFeatures (file, callback) {
			let features = [];

			let handleFinish = () => {
				callback(features);
			};

			let source = await shapefile.open(file);

			while(true){
				let result = await source.read();

				if (result.done) {
					handleFinish();
					break;
				}

				if (result.value && result.value.type === 'Feature' && result.value.geometry !== undefined) {
					features.push(result.value);
				}
			}

		}

		static toString (value) {
			if (value instanceof THREE.Vector3) {
				return value.x.toFixed(2) + ', ' + value.y.toFixed(2) + ', ' + value.z.toFixed(2);
			} else {
				return '' + value + '';
			}
		}

		static normalizeURL (url) {
			let u = new URL(url);

			return u.protocol + '//' + u.hostname + u.pathname.replace(/\/+/g, '/');
		};

		static pathExists (url) {
			let req = XHRFactory.createXMLHttpRequest();
			req.open('GET', url, false);
			req.send(null);
			if (req.status !== 200) {
				return false;
			}
			return true;
		};

		static debugSphere(parent, position, scale, color){
			let geometry = new THREE.SphereGeometry(1, 8, 8);
			let material;

			if(color !== undefined){
				material = new THREE.MeshBasicMaterial({color: color});
			}else {
				material = new THREE.MeshNormalMaterial();
			}
			let sphere = new THREE.Mesh(geometry, material);
			sphere.position.copy(position);
			sphere.scale.set(scale, scale, scale);
			parent.add(sphere);
		}

		static debugLine(parent, start, end, color){

			let material = new THREE.LineBasicMaterial({ color: color }); 
			let geometry = new THREE.Geometry();

			const p1 = new THREE.Vector3(0, 0, 0);
			const p2 = end.clone().sub(start);

			geometry.vertices.push(p1, p2);

			let tl = new THREE.Line( geometry, material );
			tl.position.copy(start);

			parent.add(tl);
		}

		static debugCircle(parent, center, radius, normal, color){
			let material = new THREE.LineBasicMaterial({ color: color });

			let geometry = new THREE.Geometry();

			let n = 32;
			for(let i = 0; i <= n; i++){
				let u0 = 2 * Math.PI * (i / n);
				let u1 = 2 * Math.PI * (i + 1) / n;

				let p0 = new THREE.Vector3(
					Math.cos(u0), 
					Math.sin(u0), 
					0
				);

				let p1 = new THREE.Vector3(
					Math.cos(u1), 
					Math.sin(u1), 
					0
				);

				geometry.vertices.push(p0, p1); 
			}

			let tl = new THREE.Line( geometry, material ); 
			tl.position.copy(center);
			tl.scale.set(radius, radius, radius);

			parent.add(tl);
		}

		static debugBox(parent, box, transform = new THREE.Matrix4(), color = 0xFFFF00){
			
			let vertices = [
				[box.min.x, box.min.y, box.min.z],
				[box.min.x, box.min.y, box.max.z],
				[box.min.x, box.max.y, box.min.z],
				[box.min.x, box.max.y, box.max.z],

				[box.max.x, box.min.y, box.min.z],
				[box.max.x, box.min.y, box.max.z],
				[box.max.x, box.max.y, box.min.z],
				[box.max.x, box.max.y, box.max.z],
			].map(v => new THREE.Vector3(...v));

			let edges = [
				[0, 4], [4, 5], [5, 1], [1, 0],
				[2, 6], [6, 7], [7, 3], [3, 2],
				[0, 2], [4, 6], [5, 7], [1, 3]
			];

			let center = box.getCenter(new THREE.Vector3());

			let centroids = [
				{position: [box.min.x, center.y, center.z], color: 0xFF0000},
				{position: [box.max.x, center.y, center.z], color: 0x880000},

				{position: [center.x, box.min.y, center.z], color: 0x00FF00},
				{position: [center.x, box.max.y, center.z], color: 0x008800},

				{position: [center.x, center.y, box.min.z], color: 0x0000FF},
				{position: [center.x, center.y, box.max.z], color: 0x000088},
			];

			for(let vertex of vertices){
				let pos = vertex.clone().applyMatrix4(transform);

				Utils.debugSphere(parent, pos, 0.1, 0xFF0000);
			}

			for(let edge of edges){
				let start = vertices[edge[0]].clone().applyMatrix4(transform);
				let end = vertices[edge[1]].clone().applyMatrix4(transform);

				Utils.debugLine(parent, start, end, color);
			}

			for(let centroid of centroids){
				let pos = new THREE.Vector3(...centroid.position).applyMatrix4(transform);

				Utils.debugSphere(parent, pos, 0.1, centroid.color);
			}
		}

		static debugPlane(parent, plane, size = 1, color = 0x0000FF){

			let planehelper = new THREE.PlaneHelper(plane, size, color);

			parent.add(planehelper);

		}

		/**
		 * adapted from mhluska at https://github.com/mrdoob/three.js/issues/1561
		 */
		static computeTransformedBoundingBox (box, transform) {
			let vertices = [
				new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
				new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
				new THREE.Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(transform),
				new THREE.Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(transform),
				new THREE.Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(transform),
				new THREE.Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(transform),
				new THREE.Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(transform),
				new THREE.Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(transform),
				new THREE.Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(transform)
			];

			let boundingBox = new THREE.Box3();
			boundingBox.setFromPoints(vertices);

			return boundingBox;
		};

		/**
		 * add separators to large numbers
		 *
		 * @param nStr
		 * @returns
		 */
		static addCommas (nStr) {
			nStr += '';
			let x = nStr.split('.');
			let x1 = x[0];
			let x2 = x.length > 1 ? '.' + x[1] : '';
			let rgx = /(\d+)(\d{3})/;
			while (rgx.test(x1)) {
				x1 = x1.replace(rgx, '$1' + ',' + '$2');
			}
			return x1 + x2;
		};

		static removeCommas (str) {
			return str.replace(/,/g, '');
		}

		/**
		 * create worker from a string
		 *
		 * code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
		 */
		static createWorker (code) {
			let blob = new Blob([code], {type: 'application/javascript'});
			let worker = new Worker(URL.createObjectURL(blob));

			return worker;
		};

		static moveTo(scene, endPosition, endTarget){

			let view = scene.view;
			let camera = scene.getActiveCamera();
			let animationDuration = 500;
			let easing = TWEEN.Easing.Quartic.Out;

			{ // animate camera position
				let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
				tween.easing(easing);
				tween.start();
			}

			{ // animate camera target
				let camTargetDistance = camera.position.distanceTo(endTarget);
				let target = new THREE.Vector3().addVectors(
					camera.position,
					camera.getWorldDirection(new THREE.Vector3()).clone().multiplyScalar(camTargetDistance)
				);
				let tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
				tween.easing(easing);
				tween.onUpdate(() => {
					view.lookAt(target);
				});
				tween.onComplete(() => {
					view.lookAt(target);
				});
				tween.start();
			}

		}

		static loadSkybox (path) {
			let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
			camera.up.set(0, 0, 1);
			let scene = new THREE.Scene();

			let format = '.jpg';
			let urls = [
				path + 'px' + format, path + 'nx' + format,
				path + 'py' + format, path + 'ny' + format,
				path + 'pz' + format, path + 'nz' + format
			];

			let materialArray = [];
			{
				for (let i = 0; i < 6; i++) {
					let material = new THREE.MeshBasicMaterial({
						map: null,
						side: THREE.BackSide,
						depthTest: false,
						depthWrite: false,
						color: 0x424556
					});

					materialArray.push(material);

					let loader = new THREE.TextureLoader();
					loader.load(urls[i],
						function loaded (texture) {
							material.map = texture;
							material.needsUpdate = true;
							material.color.setHex(0xffffff);
						}, function progress (xhr) {
							// console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
						}, function error (xhr) {
							console.log('An error happened', xhr);
						}
					);
				}
			}

			let skyGeometry = new THREE.CubeGeometry(5000, 5000, 5000);
			let skybox = new THREE.Mesh(skyGeometry, materialArray);

			scene.add(skybox);

			// z up
			scene.rotation.x = Math.PI / 2;

			return {'camera': camera, 'scene': scene};
		};

		static createGrid (width, length, spacing, color) {
			let material = new THREE.LineBasicMaterial({
				color: color || 0x888888
			});

			let geometry = new THREE.Geometry();
			for (let i = 0; i <= length; i++) {
				geometry.vertices.push(new THREE.Vector3(-(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0));
				geometry.vertices.push(new THREE.Vector3(+(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0));
			}

			for (let i = 0; i <= width; i++) {
				geometry.vertices.push(new THREE.Vector3(i * spacing - (spacing * width) / 2, -(spacing * length) / 2, 0));
				geometry.vertices.push(new THREE.Vector3(i * spacing - (spacing * width) / 2, +(spacing * length) / 2, 0));
			}

			let line = new THREE.LineSegments(geometry, material, THREE.LinePieces);
			line.receiveShadow = true;
			return line;
		}

		static createBackgroundTexture (width, height) {
			function gauss (x, y) {
				return (1 / (2 * Math.PI)) * Math.exp(-(x * x + y * y) / 2);
			};

			// map.magFilter = THREE.NearestFilter;
			let size = width * height;
			let data = new Uint8Array(3 * size);

			let chroma = [1, 1.5, 1.7];
			let max = gauss(0, 0);

			for (let x = 0; x < width; x++) {
				for (let y = 0; y < height; y++) {
					let u = 2 * (x / width) - 1;
					let v = 2 * (y / height) - 1;

					let i = x + width * y;
					let d = gauss(2 * u, 2 * v) / max;
					let r = (Math.random() + Math.random() + Math.random()) / 3;
					r = (d * 0.5 + 0.5) * r * 0.03;
					r = r * 0.4;

					// d = Math.pow(d, 0.6);

					data[3 * i + 0] = 255 * (d / 15 + 0.05 + r) * chroma[0];
					data[3 * i + 1] = 255 * (d / 15 + 0.05 + r) * chroma[1];
					data[3 * i + 2] = 255 * (d / 15 + 0.05 + r) * chroma[2];
				}
			}

			let texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
			texture.needsUpdate = true;

			return texture;
		}

		static getMousePointCloudIntersection (mouse, camera, viewer, pointclouds, params = {}) {
			
			let renderer = viewer.renderer;
			
			let nmouse = {
				x: (mouse.x / renderer.domElement.clientWidth) * 2 - 1,
				y: -(mouse.y / renderer.domElement.clientHeight) * 2 + 1
			};

			let pickParams = {};

			if(params.pickClipped){
				pickParams.pickClipped = params.pickClipped;
			}

			pickParams.x = mouse.x;
			pickParams.y = renderer.domElement.clientHeight - mouse.y;

			let raycaster = new THREE.Raycaster();
			raycaster.setFromCamera(nmouse, camera);
			let ray = raycaster.ray;

			let selectedPointcloud = null;
			let closestDistance = Infinity;
			let closestIntersection = null;
			let closestPoint = null;
			
			for(let pointcloud of pointclouds){
				let point = pointcloud.pick(viewer, camera, ray, pickParams);
				
				if(!point){
					continue;
				}

				let distance = camera.position.distanceTo(point.position);

				if (distance < closestDistance) {
					closestDistance = distance;
					selectedPointcloud = pointcloud;
					closestIntersection = point.position;
					closestPoint = point;
				}
			}

			if (selectedPointcloud) {
				return {
					location: closestIntersection,
					distance: closestDistance,
					pointcloud: selectedPointcloud,
					point: closestPoint
				};
			} else {
				return null;
			}
		}

		static pixelsArrayToImage (pixels, width, height) {
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
		}

		static pixelsArrayToDataUrl(pixels, width, height) {
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

			let dataURL = canvas.toDataURL();

			return dataURL;
		}

		static pixelsArrayToCanvas(pixels, width, height){
			let canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;

			let context = canvas.getContext('2d');

			pixels = new pixels.constructor(pixels);

			//for (let i = 0; i < pixels.length; i++) {
			//	pixels[i * 4 + 3] = 255;
			//}

			// flip vertically
			let bytesPerLine = width * 4;
			for(let i = 0; i < parseInt(height / 2); i++){
				let j = height - i - 1;

				let lineI = pixels.slice(i * bytesPerLine, i * bytesPerLine + bytesPerLine);
				let lineJ = pixels.slice(j * bytesPerLine, j * bytesPerLine + bytesPerLine);
				pixels.set(lineJ, i * bytesPerLine);
				pixels.set(lineI, j * bytesPerLine);
			}

			let imageData = context.createImageData(width, height);
			imageData.data.set(pixels);
			context.putImageData(imageData, 0, 0);

			return canvas;
		}

		static removeListeners(dispatcher, type){
			if (dispatcher._listeners === undefined) {
				return;
			}

			if (dispatcher._listeners[ type ]) {
				delete dispatcher._listeners[ type ];
			}
		}

		static mouseToRay(mouse, camera, width, height){

			let normalizedMouse = {
				x: (mouse.x / width) * 2 - 1,
				y: -(mouse.y / height) * 2 + 1
			};

			let vector = new THREE.Vector3(normalizedMouse.x, normalizedMouse.y, 0.5);
			let origin = camera.position.clone();
			vector.unproject(camera);
			let direction = new THREE.Vector3().subVectors(vector, origin).normalize();

			let ray = new THREE.Ray(origin, direction);

			return ray;
		}

		static projectedRadius(radius, camera, distance, screenWidth, screenHeight){
			if(camera instanceof THREE.OrthographicCamera){
				return Utils.projectedRadiusOrtho(radius, camera.projectionMatrix, screenWidth, screenHeight);
			}else if(camera instanceof THREE.PerspectiveCamera){
				return Utils.projectedRadiusPerspective(radius, camera.fov * Math.PI / 180, distance, screenHeight);
			}else {
				throw new Error("invalid parameters");
			}
		}

		static projectedRadiusPerspective(radius, fov, distance, screenHeight) {
			let projFactor = (1 / Math.tan(fov / 2)) / distance;
			projFactor = projFactor * screenHeight / 2;

			return radius * projFactor;
		}

		static projectedRadiusOrtho(radius, proj, screenWidth, screenHeight) {
			let p1 = new THREE.Vector4(0);
			let p2 = new THREE.Vector4(radius);

			p1.applyMatrix4(proj);
			p2.applyMatrix4(proj);
			p1 = new THREE.Vector3(p1.x, p1.y, p1.z);
			p2 = new THREE.Vector3(p2.x, p2.y, p2.z);
			p1.x = (p1.x + 1.0) * 0.5 * screenWidth;
			p1.y = (p1.y + 1.0) * 0.5 * screenHeight;
			p2.x = (p2.x + 1.0) * 0.5 * screenWidth;
			p2.y = (p2.y + 1.0) * 0.5 * screenHeight;
			return p1.distanceTo(p2);
		}
			
			
		static topView(camera, node){
			camera.position.set(0, 1, 0);
			camera.rotation.set(-Math.PI / 2, 0, 0);
			camera.zoomTo(node, 1);
		}

		static frontView (camera, node) {
			camera.position.set(0, 0, 1);
			camera.rotation.set(0, 0, 0);
			camera.zoomTo(node, 1);
		}

		static leftView (camera, node) {
			camera.position.set(-1, 0, 0);
			camera.rotation.set(0, -Math.PI / 2, 0);
			camera.zoomTo(node, 1);
		}

		static rightView (camera, node) {
			camera.position.set(1, 0, 0);
			camera.rotation.set(0, Math.PI / 2, 0);
			camera.zoomTo(node, 1);
		}

		
		static findClosestGpsTime(target, viewer){
			const start = performance.now();

			const nodes = [];
			for(const pc of viewer.scene.pointclouds){
				nodes.push(pc.root);

				for(const child of pc.root.children){
					if(child){
						nodes.push(child);
					}
				}
			}

			let closestNode = null;
			let closestIndex = Infinity;
			let closestDistance = Infinity;
			let closestValue = 0;

			for(const node of nodes){

				const isOkay = node.geometryNode != null 
					&& node.geometryNode.geometry != null
					&& node.sceneNode != null;

				if(!isOkay){
					continue;
				}

				let geometry = node.geometryNode.geometry;
				let gpsTime = geometry.attributes["gps-time"];
				let range = gpsTime.potree.range;

				for(let i = 0; i < gpsTime.array.length; i++){
					let value = gpsTime.array[i];
					value = value * (range[1] - range[0]) + range[0];
					const distance = Math.abs(target - value);

					if(distance < closestDistance){
						closestIndex = i;
						closestDistance = distance;
						closestValue = value;
						closestNode = node;
						//console.log("found a closer one: " + value);
					}
				}
			}

			const geometry = closestNode.geometryNode.geometry;
			const position = new THREE.Vector3(
				geometry.attributes.position.array[3 * closestIndex + 0],
				geometry.attributes.position.array[3 * closestIndex + 1],
				geometry.attributes.position.array[3 * closestIndex + 2],
			);

			position.applyMatrix4(closestNode.sceneNode.matrixWorld);

			const end = performance.now();
			const duration = (end - start);
			console.log(`duration: ${duration.toFixed(3)}ms`);

			return {
				node: closestNode,
				index: closestIndex,
				position: position,
			};
		}

		/**
		 *
		 * 0: no intersection
		 * 1: intersection
		 * 2: fully inside
		 */
		static frustumSphereIntersection (frustum, sphere) {
			let planes = frustum.planes;
			let center = sphere.center;
			let negRadius = -sphere.radius;

			let minDistance = Number.MAX_VALUE;

			for (let i = 0; i < 6; i++) {
				let distance = planes[ i ].distanceToPoint(center);

				if (distance < negRadius) {
					return 0;
				}

				minDistance = Math.min(minDistance, distance);
			}

			return (minDistance >= sphere.radius) ? 2 : 1;
		}

		// code taken from three.js
		// ImageUtils - generateDataTexture()
		static generateDataTexture (width, height, color) {
			let size = width * height;
			let data = new Uint8Array(4 * width * height);

			let r = Math.floor(color.r * 255);
			let g = Math.floor(color.g * 255);
			let b = Math.floor(color.b * 255);

			for (let i = 0; i < size; i++) {
				data[ i * 3 ] = r;
				data[ i * 3 + 1 ] = g;
				data[ i * 3 + 2 ] = b;
			}

			let texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
			texture.needsUpdate = true;
			texture.magFilter = THREE.NearestFilter;

			return texture;
		}

		// from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
		static getParameterByName (name) {
			name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
			let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
			let results = regex.exec(document.location.search);
			return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
		}

		static setParameter (name, value) {
			// value = encodeURIComponent(value);

			name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
			let regex = new RegExp('([\\?&])(' + name + '=([^&#]*))');
			let results = regex.exec(document.location.search);

			let url = window.location.href;
			if (results === null) {
				if (window.location.search.length === 0) {
					url = url + '?';
				} else {
					url = url + '&';
				}

				url = url + name + '=' + value;
			} else {
				let newValue = name + '=' + value;
				url = url.replace(results[2], newValue);
			}
			window.history.replaceState({}, '', url);
		}

		static createChildAABB(aabb, index){
			let min = aabb.min.clone();
			let max = aabb.max.clone();
			let size = new THREE.Vector3().subVectors(max, min);

			if ((index & 0b0001) > 0) {
				min.z += size.z / 2;
			} else {
				max.z -= size.z / 2;
			}

			if ((index & 0b0010) > 0) {
				min.y += size.y / 2;
			} else {
				max.y -= size.y / 2;
			}

			if ((index & 0b0100) > 0) {
				min.x += size.x / 2;
			} else {
				max.x -= size.x / 2;
			}

			return new THREE.Box3(min, max);
		}

		// see https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
		static clipboardCopy(text){
			let textArea = document.createElement("textarea");

			textArea.style.position = 'fixed';
			textArea.style.top = 0;
			textArea.style.left = 0;

			textArea.style.width = '2em';
			textArea.style.height = '2em';

			textArea.style.padding = 0;

			textArea.style.border = 'none';
			textArea.style.outline = 'none';
			textArea.style.boxShadow = 'none';

			textArea.style.background = 'transparent';

			textArea.value = text;

			document.body.appendChild(textArea);

			textArea.select();

			 try {
				let success = document.execCommand('copy');
				if(success){
					console.log("copied text to clipboard");
				}else {
					console.log("copy to clipboard failed");
				}
			} catch (err) {
				console.log("error while trying to copy to clipboard");
			}

			document.body.removeChild(textArea);

		}

		static getMeasurementIcon(measurement){
			if (measurement instanceof Measure) {
				if (measurement.showDistances && !measurement.showArea && !measurement.showAngles) {
					return `${Potree.resourcePath}/icons/distance.png`;
				} else if (measurement.showDistances && measurement.showArea && !measurement.showAngles) {
					return `${Potree.resourcePath}/icons/area.png`;
				} else if (measurement.maxMarkers === 1) {
					return `${Potree.resourcePath}/icons/point.png`;
				} else if (!measurement.showDistances && !measurement.showArea && measurement.showAngles) {
					return `${Potree.resourcePath}/icons/angle.png`;
				} else if (measurement.showHeight) {
					return `${Potree.resourcePath}/icons/height.png`;
				} else {
					return `${Potree.resourcePath}/icons/distance.png`;
				}
			} else if (measurement instanceof Profile) {
				return `${Potree.resourcePath}/icons/profile.png`;
			} else if (measurement instanceof Volume) {
				return `${Potree.resourcePath}/icons/volume.png`;
			} else if (measurement instanceof PolygonClipVolume) {
				return `${Potree.resourcePath}/icons/clip-polygon.svg`;
			}
		}

		static lineToLineIntersection(P0, P1, P2, P3){

			const P = [P0, P1, P2, P3];

			const d = (m, n, o, p) => {
				let result =  
					  (P[m].x - P[n].x) * (P[o].x - P[p].x)
					+ (P[m].y - P[n].y) * (P[o].y - P[p].y)
					+ (P[m].z - P[n].z) * (P[o].z - P[p].z);

				return result;
			};


			const mua = (d(0, 2, 3, 2) * d(3, 2, 1, 0) - d(0, 2, 1, 0) * d(3, 2, 3, 2))
			        /**-----------------------------------------------------------------**/ /
			            (d(1, 0, 1, 0) * d(3, 2, 3, 2) - d(3, 2, 1, 0) * d(3, 2, 1, 0));


			const mub = (d(0, 2, 3, 2) + mua * d(3, 2, 1, 0))
			        /**--------------------------------------**/ /
			                       d(3, 2, 3, 2);


			const P01 = P1.clone().sub(P0);
			const P23 = P3.clone().sub(P2);
			
			const Pa = P0.clone().add(P01.multiplyScalar(mua));
			const Pb = P2.clone().add(P23.multiplyScalar(mub));

			const center = Pa.clone().add(Pb).multiplyScalar(0.5);

			return center;
		}

		static computeCircleCenter(A, B, C){
			const AB = B.clone().sub(A);
			const AC = C.clone().sub(A);

			const N = AC.clone().cross(AB).normalize();

			const ab_dir = AB.clone().cross(N).normalize();
			const ac_dir = AC.clone().cross(N).normalize();

			const ab_origin = A.clone().add(B).multiplyScalar(0.5);
			const ac_origin = A.clone().add(C).multiplyScalar(0.5);

			const P0 = ab_origin;
			const P1 = ab_origin.clone().add(ab_dir);

			const P2 = ac_origin;
			const P3 = ac_origin.clone().add(ac_dir);

			const center = Utils.lineToLineIntersection(P0, P1, P2, P3);

			return center;

			// Potree.Utils.debugLine(viewer.scene.scene, P0, P1, 0x00ff00);
			// Potree.Utils.debugLine(viewer.scene.scene, P2, P3, 0x0000ff);

			// Potree.Utils.debugSphere(viewer.scene.scene, center, 0.03, 0xff00ff);

			// const radius = center.distanceTo(A);
			// Potree.Utils.debugCircle(viewer.scene.scene, center, radius, new THREE.Vector3(0, 0, 1), 0xff00ff);
		}

		static getNorthVec(p1, distance, projection){
			if(projection){
				// if there is a projection, transform coordinates to WGS84
				// and compute angle to north there

				proj4.defs("pointcloud", projection);
				const transform = proj4("pointcloud", "WGS84");

				const llP1 = transform.forward(p1.toArray());
				let llP2 = transform.forward([p1.x, p1.y + distance]);
				const polarRadius = Math.sqrt((llP2[0] - llP1[0]) ** 2 + (llP2[1] - llP1[1]) ** 2);
				llP2 = [llP1[0], llP1[1] + polarRadius];

				const northVec = transform.inverse(llP2);
				
				return new THREE.Vector3(...northVec, p1.z).sub(p1);
			}else {
				// if there is no projection, assume [0, 1, 0] as north direction

				const vec = new THREE.Vector3(0, 1, 0).multiplyScalar(distance);
				
				return vec;
			}
		}

		static computeAzimuth(p1, p2, projection){

			let azimuth = 0;

			if(projection){
				// if there is a projection, transform coordinates to WGS84
				// and compute angle to north there

				let transform;

				if (projection.includes('EPSG')) {
					transform = proj4(projection, "WGS84");
				} else {
					proj4.defs("pointcloud", projection);
					transform = proj4("pointcloud", "WGS84");
				}

				const llP1 = transform.forward(p1.toArray());
				const llP2 = transform.forward(p2.toArray());
				const dir = [
					llP2[0] - llP1[0],
					llP2[1] - llP1[1],
				];
				azimuth = Math.atan2(dir[1], dir[0]) - Math.PI / 2;
			}else {
				// if there is no projection, assume [0, 1, 0] as north direction

				const dir = [p2.x - p1.x, p2.y - p1.y];
				azimuth = Math.atan2(dir[1], dir[0]) - Math.PI / 2;
			}

			// make clockwise
			azimuth = -azimuth;

			return azimuth;
		}

		static async loadScript(url){

			return new Promise( resolve => {

				const element = document.getElementById(url);

				if(element){
					resolve();
				}else {
					const script = document.createElement("script");

					script.id = url;

					script.onload = () => {
						resolve();
					};
					script.src = url;

					document.body.appendChild(script);
				}
			});
		}

		static createSvgGradient(scheme){

			// this is what we are creating:
			//
			//<svg width="1em" height="3em"  xmlns="http://www.w3.org/2000/svg">
			//	<defs>
			//		<linearGradient id="gradientID" gradientTransform="rotate(90)">
			//		<stop offset="0%"  stop-color="rgb(93, 78, 162)" />
			//		...
			//		<stop offset="100%"  stop-color="rgb(157, 0, 65)" />
			//		</linearGradient>
			//	</defs>
			//	
			//	<rect width="100%" height="100%" fill="url('#myGradient')" stroke="black" stroke-width="0.1em"/>
			//</svg>


			const gradientId = `${Math.random()}_${Date.now()}`;
			
			const svgn = "http://www.w3.org/2000/svg";
			const svg = document.createElementNS(svgn, "svg");
			svg.setAttributeNS(null, "width", "2em");
			svg.setAttributeNS(null, "height", "3em");
			
			{ // <defs>
				const defs = document.createElementNS(svgn, "defs");
				
				const linearGradient = document.createElementNS(svgn, "linearGradient");
				linearGradient.setAttributeNS(null, "id", gradientId);
				linearGradient.setAttributeNS(null, "gradientTransform", "rotate(90)");

				for(let i = scheme.length - 1; i >= 0; i--){
					const stopVal = scheme[i];
					const percent = parseInt(100 - stopVal[0] * 100);
					const [r, g, b] = stopVal[1].toArray().map(v => parseInt(v * 255));

					const stop = document.createElementNS(svgn, "stop");
					stop.setAttributeNS(null, "offset", `${percent}%`);
					stop.setAttributeNS(null, "stop-color", `rgb(${r}, ${g}, ${b})`);

					linearGradient.appendChild(stop);
				}

				defs.appendChild(linearGradient);
				svg.appendChild(defs);
			}

			const rect = document.createElementNS(svgn, "rect");
			rect.setAttributeNS(null, "width", `100%`);
			rect.setAttributeNS(null, "height", `100%`);
			rect.setAttributeNS(null, "fill", `url("#${gradientId}")`);
			rect.setAttributeNS(null, "stroke", `black`);
			rect.setAttributeNS(null, "stroke-width", `0.1em`);

			svg.appendChild(rect);
			
			return svg;
		}

		static async waitAny(promises){
			
			return new Promise( (resolve) => {

				promises.map( promise => {
					promise.then( () => {
						resolve();
					});
				});

			});

		}

	}

	Utils.screenPass = new function () {
		this.screenScene = new THREE.Scene();
		this.screenQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 0));
		this.screenQuad.material.depthTest = true;
		this.screenQuad.material.depthWrite = true;
		this.screenQuad.material.transparent = true;
		this.screenScene.add(this.screenQuad);
		this.camera = new THREE.Camera();

		this.render = function (renderer, material, target) {
			this.screenQuad.material = material;

			if (typeof target === 'undefined') {
				renderer.render(this.screenScene, this.camera);
			} else {
				renderer.render(this.screenScene, this.camera, target);
			}
		};
	}();

	class Annotation extends EventDispatcher {
		constructor (args = {}) {
			super();

			this.scene = null;
			this._title = args.title || 'No Title';
			this._description = args.description || '';
			this.offset = new THREE.Vector3();
			this.uuid = THREE.Math.generateUUID();

			if (!args.position) {
				this.position = null;
			} else if (args.position instanceof THREE.Vector3) {
				this.position = args.position;
			} else {
				this.position = new THREE.Vector3(...args.position);
			}

			this.cameraPosition = (args.cameraPosition instanceof Array)
				? new THREE.Vector3().fromArray(args.cameraPosition) : args.cameraPosition;
			this.cameraTarget = (args.cameraTarget instanceof Array)
				? new THREE.Vector3().fromArray(args.cameraTarget) : args.cameraTarget;
			this.radius = args.radius;
			this.view = args.view || null;
			this.keepOpen = false;
			this.descriptionVisible = false;
			this.showDescription = true;
			this.actions = args.actions || [];
			this.isHighlighted = false;
			this._visible = true;
			this.__visible = true;
			this._display = true;
			this._expand = false;
			this.collapseThreshold = [args.collapseThreshold, 100].find(e => e !== undefined);

			this.children = [];
			this.parent = null;
			this.boundingBox = new THREE.Box3();

			let iconClose = exports.resourcePath + '/icons/close.svg';

			this.domElement = $(`
			<div class="annotation" oncontextmenu="return false;">
				<div class="annotation-titlebar">
					<span class="annotation-label"></span>
				</div>
				<div class="annotation-description">
					<span class="annotation-description-close">
						<img src="${iconClose}" width="16px">
					</span>
					<span class="annotation-description-content">${this._description}</span>
				</div>
			</div>
		`);

			this.elTitlebar = this.domElement.find('.annotation-titlebar');
			this.elTitle = this.elTitlebar.find('.annotation-label');
			this.elTitle.append(this._title);
			this.elDescription = this.domElement.find('.annotation-description');
			this.elDescriptionClose = this.elDescription.find('.annotation-description-close');
			// this.elDescriptionContent = this.elDescription.find(".annotation-description-content");

			this.clickTitle = () => {
				if(this.hasView()){
					this.moveHere(this.scene.getActiveCamera());
				}
				this.dispatchEvent({type: 'click', target: this});
			};

			this.elTitle.click(this.clickTitle);

			this.actions = this.actions.map(a => {
				if (a instanceof Action) {
					return a;
				} else {
					return new Action(a);
				}
			});

			for (let action of this.actions) {
				action.pairWith(this);
			}

			let actions = this.actions.filter(
				a => a.showIn === undefined || a.showIn.includes('scene'));

			for (let action of actions) {
				let elButton = $(`<img src="${action.icon}" class="annotation-action-icon">`);
				this.elTitlebar.append(elButton);
				elButton.click(() => action.onclick({annotation: this}));
			}

			this.elDescriptionClose.hover(
				e => this.elDescriptionClose.css('opacity', '1'),
				e => this.elDescriptionClose.css('opacity', '0.5')
			);
			this.elDescriptionClose.click(e => this.setHighlighted(false));
			// this.elDescriptionContent.html(this._description);

			this.domElement.mouseenter(e => this.setHighlighted(true));
			this.domElement.mouseleave(e => this.setHighlighted(false));

			this.domElement.on('touchstart', e => {
				this.setHighlighted(!this.isHighlighted);
			});

			this.display = false;
			//this.display = true;

		}

		installHandles(viewer){
			if(this.handles !== undefined){
				return;
			}

			let domElement = $(`
			<div style="position: absolute; left: 300; top: 200; pointer-events: none">
				<svg width="300" height="600">
					<line x1="0" y1="0" x2="1200" y2="200" style="stroke: black; stroke-width:2" />
					<circle cx="50" cy="50" r="4" stroke="black" stroke-width="2" fill="gray" />
					<circle cx="150" cy="50" r="4" stroke="black" stroke-width="2" fill="gray" />
				</svg>
			</div>
		`);
			
			let svg = domElement.find("svg")[0];
			let elLine = domElement.find("line")[0];
			let elStart = domElement.find("circle")[0];
			let elEnd = domElement.find("circle")[1];

			let setCoordinates = (start, end) => {
				elStart.setAttribute("cx", `${start.x}`);
				elStart.setAttribute("cy", `${start.y}`);

				elEnd.setAttribute("cx", `${end.x}`);
				elEnd.setAttribute("cy", `${end.y}`);

				elLine.setAttribute("x1", start.x);
				elLine.setAttribute("y1", start.y);
				elLine.setAttribute("x2", end.x);
				elLine.setAttribute("y2", end.y);

				let box = svg.getBBox();
				svg.setAttribute("width", `${box.width}`);
				svg.setAttribute("height", `${box.height}`);
				svg.setAttribute("viewBox", `${box.x} ${box.y} ${box.width} ${box.height}`);

				let ya = start.y - end.y;
				let xa = start.x - end.x;

				if(ya > 0){
					start.y = start.y - ya;
				}
				if(xa > 0){
					start.x = start.x - xa;
				}

				domElement.css("left", `${start.x}px`);
				domElement.css("top", `${start.y}px`);

			};

			$(viewer.renderArea).append(domElement);


			let annotationStartPos = this.position.clone();
			let annotationStartOffset = this.offset.clone();

			$(this.domElement).draggable({
				start: (event, ui) => {
					annotationStartPos = this.position.clone();
					annotationStartOffset = this.offset.clone();
					$(this.domElement).find(".annotation-titlebar").css("pointer-events", "none");

					console.log($(this.domElement).find(".annotation-titlebar"));
				},
				stop: () => {
					$(this.domElement).find(".annotation-titlebar").css("pointer-events", "");
				},
				drag: (event, ui ) => {
					let renderAreaWidth = viewer.renderer.getSize(new THREE.Vector2()).width;
					//let renderAreaHeight = viewer.renderer.getSize().height;

					let diff = {
						x: ui.originalPosition.left - ui.position.left, 
						y: ui.originalPosition.top - ui.position.top
					};

					let nDiff = {
						x: -(diff.x / renderAreaWidth) * 2,
						y: (diff.y / renderAreaWidth) * 2
					};

					let camera = viewer.scene.getActiveCamera();
					let oldScreenPos = new THREE.Vector3()
						.addVectors(annotationStartPos, annotationStartOffset)
						.project(camera);

					let newScreenPos = oldScreenPos.clone();
					newScreenPos.x += nDiff.x;
					newScreenPos.y += nDiff.y;

					let newPos = newScreenPos.clone();
					newPos.unproject(camera);

					let newOffset = new THREE.Vector3().subVectors(newPos, this.position);
					this.offset.copy(newOffset);
				}
			});

			let updateCallback = () => {
				let position = this.position;
				let scene = viewer.scene;

				const renderAreaSize = viewer.renderer.getSize(new THREE.Vector2());
				let renderAreaWidth = renderAreaSize.width;
				let renderAreaHeight = renderAreaSize.height;

				let start = this.position.clone();
				let end = new THREE.Vector3().addVectors(this.position, this.offset);

				let toScreen = (position) => {
					let camera = scene.getActiveCamera();
					let screenPos = new THREE.Vector3();

					let worldView = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
					let ndc = new THREE.Vector4(position.x, position.y, position.z, 1.0).applyMatrix4(worldView);
					// limit w to small positive value, in case position is behind the camera
					ndc.w = Math.max(ndc.w, 0.1);
					ndc.divideScalar(ndc.w);

					screenPos.copy(ndc);
					screenPos.x = renderAreaWidth * (screenPos.x + 1) / 2;
					screenPos.y = renderAreaHeight * (1 - (screenPos.y + 1) / 2);

					return screenPos;
				};
				
				start = toScreen(start);
				end = toScreen(end);

				setCoordinates(start, end);

			};

			viewer.addEventListener("update", updateCallback);

			this.handles = {
				domElement: domElement,
				setCoordinates: setCoordinates,
				updateCallback: updateCallback
			};
		}

		removeHandles(viewer){
			if(this.handles === undefined){
				return;
			}

			//$(viewer.renderArea).remove(this.handles.domElement);
			this.handles.domElement.remove();
			viewer.removeEventListener("update", this.handles.updateCallback);

			delete this.handles;
		}

		get visible () {
			return this._visible;
		}

		set visible (value) {
			if (this._visible === value) {
				return;
			}

			this._visible = value;

			//this.traverse(node => {
			//	node.display = value;
			//});

			this.dispatchEvent({
				type: 'visibility_changed',
				annotation: this
			});
		}

		get display () {
			return this._display;
		}

		set display (display) {
			if (this._display === display) {
				return;
			}

			this._display = display;

			if (display) {
				// this.domElement.fadeIn(200);
				this.domElement.show();
			} else {
				// this.domElement.fadeOut(200);
				this.domElement.hide();
			}
		}

		get expand () {
			return this._expand;
		}

		set expand (expand) {
			if (this._expand === expand) {
				return;
			}

			if (expand) {
				this.display = false;
			} else {
				this.display = true;
				this.traverseDescendants(node => {
					node.display = false;
				});
			}

			this._expand = expand;
		}

		get title () {
			return this._title;
		}

		set title (title) {
			if (this._title === title) {
				return;
			}

			this._title = title;
			this.elTitle.empty();
			this.elTitle.append(this._title);

			this.dispatchEvent({
				type: "annotation_changed",
				annotation: this,
			});
		}

		get description () {
			return this._description;
		}

		set description (description) {
			if (this._description === description) {
				return;
			}

			this._description = description;

			const elDescriptionContent = this.elDescription.find(".annotation-description-content");
			elDescriptionContent.empty();
			elDescriptionContent.append(this._description);

			this.dispatchEvent({
				type: "annotation_changed",
				annotation: this,
			});
		}

		add (annotation) {
			if (!this.children.includes(annotation)) {
				this.children.push(annotation);
				annotation.parent = this;

				let descendants = [];
				annotation.traverse(a => { descendants.push(a); });

				for (let descendant of descendants) {
					let c = this;
					while (c !== null) {
						c.dispatchEvent({
							'type': 'annotation_added',
							'annotation': descendant
						});
						c = c.parent;
					}
				}
			}
		}

		level () {
			if (this.parent === null) {
				return 0;
			} else {
				return this.parent.level() + 1;
			}
		}

		hasChild(annotation) {
			return this.children.includes(annotation);
		}

		remove (annotation) {
			if (this.hasChild(annotation)) {
				annotation.removeAllChildren();
				annotation.dispose();
				this.children = this.children.filter(e => e !== annotation);
				annotation.parent = null;
			}
		}

		removeAllChildren() {
			this.children.forEach((child) => {
				if (child.children.length > 0) {
					child.removeAllChildren();
				}

				this.remove(child);
			});
		}

		updateBounds () {
			let box = new THREE.Box3();

			if (this.position) {
				box.expandByPoint(this.position);
			}

			for (let child of this.children) {
				child.updateBounds();

				box.union(child.boundingBox);
			}

			this.boundingBox.copy(box);
		}

		traverse (handler) {
			let expand = handler(this);

			if (expand === undefined || expand === true) {
				for (let child of this.children) {
					child.traverse(handler);
				}
			}
		}

		traverseDescendants (handler) {
			for (let child of this.children) {
				child.traverse(handler);
			}
		}

		flatten () {
			let annotations = [];

			this.traverse(annotation => {
				annotations.push(annotation);
			});

			return annotations;
		}

		descendants () {
			let annotations = [];

			this.traverse(annotation => {
				if (annotation !== this) {
					annotations.push(annotation);
				}
			});

			return annotations;
		}

		setHighlighted (highlighted) {
			if (highlighted) {
				this.domElement.css('opacity', '0.8');
				this.elTitlebar.css('box-shadow', '0 0 5px #fff');
				this.domElement.css('z-index', '1000');

				if (this._description) {
					this.descriptionVisible = true;
					this.elDescription.fadeIn(200);
					this.elDescription.css('position', 'relative');
				}
			} else {
				this.domElement.css('opacity', '0.5');
				this.elTitlebar.css('box-shadow', '');
				this.domElement.css('z-index', '100');
				this.descriptionVisible = false;
				this.elDescription.css('display', 'none');
			}

			this.isHighlighted = highlighted;
		}

		hasView () {
			let hasPosTargetView = this.cameraTarget instanceof THREE.Vector3;
			hasPosTargetView = hasPosTargetView && this.cameraPosition instanceof THREE.Vector3;

			let hasRadiusView = this.radius !== undefined;

			let hasView = hasPosTargetView || hasRadiusView;

			return hasView;
		};

		moveHere (camera) {
			if (!this.hasView()) {
				return;
			}

			let view = this.scene.view;
			let animationDuration = 500;
			let easing = TWEEN.Easing.Quartic.Out;

			let endTarget;
			if (this.cameraTarget) {
				endTarget = this.cameraTarget;
			} else if (this.position) {
				endTarget = this.position;
			} else {
				endTarget = this.boundingBox.getCenter(new THREE.Vector3());
			}

			if (this.cameraPosition) {
				let endPosition = this.cameraPosition;

				Utils.moveTo(this.scene, endPosition, endTarget);
			} else if (this.radius) {
				let direction = view.direction;
				let endPosition = endTarget.clone().add(direction.multiplyScalar(-this.radius));
				let startRadius = view.radius;
				let endRadius = this.radius;

				{ // animate camera position
					let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
					tween.easing(easing);
					tween.start();
				}

				{ // animate radius
					let t = {x: 0};

					let tween = new TWEEN.Tween(t)
						.to({x: 1}, animationDuration)
						.onUpdate(function () {
							view.radius = this.x * endRadius + (1 - this.x) * startRadius;
						});
					tween.easing(easing);
					tween.start();
				}
			}
		};

		dispose () {
			if (this.domElement.parentElement) {
				this.domElement.parentElement.removeChild(this.domElement);
			}
		};

		toString () {
			return 'Annotation: ' + this._title;
		}
	};

	class EnumItem{
		constructor(object){
			for(let key of Object.keys(object)){
				this[key] = object[key];
			}
		}

		inspect(){
			return `Enum(${this.name}: ${this.value})`;
		}
	};

	class Enum{

		constructor(object){
			this.object = object;

			for(let key of Object.keys(object)){
				let value = object[key];

				if(typeof value === "object"){
					value.name = key;
				}else {
					value = {name: key, value: value};
				}
				
				this[key] = new EnumItem(value);
			}
		}

		fromValue(value){
			for(let key of Object.keys(this.object)){
				if(this[key].value === value){
					return this[key];
				}
			}

			throw new Error(`No enum for value: ${value}`);
		}
		
	};

	const CameraMode = {
		ORTHOGRAPHIC: 0,
		PERSPECTIVE: 1,
		VR: 2,
	};

	const ClipTask = {
		NONE: 0,
		HIGHLIGHT: 1,
		SHOW_INSIDE: 2,
		SHOW_OUTSIDE: 3
	};

	const ClipMethod = {
		INSIDE_ANY: 0,
		INSIDE_ALL: 1
	};

	const ElevationGradientRepeat = {
		CLAMP: 0,
		REPEAT: 1,
		MIRRORED_REPEAT: 2,
	};

	const MOUSE = {
		LEFT: 0b0001,
		RIGHT: 0b0010,
		MIDDLE: 0b0100
	};

	const PointSizeType = {
		FIXED: 0,
		ATTENUATED: 1,
		ADAPTIVE: 2
	};

	const PointShape = {
		SQUARE: 0,
		CIRCLE: 1,
		PARABOLOID: 2
	};

	const TreeType = {
		OCTREE:	0,
		KDTREE:	1
	};

	const LengthUnits = {
		METER: {code: 'm', unitspermeter: 1.0},
		FEET: {code: 'ft', unitspermeter: 3.28084},
		INCH: {code: '\u2033', unitspermeter: 39.3701}
	};

	let ftCanvas = document.createElement('canvas');

	const Features = (function () {

		let gl = ftCanvas.getContext('webgl') || ftCanvas.getContext('experimental-webgl');
		if (gl === null){ 
			return null; 
		}

		// -- code taken from THREE.WebGLRenderer --
		let _vertexShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
		let _vertexShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT);
		// Unused: let _vertexShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.LOW_FLOAT);

		let _fragmentShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
		let _fragmentShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
		// Unused: let _fragmentShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT);

		let highpAvailable = _vertexShaderPrecisionHighpFloat.precision > 0 && _fragmentShaderPrecisionHighpFloat.precision > 0;
		let mediumpAvailable = _vertexShaderPrecisionMediumpFloat.precision > 0 && _fragmentShaderPrecisionMediumpFloat.precision > 0;
		// -----------------------------------------

		let precision;
		if (highpAvailable) {
			precision = 'highp';
		} else if (mediumpAvailable) {
			precision = 'mediump';
		} else {
			precision = 'lowp';
		}

		return {
			SHADER_INTERPOLATION: {
				isSupported: function () {
					let supported = true;

					supported = supported && gl.getExtension('EXT_frag_depth');
					supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

					return supported;
				}
			},
			SHADER_SPLATS: {
				isSupported: function () {
					let supported = true;

					supported = supported && gl.getExtension('EXT_frag_depth');
					supported = supported && gl.getExtension('OES_texture_float');
					supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

					return supported;
				}

			},
			SHADER_EDL: {
				isSupported: function () {
					let supported = true;

					//supported = supported && gl.getExtension('EXT_frag_depth');
					supported = supported && gl.getExtension('OES_texture_float');
					supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

					//supported = supported || (gl instanceof WebGL2RenderingContext);

					return supported;
				}

			},
			//WEBGL2: {
			//	isSupported: function(){
			//		return gl instanceof WebGL2RenderingContext;
			//	}
			//},
			precision: precision
		};
	}());

	const KeyCodes = {

		LEFT: 37,
		UP: 38,
		RIGHT: 39,
		BOTTOM: 40,
		DELETE: 46,

		A: 'A'.charCodeAt(0),
		S: 'S'.charCodeAt(0),
		D: 'D'.charCodeAt(0),
		W: 'W'.charCodeAt(0),
		Q: 'Q'.charCodeAt(0),
		E: 'E'.charCodeAt(0),
		R: 'R'.charCodeAt(0),
		F: 'F'.charCodeAt(0)
		
	};

	class LRUItem{

		constructor(node){
			this.previous = null;
			this.next = null;
			this.node = node;
		}

	}

	/**
	 *
	 * @class A doubly-linked-list of the least recently used elements.
	 */
	class LRU{

		constructor(){
			// the least recently used item
			this.first = null;
			// the most recently used item
			this.last = null;
			// a list of all items in the lru list
			this.items = {};
			this.elements = 0;
			this.numPoints = 0;
		}

		size(){
			return this.elements;
		}

		contains(node){
			return this.items[node.id] == null;
		}

		touch(node){
			if (!node.loaded) {
				return;
			}

			let item;
			if (this.items[node.id] == null) {
				// add to list
				item = new LRUItem(node);
				item.previous = this.last;
				this.last = item;
				if (item.previous !== null) {
					item.previous.next = item;
				}

				this.items[node.id] = item;
				this.elements++;

				if (this.first === null) {
					this.first = item;
				}
				this.numPoints += node.numPoints;
			} else {
				// update in list
				item = this.items[node.id];
				if (item.previous === null) {
					// handle touch on first element
					if (item.next !== null) {
						this.first = item.next;
						this.first.previous = null;
						item.previous = this.last;
						item.next = null;
						this.last = item;
						item.previous.next = item;
					}
				} else if (item.next === null) {
					// handle touch on last element
				} else {
					// handle touch on any other element
					item.previous.next = item.next;
					item.next.previous = item.previous;
					item.previous = this.last;
					item.next = null;
					this.last = item;
					item.previous.next = item;
				}
			}
		}

		remove(node){
			let lruItem = this.items[node.id];
			if (lruItem) {
				if (this.elements === 1) {
					this.first = null;
					this.last = null;
				} else {
					if (!lruItem.previous) {
						this.first = lruItem.next;
						this.first.previous = null;
					}
					if (!lruItem.next) {
						this.last = lruItem.previous;
						this.last.next = null;
					}
					if (lruItem.previous && lruItem.next) {
						lruItem.previous.next = lruItem.next;
						lruItem.next.previous = lruItem.previous;
					}
				}

				delete this.items[node.id];
				this.elements--;
				this.numPoints -= node.numPoints;
			}
		}

		getLRUItem(){
			if (this.first === null) {
				return null;
			}
			let lru = this.first;

			return lru.node;
		}

		toString(){
			let string = '{ ';
			let curr = this.first;
			while (curr !== null) {
				string += curr.node.id;
				if (curr.next !== null) {
					string += ', ';
				}
				curr = curr.next;
			}
			string += '}';
			string += '(' + this.size() + ')';
			return string;
		}

		freeMemory(){
			if (this.elements <= 1) {
				return;
			}

			while (this.numPoints > Potree.pointLoadLimit) {
				let element = this.first;
				let node = element.node;
				this.disposeDescendants(node);
			}
		}

		disposeDescendants(node){
			let stack = [];
			stack.push(node);
			while (stack.length > 0) {
				let current = stack.pop();

				// console.log(current);

				current.dispose();
				this.remove(current);

				for (let key in current.children) {
					if (current.children.hasOwnProperty(key)) {
						let child = current.children[key];
						if (child.loaded) {
							stack.push(current.children[key]);
						}
					}
				}
			}
		}

	}

	class PointCloudTreeNode extends EventDispatcher{

		constructor(){
			super();
			this.needsTransformUpdate = true;
		}

		getChildren () {
			throw new Error('override function');
		}

		getBoundingBox () {
			throw new Error('override function');
		}

		isLoaded () {
			throw new Error('override function');
		}

		isGeometryNode () {
			throw new Error('override function');
		}

		isTreeNode () {
			throw new Error('override function');
		}

		getLevel () {
			throw new Error('override function');
		}

		getBoundingSphere () {
			throw new Error('override function');
		}
	};

	class PointCloudTree extends THREE.Object3D {
		constructor () {
			super();
		}

		initialized () {
			return this.root !== null;
		}
	};

	/**
	 * Some types of possible point attribute data formats
	 *
	 * @class
	 */
	const PointAttributeTypes = {
		DATA_TYPE_DOUBLE: {ordinal: 0, name: "double", size: 8},
		DATA_TYPE_FLOAT:  {ordinal: 1, name: "float",  size: 4},
		DATA_TYPE_INT8:   {ordinal: 2, name: "int8",   size: 1},
		DATA_TYPE_UINT8:  {ordinal: 3, name: "uint8",  size: 1},
		DATA_TYPE_INT16:  {ordinal: 4, name: "int16",  size: 2},
		DATA_TYPE_UINT16: {ordinal: 5, name: "uint16", size: 2},
		DATA_TYPE_INT32:  {ordinal: 6, name: "int32",  size: 4},
		DATA_TYPE_UINT32: {ordinal: 7, name: "uint32", size: 4},
		DATA_TYPE_INT64:  {ordinal: 8, name: "int64",  size: 8},
		DATA_TYPE_UINT64: {ordinal: 9, name: "uint64", size: 8}
	};

	let i = 0;
	for (let obj in PointAttributeTypes) {
		PointAttributeTypes[i] = PointAttributeTypes[obj];
		i++;
	}


	class PointAttribute{
		
		constructor(name, type, numElements){
			this.name = name;
			this.type = type;
			this.numElements = numElements;
			this.byteSize = this.numElements * this.type.size;
			this.description = "";
			this.range = [Infinity, -Infinity];
		}

	};

	PointAttribute.POSITION_CARTESIAN = new PointAttribute(
		"POSITION_CARTESIAN", PointAttributeTypes.DATA_TYPE_FLOAT, 3);

	PointAttribute.RGBA_PACKED = new PointAttribute(
		"COLOR_PACKED", PointAttributeTypes.DATA_TYPE_INT8, 4);

	PointAttribute.COLOR_PACKED = PointAttribute.RGBA_PACKED;

	PointAttribute.RGB_PACKED = new PointAttribute(
		"COLOR_PACKED", PointAttributeTypes.DATA_TYPE_INT8, 3);

	PointAttribute.NORMAL_FLOATS = new PointAttribute(
		"NORMAL_FLOATS", PointAttributeTypes.DATA_TYPE_FLOAT, 3);

	PointAttribute.INTENSITY = new PointAttribute(
		"INTENSITY", PointAttributeTypes.DATA_TYPE_UINT16, 1);

	PointAttribute.CLASSIFICATION = new PointAttribute(
		"CLASSIFICATION", PointAttributeTypes.DATA_TYPE_UINT8, 1);

	PointAttribute.NORMAL_SPHEREMAPPED = new PointAttribute(
		"NORMAL_SPHEREMAPPED", PointAttributeTypes.DATA_TYPE_UINT8, 2);

	PointAttribute.NORMAL_OCT16 = new PointAttribute(
		"NORMAL_OCT16", PointAttributeTypes.DATA_TYPE_UINT8, 2);

	PointAttribute.NORMAL = new PointAttribute(
		"NORMAL", PointAttributeTypes.DATA_TYPE_FLOAT, 3);
		
	PointAttribute.RETURN_NUMBER = new PointAttribute(
		"RETURN_NUMBER", PointAttributeTypes.DATA_TYPE_UINT8, 1);
		
	PointAttribute.NUMBER_OF_RETURNS = new PointAttribute(
		"NUMBER_OF_RETURNS", PointAttributeTypes.DATA_TYPE_UINT8, 1);
		
	PointAttribute.SOURCE_ID = new PointAttribute(
		"SOURCE_ID", PointAttributeTypes.DATA_TYPE_UINT16, 1);

	PointAttribute.INDICES = new PointAttribute(
		"INDICES", PointAttributeTypes.DATA_TYPE_UINT32, 1);

	PointAttribute.SPACING = new PointAttribute(
		"SPACING", PointAttributeTypes.DATA_TYPE_FLOAT, 1);

	PointAttribute.GPS_TIME = new PointAttribute(
		"GPS_TIME", PointAttributeTypes.DATA_TYPE_DOUBLE, 1);

	class PointAttributes{

		constructor(pointAttributes){
			this.attributes = [];
			this.byteSize = 0;
			this.size = 0;
			this.vectors = [];

			if (pointAttributes != null) {
				for (let i = 0; i < pointAttributes.length; i++) {
					let pointAttributeName = pointAttributes[i];
					let pointAttribute = PointAttribute[pointAttributeName];
					this.attributes.push(pointAttribute);
					this.byteSize += pointAttribute.byteSize;
					this.size++;
				}
			}
		}


		add(pointAttribute){
			this.attributes.push(pointAttribute);
			this.byteSize += pointAttribute.byteSize;
			this.size++;
		};

		addVector(vector){
			this.vectors.push(vector);
		}

		hasColors(){
			for (let name in this.attributes) {
				let pointAttribute = this.attributes[name];
				if (pointAttribute.name === PointAttributeNames.COLOR_PACKED) {
					return true;
				}
			}

			return false;
		};

		hasNormals(){
			for (let name in this.attributes) {
				let pointAttribute = this.attributes[name];
				if (
					pointAttribute === PointAttribute.NORMAL_SPHEREMAPPED ||
					pointAttribute === PointAttribute.NORMAL_FLOATS ||
					pointAttribute === PointAttribute.NORMAL ||
					pointAttribute === PointAttribute.NORMAL_OCT16) {
					return true;
				}
			}

			return false;
		};

	}

	class U {
		static toVector3(v, offset) {
			return new THREE.Vector3().fromArray(v, offset || 0);
		}

		static toBox3(b) {
			return new THREE.Box3(U.toVector3(b), U.toVector3(b, 3));
		};

		static findDim(schema, name) {
			var dim = schema.find((dim) => dim.name == name);
			if (!dim) throw new Error('Failed to find ' + name + ' in schema');
			return dim;
		}

		static sphereFrom(b) {
			return b.getBoundingSphere(new THREE.Sphere());
		}
	};

	class PointCloudEptGeometry {
		constructor(url, info) {
			let version = info.version;
			let schema = info.schema;
			let bounds = info.bounds;
			let boundsConforming = info.boundsConforming;

			let xyz = [
				U.findDim(schema, 'X'),
				U.findDim(schema, 'Y'),
				U.findDim(schema, 'Z')
			];
			let scale = xyz.map((d) => d.scale || 1);
			let offset = xyz.map((d) => d.offset || 0);
			this.eptScale = U.toVector3(scale);
			this.eptOffset = U.toVector3(offset);

			this.url = url;
			this.info = info;
			this.type = 'ept';

			this.schema = schema;
			this.span = info.span || info.ticks;
			this.boundingBox = U.toBox3(bounds);
			this.tightBoundingBox = U.toBox3(boundsConforming);
			this.offset = U.toVector3([0, 0, 0]);
			this.boundingSphere = U.sphereFrom(this.boundingBox);
			this.tightBoundingSphere = U.sphereFrom(this.tightBoundingBox);
			this.version = new Potree.Version('1.7');

			this.projection = null;
			this.fallbackProjection = null;

			if (info.srs && info.srs.horizontal) {
				this.projection = info.srs.authority + ':' + info.srs.horizontal;
			}

			if (info.srs.wkt) {
				if (!this.projection) this.projection = info.srs.wkt;
				else this.fallbackProjection = info.srs.wkt;
			}

			{ 
				// TODO [mschuetz]: named projections that proj4 can't handle seem to cause problems.
				// remove them for now

				try{
					proj4(this.projection);
				}catch(e){
					this.projection = null;
				}

			

			}

			
			{
				const attributes = new PointAttributes();

				attributes.add(PointAttribute.POSITION_CARTESIAN);
				attributes.add(new PointAttribute("rgba", PointAttributeTypes.DATA_TYPE_UINT8, 4));
				attributes.add(new PointAttribute("intensity", PointAttributeTypes.DATA_TYPE_UINT16, 1));
				attributes.add(new PointAttribute("classification", PointAttributeTypes.DATA_TYPE_UINT8, 1));
				attributes.add(new PointAttribute("gps-time", PointAttributeTypes.DATA_TYPE_DOUBLE, 1));
				attributes.add(new PointAttribute("returnNumber", PointAttributeTypes.DATA_TYPE_UINT8, 1));
				attributes.add(new PointAttribute("number of returns", PointAttributeTypes.DATA_TYPE_UINT8, 1));
				attributes.add(new PointAttribute("return number", PointAttributeTypes.DATA_TYPE_UINT8, 1));
				attributes.add(new PointAttribute("source id", PointAttributeTypes.DATA_TYPE_UINT16, 1));

				this.pointAttributes = attributes;
			}



			this.spacing =
				(this.boundingBox.max.x - this.boundingBox.min.x) / this.span;

			let hierarchyType = info.hierarchyType || 'json';

			const dataType = info.dataType;
			if (dataType == 'laszip') {
				this.loader = new Potree.EptLaszipLoader();
			}
			else if (dataType == 'binary') {
				this.loader = new Potree.EptBinaryLoader();
			}
			else if (dataType == 'zstandard') {
				this.loader = new Potree.EptZstandardLoader();
			}
			else {
				throw new Error('Could not read data type: ' + dataType);
			}
		}
	};

	class EptKey {
		constructor(ept, b, d, x, y, z) {
			this.ept = ept;
			this.b = b;
			this.d = d;
			this.x = x || 0;
			this.y = y || 0;
			this.z = z || 0;
		}

		name() {
			return this.d + '-' + this.x + '-' + this.y + '-' + this.z;
		}

		step(a, b, c) {
			let min = this.b.min.clone();
			let max = this.b.max.clone();
			let dst = new THREE.Vector3().subVectors(max, min);

			if (a)	min.x += dst.x / 2;
			else	max.x -= dst.x / 2;

			if (b)	min.y += dst.y / 2;
			else	max.y -= dst.y / 2;

			if (c)	min.z += dst.z / 2;
			else	max.z -= dst.z / 2;

			return new Potree.EptKey(
					this.ept,
					new THREE.Box3(min, max),
					this.d + 1,
					this.x * 2 + a,
					this.y * 2 + b,
					this.z * 2 + c);
		}

		children() {
			var result = [];
			for (var a = 0; a < 2; ++a) {
				for (var b = 0; b < 2; ++b) {
					for (var c = 0; c < 2; ++c) {
						var add = this.step(a, b, c).name();
						if (!result.includes(add)) result = result.concat(add);
					}
				}
			}
			return result;
		}
	}

	class PointCloudEptGeometryNode extends PointCloudTreeNode {
		constructor(ept, b, d, x, y, z) {
			super();

			this.ept = ept;
			this.key = new Potree.EptKey(
					this.ept,
					b || this.ept.boundingBox,
					d || 0,
					x,
					y,
					z);

			this.id = PointCloudEptGeometryNode.IDCount++;
			this.geometry = null;
			this.boundingBox = this.key.b;
			this.tightBoundingBox = this.boundingBox;
			this.spacing = this.ept.spacing / Math.pow(2, this.key.d);
			this.boundingSphere = U.sphereFrom(this.boundingBox);

			// These are set during hierarchy loading.
			this.hasChildren = false;
			this.children = { };
			this.numPoints = -1;

			this.level = this.key.d;
			this.loaded = false;
			this.loading = false;
			this.oneTimeDisposeHandlers = [];

			let k = this.key;
			this.name = this.toPotreeName(k.d, k.x, k.y, k.z);
			this.index = parseInt(this.name.charAt(this.name.length - 1));
		}

		isGeometryNode() { return true; }
		getLevel() { return this.level; }
		isTreeNode() { return false; }
		isLoaded() { return this.loaded; }
		getBoundingSphere() { return this.boundingSphere; }
		getBoundingBox() { return this.boundingBox; }
		url() { return this.ept.url + 'ept-data/' + this.filename(); }
		getNumPoints() { return this.numPoints; }

		filename() { return this.key.name(); }

		getChildren() {
			let children = [];

			for (let i = 0; i < 8; i++) {
				if (this.children[i]) {
					children.push(this.children[i]);
				}
			}

			return children;
		}

		addChild(child) {
			this.children[child.index] = child;
			child.parent = this;
		}

		load() {
			if (this.loaded || this.loading) return;
			if (Potree.numNodesLoading >= Potree.maxNodesLoading) return;

			this.loading = true;
			++Potree.numNodesLoading;

			if (this.numPoints == -1) this.loadHierarchy();
			this.loadPoints();
		}

		loadPoints(){
			this.ept.loader.load(this);
		}

		async loadHierarchy() {
			let nodes = { };
			nodes[this.filename()] = this;
			this.hasChildren = false;

			let eptHierarchyFile =
				`${this.ept.url}ept-hierarchy/${this.filename()}.json`;

			let response = await fetch(eptHierarchyFile);
			let hier = await response.json();

			// Since we want to traverse top-down, and 10 comes
			// lexicographically before 9 (for example), do a deep sort.
			var keys = Object.keys(hier).sort((a, b) => {
				let [da, xa, ya, za] = a.split('-').map((n) => parseInt(n, 10));
				let [db, xb, yb, zb] = b.split('-').map((n) => parseInt(n, 10));
				if (da < db) return -1; if (da > db) return 1;
				if (xa < xb) return -1; if (xa > xb) return 1;
				if (ya < yb) return -1; if (ya > yb) return 1;
				if (za < zb) return -1; if (za > zb) return 1;
				return 0;
			});

			keys.forEach((v) => {
				let [d, x, y, z] = v.split('-').map((n) => parseInt(n, 10));
				let a = x & 1, b = y & 1, c = z & 1;
				let parentName =
					(d - 1) + '-' + (x >> 1) + '-' + (y >> 1) + '-' + (z >> 1);

				let parentNode = nodes[parentName];
				if (!parentNode) return;
				parentNode.hasChildren = true;

				let key = parentNode.key.step(a, b, c);

				let node = new Potree.PointCloudEptGeometryNode(
						this.ept,
						key.b,
						key.d,
						key.x,
						key.y,
						key.z);

				node.level = d;
				node.numPoints = hier[v];

				parentNode.addChild(node);
				nodes[key.name()] = node;
			});
		}

		doneLoading(bufferGeometry, tightBoundingBox, np, mean) {
			bufferGeometry.boundingBox = this.boundingBox;
			this.geometry = bufferGeometry;
			this.tightBoundingBox = tightBoundingBox;
			this.numPoints = np;
			this.mean = mean;
			this.loaded = true;
			this.loading = false;
			--Potree.numNodesLoading;
		}

		toPotreeName(d, x, y, z) {
			var name = 'r';

			for (var i = 0; i < d; ++i) {
				var shift = d - i - 1;
				var mask = 1 << shift;
				var step = 0;

				if (x & mask) step += 4;
				if (y & mask) step += 2;
				if (z & mask) step += 1;

				name += step;
			}

			return name;
		}

		dispose() {
			if (this.geometry && this.parent != null) {
				this.geometry.dispose();
				this.geometry = null;
				this.loaded = false;

				// this.dispatchEvent( { type: 'dispose' } );
				for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
					let handler = this.oneTimeDisposeHandlers[i];
					handler();
				}
				this.oneTimeDisposeHandlers = [];
			}
		}
	}

	PointCloudEptGeometryNode.IDCount = 0;

	class PointCloudOctreeGeometry{

		constructor(){
			this.url = null;
			this.octreeDir = null;
			this.spacing = 0;
			this.boundingBox = null;
			this.root = null;
			this.nodes = null;
			this.pointAttributes = null;
			this.hierarchyStepSize = -1;
			this.loader = null;
		}
		
	}

	class PointCloudOctreeGeometryNode extends PointCloudTreeNode{

		constructor(name, pcoGeometry, boundingBox){
			super();

			this.id = PointCloudOctreeGeometryNode.IDCount++;
			this.name = name;
			this.index = parseInt(name.charAt(name.length - 1));
			this.pcoGeometry = pcoGeometry;
			this.geometry = null;
			this.boundingBox = boundingBox;
			this.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
			this.children = {};
			this.numPoints = 0;
			this.level = null;
			this.loaded = false;
			this.oneTimeDisposeHandlers = [];
		}

		isGeometryNode(){
			return true;
		}

		getLevel(){
			return this.level;
		}

		isTreeNode(){
			return false;
		}

		isLoaded(){
			return this.loaded;
		}

		getBoundingSphere(){
			return this.boundingSphere;
		}

		getBoundingBox(){
			return this.boundingBox;
		}

		getChildren(){
			let children = [];

			for (let i = 0; i < 8; i++) {
				if (this.children[i]) {
					children.push(this.children[i]);
				}
			}

			return children;
		}

		getBoundingBox(){
			return this.boundingBox;
		}

		getURL(){
			let url = '';

			let version = this.pcoGeometry.loader.version;

			if (version.equalOrHigher('1.5')) {
				url = this.pcoGeometry.octreeDir + '/' + this.getHierarchyPath() + '/' + this.name;
			} else if (version.equalOrHigher('1.4')) {
				url = this.pcoGeometry.octreeDir + '/' + this.name;
			} else if (version.upTo('1.3')) {
				url = this.pcoGeometry.octreeDir + '/' + this.name;
			}

			return url;
		}

		getHierarchyPath(){
			let path = 'r/';

			let hierarchyStepSize = this.pcoGeometry.hierarchyStepSize;
			let indices = this.name.substr(1);

			let numParts = Math.floor(indices.length / hierarchyStepSize);
			for (let i = 0; i < numParts; i++) {
				path += indices.substr(i * hierarchyStepSize, hierarchyStepSize) + '/';
			}

			path = path.slice(0, -1);

			return path;
		}

		addChild(child) {
			this.children[child.index] = child;
			child.parent = this;
		}

		load(){
			if (this.loading === true || this.loaded === true || Potree.numNodesLoading >= Potree.maxNodesLoading) {
				return;
			}

			this.loading = true;

			Potree.numNodesLoading++;

			if (this.pcoGeometry.loader.version.equalOrHigher('1.5')) {
				if ((this.level % this.pcoGeometry.hierarchyStepSize) === 0 && this.hasChildren) {
					this.loadHierachyThenPoints();
				} else {
					this.loadPoints();
				}
			} else {
				this.loadPoints();
			}
		}

		loadPoints(){
			this.pcoGeometry.loader.load(this);
		}

		loadHierachyThenPoints(){
			let node = this;

			// load hierarchy
			let callback = function (node, hbuffer) {

				let tStart = performance.now();

				let view = new DataView(hbuffer);

				let stack = [];
				let children = view.getUint8(0);
				let numPoints = view.getUint32(1, true);
				node.numPoints = numPoints;
				stack.push({children: children, numPoints: numPoints, name: node.name});

				let decoded = [];

				let offset = 5;
				while (stack.length > 0) {
					let snode = stack.shift();
					let mask = 1;
					for (let i = 0; i < 8; i++) {
						if ((snode.children & mask) !== 0) {
							let childName = snode.name + i;

							let childChildren = view.getUint8(offset);
							let childNumPoints = view.getUint32(offset + 1, true);

							stack.push({children: childChildren, numPoints: childNumPoints, name: childName});

							decoded.push({children: childChildren, numPoints: childNumPoints, name: childName});

							offset += 5;
						}

						mask = mask * 2;
					}

					if (offset === hbuffer.byteLength) {
						break;
					}
				}

				// console.log(decoded);

				let nodes = {};
				nodes[node.name] = node;
				let pco = node.pcoGeometry;

				for (let i = 0; i < decoded.length; i++) {
					let name = decoded[i].name;
					let decodedNumPoints = decoded[i].numPoints;
					let index = parseInt(name.charAt(name.length - 1));
					let parentName = name.substring(0, name.length - 1);
					let parentNode = nodes[parentName];
					let level = name.length - 1;
					let boundingBox = Utils.createChildAABB(parentNode.boundingBox, index);

					let currentNode = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
					currentNode.level = level;
					currentNode.numPoints = decodedNumPoints;
					currentNode.hasChildren = decoded[i].children > 0;
					currentNode.spacing = pco.spacing / Math.pow(2, level);
					parentNode.addChild(currentNode);
					nodes[name] = currentNode;
				}

				let duration = performance.now() - tStart;
				if(duration > 5){
					let msg = `duration: ${duration}ms, numNodes: ${decoded.length}`;
					console.log(msg);
				}

				node.loadPoints();
			};
			if ((node.level % node.pcoGeometry.hierarchyStepSize) === 0) {
				// let hurl = node.pcoGeometry.octreeDir + "/../hierarchy/" + node.name + ".hrc";
				let hurl = node.pcoGeometry.octreeDir + '/' + node.getHierarchyPath() + '/' + node.name + '.hrc';

				let xhr = XHRFactory.createXMLHttpRequest();
				xhr.open('GET', hurl, true);
				xhr.responseType = 'arraybuffer';
				xhr.overrideMimeType('text/plain; charset=x-user-defined');
				xhr.onreadystatechange = () => {
					if (xhr.readyState === 4) {
						if (xhr.status === 200 || xhr.status === 0) {
							let hbuffer = xhr.response;
							callback(node, hbuffer);
						} else {
							console.log('Failed to load file! HTTP status: ' + xhr.status + ', file: ' + hurl);
							Potree.numNodesLoading--;
						}
					}
				};
				try {
					xhr.send(null);
				} catch (e) {
					console.log('fehler beim laden der punktwolke: ' + e);
				}
			}
		}

		getNumPoints(){
			return this.numPoints;
		}

		dispose(){
			if (this.geometry && this.parent != null) {
				this.geometry.dispose();
				this.geometry = null;
				this.loaded = false;

				this.dispatchEvent( { type: 'dispose' } );
				
				for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
					let handler = this.oneTimeDisposeHandlers[i];
					handler();
				}
				this.oneTimeDisposeHandlers = [];
			}
		}
		
	}

	PointCloudOctreeGeometryNode.IDCount = 0;

	// -------------------------------------------
	// to get a ready to use gradient array from a chroma.js gradient:
	// http://gka.github.io/chroma.js/
	// -------------------------------------------
	//
	// let stops = [];
	// for(let i = 0; i <= 10; i++){
	//	let range = chroma.scale(['yellow', 'navy']).mode('lch').domain([10,0])(i)._rgb
	//		.slice(0, 3)
	//		.map(v => (v / 255).toFixed(4))
	//		.join(", ");
	//
	//	let line = `[${i / 10}, new THREE.Color(${range})],`;
	//
	//	stops.push(line);
	// }
	// stops.join("\n");
	//
	//
	//
	// -------------------------------------------
	// to get a ready to use gradient array from matplotlib:
	// -------------------------------------------
	// import matplotlib.pyplot as plt
	// import matplotlib.colors as colors
	//
	// norm = colors.Normalize(vmin=0,vmax=1)
	// cmap = plt.cm.viridis
	//
	// for i in range(0,11):
	//	u = i / 10
	//	rgb = cmap(norm(u))[0:3]
	//	rgb = ["{0:.3f}".format(v) for v in rgb]
	//	rgb = "[" + str(u) + ", new THREE.Color(" +  ", ".join(rgb) + ")],"
	//	print(rgb)

	let Gradients = {
		// From chroma spectral http://gka.github.io/chroma.js/
		SPECTRAL: [
			[0, new THREE.Color(0.3686, 0.3098, 0.6353)],
			[0.1, new THREE.Color(0.1961, 0.5333, 0.7412)],
			[0.2, new THREE.Color(0.4000, 0.7608, 0.6471)],
			[0.3, new THREE.Color(0.6706, 0.8667, 0.6431)],
			[0.4, new THREE.Color(0.9020, 0.9608, 0.5961)],
			[0.5, new THREE.Color(1.0000, 1.0000, 0.7490)],
			[0.6, new THREE.Color(0.9961, 0.8784, 0.5451)],
			[0.7, new THREE.Color(0.9922, 0.6824, 0.3804)],
			[0.8, new THREE.Color(0.9569, 0.4275, 0.2627)],
			[0.9, new THREE.Color(0.8353, 0.2431, 0.3098)],
			[1, new THREE.Color(0.6196, 0.0039, 0.2588)]
		],
		PLASMA: [
			[0.0, new THREE.Color(0.241, 0.015, 0.610)],
			[0.1, new THREE.Color(0.387, 0.001, 0.654)],
			[0.2, new THREE.Color(0.524, 0.025, 0.653)],
			[0.3, new THREE.Color(0.651, 0.125, 0.596)],
			[0.4, new THREE.Color(0.752, 0.227, 0.513)],
			[0.5, new THREE.Color(0.837, 0.329, 0.431)],
			[0.6, new THREE.Color(0.907, 0.435, 0.353)],
			[0.7, new THREE.Color(0.963, 0.554, 0.272)],
			[0.8, new THREE.Color(0.992, 0.681, 0.195)],
			[0.9, new THREE.Color(0.987, 0.822, 0.144)],
			[1.0, new THREE.Color(0.940, 0.975, 0.131)]
		],
		YELLOW_GREEN: [
			[0, new THREE.Color(0.1647, 0.2824, 0.3451)],
			[0.1, new THREE.Color(0.1338, 0.3555, 0.4227)],
			[0.2, new THREE.Color(0.0610, 0.4319, 0.4864)],
			[0.3, new THREE.Color(0.0000, 0.5099, 0.5319)],
			[0.4, new THREE.Color(0.0000, 0.5881, 0.5569)],
			[0.5, new THREE.Color(0.1370, 0.6650, 0.5614)],
			[0.6, new THREE.Color(0.2906, 0.7395, 0.5477)],
			[0.7, new THREE.Color(0.4453, 0.8099, 0.5201)],
			[0.8, new THREE.Color(0.6102, 0.8748, 0.4850)],
			[0.9, new THREE.Color(0.7883, 0.9323, 0.4514)],
			[1, new THREE.Color(0.9804, 0.9804, 0.4314)]
		],
		VIRIDIS: [
			[0.0, new THREE.Color(0.267, 0.005, 0.329)],
			[0.1, new THREE.Color(0.283, 0.141, 0.458)],
			[0.2, new THREE.Color(0.254, 0.265, 0.530)],
			[0.3, new THREE.Color(0.207, 0.372, 0.553)],
			[0.4, new THREE.Color(0.164, 0.471, 0.558)],
			[0.5, new THREE.Color(0.128, 0.567, 0.551)],
			[0.6, new THREE.Color(0.135, 0.659, 0.518)],
			[0.7, new THREE.Color(0.267, 0.749, 0.441)],
			[0.8, new THREE.Color(0.478, 0.821, 0.318)],
			[0.9, new THREE.Color(0.741, 0.873, 0.150)],
			[1.0, new THREE.Color(0.993, 0.906, 0.144)]
		],
		INFERNO: [
			[0.0, new THREE.Color(0.077, 0.042, 0.206)],
			[0.1, new THREE.Color(0.225, 0.036, 0.388)],
			[0.2, new THREE.Color(0.373, 0.074, 0.432)],
			[0.3, new THREE.Color(0.522, 0.128, 0.420)],
			[0.4, new THREE.Color(0.665, 0.182, 0.370)],
			[0.5, new THREE.Color(0.797, 0.255, 0.287)],
			[0.6, new THREE.Color(0.902, 0.364, 0.184)],
			[0.7, new THREE.Color(0.969, 0.516, 0.063)],
			[0.8, new THREE.Color(0.988, 0.683, 0.072)],
			[0.9, new THREE.Color(0.961, 0.859, 0.298)],
			[1.0, new THREE.Color(0.988, 0.998, 0.645)]
		],
		GRAYSCALE: [
			[0, new THREE.Color(0, 0, 0)],
			[1, new THREE.Color(1, 1, 1)]
		],
		// 16 samples of the TURBU color scheme
		// values taken from: https://gist.github.com/mikhailov-work/ee72ba4191942acecc03fe6da94fc73f
		// original file licensed under Apache-2.0
		TURBO: [
			[0.00, new THREE.Color(0.18995, 0.07176, 0.23217)],
			[0.07, new THREE.Color(0.25107, 0.25237, 0.63374)],
			[0.13, new THREE.Color(0.27628, 0.42118, 0.89123)],
			[0.20, new THREE.Color(0.25862, 0.57958, 0.99876)],
			[0.27, new THREE.Color(0.15844, 0.73551, 0.92305)],
			[0.33, new THREE.Color(0.09267, 0.86554, 0.7623)],
			[0.40, new THREE.Color(0.19659, 0.94901, 0.59466)],
			[0.47, new THREE.Color(0.42778, 0.99419, 0.38575)],
			[0.53, new THREE.Color(0.64362, 0.98999, 0.23356)],
			[0.60, new THREE.Color(0.80473, 0.92452, 0.20459)],
			[0.67, new THREE.Color(0.93301, 0.81236, 0.22667)],
			[0.73, new THREE.Color(0.99314, 0.67408, 0.20348)],
			[0.80, new THREE.Color(0.9836, 0.49291, 0.12849)],
			[0.87, new THREE.Color(0.92105, 0.31489, 0.05475)],
			[0.93, new THREE.Color(0.81608, 0.18462, 0.01809)],
			[1.00, new THREE.Color(0.66449, 0.08436, 0.00424)],
		],
		RAINBOW: [
			[0, new THREE.Color(0.278, 0, 0.714)],
			[1 / 6, new THREE.Color(0, 0, 1)],
			[2 / 6, new THREE.Color(0, 1, 1)],
			[3 / 6, new THREE.Color(0, 1, 0)],
			[4 / 6, new THREE.Color(1, 1, 0)],
			[5 / 6, new THREE.Color(1, 0.64, 0)],
			[1, new THREE.Color(1, 0, 0)]
		],
		CONTOUR: [
			[0.00, new THREE.Color(0, 0, 0)],
			[0.03, new THREE.Color(0, 0, 0)],
			[0.04, new THREE.Color(1, 1, 1)],
			[1.00, new THREE.Color(1, 1, 1)]
		],
	};

	let Shaders = {};

	Shaders["pointcloud.vs"] = `
precision highp float;
precision highp int;

#define max_clip_polygons 8
#define PI 3.141592653589793

attribute vec3 position;
attribute vec3 color;
attribute float intensity;
attribute float classification;
attribute float returnNumber;
attribute float numberOfReturns;
attribute float pointSourceID;
attribute vec4 indices;
attribute float spacing;
attribute float gpsTime;
attribute vec3 normal;
attribute float aExtra;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 uViewInv;

uniform float uScreenWidth;
uniform float uScreenHeight;
uniform float fov;
uniform float near;
uniform float far;

uniform bool uDebug;

uniform bool uUseOrthographicCamera;
uniform float uOrthoWidth;
uniform float uOrthoHeight;

#define CLIPTASK_NONE 0
#define CLIPTASK_HIGHLIGHT 1
#define CLIPTASK_SHOW_INSIDE 2
#define CLIPTASK_SHOW_OUTSIDE 3

#define CLIPMETHOD_INSIDE_ANY 0
#define CLIPMETHOD_INSIDE_ALL 1

uniform int clipTask;
uniform int clipMethod;
#if defined(num_clipboxes) && num_clipboxes > 0
	uniform mat4 clipBoxes[num_clipboxes];
#endif

#if defined(num_clipspheres) && num_clipspheres > 0
	uniform mat4 uClipSpheres[num_clipspheres];
#endif

#if defined(num_clippolygons) && num_clippolygons > 0
	uniform int uClipPolygonVCount[num_clippolygons];
	uniform vec3 uClipPolygonVertices[num_clippolygons * 8];
	uniform mat4 uClipPolygonWVP[num_clippolygons];
#endif


uniform float size;
uniform float minSize;
uniform float maxSize;

uniform float uPCIndex;
uniform float uOctreeSpacing;
uniform float uNodeSpacing;
uniform float uOctreeSize;
uniform vec3 uBBSize;
uniform float uLevel;
uniform float uVNStart;
uniform bool uIsLeafNode;

uniform vec3 uColor;
uniform float uOpacity;

uniform vec2 elevationRange;
uniform vec2 intensityRange;

uniform vec2 uFilterReturnNumberRange;
uniform vec2 uFilterNumberOfReturnsRange;
uniform vec2 uFilterPointSourceIDClipRange;
uniform vec2 uFilterGPSTimeClipRange;
uniform float uGpsScale;
uniform float uGpsOffset;

uniform vec2 uNormalizedGpsBufferRange;

uniform vec3 uIntensity_gbc;
uniform vec3 uRGB_gbc;
uniform vec3 uExtra_gbc;

uniform float uTransition;
uniform float wRGB;
uniform float wIntensity;
uniform float wElevation;
uniform float wClassification;
uniform float wReturnNumber;
uniform float wSourceID;

uniform vec2 uExtraNormalizedRange;
uniform vec2 uExtraRange;
uniform float uExtraScale;
uniform float uExtraOffset;

uniform vec3 uShadowColor;

uniform sampler2D visibleNodes;
uniform sampler2D gradient;
uniform sampler2D classificationLUT;

#if defined(color_type_matcap)
uniform sampler2D matcapTextureUniform;
#endif
uniform bool backfaceCulling;

#if defined(num_shadowmaps) && num_shadowmaps > 0
uniform sampler2D uShadowMap[num_shadowmaps];
uniform mat4 uShadowWorldView[num_shadowmaps];
uniform mat4 uShadowProj[num_shadowmaps];
#endif

varying vec3	vColor;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float 	vRadius;
varying float 	vPointSize;


float round(float number){
	return floor(number + 0.5);
}

// 
//    ###    ########     ###    ########  ######## #### ##     ## ########     ######  #### ######## ########  ######  
//   ## ##   ##     ##   ## ##   ##     ##    ##     ##  ##     ## ##          ##    ##  ##       ##  ##       ##    ## 
//  ##   ##  ##     ##  ##   ##  ##     ##    ##     ##  ##     ## ##          ##        ##      ##   ##       ##       
// ##     ## ##     ## ##     ## ########     ##     ##  ##     ## ######       ######   ##     ##    ######    ######  
// ######### ##     ## ######### ##           ##     ##   ##   ##  ##                ##  ##    ##     ##             ## 
// ##     ## ##     ## ##     ## ##           ##     ##    ## ##   ##          ##    ##  ##   ##      ##       ##    ## 
// ##     ## ########  ##     ## ##           ##    ####    ###    ########     ######  #### ######## ########  ######  
// 																			


// ---------------------
// OCTREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_level_of_detail)) && defined(tree_type_octree)
/**
 * number of 1-bits up to inclusive index position
 * number is treated as if it were an integer in the range 0-255
 *
 */
int numberOfOnes(int number, int index){
	int numOnes = 0;
	int tmp = 128;
	for(int i = 7; i >= 0; i--){
		
		if(number >= tmp){
			number = number - tmp;

			if(i <= index){
				numOnes++;
			}
		}
		
		tmp = tmp / 2;
	}

	return numOnes;
}


/**
 * checks whether the bit at index is 1
 * number is treated as if it were an integer in the range 0-255
 *
 */
bool isBitSet(int number, int index){

	// weird multi else if due to lack of proper array, int and bitwise support in WebGL 1.0
	int powi = 1;
	if(index == 0){
		powi = 1;
	}else if(index == 1){
		powi = 2;
	}else if(index == 2){
		powi = 4;
	}else if(index == 3){
		powi = 8;
	}else if(index == 4){
		powi = 16;
	}else if(index == 5){
		powi = 32;
	}else if(index == 6){
		powi = 64;
	}else if(index == 7){
		powi = 128;
	}else{
		return false;
	}

	int ndp = number / powi;

	return mod(float(ndp), 2.0) != 0.0;
}


/**
 * find the LOD at the point position
 */
float getLOD(){
	
	vec3 offset = vec3(0.0, 0.0, 0.0);
	int iOffset = int(uVNStart);
	float depth = uLevel;
	for(float i = 0.0; i <= 30.0; i++){
		float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel + 0.0);
		
		vec3 index3d = (position-offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));
		
		vec4 value = texture2D(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
		int mask = int(round(value.r * 255.0));

		if(isBitSet(mask, index)){
			// there are more visible child nodes at this position
			int advanceG = int(round(value.g * 255.0)) * 256;
			int advanceB = int(round(value.b * 255.0));
			int advanceChild = numberOfOnes(mask, index - 1);
			int advance = advanceG + advanceB + advanceChild;

			iOffset = iOffset + advance;
			
			depth++;
		}else{
			// no more visible child nodes at this position
			//return value.a * 255.0;

			float lodOffset = (255.0 * value.a) / 10.0 - 10.0;

			return depth  + lodOffset;
		}
		
		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
	}
		
	return depth;
}

float getSpacing(){
	vec3 offset = vec3(0.0, 0.0, 0.0);
	int iOffset = int(uVNStart);
	float depth = uLevel;
	float spacing = uNodeSpacing;
	for(float i = 0.0; i <= 30.0; i++){
		float nodeSizeAtLevel = uOctreeSize / pow(2.0, i + uLevel + 0.0);
		
		vec3 index3d = (position-offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));
		
		vec4 value = texture2D(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
		int mask = int(round(value.r * 255.0));
		float spacingFactor = value.a;

		if(i > 0.0){
			spacing = spacing / (255.0 * spacingFactor);
		}
		

		if(isBitSet(mask, index)){
			// there are more visible child nodes at this position
			int advanceG = int(round(value.g * 255.0)) * 256;
			int advanceB = int(round(value.b * 255.0));
			int advanceChild = numberOfOnes(mask, index - 1);
			int advance = advanceG + advanceB + advanceChild;

			iOffset = iOffset + advance;

			//spacing = spacing / (255.0 * spacingFactor);
			//spacing = spacing / 3.0;
			
			depth++;
		}else{
			// no more visible child nodes at this position
			return spacing;
		}
		
		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
	}
		
	return spacing;
}

float getPointSizeAttenuation(){
	return pow(2.0, getLOD());
}


#endif


// ---------------------
// KD-TREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_level_of_detail)) && defined(tree_type_kdtree)

float getLOD(){
	vec3 offset = vec3(0.0, 0.0, 0.0);
	float iOffset = 0.0;
	float depth = 0.0;
		
		
	vec3 size = uBBSize;	
	vec3 pos = position;
		
	for(float i = 0.0; i <= 1000.0; i++){
		
		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));
		
		int children = int(value.r * 255.0);
		float next = value.g * 255.0;
		int split = int(value.b * 255.0);
		
		if(next == 0.0){
		 	return depth;
		}
		
		vec3 splitv = vec3(0.0, 0.0, 0.0);
		if(split == 1){
			splitv.x = 1.0;
		}else if(split == 2){
		 	splitv.y = 1.0;
		}else if(split == 4){
		 	splitv.z = 1.0;
		}
		
		iOffset = iOffset + next;
		
		float factor = length(pos * splitv / size);
		if(factor < 0.5){
			// left
		if(children == 0 || children == 2){
				return depth;
			}
		}else{
			// right
			pos = pos - size * splitv * 0.5;
			if(children == 0 || children == 1){
				return depth;
			}
			if(children == 3){
				iOffset = iOffset + 1.0;
			}
		}
		size = size * ((1.0 - (splitv + 1.0) / 2.0) + 0.5);
		
		depth++;
	}
		
		
	return depth;	
}

float getPointSizeAttenuation(){
	return 0.5 * pow(1.3, getLOD());
}

#endif



// 
//    ###    ######## ######## ########  #### ########  ##     ## ######## ########  ######  
//   ## ##      ##       ##    ##     ##  ##  ##     ## ##     ##    ##    ##       ##    ## 
//  ##   ##     ##       ##    ##     ##  ##  ##     ## ##     ##    ##    ##       ##       
// ##     ##    ##       ##    ########   ##  ########  ##     ##    ##    ######    ######  
// #########    ##       ##    ##   ##    ##  ##     ## ##     ##    ##    ##             ## 
// ##     ##    ##       ##    ##    ##   ##  ##     ## ##     ##    ##    ##       ##    ## 
// ##     ##    ##       ##    ##     ## #### ########   #######     ##    ########  ######                                                                               
// 



// formula adapted from: http://www.dfstudios.co.uk/articles/programming/image-programming-algorithms/image-processing-algorithms-part-5-contrast-adjustment/
float getContrastFactor(float contrast){
	return (1.0158730158730156 * (contrast + 1.0)) / (1.0158730158730156 - contrast);
}

vec3 getRGB(){
	vec3 rgb = color;
	
	rgb = pow(rgb, vec3(uRGB_gbc.x));
	rgb = rgb + uRGB_gbc.y;
	rgb = (rgb - 0.5) * getContrastFactor(uRGB_gbc.z) + 0.5;
	rgb = clamp(rgb, 0.0, 1.0);

	return rgb;
}

float getIntensity(){
	float w = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);
	w = pow(w, uIntensity_gbc.x);
	w = w + uIntensity_gbc.y;
	w = (w - 0.5) * getContrastFactor(uIntensity_gbc.z) + 0.5;
	w = clamp(w, 0.0, 1.0);

	return w;
}

vec3 getGpsTime(){

	float w = (gpsTime + uGpsOffset) * uGpsScale;


	vec3 c = texture2D(gradient, vec2(w, 1.0 - w)).rgb;


	// vec2 r = uNormalizedGpsBufferRange;
	// float w = gpsTime * (r.y - r.x) + r.x;
	// w = clamp(w, 0.0, 1.0);
	// vec3 c = texture2D(gradient, vec2(w,1.0-w)).rgb;
	
	return c;
}

vec3 getElevation(){
	vec4 world = modelMatrix * vec4( position, 1.0 );
	float w = (world.z - elevationRange.x) / (elevationRange.y - elevationRange.x);
	vec3 cElevation = texture2D(gradient, vec2(w,1.0-w)).rgb;
	
	return cElevation;
}

vec4 getClassification(){
	vec2 uv = vec2(classification / 255.0, 0.5);
	vec4 classColor = texture2D(classificationLUT, uv);
	
	return classColor;
}

vec3 getReturns(){

	// 0b 00_000_111
	float rn = mod(returnNumber, 8.0);
	// 0b 00_111_000
	float nr = mod(returnNumber / 8.0, 8.0);

	if(nr <= 1.0){
		return vec3(1.0, 0.0, 0.0);
	}else{
		return vec3(0.0, 1.0, 0.0);
	}

	// return vec3(nr / 4.0, 0.0, 0.0);

	// if(nr == 1.0){
	// 	return vec3(1.0, 1.0, 0.0);
	// }else{
	// 	if(rn == 1.0){
	// 		return vec3(1.0, 0.0, 0.0);
	// 	}else if(rn == nr){
	// 		return vec3(0.0, 0.0, 1.0);
	// 	}else{
	// 		return vec3(0.0, 1.0, 0.0);
	// 	}
	// }

	// if(numberOfReturns == 1.0){
	// 	return vec3(1.0, 1.0, 0.0);
	// }else{
	// 	if(returnNumber == 1.0){
	// 		return vec3(1.0, 0.0, 0.0);
	// 	}else if(returnNumber == numberOfReturns){
	// 		return vec3(0.0, 0.0, 1.0);
	// 	}else{
	// 		return vec3(0.0, 1.0, 0.0);
	// 	}
	// }
}

vec3 getReturnNumber(){
	if(numberOfReturns == 1.0){
		return vec3(1.0, 1.0, 0.0);
	}else{
		if(returnNumber == 1.0){
			return vec3(1.0, 0.0, 0.0);
		}else if(returnNumber == numberOfReturns){
			return vec3(0.0, 0.0, 1.0);
		}else{
			return vec3(0.0, 1.0, 0.0);
		}
	}
}

vec3 getNumberOfReturns(){
	float value = numberOfReturns;

	float w = value / 6.0;

	vec3 color = texture2D(gradient, vec2(w, 1.0 - w)).rgb;

	return color;
}

vec3 getSourceID(){
	float w = mod(pointSourceID, 10.0) / 10.0;
	return texture2D(gradient, vec2(w,1.0 - w)).rgb;
}

vec3 getCompositeColor(){
	vec3 c;
	float w;

	c += wRGB * getRGB();
	w += wRGB;
	
	c += wIntensity * getIntensity() * vec3(1.0, 1.0, 1.0);
	w += wIntensity;
	
	c += wElevation * getElevation();
	w += wElevation;
	
	c += wReturnNumber * getReturnNumber();
	w += wReturnNumber;
	
	c += wSourceID * getSourceID();
	w += wSourceID;
	
	vec4 cl = wClassification * getClassification();
	c += cl.a * cl.rgb;
	w += wClassification * cl.a;

	c = c / w;
	
	if(w == 0.0){
		//c = color;
		gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
	}
	
	return c;
}


vec3 getNormal(){
	//vec3 n_hsv = vec3( modelMatrix * vec4( normal, 0.0 )) * 0.5 + 0.5; // (n_world.xyz + vec3(1.,1.,1.)) / 2.;
	vec3 n_view = normalize( vec3(modelViewMatrix * vec4( normal, 0.0 )) );
	return n_view;
}
bool applyBackfaceCulling() {
	// Black not facing vertices / Backface culling
	vec3 e = normalize(vec3(modelViewMatrix * vec4( position, 1. )));
	vec3 n = getNormal(); // normalize( vec3(modelViewMatrix * vec4( normal, 0.0 )) );

	if((uUseOrthographicCamera && n.z <= 0.) || (!uUseOrthographicCamera && dot( n, e ) >= 0.)) { 
		return true;
	} else {
		return false;
	}
}

#if defined(color_type_matcap)
// Matcap Material
vec3 getMatcap(){ 
	vec3 eye = normalize( vec3( modelViewMatrix * vec4( position, 1. ) ) ); 
	if(uUseOrthographicCamera) { 
		eye = vec3(0., 0., -1.);
	}
	vec3 r_en = reflect( eye, getNormal() ); // or r_en = e - 2. * dot( n, e ) * n;
	float m = 2. * sqrt(pow( r_en.x, 2. ) + pow( r_en.y, 2. ) + pow( r_en.z + 1., 2. ));
	vec2 vN = r_en.xy / m + .5;
	return texture2D(matcapTextureUniform, vN).rgb; 
}
#endif

vec3 getExtra(){

	float w = (aExtra + uExtraOffset) * uExtraScale;
	w = clamp(w, 0.0, 1.0);

	vec3 color = texture2D(gradient, vec2(w,1.0-w)).rgb;

	// vec2 r = uExtraNormalizedRange;

	// float w = aExtra * (r.y - r.x) + r.x;

	// w = (w - uExtraRange.x) / (uExtraRange.y - uExtraRange.x);

	// w = clamp(w, 0.0, 1.0);

	// vec3 color = texture2D(gradient, vec2(w,1.0-w)).rgb;

	return color;
}

vec3 getColor(){
	vec3 color;
	
	#ifdef color_type_rgba
		color = getRGB();
	#elif defined color_type_height || defined color_type_elevation
		color = getElevation();
	#elif defined color_type_rgb_height
		vec3 cHeight = getElevation();
		color = (1.0 - uTransition) * getRGB() + uTransition * cHeight;
	#elif defined color_type_depth
		float linearDepth = gl_Position.w;
		float expDepth = (gl_Position.z / gl_Position.w) * 0.5 + 0.5;
		color = vec3(linearDepth, expDepth, 0.0);
		//color = vec3(1.0, 0.5, 0.3);
	#elif defined color_type_intensity
		float w = getIntensity();
		color = vec3(w, w, w);
	#elif defined color_type_gps_time
		color = getGpsTime();
	#elif defined color_type_intensity_gradient
		float w = getIntensity();
		color = texture2D(gradient, vec2(w,1.0-w)).rgb;
	#elif defined color_type_color
		color = uColor;
	#elif defined color_type_level_of_detail
		float depth = getLOD();
		float w = depth / 10.0;
		color = texture2D(gradient, vec2(w,1.0-w)).rgb;
	#elif defined color_type_indices
		color = indices.rgb;
	#elif defined color_type_classification
		vec4 cl = getClassification(); 
		color = cl.rgb;
	#elif defined color_type_return_number
		color = getReturnNumber();
	#elif defined color_type_returns
		color = getReturns();
	#elif defined color_type_number_of_returns
		color = getNumberOfReturns();
	#elif defined color_type_source_id
		color = getSourceID();
	#elif defined color_type_point_source_id
		color = getSourceID();
	#elif defined color_type_normal
		color = (modelMatrix * vec4(normal, 0.0)).xyz;
	#elif defined color_type_phong
		color = color;
	#elif defined color_type_composite
		color = getCompositeColor();
	#elif defined color_type_matcap
		color = getMatcap();
	#else 
		color = getExtra();
	#endif
	
	if (backfaceCulling && applyBackfaceCulling()) {
		color = vec3(0.);
	}

	return color;
}

float getPointSize(){
	float pointSize = 1.0;
	
	float slope = tan(fov / 2.0);
	float projFactor = -0.5 * uScreenHeight / (slope * vViewPosition.z);
	
	float r = uOctreeSpacing * 1.7;
	vRadius = r;
	#if defined fixed_point_size
		pointSize = size;
	#elif defined attenuated_point_size
		if(uUseOrthographicCamera){
			pointSize = size;
		}else{
			pointSize = size * spacing * projFactor;
			//pointSize = pointSize * projFactor;
		}
	#elif defined adaptive_point_size
		if(uUseOrthographicCamera) {
			float worldSpaceSize = 1.0 * size * r / getPointSizeAttenuation();
			pointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
		} else {

			// float leafSpacing = 0.122069092 * 8.0;
			
			// bool isLeafNode = getLOD() == 1000.0;
			// if(isLeafNode){
			// 	// pointSize = size * spacing * projFactor;

			// 	float worldSpaceSize = size * leafSpacing;
			// 	pointSize = worldSpaceSize * projFactor;
			// }else{
				float worldSpaceSize = 1.0 * size * r / getPointSizeAttenuation();

				// minimum world space size
				// worldSpaceSize = max(worldSpaceSize, leafSpacing);

				pointSize = worldSpaceSize * projFactor;
			// }
		}
	#endif

	pointSize = max(minSize, pointSize);
	pointSize = min(maxSize, pointSize);
	
	vRadius = pointSize / projFactor;

	return pointSize;
}

#if defined(num_clippolygons) && num_clippolygons > 0
bool pointInClipPolygon(vec3 point, int polyIdx) {

	mat4 wvp = uClipPolygonWVP[polyIdx];
	//vec4 screenClipPos = uClipPolygonVP[polyIdx] * modelMatrix * vec4(point, 1.0);
	//screenClipPos.xy = screenClipPos.xy / screenClipPos.w * 0.5 + 0.5;

	vec4 pointNDC = wvp * vec4(point, 1.0);
	pointNDC.xy = pointNDC.xy / pointNDC.w;

	int j = uClipPolygonVCount[polyIdx] - 1;
	bool c = false;
	for(int i = 0; i < 8; i++) {
		if(i == uClipPolygonVCount[polyIdx]) {
			break;
		}

		//vec4 verti = wvp * vec4(uClipPolygonVertices[polyIdx * 8 + i], 1);
		//vec4 vertj = wvp * vec4(uClipPolygonVertices[polyIdx * 8 + j], 1);

		//verti.xy = verti.xy / verti.w;
		//vertj.xy = vertj.xy / vertj.w;

		//verti.xy = verti.xy / verti.w * 0.5 + 0.5;
		//vertj.xy = vertj.xy / vertj.w * 0.5 + 0.5;

		vec3 verti = uClipPolygonVertices[polyIdx * 8 + i];
		vec3 vertj = uClipPolygonVertices[polyIdx * 8 + j];

		if( ((verti.y > pointNDC.y) != (vertj.y > pointNDC.y)) && 
			(pointNDC.x < (vertj.x-verti.x) * (pointNDC.y-verti.y) / (vertj.y-verti.y) + verti.x) ) {
			c = !c;
		}
		j = i;
	}

	return c;
}
#endif

void doClipping(){

	{
		vec4 cl = getClassification(); 
		if(cl.a == 0.0){
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
			
			return;
		}
	}

	#if defined(clip_return_number_enabled)
	{ // return number filter
		vec2 range = uFilterReturnNumberRange;
		if(returnNumber < range.x || returnNumber > range.y){
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
			
			return;
		}
	}
	#endif

	#if defined(clip_number_of_returns_enabled)
	{ // number of return filter
		vec2 range = uFilterNumberOfReturnsRange;
		if(numberOfReturns < range.x || numberOfReturns > range.y){
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
			
			return;
		}
	}
	#endif

	#if defined(clip_gps_enabled)
	{ // GPS time filter
		float time = (gpsTime + uGpsOffset) * uGpsScale;
		vec2 range = uFilterGPSTimeClipRange;

		if(time < range.x || time > range.y){
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
			
			return;
		}
	}
	#endif

	#if defined(clip_point_source_id_enabled)
	{ // point source id filter
		vec2 range = uFilterPointSourceIDClipRange;
		if(pointSourceID < range.x || pointSourceID > range.y){
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
			
			return;
		}
	}
	#endif

	int clipVolumesCount = 0;
	int insideCount = 0;

	#if defined(num_clipboxes) && num_clipboxes > 0
		for(int i = 0; i < num_clipboxes; i++){
			vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4( position, 1.0 );
			bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;
			inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;
			inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;

			insideCount = insideCount + (inside ? 1 : 0);
			clipVolumesCount++;
		}	
	#endif

	#if defined(num_clippolygons) && num_clippolygons > 0
		for(int i = 0; i < num_clippolygons; i++) {
			bool inside = pointInClipPolygon(position, i);

			insideCount = insideCount + (inside ? 1 : 0);
			clipVolumesCount++;
		}
	#endif

	bool insideAny = insideCount > 0;
	bool insideAll = (clipVolumesCount > 0) && (clipVolumesCount == insideCount);

	if(clipMethod == CLIPMETHOD_INSIDE_ANY){
		if(insideAny && clipTask == CLIPTASK_HIGHLIGHT){
			vColor.r += 0.5;
		}else if(!insideAny && clipTask == CLIPTASK_SHOW_INSIDE){
			gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
		}else if(insideAny && clipTask == CLIPTASK_SHOW_OUTSIDE){
			gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
		}
	}else if(clipMethod == CLIPMETHOD_INSIDE_ALL){
		if(insideAll && clipTask == CLIPTASK_HIGHLIGHT){
			vColor.r += 0.5;
		}else if(!insideAll && clipTask == CLIPTASK_SHOW_INSIDE){
			gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
		}else if(insideAll && clipTask == CLIPTASK_SHOW_OUTSIDE){
			gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
		}
	}
}



// 
// ##     ##    ###    #### ##    ## 
// ###   ###   ## ##    ##  ###   ## 
// #### ####  ##   ##   ##  ####  ## 
// ## ### ## ##     ##  ##  ## ## ## 
// ##     ## #########  ##  ##  #### 
// ##     ## ##     ##  ##  ##   ### 
// ##     ## ##     ## #### ##    ## 
//

void main() {
	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0 );
	vViewPosition = mvPosition.xyz;
	gl_Position = projectionMatrix * mvPosition;
	vLogDepth = log2(-mvPosition.z);

	// POINT SIZE
	float pointSize = getPointSize();
	gl_PointSize = pointSize;
	vPointSize = pointSize;

	// COLOR
	vColor = getColor();

	//gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
	//gl_Position = vec4(position.xzy / 1000.0, 1.0 );

	//gl_PointSize = 5.0;
	//vColor = vec3(1.0, 1.0, 1.0);

	// only for "replacing" approaches
	// if(getLOD() != uLevel){
	// 	gl_Position = vec4(10.0, 10.0, 10.0, 1.0);
	// }


	#if defined hq_depth_pass
		float originalDepth = gl_Position.w;
		float adjustedDepth = originalDepth + 2.0 * vRadius;
		float adjust = adjustedDepth / originalDepth;

		mvPosition.xyz = mvPosition.xyz * adjust;
		gl_Position = projectionMatrix * mvPosition;
	#endif


	// CLIPPING
	doClipping();

	#if defined(num_clipspheres) && num_clipspheres > 0
		for(int i = 0; i < num_clipspheres; i++){
			vec4 sphereLocal = uClipSpheres[i] * mvPosition;

			float distance = length(sphereLocal.xyz);

			if(distance < 1.0){
				float w = distance;
				vec3 cGradient = texture2D(gradient, vec2(w, 1.0 - w)).rgb;
				
				vColor = cGradient;
				//vColor = cGradient * 0.7 + vColor * 0.3;
			}
		}
	#endif

	#if defined(num_shadowmaps) && num_shadowmaps > 0

		const float sm_near = 0.1;
		const float sm_far = 10000.0;

		for(int i = 0; i < num_shadowmaps; i++){
			vec3 viewPos = (uShadowWorldView[i] * vec4(position, 1.0)).xyz;
			float distanceToLight = abs(viewPos.z);
			
			vec4 projPos = uShadowProj[i] * uShadowWorldView[i] * vec4(position, 1);
			vec3 nc = projPos.xyz / projPos.w;
			
			float u = nc.x * 0.5 + 0.5;
			float v = nc.y * 0.5 + 0.5;

			vec2 sampleStep = vec2(1.0 / (2.0*1024.0), 1.0 / (2.0*1024.0)) * 1.5;
			vec2 sampleLocations[9];
			sampleLocations[0] = vec2(0.0, 0.0);
			sampleLocations[1] = sampleStep;
			sampleLocations[2] = -sampleStep;
			sampleLocations[3] = vec2(sampleStep.x, -sampleStep.y);
			sampleLocations[4] = vec2(-sampleStep.x, sampleStep.y);

			sampleLocations[5] = vec2(0.0, sampleStep.y);
			sampleLocations[6] = vec2(0.0, -sampleStep.y);
			sampleLocations[7] = vec2(sampleStep.x, 0.0);
			sampleLocations[8] = vec2(-sampleStep.x, 0.0);

			float visibleSamples = 0.0;
			float numSamples = 0.0;

			float bias = vRadius * 2.0;

			for(int j = 0; j < 9; j++){
				vec4 depthMapValue = texture2D(uShadowMap[i], vec2(u, v) + sampleLocations[j]);

				float linearDepthFromSM = depthMapValue.x + bias;
				float linearDepthFromViewer = distanceToLight;

				if(linearDepthFromSM > linearDepthFromViewer){
					visibleSamples += 1.0;
				}

				numSamples += 1.0;
			}

			float visibility = visibleSamples / numSamples;

			if(u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0 || nc.x < -1.0 || nc.x > 1.0 || nc.y < -1.0 || nc.y > 1.0 || nc.z < -1.0 || nc.z > 1.0){
				//vColor = vec3(0.0, 0.0, 0.2);
			}else{
				//vColor = vec3(1.0, 1.0, 1.0) * visibility + vec3(1.0, 1.0, 1.0) * vec3(0.5, 0.0, 0.0) * (1.0 - visibility);
				vColor = vColor * visibility + vColor * uShadowColor * (1.0 - visibility);
			}


		}

	#endif
}
`;

	Shaders["pointcloud.fs"] = `
#if defined paraboloid_point_shape
	#extension GL_EXT_frag_depth : enable
#endif

precision highp float;
precision highp int;

uniform mat4 viewMatrix;
uniform mat4 uViewInv;
uniform mat4 uProjInv;
uniform vec3 cameraPosition;


uniform mat4 projectionMatrix;
uniform float uOpacity;

uniform float blendHardness;
uniform float blendDepthSupplement;
uniform float fov;
uniform float uSpacing;
uniform float near;
uniform float far;
uniform float uPCIndex;
uniform float uScreenWidth;
uniform float uScreenHeight;

varying vec3	vColor;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float	vRadius;
varying float 	vPointSize;
varying vec3 	vPosition;


float specularStrength = 1.0;

void main() {

	vec3 color = vColor;
	float depth = gl_FragCoord.z;

	#if defined(circle_point_shape) || defined(paraboloid_point_shape) 
		float u = 2.0 * gl_PointCoord.x - 1.0;
		float v = 2.0 * gl_PointCoord.y - 1.0;
	#endif
	
	#if defined(circle_point_shape) 
		float cc = u*u + v*v;
		if(cc > 1.0){
			discard;
		}
	#endif
		
	#if defined color_type_indices
		gl_FragColor = vec4(color, uPCIndex / 255.0);
	#else
		gl_FragColor = vec4(color, uOpacity);
	#endif

	#if defined paraboloid_point_shape
		float wi = 0.0 - ( u*u + v*v);
		vec4 pos = vec4(vViewPosition, 1.0);
		pos.z += wi * vRadius;
		float linearDepth = -pos.z;
		pos = projectionMatrix * pos;
		pos = pos / pos.w;
		float expDepth = pos.z;
		depth = (pos.z + 1.0) / 2.0;
		gl_FragDepthEXT = depth;
		
		#if defined(color_type_depth)
			color.r = linearDepth;
			color.g = expDepth;
		#endif
		
		#if defined(use_edl)
			gl_FragColor.a = log2(linearDepth);
		#endif
		
	#else
		#if defined(use_edl)
			gl_FragColor.a = vLogDepth;
		#endif
	#endif

	#if defined(weighted_splats)
		float distance = 2.0 * length(gl_PointCoord.xy - 0.5);
		float weight = max(0.0, 1.0 - distance);
		weight = pow(weight, 1.5);

		gl_FragColor.a = weight;
		gl_FragColor.xyz = gl_FragColor.xyz * weight;
	#endif

	//gl_FragColor = vec4(0.0, 0.7, 0.0, 1.0);
	
}


`;

	Shaders["pointcloud_sm.vs"] = `
precision mediump float;
precision mediump int;

attribute vec3 position;
attribute vec3 color;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

uniform float uScreenWidth;
uniform float uScreenHeight;
uniform float near;
uniform float far;

uniform float uSpacing;
uniform float uOctreeSize;
uniform float uLevel;
uniform float uVNStart;

uniform sampler2D visibleNodes;

varying float vLinearDepth;
varying vec3 vColor;

#define PI 3.141592653589793



// ---------------------
// OCTREE
// ---------------------

#if defined(adaptive_point_size)
/**
 * number of 1-bits up to inclusive index position
 * number is treated as if it were an integer in the range 0-255
 *
 */
float numberOfOnes(float number, float index){
	float tmp = mod(number, pow(2.0, index + 1.0));
	float numOnes = 0.0;
	for(float i = 0.0; i < 8.0; i++){
		if(mod(tmp, 2.0) != 0.0){
			numOnes++;
		}
		tmp = floor(tmp / 2.0);
	}
	return numOnes;
}


/**
 * checks whether the bit at index is 1
 * number is treated as if it were an integer in the range 0-255
 *
 */
bool isBitSet(float number, float index){
	return mod(floor(number / pow(2.0, index)), 2.0) != 0.0;
}


/**
 * find the LOD at the point position
 */
float getLOD(){
	
	vec3 offset = vec3(0.0, 0.0, 0.0);
	float iOffset = uVNStart;
	float depth = uLevel;
	for(float i = 0.0; i <= 30.0; i++){
		float nodeSizeAtLevel = uOctreeSize  / pow(2.0, i + uLevel + 0.0);
		
		vec3 index3d = (position-offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		float index = 4.0 * index3d.x + 2.0 * index3d.y + index3d.z;
		
		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));
		float mask = value.r * 255.0;
		if(isBitSet(mask, index)){
			// there are more visible child nodes at this position
			iOffset = iOffset + value.g * 255.0 * 256.0 + value.b * 255.0 + numberOfOnes(mask, index - 1.0);
			depth++;
		}else{
			// no more visible child nodes at this position
			return depth;
		}
		
		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
	}
		
	return depth;
}

#endif

float getPointSize(){
	float pointSize = 1.0;
	
	float slope = tan(fov / 2.0);
	float projFactor =  -0.5 * uScreenHeight / (slope * vViewPosition.z);
	
	float r = uOctreeSpacing * 1.5;
	vRadius = r;
	#if defined fixed_point_size
		pointSize = size;
	#elif defined attenuated_point_size
		if(uUseOrthographicCamera){
			pointSize = size;			
		}else{
			pointSize = pointSize * projFactor;
		}
	#elif defined adaptive_point_size
		if(uUseOrthographicCamera) {
			float worldSpaceSize = 1.5 * size * r / getPointSizeAttenuation();
			pointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
		} else {
			float worldSpaceSize = 1.5 * size * r / getPointSizeAttenuation();
			pointSize = worldSpaceSize * projFactor;
		}
	#endif

	pointSize = max(minSize, pointSize);
	pointSize = min(maxSize, pointSize);
	
	vRadius = pointSize / projFactor;

	return pointSize;
}


void main() {

	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	vLinearDepth = gl_Position.w;

	float pointSize = getPointSize();
	gl_PointSize = pointSize;

}
`;

	Shaders["pointcloud_sm.fs"] = `
precision mediump float;
precision mediump int;

varying vec3 vColor;
varying float vLinearDepth;

void main() {

	//gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
	//gl_FragColor = vec4(vColor, 1.0);
	//gl_FragColor = vec4(vLinearDepth, pow(vLinearDepth, 2.0), 0.0, 1.0);
	gl_FragColor = vec4(vLinearDepth, vLinearDepth / 30.0, vLinearDepth / 30.0, 1.0);
	
}


`;

	Shaders["normalize.vs"] = `
precision mediump float;
precision mediump int;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec2 vUv;

void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;

	Shaders["normalize.fs"] = `
#extension GL_EXT_frag_depth : enable

precision mediump float;
precision mediump int;

uniform sampler2D uWeightMap;
uniform sampler2D uDepthMap;

varying vec2 vUv;

void main() {
	float depth = texture2D(uDepthMap, vUv).r;
	
	if(depth >= 1.0){
		discard;
	}

	gl_FragColor = vec4(depth, 1.0, 0.0, 1.0);

	vec4 color = texture2D(uWeightMap, vUv); 
	color = color / color.w;
	
	gl_FragColor = vec4(color.xyz, 1.0); 
	
	gl_FragDepthEXT = depth;


}`;

	Shaders["normalize_and_edl.fs"] = `
#extension GL_EXT_frag_depth : enable

// 
// adapted from the EDL shader code from Christian Boucheny in cloud compare:
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
//

precision mediump float;
precision mediump int;

uniform sampler2D uWeightMap;
uniform sampler2D uEDLMap;
uniform sampler2D uDepthMap;

uniform float screenWidth;
uniform float screenHeight;
uniform vec2 neighbours[NEIGHBOUR_COUNT];
uniform float edlStrength;
uniform float radius;

varying vec2 vUv;

float response(float depth){
	vec2 uvRadius = radius / vec2(screenWidth, screenHeight);
	
	float sum = 0.0;
	
	for(int i = 0; i < NEIGHBOUR_COUNT; i++){
		vec2 uvNeighbor = vUv + uvRadius * neighbours[i];
		
		float neighbourDepth = texture2D(uEDLMap, uvNeighbor).a;

		if(neighbourDepth != 0.0){
			if(depth == 0.0){
				sum += 100.0;
			}else{
				sum += max(0.0, depth - neighbourDepth);
			}
		}
	}
	
	return sum / float(NEIGHBOUR_COUNT);
}

void main() {

	float edlDepth = texture2D(uEDLMap, vUv).a;
	float res = response(edlDepth);
	float shade = exp(-res * 300.0 * edlStrength);

	float depth = texture2D(uDepthMap, vUv).r;
	if(depth >= 1.0 && res == 0.0){
		discard;
	}
	
	vec4 color = texture2D(uWeightMap, vUv); 
	color = color / color.w;
	color = color * shade;

	gl_FragColor = vec4(color.xyz, 1.0); 

	gl_FragDepthEXT = depth;
}`;

	Shaders["edl.vs"] = `
precision mediump float;
precision mediump int;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec2 vUv;

void main() {
	vUv = uv;
	
	vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

	gl_Position = projectionMatrix * mvPosition;
}`;

	Shaders["edl.fs"] = `
#extension GL_EXT_frag_depth : enable

// 
// adapted from the EDL shader code from Christian Boucheny in cloud compare:
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
//

precision mediump float;
precision mediump int;

uniform float screenWidth;
uniform float screenHeight;
uniform vec2 neighbours[NEIGHBOUR_COUNT];
uniform float edlStrength;
uniform float radius;
uniform float opacity;

uniform float uNear;
uniform float uFar;

uniform mat4 uProj;

uniform sampler2D uEDLColor;
uniform sampler2D uEDLDepth;

varying vec2 vUv;

float response(float depth){
	vec2 uvRadius = radius / vec2(screenWidth, screenHeight);
	
	float sum = 0.0;
	
	for(int i = 0; i < NEIGHBOUR_COUNT; i++){
		vec2 uvNeighbor = vUv + uvRadius * neighbours[i];
		
		float neighbourDepth = texture2D(uEDLColor, uvNeighbor).a;
		neighbourDepth = (neighbourDepth == 1.0) ? 0.0 : neighbourDepth;

		if(neighbourDepth != 0.0){
			if(depth == 0.0){
				sum += 100.0;
			}else{
				sum += max(0.0, depth - neighbourDepth);
			}
		}
	}
	
	return sum / float(NEIGHBOUR_COUNT);
}

void main(){
	vec4 cEDL = texture2D(uEDLColor, vUv);
	
	float depth = cEDL.a;
	depth = (depth == 1.0) ? 0.0 : depth;
	float res = response(depth);
	float shade = exp(-res * 300.0 * edlStrength);

	gl_FragColor = vec4(cEDL.rgb * shade, opacity);

	{ // write regular hyperbolic depth values to depth buffer
		float dl = pow(2.0, depth);

		vec4 dp = uProj * vec4(0.0, 0.0, -dl, 1.0);
		float pz = dp.z / dp.w;
		float fragDepth = (pz + 1.0) / 2.0;

		gl_FragDepthEXT = fragDepth;
	}

	if(depth == 0.0){
		discard;
	}

}
`;

	Shaders["blur.vs"] = `
varying vec2 vUv;

void main() {
	vUv = uv;

	gl_Position =   projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`;

	Shaders["blur.fs"] = `
uniform mat4 projectionMatrix;

uniform float screenWidth;
uniform float screenHeight;
uniform float near;
uniform float far;

uniform sampler2D map;

varying vec2 vUv;

void main() {

	float dx = 1.0 / screenWidth;
	float dy = 1.0 / screenHeight;

	vec3 color = vec3(0.0, 0.0, 0.0);
	color += texture2D(map, vUv + vec2(-dx, -dy)).rgb;
	color += texture2D(map, vUv + vec2(  0, -dy)).rgb;
	color += texture2D(map, vUv + vec2(+dx, -dy)).rgb;
	color += texture2D(map, vUv + vec2(-dx,   0)).rgb;
	color += texture2D(map, vUv + vec2(  0,   0)).rgb;
	color += texture2D(map, vUv + vec2(+dx,   0)).rgb;
	color += texture2D(map, vUv + vec2(-dx,  dy)).rgb;
	color += texture2D(map, vUv + vec2(  0,  dy)).rgb;
	color += texture2D(map, vUv + vec2(+dx,  dy)).rgb;

	color = color / 9.0;
	
	gl_FragColor = vec4(color, 1.0);
}`;

	const ClassificationScheme = {

		DEFAULT: {
			0:       { visible: true, name: 'never classified'  , color: [0.5,  0.5,  0.5,  1.0] },
			1:       { visible: true, name: 'unclassified'      , color: [0.5,  0.5,  0.5,  1.0] },
			2:       { visible: true, name: 'ground'            , color: [0.63, 0.32, 0.18, 1.0] },
			3:       { visible: true, name: 'low vegetation'    , color: [0.0,  1.0,  0.0,  1.0] },
			4:       { visible: true, name: 'medium vegetation' , color: [0.0,  0.8,  0.0,  1.0] },
			5:       { visible: true, name: 'high vegetation'   , color: [0.0,  0.6,  0.0,  1.0] },
			6:       { visible: true, name: 'building'          , color: [1.0,  0.66, 0.0,  1.0] },
			7:       { visible: true, name: 'low point(noise)'  , color: [1.0,  0.0,  1.0,  1.0] },
			8:       { visible: true, name: 'key-point'         , color: [1.0,  0.0,  0.0,  1.0] },
			9:       { visible: true, name: 'water'             , color: [0.0,  0.0,  1.0,  1.0] },
			12:      { visible: true, name: 'overlap'           , color: [1.0,  1.0,  0.0,  1.0] },
			DEFAULT: { visible: true, name: 'default'           , color: [0.3,  0.6,  0.6,  0.5] },
		}
	};

	Object.defineProperty(ClassificationScheme, 'RANDOM', {
		get: function() { 

			let scheme = {};

			for(let i = 0; i <= 255; i++){
				scheme[i] = new THREE.Vector4(Math.random(), Math.random(), Math.random());
			}

			scheme["DEFAULT"] = new THREE.Vector4(Math.random(), Math.random(), Math.random());

			return scheme;
		}
	});

	//
	// how to calculate the radius of a projected sphere in screen space
	// http://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
	// http://stackoverflow.com/questions/3717226/radius-of-projected-sphere
	//


	class PointCloudMaterial extends THREE.RawShaderMaterial {
		constructor (parameters = {}) {
			super();

			this.visibleNodesTexture = Utils.generateDataTexture(2048, 1, new THREE.Color(0xffffff));
			this.visibleNodesTexture.minFilter = THREE.NearestFilter;
			this.visibleNodesTexture.magFilter = THREE.NearestFilter;

			let getValid = (a, b) => {
				if(a !== undefined){
					return a;
				}else {
					return b;
				}
			};

			let pointSize = getValid(parameters.size, 1.0);
			let minSize = getValid(parameters.minSize, 2.0);
			let maxSize = getValid(parameters.maxSize, 50.0);
			let treeType = getValid(parameters.treeType, TreeType.OCTREE);

			this._pointSizeType = PointSizeType.FIXED;
			this._shape = PointShape.SQUARE;
			this._useClipBox = false;
			this.clipBoxes = [];
			this.clipPolygons = [];
			this._weighted = false;
			this._gradient = Gradients.SPECTRAL;
			this.gradientTexture = PointCloudMaterial.generateGradientTexture(this._gradient);
			this._matcap = "matcap.jpg";
			this.matcapTexture = Potree.PointCloudMaterial.generateMatcapTexture(this._matcap);
			this.lights = false;
			this.fog = false;
			this._treeType = treeType;
			this._useEDL = false;
			this.defines = new Map();

			this.ranges = new Map();

			this._activeAttributeName = null;

			this._defaultIntensityRangeChanged = false;
			this._defaultElevationRangeChanged = false;

			{
				const [width, height] = [256, 1];
				let data = new Uint8Array(width * 4);
				let texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
				texture.magFilter = THREE.NearestFilter;
				texture.needsUpdate = true;

				this.classificationTexture = texture;
			}

			this.attributes = {
				position: { type: 'fv', value: [] },
				color: { type: 'fv', value: [] },
				normal: { type: 'fv', value: [] },
				intensity: { type: 'f', value: [] },
				classification: { type: 'f', value: [] },
				returnNumber: { type: 'f', value: [] },
				numberOfReturns: { type: 'f', value: [] },
				pointSourceID: { type: 'f', value: [] },
				indices: { type: 'fv', value: [] }
			};

			this.uniforms = {
				level:				{ type: "f", value: 0.0 },
				vnStart:			{ type: "f", value: 0.0 },
				spacing:			{ type: "f", value: 1.0 },
				blendHardness:		{ type: "f", value: 2.0 },
				blendDepthSupplement:	{ type: "f", value: 0.0 },
				fov:				{ type: "f", value: 1.0 },
				screenWidth:		{ type: "f", value: 1.0 },
				screenHeight:		{ type: "f", value: 1.0 },
				near:				{ type: "f", value: 0.1 },
				far:				{ type: "f", value: 1.0 },
				uColor:				{ type: "c", value: new THREE.Color( 0xffffff ) },
				uOpacity:			{ type: "f", value: 1.0 },
				size:				{ type: "f", value: pointSize },
				minSize:			{ type: "f", value: minSize },
				maxSize:			{ type: "f", value: maxSize },
				octreeSize:			{ type: "f", value: 0 },
				bbSize:				{ type: "fv", value: [0, 0, 0] },
				elevationRange:		{ type: "2fv", value: [0, 0] },

				clipBoxCount:		{ type: "f", value: 0 },
				//clipSphereCount:	{ type: "f", value: 0 },
				clipPolygonCount:	{ type: "i", value: 0 },
				clipBoxes:			{ type: "Matrix4fv", value: [] },
				//clipSpheres:		{ type: "Matrix4fv", value: [] },
				clipPolygons:		{ type: "3fv", value: [] },
				clipPolygonVCount:	{ type: "iv", value: [] },
				clipPolygonVP:		{ type: "Matrix4fv", value: [] },

				visibleNodes:		{ type: "t", value: this.visibleNodesTexture },
				pcIndex:			{ type: "f", value: 0 },
				gradient:			{ type: "t", value: this.gradientTexture },
				classificationLUT:	{ type: "t", value: this.classificationTexture },
				uHQDepthMap:		{ type: "t", value: null },
				toModel:			{ type: "Matrix4f", value: [] },
				diffuse:			{ type: "fv", value: [1, 1, 1] },
				transition:			{ type: "f", value: 0.5 },

				 intensityRange:		{ type: "fv", value: [Infinity, -Infinity] },

				intensity_gbc: 		{ type: "fv", value: [1, 0, 0]},
				uRGB_gbc:	 		{ type: "fv", value: [1, 0, 0]},
				// intensityGamma:		{ type: "f", value: 1 },
				// intensityContrast:	{ type: "f", value: 0 },
				// intensityBrightness:{ type: "f", value: 0 },
				// rgbGamma:			{ type: "f", value: 1 },
				// rgbContrast:		{ type: "f", value: 0 },
				// rgbBrightness:		{ type: "f", value: 0 },
				wRGB:				{ type: "f", value: 1 },
				wIntensity:			{ type: "f", value: 0 },
				wElevation:			{ type: "f", value: 0 },
				wClassification:	{ type: "f", value: 0 },
				wReturnNumber:		{ type: "f", value: 0 },
				wSourceID:			{ type: "f", value: 0 },
				useOrthographicCamera: { type: "b", value: false },
				elevationGradientRepat: { type: "i", value: ElevationGradientRepeat.CLAMP },
				clipTask:			{ type: "i", value: 1 },
				clipMethod:			{ type: "i", value: 1 },
				uShadowColor:		{ type: "3fv", value: [0, 0, 0] },

				uExtraScale:		{ type: "f", value: 1},
				uExtraOffset:		{ type: "f", value: 0},
				uExtraRange:		{ type: "2fv", value: [0, 1] },
				uExtraGammaBrightContr:	{ type: "3fv", value: [1, 0, 0] },

				uFilterReturnNumberRange:		{ type: "fv", value: [0, 7]},
				uFilterNumberOfReturnsRange:	{ type: "fv", value: [0, 7]},
				uFilterGPSTimeClipRange:		{ type: "fv", value: [0, 7]},
				uFilterPointSourceIDClipRange:		{ type: "fv", value: [0, 65535]},
				matcapTextureUniform: 	{ type: "t", value: this.matcapTexture },
				backfaceCulling: { type: "b", value: false },
			};

			this.classification = ClassificationScheme.DEFAULT;

			this.defaultAttributeValues.normal = [0, 0, 0];
			this.defaultAttributeValues.classification = [0, 0, 0];
			this.defaultAttributeValues.indices = [0, 0, 0, 0];

			this.vertexShader = Shaders['pointcloud.vs'];
			this.fragmentShader = Shaders['pointcloud.fs'];
			
			this.vertexColors = THREE.VertexColors;

			this.updateShaderSource();
		}

		setDefine(key, value){
			if(value !== undefined && value !== null){
				if(this.defines.get(key) !== value){
					this.defines.set(key, value);
					this.updateShaderSource();
				}
			}else {
				this.removeDefine(key);
			}
		}

		removeDefine(key){
			this.defines.delete(key);
		}

		updateShaderSource () {

			let vs = Shaders['pointcloud.vs'];
			let fs = Shaders['pointcloud.fs'];
			let definesString = this.getDefines();

			let vsVersionIndex = vs.indexOf("#version ");
			let fsVersionIndex = fs.indexOf("#version ");

			if(vsVersionIndex >= 0){
				vs = vs.replace(/(#version .*)/, `$1\n${definesString}`);
			}else {
				vs = `${definesString}\n${vs}`;
			}

			if(fsVersionIndex >= 0){
				fs = fs.replace(/(#version .*)/, `$1\n${definesString}`);
			}else {
				fs = `${definesString}\n${fs}`;
			}

			this.vertexShader = vs;
			this.fragmentShader = fs;

			if (this.opacity === 1.0) {
				this.blending = THREE.NoBlending;
				this.transparent = false;
				this.depthTest = true;
				this.depthWrite = true;
				this.depthFunc = THREE.LessEqualDepth;
			} else if (this.opacity < 1.0 && !this.useEDL) {
				this.blending = THREE.AdditiveBlending;
				this.transparent = true;
				this.depthTest = false;
				this.depthWrite = true;
				this.depthFunc = THREE.AlwaysDepth;
			}

			if (this.weighted) {
				this.blending = THREE.AdditiveBlending;
				this.transparent = true;
				this.depthTest = true;
				this.depthWrite = false;
			}

			this.needsUpdate = true;
		}

		getDefines () {
			let defines = [];

			if (this.pointSizeType === PointSizeType.FIXED) {
				defines.push('#define fixed_point_size');
			} else if (this.pointSizeType === PointSizeType.ATTENUATED) {
				defines.push('#define attenuated_point_size');
			} else if (this.pointSizeType === PointSizeType.ADAPTIVE) {
				defines.push('#define adaptive_point_size');
			}

			if (this.shape === PointShape.SQUARE) {
				defines.push('#define square_point_shape');
			} else if (this.shape === PointShape.CIRCLE) {
				defines.push('#define circle_point_shape');
			} else if (this.shape === PointShape.PARABOLOID) {
				defines.push('#define paraboloid_point_shape');
			}

			if (this._useEDL) {
				defines.push('#define use_edl');
			}

			if(this.activeAttributeName){
				let attributeName = this.activeAttributeName.replace(/[^a-zA-Z0-9]/g, '_');

				defines.push(`#define color_type_${attributeName}`);
			}
			
			if(this._treeType === TreeType.OCTREE){
				defines.push('#define tree_type_octree');
			}else if(this._treeType === TreeType.KDTREE){
				defines.push('#define tree_type_kdtree');
			}

			if (this.weighted) {
				defines.push('#define weighted_splats');
			}

			for(let [key, value] of this.defines){
				defines.push(value);
			}

			return defines.join("\n");
		}

		setClipBoxes (clipBoxes) {
			if (!clipBoxes) {
				return;
			}

			let doUpdate = (this.clipBoxes.length !== clipBoxes.length) && (clipBoxes.length === 0 || this.clipBoxes.length === 0);

			this.uniforms.clipBoxCount.value = this.clipBoxes.length;
			this.clipBoxes = clipBoxes;

			if (doUpdate) {
				this.updateShaderSource();
			}

			this.uniforms.clipBoxes.value = new Float32Array(this.clipBoxes.length * 16);

			for (let i = 0; i < this.clipBoxes.length; i++) {
				let box = clipBoxes[i];

				this.uniforms.clipBoxes.value.set(box.inverse.elements, 16 * i);
			}

			for (let i = 0; i < this.uniforms.clipBoxes.value.length; i++) {
				if (Number.isNaN(this.uniforms.clipBoxes.value[i])) {
					this.uniforms.clipBoxes.value[i] = Infinity;
				}
			}
		}

		setClipPolygons(clipPolygons, maxPolygonVertices) {
			if(!clipPolygons){
				return;
			}

			this.clipPolygons = clipPolygons;

			let doUpdate = (this.clipPolygons.length !== clipPolygons.length);

			if(doUpdate){
				this.updateShaderSource();
			}
		}
		
		get gradient(){
			return this._gradient;
		}

		set gradient (value) {
			if (this._gradient !== value) {
				this._gradient = value;
				this.gradientTexture = PointCloudMaterial.generateGradientTexture(this._gradient);
				this.uniforms.gradient.value = this.gradientTexture;
			}
		}

		get matcap(){
			return this._matcap;
		}

		set matcap (value) {
			if (this._matcap !== value) {
				this._matcap = value;
				this.matcapTexture = Potree.PointCloudMaterial.generateMatcapTexture(this._matcap);
				this.uniforms.matcapTextureUniform.value = this.matcapTexture;
			}
		}
		get useOrthographicCamera() {
			return this.uniforms.useOrthographicCamera.value;
		}

		set useOrthographicCamera(value) {
			if(this.uniforms.useOrthographicCamera.value !== value){
				this.uniforms.useOrthographicCamera.value = value;
			}
		}
		get backfaceCulling() {
			return this.uniforms.backfaceCulling.value;
		}

		set backfaceCulling(value) {
			if(this.uniforms.backfaceCulling.value !== value){
				this.uniforms.backfaceCulling.value = value;
				this.dispatchEvent({type: 'backface_changed', target: this});
			}
		}

		recomputeClassification () {
			const classification = this.classification;
			const data = this.classificationTexture.image.data;

			let width = 256;
			const black = [1, 1, 1, 1];

			let valuesChanged = false;

			for (let i = 0; i < width; i++) {

				let color;
				let visible = true;

				if (classification[i]) {
					color = classification[i].color;
					visible = classification[i].visible;
				} else if (classification[i % 32]) {
					color = classification[i % 32].color;
					visible = classification[i % 32].visible;
				} else if(classification.DEFAULT) {
					color = classification.DEFAULT.color;
					visible = classification.DEFAULT.visible;
				}else {
					color = black;
				}

				const r = parseInt(255 * color[0]);
				const g = parseInt(255 * color[1]);
				const b = parseInt(255 * color[2]);
				const a = visible ? parseInt(255 * color[3]) : 0;


				if(data[4 * i + 0] !== r){
					data[4 * i + 0] = r;
					valuesChanged = true;
				}

				if(data[4 * i + 1] !== g){
					data[4 * i + 1] = g;
					valuesChanged = true;
				}

				if(data[4 * i + 2] !== b){
					data[4 * i + 2] = b;
					valuesChanged = true;
				}

				if(data[4 * i + 3] !== a){
					data[4 * i + 3] = a;
					valuesChanged = true;
				}
			}

			if(valuesChanged){
				this.classificationTexture.needsUpdate = true;

				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get spacing () {
			return this.uniforms.spacing.value;
		}

		set spacing (value) {
			if (this.uniforms.spacing.value !== value) {
				this.uniforms.spacing.value = value;
			}
		}

		get useClipBox () {
			return this._useClipBox;
		}

		set useClipBox (value) {
			if (this._useClipBox !== value) {
				this._useClipBox = value;
				this.updateShaderSource();
			}
		}

		get clipTask(){
			return this.uniforms.clipTask.value;
		}

		set clipTask(mode){
			this.uniforms.clipTask.value = mode;
		}

		get elevationGradientRepat(){
			return this.uniforms.elevationGradientRepat.value;
		}

		set elevationGradientRepat(mode){
			this.uniforms.elevationGradientRepat.value = mode;
		}

		get clipMethod(){
			return this.uniforms.clipMethod.value;
		}

		set clipMethod(mode){
			this.uniforms.clipMethod.value = mode;
		}

		get weighted(){
			return this._weighted;
		}

		set weighted (value) {
			if (this._weighted !== value) {
				this._weighted = value;
				this.updateShaderSource();
			}
		}

		get fov () {
			return this.uniforms.fov.value;
		}

		set fov (value) {
			if (this.uniforms.fov.value !== value) {
				this.uniforms.fov.value = value;
				// this.updateShaderSource();
			}
		}

		get screenWidth () {
			return this.uniforms.screenWidth.value;
		}

		set screenWidth (value) {
			if (this.uniforms.screenWidth.value !== value) {
				this.uniforms.screenWidth.value = value;
				// this.updateShaderSource();
			}
		}

		get screenHeight () {
			return this.uniforms.screenHeight.value;
		}

		set screenHeight (value) {
			if (this.uniforms.screenHeight.value !== value) {
				this.uniforms.screenHeight.value = value;
				// this.updateShaderSource();
			}
		}

		get near () {
			return this.uniforms.near.value;
		}

		set near (value) {
			if (this.uniforms.near.value !== value) {
				this.uniforms.near.value = value;
			}
		}

		get far () {
			return this.uniforms.far.value;
		}

		set far (value) {
			if (this.uniforms.far.value !== value) {
				this.uniforms.far.value = value;
			}
		}
		
		get opacity(){
			return this.uniforms.uOpacity.value;
		}

		set opacity (value) {
			if (this.uniforms && this.uniforms.uOpacity) {
				if (this.uniforms.uOpacity.value !== value) {
					this.uniforms.uOpacity.value = value;
					this.updateShaderSource();
					this.dispatchEvent({
						type: 'opacity_changed',
						target: this
					});
					this.dispatchEvent({
						type: 'material_property_changed',
						target: this
					});
				}
			}
		}

		get activeAttributeName(){
			return this._activeAttributeName;
		}

		set activeAttributeName(value){
			if (this._activeAttributeName !== value) {
				this._activeAttributeName = value;

				this.updateShaderSource();
				this.dispatchEvent({
					type: 'active_attribute_changed',
					target: this
				});

				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get pointSizeType () {
			return this._pointSizeType;
		}

		set pointSizeType (value) {
			if (this._pointSizeType !== value) {
				this._pointSizeType = value;
				this.updateShaderSource();
				this.dispatchEvent({
					type: 'point_size_type_changed',
					target: this
				});
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get useEDL(){
			return this._useEDL;
		}

		set useEDL (value) {
			if (this._useEDL !== value) {
				this._useEDL = value;
				this.updateShaderSource();
			}
		}

		get color () {
			return this.uniforms.uColor.value;
		}

		set color (value) {
			if (!this.uniforms.uColor.value.equals(value)) {
				this.uniforms.uColor.value.copy(value);
				
				this.dispatchEvent({
					type: 'color_changed',
					target: this
				});
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get shape () {
			return this._shape;
		}

		set shape (value) {
			if (this._shape !== value) {
				this._shape = value;
				this.updateShaderSource();
				this.dispatchEvent({type: 'point_shape_changed', target: this});
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get treeType () {
			return this._treeType;
		}

		set treeType (value) {
			if (this._treeType !== value) {
				this._treeType = value;
				this.updateShaderSource();
			}
		}

		get bbSize () {
			return this.uniforms.bbSize.value;
		}

		set bbSize (value) {
			this.uniforms.bbSize.value = value;
		}

		get size () {
			return this.uniforms.size.value;
		}

		set size (value) {
			if (this.uniforms.size.value !== value) {
				this.uniforms.size.value = value;

				this.dispatchEvent({
					type: 'point_size_changed',
					target: this
				});
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get minSize(){
			return this.uniforms.minSize.value;
		}

		set minSize(value){
			if (this.uniforms.minSize.value !== value) {
				this.uniforms.minSize.value = value;

				this.dispatchEvent({
					type: 'point_size_changed',
					target: this
				});
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get elevationRange () {
			return this.uniforms.elevationRange.value;
		}

		set elevationRange (value) {
			let changed = this.uniforms.elevationRange.value[0] !== value[0]
				|| this.uniforms.elevationRange.value[1] !== value[1];

			if(changed){
				this.uniforms.elevationRange.value = value;

				this._defaultElevationRangeChanged = true;

				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get heightMin () {
			return this.uniforms.elevationRange.value[0];
		}

		set heightMin (value) {
			this.elevationRange = [value, this.elevationRange[1]];
		}

		get heightMax () {
			return this.uniforms.elevationRange.value[1];
		}

		set heightMax (value) {
			this.elevationRange = [this.elevationRange[0], value];
		}

		get transition () {
			return this.uniforms.transition.value;
		}

		set transition (value) {
			this.uniforms.transition.value = value;
		}

		get intensityRange () {
			return this.uniforms.intensityRange.value;
		}

		set intensityRange (value) {
			if (!(value instanceof Array && value.length === 2)) {
				return;
			}

			if (value[0] === this.uniforms.intensityRange.value[0] &&
				value[1] === this.uniforms.intensityRange.value[1]) {
				return;
			}

			this.uniforms.intensityRange.value = value;

			this._defaultIntensityRangeChanged = true;

			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}

		get intensityGamma () {
			return this.uniforms.intensity_gbc.value[0];
		}

		set intensityGamma (value) {
			if (this.uniforms.intensity_gbc.value[0] !== value) {
				this.uniforms.intensity_gbc.value[0] = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get intensityContrast () {
			return this.uniforms.intensity_gbc.value[2];
		}

		set intensityContrast (value) {
			if (this.uniforms.intensity_gbc.value[2] !== value) {
				this.uniforms.intensity_gbc.value[2] = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get intensityBrightness () {
			return this.uniforms.intensity_gbc.value[1];
		}

		set intensityBrightness (value) {
			if (this.uniforms.intensity_gbc.value[1] !== value) {
				this.uniforms.intensity_gbc.value[1] = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get rgbGamma () {
			return this.uniforms.uRGB_gbc.value[0];
		}

		set rgbGamma (value) {
			if (this.uniforms.uRGB_gbc.value[0] !== value) {
				this.uniforms.uRGB_gbc.value[0] = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get rgbContrast () {
			return this.uniforms.uRGB_gbc.value[2];
		}

		set rgbContrast (value) {
			if (this.uniforms.uRGB_gbc.value[2] !== value) {
				this.uniforms.uRGB_gbc.value[2] = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get rgbBrightness () {
			return this.uniforms.uRGB_gbc.value[1];
		}

		set rgbBrightness (value) {
			if (this.uniforms.uRGB_gbc.value[1] !== value) {
				this.uniforms.uRGB_gbc.value[1] = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		
		get extraGamma () {
			return this.uniforms.uExtraGammaBrightContr.value[0];
		}

		set extraGamma (value) {
			if (this.uniforms.uExtraGammaBrightContr.value[0] !== value) {
				this.uniforms.uExtraGammaBrightContr.value[0] = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get extraBrightness () {
			return this.uniforms.uExtraGammaBrightContr.value[1];
		}

		set extraBrightness (value) {
			if (this.uniforms.uExtraGammaBrightContr.value[1] !== value) {
				this.uniforms.uExtraGammaBrightContr.value[1] = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get extraContrast () {
			return this.uniforms.uExtraGammaBrightContr.value[2];
		}

		set extraContrast (value) {
			if (this.uniforms.uExtraGammaBrightContr.value[2] !== value) {
				this.uniforms.uExtraGammaBrightContr.value[2] = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		getRange(attributeName){
			return this.ranges.get(attributeName);
		}

		setRange(attributeName, newRange){

			let rangeChanged = false;

			let oldRange = this.ranges.get(attributeName);

			if(oldRange != null && newRange != null){
				rangeChanged = oldRange[0] !== newRange[0] || oldRange[1] !== newRange[1];
			}else {
				rangeChanged = true;
			}

			this.ranges.set(attributeName, newRange);

			if(rangeChanged){
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get extraRange () {
			return this.uniforms.uExtraRange.value;
		}

		set extraRange (value) {
			if (!(value instanceof Array && value.length === 2)) {
				return;
			}

			if (value[0] === this.uniforms.uExtraRange.value[0] &&
				value[1] === this.uniforms.uExtraRange.value[1]) {
				return;
			}

			this.uniforms.uExtraRange.value = value;

			this._defaultExtraRangeChanged = true;

			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}

		get weightRGB () {
			return this.uniforms.wRGB.value;
		}

		set weightRGB (value) {
			if(this.uniforms.wRGB.value !== value){
				this.uniforms.wRGB.value = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get weightIntensity () {
			return this.uniforms.wIntensity.value;
		}

		set weightIntensity (value) {
			if(this.uniforms.wIntensity.value !== value){
				this.uniforms.wIntensity.value = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get weightElevation () {
			return this.uniforms.wElevation.value;
		}

		set weightElevation (value) {
			if(this.uniforms.wElevation.value !== value){
				this.uniforms.wElevation.value = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get weightClassification () {
			return this.uniforms.wClassification.value;
		}

		set weightClassification (value) {
			if(this.uniforms.wClassification.value !== value){
				this.uniforms.wClassification.value = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get weightReturnNumber () {
			return this.uniforms.wReturnNumber.value;
		}

		set weightReturnNumber (value) {
			if(this.uniforms.wReturnNumber.value !== value){
				this.uniforms.wReturnNumber.value = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		get weightSourceID () {
			return this.uniforms.wSourceID.value;
		}

		set weightSourceID (value) {
			if(this.uniforms.wSourceID.value !== value){
				this.uniforms.wSourceID.value = value;
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}

		static generateGradientTexture (gradient) {
			let size = 64;

			// create canvas
			let canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;

			// get context
			let context = canvas.getContext('2d');

			// draw gradient
			context.rect(0, 0, size, size);
			let ctxGradient = context.createLinearGradient(0, 0, size, size);

			for (let i = 0; i < gradient.length; i++) {
				let step = gradient[i];

				ctxGradient.addColorStop(step[0], '#' + step[1].getHexString());
			}

			context.fillStyle = ctxGradient;
			context.fill();
			
			//let texture = new THREE.Texture(canvas);
			let texture = new THREE.CanvasTexture(canvas);
			texture.needsUpdate = true;
			
			texture.minFilter = THREE.LinearFilter;
			texture.wrap = THREE.RepeatWrapping;
			texture.repeat = 2;
			// textureImage = texture.image;

			return texture;
		}
		
		static generateMatcapTexture (matcap) {
		var url = new URL(Potree.resourcePath + "/textures/matcap/" + matcap).href;
		let texture = new THREE.TextureLoader().load( url );
			texture.magFilter = texture.minFilter = THREE.LinearFilter; 
			texture.needsUpdate = true;
			// PotreeConverter_1.6_2018_07_29_windows_x64\PotreeConverter.exe autzen_xyzrgbXYZ_ascii.xyz -f xyzrgbXYZ -a RGB NORMAL -o autzen_xyzrgbXYZ_ascii_a -p index --overwrite
			// Switch matcap texture on the fly : viewer.scene.pointclouds[0].material.matcap = 'matcap1.jpg'; 
			// For non power of 2, use LinearFilter and dont generate mipmaps, For power of 2, use NearestFilter and generate mipmaps : matcap2.jpg 1 2 8 11 12 13
			return texture; 
		}

		static generateMatcapTexture (matcap) {
		var url = new URL(Potree.resourcePath + "/textures/matcap/" + matcap).href;
		let texture = new THREE.TextureLoader().load( url );
			texture.magFilter = texture.minFilter = THREE.LinearFilter; 
			texture.needsUpdate = true;
			// PotreeConverter_1.6_2018_07_29_windows_x64\PotreeConverter.exe autzen_xyzrgbXYZ_ascii.xyz -f xyzrgbXYZ -a RGB NORMAL -o autzen_xyzrgbXYZ_ascii_a -p index --overwrite
			// Switch matcap texture on the fly : viewer.scene.pointclouds[0].material.matcap = 'matcap1.jpg'; 
			// For non power of 2, use LinearFilter and dont generate mipmaps, For power of 2, use NearestFilter and generate mipmaps : matcap2.jpg 1 2 8 11 12 13
			return texture; 
		}

		disableEvents(){
			if(this._hiddenListeners === undefined){
				this._hiddenListeners = this._listeners;
				this._listeners = {};
			}
		};

		enableEvents(){
			this._listeners = this._hiddenListeners;
			this._hiddenListeners = undefined;
		};

		// copyFrom(from){

		// 	var a = 10;

		// 	for(let name of Object.keys(this.uniforms)){
		// 		this.uniforms[name].value = from.uniforms[name].value;
		// 	}
		// }

		// copy(from){
		// 	this.copyFrom(from);
		// }

	}

	class PointCloudOctreeNode extends PointCloudTreeNode {
		constructor () {
			super();

			//this.children = {};
			this.children = [];
			this.sceneNode = null;
			this.octree = null;
		}

		getNumPoints () {
			return this.geometryNode.numPoints;
		}

		isLoaded () {
			return true;
		}

		isTreeNode () {
			return true;
		}

		isGeometryNode () {
			return false;
		}

		getLevel () {
			return this.geometryNode.level;
		}

		getBoundingSphere () {
			return this.geometryNode.boundingSphere;
		}

		getBoundingBox () {
			return this.geometryNode.boundingBox;
		}

		getChildren () {
			let children = [];

			for (let i = 0; i < 8; i++) {
				if (this.children[i]) {
					children.push(this.children[i]);
				}
			}

			return children;
		}

		getPointsInBox(boxNode){

			if(!this.sceneNode){
				return null;
			}

			let buffer = this.geometryNode.buffer;

			let posOffset = buffer.offset("position");
			let stride = buffer.stride;
			let view = new DataView(buffer.data);

			let worldToBox = new THREE.Matrix4().getInverse(boxNode.matrixWorld);
			let objectToBox = new THREE.Matrix4().multiplyMatrices(worldToBox, this.sceneNode.matrixWorld);

			let inBox = [];

			let pos = new THREE.Vector4();
			for(let i = 0; i < buffer.numElements; i++){
				let x = view.getFloat32(i * stride + posOffset + 0, true);
				let y = view.getFloat32(i * stride + posOffset + 4, true);
				let z = view.getFloat32(i * stride + posOffset + 8, true);

				pos.set(x, y, z, 1);
				pos.applyMatrix4(objectToBox);

				if(-0.5 < pos.x && pos.x < 0.5){
					if(-0.5 < pos.y && pos.y < 0.5){
						if(-0.5 < pos.z && pos.z < 0.5){
							pos.set(x, y, z, 1).applyMatrix4(this.sceneNode.matrixWorld);
							inBox.push(new THREE.Vector3(pos.x, pos.y, pos.z));
						}
					}
				}
			}

			return inBox;
		}

		get name () {
			return this.geometryNode.name;
		}
	};

	class PointCloudOctree extends PointCloudTree {
		constructor (geometry, material) {
			super();

			this.pointBudget = Infinity;
			this.pcoGeometry = geometry;
			this.boundingBox = this.pcoGeometry.boundingBox;
			this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());
			this.material = material || new PointCloudMaterial();
			this.visiblePointsTarget = 2 * 1000 * 1000;
			this.minimumNodePixelSize = 150;
			this.level = 0;
			this.position.copy(geometry.offset);
			this.updateMatrix();

			{
				let attributeName = "rgba";
				if(this.pcoGeometry.pointAttributes.attributes.length > 1){
					attributeName = this.pcoGeometry.pointAttributes.attributes[1].name;
				}
				this.material.activeAttributeName = attributeName;
			}

			this.showBoundingBox = false;
			this.boundingBoxNodes = [];
			this.loadQueue = [];
			this.visibleBounds = new THREE.Box3();
			this.visibleNodes = [];
			this.visibleGeometry = [];
			this.generateDEM = false;
			this.profileRequests = [];
			this.name = '';
			this._visible = true;

			{
				let box = [this.pcoGeometry.tightBoundingBox, this.getBoundingBoxWorld()]
					.find(v => v !== undefined);

				this.updateMatrixWorld(true);
				box = Utils.computeTransformedBoundingBox(box, this.matrixWorld);

				let bMin = box.min.z;
				let bMax = box.max.z;
				this.material.heightMin = bMin;
				this.material.heightMax = bMax;
			}

			// TODO read projection from file instead
			this.projection = geometry.projection;
			this.fallbackProjection = geometry.fallbackProjection;

			this.root = this.pcoGeometry.root;
		}

		setName (name) {
			if (this.name !== name) {
				this.name = name;
				this.dispatchEvent({type: 'name_changed', name: name, pointcloud: this});
			}
		}

		getName () {
			return this.name;
		}

		getAttribute(name){

			const attribute = this.pcoGeometry.pointAttributes.attributes.find(a => a.name === name);

			if(attribute){
				return attribute;
			}else {
				return null;
			}
		}

		getAttributes(){
			return this.pcoGeometry.pointAttributes;
		}

		toTreeNode (geometryNode, parent) {
			let node = new PointCloudOctreeNode();

			// if(geometryNode.name === "r40206"){
			//	console.log("creating node for r40206");
			// }
			let sceneNode = new THREE.Points(geometryNode.geometry, this.material);
			sceneNode.name = geometryNode.name;
			sceneNode.position.copy(geometryNode.boundingBox.min);
			sceneNode.frustumCulled = false;
			sceneNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
				if (material.program) {
					_this.getContext().useProgram(material.program.program);

					if (material.program.getUniforms().map.level) {
						let level = geometryNode.getLevel();
						material.uniforms.level.value = level;
						material.program.getUniforms().map.level.setValue(_this.getContext(), level);
					}

					if (this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart) {
						let vnStart = this.visibleNodeTextureOffsets.get(node);
						material.uniforms.vnStart.value = vnStart;
						material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
					}

					if (material.program.getUniforms().map.pcIndex) {
						let i = node.pcIndex ? node.pcIndex : this.visibleNodes.indexOf(node);
						material.uniforms.pcIndex.value = i;
						material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), i);
					}
				}
			};

			// { // DEBUG
			//	let sg = new THREE.SphereGeometry(1, 16, 16);
			//	let sm = new THREE.MeshNormalMaterial();
			//	let s = new THREE.Mesh(sg, sm);
			//	s.scale.set(5, 5, 5);
			//	s.position.copy(geometryNode.mean)
			//		.add(this.position)
			//		.add(geometryNode.boundingBox.min);
			//
			//	viewer.scene.scene.add(s);
			// }

			node.geometryNode = geometryNode;
			node.sceneNode = sceneNode;
			node.pointcloud = this;
			node.children = [];
			//for (let key in geometryNode.children) {
			//	node.children[key] = geometryNode.children[key];
			//}
			for(let i = 0; i < 8; i++){
				node.children[i] = geometryNode.children[i];
			}

			if (!parent) {
				this.root = node;
				this.add(sceneNode);
			} else {
				let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
				parent.sceneNode.add(sceneNode);
				parent.children[childIndex] = node;
			}

			let disposeListener = function () {
				let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
				parent.sceneNode.remove(node.sceneNode);
				parent.children[childIndex] = geometryNode;
			};
			geometryNode.oneTimeDisposeHandlers.push(disposeListener);

			return node;
		}

		updateVisibleBounds () {
			let leafNodes = [];
			for (let i = 0; i < this.visibleNodes.length; i++) {
				let node = this.visibleNodes[i];
				let isLeaf = true;

				for (let j = 0; j < node.children.length; j++) {
					let child = node.children[j];
					if (child instanceof PointCloudOctreeNode) {
						isLeaf = isLeaf && !child.sceneNode.visible;
					} else if (child instanceof PointCloudOctreeGeometryNode) {
						isLeaf = true;
					}
				}

				if (isLeaf) {
					leafNodes.push(node);
				}
			}

			this.visibleBounds.min = new THREE.Vector3(Infinity, Infinity, Infinity);
			this.visibleBounds.max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
			for (let i = 0; i < leafNodes.length; i++) {
				let node = leafNodes[i];

				this.visibleBounds.expandByPoint(node.getBoundingBox().min);
				this.visibleBounds.expandByPoint(node.getBoundingBox().max);
			}
		}

		updateMaterial (material, visibleNodes, camera, renderer) {
			material.fov = camera.fov * (Math.PI / 180);
			material.screenWidth = renderer.domElement.clientWidth;
			material.screenHeight = renderer.domElement.clientHeight;
			material.spacing = this.pcoGeometry.spacing * Math.max(this.scale.x, this.scale.y, this.scale.z);
			material.near = camera.near;
			material.far = camera.far;
			material.uniforms.octreeSize.value = this.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;
		}

		computeVisibilityTextureData(nodes, camera){

			if(Potree.measureTimings) performance.mark("computeVisibilityTextureData-start");

			let data = new Uint8Array(nodes.length * 4);
			let visibleNodeTextureOffsets = new Map();

			// copy array
			nodes = nodes.slice();

			// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
			let sort = function (a, b) {
				let na = a.geometryNode.name;
				let nb = b.geometryNode.name;
				if (na.length !== nb.length) return na.length - nb.length;
				if (na < nb) return -1;
				if (na > nb) return 1;
				return 0;
			};
			nodes.sort(sort);

			// code sample taken from three.js src/math/Ray.js
			let v1 = new THREE.Vector3();
			let intersectSphereBack = (ray, sphere) => {
				v1.subVectors( sphere.center, ray.origin );
				let tca = v1.dot( ray.direction );
				let d2 = v1.dot( v1 ) - tca * tca;
				let radius2 = sphere.radius * sphere.radius;

				if(d2 > radius2){
					return null;
				}

				let thc = Math.sqrt( radius2 - d2 );

				// t1 = second intersect point - exit point on back of sphere
				let t1 = tca + thc;

				if(t1 < 0 ){
					return null;
				}

				return t1;
			};

			let lodRanges = new Map();
			let leafNodeLodRanges = new Map();

			let bBox = new THREE.Box3();
			let bSphere = new THREE.Sphere();
			let worldDir = new THREE.Vector3();
			let cameraRay = new THREE.Ray(camera.position, camera.getWorldDirection(worldDir));

			let nodeMap = new Map();
			let offsetsToChild = new Array(nodes.length).fill(Infinity);

			for(let i = 0; i < nodes.length; i++){
				let node = nodes[i];

				nodeMap.set(node.name, node);
				visibleNodeTextureOffsets.set(node, i);

				if(i > 0){
					let index = parseInt(node.name.slice(-1));
					let parentName = node.name.slice(0, -1);
					let parent = nodeMap.get(parentName);
					let parentOffset = visibleNodeTextureOffsets.get(parent);

					let parentOffsetToChild = (i - parentOffset);

					offsetsToChild[parentOffset] = Math.min(offsetsToChild[parentOffset], parentOffsetToChild);

					data[parentOffset * 4 + 0] = data[parentOffset * 4 + 0] | (1 << index);
					data[parentOffset * 4 + 1] = (offsetsToChild[parentOffset] >> 8);
					data[parentOffset * 4 + 2] = (offsetsToChild[parentOffset] % 256);
				}

				// data[i * 4 + 3] = node.geometryNode.nodeType === 1 ? 1 : 0;
				// data[i * 4 + 3] = node.name.length - 1;

				let density = node.geometryNode.density;
				
				if(typeof density === "number"){
					let lodOffset = Math.log2(density) / 2 - 1.5;

					let offsetUint8 = (lodOffset + 10) * 10;

					data[i * 4 + 3] = offsetUint8;
				}else {
					data[i * 4 + 3] = 100;
				}

			}

			var a = 10;

			if(Potree.measureTimings){
				performance.mark("computeVisibilityTextureData-end");
				performance.measure("render.computeVisibilityTextureData", "computeVisibilityTextureData-start", "computeVisibilityTextureData-end");
			}

			return {
				data: data,
				offsets: visibleNodeTextureOffsets
			};
		}

		nodeIntersectsProfile (node, profile) {
			let bbWorld = node.boundingBox.clone().applyMatrix4(this.matrixWorld);
			let bsWorld = bbWorld.getBoundingSphere(new THREE.Sphere());

			let intersects = false;

			for (let i = 0; i < profile.points.length - 1; i++) {

				let start = new THREE.Vector3(profile.points[i + 0].x, profile.points[i + 0].y, bsWorld.center.z);
				let end = new THREE.Vector3(profile.points[i + 1].x, profile.points[i + 1].y, bsWorld.center.z);

				let closest = new THREE.Line3(start, end).closestPointToPoint(bsWorld.center, true, new THREE.Vector3());
				let distance = closest.distanceTo(bsWorld.center);

				intersects = intersects || (distance < (bsWorld.radius + profile.width));
			}

			//console.log(`${node.name}: ${intersects}`);

			return intersects;
		}

		deepestNodeAt(position){
			
			const toObjectSpace = new THREE.Matrix4().getInverse(this.matrixWorld);

			const objPos = position.clone().applyMatrix4(toObjectSpace);

			let current = this.root;
			while(true){

				let containingChild = null;

				for(const child of current.children){

					if(child !== undefined){
						if(child.getBoundingBox().containsPoint(objPos)){
							containingChild = child;
						}
					}
				}

				if(containingChild !== null && containingChild instanceof PointCloudOctreeNode){
					current = containingChild;
				}else {
					break;
				}
			}

			const deepest = current;

			return deepest;
		}

		nodesOnRay (nodes, ray) {
			let nodesOnRay = [];

			let _ray = ray.clone();
			for (let i = 0; i < nodes.length; i++) {
				let node = nodes[i];
				// let inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
				// let sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
				let sphere = node.getBoundingSphere().clone().applyMatrix4(this.matrixWorld);

				if (_ray.intersectsSphere(sphere)) {
					nodesOnRay.push(node);
				}
			}

			return nodesOnRay;
		}

		updateMatrixWorld (force) {
			if (this.matrixAutoUpdate === true) this.updateMatrix();

			if (this.matrixWorldNeedsUpdate === true || force === true) {
				if (!this.parent) {
					this.matrixWorld.copy(this.matrix);
				} else {
					this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
				}

				this.matrixWorldNeedsUpdate = false;

				force = true;
			}
		}

		hideDescendants (object) {
			let stack = [];
			for (let i = 0; i < object.children.length; i++) {
				let child = object.children[i];
				if (child.visible) {
					stack.push(child);
				}
			}

			while (stack.length > 0) {
				let object = stack.shift();

				object.visible = false;

				for (let i = 0; i < object.children.length; i++) {
					let child = object.children[i];
					if (child.visible) {
						stack.push(child);
					}
				}
			}
		}

		moveToOrigin () {
			this.position.set(0, 0, 0);
			this.updateMatrixWorld(true);
			let box = this.boundingBox;
			let transform = this.matrixWorld;
			let tBox = Utils.computeTransformedBoundingBox(box, transform);
			this.position.set(0, 0, 0).sub(tBox.getCenter(new THREE.Vector3()));
		};

		moveToGroundPlane () {
			this.updateMatrixWorld(true);
			let box = this.boundingBox;
			let transform = this.matrixWorld;
			let tBox = Utils.computeTransformedBoundingBox(box, transform);
			this.position.y += -tBox.min.y;
		};

		getBoundingBoxWorld () {
			this.updateMatrixWorld(true);
			let box = this.boundingBox;
			let transform = this.matrixWorld;
			let tBox = Utils.computeTransformedBoundingBox(box, transform);

			return tBox;
		};

		/**
		 * returns points inside the profile points
		 *
		 * maxDepth:		search points up to the given octree depth
		 *
		 *
		 * The return value is an array with all segments of the profile path
		 *	let segment = {
		 *		start:	THREE.Vector3,
		 *		end:	THREE.Vector3,
		 *		points: {}
		 *		project: function()
		 *	};
		 *
		 * The project() function inside each segment can be used to transform
		 * that segments point coordinates to line up along the x-axis.
		 *
		 *
		 */
		getPointsInProfile (profile, maxDepth, callback) {
			if (callback) {
				let request = new Potree.ProfileRequest(this, profile, maxDepth, callback);
				this.profileRequests.push(request);

				return request;
			}

			let points = {
				segments: [],
				boundingBox: new THREE.Box3(),
				projectedBoundingBox: new THREE.Box2()
			};

			// evaluate segments
			for (let i = 0; i < profile.points.length - 1; i++) {
				let start = profile.points[i];
				let end = profile.points[i + 1];
				let ps = this.getProfile(start, end, profile.width, maxDepth);

				let segment = {
					start: start,
					end: end,
					points: ps,
					project: null
				};

				points.segments.push(segment);

				points.boundingBox.expandByPoint(ps.boundingBox.min);
				points.boundingBox.expandByPoint(ps.boundingBox.max);
			}

			// add projection functions to the segments
			let mileage = new THREE.Vector3();
			for (let i = 0; i < points.segments.length; i++) {
				let segment = points.segments[i];
				let start = segment.start;
				let end = segment.end;

				let project = (function (_start, _end, _mileage, _boundingBox) {
					let start = _start;
					let end = _end;
					let mileage = _mileage;
					let boundingBox = _boundingBox;

					let xAxis = new THREE.Vector3(1, 0, 0);
					let dir = new THREE.Vector3().subVectors(end, start);
					dir.y = 0;
					dir.normalize();
					let alpha = Math.acos(xAxis.dot(dir));
					if (dir.z > 0) {
						alpha = -alpha;
					}

					return function (position) {
						let toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -boundingBox.min.y, -start.z);
						let alignWithX = new THREE.Matrix4().makeRotationY(-alpha);
						let applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

						let pos = position.clone();
						pos.applyMatrix4(toOrigin);
						pos.applyMatrix4(alignWithX);
						pos.applyMatrix4(applyMileage);

						return pos;
					};
				}(start, end, mileage.clone(), points.boundingBox.clone()));

				segment.project = project;

				mileage.x += new THREE.Vector3(start.x, 0, start.z).distanceTo(new THREE.Vector3(end.x, 0, end.z));
				mileage.y += end.y - start.y;
			}

			points.projectedBoundingBox.min.x = 0;
			points.projectedBoundingBox.min.y = points.boundingBox.min.y;
			points.projectedBoundingBox.max.x = mileage.x;
			points.projectedBoundingBox.max.y = points.boundingBox.max.y;

			return points;
		}

		/**
		 * returns points inside the given profile bounds.
		 *
		 * start:
		 * end:
		 * width:
		 * depth:		search points up to the given octree depth
		 * callback:	if specified, points are loaded before searching
		 *
		 *
		 */
		getProfile (start, end, width, depth, callback) {
			let request = new Potree.ProfileRequest(start, end, width, depth, callback);
			this.profileRequests.push(request);
		};

		getVisibleExtent () {
			return this.visibleBounds.applyMatrix4(this.matrixWorld);
		};

		intersectsPoint(position){

			let rootAvailable = this.pcoGeometry.root && this.pcoGeometry.root.geometry;

			if(!rootAvailable){
				return false;
			}

			if(typeof this.signedDistanceField === "undefined"){

				const resolution = 32;
				const field = new Float32Array(resolution ** 3).fill(Infinity);

				const positions = this.pcoGeometry.root.geometry.attributes.position;
				const boundingBox = this.boundingBox;

				const n = positions.count;

				for(let i = 0; i < n; i = i + 3){
					const x = positions.array[3 * i + 0];
					const y = positions.array[3 * i + 1];
					const z = positions.array[3 * i + 2];

					const ix = parseInt(Math.min(resolution * (x / boundingBox.max.x), resolution - 1));
					const iy = parseInt(Math.min(resolution * (y / boundingBox.max.y), resolution - 1));
					const iz = parseInt(Math.min(resolution * (z / boundingBox.max.z), resolution - 1));

					const index = ix + iy * resolution + iz * resolution * resolution;

					field[index] = 0;
				}

				const sdf = {
					resolution: resolution,
					field: field,
				};

				this.signedDistanceField = sdf;
			}


			{
				const sdf = this.signedDistanceField;
				const boundingBox = this.boundingBox;

				const toObjectSpace = new THREE.Matrix4().getInverse(this.matrixWorld);

				const objPos = position.clone().applyMatrix4(toObjectSpace);

				const resolution = sdf.resolution;
				const ix = parseInt(resolution * (objPos.x / boundingBox.max.x));
				const iy = parseInt(resolution * (objPos.y / boundingBox.max.y));
				const iz = parseInt(resolution * (objPos.z / boundingBox.max.z));

				if(ix < 0 || iy < 0 || iz < 0){
					return false;
				}
				if(ix >= resolution || iy >= resolution || iz >= resolution){
					return false;
				}

				const index = ix + iy * resolution + iz * resolution * resolution;

				const value = sdf.field[index];

				if(value === 0){
					return true;
				}

			}

			return false;

		}

		/**
		 *
		 *
		 *
		 * params.pickWindowSize:	Look for points inside a pixel window of this size.
		 *							Use odd values: 1, 3, 5, ...
		 *
		 *
		 * TODO: only draw pixels that are actually read with readPixels().
		 *
		 */
		pick(viewer, camera, ray, params = {}){

			let renderer = viewer.renderer;
			let pRenderer = viewer.pRenderer;

			performance.mark("pick-start");

			let getVal = (a, b) => a !== undefined ? a : b;

			let pickWindowSize = getVal(params.pickWindowSize, 17);
			let pickOutsideClipRegion = getVal(params.pickOutsideClipRegion, false);

			pickWindowSize = 65;

			let size = renderer.getSize(new THREE.Vector2());

			let width = Math.ceil(getVal(params.width, size.width));
			let height = Math.ceil(getVal(params.height, size.height));

			let pointSizeType = getVal(params.pointSizeType, this.material.pointSizeType);
			let pointSize = getVal(params.pointSize, this.material.size);

			let nodes = this.nodesOnRay(this.visibleNodes, ray);

			if (nodes.length === 0) {
				return null;
			}

			if (!this.pickState) {
				let scene = new THREE.Scene();

				let material = new Potree.PointCloudMaterial();
				material.activeAttributeName = "indices";

				let renderTarget = new THREE.WebGLRenderTarget(
					1, 1,
					{ minFilter: THREE.LinearFilter,
						magFilter: THREE.NearestFilter,
						format: THREE.RGBAFormat }
				);

				this.pickState = {
					renderTarget: renderTarget,
					material: material,
					scene: scene
				};
			};

			let pickState = this.pickState;
			let pickMaterial = pickState.material;

			{ // update pick material
				pickMaterial.pointSizeType = pointSizeType;
				//pickMaterial.shape = this.material.shape;
				pickMaterial.shape = Potree.PointShape.PARABOLOID;

				pickMaterial.uniforms.uFilterReturnNumberRange.value = this.material.uniforms.uFilterReturnNumberRange.value;
				pickMaterial.uniforms.uFilterNumberOfReturnsRange.value = this.material.uniforms.uFilterNumberOfReturnsRange.value;
				pickMaterial.uniforms.uFilterGPSTimeClipRange.value = this.material.uniforms.uFilterGPSTimeClipRange.value;
				pickMaterial.uniforms.uFilterPointSourceIDClipRange.value = this.material.uniforms.uFilterPointSourceIDClipRange.value;

				pickMaterial.activeAttributeName = "indices";

				pickMaterial.size = pointSize;
				pickMaterial.uniforms.minSize.value = this.material.uniforms.minSize.value;
				pickMaterial.uniforms.maxSize.value = this.material.uniforms.maxSize.value;
				pickMaterial.classification = this.material.classification;
				pickMaterial.recomputeClassification();

				if(params.pickClipped){
					pickMaterial.clipBoxes = this.material.clipBoxes;
					pickMaterial.uniforms.clipBoxes = this.material.uniforms.clipBoxes;
					if(this.material.clipTask === Potree.ClipTask.HIGHLIGHT){
						pickMaterial.clipTask = Potree.ClipTask.NONE;
					}else {
						pickMaterial.clipTask = this.material.clipTask;
					}
					pickMaterial.clipMethod = this.material.clipMethod;
				}else {
					pickMaterial.clipBoxes = [];
				}

				this.updateMaterial(pickMaterial, nodes, camera, renderer);
			}

			pickState.renderTarget.setSize(width, height);

			let pixelPos = new THREE.Vector2(params.x, params.y);

			let gl = renderer.getContext();
			gl.enable(gl.SCISSOR_TEST);
			gl.scissor(
				parseInt(pixelPos.x - (pickWindowSize - 1) / 2),
				parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
				parseInt(pickWindowSize), parseInt(pickWindowSize));


			renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
			renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
			renderer.state.setBlending(THREE.NoBlending);

			{ // RENDER
				renderer.setRenderTarget(pickState.renderTarget);
				gl.clearColor(0, 0, 0, 0);
				renderer.clear(true, true, true);

				let tmp = this.material;
				this.material = pickMaterial;

				pRenderer.renderOctree(this, nodes, camera, pickState.renderTarget);

				this.material = tmp;
			}

			let clamp = (number, min, max) => Math.min(Math.max(min, number), max);

			let x = parseInt(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width));
			let y = parseInt(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height));
			let w = parseInt(Math.min(x + pickWindowSize, width) - x);
			let h = parseInt(Math.min(y + pickWindowSize, height) - y);

			let pixelCount = w * h;
			let buffer = new Uint8Array(4 * pixelCount);

			gl.readPixels(x, y, pickWindowSize, pickWindowSize, gl.RGBA, gl.UNSIGNED_BYTE, buffer);

			renderer.setRenderTarget(null);
			renderer.state.reset();
			renderer.setScissorTest(false);
			gl.disable(gl.SCISSOR_TEST);

			let pixels = buffer;
			let ibuffer = new Uint32Array(buffer.buffer);

			// find closest hit inside pixelWindow boundaries
			let min = Number.MAX_VALUE;
			let hits = [];
			for (let u = 0; u < pickWindowSize; u++) {
				for (let v = 0; v < pickWindowSize; v++) {
					let offset = (u + v * pickWindowSize);
					let distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

					let pcIndex = pixels[4 * offset + 3];
					pixels[4 * offset + 3] = 0;
					let pIndex = ibuffer[offset];

					if(!(pcIndex === 0 && pIndex === 0) && (pcIndex !== undefined) && (pIndex !== undefined)){
						let hit = {
							pIndex: pIndex,
							pcIndex: pcIndex,
							distanceToCenter: distance
						};

						if(params.all){
							hits.push(hit);
						}else {
							if(hits.length > 0){
								if(distance < hits[0].distanceToCenter){
									hits[0] = hit;
								}
							}else {
								hits.push(hit);
							}
						}


					}
				}
			}

			//DEBUG: show panel with pick image
			// {
			// 	let img = Utils.pixelsArrayToImage(buffer, w, h);
			// 	let screenshot = img.src;
			
			// 	if(!this.debugDIV){
			// 		this.debugDIV = $(`
			// 			<div id="pickDebug"
			// 			style="position: absolute;
			// 			right: 400px; width: 300px;
			// 			bottom: 44px; width: 300px;
			// 			z-index: 1000;
			// 			"></div>`);
			// 		$(document.body).append(this.debugDIV);
			// 	}
			
			// 	this.debugDIV.empty();
			// 	this.debugDIV.append($(`<img src="${screenshot}"
			// 		style="transform: scaleY(-1); width: 300px"/>`));
			// 	//$(this.debugWindow.document).append($(`<img src="${screenshot}"/>`));
			// 	//this.debugWindow.document.write('<img src="'+screenshot+'"/>');
			// }


			for(let hit of hits){
				let point = {};

				if (!nodes[hit.pcIndex]) {
					return null;
				}

				let node = nodes[hit.pcIndex];
				let pc = node.sceneNode;
				let geometry = node.geometryNode.geometry;

				for(let attributeName in geometry.attributes){
					let attribute = geometry.attributes[attributeName];

					if (attributeName === 'position') {
						let x = attribute.array[3 * hit.pIndex + 0];
						let y = attribute.array[3 * hit.pIndex + 1];
						let z = attribute.array[3 * hit.pIndex + 2];

						let position = new THREE.Vector3(x, y, z);
						position.applyMatrix4(pc.matrixWorld);

						point[attributeName] = position;
					} else if (attributeName === 'indices') {

					} else {

						let values = attribute.array.slice(attribute.itemSize * hit.pIndex, attribute.itemSize * (hit.pIndex + 1)) ;

						if(attribute.potree){
							const {scale, offset} = attribute.potree;
							values = values.map(v => v / scale + offset);
						}

						point[attributeName] = values;

						//debugger;
						//if (values.itemSize === 1) {
						//	point[attribute.name] = values.array[hit.pIndex];
						//} else {
						//	let value = [];
						//	for (let j = 0; j < values.itemSize; j++) {
						//		value.push(values.array[values.itemSize * hit.pIndex + j]);
						//	}
						//	point[attribute.name] = value;
						//}
					}

				}

				hit.point = point;
			}

			performance.mark("pick-end");
			performance.measure("pick", "pick-start", "pick-end");

			if(params.all){
				return hits.map(hit => hit.point);
			}else {
				if(hits.length === 0){
					return null;
				}else {
					return hits[0].point;
					//let sorted = hits.sort( (a, b) => a.distanceToCenter - b.distanceToCenter);

					//return sorted[0].point;
				}
			}

		};

		* getFittedBoxGen(boxNode){
			let start = performance.now();

			let shrinkedLocalBounds = new THREE.Box3();
			let worldToBox = new THREE.Matrix4().getInverse(boxNode.matrixWorld);

			for(let node of this.visibleNodes){
				if(!node.sceneNode){
					continue;
				}

				let buffer = node.geometryNode.buffer;

				let posOffset = buffer.offset("position");
				let stride = buffer.stride;
				let view = new DataView(buffer.data);

				let objectToBox = new THREE.Matrix4().multiplyMatrices(worldToBox, node.sceneNode.matrixWorld);

				let pos = new THREE.Vector4();
				for(let i = 0; i < buffer.numElements; i++){
					let x = view.getFloat32(i * stride + posOffset + 0, true);
					let y = view.getFloat32(i * stride + posOffset + 4, true);
					let z = view.getFloat32(i * stride + posOffset + 8, true);

					pos.set(x, y, z, 1);
					pos.applyMatrix4(objectToBox);

					if(-0.5 < pos.x && pos.x < 0.5){
						if(-0.5 < pos.y && pos.y < 0.5){
							if(-0.5 < pos.z && pos.z < 0.5){
								shrinkedLocalBounds.expandByPoint(pos);
							}
						}
					}
				}

				yield;
			}

			let fittedPosition = shrinkedLocalBounds.getCenter(new THREE.Vector3()).applyMatrix4(boxNode.matrixWorld);

			let fitted = new THREE.Object3D();
			fitted.position.copy(fittedPosition);
			fitted.scale.copy(boxNode.scale);
			fitted.rotation.copy(boxNode.rotation);

			let ds = new THREE.Vector3().subVectors(shrinkedLocalBounds.max, shrinkedLocalBounds.min);
			fitted.scale.multiply(ds);

			let duration = performance.now() - start;
			console.log("duration: ", duration);

			yield fitted;
		}

		getFittedBox(boxNode, maxLevel = Infinity){

			maxLevel = Infinity;

			let start = performance.now();

			let shrinkedLocalBounds = new THREE.Box3();
			let worldToBox = new THREE.Matrix4().getInverse(boxNode.matrixWorld);

			for(let node of this.visibleNodes){
				if(!node.sceneNode || node.getLevel() > maxLevel){
					continue;
				}

				let buffer = node.geometryNode.buffer;

				let posOffset = buffer.offset("position");
				let stride = buffer.stride;
				let view = new DataView(buffer.data);

				let objectToBox = new THREE.Matrix4().multiplyMatrices(worldToBox, node.sceneNode.matrixWorld);

				let pos = new THREE.Vector4();
				for(let i = 0; i < buffer.numElements; i++){
					let x = view.getFloat32(i * stride + posOffset + 0, true);
					let y = view.getFloat32(i * stride + posOffset + 4, true);
					let z = view.getFloat32(i * stride + posOffset + 8, true);

					pos.set(x, y, z, 1);
					pos.applyMatrix4(objectToBox);

					if(-0.5 < pos.x && pos.x < 0.5){
						if(-0.5 < pos.y && pos.y < 0.5){
							if(-0.5 < pos.z && pos.z < 0.5){
								shrinkedLocalBounds.expandByPoint(pos);
							}
						}
					}
				}
			}

			let fittedPosition = shrinkedLocalBounds.getCenter(new THREE.Vector3()).applyMatrix4(boxNode.matrixWorld);

			let fitted = new THREE.Object3D();
			fitted.position.copy(fittedPosition);
			fitted.scale.copy(boxNode.scale);
			fitted.rotation.copy(boxNode.rotation);

			let ds = new THREE.Vector3().subVectors(shrinkedLocalBounds.max, shrinkedLocalBounds.min);
			fitted.scale.multiply(ds);

			let duration = performance.now() - start;
			console.log("duration: ", duration);

			return fitted;
		}

		get progress () {
			return this.visibleNodes.length / this.visibleGeometry.length;
		}

		find(name){
			let node = null;
			for(let char of name){
				if(char === "r"){
					node = this.root;
				}else {
					node = node.children[char];
				}
			}

			return node;
		}

		get visible(){
			return this._visible;
		}

		set visible(value){

			if(value !== this._visible){
				this._visible = value;

				this.dispatchEvent({type: 'visibility_changed', pointcloud: this});
			}

		}

	}

	class Points {
		
		constructor () {
			this.boundingBox = new THREE.Box3();
			this.numPoints = 0;
			this.data = {};
		}

		add (points) {
			let currentSize = this.numPoints;
			let additionalSize = points.numPoints;
			let newSize = currentSize + additionalSize;

			let thisAttributes = Object.keys(this.data);
			let otherAttributes = Object.keys(points.data);
			let attributes = new Set([...thisAttributes, ...otherAttributes]);

			for (let attribute of attributes) {
				if (thisAttributes.includes(attribute) && otherAttributes.includes(attribute)) {
					// attribute in both, merge
					let Type = this.data[attribute].constructor;
					let merged = new Type(this.data[attribute].length + points.data[attribute].length);
					merged.set(this.data[attribute], 0);
					merged.set(points.data[attribute], this.data[attribute].length);
					this.data[attribute] = merged;
				} else if (thisAttributes.includes(attribute) && !otherAttributes.includes(attribute)) {
					// attribute only in this; take over this and expand to new size
					let elementsPerPoint = this.data[attribute].length / this.numPoints;
					let Type = this.data[attribute].constructor;
					let expanded = new Type(elementsPerPoint * newSize);
					expanded.set(this.data[attribute], 0);
					this.data[attribute] = expanded;
				} else if (!thisAttributes.includes(attribute) && otherAttributes.includes(attribute)) {
					// attribute only in points to be added; take over new points and expand to new size
					let elementsPerPoint = points.data[attribute].length / points.numPoints;
					let Type = points.data[attribute].constructor;
					let expanded = new Type(elementsPerPoint * newSize);
					expanded.set(points.data[attribute], elementsPerPoint * currentSize);
					this.data[attribute] = expanded;
				}
			}

			this.numPoints = newSize;

			this.boundingBox.union(points.boundingBox);
		}
	}

	/**
	 *
	 * code adapted from three.js BoxHelper.js
	 * https://github.com/mrdoob/three.js/blob/dev/src/helpers/BoxHelper.js
	 *
	 * @author mrdoob / http://mrdoob.com/
	 * @author Mugen87 / http://github.com/Mugen87
	 * @author mschuetz / http://potree.org
	 */

	class Box3Helper extends THREE.LineSegments {
		constructor (box, color) {
			if (color === undefined) color = 0xffff00;

			let indices = new Uint16Array([ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ]);
			let positions = new Float32Array([
				box.min.x, box.min.y, box.min.z,
				box.max.x, box.min.y, box.min.z,
				box.max.x, box.min.y, box.max.z,
				box.min.x, box.min.y, box.max.z,
				box.min.x, box.max.y, box.min.z,
				box.max.x, box.max.y, box.min.z,
				box.max.x, box.max.y, box.max.z,
				box.min.x, box.max.y, box.max.z
			]);

			let geometry = new THREE.BufferGeometry();
			geometry.setIndex(new THREE.BufferAttribute(indices, 1));
			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));

			let material = new THREE.LineBasicMaterial({ color: color });

			super(geometry, material);
		}
	}

	function updatePointClouds(pointclouds, camera, renderer){

		for (let pointcloud of pointclouds) {
			let start = performance.now();

			for (let profileRequest of pointcloud.profileRequests) {
				profileRequest.update();

				let duration = performance.now() - start;
				if(duration > 5){
					break;
				}
			}

			let duration = performance.now() - start;
		}

		let result = updateVisibility(pointclouds, camera, renderer);

		for (let pointcloud of pointclouds) {
			pointcloud.updateMaterial(pointcloud.material, pointcloud.visibleNodes, camera, renderer);
			pointcloud.updateVisibleBounds();
		}

		exports.lru.freeMemory();

		return result;
	};



	function updateVisibilityStructures(pointclouds, camera, renderer) {
		let frustums = [];
		let camObjPositions = [];
		let priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

		for (let i = 0; i < pointclouds.length; i++) {
			let pointcloud = pointclouds[i];

			if (!pointcloud.initialized()) {
				continue;
			}

			pointcloud.numVisibleNodes = 0;
			pointcloud.numVisiblePoints = 0;
			pointcloud.deepestVisibleLevel = 0;
			pointcloud.visibleNodes = [];
			pointcloud.visibleGeometry = [];

			// frustum in object space
			camera.updateMatrixWorld();
			let frustum = new THREE.Frustum();
			let viewI = camera.matrixWorldInverse;
			let world = pointcloud.matrixWorld;
			
			// use close near plane for frustum intersection
			let frustumCam = camera.clone();
			frustumCam.near = Math.min(camera.near, 0.1);
			frustumCam.updateProjectionMatrix();
			let proj = camera.projectionMatrix;

			let fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
			frustum.setFromMatrix(fm);
			frustums.push(frustum);

			// camera position in object space
			let view = camera.matrixWorld;
			let worldI = new THREE.Matrix4().getInverse(world);
			let camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
			let camObjPos = new THREE.Vector3().setFromMatrixPosition(camMatrixObject);
			camObjPositions.push(camObjPos);

			if (pointcloud.visible && pointcloud.root !== null) {
				priorityQueue.push({pointcloud: i, node: pointcloud.root, weight: Number.MAX_VALUE});
			}

			// hide all previously visible nodes
			// if(pointcloud.root instanceof PointCloudOctreeNode){
			//	pointcloud.hideDescendants(pointcloud.root.sceneNode);
			// }
			if (pointcloud.root.isTreeNode()) {
				pointcloud.hideDescendants(pointcloud.root.sceneNode);
			}

			for (let j = 0; j < pointcloud.boundingBoxNodes.length; j++) {
				pointcloud.boundingBoxNodes[j].visible = false;
			}
		}

		return {
			'frustums': frustums,
			'camObjPositions': camObjPositions,
			'priorityQueue': priorityQueue
		};
	};


	function updateVisibility(pointclouds, camera, renderer){

		let numVisibleNodes = 0;
		let numVisiblePoints = 0;

		let numVisiblePointsInPointclouds = new Map(pointclouds.map(pc => [pc, 0]));

		let visibleNodes = [];
		let visibleGeometry = [];
		let unloadedGeometry = [];

		let lowestSpacing = Infinity;

		// calculate object space frustum and cam pos and setup priority queue
		let s = updateVisibilityStructures(pointclouds, camera, renderer);
		let frustums = s.frustums;
		let camObjPositions = s.camObjPositions;
		let priorityQueue = s.priorityQueue;

		let loadedToGPUThisFrame = 0;
		
		let domWidth = renderer.domElement.clientWidth;
		let domHeight = renderer.domElement.clientHeight;

		// check if pointcloud has been transformed
		// some code will only be executed if changes have been detected
		if(!Potree._pointcloudTransformVersion){
			Potree._pointcloudTransformVersion = new Map();
		}
		let pointcloudTransformVersion = Potree._pointcloudTransformVersion;
		for(let pointcloud of pointclouds){

			if(!pointcloud.visible){
				continue;
			}

			pointcloud.updateMatrixWorld();

			if(!pointcloudTransformVersion.has(pointcloud)){
				pointcloudTransformVersion.set(pointcloud, {number: 0, transform: pointcloud.matrixWorld.clone()});
			}else {
				let version = pointcloudTransformVersion.get(pointcloud);

				if(!version.transform.equals(pointcloud.matrixWorld)){
					version.number++;
					version.transform.copy(pointcloud.matrixWorld);

					pointcloud.dispatchEvent({
						type: "transformation_changed",
						target: pointcloud
					});
				}
			}
		}

		while (priorityQueue.size() > 0) {
			let element = priorityQueue.pop();
			let node = element.node;
			let parent = element.parent;
			let pointcloud = pointclouds[element.pointcloud];

			// { // restrict to certain nodes for debugging
			//	let allowedNodes = ["r", "r0", "r4"];
			//	if(!allowedNodes.includes(node.name)){
			//		continue;
			//	}
			// }

			let box = node.getBoundingBox();
			let frustum = frustums[element.pointcloud];
			let camObjPos = camObjPositions[element.pointcloud];

			let insideFrustum = frustum.intersectsBox(box);
			let maxLevel = pointcloud.maxLevel || Infinity;
			let level = node.getLevel();
			let visible = insideFrustum;
			visible = visible && !(numVisiblePoints + node.getNumPoints() > Potree.pointBudget);
			visible = visible && !(numVisiblePointsInPointclouds.get(pointcloud) + node.getNumPoints() > pointcloud.pointBudget);
			visible = visible && level < maxLevel;
			//visible = visible && node.name !== "r613";

			let clipBoxes = pointcloud.material.clipBoxes;
			if(true && clipBoxes.length > 0){

				//node.debug = false;

				let numIntersecting = 0;
				let numIntersectionVolumes = 0;

				//if(node.name === "r60"){
				//	var a = 10;
				//}

				for(let clipBox of clipBoxes){

					let pcWorldInverse = new THREE.Matrix4().getInverse(pointcloud.matrixWorld);
					let toPCObject = pcWorldInverse.multiply(clipBox.box.matrixWorld);

					let px = new THREE.Vector3(+0.5, 0, 0).applyMatrix4(pcWorldInverse);
					let nx = new THREE.Vector3(-0.5, 0, 0).applyMatrix4(pcWorldInverse);
					let py = new THREE.Vector3(0, +0.5, 0).applyMatrix4(pcWorldInverse);
					let ny = new THREE.Vector3(0, -0.5, 0).applyMatrix4(pcWorldInverse);
					let pz = new THREE.Vector3(0, 0, +0.5).applyMatrix4(pcWorldInverse);
					let nz = new THREE.Vector3(0, 0, -0.5).applyMatrix4(pcWorldInverse);

					let pxN = new THREE.Vector3().subVectors(nx, px).normalize();
					let nxN = pxN.clone().multiplyScalar(-1);
					let pyN = new THREE.Vector3().subVectors(ny, py).normalize();
					let nyN = pyN.clone().multiplyScalar(-1);
					let pzN = new THREE.Vector3().subVectors(nz, pz).normalize();
					let nzN = pzN.clone().multiplyScalar(-1);

					let pxPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(pxN, px);
					let nxPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(nxN, nx);
					let pyPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(pyN, py);
					let nyPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(nyN, ny);
					let pzPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(pzN, pz);
					let nzPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(nzN, nz);

					//if(window.debugdraw !== undefined && window.debugdraw === true && node.name === "r60"){

					//	Potree.utils.debugPlane(viewer.scene.scene, pxPlane, 1, 0xFF0000);
					//	Potree.utils.debugPlane(viewer.scene.scene, nxPlane, 1, 0x990000);
					//	Potree.utils.debugPlane(viewer.scene.scene, pyPlane, 1, 0x00FF00);
					//	Potree.utils.debugPlane(viewer.scene.scene, nyPlane, 1, 0x009900);
					//	Potree.utils.debugPlane(viewer.scene.scene, pzPlane, 1, 0x0000FF);
					//	Potree.utils.debugPlane(viewer.scene.scene, nzPlane, 1, 0x000099);

					//	Potree.utils.debugBox(viewer.scene.scene, box, new THREE.Matrix4(), 0x00FF00);
					//	Potree.utils.debugBox(viewer.scene.scene, box, pointcloud.matrixWorld, 0xFF0000);
					//	Potree.utils.debugBox(viewer.scene.scene, clipBox.box.boundingBox, clipBox.box.matrixWorld, 0xFF0000);

					//	window.debugdraw = false;
					//}

					let frustum = new THREE.Frustum(pxPlane, nxPlane, pyPlane, nyPlane, pzPlane, nzPlane);
					let intersects = frustum.intersectsBox(box);

					if(intersects){
						numIntersecting++;
					}
					numIntersectionVolumes++;
				}

				let insideAny = numIntersecting > 0;
				let insideAll = numIntersecting === numIntersectionVolumes;

				if(pointcloud.material.clipTask === ClipTask.SHOW_INSIDE){
					if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ANY && insideAny){
						//node.debug = true
					}else if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ALL && insideAll){
						//node.debug = true;
					}else {
						visible = false;
					}
				} else if(pointcloud.material.clipTask === ClipTask.SHOW_OUTSIDE){
					//if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ANY && !insideAny){
					//	//visible = true;
					//	let a = 10;
					//}else if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ALL && !insideAll){
					//	//visible = true;
					//	let a = 20;
					//}else{
					//	visible = false;
					//}
				}
				

			}

			// visible = ["r", "r0", "r06", "r060"].includes(node.name);
			// visible = ["r"].includes(node.name);

			if (node.spacing) {
				lowestSpacing = Math.min(lowestSpacing, node.spacing);
			} else if (node.geometryNode && node.geometryNode.spacing) {
				lowestSpacing = Math.min(lowestSpacing, node.geometryNode.spacing);
			}

			if (numVisiblePoints + node.getNumPoints() > Potree.pointBudget) {
				break;
			}

			if (!visible) {
				continue;
			}

			// TODO: not used, same as the declaration?
			// numVisibleNodes++;
			numVisiblePoints += node.getNumPoints();
			let numVisiblePointsInPointcloud = numVisiblePointsInPointclouds.get(pointcloud);
			numVisiblePointsInPointclouds.set(pointcloud, numVisiblePointsInPointcloud + node.getNumPoints());

			pointcloud.numVisibleNodes++;
			pointcloud.numVisiblePoints += node.getNumPoints();

			if (node.isGeometryNode() && (!parent || parent.isTreeNode())) {
				if (node.isLoaded() && loadedToGPUThisFrame < 2) {
					node = pointcloud.toTreeNode(node, parent);
					loadedToGPUThisFrame++;
				} else {
					unloadedGeometry.push(node);
					visibleGeometry.push(node);
				}
			}

			if (node.isTreeNode()) {
				exports.lru.touch(node.geometryNode);
				node.sceneNode.visible = true;
				node.sceneNode.material = pointcloud.material;

				visibleNodes.push(node);
				pointcloud.visibleNodes.push(node);

				if(node._transformVersion === undefined){
					node._transformVersion = -1;
				}
				let transformVersion = pointcloudTransformVersion.get(pointcloud);
				if(node._transformVersion !== transformVersion.number){
					node.sceneNode.updateMatrix();
					node.sceneNode.matrixWorld.multiplyMatrices(pointcloud.matrixWorld, node.sceneNode.matrix);	
					node._transformVersion = transformVersion.number;
				}

				if (pointcloud.showBoundingBox && !node.boundingBoxNode && node.getBoundingBox) {
					let boxHelper = new Box3Helper(node.getBoundingBox());
					boxHelper.matrixAutoUpdate = false;
					pointcloud.boundingBoxNodes.push(boxHelper);
					node.boundingBoxNode = boxHelper;
					node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
				} else if (pointcloud.showBoundingBox) {
					node.boundingBoxNode.visible = true;
					node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
				} else if (!pointcloud.showBoundingBox && node.boundingBoxNode) {
					node.boundingBoxNode.visible = false;
				}

				// if(node.boundingBoxNode !== undefined && exports.debug.allowedNodes !== undefined){
				// 	if(!exports.debug.allowedNodes.includes(node.name)){
				// 		node.boundingBoxNode.visible = false;
				// 	}
				// }
			}

			// add child nodes to priorityQueue
			let children = node.getChildren();
			for (let i = 0; i < children.length; i++) {
				let child = children[i];

				let weight = 0; 
				if(camera.isPerspectiveCamera){
					let sphere = child.getBoundingSphere();
					let center = sphere.center;
					//let distance = sphere.center.distanceTo(camObjPos);
					
					let dx = camObjPos.x - center.x;
					let dy = camObjPos.y - center.y;
					let dz = camObjPos.z - center.z;
					
					let dd = dx * dx + dy * dy + dz * dz;
					let distance = Math.sqrt(dd);
					
					
					let radius = sphere.radius;
					
					let fov = (camera.fov * Math.PI) / 180;
					let slope = Math.tan(fov / 2);
					let projFactor = (0.5 * domHeight) / (slope * distance);
					let screenPixelRadius = radius * projFactor;
					
					if(screenPixelRadius < pointcloud.minimumNodePixelSize){
						continue;
					}
				
					weight = screenPixelRadius;

					if(distance - radius < 0){
						weight = Number.MAX_VALUE;
					}
				} else {
					// TODO ortho visibility
					let bb = child.getBoundingBox();				
					let distance = child.getBoundingSphere().center.distanceTo(camObjPos);
					let diagonal = bb.max.clone().sub(bb.min).length();
					//weight = diagonal / distance;

					weight = diagonal;
				}

				priorityQueue.push({pointcloud: element.pointcloud, node: child, parent: node, weight: weight});
			}
		}// end priority queue loop

		{ // update DEM
			let maxDEMLevel = 4;
			let candidates = pointclouds
				.filter(p => (p.generateDEM && p.dem instanceof Potree.DEM));
			for (let pointcloud of candidates) {
				let updatingNodes = pointcloud.visibleNodes.filter(n => n.getLevel() <= maxDEMLevel);
				pointcloud.dem.update(updatingNodes);
			}
		}

		for (let i = 0; i < Math.min(Potree.maxNodesLoading, unloadedGeometry.length); i++) {
			unloadedGeometry[i].load();
		}

		return {
			visibleNodes: visibleNodes,
			numVisiblePoints: numVisiblePoints,
			lowestSpacing: lowestSpacing
		};
	};

	class PointCloudArena4DNode extends PointCloudTreeNode {
		constructor () {
			super();

			this.left = null;
			this.right = null;
			this.sceneNode = null;
			this.kdtree = null;
		}

		getNumPoints () {
			return this.geometryNode.numPoints;
		}

		isLoaded () {
			return true;
		}

		isTreeNode () {
			return true;
		}

		isGeometryNode () {
			return false;
		}

		getLevel () {
			return this.geometryNode.level;
		}

		getBoundingSphere () {
			return this.geometryNode.boundingSphere;
		}

		getBoundingBox () {
			return this.geometryNode.boundingBox;
		}

		toTreeNode (child) {
			let geometryNode = null;

			if (this.left === child) {
				geometryNode = this.left;
			} else if (this.right === child) {
				geometryNode = this.right;
			}

			if (!geometryNode.loaded) {
				return;
			}

			let node = new PointCloudArena4DNode();
			let sceneNode = THREE.PointCloud(geometryNode.geometry, this.kdtree.material);
			sceneNode.visible = false;

			node.kdtree = this.kdtree;
			node.geometryNode = geometryNode;
			node.sceneNode = sceneNode;
			node.parent = this;
			node.left = this.geometryNode.left;
			node.right = this.geometryNode.right;
		}

		getChildren () {
			let children = [];

			if (this.left) {
				children.push(this.left);
			}

			if (this.right) {
				children.push(this.right);
			}

			return children;
		}
	};

	class PointCloudArena4D$1 extends PointCloudTree{
		constructor (geometry) {
			super();

			this.root = null;
			if (geometry.root) {
				this.root = geometry.root;
			} else {
				geometry.addEventListener('hierarchy_loaded', () => {
					this.root = geometry.root;
				});
			}

			this.visiblePointsTarget = 2 * 1000 * 1000;
			this.minimumNodePixelSize = 150;

			this.position.sub(geometry.offset);
			this.updateMatrix();

			this.numVisibleNodes = 0;
			this.numVisiblePoints = 0;

			this.boundingBoxNodes = [];
			this.loadQueue = [];
			this.visibleNodes = [];

			this.pcoGeometry = geometry;
			this.boundingBox = this.pcoGeometry.boundingBox;
			this.boundingSphere = this.pcoGeometry.boundingSphere;
			this.material = new PointCloudMaterial({vertexColors: THREE.VertexColors, size: 0.05, treeType: TreeType.KDTREE});
			this.material.sizeType = PointSizeType.ATTENUATED;
			this.material.size = 0.05;
			this.profileRequests = [];
			this.name = '';
		}

		getBoundingBoxWorld () {
			this.updateMatrixWorld(true);
			let box = this.boundingBox;
			let transform = this.matrixWorld;
			let tBox = Utils.computeTransformedBoundingBox(box, transform);

			return tBox;
		};

		setName (name) {
			if (this.name !== name) {
				this.name = name;
				this.dispatchEvent({type: 'name_changed', name: name, pointcloud: this});
			}
		}

		getName () {
			return this.name;
		}

		getLevel () {
			return this.level;
		}

		toTreeNode (geometryNode, parent) {
			let node = new PointCloudArena4DNode();
			let sceneNode = new THREE.Points(geometryNode.geometry, this.material);

			sceneNode.frustumCulled = false;
			sceneNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
				if (material.program) {
					_this.getContext().useProgram(material.program.program);

					if (material.program.getUniforms().map.level) {
						let level = geometryNode.getLevel();
						material.uniforms.level.value = level;
						material.program.getUniforms().map.level.setValue(_this.getContext(), level);
					}

					if (this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart) {
						let vnStart = this.visibleNodeTextureOffsets.get(node);
						material.uniforms.vnStart.value = vnStart;
						material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
					}

					if (material.program.getUniforms().map.pcIndex) {
						let i = node.pcIndex ? node.pcIndex : this.visibleNodes.indexOf(node);
						material.uniforms.pcIndex.value = i;
						material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), i);
					}
				}
			};

			node.geometryNode = geometryNode;
			node.sceneNode = sceneNode;
			node.pointcloud = this;
			node.left = geometryNode.left;
			node.right = geometryNode.right;

			if (!parent) {
				this.root = node;
				this.add(sceneNode);
			} else {
				parent.sceneNode.add(sceneNode);

				if (parent.left === geometryNode) {
					parent.left = node;
				} else if (parent.right === geometryNode) {
					parent.right = node;
				}
			}

			let disposeListener = function () {
				parent.sceneNode.remove(node.sceneNode);

				if (parent.left === node) {
					parent.left = geometryNode;
				} else if (parent.right === node) {
					parent.right = geometryNode;
				}
			};
			geometryNode.oneTimeDisposeHandlers.push(disposeListener);

			return node;
		}

		updateMaterial (material, visibleNodes, camera, renderer) {
			material.fov = camera.fov * (Math.PI / 180);
			material.screenWidth = renderer.domElement.clientWidth;
			material.screenHeight = renderer.domElement.clientHeight;
			material.spacing = this.pcoGeometry.spacing;
			material.near = camera.near;
			material.far = camera.far;

			// reduce shader source updates by setting maxLevel slightly higher than actually necessary
			if (this.maxLevel > material.levels) {
				material.levels = this.maxLevel + 2;
			}

			// material.uniforms.octreeSize.value = this.boundingBox.size().x;
			let bbSize = this.boundingBox.getSize(new THREE.Vector3());
			material.bbSize = [bbSize.x, bbSize.y, bbSize.z];
		}

		updateVisibleBounds () {

		}

		hideDescendants (object) {
			let stack = [];
			for (let i = 0; i < object.children.length; i++) {
				let child = object.children[i];
				if (child.visible) {
					stack.push(child);
				}
			}

			while (stack.length > 0) {
				let child = stack.shift();

				child.visible = false;
				if (child.boundingBoxNode) {
					child.boundingBoxNode.visible = false;
				}

				for (let i = 0; i < child.children.length; i++) {
					let childOfChild = child.children[i];
					if (childOfChild.visible) {
						stack.push(childOfChild);
					}
				}
			}
		}

		updateMatrixWorld (force) {
			// node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );

			if (this.matrixAutoUpdate === true) this.updateMatrix();

			if (this.matrixWorldNeedsUpdate === true || force === true) {
				if (this.parent === undefined) {
					this.matrixWorld.copy(this.matrix);
				} else {
					this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
				}

				this.matrixWorldNeedsUpdate = false;

				force = true;
			}
		}

		nodesOnRay (nodes, ray) {
			let nodesOnRay = [];

			let _ray = ray.clone();
			for (let i = 0; i < nodes.length; i++) {
				let node = nodes[i];
				let sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
				// TODO Unused: let box = node.getBoundingBox().clone().applyMatrix4(node.sceneNode.matrixWorld);

				if (_ray.intersectsSphere(sphere)) {
					nodesOnRay.push(node);
				}
				// if(_ray.isIntersectionBox(box)){
				//	nodesOnRay.push(node);
				// }
			}

			return nodesOnRay;
		}

		pick(viewer, camera, ray, params = {}){

			let renderer = viewer.renderer;
			let pRenderer = viewer.pRenderer;

			performance.mark("pick-start");

			let getVal = (a, b) => a !== undefined ? a : b;

			let pickWindowSize = getVal(params.pickWindowSize, 17);
			let pickOutsideClipRegion = getVal(params.pickOutsideClipRegion, false);

			let size = renderer.getSize(new THREE.Vector2());

			let width = Math.ceil(getVal(params.width, size.width));
			let height = Math.ceil(getVal(params.height, size.height));

			let pointSizeType = getVal(params.pointSizeType, this.material.pointSizeType);
			let pointSize = getVal(params.pointSize, this.material.size);

			let nodes = this.nodesOnRay(this.visibleNodes, ray);

			if (nodes.length === 0) {
				return null;
			}

			if (!this.pickState) {
				let scene = new THREE.Scene();

				let material = new PointCloudMaterial();
				material.activeAttributeName = "indices";

				let renderTarget = new THREE.WebGLRenderTarget(
					1, 1,
					{ minFilter: THREE.LinearFilter,
						magFilter: THREE.NearestFilter,
						format: THREE.RGBAFormat }
				);

				this.pickState = {
					renderTarget: renderTarget,
					material: material,
					scene: scene
				};
			};

			let pickState = this.pickState;
			let pickMaterial = pickState.material;

			{ // update pick material
				pickMaterial.pointSizeType = pointSizeType;
				pickMaterial.shape = this.material.shape;

				pickMaterial.size = pointSize;
				pickMaterial.uniforms.minSize.value = this.material.uniforms.minSize.value;
				pickMaterial.uniforms.maxSize.value = this.material.uniforms.maxSize.value;
				pickMaterial.classification = this.material.classification;
				if(params.pickClipped){
					pickMaterial.clipBoxes = this.material.clipBoxes;
					if(this.material.clipTask === ClipTask.HIGHLIGHT){
						pickMaterial.clipTask = ClipTask.NONE;
					}else {
						pickMaterial.clipTask = this.material.clipTask;
					}
				}else {
					pickMaterial.clipBoxes = [];
				}
				
				this.updateMaterial(pickMaterial, nodes, camera, renderer);
			}

			pickState.renderTarget.setSize(width, height);

			let pixelPos = new THREE.Vector2(params.x, params.y);
			
			let gl = renderer.getContext();
			gl.enable(gl.SCISSOR_TEST);
			gl.scissor(
				parseInt(pixelPos.x - (pickWindowSize - 1) / 2),
				parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
				parseInt(pickWindowSize), parseInt(pickWindowSize));


			renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
			renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
			renderer.state.setBlending(THREE.NoBlending);

			renderer.clearTarget(pickState.renderTarget, true, true, true);

			{ // RENDER
				renderer.setRenderTarget(pickState.renderTarget);
				gl.clearColor(0, 0, 0, 0);
				renderer.clearTarget( pickState.renderTarget, true, true, true );
				
				let tmp = this.material;
				this.material = pickMaterial;
				
				pRenderer.renderOctree(this, nodes, camera, pickState.renderTarget);
				
				this.material = tmp;
			}

			let clamp = (number, min, max) => Math.min(Math.max(min, number), max);

			let x = parseInt(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width));
			let y = parseInt(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height));
			let w = parseInt(Math.min(x + pickWindowSize, width) - x);
			let h = parseInt(Math.min(y + pickWindowSize, height) - y);

			let pixelCount = w * h;
			let buffer = new Uint8Array(4 * pixelCount);
			
			gl.readPixels(x, y, pickWindowSize, pickWindowSize, gl.RGBA, gl.UNSIGNED_BYTE, buffer); 
			
			renderer.setRenderTarget(null);
			renderer.state.reset();
			renderer.setScissorTest(false);
			gl.disable(gl.SCISSOR_TEST);
			
			let pixels = buffer;
			let ibuffer = new Uint32Array(buffer.buffer);

			// find closest hit inside pixelWindow boundaries
			let min = Number.MAX_VALUE;
			let hits = [];
			for (let u = 0; u < pickWindowSize; u++) {
				for (let v = 0; v < pickWindowSize; v++) {
					let offset = (u + v * pickWindowSize);
					let distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

					let pcIndex = pixels[4 * offset + 3];
					pixels[4 * offset + 3] = 0;
					let pIndex = ibuffer[offset];

					if(!(pcIndex === 0 && pIndex === 0) && (pcIndex !== undefined) && (pIndex !== undefined)){
						let hit = {
							pIndex: pIndex,
							pcIndex: pcIndex,
							distanceToCenter: distance
						};

						if(params.all){
							hits.push(hit);
						}else {
							if(hits.length > 0){
								if(distance < hits[0].distanceToCenter){
									hits[0] = hit;
								}
							}else {
								hits.push(hit);
							}
						}

						
					}
				}
			}



			for(let hit of hits){
				let point = {};
			
				if (!nodes[hit.pcIndex]) {
					return null;
				}
			
				let node = nodes[hit.pcIndex];
				let pc = node.sceneNode;
				let geometry = node.geometryNode.geometry;
				
				for(let attributeName in geometry.attributes){
					let attribute = geometry.attributes[attributeName];
			
					if (attributeName === 'position') {
						let x = attribute.array[3 * hit.pIndex + 0];
						let y = attribute.array[3 * hit.pIndex + 1];
						let z = attribute.array[3 * hit.pIndex + 2];
						
						let position = new THREE.Vector3(x, y, z);
						position.applyMatrix4(pc.matrixWorld);
			
						point[attributeName] = position;
					} else if (attributeName === 'indices') {
			
					} else {
						//if (values.itemSize === 1) {
						//	point[attribute.name] = values.array[hit.pIndex];
						//} else {
						//	let value = [];
						//	for (let j = 0; j < values.itemSize; j++) {
						//		value.push(values.array[values.itemSize * hit.pIndex + j]);
						//	}
						//	point[attribute.name] = value;
						//}
					}
					
				}

				hit.point = point;
			}

			performance.mark("pick-end");
			performance.measure("pick", "pick-start", "pick-end");

			if(params.all){
				return hits.map(hit => hit.point);
			}else {
				if(hits.length === 0){
					return null;
				}else {
					return hits[0].point;
				}
			}
		}

		computeVisibilityTextureData(nodes){

			if(exports.measureTimings) performance.mark("computeVisibilityTextureData-start");

			let data = new Uint8Array(nodes.length * 3);
			let visibleNodeTextureOffsets = new Map();

			// copy array
			nodes = nodes.slice();

			// sort by level and number
			let sort = function (a, b) {
				let la = a.geometryNode.level;
				let lb = b.geometryNode.level;
				let na = a.geometryNode.number;
				let nb = b.geometryNode.number;
				if (la !== lb) return la - lb;
				if (na < nb) return -1;
				if (na > nb) return 1;
				return 0;
			};
			nodes.sort(sort);

			let visibleNodeNames = [];
			for (let i = 0; i < nodes.length; i++) {
				visibleNodeNames.push(nodes[i].geometryNode.number);
			}

			for (let i = 0; i < nodes.length; i++) {
				let node = nodes[i];

				visibleNodeTextureOffsets.set(node, i);

				let b1 = 0;	// children
				let b2 = 0;	// offset to first child
				let b3 = 0;	// split

				if (node.geometryNode.left && visibleNodeNames.indexOf(node.geometryNode.left.number) > 0) {
					b1 += 1;
					b2 = visibleNodeNames.indexOf(node.geometryNode.left.number) - i;
				}
				if (node.geometryNode.right && visibleNodeNames.indexOf(node.geometryNode.right.number) > 0) {
					b1 += 2;
					b2 = (b2 === 0) ? visibleNodeNames.indexOf(node.geometryNode.right.number) - i : b2;
				}

				if (node.geometryNode.split === 'X') {
					b3 = 1;
				} else if (node.geometryNode.split === 'Y') {
					b3 = 2;
				} else if (node.geometryNode.split === 'Z') {
					b3 = 4;
				}

				data[i * 3 + 0] = b1;
				data[i * 3 + 1] = b2;
				data[i * 3 + 2] = b3;
			}

			if(exports.measureTimings){
				performance.mark("computeVisibilityTextureData-end");
				performance.measure("render.computeVisibilityTextureData", "computeVisibilityTextureData-start", "computeVisibilityTextureData-end");
			}

			return {
				data: data,
				offsets: visibleNodeTextureOffsets
			};
		}

		get progress () {
			if (this.pcoGeometry.root) {
				return exports.numNodesLoading > 0 ? 0 : 1;
			} else {
				return 0;
			}
		}
	};

	// Copied from three.js: WebGLRenderer.js
	function paramThreeToGL(_gl, p) {

		let extension;

		if (p === THREE.RepeatWrapping) return _gl.REPEAT;
		if (p === THREE.ClampToEdgeWrapping) return _gl.CLAMP_TO_EDGE;
		if (p === THREE.MirroredRepeatWrapping) return _gl.MIRRORED_REPEAT;

		if (p === THREE.NearestFilter) return _gl.NEAREST;
		if (p === THREE.NearestMipMapNearestFilter) return _gl.NEAREST_MIPMAP_NEAREST;
		if (p === THREE.NearestMipMapLinearFilter) return _gl.NEAREST_MIPMAP_LINEAR;

		if (p === THREE.LinearFilter) return _gl.LINEAR;
		if (p === THREE.LinearMipMapNearestFilter) return _gl.LINEAR_MIPMAP_NEAREST;
		if (p === THREE.LinearMipMapLinearFilter) return _gl.LINEAR_MIPMAP_LINEAR;

		if (p === THREE.UnsignedByteType) return _gl.UNSIGNED_BYTE;
		if (p === THREE.UnsignedShort4444Type) return _gl.UNSIGNED_SHORT_4_4_4_4;
		if (p === THREE.UnsignedShort5551Type) return _gl.UNSIGNED_SHORT_5_5_5_1;
		if (p === THREE.UnsignedShort565Type) return _gl.UNSIGNED_SHORT_5_6_5;

		if (p === THREE.ByteType) return _gl.BYTE;
		if (p === THREE.ShortType) return _gl.SHORT;
		if (p === THREE.UnsignedShortType) return _gl.UNSIGNED_SHORT;
		if (p === THREE.IntType) return _gl.INT;
		if (p === THREE.UnsignedIntType) return _gl.UNSIGNED_INT;
		if (p === THREE.FloatType) return _gl.FLOAT;

		if (p === THREE.HalfFloatType) {

			extension = extensions.get('OES_texture_half_float');

			if (extension !== null) return extension.HALF_FLOAT_OES;

		}

		if (p === THREE.AlphaFormat) return _gl.ALPHA;
		if (p === THREE.RGBFormat) return _gl.RGB;
		if (p === THREE.RGBAFormat) return _gl.RGBA;
		if (p === THREE.LuminanceFormat) return _gl.LUMINANCE;
		if (p === THREE.LuminanceAlphaFormat) return _gl.LUMINANCE_ALPHA;
		if (p === THREE.DepthFormat) return _gl.DEPTH_COMPONENT;
		if (p === THREE.DepthStencilFormat) return _gl.DEPTH_STENCIL;

		if (p === THREE.AddEquation) return _gl.FUNC_ADD;
		if (p === THREE.SubtractEquation) return _gl.FUNC_SUBTRACT;
		if (p === THREE.ReverseSubtractEquation) return _gl.FUNC_REVERSE_SUBTRACT;

		if (p === THREE.ZeroFactor) return _gl.ZERO;
		if (p === THREE.OneFactor) return _gl.ONE;
		if (p === THREE.SrcColorFactor) return _gl.SRC_COLOR;
		if (p === THREE.OneMinusSrcColorFactor) return _gl.ONE_MINUS_SRC_COLOR;
		if (p === THREE.SrcAlphaFactor) return _gl.SRC_ALPHA;
		if (p === THREE.OneMinusSrcAlphaFactor) return _gl.ONE_MINUS_SRC_ALPHA;
		if (p === THREE.DstAlphaFactor) return _gl.DST_ALPHA;
		if (p === THREE.OneMinusDstAlphaFactor) return _gl.ONE_MINUS_DST_ALPHA;

		if (p === THREE.DstColorFactor) return _gl.DST_COLOR;
		if (p === THREE.OneMinusDstColorFactor) return _gl.ONE_MINUS_DST_COLOR;
		if (p === THREE.SrcAlphaSaturateFactor) return _gl.SRC_ALPHA_SATURATE;

		if (p === THREE.RGB_S3TC_DXT1_Format || p === RGBA_S3TC_DXT1_Format ||
			p === THREE.RGBA_S3TC_DXT3_Format || p === RGBA_S3TC_DXT5_Format) {

			extension = extensions.get('WEBGL_compressed_texture_s3tc');

			if (extension !== null) {

				if (p === THREE.RGB_S3TC_DXT1_Format) return extension.COMPRESSED_RGB_S3TC_DXT1_EXT;
				if (p === THREE.RGBA_S3TC_DXT1_Format) return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
				if (p === THREE.RGBA_S3TC_DXT3_Format) return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
				if (p === THREE.RGBA_S3TC_DXT5_Format) return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT;

			}

		}

		if (p === THREE.RGB_PVRTC_4BPPV1_Format || p === THREE.RGB_PVRTC_2BPPV1_Format ||
			p === THREE.RGBA_PVRTC_4BPPV1_Format || p === THREE.RGBA_PVRTC_2BPPV1_Format) {

			extension = extensions.get('WEBGL_compressed_texture_pvrtc');

			if (extension !== null) {

				if (p === THREE.RGB_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
				if (p === THREE.RGB_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
				if (p === THREE.RGBA_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
				if (p === THREE.RGBA_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;

			}

		}

		if (p === THREE.RGB_ETC1_Format) {

			extension = extensions.get('WEBGL_compressed_texture_etc1');

			if (extension !== null) return extension.COMPRESSED_RGB_ETC1_WEBGL;

		}

		if (p === THREE.MinEquation || p === THREE.MaxEquation) {

			extension = extensions.get('EXT_blend_minmax');

			if (extension !== null) {

				if (p === THREE.MinEquation) return extension.MIN_EXT;
				if (p === THREE.MaxEquation) return extension.MAX_EXT;

			}

		}

		if (p === UnsignedInt248Type) {

			extension = extensions.get('WEBGL_depth_texture');

			if (extension !== null) return extension.UNSIGNED_INT_24_8_WEBGL;

		}

		return 0;

	};

	let attributeLocations = {
		"position": {name: "position", location: 0},
		"color": {name: "color", location: 1},
		"rgba": {name: "color", location: 1},
		"intensity": {name: "intensity", location: 2},
		"classification": {name: "classification", location: 3},
		"returnNumber": {name: "returnNumber", location: 4},
		"return number": {name: "returnNumber", location: 4},
		"returns": {name: "returnNumber", location: 4},
		"numberOfReturns": {name: "numberOfReturns", location: 5},
		"number of returns": {name: "numberOfReturns", location: 5},
		"pointSourceID": {name: "pointSourceID", location: 6},
		"source id": {name: "pointSourceID", location: 6},
		"point source id": {name: "pointSourceID", location: 6},
		"indices": {name: "indices", location: 7},
		"normal": {name: "normal", location: 8},
		"spacing": {name: "spacing", location: 9},
		"gps-time":  {name: "gpsTime", location: 10},
		"aExtra":  {name: "aExtra", location: 11},
	};

	class Shader {

		constructor(gl, name, vsSource, fsSource) {
			this.gl = gl;
			this.name = name;
			this.vsSource = vsSource;
			this.fsSource = fsSource;

			this.cache = new Map();

			this.vs = null;
			this.fs = null;
			this.program = null;

			this.uniformLocations = {};
			this.attributeLocations = {};
			this.uniformBlockIndices = {};
			this.uniformBlocks = {};
			this.uniforms = {};

			this.update(vsSource, fsSource);
		}

		update(vsSource, fsSource) {
			this.vsSource = vsSource;
			this.fsSource = fsSource;

			this.linkProgram();
		}

		compileShader(shader, source){
			let gl = this.gl;

			gl.shaderSource(shader, source);

			gl.compileShader(shader);

			let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
			if (!success) {
				let info = gl.getShaderInfoLog(shader);
				let numberedSource = source.split("\n").map((a, i) => `${i + 1}`.padEnd(5) + a).join("\n");
				throw `could not compile shader ${this.name}: ${info}, \n${numberedSource}`;
			}
		}

		linkProgram() {

			const tStart = performance.now();

			let gl = this.gl;

			this.uniformLocations = {};
			this.attributeLocations = {};
			this.uniforms = {};

			gl.useProgram(null);

			let cached = this.cache.get(`${this.vsSource}, ${this.fsSource}`);
			if (cached) {
				this.program = cached.program;
				this.vs = cached.vs;
				this.fs = cached.fs;
				this.attributeLocations = cached.attributeLocations;
				this.uniformLocations = cached.uniformLocations;
				this.uniformBlocks = cached.uniformBlocks;
				this.uniforms = cached.uniforms;

				return;
			} else {

				this.vs = gl.createShader(gl.VERTEX_SHADER);
				this.fs = gl.createShader(gl.FRAGMENT_SHADER);
				this.program = gl.createProgram();

				for(let name of Object.keys(attributeLocations)){
					let location = attributeLocations[name].location;
					let glslName = attributeLocations[name].name;
					gl.bindAttribLocation(this.program, location, glslName);
				}

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
					throw `could not link program ${this.name}: ${info}`;
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
						this.uniforms[uniform.name] = {
							location: location,
							value: null,
						};
					}
				}

				// uniform blocks
				if(gl instanceof WebGL2RenderingContext){ 
					let numBlocks = gl.getProgramParameter(program, gl.ACTIVE_UNIFORM_BLOCKS);

					for (let i = 0; i < numBlocks; i++) {
						let blockName = gl.getActiveUniformBlockName(program, i);

						let blockIndex = gl.getUniformBlockIndex(program, blockName);

						this.uniformBlockIndices[blockName] = blockIndex;

						gl.uniformBlockBinding(program, blockIndex, blockIndex);
						let dataSize = gl.getActiveUniformBlockParameter(program, blockIndex, gl.UNIFORM_BLOCK_DATA_SIZE);

						let uBuffer = gl.createBuffer();	
						gl.bindBuffer(gl.UNIFORM_BUFFER, uBuffer);
						gl.bufferData(gl.UNIFORM_BUFFER, dataSize, gl.DYNAMIC_READ);

						gl.bindBufferBase(gl.UNIFORM_BUFFER, blockIndex, uBuffer);

						gl.bindBuffer(gl.UNIFORM_BUFFER, null);

						this.uniformBlocks[blockName] = {
							name: blockName,
							index: blockIndex,
							dataSize: dataSize,
							buffer: uBuffer
						};

					}
				}

				let cached = {
					program: this.program,
					vs: this.vs,
					fs: this.fs,
					attributeLocations: this.attributeLocations,
					uniformLocations: this.uniformLocations,
					uniforms: this.uniforms,
					uniformBlocks: this.uniformBlocks,
				};

				this.cache.set(`${this.vsSource}, ${this.fsSource}`, cached);
			}

			const tEnd = performance.now();
			const duration = tEnd - tStart;

			console.log(`shader compile duration: ${duration.toFixed(3)}`);


		}

		setUniformMatrix4(name, value) {
			const gl = this.gl;
			const location = this.uniformLocations[name];

			if (location == null) {
				return;
			}

			let tmp = new Float32Array(value.elements);
			gl.uniformMatrix4fv(location, false, tmp);
		}

		setUniform1f(name, value) {
			const gl = this.gl;
			const uniform = this.uniforms[name];

			if (uniform === undefined) {
				return;
			}

			if(uniform.value === value){
				return;
			}

			uniform.value = value;

			gl.uniform1f(uniform.location, value);
		}

		setUniformBoolean(name, value) {
			const gl = this.gl;
			const uniform = this.uniforms[name];

			if (uniform === undefined) {
				return;
			}

			if(uniform.value === value){
				return;
			}

			uniform.value = value;

			gl.uniform1i(uniform.location, value);
		}

		setUniformTexture(name, value) {
			const gl = this.gl;
			const location = this.uniformLocations[name];

			if (location == null) {
				return;
			}

			gl.uniform1i(location, value);
		}

		setUniform2f(name, value) {
			const gl = this.gl;
			const location = this.uniformLocations[name];

			if (location == null) {
				return;
			}

			gl.uniform2f(location, value[0], value[1]);
		}

		setUniform3f(name, value) {
			const gl = this.gl;
			const location = this.uniformLocations[name];

			if (location == null) {
				return;
			}

			gl.uniform3f(location, value[0], value[1], value[2]);
		}

		setUniform(name, value) {

			if (value.constructor === THREE.Matrix4) {
				this.setUniformMatrix4(name, value);
			} else if (typeof value === "number") {
				this.setUniform1f(name, value);
			} else if (typeof value === "boolean") {
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
				console.error("unhandled uniform type: ", name, value);
			}

		}


		setUniform1i(name, value) {
			let gl = this.gl;
			let location = this.uniformLocations[name];

			if (location == null) {
				return;
			}

			gl.uniform1i(location, value);
		}

	};

	class WebGLTexture {

		constructor(gl, texture) {
			this.gl = gl;

			this.texture = texture;
			this.id = gl.createTexture();

			this.target = gl.TEXTURE_2D;
			this.version = -1;

			this.update(texture);
		}

		update() {

			if (!this.texture.image) {
				this.version = this.texture.version;

				return;
			}

			let gl = this.gl;
			let texture = this.texture;

			if (this.version === texture.version) {
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
			let data;

			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, texture.flipY);
			gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
			gl.pixelStorei(gl.UNPACK_ALIGNMENT, texture.unpackAlignment);

			if (texture instanceof THREE.DataTexture) {
				data = texture.image.data;

				gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

				gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, paramThreeToGL(gl, texture.magFilter));
				gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, paramThreeToGL(gl, texture.minFilter));

				gl.texImage2D(this.target, level, internalFormat,
					width, height, border, srcFormat, srcType,
					data);
			} else if ((texture instanceof THREE.CanvasTexture) || (texture instanceof THREE.Texture)) {
				data = texture.image;

				gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, paramThreeToGL(gl, texture.wrapS));
				gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, paramThreeToGL(gl, texture.wrapT));

				gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, paramThreeToGL(gl, texture.magFilter));
				gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, paramThreeToGL(gl, texture.minFilter));

				gl.texImage2D(this.target, level, internalFormat,
					internalFormat, srcType, data);

				if (texture instanceof THREE.Texture) {gl.generateMipmap(gl.TEXTURE_2D);}
			}

			gl.bindTexture(this.target, null);

			this.version = texture.version;
		}

	};

	class WebGLBuffer {

		constructor() {
			this.numElements = 0;
			this.vao = null;
			this.vbos = new Map();
		}

	};

	class Renderer {

		constructor(threeRenderer) {
			this.threeRenderer = threeRenderer;
			this.gl = this.threeRenderer.getContext();

			this.buffers = new Map();
			this.shaders = new Map();
			this.textures = new Map();

			this.glTypeMapping = new Map();
			this.glTypeMapping.set(Float32Array, this.gl.FLOAT);
			this.glTypeMapping.set(Uint8Array, this.gl.UNSIGNED_BYTE);
			this.glTypeMapping.set(Uint16Array, this.gl.UNSIGNED_SHORT);

			this.toggle = 0;
		}

		deleteBuffer(geometry) {

			let gl = this.gl;
			let webglBuffer = this.buffers.get(geometry);
			if (webglBuffer != null) {
				for (let attributeName in geometry.attributes) {
					gl.deleteBuffer(webglBuffer.vbos.get(attributeName).handle);
				}
				this.buffers.delete(geometry);
			}
		}

		createBuffer(geometry){
			let gl = this.gl;
			let webglBuffer = new WebGLBuffer();
			webglBuffer.vao = gl.createVertexArray();
			webglBuffer.numElements = geometry.attributes.position.count;

			gl.bindVertexArray(webglBuffer.vao);

			for(let attributeName in geometry.attributes){
				let bufferAttribute = geometry.attributes[attributeName];

				let vbo = gl.createBuffer();
				gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
				gl.bufferData(gl.ARRAY_BUFFER, bufferAttribute.array, gl.STATIC_DRAW);

				let normalized = bufferAttribute.normalized;
				let type = this.glTypeMapping.get(bufferAttribute.array.constructor);

				if(attributeLocations[attributeName] === undefined){
					//attributeLocation = attributeLocations["aExtra"];
				}else {
					let attributeLocation = attributeLocations[attributeName].location;

					gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
					gl.enableVertexAttribArray(attributeLocation);
				}


				webglBuffer.vbos.set(attributeName, {
					handle: vbo,
					name: attributeName,
					count: bufferAttribute.count,
					itemSize: bufferAttribute.itemSize,
					type: geometry.attributes.position.array.constructor,
					version: 0
				});
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			gl.bindVertexArray(null);

			let disposeHandler = (event) => {
				this.deleteBuffer(geometry);
				geometry.removeEventListener("dispose", disposeHandler);
			};
			geometry.addEventListener("dispose", disposeHandler);

			return webglBuffer;
		}

		updateBuffer(geometry){
			let gl = this.gl;

			let webglBuffer = this.buffers.get(geometry);

			gl.bindVertexArray(webglBuffer.vao);

			for(let attributeName in geometry.attributes){
				let bufferAttribute = geometry.attributes[attributeName];

				let normalized = bufferAttribute.normalized;
				let type = this.glTypeMapping.get(bufferAttribute.array.constructor);

				let vbo = null;
				if(!webglBuffer.vbos.has(attributeName)){
					vbo = gl.createBuffer();

					webglBuffer.vbos.set(attributeName, {
						handle: vbo,
						name: attributeName,
						count: bufferAttribute.count,
						itemSize: bufferAttribute.itemSize,
						type: geometry.attributes.position.array.constructor,
						version: bufferAttribute.version
					});
				}else {
					vbo = webglBuffer.vbos.get(attributeName).handle;
					webglBuffer.vbos.get(attributeName).version = bufferAttribute.version;
				}

				gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
				gl.bufferData(gl.ARRAY_BUFFER, bufferAttribute.array, gl.STATIC_DRAW);

				if(attributeLocations[attributeName] === undefined){
					//attributeLocation = attributeLocations["aExtra"];
				}else {
					let attributeLocation = attributeLocations[attributeName].location;
					
					gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
					gl.enableVertexAttribArray(attributeLocation);
				}
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			gl.bindVertexArray(null);
		}

		traverse(scene) {

			let octrees = [];

			let stack = [scene];
			while (stack.length > 0) {

				let node = stack.pop();

				if (node instanceof PointCloudTree) {
					octrees.push(node);
					continue;
				}

				let visibleChildren = node.children.filter(c => c.visible);
				stack.push(...visibleChildren);

			}

			let result = {
				octrees: octrees
			};

			return result;
		}



		renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params) {

			if (exports.measureTimings) performance.mark("renderNodes-start");

			let gl = this.gl;

			let material = params.material ? params.material : octree.material;
			let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
			let view = camera.matrixWorldInverse;
			let worldView = new THREE.Matrix4();

			let mat4holder = new Float32Array(16);

			let i = 0;
			for (let node of nodes) {

				if(exports.debug.allowedNodes !== undefined){
					if(!exports.debug.allowedNodes.includes(node.name)){
						continue;
					}
				}

				let world = node.sceneNode.matrixWorld;
				worldView.multiplyMatrices(view, world);

				if (visibilityTextureData) {
					let vnStart = visibilityTextureData.offsets.get(node);
					shader.setUniform1f("uVNStart", vnStart);
				}


				let level = node.getLevel();

				if(node.debug){
					shader.setUniform("uDebug", true);
				}else {
					shader.setUniform("uDebug", false);
				}

				// let isLeaf = false;
				// if(node instanceof PointCloudOctreeNode){
				// 	isLeaf = Object.keys(node.children).length === 0;
				// }else if(node instanceof PointCloudArena4DNode){
				// 	isLeaf = node.geometryNode.isLeaf;
				// }
				// shader.setUniform("uIsLeafNode", isLeaf);

				// let isLeaf = node.children.filter(n => n != null).length === 0;
				// if(!isLeaf){
				// 	continue;
				// }


				// TODO consider passing matrices in an array to avoid uniformMatrix4fv overhead
				const lModel = shader.uniformLocations["modelMatrix"];
				if (lModel) {
					mat4holder.set(world.elements);
					gl.uniformMatrix4fv(lModel, false, mat4holder);
				}

				const lModelView = shader.uniformLocations["modelViewMatrix"];
				//mat4holder.set(worldView.elements);
				// faster then set in chrome 63
				for(let j = 0; j < 16; j++){
					mat4holder[j] = worldView.elements[j];
				}
				gl.uniformMatrix4fv(lModelView, false, mat4holder);

				{ // Clip Polygons
					if(material.clipPolygons && material.clipPolygons.length > 0){

						let clipPolygonVCount = [];
						let worldViewProjMatrices = [];

						for(let clipPolygon of material.clipPolygons){

							let view = clipPolygon.viewMatrix;
							let proj = clipPolygon.projMatrix;

							let worldViewProj = proj.clone().multiply(view).multiply(world);

							clipPolygonVCount.push(clipPolygon.markers.length);
							worldViewProjMatrices.push(worldViewProj);
						}

						let flattenedMatrices = [].concat(...worldViewProjMatrices.map(m => m.elements));

						let flattenedVertices = new Array(8 * 3 * material.clipPolygons.length);
						for(let i = 0; i < material.clipPolygons.length; i++){
							let clipPolygon = material.clipPolygons[i];
							for(let j = 0; j < clipPolygon.markers.length; j++){
								flattenedVertices[i * 24 + (j * 3 + 0)] = clipPolygon.markers[j].position.x;
								flattenedVertices[i * 24 + (j * 3 + 1)] = clipPolygon.markers[j].position.y;
								flattenedVertices[i * 24 + (j * 3 + 2)] = clipPolygon.markers[j].position.z;
							}
						}

						const lClipPolygonVCount = shader.uniformLocations["uClipPolygonVCount[0]"];
						gl.uniform1iv(lClipPolygonVCount, clipPolygonVCount);

						const lClipPolygonVP = shader.uniformLocations["uClipPolygonWVP[0]"];
						gl.uniformMatrix4fv(lClipPolygonVP, false, flattenedMatrices);

						const lClipPolygons = shader.uniformLocations["uClipPolygonVertices[0]"];
						gl.uniform3fv(lClipPolygons, flattenedVertices);

					}
				}


				//shader.setUniformMatrix4("modelMatrix", world);
				//shader.setUniformMatrix4("modelViewMatrix", worldView);
				shader.setUniform1f("uLevel", level);
				shader.setUniform1f("uNodeSpacing", node.geometryNode.estimatedSpacing);

				shader.setUniform1f("uPCIndex", i);
				// uBBSize

				if (shadowMaps.length > 0) {

					const lShadowMap = shader.uniformLocations["uShadowMap[0]"];

					shader.setUniform3f("uShadowColor", material.uniforms.uShadowColor.value);

					let bindingStart = 5;
					let bindingPoints = new Array(shadowMaps.length).fill(bindingStart).map((a, i) => (a + i));
					gl.uniform1iv(lShadowMap, bindingPoints);

					for (let i = 0; i < shadowMaps.length; i++) {
						let shadowMap = shadowMaps[i];
						let bindingPoint = bindingPoints[i];
						let glTexture = this.threeRenderer.properties.get(shadowMap.target.texture).__webglTexture;

						gl.activeTexture(gl[`TEXTURE${bindingPoint}`]);
						gl.bindTexture(gl.TEXTURE_2D, glTexture);
					}

					{

						let worldViewMatrices = shadowMaps
							.map(sm => sm.camera.matrixWorldInverse)
							.map(view => new THREE.Matrix4().multiplyMatrices(view, world));

						let flattenedMatrices = [].concat(...worldViewMatrices.map(c => c.elements));
						const lWorldView = shader.uniformLocations["uShadowWorldView[0]"];
						gl.uniformMatrix4fv(lWorldView, false, flattenedMatrices);
					}

					{
						let flattenedMatrices = [].concat(...shadowMaps.map(sm => sm.camera.projectionMatrix.elements));
						const lProj = shader.uniformLocations["uShadowProj[0]"];
						gl.uniformMatrix4fv(lProj, false, flattenedMatrices);
					}
				}

				const geometry = node.geometryNode.geometry;

				if(geometry.attributes["gps-time"]){
					const bufferAttribute = geometry.attributes["gps-time"];
					const attGPS = octree.getAttribute("gps-time");

					let initialRange = attGPS.initialRange;
					let initialRangeSize = initialRange[1] - initialRange[0];

					let globalRange = attGPS.range;
					let globalRangeSize = globalRange[1] - globalRange[0];

					let scale = initialRangeSize / globalRangeSize;
					let offset = -(globalRange[0] - initialRange[0]) / initialRangeSize;

					shader.setUniform1f("uGpsScale", scale);
					shader.setUniform1f("uGpsOffset", offset);
					//shader.setUniform2f("uFilterGPSTimeClipRange", [-Infinity, Infinity]);

					let uFilterGPSTimeClipRange = material.uniforms.uFilterGPSTimeClipRange.value;
					// let gpsCliPRangeMin = uFilterGPSTimeClipRange[0]
					// let gpsCliPRangeMax = uFilterGPSTimeClipRange[1]
					// shader.setUniform2f("uFilterGPSTimeClipRange", [gpsCliPRangeMin, gpsCliPRangeMax]);

					let normalizedClipRange = [
						(uFilterGPSTimeClipRange[0] - globalRange[0]) / globalRangeSize,
						(uFilterGPSTimeClipRange[1] - globalRange[0]) / globalRangeSize,
					];

					shader.setUniform2f("uFilterGPSTimeClipRange", normalizedClipRange);



					// // ranges in full gps coordinate system
					// const globalRange = attGPS.range;
					// const bufferRange = bufferAttribute.potree.range;

					// // ranges in [0, 1]
					// // normalizedGlobalRange = [0, 1]
					// // normalizedBufferRange: norm buffer within norm global range e.g. [0.2, 0.8]
					// const globalWidth = globalRange[1] - globalRange[0];
					// const normalizedBufferRange = [
					// 	(bufferRange[0] - globalRange[0]) / globalWidth,
					// 	(bufferRange[1] - globalRange[0]) / globalWidth,
					// ];

					// shader.setUniform2f("uNormalizedGpsBufferRange", normalizedBufferRange);

					// let uFilterGPSTimeClipRange = material.uniforms.uFilterGPSTimeClipRange.value;
					// let gpsCliPRangeMin = uFilterGPSTimeClipRange[0]
					// let gpsCliPRangeMax = uFilterGPSTimeClipRange[1]
					// shader.setUniform2f("uFilterGPSTimeClipRange", [gpsCliPRangeMin, gpsCliPRangeMax]);

					// shader.setUniform1f("uGpsScale", bufferAttribute.potree.scale);
					// shader.setUniform1f("uGpsOffset", bufferAttribute.potree.offset);
				}

				{
					let uFilterReturnNumberRange = material.uniforms.uFilterReturnNumberRange.value;
					let uFilterNumberOfReturnsRange = material.uniforms.uFilterNumberOfReturnsRange.value;
					let uFilterPointSourceIDClipRange = material.uniforms.uFilterPointSourceIDClipRange.value;
					
					
					
					shader.setUniform2f("uFilterReturnNumberRange", uFilterReturnNumberRange);
					shader.setUniform2f("uFilterNumberOfReturnsRange", uFilterNumberOfReturnsRange);
					shader.setUniform2f("uFilterPointSourceIDClipRange", uFilterPointSourceIDClipRange);
				}

				let webglBuffer = null;
				if(!this.buffers.has(geometry)){
					webglBuffer = this.createBuffer(geometry);
					this.buffers.set(geometry, webglBuffer);
				}else {
					webglBuffer = this.buffers.get(geometry);
					for(let attributeName in geometry.attributes){
						let attribute = geometry.attributes[attributeName];

						if(attribute.version > webglBuffer.vbos.get(attributeName).version){
							this.updateBuffer(geometry);
						}
					}
				}

				gl.bindVertexArray(webglBuffer.vao);

				let isExtraAttribute =
					attributeLocations[material.activeAttributeName] === undefined
					&& Object.keys(geometry.attributes).includes(material.activeAttributeName);

				if(isExtraAttribute){

					const attributeLocation = attributeLocations["aExtra"].location;

					for(const attributeName in geometry.attributes){
						const bufferAttribute = geometry.attributes[attributeName];
						const vbo = webglBuffer.vbos.get(attributeName);
						
						gl.bindBuffer(gl.ARRAY_BUFFER, vbo.handle);
						gl.disableVertexAttribArray(attributeLocation);
					}

					const attName = material.activeAttributeName;
					const bufferAttribute = geometry.attributes[attName];
					const vbo = webglBuffer.vbos.get(attName);

					if(bufferAttribute !== undefined && vbo !== undefined){
						let type = this.glTypeMapping.get(bufferAttribute.array.constructor);
						let normalized = bufferAttribute.normalized;

						gl.bindBuffer(gl.ARRAY_BUFFER, vbo.handle);
						gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
						gl.enableVertexAttribArray(attributeLocation);
					}




					{
						const attExtra = octree.pcoGeometry.pointAttributes.attributes
							.find(a => a.name === attName);

						let range = material.getRange(attName);
						if(!range){
							range = attExtra.range;
						}

						if(!range){
							range = [0, 1];
						}

						let initialRange = attExtra.initialRange;
						let initialRangeSize = initialRange[1] - initialRange[0];

						let globalRange = range;
						let globalRangeSize = globalRange[1] - globalRange[0];

						let scale = initialRangeSize / globalRangeSize;
						let offset = -(globalRange[0] - initialRange[0]) / initialRangeSize;

						shader.setUniform1f("uExtraScale", scale);
						shader.setUniform1f("uExtraOffset", offset);					
					}

				}else {

					for(const attributeName in geometry.attributes){
						const bufferAttribute = geometry.attributes[attributeName];
						const vbo = webglBuffer.vbos.get(attributeName);


						if(attributeLocations[attributeName] !== undefined){
							const attributeLocation = attributeLocations[attributeName].location;

							let type = this.glTypeMapping.get(bufferAttribute.array.constructor);
							let normalized = bufferAttribute.normalized;
							
							gl.bindBuffer(gl.ARRAY_BUFFER, vbo.handle);
							gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
							gl.enableVertexAttribArray(attributeLocation);
							
						}
					}
				}

				let numPoints = webglBuffer.numElements;
				gl.drawArrays(gl.POINTS, 0, numPoints);

				i++;
			}

			gl.bindVertexArray(null);

			if (exports.measureTimings) {
				performance.mark("renderNodes-end");
				performance.measure("render.renderNodes", "renderNodes-start", "renderNodes-end");
			}
		}

		renderOctree(octree, nodes, camera, target, params = {}){

			let gl = this.gl;

			let material = params.material ? params.material : octree.material;
			let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
			let view = camera.matrixWorldInverse;
			let viewInv = camera.matrixWorld;
			let proj = camera.projectionMatrix;
			let projInv = new THREE.Matrix4().getInverse(proj);
			let worldView = new THREE.Matrix4();

			let shader = null;
			let visibilityTextureData = null;

			let currentTextureBindingPoint = 0;

			if (material.pointSizeType >= 0) {
				if (material.pointSizeType === PointSizeType.ADAPTIVE ||
					material.activeAttributeName === "level of detail") {

					let vnNodes = (params.vnTextureNodes != null) ? params.vnTextureNodes : nodes;
					visibilityTextureData = octree.computeVisibilityTextureData(vnNodes, camera);

					const vnt = material.visibleNodesTexture;
					const data = vnt.image.data;
					data.set(visibilityTextureData.data);
					vnt.needsUpdate = true;

				}
			}

			{ // UPDATE SHADER AND TEXTURES
				if (!this.shaders.has(material)) {
					let [vs, fs] = [material.vertexShader, material.fragmentShader];
					let shader = new Shader(gl, "pointcloud", vs, fs);

					this.shaders.set(material, shader);
				}

				shader = this.shaders.get(material);

				//if(material.needsUpdate){
				{
					let [vs, fs] = [material.vertexShader, material.fragmentShader];

					let numSnapshots = material.snapEnabled ? material.numSnapshots : 0;
					let numClipBoxes = (material.clipBoxes && material.clipBoxes.length) ? material.clipBoxes.length : 0;
					let numClipSpheres = (params.clipSpheres && params.clipSpheres.length) ? params.clipSpheres.length : 0;
					let numClipPolygons = (material.clipPolygons && material.clipPolygons.length) ? material.clipPolygons.length : 0;

					let defines = [
						`#define num_shadowmaps ${shadowMaps.length}`,
						`#define num_snapshots ${numSnapshots}`,
						`#define num_clipboxes ${numClipBoxes}`,
						`#define num_clipspheres ${numClipSpheres}`,
						`#define num_clippolygons ${numClipPolygons}`,
					];


					if(octree.pcoGeometry.root.isLoaded()){
						let attributes = octree.pcoGeometry.root.geometry.attributes;

						if(attributes["gps-time"]){
							defines.push("#define clip_gps_enabled");
						}

						if(attributes["return number"]){
							defines.push("#define clip_return_number_enabled");
						}

						if(attributes["number of returns"]){
							defines.push("#define clip_number_of_returns_enabled");
						}

						if(attributes["source id"] || attributes["point source id"]){
							defines.push("#define clip_point_source_id_enabled");
						}

					}

					let definesString = defines.join("\n");

					let vsVersionIndex = vs.indexOf("#version ");
					let fsVersionIndex = fs.indexOf("#version ");

					if(vsVersionIndex >= 0){
						vs = vs.replace(/(#version .*)/, `$1\n${definesString}`);
					}else {
						vs = `${definesString}\n${vs}`;
					}

					if(fsVersionIndex >= 0){
						fs = fs.replace(/(#version .*)/, `$1\n${definesString}`);
					}else {
						fs = `${definesString}\n${fs}`;
					}


					shader.update(vs, fs);

					material.needsUpdate = false;
				}

				for (let uniformName of Object.keys(material.uniforms)) {
					let uniform = material.uniforms[uniformName];

					if (uniform.type == "t") {

						let texture = uniform.value;

						if (!texture) {
							continue;
						}

						if (!this.textures.has(texture)) {
							let webglTexture = new WebGLTexture(gl, texture);

							this.textures.set(texture, webglTexture);
						}

						let webGLTexture = this.textures.get(texture);
						webGLTexture.update();


					}
				}
			}

			gl.useProgram(shader.program);

			let transparent = false;
			if(params.transparent !== undefined){
				transparent = params.transparent && material.opacity < 1;
			}else {
				transparent = material.opacity < 1;
			}

			if (transparent){
				gl.enable(gl.BLEND);
				gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
				gl.depthMask(false);
				gl.disable(gl.DEPTH_TEST);
			} else {
				gl.disable(gl.BLEND);
				gl.depthMask(true);
				gl.enable(gl.DEPTH_TEST);
			}

			if(params.blendFunc !== undefined){
				gl.enable(gl.BLEND);
				gl.blendFunc(...params.blendFunc);
			}

			if(params.depthTest !== undefined){
				if(params.depthTest === true){
					gl.enable(gl.DEPTH_TEST);
				}else {
					gl.disable(gl.DEPTH_TEST);
				}
			}

			if(params.depthWrite !== undefined){
				 if(params.depthWrite === true){
					 gl.depthMask(true);
				 }else {
					 gl.depthMask(false);
				 }
				 
			}


			{ // UPDATE UNIFORMS
				shader.setUniformMatrix4("projectionMatrix", proj);
				shader.setUniformMatrix4("viewMatrix", view);
				shader.setUniformMatrix4("uViewInv", viewInv);
				shader.setUniformMatrix4("uProjInv", projInv);

				let screenWidth = target ? target.width : material.screenWidth;
				let screenHeight = target ? target.height : material.screenHeight;

				shader.setUniform1f("uScreenWidth", screenWidth);
				shader.setUniform1f("uScreenHeight", screenHeight);
				shader.setUniform1f("fov", Math.PI * camera.fov / 180);
				shader.setUniform1f("near", camera.near);
				shader.setUniform1f("far", camera.far);
				
				if(camera instanceof THREE.OrthographicCamera){
					shader.setUniform("uUseOrthographicCamera", true);
					shader.setUniform("uOrthoWidth", camera.right - camera.left); 
					shader.setUniform("uOrthoHeight", camera.top - camera.bottom);
				}else {
					shader.setUniform("uUseOrthographicCamera", false);
				}

				if(material.clipBoxes.length + material.clipPolygons.length === 0){
					shader.setUniform1i("clipTask", ClipTask.NONE);
				}else {
					shader.setUniform1i("clipTask", material.clipTask);
				}

				shader.setUniform1i("clipMethod", material.clipMethod);

				if (material.clipBoxes && material.clipBoxes.length > 0) {
					//let flattenedMatrices = [].concat(...material.clipBoxes.map(c => c.inverse.elements));

					//const lClipBoxes = shader.uniformLocations["clipBoxes[0]"];
					//gl.uniformMatrix4fv(lClipBoxes, false, flattenedMatrices);

					const lClipBoxes = shader.uniformLocations["clipBoxes[0]"];
					gl.uniformMatrix4fv(lClipBoxes, false, material.uniforms.clipBoxes.value);
				}

				// TODO CLIPSPHERES
				if(params.clipSpheres && params.clipSpheres.length > 0){

					let clipSpheres = params.clipSpheres;

					let matrices = [];
					for(let clipSphere of clipSpheres){
						//let mScale = new THREE.Matrix4().makeScale(...clipSphere.scale.toArray());
						//let mTranslate = new THREE.Matrix4().makeTranslation(...clipSphere.position.toArray());

						//let clipToWorld = new THREE.Matrix4().multiplyMatrices(mTranslate, mScale);
						let clipToWorld = clipSphere.matrixWorld;
						let viewToWorld = camera.matrixWorld;
						let worldToClip = new THREE.Matrix4().getInverse(clipToWorld);

						let viewToClip = new THREE.Matrix4().multiplyMatrices(worldToClip, viewToWorld);

						matrices.push(viewToClip);
					}

					let flattenedMatrices = [].concat(...matrices.map(matrix => matrix.elements));

					const lClipSpheres = shader.uniformLocations["uClipSpheres[0]"];
					gl.uniformMatrix4fv(lClipSpheres, false, flattenedMatrices);
					
					//const lClipSpheres = shader.uniformLocations["uClipSpheres[0]"];
					//gl.uniformMatrix4fv(lClipSpheres, false, material.uniforms.clipSpheres.value);
				}


				shader.setUniform1f("size", material.size);
				shader.setUniform1f("maxSize", material.uniforms.maxSize.value);
				shader.setUniform1f("minSize", material.uniforms.minSize.value);


				// uniform float uPCIndex
				shader.setUniform1f("uOctreeSpacing", material.spacing);
				shader.setUniform("uOctreeSize", material.uniforms.octreeSize.value);


				//uniform vec3 uColor;
				shader.setUniform3f("uColor", material.color.toArray());
				//uniform float opacity;
				shader.setUniform1f("uOpacity", material.opacity);

				shader.setUniform2f("elevationRange", material.elevationRange);
				shader.setUniform2f("intensityRange", material.intensityRange);


				shader.setUniform3f("uIntensity_gbc", [
					material.intensityGamma, 
					material.intensityBrightness, 
					material.intensityContrast
				]);

				shader.setUniform3f("uRGB_gbc", [
					material.rgbGamma, 
					material.rgbBrightness, 
					material.rgbContrast
				]);

				shader.setUniform1f("uTransition", material.transition);
				shader.setUniform1f("wRGB", material.weightRGB);
				shader.setUniform1f("wIntensity", material.weightIntensity);
				shader.setUniform1f("wElevation", material.weightElevation);
				shader.setUniform1f("wClassification", material.weightClassification);
				shader.setUniform1f("wReturnNumber", material.weightReturnNumber);
				shader.setUniform1f("wSourceID", material.weightSourceID);

				shader.setUniform("backfaceCulling", material.uniforms.backfaceCulling.value);

				let vnWebGLTexture = this.textures.get(material.visibleNodesTexture);
				if(vnWebGLTexture){
					shader.setUniform1i("visibleNodesTexture", currentTextureBindingPoint);
					gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
					gl.bindTexture(vnWebGLTexture.target, vnWebGLTexture.id);
					currentTextureBindingPoint++;
				}

				let gradientTexture = this.textures.get(material.gradientTexture);
				shader.setUniform1i("gradient", currentTextureBindingPoint);
				gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
				gl.bindTexture(gradientTexture.target, gradientTexture.id);

				const repeat = material.elevationGradientRepeat;
				if(repeat === ElevationGradientRepeat.REPEAT){
					gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_S, gl.REPEAT);
					gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_T, gl.REPEAT);
				}else if(repeat === ElevationGradientRepeat.MIRRORED_REPEAT){
					gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
					gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
				}else {
					gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
					gl.texParameteri(gradientTexture.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				}
				currentTextureBindingPoint++;

				let classificationTexture = this.textures.get(material.classificationTexture);
				shader.setUniform1i("classificationLUT", currentTextureBindingPoint);
				gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
				gl.bindTexture(classificationTexture.target, classificationTexture.id);
				currentTextureBindingPoint++;

				let matcapTexture = this.textures.get(material.matcapTexture);
				shader.setUniform1i("matcapTextureUniform", currentTextureBindingPoint);
				gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
				gl.bindTexture(matcapTexture.target, matcapTexture.id);
				currentTextureBindingPoint++;


				if (material.snapEnabled === true) {

					{
						const lSnapshot = shader.uniformLocations["uSnapshot[0]"];
						const lSnapshotDepth = shader.uniformLocations["uSnapshotDepth[0]"];

						let bindingStart = currentTextureBindingPoint;
						let lSnapshotBindingPoints = new Array(5).fill(bindingStart).map((a, i) => (a + i));
						let lSnapshotDepthBindingPoints = new Array(5)
							.fill(1 + Math.max(...lSnapshotBindingPoints))
							.map((a, i) => (a + i));
						currentTextureBindingPoint = 1 + Math.max(...lSnapshotDepthBindingPoints);

						gl.uniform1iv(lSnapshot, lSnapshotBindingPoints);
						gl.uniform1iv(lSnapshotDepth, lSnapshotDepthBindingPoints);

						for (let i = 0; i < 5; i++) {
							let texture = material.uniforms[`uSnapshot`].value[i];
							let textureDepth = material.uniforms[`uSnapshotDepth`].value[i];

							if (!texture) {
								break;
							}

							let snapTexture = this.threeRenderer.properties.get(texture).__webglTexture;
							let snapTextureDepth = this.threeRenderer.properties.get(textureDepth).__webglTexture;

							let bindingPoint = lSnapshotBindingPoints[i];
							let depthBindingPoint = lSnapshotDepthBindingPoints[i];

							gl.activeTexture(gl[`TEXTURE${bindingPoint}`]);
							gl.bindTexture(gl.TEXTURE_2D, snapTexture);

							gl.activeTexture(gl[`TEXTURE${depthBindingPoint}`]);
							gl.bindTexture(gl.TEXTURE_2D, snapTextureDepth);
						}
					}

					{
						let flattenedMatrices = [].concat(...material.uniforms.uSnapView.value.map(c => c.elements));
						const lSnapView = shader.uniformLocations["uSnapView[0]"];
						gl.uniformMatrix4fv(lSnapView, false, flattenedMatrices);
					}
					{
						let flattenedMatrices = [].concat(...material.uniforms.uSnapProj.value.map(c => c.elements));
						const lSnapProj = shader.uniformLocations["uSnapProj[0]"];
						gl.uniformMatrix4fv(lSnapProj, false, flattenedMatrices);
					}
					{
						let flattenedMatrices = [].concat(...material.uniforms.uSnapProjInv.value.map(c => c.elements));
						const lSnapProjInv = shader.uniformLocations["uSnapProjInv[0]"];
						gl.uniformMatrix4fv(lSnapProjInv, false, flattenedMatrices);
					}
					{
						let flattenedMatrices = [].concat(...material.uniforms.uSnapViewInv.value.map(c => c.elements));
						const lSnapViewInv = shader.uniformLocations["uSnapViewInv[0]"];
						gl.uniformMatrix4fv(lSnapViewInv, false, flattenedMatrices);
					}

				}
			}

			this.renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params);

			gl.activeTexture(gl.TEXTURE2);
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.activeTexture(gl.TEXTURE0);
		}

		render(scene, camera, target = null, params = {}) {

			const gl = this.gl;

			// PREPARE 
			if (target != null) {
				this.threeRenderer.setRenderTarget(target);
			}

			camera.updateProjectionMatrix();

			const traversalResult = this.traverse(scene);


			// RENDER
			for (const octree of traversalResult.octrees) {
				let nodes = octree.visibleNodes;
				this.renderOctree(octree, nodes, camera, target, params);
			}


			// CLEANUP
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D, null);

			this.threeRenderer.state.reset();
		}



	};

	class ProfileData {
		constructor (profile) {
			this.profile = profile;

			this.segments = [];
			this.boundingBox = new THREE.Box3();

			for (let i = 0; i < profile.points.length - 1; i++) {
				let start = profile.points[i];
				let end = profile.points[i + 1];

				let startGround = new THREE.Vector3(start.x, start.y, 0);
				let endGround = new THREE.Vector3(end.x, end.y, 0);

				let center = new THREE.Vector3().addVectors(endGround, startGround).multiplyScalar(0.5);
				let length = startGround.distanceTo(endGround);
				let side = new THREE.Vector3().subVectors(endGround, startGround).normalize();
				let up = new THREE.Vector3(0, 0, 1);
				let forward = new THREE.Vector3().crossVectors(side, up).normalize();
				let N = forward;
				let cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, startGround);
				let halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);

				let segment = {
					start: start,
					end: end,
					cutPlane: cutPlane,
					halfPlane: halfPlane,
					length: length,
					points: new Points()
				};

				this.segments.push(segment);
			}
		}

		size () {
			let size = 0;
			for (let segment of this.segments) {
				size += segment.points.numPoints;
			}

			return size;
		}
	};

	class ProfileRequest {
		constructor (pointcloud, profile, maxDepth, callback) {
			this.pointcloud = pointcloud;
			this.profile = profile;
			this.maxDepth = maxDepth || Number.MAX_VALUE;
			this.callback = callback;
			this.temporaryResult = new ProfileData(this.profile);
			this.pointsServed = 0;
			this.highestLevelServed = 0;

			this.priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

			this.initialize();
		}

		initialize () {
			this.priorityQueue.push({node: this.pointcloud.pcoGeometry.root, weight: Infinity});
		};

		// traverse the node and add intersecting descendants to queue
		traverse (node) {
			let stack = [];
			for (let i = 0; i < 8; i++) {
				let child = node.children[i];
				if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
					stack.push(child);
				}
			}

			while (stack.length > 0) {
				let node = stack.pop();
				let weight = node.boundingSphere.radius;

				this.priorityQueue.push({node: node, weight: weight});

				// add children that intersect the cutting plane
				if (node.level < this.maxDepth) {
					for (let i = 0; i < 8; i++) {
						let child = node.children[i];
						if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
							stack.push(child);
						}
					}
				}
			}
		}

		update(){
			if(!this.updateGeneratorInstance){
				this.updateGeneratorInstance = this.updateGenerator();
			}

			let result = this.updateGeneratorInstance.next();
			if(result.done){
				this.updateGeneratorInstance = null;
			}
		}

		* updateGenerator(){
			// load nodes in queue
			// if hierarchy expands, also load nodes from expanded hierarchy
			// once loaded, add data to this.points and remove node from queue
			// only evaluate 1-50 nodes per frame to maintain responsiveness

			let start = performance.now();

			let maxNodesPerUpdate = 1;
			let intersectedNodes = [];

			for (let i = 0; i < Math.min(maxNodesPerUpdate, this.priorityQueue.size()); i++) {
				let element = this.priorityQueue.pop();
				let node = element.node;

				if(node.level > this.maxDepth){
					continue;
				}

				if (node.loaded) {
					// add points to result
					intersectedNodes.push(node);
					exports.lru.touch(node);
					this.highestLevelServed = Math.max(node.getLevel(), this.highestLevelServed);

					var geom = node.pcoGeometry;
					var hierarchyStepSize = geom ? geom.hierarchyStepSize : 1;

					var doTraverse = node.getLevel() === 0 ||
						(node.level % hierarchyStepSize === 0 && node.hasChildren);

					if (doTraverse) {
						this.traverse(node);
					}
				} else {
					node.load();
					this.priorityQueue.push(element);
				}
			}

			if (intersectedNodes.length > 0) {

				for(let done of this.getPointsInsideProfile(intersectedNodes, this.temporaryResult)){
					if(!done){
						//console.log("updateGenerator yields");
						yield false;
					}
				}
				if (this.temporaryResult.size() > 100) {
					this.pointsServed += this.temporaryResult.size();
					this.callback.onProgress({request: this, points: this.temporaryResult});
					this.temporaryResult = new ProfileData(this.profile);
				}
			}

			if (this.priorityQueue.size() === 0) {
				// we're done! inform callback and remove from pending requests

				if (this.temporaryResult.size() > 0) {
					this.pointsServed += this.temporaryResult.size();
					this.callback.onProgress({request: this, points: this.temporaryResult});
					this.temporaryResult = new ProfileData(this.profile);
				}

				this.callback.onFinish({request: this});

				let index = this.pointcloud.profileRequests.indexOf(this);
				if (index >= 0) {
					this.pointcloud.profileRequests.splice(index, 1);
				}
			}

			yield true;
		};

		* getAccepted(numPoints, node, matrix, segment, segmentDir, points, totalMileage){
			let checkpoint = performance.now();

			let accepted = new Uint32Array(numPoints);
			let mileage = new Float64Array(numPoints);
			let acceptedPositions = new Float32Array(numPoints * 3);
			let numAccepted = 0;

			let pos = new THREE.Vector3();
			let svp = new THREE.Vector3();

			let view = new Float32Array(node.geometry.attributes.position.array);

			for (let i = 0; i < numPoints; i++) {

				pos.set(
					view[i * 3 + 0],
					view[i * 3 + 1],
					view[i * 3 + 2]);

				pos.applyMatrix4(matrix);
				let distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
				let centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));

				if (distance < this.profile.width / 2 && centerDistance < segment.length / 2) {
					svp.subVectors(pos, segment.start);
					let localMileage = segmentDir.dot(svp);

					accepted[numAccepted] = i;
					mileage[numAccepted] = localMileage + totalMileage;
					points.boundingBox.expandByPoint(pos);

					pos.sub(this.pointcloud.position);

					acceptedPositions[3 * numAccepted + 0] = pos.x;
					acceptedPositions[3 * numAccepted + 1] = pos.y;
					acceptedPositions[3 * numAccepted + 2] = pos.z;

					numAccepted++;
				}

				if((i % 1000) === 0){
					let duration = performance.now() - checkpoint;
					if(duration > 4){
						//console.log(`getAccepted yield after ${duration}ms`);
						yield false;
						checkpoint = performance.now();
					}
				}
			}

			accepted = accepted.subarray(0, numAccepted);
			mileage = mileage.subarray(0, numAccepted);
			acceptedPositions = acceptedPositions.subarray(0, numAccepted * 3);

			//let end = performance.now();
			//let duration = end - start;
			//console.log("accepted duration ", duration)

			//console.log(`getAccepted finished`);

			yield [accepted, mileage, acceptedPositions];
		}

		* getPointsInsideProfile(nodes, target){
			let checkpoint = performance.now();
			let totalMileage = 0;

			let pointsProcessed = 0;

			for (let segment of target.segments) {
				for (let node of nodes) {
					let numPoints = node.numPoints;
					let geometry = node.geometry;

					if(!numPoints){
						continue;
					}

					{ // skip if current node doesn't intersect current segment
						let bbWorld = node.boundingBox.clone().applyMatrix4(this.pointcloud.matrixWorld);
						let bsWorld = bbWorld.getBoundingSphere(new THREE.Sphere());

						let start = new THREE.Vector3(segment.start.x, segment.start.y, bsWorld.center.z);
						let end = new THREE.Vector3(segment.end.x, segment.end.y, bsWorld.center.z);

						let closest = new THREE.Line3(start, end).closestPointToPoint(bsWorld.center, true, new THREE.Vector3());
						let distance = closest.distanceTo(bsWorld.center);

						let intersects = (distance < (bsWorld.radius + target.profile.width));

						if(!intersects){
							continue;
						}
					}

					//{// DEBUG
					//	console.log(node.name);
					//	let boxHelper = new Potree.Box3Helper(node.getBoundingBox());
					//	boxHelper.matrixAutoUpdate = false;
					//	boxHelper.matrix.copy(viewer.scene.pointclouds[0].matrixWorld);
					//	viewer.scene.scene.add(boxHelper);
					//}

					let sv = new THREE.Vector3().subVectors(segment.end, segment.start).setZ(0);
					let segmentDir = sv.clone().normalize();

					let points = new Points();

					let nodeMatrix = new THREE.Matrix4().makeTranslation(...node.boundingBox.min.toArray());

					let matrix = new THREE.Matrix4().multiplyMatrices(
						this.pointcloud.matrixWorld, nodeMatrix);

					pointsProcessed = pointsProcessed + numPoints;

					let accepted = null;
					let mileage = null;
					let acceptedPositions = null;
					for(let result of this.getAccepted(numPoints, node, matrix, segment, segmentDir, points,totalMileage)){
						if(!result){
							let duration = performance.now() - checkpoint;
							//console.log(`getPointsInsideProfile yield after ${duration}ms`);
							yield false;
							checkpoint = performance.now();
						}else {
							[accepted, mileage, acceptedPositions] = result;
						}
					}

					let duration = performance.now() - checkpoint;
					if(duration > 4){
						//console.log(`getPointsInsideProfile yield after ${duration}ms`);
						yield false;
						checkpoint = performance.now();
					}

					points.data.position = acceptedPositions;

					let relevantAttributes = Object.keys(geometry.attributes).filter(a => !["position", "indices"].includes(a));
					for(let attributeName of relevantAttributes){

						let attribute = geometry.attributes[attributeName];
						let numElements = attribute.array.length / numPoints;

						if(numElements !== parseInt(numElements)){
							debugger;
						}

						let Type = attribute.array.constructor;

						let filteredBuffer = new Type(numElements * accepted.length);

						let source = attribute.array;
						let target = filteredBuffer;

						for(let i = 0; i < accepted.length; i++){

							let index = accepted[i];

							let start = index * numElements;
							let end = start + numElements;
							let sub = source.subarray(start, end);

							target.set(sub, i * numElements);
						}

						points.data[attributeName] = filteredBuffer;
					}

					points.data['mileage'] = mileage;
					points.numPoints = accepted.length;

					segment.points.add(points);
				}

				totalMileage += segment.length;
			}

			for (let segment of target.segments) {
				target.boundingBox.union(segment.points.boundingBox);
			}

			//console.log(`getPointsInsideProfile finished`);
			yield true;
		};

		finishLevelThenCancel () {
			if (this.cancelRequested) {
				return;
			}

			this.maxDepth = this.highestLevelServed;
			this.cancelRequested = true;

			//console.log(`maxDepth: ${this.maxDepth}`);
		};

		cancel () {
			this.callback.onCancel();

			this.priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

			let index = this.pointcloud.profileRequests.indexOf(this);
			if (index >= 0) {
				this.pointcloud.profileRequests.splice(index, 1);
			}
		};
	}

	class Version{

		constructor(version){
			this.version = version;
			let vmLength = (version.indexOf('.') === -1) ? version.length : version.indexOf('.');
			this.versionMajor = parseInt(version.substr(0, vmLength));
			this.versionMinor = parseInt(version.substr(vmLength + 1));
			if (this.versionMinor.length === 0) {
				this.versionMinor = 0;
			}
		}

		newerThan(version){
			let v = new Version(version);

			if (this.versionMajor > v.versionMajor) {
				return true;
			} else if (this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor) {
				return true;
			} else {
				return false;
			}
		}

		equalOrHigher(version){
			let v = new Version(version);

			if (this.versionMajor > v.versionMajor) {
				return true;
			} else if (this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor) {
				return true;
			} else {
				return false;
			}
		}

		upTo(version){
			return !this.newerThan(version);
		}

	}

	class WorkerPool{
		constructor(){
			this.workers = {};
		}

		getWorker(url){
			if (!this.workers[url]){
				this.workers[url] = [];
			}

			if (this.workers[url].length === 0){
				let worker = new Worker(url);
				this.workers[url].push(worker);
			}

			let worker = this.workers[url].pop();

			return worker;
		}

		returnWorker(url, worker){
			this.workers[url].push(worker);
		}
	};

	//Potree.workerPool = new Potree.WorkerPool();

	function createPointcloudData(pointcloud) {

		let material = pointcloud.material;

		let ranges = [];
		
		for(let [name, value] of material.ranges){
			ranges.push({
				name: name,
				value: value,
			});
		}

		if(typeof material.elevationRange[0] === "number"){
			ranges.push({
				name: "elevationRange",
				value: material.elevationRange,
			});
		}
		if(typeof material.intensityRange[0] === "number"){
			ranges.push({
				name: "intensityRange",
				value: material.intensityRange,
			});
		}

		let pointSizeTypeName = Object.entries(Potree.PointSizeType).find(e => e[1] === material.pointSizeType)[0];

		let jsonMaterial = {
			activeAttributeName: material.activeAttributeName,
			ranges: ranges,
			size: material.size,
			minSize: material.minSize,
			pointSizeType: pointSizeTypeName,
			matcap: material.matcap,
		};

		const pcdata = {
			name: pointcloud.name,
			url: pointcloud.pcoGeometry.url,
			position: pointcloud.position.toArray(),
			rotation: pointcloud.rotation.toArray(),
			scale: pointcloud.scale.toArray(),
			material: jsonMaterial,
		};

		return pcdata;
	}

	function createProfileData(profile){
		const data = {
			uuid: profile.uuid,
			name: profile.name,
			points: profile.points.map(p => p.toArray()),
			height: profile.height,
			width: profile.width,
		};

		return data;
	}

	function createVolumeData(volume){
		const data = {
			uuid: volume.uuid,
			type: volume.constructor.name,
			name: volume.name,
			position: volume.position.toArray(),
			rotation: volume.rotation.toArray(),
			scale: volume.scale.toArray(),
			visible: volume.visible,
			clip: volume.clip,
		};

		return data;
	}

	function createCameraAnimationData(animation){

		const controlPoints = animation.controlPoints.map( cp => {
			const cpdata = {
				position: cp.position.toArray(),
				target: cp.target.toArray(),
			};

			return cpdata;
		});

		const data = {
			uuid: animation.uuid,
			name: animation.name,
			duration: animation.duration,
			t: animation.t,
			curveType: animation.curveType,
			visible: animation.visible,
			controlPoints: controlPoints,
		};

		return data;
	}

	function createMeasurementData(measurement){

		const data = {
			uuid: measurement.uuid,
			name: measurement.name,
			points: measurement.points.map(p => p.position.toArray()),
			showDistances: measurement.showDistances,
			showCoordinates: measurement.showCoordinates,
			showArea: measurement.showArea,
			closed: measurement.closed,
			showAngles: measurement.showAngles,
			showHeight: measurement.showHeight,
			showCircle: measurement.showCircle,
			showAzimuth: measurement.showAzimuth,
			showEdges: measurement.showEdges,
			color: measurement.color.toArray(),
		};

		return data;
	}

	function createOrientedImagesData(images){
		const data = {
			cameraParamsPath: images.cameraParamsPath,
			imageParamsPath: images.imageParamsPath,
		};

		return data;
	}

	function createGeopackageData(geopackage){
		const data = {
			path: geopackage.path,
		};

		return data;
	}

	function createAnnotationData(annotation){

		const data = {
			uuid: annotation.uuid,
			title: annotation.title.toString(),
			description: annotation.description,
			position: annotation.position.toArray(),
			offset: annotation.offset.toArray(),
			children: [],
		};

		if(annotation.cameraPosition){
			data.cameraPosition = annotation.cameraPosition.toArray();
		}

		if(annotation.cameraTarget){
			data.cameraTarget = annotation.cameraTarget.toArray();
		}

		if(typeof annotation.radius !== "undefined"){
			data.radius = annotation.radius;
		}

		return data;
	}

	function createAnnotationsData(viewer){
		
		const map = new Map();

		viewer.scene.annotations.traverseDescendants(a => {
			const aData = createAnnotationData(a);

			map.set(a, aData);
		});

		for(const [annotation, data] of map){
			for(const child of annotation.children){
				const childData = map.get(child);
				data.children.push(childData);
			}
		}

		const annotations = viewer.scene.annotations.children.map(a => map.get(a));

		return annotations;
	}

	function createSettingsData(viewer){
		return {
			pointBudget: viewer.getPointBudget(),
			fov: viewer.getFOV(),
			edlEnabled: viewer.getEDLEnabled(),
			edlRadius: viewer.getEDLRadius(),
			edlStrength: viewer.getEDLStrength(),
			background: viewer.getBackground(),
			minNodeSize: viewer.getMinNodeSize(),
			showBoundingBoxes: viewer.getShowBoundingBox(),
		};
	}

	function createSceneContentData(viewer){

		const data = [];

		const potreeObjects = [];

		viewer.scene.scene.traverse(node => {
			if(node.potree){
				potreeObjects.push(node);
			}
		});

		for(const object of potreeObjects){
			
			if(object.potree.file){
				const saveObject = {
					file: object.potree.file,
				};

				data.push(saveObject);
			}


		}


		return data;
	}

	function createViewData(viewer){
		const view = viewer.scene.view;

		const data = {
			position: view.position.toArray(),
			target: view.getPivot().toArray(),
		};

		return data;
	}

	function createClassificationData(viewer){
		const classifications = viewer.classifications;

		const data = classifications;

		return data;
	}

	function saveProject(viewer) {

		const scene = viewer.scene;

		const data = {
			type: "Potree",
			version: 1.7,
			settings: createSettingsData(viewer),
			view: createViewData(viewer),
			classification: createClassificationData(viewer),
			pointclouds: scene.pointclouds.map(createPointcloudData),
			measurements: scene.measurements.map(createMeasurementData),
			volumes: scene.volumes.map(createVolumeData),
			cameraAnimations: scene.cameraAnimations.map(createCameraAnimationData),
			profiles: scene.profiles.map(createProfileData),
			annotations: createAnnotationsData(viewer),
			orientedImages: scene.orientedImages.map(createOrientedImagesData),
			geopackages: scene.geopackages.map(createGeopackageData),
			// objects: createSceneContentData(viewer),
		};

		return data;
	}

	class ControlPoint{

		constructor(){
			this.position = new THREE.Vector3(0, 0, 0);
			this.target = new THREE.Vector3(0, 0, 0);
			this.positionHandle = null;
			this.targetHandle = null;
		}

	};



	class CameraAnimation extends EventDispatcher{

		constructor(viewer){
			super();
			
			this.viewer = viewer;

			this.selectedElement = null;

			this.controlPoints = [];

			this.uuid = THREE.Math.generateUUID();

			this.node = new THREE.Object3D();
			this.node.name = "camera animation";
			this.viewer.scene.scene.add(this.node);

			this.frustum = this.createFrustum();
			this.node.add(this.frustum);

			this.name = "Camera Animation";
			this.duration = 5;
			this.t = 0;
			// "centripetal", "chordal", "catmullrom"
			this.curveType = "centripetal"; 
			this.visible = true;

			this.createUpdateHook();
			this.createPath();
		}

		static defaultFromView(viewer){
			const animation = new CameraAnimation(viewer);

			const camera = viewer.scene.getActiveCamera();
			const target = viewer.scene.view.getPivot();

			const cpCenter = new THREE.Vector3(
				0.3 * camera.position.x + 0.7 * target.x,
				0.3 * camera.position.y + 0.7 * target.y,
				0.3 * camera.position.z + 0.7 * target.z,
			);

			const targetCenter = new THREE.Vector3(
				0.05 * camera.position.x + 0.95 * target.x,
				0.05 * camera.position.y + 0.95 * target.y,
				0.05 * camera.position.z + 0.95 * target.z,
			);

			const r = camera.position.distanceTo(target) * 0.3;

			//const dir = target.clone().sub(camera.position).normalize();
			const angle = Utils.computeAzimuth(camera.position, target);

			const n = 5;
			for(let i = 0; i < n; i++){
				let u = 1.5 * Math.PI * (i / n) + angle;

				const dx = r * Math.cos(u);
				const dy = r * Math.sin(u);

				const cpPos = [
					cpCenter.x + dx,
					cpCenter.y + dy,
					cpCenter.z,
				];

				const targetPos = [
					targetCenter.x + dx * 0.1,
					targetCenter.y + dy * 0.1,
					targetCenter.z,
				];

				const cp = animation.createControlPoint();
				cp.position.set(...cpPos);
				cp.target.set(...targetPos);
			}

			return animation;
		}

		createUpdateHook(){
			const viewer = this.viewer;

			viewer.addEventListener("update", () => {

				const camera = viewer.scene.getActiveCamera();
				const {width, height} = viewer.renderer.getSize(new THREE.Vector2());

				this.node.visible = this.visible;

				for(const cp of this.controlPoints){
					
					{ // position
						const projected = cp.position.clone().project(camera);

						const visible = this.visible && (projected.z < 1 && projected.z > -1);

						if(visible){
							const x = width * (projected.x * 0.5 + 0.5);
							const y = height - height * (projected.y * 0.5 + 0.5);

							cp.positionHandle.svg.style.left = x - cp.positionHandle.svg.clientWidth / 2;
							cp.positionHandle.svg.style.top = y - cp.positionHandle.svg.clientHeight / 2;
							cp.positionHandle.svg.style.display = "";
						}else {
							cp.positionHandle.svg.style.display = "none";
						}
					}

					{ // target
						const projected = cp.target.clone().project(camera);

						const visible = this.visible && (projected.z < 1 && projected.z > -1);

						if(visible){
							const x = width * (projected.x * 0.5 + 0.5);
							const y = height - height * (projected.y * 0.5 + 0.5);

							cp.targetHandle.svg.style.left = x - cp.targetHandle.svg.clientWidth / 2;
							cp.targetHandle.svg.style.top = y - cp.targetHandle.svg.clientHeight / 2;
							cp.targetHandle.svg.style.display = "";
						}else {
							cp.targetHandle.svg.style.display = "none";
						}
					}

				}

				this.line.material.resolution.set(width, height);

				this.updatePath();

				{ // frustum
					const frame = this.at(this.t);
					const frustum = this.frustum;

					frustum.position.copy(frame.position);
					frustum.lookAt(...frame.target.toArray());
					frustum.scale.set(20, 20, 20);

					frustum.material.resolution.set(width, height);
				}

			});
		}

		createControlPoint(index){

			if(index === undefined){
				index = this.controlPoints.length;
			}

			const cp = new ControlPoint();


			if(this.controlPoints.length >= 2 && index === 0){
				const cp1 = this.controlPoints[0];
				const cp2 = this.controlPoints[1];

				const dir = cp1.position.clone().sub(cp2.position).multiplyScalar(0.5);
				cp.position.copy(cp1.position).add(dir);

				const tDir = cp1.target.clone().sub(cp2.target).multiplyScalar(0.5);
				cp.target.copy(cp1.target).add(tDir);
			}else if(this.controlPoints.length >= 2 && index === this.controlPoints.length){
				const cp1 = this.controlPoints[this.controlPoints.length - 2];
				const cp2 = this.controlPoints[this.controlPoints.length - 1];

				const dir = cp2.position.clone().sub(cp1.position).multiplyScalar(0.5);
				cp.position.copy(cp1.position).add(dir);

				const tDir = cp2.target.clone().sub(cp1.target).multiplyScalar(0.5);
				cp.target.copy(cp2.target).add(tDir);
			}else if(this.controlPoints.length >= 2){
				const cp1 = this.controlPoints[index - 1];
				const cp2 = this.controlPoints[index];

				cp.position.copy(cp1.position.clone().add(cp2.position).multiplyScalar(0.5));
				cp.target.copy(cp1.target.clone().add(cp2.target).multiplyScalar(0.5));
			}

			// cp.position.copy(viewer.scene.view.position);
			// cp.target.copy(viewer.scene.view.getPivot());

			cp.positionHandle = this.createHandle(cp.position);
			cp.targetHandle = this.createHandle(cp.target);

			this.controlPoints.splice(index, 0, cp);

			this.dispatchEvent({
				type: "controlpoint_added",
				controlpoint: cp,
			});

			return cp;
		}

		removeControlPoint(cp){
			this.controlPoints = this.controlPoints.filter(_cp => _cp !== cp);

			this.dispatchEvent({
				type: "controlpoint_removed",
				controlpoint: cp,
			});

			cp.positionHandle.svg.remove();
			cp.targetHandle.svg.remove();

			// TODO destroy cp
		}

		createPath(){

			{ // position
				const geometry = new THREE.LineGeometry();

				let material = new THREE.LineMaterial({ 
					color: 0x00ff00, 
					dashSize: 5, 
					gapSize: 2,
					linewidth: 2, 
					resolution:  new THREE.Vector2(1000, 1000),
				});

				const line = new THREE.Line2(geometry, material);

				this.line = line;
				this.node.add(line);
			}

			{ // target
				const geometry = new THREE.LineGeometry();

				let material = new THREE.LineMaterial({ 
					color: 0x0000ff, 
					dashSize: 5, 
					gapSize: 2,
					linewidth: 2, 
					resolution:  new THREE.Vector2(1000, 1000),
				});

				const line = new THREE.Line2(geometry, material);

				this.targetLine = line;
				this.node.add(line);
			}
		}

		createFrustum(){

			const f = 0.3;

			const positions = [
				 0,  0,  0,
				-f, -f, +1,

				 0,  0,  0,
				 f, -f, +1,

				 0,  0,  0,
				 f,  f, +1,

				 0,  0,  0,
				-f,  f, +1,

				-f, -f, +1,
				 f, -f, +1,

				 f, -f, +1,
				 f,  f, +1,

				 f,  f, +1,
				-f,  f, +1,

				-f,  f, +1,
				-f, -f, +1,
			];

			const geometry = new THREE.LineGeometry();

			geometry.setPositions(positions);
			geometry.verticesNeedUpdate = true;
			geometry.computeBoundingSphere();

			let material = new THREE.LineMaterial({ 
				color: 0xff0000, 
				linewidth: 2, 
				resolution:  new THREE.Vector2(1000, 1000),
			});

			const line = new THREE.Line2(geometry, material);
			line.computeLineDistances();
			
			return line;
		}

		updatePath(){

			{ // positions
				const positions = this.controlPoints.map(cp => cp.position);
				const first = positions[0];

				const curve = new THREE.CatmullRomCurve3(positions);
				curve.curveType = this.curveType;

				const n = 100;

				const curvePositions = [];
				for(let k = 0; k <= n; k++){
					const t = k / n;

					const position = curve.getPoint(t).sub(first);

					curvePositions.push(position.x, position.y, position.z);
				}

				this.line.geometry.setPositions(curvePositions);
				this.line.geometry.verticesNeedUpdate = true;
				this.line.geometry.computeBoundingSphere();
				this.line.position.copy(first);
				this.line.computeLineDistances();

				this.cameraCurve = curve;
			}

			{ // targets
				const positions = this.controlPoints.map(cp => cp.target);
				const first = positions[0];

				const curve = new THREE.CatmullRomCurve3(positions);
				curve.curveType = this.curveType;

				const n = 100;

				const curvePositions = [];
				for(let k = 0; k <= n; k++){
					const t = k / n;

					const position = curve.getPoint(t).sub(first);

					curvePositions.push(position.x, position.y, position.z);
				}

				this.targetLine.geometry.setPositions(curvePositions);
				this.targetLine.geometry.verticesNeedUpdate = true;
				this.targetLine.geometry.computeBoundingSphere();
				this.targetLine.position.copy(first);
				this.targetLine.computeLineDistances();

				this.targetCurve = curve;
			}
		}

		at(t){
			
			if(t > 1){
				t = 1;
			}else if(t < 0){
				t = 0;
			}

			const camPos = this.cameraCurve.getPointAt(t);
			const target = this.targetCurve.getPointAt(t);

			const frame = {
				position: camPos,
				target: target,
			};

			return frame;
		}

		set(t){
			this.t = t;
		}

		createHandle(vector){
			
			const svgns = "http://www.w3.org/2000/svg";
			const svg = document.createElementNS(svgns, "svg");

			svg.setAttribute("width", "2em");
			svg.setAttribute("height", "2em");
			svg.setAttribute("position", "absolute");

			svg.style.left = "50px";
			svg.style.top = "50px";
			svg.style.position = "absolute";
			svg.style.zIndex = "10000";

			const circle = document.createElementNS(svgns, 'circle');
			circle.setAttributeNS(null, 'cx', "1em");
			circle.setAttributeNS(null, 'cy', "1em");
			circle.setAttributeNS(null, 'r', "0.5em");
			circle.setAttributeNS(null, 'style', 'fill: red; stroke: black; stroke-width: 0.2em;' );
			svg.appendChild(circle);


			const element = this.viewer.renderer.domElement.parentElement;
			element.appendChild(svg);


			const startDrag = (evt) => {
				this.selectedElement = svg;

				document.addEventListener("mousemove", drag);
			};

			const endDrag = (evt) => {
				this.selectedElement = null;

				document.removeEventListener("mousemove", drag);
			};

			const drag = (evt) => {
				if (this.selectedElement) {
					evt.preventDefault();

					const rect = viewer.renderer.domElement.getBoundingClientRect();

					const x = evt.clientX - rect.x;
					const y = evt.clientY - rect.y;

					const {width, height} = this.viewer.renderer.getSize(new THREE.Vector2());
					const camera = this.viewer.scene.getActiveCamera();
					//const cp = this.controlPoints.find(cp => cp.handle.svg === svg);
					const projected = vector.clone().project(camera);

					projected.x = ((x / width) - 0.5) / 0.5;
					projected.y = (-(y - height) / height - 0.5) / 0.5;

					const unprojected = projected.clone().unproject(camera);
					vector.set(unprojected.x, unprojected.y, unprojected.z);


				}
			};

			svg.addEventListener('mousedown', startDrag);
			svg.addEventListener('mouseup', endDrag);

			const handle = {
				svg: svg,
			};

			return handle;
		}

		setVisible(visible){
			this.node.visible = visible;

			const display = visible ? "" : "none";

			for(const cp of this.controlPoints){
				cp.positionHandle.svg.style.display = display;
				cp.targetHandle.svg.style.display = display;
			}

			this.visible = visible;
		}

		setDuration(duration){
			this.duration = duration;
		}

		getDuration(duration){
			return this.duration;
		}

		play(){

			const tStart = performance.now();
			const duration = this.duration;

			const originalyVisible = this.visible;
			this.setVisible(false);

			const onUpdate = (delta) => {

				let tNow = performance.now();
				let elapsed = (tNow - tStart) / 1000;
				let t = elapsed / duration;

				this.set(t);

				const frame = this.at(t);

				viewer.scene.view.position.copy(frame.position);
				viewer.scene.view.lookAt(frame.target);


				if(t > 1){
					this.setVisible(originalyVisible);

					this.viewer.removeEventListener("update", onUpdate);
				}

			};

			this.viewer.addEventListener("update", onUpdate);

		}

	}

	function loadPointCloud(viewer, data){

		let loadMaterial = (target) => {

			if(data.material){

				if(data.material.activeAttributeName != null){
					target.activeAttributeName = data.material.activeAttributeName;
				}

				if(data.material.ranges != null){
					for(let range of data.material.ranges){

						if(range.name === "elevationRange"){
							target.elevationRange = range.value;
						}else if(range.name === "intensityRange"){
							target.intensityRange = range.value;
						}else {
							target.setRange(range.name, range.value);
						}

					}
				}

				if(data.material.size != null){
					target.size = data.material.size;
				}

				if(data.material.minSize != null){
					target.minSize = data.material.minSize;
				}

				if(data.material.pointSizeType != null){
					target.pointSizeType = PointSizeType[data.material.pointSizeType];
				}

				if(data.material.matcap != null){
					target.matcap = data.material.matcap;
				}

			}else if(data.activeAttributeName != null){
				target.activeAttributeName = data.activeAttributeName;
			}else {
				// no material data
			}

		};

		const promise = new Promise((resolve) => {

			const names = viewer.scene.pointclouds.map(p => p.name);
			const alreadyExists = names.includes(data.name);

			if(alreadyExists){
				resolve();
				return;
			}

			Potree.loadPointCloud(data.url, data.name, (e) => {
				const {pointcloud} = e;

				pointcloud.position.set(...data.position);
				pointcloud.rotation.set(...data.rotation);
				pointcloud.scale.set(...data.scale);

				loadMaterial(pointcloud.material);

				viewer.scene.addPointCloud(pointcloud);

				resolve(pointcloud);
			});
		});

		return promise;
	}

	function loadMeasurement(viewer, data){

		const duplicate = viewer.scene.measurements.find(measure => measure.uuid === data.uuid);
		if(duplicate){
			return;
		}

		const measure = new Measure();

		measure.uuid = data.uuid;
		measure.name = data.name;
		measure.showDistances = data.showDistances;
		measure.showCoordinates = data.showCoordinates;
		measure.showArea = data.showArea;
		measure.closed = data.closed;
		measure.showAngles = data.showAngles;
		measure.showHeight = data.showHeight;
		measure.showCircle = data.showCircle;
		measure.showAzimuth = data.showAzimuth;
		measure.showEdges = data.showEdges;
		// color

		for(const point of data.points){
			const pos = new THREE.Vector3(...point);
			measure.addMarker(pos);
		}

		viewer.scene.addMeasurement(measure);

	}

	function loadVolume(viewer, data){

		const duplicate = viewer.scene.volumes.find(volume => volume.uuid === data.uuid);
		if(duplicate){
			return;
		}

		let volume = new Potree[data.type];

		volume.uuid = data.uuid;
		volume.name = data.name;
		volume.position.set(...data.position);
		volume.rotation.set(...data.rotation);
		volume.scale.set(...data.scale);
		volume.visible = data.visible;
		volume.clip = data.clip;

		viewer.scene.addVolume(volume);
	}

	function loadCameraAnimation(viewer, data){

		const duplicate = viewer.scene.cameraAnimations.find(a => a.uuid === data.uuid);
		if(duplicate){
			return;
		}

		const animation = new CameraAnimation(viewer);

		animation.uuid = data.uuid;
		animation.name = data.name;
		animation.duration = data.duration;
		animation.t = data.t;
		animation.curveType = data.curveType;
		animation.visible = data.visible;
		animation.controlPoints = [];

		for(const cpdata of data.controlPoints){
			const cp = animation.createControlPoint();

			cp.position.set(...cpdata.position);
			cp.target.set(...cpdata.target);
		}

		viewer.scene.addCameraAnimation(animation);
	}

	function loadOrientedImages(viewer, images){

		const {cameraParamsPath, imageParamsPath} = images;

		const duplicate = viewer.scene.orientedImages.find(i => i.imageParamsPath === imageParamsPath);
		if(duplicate){
			return;
		}

		Potree.OrientedImageLoader.load(cameraParamsPath, imageParamsPath, viewer).then( images => {
			viewer.scene.addOrientedImages(images);
		});

	}

	function loadGeopackage(viewer, geopackage){

		const path = geopackage.path;

		const duplicate = viewer.scene.geopackages.find(i => i.path === path);
		if(duplicate){
			return;
		}

		const projection = viewer.getProjection();

		proj4.defs("WGS84", "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs");
		proj4.defs("pointcloud", projection);
		const transform = proj4("WGS84", "pointcloud");
		const params = {
			transform: transform,
		};

		Potree.GeoPackageLoader.loadUrl(path, params).then(data => {
			viewer.scene.addGeopackage(data);
		});
		

	}

	function loadSettings(viewer, data){
		if(!data){
			return;
		}

		viewer.setPointBudget(data.pointBudget);
		viewer.setFOV(data.fov);
		viewer.setEDLEnabled(data.edlEnabled);
		viewer.setEDLRadius(data.edlRadius);
		viewer.setEDLStrength(data.edlStrength);
		viewer.setBackground(data.background);
		viewer.setMinNodeSize(data.minNodeSize);
		viewer.setShowBoundingBox(data.showBoundingBoxes);
	}

	function loadView(viewer, view){
		viewer.scene.view.position.set(...view.position);
		viewer.scene.view.lookAt(...view.target);
	}

	function loadAnnotationItem(item){

		const annotation = new Annotation({
			position: item.position,
			title: item.title,
			cameraPosition: item.cameraPosition,
			cameraTarget: item.cameraTarget,
		});


		annotation.description = item.description;
		annotation.uuid = item.uuid;

		if(item.offset){
			annotation.offset.set(...item.offset);
		}

		return annotation;
	}

	function loadAnnotations(viewer, data){

		if(!data){
			return;
		}

		const findDuplicate = (item) => {

			let duplicate = null;

			viewer.scene.annotations.traverse( a => {
				if(a.uuid === item.uuid){
					duplicate = a;
				}
			});

			return duplicate;
		};

		const traverse = (item, parent) => {

			const duplicate = findDuplicate(item);
			if(duplicate){
				return;
			}

			const annotation = loadAnnotationItem(item);

			for(const childItem of item.children){
				traverse(childItem, annotation);
			}

			parent.add(annotation);

		};

		for(const item of data){
			traverse(item, viewer.scene.annotations);
		}

	}

	function loadProfile(viewer, data){
		
		const {name, points} = data;

		const duplicate = viewer.scene.profiles.find(profile => profile.uuid === data.uuid);
		if(duplicate){
			return;
		}

		let profile = new Potree.Profile();
		profile.name = name;
		profile.uuid = data.uuid;

		profile.setWidth(data.width);

		for(const point of points){
			profile.addMarker(new THREE.Vector3(...point));
		}
		
		viewer.scene.addProfile(profile);
	}

	function loadClassification(viewer, data){
		if(!data){
			return;
		}

		const classifications = data;

		viewer.setClassifications(classifications);
	}

	async function loadProject(viewer, data){

		if(data.type !== "Potree"){
			console.error("not a valid Potree project");
			return;
		}

		loadSettings(viewer, data.settings);

		loadView(viewer, data.view);

		const pointcloudPromises = [];
		for(const pointcloud of data.pointclouds){
			const promise = loadPointCloud(viewer, pointcloud);
			pointcloudPromises.push(promise);
		}

		for(const measure of data.measurements){
			loadMeasurement(viewer, measure);
		}

		for(const volume of data.volumes){
			loadVolume(viewer, volume);
		}

		for(const animation of data.cameraAnimations){
			loadCameraAnimation(viewer, animation);
		}

		for(const profile of data.profiles){
			loadProfile(viewer, profile);
		}

		if(data.orientedImages){
			for(const images of data.orientedImages){
				loadOrientedImages(viewer, images);
			}
		}

		loadAnnotations(viewer, data.annotations);

		loadClassification(viewer, data.classification);

		// need to load at least one point cloud that defines the scene projection,
		// before we can load stuff in other projections such as geopackages
		//await Promise.any(pointcloudPromises); // (not yet supported)
		Utils.waitAny(pointcloudPromises).then( () => {
			if(data.geopackages){
				for(const geopackage of data.geopackages){
					loadGeopackage(viewer, geopackage);
				}
			}
		});

		await Promise.all(pointcloudPromises);
	}

	//
	// Algorithm by Christian Boucheny
	// shader code taken and adapted from CloudCompare
	//
	// see
	// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
	// http://www.kitware.com/source/home/post/9
	// https://tel.archives-ouvertes.fr/tel-00438464/document p. 115+ (french)

	class EyeDomeLightingMaterial extends THREE.RawShaderMaterial{

		constructor(parameters = {}){
			super();

			let uniforms = {
				screenWidth:    { type: 'f', 	value: 0 },
				screenHeight:   { type: 'f', 	value: 0 },
				edlStrength:    { type: 'f', 	value: 1.0 },
				uNear:          { type: 'f', 	value: 1.0 },
				uFar:           { type: 'f', 	value: 1.0 },
				radius:         { type: 'f', 	value: 1.0 },
				neighbours:     { type: '2fv', 	value: [] },
				depthMap:       { type: 't', 	value: null },
				uEDLColor:      { type: 't', 	value: null },
				uEDLDepth:      { type: 't', 	value: null },
				opacity:        { type: 'f',	value: 1.0 },
				uProj:          { type: "Matrix4fv", value: [] },
			};

			this.setValues({
				uniforms: uniforms,
				vertexShader: this.getDefines() + Shaders['edl.vs'],
				fragmentShader: this.getDefines() + Shaders['edl.fs'],
				lights: false
			});

			this.neighbourCount = 8;
		}

		getDefines() {
			let defines = '';

			defines += '#define NEIGHBOUR_COUNT ' + this.neighbourCount + '\n';

			return defines;
		}

		updateShaderSource() {

			let vs = this.getDefines() + Shaders['edl.vs'];
			let fs = this.getDefines() + Shaders['edl.fs'];

			this.setValues({
				vertexShader: vs,
				fragmentShader: fs
			});

			this.uniforms.neighbours.value = this.neighbours;

			this.needsUpdate = true;
		}

		get neighbourCount(){
			return this._neighbourCount;
		}

		set neighbourCount(value){
			if (this._neighbourCount !== value) {
				this._neighbourCount = value;
				this.neighbours = new Float32Array(this._neighbourCount * 2);
				for (let c = 0; c < this._neighbourCount; c++) {
					this.neighbours[2 * c + 0] = Math.cos(2 * c * Math.PI / this._neighbourCount);
					this.neighbours[2 * c + 1] = Math.sin(2 * c * Math.PI / this._neighbourCount);
				}

				this.updateShaderSource();
			}
		}

		
	}

	class NormalizationEDLMaterial extends THREE.RawShaderMaterial{

		constructor(parameters = {}){
			super();

			let uniforms = {
				screenWidth:    { type: 'f',   value: 0 },
				screenHeight:   { type: 'f',   value: 0 },
				edlStrength:    { type: 'f',   value: 1.0 },
				radius:         { type: 'f',   value: 1.0 },
				neighbours:     { type: '2fv', value: [] },
				uEDLMap:        { type: 't',   value: null },
				uDepthMap:      { type: 't',   value: null },
				uWeightMap:     { type: 't',   value: null },
			};

			this.setValues({
				uniforms: uniforms,
				vertexShader: this.getDefines() + Shaders['normalize.vs'],
				fragmentShader: this.getDefines() + Shaders['normalize_and_edl.fs'],
			});

			this.neighbourCount = 8;
		}

		getDefines() {
			let defines = '';

			defines += '#define NEIGHBOUR_COUNT ' + this.neighbourCount + '\n';

			return defines;
		}

		updateShaderSource() {

			let vs = this.getDefines() + Shaders['normalize.vs'];
			let fs = this.getDefines() + Shaders['normalize_and_edl.fs'];

			this.setValues({
				vertexShader: vs,
				fragmentShader: fs
			});

			this.uniforms.neighbours.value = this.neighbours;

			this.needsUpdate = true;
		}

		get neighbourCount(){
			return this._neighbourCount;
		}

		set neighbourCount(value){
			if (this._neighbourCount !== value) {
				this._neighbourCount = value;
				this.neighbours = new Float32Array(this._neighbourCount * 2);
				for (let c = 0; c < this._neighbourCount; c++) {
					this.neighbours[2 * c + 0] = Math.cos(2 * c * Math.PI / this._neighbourCount);
					this.neighbours[2 * c + 1] = Math.sin(2 * c * Math.PI / this._neighbourCount);
				}

				this.updateShaderSource();
			}
		}
		
	}

	class NormalizationMaterial extends THREE.RawShaderMaterial{

		constructor(parameters = {}){
			super();

			let uniforms = {
				uDepthMap:		{ type: 't', value: null },
				uWeightMap:		{ type: 't', value: null },
			};

			this.setValues({
				uniforms: uniforms,
				vertexShader: this.getDefines() + Shaders['normalize.vs'],
				fragmentShader: this.getDefines() + Shaders['normalize.fs'],
			});
		}

		getDefines() {
			let defines = '';

			return defines;
		}

		updateShaderSource() {

			let vs = this.getDefines() + Shaders['normalize.vs'];
			let fs = this.getDefines() + Shaders['normalize.fs'];

			this.setValues({
				vertexShader: vs,
				fragmentShader: fs
			});

			this.needsUpdate = true;
		}

	}

	/**
	 * laslaz code taken and adapted from plas.io js-laslaz
	 *	http://plas.io/
	 *  https://github.com/verma/plasio
	 *
	 * Thanks to Uday Verma and Howard Butler
	 *
	 */

	class LasLazLoader {

		constructor (version, extension) {
			if (typeof (version) === 'string') {
				this.version = new Version(version);
			} else {
				this.version = version;
			}

			this.extension = extension;
		}

		static progressCB () {

		}

		load (node) {
			if (node.loaded) {
				return;
			}

			let url = node.getURL();

			if (this.version.equalOrHigher('1.4')) {
				url += `.${this.extension}`;
			}

			let xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType = 'arraybuffer';
			xhr.overrideMimeType('text/plain; charset=x-user-defined');
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200 || xhr.status === 0) {
						let buffer = xhr.response;
						this.parse(node, buffer);
					} else {
						console.log('Failed to load file! HTTP status: ' + xhr.status + ', file: ' + url);
					}
				}
			};

			xhr.send(null);
		}

		async parse(node, buffer){
			let lf = new LASFile(buffer);
			let handler = new LasLazBatcher(node);

			try{
				 await lf.open();
				 lf.isOpen = true;
			}catch(e){
				console.log("failed to open file. :(");

				return;
			}

			let header = await lf.getHeader();

			let skip = 1;
			let totalRead = 0;
			let totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);

			let hasMoreData = true;

			while(hasMoreData){
				let data = await lf.readData(1000 * 1000, 0, skip);

				handler.push(new LASDecoder(data.buffer,
					header.pointsFormatId,
					header.pointsStructSize,
					data.count,
					header.scale,
					header.offset,
					header.mins, header.maxs));

				totalRead += data.count;
				LasLazLoader.progressCB(totalRead / totalToRead);

				hasMoreData = data.hasMoreData;
			}

			header.totalRead = totalRead;
			header.versionAsString = lf.versionAsString;
			header.isCompressed = lf.isCompressed;

			LasLazLoader.progressCB(1);

			try{
				await lf.close();

				lf.isOpen = false;
			}catch(e){
				console.error("failed to close las/laz file!!!");
				
				throw e;
			}
		}

		handle (node, url) {

		}
	};

	class LasLazBatcher{

		constructor (node) {
			this.node = node;
		}

		push (lasBuffer) {
			const workerPath = Potree.scriptPath + '/workers/LASDecoderWorker.js';
			const worker = Potree.workerPool.getWorker(workerPath);
			const node = this.node;
			const pointAttributes = node.pcoGeometry.pointAttributes;

			worker.onmessage = (e) => {
				let geometry = new THREE.BufferGeometry();
				let numPoints = lasBuffer.pointsCount;

				let positions = new Float32Array(e.data.position);
				let colors = new Uint8Array(e.data.color);
				let intensities = new Float32Array(e.data.intensity);
				let classifications = new Uint8Array(e.data.classification);
				let returnNumbers = new Uint8Array(e.data.returnNumber);
				let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
				let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
				let indices = new Uint8Array(e.data.indices);

				geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
				geometry.addAttribute('color', new THREE.BufferAttribute(colors, 4, true));
				geometry.addAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
				geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
				geometry.addAttribute('return number', new THREE.BufferAttribute(returnNumbers, 1));
				geometry.addAttribute('number of returns', new THREE.BufferAttribute(numberOfReturns, 1));
				geometry.addAttribute('source id', new THREE.BufferAttribute(pointSourceIDs, 1));
				geometry.addAttribute('indices', new THREE.BufferAttribute(indices, 4));
				geometry.attributes.indices.normalized = true;

				for(const key in e.data.ranges){
					const range = e.data.ranges[key];

					const attribute = pointAttributes.attributes.find(a => a.name === key);
					attribute.range[0] = Math.min(attribute.range[0], range[0]);
					attribute.range[1] = Math.max(attribute.range[1], range[1]);
				}

				let tightBoundingBox = new THREE.Box3(
					new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
					new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
				);

				geometry.boundingBox = this.node.boundingBox;
				this.node.tightBoundingBox = tightBoundingBox;

				this.node.geometry = geometry;
				this.node.numPoints = numPoints;
				this.node.loaded = true;
				this.node.loading = false;
				Potree.numNodesLoading--;
				this.node.mean = new THREE.Vector3(...e.data.mean);

				Potree.workerPool.returnWorker(workerPath, worker);
			};

			let message = {
				buffer: lasBuffer.arrayb,
				numPoints: lasBuffer.pointsCount,
				pointSize: lasBuffer.pointSize,
				pointFormatID: 2,
				scale: lasBuffer.scale,
				offset: lasBuffer.offset,
				mins: lasBuffer.mins,
				maxs: lasBuffer.maxs
			};
			worker.postMessage(message, [message.buffer]);
		};
	}

	class BinaryLoader{

		constructor(version, boundingBox, scale){
			if (typeof (version) === 'string') {
				this.version = new Version(version);
			} else {
				this.version = version;
			}

			this.boundingBox = boundingBox;
			this.scale = scale;
		}

		load(node){
			if (node.loaded) {
				return;
			}

			let url = node.getURL();

			if (this.version.equalOrHigher('1.4')) {
				url += '.bin';
			}

			let xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType = 'arraybuffer';
			xhr.overrideMimeType('text/plain; charset=x-user-defined');
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if((xhr.status === 200 || xhr.status === 0) &&  xhr.response !== null){
						let buffer = xhr.response;
						this.parse(node, buffer);
					} else {
						//console.error(`Failed to load file! HTTP status: ${xhr.status}, file: ${url}`);
						throw new Error(`Failed to load file! HTTP status: ${xhr.status}, file: ${url}`);
					}
				}
			};
			
			try {
				xhr.send(null);
			} catch (e) {
				console.log('fehler beim laden der punktwolke: ' + e);
			}
		};

		parse(node, buffer){
			let pointAttributes = node.pcoGeometry.pointAttributes;
			let numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;

			if (this.version.upTo('1.5')) {
				node.numPoints = numPoints;
			}

			let workerPath = Potree.scriptPath + '/workers/BinaryDecoderWorker.js';
			let worker = Potree.workerPool.getWorker(workerPath);

			worker.onmessage = function (e) {

				let data = e.data;
				let buffers = data.attributeBuffers;
				let tightBoundingBox = new THREE.Box3(
					new THREE.Vector3().fromArray(data.tightBoundingBox.min),
					new THREE.Vector3().fromArray(data.tightBoundingBox.max)
				);

				Potree.workerPool.returnWorker(workerPath, worker);

				let geometry = new THREE.BufferGeometry();

				for(let property in buffers){
					let buffer = buffers[property].buffer;
					let batchAttribute = buffers[property].attribute;

					if (property === "POSITION_CARTESIAN") {
						geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					} else if (property === "rgba") {
						geometry.addAttribute("rgba", new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
					} else if (property === "NORMAL_SPHEREMAPPED") {
						geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					} else if (property === "NORMAL_OCT16") {
						geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					} else if (property === "NORMAL") {
						geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					} else if (property === "INDICES") {
						let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
						bufferAttribute.normalized = true;
						geometry.addAttribute('indices', bufferAttribute);
					} else if (property === "SPACING") {
						let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
						geometry.addAttribute('spacing', bufferAttribute);
					} else {
						const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);

						bufferAttribute.potree = {
							offset: buffers[property].offset,
							scale: buffers[property].scale,
							preciseBuffer: buffers[property].preciseBuffer,
							range: batchAttribute.range,
						};

						geometry.addAttribute(property, bufferAttribute);

						const attribute = pointAttributes.attributes.find(a => a.name === batchAttribute.name);
						attribute.range[0] = Math.min(attribute.range[0], batchAttribute.range[0]);
						attribute.range[1] = Math.max(attribute.range[1], batchAttribute.range[1]);

						if(node.getLevel() === 0){
							attribute.initialRange = batchAttribute.range;
						}

					}
				}

				tightBoundingBox.max.sub(tightBoundingBox.min);
				tightBoundingBox.min.set(0, 0, 0);

				let numPoints = e.data.buffer.byteLength / pointAttributes.byteSize;
				
				node.numPoints = numPoints;
				node.geometry = geometry;
				node.mean = new THREE.Vector3(...data.mean);
				node.tightBoundingBox = tightBoundingBox;
				node.loaded = true;
				node.loading = false;
				node.estimatedSpacing = data.estimatedSpacing;
				Potree.numNodesLoading--;
			};

			let message = {
				buffer: buffer,
				pointAttributes: pointAttributes,
				version: this.version.version,
				min: [ node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z ],
				offset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z],
				scale: this.scale,
				spacing: node.spacing,
				hasChildren: node.hasChildren,
				name: node.name
			};
			worker.postMessage(message, [message.buffer]);
		};

		
	}

	function parseAttributes(cloudjs){

		let version = new Version(cloudjs.version);

		const replacements = {
			"COLOR_PACKED": "rgba",
			"RGBA": "rgba",
			"INTENSITY": "intensity",
			"CLASSIFICATION": "classification",
		};

		const replaceOldNames = (old) => {
			if(replacements[old]){
				return replacements[old];
			}else {
				return old;
			}
		};

		const pointAttributes = [];
		if(version.upTo('1.7')){
			
			for(let attributeName of cloudjs.pointAttributes){
				const oldAttribute = PointAttribute[attributeName];

				const attribute = {
					name: oldAttribute.name,
					size: oldAttribute.byteSize,
					elements: oldAttribute.numElements,
					elementSize: oldAttribute.byteSize / oldAttribute.numElements,
					type: oldAttribute.type.name,
					description: "",
				};

				pointAttributes.push(attribute);
			}

		}else {
			pointAttributes.push(...cloudjs.pointAttributes);
		}


		{
			const attributes = new PointAttributes();

			const typeConversion = {
				int8:   PointAttributeTypes.DATA_TYPE_INT8,
				int16:  PointAttributeTypes.DATA_TYPE_INT16,
				int32:  PointAttributeTypes.DATA_TYPE_INT32,
				int64:  PointAttributeTypes.DATA_TYPE_INT64,
				uint8:  PointAttributeTypes.DATA_TYPE_UINT8,
				uint16: PointAttributeTypes.DATA_TYPE_UINT16,
				uint32: PointAttributeTypes.DATA_TYPE_UINT32,
				uint64: PointAttributeTypes.DATA_TYPE_UINT64,
				double: PointAttributeTypes.DATA_TYPE_DOUBLE,
				float:  PointAttributeTypes.DATA_TYPE_FLOAT,
			};

			for(const jsAttribute of pointAttributes){
				const name = replaceOldNames(jsAttribute.name);
				const type = typeConversion[jsAttribute.type];
				const numElements = jsAttribute.elements;
				const description = jsAttribute.description;

				const attribute = new PointAttribute(name, type, numElements);

				attributes.add(attribute);
			}

			{
				// check if it has normals
				let hasNormals = 
					pointAttributes.find(a => a.name === "NormalX") !== undefined &&
					pointAttributes.find(a => a.name === "NormalY") !== undefined &&
					pointAttributes.find(a => a.name === "NormalZ") !== undefined;

				if(hasNormals){
					let vector = {
						name: "NORMAL",
						attributes: ["NormalX", "NormalY", "NormalZ"],
					};
					attributes.addVector(vector);
				}
			}

			return attributes;
		}

	}

	function lasLazAttributes(fMno){
		const attributes = new PointAttributes();

		attributes.add(PointAttribute.POSITION_CARTESIAN);
		attributes.add(new PointAttribute("rgba", PointAttributeTypes.DATA_TYPE_UINT8, 4));
		attributes.add(new PointAttribute("intensity", PointAttributeTypes.DATA_TYPE_UINT16, 1));
		attributes.add(new PointAttribute("classification", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("gps-time", PointAttributeTypes.DATA_TYPE_DOUBLE, 1));
		attributes.add(new PointAttribute("number of returns", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("return number", PointAttributeTypes.DATA_TYPE_UINT8, 1));
		attributes.add(new PointAttribute("source id", PointAttributeTypes.DATA_TYPE_UINT16, 1));
		//attributes.add(new PointAttribute("pointSourceID", PointAttributeTypes.DATA_TYPE_INT8, 4));


		return attributes;
	}

	class POCLoader {

		static load(url, callback){
			try {
				let pco = new PointCloudOctreeGeometry();
				pco.url = url;
				let xhr = XHRFactory.createXMLHttpRequest();
				xhr.open('GET', url, true);

				xhr.onreadystatechange = function () {
					if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
						let fMno = JSON.parse(xhr.responseText);

						let version = new Version(fMno.version);

						// assume octreeDir is absolute if it starts with http
						if (fMno.octreeDir.indexOf('http') === 0) {
							pco.octreeDir = fMno.octreeDir;
						} else {
							pco.octreeDir = url + '/../' + fMno.octreeDir;
						}

						pco.spacing = fMno.spacing;
						pco.hierarchyStepSize = fMno.hierarchyStepSize;

						pco.pointAttributes = fMno.pointAttributes;

						let min = new THREE.Vector3(fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz);
						let max = new THREE.Vector3(fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz);
						let boundingBox = new THREE.Box3(min, max);
						let tightBoundingBox = boundingBox.clone();

						if (fMno.tightBoundingBox) {
							tightBoundingBox.min.copy(new THREE.Vector3(fMno.tightBoundingBox.lx, fMno.tightBoundingBox.ly, fMno.tightBoundingBox.lz));
							tightBoundingBox.max.copy(new THREE.Vector3(fMno.tightBoundingBox.ux, fMno.tightBoundingBox.uy, fMno.tightBoundingBox.uz));
						}

						let offset = min.clone();

						boundingBox.min.sub(offset);
						boundingBox.max.sub(offset);

						tightBoundingBox.min.sub(offset);
						tightBoundingBox.max.sub(offset);

						pco.projection = fMno.projection;
						pco.boundingBox = boundingBox;
						pco.tightBoundingBox = tightBoundingBox;
						pco.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
						pco.tightBoundingSphere = tightBoundingBox.getBoundingSphere(new THREE.Sphere());
						pco.offset = offset;
						if (fMno.pointAttributes === 'LAS') {
							pco.loader = new LasLazLoader(fMno.version, "las");
							pco.pointAttributes = lasLazAttributes(fMno);
						} else if (fMno.pointAttributes === 'LAZ') {
							pco.loader = new LasLazLoader(fMno.version, "laz");
							pco.pointAttributes = lasLazAttributes(fMno);
						} else {
							pco.loader = new BinaryLoader(fMno.version, boundingBox, fMno.scale);
							pco.pointAttributes = parseAttributes(fMno);
						}

						let nodes = {};

						{ // load root
							let name = 'r';

							let root = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
							root.level = 0;
							root.hasChildren = true;
							root.spacing = pco.spacing;
							if (version.upTo('1.5')) {
								root.numPoints = fMno.hierarchy[0][1];
							} else {
								root.numPoints = 0;
							}
							pco.root = root;
							pco.root.load();
							nodes[name] = root;
						}

						// load remaining hierarchy
						if (version.upTo('1.4')) {
							for (let i = 1; i < fMno.hierarchy.length; i++) {
								let name = fMno.hierarchy[i][0];
								let numPoints = fMno.hierarchy[i][1];
								let index = parseInt(name.charAt(name.length - 1));
								let parentName = name.substring(0, name.length - 1);
								let parentNode = nodes[parentName];
								let level = name.length - 1;
								//let boundingBox = POCLoader.createChildAABB(parentNode.boundingBox, index);
								let boundingBox = Utils.createChildAABB(parentNode.boundingBox, index);

								let node = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
								node.level = level;
								node.numPoints = numPoints;
								node.spacing = pco.spacing / Math.pow(2, level);
								parentNode.addChild(node);
								nodes[name] = node;
							}
						}

						pco.nodes = nodes;

						callback(pco);
					}
				};

				xhr.send(null);
			} catch (e) {
				console.log("loading failed: '" + url + "'");
				console.log(e);

				callback();
			}
		}

		loadPointAttributes(mno){
			let fpa = mno.pointAttributes;
			let pa = new PointAttributes();

			for (let i = 0; i < fpa.length; i++) {
				let pointAttribute = PointAttribute[fpa[i]];
				pa.add(pointAttribute);
			}

			return pa;
		}

		createChildAABB(aabb, index){
			let min = aabb.min.clone();
			let max = aabb.max.clone();
			let size = new THREE.Vector3().subVectors(max, min);

			if ((index & 0b0001) > 0) {
				min.z += size.z / 2;
			} else {
				max.z -= size.z / 2;
			}

			if ((index & 0b0010) > 0) {
				min.y += size.y / 2;
			} else {
				max.y -= size.y / 2;
			}

			if ((index & 0b0100) > 0) {
				min.x += size.x / 2;
			} else {
				max.x -= size.x / 2;
			}

			return new THREE.Box3(min, max);
		}
	}

	class OctreeGeometry{

		constructor(){
			this.url = null;
			this.spacing = 0;
			this.boundingBox = null;
			this.root = null;
			this.pointAttributes = null;
			this.loader = null;
		}

	};

	class OctreeGeometryNode{

		constructor(name, octreeGeometry, boundingBox){
			this.id = OctreeGeometryNode.IDCount++;
			this.name = name;
			this.index = parseInt(name.charAt(name.length - 1));
			this.octreeGeometry = octreeGeometry;
			this.boundingBox = boundingBox;
			this.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
			this.children = {};
			this.numPoints = 0;
			this.level = null;
			this.oneTimeDisposeHandlers = [];
		}

		isGeometryNode(){
			return true;
		}

		getLevel(){
			return this.level;
		}

		isTreeNode(){
			return false;
		}

		isLoaded(){
			return this.loaded;
		}

		getBoundingSphere(){
			return this.boundingSphere;
		}

		getBoundingBox(){
			return this.boundingBox;
		}

		getChildren(){
			let children = [];

			for (let i = 0; i < 8; i++) {
				if (this.children[i]) {
					children.push(this.children[i]);
				}
			}

			return children;
		}

		getBoundingBox(){
			return this.boundingBox;
		}

		load(){

			if (Potree.numNodesLoading >= Potree.maxNodesLoading) {
				return;
			}

			this.octreeGeometry.loader.load(this);
		}

		getNumPoints(){
			return this.numPoints;
		}

		dispose(){
			if (this.geometry && this.parent != null) {
				this.geometry.dispose();
				this.geometry = null;
				this.loaded = false;

				// this.dispatchEvent( { type: 'dispose' } );
				for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
					let handler = this.oneTimeDisposeHandlers[i];
					handler();
				}
				this.oneTimeDisposeHandlers = [];
			}
		}

	};

	OctreeGeometryNode.IDCount = 0;

	// let loadedNodes = new Set();

	class NodeLoader{

		constructor(url){
			this.url = url;
		}

		async load(node){

			if(node.loaded || node.loading){
				return;
			}

			node.loading = true;
			Potree.numNodesLoading++;

			// console.log(node.name, node.numPoints);

			// if(loadedNodes.has(node.name)){
			// 	// debugger;
			// }
			// loadedNodes.add(node.name);

			try{
				if(node.nodeType === 2){
					await this.loadHierarchy(node);
				}

				let {byteOffset, byteSize} = node;


				let urlOctree = `${this.url}/../octree.bin`;

				let first = byteOffset;
				let last = byteOffset + byteSize - 1n;

				let buffer;

				if(byteSize === 0n){
					buffer = new ArrayBuffer(0);
					console.warn(`loaded node with 0 bytes: ${node.name}`);
				}else {
					let response = await fetch(urlOctree, {
						headers: {
							'content-type': 'multipart/byteranges',
							'Range': `bytes=${first}-${last}`,
						},
					});

					buffer = await response.arrayBuffer();
				}

				let workerPath;
				if(this.metadata.encoding === "BROTLI"){
					workerPath = Potree.scriptPath + '/workers/2.0/DecoderWorker_brotli.js';
				}else {
					workerPath = Potree.scriptPath + '/workers/2.0/DecoderWorker.js';
				}

				let worker = Potree.workerPool.getWorker(workerPath);

				worker.onmessage = function (e) {

					let data = e.data;
					let buffers = data.attributeBuffers;

					Potree.workerPool.returnWorker(workerPath, worker);

					let geometry = new THREE.BufferGeometry();
					
					for(let property in buffers){

						let buffer = buffers[property].buffer;

						if(property === "position"){
							geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
						}else if(property === "rgba"){
							geometry.addAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
						}else if(property === "NORMAL"){
							//geometry.addAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
							geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
						}else if (property === "INDICES") {
							let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
							bufferAttribute.normalized = true;
							geometry.addAttribute('indices', bufferAttribute);
						}else {
							const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);

							let batchAttribute = buffers[property].attribute;
							bufferAttribute.potree = {
								offset: buffers[property].offset,
								scale: buffers[property].scale,
								preciseBuffer: buffers[property].preciseBuffer,
								range: batchAttribute.range,
							};

							geometry.addAttribute(property, bufferAttribute);
						}

					}
					// indices ??

					node.density = data.density;
					node.geometry = geometry;
					node.loaded = true;
					node.loading = false;
					Potree.numNodesLoading--;
				};

				let pointAttributes = node.octreeGeometry.pointAttributes;
				let scale = node.octreeGeometry.scale;

				let box = node.boundingBox;
				let min = node.octreeGeometry.offset.clone().add(box.min);
				let size = box.max.clone().sub(box.min);
				let max = min.clone().add(size);
				let numPoints = node.numPoints;

				let offset = node.octreeGeometry.loader.offset;

				let message = {
					name: node.name,
					buffer: buffer,
					pointAttributes: pointAttributes,
					scale: scale,
					min: min,
					max: max,
					size: size,
					offset: offset,
					numPoints: numPoints
				};

				worker.postMessage(message, [message.buffer]);
			}catch(e){
				node.loaded = false;
				node.loading = false;
				Potree.numNodesLoading--;

				console.log(`failed to load ${node.name}`);
				console.log(e);
				console.log(`trying again!`);
			}
		}

		parseHierarchy(node, buffer){

			let view = new DataView(buffer);
			let tStart = performance.now();

			let bytesPerNode = 22;
			let numNodes = buffer.byteLength / bytesPerNode;

			let octree = node.octreeGeometry;
			// let nodes = [node];
			let nodes = new Array(numNodes);
			nodes[0] = node;
			let nodePos = 1;

			for(let i = 0; i < numNodes; i++){
				let current = nodes[i];

				let type = view.getUint8(i * bytesPerNode + 0);
				let childMask = view.getUint8(i * bytesPerNode + 1);
				let numPoints = view.getUint32(i * bytesPerNode + 2, true);
				let byteOffset = view.getBigInt64(i * bytesPerNode + 6, true);
				let byteSize = view.getBigInt64(i * bytesPerNode + 14, true);

				// if(byteSize === 0n){
				// 	// debugger;
				// }


				if(current.nodeType === 2){
					// replace proxy with real node
					current.byteOffset = byteOffset;
					current.byteSize = byteSize;
					current.numPoints = numPoints;
				}else if(type === 2){
					// load proxy
					current.hierarchyByteOffset = byteOffset;
					current.hierarchyByteSize = byteSize;
					current.numPoints = numPoints;
				}else {
					// load real node 
					current.byteOffset = byteOffset;
					current.byteSize = byteSize;
					current.numPoints = numPoints;
				}
				
				current.nodeType = type;

				if(current.nodeType === 2){
					continue;
				}

				for(let childIndex = 0; childIndex < 8; childIndex++){
					let childExists = ((1 << childIndex) & childMask) !== 0;

					if(!childExists){
						continue;
					}

					let childName = current.name + childIndex;

					let childAABB = createChildAABB(current.boundingBox, childIndex);
					let child = new OctreeGeometryNode(childName, octree, childAABB);
					child.name = childName;
					child.spacing = current.spacing / 2;
					child.level = current.level + 1;

					current.children[childIndex] = child;
					child.parent = current;

					// nodes.push(child);
					nodes[nodePos] = child;
					nodePos++;
				}

				// if((i % 500) === 0){
				// 	yield;
				// }
			}

			let duration = (performance.now() - tStart);

			// if(duration > 20){
			// 	let msg = `duration: ${duration}ms, numNodes: ${numNodes}`;
			// 	console.log(msg);
			// }
		}

		async loadHierarchy(node){

			let {hierarchyByteOffset, hierarchyByteSize} = node;
			let hierarchyPath = `${this.url}/../hierarchy.bin`;
			
			let first = hierarchyByteOffset;
			let last = first + hierarchyByteSize - 1n;

			let response = await fetch(hierarchyPath, {
				headers: {
					'content-type': 'multipart/byteranges',
					'Range': `bytes=${first}-${last}`,
				},
			});



			let buffer = await response.arrayBuffer();

			this.parseHierarchy(node, buffer);

			// let promise = new Promise((resolve) => {
			// 	let generator = this.parseHierarchy(node, buffer);

			// 	let repeatUntilDone = () => {
			// 		let result = generator.next();

			// 		if(result.done){
			// 			resolve();
			// 		}else{
			// 			requestAnimationFrame(repeatUntilDone);
			// 		}
			// 	};
				
			// 	repeatUntilDone();
			// });

			// await promise;

			



		}

	}

	let tmpVec3 = new THREE.Vector3();
	function createChildAABB(aabb, index){
		let min = aabb.min.clone();
		let max = aabb.max.clone();
		let size = tmpVec3.subVectors(max, min);

		if ((index & 0b0001) > 0) {
			min.z += size.z / 2;
		} else {
			max.z -= size.z / 2;
		}

		if ((index & 0b0010) > 0) {
			min.y += size.y / 2;
		} else {
			max.y -= size.y / 2;
		}
		
		if ((index & 0b0100) > 0) {
			min.x += size.x / 2;
		} else {
			max.x -= size.x / 2;
		}

		return new THREE.Box3(min, max);
	}

	let typenameTypeattributeMap = {
		"double": PointAttributeTypes.DATA_TYPE_DOUBLE,
		"float": PointAttributeTypes.DATA_TYPE_FLOAT,
		"int8": PointAttributeTypes.DATA_TYPE_INT8,
		"uint8": PointAttributeTypes.DATA_TYPE_UINT8,
		"int16": PointAttributeTypes.DATA_TYPE_INT16,
		"uint16": PointAttributeTypes.DATA_TYPE_UINT16,
		"int32": PointAttributeTypes.DATA_TYPE_INT32,
		"uint32": PointAttributeTypes.DATA_TYPE_UINT32,
		"int64": PointAttributeTypes.DATA_TYPE_INT64,
		"uint64": PointAttributeTypes.DATA_TYPE_UINT64,
	};

	class OctreeLoader{

		static parseAttributes(jsonAttributes){

			let attributes = new PointAttributes();

			let replacements = {
				"rgb": "rgba",
			};

			for(let jsonAttribute of jsonAttributes){
				let {name, description, size, numElements, elementSize, min, max} = jsonAttribute;

				let type = typenameTypeattributeMap[jsonAttribute.type];

				let potreeAttributeName = replacements[name] ? replacements[name] : name;

				let attribute = new PointAttribute(potreeAttributeName, type, numElements);

				if(numElements === 1){
					attribute.range = [min[0], max[0]];
				}else {
					attribute.range = [min, max];
				}
				
				attribute.initialRange = attribute.range;

				attributes.add(attribute);
			}

			{
				// check if it has normals
				let hasNormals = 
					attributes.attributes.find(a => a.name === "NormalX") !== undefined &&
					attributes.attributes.find(a => a.name === "NormalY") !== undefined &&
					attributes.attributes.find(a => a.name === "NormalZ") !== undefined;

				if(hasNormals){
					let vector = {
						name: "NORMAL",
						attributes: ["NormalX", "NormalY", "NormalZ"],
					};
					attributes.addVector(vector);
				}
			}

			return attributes;
		}

		static async load(url){

			let response = await fetch(url);
			let metadata = await response.json();

			let attributes = OctreeLoader.parseAttributes(metadata.attributes);

			let loader = new NodeLoader(url);
			loader.metadata = metadata;
			loader.attributes = attributes;
			loader.scale = metadata.scale;
			loader.offset = metadata.offset;

			let octree = new OctreeGeometry();
			octree.url = url;
			octree.spacing = metadata.spacing;
			octree.scale = metadata.scale;

			// let aPosition = metadata.attributes.find(a => a.name === "position");
			// octree

			let min = new THREE.Vector3(...metadata.boundingBox.min);
			let max = new THREE.Vector3(...metadata.boundingBox.max);
			let boundingBox = new THREE.Box3(min, max);

			let offset = min.clone();
			boundingBox.min.sub(offset);
			boundingBox.max.sub(offset);

			octree.projection = metadata.projection;
			octree.boundingBox = boundingBox;
			octree.tightBoundingBox = boundingBox.clone();
			octree.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
			octree.tightBoundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
			octree.offset = offset;
			octree.pointAttributes = OctreeLoader.parseAttributes(metadata.attributes);
			octree.loader = loader;

			let root = new OctreeGeometryNode("r", octree, boundingBox);
			root.level = 0;
			root.nodeType = 2;
			root.hierarchyByteOffset = 0n;
			root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);
			root.hasChildren = false;
			root.spacing = octree.spacing;
			root.byteOffset = 0;

			octree.root = root;

			loader.load(root);

			let result = {
				geometry: octree,
			};

			return result;

		}

	};

	/**
	 * @author Connor Manning
	 */

	class EptLoader {
		static async load(file, callback) {

			let response = await fetch(file);
			let json = await response.json();

			let url = file.substr(0, file.lastIndexOf('ept.json'));
			let geometry = new Potree.PointCloudEptGeometry(url, json);
			let root = new Potree.PointCloudEptGeometryNode(geometry);

			geometry.root = root;
			geometry.root.load();

			callback(geometry);
		}
	};

	class EptBinaryLoader {
		extension() {
			return '.bin';
		}

		workerPath() {
			return Potree.scriptPath + '/workers/EptBinaryDecoderWorker.js';
		}

		load(node) {
			if (node.loaded) return;

			let url = node.url() + this.extension();

			let xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType = 'arraybuffer';
			xhr.overrideMimeType('text/plain; charset=x-user-defined');
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200) {
						let buffer = xhr.response;
						this.parse(node, buffer);
					} else {
						console.log('Failed ' + url + ': ' + xhr.status);
					}
				}
			};

			try {
				xhr.send(null);
			}
			catch (e) {
				console.log('Failed request: ' + e);
			}
		}

		parse(node, buffer) {
			let workerPath = this.workerPath();
			let worker = Potree.workerPool.getWorker(workerPath);

			worker.onmessage = function(e) {
				let g = new THREE.BufferGeometry();
				let numPoints = e.data.numPoints;

				let position = new Float32Array(e.data.position);
				g.addAttribute('position', new THREE.BufferAttribute(position, 3));

				let indices = new Uint8Array(e.data.indices);
				g.addAttribute('indices', new THREE.BufferAttribute(indices, 4));

				if (e.data.color) {
					let color = new Uint8Array(e.data.color);
					g.addAttribute('color', new THREE.BufferAttribute(color, 4, true));
				}
				if (e.data.intensity) {
					let intensity = new Float32Array(e.data.intensity);
					g.addAttribute('intensity',
							new THREE.BufferAttribute(intensity, 1));
				}
				if (e.data.classification) {
					let classification = new Uint8Array(e.data.classification);
					g.addAttribute('classification',
							new THREE.BufferAttribute(classification, 1));
				}
				if (e.data.returnNumber) {
					let returnNumber = new Uint8Array(e.data.returnNumber);
					g.addAttribute('return number',
							new THREE.BufferAttribute(returnNumber, 1));
				}
				if (e.data.numberOfReturns) {
					let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
					g.addAttribute('number of returns',
							new THREE.BufferAttribute(numberOfReturns, 1));
				}
				if (e.data.pointSourceId) {
					let pointSourceId = new Uint16Array(e.data.pointSourceId);
					g.addAttribute('source id',
							new THREE.BufferAttribute(pointSourceId, 1));
				}

				g.attributes.indices.normalized = true;

				let tightBoundingBox = new THREE.Box3(
					new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
					new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
				);

				node.doneLoading(
						g,
						tightBoundingBox,
						numPoints,
						new THREE.Vector3(...e.data.mean));

				Potree.workerPool.returnWorker(workerPath, worker);
			};

			let toArray = (v) => [v.x, v.y, v.z];
			let message = {
				buffer: buffer,
				schema: node.ept.schema,
				scale: node.ept.eptScale,
				offset: node.ept.eptOffset,
				mins: toArray(node.key.b.min)
			};

			worker.postMessage(message, [message.buffer]);
		}
	};

	/**
	 * laslaz code taken and adapted from plas.io js-laslaz
	 *	  http://plas.io/
	 *	https://github.com/verma/plasio
	 *
	 * Thanks to Uday Verma and Howard Butler
	 *
	 */

	class EptLaszipLoader {
		load(node) {
			if (node.loaded) return;

			let url = node.url() + '.laz';

			let xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', url, true);
			xhr.responseType = 'arraybuffer';
			xhr.overrideMimeType('text/plain; charset=x-user-defined');
			xhr.onreadystatechange = () => {
				if (xhr.readyState === 4) {
					if (xhr.status === 200) {
						let buffer = xhr.response;
						this.parse(node, buffer);
					} else {
						console.log('Failed ' + url + ': ' + xhr.status);
					}
				}
			};

			xhr.send(null);
		}

		async parse(node, buffer){
			let lf = new LASFile(buffer);
			let handler = new EptLazBatcher(node);

			try{
				await lf.open();

				lf.isOpen = true;

				const header = await lf.getHeader();

				{
					let i = 0;

					let toArray = (v) => [v.x, v.y, v.z];
					let mins = toArray(node.key.b.min);
					let maxs = toArray(node.key.b.max);

					let hasMoreData = true;

					while(hasMoreData){
						const data = await lf.readData(1000000, 0, 1);

						let d = new LASDecoder(
							data.buffer,
							header.pointsFormatId,
							header.pointsStructSize,
							data.count,
							header.scale,
							header.offset,
							mins,
							maxs);

						d.extraBytes = header.extraBytes;
						d.pointsFormatId = header.pointsFormatId;
						handler.push(d);

						i += data.count;

						hasMoreData = data.hasMoreData;
					}

					header.totalRead = i;
					header.versionAsString = lf.versionAsString;
					header.isCompressed = lf.isCompressed;

					await lf.close();

					lf.isOpen = false;
				}

			}catch(err){
				console.error('Error reading LAZ:', err);
				
				if (lf.isOpen) {
					await lf.close();

					lf.isOpen = false;
				}
				
				throw err;
			}
		}
	};

	class EptLazBatcher {
		constructor(node) { this.node = node; }

		push(las) {
			let workerPath = Potree.scriptPath +
				'/workers/EptLaszipDecoderWorker.js';
			let worker = Potree.workerPool.getWorker(workerPath);

			worker.onmessage = (e) => {
				let g = new THREE.BufferGeometry();
				let numPoints = las.pointsCount;

				let positions = new Float32Array(e.data.position);
				let colors = new Uint8Array(e.data.color);

				let intensities = new Float32Array(e.data.intensity);
				let classifications = new Uint8Array(e.data.classification);
				let returnNumbers = new Uint8Array(e.data.returnNumber);
				let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
				let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
				let indices = new Uint8Array(e.data.indices);
				let gpsTime = new Float32Array(e.data.gpsTime);

				g.addAttribute('position',
						new THREE.BufferAttribute(positions, 3));
				g.addAttribute('rgba',
						new THREE.BufferAttribute(colors, 4, true));
				g.addAttribute('intensity',
						new THREE.BufferAttribute(intensities, 1));
				g.addAttribute('classification',
						new THREE.BufferAttribute(classifications, 1));
				g.addAttribute('return number',
						new THREE.BufferAttribute(returnNumbers, 1));
				g.addAttribute('number of returns',
						new THREE.BufferAttribute(numberOfReturns, 1));
				g.addAttribute('source id',
						new THREE.BufferAttribute(pointSourceIDs, 1));
				g.addAttribute('indices',
						new THREE.BufferAttribute(indices, 4));
				g.addAttribute('gpsTime',
						new THREE.BufferAttribute(gpsTime, 1));
				this.node.gpsTime = e.data.gpsMeta;

				g.attributes.indices.normalized = true;

				let tightBoundingBox = new THREE.Box3(
					new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
					new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
				);

				this.node.doneLoading(
					g,
					tightBoundingBox,
					numPoints,
					new THREE.Vector3(...e.data.mean));

				Potree.workerPool.returnWorker(workerPath, worker);
			};

			let message = {
				buffer: las.arrayb,
				numPoints: las.pointsCount,
				pointSize: las.pointSize,
				pointFormatID: las.pointsFormatId,
				scale: las.scale,
				offset: las.offset,
				mins: las.mins,
				maxs: las.maxs
			};

			worker.postMessage(message, [message.buffer]);
		};
	};

	class EptZstandardLoader extends EptBinaryLoader {
	    extension() {
	        return '.zst';
	    }

	    workerPath() {
	        return Potree.scriptPath + '/workers/EptZstandardDecoderWorker.js';
	    }
	};

	class ShapefileLoader{

		constructor(){
			this.transform = null;
		}

		async load(path){

			const matLine = new THREE.LineMaterial( {
				color: 0xff0000,
				linewidth: 3, // in pixels
				resolution:  new THREE.Vector2(1000, 1000),
				dashed: false
			} );

			const features = await this.loadShapefileFeatures(path);
			const node = new THREE.Object3D();
			
			for(const feature of features){
				const fnode = this.featureToSceneNode(feature, matLine);
				node.add(fnode);
			}

			let setResolution = (x, y) => {
				matLine.resolution.set(x, y);
			};

			const result = {
				features: features,
				node: node,
				setResolution: setResolution,
			};

			return result;
		}

		featureToSceneNode(feature, matLine){
			let geometry = feature.geometry;
			
			let color = new THREE.Color(1, 1, 1);

			let transform = this.transform;
			if(transform === null){
				transform = {forward: (v) => v};
			}
			
			if(feature.geometry.type === "Point"){
				let sg = new THREE.SphereGeometry(1, 18, 18);
				let sm = new THREE.MeshNormalMaterial();
				let s = new THREE.Mesh(sg, sm);
				
				let [long, lat] = geometry.coordinates;
				let pos = transform.forward([long, lat]);
				
				s.position.set(...pos, 20);
				
				s.scale.set(10, 10, 10);
				
				return s;
			}else if(geometry.type === "LineString"){
				let coordinates = [];
				
				let min = new THREE.Vector3(Infinity, Infinity, Infinity);
				for(let i = 0; i < geometry.coordinates.length; i++){
					let [long, lat] = geometry.coordinates[i];
					let pos = transform.forward([long, lat]);
					
					min.x = Math.min(min.x, pos[0]);
					min.y = Math.min(min.y, pos[1]);
					min.z = Math.min(min.z, 20);
					
					coordinates.push(...pos, 20);
					if(i > 0 && i < geometry.coordinates.length - 1){
						coordinates.push(...pos, 20);
					}
				}
				
				for(let i = 0; i < coordinates.length; i += 3){
					coordinates[i+0] -= min.x;
					coordinates[i+1] -= min.y;
					coordinates[i+2] -= min.z;
				}
				
				const lineGeometry = new THREE.LineGeometry();
				lineGeometry.setPositions( coordinates );

				const line = new THREE.Line2( lineGeometry, matLine );
				line.computeLineDistances();
				line.scale.set( 1, 1, 1 );
				line.position.copy(min);
				
				return line;
			}else if(geometry.type === "Polygon"){
				for(let pc of geometry.coordinates){
					let coordinates = [];
					
					let min = new THREE.Vector3(Infinity, Infinity, Infinity);
					for(let i = 0; i < pc.length; i++){
						let [long, lat] = pc[i];
						let pos = transform.forward([long, lat]);
						
						min.x = Math.min(min.x, pos[0]);
						min.y = Math.min(min.y, pos[1]);
						min.z = Math.min(min.z, 20);
						
						coordinates.push(...pos, 20);
						if(i > 0 && i < pc.length - 1){
							coordinates.push(...pos, 20);
						}
					}
					
					for(let i = 0; i < coordinates.length; i += 3){
						coordinates[i+0] -= min.x;
						coordinates[i+1] -= min.y;
						coordinates[i+2] -= min.z;
					}

					const lineGeometry = new THREE.LineGeometry();
					lineGeometry.setPositions( coordinates );

					const line = new THREE.Line2( lineGeometry, matLine );
					line.computeLineDistances();
					line.scale.set( 1, 1, 1 );
					line.position.copy(min);
					
					return line;
				}
			}else {
				console.log("unhandled feature: ", feature);
			}
		}

		async loadShapefileFeatures(file){
			let features = [];

			let source = await shapefile.open(file);

			while(true){
				let result = await source.read();

				if (result.done) {
					break;
				}

				if (result.value && result.value.type === 'Feature' && result.value.geometry !== undefined) {
					features.push(result.value);
				}
			}

			return features;
		}

	};

	const defaultColors = {
		"landuse":   [0.5, 0.5, 0.5],
		"natural":   [0.0, 1.0, 0.0],
		"places":    [1.0, 0.0, 1.0],
		"points":    [0.0, 1.0, 1.0],
		"roads":     [1.0, 1.0, 0.0],
		"waterways": [0.0, 0.0, 1.0],
		"default":   [0.9, 0.6, 0.1],
	};

	function getColor(feature){
		let color = defaultColors[feature];

		if(!color){
			color = defaultColors["default"];
		}

		return color;
	}

	class Geopackage$1{
		constructor(){
			this.path = null;
			this.node = null;
		}
	};

	class GeoPackageLoader{

		constructor(){

		}

		static async loadUrl(url, params){

			await Promise.all([
				Utils.loadScript(`${Potree.scriptPath}/lazylibs/geopackage/geopackage.js`),
				Utils.loadScript(`${Potree.scriptPath}/lazylibs/sql.js/sql-wasm.js`),
			]);
			
			const result = await fetch(url);
			const buffer = await result.arrayBuffer();

			params = params || {};

			params.source = url;

			return GeoPackageLoader.loadBuffer(buffer, params);
		}

		static async loadBuffer(buffer, params){

			await Promise.all([
				Utils.loadScript(`${Potree.scriptPath}/lazylibs/geopackage/geopackage.js`),
				Utils.loadScript(`${Potree.scriptPath}/lazylibs/sql.js/sql-wasm.js`),
			]);

			params = params || {};

			const resolver = async (resolve) => {
				
				let transform = params.transform;
				if(!transform){
					transform = {forward: (arg) => arg};
				}

				const wasmPath = `${Potree.scriptPath}/lazylibs/sql.js/sql-wasm.wasm`;
				const SQL = await initSqlJs({ locateFile: filename => wasmPath});

				const u8 = new Uint8Array(buffer);

				const data = await geopackage.open(u8);
				window.data = data;

				const geopackageNode = new THREE.Object3D();
				geopackageNode.name = params.source;
				geopackageNode.potree = {
					source: params.source,
				};

				const geo = new Geopackage$1();
				geo.path = params.source;
				geo.node = geopackageNode;

				const tables = data.getTables();

				for(const table of tables.features){
					const dao = data.getFeatureDao(table);

					let boundingBox = dao.getBoundingBox();
					boundingBox = boundingBox.projectBoundingBox(dao.projection, 'EPSG:4326');
					const geoJson = data.queryForGeoJSONFeaturesInTable(table, boundingBox);

					const matLine = new THREE.LineMaterial( {
						color: new THREE.Color().setRGB(...getColor(table)),
						linewidth: 2, 
						resolution:  new THREE.Vector2(1000, 1000),
						dashed: false
					} );

					const node = new THREE.Object3D();
					node.name = table;
					geo.node.add(node);

					for(const [index, feature] of Object.entries(geoJson)){
						//const featureNode = GeoPackageLoader.featureToSceneNode(feature, matLine, transform);
						const featureNode = GeoPackageLoader.featureToSceneNode(feature, matLine, dao.projection, transform);
						node.add(featureNode);
					}
				}

				resolve(geo);
			};

			return new Promise(resolver);
		}

		static featureToSceneNode(feature, matLine, geopackageProjection, transform){
			let geometry = feature.geometry;
			
			let color = new THREE.Color(1, 1, 1);
			
			if(feature.geometry.type === "Point"){
				let sg = new THREE.SphereGeometry(1, 18, 18);
				let sm = new THREE.MeshNormalMaterial();
				let s = new THREE.Mesh(sg, sm);
				
				let [long, lat] = geometry.coordinates;
				let pos = transform.forward(geopackageProjection.forward([long, lat]));
				
				s.position.set(...pos, 20);
				
				s.scale.set(10, 10, 10);
				
				return s;
			}else if(geometry.type === "LineString"){
				let coordinates = [];
				
				let min = new THREE.Vector3(Infinity, Infinity, Infinity);
				for(let i = 0; i < geometry.coordinates.length; i++){
					let [long, lat] = geometry.coordinates[i];
					let pos = transform.forward(geopackageProjection.forward([long, lat]));
					
					min.x = Math.min(min.x, pos[0]);
					min.y = Math.min(min.y, pos[1]);
					min.z = Math.min(min.z, 20);
					
					coordinates.push(...pos, 20);
					if(i > 0 && i < geometry.coordinates.length - 1){
						coordinates.push(...pos, 20);
					}
				}
				
				for(let i = 0; i < coordinates.length; i += 3){
					coordinates[i+0] -= min.x;
					coordinates[i+1] -= min.y;
					coordinates[i+2] -= min.z;
				}
				
				const lineGeometry = new THREE.LineGeometry();
				lineGeometry.setPositions( coordinates );

				const line = new THREE.Line2( lineGeometry, matLine );
				line.computeLineDistances();
				line.scale.set( 1, 1, 1 );
				line.position.copy(min);
				
				return line;
			}else if(geometry.type === "Polygon"){
				for(let pc of geometry.coordinates){
					let coordinates = [];
					
					let min = new THREE.Vector3(Infinity, Infinity, Infinity);
					for(let i = 0; i < pc.length; i++){
						let [long, lat] = pc[i];
						
						let pos = transform.forward(geopackageProjection.forward([long, lat]));
						
						min.x = Math.min(min.x, pos[0]);
						min.y = Math.min(min.y, pos[1]);
						min.z = Math.min(min.z, 20);
						
						coordinates.push(...pos, 20);
						if(i > 0 && i < pc.length - 1){
							coordinates.push(...pos, 20);
						}
					}
					
					for(let i = 0; i < coordinates.length; i += 3){
						coordinates[i+0] -= min.x;
						coordinates[i+1] -= min.y;
						coordinates[i+2] -= min.z;
					}

					const lineGeometry = new THREE.LineGeometry();
					lineGeometry.setPositions( coordinates );

					const line = new THREE.Line2( lineGeometry, matLine );
					line.computeLineDistances();
					line.scale.set( 1, 1, 1 );
					line.position.copy(min);
					
					return line;
				}
			}else {
				console.log("unhandled feature: ", feature);
			}
		}

	};

	class ClipVolume extends THREE.Object3D{
		
		constructor(args){
			super();
			
			this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
			this.name = "clip_volume_" + this.constructor.counter;

			let alpha = args.alpha || 0;
			let beta = args.beta || 0;
			let gamma = args.gamma || 0;

			this.rotation.x = alpha;
			this.rotation.y = beta;
			this.rotation.z = gamma;

			this.clipOffset = 0.001;
			this.clipRotOffset = 1;
					
			let boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			boxGeometry.computeBoundingBox();
			
			let boxFrameGeometry = new THREE.Geometry();
			{			
				// bottom
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
				// top
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
				// sides
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));

				boxFrameGeometry.colors.push(new THREE.Vector3(1, 1, 1));
			}

			let planeFrameGeometry = new THREE.Geometry();
			{						
				// middle line
				planeFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.0));
				planeFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.0));
				planeFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.0));
				planeFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.0));
				planeFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.0));
				planeFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.0));
				planeFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.0));
				planeFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.0));
			}

			this.dimension = new THREE.Vector3(1, 1, 1);
			this.material = new THREE.MeshBasicMaterial( {
				color: 0x00ff00, 
				transparent: true, 
				opacity: 0.3,
				depthTest: true, 
				depthWrite: false} );
			this.box = new THREE.Mesh(boxGeometry, this.material);
			this.box.geometry.computeBoundingBox();
			this.boundingBox = this.box.geometry.boundingBox;
			this.add(this.box);
			
			this.frame = new THREE.LineSegments( boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
			this.add(this.frame);
			this.planeFrame = new THREE.LineSegments( planeFrameGeometry, new THREE.LineBasicMaterial({color: 0xff0000}));
			this.add(this.planeFrame);

			// set default thickness
			this.setScaleZ(0.1);

			// create local coordinate system
			let createArrow = (name, direction, color) => {
				let material = new THREE.MeshBasicMaterial({
					color: color, 
					depthTest: false, 
					depthWrite: false});
					
				let shaftGeometry = new THREE.Geometry();
				shaftGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
				shaftGeometry.vertices.push(new THREE.Vector3(0, 1, 0));
				
				let shaftMaterial = new THREE.LineBasicMaterial({
					color: color, 
					depthTest: false, 
					depthWrite: false,
					transparent: true
					});
				let shaft = new THREE.Line(shaftGeometry, shaftMaterial);
				shaft.name = name + "_shaft";
				
				let headGeometry = new THREE.CylinderGeometry(0, 0.04, 0.1, 10, 1, false);
				let headMaterial = material;
				let head = new THREE.Mesh(headGeometry, headMaterial);
				head.name = name + "_head";
				head.position.y = 1;
				
				let arrow = new THREE.Object3D();
				arrow.name = name;
				arrow.add(shaft);
				arrow.add(head);

				return arrow;
			};
			
			this.arrowX = createArrow("arrow_x", new THREE.Vector3(1, 0, 0), 0xFF0000);
			this.arrowY = createArrow("arrow_y", new THREE.Vector3(0, 1, 0), 0x00FF00);
			this.arrowZ = createArrow("arrow_z", new THREE.Vector3(0, 0, 1), 0x0000FF);
			
			this.arrowX.rotation.z = -Math.PI / 2;
			this.arrowZ.rotation.x = Math.PI / 2;

			this.arrowX.visible = false;
			this.arrowY.visible = false;
			this.arrowZ.visible = false;

			this.add(this.arrowX);
			this.add(this.arrowY);
			this.add(this.arrowZ);
			
			{ // event listeners
				this.addEventListener("ui_select", e => { 
					this.arrowX.visible = true;
					this.arrowY.visible = true;
					this.arrowZ.visible = true; 
				});
				this.addEventListener("ui_deselect", e => {
					this.arrowX.visible = false;
					this.arrowY.visible = false;
					this.arrowZ.visible = false; 				
				});
				this.addEventListener("select", e => { 
					let scene_header = $("#" + this.name + " .scene_header");
					if(!scene_header.next().is(":visible")) {
						scene_header.click();
					}
				});
				this.addEventListener("deselect", e => { 
					let scene_header = $("#" + this.name + " .scene_header");
					if(scene_header.next().is(":visible")) {
						scene_header.click();
					}
				});
			}
			
			this.update();
		};

		setClipOffset(offset) {		
			this.clipOffset = offset;	
		}

		setClipRotOffset(offset) {		
			this.clipRotOffset = offset;		
		}

		setScaleX(x) {
			this.box.scale.x = x;
			this.frame.scale.x = x;
			this.planeFrame.scale.x = x;			
		}

		setScaleY(y) {
			this.box.scale.y = y;
			this.frame.scale.y = y;
			this.planeFrame.scale.y = y;		
		}

		setScaleZ(z) {
			this.box.scale.z = z;
			this.frame.scale.z = z;
			this.planeFrame.scale.z = z;		
		}

		offset(args) {
			let cs = args.cs || null;
			let axis = args.axis || null;
			let dir = args.dir || null;

			if(!cs || !axis || !dir) return;

			if(axis === "x") {
				if(cs === "local") {
					this.position.add(this.localX.clone().multiplyScalar(dir * this.clipOffset));
				} else if(cs === "global") {
					this.position.x = this.position.x + dir * this.clipOffset;
				}
			}else if(axis === "y") {
				if(cs === "local") {
					this.position.add(this.localY.clone().multiplyScalar(dir * this.clipOffset));
				} else if(cs === "global") {
					this.position.y = this.position.y + dir * this.clipOffset;
				}
			}else if(axis === "z") {
				if(cs === "local") {
					this.position.add(this.localZ.clone().multiplyScalar(dir * this.clipOffset));
				} else if(cs === "global") {
					this.position.z = this.position.z + dir * this.clipOffset;
				}
			}

			this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});
		}	

		rotate(args) {
			let cs = args.cs || null;
			let axis = args.axis || null;
			let dir = args.dir || null;

			if(!cs || !axis || !dir) return;

			if(cs === "local") {
				if(axis === "x") {
					this.rotateOnAxis(new THREE.Vector3(1, 0, 0), dir * this.clipRotOffset * Math.PI / 180);
				} else if(axis === "y") {
					this.rotateOnAxis(new THREE.Vector3(0, 1, 0), dir * this.clipRotOffset * Math.PI / 180);
				} else if(axis === "z") {
					this.rotateOnAxis(new THREE.Vector3(0, 0, 1), dir * this.clipRotOffset * Math.PI / 180);
				}
			} else if(cs === "global") {
				let rotaxis = new THREE.Vector4(1, 0, 0, 0);	
				if(axis === "y") {
					rotaxis = new THREE.Vector4(0, 1, 0, 0);
				} else if(axis === "z") {
					rotaxis = new THREE.Vector4(0, 0, 1, 0);
				}
				this.updateMatrixWorld();
				let invM = new THREE.Matrix4().getInverse(this.matrixWorld);
				rotaxis = rotaxis.applyMatrix4(invM).normalize();
				rotaxis = new THREE.Vector3(rotaxis.x, rotaxis.y, rotaxis.z);
				this.rotateOnAxis(rotaxis, dir * this.clipRotOffset * Math.PI / 180);
			}

			this.updateLocalSystem();

			this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});
		}	

		update(){
			this.boundingBox = this.box.geometry.boundingBox;
			this.boundingSphere = this.boundingBox.getBoundingSphere(new THREE.Sphere());
			
			this.box.visible = false;

			this.updateLocalSystem();
		};

		updateLocalSystem() {		
			// extract local coordinate axes
			let rotQuat = this.getWorldQuaternion();
			this.localX = new THREE.Vector3(1, 0, 0).applyQuaternion(rotQuat).normalize();
			this.localY = new THREE.Vector3(0, 1, 0).applyQuaternion(rotQuat).normalize();
			this.localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(rotQuat).normalize();
		}
		
		raycast(raycaster, intersects){
			
			let is = [];
			this.box.raycast(raycaster, is);
		
			if(is.length > 0){
				let I = is[0];
				intersects.push({
					distance: I.distance,
					object: this,
					point: I.point.clone()
				});
			}
		};
	};

	class ClippingTool extends EventDispatcher{

		constructor(viewer){
			super(); 

			this.viewer = viewer;

			this.maxPolygonVertices = 8; 
			
			this.addEventListener("start_inserting_clipping_volume", e => {
				this.viewer.dispatchEvent({
					type: "cancel_insertions"
				});
			});

			this.sceneMarker = new THREE.Scene();
			this.sceneVolume = new THREE.Scene();
			this.sceneVolume.name = "scene_clip_volume";
			this.viewer.inputHandler.registerInteractiveScene(this.sceneVolume);

			this.onRemove = e => {
				this.sceneVolume.remove(e.volume);
			};
			
			this.onAdd = e => {
				this.sceneVolume.add(e.volume);
			};
			
			this.viewer.inputHandler.addEventListener("delete", e => {
				let volumes = e.selection.filter(e => (e instanceof ClipVolume));
				volumes.forEach(e => this.viewer.scene.removeClipVolume(e));
				let polyVolumes = e.selection.filter(e => (e instanceof PolygonClipVolume));
				polyVolumes.forEach(e => this.viewer.scene.removePolygonClipVolume(e));
			});
		}

		setScene(scene){
			if(this.scene === scene){
				return;
			}
			
			if(this.scene){
				this.scene.removeEventListeners("clip_volume_added", this.onAdd);
				this.scene.removeEventListeners("clip_volume_removed", this.onRemove);
				this.scene.removeEventListeners("polygon_clip_volume_added", this.onAdd);
				this.scene.removeEventListeners("polygon_clip_volume_removed", this.onRemove);
			}
			
			this.scene = scene;
			
			this.scene.addEventListener("clip_volume_added", this.onAdd);
			this.scene.addEventListener("clip_volume_removed", this.onRemove);
			this.scene.addEventListener("polygon_clip_volume_added", this.onAdd);
			this.scene.addEventListener("polygon_clip_volume_removed", this.onRemove);
		}

		startInsertion(args = {}) {	
			let type = args.type || null;

			if(!type) return null;

			let domElement = this.viewer.renderer.domElement;
			let canvasSize = this.viewer.renderer.getSize(new THREE.Vector2());

			let svg = $(`
		<svg height="${canvasSize.height}" width="${canvasSize.width}" style="position:absolute; pointer-events: none">

			<defs>
				 <marker id="diamond" markerWidth="24" markerHeight="24" refX="12" refY="12"
						markerUnits="userSpaceOnUse">
					<circle cx="12" cy="12" r="6" fill="white" stroke="black" stroke-width="3"/>
				</marker>
			</defs>

			<polyline fill="none" stroke="black" 
				style="stroke:rgb(0, 0, 0);
				stroke-width:6;"
				stroke-dasharray="9, 6"
				stroke-dashoffset="2"
				/>

			<polyline fill="none" stroke="black" 
				style="stroke:rgb(255, 255, 255);
				stroke-width:2;"
				stroke-dasharray="5, 10"
				marker-start="url(#diamond)" 
				marker-mid="url(#diamond)" 
				marker-end="url(#diamond)" 
				/>
		</svg>`);
			$(domElement.parentElement).append(svg);

			let polyClipVol = new PolygonClipVolume(this.viewer.scene.getActiveCamera().clone());

			this.dispatchEvent({"type": "start_inserting_clipping_volume"});

			this.viewer.scene.addPolygonClipVolume(polyClipVol);
			this.sceneMarker.add(polyClipVol);

			let cancel = {
				callback: null
			};

			let insertionCallback = (e) => {
				if(e.button === THREE.MOUSE.LEFT){
					
					polyClipVol.addMarker();

					// SVC Screen Line
					svg.find("polyline").each((index, target) => {
						let newPoint = svg[0].createSVGPoint();
						newPoint.x = e.offsetX;
						newPoint.y = e.offsetY;
						let polyline = target.points.appendItem(newPoint);
					});
					
					
					if(polyClipVol.markers.length > this.maxPolygonVertices){
						cancel.callback();
					}
					
					this.viewer.inputHandler.startDragging(
						polyClipVol.markers[polyClipVol.markers.length - 1]);
				}else if(e.button === THREE.MOUSE.RIGHT){
					cancel.callback(e);
				}
			};
			
			cancel.callback = e => {

				//let first = svg.find("polyline")[0].points[0];
				//svg.find("polyline").each((index, target) => {
				//	let newPoint = svg[0].createSVGPoint();
				//	newPoint.x = first.x;
				//	newPoint.y = first.y;
				//	let polyline = target.points.appendItem(newPoint);
				//});
				svg.remove();

				if(polyClipVol.markers.length > 3) {
					polyClipVol.removeLastMarker();
					polyClipVol.initialized = true;	
				} else {
					this.viewer.scene.removePolygonClipVolume(polyClipVol);
				}

				this.viewer.renderer.domElement.removeEventListener("mouseup", insertionCallback, true);
				this.viewer.removeEventListener("cancel_insertions", cancel.callback);
				this.viewer.inputHandler.enabled = true;
			};
			
			this.viewer.addEventListener("cancel_insertions", cancel.callback);
			this.viewer.renderer.domElement.addEventListener("mouseup", insertionCallback , true);
			this.viewer.inputHandler.enabled = false;
			
			polyClipVol.addMarker();
			this.viewer.inputHandler.startDragging(
				polyClipVol.markers[polyClipVol.markers.length - 1]);

			return polyClipVol;
		}

		update() {

		}
	};

	var GeoTIFF = (function (exports) {
	'use strict';

	const Endianness = new Enum({
		LITTLE: "II",
		BIG: "MM",
	});

	const Type = new Enum({
		BYTE: {value: 1, bytes: 1},
		ASCII: {value: 2, bytes: 1},
		SHORT: {value: 3, bytes: 2},
		LONG: {value: 4, bytes: 4},
		RATIONAL: {value: 5, bytes: 8},
		SBYTE: {value: 6, bytes: 1},
		UNDEFINED: {value: 7, bytes: 1},
		SSHORT: {value: 8, bytes: 2},
		SLONG: {value: 9, bytes: 4},
		SRATIONAL: {value: 10, bytes: 8},
		FLOAT: {value: 11, bytes: 4},
		DOUBLE: {value: 12, bytes: 8},
	});

	const Tag = new Enum({
		IMAGE_WIDTH: 256,
		IMAGE_HEIGHT: 257,
		BITS_PER_SAMPLE: 258,
		COMPRESSION: 259,
		PHOTOMETRIC_INTERPRETATION: 262,
		STRIP_OFFSETS: 273,
		ORIENTATION: 274,
		SAMPLES_PER_PIXEL: 277,
		ROWS_PER_STRIP: 278,
		STRIP_BYTE_COUNTS: 279,
		X_RESOLUTION: 282,
		Y_RESOLUTION: 283,
		PLANAR_CONFIGURATION: 284,
		RESOLUTION_UNIT: 296,
		SOFTWARE: 305,
		COLOR_MAP: 320,
		SAMPLE_FORMAT: 339,
		MODEL_PIXEL_SCALE: 33550,         // [GeoTIFF] TYPE: double   N: 3
		MODEL_TIEPOINT: 33922,            // [GeoTIFF] TYPE: double   N: 6 * NUM_TIEPOINTS
		GEO_KEY_DIRECTORY: 34735,         // [GeoTIFF] TYPE: short    N: >= 4
		GEO_DOUBLE_PARAMS: 34736,         // [GeoTIFF] TYPE: short    N: variable
		GEO_ASCII_PARAMS: 34737,          // [GeoTIFF] TYPE: ascii    N: variable
	});

	const typeMapping = new Map([
		[Type.BYTE, Uint8Array],
		[Type.ASCII, Uint8Array],
		[Type.SHORT, Uint16Array],
		[Type.LONG, Uint32Array],
		[Type.RATIONAL, Uint32Array],
		[Type.SBYTE, Int8Array],
		[Type.UNDEFINED, Uint8Array],
		[Type.SSHORT, Int16Array],
		[Type.SLONG, Int32Array],
		[Type.SRATIONAL, Int32Array],
		[Type.FLOAT, Float32Array],
		[Type.DOUBLE, Float64Array],
	]);

	class IFDEntry{

		constructor(tag, type, count, offset, value){
			this.tag = tag;
			this.type = type;
			this.count = count;
			this.offset = offset;
			this.value = value;
		}

	}

	class Image{

		constructor(){
			this.width = 0;
			this.height = 0;
			this.buffer = null;
			this.metadata = [];
		}

	}

	class Reader{

		constructor(){

		}

		static read(data){

			let endiannessTag = String.fromCharCode(...Array.from(data.slice(0, 2)));
			let endianness = Endianness.fromValue(endiannessTag);

			let tiffCheckTag = data.readUInt8(2);

			if(tiffCheckTag !== 42){
				throw new Error("not a valid tiff file");
			}

			let offsetToFirstIFD = data.readUInt32LE(4);

			console.log("offsetToFirstIFD", offsetToFirstIFD);

			let ifds = [];
			let IFDsRead = false;
			let currentIFDOffset = offsetToFirstIFD;
			let i = 0;
			while(IFDsRead || i < 100){

				console.log("currentIFDOffset", currentIFDOffset);
				let numEntries = data.readUInt16LE(currentIFDOffset);
				let nextIFDOffset = data.readUInt32LE(currentIFDOffset + 2 + numEntries * 12);

				console.log("next offset: ", currentIFDOffset + 2 + numEntries * 12);

				let entryBuffer = data.slice(currentIFDOffset + 2, currentIFDOffset + 2 + 12 * numEntries);

				for(let i = 0; i < numEntries; i++){
					let tag = Tag.fromValue(entryBuffer.readUInt16LE(i * 12));
					let type = Type.fromValue(entryBuffer.readUInt16LE(i * 12 + 2));
					let count = entryBuffer.readUInt32LE(i * 12 + 4);
					let offsetOrValue = entryBuffer.readUInt32LE(i * 12 + 8);
					let valueBytes = type.bytes * count;

					let value;
					if(valueBytes <= 4){
						value = offsetOrValue;
					}else {
						let valueBuffer = new Uint8Array(valueBytes);
						valueBuffer.set(data.slice(offsetOrValue, offsetOrValue + valueBytes));
						
						let ArrayType = typeMapping.get(type);

						value = new ArrayType(valueBuffer.buffer);

						if(type === Type.ASCII){
							value = String.fromCharCode(...value);
						}
					}

					let ifd = new IFDEntry(tag, type, count, offsetOrValue, value);

					ifds.push(ifd);
				}

				console.log("nextIFDOffset", nextIFDOffset);

				if(nextIFDOffset === 0){
					break;
				}

				currentIFDOffset = nextIFDOffset;
				i++;
			}

			let ifdForTag = (tag) => {
				for(let entry of ifds){
					if(entry.tag === tag){
						return entry;
					}
				}

				return null;
			};

			let width = ifdForTag(Tag.IMAGE_WIDTH, ifds).value;
			let height = ifdForTag(Tag.IMAGE_HEIGHT, ifds).value;
			let compression = ifdForTag(Tag.COMPRESSION, ifds).value;
			let rowsPerStrip = ifdForTag(Tag.ROWS_PER_STRIP, ifds).value; 
			let ifdStripOffsets = ifdForTag(Tag.STRIP_OFFSETS, ifds);
			let ifdStripByteCounts = ifdForTag(Tag.STRIP_BYTE_COUNTS, ifds);

			let numStrips = Math.ceil(height / rowsPerStrip);

			let stripByteCounts = [];
			for(let i = 0; i < ifdStripByteCounts.count; i++){
				let type = ifdStripByteCounts.type;
				let offset = ifdStripByteCounts.offset + i * type.bytes;

				let value;
				if(type === Type.SHORT){
					value = data.readUInt16LE(offset);
				}else if(type === Type.LONG){
					value = data.readUInt32LE(offset);
				}

				stripByteCounts.push(value);
			}

			let stripOffsets = [];
			for(let i = 0; i < ifdStripOffsets.count; i++){
				let type = ifdStripOffsets.type;
				let offset = ifdStripOffsets.offset + i * type.bytes;

				let value;
				if(type === Type.SHORT){
					value = data.readUInt16LE(offset);
				}else if(type === Type.LONG){
					value = data.readUInt32LE(offset);
				}

				stripOffsets.push(value);
			}

			let imageBuffer = new Uint8Array(width * height * 3);
			
			let linesProcessed = 0;
			for(let i = 0; i < numStrips; i++){
				let stripOffset = stripOffsets[i];
				let stripBytes = stripByteCounts[i];
				let stripData = data.slice(stripOffset, stripOffset + stripBytes);
				let lineBytes = width * 3;
				for(let y = 0; y < rowsPerStrip; y++){
					let line = stripData.slice(y * lineBytes, y * lineBytes + lineBytes);
					imageBuffer.set(line, linesProcessed * lineBytes);
			
					if(line.length === lineBytes){
						linesProcessed++;
					}else {
						break;
					}
				}
			}

			console.log(`width: ${width}`);
			console.log(`height: ${height}`);
			console.log(`numStrips: ${numStrips}`);
			console.log("stripByteCounts", stripByteCounts.join(", "));
			console.log("stripOffsets", stripOffsets.join(", "));

			let image = new Image();
			image.width = width;
			image.height = height;
			image.buffer = imageBuffer;
			image.metadata = ifds;

			return image;
		}

	}


	class Exporter{

		constructor(){

		}

		static toTiffBuffer(image, params = {}){

			let offsetToFirstIFD = 8;
			
			let headerBuffer = new Uint8Array([0x49, 0x49, 42, 0, offsetToFirstIFD, 0, 0, 0]);

			let [width, height] = [image.width, image.height];

			let ifds = [
				new IFDEntry(Tag.IMAGE_WIDTH,                Type.SHORT,    1,   null, width),
				new IFDEntry(Tag.IMAGE_HEIGHT,               Type.SHORT,    1,   null, height),
				new IFDEntry(Tag.BITS_PER_SAMPLE,            Type.SHORT,    4,   null, new Uint16Array([8, 8, 8, 8])),
				new IFDEntry(Tag.COMPRESSION,                Type.SHORT,    1,   null, 1),
				new IFDEntry(Tag.PHOTOMETRIC_INTERPRETATION, Type.SHORT,    1,   null, 2),
				new IFDEntry(Tag.ORIENTATION,                Type.SHORT,    1,   null, 1),
				new IFDEntry(Tag.SAMPLES_PER_PIXEL,          Type.SHORT,    1,   null, 4),
				new IFDEntry(Tag.ROWS_PER_STRIP,             Type.LONG,     1,   null, height),
				new IFDEntry(Tag.STRIP_BYTE_COUNTS,          Type.LONG,     1,   null, width * height * 3),
				new IFDEntry(Tag.PLANAR_CONFIGURATION,       Type.SHORT,    1,   null, 1),
				new IFDEntry(Tag.RESOLUTION_UNIT,            Type.SHORT,    1,   null, 1),
				new IFDEntry(Tag.SOFTWARE,                   Type.ASCII,    6,   null, "......"),
				new IFDEntry(Tag.STRIP_OFFSETS,              Type.LONG,     1,   null, null),
				new IFDEntry(Tag.X_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
				new IFDEntry(Tag.Y_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
			];

			if(params.ifdEntries){
				ifds.push(...params.ifdEntries);
			}

			let valueOffset = offsetToFirstIFD + 2 + ifds.length * 12 + 4;

			// create 12 byte buffer for each ifd and variable length buffers for ifd values
			let ifdEntryBuffers = new Map();
			let ifdValueBuffers = new Map();
			for(let ifd of ifds){
				let entryBuffer = new ArrayBuffer(12);
				let entryView = new DataView(entryBuffer);

				let valueBytes = ifd.type.bytes * ifd.count;

				entryView.setUint16(0, ifd.tag.value, true);
				entryView.setUint16(2, ifd.type.value, true);
				entryView.setUint32(4, ifd.count, true);

				if(ifd.count === 1 && ifd.type.bytes <= 4){
					entryView.setUint32(8, ifd.value, true);
				}else {
					entryView.setUint32(8, valueOffset, true);

					let valueBuffer = new Uint8Array(ifd.count * ifd.type.bytes);
					if(ifd.type === Type.ASCII){
						valueBuffer.set(new Uint8Array(ifd.value.split("").map(c => c.charCodeAt(0))));
					}else {
						valueBuffer.set(new Uint8Array(ifd.value.buffer));
					}
					ifdValueBuffers.set(ifd.tag, valueBuffer);

					valueOffset = valueOffset + valueBuffer.byteLength;
				}

				ifdEntryBuffers.set(ifd.tag, entryBuffer);
			}

			let imageBufferOffset = valueOffset;

			new DataView(ifdEntryBuffers.get(Tag.STRIP_OFFSETS)).setUint32(8, imageBufferOffset, true);

			let concatBuffers = (buffers) => {

				let totalLength = buffers.reduce( (sum, buffer) => (sum + buffer.byteLength), 0);
				let merged = new Uint8Array(totalLength);

				let offset = 0;
				for(let buffer of buffers){
					merged.set(new Uint8Array(buffer), offset);
					offset += buffer.byteLength;
				}

				return merged;
			};
			
			let ifdBuffer = concatBuffers([
				new Uint16Array([ifds.length]), 
				...ifdEntryBuffers.values(), 
				new Uint32Array([0])]);
			let ifdValueBuffer = concatBuffers([...ifdValueBuffers.values()]);

			let tiffBuffer = concatBuffers([
				headerBuffer,
				ifdBuffer,
				ifdValueBuffer,
				image.buffer
			]);

			return {width: width, height: height, buffer: tiffBuffer};
		}

	}

	exports.Tag = Tag;
	exports.Type = Type;
	exports.IFDEntry = IFDEntry;
	exports.Image = Image;
	exports.Reader = Reader;
	exports.Exporter = Exporter;

	return exports;

	}({}));

	function updateAzimuth(viewer, measure){

		const azimuth = measure.azimuth;

		const isOkay = measure.points.length === 2;

		azimuth.node.visible = isOkay && measure.showAzimuth;

		if(!azimuth.node.visible){
			return;
		}

		const camera = viewer.scene.getActiveCamera();
		const renderAreaSize = viewer.renderer.getSize(new THREE.Vector2());
		const width = renderAreaSize.width;
		const height = renderAreaSize.height;
		
		const [p0, p1] = measure.points;
		const r = p0.position.distanceTo(p1.position);
		const northVec = Utils.getNorthVec(p0.position, r, viewer.getProjection());
		const northPos = p0.position.clone().add(northVec);

		azimuth.center.position.copy(p0.position);
		azimuth.center.scale.set(2, 2, 2);
		
		azimuth.center.visible = false;
		// azimuth.target.visible = false;


		{ // north
			azimuth.north.position.copy(northPos);
			azimuth.north.scale.set(2, 2, 2);

			let distance = azimuth.north.position.distanceTo(camera.position);
			let pr = Utils.projectedRadius(1, camera, distance, width, height);

			let scale = (5 / pr);
			azimuth.north.scale.set(scale, scale, scale);
		}

		{ // target
			azimuth.target.position.copy(p1.position);
			azimuth.target.position.z = azimuth.north.position.z;

			let distance = azimuth.target.position.distanceTo(camera.position);
			let pr = Utils.projectedRadius(1, camera, distance, width, height);

			let scale = (5 / pr);
			azimuth.target.scale.set(scale, scale, scale);
		}


		azimuth.circle.position.copy(p0.position);
		azimuth.circle.scale.set(r, r, r);
		azimuth.circle.material.resolution.set(width, height);

		// to target
		azimuth.centerToTarget.geometry.setPositions([
			0, 0, 0,
			...p1.position.clone().sub(p0.position).toArray(),
		]);
		azimuth.centerToTarget.position.copy(p0.position);
		azimuth.centerToTarget.geometry.verticesNeedUpdate = true;
		azimuth.centerToTarget.geometry.computeBoundingSphere();
		azimuth.centerToTarget.computeLineDistances();
		azimuth.centerToTarget.material.resolution.set(width, height);

		// to target ground
		azimuth.centerToTargetground.geometry.setPositions([
			0, 0, 0,
			p1.position.x - p0.position.x,
			p1.position.y - p0.position.y,
			0,
		]);
		azimuth.centerToTargetground.position.copy(p0.position);
		azimuth.centerToTargetground.geometry.verticesNeedUpdate = true;
		azimuth.centerToTargetground.geometry.computeBoundingSphere();
		azimuth.centerToTargetground.computeLineDistances();
		azimuth.centerToTargetground.material.resolution.set(width, height);

		// to north
		azimuth.centerToNorth.geometry.setPositions([
			0, 0, 0,
			northPos.x - p0.position.x,
			northPos.y - p0.position.y,
			0,
		]);
		azimuth.centerToNorth.position.copy(p0.position);
		azimuth.centerToNorth.geometry.verticesNeedUpdate = true;
		azimuth.centerToNorth.geometry.computeBoundingSphere();
		azimuth.centerToNorth.computeLineDistances();
		azimuth.centerToNorth.material.resolution.set(width, height);

		// label
		const radians = Utils.computeAzimuth(p0.position, p1.position, viewer.getProjection());
		let degrees = THREE.Math.radToDeg(radians);
		if(degrees < 0){
			degrees = 360 + degrees;
		}
		const txtDegrees = `${degrees.toFixed(2)}°`;
		const labelDir = northPos.clone().add(p1.position).multiplyScalar(0.5).sub(p0.position);
		if(labelDir.length() > 0){
			labelDir.z = 0;
			labelDir.normalize();
			const labelVec = labelDir.clone().multiplyScalar(r);
			const labelPos = p0.position.clone().add(labelVec);
			azimuth.label.position.copy(labelPos);
		}
		azimuth.label.setText(txtDegrees);
		let distance = azimuth.label.position.distanceTo(camera.position);
		let pr = Utils.projectedRadius(1, camera, distance, width, height);
		let scale = (70 / pr);
		azimuth.label.scale.set(scale, scale, scale);
	}

	class MeasuringTool extends EventDispatcher{
		constructor (viewer) {
			super();

			this.viewer = viewer;
			this.renderer = viewer.renderer;

			this.addEventListener('start_inserting_measurement', e => {
				this.viewer.dispatchEvent({
					type: 'cancel_insertions'
				});
			});

			this.showLabels = true;
			this.scene = new THREE.Scene();
			this.scene.name = 'scene_measurement';
			this.light = new THREE.PointLight(0xffffff, 1.0);
			this.scene.add(this.light);

			this.viewer.inputHandler.registerInteractiveScene(this.scene);

			this.onRemove = (e) => { this.scene.remove(e.measurement);};
			this.onAdd = e => {this.scene.add(e.measurement);};

			for(let measurement of viewer.scene.measurements){
				this.onAdd({measurement: measurement});
			}

			viewer.addEventListener("update", this.update.bind(this));
			viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
			viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

			viewer.scene.addEventListener('measurement_added', this.onAdd);
			viewer.scene.addEventListener('measurement_removed', this.onRemove);
		}

		onSceneChange(e){
			if(e.oldScene){
				e.oldScene.removeEventListener('measurement_added', this.onAdd);
				e.oldScene.removeEventListener('measurement_removed', this.onRemove);
			}

			e.scene.addEventListener('measurement_added', this.onAdd);
			e.scene.addEventListener('measurement_removed', this.onRemove);
		}

		startInsertion (args = {}) {
			let domElement = this.viewer.renderer.domElement;

			let measure = new Measure();

			this.dispatchEvent({
				type: 'start_inserting_measurement',
				measure: measure
			});

			const pick = (defaul, alternative) => {
				if(defaul != null){
					return defaul;
				}else {
					return alternative;
				}
			};

			measure.showDistances = (args.showDistances === null) ? true : args.showDistances;

			measure.showArea = pick(args.showArea, false);
			measure.showAngles = pick(args.showAngles, false);
			measure.showCoordinates = pick(args.showCoordinates, false);
			measure.showHeight = pick(args.showHeight, false);
			measure.showCircle = pick(args.showCircle, false);
			measure.showAzimuth = pick(args.showAzimuth, false);
			measure.showEdges = pick(args.showEdges, true);
			measure.closed = pick(args.closed, false);
			measure.maxMarkers = pick(args.maxMarkers, Infinity);

			measure.name = args.name || 'Measurement';

			this.scene.add(measure);

			let cancel = {
				removeLastMarker: measure.maxMarkers > 3,
				callback: null
			};

			let insertionCallback = (e) => {
				if (e.button === THREE.MOUSE.LEFT) {
					measure.addMarker(measure.points[measure.points.length - 1].position.clone());

					if (measure.points.length >= measure.maxMarkers) {
						cancel.callback();
					}

					this.viewer.inputHandler.startDragging(
						measure.spheres[measure.spheres.length - 1]);
				} else if (e.button === THREE.MOUSE.RIGHT) {
					cancel.callback();
				}
			};

			cancel.callback = e => {
				if (cancel.removeLastMarker) {
					measure.removeMarker(measure.points.length - 1);
				}
				domElement.removeEventListener('mouseup', insertionCallback, true);
				this.viewer.removeEventListener('cancel_insertions', cancel.callback);
			};

			if (measure.maxMarkers > 1) {
				this.viewer.addEventListener('cancel_insertions', cancel.callback);
				domElement.addEventListener('mouseup', insertionCallback, true);
			}

			measure.addMarker(new THREE.Vector3(0, 0, 0));
			this.viewer.inputHandler.startDragging(
				measure.spheres[measure.spheres.length - 1]);

			this.viewer.scene.addMeasurement(measure);

			return measure;
		}
		
		update(){
			let camera = this.viewer.scene.getActiveCamera();
			let domElement = this.renderer.domElement;
			let measurements = this.viewer.scene.measurements;

			const renderAreaSize = this.renderer.getSize(new THREE.Vector2());
			let clientWidth = renderAreaSize.width;
			let clientHeight = renderAreaSize.height;

			this.light.position.copy(camera.position);

			// make size independant of distance
			for (let measure of measurements) {
				measure.lengthUnit = this.viewer.lengthUnit;
				measure.lengthUnitDisplay = this.viewer.lengthUnitDisplay;
				measure.update();

				updateAzimuth(viewer, measure);

				// spheres
				for(let sphere of measure.spheres){
					let distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
					let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
					let scale = (15 / pr);
					sphere.scale.set(scale, scale, scale);
				}

				// labels
				let labels = measure.edgeLabels.concat(measure.angleLabels);
				for(let label of labels){
					let distance = camera.position.distanceTo(label.getWorldPosition(new THREE.Vector3()));
					let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
					let scale = (70 / pr);

					if(Potree.debug.scale){
						scale = (Potree.debug.scale / pr);
					}

					label.scale.set(scale, scale, scale);
				}

				// coordinate labels
				for (let j = 0; j < measure.coordinateLabels.length; j++) {
					let label = measure.coordinateLabels[j];
					let sphere = measure.spheres[j];

					let distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));

					let screenPos = sphere.getWorldPosition(new THREE.Vector3()).clone().project(camera);
					screenPos.x = Math.round((screenPos.x + 1) * clientWidth / 2);
					screenPos.y = Math.round((-screenPos.y + 1) * clientHeight / 2);
					screenPos.z = 0;
					screenPos.y -= 30;

					let labelPos = new THREE.Vector3( 
						(screenPos.x / clientWidth) * 2 - 1, 
						-(screenPos.y / clientHeight) * 2 + 1, 
						0.5 );
					labelPos.unproject(camera);
					if(this.viewer.scene.cameraMode == CameraMode.PERSPECTIVE) {
						let direction = labelPos.sub(camera.position).normalize();
						labelPos = new THREE.Vector3().addVectors(
							camera.position, direction.multiplyScalar(distance));

					}
					label.position.copy(labelPos);
					let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
					let scale = (70 / pr);
					label.scale.set(scale, scale, scale);
				}

				// height label
				if (measure.showHeight) {
					let label = measure.heightLabel;

					{
						let distance = label.position.distanceTo(camera.position);
						let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
						let scale = (70 / pr);
						label.scale.set(scale, scale, scale);
					}

					{ // height edge
						let edge = measure.heightEdge;

						let sorted = measure.points.slice().sort((a, b) => a.position.z - b.position.z);
						let lowPoint = sorted[0].position.clone();
						let highPoint = sorted[sorted.length - 1].position.clone();
						let min = lowPoint.z;
						let max = highPoint.z;

						let start = new THREE.Vector3(highPoint.x, highPoint.y, min);
						let end = new THREE.Vector3(highPoint.x, highPoint.y, max);

						let lowScreen = lowPoint.clone().project(camera);
						let startScreen = start.clone().project(camera);
						let endScreen = end.clone().project(camera);

						let toPixelCoordinates = v => {
							let r = v.clone().addScalar(1).divideScalar(2);
							r.x = r.x * clientWidth;
							r.y = r.y * clientHeight;
							r.z = 0;

							return r;
						};

						let lowEL = toPixelCoordinates(lowScreen);
						let startEL = toPixelCoordinates(startScreen);
						let endEL = toPixelCoordinates(endScreen);

						let lToS = lowEL.distanceTo(startEL);
						let sToE = startEL.distanceTo(endEL);

						edge.geometry.lineDistances = [0, lToS, lToS, lToS + sToE];
						edge.geometry.lineDistancesNeedUpdate = true;

						edge.material.dashSize = 10;
						edge.material.gapSize = 10;
					}
				}

				{ // area label
					let label = measure.areaLabel;
					let distance = label.position.distanceTo(camera.position);
					let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

					let scale = (70 / pr);
					label.scale.set(scale, scale, scale);
				}

				{ // radius label
					let label = measure.circleRadiusLabel;
					let distance = label.position.distanceTo(camera.position);
					let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

					let scale = (70 / pr);
					label.scale.set(scale, scale, scale);
				}

				{ // edges
					const materials = [
						measure.circleRadiusLine.material,
						...measure.edges.map( (e) => e.material),
						measure.heightEdge.material,
						measure.circleLine.material,
					];

					for(const material of materials){
						material.resolution.set(clientWidth, clientHeight);
					}
				}

				if(!this.showLabels){

					const labels = [
						...measure.sphereLabels, 
						...measure.edgeLabels, 
						...measure.angleLabels, 
						...measure.coordinateLabels,
						measure.heightLabel,
						measure.areaLabel,
						measure.circleRadiusLabel,
					];

					for(const label of labels){
						label.visible = false;
					}
				}
			}
		}

		render(){
			this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
		}
	};

	class Message{

		constructor(content){
			this.content = content;

			let closeIcon = `${exports.resourcePath}/icons/close.svg`;

			this.element = $(`
			<div class="potree_message">
				<span name="content_container" style="flex-grow: 1; padding: 5px"></span>
				<img name="close" src="${closeIcon}" class="button-icon" style="width: 16px; height: 16px;">
			</div>`);

			this.elClose = this.element.find("img[name=close]");

			this.elContainer = this.element.find("span[name=content_container]");

			if(typeof content === "string"){
				this.elContainer.append($(`<span>${content}</span>`));
			}else {
				this.elContainer.append(content);
			}

		}

		setMessage(content){
			this.elContainer.empty();
			if(typeof content === "string"){
				this.elContainer.append($(`<span>${content}</span>`));
			}else {
				this.elContainer.append(content);
			}
		}

	}

	class PointCloudSM{

		constructor(potreeRenderer){

			this.potreeRenderer = potreeRenderer;
			this.threeRenderer = this.potreeRenderer.threeRenderer;

			this.target = new THREE.WebGLRenderTarget(2 * 1024, 2 * 1024, {
				minFilter: THREE.LinearFilter,
				magFilter: THREE.LinearFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType
			});
			this.target.depthTexture = new THREE.DepthTexture();
			this.target.depthTexture.type = THREE.UnsignedIntType;

			//this.threeRenderer.setClearColor(0x000000, 1);
			this.threeRenderer.setClearColor(0xff0000, 1);

			//HACK? removed while moving to three.js 109
			//this.threeRenderer.clearTarget(this.target, true, true, true); 
			{
				const oldTarget = this.threeRenderer.getRenderTarget();

				this.threeRenderer.setRenderTarget(this.target);
				this.threeRenderer.clear(true, true, true);

				this.threeRenderer.setRenderTarget(oldTarget);
			}
		}

		setLight(light){
			this.light = light;

			let fov = (180 * light.angle) / Math.PI;
			let aspect = light.shadow.mapSize.width / light.shadow.mapSize.height;
			let near = 0.1;
			let far = light.distance === 0 ? 10000 : light.distance;
			this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
			this.camera.up.set(0, 0, 1);
			this.camera.position.copy(light.position);

			let target = new THREE.Vector3().subVectors(light.position, light.getWorldDirection(new THREE.Vector3()));
			this.camera.lookAt(target);

			this.camera.updateProjectionMatrix();
			this.camera.updateMatrix();
			this.camera.updateMatrixWorld();
			this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);
		}

		setSize(width, height){
			if(this.target.width !== width || this.target.height !== height){
				this.target.dispose();
			}
			this.target.setSize(width, height);
		}

		render(scene, camera){

			this.threeRenderer.setClearColor(0x000000, 1);
			
			const oldTarget = this.threeRenderer.getRenderTarget();

			this.threeRenderer.setRenderTarget(this.target);
			this.threeRenderer.clear(true, true, true);

			this.potreeRenderer.render(scene, this.camera, this.target, {});

			this.threeRenderer.setRenderTarget(oldTarget);
		}


	}

	class ProfileTool extends EventDispatcher {
		constructor (viewer) {
			super();

			this.viewer = viewer;
			this.renderer = viewer.renderer;

			this.addEventListener('start_inserting_profile', e => {
				this.viewer.dispatchEvent({
					type: 'cancel_insertions'
				});
			});

			this.scene = new THREE.Scene();
			this.scene.name = 'scene_profile';
			this.light = new THREE.PointLight(0xffffff, 1.0);
			this.scene.add(this.light);

			this.viewer.inputHandler.registerInteractiveScene(this.scene);

			this.onRemove = e => this.scene.remove(e.profile);
			this.onAdd = e => this.scene.add(e.profile);

			for(let profile of viewer.scene.profiles){
				this.onAdd({profile: profile});
			}

			viewer.addEventListener("update", this.update.bind(this));
			viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
			viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

			viewer.scene.addEventListener('profile_added', this.onAdd);
			viewer.scene.addEventListener('profile_removed', this.onRemove);
		}

		onSceneChange(e){
			if(e.oldScene){
				e.oldScene.removeEventListeners('profile_added', this.onAdd);
				e.oldScene.removeEventListeners('profile_removed', this.onRemove);
			}

			e.scene.addEventListener('profile_added', this.onAdd);
			e.scene.addEventListener('profile_removed', this.onRemove);
		}

		startInsertion (args = {}) {
			let domElement = this.viewer.renderer.domElement;

			let profile = new Profile();
			profile.name = args.name || 'Profile';

			this.dispatchEvent({
				type: 'start_inserting_profile',
				profile: profile
			});

			this.scene.add(profile);

			let cancel = {
				callback: null
			};

			let insertionCallback = (e) => {
				if(e.button === THREE.MOUSE.LEFT){
					if(profile.points.length <= 1){
						let camera = this.viewer.scene.getActiveCamera();
						let distance = camera.position.distanceTo(profile.points[0]);
						let clientSize = this.viewer.renderer.getSize(new THREE.Vector2());
						let pr = Utils.projectedRadius(1, camera, distance, clientSize.width, clientSize.height);
						let width = (10 / pr);

						profile.setWidth(width);
					}

					profile.addMarker(profile.points[profile.points.length - 1].clone());

					this.viewer.inputHandler.startDragging(
						profile.spheres[profile.spheres.length - 1]);
				} else if (e.button === THREE.MOUSE.RIGHT) {
					cancel.callback();
				}
			};

			cancel.callback = e => {
				profile.removeMarker(profile.points.length - 1);
				domElement.removeEventListener('mouseup', insertionCallback, true);
				this.viewer.removeEventListener('cancel_insertions', cancel.callback);
			};

			this.viewer.addEventListener('cancel_insertions', cancel.callback);
			domElement.addEventListener('mouseup', insertionCallback, true);

			profile.addMarker(new THREE.Vector3(0, 0, 0));
			this.viewer.inputHandler.startDragging(
				profile.spheres[profile.spheres.length - 1]);

			this.viewer.scene.addProfile(profile);

			return profile;
		}
		
		update(){
			let camera = this.viewer.scene.getActiveCamera();
			let profiles = this.viewer.scene.profiles;
			let renderAreaSize = this.viewer.renderer.getSize(new THREE.Vector2());
			let clientWidth = renderAreaSize.width;
			let clientHeight = renderAreaSize.height;

			this.light.position.copy(camera.position);

			// make size independant of distance
			for(let profile of profiles){
				for(let sphere of profile.spheres){				
					let distance = camera.position.distanceTo(sphere.getWorldPosition(new THREE.Vector3()));
					let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
					let scale = (15 / pr);
					sphere.scale.set(scale, scale, scale);
				}
			}
		}

		render(){
			this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
		}

	}

	class ScreenBoxSelectTool extends EventDispatcher{

		constructor(viewer){
			super();

			this.viewer = viewer;
			this.scene = new THREE.Scene();

			viewer.addEventListener("update", this.update.bind(this));
			viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
			viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));
		}

		onSceneChange(scene){
			console.log("scene changed");
		}

		startInsertion(){
			let domElement = this.viewer.renderer.domElement;

			let volume = new BoxVolume();
			volume.position.set(12345, 12345, 12345);
			volume.showVolumeLabel = false;
			volume.visible = false;
			volume.update();
			this.viewer.scene.addVolume(volume);

			this.importance = 10;

			let selectionBox = $(`<div style="position: absolute; border: 2px solid white; pointer-events: none; border-style:dashed"></div>`);
			$(domElement.parentElement).append(selectionBox);
			selectionBox.css("right", "10px");
			selectionBox.css("bottom", "10px");

			let drag = e =>{

				volume.visible = true;

				let mStart = e.drag.start;
				let mEnd = e.drag.end;

				let box2D = new THREE.Box2();
				box2D.expandByPoint(mStart);
				box2D.expandByPoint(mEnd);

				selectionBox.css("left", `${box2D.min.x}px`);
				selectionBox.css("top", `${box2D.min.y}px`);
				selectionBox.css("width", `${box2D.max.x - box2D.min.x}px`);
				selectionBox.css("height", `${box2D.max.y - box2D.min.y}px`);

				let camera = e.viewer.scene.getActiveCamera();
				let size = e.viewer.renderer.getSize(new THREE.Vector2());
				let frustumSize = new THREE.Vector2(
					camera.right - camera.left, 
					camera.top - camera.bottom);

				let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
				let ray = Utils.mouseToRay(screenCentroid, camera, size.width, size.height);

				let diff = new THREE.Vector2().subVectors(e.drag.end, e.drag.start);
				diff.divide(size).multiply(frustumSize);
				
				volume.position.copy(ray.origin);
				volume.up.copy(camera.up);
				volume.rotation.copy(camera.rotation);
				volume.scale.set(diff.x, diff.y, 1000 * 100);

				e.consume();
			};

			let drop = e => {
				this.importance = 0;

				$(selectionBox).remove();

				this.viewer.inputHandler.deselectAll();
				this.viewer.inputHandler.toggleSelection(volume);

				let camera = e.viewer.scene.getActiveCamera();
				let size = e.viewer.renderer.getSize(new THREE.Vector2());
				let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
				let ray = Utils.mouseToRay(screenCentroid, camera, size.width, size.height);

				let line = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));

				this.removeEventListener("drag", drag);
				this.removeEventListener("drop", drop);

				let allPointsNear = [];
				let allPointsFar = [];

				// TODO support more than one point cloud
				for(let pointcloud of this.viewer.scene.pointclouds){

					if(!pointcloud.visible){
						continue;
					}

					let volCam = camera.clone();
					volCam.left = -volume.scale.x / 2; 
					volCam.right = +volume.scale.x / 2;
					volCam.top = +volume.scale.y / 2;
					volCam.bottom = -volume.scale.y / 2;
					volCam.near = -volume.scale.z / 2;
					volCam.far = +volume.scale.z / 2;
					volCam.rotation.copy(volume.rotation);
					volCam.position.copy(volume.position);

					volCam.updateMatrix();
					volCam.updateMatrixWorld();
					volCam.updateProjectionMatrix();
					volCam.matrixWorldInverse.getInverse(volCam.matrixWorld);

					let ray = new THREE.Ray(volCam.getWorldPosition(new THREE.Vector3()), volCam.getWorldDirection(new THREE.Vector3()));
					let rayInverse = new THREE.Ray(
						ray.origin.clone().add(ray.direction.clone().multiplyScalar(volume.scale.z)),
						ray.direction.clone().multiplyScalar(-1));

					let pickerSettings = {
						width: 8, 
						height: 8, 
						pickWindowSize: 8, 
						all: true,
						pickClipped: true,
						pointSizeType: PointSizeType.FIXED,
						pointSize: 1};
					let pointsNear = pointcloud.pick(viewer, volCam, ray, pickerSettings);

					volCam.rotateX(Math.PI);
					volCam.updateMatrix();
					volCam.updateMatrixWorld();
					volCam.updateProjectionMatrix();
					volCam.matrixWorldInverse.getInverse(volCam.matrixWorld);
					let pointsFar = pointcloud.pick(viewer, volCam, rayInverse, pickerSettings);

					allPointsNear.push(...pointsNear);
					allPointsFar.push(...pointsFar);
				}

				if(allPointsNear.length > 0 && allPointsFar.length > 0){
					let viewLine = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));

					let closestOnLine = allPointsNear.map(p => viewLine.closestPointToPoint(p.position, false, new THREE.Vector3()));
					let closest = closestOnLine.sort( (a, b) => ray.origin.distanceTo(a) - ray.origin.distanceTo(b))[0];

					let farthestOnLine = allPointsFar.map(p => viewLine.closestPointToPoint(p.position, false, new THREE.Vector3()));
					let farthest = farthestOnLine.sort( (a, b) => ray.origin.distanceTo(b) - ray.origin.distanceTo(a))[0];

					let distance = closest.distanceTo(farthest);
					let centroid = new THREE.Vector3().addVectors(closest, farthest).multiplyScalar(0.5);
					volume.scale.z = distance * 1.1;
					volume.position.copy(centroid);
				}

				volume.clip = true;
			};

			this.addEventListener("drag", drag);
			this.addEventListener("drop", drop);

			viewer.inputHandler.addInputListener(this);

			return volume;
		}

		update(e){
			//console.log(e.delta)
		}

		render(){
			this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
		}

	}

	class SpotLightHelper extends THREE.Object3D{

		constructor(light, color){
			super();

			this.light = light;
			this.color = color;

			//this.up.set(0, 0, 1);
			this.updateMatrix();
			this.updateMatrixWorld();

			{ // SPHERE
				let sg = new THREE.SphereGeometry(1, 32, 32);
				let sm = new THREE.MeshNormalMaterial();
				this.sphere = new THREE.Mesh(sg, sm);
				this.sphere.scale.set(0.5, 0.5, 0.5);
				this.add(this.sphere);
			}

			{ // LINES
				

				let positions = new Float32Array([
					+0, +0, +0,     +0, +0, -1,

					+0, +0, +0,     -1, -1, -1,
					+0, +0, +0,     +1, -1, -1,
					+0, +0, +0,     +1, +1, -1,
					+0, +0, +0,     -1, +1, -1,

					-1, -1, -1,     +1, -1, -1,
					+1, -1, -1,     +1, +1, -1,
					+1, +1, -1,     -1, +1, -1,
					-1, +1, -1,     -1, -1, -1,
				]);

				let geometry = new THREE.BufferGeometry();
				geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));

				let material = new THREE.LineBasicMaterial();

				this.frustum = new THREE.LineSegments(geometry, material);
				this.add(this.frustum);

			}

			this.update();
		}

		update(){

			this.light.updateMatrix();
			this.light.updateMatrixWorld();

			let position = this.light.position;
			//let target = new THREE.Vector3().addVectors(
			//	light.position,
			//	new THREE.Vector3().subVectors(light.position, this.light.getWorldDirection(new THREE.Vector3())));
			let target = new THREE.Vector3().addVectors(
				light.position, this.light.getWorldDirection(new THREE.Vector3()).multiplyScalar(-1));
			
			let quat = new THREE.Quaternion().setFromRotationMatrix(
				new THREE.Matrix4().lookAt( position, target, new THREE.Vector3( 0, 0, 1 ) )
			);

			this.setRotationFromQuaternion(quat);
			this.position.copy(position);


			let coneLength = (this.light.distance > 0) ? this.light.distance : 1000;
			let coneWidth = coneLength * Math.tan( this.light.angle * 0.5 );

			this.frustum.scale.set(coneWidth, coneWidth, coneLength);
			


			//{
			//	let fov = (180 * light.angle) / Math.PI;
			//	let aspect = light.shadow.mapSize.width / light.shadow.mapSize.height;
			//	let near = 0.1;
			//	let far = light.distance === 0 ? 10000 : light.distance;
			//	this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
			//	this.camera.up.set(0, 0, 1);
			//	this.camera.position.copy(light.position);

			//	let target = new THREE.Vector3().addVectors(light.position, light.getWorldDirection(new THREE.Vector3()));
			//	this.camera.lookAt(target);

			//	this.camera.updateProjectionMatrix();
			//	this.camera.updateMatrix();
			//	this.camera.updateMatrixWorld();
			//	this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);
			//}

		}

	}

	class TransformationTool {
		constructor(viewer) {
			this.viewer = viewer;

			this.scene = new THREE.Scene();

			this.selection = [];
			this.pivot = new THREE.Vector3();
			this.dragging = false;
			this.showPickVolumes = false;

			this.viewer.inputHandler.registerInteractiveScene(this.scene);
			this.viewer.inputHandler.addEventListener('selection_changed', (e) => {
				for(let selected of this.selection){
					this.viewer.inputHandler.blacklist.delete(selected);
				}

				this.selection = e.selection;

				for(let selected of this.selection){
					this.viewer.inputHandler.blacklist.add(selected);
				}

			});

			let red = 0xE73100;
			let green = 0x44A24A;
			let blue = 0x2669E7;
			
			this.activeHandle = null;
			this.scaleHandles = {
				"scale.x+": {name: "scale.x+", node: new THREE.Object3D(), color: red, alignment: [+1, +0, +0]},
				"scale.x-": {name: "scale.x-", node: new THREE.Object3D(), color: red, alignment: [-1, +0, +0]},
				"scale.y+": {name: "scale.y+", node: new THREE.Object3D(), color: green, alignment: [+0, +1, +0]},
				"scale.y-": {name: "scale.y-", node: new THREE.Object3D(), color: green, alignment: [+0, -1, +0]},
				"scale.z+": {name: "scale.z+", node: new THREE.Object3D(), color: blue, alignment: [+0, +0, +1]},
				"scale.z-": {name: "scale.z-", node: new THREE.Object3D(), color: blue, alignment: [+0, +0, -1]},
			};
			this.focusHandles = {
				"focus.x+": {name: "focus.x+", node:  new THREE.Object3D(), color: red, alignment: [+1, +0, +0]},
				"focus.x-": {name: "focus.x-", node:  new THREE.Object3D(), color: red, alignment: [-1, +0, +0]},
				"focus.y+": {name: "focus.y+", node:  new THREE.Object3D(), color: green, alignment: [+0, +1, +0]},
				"focus.y-": {name: "focus.y-", node:  new THREE.Object3D(), color: green, alignment: [+0, -1, +0]},
				"focus.z+": {name: "focus.z+", node:  new THREE.Object3D(), color: blue, alignment: [+0, +0, +1]},
				"focus.z-": {name: "focus.z-", node:  new THREE.Object3D(), color: blue, alignment: [+0, +0, -1]},
			};
			this.translationHandles = {
				"translation.x": {name: "translation.x", node:  new THREE.Object3D(), color: red, alignment: [1, 0, 0]},
				"translation.y": {name: "translation.y", node:  new THREE.Object3D(), color: green, alignment: [0, 1, 0]},
				"translation.z": {name: "translation.z", node:  new THREE.Object3D(), color: blue, alignment: [0, 0, 1]},
			};
			this.rotationHandles = {
				"rotation.x": {name: "rotation.x", node:  new THREE.Object3D(), color: red, alignment: [1, 0, 0]},
				"rotation.y": {name: "rotation.y", node:  new THREE.Object3D(), color: green, alignment: [0, 1, 0]},
				"rotation.z": {name: "rotation.z", node:  new THREE.Object3D(), color: blue, alignment: [0, 0, 1]},
			};
			this.handles = Object.assign({}, this.scaleHandles, this.focusHandles, this.translationHandles, this.rotationHandles);
			this.pickVolumes = [];

			this.initializeScaleHandles();
			this.initializeFocusHandles();
			this.initializeTranslationHandles();
			this.initializeRotationHandles();


			let boxFrameGeometry = new THREE.Geometry();
			{
				// bottom
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
				// top
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
				// sides
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
				boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
			}
			this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({color: 0xffff00}));
			this.scene.add(this.frame);

			
		}

		initializeScaleHandles(){
			let sgSphere = new THREE.SphereGeometry(1, 32, 32);
			let sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

			for(let handleName of Object.keys(this.scaleHandles)){
				let handle = this.scaleHandles[handleName];
				let node = handle.node;
				this.scene.add(node);
				node.position.set(...handle.alignment).multiplyScalar(0.5);

				let material = new THREE.MeshBasicMaterial({
					color: handle.color,
					opacity: 0.4,
					transparent: true
					});

				let outlineMaterial = new THREE.MeshBasicMaterial({
					color: 0x000000, 
					side: THREE.BackSide,
					opacity: 0.4,
					transparent: true});

				let pickMaterial = new THREE.MeshNormalMaterial({
					opacity: 0.2,
					transparent: true,
					visible: this.showPickVolumes});

				let sphere = new THREE.Mesh(sgSphere, material);
				sphere.scale.set(1.3, 1.3, 1.3);
				sphere.name = `${handleName}.handle`;
				node.add(sphere);
				
				let outline = new THREE.Mesh(sgSphere, outlineMaterial);
				outline.scale.set(1.4, 1.4, 1.4);
				outline.name = `${handleName}.outline`;
				sphere.add(outline);

				let pickSphere = new THREE.Mesh(sgLowPolySphere, pickMaterial);
				pickSphere.name = `${handleName}.pick_volume`;
				pickSphere.scale.set(3, 3, 3);
				sphere.add(pickSphere);
				pickSphere.handle = handleName;
				this.pickVolumes.push(pickSphere);

				node.setOpacity = (target) => {
					let opacity = {x: material.opacity};
					let t = new TWEEN.Tween(opacity).to({x: target}, 100);
					t.onUpdate(() => {
						sphere.visible = opacity.x > 0;
						pickSphere.visible = opacity.x > 0;
						material.opacity = opacity.x;
						outlineMaterial.opacity = opacity.x;
						pickSphere.material.opacity = opacity.x * 0.5;
					});
					t.start();
				};

				pickSphere.addEventListener("drag", (e) => this.dragScaleHandle(e));
				pickSphere.addEventListener("drop", (e) => this.dropScaleHandle(e));

				pickSphere.addEventListener("mouseover", e => {
					//node.setOpacity(1);
				});

				pickSphere.addEventListener("click", e => {
					e.consume();
				});

				pickSphere.addEventListener("mouseleave", e => {
					//node.setOpacity(0.4);
				});
			}
		}

		initializeFocusHandles(){
			//let sgBox = new THREE.BoxGeometry(1, 1, 1);
			let sgPlane = new THREE.PlaneGeometry(4, 4, 1, 1);
			let sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

			let texture = new THREE.TextureLoader().load(`${exports.resourcePath}/icons/eye_2.png`);

			for(let handleName of Object.keys(this.focusHandles)){
				let handle = this.focusHandles[handleName];
				let node = handle.node;
				this.scene.add(node);
				let align = handle.alignment;

				//node.lookAt(new THREE.Vector3().addVectors(node.position, new THREE.Vector3(...align)));
				node.lookAt(new THREE.Vector3(...align));

				let off = 0.8;
				if(align[0] === 1){
					node.position.set(1, off, -off).multiplyScalar(0.5);
					node.rotation.z = Math.PI / 2;
				}else if(align[0] === -1){
					node.position.set(-1, -off, -off).multiplyScalar(0.5);
					node.rotation.z = Math.PI / 2;
				}else if(align[1] === 1){
					node.position.set(-off, 1, -off).multiplyScalar(0.5);
					node.rotation.set(Math.PI / 2, Math.PI, 0.0);
				}else if(align[1] === -1){
					node.position.set(off, -1, -off).multiplyScalar(0.5);
					node.rotation.set(Math.PI / 2, 0.0, 0.0);
				}else if(align[2] === 1){
					node.position.set(off, off, 1).multiplyScalar(0.5);
				}else if(align[2] === -1){
					node.position.set(-off, off, -1).multiplyScalar(0.5);
				}

				let material = new THREE.MeshBasicMaterial({
					color: handle.color,
					opacity: 0,
					transparent: true,
					map: texture
				});

				//let outlineMaterial = new THREE.MeshBasicMaterial({
				//	color: 0x000000, 
				//	side: THREE.BackSide,
				//	opacity: 0,
				//	transparent: true});

				let pickMaterial = new THREE.MeshNormalMaterial({
					//opacity: 0,
					transparent: true,
					visible: this.showPickVolumes});

				let box = new THREE.Mesh(sgPlane, material);
				box.name = `${handleName}.handle`;
				box.scale.set(1.5, 1.5, 1.5);
				box.position.set(0, 0, 0);
				box.visible = false;
				node.add(box);
				//handle.focusNode = box;
				
				//let outline = new THREE.Mesh(sgPlane, outlineMaterial);
				//outline.scale.set(1.4, 1.4, 1.4);
				//outline.name = `${handleName}.outline`;
				//box.add(outline);

				let pickSphere = new THREE.Mesh(sgLowPolySphere, pickMaterial);
				pickSphere.name = `${handleName}.pick_volume`;
				pickSphere.scale.set(3, 3, 3);
				box.add(pickSphere);
				pickSphere.handle = handleName;
				this.pickVolumes.push(pickSphere);

				node.setOpacity = (target) => {
					let opacity = {x: material.opacity};
					let t = new TWEEN.Tween(opacity).to({x: target}, 100);
					t.onUpdate(() => {
						pickSphere.visible = opacity.x > 0;
						box.visible = opacity.x > 0;
						material.opacity = opacity.x;
						//outlineMaterial.opacity = opacity.x;
						pickSphere.material.opacity = opacity.x * 0.5;
					});
					t.start();
				};

				pickSphere.addEventListener("drag", e => {});

				pickSphere.addEventListener("mouseup", e => {
					e.consume();
				});

				pickSphere.addEventListener("mousedown", e => {
					e.consume();
				});

				pickSphere.addEventListener("click", e => {
					e.consume();

					let selected = this.selection[0];
					let maxScale = Math.max(...selected.scale.toArray());
					let minScale = Math.min(...selected.scale.toArray());
					let handleLength = Math.abs(selected.scale.dot(new THREE.Vector3(...handle.alignment)));
					let alignment = new THREE.Vector3(...handle.alignment).multiplyScalar(2 * maxScale / handleLength);
					alignment.applyMatrix4(selected.matrixWorld);
					let newCamPos = alignment;
					let newCamTarget = selected.getWorldPosition(new THREE.Vector3());

					Utils.moveTo(this.viewer.scene, newCamPos, newCamTarget);
				});

				pickSphere.addEventListener("mouseover", e => {
					//box.setOpacity(1);
				});

				pickSphere.addEventListener("mouseleave", e => {
					//box.setOpacity(0.4);
				});
			}
		}

		initializeTranslationHandles(){
			let boxGeometry = new THREE.BoxGeometry(1, 1, 1);

			for(let handleName of Object.keys(this.translationHandles)){
				let handle = this.handles[handleName];
				let node = handle.node;
				this.scene.add(node);

				let material = new THREE.MeshBasicMaterial({
					color: handle.color,
					opacity: 0.4,
					transparent: true});

				let outlineMaterial = new THREE.MeshBasicMaterial({
					color: 0x000000, 
					side: THREE.BackSide,
					opacity: 0.4,
					transparent: true});

				let pickMaterial = new THREE.MeshNormalMaterial({
					opacity: 0.2,
					transparent: true,
					visible: this.showPickVolumes
				});

				let box = new THREE.Mesh(boxGeometry, material);
				box.name = `${handleName}.handle`;
				box.scale.set(0.2, 0.2, 40);
				box.lookAt(new THREE.Vector3(...handle.alignment));
				box.renderOrder = 10;
				node.add(box);
				handle.translateNode = box;

				let outline = new THREE.Mesh(boxGeometry, outlineMaterial);
				outline.name = `${handleName}.outline`;
				outline.scale.set(3, 3, 1.03);
				outline.renderOrder = 0;
				box.add(outline);

				let pickVolume = new THREE.Mesh(boxGeometry, pickMaterial);
				pickVolume.name = `${handleName}.pick_volume`;
				pickVolume.scale.set(12, 12, 1.1);
				pickVolume.handle = handleName;
				box.add(pickVolume);
				this.pickVolumes.push(pickVolume);

				node.setOpacity = (target) => {
					let opacity = {x: material.opacity};
					let t = new TWEEN.Tween(opacity).to({x: target}, 100);
					t.onUpdate(() => {
						box.visible = opacity.x > 0;
						pickVolume.visible = opacity.x > 0;
						material.opacity = opacity.x;
						outlineMaterial.opacity = opacity.x;
						pickMaterial.opacity = opacity.x * 0.5;
					});
					t.start();
				};

				pickVolume.addEventListener("drag", (e) => {this.dragTranslationHandle(e);});
				pickVolume.addEventListener("drop", (e) => {this.dropTranslationHandle(e);});
			}
		}

		initializeRotationHandles(){
			let adjust = 0.5;
			let torusGeometry = new THREE.TorusGeometry(1, adjust * 0.015, 8, 64, Math.PI / 2);
			let outlineGeometry = new THREE.TorusGeometry(1, adjust * 0.04, 8, 64, Math.PI / 2);
			let pickGeometry = new THREE.TorusGeometry(1, adjust * 0.1, 6, 4, Math.PI / 2);

			for(let handleName of Object.keys(this.rotationHandles)){
				let handle = this.handles[handleName];
				let node = handle.node;
				this.scene.add(node);

				let material = new THREE.MeshBasicMaterial({
					color: handle.color,
					opacity: 0.4,
					transparent: true});

				let outlineMaterial = new THREE.MeshBasicMaterial({
					color: 0x000000, 
					side: THREE.BackSide,
					opacity: 0.4,
					transparent: true});

				let pickMaterial = new THREE.MeshNormalMaterial({
					opacity: 0.2,
					transparent: true,
					visible: this.showPickVolumes
				});

				let box = new THREE.Mesh(torusGeometry, material);
				box.name = `${handleName}.handle`;
				box.scale.set(20, 20, 20);
				box.lookAt(new THREE.Vector3(...handle.alignment));
				node.add(box);
				handle.translateNode = box;

				let outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
				outline.name = `${handleName}.outline`;
				outline.scale.set(1, 1, 1);
				outline.renderOrder = 0;
				box.add(outline);

				let pickVolume = new THREE.Mesh(pickGeometry, pickMaterial);
				pickVolume.name = `${handleName}.pick_volume`;
				pickVolume.scale.set(1, 1, 1);
				pickVolume.handle = handleName;
				box.add(pickVolume);
				this.pickVolumes.push(pickVolume);

				node.setOpacity = (target) => {
					let opacity = {x: material.opacity};
					let t = new TWEEN.Tween(opacity).to({x: target}, 100);
					t.onUpdate(() => {
						box.visible = opacity.x > 0;
						pickVolume.visible = opacity.x > 0;
						material.opacity = opacity.x;
						outlineMaterial.opacity = opacity.x;
						pickMaterial.opacity = opacity.x * 0.5;
					});
					t.start();
				};


				//pickVolume.addEventListener("mouseover", (e) => {
				//	//let a = this.viewer.scene.getActiveCamera().getWorldDirection(new THREE.Vector3()).dot(pickVolume.getWorldDirection(new THREE.Vector3()));
				//	console.log(pickVolume.getWorldDirection(new THREE.Vector3()));
				//});
				
				pickVolume.addEventListener("drag", (e) => {this.dragRotationHandle(e);});
				pickVolume.addEventListener("drop", (e) => {this.dropRotationHandle(e);});
			}
		}

		dragRotationHandle(e){
			let drag = e.drag;
			let handle = this.activeHandle;
			let camera = this.viewer.scene.getActiveCamera();

			if(!handle){
				return
			};

			let localNormal = new THREE.Vector3(...handle.alignment);
			let n = new THREE.Vector3();
			n.copy(new THREE.Vector4(...localNormal.toArray(), 0).applyMatrix4(handle.node.matrixWorld));
			n.normalize();

			if (!drag.intersectionStart){

				//this.viewer.scene.scene.remove(this.debug);
				//this.debug = new THREE.Object3D();
				//this.viewer.scene.scene.add(this.debug);
				//Utils.debugSphere(this.debug, drag.location, 3, 0xaaaaaa);
				//let debugEnd = drag.location.clone().add(n.clone().multiplyScalar(20));
				//Utils.debugLine(this.debug, drag.location, debugEnd, 0xff0000);

				drag.intersectionStart = drag.location;
				drag.objectStart = drag.object.getWorldPosition(new THREE.Vector3());
				drag.handle = handle;

				let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, drag.intersectionStart);

				drag.dragPlane = plane;
				drag.pivot = drag.intersectionStart;
			}else {
				handle = drag.handle;
			}

			this.dragging = true;

			let mouse = drag.end;
			let domElement = this.viewer.renderer.domElement;
			let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
			
			let I = ray.intersectPlane(drag.dragPlane, new THREE.Vector3());

			if (I) {
				let center = this.scene.getWorldPosition(new THREE.Vector3());
				let from = drag.pivot;
				let to = I;

				let v1 = from.clone().sub(center).normalize();
				let v2 = to.clone().sub(center).normalize();

				let angle = Math.acos(v1.dot(v2));
				let sign = Math.sign(v1.cross(v2).dot(n));
				angle = angle * sign;
				if (Number.isNaN(angle)) {
					return;
				}

				let normal = new THREE.Vector3(...handle.alignment);
				for (let selection of this.selection) {
					selection.rotateOnAxis(normal, angle);
					selection.dispatchEvent({
						type: "orientation_changed",
						object: selection
					});
				}

				drag.pivot = I;
			}
		}

		dropRotationHandle(e){
			this.dragging = false;
			this.setActiveHandle(null);
		}

		dragTranslationHandle(e){
			let drag = e.drag;
			let handle = this.activeHandle;
			let camera = this.viewer.scene.getActiveCamera();
				
			if(!drag.intersectionStart && handle){
				drag.intersectionStart = drag.location;
				drag.objectStart = drag.object.getWorldPosition(new THREE.Vector3());

				let start = drag.intersectionStart;
				let dir = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
				let end = new THREE.Vector3().addVectors(start, dir);
				let line = new THREE.Line3(start.clone(), end.clone());
				drag.line = line;

				let camOnLine = line.closestPointToPoint(camera.position, false, new THREE.Vector3());
				let normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
				let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
				drag.dragPlane = plane;
				drag.pivot = drag.intersectionStart;
			}else {
				handle = drag.handle;
			}

			this.dragging = true;

			{
				let mouse = drag.end;
				let domElement = this.viewer.renderer.domElement;
				let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
				let I = ray.intersectPlane(drag.dragPlane, new THREE.Vector3());

				if (I) {
					let iOnLine = drag.line.closestPointToPoint(I, false, new THREE.Vector3());

					let diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);

					for (let selection of this.selection) {
						selection.position.add(diff);
						selection.dispatchEvent({
							type: "position_changed",
							object: selection
						});
					}

					drag.pivot = drag.pivot.add(diff);
				}
			}
		}

		dropTranslationHandle(e){
			this.dragging = false;
			this.setActiveHandle(null);
		}

		dropScaleHandle(e){
			this.dragging = false;
			this.setActiveHandle(null);
		}

		dragScaleHandle(e){
			let drag = e.drag;
			let handle = this.activeHandle;
			let camera = this.viewer.scene.getActiveCamera();

			if(!drag.intersectionStart){
				drag.intersectionStart = drag.location;
				drag.objectStart = drag.object.getWorldPosition(new THREE.Vector3());
				drag.handle = handle;

				let start = drag.intersectionStart;
				let dir = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
				let end = new THREE.Vector3().addVectors(start, dir);
				let line = new THREE.Line3(start.clone(), end.clone());
				drag.line = line;

				let camOnLine = line.closestPointToPoint(camera.position, false, new THREE.Vector3());
				let normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
				let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
				drag.dragPlane = plane;
				drag.pivot = drag.intersectionStart;

				//Utils.debugSphere(viewer.scene.scene, drag.pivot, 0.05);
			}else {
				handle = drag.handle;
			}

			this.dragging = true;

			{
				let mouse = drag.end;
				let domElement = this.viewer.renderer.domElement;
				let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
				let I = ray.intersectPlane(drag.dragPlane, new THREE.Vector3());

				if (I) {
					let iOnLine = drag.line.closestPointToPoint(I, false, new THREE.Vector3());
					let direction = handle.alignment.reduce( (a, v) => a + v, 0);

					let toObjectSpace = new THREE.Matrix4().getInverse( this.selection[0].matrixWorld);
					let iOnLineOS = iOnLine.clone().applyMatrix4(toObjectSpace);
					let pivotOS = drag.pivot.clone().applyMatrix4(toObjectSpace);
					let diffOS = new THREE.Vector3().subVectors(iOnLineOS, pivotOS);
					let dragDirectionOS = diffOS.clone().normalize();
					if(iOnLine.distanceTo(drag.pivot) === 0){
						dragDirectionOS.set(0, 0, 0);
					}
					let dragDirection = dragDirectionOS.dot(new THREE.Vector3(...handle.alignment));

					let diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);
					let diffScale = new THREE.Vector3(...handle.alignment).multiplyScalar(diff.length() * direction * dragDirection);
					let diffPosition = diff.clone().multiplyScalar(0.5);

					for (let selection of this.selection) {
						selection.scale.add(diffScale);
						selection.scale.x = Math.max(0.1, selection.scale.x);
						selection.scale.y = Math.max(0.1, selection.scale.y);
						selection.scale.z = Math.max(0.1, selection.scale.z);
						selection.position.add(diffPosition);
						selection.dispatchEvent({
							type: "position_changed",
							object: selection
						});
						selection.dispatchEvent({
							type: "scale_changed",
							object: selection
						});
					}

					drag.pivot.copy(iOnLine);
					//Utils.debugSphere(viewer.scene.scene, drag.pivot, 0.05);
				}
			}
		}

		setActiveHandle(handle){
			if(this.dragging){
				return;
			}

			if(this.activeHandle === handle){
				return;
			}

			this.activeHandle = handle;

			if(handle === null){
				for(let handleName of Object.keys(this.handles)){
					let handle = this.handles[handleName];
					handle.node.setOpacity(0);
				}
			}

			for(let handleName of Object.keys(this.focusHandles)){
				let handle = this.focusHandles[handleName];

				if(this.activeHandle === handle){
					handle.node.setOpacity(1.0);
				}else {
					handle.node.setOpacity(0.4);
				}
			}

			for(let handleName of Object.keys(this.translationHandles)){
				let handle = this.translationHandles[handleName];

				if(this.activeHandle === handle){
					handle.node.setOpacity(1.0);
				}else {
					handle.node.setOpacity(0.4);
				}
			}

			for(let handleName of Object.keys(this.rotationHandles)){
				let handle = this.rotationHandles[handleName];

				//if(this.activeHandle === handle){
				//	handle.node.setOpacity(1.0);
				//}else{
				//	handle.node.setOpacity(0.4)
				//}

				handle.node.setOpacity(0.4);
			}

			for(let handleName of Object.keys(this.scaleHandles)){
				let handle = this.scaleHandles[handleName];

				if(this.activeHandle === handle){
					handle.node.setOpacity(1.0);

					let relatedFocusHandle = this.focusHandles[handle.name.replace("scale", "focus")];
					let relatedFocusNode = relatedFocusHandle.node;
					relatedFocusNode.setOpacity(0.4);

					for(let translationHandleName of Object.keys(this.translationHandles)){
						let translationHandle = this.translationHandles[translationHandleName];
						translationHandle.node.setOpacity(0.4);
					}

					//let relatedTranslationHandle = this.translationHandles[
					//	handle.name.replace("scale", "translation").replace(/[+-]/g, "")];
					//let relatedTranslationNode = relatedTranslationHandle.node;
					//relatedTranslationNode.setOpacity(0.4);


				}else {
					handle.node.setOpacity(0.4);
				}
			}

			



			if(handle){
				handle.node.setOpacity(1.0);
			}

			
		}

		update () {

			if(this.selection.length === 1){

				this.scene.visible = true;

				this.scene.updateMatrix();
				this.scene.updateMatrixWorld();

				let selected = this.selection[0];
				let world = selected.matrixWorld;
				let camera = this.viewer.scene.getActiveCamera();
				let domElement = this.viewer.renderer.domElement;
				let mouse = this.viewer.inputHandler.mouse;

				let center = selected.boundingBox.getCenter(new THREE.Vector3()).clone().applyMatrix4(selected.matrixWorld);

				this.scene.scale.copy(selected.boundingBox.getSize(new THREE.Vector3()).multiply(selected.scale));
				this.scene.position.copy(center);
				this.scene.rotation.copy(selected.rotation);

				this.scene.updateMatrixWorld();

				{
					// adjust scale of components
					for(let handleName of Object.keys(this.handles)){
						let handle = this.handles[handleName];
						let node = handle.node;

						let handlePos = node.getWorldPosition(new THREE.Vector3());
						let distance = handlePos.distanceTo(camera.position);
						let pr = Utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);

						let ws = node.parent.getWorldScale(new THREE.Vector3());

						let s = (7 / pr);
						let scale = new THREE.Vector3(s, s, s).divide(ws);

						let rot = new THREE.Matrix4().makeRotationFromEuler(node.rotation);
						let rotInv = new THREE.Matrix4().getInverse(rot);

						scale.applyMatrix4(rotInv);
						scale.x = Math.abs(scale.x);
						scale.y = Math.abs(scale.y);
						scale.z = Math.abs(scale.z);

						node.scale.copy(scale);
					}

					// adjust rotation handles
					if(!this.dragging){
						let tWorld = this.scene.matrixWorld;
						let tObject = new THREE.Matrix4().getInverse(tWorld);
						let camObjectPos = camera.getWorldPosition(new THREE.Vector3()).applyMatrix4(tObject);

						let x = this.rotationHandles["rotation.x"].node.rotation;
						let y = this.rotationHandles["rotation.y"].node.rotation;
						let z = this.rotationHandles["rotation.z"].node.rotation;

						x.order = "ZYX";
						y.order = "ZYX";

						let above = camObjectPos.z > 0;
						let below = !above;
						let PI_HALF = Math.PI / 2;

						if(above){
							if(camObjectPos.x > 0 && camObjectPos.y > 0){
								x.x = 1 * PI_HALF;
								y.y = 3 * PI_HALF;
								z.z = 0 * PI_HALF;
							}else if(camObjectPos.x < 0 && camObjectPos.y > 0){
								x.x = 1 * PI_HALF;
								y.y = 2 * PI_HALF;
								z.z = 1 * PI_HALF;
							}else if(camObjectPos.x < 0 && camObjectPos.y < 0){
								x.x = 2 * PI_HALF;
								y.y = 2 * PI_HALF;
								z.z = 2 * PI_HALF;
							}else if(camObjectPos.x > 0 && camObjectPos.y < 0){
								x.x = 2 * PI_HALF;
								y.y = 3 * PI_HALF;
								z.z = 3 * PI_HALF;
							}
						}else if(below){
							if(camObjectPos.x > 0 && camObjectPos.y > 0){
								x.x = 0 * PI_HALF;
								y.y = 0 * PI_HALF;
								z.z = 0 * PI_HALF;
							}else if(camObjectPos.x < 0 && camObjectPos.y > 0){
								x.x = 0 * PI_HALF;
								y.y = 1 * PI_HALF;
								z.z = 1 * PI_HALF;
							}else if(camObjectPos.x < 0 && camObjectPos.y < 0){
								x.x = 3 * PI_HALF;
								y.y = 1 * PI_HALF;
								z.z = 2 * PI_HALF;
							}else if(camObjectPos.x > 0 && camObjectPos.y < 0){
								x.x = 3 * PI_HALF;
								y.y = 0 * PI_HALF;
								z.z = 3 * PI_HALF;
							}
						}
					}

					{
						let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
						let raycaster = new THREE.Raycaster(ray.origin, ray.direction);
						let intersects = raycaster.intersectObjects(this.pickVolumes.filter(v => v.visible), true);

						if(intersects.length > 0){
							let I = intersects[0];
							let handleName = I.object.handle;
							this.setActiveHandle(this.handles[handleName]);
						}else {
							this.setActiveHandle(null);
						}
					}

					// 
					for(let handleName of Object.keys(this.scaleHandles)){
						let handle = this.handles[handleName];
						let node = handle.node;
						let alignment = handle.alignment;

						

					}
				}


				{
					let axisScale = (alignment) => {
						let transformed = new THREE.Vector3(...alignment).applyMatrix4(selected.matrixWorld);
						let distance = transformed.distanceTo(selected.getWorldPosition(new THREE.Vector3()));

						return distance;
					};

					let scale = new THREE.Vector3(
						axisScale([1, 0, 0]),
						axisScale([0, 1, 0]),
						axisScale([0, 0, 1]),
					);

				}

			}else {
				this.scene.visible = false;
			}
			
		}

	};

	class VolumeTool extends EventDispatcher{
		constructor (viewer) {
			super();

			this.viewer = viewer;
			this.renderer = viewer.renderer;

			this.addEventListener('start_inserting_volume', e => {
				this.viewer.dispatchEvent({
					type: 'cancel_insertions'
				});
			});

			this.scene = new THREE.Scene();
			this.scene.name = 'scene_volume';

			this.viewer.inputHandler.registerInteractiveScene(this.scene);

			this.onRemove = e => {
				this.scene.remove(e.volume);
			};

			this.onAdd = e => {
				this.scene.add(e.volume);
			};

			for(let volume of viewer.scene.volumes){
				this.onAdd({volume: volume});
			}

			this.viewer.inputHandler.addEventListener('delete', e => {
				let volumes = e.selection.filter(e => (e instanceof Volume));
				volumes.forEach(e => this.viewer.scene.removeVolume(e));
			});

			viewer.addEventListener("update", this.update.bind(this));
			viewer.addEventListener("render.pass.scene", e => this.render(e));
			viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

			viewer.scene.addEventListener('volume_added', this.onAdd);
			viewer.scene.addEventListener('volume_removed', this.onRemove);
		}

		onSceneChange(e){
			if(e.oldScene){
				e.oldScene.removeEventListeners('volume_added', this.onAdd);
				e.oldScene.removeEventListeners('volume_removed', this.onRemove);
			}

			e.scene.addEventListener('volume_added', this.onAdd);
			e.scene.addEventListener('volume_removed', this.onRemove);
		}

		startInsertion (args = {}) {
			let volume;
			if(args.type){
				volume = new args.type();
			}else {
				volume = new BoxVolume();
			}
			
			volume.clip = args.clip || false;
			volume.name = args.name || 'Volume';

			this.dispatchEvent({
				type: 'start_inserting_volume',
				volume: volume
			});

			this.viewer.scene.addVolume(volume);
			this.scene.add(volume);

			let cancel = {
				callback: null
			};

			let drag = e => {
				let camera = this.viewer.scene.getActiveCamera();
				
				let I = Utils.getMousePointCloudIntersection(
					e.drag.end, 
					this.viewer.scene.getActiveCamera(), 
					this.viewer, 
					this.viewer.scene.pointclouds, 
					{pickClipped: false});

				if (I) {
					volume.position.copy(I.location);

					let wp = volume.getWorldPosition(new THREE.Vector3()).applyMatrix4(camera.matrixWorldInverse);
					// let pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
					let w = Math.abs((wp.z / 5));
					volume.scale.set(w, w, w);
				}
			};

			let drop = e => {
				volume.removeEventListener('drag', drag);
				volume.removeEventListener('drop', drop);

				cancel.callback();
			};

			cancel.callback = e => {
				volume.removeEventListener('drag', drag);
				volume.removeEventListener('drop', drop);
				this.viewer.removeEventListener('cancel_insertions', cancel.callback);
			};

			volume.addEventListener('drag', drag);
			volume.addEventListener('drop', drop);
			this.viewer.addEventListener('cancel_insertions', cancel.callback);

			this.viewer.inputHandler.startDragging(volume);

			return volume;
		}

		update(){
			if (!this.viewer.scene) {
				return;
			}
			
			let camera = this.viewer.scene.getActiveCamera();
			let renderAreaSize = this.viewer.renderer.getSize(new THREE.Vector2());
			let clientWidth = renderAreaSize.width;
			let clientHeight = renderAreaSize.height;

			let volumes = this.viewer.scene.volumes;
			for (let volume of volumes) {
				let label = volume.label;
				
				{

					let distance = label.position.distanceTo(camera.position);
					let pr = Utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

					let scale = (70 / pr);
					label.scale.set(scale, scale, scale);
				}

				let calculatedVolume = volume.getVolume();
				calculatedVolume = calculatedVolume / Math.pow(this.viewer.lengthUnit.unitspermeter, 3) * Math.pow(this.viewer.lengthUnitDisplay.unitspermeter, 3);  //convert to cubic meters then to the cubic display unit
				let text = Utils.addCommas(calculatedVolume.toFixed(3)) + ' ' + this.viewer.lengthUnitDisplay.code + '\u00B3';
				label.setText(text);
			}
		}

		render(params){
			const renderer = this.viewer.renderer;

			const oldTarget = renderer.getRenderTarget();
			
			if(params.renderTarget){
				renderer.setRenderTarget(params.renderTarget);
			}
			renderer.render(this.scene, this.viewer.scene.getActiveCamera());
			renderer.setRenderTarget(oldTarget);
		}

	}

	class Compass{

		constructor(viewer){
			this.viewer = viewer;

			this.visible = false;
			this.dom = this.createElement();

			viewer.addEventListener("update", () => {
				const direction = viewer.scene.view.direction.clone();
				direction.z = 0;
				direction.normalize();

				const camera = viewer.scene.getActiveCamera();

				const p1 = camera.getWorldPosition(new THREE.Vector3());
				const p2 = p1.clone().add(direction);

				const projection = viewer.getProjection();
				const azimuth = Utils.computeAzimuth(p1, p2, projection);
				
				this.dom.css("transform", `rotateZ(${-azimuth}rad)`);
			});

			this.dom.click( () => {
				viewer.setTopView();
			});

			const renderArea = $(viewer.renderArea);
			renderArea.append(this.dom);

			this.setVisible(this.visible);
		}

		setVisible(visible){
			this.visible = visible;

			const value = visible ? "" : "none";
			this.dom.css("display", value);
		}

		isVisible(){
			return this.visible;
		}

		createElement(){
			const style = `style="position: absolute; top: 10px; right: 10px; z-index: 10000; width: 64px;"`;
			const img = $(`<img src="${Potree.resourcePath}/images/compas.svg" ${style} />`);

			return img;
		}

	};

	class PotreeRenderer {

		constructor (viewer) {
			this.viewer = viewer;
			this.renderer = viewer.renderer;
		}

		clearTargets(){

		}

		clear(){
			let {viewer, renderer} = this;

			// render skybox
			if(viewer.background === "skybox"){
				renderer.setClearColor(0x000000, 0);
				renderer.clear(true, true, false);
			}else if(viewer.background === "gradient"){
				renderer.setClearColor(0x000000, 0);
				renderer.clear(true, true, false);
			}else if(viewer.background === "black"){
				renderer.setClearColor(0x000000, 1);
				renderer.clear(true, true, false);
			}else if(viewer.background === "white"){
				renderer.setClearColor(0xFFFFFF, 1);
				renderer.clear(true, true, false);
			}else {
				renderer.setClearColor(0x000000, 0);
				renderer.clear(true, true, false);
			}
		}
	 
		render(params){
			let {viewer, renderer} = this;

			const camera = params.camera ? params.camera : viewer.scene.getActiveCamera();

			viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

			const renderAreaSize = renderer.getSize(new THREE.Vector2());
			const width = params.viewport ? params.viewport[2] : renderAreaSize.x;
			const height = params.viewport ? params.viewport[3] : renderAreaSize.y;


			// render skybox
			if(viewer.background === "skybox"){
				viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
				viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
				viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
				viewer.skybox.camera.updateProjectionMatrix();
				renderer.render(viewer.skybox.scene, viewer.skybox.camera);
			}else if(viewer.background === "gradient"){
				renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
			}
			
			for(let pointcloud of this.viewer.scene.pointclouds){
				const {material} = pointcloud;
				material.useEDL = false;
				//material.updateShaderSource();
			}
			
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, null, {
				clipSpheres: viewer.scene.volumes.filter(v => (v instanceof Potree.SphereVolume)),
			});
			
			// render scene
			renderer.render(viewer.scene.scene, camera);

			viewer.dispatchEvent({type: "render.pass.scene",viewer: viewer});
			
			viewer.clippingTool.update();
			renderer.render(viewer.clippingTool.sceneMarker, viewer.scene.cameraScreenSpace); //viewer.scene.cameraScreenSpace);
			renderer.render(viewer.clippingTool.sceneVolume, camera);

			renderer.render(viewer.controls.sceneControls, camera);
			
			renderer.clearDepth();
			
			viewer.transformationTool.update();
			
			viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

			renderer.render(viewer.controls.sceneControls, camera);
			renderer.render(viewer.clippingTool.sceneVolume, camera);
			renderer.render(viewer.transformationTool.scene, camera);
			
			renderer.setViewport(width - viewer.navigationCube.width, 
										height - viewer.navigationCube.width, 
										viewer.navigationCube.width, viewer.navigationCube.width);
			renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
			renderer.setViewport(0, 0, width, height);
			
			// renderer.render(viewer.transformationTool.scene, camera);

			// renderer.setViewport(renderer.domElement.clientWidth - viewer.navigationCube.width, 
			// 							renderer.domElement.clientHeight - viewer.navigationCube.width, 
			// 							viewer.navigationCube.width, viewer.navigationCube.width);
			// renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
			// renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight);

			viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});
		}

	}

	class EDLRenderer{
		constructor(viewer){
			this.viewer = viewer;

			this.edlMaterial = null;

			this.rtRegular;
			this.rtEDL;

			this.gl = viewer.renderer.getContext();

			this.shadowMap = new PointCloudSM(this.viewer.pRenderer);
		}

		initEDL(){
			if (this.edlMaterial != null) {
				return;
			}

			this.edlMaterial = new EyeDomeLightingMaterial();
			this.edlMaterial.depthTest = true;
			this.edlMaterial.depthWrite = true;
			this.edlMaterial.transparent = true;

			this.rtEDL = new THREE.WebGLRenderTarget(1024, 1024, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
				depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
			});

			this.rtRegular = new THREE.WebGLRenderTarget(1024, 1024, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
			});
		};

		resize(width, height){
			if(this.screenshot){
				width = this.screenshot.target.width;
				height = this.screenshot.target.height;
			}

			this.rtEDL.setSize(width , height);
			this.rtRegular.setSize(width , height);
		}

		makeScreenshot(camera, size, callback){

			if(camera === undefined || camera === null){
				camera = this.viewer.scene.getActiveCamera();
			}

			if(size === undefined || size === null){
				size = this.viewer.renderer.getSize(new THREE.Vector2());
			}

			let {width, height} = size;

			//let maxTextureSize = viewer.renderer.capabilities.maxTextureSize;
			//if(width * 4 < 
			width = 2 * width;
			height = 2 * height;

			let target = new THREE.WebGLRenderTarget(width, height, {
				format: THREE.RGBAFormat,
			});

			this.screenshot = {
				target: target
			};

			// HACK? removed because of error, was this important?
			//this.viewer.renderer.clearTarget(target, true, true, true);

			this.render();

			let pixelCount = width * height;
			let buffer = new Uint8Array(4 * pixelCount);

			this.viewer.renderer.readRenderTargetPixels(target, 0, 0, width, height, buffer);

			// flip vertically
			let bytesPerLine = width * 4;
			for(let i = 0; i < parseInt(height / 2); i++){
				let j = height - i - 1;

				let lineI = buffer.slice(i * bytesPerLine, i * bytesPerLine + bytesPerLine);
				let lineJ = buffer.slice(j * bytesPerLine, j * bytesPerLine + bytesPerLine);
				buffer.set(lineJ, i * bytesPerLine);
				buffer.set(lineI, j * bytesPerLine);
			}

			this.screenshot.target.dispose();
			delete this.screenshot;

			return {
				width: width,
				height: height,
				buffer: buffer
			};
		}

		clearTargets(){
			const viewer = this.viewer;
			const {renderer} = viewer;

			const oldTarget = renderer.getRenderTarget();

			renderer.setRenderTarget( this.rtEDL );
			renderer.clear( true, true, true );

			renderer.setRenderTarget( this.rtRegular );
			renderer.clear( true, true, false );

			renderer.setRenderTarget(oldTarget);
		}

		clear(){
			this.initEDL();
			const viewer = this.viewer;

			const {renderer, background} = viewer;

			if(background === "skybox"){
				renderer.setClearColor(0x000000, 0);
			} else if (background === 'gradient') {
				renderer.setClearColor(0x000000, 0);
			} else if (background === 'black') {
				renderer.setClearColor(0x000000, 1);
			} else if (background === 'white') {
				renderer.setClearColor(0xFFFFFF, 1);
			} else {
				renderer.setClearColor(0x000000, 0);
			}
			
			renderer.clear();

			this.clearTargets();
		}

		renderShadowMap(visiblePointClouds, camera, lights){

			const {viewer} = this;

			const doShadows = lights.length > 0 && !(lights[0].disableShadowUpdates);
			if(doShadows){
				let light = lights[0];

				this.shadowMap.setLight(light);

				let originalAttributes = new Map();
				for(let pointcloud of viewer.scene.pointclouds){
					// TODO IMPORTANT !!! check
					originalAttributes.set(pointcloud, pointcloud.material.activeAttributeName);
					pointcloud.material.disableEvents();
					pointcloud.material.activeAttributeName = "depth";
					//pointcloud.material.pointColorType = PointColorType.DEPTH;
				}

				this.shadowMap.render(viewer.scene.scenePointCloud, camera);

				for(let pointcloud of visiblePointClouds){
					let originalAttribute = originalAttributes.get(pointcloud);
					// TODO IMPORTANT !!! check
					pointcloud.material.activeAttributeName = originalAttribute;
					pointcloud.material.enableEvents();
				}

				viewer.shadowTestCam.updateMatrixWorld();
				viewer.shadowTestCam.matrixWorldInverse.getInverse(viewer.shadowTestCam.matrixWorld);
				viewer.shadowTestCam.updateProjectionMatrix();
			}

		}

		render(params){
			this.initEDL();

			const viewer = this.viewer;
			const camera = params.camera ? params.camera : viewer.scene.getActiveCamera();
			const {width, height} = this.viewer.renderer.getSize(new THREE.Vector2());

			viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});
			
			this.resize(width, height);

			const visiblePointClouds = viewer.scene.pointclouds.filter(pc => pc.visible);

			if(this.screenshot){
				let oldBudget = Potree.pointBudget;
				Potree.pointBudget = Math.max(10 * 1000 * 1000, 2 * oldBudget);
				let result = Potree.updatePointClouds(
					viewer.scene.pointclouds, 
					camera, 
					viewer.renderer);
				Potree.pointBudget = oldBudget;
			}

			let lights = [];
			viewer.scene.scene.traverse(node => {
				if(node instanceof THREE.SpotLight){
					lights.push(node);
				}
			});

			if(viewer.background === "skybox"){
				viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
				viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
				viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
				viewer.skybox.camera.updateProjectionMatrix();
				viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
			} else if (viewer.background === 'gradient') {
				viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
			} 

			//TODO adapt to multiple lights
			this.renderShadowMap(visiblePointClouds, camera, lights);

			{ // COLOR & DEPTH PASS
				for (let pointcloud of visiblePointClouds) {
					let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

					let material = pointcloud.material;
					material.weighted = false;
					material.useLogarithmicDepthBuffer = false;
					material.useEDL = true;

					material.screenWidth = width;
					material.screenHeight = height;
					material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
					material.uniforms.octreeSize.value = octreeSize;
					material.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
				}
				
				// TODO adapt to multiple lights
				viewer.renderer.setRenderTarget(this.rtEDL);
				
				if(lights.length > 0){
					viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtEDL, {
						clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
						shadowMaps: [this.shadowMap],
						transparent: false,
					});
				}else {
					viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtEDL, {
						clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
						transparent: false,
					});
				}

				
			}

			viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer, renderTarget: this.rtRegular});
			viewer.renderer.setRenderTarget(null);
			viewer.renderer.render(viewer.scene.scene, camera);

			{ // EDL PASS

				const uniforms = this.edlMaterial.uniforms;

				uniforms.screenWidth.value = width;
				uniforms.screenHeight.value = height;

				let proj = camera.projectionMatrix;
				let projArray = new Float32Array(16);
				projArray.set(proj.elements);

				uniforms.uNear.value = camera.near;
				uniforms.uFar.value = camera.far;
				uniforms.uEDLColor.value = this.rtEDL.texture;
				uniforms.uEDLDepth.value = this.rtEDL.depthTexture;
				uniforms.uProj.value = projArray;

				uniforms.edlStrength.value = viewer.edlStrength;
				uniforms.radius.value = viewer.edlRadius;
				uniforms.opacity.value = viewer.edlOpacity; // HACK
				
				Utils.screenPass.render(viewer.renderer, this.edlMaterial);

				if(this.screenshot){
					Utils.screenPass.render(viewer.renderer, this.edlMaterial, this.screenshot.target);
				}

			}

			viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer});

			viewer.renderer.clearDepth();

			viewer.transformationTool.update();

			viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

			viewer.renderer.render(viewer.controls.sceneControls, camera);
			viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
			viewer.renderer.render(viewer.transformationTool.scene, camera);
			
			viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});

		}
	}

	class HQSplatRenderer{
		
		constructor(viewer){
			this.viewer = viewer;

			this.depthMaterials = new Map();
			this.attributeMaterials = new Map();
			this.normalizationMaterial = null;

			this.rtDepth = null;
			this.rtAttribute = null;
			this.gl = viewer.renderer.getContext();

			this.initialized = false;
		}

		init(){
			if (this.initialized) {
				return;
			}

			this.normalizationMaterial = new NormalizationMaterial();
			this.normalizationMaterial.depthTest = true;
			this.normalizationMaterial.depthWrite = true;
			this.normalizationMaterial.transparent = true;

			this.normalizationEDLMaterial = new NormalizationEDLMaterial();
			this.normalizationEDLMaterial.depthTest = true;
			this.normalizationEDLMaterial.depthWrite = true;
			this.normalizationEDLMaterial.transparent = true;

			this.rtDepth = new THREE.WebGLRenderTarget(1024, 1024, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
				depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
			});

			this.rtAttribute = new THREE.WebGLRenderTarget(1024, 1024, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
				depthTexture: this.rtDepth.depthTexture,
			});

			this.initialized = true;
		};

		resize(width, height){
			this.rtDepth.setSize(width, height);
			this.rtAttribute.setSize(width, height);
		}

		clearTargets(){
			const viewer = this.viewer;
			const {renderer} = viewer;

			const oldTarget = renderer.getRenderTarget();

			renderer.setClearColor(0x000000, 0);

			renderer.setRenderTarget( this.rtDepth );
			renderer.clear( true, true, true );

			renderer.setRenderTarget( this.rtAttribute );
			renderer.clear( true, true, true );

			renderer.setRenderTarget(oldTarget);
		}


		clear(){
			this.init();

			const {renderer, background} = this.viewer;

			if(background === "skybox"){
				renderer.setClearColor(0x000000, 0);
			} else if (background === 'gradient') {
				renderer.setClearColor(0x000000, 0);
			} else if (background === 'black') {
				renderer.setClearColor(0x000000, 1);
			} else if (background === 'white') {
				renderer.setClearColor(0xFFFFFF, 1);
			} else {
				renderer.setClearColor(0x000000, 0);
			}

			renderer.clear();

			this.clearTargets();
		}

		render (params) {
			this.init();

			const viewer = this.viewer;
			const camera = params.camera ? params.camera : viewer.scene.getActiveCamera();
			const {width, height} = this.viewer.renderer.getSize(new THREE.Vector2());

			viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

			this.resize(width, height);

			const visiblePointClouds = viewer.scene.pointclouds.filter(pc => pc.visible);
			const originalMaterials = new Map();

			for(let pointcloud of visiblePointClouds){
				originalMaterials.set(pointcloud, pointcloud.material);

				if(!this.attributeMaterials.has(pointcloud)){
					let attributeMaterial = new PointCloudMaterial();
					this.attributeMaterials.set(pointcloud, attributeMaterial);
				}

				if(!this.depthMaterials.has(pointcloud)){
					let depthMaterial = new PointCloudMaterial();

					depthMaterial.setDefine("depth_pass", "#define hq_depth_pass");
					depthMaterial.setDefine("use_edl", "#define use_edl");

					this.depthMaterials.set(pointcloud, depthMaterial);
				}
			}

			{ // DEPTH PASS
				for (let pointcloud of visiblePointClouds) {
					let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

					let material = originalMaterials.get(pointcloud);
					let depthMaterial = this.depthMaterials.get(pointcloud);

					depthMaterial.size = material.size;
					depthMaterial.minSize = material.minSize;
					depthMaterial.maxSize = material.maxSize;

					depthMaterial.pointSizeType = material.pointSizeType;
					depthMaterial.visibleNodesTexture = material.visibleNodesTexture;
					depthMaterial.weighted = false;
					depthMaterial.screenWidth = width;
					depthMaterial.shape = PointShape.CIRCLE;
					depthMaterial.screenHeight = height;
					depthMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
					depthMaterial.uniforms.octreeSize.value = octreeSize;
					depthMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(...pointcloud.scale.toArray());
					depthMaterial.classification = material.classification;
					depthMaterial.uniforms.classificationLUT.value.image.data = material.uniforms.classificationLUT.value.image.data;
					depthMaterial.classificationTexture.needsUpdate = true;

					depthMaterial.uniforms.uFilterReturnNumberRange.value = material.uniforms.uFilterReturnNumberRange.value;
					depthMaterial.uniforms.uFilterNumberOfReturnsRange.value = material.uniforms.uFilterNumberOfReturnsRange.value;
					depthMaterial.uniforms.uFilterGPSTimeClipRange.value = material.uniforms.uFilterGPSTimeClipRange.value;
					depthMaterial.uniforms.uFilterPointSourceIDClipRange.value = material.uniforms.uFilterPointSourceIDClipRange.value;

					depthMaterial.clipTask = material.clipTask;
					depthMaterial.clipMethod = material.clipMethod;
					depthMaterial.setClipBoxes(material.clipBoxes);
					depthMaterial.setClipPolygons(material.clipPolygons);

					pointcloud.material = depthMaterial;
				}
				
				viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtDepth, {
					clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
				});
			}

			{ // ATTRIBUTE PASS
				for (let pointcloud of visiblePointClouds) {
					let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

					let material = originalMaterials.get(pointcloud);
					let attributeMaterial = this.attributeMaterials.get(pointcloud);

					attributeMaterial.size = material.size;
					attributeMaterial.minSize = material.minSize;
					attributeMaterial.maxSize = material.maxSize;

					attributeMaterial.pointSizeType = material.pointSizeType;
					attributeMaterial.activeAttributeName = material.activeAttributeName;
					attributeMaterial.visibleNodesTexture = material.visibleNodesTexture;
					attributeMaterial.weighted = true;
					attributeMaterial.screenWidth = width;
					attributeMaterial.screenHeight = height;
					attributeMaterial.shape = PointShape.CIRCLE;
					attributeMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
					attributeMaterial.uniforms.octreeSize.value = octreeSize;
					attributeMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(...pointcloud.scale.toArray());
					attributeMaterial.classification = material.classification;
					attributeMaterial.uniforms.classificationLUT.value.image.data = material.uniforms.classificationLUT.value.image.data;
					attributeMaterial.classificationTexture.needsUpdate = true;

					attributeMaterial.uniforms.uFilterReturnNumberRange.value = material.uniforms.uFilterReturnNumberRange.value;
					attributeMaterial.uniforms.uFilterNumberOfReturnsRange.value = material.uniforms.uFilterNumberOfReturnsRange.value;
					attributeMaterial.uniforms.uFilterGPSTimeClipRange.value = material.uniforms.uFilterGPSTimeClipRange.value;
					attributeMaterial.uniforms.uFilterPointSourceIDClipRange.value = material.uniforms.uFilterPointSourceIDClipRange.value;

					attributeMaterial.elevationGradientRepeat = material.elevationGradientRepeat;
					attributeMaterial.elevationRange = material.elevationRange;
					attributeMaterial.gradient = material.gradient;
					attributeMaterial.matcap = material.matcap;

					attributeMaterial.intensityRange = material.intensityRange;
					attributeMaterial.intensityGamma = material.intensityGamma;
					attributeMaterial.intensityContrast = material.intensityContrast;
					attributeMaterial.intensityBrightness = material.intensityBrightness;

					attributeMaterial.rgbGamma = material.rgbGamma;
					attributeMaterial.rgbContrast = material.rgbContrast;
					attributeMaterial.rgbBrightness = material.rgbBrightness;

					attributeMaterial.weightRGB = material.weightRGB;
					attributeMaterial.weightIntensity = material.weightIntensity;
					attributeMaterial.weightElevation = material.weightElevation;
					attributeMaterial.weightRGB = material.weightRGB;
					attributeMaterial.weightClassification = material.weightClassification;
					attributeMaterial.weightReturnNumber = material.weightReturnNumber;
					attributeMaterial.weightSourceID = material.weightSourceID;

					attributeMaterial.color = material.color;

					attributeMaterial.clipTask = material.clipTask;
					attributeMaterial.clipMethod = material.clipMethod;
					attributeMaterial.setClipBoxes(material.clipBoxes);
					attributeMaterial.setClipPolygons(material.clipPolygons);

					pointcloud.material = attributeMaterial;
				}
				
				let gl = this.gl;

				viewer.renderer.setRenderTarget(null);
				viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtAttribute, {
					clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
					//material: this.attributeMaterial,
					blendFunc: [gl.SRC_ALPHA, gl.ONE],
					//depthTest: false,
					depthWrite: false
				});
			}

			for(let [pointcloud, material] of originalMaterials){
				pointcloud.material = material;
			}

			viewer.renderer.setRenderTarget(null);
			if(viewer.background === "skybox"){
				viewer.renderer.setClearColor(0x000000, 0);
				viewer.renderer.clear();
				viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
				viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
				viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
				viewer.skybox.camera.updateProjectionMatrix();
				viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
			} else if (viewer.background === 'gradient') {
				viewer.renderer.setClearColor(0x000000, 0);
				viewer.renderer.clear();
				viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
			} else if (viewer.background === 'black') {
				viewer.renderer.setClearColor(0x000000, 1);
				viewer.renderer.clear();
			} else if (viewer.background === 'white') {
				viewer.renderer.setClearColor(0xFFFFFF, 1);
				viewer.renderer.clear();
			} else {
				viewer.renderer.setClearColor(0x000000, 0);
				viewer.renderer.clear();
			}

			{ // NORMALIZATION PASS
				let normalizationMaterial = this.useEDL ? this.normalizationEDLMaterial : this.normalizationMaterial;

				if(this.useEDL){
					normalizationMaterial.uniforms.edlStrength.value = viewer.edlStrength;
					normalizationMaterial.uniforms.radius.value = viewer.edlRadius;
					normalizationMaterial.uniforms.screenWidth.value = width;
					normalizationMaterial.uniforms.screenHeight.value = height;
					normalizationMaterial.uniforms.uEDLMap.value = this.rtDepth.texture;
				}

				normalizationMaterial.uniforms.uWeightMap.value = this.rtAttribute.texture;
				normalizationMaterial.uniforms.uDepthMap.value = this.rtAttribute.depthTexture;
				
				Utils.screenPass.render(viewer.renderer, normalizationMaterial);
			}

			viewer.renderer.render(viewer.scene.scene, camera);

			viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer});

			viewer.renderer.clearDepth();

			viewer.transformationTool.update();

			viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

			viewer.renderer.render(viewer.controls.sceneControls, camera);
			viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
			viewer.renderer.render(viewer.transformationTool.scene, camera);

			viewer.renderer.setViewport(width - viewer.navigationCube.width, 
										height - viewer.navigationCube.width, 
										viewer.navigationCube.width, viewer.navigationCube.width);
			viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
			viewer.renderer.setViewport(0, 0, width, height);
			
			viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});

		}

	}

	class View{
		constructor () {
			this.position = new THREE.Vector3(0, 0, 0);

			this.yaw = Math.PI / 4;
			this._pitch = -Math.PI / 4;
			this.radius = 1;

			this.maxPitch = Math.PI / 2;
			this.minPitch = -Math.PI / 2;
		}

		clone () {
			let c = new View();
			c.yaw = this.yaw;
			c._pitch = this.pitch;
			c.radius = this.radius;
			c.maxPitch = this.maxPitch;
			c.minPitch = this.minPitch;

			return c;
		}

		get pitch () {
			return this._pitch;
		}

		set pitch (angle) {
			this._pitch = Math.max(Math.min(angle, this.maxPitch), this.minPitch);
		}

		get direction () {
			let dir = new THREE.Vector3(0, 1, 0);

			dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
			dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

			return dir;
		}

		set direction (dir) {

			//if(dir.x === dir.y){
			if(dir.x === 0 && dir.y === 0){
				this.pitch = Math.PI / 2 * Math.sign(dir.z);
			}else {
				let yaw = Math.atan2(dir.y, dir.x) - Math.PI / 2;
				let pitch = Math.atan2(dir.z, Math.sqrt(dir.x * dir.x + dir.y * dir.y));

				this.yaw = yaw;
				this.pitch = pitch;
			}
			
		}

		lookAt(t){
			let V;
			if(arguments.length === 1){
				V = new THREE.Vector3().subVectors(t, this.position);
			}else if(arguments.length === 3){
				V = new THREE.Vector3().subVectors(new THREE.Vector3(...arguments), this.position);
			}

			let radius = V.length();
			let dir = V.normalize();

			this.radius = radius;
			this.direction = dir;
		}

		getPivot () {
			return new THREE.Vector3().addVectors(this.position, this.direction.multiplyScalar(this.radius));
		}

		getSide () {
			let side = new THREE.Vector3(1, 0, 0);
			side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

			return side;
		}

		pan (x, y) {
			let dir = new THREE.Vector3(0, 1, 0);
			dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
			dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

			// let side = new THREE.Vector3(1, 0, 0);
			// side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

			let side = this.getSide();

			let up = side.clone().cross(dir);

			let pan = side.multiplyScalar(x).add(up.multiplyScalar(y));

			this.position = this.position.add(pan);
			// this.target = this.target.add(pan);
		}

		translate (x, y, z) {
			let dir = new THREE.Vector3(0, 1, 0);
			dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
			dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

			let side = new THREE.Vector3(1, 0, 0);
			side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

			let up = side.clone().cross(dir);

			let t = side.multiplyScalar(x)
				.add(dir.multiplyScalar(y))
				.add(up.multiplyScalar(z));

			this.position = this.position.add(t);
		}

		translateWorld (x, y, z) {
			this.position.x += x;
			this.position.y += y;
			this.position.z += z;
		}

		setView(position, target, duration = 0, callback = null){

			let endPosition = null;
			if(position instanceof Array){
				endPosition = new THREE.Vector3(...position);
			}else if(position instanceof THREE.Vector3){
				endPosition = position.clone();
			}

			let endTarget = null;
			if(target instanceof Array){
				endTarget = new THREE.Vector3(...target);
			}else if(target instanceof THREE.Vector3){
				endTarget = target.clone();
			}
			
			const startPosition = this.position.clone();
			const startTarget = this.getPivot();

			//const endPosition = position.clone();
			//const endTarget = target.clone();

			let easing = TWEEN.Easing.Quartic.Out;

			if(duration === 0){
				this.position.copy(endPosition);
				this.lookAt(endTarget);
			}else {
				let value = {x: 0};
				let tween = new TWEEN.Tween(value).to({x: 1}, duration);
				tween.easing(easing);
				//this.tweens.push(tween);

				tween.onUpdate(() => {
					let t = value.x;

					//console.log(t);

					const pos = new THREE.Vector3(
						(1 - t) * startPosition.x + t * endPosition.x,
						(1 - t) * startPosition.y + t * endPosition.y,
						(1 - t) * startPosition.z + t * endPosition.z,
					);

					const target = new THREE.Vector3(
						(1 - t) * startTarget.x + t * endTarget.x,
						(1 - t) * startTarget.y + t * endTarget.y,
						(1 - t) * startTarget.z + t * endTarget.z,
					);

					this.position.copy(pos);
					this.lookAt(target);

				});

				tween.start();

				tween.onComplete(() => {
					if(callback){
						callback();
					}
				});
			}

		}

	};

	class Scene extends EventDispatcher{

		constructor(){
			super();

			this.annotations = new Annotation();
			
			this.scene = new THREE.Scene();
			this.sceneBG = new THREE.Scene();
			this.scenePointCloud = new THREE.Scene();

			this.cameraP = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000*1000);
			this.cameraO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000*1000);
			this.cameraVR = new THREE.PerspectiveCamera();
			this.cameraBG = new THREE.Camera();
			this.cameraScreenSpace = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
			this.cameraMode = CameraMode.PERSPECTIVE;
			this.overrideCamera = null;
			this.pointclouds = [];

			this.measurements = [];
			this.profiles = [];
			this.volumes = [];
			this.polygonClipVolumes = [];
			this.cameraAnimations = [];
			this.orientedImages = [];
			this.images360 = [];
			this.geopackages = [];
			
			this.fpControls = null;
			this.orbitControls = null;
			this.earthControls = null;
			this.geoControls = null;
			this.deviceControls = null;
			this.inputHandler = null;

			this.view = new View();

			this.directionalLight = null;

			this.initialize();
		}

		estimateHeightAt (position) {
			let height = null;
			let fromSpacing = Infinity;

			for (let pointcloud of this.pointclouds) {
				if (pointcloud.root.geometryNode === undefined) {
					continue;
				}

				let pHeight = null;
				let pFromSpacing = Infinity;

				let lpos = position.clone().sub(pointcloud.position);
				lpos.z = 0;
				let ray = new THREE.Ray(lpos, new THREE.Vector3(0, 0, 1));

				let stack = [pointcloud.root];
				while (stack.length > 0) {
					let node = stack.pop();
					let box = node.getBoundingBox();

					let inside = ray.intersectBox(box);

					if (!inside) {
						continue;
					}

					let h = node.geometryNode.mean.z +
						pointcloud.position.z +
						node.geometryNode.boundingBox.min.z;

					if (node.geometryNode.spacing <= pFromSpacing) {
						pHeight = h;
						pFromSpacing = node.geometryNode.spacing;
					}

					for (let index of Object.keys(node.children)) {
						let child = node.children[index];
						if (child.geometryNode) {
							stack.push(node.children[index]);
						}
					}
				}

				if (height === null || pFromSpacing < fromSpacing) {
					height = pHeight;
					fromSpacing = pFromSpacing;
				}
			}

			return height;
		}
		
		getBoundingBox(pointclouds = this.pointclouds){
			let box = new THREE.Box3();

			this.scenePointCloud.updateMatrixWorld(true);
			this.referenceFrame.updateMatrixWorld(true);

			for (let pointcloud of pointclouds) {
				pointcloud.updateMatrixWorld(true);

				let pointcloudBox = pointcloud.pcoGeometry.tightBoundingBox ? pointcloud.pcoGeometry.tightBoundingBox : pointcloud.boundingBox;
				let boxWorld = Utils.computeTransformedBoundingBox(pointcloudBox, pointcloud.matrixWorld);
				box.union(boxWorld);
			}

			return box;
		}

		addPointCloud (pointcloud) {
			this.pointclouds.push(pointcloud);
			this.scenePointCloud.add(pointcloud);

			this.dispatchEvent({
				type: 'pointcloud_added',
				pointcloud: pointcloud
			});
		}

		addVolume (volume) {
			this.volumes.push(volume);
			this.dispatchEvent({
				'type': 'volume_added',
				'scene': this,
				'volume': volume
			});
		}

		addOrientedImages(images){
			this.orientedImages.push(images);
			this.scene.add(images.node);

			this.dispatchEvent({
				'type': 'oriented_images_added',
				'scene': this,
				'images': images
			});
		};

		removeOrientedImages(images){
			let index = this.orientedImages.indexOf(images);
			if (index > -1) {
				this.orientedImages.splice(index, 1);

				this.dispatchEvent({
					'type': 'oriented_images_removed',
					'scene': this,
					'images': images
				});
			}
		};

		add360Images(images){
			this.images360.push(images);
			this.scene.add(images.node);

			this.dispatchEvent({
				'type': '360_images_added',
				'scene': this,
				'images': images
			});
		}

		remove360Images(images){
			let index = this.images360.indexOf(images);
			if (index > -1) {
				this.images360.splice(index, 1);

				this.dispatchEvent({
					'type': '360_images_removed',
					'scene': this,
					'images': images
				});
			}
		}

		addGeopackage(geopackage){
			this.geopackages.push(geopackage);
			this.scene.add(geopackage.node);

			this.dispatchEvent({
				'type': 'geopackage_added',
				'scene': this,
				'geopackage': geopackage
			});
		};

		removeGeopackage(geopackage){
			let index = this.geopackages.indexOf(geopackage);
			if (index > -1) {
				this.geopackages.splice(index, 1);

				this.dispatchEvent({
					'type': 'geopackage_removed',
					'scene': this,
					'geopackage': geopackage
				});
			}
		};

		removeVolume (volume) {
			let index = this.volumes.indexOf(volume);
			if (index > -1) {
				this.volumes.splice(index, 1);

				this.dispatchEvent({
					'type': 'volume_removed',
					'scene': this,
					'volume': volume
				});
			}
		};

		addCameraAnimation(animation) {
			this.cameraAnimations.push(animation);
			this.dispatchEvent({
				'type': 'camera_animation_added',
				'scene': this,
				'animation': animation
			});
		};

		removeCameraAnimation(animation){
			let index = this.cameraAnimations.indexOf(volume);
			if (index > -1) {
				this.cameraAnimations.splice(index, 1);

				this.dispatchEvent({
					'type': 'camera_animation_removed',
					'scene': this,
					'animation': animation
				});
			}
		};

		addPolygonClipVolume(volume){
			this.polygonClipVolumes.push(volume);
			this.dispatchEvent({
				"type": "polygon_clip_volume_added",
				"scene": this,
				"volume": volume
			});
		};
		
		removePolygonClipVolume(volume){
			let index = this.polygonClipVolumes.indexOf(volume);
			if (index > -1) {
				this.polygonClipVolumes.splice(index, 1);
				this.dispatchEvent({
					"type": "polygon_clip_volume_removed",
					"scene": this,
					"volume": volume
				});
			}
		};
		
		addMeasurement(measurement){
			measurement.lengthUnit = this.lengthUnit;
			measurement.lengthUnitDisplay = this.lengthUnitDisplay;
			this.measurements.push(measurement);
			this.dispatchEvent({
				'type': 'measurement_added',
				'scene': this,
				'measurement': measurement
			});
		};

		removeMeasurement (measurement) {
			let index = this.measurements.indexOf(measurement);
			if (index > -1) {
				this.measurements.splice(index, 1);
				this.dispatchEvent({
					'type': 'measurement_removed',
					'scene': this,
					'measurement': measurement
				});
			}
		}

		addProfile (profile) {
			this.profiles.push(profile);
			this.dispatchEvent({
				'type': 'profile_added',
				'scene': this,
				'profile': profile
			});
		}

		removeProfile (profile) {
			let index = this.profiles.indexOf(profile);
			if (index > -1) {
				this.profiles.splice(index, 1);
				this.dispatchEvent({
					'type': 'profile_removed',
					'scene': this,
					'profile': profile
				});
			}
		}

		removeAllMeasurements () {
			while (this.measurements.length > 0) {
				this.removeMeasurement(this.measurements[0]);
			}

			while (this.profiles.length > 0) {
				this.removeProfile(this.profiles[0]);
			}

			while (this.volumes.length > 0) {
				this.removeVolume(this.volumes[0]);
			}
		}

		removeAllClipVolumes(){
			let clipVolumes = this.volumes.filter(volume => volume.clip === true);
			for(let clipVolume of clipVolumes){
				this.removeVolume(clipVolume);
			}

			while(this.polygonClipVolumes.length > 0){
				this.removePolygonClipVolume(this.polygonClipVolumes[0]);
			}
		}

		getActiveCamera() {

			if(this.overrideCamera){
				return this.overrideCamera;
			}

			if(this.cameraMode === CameraMode.PERSPECTIVE){
				return this.cameraP;
			}else if(this.cameraMode === CameraMode.ORTHOGRAPHIC){
				return this.cameraO;
			}else if(this.cameraMode === CameraMode.VR){
				return this.cameraVR;
			}

			return null;
		}
		
		initialize(){
			
			this.referenceFrame = new THREE.Object3D();
			this.referenceFrame.matrixAutoUpdate = false;
			this.scenePointCloud.add(this.referenceFrame);

			this.cameraP.up.set(0, 0, 1);
			this.cameraP.position.set(1000, 1000, 1000);
			this.cameraO.up.set(0, 0, 1);
			this.cameraO.position.set(1000, 1000, 1000);
			//this.camera.rotation.y = -Math.PI / 4;
			//this.camera.rotation.x = -Math.PI / 6;
			this.cameraScreenSpace.lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
			
			this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
			this.directionalLight.position.set( 10, 10, 10 );
			this.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
			this.scenePointCloud.add( this.directionalLight );
			
			let light = new THREE.AmbientLight( 0x555555 ); // soft white light
			this.scenePointCloud.add( light );

			{ // background
				let texture = Utils.createBackgroundTexture(512, 512);

				texture.minFilter = texture.magFilter = THREE.NearestFilter;
				texture.minFilter = texture.magFilter = THREE.LinearFilter;
				let bg = new THREE.Mesh(
					new THREE.PlaneBufferGeometry(2, 2, 0),
					new THREE.MeshBasicMaterial({
						map: texture
					})
				);
				bg.material.depthTest = false;
				bg.material.depthWrite = false;
				this.sceneBG.add(bg);
			}

			// { // lights
			// 	{
			// 		let light = new THREE.DirectionalLight(0xffffff);
			// 		light.position.set(10, 10, 1);
			// 		light.target.position.set(0, 0, 0);
			// 		this.scene.add(light);
			// 	}

			// 	{
			// 		let light = new THREE.DirectionalLight(0xffffff);
			// 		light.position.set(-10, 10, 1);
			// 		light.target.position.set(0, 0, 0);
			// 		this.scene.add(light);
			// 	}

			// 	{
			// 		let light = new THREE.DirectionalLight(0xffffff);
			// 		light.position.set(0, -10, 20);
			// 		light.target.position.set(0, 0, 0);
			// 		this.scene.add(light);
			// 	}
			// }
		}
		
		addAnnotation(position, args = {}){		
			if(position instanceof Array){
				args.position = new THREE.Vector3().fromArray(position);
			} else if (position instanceof THREE.Vector3) {
				args.position = position;
			}
			let annotation = new Annotation(args);
			this.annotations.add(annotation);

			return annotation;
		}

		getAnnotations () {
			return this.annotations;
		};

		removeAnnotation(annotationToRemove) {
			this.annotations.remove(annotationToRemove);
		}
	};

	// http://epsg.io/
	proj4.defs([
		['UTM10N', '+proj=utm +zone=10 +ellps=GRS80 +datum=NAD83 +units=m +no_defs'],
		['EPSG:6339', '+proj=utm +zone=10 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:6340', '+proj=utm +zone=11 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:6341', '+proj=utm +zone=12 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:6342', '+proj=utm +zone=13 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:6343', '+proj=utm +zone=14 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:6344', '+proj=utm +zone=15 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:6345', '+proj=utm +zone=16 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:6346', '+proj=utm +zone=17 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:6347', '+proj=utm +zone=18 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:6348', '+proj=utm +zone=19 +ellps=GRS80 +units=m +no_defs'],
		['EPSG:26910', '+proj=utm +zone=10 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
		['EPSG:26911', '+proj=utm +zone=11 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
		['EPSG:26912', '+proj=utm +zone=12 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
		['EPSG:26913', '+proj=utm +zone=13 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
		['EPSG:26914', '+proj=utm +zone=14 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
		['EPSG:26915', '+proj=utm +zone=15 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
		['EPSG:26916', '+proj=utm +zone=16 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
		['EPSG:26917', '+proj=utm +zone=17 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
		['EPSG:26918', '+proj=utm +zone=18 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
		['EPSG:26919', '+proj=utm +zone=19 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs '],
	]);

	class MapView{

		constructor (viewer) {
			this.viewer = viewer;

			this.webMapService = 'WMTS';
			this.mapProjectionName = 'EPSG:3857';
			this.mapProjection = proj4.defs(this.mapProjectionName);
			this.sceneProjection = null;

			this.extentsLayer = null;
			this.cameraLayer = null;
			this.toolLayer = null;
			this.sourcesLayer = null;
			this.sourcesLabelLayer = null;
			this.images360Layer = null;
			this.enabled = false;

			this.createAnnotationStyle = (text) => {
				return [
					new ol.style.Style({
						image: new ol.style.Circle({
							radius: 10,
							stroke: new ol.style.Stroke({
								color: [255, 255, 255, 0.5],
								width: 2
							}),
							fill: new ol.style.Fill({
								color: [0, 0, 0, 0.5]
							})
						})
					})
				];
			};

			this.createLabelStyle = (text) => {
				let style = new ol.style.Style({
					image: new ol.style.Circle({
						radius: 6,
						stroke: new ol.style.Stroke({
							color: 'white',
							width: 2
						}),
						fill: new ol.style.Fill({
							color: 'green'
						})
					}),
					text: new ol.style.Text({
						font: '12px helvetica,sans-serif',
						text: text,
						fill: new ol.style.Fill({
							color: '#000'
						}),
						stroke: new ol.style.Stroke({
							color: '#fff',
							width: 2
						})
					})
				});

				return style;
			};
		}

		showSources (show) {
			this.sourcesLayer.setVisible(show);
			this.sourcesLabelLayer.setVisible(show);
		}

		init () {

			if(typeof ol === "undefined"){
				return;
			}

			this.elMap = $('#potree_map');
			this.elMap.draggable({ handle: $('#potree_map_header') });
			this.elMap.resizable();

			this.elTooltip = $(`<div style="position: relative; z-index: 100"></div>`);
			this.elMap.append(this.elTooltip);

			let extentsLayer = this.getExtentsLayer();
			let cameraLayer = this.getCameraLayer();
			this.getToolLayer();
			let sourcesLayer = this.getSourcesLayer();
			this.images360Layer = this.getImages360Layer();
			this.getSourcesLabelLayer();
			this.getAnnotationsLayer();

			let mousePositionControl = new ol.control.MousePosition({
				coordinateFormat: ol.coordinate.createStringXY(5),
				projection: 'EPSG:4326',
				undefinedHTML: '&nbsp;'
			});

			let _this = this;
			let DownloadSelectionControl = function (optOptions) {
				let options = optOptions || {};

				// TOGGLE TILES
				let btToggleTiles = document.createElement('button');
				btToggleTiles.innerHTML = 'T';
				btToggleTiles.addEventListener('click', () => {
					let visible = sourcesLayer.getVisible();
					_this.showSources(!visible);
				}, false);
				btToggleTiles.style.float = 'left';
				btToggleTiles.title = 'show / hide tiles';

				// DOWNLOAD SELECTED TILES
				let link = document.createElement('a');
				link.href = '#';
				link.download = 'list.txt';
				link.style.float = 'left';

				let button = document.createElement('button');
				button.innerHTML = 'D';
				link.appendChild(button);

				let handleDownload = (e) => {
					let features = selectedFeatures.getArray();

					let url = [document.location.protocol, '//', document.location.host, document.location.pathname].join('');

					if (features.length === 0) {
						alert('No tiles were selected. Select area with ctrl + left mouse button!');
						e.preventDefault();
						e.stopImmediatePropagation();
						return false;
					} else if (features.length === 1) {
						let feature = features[0];

						if (feature.source) {
							let cloudjsurl = feature.pointcloud.pcoGeometry.url;
							let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
							link.href = sourceurl.href;
							link.download = feature.source.name;
						}
					} else {
						let content = '';
						for (let i = 0; i < features.length; i++) {
							let feature = features[i];

							if (feature.source) {
								let cloudjsurl = feature.pointcloud.pcoGeometry.url;
								let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
								content += sourceurl.href + '\n';
							}
						}

						let uri = 'data:application/octet-stream;base64,' + btoa(content);
						link.href = uri;
						link.download = 'list_of_files.txt';
					}
				};

				button.addEventListener('click', handleDownload, false);

				// assemble container
				let element = document.createElement('div');
				element.className = 'ol-unselectable ol-control';
				element.appendChild(link);
				element.appendChild(btToggleTiles);
				element.style.bottom = '0.5em';
				element.style.left = '0.5em';
				element.title = 'Download file or list of selected tiles. Select tile with left mouse button or area using ctrl + left mouse.';

				ol.control.Control.call(this, {
					element: element,
					target: options.target
				});
			};
			ol.inherits(DownloadSelectionControl, ol.control.Control);

			this.map = new ol.Map({
				controls: ol.control.defaults({
					attributionOptions: ({
						collapsible: false
					})
				}).extend([
					// this.controls.zoomToExtent,
					new DownloadSelectionControl(),
					mousePositionControl
				]),
				layers: [
					new ol.layer.Tile({source: new ol.source.OSM()}),
					this.toolLayer,
					this.annotationsLayer,
					this.sourcesLayer,
					this.sourcesLabelLayer,
					this.images360Layer,
					extentsLayer,
					cameraLayer
				],
				target: 'potree_map_content',
				view: new ol.View({
					center: this.olCenter,
					zoom: 9
				})
			});

			// DRAGBOX / SELECTION
			this.dragBoxLayer = new ol.layer.Vector({
				source: new ol.source.Vector({}),
				style: new ol.style.Style({
					stroke: new ol.style.Stroke({
						color: 'rgba(0, 0, 255, 1)',
						width: 2
					})
				})
			});
			this.map.addLayer(this.dragBoxLayer);

			let select = new ol.interaction.Select();
			this.map.addInteraction(select);

			let selectedFeatures = select.getFeatures();

			let dragBox = new ol.interaction.DragBox({
				condition: ol.events.condition.platformModifierKeyOnly
			});

			this.map.addInteraction(dragBox);

			// this.map.on('pointermove', evt => {
			// 	let pixel = evt.pixel;
			// 	let feature = this.map.forEachFeatureAtPixel(pixel, function (feature) {
			// 		return feature;
			// 	});

			// 	// console.log(feature);
			// 	// this.elTooltip.css("display", feature ? '' : 'none');
			// 	this.elTooltip.css('display', 'none');
			// 	if (feature && feature.onHover) {
			// 		feature.onHover(evt);
			// 		// overlay.setPosition(evt.coordinate);
			// 		// tooltip.innerHTML = feature.get('name');
			// 	}
			// });

			this.map.on('click', evt => {
				let pixel = evt.pixel;
				let feature = this.map.forEachFeatureAtPixel(pixel, function (feature) {
					return feature;
				});

				if (feature && feature.onClick) {
					feature.onClick(evt);
				}
			});

			dragBox.on('boxend', (e) => {
				// features that intersect the box are added to the collection of
				// selected features, and their names are displayed in the "info"
				// div
				let extent = dragBox.getGeometry().getExtent();
				this.getSourcesLayer().getSource().forEachFeatureIntersectingExtent(extent, (feature) => {
					selectedFeatures.push(feature);
				});
			});

			// clear selection when drawing a new box and when clicking on the map
			dragBox.on('boxstart', (e) => {
				selectedFeatures.clear();
			});
			this.map.on('click', () => {
				selectedFeatures.clear();
			});

			this.viewer.addEventListener('scene_changed', e => {
				this.setScene(e.scene);
			});

			this.onPointcloudAdded = e => {
				this.load(e.pointcloud);
			};

			this.on360ImagesAdded = e => {
				this.addImages360(e.images);
			};

			this.onAnnotationAdded = e => {
				if (!this.sceneProjection) {
					return;
				}

				let annotation = e.annotation;
				let position = annotation.position;
				let mapPos = this.toMap.forward([position.x, position.y]);
				let feature = new ol.Feature({
					geometry: new ol.geom.Point(mapPos),
					name: annotation.title
				});
				feature.setStyle(this.createAnnotationStyle(annotation.title));

				feature.onHover = evt => {
					let coordinates = feature.getGeometry().getCoordinates();
					let p = this.map.getPixelFromCoordinate(coordinates);

					this.elTooltip.html(annotation.title);
					this.elTooltip.css('display', '');
					this.elTooltip.css('left', `${p[0]}px`);
					this.elTooltip.css('top', `${p[1]}px`);
				};

				feature.onClick = evt => {
					annotation.clickTitle();
				};

				this.getAnnotationsLayer().getSource().addFeature(feature);
			};

			this.setScene(this.viewer.scene);
		}

		setScene (scene) {
			if (this.scene === scene) {
				return;
			};

			if (this.scene) {
				this.scene.removeEventListener('pointcloud_added', this.onPointcloudAdded);
				this.scene.removeEventListener('360_images_added', this.on360ImagesAdded);
				this.scene.annotations.removeEventListener('annotation_added', this.onAnnotationAdded);
			}

			this.scene = scene;

			this.scene.addEventListener('pointcloud_added', this.onPointcloudAdded);
			this.scene.addEventListener('360_images_added', this.on360ImagesAdded);
			this.scene.annotations.addEventListener('annotation_added', this.onAnnotationAdded);

			for (let pointcloud of this.viewer.scene.pointclouds) {
				this.load(pointcloud);
			}

			this.viewer.scene.annotations.traverseDescendants(annotation => {
				this.onAnnotationAdded({annotation: annotation});
			});

			for(let images of this.viewer.scene.images360){
				this.on360ImagesAdded({images: images});
			}
		}

		getExtentsLayer () {
			if (this.extentsLayer) {
				return this.extentsLayer;
			}

			this.gExtent = new ol.geom.LineString([[0, 0], [0, 0]]);

			let feature = new ol.Feature(this.gExtent);
			let featureVector = new ol.source.Vector({
				features: [feature]
			});

			this.extentsLayer = new ol.layer.Vector({
				source: featureVector,
				style: new ol.style.Style({
					fill: new ol.style.Fill({
						color: 'rgba(255, 255, 255, 0.2)'
					}),
					stroke: new ol.style.Stroke({
						color: '#0000ff',
						width: 2
					}),
					image: new ol.style.Circle({
						radius: 3,
						fill: new ol.style.Fill({
							color: '#0000ff'
						})
					})
				})
			});

			return this.extentsLayer;
		}

		getAnnotationsLayer () {
			if (this.annotationsLayer) {
				return this.annotationsLayer;
			}

			this.annotationsLayer = new ol.layer.Vector({
				source: new ol.source.Vector({
				}),
				style: new ol.style.Style({
					fill: new ol.style.Fill({
						color: 'rgba(255, 0, 0, 1)'
					}),
					stroke: new ol.style.Stroke({
						color: 'rgba(255, 0, 0, 1)',
						width: 2
					})
				})
			});

			return this.annotationsLayer;
		}

		getCameraLayer () {
			if (this.cameraLayer) {
				return this.cameraLayer;
			}

			// CAMERA LAYER
			this.gCamera = new ol.geom.LineString([[0, 0], [0, 0], [0, 0], [0, 0]]);
			let feature = new ol.Feature(this.gCamera);
			let featureVector = new ol.source.Vector({
				features: [feature]
			});

			this.cameraLayer = new ol.layer.Vector({
				source: featureVector,
				style: new ol.style.Style({
					stroke: new ol.style.Stroke({
						color: '#0000ff',
						width: 2
					})
				})
			});

			return this.cameraLayer;
		}

		getToolLayer () {
			if (this.toolLayer) {
				return this.toolLayer;
			}

			this.toolLayer = new ol.layer.Vector({
				source: new ol.source.Vector({
				}),
				style: new ol.style.Style({
					fill: new ol.style.Fill({
						color: 'rgba(255, 0, 0, 1)'
					}),
					stroke: new ol.style.Stroke({
						color: 'rgba(255, 0, 0, 1)',
						width: 2
					})
				})
			});

			return this.toolLayer;
		}

		getImages360Layer(){
			if(this.images360Layer){
				return this.images360Layer;
			}

			let style = new ol.style.Style({
				image: new ol.style.Circle({
					radius: 4,
					stroke: new ol.style.Stroke({
						color: [255, 0, 0, 1],
						width: 2
					}),
					fill: new ol.style.Fill({
						color: [255, 100, 100, 1]
					})
				})
			});
			
			let layer = new ol.layer.Vector({
				source: new ol.source.Vector({}),
				style: style,
			});

			this.images360Layer = layer;

			return this.images360Layer;
		}

		getSourcesLayer () {
			if (this.sourcesLayer) {
				return this.sourcesLayer;
			}

			this.sourcesLayer = new ol.layer.Vector({
				source: new ol.source.Vector({}),
				style: new ol.style.Style({
					fill: new ol.style.Fill({
						color: 'rgba(0, 0, 150, 0.1)'
					}),
					stroke: new ol.style.Stroke({
						color: 'rgba(0, 0, 150, 1)',
						width: 1
					})
				})
			});

			return this.sourcesLayer;
		}

		getSourcesLabelLayer () {
			if (this.sourcesLabelLayer) {
				return this.sourcesLabelLayer;
			}

			this.sourcesLabelLayer = new ol.layer.Vector({
				source: new ol.source.Vector({
				}),
				style: new ol.style.Style({
					fill: new ol.style.Fill({
						color: 'rgba(255, 0, 0, 0.1)'
					}),
					stroke: new ol.style.Stroke({
						color: 'rgba(255, 0, 0, 1)',
						width: 2
					})
				}),
				minResolution: 0.01,
				maxResolution: 20
			});

			return this.sourcesLabelLayer;
		}

		setSceneProjection (sceneProjection) {
			this.sceneProjection = sceneProjection;
			this.toMap = proj4(this.sceneProjection, this.mapProjection);
			this.toScene = proj4(this.mapProjection, this.sceneProjection);
		};

		getMapExtent () {
			let bb = this.viewer.getBoundingBox();

			let bottomLeft = this.toMap.forward([bb.min.x, bb.min.y]);
			let bottomRight = this.toMap.forward([bb.max.x, bb.min.y]);
			let topRight = this.toMap.forward([bb.max.x, bb.max.y]);
			let topLeft = this.toMap.forward([bb.min.x, bb.max.y]);

			let extent = {
				bottomLeft: bottomLeft,
				bottomRight: bottomRight,
				topRight: topRight,
				topLeft: topLeft
			};

			return extent;
		};

		getMapCenter () {
			let mapExtent = this.getMapExtent();

			let mapCenter = [
				(mapExtent.bottomLeft[0] + mapExtent.topRight[0]) / 2,
				(mapExtent.bottomLeft[1] + mapExtent.topRight[1]) / 2
			];

			return mapCenter;
		};

		updateToolDrawings () {
			this.toolLayer.getSource().clear();

			let profiles = this.viewer.profileTool.profiles;
			for (let i = 0; i < profiles.length; i++) {
				let profile = profiles[i];
				let coordinates = [];

				for (let j = 0; j < profile.points.length; j++) {
					let point = profile.points[j];
					let pointMap = this.toMap.forward([point.x, point.y]);
					coordinates.push(pointMap);
				}

				let line = new ol.geom.LineString(coordinates);
				let feature = new ol.Feature(line);
				this.toolLayer.getSource().addFeature(feature);
			}

			let measurements = this.viewer.measuringTool.measurements;
			for (let i = 0; i < measurements.length; i++) {
				let measurement = measurements[i];
				let coordinates = [];

				for (let j = 0; j < measurement.points.length; j++) {
					let point = measurement.points[j].position;
					let pointMap = this.toMap.forward([point.x, point.y]);
					coordinates.push(pointMap);
				}

				if (measurement.closed && measurement.points.length > 0) {
					coordinates.push(coordinates[0]);
				}

				let line = new ol.geom.LineString(coordinates);
				let feature = new ol.Feature(line);
				this.toolLayer.getSource().addFeature(feature);
			}
		}

		addImages360(images){
			let transform = this.toMap.forward;
			let layer = this.getImages360Layer();

			for(let image of images.images){

				let p = transform([image.position[0], image.position[1]]);

				let feature = new ol.Feature({
					'geometry': new ol.geom.Point(p),
				});

				feature.onClick = () => {
					images.focus(image);
				};

				layer.getSource().addFeature(feature);
			}
		}

		async load (pointcloud) {
			if (!pointcloud) {
				return;
			}

			if (!pointcloud.projection) {
				return;
			}

			if (!this.sceneProjection) {
				try {
					this.setSceneProjection(pointcloud.projection);
				}catch (e) {
					console.log('Failed projection:', e);

					if (pointcloud.fallbackProjection) {
						try {
							console.log('Trying fallback projection...');
							this.setSceneProjection(pointcloud.fallbackProjection);
							console.log('Set projection from fallback');
						}catch (e) {
							console.log('Failed fallback projection:', e);
							return;
						}
					}else {
						return;
					};
				}
			}

			let mapExtent = this.getMapExtent();
			let mapCenter = this.getMapCenter();

			let view = this.map.getView();
			view.setCenter(mapCenter);

			this.gExtent.setCoordinates([
				mapExtent.bottomLeft,
				mapExtent.bottomRight,
				mapExtent.topRight,
				mapExtent.topLeft,
				mapExtent.bottomLeft
			]);

			view.fit(this.gExtent, [300, 300], {
				constrainResolution: false
			});

			if (pointcloud.pcoGeometry.type == 'ept'){ 
				return;
			}

			let url = `${pointcloud.pcoGeometry.url}/../sources.json`;
			//let response = await fetch(url);

			fetch(url).then(async (response) => {
				let data = await response.json();
			
				let sources = data.sources;

				for (let i = 0; i < sources.length; i++) {
					let source = sources[i];
					let name = source.name;
					let bounds = source.bounds;

					let mapBounds = {
						min: this.toMap.forward([bounds.min[0], bounds.min[1]]),
						max: this.toMap.forward([bounds.max[0], bounds.max[1]])
					};
					let mapCenter = [
						(mapBounds.min[0] + mapBounds.max[0]) / 2,
						(mapBounds.min[1] + mapBounds.max[1]) / 2
					];

					let p1 = this.toMap.forward([bounds.min[0], bounds.min[1]]);
					let p2 = this.toMap.forward([bounds.max[0], bounds.min[1]]);
					let p3 = this.toMap.forward([bounds.max[0], bounds.max[1]]);
					let p4 = this.toMap.forward([bounds.min[0], bounds.max[1]]);

					// let feature = new ol.Feature({
					//	'geometry': new ol.geom.LineString([p1, p2, p3, p4, p1])
					// });
					let feature = new ol.Feature({
						'geometry': new ol.geom.Polygon([[p1, p2, p3, p4, p1]])
					});
					feature.source = source;
					feature.pointcloud = pointcloud;
					this.getSourcesLayer().getSource().addFeature(feature);

					feature = new ol.Feature({
						geometry: new ol.geom.Point(mapCenter),
						name: name
					});
					feature.setStyle(this.createLabelStyle(name));
					this.sourcesLabelLayer.getSource().addFeature(feature);
				}
			}).catch(() => {
				
			});

		}

		toggle () {
			if (this.elMap.is(':visible')) {
				this.elMap.css('display', 'none');
				this.enabled = false;
			} else {
				this.elMap.css('display', 'block');
				this.enabled = true;
			}
		}

		update (delta) {
			if (!this.sceneProjection) {
				return;
			}

			let pm = $('#potree_map');

			if (!this.enabled) {
				return;
			}

			// resize
			let mapSize = this.map.getSize();
			let resized = (pm.width() !== mapSize[0] || pm.height() !== mapSize[1]);
			if (resized) {
				this.map.updateSize();
			}

			//
			let camera = this.viewer.scene.getActiveCamera();

			let scale = this.map.getView().getResolution();
			let campos = camera.position;
			let camdir = camera.getWorldDirection(new THREE.Vector3());
			let sceneLookAt = camdir.clone().multiplyScalar(30 * scale).add(campos);
			let geoPos = camera.position;
			let geoLookAt = sceneLookAt;
			let mapPos = new THREE.Vector2().fromArray(this.toMap.forward([geoPos.x, geoPos.y]));
			let mapLookAt = new THREE.Vector2().fromArray(this.toMap.forward([geoLookAt.x, geoLookAt.y]));
			let mapDir = new THREE.Vector2().subVectors(mapLookAt, mapPos).normalize();

			mapLookAt = mapPos.clone().add(mapDir.clone().multiplyScalar(30 * scale));
			let mapLength = mapPos.distanceTo(mapLookAt);
			let mapSide = new THREE.Vector2(-mapDir.y, mapDir.x);

			let p1 = mapPos.toArray();
			let p2 = mapLookAt.clone().sub(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();
			let p3 = mapLookAt.clone().add(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();

			this.gCamera.setCoordinates([p1, p2, p3, p1]);
		}

		get sourcesVisible () {
			return this.getSourcesLayer().getVisible();
		}

		set sourcesVisible (value) {
			this.getSourcesLayer().setVisible(value);
		}

	}

	class CSVExporter {
		static toString (points) {
			let string = '';

			let attributes = Object.keys(points.data)
				.filter(a => a !== 'normal')
				.sort((a, b) => {
					if (a === 'position') return -1;
					if (b === 'position') return 1;
					if (a === 'rgba') return -1;
					if (b === 'rgba') return 1;
				});

			let headerValues = [];
			for (let attribute of attributes) {
				let itemSize = points.data[attribute].length / points.numPoints;

				if (attribute === 'position') {
					headerValues = headerValues.concat(['x', 'y', 'z']);
				} else if (attribute === 'rgba') {
					headerValues = headerValues.concat(['r', 'g', 'b', 'a']);
				} else if (itemSize > 1) {
					for (let i = 0; i < itemSize; i++) {
						headerValues.push(`${attribute}_${i}`);
					}
				} else {
					headerValues.push(attribute);
				}
			}
			string = headerValues.join(', ') + '\n';

			for (let i = 0; i < points.numPoints; i++) {
				let values = [];

				for (let attribute of attributes) {
					let itemSize = points.data[attribute].length / points.numPoints;
					let value = points.data[attribute]
						.subarray(itemSize * i, itemSize * i + itemSize)
						.join(', ');
					values.push(value);
				}

				string += values.join(', ') + '\n';
			}

			return string;
		}
	};

	class LASExporter {
		static toLAS (points) {
			// TODO Unused: let string = '';

			let boundingBox = points.boundingBox;
			let offset = boundingBox.min.clone();
			let diagonal = boundingBox.min.distanceTo(boundingBox.max);
			let scale = new THREE.Vector3(0.001, 0.001, 0.001);
			if (diagonal > 1000 * 1000) {
				scale = new THREE.Vector3(0.01, 0.01, 0.01);
			} else {
				scale = new THREE.Vector3(0.001, 0.001, 0.001);
			}

			let setString = function (string, offset, buffer) {
				let view = new Uint8Array(buffer);

				for (let i = 0; i < string.length; i++) {
					let charCode = string.charCodeAt(i);
					view[offset + i] = charCode;
				}
			};

			let buffer = new ArrayBuffer(227 + 28 * points.numPoints);
			let view = new DataView(buffer);
			let u8View = new Uint8Array(buffer);
			// let u16View = new Uint16Array(buffer);

			setString('LASF', 0, buffer);
			u8View[24] = 1;
			u8View[25] = 2;

			// system identifier o:26 l:32

			// generating software o:58 l:32
			setString('Potree 1.7', 58, buffer);

			// file creation day of year o:90 l:2
			// file creation year o:92 l:2

			// header size o:94 l:2
			view.setUint16(94, 227, true);

			// offset to point data o:96 l:4
			view.setUint32(96, 227, true);

			// number of letiable length records o:100 l:4

			// point data record format 104 1
			u8View[104] = 2;

			// point data record length 105 2
			view.setUint16(105, 28, true);

			// number of point records 107 4
			view.setUint32(107, points.numPoints, true);

			// number of points by return 111 20

			// x scale factor 131 8
			view.setFloat64(131, scale.x, true);

			// y scale factor 139 8
			view.setFloat64(139, scale.y, true);

			// z scale factor 147 8
			view.setFloat64(147, scale.z, true);

			// x offset 155 8
			view.setFloat64(155, offset.x, true);

			// y offset 163 8
			view.setFloat64(163, offset.y, true);

			// z offset 171 8
			view.setFloat64(171, offset.z, true);

			// max x 179 8
			view.setFloat64(179, boundingBox.max.x, true);

			// min x 187 8
			view.setFloat64(187, boundingBox.min.x, true);

			// max y 195 8
			view.setFloat64(195, boundingBox.max.y, true);

			// min y 203 8
			view.setFloat64(203, boundingBox.min.y, true);

			// max z 211 8
			view.setFloat64(211, boundingBox.max.z, true);

			// min z 219 8
			view.setFloat64(219, boundingBox.min.z, true);

			let boffset = 227;
			for (let i = 0; i < points.numPoints; i++) {

				let px = points.data.position[3 * i + 0];
				let py = points.data.position[3 * i + 1];
				let pz = points.data.position[3 * i + 2];

				let ux = parseInt((px - offset.x) / scale.x);
				let uy = parseInt((py - offset.y) / scale.y);
				let uz = parseInt((pz - offset.z) / scale.z);

				view.setUint32(boffset + 0, ux, true);
				view.setUint32(boffset + 4, uy, true);
				view.setUint32(boffset + 8, uz, true);

				if (points.data.intensity) {
					view.setUint16(boffset + 12, (points.data.intensity[i]), true);
				}

				let rt = 0;
				if (points.data.returnNumber) {
					rt += points.data.returnNumber[i];
				}
				if (points.data.numberOfReturns) {
					rt += (points.data.numberOfReturns[i] << 3);
				}
				view.setUint8(boffset + 14, rt);

				if (points.data.classification) {
					view.setUint8(boffset + 15, points.data.classification[i]);
				}
				// scan angle rank
				// user data
				// point source id
				if (points.data.pointSourceID) {
					view.setUint16(boffset + 18, points.data.pointSourceID[i]);
				}

				if (points.data.rgba) {
					let rgba = points.data.rgba;
					view.setUint16(boffset + 20, (rgba[4 * i + 0] * 255), true);
					view.setUint16(boffset + 22, (rgba[4 * i + 1] * 255), true);
					view.setUint16(boffset + 24, (rgba[4 * i + 2] * 255), true);
				}

				boffset += 28;
			}

			return buffer;
		}
		
	}

	function copyMaterial(source, target){

		for(let name of Object.keys(target.uniforms)){
			target.uniforms[name].value = source.uniforms[name].value;
		}

		target.gradientTexture = source.gradientTexture;
		target.visibleNodesTexture = source.visibleNodesTexture;
		target.classificationTexture = source.classificationTexture;
		target.matcapTexture = source.matcapTexture;

		target.activeAttributeName = source.activeAttributeName;
		target.ranges = source.ranges;

		//target.updateShaderSource();
	}


	class Batch{

		constructor(geometry, material){
			this.geometry = geometry;
			this.material = material;

			this.sceneNode = new THREE.Points(geometry, material);

			this.geometryNode = {
				estimatedSpacing: 1.0,
				geometry: geometry,
			};
		}

		getLevel(){
			return 0;
		}

	}

	class ProfileFakeOctree extends PointCloudTree{

		constructor(octree){
			super();

			this.trueOctree = octree;
			this.pcoGeometry = octree.pcoGeometry;
			this.points = [];
			this.visibleNodes = [];
			
			//this.material = this.trueOctree.material;
			this.material = new PointCloudMaterial();
			//this.material.copy(this.trueOctree.material);
			copyMaterial(this.trueOctree.material, this.material);
			this.material.pointSizeType = PointSizeType.FIXED;

			this.batchSize = 100 * 1000;
			this.currentBatch = null;
		}

		getAttribute(name){
			return this.trueOctree.getAttribute(name);
		}

		dispose(){
			for(let node of this.visibleNodes){
				node.geometry.dispose();
			}

			this.visibleNodes = [];
			this.currentBatch = null;
			this.points = [];
		}

		addPoints(data){
			// since each call to addPoints can deliver very very few points,
			// we're going to batch them into larger buffers for efficiency.

			if(this.currentBatch === null){
				this.currentBatch = this.createNewBatch(data);
			}

			this.points.push(data);


			let updateRange = {
				start: this.currentBatch.geometry.drawRange.count,
				count: 0
			};
			let projectedBox = new THREE.Box3();

			let truePos = new THREE.Vector3();

			for(let i = 0; i < data.numPoints; i++){

				if(updateRange.start + updateRange.count >= this.batchSize){
					// current batch full, start new batch

					for(let key of Object.keys(this.currentBatch.geometry.attributes)){
						let attribute = this.currentBatch.geometry.attributes[key];
						attribute.updateRange.offset = updateRange.start;
						attribute.updateRange.count = updateRange.count;
						attribute.needsUpdate = true;
					}

					this.currentBatch.geometry.computeBoundingBox();
					this.currentBatch.geometry.computeBoundingSphere();

					this.currentBatch = this.createNewBatch();
					updateRange = {
						start: 0,
						count: 0
					};
				}

				truePos.set(
					data.data.position[3 * i + 0] + this.trueOctree.position.x,
					data.data.position[3 * i + 1] + this.trueOctree.position.y,
					data.data.position[3 * i + 2] + this.trueOctree.position.z,
				);

				let x = data.data.mileage[i];
				let y = 0;
				let z = truePos.z;

				projectedBox.expandByPoint(new THREE.Vector3(x, y, z));

				let index = updateRange.start + updateRange.count;
				let geometry = this.currentBatch.geometry;

				for(let attributeName of Object.keys(data.data)){
					let source = data.data[attributeName];
					let target = geometry.attributes[attributeName];
					let numElements = target.itemSize;
					
					for(let item = 0; item < numElements; item++){
						target.array[numElements * index + item] = source[numElements * i + item];
					}
				}

				{
					let position = geometry.attributes.position;

					position.array[3 * index + 0] = x;
					position.array[3 * index + 1] = y;
					position.array[3 * index + 2] = z;
				}

				updateRange.count++;
				this.currentBatch.geometry.drawRange.count++;
			}

			for(let key of Object.keys(this.currentBatch.geometry.attributes)){
				let attribute = this.currentBatch.geometry.attributes[key];
				attribute.updateRange.offset = updateRange.start;
				attribute.updateRange.count = updateRange.count;
				attribute.needsUpdate = true;
			}

			data.projectedBox = projectedBox;

			this.projectedBox = this.points.reduce( (a, i) => a.union(i.projectedBox), new THREE.Box3());
		}

		createNewBatch(data){
			let geometry = new THREE.BufferGeometry();

			// create new batches with batch_size elements of the same type as the attribute
			for(let attributeName of Object.keys(data.data)){
				let buffer = data.data[attributeName];
				let numElements = buffer.length / data.numPoints; // 3 for pos, 4 for col, 1 for scalars
				let constructor = buffer.constructor;
				let normalized = false;
				
				if(this.trueOctree.root.sceneNode){
					if(this.trueOctree.root.sceneNode.geometry.attributes[attributeName]){
						normalized = this.trueOctree.root.sceneNode.geometry.attributes[attributeName].normalized;
					}
				}
				

				let batchBuffer = new constructor(numElements * this.batchSize);

				let bufferAttribute = new THREE.BufferAttribute(batchBuffer, numElements, normalized);
				bufferAttribute.potree = {
					range: [0, 1],
				};

				geometry.addAttribute(attributeName, bufferAttribute);
			}

			geometry.drawRange.start = 0;
			geometry.drawRange.count = 0;

			let batch = new Batch(geometry, this.material);

			this.visibleNodes.push(batch);

			return batch;
		}
		
		computeVisibilityTextureData(){
			let data = new Uint8Array(this.visibleNodes.length * 4);
			let offsets = new Map();

			for(let i = 0; i < this.visibleNodes.length; i++){
				let node = this.visibleNodes[i];

				offsets[node] = i;
			}


			return {
				data: data,
				offsets: offsets,
			};
		}

	}

	class ProfileWindow extends EventDispatcher {
		constructor (viewer) {
			super();

			this.viewer = viewer;
			this.elRoot = $('#profile_window');
			this.renderArea = this.elRoot.find('#profileCanvasContainer');
			this.svg = d3.select('svg#profileSVG');
			this.mouseIsDown = false;

			this.projectedBox = new THREE.Box3();
			this.pointclouds = new Map();
			this.numPoints = 0;
			this.lastAddPointsTimestamp = undefined;

			this.mouse = new THREE.Vector2(0, 0);
			this.scale = new THREE.Vector3(1, 1, 1);

			this.autoFitEnabled = true; // completely disable/enable
			this.autoFit = false; // internal

			let cwIcon = `${exports.resourcePath}/icons/arrow_cw.svg`;
			$('#potree_profile_rotate_cw').attr('src', cwIcon);

			let ccwIcon = `${exports.resourcePath}/icons/arrow_ccw.svg`;
			$('#potree_profile_rotate_ccw').attr('src', ccwIcon);
			
			let forwardIcon = `${exports.resourcePath}/icons/arrow_up.svg`;
			$('#potree_profile_move_forward').attr('src', forwardIcon);

			let backwardIcon = `${exports.resourcePath}/icons/arrow_down.svg`;
			$('#potree_profile_move_backward').attr('src', backwardIcon);

			let csvIcon = `${exports.resourcePath}/icons/file_csv_2d.svg`;
			$('#potree_download_csv_icon').attr('src', csvIcon);

			let lasIcon = `${exports.resourcePath}/icons/file_las_3d.svg`;
			$('#potree_download_las_icon').attr('src', lasIcon);

			let closeIcon = `${exports.resourcePath}/icons/close.svg`;
			$('#closeProfileContainer').attr("src", closeIcon);

			this.initTHREE();
			this.initSVG();
			this.initListeners();

			this.pRenderer = new Renderer(this.renderer);

			this.elRoot.i18n();
		}

		initListeners () {
			$(window).resize(() => {
				if (this.enabled) {
				this.render();
				}
			});

			this.renderArea.mousedown(e => {
				this.mouseIsDown = true;
			});

			this.renderArea.mouseup(e => {
				this.mouseIsDown = false;
			});

			let viewerPickSphereSizeHandler = () => {
				let camera = this.viewer.scene.getActiveCamera();
				let domElement = this.viewer.renderer.domElement;
				let distance = this.viewerPickSphere.position.distanceTo(camera.position);
				let pr = Utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);
				let scale = (10 / pr);
				this.viewerPickSphere.scale.set(scale, scale, scale);
			};

			this.renderArea.mousemove(e => {
				if (this.pointclouds.size === 0) {
					return;
				}

				let rect = this.renderArea[0].getBoundingClientRect();
				let x = e.clientX - rect.left;
				let y = e.clientY - rect.top;

				let newMouse = new THREE.Vector2(x, y);

				if (this.mouseIsDown) {
					// DRAG
					this.autoFit = false;
					this.lastDrag = new Date().getTime();

					let cPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];
					let ncPos = [this.scaleX.invert(newMouse.x), this.scaleY.invert(newMouse.y)];

					this.camera.position.x -= ncPos[0] - cPos[0];
					this.camera.position.z -= ncPos[1] - cPos[1];

					this.render();
				} else if (this.pointclouds.size > 0) {
					// FIND HOVERED POINT
					let radius = Math.abs(this.scaleX.invert(0) - this.scaleX.invert(40));
					let mileage = this.scaleX.invert(newMouse.x);
					let elevation = this.scaleY.invert(newMouse.y);

					let closest = this.selectPoint(mileage, elevation, radius);

					if (closest) {
						let point = closest.point;

						let position = new Float64Array([
							point.position[0] + closest.pointcloud.position.x,
							point.position[1] + closest.pointcloud.position.y,
							point.position[2] + closest.pointcloud.position.z
						]);

						this.elRoot.find('#profileSelectionProperties').fadeIn(200);
						this.pickSphere.visible = true;
						this.pickSphere.scale.set(0.5 * radius, 0.5 * radius, 0.5 * radius);
						this.pickSphere.position.set(point.mileage, 0, position[2]);

						this.viewerPickSphere.position.set(...position);
						
						if(!this.viewer.scene.scene.children.includes(this.viewerPickSphere)){
							this.viewer.scene.scene.add(this.viewerPickSphere);
							if(!this.viewer.hasEventListener("update", viewerPickSphereSizeHandler)){
								this.viewer.addEventListener("update", viewerPickSphereSizeHandler);
							}
						}
						

						let info = this.elRoot.find('#profileSelectionProperties');
						let html = '<table>';

						for (let attributeName of Object.keys(point)) {

							let value = point[attributeName];
							let attribute = closest.pointcloud.getAttribute(attributeName);

							let transform = value => value;
							if(attribute && attribute.type.size > 4){
								let range = attribute.initialRange;
								let scale = 1 / (range[1] - range[0]);
								let offset = range[0];
								transform = value => value / scale + offset;
							}

							

							

							if (attributeName === 'position') {
								let values = [...position].map(v => Utils.addCommas(v.toFixed(3)));
								html += `
								<tr>
									<td>x</td>
									<td>${values[0]}</td>
								</tr>
								<tr>
									<td>y</td>
									<td>${values[1]}</td>
								</tr>
								<tr>
									<td>z</td>
									<td>${values[2]}</td>
								</tr>`;
							} else if (attributeName === 'rgba') {
								html += `
								<tr>
									<td>${attributeName}</td>
									<td>${value.join(', ')}</td>
								</tr>`;
							} else if (attributeName === 'normal') {
								continue;
							} else if (attributeName === 'mileage') {
								html += `
								<tr>
									<td>${attributeName}</td>
									<td>${value.toFixed(3)}</td>
								</tr>`;
							} else {
								html += `
								<tr>
									<td>${attributeName}</td>
									<td>${transform(value)}</td>
								</tr>`;
							}
						}
						html += '</table>';
						info.html(html);

						this.selectedPoint = point;
					} else {
						// this.pickSphere.visible = false;
						// this.selectedPoint = null;

						this.viewer.scene.scene.add(this.viewerPickSphere);

						let index = this.viewer.scene.scene.children.indexOf(this.viewerPickSphere);
						if(index >= 0){
							this.viewer.scene.scene.children.splice(index, 1);
						}
						this.viewer.removeEventListener("update", viewerPickSphereSizeHandler);
						

					}
					this.render();
				}

				this.mouse.copy(newMouse);
			});

			let onWheel = e => {
				this.autoFit = false;

				let delta = 0;
				if (e.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
					delta = e.wheelDelta;
				} else if (e.detail !== undefined) { // Firefox
					delta = -e.detail;
				}

				let ndelta = Math.sign(delta);

				let cPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];

				if (ndelta > 0) {
					// + 10%
					this.scale.multiplyScalar(1.1);
				} else {
					// - 10%
					this.scale.multiplyScalar(100 / 110);
				}

				this.updateScales();
				let ncPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];

				this.camera.position.x -= ncPos[0] - cPos[0];
				this.camera.position.z -= ncPos[1] - cPos[1];

				this.render();
				this.updateScales();
			};
			$(this.renderArea)[0].addEventListener('mousewheel', onWheel, false);
			$(this.renderArea)[0].addEventListener('DOMMouseScroll', onWheel, false); // Firefox

			$('#closeProfileContainer').click(() => {
				this.hide();
			});

			let getProfilePoints = () => {
				let points = new Points();
				
				for(let [pointcloud, entry] of this.pointclouds){
					for(let pointSet of entry.points){

						let originPos = pointSet.data.position;
						let trueElevationPosition = new Float32Array(originPos);
						for(let i = 0; i < pointSet.numPoints; i++){
							trueElevationPosition[3 * i + 2] += pointcloud.position.z;
						}

						pointSet.data.position = trueElevationPosition;
						points.add(pointSet);
						pointSet.data.position = originPos;
					}
				}

				return points;
			};

			$('#potree_download_csv_icon').click(() => {
				
				let points = getProfilePoints();

				let string = CSVExporter.toString(points);

				let blob = new Blob([string], {type: "text/string"});
				$('#potree_download_profile_ortho_link').attr('href', URL.createObjectURL(blob));
			});

			$('#potree_download_las_icon').click(() => {

				let points = getProfilePoints();

				let buffer = LASExporter.toLAS(points);

				let blob = new Blob([buffer], {type: "application/octet-binary"});
				$('#potree_download_profile_link').attr('href', URL.createObjectURL(blob));
			});
		}

		selectPoint (mileage, elevation, radius) {
			let closest = {
				distance: Infinity,
				pointcloud: null,
				points: null,
				index: null
			};

			let pointBox = new THREE.Box2(
				new THREE.Vector2(mileage - radius, elevation - radius),
				new THREE.Vector2(mileage + radius, elevation + radius));

			let numTested = 0;
			let numSkipped = 0;
			let numTestedPoints = 0;
			let numSkippedPoints = 0;

			for (let [pointcloud, entry] of this.pointclouds) {
				for(let points of entry.points){

					let collisionBox = new THREE.Box2(
						new THREE.Vector2(points.projectedBox.min.x, points.projectedBox.min.z),
						new THREE.Vector2(points.projectedBox.max.x, points.projectedBox.max.z)
					);

					let intersects = collisionBox.intersectsBox(pointBox);

					if(!intersects){
						numSkipped++;
						numSkippedPoints += points.numPoints;
						continue;
					}

					numTested++;
					numTestedPoints += points.numPoints;

					for (let i = 0; i < points.numPoints; i++) {

						let m = points.data.mileage[i] - mileage;
						let e = points.data.position[3 * i + 2] - elevation + pointcloud.position.z;
						let r = Math.sqrt(m * m + e * e);

						const withinDistance = r < radius && r < closest.distance;
						let unfilteredClass = true;

						if(points.data.classification){
							const classification = pointcloud.material.classification;

							const pointClassID = points.data.classification[i];
							const pointClassValue = classification[pointClassID];

							if(pointClassValue && (!pointClassValue.visible || pointClassValue.color.w === 0)){
								unfilteredClass = false;
							}
						}

						if (withinDistance && unfilteredClass) {
							closest = {
								distance: r,
								pointcloud: pointcloud,
								points: points,
								index: i
							};
						}
					}
				}
			}


			//console.log(`nodes: ${numTested}, ${numSkipped} || points: ${numTestedPoints}, ${numSkippedPoints}`);

			if (closest.distance < Infinity) {
				let points = closest.points;

				let point = {};

				let attributes = Object.keys(points.data);
				for (let attribute of attributes) {
					let attributeData = points.data[attribute];
					let itemSize = attributeData.length / points.numPoints;
					let value = attributeData.subarray(itemSize * closest.index, itemSize * closest.index + itemSize);

					if (value.length === 1) {
						point[attribute] = value[0];
					} else {
						point[attribute] = value;
					}
				}

				closest.point = point;

				return closest;
			} else {
				return null;
			}
		}

		initTHREE () {
			this.renderer = new THREE.WebGLRenderer({alpha: true, premultipliedAlpha: false});
			this.renderer.setClearColor(0x000000, 0);
			this.renderer.setSize(10, 10);
			this.renderer.autoClear = false;
			this.renderArea.append($(this.renderer.domElement));
			this.renderer.domElement.tabIndex = '2222';
			$(this.renderer.domElement).css('width', '100%');
			$(this.renderer.domElement).css('height', '100%');


			{
				let gl = this.renderer.getContext();

				let extVAO = gl.getExtension('OES_vertex_array_object');

				if(!extVAO){
					throw new Error("OES_vertex_array_object extension not supported");
				}

				gl.createVertexArray = extVAO.createVertexArrayOES.bind(extVAO);
				gl.bindVertexArray = extVAO.bindVertexArrayOES.bind(extVAO);
			}

			this.camera = new THREE.OrthographicCamera(-1000, 1000, 1000, -1000, -1000, 1000);
			this.camera.up.set(0, 0, 1);
			this.camera.rotation.order = "ZXY";
			this.camera.rotation.x = Math.PI / 2.0;
		

			this.scene = new THREE.Scene();
			this.profileScene = new THREE.Scene();

			let sg = new THREE.SphereGeometry(1, 16, 16);
			let sm = new THREE.MeshNormalMaterial();
			this.pickSphere = new THREE.Mesh(sg, sm);
			this.scene.add(this.pickSphere);

			{
				const sg = new THREE.SphereGeometry(2);
				const sm = new THREE.MeshNormalMaterial();
				const s = new THREE.Mesh(sg, sm);

				s.position.set(589530.450, 231398.860, 769.735);

				this.scene.add(s);
			}

			this.viewerPickSphere = new THREE.Mesh(sg, sm);
		}

		initSVG () {
			let width = this.renderArea[0].clientWidth;
			let height = this.renderArea[0].clientHeight;
			let marginLeft = this.renderArea[0].offsetLeft;

			this.svg.selectAll('*').remove();

			this.scaleX = d3.scale.linear()
				.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
				.range([0, width]);
			this.scaleY = d3.scale.linear()
				.domain([this.camera.bottom + this.camera.position.z, this.camera.top + this.camera.position.z])
				.range([height, 0]);

			this.xAxis = d3.svg.axis()
				.scale(this.scaleX)
				.orient('bottom')
				.innerTickSize(-height)
				.outerTickSize(1)
				.tickPadding(10)
				.ticks(width / 50);

			this.yAxis = d3.svg.axis()
				.scale(this.scaleY)
				.orient('left')
				.innerTickSize(-width)
				.outerTickSize(1)
				.tickPadding(10)
				.ticks(height / 20);

			this.elXAxis = this.svg.append('g')
				.attr('class', 'x axis')
				.attr('transform', `translate(${marginLeft}, ${height})`)
				.call(this.xAxis);

			this.elYAxis = this.svg.append('g')
				.attr('class', 'y axis')
				.attr('transform', `translate(${marginLeft}, 0)`)
				.call(this.yAxis);
		}

		addPoints (pointcloud, points) {

			if(points.numPoints === 0){
				return;
			}

			let entry = this.pointclouds.get(pointcloud);
			if(!entry){
				entry = new ProfileFakeOctree(pointcloud);
				this.pointclouds.set(pointcloud, entry);
				this.profileScene.add(entry);

				let materialChanged = () => {
					this.render();
				};

				materialChanged();

				pointcloud.material.addEventListener('material_property_changed', materialChanged);
				this.addEventListener("on_reset_once", () => {
					pointcloud.material.removeEventListener('material_property_changed', materialChanged);
				});
			}

			entry.addPoints(points);
			this.projectedBox.union(entry.projectedBox);

			if (this.autoFit && this.autoFitEnabled) { 
				let width = this.renderArea[0].clientWidth;
				let height = this.renderArea[0].clientHeight;

				let size = this.projectedBox.getSize(new THREE.Vector3());

				let sx = width / size.x;
				let sy = height / size.z;
				let scale = Math.min(sx, sy);

				let center = this.projectedBox.getCenter(new THREE.Vector3());
				this.scale.set(scale, scale, 1);
				this.camera.position.copy(center);

				//console.log("camera: ", this.camera.position.toArray().join(", "));
			}

			//console.log(entry);

			this.render();

			let numPoints = 0;
			for (let [key, value] of this.pointclouds.entries()) {
				numPoints += value.points.reduce( (a, i) => a + i.numPoints, 0);
			}
			$(`#profile_num_points`).html(Utils.addCommas(numPoints));

		}

		reset () {
			this.lastReset = new Date().getTime();

			this.dispatchEvent({type: "on_reset_once"});
			this.removeEventListeners("on_reset_once");

			this.autoFit = true;
			this.projectedBox = new THREE.Box3();

			for(let [key, entry] of this.pointclouds){
				entry.dispose();
			}

			this.pointclouds.clear();
			this.mouseIsDown = false;
			this.mouse.set(0, 0);

			if(this.autoFitEnabled){
				this.scale.set(1, 1, 1);
			}
			this.pickSphere.visible = false;

			this.elRoot.find('#profileSelectionProperties').hide();

			this.render();
		}

		show () {
			this.elRoot.fadeIn();
			this.enabled = true;
		}

		hide () {
			this.elRoot.fadeOut();
			this.enabled = false;
		}

		updateScales () {

			let width = this.renderArea[0].clientWidth;
			let height = this.renderArea[0].clientHeight;

			let left = (-width / 2) / this.scale.x;
			let right = (+width / 2) / this.scale.x;
			let top = (+height / 2) / this.scale.y;
			let bottom = (-height / 2) / this.scale.y;

			this.camera.left = left;
			this.camera.right = right;
			this.camera.top = top;
			this.camera.bottom = bottom;
			this.camera.updateProjectionMatrix();

			this.scaleX.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
				.range([0, width]);
			this.scaleY.domain([this.camera.bottom + this.camera.position.z, this.camera.top + this.camera.position.z])
				.range([height, 0]);

			let marginLeft = this.renderArea[0].offsetLeft;

			this.xAxis.scale(this.scaleX)
				.orient('bottom')
				.innerTickSize(-height)
				.outerTickSize(1)
				.tickPadding(10)
				.ticks(width / 50);
			this.yAxis.scale(this.scaleY)
				.orient('left')
				.innerTickSize(-width)
				.outerTickSize(1)
				.tickPadding(10)
				.ticks(height / 20);


			this.elXAxis
				.attr('transform', `translate(${marginLeft}, ${height})`)
				.call(this.xAxis);
			this.elYAxis
				.attr('transform', `translate(${marginLeft}, 0)`)
				.call(this.yAxis);
		}

		requestScaleUpdate(){

			let threshold = 100;
			let allowUpdate = ((this.lastReset === undefined) || (this.lastScaleUpdate === undefined)) 
				|| ((new Date().getTime() - this.lastReset) > threshold && (new Date().getTime() - this.lastScaleUpdate) > threshold);

			if(allowUpdate){

				this.updateScales();

				this.lastScaleUpdate = new Date().getTime();

				

				this.scaleUpdatePending = false;
			}else if(!this.scaleUpdatePending) {
				setTimeout(this.requestScaleUpdate.bind(this), 100);
				this.scaleUpdatePending = true;
			}
			
		}

		render () {
			let width = this.renderArea[0].clientWidth;
			let height = this.renderArea[0].clientHeight;

			let {renderer, pRenderer, camera, profileScene, scene} = this;
			let {scaleX, pickSphere} = this;

			renderer.setSize(width, height);

			renderer.setClearColor(0x000000, 0);
			renderer.clear(true, true, false);

			for(let pointcloud of this.pointclouds.keys()){
				let source = pointcloud.material;
				let target = this.pointclouds.get(pointcloud).material;
				
				copyMaterial(source, target);
				target.size = 2;
			}
			
			pRenderer.render(profileScene, camera, null);

			let radius = Math.abs(scaleX.invert(0) - scaleX.invert(5));

			if (radius === 0) {
				pickSphere.visible = false;
			} else {
				pickSphere.scale.set(radius, radius, radius);
				pickSphere.visible = true;
			}
			
			renderer.render(scene, camera);

			this.requestScaleUpdate();
		}
	};

	class ProfileWindowController {
		constructor (viewer) {
			this.viewer = viewer;
			this.profileWindow = viewer.profileWindow;
			this.profile = null;
			this.numPoints = 0;
			this.threshold = 60 * 1000;
			this.rotateAmount = 10;

			this.scheduledRecomputeTime = null;

			this.enabled = true;

			this.requests = [];

			this._recompute = () => { this.recompute(); };

			this.viewer.addEventListener("scene_changed", e => {
				e.oldScene.removeEventListener("pointcloud_added", this._recompute);
				e.scene.addEventListener("pointcloud_added", this._recompute);
			});
			this.viewer.scene.addEventListener("pointcloud_added", this._recompute);

			$("#potree_profile_rotate_amount").val(parseInt(this.rotateAmount));
			$("#potree_profile_rotate_amount").on("input", (e) => {
				const str = $("#potree_profile_rotate_amount").val();

				if(!isNaN(str)){
					const value = parseFloat(str);
					this.rotateAmount = value;
					$("#potree_profile_rotate_amount").css("background-color", "");
				}else {
					$("#potree_profile_rotate_amount").css("background-color", "#ff9999");
				}

			});

			const rotate = (radians) => {
				const profile = this.profile;
				const points = profile.points;
				const start = points[0];
				const end = points[points.length - 1];
				const center = start.clone().add(end).multiplyScalar(0.5);

				const mMoveOrigin = new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z);
				const mRotate = new THREE.Matrix4().makeRotationZ(radians);
				const mMoveBack = new THREE.Matrix4().makeTranslation(center.x, center.y, center.z);
				//const transform = mMoveOrigin.multiply(mRotate).multiply(mMoveBack);
				const transform = mMoveBack.multiply(mRotate).multiply(mMoveOrigin);

				const rotatedPoints = points.map( point => point.clone().applyMatrix4(transform) );

				this.profileWindow.autoFitEnabled = false;

				for(let i = 0; i < points.length; i++){
					profile.setPosition(i, rotatedPoints[i]);
				}
			};

			$("#potree_profile_rotate_cw").click( () => {
				const radians = THREE.Math.degToRad(this.rotateAmount);
				rotate(-radians);
			});

			$("#potree_profile_rotate_ccw").click( () => {
				const radians = THREE.Math.degToRad(this.rotateAmount);
				rotate(radians);
			});

			$("#potree_profile_move_forward").click( () => {
				const profile = this.profile;
				const points = profile.points;
				const start = points[0];
				const end = points[points.length - 1];

				const dir = end.clone().sub(start).normalize();
				const up = new THREE.Vector3(0, 0, 1);
				const forward = up.cross(dir);
				const move = forward.clone().multiplyScalar(profile.width / 2);

				this.profileWindow.autoFitEnabled = false;

				for(let i = 0; i < points.length; i++){
					profile.setPosition(i, points[i].clone().add(move));
				}
			});

			$("#potree_profile_move_backward").click( () => {
				const profile = this.profile;
				const points = profile.points;
				const start = points[0];
				const end = points[points.length - 1];

				const dir = end.clone().sub(start).normalize();
				const up = new THREE.Vector3(0, 0, 1);
				const forward = up.cross(dir);
				const move = forward.clone().multiplyScalar(-profile.width / 2);

				this.profileWindow.autoFitEnabled = false;

				for(let i = 0; i < points.length; i++){
					profile.setPosition(i, points[i].clone().add(move));
				}
			});
		}

		setProfile (profile) {
			if (this.profile !== null && this.profile !== profile) {
				this.profile.removeEventListener('marker_moved', this._recompute);
				this.profile.removeEventListener('marker_added', this._recompute);
				this.profile.removeEventListener('marker_removed', this._recompute);
				this.profile.removeEventListener('width_changed', this._recompute);
			}

			this.profile = profile;

			{
				this.profile.addEventListener('marker_moved', this._recompute);
				this.profile.addEventListener('marker_added', this._recompute);
				this.profile.addEventListener('marker_removed', this._recompute);
				this.profile.addEventListener('width_changed', this._recompute);
			}

			this.recompute();
		}

		reset () {
			this.profileWindow.reset();

			this.numPoints = 0;

			if (this.profile) {
				for (let request of this.requests) {
					request.cancel();
				}
			}
		}

		progressHandler (pointcloud, progress) {
			for (let segment of progress.segments) {
				this.profileWindow.addPoints(pointcloud, segment.points);
				this.numPoints += segment.points.numPoints;
			}
		}

		cancel () {
			for (let request of this.requests) {
				request.cancel();
				// request.finishLevelThenCancel();
			}

			this.requests = [];
		};

		finishLevelThenCancel(){
			for (let request of this.requests) {
				request.finishLevelThenCancel();
			}

			this.requests = [];
		}

		recompute () {
			if (!this.profile) {
				return;
			}

			if (this.scheduledRecomputeTime !== null && this.scheduledRecomputeTime > new Date().getTime()) {
				return;
			} else {
				this.scheduledRecomputeTime = new Date().getTime() + 100;
			}
			this.scheduledRecomputeTime = null;

			this.reset();

			for (let pointcloud of this.viewer.scene.pointclouds.filter(p => p.visible)) {
				let request = pointcloud.getPointsInProfile(this.profile, null, {
					'onProgress': (event) => {
						if (!this.enabled) {
							return;
						}

						this.progressHandler(pointcloud, event.points);

						if (this.numPoints > this.threshold) {
							this.finishLevelThenCancel();
						}
					},
					'onFinish': (event) => {
						if (!this.enabled) {

						}
					},
					'onCancel': () => {
						if (!this.enabled) {

						}
					}
				});

				this.requests.push(request);
			}
		}
	};

	/**
	 *
	 * @author sigeom sa / http://sigeom.ch
	 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
	 * @author Markus Schütz / http://potree.org
	 *
	 */

	class GeoJSONExporter{

		static measurementToFeatures (measurement) {
			let coords = measurement.points.map(e => e.position.toArray());

			let features = [];

			if (coords.length === 1) {
				let feature = {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: coords[0]
					},
					properties: {
						name: measurement.name
					}
				};
				features.push(feature);
			} else if (coords.length > 1 && !measurement.closed) {
				let object = {
					'type': 'Feature',
					'geometry': {
						'type': 'LineString',
						'coordinates': coords
					},
					'properties': {
						name: measurement.name
					}
				};

				features.push(object);
			} else if (coords.length > 1 && measurement.closed) {
				let object = {
					'type': 'Feature',
					'geometry': {
						'type': 'Polygon',
						'coordinates': [[...coords, coords[0]]]
					},
					'properties': {
						name: measurement.name
					}
				};
				features.push(object);
			}

			if (measurement.showDistances) {
				measurement.edgeLabels.forEach((label) => {
					let labelPoint = {
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: label.position.toArray()
						},
						properties: {
							distance: label.text
						}
					};
					features.push(labelPoint);
				});
			}

			if (measurement.showArea) {
				let point = measurement.areaLabel.position;
				let labelArea = {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: point.toArray()
					},
					properties: {
						area: measurement.areaLabel.text
					}
				};
				features.push(labelArea);
			}

			return features;
		}

		static toString (measurements) {
			if (!(measurements instanceof Array)) {
				measurements = [measurements];
			}

			measurements = measurements.filter(m => m instanceof Measure);

			let features = [];
			for (let measure of measurements) {
				let f = GeoJSONExporter.measurementToFeatures(measure);

				features = features.concat(f);
			}

			let geojson = {
				'type': 'FeatureCollection',
				'features': features
			};

			return JSON.stringify(geojson, null, '\t');
		}

	}

	/**
	 *
	 * @author sigeom sa / http://sigeom.ch
	 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
	 * @author Markus Schuetz / http://potree.org
	 *
	 */

	class DXFExporter {

		static measurementPointSection (measurement) {
			let position = measurement.points[0].position;

			if (!position) {
				return '';
			}

			let dxfSection = `0
CIRCLE
8
layer_point
10
${position.x}
20
${position.y}
30
${position.z}
40
1.0
`;

			return dxfSection;
		}

		static measurementPolylineSection (measurement) {
			// bit code for polygons/polylines:
			// https://www.autodesk.com/techpubs/autocad/acad2000/dxf/polyline_dxf_06.htm
			let geomCode = 8;
			if (measurement.closed) {
				geomCode += 1;
			}

			let dxfSection = `0
POLYLINE
8
layer_polyline
62
1
66
1
10
0.0
20
0.0
30
0.0
70
${geomCode}
`;

			let xMax = 0.0;
			let yMax = 0.0;
			let zMax = 0.0;
			for (let point of measurement.points) {
				point = point.position;
				xMax = Math.max(xMax, point.x);
				yMax = Math.max(yMax, point.y);
				zMax = Math.max(zMax, point.z);

				dxfSection += `0
VERTEX
8
0
10
${point.x}
20
${point.y}
30
${point.z}
70
32
`;
			}
			dxfSection += `0
SEQEND
`;

			return dxfSection;
		}

		static measurementSection (measurement) {
			// if(measurement.points.length <= 1){
			//	return "";
			// }

			if (measurement.points.length === 0) {
				return '';
			} else if (measurement.points.length === 1) {
				return DXFExporter.measurementPointSection(measurement);
			} else if (measurement.points.length >= 2) {
				return DXFExporter.measurementPolylineSection(measurement);
			}
		}

		static toString(measurements){
			if (!(measurements instanceof Array)) {
				measurements = [measurements];
			}
			measurements = measurements.filter(m => m instanceof Measure);

			let points = measurements.filter(m => (m instanceof Measure))
				.map(m => m.points)
				.reduce((a, v) => a.concat(v))
				.map(p => p.position);

			let min = new THREE.Vector3(Infinity, Infinity, Infinity);
			let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
			for (let point of points) {
				min.min(point);
				max.max(point);
			}

			let dxfHeader = `999
DXF created from potree
0
SECTION
2
HEADER
9
$ACADVER
1
AC1006
9
$INSBASE
10
0.0
20
0.0
30
0.0
9
$EXTMIN
10
${min.x}
20
${min.y}
30
${min.z}
9
$EXTMAX
10
${max.x}
20
${max.y}
30
${max.z}
0
ENDSEC
`;

			let dxfBody = `0
SECTION
2
ENTITIES
`;

			for (let measurement of measurements) {
				dxfBody += DXFExporter.measurementSection(measurement);
			}

			dxfBody += `0
ENDSEC
`;

			let dxf = dxfHeader + dxfBody + '0\nEOF';

			return dxf;
		}

	}

	class MeasurePanel{

		constructor(viewer, measurement, propertiesPanel){
			this.viewer = viewer;
			this.measurement = measurement;
			this.propertiesPanel = propertiesPanel;

			this._update = () => { this.update(); };
		}

		createCoordinatesTable(points){
			let table = $(`
			<table class="measurement_value_table">
				<tr>
					<th>x</th>
					<th>y</th>
					<th>z</th>
					<th></th>
				</tr>
			</table>
		`);

			let copyIconPath = Potree.resourcePath + '/icons/copy.svg';

			for (let point of points) {
				let x = Utils.addCommas(point.x.toFixed(3));
				let y = Utils.addCommas(point.y.toFixed(3));
				let z = Utils.addCommas(point.z.toFixed(3));

				let row = $(`
				<tr>
					<td><span>${x}</span></td>
					<td><span>${y}</span></td>
					<td><span>${z}</span></td>
					<td align="right" style="width: 25%">
						<img name="copy" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			`);

				this.elCopy = row.find("img[name=copy]");
				this.elCopy.click( () => {
					let msg = point.toArray().map(c => c.toFixed(3)).join(", ");
					Utils.clipboardCopy(msg);

					this.viewer.postMessage(
						`Copied value to clipboard: <br>'${msg}'`,
						{duration: 3000});
				});

				table.append(row);
			}

			return table;
		};

		createAttributesTable(){
			let elTable = $('<table class="measurement_value_table"></table>');

			let point = this.measurement.points[0];
			
			for(let attributeName of Object.keys(point)){
				if(attributeName === "position"){
				
				}else if(attributeName === "rgba"){
					let color = point.rgba;
					let text = color.join(', ');

					elTable.append($(`
					<tr>
						<td>rgb</td>
						<td>${text}</td>
					</tr>
				`));
				}else {
					let value = point[attributeName];
					let text = value.join(', ');

					elTable.append($(`
					<tr>
						<td>${attributeName}</td>
						<td>${text}</td>
					</tr>
				`));
				}
			}

			return elTable;
		}

		update(){

		}
	};

	class DistancePanel extends MeasurePanel{
		constructor(viewer, measurement, propertiesPanel){
			super(viewer, measurement, propertiesPanel);

			let removeIconPath = Potree.resourcePath + '/icons/remove.png';
			this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table id="distances_table" class="measurement_value_table"></table>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span>
						<input type="button" name="make_profile" value="profile from measure" />
					</span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

			this.elRemove = this.elContent.find("img[name=remove]");
			this.elRemove.click( () => {
				this.viewer.scene.removeMeasurement(measurement);
			});
			
			this.elMakeProfile = this.elContent.find("input[name=make_profile]");
			this.elMakeProfile.click( () => {
				//measurement.points;
				const profile = new Profile();

				profile.name = measurement.name;
				profile.width = measurement.getTotalDistance() / 50;

				for(const point of measurement.points){
					profile.addMarker(point.position.clone());
				}

				this.viewer.scene.addProfile(profile);

			});

			this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

			this.update();
		}

		update(){
			let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

			let positions = this.measurement.points.map(p => p.position);
			let distances = [];
			for (let i = 0; i < positions.length - 1; i++) {
				let d = positions[i].distanceTo(positions[i + 1]);
				distances.push(d.toFixed(3));
			}

			let totalDistance = this.measurement.getTotalDistance().toFixed(3);
			let elDistanceTable = this.elContent.find(`#distances_table`);
			elDistanceTable.empty();

			for (let i = 0; i < distances.length; i++) {
				let label = (i === 0) ? 'Distances: ' : '';
				let distance = distances[i];
				let elDistance = $(`
				<tr>
					<th>${label}</th>
					<td style="width: 100%; padding-left: 10px">${distance}</td>
				</tr>`);
				elDistanceTable.append(elDistance);
			}

			let elTotal = $(`
			<tr>
				<th>Total: </td><td style="width: 100%; padding-left: 10px">${totalDistance}</th>
			</tr>`);
			elDistanceTable.append(elTotal);
		}
	};

	class PointPanel extends MeasurePanel{
		constructor(viewer, measurement, propertiesPanel){
			super(viewer, measurement, propertiesPanel);

			let removeIconPath = Potree.resourcePath + '/icons/remove.png';
			this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span class="attributes_table_container"></span>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

			this.elRemove = this.elContent.find("img[name=remove]");
			this.elRemove.click( () => {
				this.viewer.scene.removeMeasurement(measurement);
			});

			this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

			this.update();
		}

		update(){
			let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

			let elAttributesContainer = this.elContent.find('.attributes_table_container');
			elAttributesContainer.empty();
			elAttributesContainer.append(this.createAttributesTable());
		}
	};

	class AreaPanel extends MeasurePanel{
		constructor(viewer, measurement, propertiesPanel){
			super(viewer, measurement, propertiesPanel);

			let removeIconPath = Potree.resourcePath + '/icons/remove.png';
			this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span style="font-weight: bold">Area: </span>
				<span id="measurement_area"></span>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

			this.elRemove = this.elContent.find("img[name=remove]");
			this.elRemove.click( () => {
				this.viewer.scene.removeMeasurement(measurement);
			});

			this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

			this.update();
		}

		update(){
			let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

			let elArea = this.elContent.find(`#measurement_area`);
			elArea.html(this.measurement.getArea().toFixed(3));
		}
	};

	class AnglePanel extends MeasurePanel{
		constructor(viewer, measurement, propertiesPanel){
			super(viewer, measurement, propertiesPanel);

			let removeIconPath = Potree.resourcePath + '/icons/remove.png';
			this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table class="measurement_value_table">
					<tr>
						<th>\u03b1</th>
						<th>\u03b2</th>
						<th>\u03b3</th>
					</tr>
					<tr>
						<td align="center" id="angle_cell_alpha" style="width: 33%"></td>
						<td align="center" id="angle_cell_betta" style="width: 33%"></td>
						<td align="center" id="angle_cell_gamma" style="width: 33%"></td>
					</tr>
				</table>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

			this.elRemove = this.elContent.find("img[name=remove]");
			this.elRemove.click( () => {
				this.viewer.scene.removeMeasurement(measurement);
			});

			this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

			this.update();
		}

		update(){
			let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

			let angles = [];
			for(let i = 0; i < this.measurement.points.length; i++){
				angles.push(this.measurement.getAngle(i) * (180.0 / Math.PI));
			}
			angles = angles.map(a => a.toFixed(1) + '\u00B0');

			let elAlpha = this.elContent.find(`#angle_cell_alpha`);
			let elBetta = this.elContent.find(`#angle_cell_betta`);
			let elGamma = this.elContent.find(`#angle_cell_gamma`);

			elAlpha.html(angles[0]);
			elBetta.html(angles[1]);
			elGamma.html(angles[2]);
		}
	};

	class CirclePanel extends MeasurePanel{
		constructor(viewer, measurement, propertiesPanel){
			super(viewer, measurement, propertiesPanel);

			let removeIconPath = Potree.resourcePath + '/icons/remove.png';
			this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table id="infos_table" class="measurement_value_table"></table>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

			this.elRemove = this.elContent.find("img[name=remove]");
			this.elRemove.click( () => {
				this.viewer.scene.removeMeasurement(measurement);
			});

			this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

			this.update();
		}

		update(){
			let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

			const elInfos = this.elContent.find(`#infos_table`);

			if(this.measurement.points.length !== 3){
				elInfos.empty();
				
				return;
			}

			const A = this.measurement.points[0].position;
			const B = this.measurement.points[1].position;
			const C = this.measurement.points[2].position;

			const center = Potree.Utils.computeCircleCenter(A, B, C);
			const radius = center.distanceTo(A);
			const circumference = 2 * Math.PI * radius;
			
			const format = (number) => {
				return Potree.Utils.addCommas(number.toFixed(3));
			};

			
			const txtCenter = `${format(center.x)} ${format(center.y)} ${format(center.z)}`;
			const txtRadius = format(radius);
			const txtCircumference = format(circumference);

			const thStyle = `style="text-align: left"`;
			const tdStyle = `style="width: 100%; padding: 5px;"`;
			
			elInfos.html(`
			<tr>
				<th ${thStyle}>Center: </th>
				<td ${tdStyle}></td>
			</tr>
			<tr>
				<td ${tdStyle} colspan="2">
					${txtCenter}
				</td>
			</tr>
			<tr>
				<th ${thStyle}>Radius: </th>
				<td ${tdStyle}>${txtRadius}</td>
			</tr>
			<tr>
				<th ${thStyle}>Circumference: </th>
				<td ${tdStyle}>${txtCircumference}</td>
			</tr>
		`);
		}
	};

	class HeightPanel extends MeasurePanel{
		constructor(viewer, measurement, propertiesPanel){
			super(viewer, measurement, propertiesPanel);

			let removeIconPath = Potree.resourcePath + '/icons/remove.png';
			this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span id="height_label">Height: </span><br>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

			this.elRemove = this.elContent.find("img[name=remove]");
			this.elRemove.click( () => {
				this.viewer.scene.removeMeasurement(measurement);
			});

			this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

			this.update();
		}

		update(){
			let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

			{
				let points = this.measurement.points;

				let sorted = points.slice().sort((a, b) => a.position.z - b.position.z);
				let lowPoint = sorted[0].position.clone();
				let highPoint = sorted[sorted.length - 1].position.clone();
				let min = lowPoint.z;
				let max = highPoint.z;
				let height = max - min;
				height = height.toFixed(3);

				this.elHeightLabel = this.elContent.find(`#height_label`);
				this.elHeightLabel.html(`<b>Height:</b> ${height}`);
			}
		}
	};

	class VolumePanel extends MeasurePanel{
		constructor(viewer, measurement, propertiesPanel){
			super(viewer, measurement, propertiesPanel);

			let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
			let removeIconPath = Potree.resourcePath + '/icons/remove.png';

			let lblLengthText = new Map([
				[BoxVolume, "length"],
				[SphereVolume, "rx"],
			]).get(measurement.constructor);

			let lblWidthText = new Map([
				[BoxVolume, "width"],
				[SphereVolume, "ry"],
			]).get(measurement.constructor);

			let lblHeightText = new Map([
				[BoxVolume, "height"],
				[SphereVolume, "rz"],
			]).get(measurement.constructor);

			this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>

				<table class="measurement_value_table">
					<tr>
						<th>\u03b1</th>
						<th>\u03b2</th>
						<th>\u03b3</th>
						<th></th>
					</tr>
					<tr>
						<td align="center" id="angle_cell_alpha" style="width: 33%"></td>
						<td align="center" id="angle_cell_betta" style="width: 33%"></td>
						<td align="center" id="angle_cell_gamma" style="width: 33%"></td>
						<td align="right" style="width: 25%">
							<img name="copyRotation" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
				</table>

				<table class="measurement_value_table">
					<tr>
						<th>${lblLengthText}</th>
						<th>${lblWidthText}</th>
						<th>${lblHeightText}</th>
						<th></th>
					</tr>
					<tr>
						<td align="center" id="cell_length" style="width: 33%"></td>
						<td align="center" id="cell_width" style="width: 33%"></td>
						<td align="center" id="cell_height" style="width: 33%"></td>
						<td align="right" style="width: 25%">
							<img name="copyScale" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
				</table>

				<br>
				<span style="font-weight: bold">Volume: </span>
				<span id="measurement_volume"></span>

				<!--
				<li>
					<label style="whitespace: nowrap">
						<input id="volume_show" type="checkbox"/>
						<span>show volume</span>
					</label>
				</li>-->

				<li>
					<label style="whitespace: nowrap">
						<input id="volume_clip" type="checkbox"/>
						<span>make clip volume</span>
					</label>
				</li>

				<li style="margin-top: 10px">
					<input name="download_volume" type="button" value="prepare download" style="width: 100%" />
					<div name="download_message"></div>
				</li>


				<!-- ACTIONS -->
				<li style="display: grid; grid-template-columns: auto auto; grid-column-gap: 5px; margin-top: 10px">
					<input id="volume_reset_orientation" type="button" value="reset orientation"/>
					<input id="volume_make_uniform" type="button" value="make uniform"/>
				</li>
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

			{ // download
				this.elDownloadButton = this.elContent.find("input[name=download_volume]");

				if(this.propertiesPanel.viewer.server){
					this.elDownloadButton.click(() => this.download());
				} else {
					this.elDownloadButton.hide();
				}
			}

			this.elCopyRotation = this.elContent.find("img[name=copyRotation]");
			this.elCopyRotation.click( () => {
				let rotation = this.measurement.rotation.toArray().slice(0, 3);
				let msg = rotation.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`Copied value to clipboard: <br>'${msg}'`,
						{duration: 3000});
			});

			this.elCopyScale = this.elContent.find("img[name=copyScale]");
			this.elCopyScale.click( () => {
				let scale = this.measurement.scale.toArray();
				let msg = scale.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`Copied value to clipboard: <br>'${msg}'`,
						{duration: 3000});
			});

			this.elRemove = this.elContent.find("img[name=remove]");
			this.elRemove.click( () => {
				this.viewer.scene.removeVolume(measurement);
			});

			this.elContent.find("#volume_reset_orientation").click(() => {
				measurement.rotation.set(0, 0, 0);
			});

			this.elContent.find("#volume_make_uniform").click(() => {
				let mean = (measurement.scale.x + measurement.scale.y + measurement.scale.z) / 3;
				measurement.scale.set(mean, mean, mean);
			});

			this.elCheckClip = this.elContent.find('#volume_clip');
			this.elCheckClip.click(event => {
				this.measurement.clip = event.target.checked;
			});

			this.elCheckShow = this.elContent.find('#volume_show');
			this.elCheckShow.click(event => {
				this.measurement.visible = event.target.checked;
			});

			this.propertiesPanel.addVolatileListener(measurement, "position_changed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "orientation_changed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "scale_changed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "clip_changed", this._update);

			this.update();
		}

		async download(){

			let clipBox = this.measurement;

			let regions = [];
			//for(let clipBox of boxes){
			{
				let toClip = clipBox.matrixWorld;

				let px = new THREE.Vector3(+0.5, 0, 0).applyMatrix4(toClip);
				let nx = new THREE.Vector3(-0.5, 0, 0).applyMatrix4(toClip);
				let py = new THREE.Vector3(0, +0.5, 0).applyMatrix4(toClip);
				let ny = new THREE.Vector3(0, -0.5, 0).applyMatrix4(toClip);
				let pz = new THREE.Vector3(0, 0, +0.5).applyMatrix4(toClip);
				let nz = new THREE.Vector3(0, 0, -0.5).applyMatrix4(toClip);

				let pxN = new THREE.Vector3().subVectors(nx, px).normalize();
				let nxN = pxN.clone().multiplyScalar(-1);
				let pyN = new THREE.Vector3().subVectors(ny, py).normalize();
				let nyN = pyN.clone().multiplyScalar(-1);
				let pzN = new THREE.Vector3().subVectors(nz, pz).normalize();
				let nzN = pzN.clone().multiplyScalar(-1);

				let planes = [
					new THREE.Plane().setFromNormalAndCoplanarPoint(pxN, px),
					new THREE.Plane().setFromNormalAndCoplanarPoint(nxN, nx),
					new THREE.Plane().setFromNormalAndCoplanarPoint(pyN, py),
					new THREE.Plane().setFromNormalAndCoplanarPoint(nyN, ny),
					new THREE.Plane().setFromNormalAndCoplanarPoint(pzN, pz),
					new THREE.Plane().setFromNormalAndCoplanarPoint(nzN, nz),
				];

				let planeQueryParts = [];
				for(let plane of planes){
					let part = [plane.normal.toArray(), plane.constant].join(",");
					part = `[${part}]`;
					planeQueryParts.push(part);
				}
				let region = "[" + planeQueryParts.join(",") + "]";
				regions.push(region);
			}

			let regionsArg = regions.join(",");

			let pointcloudArgs = [];
			for(let pointcloud of this.viewer.scene.pointclouds){
				if(!pointcloud.visible){
					continue;
				}

				let offset = pointcloud.pcoGeometry.offset.clone();
				let negateOffset = new THREE.Matrix4().makeTranslation(...offset.multiplyScalar(-1).toArray());
				let matrixWorld = pointcloud.matrixWorld;

				let transform = new THREE.Matrix4().multiplyMatrices(matrixWorld, negateOffset);

				let path = `${window.location.pathname}/../${pointcloud.pcoGeometry.url}`;

				let arg = {
					path: path,
					transform: transform.elements,
				};
				let argString = JSON.stringify(arg);

				pointcloudArgs.push(argString);
			}
			let pointcloudsArg = pointcloudArgs.join(",");

			let elMessage = this.elContent.find("div[name=download_message]");

			let error = (message) => {
				elMessage.html(`<div style="color: #ff0000">ERROR: ${message}</div>`);
			};

			let info = (message) => {
				elMessage.html(`${message}`);
			};

			let handle = null;
			{ // START FILTER
				let url = `${viewer.server}/create_regions_filter?pointclouds=[${pointcloudsArg}]&regions=[${regionsArg}]`;
				
				//console.log(url);

				info("estimating results ...");

				let response = await fetch(url);
				let jsResponse = await response.json();
				//console.log(jsResponse);

				if(!jsResponse.handle){
					error(jsResponse.message);
					return;
				}else {
					handle = jsResponse.handle;
				}
			}

			{ // WAIT, CHECK PROGRESS, HANDLE FINISH
				let url = `${viewer.server}/check_regions_filter?handle=${handle}`;

				let sleep = (function(duration){
					return new Promise( (res, rej) => {
						setTimeout(() => {
							res();
						}, duration);
					});
				});

				let handleFiltering = (jsResponse) => {
					let {progress, estimate} = jsResponse;

					let progressFract = progress["processed points"] / estimate.points;
					let progressPercents = parseInt(progressFract * 100);

					info(`progress: ${progressPercents}%`);
				};

				let handleFinish = (jsResponse) => {
					let message = "downloads ready: <br>";
					message += "<ul>";

					for(let i = 0; i < jsResponse.pointclouds.length; i++){
						let url = `${viewer.server}/download_regions_filter_result?handle=${handle}&index=${i}`;

						message += `<li><a href="${url}">result_${i}.las</a> </li>\n`;
					}

					let reportURL = `${viewer.server}/download_regions_filter_report?handle=${handle}`;
					message += `<li> <a href="${reportURL}">report.json</a> </li>\n`;
					message += "</ul>";

					info(message);
				};

				let handleUnexpected = (jsResponse) => {
					let message = `Unexpected Response. <br>status: ${jsResponse.status} <br>message: ${jsResponse.message}`;
					info(message);
				};

				let handleError = (jsResponse) => {
					let message = `ERROR: ${jsResponse.message}`;
					error(message);

					throw new Error(message);
				};

				let start = Date.now();

				while(true){
					let response = await fetch(url);
					let jsResponse = await response.json();

					if(jsResponse.status === "ERROR"){
						handleError(jsResponse);
					}else if(jsResponse.status === "FILTERING"){
						handleFiltering(jsResponse);
					}else if(jsResponse.status === "FINISHED"){
						handleFinish(jsResponse);

						break;
					}else {
						handleUnexpected(jsResponse);
					}

					let durationS = (Date.now() - start) / 1000;
					let sleepAmountMS = durationS < 10 ? 100 : 1000;

					await sleep(sleepAmountMS);
				}
			}

		}

		update(){
			let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(this.createCoordinatesTable([this.measurement.position]));

			{
				let angles = this.measurement.rotation.toVector3();
				angles = angles.toArray();
				//angles = [angles.z, angles.x, angles.y];
				angles = angles.map(v => 180 * v / Math.PI);
				angles = angles.map(a => a.toFixed(1) + '\u00B0');

				let elAlpha = this.elContent.find(`#angle_cell_alpha`);
				let elBetta = this.elContent.find(`#angle_cell_betta`);
				let elGamma = this.elContent.find(`#angle_cell_gamma`);

				elAlpha.html(angles[0]);
				elBetta.html(angles[1]);
				elGamma.html(angles[2]);
			}

			{
				let dimensions = this.measurement.scale.toArray();
				dimensions = dimensions.map(v => Utils.addCommas(v.toFixed(2)));

				let elLength = this.elContent.find(`#cell_length`);
				let elWidth = this.elContent.find(`#cell_width`);
				let elHeight = this.elContent.find(`#cell_height`);

				elLength.html(dimensions[0]);
				elWidth.html(dimensions[1]);
				elHeight.html(dimensions[2]);
			}

			{
				let elVolume = this.elContent.find(`#measurement_volume`);
				let volume = this.measurement.getVolume();
				elVolume.html(Utils.addCommas(volume.toFixed(2)));
			}

			this.elCheckClip.prop("checked", this.measurement.clip);
			this.elCheckShow.prop("checked", this.measurement.visible);

		}
	};

	class ProfilePanel extends MeasurePanel{
		constructor(viewer, measurement, propertiesPanel){
			super(viewer, measurement, propertiesPanel);

			let removeIconPath = Potree.resourcePath + '/icons/remove.png';
			this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span style="display:flex">
					<span style="display:flex; align-items: center; padding-right: 10px">Width: </span>
					<input id="sldProfileWidth" name="sldProfileWidth" value="5.06" style="flex-grow: 1; width:100%">
				</span>
				<br>

				<li style="margin-top: 10px">
					<input name="download_profile" type="button" value="prepare download" style="width: 100%" />
					<div name="download_message"></div>
				</li>

				<br>

				<input type="button" id="show_2d_profile" value="show 2d profile" style="width: 100%"/>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

			this.elRemove = this.elContent.find("img[name=remove]");
			this.elRemove.click( () => {
				this.viewer.scene.removeProfile(measurement);
			});

			{ // download
				this.elDownloadButton = this.elContent.find(`input[name=download_profile]`);

				if(this.propertiesPanel.viewer.server){
					this.elDownloadButton.click(() => this.download());
				} else {
					this.elDownloadButton.hide();
				}
			}

			{ // width spinner
				let elWidthSlider = this.elContent.find(`#sldProfileWidth`);

				elWidthSlider.spinner({
					min: 0, max: 10 * 1000 * 1000, step: 0.01,
					numberFormat: 'n',
					start: () => {},
					spin: (event, ui) => {
						let value = elWidthSlider.spinner('value');
						measurement.setWidth(value);
					},
					change: (event, ui) => {
						let value = elWidthSlider.spinner('value');
						measurement.setWidth(value);
					},
					stop: (event, ui) => {
						let value = elWidthSlider.spinner('value');
						measurement.setWidth(value);
					},
					incremental: (count) => {
						let value = elWidthSlider.spinner('value');
						let step = elWidthSlider.spinner('option', 'step');

						let delta = value * 0.05;
						let increments = Math.max(1, parseInt(delta / step));

						return increments;
					}
				});
				elWidthSlider.spinner('value', measurement.getWidth());
				elWidthSlider.spinner('widget').css('width', '100%');

				let widthListener = (event) => {
					let value = elWidthSlider.spinner('value');
					if (value !== measurement.getWidth()) {
						elWidthSlider.spinner('value', measurement.getWidth());
					}
				};
				this.propertiesPanel.addVolatileListener(measurement, "width_changed", widthListener);
			}

			let elShow2DProfile = this.elContent.find(`#show_2d_profile`);
			elShow2DProfile.click(() => {
				this.propertiesPanel.viewer.profileWindow.show();
				this.propertiesPanel.viewer.profileWindowController.setProfile(measurement);
			});

			this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
			this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

			this.update();
		}

		update(){
			let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points));
		}

		async download(){

			let profile = this.measurement;

			let regions = [];
			{
				let segments = profile.getSegments();
				let width = profile.width;
				
				for(let segment of segments){
					let start = segment.start.clone().multiply(new THREE.Vector3(1, 1, 0));
					let end = segment.end.clone().multiply(new THREE.Vector3(1, 1, 0));
					let center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
					
					let startEndDir = new THREE.Vector3().subVectors(end, start).normalize();
					let endStartDir = new THREE.Vector3().subVectors(start, end).normalize();
					let upDir = new THREE.Vector3(0, 0, 1);
					let rightDir = new THREE.Vector3().crossVectors(startEndDir, upDir);
					let leftDir = new THREE.Vector3().crossVectors(endStartDir, upDir);
					
					console.log(leftDir);
					
					let right = rightDir.clone().multiplyScalar(width * 0.5).add(center);
					let left = leftDir.clone().multiplyScalar(width * 0.5).add(center);
					
					let planes = [
						new THREE.Plane().setFromNormalAndCoplanarPoint(startEndDir, start),
						new THREE.Plane().setFromNormalAndCoplanarPoint(endStartDir, end),
						new THREE.Plane().setFromNormalAndCoplanarPoint(leftDir, right),
						new THREE.Plane().setFromNormalAndCoplanarPoint(rightDir, left),
					];
					
					let planeQueryParts = [];
					for(let plane of planes){
						let part = [plane.normal.toArray(), plane.constant].join(",");
						part = `[${part}]`;
						planeQueryParts.push(part);
					}
					let region = "[" + planeQueryParts.join(",") + "]";
					regions.push(region);
				}
			}

			let regionsArg = regions.join(",");

			let pointcloudArgs = [];
			for(let pointcloud of this.viewer.scene.pointclouds){
				if(!pointcloud.visible){
					continue;
				}

				let offset = pointcloud.pcoGeometry.offset.clone();
				let negateOffset = new THREE.Matrix4().makeTranslation(...offset.multiplyScalar(-1).toArray());
				let matrixWorld = pointcloud.matrixWorld;

				let transform = new THREE.Matrix4().multiplyMatrices(matrixWorld, negateOffset);

				let path = `${window.location.pathname}/../${pointcloud.pcoGeometry.url}`;

				let arg = {
					path: path,
					transform: transform.elements,
				};
				let argString = JSON.stringify(arg);

				pointcloudArgs.push(argString);
			}
			let pointcloudsArg = pointcloudArgs.join(",");

			let elMessage = this.elContent.find("div[name=download_message]");

			let error = (message) => {
				elMessage.html(`<div style="color: #ff0000">ERROR: ${message}</div>`);
			};

			let info = (message) => {
				elMessage.html(`${message}`);
			};

			let handle = null;
			{ // START FILTER
				let url = `${viewer.server}/create_regions_filter?pointclouds=[${pointcloudsArg}]&regions=[${regionsArg}]`;
				
				//console.log(url);

				info("estimating results ...");

				let response = await fetch(url);
				let jsResponse = await response.json();
				//console.log(jsResponse);

				if(!jsResponse.handle){
					error(jsResponse.message);
					return;
				}else {
					handle = jsResponse.handle;
				}
			}

			{ // WAIT, CHECK PROGRESS, HANDLE FINISH
				let url = `${viewer.server}/check_regions_filter?handle=${handle}`;

				let sleep = (function(duration){
					return new Promise( (res, rej) => {
						setTimeout(() => {
							res();
						}, duration);
					});
				});

				let handleFiltering = (jsResponse) => {
					let {progress, estimate} = jsResponse;

					let progressFract = progress["processed points"] / estimate.points;
					let progressPercents = parseInt(progressFract * 100);

					info(`progress: ${progressPercents}%`);
				};

				let handleFinish = (jsResponse) => {
					let message = "downloads ready: <br>";
					message += "<ul>";

					for(let i = 0; i < jsResponse.pointclouds.length; i++){
						let url = `${viewer.server}/download_regions_filter_result?handle=${handle}&index=${i}`;

						message += `<li><a href="${url}">result_${i}.las</a> </li>\n`;
					}

					let reportURL = `${viewer.server}/download_regions_filter_report?handle=${handle}`;
					message += `<li> <a href="${reportURL}">report.json</a> </li>\n`;
					message += "</ul>";

					info(message);
				};

				let handleUnexpected = (jsResponse) => {
					let message = `Unexpected Response. <br>status: ${jsResponse.status} <br>message: ${jsResponse.message}`;
					info(message);
				};

				let handleError = (jsResponse) => {
					let message = `ERROR: ${jsResponse.message}`;
					error(message);

					throw new Error(message);
				};

				let start = Date.now();

				while(true){
					let response = await fetch(url);
					let jsResponse = await response.json();

					if(jsResponse.status === "ERROR"){
						handleError(jsResponse);
					}else if(jsResponse.status === "FILTERING"){
						handleFiltering(jsResponse);
					}else if(jsResponse.status === "FINISHED"){
						handleFinish(jsResponse);

						break;
					}else {
						handleUnexpected(jsResponse);
					}

					let durationS = (Date.now() - start) / 1000;
					let sleepAmountMS = durationS < 10 ? 100 : 1000;

					await sleep(sleepAmountMS);
				}
			}

		}
	};

	class CameraPanel{
		constructor(viewer, propertiesPanel){
			this.viewer = viewer;
			this.propertiesPanel = propertiesPanel;

			this._update = () => { this.update(); };

			let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
			this.elContent = $(`
		<div class="propertypanel_content">
			<table>
				<tr>
					<th colspan="3">position</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="camera_position_x" style="width: 25%"></td>
					<td align="center" id="camera_position_y" style="width: 25%"></td>
					<td align="center" id="camera_position_z" style="width: 25%"></td>
					<td align="right" id="copy_camera_position" style="width: 25%">
						<img name="copyPosition" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
				<tr>
					<th colspan="3">target</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="camera_target_x" style="width: 25%"></td>
					<td align="center" id="camera_target_y" style="width: 25%"></td>
					<td align="center" id="camera_target_z" style="width: 25%"></td>
					<td align="right" id="copy_camera_target" style="width: 25%">
						<img name="copyTarget" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			</table>
		</div>
		`);

			this.elCopyPosition = this.elContent.find("img[name=copyPosition]");
			this.elCopyPosition.click( () => {
				let pos = this.viewer.scene.getActiveCamera().position.toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`Copied value to clipboard: <br>'${msg}'`,
						{duration: 3000});
			});

			this.elCopyTarget = this.elContent.find("img[name=copyTarget]");
			this.elCopyTarget.click( () => {
				let pos = this.viewer.scene.view.getPivot().toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`Copied value to clipboard: <br>'${msg}'`,
						{duration: 3000});
			});

			this.propertiesPanel.addVolatileListener(viewer, "camera_changed", this._update);

			this.update();
		}

		update(){
			//console.log("updating camera panel");

			let camera = this.viewer.scene.getActiveCamera();
			let view = this.viewer.scene.view;

			let pos = camera.position.toArray().map(c => Utils.addCommas(c.toFixed(3)));
			this.elContent.find("#camera_position_x").html(pos[0]);
			this.elContent.find("#camera_position_y").html(pos[1]);
			this.elContent.find("#camera_position_z").html(pos[2]);

			let target = view.getPivot().toArray().map(c => Utils.addCommas(c.toFixed(3)));
			this.elContent.find("#camera_target_x").html(target[0]);
			this.elContent.find("#camera_target_y").html(target[1]);
			this.elContent.find("#camera_target_z").html(target[2]);
		}
	};

	class AnnotationPanel{
		constructor(viewer, propertiesPanel, annotation){
			this.viewer = viewer;
			this.propertiesPanel = propertiesPanel;
			this.annotation = annotation;

			this._update = () => { this.update(); };

			let copyIconPath = `${Potree.resourcePath}/icons/copy.svg`;
			this.elContent = $(`
		<div class="propertypanel_content">
			<table>
				<tr>
					<th colspan="3">position</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="annotation_position_x" style="width: 25%"></td>
					<td align="center" id="annotation_position_y" style="width: 25%"></td>
					<td align="center" id="annotation_position_z" style="width: 25%"></td>
					<td align="right" id="copy_annotation_position" style="width: 25%">
						<img name="copyPosition" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>

			</table>

			<div>

				<div class="heading">Title</div>
				<div id="annotation_title" contenteditable="true">
					Annotation Title
				</div>

				<div class="heading">Description</div>
				<div id="annotation_description" contenteditable="true">
					A longer description of this annotation. 
						Can be multiple lines long. TODO: the user should be able
						to modify title and description. 
				</div>

			</div>

		</div>
		`);

			this.elCopyPosition = this.elContent.find("img[name=copyPosition]");
			this.elCopyPosition.click( () => {
				let pos = this.annotation.position.toArray();
				let msg = pos.map(c => c.toFixed(3)).join(", ");
				Utils.clipboardCopy(msg);

				this.viewer.postMessage(
						`Copied value to clipboard: <br>'${msg}'`,
						{duration: 3000});
			});

			this.elTitle = this.elContent.find("#annotation_title").html(annotation.title);
			this.elDescription = this.elContent.find("#annotation_description").html(annotation.description);

			this.elTitle[0].addEventListener("input", () => {
				const title = this.elTitle.html();
				annotation.title = title;

			}, false);

			this.elDescription[0].addEventListener("input", () => {
				const description = this.elDescription.html();
				annotation.description = description;
			}, false);

			this.update();
		}

		update(){
			const {annotation, elContent, elTitle, elDescription} = this;

			let pos = annotation.position.toArray().map(c => Utils.addCommas(c.toFixed(3)));
			elContent.find("#annotation_position_x").html(pos[0]);
			elContent.find("#annotation_position_y").html(pos[1]);
			elContent.find("#annotation_position_z").html(pos[2]);

			elTitle.html(annotation.title);
			elDescription.html(annotation.description);


		}
	};

	class CameraAnimationPanel{
		constructor(viewer, propertiesPanel, animation){
			this.viewer = viewer;
			this.propertiesPanel = propertiesPanel;
			this.animation = animation;

			this.elContent = $(`
			<div class="propertypanel_content">
				<span id="animation_keyframes"></span>

				<span>

					<span style="display:flex">
						<span style="display:flex; align-items: center; padding-right: 10px">Duration: </span>
						<input name="spnDuration" value="5.0" style="flex-grow: 1; width:100%">
					</span>

					<span>Time: </span><span id="lblTime"></span> <div id="sldTime"></div>

					<input name="play" type="button" value="play"/>
				</span>
			</div>
		`);

			const elPlay = this.elContent.find("input[name=play]");
			elPlay.click( () => {
				animation.play();
			});

			const elSlider = this.elContent.find('#sldTime');
			elSlider.slider({
				value: 0,
				min: 0,
				max: 1,
				step: 0.001,
				slide: (event, ui) => { 
					animation.set(ui.value);
				}
			});

			let elDuration = this.elContent.find(`input[name=spnDuration]`);
			elDuration.spinner({
				min: 0, max: 300, step: 0.01,
				numberFormat: 'n',
				start: () => {},
				spin: (event, ui) => {
					let value = elDuration.spinner('value');
					animation.setDuration(value);
				},
				change: (event, ui) => {
					let value = elDuration.spinner('value');
					animation.setDuration(value);
				},
				stop: (event, ui) => {
					let value = elDuration.spinner('value');
					animation.setDuration(value);
				},
				incremental: (count) => {
					let value = elDuration.spinner('value');
					let step = elDuration.spinner('option', 'step');

					let delta = value * 0.05;
					let increments = Math.max(1, parseInt(delta / step));

					return increments;
				}
			});
			elDuration.spinner('value', animation.getDuration());
			elDuration.spinner('widget').css('width', '100%');

			const elKeyframes = this.elContent.find("#animation_keyframes");

			const updateKeyframes = () => {
				elKeyframes.empty();

				//let index = 0;

				// <span style="flex-grow: 0;">
				// 				<img name="add" src="${Potree.resourcePath}/icons/add.svg" style="width: 1.5em; height: 1.5em"/>
				// 			</span>

				const addNewKeyframeItem = (index) => {
					let elNewKeyframe = $(`
					<div style="display: flex; margin: 0.2em 0em">
						<span style="flex-grow: 1"></span>
						<input type="button" name="add" value="insert control point" />
						<span style="flex-grow: 1"></span>
					</div>
				`);

					const elAdd = elNewKeyframe.find("input[name=add]");
					elAdd.click( () => {
						animation.createControlPoint(index);
					});

					elKeyframes.append(elNewKeyframe);
				};

				const addKeyframeItem = (index) => {
					let elKeyframe = $(`
					<div style="display: flex; margin: 0.2em 0em">
						<span style="flex-grow: 0;">
							<img name="assign" src="${Potree.resourcePath}/icons/assign.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
						<span style="flex-grow: 0;">
							<img name="move" src="${Potree.resourcePath}/icons/circled_dot.svg" style="width: 1.5em; height: 1.5em"/>
						</span>
						<span style="flex-grow: 0; width: 1.5em; height: 1.5em"></span>
						<span style="flex-grow: 0; font-size: 1.5em">keyframe</span>
						<span style="flex-grow: 1"></span>
						<span style="flex-grow: 0;">
							<img name="delete" src="${Potree.resourcePath}/icons/remove.png" style="width: 1.5em; height: 1.5em"/>
						</span>
					</div>
				`);

					const elAssign = elKeyframe.find("img[name=assign]");
					const elMove = elKeyframe.find("img[name=move]");
					const elDelete = elKeyframe.find("img[name=delete]");

					elAssign.click( () => {
						const cp = animation.controlPoints[index];

						cp.position.copy(viewer.scene.view.position);
						cp.target.copy(viewer.scene.view.getPivot());
					});

					elMove.click( () => {
						const cp = animation.controlPoints[index];

						viewer.scene.view.position.copy(cp.position);
						viewer.scene.view.lookAt(cp.target);
					});

					elDelete.click( () => {
						const cp = animation.controlPoints[index];
						animation.removeControlPoint(cp);
					});

					elKeyframes.append(elKeyframe);
				};

				let index = 0;

				addNewKeyframeItem(index);

				for(const cp of animation.controlPoints){
					
					addKeyframeItem(index);
					index++;
					addNewKeyframeItem(index);

				}
			};

			updateKeyframes();

			animation.addEventListener("controlpoint_added", updateKeyframes);
			animation.addEventListener("controlpoint_removed", updateKeyframes);




			// this._update = () => { this.update(); };

			// this.update();
		}

		update(){
			
		}
	};

	class PropertiesPanel{

		constructor(container, viewer){
			this.container = container;
			this.viewer = viewer;
			this.object = null;
			this.cleanupTasks = [];
			this.scene = null;
		}

		setScene(scene){
			this.scene = scene;
		}

		set(object){
			if(this.object === object){
				return;
			}

			this.object = object;
			
			for(let task of this.cleanupTasks){
				task();
			}
			this.cleanupTasks = [];
			this.container.empty();

			if(object instanceof PointCloudTree){
				this.setPointCloud(object);
			}else if(object instanceof Measure || object instanceof Profile || object instanceof Volume){
				this.setMeasurement(object);
			}else if(object instanceof THREE.Camera){
				this.setCamera(object);
			}else if(object instanceof Annotation){
				this.setAnnotation(object);
			}else if(object instanceof CameraAnimation){
				this.setCameraAnimation(object);
			}
			
		}

		//
		// Used for events that should be removed when the property object changes.
		// This is for listening to materials, scene, point clouds, etc.
		// not required for DOM listeners, since they are automatically cleared by removing the DOM subtree.
		//
		addVolatileListener(target, type, callback){
			target.addEventListener(type, callback);
			this.cleanupTasks.push(() => {
				target.removeEventListener(type, callback);
			});
		}

		setPointCloud(pointcloud){

			let material = pointcloud.material;

			let panel = $(`
			<div class="scene_content selectable">
				<ul class="pv-menu-list">

				<li>
				<span data-i18n="appearance.point_size"></span>:&nbsp;<span id="lblPointSize"></span> <div id="sldPointSize"></div>
				</li>
				<li>
				<span data-i18n="appearance.min_point_size"></span>:&nbsp;<span id="lblMinPointSize"></span> <div id="sldMinPointSize"></div>
				</li>

				<!-- SIZE TYPE -->
				<li>
					<label for="optPointSizing" class="pv-select-label" data-i18n="appearance.point_size_type">Point Sizing </label>
					<select id="optPointSizing" name="optPointSizing">
						<option>FIXED</option>
						<option>ATTENUATED</option>
						<option>ADAPTIVE</option>
					</select>
				</li>

				<!-- SHAPE -->
				<li>
					<label for="optShape" class="pv-select-label" data-i18n="appearance.point_shape"></label><br>
					<select id="optShape" name="optShape">
						<option>SQUARE</option>
						<option>CIRCLE</option>
						<option>PARABOLOID</option>
					</select>
				</li>

				<li id="materials_backface_container">
				<label><input id="set_backface_culling" type="checkbox" /><span data-i18n="appearance.backface_culling"></span></label>
				</li>
				
				<!-- OPACITY -->
				<li><span data-i18n="appearance.point_opacity"></span>:<span id="lblOpacity"></span><div id="sldOpacity"></div></li>

				<div class="divider">
					<span>Attribute</span>
				</div>

				<li>
					<select id="optMaterial" name="optMaterial"></select>
				</li>

				<div id="materials.composite_weight_container">
					<div class="divider">
						<span>Attribute Weights</span>
					</div>

					<li>RGB: <span id="lblWeightRGB"></span> <div id="sldWeightRGB"></div>	</li>
					<li>Intensity: <span id="lblWeightIntensity"></span> <div id="sldWeightIntensity"></div>	</li>
					<li>Elevation: <span id="lblWeightElevation"></span> <div id="sldWeightElevation"></div>	</li>
					<li>Classification: <span id="lblWeightClassification"></span> <div id="sldWeightClassification"></div>	</li>
					<li>Return Number: <span id="lblWeightReturnNumber"></span> <div id="sldWeightReturnNumber"></div>	</li>
					<li>Source ID: <span id="lblWeightSourceID"></span> <div id="sldWeightSourceID"></div>	</li>
				</div>

				<div id="materials.rgb_container">
					<div class="divider">
						<span>RGB</span>
					</div>

					<li>Gamma: <span id="lblRGBGamma"></span> <div id="sldRGBGamma"></div>	</li>
					<li>Brightness: <span id="lblRGBBrightness"></span> <div id="sldRGBBrightness"></div>	</li>
					<li>Contrast: <span id="lblRGBContrast"></span> <div id="sldRGBContrast"></div>	</li>
				</div>

				<div id="materials.extra_container">
					<div class="divider">
						<span>Extra Attribute</span>
					</div>

					<li><span data-i18n="appearance.extra_range"></span>: <span id="lblExtraRange"></span> <div id="sldExtraRange"></div></li>

					<li>Gamma: <span id="lblExtraGamma"></span> <div id="sldExtraGamma"></div></li>
					<li>Brightness: <span id="lblExtraBrightness"></span> <div id="sldExtraBrightness"></div></li>
					<li>Contrast: <span id="lblExtraContrast"></span> <div id="sldExtraContrast"></div></li>
				</div>
				
				<div id="materials.matcap_container">
					<div class="divider">
						<span>MATCAP</span>
					</div>

					<li>
						<div id="matcap_scheme_selection" style="display: flex; flex-wrap: wrap;"> </div>
					</li>
				</div>

				<div id="materials.color_container">
					<div class="divider">
						<span>Color</span>
					</div>

					<input id="materials.color.picker" />
				</div>


				<div id="materials.elevation_container">
					<div class="divider">
						<span>Elevation</span>
					</div>

					<li><span data-i18n="appearance.elevation_range"></span>: <span id="lblHeightRange"></span> <div id="sldHeightRange"></div>	</li>

					<li>
						<selectgroup id="gradient_repeat_option">
							<option id="gradient_repeat_clamp" value="CLAMP">Clamp</option>
							<option id="gradient_repeat_repeat" value="REPEAT">Repeat</option>
							<option id="gradient_repeat_mirrored_repeat" value="MIRRORED_REPEAT">Mirrored Repeat</option>
						</selectgroup>
					</li>

					<li>
						<span>Gradient Scheme:</span>
						<div id="elevation_gradient_scheme_selection" style="display: flex; padding: 1em 0em">
						</div>
					</li>
				</div>

				<div id="materials.transition_container">
					<div class="divider">
						<span>Transition</span>
					</div>

					<li>transition: <span id="lblTransition"></span> <div id="sldTransition"></div>	</li>
				</div>

				<div id="materials.intensity_container">
					<div class="divider">
						<span>Intensity</span>
					</div>

					<li>Range: <span id="lblIntensityRange"></span> <div id="sldIntensityRange"></div>	</li>
					<li>Gamma: <span id="lblIntensityGamma"></span> <div id="sldIntensityGamma"></div>	</li>
					<li>Brightness: <span id="lblIntensityBrightness"></span> <div id="sldIntensityBrightness"></div>	</li>
					<li>Contrast: <span id="lblIntensityContrast"></span> <div id="sldIntensityContrast"></div>	</li>
				</div>

				<div id="materials.gpstime_container">
					<div class="divider">
						<span>GPS Time</span>
					</div>

				</div>
				
				<div id="materials.index_container">
					<div class="divider">
						<span>Indices</span>
					</div>
				</div>


				</ul>
			</div>
		`);

			panel.i18n();
			this.container.append(panel);

			{ // POINT SIZE
				let sldPointSize = panel.find(`#sldPointSize`);
				let lblPointSize = panel.find(`#lblPointSize`);

				sldPointSize.slider({
					value: material.size,
					min: 0,
					max: 3,
					step: 0.01,
					slide: function (event, ui) { material.size = ui.value; }
				});

				let update = (e) => {
					lblPointSize.html(material.size.toFixed(2));
					sldPointSize.slider({value: material.size});
				};
				this.addVolatileListener(material, "point_size_changed", update);
				
				update();
			}

			{ // MINIMUM POINT SIZE
				let sldMinPointSize = panel.find(`#sldMinPointSize`);
				let lblMinPointSize = panel.find(`#lblMinPointSize`);

				sldMinPointSize.slider({
					value: material.size,
					min: 0,
					max: 3,
					step: 0.01,
					slide: function (event, ui) { material.minSize = ui.value; }
				});

				let update = (e) => {
					lblMinPointSize.html(material.minSize.toFixed(2));
					sldMinPointSize.slider({value: material.minSize});
				};
				this.addVolatileListener(material, "point_size_changed", update);
				
				update();
			}

			{ // POINT SIZING
				let strSizeType = Object.keys(PointSizeType)[material.pointSizeType];

				let opt = panel.find(`#optPointSizing`);
				opt.selectmenu();
				opt.val(strSizeType).selectmenu('refresh');

				opt.selectmenu({
					change: (event, ui) => {
						material.pointSizeType = PointSizeType[ui.item.value];
					}
				});
			}

			{ // SHAPE
				let opt = panel.find(`#optShape`);

				opt.selectmenu({
					change: (event, ui) => {
						let value = ui.item.value;

						material.shape = PointShape[value];
					}
				});

				let update = () => {
					let typename = Object.keys(PointShape)[material.shape];

					opt.selectmenu().val(typename).selectmenu('refresh');
				};
				this.addVolatileListener(material, "point_shape_changed", update);

				update();
			}

			{ // BACKFACE CULLING
				
				let opt = panel.find(`#set_backface_culling`);
				opt.click(() => {
					material.backfaceCulling = opt.prop("checked");
				});
				let update = () => {
					let value = material.backfaceCulling;
					opt.prop("checked", value);
				};
				this.addVolatileListener(material, "backface_changed", update);
				update();

				let blockBackface = $('#materials_backface_container');
				blockBackface.css('display', 'none');

				const pointAttributes = pointcloud.pcoGeometry.pointAttributes;
				const hasNormals = pointAttributes.hasNormals ? pointAttributes.hasNormals() : false;
				if(hasNormals) {
					blockBackface.css('display', 'block');
				}
				/*
				opt.checkboxradio({
					clicked: (event, ui) => {
						// let value = ui.item.value;
						let value = ui.item.checked;
						console.log(value);
						material.backfaceCulling = value; // $('#set_freeze').prop("checked");
					}
				});
				*/
			}

			{ // OPACITY
				let sldOpacity = panel.find(`#sldOpacity`);
				let lblOpacity = panel.find(`#lblOpacity`);

				sldOpacity.slider({
					value: material.opacity,
					min: 0,
					max: 1,
					step: 0.001,
					slide: function (event, ui) { 
						material.opacity = ui.value;
					}
				});

				let update = (e) => {
					lblOpacity.html(material.opacity.toFixed(2));
					sldOpacity.slider({value: material.opacity});
				};
				this.addVolatileListener(material, "opacity_changed", update);

				update();
			}

			{

				const attributes = pointcloud.pcoGeometry.pointAttributes.attributes;

				let options = [];

				options.push(...attributes.map(a => a.name));

				const intensityIndex = options.indexOf("intensity");
				if(intensityIndex >= 0){
					options.splice(intensityIndex + 1, 0, "intensity gradient");
				}

				options.push(
					"elevation",
					"color",
					'matcap',
					'indices',
					'level of detail',
					'composite'
				);

				const blacklist = [
					"POSITION_CARTESIAN",
					"position",
				];

				options = options.filter(o => !blacklist.includes(o));

				let attributeSelection = panel.find('#optMaterial');
				for(let option of options){
					let elOption = $(`<option>${option}</option>`);
					attributeSelection.append(elOption);
				}

				let updateMaterialPanel = (event, ui) => {
					let selectedValue = attributeSelection.selectmenu().val();
					material.activeAttributeName = selectedValue;

					let attribute = pointcloud.getAttribute(selectedValue);

					if(selectedValue === "intensity gradient"){
						attribute = pointcloud.getAttribute("intensity");
					}

					const isIntensity = attribute ? ["intensity", "intensity gradient"].includes(attribute.name) : false;

					if(isIntensity){
						if(pointcloud.material.intensityRange[0] === Infinity){
							pointcloud.material.intensityRange = attribute.range;
						}

						const [min, max] = attribute.range;

						panel.find('#sldIntensityRange').slider({
							range: true,
							min: min, max: max, step: 0.01,
							values: [min, max],
							slide: (event, ui) => {
								let min = ui.values[0];
								let max = ui.values[1];
								material.intensityRange = [min, max];
							}
						});
					} else if(attribute){
						const [min, max] = attribute.range;

						let selectedRange = material.getRange(attribute.name);

						if(!selectedRange){
							selectedRange = [...attribute.range];
						}

						let minMaxAreNumbers = typeof min === "number" && typeof max === "number";

						if(minMaxAreNumbers){
							panel.find('#sldExtraRange').slider({
								range: true,
								min: min, 
								max: max, 
								step: 0.01,
								values: selectedRange,
								slide: (event, ui) => {
									let [a, b] = ui.values;

									material.setRange(attribute.name, [a, b]);
								}
							});
						}

					}

					let blockWeights = $('#materials\\.composite_weight_container');
					let blockElevation = $('#materials\\.elevation_container');
					let blockRGB = $('#materials\\.rgb_container');
					let blockExtra = $('#materials\\.extra_container');
					let blockColor = $('#materials\\.color_container');
					let blockIntensity = $('#materials\\.intensity_container');
					let blockIndex = $('#materials\\.index_container');
					let blockTransition = $('#materials\\.transition_container');
					let blockGps = $('#materials\\.gpstime_container');
					let blockMatcap = $('#materials\\.matcap_container');

					blockIndex.css('display', 'none');
					blockIntensity.css('display', 'none');
					blockElevation.css('display', 'none');
					blockRGB.css('display', 'none');
					blockExtra.css('display', 'none');
					blockColor.css('display', 'none');
					blockWeights.css('display', 'none');
					blockTransition.css('display', 'none');
					blockMatcap.css('display', 'none');
					blockGps.css('display', 'none');

					if (selectedValue === 'composite') {
						blockWeights.css('display', 'block');
						blockElevation.css('display', 'block');
						blockRGB.css('display', 'block');
						blockIntensity.css('display', 'block');
					} else if (selectedValue === 'elevation') {
						blockElevation.css('display', 'block');
					} else if (selectedValue === 'RGB and Elevation') {
						blockRGB.css('display', 'block');
						blockElevation.css('display', 'block');
					} else if (selectedValue === 'rgba') {
						blockRGB.css('display', 'block');
					} else if (selectedValue === 'color') {
						blockColor.css('display', 'block');
					} else if (selectedValue === 'intensity') {
						blockIntensity.css('display', 'block');
					} else if (selectedValue === 'intensity gradient') {
						blockIntensity.css('display', 'block');
					} else if (selectedValue === "indices" ){
						blockIndex.css('display', 'block');
					} else if (selectedValue === "matcap" ){
						blockMatcap.css('display', 'block');
					} else if (selectedValue === "classification" ){
						// add classification color selctor?
					} else if (selectedValue === "gps-time" ){
						blockGps.css('display', 'block');
					} else if(selectedValue === "number of returns"){
						
					} else if(selectedValue === "return number"){
						
					} else if(["source id", "point source id"].includes(selectedValue)){
						
					} else {
						blockExtra.css('display', 'block');
					}
				};

				attributeSelection.selectmenu({change: updateMaterialPanel});

				let update = () => {
					attributeSelection.val(material.activeAttributeName).selectmenu('refresh');
				};
				this.addVolatileListener(material, "point_color_type_changed", update);
				this.addVolatileListener(material, "active_attribute_changed", update);

				update();
				updateMaterialPanel();
			}

			{
				const schemes = Object.keys(Potree.Gradients).map(name => ({name: name, values: Gradients[name]}));

				let elSchemeContainer = panel.find("#elevation_gradient_scheme_selection");

				for(let scheme of schemes){
					let elScheme = $(`
					<span style="flex-grow: 1;">
					</span>
				`);

					const svg = Potree.Utils.createSvgGradient(scheme.values);
					svg.setAttributeNS(null, "class", `button-icon`);

					elScheme.append($(svg));

					elScheme.click( () => {
						material.gradient = Gradients[scheme.name];
					});

					elSchemeContainer.append(elScheme);
				}
			}

			{
				let matcaps = [
					{name: "Normals", icon: `${Potree.resourcePath}/icons/matcap/check_normal+y.jpg`}, 
					{name: "Basic 1", icon: `${Potree.resourcePath}/icons/matcap/basic_1.jpg`}, 
					{name: "Basic 2", icon: `${Potree.resourcePath}/icons/matcap/basic_2.jpg`}, 
					{name: "Basic Dark", icon: `${Potree.resourcePath}/icons/matcap/basic_dark.jpg`}, 
					{name: "Basic Side", icon: `${Potree.resourcePath}/icons/matcap/basic_side.jpg`}, 
					{name: "Ceramic Dark", icon: `${Potree.resourcePath}/icons/matcap/ceramic_dark.jpg`}, 
					{name: "Ceramic Lightbulb", icon: `${Potree.resourcePath}/icons/matcap/ceramic_lightbulb.jpg`}, 
					{name: "Clay Brown", icon: `${Potree.resourcePath}/icons/matcap/clay_brown.jpg`}, 
					{name: "Clay Muddy", icon: `${Potree.resourcePath}/icons/matcap/clay_muddy.jpg`}, 
					{name: "Clay Studio", icon: `${Potree.resourcePath}/icons/matcap/clay_studio.jpg`}, 
					{name: "Resin", icon: `${Potree.resourcePath}/icons/matcap/resin.jpg`}, 
					{name: "Skin", icon: `${Potree.resourcePath}/icons/matcap/skin.jpg`}, 
					{name: "Jade", icon: `${Potree.resourcePath}/icons/matcap/jade.jpg`}, 
					{name: "Metal_ Anisotropic", icon: `${Potree.resourcePath}/icons/matcap/metal_anisotropic.jpg`}, 
					{name: "Metal Carpaint", icon: `${Potree.resourcePath}/icons/matcap/metal_carpaint.jpg`}, 
					{name: "Metal Lead", icon: `${Potree.resourcePath}/icons/matcap/metal_lead.jpg`}, 
					{name: "Metal Shiny", icon: `${Potree.resourcePath}/icons/matcap/metal_shiny.jpg`}, 
					{name: "Pearl", icon: `${Potree.resourcePath}/icons/matcap/pearl.jpg`}, 
					{name: "Toon", icon: `${Potree.resourcePath}/icons/matcap/toon.jpg`},
					{name: "Check Rim Light", icon: `${Potree.resourcePath}/icons/matcap/check_rim_light.jpg`}, 
					{name: "Check Rim Dark", icon: `${Potree.resourcePath}/icons/matcap/check_rim_dark.jpg`}, 
					{name: "Contours 1", icon: `${Potree.resourcePath}/icons/matcap/contours_1.jpg`}, 
					{name: "Contours 2", icon: `${Potree.resourcePath}/icons/matcap/contours_2.jpg`}, 
					{name: "Contours 3", icon: `${Potree.resourcePath}/icons/matcap/contours_3.jpg`}, 
					{name: "Reflection Check Horizontal", icon: `${Potree.resourcePath}/icons/matcap/reflection_check_horizontal.jpg`}, 
					{name: "Reflection Check Vertical", icon: `${Potree.resourcePath}/icons/matcap/reflection_check_vertical.jpg`}, 
				];

				let elMatcapContainer = panel.find("#matcap_scheme_selection");

				for(let matcap of matcaps){
					let elMatcap = $(`
						<img src="${matcap.icon}" class="button-icon" style="width: 25%;" />
				`);

					elMatcap.click( () => {
						material.matcap = matcap.icon.substring(matcap.icon.lastIndexOf('/'));
					});

					elMatcapContainer.append(elMatcap);
				}
			}

			{
				panel.find('#sldRGBGamma').slider({
					value: material.rgbGamma,
					min: 0, max: 4, step: 0.01,
					slide: (event, ui) => {material.rgbGamma = ui.value;}
				});

				panel.find('#sldRGBContrast').slider({
					value: material.rgbContrast,
					min: -1, max: 1, step: 0.01,
					slide: (event, ui) => {material.rgbContrast = ui.value;}
				});

				panel.find('#sldRGBBrightness').slider({
					value: material.rgbBrightness,
					min: -1, max: 1, step: 0.01,
					slide: (event, ui) => {material.rgbBrightness = ui.value;}
				});

				panel.find('#sldExtraGamma').slider({
					value: material.extraGamma,
					min: 0, max: 4, step: 0.01,
					slide: (event, ui) => {material.extraGamma = ui.value;}
				});

				panel.find('#sldExtraBrightness').slider({
					value: material.extraBrightness,
					min: -1, max: 1, step: 0.01,
					slide: (event, ui) => {material.extraBrightness = ui.value;}
				});

				panel.find('#sldExtraContrast').slider({
					value: material.extraContrast,
					min: -1, max: 1, step: 0.01,
					slide: (event, ui) => {material.extraContrast = ui.value;}
				});

				panel.find('#sldHeightRange').slider({
					range: true,
					min: 0, max: 1000, step: 0.01,
					values: [0, 1000],
					slide: (event, ui) => {
						material.heightMin = ui.values[0];
						material.heightMax = ui.values[1];
					}
				});

				panel.find('#sldIntensityGamma').slider({
					value: material.intensityGamma,
					min: 0, max: 4, step: 0.01,
					slide: (event, ui) => {material.intensityGamma = ui.value;}
				});

				panel.find('#sldIntensityContrast').slider({
					value: material.intensityContrast,
					min: -1, max: 1, step: 0.01,
					slide: (event, ui) => {material.intensityContrast = ui.value;}
				});

				panel.find('#sldIntensityBrightness').slider({
					value: material.intensityBrightness,
					min: -1, max: 1, step: 0.01,
					slide: (event, ui) => {material.intensityBrightness = ui.value;}
				});

				panel.find('#sldWeightRGB').slider({
					value: material.weightRGB,
					min: 0, max: 1, step: 0.01,
					slide: (event, ui) => {material.weightRGB = ui.value;}
				});

				panel.find('#sldWeightIntensity').slider({
					value: material.weightIntensity,
					min: 0, max: 1, step: 0.01,
					slide: (event, ui) => {material.weightIntensity = ui.value;}
				});

				panel.find('#sldWeightElevation').slider({
					value: material.weightElevation,
					min: 0, max: 1, step: 0.01,
					slide: (event, ui) => {material.weightElevation = ui.value;}
				});

				panel.find('#sldWeightClassification').slider({
					value: material.weightClassification,
					min: 0, max: 1, step: 0.01,
					slide: (event, ui) => {material.weightClassification = ui.value;}
				});

				panel.find('#sldWeightReturnNumber').slider({
					value: material.weightReturnNumber,
					min: 0, max: 1, step: 0.01,
					slide: (event, ui) => {material.weightReturnNumber = ui.value;}
				});

				panel.find('#sldWeightSourceID').slider({
					value: material.weightSourceID,
					min: 0, max: 1, step: 0.01,
					slide: (event, ui) => {material.weightSourceID = ui.value;}
				});

				panel.find(`#materials\\.color\\.picker`).spectrum({
					flat: true,
					showInput: true,
					preferredFormat: 'rgb',
					cancelText: '',
					chooseText: 'Apply',
					color: `#${material.color.getHexString()}`,
					move: color => {
						let cRGB = color.toRgb();
						let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
						material.color = tc;
					},
					change: color => {
						let cRGB = color.toRgb();
						let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
						material.color = tc;
					}
				});

				this.addVolatileListener(material, "color_changed", () => {
					panel.find(`#materials\\.color\\.picker`)
						.spectrum('set', `#${material.color.getHexString()}`);
				});

				let updateHeightRange = function () {
					

					let aPosition = pointcloud.getAttribute("position");

					let bMin, bMax;

					if(aPosition){
						// for new format 2.0 and loader that contain precomputed min/max of attributes
						let min = aPosition.range[0][2];
						let max = aPosition.range[1][2];
						let width = max - min;

						bMin = min - 0.2 * width;
						bMax = max + 0.2 * width;
					}else {
						// for format up until exlusive 2.0
						let box = [pointcloud.pcoGeometry.tightBoundingBox, pointcloud.getBoundingBoxWorld()]
							.find(v => v !== undefined);

						pointcloud.updateMatrixWorld(true);
						box = Utils.computeTransformedBoundingBox(box, pointcloud.matrixWorld);

						let bWidth = box.max.z - box.min.z;
						bMin = box.min.z - 0.2 * bWidth;
						bMax = box.max.z + 0.2 * bWidth;
					}

					let range = material.elevationRange;

					panel.find('#lblHeightRange').html(`${range[0].toFixed(2)} to ${range[1].toFixed(2)}`);
					panel.find('#sldHeightRange').slider({min: bMin, max: bMax, values: range});
				};

				let updateExtraRange = function () {

					let attributeName = material.activeAttributeName;
					let attribute = pointcloud.getAttribute(attributeName);

					if(attribute == null){
						return;
					}
					
					let range = material.getRange(attributeName);

					if(range == null){
						range = attribute.range;
					}

					// currently only supporting scalar ranges.
					// rgba, normals, positions, etc have vector ranges, however
					let isValidRange = (typeof range[0] === "number") && (typeof range[1] === "number");
					if(!isValidRange){
						return;
					}

					if(range){
						let msg = `${range[0].toFixed(2)} to ${range[1].toFixed(2)}`;
						panel.find('#lblExtraRange').html(msg);
					}else {
						panel.find("could not deduce range");
					}
				};

				let updateIntensityRange = function () {
					let range = material.intensityRange;

					panel.find('#lblIntensityRange').html(`${parseInt(range[0])} to ${parseInt(range[1])}`);
				};

				{
					updateHeightRange();
					panel.find(`#sldHeightRange`).slider('option', 'min');
					panel.find(`#sldHeightRange`).slider('option', 'max');
				}

				{
					let elGradientRepeat = panel.find("#gradient_repeat_option");
					elGradientRepeat.selectgroup({title: "Gradient"});

					elGradientRepeat.find("input").click( (e) => {
						this.viewer.setElevationGradientRepeat(ElevationGradientRepeat[e.target.value]);
					});

					let current = Object.keys(ElevationGradientRepeat)
						.filter(key => ElevationGradientRepeat[key] === this.viewer.elevationGradientRepeat);
					elGradientRepeat.find(`input[value=${current}]`).trigger("click");
				}

				let onIntensityChange = () => {
					let gamma = material.intensityGamma;
					let contrast = material.intensityContrast;
					let brightness = material.intensityBrightness;

					updateIntensityRange();

					panel.find('#lblIntensityGamma').html(gamma.toFixed(2));
					panel.find('#lblIntensityContrast').html(contrast.toFixed(2));
					panel.find('#lblIntensityBrightness').html(brightness.toFixed(2));

					panel.find('#sldIntensityGamma').slider({value: gamma});
					panel.find('#sldIntensityContrast').slider({value: contrast});
					panel.find('#sldIntensityBrightness').slider({value: brightness});
				};

				let onRGBChange = () => {
					let gamma = material.rgbGamma;
					let contrast = material.rgbContrast;
					let brightness = material.rgbBrightness;

					panel.find('#lblRGBGamma').html(gamma.toFixed(2));
					panel.find('#lblRGBContrast').html(contrast.toFixed(2));
					panel.find('#lblRGBBrightness').html(brightness.toFixed(2));

					panel.find('#sldRGBGamma').slider({value: gamma});
					panel.find('#sldRGBContrast').slider({value: contrast});
					panel.find('#sldRGBBrightness').slider({value: brightness});
				};

				this.addVolatileListener(material, "material_property_changed", updateExtraRange);
				this.addVolatileListener(material, "material_property_changed", updateHeightRange);
				this.addVolatileListener(material, "material_property_changed", onIntensityChange);
				this.addVolatileListener(material, "material_property_changed", onRGBChange);

				updateExtraRange();
				updateHeightRange();
				onIntensityChange();
				onRGBChange();
			}

		}

		

		setMeasurement(object){

			let TYPE = {
				DISTANCE: {panel: DistancePanel},
				AREA: {panel: AreaPanel},
				POINT: {panel: PointPanel},
				ANGLE: {panel: AnglePanel},
				HEIGHT: {panel: HeightPanel},
				PROFILE: {panel: ProfilePanel},
				VOLUME: {panel: VolumePanel},
				CIRCLE: {panel: CirclePanel},
				OTHER: {panel: PointPanel},
			};

			let getType = (measurement) => {
				if (measurement instanceof Measure) {
					if (measurement.showDistances && !measurement.showArea && !measurement.showAngles) {
						return TYPE.DISTANCE;
					} else if (measurement.showDistances && measurement.showArea && !measurement.showAngles) {
						return TYPE.AREA;
					} else if (measurement.maxMarkers === 1) {
						return TYPE.POINT;
					} else if (!measurement.showDistances && !measurement.showArea && measurement.showAngles) {
						return TYPE.ANGLE;
					} else if (measurement.showHeight) {
						return TYPE.HEIGHT;
					} else if (measurement.showCircle) {
						return TYPE.CIRCLE;
					} else {
						return TYPE.OTHER;
					}
				} else if (measurement instanceof Profile) {
					return TYPE.PROFILE;
				} else if (measurement instanceof Volume) {
					return TYPE.VOLUME;
				}
			};

			//this.container.html("measurement");

			let type = getType(object);
			let Panel = type.panel;

			let panel = new Panel(this.viewer, object, this);
			this.container.append(panel.elContent);
		}

		setCamera(camera){
			let panel = new CameraPanel(this.viewer, this);
			this.container.append(panel.elContent);
		}

		setAnnotation(annotation){
			let panel = new AnnotationPanel(this.viewer, this, annotation);
			this.container.append(panel.elContent);
		}

		setCameraAnimation(animation){
			let panel = new CameraAnimationPanel(this.viewer, this, animation);
			this.container.append(panel.elContent);
		}

	}

	function addCommas(nStr){
		nStr += '';
		let x = nStr.split('.');
		let x1 = x[0];
		let x2 = x.length > 1 ? '.' + x[1] : '';
		let rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	};

	function format(value){
		return addCommas(value.toFixed(3));
	};

	class HierarchicalSlider{

		constructor(params = {}){
			
			this.element = document.createElement("div");

			this.labels = [];
			this.sliders = [];
			this.range = params.range != null ? params.range : [0, 1];
			this.slide = params.slide != null ? params.slide : null;
			this.step = params.step != null ? params.step : 0.0001;

			let levels = params.levels != null ? params.levels : 1;

			for(let level = 0; level < levels; level++){
				this.addLevel();
			}

		}

		setRange(range){
			this.range = [...range];

			{ // root slider
				let slider = this.sliders[0];

				$(slider).slider({
					min: range[0],
					max: range[1],
				});
			}

			for(let i = 1; i < this.sliders.length; i++){
				let parentSlider = this.sliders[i - 1];
				let slider = this.sliders[i];

				let parentValues = $(parentSlider).slider("option", "values");
				let childRange = [...parentValues];

				$(slider).slider({
					min: childRange[0],
					max: childRange[1],
				});
			}
			
			this.updateLabels();
		}

		setValues(values){
			for(let slider of this.sliders){
				$(slider).slider({
					values: [...values],
				});
			}

			this.updateLabels();
		}

		addLevel(){
			const elLevel = document.createElement("li");
			const elRange = document.createTextNode("Range: ");
			const label = document.createElement("span");
			const slider = document.createElement("div");

			let level = this.sliders.length;
			let [min, max] = [0, 0];

			if(this.sliders.length === 0){
				[min, max] = this.range;
			}else {
				let parentSlider = this.sliders[this.sliders.length - 1];
				[min, max] = $(parentSlider).slider("option", "values");
			}
			
			$(slider).slider({
				range: true, 
				min: min, 
				max: max,
				step: this.step,
				values: [min, max],
				slide: (event, ui) => {
					
					// set all descendants to same range
					let levels = this.sliders.length;
					for(let i = level + 1; i < levels; i++){
						let descendant = this.sliders[i];

						$(descendant).slider({
							range: true,
							min: ui.values[0],
							max: ui.values[1],
							values: [...ui.values],
						});
					}

					if(this.slide){
						let values = [...ui.values];

						this.slide({
							target: this, 
							range: this.range,
							values: values,
						});
					}

					this.updateLabels();
				},
			});

			elLevel.append(elRange, label, slider);

			this.sliders.push(slider);
			this.labels.push(label);
			this.element.append(elLevel);

			this.updateLabels();
		}

		removeLevel(){

		}

		updateSliders(){

		}

		updateLabels(){

			let levels = this.sliders.length;

			for(let i = 0; i < levels; i++){

				let slider = this.sliders[i];
				let label = this.labels[i];

				let [min, max] = $(slider).slider("option", "values");
				let strMin = format(min);
				let strMax = format(max);
				let strLabel = `${strMin} to ${strMax}`;

				label.innerHTML = strLabel;
			}

		}


	}

	class OrientedImageControls extends EventDispatcher{
		
		constructor(viewer){
			super();
			
			this.viewer = viewer;
			this.renderer = viewer.renderer;

			this.originalCam = viewer.scene.getActiveCamera();
			this.shearCam = viewer.scene.getActiveCamera().clone();
			this.shearCam.rotation.set(this.originalCam.rotation.toArray());
			this.shearCam.updateProjectionMatrix();
			this.shearCam.updateProjectionMatrix = () => {
				return this.shearCam.projectionMatrix;
			};

			this.image = null;

			this.fadeFactor = 20;
			this.fovDelta = 0;

			this.fovMin = 0.1;
			this.fovMax = 120;

			this.shear = [0, 0];

			// const style = ``;
			this.elUp =    $(`<input type="button" value="🡅" style="position: absolute; top: 10px; left: calc(50%); z-index: 1000" />`);
			this.elRight = $(`<input type="button" value="🡆" style="position: absolute; top: calc(50%); right: 10px; z-index: 1000" />`);
			this.elDown =  $(`<input type="button" value="🡇" style="position: absolute; bottom: 10px; left: calc(50%); z-index: 1000" />`);
			this.elLeft =  $(`<input type="button" value="🡄" style="position: absolute; top: calc(50%); left: 10px; z-index: 1000" />`);
			this.elExit = $(`<input type="button" value="Back to 3D view" style="position: absolute; bottom: 10px; right: 10px; z-index: 1000" />`);

			this.elExit.click( () => {
				this.release();
			});

			this.elUp.click(() => {
				const fovY = viewer.getFOV();
				const top = Math.tan(THREE.Math.degToRad(fovY / 2));
				this.shear[1] += 0.1 * top;
			});

			this.elRight.click(() => {
				const fovY = viewer.getFOV();
				const top = Math.tan(THREE.Math.degToRad(fovY / 2));
				this.shear[0] += 0.1 * top;
			});

			this.elDown.click(() => {
				const fovY = viewer.getFOV();
				const top = Math.tan(THREE.Math.degToRad(fovY / 2));
				this.shear[1] -= 0.1 * top;
			});

			this.elLeft.click(() => {
				const fovY = viewer.getFOV();
				const top = Math.tan(THREE.Math.degToRad(fovY / 2));
				this.shear[0] -= 0.1 * top;
			});

			this.scene = null;
			this.sceneControls = new THREE.Scene();

			let scroll = (e) => {
				this.fovDelta += -e.delta * 1.0;
			};

			this.addEventListener('mousewheel', scroll);
			//this.addEventListener("mousemove", onMove);
		}

		hasSomethingCaptured(){
			return this.image !== null;
		}

		capture(image){
			if(this.hasSomethingCaptured()){
				return;
			}

			this.image = image;

			this.originalFOV = this.viewer.getFOV();
			this.originalControls = this.viewer.getControls();

			this.viewer.setControls(this);
			this.viewer.scene.overrideCamera = this.shearCam;

			const elCanvas = this.viewer.renderer.domElement;
			const elRoot = $(elCanvas.parentElement);

			this.shear = [0, 0];


			elRoot.append(this.elUp);
			elRoot.append(this.elRight);
			elRoot.append(this.elDown);
			elRoot.append(this.elLeft);
			elRoot.append(this.elExit);
		}

		release(){
			this.image = null;

			this.viewer.scene.overrideCamera = null;

			this.elUp.detach();
			this.elRight.detach();
			this.elDown.detach();
			this.elLeft.detach();
			this.elExit.detach();

			this.viewer.setFOV(this.originalFOV);
			this.viewer.setControls(this.originalControls);
		}

		setScene (scene) {
			this.scene = scene;
		}

		update (delta) {
			// const view = this.scene.view;

			// let prevTotal = this.shearCam.projectionMatrix.elements.reduce( (a, i) => a + i, 0);

			//const progression = Math.min(1, this.fadeFactor * delta);
			//const attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			const progression = 1;
			const attenuation = 0;

			const oldFov = this.viewer.getFOV();
			let fovProgression =  progression * this.fovDelta;
			let newFov = oldFov * ((1 + fovProgression / 10));

			newFov = Math.max(this.fovMin, newFov);
			newFov = Math.min(this.fovMax, newFov);

			let diff = newFov / oldFov;

			const mouse = this.viewer.inputHandler.mouse;
			const canvasSize = this.viewer.renderer.getSize(new THREE.Vector2());
			const uv = [
				(mouse.x / canvasSize.x),
				((canvasSize.y - mouse.y) / canvasSize.y)
			];

			const fovY = newFov;
			const aspect = canvasSize.x / canvasSize.y;
			const top = Math.tan(THREE.Math.degToRad(fovY / 2));
			const height = 2 * top;
			const width = aspect * height;

			const shearRangeX = [
				this.shear[0] - 0.5 * width,
				this.shear[0] + 0.5 * width,
			];

			const shearRangeY = [
				this.shear[1] - 0.5 * height,
				this.shear[1] + 0.5 * height,
			];

			const shx = (1 - uv[0]) * shearRangeX[0] + uv[0] * shearRangeX[1];
			const shy = (1 - uv[1]) * shearRangeY[0] + uv[1] * shearRangeY[1];

			const shu = (1 - diff);

			const newShear =  [
				(1 - shu) * this.shear[0] + shu * shx,
				(1 - shu) * this.shear[1] + shu * shy,
			];
			
			this.shear = newShear;
			this.viewer.setFOV(newFov);
			
			const {originalCam, shearCam} = this;

			originalCam.fov = newFov;
			originalCam.updateMatrixWorld();
			originalCam.updateProjectionMatrix();
			shearCam.copy(originalCam);
			shearCam.rotation.set(...originalCam.rotation.toArray());

			shearCam.updateMatrixWorld();
			shearCam.projectionMatrix.copy(originalCam.projectionMatrix);

			const [sx, sy] = this.shear;
			const mShear = new THREE.Matrix4().set(
				1, 0, sx, 0,
				0, 1, sy, 0,
				0, 0, 1, 0,
				0, 0, 0, 1,
			);

			const proj = shearCam.projectionMatrix;
			proj.multiply(mShear);
			shearCam.projectionMatrixInverse.getInverse( proj );

			let total = shearCam.projectionMatrix.elements.reduce( (a, i) => a + i, 0);

			this.fovDelta *= attenuation;
		}
	};

	// https://support.pix4d.com/hc/en-us/articles/205675256-How-are-yaw-pitch-roll-defined
	// https://support.pix4d.com/hc/en-us/articles/202558969-How-are-omega-phi-kappa-defined

	function createMaterial(){

		let vertexShader = `
	uniform float uNear;
	varying vec2 vUV;
	varying vec4 vDebug;
	
	void main(){
		vDebug = vec4(0.0, 1.0, 0.0, 1.0);
		vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
		// make sure that this mesh is at least in front of the near plane
		modelViewPosition.xyz += normalize(modelViewPosition.xyz) * uNear;
		gl_Position = projectionMatrix * modelViewPosition;
		vUV = uv;
	}
	`;

		let fragmentShader = `
	uniform sampler2D tColor;
	uniform float uOpacity;
	varying vec2 vUV;
	varying vec4 vDebug;
	void main(){
		vec4 color = texture2D(tColor, vUV);
		gl_FragColor = color;
		gl_FragColor.a = uOpacity;
	}
	`;
		const material = new THREE.ShaderMaterial( {
			uniforms: {
				// time: { value: 1.0 },
				// resolution: { value: new THREE.Vector2() }
				tColor: {value: new THREE.Texture() },
				uNear: {value: 0.0},
				uOpacity: {value: 1.0},
			},
			vertexShader: vertexShader,
			fragmentShader: fragmentShader,
			side: THREE.DoubleSide,
		} );

		material.side = THREE.DoubleSide;

		return material;
	}

	const planeGeometry = new THREE.PlaneGeometry(1, 1);
	const lineGeometry = new THREE.Geometry();

	lineGeometry.vertices.push(
		new THREE.Vector3(-0.5, -0.5, 0),
		new THREE.Vector3( 0.5, -0.5, 0),
		new THREE.Vector3( 0.5,  0.5, 0),
		new THREE.Vector3(-0.5,  0.5, 0),
		new THREE.Vector3(-0.5, -0.5, 0),
	);

	class OrientedImage{

		constructor(id){

			this.id = id;
			this.fov = 1.0;
			this.position = new THREE.Vector3();
			this.rotation = new THREE.Vector3();
			this.width = 0;
			this.height = 0;
			this.fov = 1.0;

			const material = createMaterial();
			const lineMaterial = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
			this.mesh = new THREE.Mesh(planeGeometry, material);
			this.line = new THREE.Line(lineGeometry, lineMaterial);
			this.texture = null;

			this.mesh.orientedImage = this;
		}

		set(position, rotation, dimension, fov){

			let radians = rotation.map(THREE.Math.degToRad);

			this.position.set(...position);
			this.mesh.position.set(...position);

			this.rotation.set(...radians);
			this.mesh.rotation.set(...radians);

			[this.width, this.height] = dimension;
			this.mesh.scale.set(this.width / this.height, 1, 1);

			this.fov = fov;

			this.updateTransform();
		}

		updateTransform(){
			let {mesh, line, fov} = this;

			mesh.updateMatrixWorld();
			const dir = mesh.getWorldDirection();
			const alpha = THREE.Math.degToRad(fov / 2);
			const d = -0.5 / Math.tan(alpha);
			const move = dir.clone().multiplyScalar(d);
			mesh.position.add(move);

			line.position.copy(mesh.position);
			line.scale.copy(mesh.scale);
			line.rotation.copy(mesh.rotation);
		}

	};

	class OrientedImages extends EventDispatcher{

		constructor(){
			super();

			this.node = null;
			this.cameraParams = null;
			this.imageParams = null;
			this.images = null;
			this._visible = true;
		}

		set visible(visible){
			if(this._visible === visible){
				return;
			}

			for(const image of this.images){
				image.mesh.visible = visible;
				image.line.visible = visible;
			}

			this._visible = visible;
			this.dispatchEvent({
				type: "visibility_changed",
				images: this,
			});
		}

		get visible(){
			return this._visible;
		}


	};

	class OrientedImageLoader{

		static async loadCameraParams(path){
			const res = await fetch(path);
			const text = await res.text();

			const parser = new DOMParser();
			const doc = parser.parseFromString(text, "application/xml");

			const width = parseInt(doc.getElementsByTagName("width")[0].textContent);
			const height = parseInt(doc.getElementsByTagName("height")[0].textContent);
			const f = parseFloat(doc.getElementsByTagName("f")[0].textContent);

			let a = (height / 2)  / f;
			let fov = 2 * THREE.Math.radToDeg(Math.atan(a));

			const params = {
				path: path,
				width: width,
				height: height,
				f: f,
				fov: fov,
			};

			return params;
		}

		static async loadImageParams(path){

			const response = await fetch(path);
			if(!response.ok){
				console.error(`failed to load ${path}`);
				return;
			}

			const content = await response.text();
			const lines = content.split(/\r?\n/);
			const imageParams = [];

			for(let i = 1; i < lines.length; i++){
				const line = lines[i];

				if(line.startsWith("#")){
					continue;
				}

				const tokens = line.split(/\s+/);

				if(tokens.length < 6){
					continue;
				}

				const params = {
					id: tokens[0],
					x: Number.parseFloat(tokens[1]),
					y: Number.parseFloat(tokens[2]),
					z: Number.parseFloat(tokens[3]),
					omega: Number.parseFloat(tokens[4]),
					phi: Number.parseFloat(tokens[5]),
					kappa: Number.parseFloat(tokens[6]),
				};

				// const whitelist = ["47518.jpg"];
				// if(whitelist.includes(params.id)){
				// 	imageParams.push(params);
				// }
				imageParams.push(params);
			}

			// debug
			//return [imageParams[50]];

			return imageParams;
		}

		static async load(cameraParamsPath, imageParamsPath, viewer){

			const tStart = performance.now();

			const [cameraParams, imageParams] = await Promise.all([
				OrientedImageLoader.loadCameraParams(cameraParamsPath),
				OrientedImageLoader.loadImageParams(imageParamsPath),
			]);

			const orientedImageControls = new OrientedImageControls(viewer);
			const raycaster = new THREE.Raycaster();

			const tEnd = performance.now();
			console.log(tEnd - tStart);

			// const sp = new THREE.PlaneGeometry(1, 1);
			// const lg = new THREE.Geometry();

			// lg.vertices.push(
			// 	new THREE.Vector3(-0.5, -0.5, 0),
			// 	new THREE.Vector3( 0.5, -0.5, 0),
			// 	new THREE.Vector3( 0.5,  0.5, 0),
			// 	new THREE.Vector3(-0.5,  0.5, 0),
			// 	new THREE.Vector3(-0.5, -0.5, 0),
			// );

			const {width, height} = cameraParams;
			const orientedImages = [];
			const sceneNode = new THREE.Object3D();
			sceneNode.name = "oriented_images";

			for(const params of imageParams){

				// const material = createMaterial();
				// const lm = new THREE.LineBasicMaterial( { color: 0x00ff00 } );
				// const mesh = new THREE.Mesh(sp, material);

				const {x, y, z, omega, phi, kappa} = params;
				// const [rx, ry, rz] = [omega, phi, kappa]
				// 	.map(THREE.Math.degToRad);
				
				// mesh.position.set(x, y, z);
				// mesh.scale.set(width / height, 1, 1);
				// mesh.rotation.set(rx, ry, rz);
				// {
				// 	mesh.updateMatrixWorld();
				// 	const dir = mesh.getWorldDirection();
				// 	const alpha = THREE.Math.degToRad(cameraParams.fov / 2);
				// 	const d = -0.5 / Math.tan(alpha);
				// 	const move = dir.clone().multiplyScalar(d);
				// 	mesh.position.add(move);
				// }
				// sceneNode.add(mesh);

				// const line = new THREE.Line(lg, lm);
				// line.position.copy(mesh.position);
				// line.scale.copy(mesh.scale);
				// line.rotation.copy(mesh.rotation);
				// sceneNode.add(line);

				let orientedImage = new OrientedImage(params.id);
				// orientedImage.setPosition(x, y, z);
				// orientedImage.setRotation(omega, phi, kappa);
				// orientedImage.setDimension(width, height);
				let position = [x, y, z];
				let rotation = [omega, phi, kappa];
				let dimension = [width, height];
				orientedImage.set(position, rotation, dimension, cameraParams.fov);

				sceneNode.add(orientedImage.mesh);
				sceneNode.add(orientedImage.line);
				
				orientedImages.push(orientedImage);
			}

			let hoveredElement = null;
			let clipVolume = null;

			const onMouseMove = (evt) => {
				const tStart = performance.now();
				if(hoveredElement){
					hoveredElement.line.material.color.setRGB(0, 1, 0);
				}
				evt.preventDefault();

				//var array = getMousePosition( container, evt.clientX, evt.clientY );
				const rect = viewer.renderer.domElement.getBoundingClientRect();
				const [x, y] = [evt.clientX, evt.clientY];
				const array = [ 
					( x - rect.left ) / rect.width, 
					( y - rect.top ) / rect.height 
				];
				const onClickPosition = new THREE.Vector2(...array);
				//const intersects = getIntersects(onClickPosition, scene.children);
				const camera = viewer.scene.getActiveCamera();
				const mouse = new THREE.Vector3(
					+ ( onClickPosition.x * 2 ) - 1, 
					- ( onClickPosition.y * 2 ) + 1 );
				const objects = orientedImages.map(i => i.mesh);
				raycaster.setFromCamera( mouse, camera );
				const intersects = raycaster.intersectObjects( objects );
				let selectionChanged = false;

				if ( intersects.length > 0){
					//console.log(intersects);
					const intersection = intersects[0];
					const orientedImage = intersection.object.orientedImage;
					orientedImage.line.material.color.setRGB(1, 0, 0);
					selectionChanged = hoveredElement !== orientedImage;
					hoveredElement = orientedImage;
				}else {
					hoveredElement = null;
				}

				let shouldRemoveClipVolume = clipVolume !== null && hoveredElement === null;
				let shouldAddClipVolume = clipVolume === null && hoveredElement !== null;

				if(clipVolume !== null && (hoveredElement === null || selectionChanged)){
					// remove existing
					viewer.scene.removePolygonClipVolume(clipVolume);
					clipVolume = null;
				}
				
				if(shouldAddClipVolume || selectionChanged){
					const img = hoveredElement;
					const fov = cameraParams.fov;
					const aspect  = cameraParams.width / cameraParams.height;
					const near = 1.0;
					const far = 1000 * 1000;
					const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
					camera.rotation.order = viewer.scene.getActiveCamera().rotation.order;
					camera.rotation.copy(img.mesh.rotation);
					{
						const mesh = img.mesh;
						const dir = mesh.getWorldDirection();
						const pos = mesh.position;
						const alpha = THREE.Math.degToRad(fov / 2);
						const d = 0.5 / Math.tan(alpha);
						const newCamPos = pos.clone().add(dir.clone().multiplyScalar(d));
						const newCamDir = pos.clone().sub(newCamPos);
						const newCamTarget = new THREE.Vector3().addVectors(
							newCamPos,
							newCamDir.clone().multiplyScalar(viewer.getMoveSpeed()));
						camera.position.copy(newCamPos);
					}
					let volume = new Potree.PolygonClipVolume(camera);
					let m0 = new THREE.Mesh();
					let m1 = new THREE.Mesh();
					let m2 = new THREE.Mesh();
					let m3 = new THREE.Mesh();
					m0.position.set(-1, -1, 0);
					m1.position.set( 1, -1, 0);
					m2.position.set( 1,  1, 0);
					m3.position.set(-1,  1, 0);
					volume.markers.push(m0, m1, m2, m3);
					volume.initialized = true;
					
					viewer.scene.addPolygonClipVolume(volume);
					clipVolume = volume;
				}
				const tEnd = performance.now();
				//console.log(tEnd - tStart);
			};

			const moveToImage = (image) => {
				console.log("move to image " + image.id);

				const mesh = image.mesh;
				const newCamPos = image.position.clone();
				const newCamTarget = mesh.position.clone();

				viewer.scene.view.setView(newCamPos, newCamTarget, 500, () => {
					orientedImageControls.capture(image);
				});

				if(image.texture === null){

					const target = image;

					const tmpImagePath = `${Potree.resourcePath}/images/loading.jpg`;
					new THREE.TextureLoader().load(tmpImagePath,
						(texture) => {
							if(target.texture === null){
								target.texture = texture;
								target.mesh.material.uniforms.tColor.value = texture;
								mesh.material.needsUpdate = true;
							}
						}
					);

					const imagePath = `${imageParamsPath}/../${target.id}`;
					new THREE.TextureLoader().load(imagePath,
						(texture) => {
							target.texture = texture;
							target.mesh.material.uniforms.tColor.value = texture;
							mesh.material.needsUpdate = true;
						}
					);
					

				}
			};

			const onMouseClick = (evt) => {

				if(orientedImageControls.hasSomethingCaptured()){
					return;
				}

				if(hoveredElement){
					moveToImage(hoveredElement);
				}
			};
			viewer.renderer.domElement.addEventListener( 'mousemove', onMouseMove, false );
			viewer.renderer.domElement.addEventListener( 'mousedown', onMouseClick, false );

			viewer.addEventListener("update", () => {

				for(const image of orientedImages){
					const world = image.mesh.matrixWorld;
					const {width, height} = image;
					const aspect = width / height;

					const camera = viewer.scene.getActiveCamera();

					const imgPos = image.mesh.getWorldPosition(new THREE.Vector3());
					const camPos = camera.position;
					const d = camPos.distanceTo(imgPos);

					const minSize = 1; // in degrees of fov
					const a = THREE.Math.degToRad(minSize);
					let r = d * Math.tan(a);
					r = Math.max(r, 1);


					image.mesh.scale.set(r * aspect, r, 1);
					image.line.scale.set(r * aspect, r, 1);

					image.mesh.material.uniforms.uNear.value = camera.near;

				}

			});

			const images = new OrientedImages();
			images.node = sceneNode;
			images.cameraParamsPath = cameraParamsPath;
			images.imageParamsPath = imageParamsPath;
			images.cameraParams = cameraParams;
			images.imageParams = imageParams;
			images.images = orientedImages;

			Potree.debug.moveToImage = moveToImage;

			return images;
		}
	}

	let sg = new THREE.SphereGeometry(1, 8, 8);
	let sgHigh = new THREE.SphereGeometry(1, 128, 128);

	let sm = new THREE.MeshBasicMaterial({side: THREE.BackSide});
	let smHovered = new THREE.MeshBasicMaterial({side: THREE.BackSide, color: 0xff0000});

	let raycaster = new THREE.Raycaster();
	let currentlyHovered = null;

	let previousView = {
		controls: null,
		position: null,
		target: null,
	};

	class Image360{

		constructor(file, time, longitude, latitude, altitude, course, pitch, roll){
			this.file = file;
			this.time = time;
			this.longitude = longitude;
			this.latitude = latitude;
			this.altitude = altitude;
			this.course = course;
			this.pitch = pitch;
			this.roll = roll;
			this.mesh = null;
		}
	};

	class Images360 extends EventDispatcher{

		constructor(viewer){
			super();

			this.viewer = viewer;

			this.selectingEnabled = true;

			this.images = [];
			this.node = new THREE.Object3D();

			this.sphere = new THREE.Mesh(sgHigh, sm);
			this.sphere.visible = false;
			this.sphere.scale.set(1000, 1000, 1000);
			this.node.add(this.sphere);
			this._visible = true;
			// this.node.add(label);

			this.focusedImage = null;

			let elUnfocus = document.createElement("input");
			elUnfocus.type = "button";
			elUnfocus.value = "unfocus";
			elUnfocus.style.position = "absolute";
			elUnfocus.style.right = "10px";
			elUnfocus.style.bottom = "10px";
			elUnfocus.style.zIndex = "10000";
			elUnfocus.style.fontSize = "2em";
			elUnfocus.addEventListener("click", () => this.unfocus());
			this.elUnfocus = elUnfocus;

			this.domRoot = viewer.renderer.domElement.parentElement;
			this.domRoot.appendChild(elUnfocus);
			this.elUnfocus.style.display = "none";

			viewer.addEventListener("update", () => {
				this.update(viewer);
			});
			viewer.inputHandler.addInputListener(this);

			this.addEventListener("mousedown", () => {
				if(currentlyHovered){
					this.focus(currentlyHovered.image360);
				}
			});
			
		};

		set visible(visible){
			if(this._visible === visible){
				return;
			}


			for(const image of this.images){
				image.mesh.visible = visible && (this.focusedImage == null);
			}

			this.sphere.visible = visible && (this.focusedImage != null);
			this._visible = visible;
			this.dispatchEvent({
				type: "visibility_changed",
				images: this,
			});
		}

		get visible(){
			return this._visible;
		}

		focus(image360){
			if(this.focusedImage !== null){
				this.unfocus();
			}

			previousView = {
				controls: this.viewer.controls,
				position: this.viewer.scene.view.position.clone(),
				target: viewer.scene.view.getPivot(),
			};

			this.viewer.setControls(this.viewer.orbitControls);
			this.viewer.orbitControls.doubleClockZoomEnabled = false;

			for(let image of this.images){
				image.mesh.visible = false;
			}

			this.selectingEnabled = false;

			this.sphere.visible = false;

			this.load(image360).then( () => {
				this.sphere.visible = true;
				this.sphere.material.map = image360.texture;
				this.sphere.material.needsUpdate = true;
			});

			{ // orientation
				let {course, pitch, roll} = image360;
				this.sphere.rotation.set(
					THREE.Math.degToRad(+roll + 90),
					THREE.Math.degToRad(-pitch),
					THREE.Math.degToRad(-course + 90),
					"ZYX"
				);
			}

			this.sphere.position.set(...image360.position);

			let target = new THREE.Vector3(...image360.position);
			let dir = target.clone().sub(viewer.scene.view.position).normalize();
			let move = dir.multiplyScalar(0.000001);
			let newCamPos = target.clone().sub(move);

			viewer.scene.view.setView(
				newCamPos, 
				target,
				500
			);

			this.focusedImage = image360;

			this.elUnfocus.style.display = "";
		}

		unfocus(){
			this.selectingEnabled = true;

			for(let image of this.images){
				image.mesh.visible = true;
			}

			let image = this.focusedImage;

			if(image === null){
				return;
			}


			this.sphere.material.map = null;
			this.sphere.material.needsUpdate = true;
			this.sphere.visible = false;

			let pos = viewer.scene.view.position;
			let target = viewer.scene.view.getPivot();
			let dir = target.clone().sub(pos).normalize();
			let move = dir.multiplyScalar(10);
			let newCamPos = target.clone().sub(move);

			viewer.orbitControls.doubleClockZoomEnabled = true;
			viewer.setControls(previousView.controls);

			viewer.scene.view.setView(
				previousView.position, 
				previousView.target,
				500
			);


			this.focusedImage = null;

			this.elUnfocus.style.display = "none";
		}

		load(image360){

			return new Promise(resolve => {
				let texture = new THREE.TextureLoader().load(image360.file, resolve);
				texture.wrapS = THREE.RepeatWrapping;
				texture.repeat.x = -1;

				image360.texture = texture;
			});

		}

		handleHovering(){
			let mouse = viewer.inputHandler.mouse;
			let camera = viewer.scene.getActiveCamera();
			let domElement = viewer.renderer.domElement;

			let ray = Potree.Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

			// let tStart = performance.now();
			raycaster.ray.copy(ray);
			let intersections = raycaster.intersectObjects(this.node.children);

			if(intersections.length === 0){
				// label.visible = false;

				return;
			}

			let intersection = intersections[0];
			currentlyHovered = intersection.object;
			currentlyHovered.material = smHovered;

			//label.visible = true;
			//label.setText(currentlyHovered.image360.file);
			//currentlyHovered.getWorldPosition(label.position);
		}

		update(){

			let {viewer} = this;

			if(currentlyHovered){
				currentlyHovered.material = sm;
				currentlyHovered = null;
			}

			if(this.selectingEnabled){
				this.handleHovering();
			}

		}

	};


	class Images360Loader{

		static async load(url, viewer, params = {}){

			if(!params.transform){
				params.transform = {
					forward: a => a,
				};
			}
			
			let response = await fetch(`${url}/coordinates.txt`);
			let text = await response.text();

			let lines = text.split(/\r?\n/);
			let coordinateLines = lines.slice(1);

			let images360 = new Images360(viewer);

			for(let line of coordinateLines){

				if(line.trim().length === 0){
					continue;
				}

				let tokens = line.split(/\t/);

				let [filename, time, long, lat, alt, course, pitch, roll] = tokens;
				time = parseFloat(time);
				long = parseFloat(long);
				lat = parseFloat(lat);
				alt = parseFloat(alt);
				course = parseFloat(course);
				pitch = parseFloat(pitch);
				roll = parseFloat(roll);

				filename = filename.replace(/"/g, "");
				let file = `${url}/${filename}`;

				let image360 = new Image360(file, time, long, lat, alt, course, pitch, roll);

				let xy = params.transform.forward([long, lat]);
				let position = [...xy, alt];
				image360.position = position;

				images360.images.push(image360);
			}

			Images360Loader.createSceneNodes(images360, params.transform);

			return images360;

		}

		static createSceneNodes(images360, transform){

			for(let image360 of images360.images){
				let {longitude, latitude, altitude} = image360;
				let xy = transform.forward([longitude, latitude]);

				let mesh = new THREE.Mesh(sg, sm);
				mesh.position.set(...xy, altitude);
				mesh.scale.set(1, 1, 1);
				mesh.material.transparent = true;
				mesh.material.opacity = 0.75;
				mesh.image360 = image360;

				{ // orientation
					var {course, pitch, roll} = image360;
					mesh.rotation.set(
						THREE.Math.degToRad(+roll + 90),
						THREE.Math.degToRad(-pitch),
						THREE.Math.degToRad(-course + 90),
						"ZYX"
					);
				}

				images360.node.add(mesh);

				image360.mesh = mesh;
			}
		}

		

	};

	// This is a generated file. Do not edit.
	var Space_Separator = /[\u1680\u2000-\u200A\u202F\u205F\u3000]/;
	var ID_Start = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE83\uDE86-\uDE89\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/;
	var ID_Continue = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDE00-\uDE3E\uDE47\uDE50-\uDE83\uDE86-\uDE99\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/;

	var unicode = {
		Space_Separator: Space_Separator,
		ID_Start: ID_Start,
		ID_Continue: ID_Continue
	};

	var util = {
	    isSpaceSeparator (c) {
	        return typeof c === 'string' && unicode.Space_Separator.test(c)
	    },

	    isIdStartChar (c) {
	        return typeof c === 'string' && (
	            (c >= 'a' && c <= 'z') ||
	        (c >= 'A' && c <= 'Z') ||
	        (c === '$') || (c === '_') ||
	        unicode.ID_Start.test(c)
	        )
	    },

	    isIdContinueChar (c) {
	        return typeof c === 'string' && (
	            (c >= 'a' && c <= 'z') ||
	        (c >= 'A' && c <= 'Z') ||
	        (c >= '0' && c <= '9') ||
	        (c === '$') || (c === '_') ||
	        (c === '\u200C') || (c === '\u200D') ||
	        unicode.ID_Continue.test(c)
	        )
	    },

	    isDigit (c) {
	        return typeof c === 'string' && /[0-9]/.test(c)
	    },

	    isHexDigit (c) {
	        return typeof c === 'string' && /[0-9A-Fa-f]/.test(c)
	    },
	};

	let source;
	let parseState;
	let stack;
	let pos;
	let line;
	let column;
	let token;
	let key;
	let root;

	var parse = function parse (text, reviver) {
	    source = String(text);
	    parseState = 'start';
	    stack = [];
	    pos = 0;
	    line = 1;
	    column = 0;
	    token = undefined;
	    key = undefined;
	    root = undefined;

	    do {
	        token = lex();

	        // This code is unreachable.
	        // if (!parseStates[parseState]) {
	        //     throw invalidParseState()
	        // }

	        parseStates[parseState]();
	    } while (token.type !== 'eof')

	    if (typeof reviver === 'function') {
	        return internalize({'': root}, '', reviver)
	    }

	    return root
	};

	function internalize (holder, name, reviver) {
	    const value = holder[name];
	    if (value != null && typeof value === 'object') {
	        for (const key in value) {
	            const replacement = internalize(value, key, reviver);
	            if (replacement === undefined) {
	                delete value[key];
	            } else {
	                value[key] = replacement;
	            }
	        }
	    }

	    return reviver.call(holder, name, value)
	}

	let lexState;
	let buffer;
	let doubleQuote;
	let sign;
	let c;

	function lex () {
	    lexState = 'default';
	    buffer = '';
	    doubleQuote = false;
	    sign = 1;

	    for (;;) {
	        c = peek();

	        // This code is unreachable.
	        // if (!lexStates[lexState]) {
	        //     throw invalidLexState(lexState)
	        // }

	        const token = lexStates[lexState]();
	        if (token) {
	            return token
	        }
	    }
	}

	function peek () {
	    if (source[pos]) {
	        return String.fromCodePoint(source.codePointAt(pos))
	    }
	}

	function read () {
	    const c = peek();

	    if (c === '\n') {
	        line++;
	        column = 0;
	    } else if (c) {
	        column += c.length;
	    } else {
	        column++;
	    }

	    if (c) {
	        pos += c.length;
	    }

	    return c
	}

	const lexStates = {
	    default () {
	        switch (c) {
	        case '\t':
	        case '\v':
	        case '\f':
	        case ' ':
	        case '\u00A0':
	        case '\uFEFF':
	        case '\n':
	        case '\r':
	        case '\u2028':
	        case '\u2029':
	            read();
	            return

	        case '/':
	            read();
	            lexState = 'comment';
	            return

	        case undefined:
	            read();
	            return newToken('eof')
	        }

	        if (util.isSpaceSeparator(c)) {
	            read();
	            return
	        }

	        // This code is unreachable.
	        // if (!lexStates[parseState]) {
	        //     throw invalidLexState(parseState)
	        // }

	        return lexStates[parseState]()
	    },

	    comment () {
	        switch (c) {
	        case '*':
	            read();
	            lexState = 'multiLineComment';
	            return

	        case '/':
	            read();
	            lexState = 'singleLineComment';
	            return
	        }

	        throw invalidChar(read())
	    },

	    multiLineComment () {
	        switch (c) {
	        case '*':
	            read();
	            lexState = 'multiLineCommentAsterisk';
	            return

	        case undefined:
	            throw invalidChar(read())
	        }

	        read();
	    },

	    multiLineCommentAsterisk () {
	        switch (c) {
	        case '*':
	            read();
	            return

	        case '/':
	            read();
	            lexState = 'default';
	            return

	        case undefined:
	            throw invalidChar(read())
	        }

	        read();
	        lexState = 'multiLineComment';
	    },

	    singleLineComment () {
	        switch (c) {
	        case '\n':
	        case '\r':
	        case '\u2028':
	        case '\u2029':
	            read();
	            lexState = 'default';
	            return

	        case undefined:
	            read();
	            return newToken('eof')
	        }

	        read();
	    },

	    value () {
	        switch (c) {
	        case '{':
	        case '[':
	            return newToken('punctuator', read())

	        case 'n':
	            read();
	            literal('ull');
	            return newToken('null', null)

	        case 't':
	            read();
	            literal('rue');
	            return newToken('boolean', true)

	        case 'f':
	            read();
	            literal('alse');
	            return newToken('boolean', false)

	        case '-':
	        case '+':
	            if (read() === '-') {
	                sign = -1;
	            }

	            lexState = 'sign';
	            return

	        case '.':
	            buffer = read();
	            lexState = 'decimalPointLeading';
	            return

	        case '0':
	            buffer = read();
	            lexState = 'zero';
	            return

	        case '1':
	        case '2':
	        case '3':
	        case '4':
	        case '5':
	        case '6':
	        case '7':
	        case '8':
	        case '9':
	            buffer = read();
	            lexState = 'decimalInteger';
	            return

	        case 'I':
	            read();
	            literal('nfinity');
	            return newToken('numeric', Infinity)

	        case 'N':
	            read();
	            literal('aN');
	            return newToken('numeric', NaN)

	        case '"':
	        case "'":
	            doubleQuote = (read() === '"');
	            buffer = '';
	            lexState = 'string';
	            return
	        }

	        throw invalidChar(read())
	    },

	    identifierNameStartEscape () {
	        if (c !== 'u') {
	            throw invalidChar(read())
	        }

	        read();
	        const u = unicodeEscape();
	        switch (u) {
	        case '$':
	        case '_':
	            break

	        default:
	            if (!util.isIdStartChar(u)) {
	                throw invalidIdentifier()
	            }

	            break
	        }

	        buffer += u;
	        lexState = 'identifierName';
	    },

	    identifierName () {
	        switch (c) {
	        case '$':
	        case '_':
	        case '\u200C':
	        case '\u200D':
	            buffer += read();
	            return

	        case '\\':
	            read();
	            lexState = 'identifierNameEscape';
	            return
	        }

	        if (util.isIdContinueChar(c)) {
	            buffer += read();
	            return
	        }

	        return newToken('identifier', buffer)
	    },

	    identifierNameEscape () {
	        if (c !== 'u') {
	            throw invalidChar(read())
	        }

	        read();
	        const u = unicodeEscape();
	        switch (u) {
	        case '$':
	        case '_':
	        case '\u200C':
	        case '\u200D':
	            break

	        default:
	            if (!util.isIdContinueChar(u)) {
	                throw invalidIdentifier()
	            }

	            break
	        }

	        buffer += u;
	        lexState = 'identifierName';
	    },

	    sign () {
	        switch (c) {
	        case '.':
	            buffer = read();
	            lexState = 'decimalPointLeading';
	            return

	        case '0':
	            buffer = read();
	            lexState = 'zero';
	            return

	        case '1':
	        case '2':
	        case '3':
	        case '4':
	        case '5':
	        case '6':
	        case '7':
	        case '8':
	        case '9':
	            buffer = read();
	            lexState = 'decimalInteger';
	            return

	        case 'I':
	            read();
	            literal('nfinity');
	            return newToken('numeric', sign * Infinity)

	        case 'N':
	            read();
	            literal('aN');
	            return newToken('numeric', NaN)
	        }

	        throw invalidChar(read())
	    },

	    zero () {
	        switch (c) {
	        case '.':
	            buffer += read();
	            lexState = 'decimalPoint';
	            return

	        case 'e':
	        case 'E':
	            buffer += read();
	            lexState = 'decimalExponent';
	            return

	        case 'x':
	        case 'X':
	            buffer += read();
	            lexState = 'hexadecimal';
	            return
	        }

	        return newToken('numeric', sign * 0)
	    },

	    decimalInteger () {
	        switch (c) {
	        case '.':
	            buffer += read();
	            lexState = 'decimalPoint';
	            return

	        case 'e':
	        case 'E':
	            buffer += read();
	            lexState = 'decimalExponent';
	            return
	        }

	        if (util.isDigit(c)) {
	            buffer += read();
	            return
	        }

	        return newToken('numeric', sign * Number(buffer))
	    },

	    decimalPointLeading () {
	        if (util.isDigit(c)) {
	            buffer += read();
	            lexState = 'decimalFraction';
	            return
	        }

	        throw invalidChar(read())
	    },

	    decimalPoint () {
	        switch (c) {
	        case 'e':
	        case 'E':
	            buffer += read();
	            lexState = 'decimalExponent';
	            return
	        }

	        if (util.isDigit(c)) {
	            buffer += read();
	            lexState = 'decimalFraction';
	            return
	        }

	        return newToken('numeric', sign * Number(buffer))
	    },

	    decimalFraction () {
	        switch (c) {
	        case 'e':
	        case 'E':
	            buffer += read();
	            lexState = 'decimalExponent';
	            return
	        }

	        if (util.isDigit(c)) {
	            buffer += read();
	            return
	        }

	        return newToken('numeric', sign * Number(buffer))
	    },

	    decimalExponent () {
	        switch (c) {
	        case '+':
	        case '-':
	            buffer += read();
	            lexState = 'decimalExponentSign';
	            return
	        }

	        if (util.isDigit(c)) {
	            buffer += read();
	            lexState = 'decimalExponentInteger';
	            return
	        }

	        throw invalidChar(read())
	    },

	    decimalExponentSign () {
	        if (util.isDigit(c)) {
	            buffer += read();
	            lexState = 'decimalExponentInteger';
	            return
	        }

	        throw invalidChar(read())
	    },

	    decimalExponentInteger () {
	        if (util.isDigit(c)) {
	            buffer += read();
	            return
	        }

	        return newToken('numeric', sign * Number(buffer))
	    },

	    hexadecimal () {
	        if (util.isHexDigit(c)) {
	            buffer += read();
	            lexState = 'hexadecimalInteger';
	            return
	        }

	        throw invalidChar(read())
	    },

	    hexadecimalInteger () {
	        if (util.isHexDigit(c)) {
	            buffer += read();
	            return
	        }

	        return newToken('numeric', sign * Number(buffer))
	    },

	    string () {
	        switch (c) {
	        case '\\':
	            read();
	            buffer += escape();
	            return

	        case '"':
	            if (doubleQuote) {
	                read();
	                return newToken('string', buffer)
	            }

	            buffer += read();
	            return

	        case "'":
	            if (!doubleQuote) {
	                read();
	                return newToken('string', buffer)
	            }

	            buffer += read();
	            return

	        case '\n':
	        case '\r':
	            throw invalidChar(read())

	        case '\u2028':
	        case '\u2029':
	            separatorChar(c);
	            break

	        case undefined:
	            throw invalidChar(read())
	        }

	        buffer += read();
	    },

	    start () {
	        switch (c) {
	        case '{':
	        case '[':
	            return newToken('punctuator', read())

	        // This code is unreachable since the default lexState handles eof.
	        // case undefined:
	        //     return newToken('eof')
	        }

	        lexState = 'value';
	    },

	    beforePropertyName () {
	        switch (c) {
	        case '$':
	        case '_':
	            buffer = read();
	            lexState = 'identifierName';
	            return

	        case '\\':
	            read();
	            lexState = 'identifierNameStartEscape';
	            return

	        case '}':
	            return newToken('punctuator', read())

	        case '"':
	        case "'":
	            doubleQuote = (read() === '"');
	            lexState = 'string';
	            return
	        }

	        if (util.isIdStartChar(c)) {
	            buffer += read();
	            lexState = 'identifierName';
	            return
	        }

	        throw invalidChar(read())
	    },

	    afterPropertyName () {
	        if (c === ':') {
	            return newToken('punctuator', read())
	        }

	        throw invalidChar(read())
	    },

	    beforePropertyValue () {
	        lexState = 'value';
	    },

	    afterPropertyValue () {
	        switch (c) {
	        case ',':
	        case '}':
	            return newToken('punctuator', read())
	        }

	        throw invalidChar(read())
	    },

	    beforeArrayValue () {
	        if (c === ']') {
	            return newToken('punctuator', read())
	        }

	        lexState = 'value';
	    },

	    afterArrayValue () {
	        switch (c) {
	        case ',':
	        case ']':
	            return newToken('punctuator', read())
	        }

	        throw invalidChar(read())
	    },

	    end () {
	        // This code is unreachable since it's handled by the default lexState.
	        // if (c === undefined) {
	        //     read()
	        //     return newToken('eof')
	        // }

	        throw invalidChar(read())
	    },
	};

	function newToken (type, value) {
	    return {
	        type,
	        value,
	        line,
	        column,
	    }
	}

	function literal (s) {
	    for (const c of s) {
	        const p = peek();

	        if (p !== c) {
	            throw invalidChar(read())
	        }

	        read();
	    }
	}

	function escape () {
	    const c = peek();
	    switch (c) {
	    case 'b':
	        read();
	        return '\b'

	    case 'f':
	        read();
	        return '\f'

	    case 'n':
	        read();
	        return '\n'

	    case 'r':
	        read();
	        return '\r'

	    case 't':
	        read();
	        return '\t'

	    case 'v':
	        read();
	        return '\v'

	    case '0':
	        read();
	        if (util.isDigit(peek())) {
	            throw invalidChar(read())
	        }

	        return '\0'

	    case 'x':
	        read();
	        return hexEscape()

	    case 'u':
	        read();
	        return unicodeEscape()

	    case '\n':
	    case '\u2028':
	    case '\u2029':
	        read();
	        return ''

	    case '\r':
	        read();
	        if (peek() === '\n') {
	            read();
	        }

	        return ''

	    case '1':
	    case '2':
	    case '3':
	    case '4':
	    case '5':
	    case '6':
	    case '7':
	    case '8':
	    case '9':
	        throw invalidChar(read())

	    case undefined:
	        throw invalidChar(read())
	    }

	    return read()
	}

	function hexEscape () {
	    let buffer = '';
	    let c = peek();

	    if (!util.isHexDigit(c)) {
	        throw invalidChar(read())
	    }

	    buffer += read();

	    c = peek();
	    if (!util.isHexDigit(c)) {
	        throw invalidChar(read())
	    }

	    buffer += read();

	    return String.fromCodePoint(parseInt(buffer, 16))
	}

	function unicodeEscape () {
	    let buffer = '';
	    let count = 4;

	    while (count-- > 0) {
	        const c = peek();
	        if (!util.isHexDigit(c)) {
	            throw invalidChar(read())
	        }

	        buffer += read();
	    }

	    return String.fromCodePoint(parseInt(buffer, 16))
	}

	const parseStates = {
	    start () {
	        if (token.type === 'eof') {
	            throw invalidEOF()
	        }

	        push();
	    },

	    beforePropertyName () {
	        switch (token.type) {
	        case 'identifier':
	        case 'string':
	            key = token.value;
	            parseState = 'afterPropertyName';
	            return

	        case 'punctuator':
	            // This code is unreachable since it's handled by the lexState.
	            // if (token.value !== '}') {
	            //     throw invalidToken()
	            // }

	            pop();
	            return

	        case 'eof':
	            throw invalidEOF()
	        }

	        // This code is unreachable since it's handled by the lexState.
	        // throw invalidToken()
	    },

	    afterPropertyName () {
	        // This code is unreachable since it's handled by the lexState.
	        // if (token.type !== 'punctuator' || token.value !== ':') {
	        //     throw invalidToken()
	        // }

	        if (token.type === 'eof') {
	            throw invalidEOF()
	        }

	        parseState = 'beforePropertyValue';
	    },

	    beforePropertyValue () {
	        if (token.type === 'eof') {
	            throw invalidEOF()
	        }

	        push();
	    },

	    beforeArrayValue () {
	        if (token.type === 'eof') {
	            throw invalidEOF()
	        }

	        if (token.type === 'punctuator' && token.value === ']') {
	            pop();
	            return
	        }

	        push();
	    },

	    afterPropertyValue () {
	        // This code is unreachable since it's handled by the lexState.
	        // if (token.type !== 'punctuator') {
	        //     throw invalidToken()
	        // }

	        if (token.type === 'eof') {
	            throw invalidEOF()
	        }

	        switch (token.value) {
	        case ',':
	            parseState = 'beforePropertyName';
	            return

	        case '}':
	            pop();
	        }

	        // This code is unreachable since it's handled by the lexState.
	        // throw invalidToken()
	    },

	    afterArrayValue () {
	        // This code is unreachable since it's handled by the lexState.
	        // if (token.type !== 'punctuator') {
	        //     throw invalidToken()
	        // }

	        if (token.type === 'eof') {
	            throw invalidEOF()
	        }

	        switch (token.value) {
	        case ',':
	            parseState = 'beforeArrayValue';
	            return

	        case ']':
	            pop();
	        }

	        // This code is unreachable since it's handled by the lexState.
	        // throw invalidToken()
	    },

	    end () {
	        // This code is unreachable since it's handled by the lexState.
	        // if (token.type !== 'eof') {
	        //     throw invalidToken()
	        // }
	    },
	};

	function push () {
	    let value;

	    switch (token.type) {
	    case 'punctuator':
	        switch (token.value) {
	        case '{':
	            value = {};
	            break

	        case '[':
	            value = [];
	            break
	        }

	        break

	    case 'null':
	    case 'boolean':
	    case 'numeric':
	    case 'string':
	        value = token.value;
	        break

	    // This code is unreachable.
	    // default:
	    //     throw invalidToken()
	    }

	    if (root === undefined) {
	        root = value;
	    } else {
	        const parent = stack[stack.length - 1];
	        if (Array.isArray(parent)) {
	            parent.push(value);
	        } else {
	            parent[key] = value;
	        }
	    }

	    if (value !== null && typeof value === 'object') {
	        stack.push(value);

	        if (Array.isArray(value)) {
	            parseState = 'beforeArrayValue';
	        } else {
	            parseState = 'beforePropertyName';
	        }
	    } else {
	        const current = stack[stack.length - 1];
	        if (current == null) {
	            parseState = 'end';
	        } else if (Array.isArray(current)) {
	            parseState = 'afterArrayValue';
	        } else {
	            parseState = 'afterPropertyValue';
	        }
	    }
	}

	function pop () {
	    stack.pop();

	    const current = stack[stack.length - 1];
	    if (current == null) {
	        parseState = 'end';
	    } else if (Array.isArray(current)) {
	        parseState = 'afterArrayValue';
	    } else {
	        parseState = 'afterPropertyValue';
	    }
	}

	// This code is unreachable.
	// function invalidParseState () {
	//     return new Error(`JSON5: invalid parse state '${parseState}'`)
	// }

	// This code is unreachable.
	// function invalidLexState (state) {
	//     return new Error(`JSON5: invalid lex state '${state}'`)
	// }

	function invalidChar (c) {
	    if (c === undefined) {
	        return syntaxError(`JSON5: invalid end of input at ${line}:${column}`)
	    }

	    return syntaxError(`JSON5: invalid character '${formatChar(c)}' at ${line}:${column}`)
	}

	function invalidEOF () {
	    return syntaxError(`JSON5: invalid end of input at ${line}:${column}`)
	}

	// This code is unreachable.
	// function invalidToken () {
	//     if (token.type === 'eof') {
	//         return syntaxError(`JSON5: invalid end of input at ${line}:${column}`)
	//     }

	//     const c = String.fromCodePoint(token.value.codePointAt(0))
	//     return syntaxError(`JSON5: invalid character '${formatChar(c)}' at ${line}:${column}`)
	// }

	function invalidIdentifier () {
	    column -= 5;
	    return syntaxError(`JSON5: invalid identifier character at ${line}:${column}`)
	}

	function separatorChar (c) {
	    console.warn(`JSON5: '${formatChar(c)}' in strings is not valid ECMAScript; consider escaping`);
	}

	function formatChar (c) {
	    const replacements = {
	        "'": "\\'",
	        '"': '\\"',
	        '\\': '\\\\',
	        '\b': '\\b',
	        '\f': '\\f',
	        '\n': '\\n',
	        '\r': '\\r',
	        '\t': '\\t',
	        '\v': '\\v',
	        '\0': '\\0',
	        '\u2028': '\\u2028',
	        '\u2029': '\\u2029',
	    };

	    if (replacements[c]) {
	        return replacements[c]
	    }

	    if (c < ' ') {
	        const hexString = c.charCodeAt(0).toString(16);
	        return '\\x' + ('00' + hexString).substring(hexString.length)
	    }

	    return c
	}

	function syntaxError (message) {
	    const err = new SyntaxError(message);
	    err.lineNumber = line;
	    err.columnNumber = column;
	    return err
	}

	var stringify = function stringify (value, replacer, space) {
	    const stack = [];
	    let indent = '';
	    let propertyList;
	    let replacerFunc;
	    let gap = '';
	    let quote;

	    if (
	        replacer != null &&
	        typeof replacer === 'object' &&
	        !Array.isArray(replacer)
	    ) {
	        space = replacer.space;
	        quote = replacer.quote;
	        replacer = replacer.replacer;
	    }

	    if (typeof replacer === 'function') {
	        replacerFunc = replacer;
	    } else if (Array.isArray(replacer)) {
	        propertyList = [];
	        for (const v of replacer) {
	            let item;

	            if (typeof v === 'string') {
	                item = v;
	            } else if (
	                typeof v === 'number' ||
	                v instanceof String ||
	                v instanceof Number
	            ) {
	                item = String(v);
	            }

	            if (item !== undefined && propertyList.indexOf(item) < 0) {
	                propertyList.push(item);
	            }
	        }
	    }

	    if (space instanceof Number) {
	        space = Number(space);
	    } else if (space instanceof String) {
	        space = String(space);
	    }

	    if (typeof space === 'number') {
	        if (space > 0) {
	            space = Math.min(10, Math.floor(space));
	            gap = '          '.substr(0, space);
	        }
	    } else if (typeof space === 'string') {
	        gap = space.substr(0, 10);
	    }

	    return serializeProperty('', {'': value})

	    function serializeProperty (key, holder) {
	        let value = holder[key];
	        if (value != null) {
	            if (typeof value.toJSON5 === 'function') {
	                value = value.toJSON5(key);
	            } else if (typeof value.toJSON === 'function') {
	                value = value.toJSON(key);
	            }
	        }

	        if (replacerFunc) {
	            value = replacerFunc.call(holder, key, value);
	        }

	        if (value instanceof Number) {
	            value = Number(value);
	        } else if (value instanceof String) {
	            value = String(value);
	        } else if (value instanceof Boolean) {
	            value = value.valueOf();
	        }

	        switch (value) {
	        case null: return 'null'
	        case true: return 'true'
	        case false: return 'false'
	        }

	        if (typeof value === 'string') {
	            return quoteString(value, false)
	        }

	        if (typeof value === 'number') {
	            return String(value)
	        }

	        if (typeof value === 'object') {
	            return Array.isArray(value) ? serializeArray(value) : serializeObject(value)
	        }

	        return undefined
	    }

	    function quoteString (value) {
	        const quotes = {
	            "'": 0.1,
	            '"': 0.2,
	        };

	        const replacements = {
	            "'": "\\'",
	            '"': '\\"',
	            '\\': '\\\\',
	            '\b': '\\b',
	            '\f': '\\f',
	            '\n': '\\n',
	            '\r': '\\r',
	            '\t': '\\t',
	            '\v': '\\v',
	            '\0': '\\0',
	            '\u2028': '\\u2028',
	            '\u2029': '\\u2029',
	        };

	        let product = '';

	        for (let i = 0; i < value.length; i++) {
	            const c = value[i];
	            switch (c) {
	            case "'":
	            case '"':
	                quotes[c]++;
	                product += c;
	                continue

	            case '\0':
	                if (util.isDigit(value[i + 1])) {
	                    product += '\\x00';
	                    continue
	                }
	            }

	            if (replacements[c]) {
	                product += replacements[c];
	                continue
	            }

	            if (c < ' ') {
	                let hexString = c.charCodeAt(0).toString(16);
	                product += '\\x' + ('00' + hexString).substring(hexString.length);
	                continue
	            }

	            product += c;
	        }

	        const quoteChar = quote || Object.keys(quotes).reduce((a, b) => (quotes[a] < quotes[b]) ? a : b);

	        product = product.replace(new RegExp(quoteChar, 'g'), replacements[quoteChar]);

	        return quoteChar + product + quoteChar
	    }

	    function serializeObject (value) {
	        if (stack.indexOf(value) >= 0) {
	            throw TypeError('Converting circular structure to JSON5')
	        }

	        stack.push(value);

	        let stepback = indent;
	        indent = indent + gap;

	        let keys = propertyList || Object.keys(value);
	        let partial = [];
	        for (const key of keys) {
	            const propertyString = serializeProperty(key, value);
	            if (propertyString !== undefined) {
	                let member = serializeKey(key) + ':';
	                if (gap !== '') {
	                    member += ' ';
	                }
	                member += propertyString;
	                partial.push(member);
	            }
	        }

	        let final;
	        if (partial.length === 0) {
	            final = '{}';
	        } else {
	            let properties;
	            if (gap === '') {
	                properties = partial.join(',');
	                final = '{' + properties + '}';
	            } else {
	                let separator = ',\n' + indent;
	                properties = partial.join(separator);
	                final = '{\n' + indent + properties + ',\n' + stepback + '}';
	            }
	        }

	        stack.pop();
	        indent = stepback;
	        return final
	    }

	    function serializeKey (key) {
	        if (key.length === 0) {
	            return quoteString(key, true)
	        }

	        const firstChar = String.fromCodePoint(key.codePointAt(0));
	        if (!util.isIdStartChar(firstChar)) {
	            return quoteString(key, true)
	        }

	        for (let i = firstChar.length; i < key.length; i++) {
	            if (!util.isIdContinueChar(String.fromCodePoint(key.codePointAt(i)))) {
	                return quoteString(key, true)
	            }
	        }

	        return key
	    }

	    function serializeArray (value) {
	        if (stack.indexOf(value) >= 0) {
	            throw TypeError('Converting circular structure to JSON5')
	        }

	        stack.push(value);

	        let stepback = indent;
	        indent = indent + gap;

	        let partial = [];
	        for (let i = 0; i < value.length; i++) {
	            const propertyString = serializeProperty(String(i), value);
	            partial.push((propertyString !== undefined) ? propertyString : 'null');
	        }

	        let final;
	        if (partial.length === 0) {
	            final = '[]';
	        } else {
	            if (gap === '') {
	                let properties = partial.join(',');
	                final = '[' + properties + ']';
	            } else {
	                let separator = ',\n' + indent;
	                let properties = partial.join(separator);
	                final = '[\n' + indent + properties + ',\n' + stepback + ']';
	            }
	        }

	        stack.pop();
	        indent = stepback;
	        return final
	    }
	};

	const JSON5 = {
	    parse,
	    stringify,
	};

	var lib = JSON5;

	class Sidebar{

		constructor(viewer){
			this.viewer = viewer;

			this.measuringTool = viewer.measuringTool;
			this.profileTool = viewer.profileTool;
			this.volumeTool = viewer.volumeTool;

			this.dom = $("#sidebar_root");
		}

		createToolIcon(icon, title, callback){
			let element = $(`
			<img src="${icon}"
				style="width: 32px; height: 32px"
				class="button-icon"
				data-i18n="${title}" />
		`);

			element.click(callback);

			return element;
		}

		init(){

			this.initAccordion();
			this.initAppearance();
			this.initToolbar();
			this.initScene();
			this.initNavigation();
			this.initFilters();
			this.initClippingTool();
			this.initSettings();
			
			$('#potree_version_number').html(Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);
		}

			

		initToolbar(){

			// ANGLE
			let elToolbar = $('#tools');
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/angle.png',
				'[title]tt.angle_measurement',
				() => {
					$('#menu_measurements').next().slideDown();
					let measurement = this.measuringTool.startInsertion({
						showDistances: false,
						showAngles: true,
						showArea: false,
						closed: true,
						maxMarkers: 3,
						name: 'Angle'});

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// POINT
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/point.png',
				'[title]tt.point_measurement',
				() => {
					$('#menu_measurements').next().slideDown();
					let measurement = this.measuringTool.startInsertion({
						showDistances: false,
						showAngles: false,
						showCoordinates: true,
						showArea: false,
						closed: true,
						maxMarkers: 1,
						name: 'Point'});

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// DISTANCE
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/distance.png',
				'[title]tt.distance_measurement',
				() => {
					$('#menu_measurements').next().slideDown();
					let measurement = this.measuringTool.startInsertion({
						showDistances: true,
						showArea: false,
						closed: false,
						name: 'Distance'});

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// HEIGHT
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/height.png',
				'[title]tt.height_measurement',
				() => {
					$('#menu_measurements').next().slideDown();
					let measurement = this.measuringTool.startInsertion({
						showDistances: false,
						showHeight: true,
						showArea: false,
						closed: false,
						maxMarkers: 2,
						name: 'Height'});

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// CIRCLE
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/circle.png',
				'[title]tt.circle_measurement',
				() => {
					$('#menu_measurements').next().slideDown();
					let measurement = this.measuringTool.startInsertion({
						showDistances: false,
						showHeight: false,
						showArea: false,
						showCircle: true,
						showEdges: false,
						closed: false,
						maxMarkers: 3,
						name: 'Circle'});

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// AZIMUTH
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/azimuth.png',
				'Azimuth',
				() => {
					$('#menu_measurements').next().slideDown();
					let measurement = this.measuringTool.startInsertion({
						showDistances: false,
						showHeight: false,
						showArea: false,
						showCircle: false,
						showEdges: false,
						showAzimuth: true,
						closed: false,
						maxMarkers: 2,
						name: 'Azimuth'});

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// AREA
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/area.png',
				'[title]tt.area_measurement',
				() => {
					$('#menu_measurements').next().slideDown();
					let measurement = this.measuringTool.startInsertion({
						showDistances: true,
						showArea: true,
						closed: true,
						name: 'Area'});

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// VOLUME
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/volume.png',
				'[title]tt.volume_measurement',
				() => {
					let volume = this.volumeTool.startInsertion(); 

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === volume.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// SPHERE VOLUME
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/sphere_distances.png',
				'[title]tt.volume_measurement',
				() => { 
					let volume = this.volumeTool.startInsertion({type: SphereVolume}); 

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === volume.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// PROFILE
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/profile.png',
				'[title]tt.height_profile',
				() => {
					$('#menu_measurements').next().slideDown(); ;
					let profile = this.profileTool.startInsertion();

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === profile.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// ANNOTATION
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/annotation.png',
				'[title]tt.annotation',
				() => {
					$('#menu_measurements').next().slideDown(); ;
					let annotation = this.viewer.annotationTool.startInsertion();

					let annotationsRoot = $("#jstree_scene").jstree().get_json("annotations");
					let jsonNode = annotationsRoot.children.find(child => child.data.uuid === annotation.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// REMOVE ALL
			elToolbar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/reset_tools.png',
				'[title]tt.remove_all_measurement',
				() => {
					this.viewer.scene.removeAllMeasurements();
				}
			));


			{ // SHOW / HIDE Measurements
				let elShow = $("#measurement_options_show");
				elShow.selectgroup({title: "Show/Hide labels"});

				elShow.find("input").click( (e) => {
					const show = e.target.value === "SHOW";
					this.measuringTool.showLabels = show;
				});

				let currentShow = this.measuringTool.showLabels ? "SHOW" : "HIDE";
				elShow.find(`input[value=${currentShow}]`).trigger("click");
			}
		}

		initScene(){

			let elScene = $("#menu_scene");
			let elObjects = elScene.next().find("#scene_objects");
			let elProperties = elScene.next().find("#scene_object_properties");
			

			{
				let elExport = elScene.next().find("#scene_export");

				let geoJSONIcon = `${Potree.resourcePath}/icons/file_geojson.svg`;
				let dxfIcon = `${Potree.resourcePath}/icons/file_dxf.svg`;
				let potreeIcon = `${Potree.resourcePath}/icons/file_potree.svg`;

				elExport.append(`
				Export: <br>
				<a href="#" download="measure.json"><img name="geojson_export_button" src="${geoJSONIcon}" class="button-icon" style="height: 24px" /></a>
				<a href="#" download="measure.dxf"><img name="dxf_export_button" src="${dxfIcon}" class="button-icon" style="height: 24px" /></a>
				<a href="#" download="potree.json5"><img name="potree_export_button" src="${potreeIcon}" class="button-icon" style="height: 24px" /></a>
			`);

				let elDownloadJSON = elExport.find("img[name=geojson_export_button]").parent();
				elDownloadJSON.click( (event) => {
					let scene = this.viewer.scene;
					let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

					if(measurements.length > 0){
						let geoJson = GeoJSONExporter.toString(measurements);

						let url = window.URL.createObjectURL(new Blob([geoJson], {type: 'data:application/octet-stream'}));
						elDownloadJSON.attr('href', url);
					}else {
						this.viewer.postError("no measurements to export");
						event.preventDefault();
					}
				});

				let elDownloadDXF = elExport.find("img[name=dxf_export_button]").parent();
				elDownloadDXF.click( (event) => {
					let scene = this.viewer.scene;
					let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

					if(measurements.length > 0){
						let dxf = DXFExporter.toString(measurements);

						let url = window.URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
						elDownloadDXF.attr('href', url);
					}else {
						this.viewer.postError("no measurements to export");
						event.preventDefault();
					}
				});

				let elDownloadPotree = elExport.find("img[name=potree_export_button]").parent();
				elDownloadPotree.click( (event) => {

					let data = Potree.saveProject(this.viewer);
					let dataString = lib.stringify(data, null, "\t");

					let url = window.URL.createObjectURL(new Blob([dataString], {type: 'data:application/octet-stream'}));
					elDownloadPotree.attr('href', url);
				});
			}

			let propertiesPanel = new PropertiesPanel(elProperties, this.viewer);
			propertiesPanel.setScene(this.viewer.scene);
			
			localStorage.removeItem('jstree');

			let tree = $(`<div id="jstree_scene"></div>`);
			elObjects.append(tree);

			tree.jstree({
				'plugins': ["checkbox", "state"],
				'core': {
					"dblclick_toggle": false,
					"state": {
						"checked" : true
					},
					'check_callback': true,
					"expand_selected_onload": true
				},
				"checkbox" : {
					"keep_selected_style": true,
					"three_state": false,
					"whole_node": false,
					"tie_selection": false,
				},
			});

			let createNode = (parent, text, icon, object) => {
				let nodeID = tree.jstree('create_node', parent, { 
						"text": text, 
						"icon": icon,
						"data": object
					}, 
					"last", false, false);
				
				if(object.visible){
					tree.jstree('check_node', nodeID);
				}else {
					tree.jstree('uncheck_node', nodeID);
				}

				return nodeID;
			};

			let pcID = tree.jstree('create_node', "#", { "text": "<b>Point Clouds</b>", "id": "pointclouds"}, "last", false, false);
			let measurementID = tree.jstree('create_node', "#", { "text": "<b>Measurements</b>", "id": "measurements" }, "last", false, false);
			let annotationsID = tree.jstree('create_node', "#", { "text": "<b>Annotations</b>", "id": "annotations" }, "last", false, false);
			let otherID = tree.jstree('create_node', "#", { "text": "<b>Other</b>", "id": "other" }, "last", false, false);
			let vectorsID = tree.jstree('create_node', "#", { "text": "<b>Vectors</b>", "id": "vectors" }, "last", false, false);
			let imagesID = tree.jstree('create_node', "#", { "text": "<b> Images</b>", "id": "images" }, "last", false, false);

			tree.jstree("check_node", pcID);
			tree.jstree("check_node", measurementID);
			tree.jstree("check_node", annotationsID);
			tree.jstree("check_node", otherID);
			tree.jstree("check_node", vectorsID);
			tree.jstree("check_node", imagesID);

			tree.on('create_node.jstree', (e, data) => {
				tree.jstree("open_all");
			});

			tree.on("select_node.jstree", (e, data) => {
				let object = data.node.data;
				propertiesPanel.set(object);

				this.viewer.inputHandler.deselectAll();

				if(object instanceof Volume){
					this.viewer.inputHandler.toggleSelection(object);
				}

				$(this.viewer.renderer.domElement).focus();
			});

			tree.on("deselect_node.jstree", (e, data) => {
				propertiesPanel.set(null);
			});

			tree.on("delete_node.jstree", (e, data) => {
				propertiesPanel.set(null);
			});

			tree.on('dblclick','.jstree-anchor', (e) => {

				let instance = $.jstree.reference(e.target);
				let node = instance.get_node(e.target);
				let object = node.data;

				// ignore double click on checkbox
				if(e.target.classList.contains("jstree-checkbox")){
					return;
				}

				if(object instanceof PointCloudTree){
					let box = this.viewer.getBoundingBox([object]);
					let node = new THREE.Object3D();
					node.boundingBox = box;
					this.viewer.zoomTo(node, 1, 500);
				}else if(object instanceof Measure){
					let points = object.points.map(p => p.position);
					let box = new THREE.Box3().setFromPoints(points);
					if(box.getSize(new THREE.Vector3()).length() > 0){
						let node = new THREE.Object3D();
						node.boundingBox = box;
						this.viewer.zoomTo(node, 2, 500);
					}
				}else if(object instanceof Profile){
					let points = object.points;
					let box = new THREE.Box3().setFromPoints(points);
					if(box.getSize(new THREE.Vector3()).length() > 0){
						let node = new THREE.Object3D();
						node.boundingBox = box;
						this.viewer.zoomTo(node, 1, 500);
					}
				}else if(object instanceof Volume){
					
					let box = object.boundingBox.clone().applyMatrix4(object.matrixWorld);

					if(box.getSize(new THREE.Vector3()).length() > 0){
						let node = new THREE.Object3D();
						node.boundingBox = box;
						this.viewer.zoomTo(node, 1, 500);
					}
				}else if(object instanceof Annotation){
					object.moveHere(this.viewer.scene.getActiveCamera());
				}else if(object instanceof PolygonClipVolume){
					let dir = object.camera.getWorldDirection(new THREE.Vector3());
					let target;

					if(object.camera instanceof THREE.OrthographicCamera){
						dir.multiplyScalar(object.camera.right);
						target = new THREE.Vector3().addVectors(object.camera.position, dir);
						this.viewer.setCameraMode(CameraMode.ORTHOGRAPHIC);
					}else if(object.camera instanceof THREE.PerspectiveCamera){
						dir.multiplyScalar(this.viewer.scene.view.radius);
						target = new THREE.Vector3().addVectors(object.camera.position, dir);
						this.viewer.setCameraMode(CameraMode.PERSPECTIVE);
					}
					
					this.viewer.scene.view.position.copy(object.camera.position);
					this.viewer.scene.view.lookAt(target);
				}else if(object instanceof THREE.SpotLight){
					let distance = (object.distance > 0) ? object.distance / 4 : 5 * 1000;
					let position = object.position;
					let target = new THREE.Vector3().addVectors(
						position, 
						object.getWorldDirection(new THREE.Vector3()).multiplyScalar(distance));

					this.viewer.scene.view.position.copy(object.position);
					this.viewer.scene.view.lookAt(target);
				}else if(object instanceof THREE.Object3D){
					let box = new THREE.Box3().setFromObject(object);

					if(box.getSize(new THREE.Vector3()).length() > 0){
						let node = new THREE.Object3D();
						node.boundingBox = box;
						this.viewer.zoomTo(node, 1, 500);
					}
				}else if(object instanceof OrientedImage){
					// TODO zoom to images

					// let box = new THREE.Box3().setFromObject(object);

					// if(box.getSize(new THREE.Vector3()).length() > 0){
					// 	let node = new THREE.Object3D();
					// 	node.boundingBox = box;
					// 	this.viewer.zoomTo(node, 1, 500);
					// }
				}else if(object instanceof Images360){
					// TODO
				}else if(object instanceof Geopackage){
					// TODO
				}
			});

			tree.on("uncheck_node.jstree", (e, data) => {
				let object = data.node.data;

				if(object){
					object.visible = false;
				}
			});

			tree.on("check_node.jstree", (e, data) => {
				let object = data.node.data;

				if(object){
					object.visible = true;
				}
			});


			let onPointCloudAdded = (e) => {
				let pointcloud = e.pointcloud;
				let cloudIcon = `${Potree.resourcePath}/icons/cloud.svg`;
				let node = createNode(pcID, pointcloud.name, cloudIcon, pointcloud);

				pointcloud.addEventListener("visibility_changed", () => {
					if(pointcloud.visible){
						tree.jstree('check_node', node);
					}else {
						tree.jstree('uncheck_node', node);
					}
				});
			};

			let onMeasurementAdded = (e) => {
				let measurement = e.measurement;
				let icon = Utils.getMeasurementIcon(measurement);
				createNode(measurementID, measurement.name, icon, measurement);
			};

			let onVolumeAdded = (e) => {
				let volume = e.volume;
				let icon = Utils.getMeasurementIcon(volume);
				let node = createNode(measurementID, volume.name, icon, volume);

				volume.addEventListener("visibility_changed", () => {
					if(volume.visible){
						tree.jstree('check_node', node);
					}else {
						tree.jstree('uncheck_node', node);
					}
				});
			};

			let onProfileAdded = (e) => {
				let profile = e.profile;
				let icon = Utils.getMeasurementIcon(profile);
				createNode(measurementID, profile.name, icon, profile);
			};

			let onAnnotationAdded = (e) => {
				let annotation = e.annotation;

				let annotationIcon = `${Potree.resourcePath}/icons/annotation.png`;
				let parentID = this.annotationMapping.get(annotation.parent);
				let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
				this.annotationMapping.set(annotation, annotationID);

				annotation.addEventListener("annotation_changed", (e) => {
					let annotationsRoot = $("#jstree_scene").jstree().get_json("annotations");
					let jsonNode = annotationsRoot.children.find(child => child.data.uuid === annotation.uuid);
					
					$.jstree.reference(jsonNode.id).rename_node(jsonNode.id, annotation.title);
				});
			};

			let onCameraAnimationAdded = (e) => {
				const animation = e.animation;

				const animationIcon = `${Potree.resourcePath}/icons/camera_animation.png`;
				createNode(otherID, "animation", animationIcon, animation);
			};

			let onOrientedImagesAdded = (e) => {
				const images = e.images;

				const imagesIcon = `${Potree.resourcePath}/icons/picture.svg`;
				const node = createNode(imagesID, "images", imagesIcon, images);

				images.addEventListener("visibility_changed", () => {
					if(images.visible){
						tree.jstree('check_node', node);
					}else {
						tree.jstree('uncheck_node', node);
					}
				});
			};

			let onImages360Added = (e) => {
				const images = e.images;

				const imagesIcon = `${Potree.resourcePath}/icons/picture.svg`;
				const node = createNode(imagesID, "360° images", imagesIcon, images);

				images.addEventListener("visibility_changed", () => {
					if(images.visible){
						tree.jstree('check_node', node);
					}else {
						tree.jstree('uncheck_node', node);
					}
				});
			};

			const onGeopackageAdded = (e) => {
				const geopackage = e.geopackage;

				const geopackageIcon = `${Potree.resourcePath}/icons/triangle.svg`;
				const tree = $(`#jstree_scene`);
				const parentNode = "vectors";

				for(const layer of geopackage.node.children){
					const name = layer.name;

					let shpPointsID = tree.jstree('create_node', parentNode, { 
							"text": name, 
							"icon": geopackageIcon,
							"object": layer,
							"data": layer,
						}, 
						"last", false, false);
					tree.jstree(layer.visible ? "check_node" : "uncheck_node", shpPointsID);
				}

			};

			this.viewer.scene.addEventListener("pointcloud_added", onPointCloudAdded);
			this.viewer.scene.addEventListener("measurement_added", onMeasurementAdded);
			this.viewer.scene.addEventListener("profile_added", onProfileAdded);
			this.viewer.scene.addEventListener("volume_added", onVolumeAdded);
			this.viewer.scene.addEventListener("camera_animation_added", onCameraAnimationAdded);
			this.viewer.scene.addEventListener("oriented_images_added", onOrientedImagesAdded);
			this.viewer.scene.addEventListener("360_images_added", onImages360Added);
			this.viewer.scene.addEventListener("geopackage_added", onGeopackageAdded);
			this.viewer.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
			this.viewer.scene.annotations.addEventListener("annotation_added", onAnnotationAdded);

			let onMeasurementRemoved = (e) => {
				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.measurement.uuid);
				
				tree.jstree("delete_node", jsonNode.id);
			};

			let onVolumeRemoved = (e) => {
				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);
				
				tree.jstree("delete_node", jsonNode.id);
			};

			let onPolygonClipVolumeRemoved = (e) => {
				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);
				
				tree.jstree("delete_node", jsonNode.id);
			};

			let onProfileRemoved = (e) => {
				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.profile.uuid);
				
				tree.jstree("delete_node", jsonNode.id);
			};

			this.viewer.scene.addEventListener("measurement_removed", onMeasurementRemoved);
			this.viewer.scene.addEventListener("volume_removed", onVolumeRemoved);
			this.viewer.scene.addEventListener("polygon_clip_volume_removed", onPolygonClipVolumeRemoved);
			this.viewer.scene.addEventListener("profile_removed", onProfileRemoved);

			{
				let annotationIcon = `${Potree.resourcePath}/icons/annotation.png`;
				this.annotationMapping = new Map(); 
				this.annotationMapping.set(this.viewer.scene.annotations, annotationsID);
				this.viewer.scene.annotations.traverseDescendants(annotation => {
					let parentID = this.annotationMapping.get(annotation.parent);
					let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
					this.annotationMapping.set(annotation, annotationID);
				});
			}

			const scene = this.viewer.scene;
			for(let pointcloud of scene.pointclouds){
				onPointCloudAdded({pointcloud: pointcloud});
			}

			for(let measurement of scene.measurements){
				onMeasurementAdded({measurement: measurement});
			}

			for(let volume of [...scene.volumes, ...scene.polygonClipVolumes]){
				onVolumeAdded({volume: volume});
			}

			for(let animation of scene.cameraAnimations){
				onCameraAnimationAdded({animation: animation});
			}

			for(let images of scene.orientedImages){
				onOrientedImagesAdded({images: images});
			}

			for(let images of scene.images360){
				onImages360Added({images: images});
			}

			for(const geopackage of scene.geopackages){
				onGeopackageAdded({geopackage: geopackage});
			}

			for(let profile of scene.profiles){
				onProfileAdded({profile: profile});
			}

			{
				createNode(otherID, "Camera", null, new THREE.Camera());
			}

			this.viewer.addEventListener("scene_changed", (e) => {
				propertiesPanel.setScene(e.scene);

				e.oldScene.removeEventListener("pointcloud_added", onPointCloudAdded);
				e.oldScene.removeEventListener("measurement_added", onMeasurementAdded);
				e.oldScene.removeEventListener("profile_added", onProfileAdded);
				e.oldScene.removeEventListener("volume_added", onVolumeAdded);
				e.oldScene.removeEventListener("polygon_clip_volume_added", onVolumeAdded);
				e.oldScene.removeEventListener("measurement_removed", onMeasurementRemoved);

				e.scene.addEventListener("pointcloud_added", onPointCloudAdded);
				e.scene.addEventListener("measurement_added", onMeasurementAdded);
				e.scene.addEventListener("profile_added", onProfileAdded);
				e.scene.addEventListener("volume_added", onVolumeAdded);
				e.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
				e.scene.addEventListener("measurement_removed", onMeasurementRemoved);
			});

		}

		initClippingTool(){


			this.viewer.addEventListener("cliptask_changed", (event) => {
				console.log("TODO");
			});

			this.viewer.addEventListener("clipmethod_changed", (event) => {
				console.log("TODO");
			});

			{
				let elClipTask = $("#cliptask_options");
				elClipTask.selectgroup({title: "Clip Task"});

				elClipTask.find("input").click( (e) => {
					this.viewer.setClipTask(ClipTask[e.target.value]);
				});

				let currentClipTask = Object.keys(ClipTask)
					.filter(key => ClipTask[key] === this.viewer.clipTask);
				elClipTask.find(`input[value=${currentClipTask}]`).trigger("click");
			}

			{
				let elClipMethod = $("#clipmethod_options");
				elClipMethod.selectgroup({title: "Clip Method"});

				elClipMethod.find("input").click( (e) => {
					this.viewer.setClipMethod(ClipMethod[e.target.value]);
				});

				let currentClipMethod = Object.keys(ClipMethod)
					.filter(key => ClipMethod[key] === this.viewer.clipMethod);
				elClipMethod.find(`input[value=${currentClipMethod}]`).trigger("click");
			}

			let clippingToolBar = $("#clipping_tools");

			// CLIP VOLUME
			clippingToolBar.append(this.createToolIcon(
				Potree.resourcePath + '/icons/clip_volume.svg',
				'[title]tt.clip_volume',
				() => {
					let item = this.volumeTool.startInsertion({clip: true}); 

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === item.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			// CLIP POLYGON
			clippingToolBar.append(this.createToolIcon(
				Potree.resourcePath + "/icons/clip-polygon.svg",
				"[title]tt.clip_polygon",
				() => {
					let item = this.viewer.clippingTool.startInsertion({type: "polygon"});

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === item.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));

			{// SCREEN BOX SELECT
				let boxSelectTool = new ScreenBoxSelectTool(this.viewer);

				clippingToolBar.append(this.createToolIcon(
					Potree.resourcePath + "/icons/clip-screen.svg",
					"[title]tt.screen_clip_box",
					() => {
						if(!(this.viewer.scene.getActiveCamera() instanceof THREE.OrthographicCamera)){
							this.viewer.postMessage(`Switch to Orthographic Camera Mode before using the Screen-Box-Select tool.`, 
								{duration: 2000});
							return;
						}
						
						let item = boxSelectTool.startInsertion();

						let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
						let jsonNode = measurementsRoot.children.find(child => child.data.uuid === item.uuid);
						$.jstree.reference(jsonNode.id).deselect_all();
						$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
					}
				));
			}

			{ // REMOVE CLIPPING TOOLS
				clippingToolBar.append(this.createToolIcon(
					Potree.resourcePath + "/icons/remove.png",
					"[title]tt.remove_all_measurement",
					() => {

						this.viewer.scene.removeAllClipVolumes();
					}
				));
			}

		}

		initFilters(){
			this.initClassificationList();
			this.initReturnFilters();
			this.initGPSTimeFilters();
			this.initPointSourceIDFilters();

		}

		initReturnFilters(){
			let elReturnFilterPanel = $('#return_filter_panel');

			{ // RETURN NUMBER
				let sldReturnNumber = elReturnFilterPanel.find('#sldReturnNumber');
				let lblReturnNumber = elReturnFilterPanel.find('#lblReturnNumber');

				sldReturnNumber.slider({
					range: true,
					min: 0, max: 7, step: 1,
					values: [0, 7],
					slide: (event, ui) => {
						this.viewer.setFilterReturnNumberRange(ui.values[0], ui.values[1]);
					}
				});

				let onReturnNumberChanged = (event) => {
					let [from, to] = this.viewer.filterReturnNumberRange;

					lblReturnNumber[0].innerHTML = `${from} to ${to}`;
					sldReturnNumber.slider({values: [from, to]});
				};

				this.viewer.addEventListener('filter_return_number_range_changed', onReturnNumberChanged);

				onReturnNumberChanged();
			}

			{ // NUMBER OF RETURNS
				let sldNumberOfReturns = elReturnFilterPanel.find('#sldNumberOfReturns');
				let lblNumberOfReturns = elReturnFilterPanel.find('#lblNumberOfReturns');

				sldNumberOfReturns.slider({
					range: true,
					min: 0, max: 7, step: 1,
					values: [0, 7],
					slide: (event, ui) => {
						this.viewer.setFilterNumberOfReturnsRange(ui.values[0], ui.values[1]);
					}
				});

				let onNumberOfReturnsChanged = (event) => {
					let [from, to] = this.viewer.filterNumberOfReturnsRange;

					lblNumberOfReturns[0].innerHTML = `${from} to ${to}`;
					sldNumberOfReturns.slider({values: [from, to]});
				};

				this.viewer.addEventListener('filter_number_of_returns_range_changed', onNumberOfReturnsChanged);

				onNumberOfReturnsChanged();
			}
		}

		initGPSTimeFilters(){

			let elGPSTimeFilterPanel = $('#gpstime_filter_panel');

			{
				let slider = new HierarchicalSlider({
					levels: 4,
					slide: (event) => {
						this.viewer.setFilterGPSTimeRange(...event.values);
					},
				});

				let initialized = false;

				let initialize = () => {
					
					let elRangeContainer = $("#gpstime_multilevel_range_container");
					elRangeContainer[0].prepend(slider.element);

					let extent = this.viewer.getGpsTimeExtent();

					slider.setRange(extent);
					slider.setValues(extent);


					initialized = true;
				};

				this.viewer.addEventListener("update", (e) => {
					let extent = this.viewer.getGpsTimeExtent();
					let gpsTimeAvailable = extent[0] !== Infinity;

					if(!initialized && gpsTimeAvailable){
						initialize();
					}

					slider.setRange(extent);
				});
			}


			{
				
				const txtGpsTime = elGPSTimeFilterPanel.find("#txtGpsTime");
				const btnFindGpsTime = elGPSTimeFilterPanel.find("#btnFindGpsTime");

				let targetTime = null;

				txtGpsTime.on("input", (e) => {
					const str = txtGpsTime.val();

					if(!isNaN(str)){
						const value = parseFloat(str);
						targetTime = value;

						txtGpsTime.css("background-color", "");
					}else {
						targetTime = null;

						txtGpsTime.css("background-color", "#ff9999");
					}

				});

				btnFindGpsTime.click( () => {
					
					if(targetTime !== null){
						viewer.moveToGpsTimeVicinity(targetTime);
					}
				});
			}

		}

		initPointSourceIDFilters() {
			let elPointSourceIDFilterPanel = $('#pointsourceid_filter_panel');

			{
				let slider = new HierarchicalSlider({
					levels: 4,
					range: [0, 65535],
					precision: 1,
					slide: (event) => {
						let values = event.values;
						this.viewer.setFilterPointSourceIDRange(values[0], values[1]);
					}
				});

				let initialized = false;

				let initialize = () => {
					elPointSourceIDFilterPanel[0].prepend(slider.element);

					initialized = true;
				};

				this.viewer.addEventListener("update", (e) => {
					let extent = this.viewer.filterPointSourceIDRange;

					if(!initialized){
						initialize();

						slider.setValues(extent);
					}
					
				});
			}

			// let lblPointSourceID = elPointSourceIDFilterPanel.find("#lblPointSourceID");
			// let elPointSourceID = elPointSourceIDFilterPanel.find("#spnPointSourceID");

			// let slider = new ZoomableSlider();
			// elPointSourceID[0].appendChild(slider.element);
			// slider.update();

			// slider.change( () => {
			// 	let range = slider.chosenRange;
			// 	this.viewer.setFilterPointSourceIDRange(range[0], range[1]);
			// });

			// let onPointSourceIDExtentChanged = (event) => {
			// 	let range = this.viewer.filterPointSourceIDExtent;
			// 	slider.setVisibleRange(range);
			// };

			// let onPointSourceIDChanged = (event) => {
			// 	let range = this.viewer.filterPointSourceIDRange;

			// 	let precision = 1;
			// 	let from = `${Utils.addCommas(range[0].toFixed(precision))}`;
			// 	let to = `${Utils.addCommas(range[1].toFixed(precision))}`;
			// 	lblPointSourceID[0].innerHTML = `${from} to ${to}`;

			// 	slider.setRange(range);
			// };

			// this.viewer.addEventListener('filter_point_source_id_range_changed', onPointSourceIDChanged);
			// this.viewer.addEventListener('filter_point_source_id_extent_changed', onPointSourceIDExtentChanged);

		}

		initClassificationList(){
			let elClassificationList = $('#classificationList');

			let addClassificationItem = (code, name) => {
				const classification = this.viewer.classifications[code];
				const inputID = 'chkClassification_' + code;
				const colorPickerID = 'colorPickerClassification_' + code;

				const checked = classification.visible ? "checked" : "";

				let element = $(`
				<li>
					<label style="whitespace: nowrap; display: flex">
						<input id="${inputID}" type="checkbox" ${checked}/>
						<span style="flex-grow: 1">${name}</span>
						<input id="${colorPickerID}" style="zoom: 0.5" />
					</label>
				</li>
			`);

				const elInput = element.find('input');
				const elColorPicker = element.find(`#${colorPickerID}`);

				elInput.click(event => {
					this.viewer.setClassificationVisibility(code, event.target.checked);
				});

				let defaultColor = classification.color.map(c => c *  255).join(", ");
				defaultColor = `rgb(${defaultColor})`;


				elColorPicker.spectrum({
					// flat: true,
					color: defaultColor,
					showInput: true,
					preferredFormat: 'rgb',
					cancelText: '',
					chooseText: 'Apply',
					move: color => {
						let rgb = color.toRgb();
						const c = [rgb.r / 255, rgb.g / 255, rgb.b / 255, 1];
						classification.color = c;
					},
					change: color => {
						let rgb = color.toRgb();
						const c = [rgb.r / 255, rgb.g / 255, rgb.b / 255, 1];
						classification.color = c;
					}
				});

				elClassificationList.append(element);
			};

			const addToggleAllButton = () => { // toggle all button
				const element = $(`
				<li>
					<label style="whitespace: nowrap">
						<input id="toggleClassificationFilters" type="checkbox" checked/>
						<span>show/hide all</span>
					</label>
				</li>
			`);

				let elInput = element.find('input');

				elInput.click(event => {
					this.viewer.toggleAllClassificationsVisibility();
				});

				elClassificationList.append(element);
			};

			const addInvertButton = () => { 
				const element = $(`
				<li>
					<input type="button" value="invert" />
				</li>
			`);

				let elInput = element.find('input');

				elInput.click( () => {
					const classifications = this.viewer.classifications;
		
					for(let key of Object.keys(classifications)){
						let value = classifications[key];
						this.viewer.setClassificationVisibility(key, !value.visible);
					}
				});

				elClassificationList.append(element);
			};

			const populate = () => {
				addToggleAllButton();
				for (let classID in this.viewer.classifications) {
					addClassificationItem(classID, this.viewer.classifications[classID].name);
				}
				addInvertButton();
			};

			populate();

			this.viewer.addEventListener("classifications_changed", () => {
				elClassificationList.empty();
				populate();
			});

			this.viewer.addEventListener("classification_visibility_changed", () => {

				{ // set checked state of classification buttons
					for(const classID of Object.keys(this.viewer.classifications)){
						const classValue = this.viewer.classifications[classID];

						let elItem = elClassificationList.find(`#chkClassification_${classID}`);
						elItem.prop("checked", classValue.visible);
					}
				}

				{ // set checked state of toggle button based on state of all other buttons
					let numVisible = 0;
					let numItems = 0;
					for(const key of Object.keys(this.viewer.classifications)){
						if(this.viewer.classifications[key].visible){
							numVisible++;
						}
						numItems++;
					}
					const allVisible = numVisible === numItems;

					let elToggle = elClassificationList.find("#toggleClassificationFilters");
					elToggle.prop("checked", allVisible);
				}
			});
		}

		initAccordion(){
			$('.accordion > h3').each(function(){
				let header = $(this);
				let content = $(this).next();

				//header.addClass('accordion-header ui-widget');
				//content.addClass('accordion-content ui-widget');

				content.hide();

				header.click(() => {
					content.slideToggle();
				});
			});

			let languages = [
				["EN", "en"],
				["FR", "fr"],
				["DE", "de"],
				["JP", "jp"],
				["ES", "es"],
				["SE", "se"]
			];

			let elLanguages = $('#potree_languages');
			for(let i = 0; i < languages.length; i++){
				let [key, value] = languages[i];
				let element = $(`<a>${key}</a>`);
				element.click(() => this.viewer.setLanguage(value));

				if(i === 0){
					element.css("margin-left", "30px");
				}
				
				elLanguages.append(element);

				if(i < languages.length - 1){
					elLanguages.append($(document.createTextNode(' - ')));	
				}
			}


			// to close all, call
			// $(".accordion > div").hide()

			// to open the, for example, tool menu, call:
			// $("#menu_tools").next().show()
		}

		initAppearance(){

			const sldPointBudget = this.dom.find('#sldPointBudget');

			sldPointBudget.slider({
				value: this.viewer.getPointBudget(),
				min: 100 * 1000,
				max: 10 * 1000 * 1000,
				step: 1000,
				slide: (event, ui) => { this.viewer.setPointBudget(ui.value); }
			});

			this.dom.find('#sldFOV').slider({
				value: this.viewer.getFOV(),
				min: 20,
				max: 100,
				step: 1,
				slide: (event, ui) => { this.viewer.setFOV(ui.value); }
			});

			$('#sldEDLRadius').slider({
				value: this.viewer.getEDLRadius(),
				min: 1,
				max: 4,
				step: 0.01,
				slide: (event, ui) => { this.viewer.setEDLRadius(ui.value); }
			});

			$('#sldEDLStrength').slider({
				value: this.viewer.getEDLStrength(),
				min: 0,
				max: 5,
				step: 0.01,
				slide: (event, ui) => { this.viewer.setEDLStrength(ui.value); }
			});

			$('#sldEDLOpacity').slider({
				value: this.viewer.getEDLOpacity(),
				min: 0,
				max: 1,
				step: 0.01,
				slide: (event, ui) => { this.viewer.setEDLOpacity(ui.value); }
			});

			this.viewer.addEventListener('point_budget_changed', (event) => {
				$('#lblPointBudget')[0].innerHTML = Utils.addCommas(this.viewer.getPointBudget());
				sldPointBudget.slider({value: this.viewer.getPointBudget()});
			});

			this.viewer.addEventListener('fov_changed', (event) => {
				$('#lblFOV')[0].innerHTML = parseInt(this.viewer.getFOV());
				$('#sldFOV').slider({value: this.viewer.getFOV()});
			});

			this.viewer.addEventListener('use_edl_changed', (event) => {
				$('#chkEDLEnabled')[0].checked = this.viewer.getEDLEnabled();
			});

			this.viewer.addEventListener('edl_radius_changed', (event) => {
				$('#lblEDLRadius')[0].innerHTML = this.viewer.getEDLRadius().toFixed(1);
				$('#sldEDLRadius').slider({value: this.viewer.getEDLRadius()});
			});

			this.viewer.addEventListener('edl_strength_changed', (event) => {
				$('#lblEDLStrength')[0].innerHTML = this.viewer.getEDLStrength().toFixed(1);
				$('#sldEDLStrength').slider({value: this.viewer.getEDLStrength()});
			});

			this.viewer.addEventListener('background_changed', (event) => {
				$("input[name=background][value='" + this.viewer.getBackground() + "']").prop('checked', true);
			});

			$('#lblPointBudget')[0].innerHTML = Utils.addCommas(this.viewer.getPointBudget());
			$('#lblFOV')[0].innerHTML = parseInt(this.viewer.getFOV());
			$('#lblEDLRadius')[0].innerHTML = this.viewer.getEDLRadius().toFixed(1);
			$('#lblEDLStrength')[0].innerHTML = this.viewer.getEDLStrength().toFixed(1);
			$('#chkEDLEnabled')[0].checked = this.viewer.getEDLEnabled();
			
			{
				let elBackground = $(`#background_options`);
				elBackground.selectgroup();

				elBackground.find("input").click( (e) => {
					this.viewer.setBackground(e.target.value);
				});

				let currentBackground = this.viewer.getBackground();
				$(`input[name=background_options][value=${currentBackground}]`).trigger("click");
			}

			$('#chkEDLEnabled').click( () => {
				this.viewer.setEDLEnabled($('#chkEDLEnabled').prop("checked"));
			});
		}

		initNavigation(){
			let elNavigation = $('#navigation');
			let sldMoveSpeed = $('#sldMoveSpeed');
			let lblMoveSpeed = $('#lblMoveSpeed');

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/earth_controls_1.png',
				'[title]tt.earth_control',
				() => { this.viewer.setControls(this.viewer.earthControls); }
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/fps_controls.png',
				'[title]tt.flight_control',
				() => {
					this.viewer.setControls(this.viewer.fpControls);
					this.viewer.fpControls.lockElevation = false;
				}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/helicopter_controls.png',
				'[title]tt.heli_control',
				() => { 
					this.viewer.setControls(this.viewer.fpControls);
					this.viewer.fpControls.lockElevation = true;
				}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/orbit_controls.png',
				'[title]tt.orbit_control',
				() => { this.viewer.setControls(this.viewer.orbitControls); }
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + '/icons/focus.png',
				'[title]tt.focus_control',
				() => { this.viewer.fitToScreen(); }
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/navigation_cube.png",
				"[title]tt.navigation_cube_control",
				() => {this.viewer.toggleNavigationCube();}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/images/compas.svg",
				"[title]tt.compass",
				() => {
					const visible = !this.viewer.compass.isVisible();
					this.viewer.compass.setVisible(visible);
				}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/camera_animation.png",
				"[title]tt.camera_animation",
				() => {
					const animation = CameraAnimation.defaultFromView(this.viewer);

					viewer.scene.addCameraAnimation(animation);
				}
			));


			elNavigation.append("<br>");


			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/left.svg",
				"[title]tt.left_view_control",
				() => {this.viewer.setLeftView();}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/right.svg",
				"[title]tt.right_view_control",
				() => {this.viewer.setRightView();}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/front.svg",
				"[title]tt.front_view_control",
				() => {this.viewer.setFrontView();}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/back.svg",
				"[title]tt.back_view_control",
				() => {this.viewer.setBackView();}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/top.svg",
				"[title]tt.top_view_control",
				() => {this.viewer.setTopView();}
			));

			elNavigation.append(this.createToolIcon(
				Potree.resourcePath + "/icons/bottom.svg",
				"[title]tt.bottom_view_control",
				() => {this.viewer.setBottomView();}
			));





			let elCameraProjection = $(`
			<selectgroup id="camera_projection_options">
				<option id="camera_projection_options_perspective" value="PERSPECTIVE">Perspective</option>
				<option id="camera_projection_options_orthigraphic" value="ORTHOGRAPHIC">Orthographic</option>
			</selectgroup>
		`);
			elNavigation.append(elCameraProjection);
			elCameraProjection.selectgroup({title: "Camera Projection"});
			elCameraProjection.find("input").click( (e) => {
				this.viewer.setCameraMode(CameraMode[e.target.value]);
			});
			let cameraMode = Object.keys(CameraMode)
				.filter(key => CameraMode[key] === this.viewer.scene.cameraMode);
			elCameraProjection.find(`input[value=${cameraMode}]`).trigger("click");

			let speedRange = new THREE.Vector2(1, 10 * 1000);

			let toLinearSpeed = (value) => {
				return Math.pow(value, 4) * speedRange.y + speedRange.x;
			};

			let toExpSpeed = (value) => {
				return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
			};

			sldMoveSpeed.slider({
				value: toExpSpeed(this.viewer.getMoveSpeed()),
				min: 0,
				max: 1,
				step: 0.01,
				slide: (event, ui) => { this.viewer.setMoveSpeed(toLinearSpeed(ui.value)); }
			});

			this.viewer.addEventListener('move_speed_changed', (event) => {
				lblMoveSpeed.html(this.viewer.getMoveSpeed().toFixed(1));
				sldMoveSpeed.slider({value: toExpSpeed(this.viewer.getMoveSpeed())});
			});

			lblMoveSpeed.html(this.viewer.getMoveSpeed().toFixed(1));
		}


		initSettings(){

			{
				$('#sldMinNodeSize').slider({
					value: this.viewer.getMinNodeSize(),
					min: 0,
					max: 1000,
					step: 0.01,
					slide: (event, ui) => { this.viewer.setMinNodeSize(ui.value); }
				});

				this.viewer.addEventListener('minnodesize_changed', (event) => {
					$('#lblMinNodeSize').html(parseInt(this.viewer.getMinNodeSize()));
					$('#sldMinNodeSize').slider({value: this.viewer.getMinNodeSize()});
				});
				$('#lblMinNodeSize').html(parseInt(this.viewer.getMinNodeSize()));
			}

			{
				let elSplatQuality = $("#splat_quality_options");
				elSplatQuality.selectgroup({title: "Splat Quality"});

				elSplatQuality.find("input").click( (e) => {
					if(e.target.value === "standard"){
						this.viewer.useHQ = false;
					}else if(e.target.value === "hq"){
						this.viewer.useHQ = true;
					}
				});

				let currentQuality = this.viewer.useHQ ? "hq" : "standard";
				elSplatQuality.find(`input[value=${currentQuality}]`).trigger("click");
			}

			$('#show_bounding_box').click(() => {
				this.viewer.setShowBoundingBox($('#show_bounding_box').prop("checked"));
			});

			$('#set_freeze').click(() => {
				this.viewer.setFreeze($('#set_freeze').prop("checked"));
			});
		}

	}

	class AnnotationTool extends EventDispatcher{
		constructor (viewer) {
			super();

			this.viewer = viewer;
			this.renderer = viewer.renderer;

			this.sg = new THREE.SphereGeometry(0.1);
			this.sm = new THREE.MeshNormalMaterial();
			this.s = new THREE.Mesh(this.sg, this.sm);
		}

		startInsertion (args = {}) {
			let domElement = this.viewer.renderer.domElement;

			let annotation = new Annotation({
				position: [589748.270, 231444.540, 753.675],
				title: "Annotation Title",
				description: `Annotation Description`
			});
			this.dispatchEvent({type: 'start_inserting_annotation', annotation: annotation});

			const annotations = this.viewer.scene.annotations;
			annotations.add(annotation);

			let callbacks = {
				cancel: null,
				finish: null,
			};

			let insertionCallback = (e) => {
				if (e.button === THREE.MOUSE.LEFT) {
					callbacks.finish();
				} else if (e.button === THREE.MOUSE.RIGHT) {
					callbacks.cancel();
				}
			};

			callbacks.cancel = e => {
				annotations.remove(annotation);

				domElement.removeEventListener('mouseup', insertionCallback, true);
			};

			callbacks.finish = e => {
				domElement.removeEventListener('mouseup', insertionCallback, true);
			};

			domElement.addEventListener('mouseup', insertionCallback, true);

			let drag = (e) => {
				let I = Utils.getMousePointCloudIntersection(
					e.drag.end, 
					e.viewer.scene.getActiveCamera(), 
					e.viewer, 
					e.viewer.scene.pointclouds,
					{pickClipped: true});

				if (I) {
					this.s.position.copy(I.location);

					annotation.position.copy(I.location);
				}
			};

			let drop = (e) => {
				viewer.scene.scene.remove(this.s);
				this.s.removeEventListener("drag", drag);
				this.s.removeEventListener("drop", drop);
			};

			this.s.addEventListener('drag', drag);
			this.s.addEventListener('drop', drop);

			this.viewer.scene.scene.add(this.s);
			this.viewer.inputHandler.startDragging(this.s);

			return annotation;
		}
		
		update(){
			// let camera = this.viewer.scene.getActiveCamera();
			// let domElement = this.renderer.domElement;
			// let measurements = this.viewer.scene.measurements;

			// const renderAreaSize = this.renderer.getSize(new THREE.Vector2());
			// let clientWidth = renderAreaSize.width;
			// let clientHeight = renderAreaSize.height;

		}

		render(){
			//this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
		}
	};

	/**
	 * @author mschuetz / http://mschuetz.at
	 *
	 *
	 */

	class InputHandler extends EventDispatcher {
		constructor (viewer) {
			super();

			this.viewer = viewer;
			this.renderer = viewer.renderer;
			this.domElement = this.renderer.domElement;
			this.enabled = true;
			
			this.scene = null;
			this.interactiveScenes = [];
			this.interactiveObjects = new Set();
			this.inputListeners = [];
			this.blacklist = new Set();

			this.drag = null;
			this.mouse = new THREE.Vector2(0, 0);

			this.selection = [];

			this.hoveredElements = [];
			this.pressedKeys = {};

			this.wheelDelta = 0;

			this.speed = 1;

			this.logMessages = false;

			if (this.domElement.tabIndex === -1) {
				this.domElement.tabIndex = 2222;
			}

			this.domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
			this.domElement.addEventListener('click', this.onMouseClick.bind(this), false);
			this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
			this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
			this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
			this.domElement.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
			this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel.bind(this), false); // Firefox
			this.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
			this.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
			this.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
			this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
			this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
			this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
		}

		addInputListener (listener) {
			this.inputListeners.push(listener);
		}

		removeInputListener (listener) {
			this.inputListeners = this.inputListeners.filter(e => e !== listener);
		}

		getSortedListeners(){
			return this.inputListeners.sort( (a, b) => {
				let ia = (a.importance !== undefined) ? a.importance : 0;
				let ib = (b.importance !== undefined) ? b.importance : 0;

				return ib - ia;
			});
		}

		onTouchStart (e) {
			if (this.logMessages) console.log(this.constructor.name + ': onTouchStart');

			e.preventDefault();

			if (e.touches.length === 1) {
				let rect = this.domElement.getBoundingClientRect();
				let x = e.touches[0].pageX - rect.left;
				let y = e.touches[0].pageY - rect.top;
				this.mouse.set(x, y);

				this.startDragging(null);
			}

			
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: e.type,
					touches: e.touches,
					changedTouches: e.changedTouches
				});
			}
		}

		onTouchEnd (e) {
			if (this.logMessages) console.log(this.constructor.name + ': onTouchEnd');

			e.preventDefault();

			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'drop',
					drag: this.drag,
					viewer: this.viewer
				});
			}

			this.drag = null;

			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: e.type,
					touches: e.touches,
					changedTouches: e.changedTouches
				});
			}
		}

		onTouchMove (e) {
			if (this.logMessages) console.log(this.constructor.name + ': onTouchMove');

			e.preventDefault();

			if (e.touches.length === 1) {
				let rect = this.domElement.getBoundingClientRect();
				let x = e.touches[0].pageX - rect.left;
				let y = e.touches[0].pageY - rect.top;
				this.mouse.set(x, y);

				if (this.drag) {
					this.drag.mouse = 1;

					this.drag.lastDrag.x = x - this.drag.end.x;
					this.drag.lastDrag.y = y - this.drag.end.y;

					this.drag.end.set(x, y);

					if (this.logMessages) console.log(this.constructor.name + ': drag: ');
					for (let inputListener of this.getSortedListeners()) {
						inputListener.dispatchEvent({
							type: 'drag',
							drag: this.drag,
							viewer: this.viewer
						});
					}
				}
			}

			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: e.type,
					touches: e.touches,
					changedTouches: e.changedTouches
				});
			}

			// DEBUG CODE
			// let debugTouches = [...e.touches, {
			//	pageX: this.domElement.clientWidth / 2,
			//	pageY: this.domElement.clientHeight / 2}];
			// for(let inputListener of this.getSortedListeners()){
			//	inputListener.dispatchEvent({
			//		type: e.type,
			//		touches: debugTouches,
			//		changedTouches: e.changedTouches
			//	});
			// }
		}

		onKeyDown (e) {
			if (this.logMessages) console.log(this.constructor.name + ': onKeyDown');

			// DELETE
			if (e.keyCode === KeyCodes.DELETE && this.selection.length > 0) {
				this.dispatchEvent({
					type: 'delete',
					selection: this.selection
				});

				this.deselectAll();
			}

			this.dispatchEvent({
				type: 'keydown',
				keyCode: e.keyCode,
				event: e
			});

			// for(let l of this.getSortedListeners()){
			//	l.dispatchEvent({
			//		type: "keydown",
			//		keyCode: e.keyCode,
			//		event: e
			//	});
			// }

			this.pressedKeys[e.keyCode] = true;

			// e.preventDefault();
		}

		onKeyUp (e) {
			if (this.logMessages) console.log(this.constructor.name + ': onKeyUp');

			delete this.pressedKeys[e.keyCode];

			e.preventDefault();
		}

		onDoubleClick (e) {
			if (this.logMessages) console.log(this.constructor.name + ': onDoubleClick');

			let consumed = false;
			for (let hovered of this.hoveredElements) {
				if (hovered._listeners && hovered._listeners['dblclick']) {
					hovered.object.dispatchEvent({
						type: 'dblclick',
						mouse: this.mouse,
						object: hovered.object
					});
					consumed = true;
					break;
				}
			}

			if (!consumed) {
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'dblclick',
						mouse: this.mouse,
						object: null
					});
				}
			}

			e.preventDefault();
		}

		onMouseClick (e) {
			if (this.logMessages) console.log(this.constructor.name + ': onMouseClick');

			e.preventDefault();
		}

		onMouseDown (e) {
			if (this.logMessages) console.log(this.constructor.name + ': onMouseDown');

			e.preventDefault();

			let consumed = false;
			let consume = () => { return consumed = true; };
			if (this.hoveredElements.length === 0) {
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'mousedown',
						viewer: this.viewer,
						mouse: this.mouse
					});
				}
			}else {
				for(let hovered of this.hoveredElements){
					let object = hovered.object;
					object.dispatchEvent({
						type: 'mousedown',
						viewer: this.viewer,
						consume: consume
					});

					if(consumed){
						break;
					}
				}
			}

			if (!this.drag) {
				let target = this.hoveredElements
					.find(el => (
						el.object._listeners &&
						el.object._listeners['drag'] &&
						el.object._listeners['drag'].length > 0));

				if (target) {
					this.startDragging(target.object, {location: target.point});
				} else {
					this.startDragging(null);
				}
			}

			if (this.scene) {
				this.viewStart = this.scene.view.clone();
			}
		}

		onMouseUp (e) {
			if (this.logMessages) console.log(this.constructor.name + ': onMouseUp');

			e.preventDefault();

			let noMovement = this.getNormalizedDrag().length() === 0;

			
			let consumed = false;
			let consume = () => { return consumed = true; };
			if (this.hoveredElements.length === 0) {
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'mouseup',
						viewer: this.viewer,
						mouse: this.mouse,
						consume: consume
					});

					if(consumed){
						break;
					}
				}
			}else {
				let hovered = this.hoveredElements
					.map(e => e.object)
					.find(e => (e._listeners && e._listeners['mouseup']));
				if(hovered){
					hovered.dispatchEvent({
						type: 'mouseup',
						viewer: this.viewer,
						consume: consume
					});
				}
			}

			if (this.drag) {
				if (this.drag.object) {
					if (this.logMessages) console.log(`${this.constructor.name}: drop ${this.drag.object.name}`);
					this.drag.object.dispatchEvent({
						type: 'drop',
						drag: this.drag,
						viewer: this.viewer

					});
				} else {
					for (let inputListener of this.getSortedListeners()) {
						inputListener.dispatchEvent({
							type: 'drop',
							drag: this.drag,
							viewer: this.viewer
						});
					}
				}

				// check for a click
				let clicked = this.hoveredElements.map(h => h.object).find(v => v === this.drag.object) !== undefined;
				if(clicked){
					if (this.logMessages) console.log(`${this.constructor.name}: click ${this.drag.object.name}`);
					this.drag.object.dispatchEvent({
						type: 'click',
						viewer: this.viewer,
						consume: consume,
					});
				}

				this.drag = null;
			}

			if(!consumed){
				if (e.button === THREE.MOUSE.LEFT) {
					if (noMovement) {
						let selectable = this.hoveredElements
							.find(el => el.object._listeners && el.object._listeners['select']);

						if (selectable) {
							selectable = selectable.object;

							if (this.isSelected(selectable)) {
								this.selection
									.filter(e => e !== selectable)
									.forEach(e => this.toggleSelection(e));
							} else {
								this.deselectAll();
								this.toggleSelection(selectable);
							}
						} else {
							this.deselectAll();
						}
					}
				} else if ((e.button === THREE.MOUSE.RIGHT) && noMovement) {
					this.deselectAll();
				}
			}
		}

		onMouseMove (e) {
			e.preventDefault();

			let rect = this.domElement.getBoundingClientRect();
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top;
			this.mouse.set(x, y);

			let hoveredElements = this.getHoveredElements();
			if(hoveredElements.length > 0){
				let names = hoveredElements.map(h => h.object.name).join(", ");
				if (this.logMessages) console.log(`${this.constructor.name}: onMouseMove; hovered: '${names}'`);
			}

			if (this.drag) {
				this.drag.mouse = e.buttons;

				this.drag.lastDrag.x = x - this.drag.end.x;
				this.drag.lastDrag.y = y - this.drag.end.y;

				this.drag.end.set(x, y);

				if (this.drag.object) {
					if (this.logMessages) console.log(this.constructor.name + ': drag: ' + this.drag.object.name);
					this.drag.object.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer
					});
				} else {
					if (this.logMessages) console.log(this.constructor.name + ': drag: ');

					let dragConsumed = false;
					for (let inputListener of this.getSortedListeners()) {
						inputListener.dispatchEvent({
							type: 'drag',
							drag: this.drag,
							viewer: this.viewer,
							consume: () => {dragConsumed = true;}
						});

						if(dragConsumed){
							break;
						}
					}
				}
			}else {
				let curr = hoveredElements.map(a => a.object).find(a => true);
				let prev = this.hoveredElements.map(a => a.object).find(a => true);

				if(curr !== prev){
					if(curr){
						if (this.logMessages) console.log(`${this.constructor.name}: mouseover: ${curr.name}`);
						curr.dispatchEvent({
							type: 'mouseover',
							object: curr,
						});
					}
					if(prev){
						if (this.logMessages) console.log(`${this.constructor.name}: mouseleave: ${prev.name}`);
						prev.dispatchEvent({
							type: 'mouseleave',
							object: prev,
						});
					}
				}

				if(hoveredElements.length > 0){
					let object = hoveredElements
						.map(e => e.object)
						.find(e => (e._listeners && e._listeners['mousemove']));
					
					if(object){
						object.dispatchEvent({
							type: 'mousemove',
							object: object
						});
					}
				}

			}
			
			// for (let inputListener of this.getSortedListeners()) {
			// 	inputListener.dispatchEvent({
			// 		type: 'mousemove',
			// 		object: null
			// 	});
			// }
			

			this.hoveredElements = hoveredElements;
		}
		
		onMouseWheel(e){
			if(!this.enabled) return;

			if(this.logMessages) console.log(this.constructor.name + ": onMouseWheel");
			
			e.preventDefault();

			let delta = 0;
			if (e.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
				delta = e.wheelDelta;
			} else if (e.detail !== undefined) { // Firefox
				delta = -e.detail;
			}

			let ndelta = Math.sign(delta);

			// this.wheelDelta += Math.sign(delta);

			if (this.hoveredElement) {
				this.hoveredElement.object.dispatchEvent({
					type: 'mousewheel',
					delta: ndelta,
					object: this.hoveredElement.object
				});
			} else {
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'mousewheel',
						delta: ndelta,
						object: null
					});
				}
			}
		}

		startDragging (object, args = null) {

			let name = object ? object.name : "no name";
			if (this.logMessages) console.log(`${this.constructor.name}: startDragging: '${name}'`);

			this.drag = {
				start: this.mouse.clone(),
				end: this.mouse.clone(),
				lastDrag: new THREE.Vector2(0, 0),
				startView: this.scene.view.clone(),
				object: object
			};

			if (args) {
				for (let key of Object.keys(args)) {
					this.drag[key] = args[key];
				}
			}
		}

		getMousePointCloudIntersection (mouse) {
			return Utils.getMousePointCloudIntersection(
				this.mouse, 
				this.scene.getActiveCamera(), 
				this.viewer, 
				this.scene.pointclouds);
		}

		toggleSelection (object) {
			let oldSelection = this.selection;

			let index = this.selection.indexOf(object);

			if (index === -1) {
				this.selection.push(object);
				object.dispatchEvent({
					type: 'select'
				});
			} else {
				this.selection.splice(index, 1);
				object.dispatchEvent({
					type: 'deselect'
				});
			}

			this.dispatchEvent({
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection
			});
		}

		deselect(object){

			let oldSelection = this.selection;

			let index = this.selection.indexOf(object);

			if(index >= 0){
				this.selection.splice(index, 1);
				object.dispatchEvent({
					type: 'deselect'
				});

				this.dispatchEvent({
					type: 'selection_changed',
					oldSelection: oldSelection,
					selection: this.selection
				});
			}
		}

		deselectAll () {
			for (let object of this.selection) {
				object.dispatchEvent({
					type: 'deselect'
				});
			}

			let oldSelection = this.selection;

			if (this.selection.length > 0) {
				this.selection = [];
				this.dispatchEvent({
					type: 'selection_changed',
					oldSelection: oldSelection,
					selection: this.selection
				});
			}
		}

		isSelected (object) {
			let index = this.selection.indexOf(object);

			return index !== -1;
		}

		registerInteractiveObject(object){
			this.interactiveObjects.add(object);
		}

		removeInteractiveObject(object){
			this.interactiveObjects.delete(object);
		}

		registerInteractiveScene (scene) {
			let index = this.interactiveScenes.indexOf(scene);
			if (index === -1) {
				this.interactiveScenes.push(scene);
			}
		}

		unregisterInteractiveScene (scene) {
			let index = this.interactiveScenes.indexOf(scene);
			if (index > -1) {
				this.interactiveScenes.splice(index, 1);
			}
		}

		getHoveredElement () {
			let hoveredElements = this.getHoveredElements();
			if (hoveredElements.length > 0) {
				return hoveredElements[0];
			} else {
				return null;
			}
		}

		getHoveredElements () {
			let scenes = this.interactiveScenes.concat(this.scene.scene);

			let interactableListeners = ['mouseup', 'mousemove', 'mouseover', 'mouseleave', 'drag', 'drop', 'click', 'select', 'deselect'];
			let interactables = [];
			for (let scene of scenes) {
				scene.traverseVisible(node => {
					if (node._listeners && node.visible && !this.blacklist.has(node)) {
						let hasInteractableListener = interactableListeners.filter((e) => {
							return node._listeners[e] !== undefined;
						}).length > 0;

						if (hasInteractableListener) {
							interactables.push(node);
						}
					}
				});
			}
			
			let camera = this.scene.getActiveCamera();
			let ray = Utils.mouseToRay(this.mouse, camera, this.domElement.clientWidth, this.domElement.clientHeight);
			
			let raycaster = new THREE.Raycaster();
			raycaster.ray.set(ray.origin, ray.direction);
			raycaster.linePrecision = 0.2;

			let intersections = raycaster.intersectObjects(interactables.filter(o => o.visible), false);

			return intersections;

			// if(intersections.length > 0){
			//	return intersections[0];
			// }else{
			//	return null;
			// }
		}

		setScene (scene) {
			this.deselectAll();

			this.scene = scene;
		}

		update (delta) {

		}

		getNormalizedDrag () {
			if (!this.drag) {
				return new THREE.Vector2(0, 0);
			}

			let diff = new THREE.Vector2().subVectors(this.drag.end, this.drag.start);

			diff.x = diff.x / this.domElement.clientWidth;
			diff.y = diff.y / this.domElement.clientHeight;

			return diff;
		}

		getNormalizedLastDrag () {
			if (!this.drag) {
				return new THREE.Vector2(0, 0);
			}

			let lastDrag = this.drag.lastDrag.clone();

			lastDrag.x = lastDrag.x / this.domElement.clientWidth;
			lastDrag.y = lastDrag.y / this.domElement.clientHeight;

			return lastDrag;
		}
	}

	class NavigationCube extends THREE.Object3D {

		constructor(viewer){
			super();

			this.viewer = viewer;

			let createPlaneMaterial = (img) => {
				let material = new THREE.MeshBasicMaterial( {
					depthTest: true, 
					depthWrite: true,
					side: THREE.DoubleSide
				});
				new THREE.TextureLoader().load(
					exports.resourcePath + '/textures/navigation/' + img,
					function(texture) {
						texture.anisotropy = viewer.renderer.capabilities.getMaxAnisotropy();
						material.map = texture;
						material.needsUpdate = true;
					});
				return material;
			};

			let planeGeometry = new THREE.PlaneGeometry(1, 1);

			this.front = new THREE.Mesh(planeGeometry, createPlaneMaterial('F.png'));
			this.front.position.y = -0.5;
			this.front.rotation.x = Math.PI / 2.0;
			this.front.updateMatrixWorld();
			this.front.name = "F";
			this.add(this.front);

			this.back = new THREE.Mesh(planeGeometry, createPlaneMaterial('B.png'));
			this.back.position.y = 0.5;
			this.back.rotation.x = Math.PI / 2.0;
			this.back.updateMatrixWorld();
			this.back.name = "B";
			this.add(this.back);

			this.left = new THREE.Mesh(planeGeometry, createPlaneMaterial('L.png'));
			this.left.position.x = -0.5;
			this.left.rotation.y = Math.PI / 2.0;
			this.left.updateMatrixWorld();
			this.left.name = "L";
			this.add(this.left);

			this.right = new THREE.Mesh(planeGeometry, createPlaneMaterial('R.png'));
			this.right.position.x = 0.5;
			this.right.rotation.y = Math.PI / 2.0;
			this.right.updateMatrixWorld();
			this.right.name = "R";
			this.add(this.right);

			this.bottom = new THREE.Mesh(planeGeometry, createPlaneMaterial('D.png'));
			this.bottom.position.z = -0.5;
			this.bottom.updateMatrixWorld();
			this.bottom.name = "D";
			this.add(this.bottom);

			this.top = new THREE.Mesh(planeGeometry, createPlaneMaterial('U.png'));
			this.top.position.z = 0.5;
			this.top.updateMatrixWorld();
			this.top.name = "U";
			this.add(this.top);

			this.width = 150; // in px

			this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
			this.camera.position.copy(new THREE.Vector3(0, 0, 0));
			this.camera.lookAt(new THREE.Vector3(0, 1, 0));
			this.camera.updateMatrixWorld();
			this.camera.rotation.order = "ZXY";

			let onMouseDown = (event) => {
				if (!this.visible) {
					return;
				}
				
				this.pickedFace = null;
				let mouse = new THREE.Vector2();
				mouse.x = event.clientX - (window.innerWidth - this.width);
				mouse.y = event.clientY;

				if(mouse.x < 0 || mouse.y > this.width) return;

				mouse.x = (mouse.x / this.width) * 2 - 1;
				mouse.y = -(mouse.y / this.width) * 2 + 1;

				let raycaster = new THREE.Raycaster();
				raycaster.setFromCamera(mouse, this.camera);
				raycaster.ray.origin.sub(this.camera.getWorldDirection(new THREE.Vector3()));

				let intersects = raycaster.intersectObjects(this.children);

				let minDistance = 1000;
				for (let i = 0; i < intersects.length; i++) {
					if(intersects[i].distance < minDistance) {
						this.pickedFace = intersects[i].object.name;
						minDistance = intersects[i].distance;
					}
				}
				
				if(this.pickedFace) {
					this.viewer.setView(this.pickedFace);
				}
			};

			this.viewer.renderer.domElement.addEventListener('mousedown', onMouseDown, false);
		}

		update(rotation) {
			this.camera.rotation.copy(rotation);
			this.camera.updateMatrixWorld();
		}

	}

	/**
	 * @author mschuetz / http://mschuetz.at
	 *
	 * adapted from THREE.OrbitControls by
	 *
	 * @author qiao / https://github.com/qiao
	 * @author mrdoob / http://mrdoob.com
	 * @author alteredq / http://alteredqualia.com/
	 * @author WestLangley / http://github.com/WestLangley
	 * @author erich666 / http://erichaines.com
	 *
	 *
	 *
	 */

	 
	class OrbitControls extends EventDispatcher{
		
		constructor(viewer){
			super();
			
			this.viewer = viewer;
			this.renderer = viewer.renderer;

			this.scene = null;
			this.sceneControls = new THREE.Scene();

			this.rotationSpeed = 5;

			this.fadeFactor = 20;
			this.yawDelta = 0;
			this.pitchDelta = 0;
			this.panDelta = new THREE.Vector2(0, 0);
			this.radiusDelta = 0;

			this.doubleClockZoomEnabled = true;

			this.tweens = [];

			let drag = (e) => {
				if (e.drag.object !== null) {
					return;
				}

				if (e.drag.startHandled === undefined) {
					e.drag.startHandled = true;

					this.dispatchEvent({type: 'start'});
				}

				let ndrag = {
					x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
					y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
				};

				if (e.drag.mouse === MOUSE.LEFT) {
					this.yawDelta += ndrag.x * this.rotationSpeed;
					this.pitchDelta += ndrag.y * this.rotationSpeed;

					this.stopTweens();
				} else if (e.drag.mouse === MOUSE.RIGHT) {
					this.panDelta.x += ndrag.x;
					this.panDelta.y += ndrag.y;

					this.stopTweens();
				}
			};

			let drop = e => {
				this.dispatchEvent({type: 'end'});
			};

			let scroll = (e) => {
				let resolvedRadius = this.scene.view.radius + this.radiusDelta;

				this.radiusDelta += -e.delta * resolvedRadius * 0.1;

				this.stopTweens();
			};

			let dblclick = (e) => {
				if(this.doubleClockZoomEnabled){
					this.zoomToLocation(e.mouse);
				}
			};

			let previousTouch = null;
			let touchStart = e => {
				previousTouch = e;
			};

			let touchEnd = e => {
				previousTouch = e;
			};

			let touchMove = e => {
				if (e.touches.length === 2 && previousTouch.touches.length === 2){
					let prev = previousTouch;
					let curr = e;

					let prevDX = prev.touches[0].pageX - prev.touches[1].pageX;
					let prevDY = prev.touches[0].pageY - prev.touches[1].pageY;
					let prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY);

					let currDX = curr.touches[0].pageX - curr.touches[1].pageX;
					let currDY = curr.touches[0].pageY - curr.touches[1].pageY;
					let currDist = Math.sqrt(currDX * currDX + currDY * currDY);

					let delta = currDist / prevDist;
					let resolvedRadius = this.scene.view.radius + this.radiusDelta;
					let newRadius = resolvedRadius / delta;
					this.radiusDelta = newRadius - resolvedRadius;

					this.stopTweens();
				}else if(e.touches.length === 3 && previousTouch.touches.length === 3){
					let prev = previousTouch;
					let curr = e;

					let prevMeanX = (prev.touches[0].pageX + prev.touches[1].pageX + prev.touches[2].pageX) / 3;
					let prevMeanY = (prev.touches[0].pageY + prev.touches[1].pageY + prev.touches[2].pageY) / 3;

					let currMeanX = (curr.touches[0].pageX + curr.touches[1].pageX + curr.touches[2].pageX) / 3;
					let currMeanY = (curr.touches[0].pageY + curr.touches[1].pageY + curr.touches[2].pageY) / 3;

					let delta = {
						x: (currMeanX - prevMeanX) / this.renderer.domElement.clientWidth,
						y: (currMeanY - prevMeanY) / this.renderer.domElement.clientHeight
					};

					this.panDelta.x += delta.x;
					this.panDelta.y += delta.y;

					this.stopTweens();
				}

				previousTouch = e;
			};

			this.addEventListener('touchstart', touchStart);
			this.addEventListener('touchend', touchEnd);
			this.addEventListener('touchmove', touchMove);
			this.addEventListener('drag', drag);
			this.addEventListener('drop', drop);
			this.addEventListener('mousewheel', scroll);
			this.addEventListener('dblclick', dblclick);
		}

		setScene (scene) {
			this.scene = scene;
		}

		stop(){
			this.yawDelta = 0;
			this.pitchDelta = 0;
			this.radiusDelta = 0;
			this.panDelta.set(0, 0);
		}
		
		zoomToLocation(mouse){
			let camera = this.scene.getActiveCamera();
			
			let I = Utils.getMousePointCloudIntersection(
				mouse,
				camera,
				this.viewer,
				this.scene.pointclouds,
				{pickClipped: true});

			if (I === null) {
				return;
			}

			let targetRadius = 0;
			{
				let minimumJumpDistance = 0.2;

				let domElement = this.renderer.domElement;
				let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

				let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
				let lastNode = nodes[nodes.length - 1];
				let radius = lastNode.getBoundingSphere(new THREE.Sphere()).radius;
				targetRadius = Math.min(this.scene.view.radius, radius);
				targetRadius = Math.max(minimumJumpDistance, targetRadius);
			}

			let d = this.scene.view.direction.multiplyScalar(-1);
			let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
			// TODO Unused: let controlsTargetPosition = I.location;

			let animationDuration = 600;
			let easing = TWEEN.Easing.Quartic.Out;

			{ // animate
				let value = {x: 0};
				let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
				tween.easing(easing);
				this.tweens.push(tween);

				let startPos = this.scene.view.position.clone();
				let targetPos = cameraTargetPosition.clone();
				let startRadius = this.scene.view.radius;
				let targetRadius = cameraTargetPosition.distanceTo(I.location);

				tween.onUpdate(() => {
					let t = value.x;
					this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
					this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
					this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

					this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
					this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
				});

				tween.onComplete(() => {
					this.tweens = this.tweens.filter(e => e !== tween);
				});

				tween.start();
			}
		}

		stopTweens () {
			this.tweens.forEach(e => e.stop());
			this.tweens = [];
		}

		update (delta) {
			let view = this.scene.view;

			{ // apply rotation
				let progression = Math.min(1, this.fadeFactor * delta);

				let yaw = view.yaw;
				let pitch = view.pitch;
				let pivot = view.getPivot();

				yaw -= progression * this.yawDelta;
				pitch -= progression * this.pitchDelta;

				view.yaw = yaw;
				view.pitch = pitch;

				let V = this.scene.view.direction.multiplyScalar(-view.radius);
				let position = new THREE.Vector3().addVectors(pivot, V);

				view.position.copy(position);
			}

			{ // apply pan
				let progression = Math.min(1, this.fadeFactor * delta);
				let panDistance = progression * view.radius * 3;

				let px = -this.panDelta.x * panDistance;
				let py = this.panDelta.y * panDistance;

				view.pan(px, py);
			}

			{ // apply zoom
				let progression = Math.min(1, this.fadeFactor * delta);

				// let radius = view.radius + progression * this.radiusDelta * view.radius * 0.1;
				let radius = view.radius + progression * this.radiusDelta;

				let V = view.direction.multiplyScalar(-radius);
				let position = new THREE.Vector3().addVectors(view.getPivot(), V);
				view.radius = radius;

				view.position.copy(position);
			}

			{
				let speed = view.radius / 2.5;
				this.viewer.setMoveSpeed(speed);
			}

			{ // decelerate over time
				let progression = Math.min(1, this.fadeFactor * delta);
				let attenuation = Math.max(0, 1 - this.fadeFactor * delta);

				this.yawDelta *= attenuation;
				this.pitchDelta *= attenuation;
				this.panDelta.multiplyScalar(attenuation);
				// this.radiusDelta *= attenuation;
				this.radiusDelta -= progression * this.radiusDelta;
			}
		}
	};

	/**
	 * @author mschuetz / http://mschuetz.at
	 *
	 * adapted from THREE.OrbitControls by
	 *
	 * @author qiao / https://github.com/qiao
	 * @author mrdoob / http://mrdoob.com
	 * @author alteredq / http://alteredqualia.com/
	 * @author WestLangley / http://github.com/WestLangley
	 * @author erich666 / http://erichaines.com
	 *
	 *
	 *
	 */


	class FirstPersonControls extends EventDispatcher {
		constructor (viewer) {
			super();

			this.viewer = viewer;
			this.renderer = viewer.renderer;

			this.scene = null;
			this.sceneControls = new THREE.Scene();

			this.rotationSpeed = 200;
			this.moveSpeed = 10;
			this.lockElevation = false;

			this.keys = {
				FORWARD: ['W'.charCodeAt(0), 38],
				BACKWARD: ['S'.charCodeAt(0), 40],
				LEFT: ['A'.charCodeAt(0), 37],
				RIGHT: ['D'.charCodeAt(0), 39],
				UP: ['R'.charCodeAt(0), 33],
				DOWN: ['F'.charCodeAt(0), 34]
			};

			this.fadeFactor = 50;
			this.yawDelta = 0;
			this.pitchDelta = 0;
			this.translationDelta = new THREE.Vector3(0, 0, 0);
			this.translationWorldDelta = new THREE.Vector3(0, 0, 0);

			this.tweens = [];

			let drag = (e) => {
				if (e.drag.object !== null) {
					return;
				}

				if (e.drag.startHandled === undefined) {
					e.drag.startHandled = true;

					this.dispatchEvent({type: 'start'});
				}

				let moveSpeed = this.viewer.getMoveSpeed();

				let ndrag = {
					x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
					y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
				};

				if (e.drag.mouse === MOUSE.LEFT) {
					this.yawDelta += ndrag.x * this.rotationSpeed;
					this.pitchDelta += ndrag.y * this.rotationSpeed;
				} else if (e.drag.mouse === MOUSE.RIGHT) {
					this.translationDelta.x -= ndrag.x * moveSpeed * 100;
					this.translationDelta.z += ndrag.y * moveSpeed * 100;
				}
			};

			let drop = e => {
				this.dispatchEvent({type: 'end'});
			};

			let scroll = (e) => {
				let speed = this.viewer.getMoveSpeed();

				if (e.delta < 0) {
					speed = speed * 0.9;
				} else if (e.delta > 0) {
					speed = speed / 0.9;
				}

				speed = Math.max(speed, 0.1);

				this.viewer.setMoveSpeed(speed);
			};

			let dblclick = (e) => {
				this.zoomToLocation(e.mouse);
			};

			this.addEventListener('drag', drag);
			this.addEventListener('drop', drop);
			this.addEventListener('mousewheel', scroll);
			this.addEventListener('dblclick', dblclick);
		}

		setScene (scene) {
			this.scene = scene;
		}

		stop(){
			this.yawDelta = 0;
			this.pitchDelta = 0;
			this.translationDelta.set(0, 0, 0);
		}
		
		zoomToLocation(mouse){
			let camera = this.scene.getActiveCamera();
			
			let I = Utils.getMousePointCloudIntersection(
				mouse,
				camera,
				this.viewer,
				this.scene.pointclouds);

			if (I === null) {
				return;
			}

			let targetRadius = 0;
			{
				let minimumJumpDistance = 0.2;

				let domElement = this.renderer.domElement;
				let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

				let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
				let lastNode = nodes[nodes.length - 1];
				let radius = lastNode.getBoundingSphere(new THREE.Sphere()).radius;
				targetRadius = Math.min(this.scene.view.radius, radius);
				targetRadius = Math.max(minimumJumpDistance, targetRadius);
			}

			let d = this.scene.view.direction.multiplyScalar(-1);
			let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
			// TODO Unused: let controlsTargetPosition = I.location;

			let animationDuration = 600;
			let easing = TWEEN.Easing.Quartic.Out;

			{ // animate
				let value = {x: 0};
				let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
				tween.easing(easing);
				this.tweens.push(tween);

				let startPos = this.scene.view.position.clone();
				let targetPos = cameraTargetPosition.clone();
				let startRadius = this.scene.view.radius;
				let targetRadius = cameraTargetPosition.distanceTo(I.location);

				tween.onUpdate(() => {
					let t = value.x;
					this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
					this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
					this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

					this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
					this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
				});

				tween.onComplete(() => {
					this.tweens = this.tweens.filter(e => e !== tween);
				});

				tween.start();
			}
		}

		update (delta) {
			let view = this.scene.view;

			{ // cancel move animations on user input
				let changes = [ this.yawDelta,
					this.pitchDelta,
					this.translationDelta.length(),
					this.translationWorldDelta.length() ];
				let changeHappens = changes.some(e => Math.abs(e) > 0.001);
				if (changeHappens && this.tweens.length > 0) {
					this.tweens.forEach(e => e.stop());
					this.tweens = [];
				}
			}

			{ // accelerate while input is given
				let ih = this.viewer.inputHandler;

				let moveForward = this.keys.FORWARD.some(e => ih.pressedKeys[e]);
				let moveBackward = this.keys.BACKWARD.some(e => ih.pressedKeys[e]);
				let moveLeft = this.keys.LEFT.some(e => ih.pressedKeys[e]);
				let moveRight = this.keys.RIGHT.some(e => ih.pressedKeys[e]);
				let moveUp = this.keys.UP.some(e => ih.pressedKeys[e]);
				let moveDown = this.keys.DOWN.some(e => ih.pressedKeys[e]);

				if(this.lockElevation){
					let dir = view.direction;
					dir.z = 0;
					dir.normalize();

					if (moveForward && moveBackward) {
						this.translationWorldDelta.set(0, 0, 0);
					} else if (moveForward) {
						this.translationWorldDelta.copy(dir.multiplyScalar(this.viewer.getMoveSpeed()));
					} else if (moveBackward) {
						this.translationWorldDelta.copy(dir.multiplyScalar(-this.viewer.getMoveSpeed()));
					}
				}else {
					if (moveForward && moveBackward) {
						this.translationDelta.y = 0;
					} else if (moveForward) {
						this.translationDelta.y = this.viewer.getMoveSpeed();
					} else if (moveBackward) {
						this.translationDelta.y = -this.viewer.getMoveSpeed();
					}
				}

				if (moveLeft && moveRight) {
					this.translationDelta.x = 0;
				} else if (moveLeft) {
					this.translationDelta.x = -this.viewer.getMoveSpeed();
				} else if (moveRight) {
					this.translationDelta.x = this.viewer.getMoveSpeed();
				}

				if (moveUp && moveDown) {
					this.translationWorldDelta.z = 0;
				} else if (moveUp) {
					this.translationWorldDelta.z = this.viewer.getMoveSpeed();
				} else if (moveDown) {
					this.translationWorldDelta.z = -this.viewer.getMoveSpeed();
				}
			}

			{ // apply rotation
				let yaw = view.yaw;
				let pitch = view.pitch;

				yaw -= this.yawDelta * delta;
				pitch -= this.pitchDelta * delta;

				view.yaw = yaw;
				view.pitch = pitch;
			}

			{ // apply translation
				view.translate(
					this.translationDelta.x * delta,
					this.translationDelta.y * delta,
					this.translationDelta.z * delta
				);

				view.translateWorld(
					this.translationWorldDelta.x * delta,
					this.translationWorldDelta.y * delta,
					this.translationWorldDelta.z * delta
				);
			}

			{ // set view target according to speed
				view.radius = 3 * this.viewer.getMoveSpeed();
			}

			{ // decelerate over time
				let attenuation = Math.max(0, 1 - this.fadeFactor * delta);
				this.yawDelta *= attenuation;
				this.pitchDelta *= attenuation;
				this.translationDelta.multiplyScalar(attenuation);
				this.translationWorldDelta.multiplyScalar(attenuation);
			}
		}
	};

	class EarthControls extends EventDispatcher {
		constructor (viewer) {
			super(viewer);

			this.viewer = viewer;
			this.renderer = viewer.renderer;

			this.scene = null;
			this.sceneControls = new THREE.Scene();

			this.rotationSpeed = 10;

			this.fadeFactor = 20;
			this.wheelDelta = 0;
			this.zoomDelta = new THREE.Vector3();
			this.camStart = null;

			this.tweens = [];

			{
				let sg = new THREE.SphereGeometry(1, 16, 16);
				let sm = new THREE.MeshNormalMaterial();
				this.pivotIndicator = new THREE.Mesh(sg, sm);
				this.pivotIndicator.visible = false;
				this.sceneControls.add(this.pivotIndicator);
			}

			let drag = (e) => {
				if (e.drag.object !== null) {
					return;
				}

				if (!this.pivot) {
					return;
				}

				if (e.drag.startHandled === undefined) {
					e.drag.startHandled = true;

					this.dispatchEvent({type: 'start'});
				}

				let camStart = this.camStart;
				let camera = this.scene.getActiveCamera();
				let view = this.viewer.scene.view;

				// let camera = this.viewer.scene.camera;
				let mouse = e.drag.end;
				let domElement = this.viewer.renderer.domElement;

				if (e.drag.mouse === MOUSE.LEFT) {

					let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
					let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
						new THREE.Vector3(0, 0, 1),
						this.pivot);

					let distanceToPlane = ray.distanceToPlane(plane);

					if (distanceToPlane > 0) {
						let I = new THREE.Vector3().addVectors(
							camStart.position,
							ray.direction.clone().multiplyScalar(distanceToPlane));

						let movedBy = new THREE.Vector3().subVectors(
							I, this.pivot);

						let newCamPos = camStart.position.clone().sub(movedBy);

						view.position.copy(newCamPos);

						{
							let distance = newCamPos.distanceTo(this.pivot);
							view.radius = distance;
							let speed = view.radius / 2.5;
							this.viewer.setMoveSpeed(speed);
						}
					}
				} else if (e.drag.mouse === MOUSE.RIGHT) {
					let ndrag = {
						x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
						y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
					};

					let yawDelta = -ndrag.x * this.rotationSpeed * 0.5;
					let pitchDelta = -ndrag.y * this.rotationSpeed * 0.2;

					let originalPitch = view.pitch;
					let tmpView = view.clone();
					tmpView.pitch = tmpView.pitch + pitchDelta;
					pitchDelta = tmpView.pitch - originalPitch;

					let pivotToCam = new THREE.Vector3().subVectors(view.position, this.pivot);
					let pivotToCamTarget = new THREE.Vector3().subVectors(view.getPivot(), this.pivot);
					let side = view.getSide();

					pivotToCam.applyAxisAngle(side, pitchDelta);
					pivotToCamTarget.applyAxisAngle(side, pitchDelta);

					pivotToCam.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);
					pivotToCamTarget.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);

					let newCam = new THREE.Vector3().addVectors(this.pivot, pivotToCam);
					// TODO: Unused: let newCamTarget = new THREE.Vector3().addVectors(this.pivot, pivotToCamTarget);

					view.position.copy(newCam);
					view.yaw += yawDelta;
					view.pitch += pitchDelta;
				}
			};

			let onMouseDown = e => {
				let I = Utils.getMousePointCloudIntersection(
					e.mouse, 
					this.scene.getActiveCamera(), 
					this.viewer, 
					this.scene.pointclouds, 
					{pickClipped: false});

				if (I) {
					this.pivot = I.location;
					this.camStart = this.scene.getActiveCamera().clone();
					this.pivotIndicator.visible = true;
					this.pivotIndicator.position.copy(I.location);
				}
			};

			let drop = e => {
				this.dispatchEvent({type: 'end'});
			};

			let onMouseUp = e => {
				this.camStart = null;
				this.pivot = null;
				this.pivotIndicator.visible = false;
			};

			let scroll = (e) => {
				this.wheelDelta += e.delta;
			};

			let dblclick = (e) => {
				this.zoomToLocation(e.mouse);
			};

			this.addEventListener('drag', drag);
			this.addEventListener('drop', drop);
			this.addEventListener('mousewheel', scroll);
			this.addEventListener('mousedown', onMouseDown);
			this.addEventListener('mouseup', onMouseUp);
			this.addEventListener('dblclick', dblclick);
		}

		setScene (scene) {
			this.scene = scene;
		}

		stop(){
			this.wheelDelta = 0;
			this.zoomDelta.set(0, 0, 0);
		}
		
		zoomToLocation(mouse){
			let camera = this.scene.getActiveCamera();
			
			let I = Utils.getMousePointCloudIntersection(
				mouse,
				camera,
				this.viewer,
				this.scene.pointclouds);

			if (I === null) {
				return;
			}

			let targetRadius = 0;
			{
				let minimumJumpDistance = 0.2;

				let domElement = this.renderer.domElement;
				let ray = Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

				let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
				let lastNode = nodes[nodes.length - 1];
				let radius = lastNode.getBoundingSphere(new THREE.Sphere()).radius;
				targetRadius = Math.min(this.scene.view.radius, radius);
				targetRadius = Math.max(minimumJumpDistance, targetRadius);
			}

			let d = this.scene.view.direction.multiplyScalar(-1);
			let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
			// TODO Unused: let controlsTargetPosition = I.location;

			let animationDuration = 600;
			let easing = TWEEN.Easing.Quartic.Out;

			{ // animate
				let value = {x: 0};
				let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
				tween.easing(easing);
				this.tweens.push(tween);

				let startPos = this.scene.view.position.clone();
				let targetPos = cameraTargetPosition.clone();
				let startRadius = this.scene.view.radius;
				let targetRadius = cameraTargetPosition.distanceTo(I.location);

				tween.onUpdate(() => {
					let t = value.x;
					this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
					this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
					this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

					this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
					this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
				});

				tween.onComplete(() => {
					this.tweens = this.tweens.filter(e => e !== tween);
				});

				tween.start();
			}
		}

		update (delta) {
			let view = this.scene.view;
			let fade = Math.pow(0.5, this.fadeFactor * delta);
			let progression = 1 - fade;
			let camera = this.scene.getActiveCamera();
			
			// compute zoom
			if (this.wheelDelta !== 0) {
				let I = Utils.getMousePointCloudIntersection(
					this.viewer.inputHandler.mouse, 
					this.scene.getActiveCamera(), 
					this.viewer, 
					this.scene.pointclouds);

				if (I) {
					let resolvedPos = new THREE.Vector3().addVectors(view.position, this.zoomDelta);
					let distance = I.location.distanceTo(resolvedPos);
					let jumpDistance = distance * 0.2 * this.wheelDelta;
					let targetDir = new THREE.Vector3().subVectors(I.location, view.position);
					targetDir.normalize();

					resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
					this.zoomDelta.subVectors(resolvedPos, view.position);

					{
						let distance = resolvedPos.distanceTo(I.location);
						view.radius = distance;
						let speed = view.radius / 2.5;
						this.viewer.setMoveSpeed(speed);
					}
				}
			}

			// apply zoom
			if (this.zoomDelta.length() !== 0) {
				let p = this.zoomDelta.clone().multiplyScalar(progression);

				let newPos = new THREE.Vector3().addVectors(view.position, p);
				view.position.copy(newPos);
			}

			if (this.pivotIndicator.visible) {
				let distance = this.pivotIndicator.position.distanceTo(view.position);
				let pixelwidth = this.renderer.domElement.clientwidth;
				let pixelHeight = this.renderer.domElement.clientHeight;
				let pr = Utils.projectedRadius(1, camera, distance, pixelwidth, pixelHeight);
				let scale = (10 / pr);
				this.pivotIndicator.scale.set(scale, scale, scale);
			}

			// decelerate over time
			{
				this.zoomDelta.multiplyScalar(fade);
				this.wheelDelta = 0;
			}
		}
	};

	/**
	 * @author chrisl / Geodan
	 *
	 * adapted from Potree.FirstPersonControls by
	 *
	 * @author mschuetz / http://mschuetz.at
	 *
	 * and THREE.DeviceOrientationControls  by
	 *
	 * @author richt / http://richt.me
	 * @author WestLangley / http://github.com/WestLangley
	 *
	 *
	 *
	 */

	class DeviceOrientationControls extends EventDispatcher{
		constructor(viewer){
			super();

			this.viewer = viewer;
			this.renderer = viewer.renderer;

			this.scene = null;
			this.sceneControls = new THREE.Scene();

			this.screenOrientation = window.orientation || 0;

			let deviceOrientationChange = e => {
				this.deviceOrientation = e;
			};

			let screenOrientationChange = e => {
				this.screenOrientation = window.orientation || 0;
			};

			if ('ondeviceorientationabsolute' in window) {
				window.addEventListener('deviceorientationabsolute', deviceOrientationChange);
			} else if ('ondeviceorientation' in window) {
				window.addEventListener('deviceorientation', deviceOrientationChange);
			} else {
				console.warn("No device orientation found.");
			}
			// window.addEventListener('deviceorientation', deviceOrientationChange);
			window.addEventListener('orientationchange', screenOrientationChange);
		}

		setScene (scene) {
			this.scene = scene;
		}

		update (delta) {
			let computeQuaternion = function (alpha, beta, gamma, orient) {
				let quaternion = new THREE.Quaternion();

				let zee = new THREE.Vector3(0, 0, 1);
				let euler = new THREE.Euler();
				let q0 = new THREE.Quaternion();

				euler.set(beta, gamma, alpha, 'ZXY');
				quaternion.setFromEuler(euler);
				quaternion.multiply(q0.setFromAxisAngle(zee, -orient));

				return quaternion;
			};

			if (typeof this.deviceOrientation !== 'undefined') {
				let alpha = this.deviceOrientation.alpha ? THREE.Math.degToRad(this.deviceOrientation.alpha) : 0;
				let beta = this.deviceOrientation.beta ? THREE.Math.degToRad(this.deviceOrientation.beta) : 0;
				let gamma = this.deviceOrientation.gamma ? THREE.Math.degToRad(this.deviceOrientation.gamma) : 0;
				let orient = this.screenOrientation ? THREE.Math.degToRad(this.screenOrientation) : 0;

				let quaternion = computeQuaternion(alpha, beta, gamma, orient);
				viewer.scene.cameraP.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
			}
		}
	};

	class Viewer extends EventDispatcher{
		
		constructor(domElement, args = {}){
			super();

			this.renderArea = domElement;
			this.guiLoaded = false;
			this.guiLoadTasks = [];

			this.vr = null;
			this.onVrListeners = [];

			this.messages = [];
			this.elMessages = $(`
		<div id="message_listing" 
			style="position: absolute; z-index: 1000; left: 10px; bottom: 10px">
		</div>`);
			$(domElement).append(this.elMessages);
			
			try{

			{ // generate missing dom hierarchy
				if ($(domElement).find('#potree_map').length === 0) {
					let potreeMap = $(`
					<div id="potree_map" class="mapBox" style="position: absolute; left: 50px; top: 50px; width: 400px; height: 400px; display: none">
						<div id="potree_map_header" style="position: absolute; width: 100%; height: 25px; top: 0px; background-color: rgba(0,0,0,0.5); z-index: 1000; border-top-left-radius: 3px; border-top-right-radius: 3px;">
						</div>
						<div id="potree_map_content" class="map" style="position: absolute; z-index: 100; top: 25px; width: 100%; height: calc(100% - 25px); border: 2px solid rgba(0,0,0,0.5); box-sizing: border-box;"></div>
					</div>
				`);
					$(domElement).append(potreeMap);
				}

				if ($(domElement).find('#potree_description').length === 0) {
					let potreeDescription = $(`<div id="potree_description" class="potree_info_text"></div>`);
					$(domElement).append(potreeDescription);
				}

				if ($(domElement).find('#potree_annotations').length === 0) {
					let potreeAnnotationContainer = $(`
					<div id="potree_annotation_container" 
						style="position: absolute; z-index: 100000; width: 100%; height: 100%; pointer-events: none;"></div>`);
					$(domElement).append(potreeAnnotationContainer);
				}
			}

			this.pointCloudLoadedCallback = args.onPointCloudLoaded || function () {};

			// if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
			//	defaultSettings.navigation = "Orbit";
			// }

			this.server = null;

			this.fov = 60;
			this.isFlipYZ = false;
			this.useDEMCollisions = false;
			this.generateDEM = false;
			this.minNodeSize = 30;
			this.edlStrength = 1.0;
			this.edlRadius = 1.4;
			this.edlOpacity = 1.0;
			this.useEDL = false;
			this.description = "";

			this.classifications = ClassificationScheme.DEFAULT;

			this.moveSpeed = 10;

			this.lengthUnit = LengthUnits.METER;
			this.lengthUnitDisplay = LengthUnits.METER;

			this.showBoundingBox = false;
			this.showAnnotations = true;
			this.freeze = false;
			this.clipTask = ClipTask.HIGHLIGHT;
			this.clipMethod = ClipMethod.INSIDE_ANY;

			this.elevationGradientRepeat = ElevationGradientRepeat.CLAMP;

			this.filterReturnNumberRange = [0, 7];
			this.filterNumberOfReturnsRange = [0, 7];
			this.filterGPSTimeRange = [-Infinity, Infinity];
			this.filterPointSourceIDRange = [0, 65535];

			this.potreeRenderer = null;
			this.edlRenderer = null;
			this.renderer = null;
			this.pRenderer = null;

			this.scene = null;
			this.overlay = null;
			this.overlayCamera = null;

			this.inputHandler = null;
			this.controls = null;

			this.clippingTool =  null;
			this.transformationTool = null;
			this.navigationCube = null;
			this.compass = null;
			
			this.skybox = null;
			this.clock = new THREE.Clock();
			this.background = null;

			this.initThree();
			this.prepareVR();

			if(args.noDragAndDrop){
				
			}else {
				this.initDragAndDrop();
			}

			if(typeof Stats !== "undefined"){
				this.stats = new Stats();
				this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
				document.body.appendChild( this.stats.dom );
			}

			{
				let canvas = this.renderer.domElement;
				canvas.addEventListener("webglcontextlost", (e) => {
					console.log(e);
					this.postMessage("WebGL context lost. \u2639");

					let gl = this.renderer.getContext();
					let error = gl.getError();
					console.log(error);
				}, false);
			}

			{
				this.overlay = new THREE.Scene();
				this.overlayCamera = new THREE.OrthographicCamera(
					0, 1,
					1, 0,
					-1000, 1000
				);
			}
			
			this.pRenderer = new Renderer(this.renderer);
			
			{
				let near = 2.5;
				let far = 10.0;
				let fov = 90;
				
				this.shadowTestCam = new THREE.PerspectiveCamera(90, 1, near, far);
				this.shadowTestCam.position.set(3.50, -2.80, 8.561);
				this.shadowTestCam.lookAt(new THREE.Vector3(0, 0, 4.87));
			}
			

			let scene = new Scene(this.renderer);
			this.setScene(scene);

			{
				this.inputHandler = new InputHandler(this);
				this.inputHandler.setScene(this.scene);

				this.clippingTool = new ClippingTool(this);
				this.transformationTool = new TransformationTool(this);
				this.navigationCube = new NavigationCube(this);
				this.navigationCube.visible = false;

				this.compass = new Compass(this);
				
				this.createControls();

				this.clippingTool.setScene(this.scene);
				
				let onPointcloudAdded = (e) => {
					if (this.scene.pointclouds.length === 1) {
						let speed = e.pointcloud.boundingBox.getSize(new THREE.Vector3()).length();
						speed = speed / 5;
						this.setMoveSpeed(speed);
					}
				};

				let onVolumeRemoved = (e) => {
					this.inputHandler.deselect(e.volume);
				};

				this.addEventListener('scene_changed', (e) => {
					this.inputHandler.setScene(e.scene);
					this.clippingTool.setScene(this.scene);
					
					if(!e.scene.hasEventListener("pointcloud_added", onPointcloudAdded)){
						e.scene.addEventListener("pointcloud_added", onPointcloudAdded);
					}

					if(!e.scene.hasEventListener("volume_removed", onPointcloudAdded)){
						e.scene.addEventListener("volume_removed", onVolumeRemoved);
					}
					
				});

				this.scene.addEventListener("volume_removed", onVolumeRemoved);
				this.scene.addEventListener('pointcloud_added', onPointcloudAdded);
			}

			{ // set defaults
				this.setFOV(60);
				this.setEDLEnabled(false);
				this.setEDLRadius(1.4);
				this.setEDLStrength(0.4);
				this.setEDLOpacity(1.0);
				this.setClipTask(ClipTask.HIGHLIGHT);
				this.setClipMethod(ClipMethod.INSIDE_ANY);
				this.setPointBudget(1*1000*1000);
				this.setShowBoundingBox(false);
				this.setFreeze(false);
				this.setControls(this.orbitControls);
				this.setBackground('gradient');

				this.scaleFactor = 1;

				this.loadSettingsFromURL();
			}

			// start rendering!
			if(args.useDefaultRenderLoop === undefined || args.useDefaultRenderLoop === true){
				requestAnimationFrame(this.loop.bind(this));
			}

			this.loadGUI = this.loadGUI.bind(this);

			this.annotationTool = new AnnotationTool(this);
			this.measuringTool = new MeasuringTool(this);
			this.profileTool = new ProfileTool(this);
			this.volumeTool = new VolumeTool(this);

			}catch(e){
				this.onCrash(e);
			}
		}

		onCrash(error){

			$(this.renderArea).empty();

			if ($(this.renderArea).find('#potree_failpage').length === 0) {
				let elFailPage = $(`
			<div id="#potree_failpage" class="potree_failpage"> 
				
				<h1>Potree Encountered An Error </h1>

				<p>
				This may happen if your browser or graphics card is not supported.
				<br>
				We recommend to use 
				<a href="https://www.google.com/chrome/browser" target="_blank" style="color:initial">Chrome</a>
				or 
				<a href="https://www.mozilla.org/" target="_blank">Firefox</a>.
				</p>

				<p>
				Please also visit <a href="http://webglreport.com/" target="_blank">webglreport.com</a> and 
				check whether your system supports WebGL.
				</p>
				<p>
				If you are already using one of the recommended browsers and WebGL is enabled, 
				consider filing an issue report at <a href="https://github.com/potree/potree/issues" target="_blank">github</a>,<br>
				including your operating system, graphics card, browser and browser version, as well as the 
				error message below.<br>
				Please do not report errors on unsupported browsers.
				</p>

				<pre id="potree_error_console" style="width: 100%; height: 100%"></pre>
				
			</div>`);

				let elErrorMessage = elFailPage.find('#potree_error_console');
				elErrorMessage.html(error.stack);

				$(this.renderArea).append(elFailPage);
			}

			throw error;
		}

		// ------------------------------------------------------------------------------------
		// Viewer API
		// ------------------------------------------------------------------------------------

		setScene (scene) {
			if (scene === this.scene) {
				return;
			}

			let oldScene = this.scene;
			this.scene = scene;

			this.dispatchEvent({
				type: 'scene_changed',
				oldScene: oldScene,
				scene: scene
			});

			{ // Annotations
				$('.annotation').detach();

				// for(let annotation of this.scene.annotations){
				//	this.renderArea.appendChild(annotation.domElement[0]);
				// }

				this.scene.annotations.traverse(annotation => {
					this.renderArea.appendChild(annotation.domElement[0]);
				});

				if (!this.onAnnotationAdded) {
					this.onAnnotationAdded = e => {
					// console.log("annotation added: " + e.annotation.title);

						e.annotation.traverse(node => {

							$("#potree_annotation_container").append(node.domElement);
							//this.renderArea.appendChild(node.domElement[0]);
							node.scene = this.scene;
						});
					};
				}

				if (oldScene) {
					oldScene.annotations.removeEventListener('annotation_added', this.onAnnotationAdded);
				}
				this.scene.annotations.addEventListener('annotation_added', this.onAnnotationAdded);
			}
		};

		setControls(controls){
			if (controls !== this.controls) {
				if (this.controls) {
					this.controls.enabled = false;
					this.inputHandler.removeInputListener(this.controls);
				}

				this.controls = controls;
				this.controls.enabled = true;
				this.inputHandler.addInputListener(this.controls);
			}
		}

		getControls () {
			return this.controls;
		}

		getMinNodeSize () {
			return this.minNodeSize;
		};

		setMinNodeSize (value) {
			if (this.minNodeSize !== value) {
				this.minNodeSize = value;
				this.dispatchEvent({'type': 'minnodesize_changed', 'viewer': this});
			}
		};

		getBackground () {
			return this.background;
		}

		setBackground(bg){
			if (this.background === bg) {
				return;
			}

			if(bg === "skybox"){
				this.skybox = Utils.loadSkybox(new URL(Potree.resourcePath + '/textures/skybox2/').href);
			}

			this.background = bg;
			this.dispatchEvent({'type': 'background_changed', 'viewer': this});
		}

		setDescription (value) {
			this.description = value;
			
			$('#potree_description').html(value);
			//$('#potree_description').text(value);
		}

		getDescription(){
			return this.description;
		}

		setShowBoundingBox (value) {
			if (this.showBoundingBox !== value) {
				this.showBoundingBox = value;
				this.dispatchEvent({'type': 'show_boundingbox_changed', 'viewer': this});
			}
		};

		getShowBoundingBox () {
			return this.showBoundingBox;
		};

		setMoveSpeed (value) {
			if (this.moveSpeed !== value) {
				this.moveSpeed = value;
				this.dispatchEvent({'type': 'move_speed_changed', 'viewer': this, 'speed': value});
			}
		};

		getMoveSpeed () {
			return this.moveSpeed;
		};

		setWeightClassification (w) {
			for (let i = 0; i < this.scene.pointclouds.length; i++) {
				this.scene.pointclouds[i].material.weightClassification = w;
				this.dispatchEvent({'type': 'attribute_weights_changed' + i, 'viewer': this});
			}
		};

		setFreeze (value) {
			value = Boolean(value);
			if (this.freeze !== value) {
				this.freeze = value;
				this.dispatchEvent({'type': 'freeze_changed', 'viewer': this});
			}
		};

		getFreeze () {
			return this.freeze;
		};

		getClipTask(){
			return this.clipTask;
		}

		getClipMethod(){
			return this.clipMethod;
		}

		setClipTask(value){
			if(this.clipTask !== value){

				this.clipTask = value;

				this.dispatchEvent({
					type: "cliptask_changed", 
					viewer: this});		
			}
		}

		setClipMethod(value){
			if(this.clipMethod !== value){

				this.clipMethod = value;
				
				this.dispatchEvent({
					type: "clipmethod_changed",
					viewer: this});
			}
		}

		setElevationGradientRepeat(value){
			if(this.elevationGradientRepeat !== value){

				this.elevationGradientRepeat = value;

				this.dispatchEvent({
					type: "elevation_gradient_repeat_changed", 
					viewer: this});
			}
		}

		setPointBudget (value) {
			if (Potree.pointBudget !== value) {
				Potree.pointBudget = parseInt(value);
				this.dispatchEvent({'type': 'point_budget_changed', 'viewer': this});
			}
		};

		getPointBudget () {
			return Potree.pointBudget;
		};

		setShowAnnotations (value) {
			if (this.showAnnotations !== value) {
				this.showAnnotations = value;
				this.dispatchEvent({'type': 'show_annotations_changed', 'viewer': this});
			}
		}

		getShowAnnotations () {
			return this.showAnnotations;
		}
		
		setDEMCollisionsEnabled(value){
			if(this.useDEMCollisions !== value){
				this.useDEMCollisions = value;
				this.dispatchEvent({'type': 'use_demcollisions_changed', 'viewer': this});
			};
		};

		getDEMCollisionsEnabled () {
			return this.useDEMCollisions;
		};

		setEDLEnabled (value) {
			value = Boolean(value);
			if (this.useEDL !== value) {
				this.useEDL = value;
				this.dispatchEvent({'type': 'use_edl_changed', 'viewer': this});
			}
		};

		getEDLEnabled () {
			return this.useEDL;
		};

		setEDLRadius (value) {
			if (this.edlRadius !== value) {
				this.edlRadius = value;
				this.dispatchEvent({'type': 'edl_radius_changed', 'viewer': this});
			}
		};

		getEDLRadius () {
			return this.edlRadius;
		};

		setEDLStrength (value) {
			if (this.edlStrength !== value) {
				this.edlStrength = value;
				this.dispatchEvent({'type': 'edl_strength_changed', 'viewer': this});
			}
		};

		getEDLStrength () {
			return this.edlStrength;
		};

		setEDLOpacity (value) {
			if (this.edlOpacity !== value) {
				this.edlOpacity = value;
				this.dispatchEvent({'type': 'edl_opacity_changed', 'viewer': this});
			}
		};

		getEDLOpacity () {
			return this.edlOpacity;
		};

		setFOV (value) {
			if (this.fov !== value) {
				this.fov = value;
				this.dispatchEvent({'type': 'fov_changed', 'viewer': this});
			}
		};

		getFOV () {
			return this.fov;
		};

		disableAnnotations () {
			this.scene.annotations.traverse(annotation => {
				annotation.domElement.css('pointer-events', 'none');

				// return annotation.visible;
			});
		};

		enableAnnotations () {
			this.scene.annotations.traverse(annotation => {
				annotation.domElement.css('pointer-events', 'auto');

				// return annotation.visible;
			});
		}

		setClassifications(classifications){
			this.classifications = classifications;

			this.dispatchEvent({'type': 'classifications_changed', 'viewer': this});
		}

		setClassificationVisibility (key, value) {
			if (!this.classifications[key]) {
				this.classifications[key] = {visible: value, name: 'no name'};
				this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
			} else if (this.classifications[key].visible !== value) {
				this.classifications[key].visible = value;
				this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
			}
		}

		toggleAllClassificationsVisibility(){

			let numVisible = 0;
			let numItems = 0;
			for(const key of Object.keys(this.classifications)){
				if(this.classifications[key].visible){
					numVisible++;
				}
				numItems++;
			}

			let visible = true;
			if(numVisible === numItems){
				visible = false;
			}

			let somethingChanged = false;

			for(const key of Object.keys(this.classifications)){
				if(this.classifications[key].visible !== visible){
					this.classifications[key].visible = visible;
					somethingChanged = true;
				}
			}

			if(somethingChanged){
				this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
			}
		}

		setFilterReturnNumberRange(from, to){
			this.filterReturnNumberRange = [from, to];
			this.dispatchEvent({'type': 'filter_return_number_range_changed', 'viewer': this});
		}

		setFilterNumberOfReturnsRange(from, to){
			this.filterNumberOfReturnsRange = [from, to];
			this.dispatchEvent({'type': 'filter_number_of_returns_range_changed', 'viewer': this});
		}

		setFilterGPSTimeRange(from, to){
			this.filterGPSTimeRange = [from, to];
			this.dispatchEvent({'type': 'filter_gps_time_range_changed', 'viewer': this});
		}

		setFilterPointSourceIDRange(from, to){
			this.filterPointSourceIDRange = [from, to];
			this.dispatchEvent({'type': 'filter_point_source_id_range_changed', 'viewer': this});
		}

		setLengthUnit (value) {
			switch (value) {
				case 'm':
					this.lengthUnit = LengthUnits.METER;
					this.lengthUnitDisplay = LengthUnits.METER;
					break;
				case 'ft':
					this.lengthUnit = LengthUnits.FEET;
					this.lengthUnitDisplay = LengthUnits.FEET;
					break;
				case 'in':
					this.lengthUnit = LengthUnits.INCH;
					this.lengthUnitDisplay = LengthUnits.INCH;
					break;
			}

			this.dispatchEvent({ 'type': 'length_unit_changed', 'viewer': this, value: value});
		};

		setLengthUnitAndDisplayUnit(lengthUnitValue, lengthUnitDisplayValue) {
			switch (lengthUnitValue) {
				case 'm':
					this.lengthUnit = LengthUnits.METER;
					break;
				case 'ft':
					this.lengthUnit = LengthUnits.FEET;
					break;
				case 'in':
					this.lengthUnit = LengthUnits.INCH;
					break;
			}

			switch (lengthUnitDisplayValue) {
				case 'm':
					this.lengthUnitDisplay = LengthUnits.METER;
					break;
				case 'ft':
					this.lengthUnitDisplay = LengthUnits.FEET;
					break;
				case 'in':
					this.lengthUnitDisplay = LengthUnits.INCH;
					break;
			}

			this.dispatchEvent({ 'type': 'length_unit_changed', 'viewer': this, value: lengthUnitValue });
		};

		zoomTo(node, factor, animationDuration = 0){
			let view = this.scene.view;

			let camera = this.scene.cameraP.clone();
			camera.rotation.copy(this.scene.cameraP.rotation);
			camera.rotation.order = "ZXY";
			camera.rotation.x = Math.PI / 2 + view.pitch;
			camera.rotation.z = view.yaw;
			camera.updateMatrix();
			camera.updateMatrixWorld();
			camera.zoomTo(node, factor);

			let bs;
			if (node.boundingSphere) {
				bs = node.boundingSphere;
			} else if (node.geometry && node.geometry.boundingSphere) {
				bs = node.geometry.boundingSphere;
			} else {
				bs = node.boundingBox.getBoundingSphere(new THREE.Sphere());
			}
			bs = bs.clone().applyMatrix4(node.matrixWorld); 

			let startPosition = view.position.clone();
			let endPosition = camera.position.clone();
			let startTarget = view.getPivot();
			let endTarget = bs.center;
			let startRadius = view.radius;
			let endRadius = endPosition.distanceTo(endTarget);

			let easing = TWEEN.Easing.Quartic.Out;

			{ // animate camera position
				let pos = startPosition.clone();
				let tween = new TWEEN.Tween(pos).to(endPosition, animationDuration);
				tween.easing(easing);

				tween.onUpdate(() => {
					view.position.copy(pos);
				});

				tween.start();
			}

			{ // animate camera target
				let target = startTarget.clone();
				let tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
				tween.easing(easing);
				tween.onUpdate(() => {
					view.lookAt(target);
				});
				tween.onComplete(() => {
					view.lookAt(target);
					this.dispatchEvent({type: 'focusing_finished', target: this});
				});

				this.dispatchEvent({type: 'focusing_started', target: this});
				tween.start();
			}
		};

		moveToGpsTimeVicinity(time){
			const result = Potree.Utils.findClosestGpsTime(time, viewer);

			const box  = result.node.pointcloud.deepestNodeAt(result.position).getBoundingBox();
			const diameter = box.min.distanceTo(box.max);

			const camera = this.scene.getActiveCamera();
			const offset = camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(diameter);
			const newCamPos = result.position.clone().sub(offset);

			this.scene.view.position.copy(newCamPos);
			this.scene.view.lookAt(result.position);
		}

		showAbout () {
			$(function () {
				$('#about-panel').dialog();
			});
		};

		getBoundingBox (pointclouds) {
			return this.scene.getBoundingBox(pointclouds);
		};

		getGpsTimeExtent(){
			const range = [Infinity, -Infinity];

			for(const pointcloud of this.scene.pointclouds){
				const attributes = pointcloud.pcoGeometry.pointAttributes.attributes;
				const aGpsTime = attributes.find(a => a.name === "gps-time");

				if(aGpsTime){
					range[0] = Math.min(range[0], aGpsTime.range[0]);
					range[1] = Math.max(range[1], aGpsTime.range[1]);
				}
			}

			return range;
		}

		fitToScreen (factor = 1, animationDuration = 0) {
			let box = this.getBoundingBox(this.scene.pointclouds);

			let node = new THREE.Object3D();
			node.boundingBox = box;

			this.zoomTo(node, factor, animationDuration);
			this.controls.stop();
		};

		toggleNavigationCube() {
			this.navigationCube.visible = !this.navigationCube.visible;
		}

		setView(view) {
			if(!view) return;

			switch(view) {
				case "F":
					this.setFrontView();
					break;
				case "B":
					this.setBackView();
					break;
				case "L":
					this.setLeftView();
					break;
				case "R":
					this.setRightView();
					break;
				case "U":
					this.setTopView();
					break;
				case "D":
					this.setBottomView();
					break;
			}
		}
		
		setTopView(){
			this.scene.view.yaw = 0;
			this.scene.view.pitch = -Math.PI / 2;

			this.fitToScreen();
		};
		
		setBottomView(){
			this.scene.view.yaw = -Math.PI;
			this.scene.view.pitch = Math.PI / 2;
			
			this.fitToScreen();
		};

		setFrontView(){
			this.scene.view.yaw = 0;
			this.scene.view.pitch = 0;

			this.fitToScreen();
		};
		
		setBackView(){
			this.scene.view.yaw = Math.PI;
			this.scene.view.pitch = 0;
			
			this.fitToScreen();
		};

		setLeftView(){
			this.scene.view.yaw = -Math.PI / 2;
			this.scene.view.pitch = 0;

			this.fitToScreen();
		};

		setRightView () {
			this.scene.view.yaw = Math.PI / 2;
			this.scene.view.pitch = 0;

			this.fitToScreen();
		};

		flipYZ () {
			this.isFlipYZ = !this.isFlipYZ;

			// TODO flipyz
			console.log('TODO');
		}
		
		setCameraMode(mode){
			this.scene.cameraMode = mode;

			for(let pointcloud of this.scene.pointclouds) {
				pointcloud.material.useOrthographicCamera = mode == CameraMode.ORTHOGRAPHIC;
			}
		}

		getProjection(){
			const pointcloud = this.scene.pointclouds[0];

			if(pointcloud){
				return pointcloud.projection;
			}else {
				return null;
			}
		}

		async loadProject(url){

			const response = await fetch(url);
		
			const text = await response.text();
			const json = lib.parse(text);
			// const json = JSON.parse(text);

			if(json.type === "Potree"){
				Potree.loadProject(viewer, json);
			}

			//Potree.loadProject(this, url);
		}

		saveProject(){
			return Potree.saveProject(this);
		}
		
		loadSettingsFromURL(){
			if(Utils.getParameterByName("pointSize")){
				this.setPointSize(parseFloat(Utils.getParameterByName("pointSize")));
			}
			
			if(Utils.getParameterByName("FOV")){
				this.setFOV(parseFloat(Utils.getParameterByName("FOV")));
			}
			
			if(Utils.getParameterByName("opacity")){
				this.setOpacity(parseFloat(Utils.getParameterByName("opacity")));
			}
			
			if(Utils.getParameterByName("edlEnabled")){
				let enabled = Utils.getParameterByName("edlEnabled") === "true";
				this.setEDLEnabled(enabled);
			}

			if (Utils.getParameterByName('edlRadius')) {
				this.setEDLRadius(parseFloat(Utils.getParameterByName('edlRadius')));
			}

			if (Utils.getParameterByName('edlStrength')) {
				this.setEDLStrength(parseFloat(Utils.getParameterByName('edlStrength')));
			}

			if (Utils.getParameterByName('pointBudget')) {
				this.setPointBudget(parseFloat(Utils.getParameterByName('pointBudget')));
			}

			if (Utils.getParameterByName('showBoundingBox')) {
				let enabled = Utils.getParameterByName('showBoundingBox') === 'true';
				if (enabled) {
					this.setShowBoundingBox(true);
				} else {
					this.setShowBoundingBox(false);
				}
			}

			if (Utils.getParameterByName('material')) {
				let material = Utils.getParameterByName('material');
				this.setMaterial(material);
			}

			if (Utils.getParameterByName('pointSizing')) {
				let sizing = Utils.getParameterByName('pointSizing');
				this.setPointSizing(sizing);
			}

			if (Utils.getParameterByName('quality')) {
				let quality = Utils.getParameterByName('quality');
				this.setQuality(quality);
			}

			if (Utils.getParameterByName('position')) {
				let value = Utils.getParameterByName('position');
				value = value.replace('[', '').replace(']', '');
				let tokens = value.split(';');
				let x = parseFloat(tokens[0]);
				let y = parseFloat(tokens[1]);
				let z = parseFloat(tokens[2]);

				this.scene.view.position.set(x, y, z);
			}

			if (Utils.getParameterByName('target')) {
				let value = Utils.getParameterByName('target');
				value = value.replace('[', '').replace(']', '');
				let tokens = value.split(';');
				let x = parseFloat(tokens[0]);
				let y = parseFloat(tokens[1]);
				let z = parseFloat(tokens[2]);

				this.scene.view.lookAt(new THREE.Vector3(x, y, z));
			}

			if (Utils.getParameterByName('background')) {
				let value = Utils.getParameterByName('background');
				this.setBackground(value);
			}

			// if(Utils.getParameterByName("elevationRange")){
			//	let value = Utils.getParameterByName("elevationRange");
			//	value = value.replace("[", "").replace("]", "");
			//	let tokens = value.split(";");
			//	let x = parseFloat(tokens[0]);
			//	let y = parseFloat(tokens[1]);
			//
			//	this.setElevationRange(x, y);
			//	//this.scene.view.target.set(x, y, z);
			// }
		};

		// ------------------------------------------------------------------------------------
		// Viewer Internals
		// ------------------------------------------------------------------------------------

		createControls () {
			{ // create FIRST PERSON CONTROLS
				this.fpControls = new FirstPersonControls(this);
				this.fpControls.enabled = false;
				this.fpControls.addEventListener('start', this.disableAnnotations.bind(this));
				this.fpControls.addEventListener('end', this.enableAnnotations.bind(this));
			}

			// { // create GEO CONTROLS
			//	this.geoControls = new GeoControls(this.scene.camera, this.renderer.domElement);
			//	this.geoControls.enabled = false;
			//	this.geoControls.addEventListener("start", this.disableAnnotations.bind(this));
			//	this.geoControls.addEventListener("end", this.enableAnnotations.bind(this));
			//	this.geoControls.addEventListener("move_speed_changed", (event) => {
			//		this.setMoveSpeed(this.geoControls.moveSpeed);
			//	});
			// }

			{ // create ORBIT CONTROLS
				this.orbitControls = new OrbitControls(this);
				this.orbitControls.enabled = false;
				this.orbitControls.addEventListener('start', this.disableAnnotations.bind(this));
				this.orbitControls.addEventListener('end', this.enableAnnotations.bind(this));
			}

			{ // create EARTH CONTROLS
				this.earthControls = new EarthControls(this);
				this.earthControls.enabled = false;
				this.earthControls.addEventListener('start', this.disableAnnotations.bind(this));
				this.earthControls.addEventListener('end', this.enableAnnotations.bind(this));
			}

			{ // create DEVICE ORIENTATION CONTROLS
				this.deviceControls = new DeviceOrientationControls(this);
				this.deviceControls.enabled = false;
				this.deviceControls.addEventListener('start', this.disableAnnotations.bind(this));
				this.deviceControls.addEventListener('end', this.enableAnnotations.bind(this));
			}
		};

		toggleSidebar () {
			let renderArea = $('#potree_render_area');
			let isVisible = renderArea.css('left') !== '0px';

			if (isVisible) {
				renderArea.css('left', '0px');
			} else {
				renderArea.css('left', '300px');
			}
		};

		toggleMap () {
			// let map = $('#potree_map');
			// map.toggle(100);

			if (this.mapView) {
				this.mapView.toggle();
			}
		};

		onGUILoaded(callback){
			if(this.guiLoaded){
				callback();
			}else {
				this.guiLoadTasks.push(callback);
			}
		}

		promiseGuiLoaded(){
			return new Promise( resolve => {

				if(this.guiLoaded){
					resolve();
				}else {
					this.guiLoadTasks.push(resolve);
				}
			
			});
		}

		loadGUI(callback){

			if(callback){
				this.onGUILoaded(callback);
			}

			let viewer = this;
			let sidebarContainer = $('#potree_sidebar_container');
			sidebarContainer.load(new URL(Potree.scriptPath + '/sidebar.html').href, () => {
				sidebarContainer.css('width', '300px');
				sidebarContainer.css('height', '100%');

				let imgMenuToggle = document.createElement('img');
				imgMenuToggle.src = new URL(Potree.resourcePath + '/icons/menu_button.svg').href;
				imgMenuToggle.onclick = this.toggleSidebar;
				imgMenuToggle.classList.add('potree_menu_toggle');

				let imgMapToggle = document.createElement('img');
				imgMapToggle.src = new URL(Potree.resourcePath + '/icons/map_icon.png').href;
				imgMapToggle.style.display = 'none';
				imgMapToggle.onclick = e => { this.toggleMap(); };
				imgMapToggle.id = 'potree_map_toggle';

				viewer.renderArea.insertBefore(imgMapToggle, viewer.renderArea.children[0]);
				viewer.renderArea.insertBefore(imgMenuToggle, viewer.renderArea.children[0]);

				this.mapView = new MapView(this);
				this.mapView.init();

				i18n.init({
					lng: 'en',
					resGetPath: Potree.resourcePath + '/lang/__lng__/__ns__.json',
					preload: ['en', 'fr', 'de', 'jp', 'se', 'es'],
					getAsync: true,
					debug: false
				}, function (t) {
					// Start translation once everything is loaded
					$('body').i18n();
				});

				$(() => {
					//initSidebar(this);
					let sidebar = new Sidebar(this);
					sidebar.init();

					this.sidebar = sidebar;

					//if (callback) {
					//	$(callback);
					//}

					let elProfile = $('<div>').load(new URL(Potree.scriptPath + '/profile.html').href, () => {
						$(document.body).append(elProfile.children());
						this.profileWindow = new ProfileWindow(this);
						this.profileWindowController = new ProfileWindowController(this);

						$('#profile_window').draggable({
							handle: $('#profile_titlebar'),
							containment: $(document.body)
						});
						$('#profile_window').resizable({
							containment: $(document.body),
							handles: 'n, e, s, w'
						});

						$(() => {
							this.guiLoaded = true;
							for(let task of this.guiLoadTasks){
								task();
							}

						});
					});

					

				});

				
			});

			return this.promiseGuiLoaded();
		}

		setLanguage (lang) {
			i18n.setLng(lang);
			$('body').i18n();
		}

		setServer (server) {
			this.server = server;
		}

		initDragAndDrop(){
			function allowDrag(e) {
				e.dataTransfer.dropEffect = 'copy';
				e.preventDefault();
			}

			let dropHandler = async (event) => {
				console.log(event);
				event.preventDefault();

				for(const item of event.dataTransfer.items){
					console.log(item);

					if(item.kind !== "file"){
						continue;
					}

					const file = item.getAsFile();

					const isJson = file.name.toLowerCase().endsWith(".json");
					const isGeoPackage = file.name.toLowerCase().endsWith(".gpkg");

					if(isJson){
						try{

							const text = await file.text();
							const json = JSON.parse(text);

							if(json.type === "Potree"){
								Potree.loadProject(viewer, json);
							}
						}catch(e){
							console.error("failed to parse the dropped file as JSON");
							console.error(e);
						}
					}else if(isGeoPackage){
						const hasPointcloud = viewer.scene.pointclouds.length > 0;

						if(!hasPointcloud){
							let msg = "At least one point cloud is needed that specifies the ";
							msg += "coordinate reference system before loading vector data.";
							console.error(msg);
						}else {

							proj4.defs("WGS84", "+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs");
							proj4.defs("pointcloud", this.getProjection());
							let transform = proj4("WGS84", "pointcloud");

							const buffer = await file.arrayBuffer();

							const params = {
								transform: transform,
								source: file.name,
							};
							
							const geo = await Potree.GeoPackageLoader.loadBuffer(buffer, params);
							viewer.scene.addGeopackage(geo);
						}
					}
					
				}
			};


			$("body")[0].addEventListener("dragenter", allowDrag);
			$("body")[0].addEventListener("dragover", allowDrag);
			$("body")[0].addEventListener("drop", dropHandler);
		}

		initThree () {

			console.log(`initializing three.js ${THREE.REVISION}`);

			let width = this.renderArea.clientWidth;
			let height = this.renderArea.clientHeight;

			let contextAttributes = {
				alpha: true,
				depth: true,
				stencil: false,
				antialias: false,
				//premultipliedAlpha: _premultipliedAlpha,
				preserveDrawingBuffer: true,
				powerPreference: "high-performance",
			};

			// let contextAttributes = {
			// 	alpha: false,
			// 	preserveDrawingBuffer: true,
			// };

			// let contextAttributes = {
			// 	alpha: false,
			// 	preserveDrawingBuffer: true,
			// };

			let canvas = document.createElement("canvas");

			let context = canvas.getContext('webgl', contextAttributes );

			this.renderer = new THREE.WebGLRenderer({
				alpha: true, 
				premultipliedAlpha: false,
				canvas: canvas,
				context: context});
			this.renderer.sortObjects = false;
			this.renderer.setSize(width, height);
			this.renderer.autoClear = false;
			this.renderArea.appendChild(this.renderer.domElement);
			this.renderer.domElement.tabIndex = '2222';
			this.renderer.domElement.style.position = 'absolute';
			this.renderer.domElement.addEventListener('mousedown', () => {
				this.renderer.domElement.focus();
			});
			//this.renderer.domElement.focus();

			// NOTE: If extension errors occur, pass the string into this.renderer.extensions.get(x) before enabling
			// enable frag_depth extension for the interpolation shader, if available
			let gl = this.renderer.getContext();
			gl.getExtension('EXT_frag_depth');
			gl.getExtension('WEBGL_depth_texture');
			gl.getExtension('WEBGL_color_buffer_float'); 	// Enable explicitly for more portability, EXT_color_buffer_float is the proper name in WebGL 2
			
			//if(gl instanceof WebGLRenderingContext){
				let extVAO = gl.getExtension('OES_vertex_array_object');

				if(!extVAO){
					throw new Error("OES_vertex_array_object extension not supported");
				}

				gl.createVertexArray = extVAO.createVertexArrayOES.bind(extVAO);
				gl.bindVertexArray = extVAO.bindVertexArrayOES.bind(extVAO);
			//}else if(gl instanceof WebGL2RenderingContext){
			//	gl.getExtension("EXT_color_buffer_float");
			//}
			
		}

		onVr(callback){

			if(this.vr){
				callback();
			}else {
				this.onVrListeners.push(callback);
			}

		}

		async prepareVR(){

			if(!navigator.getVRDisplays){
				console.info("browser does not support WebVR");

				return false;
			}

			try{
				let frameData = new VRFrameData();
				let displays = await navigator.getVRDisplays();

				if(displays.length == 0){
					console.info("no VR display found");
					return false;
				}

				let display = displays[displays.length - 1];
				display.depthNear = 0.1;
				display.depthFar = 10000.0;

				if(!display.capabilities.canPresent){
					// Not sure why canPresent would ever be false?
					console.error("VR display canPresent === false");
					return false;
				}

				this.vr = {
					frameData: frameData,
					display: display,
					node: new THREE.Object3D(),
				};

				for(const listener of this.onVrListeners){
					listener();
				}
			}catch(err){
				console.error(err);

				return false;
			}
			
		}

		updateAnnotations () {

			if(!this.visibleAnnotations){
				this.visibleAnnotations = new Set();
			}

			this.scene.annotations.updateBounds();
			this.scene.cameraP.updateMatrixWorld();
			this.scene.cameraO.updateMatrixWorld();
			
			let distances = [];

			let renderAreaSize = this.renderer.getSize(new THREE.Vector2());

			let viewer = this;

			let visibleNow = [];
			this.scene.annotations.traverse(annotation => {

				if (annotation === this.scene.annotations) {
					return true;
				}

				if (!annotation.visible) {
					return false;
				}

				annotation.scene = this.scene;

				let element = annotation.domElement;

				let position = annotation.position.clone();
				position.add(annotation.offset);
				if (!position) {
					position = annotation.boundingBox.getCenter(new THREE.Vector3());
				}

				let distance = viewer.scene.cameraP.position.distanceTo(position);
				let radius = annotation.boundingBox.getBoundingSphere(new THREE.Sphere()).radius;

				let screenPos = new THREE.Vector3();
				let screenSize = 0;

				{
					// SCREEN POS
					screenPos.copy(position).project(this.scene.getActiveCamera());
					screenPos.x = renderAreaSize.x * (screenPos.x + 1) / 2;
					screenPos.y = renderAreaSize.y * (1 - (screenPos.y + 1) / 2);


					// SCREEN SIZE
					if(viewer.scene.cameraMode == CameraMode.PERSPECTIVE) {
						let fov = Math.PI * viewer.scene.cameraP.fov / 180;
						let slope = Math.tan(fov / 2.0);
						let projFactor =  0.5 * renderAreaSize.y / (slope * distance);
						screenSize = radius * projFactor;
					} else {
						screenSize = Utils.projectedRadiusOrtho(radius, viewer.scene.cameraO.projectionMatrix, renderAreaSize.x, renderAreaSize.y);
					}
				}

				element.css("left", screenPos.x + "px");
				element.css("top", screenPos.y + "px");
				//element.css("display", "block");

				let zIndex = 10000000 - distance * (10000000 / this.scene.cameraP.far);
				if(annotation.descriptionVisible){
					zIndex += 10000000;
				}
				element.css("z-index", parseInt(zIndex));

				if(annotation.children.length > 0){
					let expand = screenSize > annotation.collapseThreshold || annotation.boundingBox.containsPoint(this.scene.getActiveCamera().position);
					annotation.expand = expand;

					if (!expand) {
						//annotation.display = (screenPos.z >= -1 && screenPos.z <= 1);
						let inFrustum = (screenPos.z >= -1 && screenPos.z <= 1);
						if(inFrustum){
							visibleNow.push(annotation);
						}
					}

					return expand;
				} else {
					//annotation.display = (screenPos.z >= -1 && screenPos.z <= 1);
					let inFrustum = (screenPos.z >= -1 && screenPos.z <= 1);
					if(inFrustum){
						visibleNow.push(annotation);
					}
				}
				
			});

			let notVisibleAnymore = new Set(this.visibleAnnotations);
			for(let annotation of visibleNow){
				annotation.display = true;
				
				notVisibleAnymore.delete(annotation);
			}
			this.visibleAnnotations = visibleNow;

			for(let annotation of notVisibleAnymore){
				annotation.display = false;
			}

		}

		updateMaterialDefaults(pointcloud){
			// PROBLEM STATEMENT:
			// * [min, max] of intensity, source id, etc. are computed as point clouds are loaded
			// * the point cloud material won't know the range it should use until some data is loaded
			// * users can modify the range at runtime, but sensible default ranges should be 
			//   applied even if no GUI is present
			// * display ranges shouldn't suddenly change even if the actual range changes over time.
			//   e.g. the root node has intensity range [1, 478]. One of the descendants increases range to 
			//   [0, 2047]. We should not automatically change to the new range because that would result
			//   in sudden and drastic changes of brightness. We should adjust the min/max of the sidebar slider.

			const material = pointcloud.material;

			// const attIntensity = pointcloud.getAttribute("intensity");
			// if(attIntensity && material.intensityRange[0] === Infinity){
			// 	material.intensityRange = [...attIntensity.range];
			// }

			// let attributes = pointcloud.getAttributes();

			// for(let attribute of attributes.attributes){
			// 	if(attribute.range){
			// 		let range = [...attribute.range];
			// 		material.computedRange.set(attribute.name, range);
			// 		//material.setRange(attribute.name, range);
			// 	}
			// }


		}

		update(delta, timestamp){

			if(Potree.measureTimings) performance.mark("update-start");

			
			const scene = this.scene;
			const camera = scene.getActiveCamera();
			const visiblePointClouds = this.scene.pointclouds.filter(pc => pc.visible);
			
			Potree.pointLoadLimit = Potree.pointBudget * 2;

			const lTarget = camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1000));
			this.scene.directionalLight.position.copy(camera.position);
			this.scene.directionalLight.lookAt(lTarget);


			for (let pointcloud of visiblePointClouds) {

				pointcloud.showBoundingBox = this.showBoundingBox;
				pointcloud.generateDEM = this.generateDEM;
				pointcloud.minimumNodePixelSize = this.minNodeSize;

				let material = pointcloud.material;

				material.uniforms.uFilterReturnNumberRange.value = this.filterReturnNumberRange;
				material.uniforms.uFilterNumberOfReturnsRange.value = this.filterNumberOfReturnsRange;
				material.uniforms.uFilterGPSTimeClipRange.value = this.filterGPSTimeRange;
				material.uniforms.uFilterPointSourceIDClipRange.value = this.filterPointSourceIDRange;

				material.classification = this.classifications;
				material.recomputeClassification();

				this.updateMaterialDefaults(pointcloud);
			}

			{
				if(this.showBoundingBox){
					let bbRoot = this.scene.scene.getObjectByName("potree_bounding_box_root");
					if(!bbRoot){
						let node = new THREE.Object3D();
						node.name = "potree_bounding_box_root";
						this.scene.scene.add(node);
						bbRoot = node;
					}

					let visibleBoxes = [];
					for(let pointcloud of this.scene.pointclouds){
						for(let node of pointcloud.visibleNodes.filter(vn => vn.boundingBoxNode !== undefined)){
							let box = node.boundingBoxNode;
							visibleBoxes.push(box);
						}
					}

					bbRoot.children = visibleBoxes;
				}
			}

			if (!this.freeze) {
				let result = Potree.updatePointClouds(scene.pointclouds, camera, this.renderer);


				// DEBUG - ONLY DISPLAY NODES THAT INTERSECT MOUSE
				//if(false){ 

				//	let renderer = viewer.renderer;
				//	let mouse = viewer.inputHandler.mouse;

				//	let nmouse = {
				//		x: (mouse.x / renderer.domElement.clientWidth) * 2 - 1,
				//		y: -(mouse.y / renderer.domElement.clientHeight) * 2 + 1
				//	};

				//	let pickParams = {};

				//	//if(params.pickClipped){
				//	//	pickParams.pickClipped = params.pickClipped;
				//	//}

				//	pickParams.x = mouse.x;
				//	pickParams.y = renderer.domElement.clientHeight - mouse.y;

				//	let raycaster = new THREE.Raycaster();
				//	raycaster.setFromCamera(nmouse, camera);
				//	let ray = raycaster.ray;

				//	for(let pointcloud of scene.pointclouds){
				//		let nodes = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);
				//		pointcloud.visibleNodes = nodes;

				//	}
				//}

				// const tStart = performance.now();
				// const worldPos = new THREE.Vector3();
				// const camPos = viewer.scene.getActiveCamera().getWorldPosition(new THREE.Vector3());
				// let lowestDistance = Infinity;
				// let numNodes = 0;

				// viewer.scene.scene.traverse(node => {
				// 	node.getWorldPosition(worldPos);

				// 	const distance = worldPos.distanceTo(camPos);

				// 	lowestDistance = Math.min(lowestDistance, distance);

				// 	numNodes++;

				// 	if(Number.isNaN(distance)){
				// 		console.error(":(");
				// 	}
				// });
				// const duration = (performance.now() - tStart).toFixed(2);

				// Potree.debug.computeNearDuration = duration;
				// Potree.debug.numNodes = numNodes;

				//console.log(lowestDistance.toString(2), duration);

				const tStart = performance.now();
				const campos = camera.position;
				let closestImage = Infinity;
				for(const images of this.scene.orientedImages){
					for(const image of images.images){
						const distance = image.mesh.position.distanceTo(campos);

						closestImage = Math.min(closestImage, distance);
					}
				}
				const tEnd = performance.now();

				if(result.lowestSpacing !== Infinity){
					let near = result.lowestSpacing * 10.0;
					let far = -this.getBoundingBox().applyMatrix4(camera.matrixWorldInverse).min.z;

					far = Math.max(far * 1.5, 10000);
					near = Math.min(100.0, Math.max(0.01, near));
					near = Math.min(near, closestImage);
					far = Math.max(far, near + 10000);

					if(near === Infinity){
						near = 0.1;
					}
					
					camera.near = near;
					camera.far = far;
				}else {
					// don't change near and far in this case
				}

				if(this.scene.cameraMode == CameraMode.ORTHOGRAPHIC) {
					camera.near = -camera.far;
				}
			} 
			
			this.scene.cameraP.fov = this.fov;
			
			if (this.getControls() === this.deviceControls) {
				this.controls.setScene(scene);
				this.controls.update(delta);

				this.scene.cameraP.position.copy(scene.view.position);
				this.scene.cameraO.position.copy(scene.view.position);
			} else if (this.controls !== null) {
				this.controls.setScene(scene);
				this.controls.update(delta);

				if(typeof debugDisabled === "undefined" ){
					this.scene.cameraP.position.copy(scene.view.position);
					this.scene.cameraP.rotation.order = "ZXY";
					this.scene.cameraP.rotation.x = Math.PI / 2 + this.scene.view.pitch;
					this.scene.cameraP.rotation.z = this.scene.view.yaw;
				}

				this.scene.cameraO.position.copy(scene.view.position);
				this.scene.cameraO.rotation.order = "ZXY";
				this.scene.cameraO.rotation.x = Math.PI / 2 + this.scene.view.pitch;
				this.scene.cameraO.rotation.z = this.scene.view.yaw;
			}
			
			camera.updateMatrix();
			camera.updateMatrixWorld();
			camera.matrixWorldInverse.getInverse(camera.matrixWorld);

			{
				if(this._previousCamera === undefined){
					this._previousCamera = this.scene.getActiveCamera().clone();
					this._previousCamera.rotation.copy(this.scene.getActiveCamera());
				}

				if(!this._previousCamera.matrixWorld.equals(camera.matrixWorld)){
					this.dispatchEvent({
						type: "camera_changed",
						previous: this._previousCamera,
						camera: camera
					});
				}else if(!this._previousCamera.projectionMatrix.equals(camera.projectionMatrix)){
					this.dispatchEvent({
						type: "camera_changed",
						previous: this._previousCamera,
						camera: camera
					});
				}

				this._previousCamera = this.scene.getActiveCamera().clone();
				this._previousCamera.rotation.copy(this.scene.getActiveCamera());

			}

			{ // update clip boxes
				let boxes = [];
				
				// volumes with clipping enabled
				//boxes.push(...this.scene.volumes.filter(v => (v.clip)));
				boxes.push(...this.scene.volumes.filter(v => (v.clip && v instanceof BoxVolume)));

				// profile segments
				for(let profile of this.scene.profiles){
					boxes.push(...profile.boxes);
				}
				
				// Needed for .getInverse(), pre-empt a determinant of 0, see #815 / #816
				let degenerate = (box) => box.matrixWorld.determinant() !== 0;
				
				let clipBoxes = boxes.filter(degenerate).map( box => {
					box.updateMatrixWorld();
					
					let boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
					let boxPosition = box.getWorldPosition(new THREE.Vector3());

					return {box: box, inverse: boxInverse, position: boxPosition};
				});

				let clipPolygons = this.scene.polygonClipVolumes.filter(vol => vol.initialized);
				
				// set clip volumes in material
				for(let pointcloud of visiblePointClouds){
					pointcloud.material.setClipBoxes(clipBoxes);
					pointcloud.material.setClipPolygons(clipPolygons, this.clippingTool.maxPolygonVertices);
					pointcloud.material.clipTask = this.clipTask;
					pointcloud.material.clipMethod = this.clipMethod;
				}
			}

			{
				for(let pointcloud of visiblePointClouds){
					pointcloud.material.elevationGradientRepeat = this.elevationGradientRepeat;
				}
			}
			
			{ // update navigation cube
				this.navigationCube.update(camera.rotation);
			}

			this.updateAnnotations();
			
			if(this.mapView){
				this.mapView.update(delta);
				if(this.mapView.sceneProjection){
					$( "#potree_map_toggle" ).css("display", "block");
					
				}
			}

			TWEEN.update(timestamp);

			this.dispatchEvent({
				type: 'update',
				delta: delta,
				timestamp: timestamp});
				
			if(Potree.measureTimings) {
				performance.mark("update-end");
				performance.measure("update", "update-start", "update-end");
			}
		}
		
		render(){
			if(Potree.measureTimings) performance.mark("render-start");

			try{

				let pRenderer = null;

				if(this.useHQ){
					if (!this.hqRenderer) {
						this.hqRenderer = new HQSplatRenderer(this);
					}
					this.hqRenderer.useEDL = this.useEDL;
					//this.hqRenderer.render(this.renderer);

					pRenderer = this.hqRenderer;
				}else {
					if (this.useEDL && Features.SHADER_EDL.isSupported()) {
						if (!this.edlRenderer) {
							this.edlRenderer = new EDLRenderer(this);
						}
						//this.edlRenderer.render(this.renderer);
						pRenderer = this.edlRenderer;
					} else {
						if (!this.potreeRenderer) {
							this.potreeRenderer = new PotreeRenderer(this);
						}
						//this.potreeRenderer.render();
						pRenderer = this.potreeRenderer;
					}
				}
				
				const vr = this.vr;
				const vrActive = (vr && vr.display.isPresenting);

				if(vrActive){

					const {display, frameData} = vr;

					const leftEye = display.getEyeParameters("left");
					const rightEye = display.getEyeParameters("right");

					let width = Math.max(leftEye.renderWidth, rightEye.renderWidth) * 2;
					let height = Math.max(leftEye.renderHeight, rightEye.renderHeight);

					// width *= 0.5;
					// height *= 0.5;

					this.renderer.setSize(width, height);

					pRenderer.clear();

					//const camera = new THREE.Camera();
					viewer.scene.cameraMode = CameraMode.VR;
					const camera = viewer.scene.getActiveCamera();
					{
						camera.near = display.depthNear;
						camera.far = display.depthFar;
						camera.projectionMatrix = new THREE.Matrix4();
						camera.matrixWorldInverse = new THREE.Matrix4();
						camera.matrixWorld = new THREE.Matrix4();
						camera.updateProjectionMatrix =  () => {};
						camera.updateMatrixWorld = () => {};
						camera.fov = 60;
					};

					const flipWorld = new THREE.Matrix4().fromArray([
						1, 0, 0, 0, 
						0, 0, 1, 0, 
						0, -1, 0, 0,
						0, 0, 0, 1
					]);
					const flipView = new THREE.Matrix4().getInverse(flipWorld);

					vr.node.updateMatrixWorld();

					{// LEFT
						camera.projectionMatrix.fromArray(frameData.leftProjectionMatrix);

						const leftView = new THREE.Matrix4().fromArray(frameData.leftViewMatrix);
						const view = new THREE.Matrix4().multiplyMatrices(leftView, flipView);
						const world = new THREE.Matrix4().getInverse(view);

						{
							const tmp = new THREE.Matrix4().multiplyMatrices(vr.node.matrixWorld, world);
							world.copy(tmp);
							view.getInverse(world);
						}

						camera.matrixWorldInverse.copy(view);
						camera.matrixWorld.copy(world);

						const viewport = [0, 0, width / 2, height];

						this.renderer.setViewport(...viewport);
						pRenderer.render({camera: camera, viewport: viewport});
						//this.renderer.render(this.overlay, this.overlayCamera);
					}

					{// RIGHT
					
						camera.projectionMatrix.fromArray(frameData.rightProjectionMatrix);

						const rightView = new THREE.Matrix4().fromArray(frameData.rightViewMatrix);
						const view = new THREE.Matrix4().multiplyMatrices(rightView, flipView);
						const world = new THREE.Matrix4().getInverse(view);

						{
							const tmp = new THREE.Matrix4().multiplyMatrices(vr.node.matrixWorld, world);
							world.copy(tmp);
							view.getInverse(world);
						}

						camera.matrixWorldInverse.copy(view);
						camera.matrixWorld.copy(world);

						const viewport = [width / 2, 0, width / 2, height];

						this.renderer.setViewport(...viewport);
						pRenderer.clearTargets();
						pRenderer.render({camera: camera, viewport: viewport, debug: 2});
						//this.renderer.render(this.overlay, this.overlayCamera);
					}

					{ // CENTER

						{ // central view matrix
							// TODO this can't be right...can it?

							const left = frameData.leftViewMatrix;
							const right = frameData.rightViewMatrix;

							const centerView = new THREE.Matrix4();

							for(let i = 0; i < centerView.elements.length; i++){
								centerView.elements[i] = (left[i] + right[i]) / 2;
							}

							const view = new THREE.Matrix4().multiplyMatrices(centerView, flipView);
							const world = new THREE.Matrix4().getInverse(view);

							{
								const tmp = new THREE.Matrix4().multiplyMatrices(vr.node.matrixWorld, world);
								world.copy(tmp);
								view.getInverse(world);
							}

							camera.matrixWorldInverse.copy(view);
							camera.matrixWorld.copy(world);
						}


						camera.fov = leftEye.fieldOfView.upDegrees;
					}

				}else {

					{ // resize
						const width = this.scaleFactor * this.renderArea.clientWidth;
						const height = this.scaleFactor * this.renderArea.clientHeight;

						this.renderer.setSize(width, height);
						const pixelRatio = this.renderer.getPixelRatio();
						const aspect = width / height;

						const scene = this.scene;

						scene.cameraP.aspect = aspect;
						scene.cameraP.updateProjectionMatrix();

						let frustumScale = this.scene.view.radius;
						scene.cameraO.left = -frustumScale;
						scene.cameraO.right = frustumScale;
						scene.cameraO.top = frustumScale * 1 / aspect;
						scene.cameraO.bottom = -frustumScale * 1 / aspect;
						scene.cameraO.updateProjectionMatrix();

						scene.cameraScreenSpace.top = 1/aspect;
						scene.cameraScreenSpace.bottom = -1/aspect;
						scene.cameraScreenSpace.updateProjectionMatrix();
					}

					pRenderer.clear();

					pRenderer.render(this.renderer);
					this.renderer.render(this.overlay, this.overlayCamera);
				}

			}catch(e){
				this.onCrash(e);
			}
			
			if(Potree.measureTimings){
				performance.mark("render-end");
				performance.measure("render", "render-start", "render-end");
			}
		}

		resolveTimings(timestamp){
			if(Potree.measureTimings){
				if(!this.toggle){
					this.toggle = timestamp;
				}
				let duration = timestamp - this.toggle;
				if(duration > 1000.0){
				
					let measures = performance.getEntriesByType("measure");
					
					let names = new Set();
					for(let measure of measures){
						names.add(measure.name);
					}
					
					let groups = new Map();
					for(let name of names){
						groups.set(name, {
							measures: [],
							sum: 0,
							n: 0,
							min: Infinity,
							max: -Infinity
						});
					}
					
					for(let measure of measures){
						let group = groups.get(measure.name);
						group.measures.push(measure);
						group.sum += measure.duration;
						group.n++;
						group.min = Math.min(group.min, measure.duration);
						group.max = Math.max(group.max, measure.duration);
					}

					let glQueries = Potree.resolveQueries(this.renderer.getContext());
					for(let [key, value] of glQueries){

						let group = {
							measures: value.map(v => {return {duration: v}}),
							sum: value.reduce( (a, i) => a + i, 0),
							n: value.length,
							min: Math.min(...value),
							max: Math.max(...value)
						};

						let groupname = `[tq] ${key}`;
						groups.set(groupname, group);
						names.add(groupname);
					}
					
					for(let [name, group] of groups){
						group.mean = group.sum / group.n;
						group.measures.sort( (a, b) => a.duration - b.duration );
						
						if(group.n === 1){
							group.median = group.measures[0].duration;
						}else if(group.n > 1){
							group.median = group.measures[parseInt(group.n / 2)].duration;
						}
						
					}
					
					let cn = Array.from(names).reduce( (a, i) => Math.max(a, i.length), 0) + 5;
					let cmin = 10;
					let cmed = 10;
					let cmax = 10;
					let csam = 6;
					
					let message = ` ${"NAME".padEnd(cn)} |` 
						+ ` ${"MIN".padStart(cmin)} |`
						+ ` ${"MEDIAN".padStart(cmed)} |`
						+ ` ${"MAX".padStart(cmax)} |`
						+ ` ${"SAMPLES".padStart(csam)} \n`;
					message += ` ${"-".repeat(message.length) }\n`;
					
					names = Array.from(names).sort();
					for(let name of names){
						let group = groups.get(name);
						let min = group.min.toFixed(3);
						let median = group.median.toFixed(3);
						let max = group.max.toFixed(3);
						let n = group.n;
						
						message += ` ${name.padEnd(cn)} |`
							+ ` ${min.padStart(cmin)} |`
							+ ` ${median.padStart(cmed)} |`
							+ ` ${max.padStart(cmax)} |`
							+ ` ${n.toString().padStart(csam)}\n`;
					}
					message += `\n`;
					console.log(message);
					
					performance.clearMarks();
					performance.clearMeasures();
					this.toggle = timestamp;
				}
			}
		}

		async toggleVR(){
			const vrActive = (this.vr && this.vr.display.isPresenting);

			if(vrActive){
				this.stopVR();
			}else {
				this.startVR();
			}
		}

		async startVR(){

			if(this.vr === null){
				return;
			}

			let canvas = this.renderer.domElement;
			let display = this.vr.display;

			try{
				await display.requestPresent([{ source: canvas }]);
			}catch(e){
				console.error(e);
				this.postError("requestPresent failed");
				return;
			}

			//window.addEventListener('vrdisplaypresentchange', onVRPresentChange, false);
			//window.addEventListener('vrdisplayactivate', onVRRequestPresent, false);
			//window.addEventListener('vrdisplaydeactivate', onVRExitPresent, false);

		}

		async stopVR(){
			// TODO shutdown VR
		}

		loop(timestamp){

			if(this.stats){
				this.stats.begin();
			}

			let queryAll;
			if(Potree.measureTimings){
				performance.mark("loop-start");
			}


			const vrActive = (this.vr && this.vr.display.isPresenting);

			if(vrActive){
				const {display, frameData} = this.vr;

				display.requestAnimationFrame(this.loop.bind(this));

				display.getFrameData(frameData);

				this.update(this.clock.getDelta(), timestamp);

				this.render();

				this.vr.display.submitFrame();
			}else {
				requestAnimationFrame(this.loop.bind(this));

				this.update(this.clock.getDelta(), timestamp);

				this.render();
			}


			if(Potree.measureTimings){
				performance.mark("loop-end");
				performance.measure("loop", "loop-start", "loop-end");
			}
			
			this.resolveTimings(timestamp);

			Potree.framenumber++;

			if(this.stats){
				this.stats.end();
			}
		}

		postError(content, params = {}){
			let message = this.postMessage(content, params);

			message.element.addClass("potree_message_error");

			return message;
		}

		postMessage(content, params = {}){
			let message = new Message(content);

			let animationDuration = 100;

			message.element.css("display", "none");
			message.elClose.click( () => {
				message.element.slideToggle(animationDuration);

				let index = this.messages.indexOf(message);
				if(index >= 0){
					this.messages.splice(index, 1);
				}
			});

			this.elMessages.prepend(message.element);

			message.element.slideToggle(animationDuration);

			this.messages.push(message);

			if(params.duration !== undefined){
				let fadeDuration = 500;
				let slideOutDuration = 200;
				setTimeout(() => {
					message.element.animate({
						opacity: 0	
					}, fadeDuration);
					message.element.slideToggle(slideOutDuration);
				}, params.duration);
			}

			return message;
		}
	};

	class VRControlls{

		constructor(viewer){

			this.viewer = viewer;

			this.previousPads = [];

			this.selection = [];

			this.triggerStarts = [];

			this.scaleState = null;

			this.selectionBox = this.createBox();
			this.viewer.scene.scene.add(this.selectionBox);

			this.speed = 1;
			this.speedModificationFactor = 50;

			this.snLeft = this.createControllerModel();
			this.snRight = this.createControllerModel();
			
			this.viewer.scene.scene.add(this.snLeft.node);
			this.viewer.scene.scene.add(this.snRight.node);
			//this.viewer.scene.scene.add(this.snLeft.debug);
			//this.viewer.scene.scene.add(this.snRight.debug);

		}

		createControllerModel(){
			const geometry = new THREE.SphereGeometry(1, 32, 32);
			const material = new THREE.MeshLambertMaterial( { color: 0xff0000, side: THREE.DoubleSide, flatShading: true } );
			const node = new THREE.Mesh(geometry, material);

			node.position.set(0, 0, 0.5);
			node.scale.set(0.02, 0.02, 0.02);
			node.visible = false;

			viewer.scene.scene.add(node);

			const debug = new THREE.Mesh(geometry, new THREE.MeshNormalMaterial());
			debug.position.set(0, 0, 0.5);
			debug.scale.set(0.01, 0.01, 0.01);
			debug.visible = false;


			const controller = {
				node: node,
				debug: debug,
			};
			//viewer.scene.scene.add(node);

			return controller;
		}

		createBox(){
			const color = 0xffff00;

			const indices = new Uint16Array( [ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ] );
			const positions = [ 
				1, 1, 1,
				0, 1, 1,
				0, 0, 1,
				1, 0, 1,
				1, 1, 0,
				0, 1, 0,
				0, 0, 0,
				1, 0, 0
			];
			const geometry = new THREE.BufferGeometry();

			geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
			geometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );

			geometry.computeBoundingSphere();

			const mesh = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial( { color: color } ) );
			mesh.visible = false;

			return mesh;
		}

		debugLine(start, end, index, color){

			if(typeof this.debugLines === "undefined"){

				const geometry = new THREE.SphereGeometry(1, 8, 8);

				this.debugLines = {
					geometry: geometry,
				};
			}

			const n = 100;

			if(!this.debugLines[index]){
				const geometry = this.debugLines.geometry;
				const material = new THREE.MeshBasicMaterial({color: color});
				const nodes = [];

				for(let i = 0; i <= n; i++){
					const u = i / n;

					const node = new THREE.Mesh(geometry, material);

					const position = new THREE.Vector3().addVectors(
						start.clone().multiplyScalar(1-u),
						end.clone().multiplyScalar(u)
					);

					node.position.copy(position);
					node.scale.set(0.002, 0.002, 0.002);
					this.viewer.scene.scene.add(node);
					nodes.push(node);
				}

				const debugLine = {
					material: material,
					nodes: nodes,
				};

				this.debugLines[index] = debugLine;
			}else {
				const debugLine = this.debugLines[index];

				for(let i = 0; i <= n; i++){
					const node = debugLine.nodes[i];
					const u = i / n;

					const position = new THREE.Vector3().addVectors(
						start.clone().multiplyScalar(1-u),
						end.clone().multiplyScalar(u)
					);

					node.position.copy(position);
				}
			}


		}

		getPointcloudsAt(pointclouds, position){

			const I = [];
			for(const pointcloud of pointclouds){
				
				const intersects = pointcloud.intersectsPoint(position);

				if(intersects){
					I.push(pointcloud);
				}
			}

			return I;
		}

		copyPad(pad){
			const axes = pad.axes.map(a => a);
			const buttons = pad.buttons.map(b => {return {pressed: b.pressed}});

			const pose = {
				position: new Float32Array(pad.pose.position),
				orientation: new Float32Array(pad.pose.orientation),
			};

			const copy = {
				axes: axes,
				buttons: buttons,
				pose: pose, 
				hand: pad.hand,
				index: pad.index,
			};

			return copy;
		}

		previousPad(gamepad){
			return this.previousPads.find(c => c.index === gamepad.index);
		}

		toScene(position){

			const vr = viewer.vr;

			vr.node.updateMatrixWorld();
			const world = vr.node.matrixWorld;

			const scenePos = new THREE.Vector3(position.x, -position.z, position.y);
			scenePos.applyMatrix4(world);

			return scenePos;
		}

		update(delta){

			const {selection, viewer, snLeft, snRight} = this;
			const toScene = this.toScene.bind(this);
			const vr = viewer.vr;

			const vrActive = vr && vr.display.isPresenting;

			snLeft.node.visible = vrActive;
			snRight.node.visible = vrActive;

			if(!vrActive){

				return;
			}

			const pointclouds = viewer.scene.pointclouds;

			const gamepads = Array.from(navigator.getGamepads()).filter(p => p !== null).map(this.copyPad);

			const getPad = (list, pattern) => list.find(pad => pad.index === pattern.index);
			
			if(this.previousPads.length !== gamepads.length){
				this.previousPads = gamepads;
			}

			const left = gamepads.find(gp => gp.hand && gp.hand === "left");
			const right = gamepads.find(gp => gp.hand && gp.hand === "right");

			const triggered = gamepads.filter(gamepad => {
				return gamepad.buttons[1].pressed;
			});

			const justTriggered = triggered.filter(gamepad => {
				const prev = this.previousPad(gamepad);
				const previouslyTriggered = prev.buttons[1].pressed;
				const currentlyTriggered = gamepad.buttons[1].pressed;

				return !previouslyTriggered && currentlyTriggered;
			});

			const justUntriggered = gamepads.filter(gamepad => {
				const prev = this.previousPad(gamepad);
				const previouslyTriggered = prev.buttons[1].pressed;
				const currentlyTriggered = gamepad.buttons[1].pressed;

				return previouslyTriggered && !currentlyTriggered;
			});

			if(triggered.length === 0){

				for(const pad of gamepads){
					const position = new THREE.Vector3(...pad.pose.position);

					const I = this.getPointcloudsAt(pointclouds, position);

					let controler = {
						"left": snLeft,
						"right": snRight,
					}[pad.hand];

					if(I.length > 0){
						controler.node.material.color.setRGB(0, 1, 0);
						console.log(pad.hand);
					}else {
						controler.node.material.color.setRGB(1, 0, 0);
					}
				}
			}else {
				if(selection.length > 0){
					const pointcloud = selection[0];
					this.selectionBox.scale.copy(pointcloud.boundingBox.max).multiply(pointcloud.scale);
					this.selectionBox.position.copy(pointcloud.position);
					this.selectionBox.rotation.copy(pointcloud.rotation);
				}
			}

			if(justTriggered.length > 0){

				const pad = justTriggered[0];
				const position = toScene(new THREE.Vector3(...pad.pose.position));
				const I = this.getPointcloudsAt(pointclouds, position);

				const pcs = I.map(p => {
					return {
						node: p,
						position: p.position.clone(),
						rotation: p.rotation.clone(),
						scale: p.scale.clone(),
					};
				});

				const event = {
					pad: pad,
					pointclouds: pcs,
				};

				this.triggerStarts.push(event);
			}

			if(justUntriggered.length > 0){
				for(let untriggeredPad of justUntriggered){
					const p = getPad(this.triggerStarts.map(t => t.pad), untriggeredPad);
					this.triggerStarts = this.triggerStarts.filter(e => e.pad !== p);
				}
			}

			if(triggered.length === 0){
				selection.length = 0;
				this.triggerStarts = [];
			}

			if(justTriggered.length === 1 && triggered.length === 1){
				// one controller was triggered this frame
				const pad = justTriggered[0];
				const position = toScene(new THREE.Vector3(...pad.pose.position));
				const I = this.getPointcloudsAt(pointclouds, position);
				
				if(I.length > 0){
					selection.length = 0;
					selection.push(I[0]);
				}
			}else if(justTriggered.length === 2 && triggered.length === 2){
				// two controllers were triggered this frame
				const pad = justTriggered[0];
				const position = toScene(new THREE.Vector3(...pad.pose.position));
				const I = this.getPointcloudsAt(pointclouds, position);
				
				if(I.length > 0){
					selection.length = 0;
					selection.push(I[0]);
				}
			}

			if(justTriggered.length > 0 && triggered.length === 2){
				// START SCALE/ROTATE

				const pcs = selection.map(p => ({
					node: p,
					position: p.position.clone(),
					rotation: p.rotation.clone(),
					scale: p.scale.clone(),
				}));

				this.scaleState = {
					first: triggered[0],
					second: triggered[1],
					pointclouds: pcs,
				};
			}else if(triggered.length < 2){
				// STOP SCALE/ROTATE
				this.scaleState = null;
			}
			
			if(this.scaleState){
				// SCALE/ROTATE

				const {first, second, pointclouds} = this.scaleState;

				if(pointclouds.length > 0){
					
					const pointcloud = pointclouds[0];
					
					const p1Start = toScene(new THREE.Vector3(...first.pose.position));
					const p2Start = toScene(new THREE.Vector3(...second.pose.position));

					const p1End = toScene(new THREE.Vector3(...getPad(gamepads, first).pose.position));
					const p2End = toScene(new THREE.Vector3(...getPad(gamepads, second).pose.position));

					const diffStart = new THREE.Vector3().subVectors(p2Start, p1Start);
					const diffEnd = new THREE.Vector3().subVectors(p2End, p1End);

					// this.debugLine(p1Start, p2Start, 0, 0xFF0000);
					// this.debugLine(p1End, p2End, 1, 0x00FF00);

					// ROTATION
					const diffStartG = new THREE.Vector3(diffStart.x, diffStart.y, 0);
					const diffEndG = new THREE.Vector3(diffEnd.x, diffEnd.y, 0);
					let sign = Math.sign(diffStartG.clone().cross(diffEndG).z);
					sign = sign === 0 ? 1 : sign;
					const angle = sign * diffStartG.angleTo(diffEndG);
					const newAngle = pointcloud.rotation.z + angle;
					
					// SCALE
					const scale = diffEnd.length() / diffStart.length();
					const newScale = pointcloud.scale.clone().multiplyScalar(scale);

					// POSITION
					const p1ToP = new THREE.Vector3().subVectors(pointcloud.position, p1Start);
					p1ToP.multiplyScalar(scale);
					p1ToP.applyAxisAngle(new THREE.Vector3(0, 0, 1), angle);
					const newPosition = p1End.clone().add(p1ToP);
					
					//this.debugLine(pointcloud.position, newPosition, 0, 0xFF0000);

					//console.log(newScale, p1ToP, angle);

					pointcloud.node.rotation.z = newAngle;
					pointcloud.node.scale.copy(newScale);
					pointcloud.node.position.copy(newPosition);

					pointcloud.node.updateMatrix();
					pointcloud.node.updateMatrixWorld();



				}

			}
			
			if(triggered.length === 1){
				// TRANSLATE POINT CLOUDS
				const pad = triggered[0];
				const prev = this.previousPad(pad);

				const flipWorld = new THREE.Matrix4().fromArray([
						1, 0, 0, 0, 
						0, 0, 1, 0, 
						0, -1, 0, 0,
						0, 0, 0, 1
					]);
				const flipView = new THREE.Matrix4().getInverse(flipWorld);

				const p1 = new THREE.Vector3(...pad.pose.position).applyMatrix4(flipWorld);
				const p2 = new THREE.Vector3(...prev.pose.position).applyMatrix4(flipWorld);

				p1.applyMatrix4(vr.node.matrixWorld);
				p2.applyMatrix4(vr.node.matrixWorld);

				const diff = new THREE.Vector3().subVectors(p1, p2);

				//const diff = toScene(new THREE.Vector3(
				//	pad.pose.position[0] - prev.pose.position[0],
				//	pad.pose.position[1] - prev.pose.position[1],
				//	pad.pose.position[2] - prev.pose.position[2],
				//));

				for(const pc of selection){
					pc.position.add(diff);
				}
			}
		
			{ // MOVE WITH JOYSTICK

				const flipWorld = new THREE.Matrix4().fromArray([
					1, 0, 0, 0, 
					0, 0, 1, 0, 
					0, -1, 0, 0,
					0, 0, 0, 1
				]);
				const flipView = new THREE.Matrix4().getInverse(flipWorld);
				const {display, frameData} = vr;

				const computeMove = (pad) => {
					const axes = pad.axes;

					const opos = new THREE.Vector3(...pad.pose.position);
					const rotation = new THREE.Quaternion(...pad.pose.orientation);
					const d = new THREE.Vector3(0, 0, -1);
					d.applyQuaternion(rotation);
					
					const worldPos = toScene(opos);
					const worldTarget = toScene(new THREE.Vector3().addVectors(opos, d));
					const dir = new THREE.Vector3().subVectors(worldTarget, worldPos).normalize();

					const amount = axes[1] * this.speed;

					const move = dir.clone().multiplyScalar(amount);

					return move;
				};

				let flip = 1;
				if(display.displayName.includes("Oculus")){
					flip = -1;
				}

				let move = null;

				if(left && right){
					move = computeMove(right);

					const leftAdjustAxe = flip * left.axes[1];
					const adjust = this.speedModificationFactor ** leftAdjustAxe;

					move = move.multiplyScalar(adjust);


				}else if(right){
					move = computeMove(right);
				}else if(left){
					move = computeMove(left);
				}

				if(move){
					move.multiplyScalar(delta * flip);

					vr.node.position.add(move);
				}

				// for(const pad of [left, right].filter(pad => pad)){

					

				// 	moves.push(move);

				// 	// vr.node.position.add(move);
				// }

				// if(moves.length === 1){
				// 	vr.node.position.add(moves[0]);
				// }else if(moves.length > 1){

				// 	const factor = 10;
				// 	const [adjust, main] = moves;
				// 	// main gives direction, adjust modifies speed between [0, factor]

				// 	const mMain = main.length();


				// 	let mAdjust = 



				// 	const move = mMain.multiplyScalar(adjust);


				// 	// const move = moves[0].clone().add(moves[1]);

				// 	// const amount = (move.length() ** 3) * delta;
				// 	// move.multiplyScalar(amount);

				// 	// vr.node.position.add(move);
				// }


				// let pad = [right, left].find(pad => pad !== undefined);

				// if(pad){

				// 	const axes = pad.axes;


				// 	// const leftView = new THREE.Matrix4().fromArray(frameData.leftViewMatrix);
				// 	// const view = new THREE.Matrix4().multiplyMatrices(leftView, flipView);
				// 	// const world = new THREE.Matrix4().getInverse(view);

				// 	{ // move to where the controller points
				// 		const opos = new THREE.Vector3(...right.pose.position);
				// 		const rotation = new THREE.Quaternion(...pad.pose.orientation);
				// 		const d = new THREE.Vector3(0, 0, -1);
				// 		d.applyQuaternion(rotation);
						
				// 		const worldPos = toScene(opos);
				// 		const worldTarget = toScene(new THREE.Vector3().addVectors(opos, d));
				// 		const dir = new THREE.Vector3().subVectors(worldTarget, worldPos).normalize();

				// 		const amount = axes[1];

				// 		const move = dir.clone().multiplyScalar(delta * amount);

				// 		//const d = dir.clone().multiplyScalar(delta);
				// 		vr.node.position.add(move);
				// 	}

				// 	{ // move to trigger direction
				// 		// const pos = new THREE.Vector3(0, 0, 0).applyMatrix4(world);
				// 		// const pForward = new THREE.Vector3(0, 0, -1).applyMatrix4(world);
				// 		// const pRight = new THREE.Vector3(1, 0, 0).applyMatrix4(world);
				// 		// const pUp = new THREE.Vector3(0, 1, 0).applyMatrix4(world);

				// 		// const dForward = new THREE.Vector3().subVectors(pForward, pos).normalize();
				// 		// const dRight = new THREE.Vector3().subVectors(pRight, pos).normalize();
				// 		// const dUp = new THREE.Vector3().subVectors(pUp, pos).normalize();

				// 		// const dir = new THREE.Vector3().addVectors(
				// 		// 	dRight.clone().multiplyScalar(axes[0]),
				// 		// 	dForward.clone().multiplyScalar(axes[1])
				// 		// );

				// 		// const d = dir.clone().multiplyScalar(delta);
				// 		// vr.node.position.add(d);
				// 	}

				// }

			}

			{ // MOVE CONTROLLER SCENE NODE
				if(right){
					const {node, debug} = snRight;
					const opos = new THREE.Vector3(...right.pose.position);
					const position = toScene(opos);
					
					const rotation = new THREE.Quaternion(...right.pose.orientation);
					const d = new THREE.Vector3(0, 0, -1);
					d.applyQuaternion(rotation);
					// const target = toScene(new THREE.Vector3().addVectors(opos, d));

					node.position.copy(position);
				}
				
				if(left){
					const {node, debug} = snLeft;
					
					const position = toScene(new THREE.Vector3(...left.pose.position));
					node.position.copy(position);
				}
			}

			this.previousPads = gamepads;
		}
	};

	THREE.OrthographicCamera.prototype.zoomTo = function( node, factor = 1){

		if ( !node.geometry && !node.boundingBox) {
			return;
		}

		// TODO

		//let minWS = new THREE.Vector4(node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z, 1);
		//let minVS = minWS.applyMatrix4(this.matrixWorldInverse);

		//let right = node.boundingBox.max.x;
		//let bottom	= node.boundingBox.min.y;
		//let top = node.boundingBox.max.y;

		this.updateProjectionMatrix();	
	};

	THREE.PerspectiveCamera.prototype.zoomTo = function (node, factor) {
		if (!node.geometry && !node.boundingSphere && !node.boundingBox) {
			return;
		}

		if (node.geometry && node.geometry.boundingSphere === null) {
			node.geometry.computeBoundingSphere();
		}

		node.updateMatrixWorld();

		let bs;

		if (node.boundingSphere) {
			bs = node.boundingSphere;
		} else if (node.geometry && node.geometry.boundingSphere) {
			bs = node.geometry.boundingSphere;
		} else {
			bs = node.boundingBox.getBoundingSphere(new THREE.Sphere());
		}

		let _factor = factor || 1;

		bs = bs.clone().applyMatrix4(node.matrixWorld);
		let radius = bs.radius;
		let fovr = this.fov * Math.PI / 180;

		if (this.aspect < 1) {
			fovr = fovr * this.aspect;
		}

		let distanceFactor = Math.abs(radius / Math.sin(fovr / 2)) * _factor;

		let offset = this.getWorldDirection(new THREE.Vector3()).multiplyScalar(-distanceFactor);
		this.position.copy(bs.center.clone().add(offset));
	};

	THREE.Ray.prototype.distanceToPlaneWithNegative = function (plane) {
		let denominator = plane.normal.dot(this.direction);
		if (denominator === 0) {
			// line is coplanar, return origin
			if (plane.distanceToPoint(this.origin) === 0) {
				return 0;
			}

			// Null is preferable to undefined since undefined means.... it is undefined
			return null;
		}
		let t = -(this.origin.dot(plane.normal) + plane.constant) / denominator;

		return t;
	};

	const workerPool = new WorkerPool();

	const version = {
		major: 1,
		minor: 7,
		suffix: '.1'
	};

	let lru = new LRU();

	console.log('Potree ' + version.major + '.' + version.minor + version.suffix);

	let pointBudget = 1 * 1000 * 1000;
	let framenumber = 0;
	let numNodesLoading = 0;
	let maxNodesLoading = 4;

	const debug = {};

	exports.scriptPath = "";

	if (document.currentScript && document.currentScript.src) {
		exports.scriptPath = new URL(document.currentScript.src + '/..').href;
		if (exports.scriptPath.slice(-1) === '/') {
			exports.scriptPath = exports.scriptPath.slice(0, -1);
		}
	} else if(({ url: (typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('potree.js', document.baseURI).href)) })){
		exports.scriptPath = new URL((typeof document === 'undefined' ? new (require('u' + 'rl').URL)('file:' + __filename).href : (document.currentScript && document.currentScript.src || new URL('potree.js', document.baseURI).href)) + "/..").href;
		if (exports.scriptPath.slice(-1) === '/') {
			exports.scriptPath = exports.scriptPath.slice(0, -1);
		}
	}else {
		console.error('Potree was unable to find its script path using document.currentScript. Is Potree included with a script tag? Does your browser support this function?');
	}

	let resourcePath = exports.scriptPath + '/resources';


	function loadPointCloud$1(path, name, callback){
		let loaded = function(e){
			e.pointcloud.name = name;
			callback(e);
		};

		let promise = new Promise( resolve => {

			// load pointcloud
			if (!path){
				// TODO: callback? comment? Hello? Bueller? Anyone?
			} else if (path.indexOf('ept.json') > 0) {
				EptLoader.load(path, function(geometry) {
					if (!geometry) {
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					}
					else {
						let pointcloud = new PointCloudOctree(geometry);
						//loaded(pointcloud);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});
			} else if (path.indexOf('cloud.js') > 0) {
				POCLoader.load(path, function (geometry) {
					if (!geometry) {
						//callback({type: 'loading_failed'});
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					} else {
						let pointcloud = new PointCloudOctree(geometry);
						// loaded(pointcloud);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});
			} else if (path.indexOf('metadata.json') > 0) {
				Potree.OctreeLoader.load(path).then(e => {
					let geometry = e.geometry;

					if(!geometry){
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					}else {
						let pointcloud = new PointCloudOctree(geometry);

						let aPosition = pointcloud.getAttribute("position");

						let material = pointcloud.material;
						material.elevationRange = [
							aPosition.range[0][2],
							aPosition.range[1][2],
						];

						// loaded(pointcloud);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});

				OctreeLoader.load(path, function (geometry) {
					if (!geometry) {
						//callback({type: 'loading_failed'});
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					} else {
						let pointcloud = new PointCloudOctree(geometry);
						// loaded(pointcloud);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});
			} else if (path.indexOf('.vpc') > 0) {
				PointCloudArena4DGeometry.load(path, function (geometry) {
					if (!geometry) {
						//callback({type: 'loading_failed'});
						console.error(new Error(`failed to load point cloud from URL: ${path}`));
					} else {
						let pointcloud = new PointCloudArena4D(geometry);
						// loaded(pointcloud);
						resolve({type: 'pointcloud_loaded', pointcloud: pointcloud});
					}
				});
			} else {
				//callback({'type': 'loading_failed'});
				console.error(new Error(`failed to load point cloud from URL: ${path}`));
			}
		});

		if(callback){
			promise.then(pointcloud => {
				loaded(pointcloud);
			});
		}else {
			return promise;
		}
	};


	// add selectgroup
	(function($){
		$.fn.extend({
			selectgroup: function(args = {}){

				let elGroup = $(this);
				let rootID = elGroup.prop("id");
				let groupID = `${rootID}`;
				let groupTitle = (args.title !== undefined) ? args.title : "";

				let elButtons = [];
				elGroup.find("option").each((index, value) => {
					let buttonID = $(value).prop("id");
					let label = $(value).html();
					let optionValue = $(value).prop("value");

					let elButton = $(`
					<span style="flex-grow: 1; display: inherit">
					<label for="${buttonID}" class="ui-button" style="width: 100%; padding: .4em .1em">${label}</label>
					<input type="radio" name="${groupID}" id="${buttonID}" value="${optionValue}" style="display: none"/>
					</span>
				`);
					let elLabel = elButton.find("label");
					let elInput = elButton.find("input");

					elInput.change( () => {
						elGroup.find("label").removeClass("ui-state-active");
						elGroup.find("label").addClass("ui-state-default");
						if(elInput.is(":checked")){
							elLabel.addClass("ui-state-active");
						}else {
							//elLabel.addClass("ui-state-default");
						}
					});

					elButtons.push(elButton);
				});

				let elFieldset = $(`
				<fieldset style="border: none; margin: 0px; padding: 0px">
					<legend>${groupTitle}</legend>
					<span style="display: flex">

					</span>
				</fieldset>
			`);

				let elButtonContainer = elFieldset.find("span");
				for(let elButton of elButtons){
					elButtonContainer.append(elButton);
				}

				elButtonContainer.find("label").each( (index, value) => {
					$(value).css("margin", "0px");
					$(value).css("border-radius", "0px");
					$(value).css("border", "1px solid black");
					$(value).css("border-left", "none");
				});
				elButtonContainer.find("label:first").each( (index, value) => {
					$(value).css("border-radius", "4px 0px 0px 4px");

				});
				elButtonContainer.find("label:last").each( (index, value) => {
					$(value).css("border-radius", "0px 4px 4px 0px");
					$(value).css("border-left", "none");
				});

				elGroup.empty();
				elGroup.append(elFieldset);



			}
		});
	})(jQuery);

	exports.Action = Action;
	exports.AnimationPath = AnimationPath;
	exports.Annotation = Annotation;
	exports.Box3Helper = Box3Helper;
	exports.BoxVolume = BoxVolume;
	exports.CameraAnimation = CameraAnimation;
	exports.CameraMode = CameraMode;
	exports.ClassificationScheme = ClassificationScheme;
	exports.ClipMethod = ClipMethod;
	exports.ClipTask = ClipTask;
	exports.ClipVolume = ClipVolume;
	exports.ClippingTool = ClippingTool;
	exports.Compass = Compass;
	exports.DeviceOrientationControls = DeviceOrientationControls;
	exports.EarthControls = EarthControls;
	exports.ElevationGradientRepeat = ElevationGradientRepeat;
	exports.Enum = Enum;
	exports.EnumItem = EnumItem;
	exports.EptBinaryLoader = EptBinaryLoader;
	exports.EptKey = EptKey;
	exports.EptLaszipLoader = EptLaszipLoader;
	exports.EptLazBatcher = EptLazBatcher;
	exports.EptLoader = EptLoader;
	exports.EptZstandardLoader = EptZstandardLoader;
	exports.EventDispatcher = EventDispatcher;
	exports.EyeDomeLightingMaterial = EyeDomeLightingMaterial;
	exports.Features = Features;
	exports.FirstPersonControls = FirstPersonControls;
	exports.GeoPackageLoader = GeoPackageLoader;
	exports.Geopackage = Geopackage$1;
	exports.Gradients = Gradients;
	exports.HierarchicalSlider = HierarchicalSlider;
	exports.Images360 = Images360;
	exports.Images360Loader = Images360Loader;
	exports.KeyCodes = KeyCodes;
	exports.LRU = LRU;
	exports.LRUItem = LRUItem;
	exports.LengthUnits = LengthUnits;
	exports.MOUSE = MOUSE;
	exports.Measure = Measure;
	exports.MeasuringTool = MeasuringTool;
	exports.Message = Message;
	exports.NodeLoader = NodeLoader;
	exports.NormalizationEDLMaterial = NormalizationEDLMaterial;
	exports.NormalizationMaterial = NormalizationMaterial;
	exports.OctreeLoader = OctreeLoader;
	exports.OrbitControls = OrbitControls;
	exports.OrientedImage = OrientedImage;
	exports.OrientedImageLoader = OrientedImageLoader;
	exports.OrientedImages = OrientedImages;
	exports.POCLoader = POCLoader;
	exports.PathAnimation = PathAnimation;
	exports.PointAttribute = PointAttribute;
	exports.PointAttributeTypes = PointAttributeTypes;
	exports.PointAttributes = PointAttributes;
	exports.PointCloudEptGeometry = PointCloudEptGeometry;
	exports.PointCloudEptGeometryNode = PointCloudEptGeometryNode;
	exports.PointCloudMaterial = PointCloudMaterial;
	exports.PointCloudOctree = PointCloudOctree;
	exports.PointCloudOctreeGeometry = PointCloudOctreeGeometry;
	exports.PointCloudOctreeGeometryNode = PointCloudOctreeGeometryNode;
	exports.PointCloudOctreeNode = PointCloudOctreeNode;
	exports.PointCloudSM = PointCloudSM;
	exports.PointCloudTree = PointCloudTree;
	exports.PointCloudTreeNode = PointCloudTreeNode;
	exports.PointShape = PointShape;
	exports.PointSizeType = PointSizeType;
	exports.Points = Points;
	exports.PolygonClipVolume = PolygonClipVolume;
	exports.Profile = Profile;
	exports.ProfileData = ProfileData;
	exports.ProfileRequest = ProfileRequest;
	exports.ProfileTool = ProfileTool;
	exports.Renderer = Renderer;
	exports.Scene = Scene;
	exports.ScreenBoxSelectTool = ScreenBoxSelectTool;
	exports.ShapefileLoader = ShapefileLoader;
	exports.SphereVolume = SphereVolume;
	exports.SpotLightHelper = SpotLightHelper;
	exports.TextSprite = TextSprite;
	exports.TransformationTool = TransformationTool;
	exports.TreeType = TreeType;
	exports.Utils = Utils;
	exports.VRControlls = VRControlls;
	exports.Version = Version;
	exports.Viewer = Viewer;
	exports.Volume = Volume;
	exports.VolumeTool = VolumeTool;
	exports.WorkerPool = WorkerPool;
	exports.XHRFactory = XHRFactory;
	exports.debug = debug;
	exports.framenumber = framenumber;
	exports.loadPointCloud = loadPointCloud$1;
	exports.loadProject = loadProject;
	exports.lru = lru;
	exports.maxNodesLoading = maxNodesLoading;
	exports.numNodesLoading = numNodesLoading;
	exports.pointBudget = pointBudget;
	exports.resourcePath = resourcePath;
	exports.saveProject = saveProject;
	exports.updatePointClouds = updatePointClouds;
	exports.updateVisibility = updateVisibility;
	exports.updateVisibilityStructures = updateVisibilityStructures;
	exports.version = version;
	exports.workerPool = workerPool;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=potree.js.map
