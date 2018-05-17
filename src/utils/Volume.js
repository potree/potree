
import {TextSprite} from "../TextSprite.js";

export class Volume extends THREE.Object3D {
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


export class BoxVolume extends Volume{

	constructor(args = {}){
		super(args);

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = 'box_' + this.constructor.counter;

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

export class SphereVolume extends Volume{

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