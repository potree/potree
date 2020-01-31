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
		this.mesh = null;
	}
};

export class Images360{

	constructor(){
		this.images = [];
		this.node = new THREE.Object3D();

		this.focusedImage = null;
	};

	focus(image360){
		if(this.focusedImage !== null){
			this.unfocus();
		}

		this.load(image360);

		for(let image of this.images){
			image.mesh.visible = false;
		}

		image360.mesh.visible = true;
		image360.mesh.geometry = sgHigh;

		image360.mesh.scale.set(1000, 1000, 1000);

		//viewer.scene.view.position.copy(image360.mesh.position);
		//viewer.scene.view.radius = 0.0001;

		let target = image360.mesh.position;
		let dir = target.clone().sub(viewer.scene.view.position).normalize();
		let move = dir.multiplyScalar(0.00001);
		let newCamPos = target.clone().sub(move);

		viewer.scene.view.setView(
			newCamPos, 
			target,
			500
		);

		this.focusedImage = image360;
	}

	unfocus(){
		let image = this.focusedImage;

		if(image === null){
			return;
		}

		for(let image of this.images){
			image.mesh.visible = true;
		}

		image.mesh.geometry = sg;
		image.mesh.scale.set(1, 1, 1);
		image.mesh.material.map = null;
		image.mesh.material.needsUpdate = true;

		//viewer.scene.view.radius = 5.0; // TODO BAD!!

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
	}

	load(image360){
		let {mesh} = image360;

		let texture = new THREE.TextureLoader().load(image360.file);
		texture.wrapS = THREE.RepeatWrapping;
		texture.repeat.x = -1;

		mesh.material.map = texture;
		mesh.material.needsUpdate = true;
	}

};


export class Images360Loader{

	static async load(url, params = {}){

		if(!params.transform){
			params.transform = {
				forward: a => a,
			};
		}
		
		let response = await fetch(`${url}/coordinates.txt`);
		let text = await response.text();

		let lines = text.split(/\r?\n/);
		let coordinateLines = lines.slice(1);

		let images360 = new Images360();

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