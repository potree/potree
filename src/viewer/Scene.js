
Potree.Scene = class extends THREE.EventDispatcher{

	constructor(renderers){
		super();

		this.annotations = new Potree.Annotation();
		
		this.scene = new THREE.Scene();
		this.sceneBG = new THREE.Scene();
		// Create separate scene for each view
		this.scenePointClouds = renderers.map(x => new THREE.Scene());

		this.cameraP = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000 * 1000);
		this.cameraO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000 * 1000);
		this.cameras = [{
			perspective: this.cameraP,
			orthographic: this.cameraO,
		}];
		this.cameraBG = new THREE.Camera();
		this.cameraScreenSpace = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
		this.cameraMode = Potree.CameraMode.PERSPECTIVE;
		this.pointclouds = [];

		this.measurements = [];
		this.profiles = [];
		this.volumes = [];
		this.polygonClipVolumes = [];
	
		this.extractorControls = null;
		this.rotationControls = null;
		this.fpControls = null;
		this.orbitControls = null;
		this.earthControls = null;
		this.geoControls = null;
		this.inputHandler = null;
		this.inputHandlers = [];

		this.view = new Potree.View();

		this.directionalLight = null;

		if (renderers.length > 1) {
			this.cameras.push({
				perspective: new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000 * 1000),
				orthographic: new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000 * 1000),
			});
		}

		this.views = [];
		renderers.forEach((renderer) => {
			this.views.push(new Potree.View());
		});

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

		this.scenePointClouds.forEach(spc => spc.updateMatrixWorld(true));
		this.referenceFrame.updateMatrixWorld(true);

		for (let pointcloud of pointclouds) {
			pointcloud.updateMatrixWorld(true);

			let pointcloudBox = pointcloud.pcoGeometry.tightBoundingBox ? pointcloud.pcoGeometry.tightBoundingBox : pointcloud.boundingBox;
			let boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloudBox, pointcloud.matrixWorld);
			box.union(boxWorld);
		}

		return box;
	}

	addPointCloud (pointcloud) {
		// Allow to have only one point cloud per scene if there are multiple views.
		// This allows us to have different crop views in Extractor.
		const scenePointCloud = this.scenePointClouds[this.pointclouds.length] || this.scenePointClouds[0];
		scenePointCloud.add(pointcloud);

		this.pointclouds.push(pointcloud);

		this.dispatchEvent({
			type: 'pointcloud_added',
			pointcloud: pointcloud
		});
	};

	addVolume (volume) {
		this.volumes.push(volume);
		this.dispatchEvent({
			'type': 'volume_added',
			'scene': this,
			'volume': volume
		});
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

	getActiveCamera(index = 0) {
		const cameraMode = this.cameraMode === Potree.CameraMode.PERSPECTIVE ? 'perspective' : 'orthographic';
		return this.cameras[index][cameraMode];
	}
	
	initialize(){
		this.referenceFrame = new THREE.Object3D();
		this.referenceFrame.matrixAutoUpdate = false;
		this.scenePointClouds.forEach(spc => spc.add(this.referenceFrame));

		this.cameras.forEach((c) => {
			c.perspective.up.set(0, 0, 1);
			c.perspective.position.set(1000, 1000, 1000);
			c.orthographic.up.set(0, 0, 1);
			c.orthographic.position.set(1000, 1000, 1000);
		});

		//this.camera.rotation.y = -Math.PI / 4;
		//this.camera.rotation.x = -Math.PI / 6;
		this.cameraScreenSpace.lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
		
		this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		this.directionalLight.position.set( 10, 10, 10 );
		this.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
		this.scenePointClouds.forEach(spc => spc.add(this.directionalLight));
		
		let light = new THREE.AmbientLight( 0x555555 ); // soft white light
		this.scenePointClouds.forEach(spc => spc.add(light));
		
		//let grid = Potree.utils.createGrid(5, 5, 2);
		//this.scene.add(grid);

		{ // background
			let texture = Potree.utils.createBackgroundTexture(512, 512);

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

		{ // lights
			{
				let light = new THREE.DirectionalLight(0xffffff);
				light.position.set(10, 10, 1);
				light.target.position.set(0, 0, 0);
				this.scene.add(light);
			}

			{
				let light = new THREE.DirectionalLight(0xffffff);
				light.position.set(-10, 10, 1);
				light.target.position.set(0, 0, 0);
				this.scene.add(light);
			}

			{
				let light = new THREE.DirectionalLight(0xffffff);
				light.position.set(0, -10, 20);
				light.target.position.set(0, 0, 0);
				this.scene.add(light);
			}
		}
	}
	
	addAnnotation(position, args = {}){		
		if(position instanceof Array){
			args.position = new THREE.Vector3().fromArray(position);
		} else if (position instanceof THREE.Vector3) {
			args.position = position;
		}
		let annotation = new Potree.Annotation(args);
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
