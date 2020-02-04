let sg = new THREE.SphereGeometry(1, 8, 8);
let sgHigh = new THREE.SphereGeometry(1, 128, 128);
let sm = new THREE.MeshBasicMaterial({side: THREE.BackSide});

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
	}
};

export class Images360{

	constructor(viewer){
		this.viewer = viewer;

		this.images = [];
		this.node = new THREE.Object3D();

		this.sphere = new THREE.Mesh(sgHigh, sm);
		this.sphere.visible = false;
		this.sphere.scale.set(1000, 1000, 1000);
		this.node.add(this.sphere);

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
		
	};

	focus(image360){
		if(this.focusedImage !== null){
			this.unfocus();
		}

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
		let move = dir.multiplyScalar(0.00001);
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

		viewer.scene.view.setView(
			newCamPos, 
			target,
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

		// Images360Loader.createSceneNodes(images360, params.transform);

		return images360;

	}

};


