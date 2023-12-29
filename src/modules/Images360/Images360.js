
import * as THREE from "../../../libs/three.js/build/three.module.js";
import { EventDispatcher } from "../../EventDispatcher.js";
import {TextSprite} from "../../TextSprite.js";
import { gizilCustomEvent } from "../../gizil/GizilCustomEvent.js";

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

	constructor(file, time, longitude, latitude, altitude, course, pitch, roll, real){
		this.file = file;
		this.time = time;
		this.longitude = longitude;
		this.latitude = latitude;
		this.altitude = altitude;
		// this.course = course;
		// this.pitch = pitch;
		// this.roll = roll;
		
		/**
		 * Dönüklük tanımları
		 */
		if (real) {
			var quat = new THREE.Quaternion(roll, pitch, course, real);

			var q = quat;
			var m = new THREE.Matrix4();
			m.makeRotationFromQuaternion(q);

			var axis = [0, 0, 0];
			var angle = 2 * Math.acos(q.w);
			if (1 - (q.w * q.w) < 0.000001) {
				axis[0] = q.x;
				axis[1] = q.y;
				axis[2] = q.z;
			}
			else {
				// http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/
				var s = Math.sqrt(1 - (q.w * q.w));
				axis[0] = q.x / s;
				axis[1] = q.y / s;
				axis[2] = q.z / s;
			}

			var eu = new THREE.Euler();
			eu.setFromRotationMatrix(m, 'XYZ');

			const toReal = (x) => {
				const result =  x * 180 / Math.PI
				if (!isNaN(parseFloat(result)) && isFinite(parseFloat(result))) {
					return parseFloat(parseFloat(result).toFixed(7));
				}
				else {
					return result;
				}
			}

			this.roll = toReal(eu.toArray()[0]);
			this.pitch = toReal(eu.toArray()[1]);
			this.course = 360 - toReal(eu.toArray()[2]);

		}
		else {
			this.course = course;
			this.pitch = pitch;
			this.roll = roll;
		}

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
		this.node_2 = new THREE.Object3D();
		this.viewer.scene.scene.add(this.node_2);
		this.sphere = new THREE.Mesh(sgHigh, sm);
		this.sphere.visible = false;
		// this.sphere.scale.set(1000, 1000, 1000);
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

		/**
		 * Mobil kullanımı için
		 *
		 */
		this.addEventListener("touchend", () => {
			if(currentlyHovered && currentlyHovered.image360){
				this.focus(currentlyHovered.image360);
			}
		})

		this.addEventListener("mousewheel", (e) => {
			if(this.focusedImage) {
				var myactivecamera = viewer.scene.getActiveCamera();
				const zoom  = myactivecamera.zoom;
				const max = 4;
				const min = 0.5;

				const newZoom = myactivecamera.zoom + (e.delta / 2);
				if(newZoom >= min && newZoom <= max) {
					
					myactivecamera.zoom = newZoom;
				} else {
					if(newZoom > 2) {

						myactivecamera.zoom = max;
					} else {

						myactivecamera.zoom = min;
					}
				}
			}
		})
	
		/**
		 * Panoromik Görüntü Arasında Gezmek için tanımlar
		 */

  		this.isFocused = false;
	};

	set visible(visible){
		if(this._visible === visible){
			return;
		}


		for(const image of this.images){
			image.mesh.visible = visible && (this.focusedImage == null);
		}

		this.sphere.visible = visible && (this.focusedImage != null);
		this.sprite.visible = visible && (this.focusedImage != null);
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

		// panoromik görüntüye girerken, zoom'u hafızaya alıyoruz.
		const myactivecamera = viewer.scene.getActiveCamera();
		this.viewerZoom = myactivecamera.zoom;

		previousView = {
			controls: this.viewer.controls,
			position: this.viewer.scene.view.position.clone(),
			target: viewer.scene.view.getPivot(),
		};

		this.viewer.setControls(this.viewer.orbitControls);
		this.viewer.orbitControls.doubleClockZoomEnabled = false;

		/**
		 * Panoromik Görüntü Gezintide sadece 20m çapı uzaklığındaki imageslara kadar görünür yap
		 */
  		for(let image of this.images){
  			this.distance = Math.sqrt(  Math.pow(image360.altitude - image.altitude,2) + 
										Math.pow(image360.longitude - image.longitude,2) + 
										Math.pow(image360.latitude - image.latitude,2) );

			if (this.distance < 20 && this.distance !== 0){

				image.mesh.visible = true;
				image.mesh.material = new THREE.MeshBasicMaterial({side: THREE.BackSide});

			}else{

				image.mesh.visible = false;
				
			}
  		}

		this.selectingEnabled = false;

		this.sphere.visible = false;

		this.load(image360).then( () => {
			/** */
			this.selectingEnabled = true;
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
		gizilCustomEvent.emit(GizilEvent.IMAGE_FOCUSED, { image: image360, state: 'FOCUSED' });
		/** */
		this.isFocused = true;

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
			// previousView.position, 
			/** Images unfocus olduğunda başka imageden geldiysek oraya dönüyor: hatası çözümü */
  			previousView.position.add(new THREE.Vector3(0,-2,0)),
			previousView.target,
			500
		);


		this.focusedImage = null;
		gizilCustomEvent.emit(GizilEvent.IMAGE_FOCUSED, { image: null, state: 'UNFOCUSED' });


		this.elUnfocus.style.display = "none";
		/** */
		this.isFocused= false;

		// panoromik görüntüden çıkarken zoom resetleme yapıyoruz
		// const myactivecamera = viewer.scene.getActiveCamera();
		// myactivecamera.zoom = this.viewerZoom;
	}

	load(image360){

		return new Promise(resolve => {
			let texture = new THREE.TextureLoader().load(image360.file, resolve);
			texture.wrapS = THREE.RepeatWrapping;
			texture.repeat.x = -1;

			image360.texture = texture;
		},(reject) => {
			console.error('IMAGES LOAD ERROR', reject);
		});

	}

	handleHovering(){
		let mouse = viewer.inputHandler.mouse;
		let camera = viewer.scene.getActiveCamera();
		let domElement = viewer.renderer.domElement;

		let ray = Potree.Utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

		// let tStart = performance.now();
		raycaster.ray.copy(ray);
		/** */
		raycaster.camera = camera;
		let intersections = raycaster.intersectObjects(this.node_2.children);
		// let intersections = raycaster.intersectObjects(this.node.children);

		
		/**
		 * Panoromik Görüntüden çıkmamız için
		 */

		if(this.focusedImage){

			intersections = intersections.filter(intersection => intersection.object !== this.focusedImage.mesh);

		}else{

			intersections = raycaster.intersectObjects(this.node_2.children);

		}

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
		let coordinateLines = lines.slice(0);
		// let coordinateLines = lines.slice(1);

		let images360 = new Images360(viewer);

		for(let line of coordinateLines){

			if(line.trim().length === 0){
				continue;
			}

			let tokens = line.split(/\t/);

			let [filename, time, long, lat, alt, course, pitch, roll,real] = tokens;
			time = parseFloat(time);
			long = parseFloat(long);
			lat = parseFloat(lat);
			alt = parseFloat(alt);
			course = parseFloat(course);
			pitch = parseFloat(pitch);
			roll = parseFloat(roll);
			real = parseFloat(real);

			filename = filename.replace(/"/g, "");
			let file = `${url}/${filename}`;

			let image360 = new Image360(file, time, long, lat, alt, course, pitch, roll,real);

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
			mesh.scale.set(0.4, 0.4, 0.4);
			// mesh.scale.set(1, 1, 1);
			mesh.material.transparent = true;
			mesh.material.opacity = 0.50;
			// mesh.material.opacity = 0.75;
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

			images360.node_2.add(mesh);
			// images360.node.add(mesh);

			image360.mesh = mesh;
		}
	}

	

};


