
import * as THREE from "../../../libs/three.js/build/three.module.js";
import { EventDispatcher } from "../../EventDispatcher.js";
import {TextSprite} from "../../TextSprite.js";

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

export class Images360 extends EventDispatcher{

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
			if(currentlyHovered && currentlyHovered.image360){
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


export class Images360Loader{

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


