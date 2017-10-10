// let getQueryParam = function(name) {
//    name = name.replace(/[\[\]]/g, "\\$&");
//    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
//        results = regex.exec(window.location.href);
//    if (!results) return null;
//    if (!results[2]) return '';
//    return decodeURIComponent(results[2].replace(/\+/g, " "));
// }

Potree.View = class {
	constructor () {
		this.position = new THREE.Vector3(0, 0, 0);

		this.yaw = Math.PI / 4;
		this._pitch = -Math.PI / 4;
		this.radius = 1;

		this.maxPitch = Math.PI / 2;
		this.minPitch = -Math.PI / 2;

		this.navigationMode = Potree.OrbitControls;
	}

	clone () {
		let c = new Potree.View();
		c.yaw = this.yaw;
		c._pitch = this.pitch;
		c.radius = this.radius;
		c.maxPitch = this.maxPitch;
		c.minPitch = this.minPitch;
		c.navigationMode = this.navigationMode;

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
		let yaw = Math.atan2(dir.y, dir.x) - Math.PI / 2;
		let pitch = Math.atan2(dir.z, Math.sqrt(dir.x * dir.x + dir.y * dir.y));

		this.yaw = yaw;
		this.pitch = pitch;
	}

	lookAt (t) {
		let V = new THREE.Vector3().subVectors(t, this.position);
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
};

Potree.CameraMode = {
	ORTHOGRAPHIC: 0,
	PERSPECTIVE: 1
};

Potree.Scene = class extends THREE.EventDispatcher {
	constructor () {
		super();

		this.annotations = new Potree.Annotation();
		this.scene = new THREE.Scene();
		this.scenePointCloud = new THREE.Scene();
		this.sceneBG = new THREE.Scene();
		this.cameraP = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000 * 1000);
		this.cameraO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000 * 1000);
		this.cameraBG = new THREE.Camera();
		this.cameraScreenSpace = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
		this.cameraMode = Potree.CameraMode.PERSPECTIVE;
		this.pointclouds = [];

		this.measurements = [];
		this.profiles = [];
		this.volumes = [];
		this.clipVolumes = [];
		this.polygonClipVolumes = [];

		// TODO: Unused: this.fpControls;
		// TODO: Unused: this.orbitControls;
		// TODO: Unused: this.earthControls;
		// TODO: Unused: this.geoControls;
		// TODO: Unused: this.inputHandler;

		this.view = new Potree.View();

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

	addPointCloud (pointcloud) {
		this.pointclouds.push(pointcloud);
		this.scenePointCloud.add(pointcloud);

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

	addClipVolume (volume) {
		this.clipVolumes.push(volume);
		this.dispatchEvent({
			'type': 'clip_volume_added',
			'scene': this,
			'volume': volume
		});
	};

	removeClipVolume (volume) {
		let index = this.clipVolumes.indexOf(volume);
		if (index > -1) {
			this.clipVolumes.splice(index, 1);
			this.dispatchEvent({
				'type': 'clip_volume_removed',
				'scene': this,
				'volume': volume
			});
		}
	};

	addPolygonClipVolume (volume) {
		this.polygonClipVolumes.push(volume);
		this.dispatchEvent({
			'type': 'polygon_clip_volume_added',
			'scene': this,
			'volume': volume
		});
	};

	removePolygonClipVolume (volume) {
		let index = this.polygonClipVolumes.indexOf(volume);
		if (index > -1) {
			this.polygonClipVolumes.splice(index, 1);
			this.dispatchEvent({
				'type': 'polygon_clip_volume_removed',
				'scene': this,
				'volume': volume
			});
		}
	};

	addMeasurement (measurement) {
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

	removeAllClipVolumes () {
		while (this.clipVolumes.length > 0) {
			this.removeClipVolume(this.clipVolumes[0]);
		}

		while (this.polygonClipVolumes.length > 0) {
			this.removePolygonClipVolume(this.polygonClipVolumes[0]);
		}
	}

	getActiveCamera () {
		return this.cameraMode === Potree.CameraMode.PERSPECTIVE ? this.cameraP : this.cameraO;
	}

	initialize () {
		this.referenceFrame = new THREE.Object3D();
		this.referenceFrame.matrixAutoUpdate = false;
		this.scenePointCloud.add(this.referenceFrame);

		this.cameraP.up.set(0, 0, 1);
		this.cameraP.position.set(1000, 1000, 1000);
		this.cameraO.up.set(0, 0, 1);
		this.cameraO.position.set(1000, 1000, 1000);
		// this.camera.rotation.y = -Math.PI / 4;
		// this.camera.rotation.x = -Math.PI / 6;
		this.cameraScreenSpace.lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));

		this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
		this.directionalLight.position.set(10, 10, 10);
		this.directionalLight.lookAt(new THREE.Vector3(0, 0, 0));
		this.scenePointCloud.add(this.directionalLight);

		let light = new THREE.AmbientLight(0x555555); // soft white light
		this.scenePointCloud.add(light);

		let grid = Potree.utils.createGrid(5, 5, 2);
		this.scene.add(grid);

		{ // background
		// var texture = THREE.ImageUtils.loadTexture( Potree.resourcePath + '/textures/background.gif' );
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

	addAnnotation (position, args = {}) {
		if (position instanceof Array) {
			args.position = new THREE.Vector3().fromArray(position);
		} else if (position instanceof THREE.Vector3) {
			args.position = position;
		}
		let annotation = new Potree.Annotation(args);
		this.annotations.add(annotation);
	}

	getAnnotations () {
		return this.annotations;
	};
};

Potree.Viewer = class PotreeViewer extends THREE.EventDispatcher {
	constructor (domElement, args) {
		super();

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
		}

		let a = args || {};
		this.pointCloudLoadedCallback = a.onPointCloudLoaded || function () {};

		this.renderArea = domElement;

		// if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		//	defaultSettings.navigation = "Orbit";
		// }

		this.server = null;

		this.fov = 60;
		// this.clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
		this.isFlipYZ = false;
		this.useDEMCollisions = false;
		this.generateDEM = false;
		this.minNodeSize = 100;
		this.edlStrength = 1.0;
		this.edlRadius = 1.4;
		this.useEDL = false;
		this.classifications = {
			0: { visible: true, name: 'never classified' },
			1: { visible: true, name: 'unclassified' },
			2: { visible: true, name: 'ground' },
			3: { visible: true, name: 'low vegetation' },
			4: { visible: true, name: 'medium vegetation' },
			5: { visible: true, name: 'high vegetation' },
			6: { visible: true, name: 'building' },
			7: { visible: true, name: 'low point(noise)' },
			8: { visible: true, name: 'key-point' },
			9: { visible: true, name: 'water' },
			12: { visible: true, name: 'overlap' }
		};

		this.moveSpeed = 10;

		this.LENGTH_UNITS = {
			METER: {code: 'm'},
			FEET: {code: 'ft'},
			INCH: {code: '\u2033'}
		};
		this.lengthUnit = this.LENGTH_UNITS.METER;

		this.showBoundingBox = false;
		this.showAnnotations = true;
		this.freeze = false;

		this.progressBar = new ProgressBar();

		this.stats = new Stats();
		// this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		// document.body.appendChild( this.stats.dom );
		// this.stats.dom.style.left = "100px";

		this.potreeRenderer = null;
		this.edlRenderer = null;
		this.renderer = null;

		this.scene = null;

		this.inputHandler = null;

		this.measuringTool = null;
		this.profileTool = null;
		this.volumeTool = null;
		this.clippingTool = null;
		this.transformationTool = null;
		this.navigationCube = null;

		this.skybox = null;
		this.clock = new THREE.Clock();
		this.background = null;

		this.initThree();

		let scene = new Potree.Scene(this.renderer);
		this.setScene(scene);

		{
			this.inputHandler = new Potree.InputHandler(this);
			this.inputHandler.setScene(this.scene);

			this.measuringTool = new Potree.MeasuringTool(this);
			this.profileTool = new Potree.ProfileTool(this);
			this.volumeTool = new Potree.VolumeTool(this);
			this.clippingTool = new Potree.ClippingTool(this);
			this.transformationTool = new Potree.TransformationTool(this);
			this.navigationCube = new Potree.NavigationCube(this);
			this.navigationCube.visible = false;

			this.createControls();

			this.measuringTool.setScene(this.scene);
			this.profileTool.setScene(this.scene);
			this.volumeTool.setScene(this.scene);
			this.clippingTool.setScene(this.scene);

			let onPointcloudAdded = (e) => {
				if (this.scene.pointclouds.length === 1) {
					let speed = e.pointcloud.boundingBox.getSize().length();
					speed = speed / 5;
					this.setMoveSpeed(speed);
				}
			};

			this.addEventListener('scene_changed', (e) => {
				this.inputHandler.setScene(e.scene);
				this.measuringTool.setScene(e.scene);
				this.profileTool.setScene(e.scene);
				this.volumeTool.setScene(e.scene);
				this.clippingTool.setScene(this.scene);

				if (!e.scene.hasEventListener('pointcloud_added', onPointcloudAdded)) {
					e.scene.addEventListener('pointcloud_added', onPointcloudAdded);
				}
			});

			this.scene.addEventListener('pointcloud_added', onPointcloudAdded);
		}

		{ // set defaults
			this.setFOV(60);
			this.setEDLEnabled(false);
			this.setEDLRadius(1.4);
			this.setEDLStrength(0.4);
			this.clippingTool.setClipMode(Potree.ClipMode.HIGHLIGHT);
			this.setPointBudget(1 * 1000 * 1000);
			this.setShowBoundingBox(false);
			this.setFreeze(false);
			this.setNavigationMode(Potree.OrbitControls);
			this.setBackground('gradient');

			this.scaleFactor = 1;

			this.loadSettingsFromURL();
		}

		// start rendering!
		requestAnimationFrame(this.loop.bind(this));

		this.loadGUI = this.loadGUI.bind(this);
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
						this.renderArea.appendChild(node.domElement[0]);
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

	getControls (navigationMode) {
		if (navigationMode === Potree.OrbitControls) {
			return this.orbitControls;
		} else if (navigationMode === Potree.FirstPersonControls) {
			return this.fpControls;
		} else if (navigationMode === Potree.EarthControls) {
			return this.earthControls;
		} else {
			return null;
		}
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
	};

	setBackground (bg) {
		if (this.background === bg) {
			return;
		}

		this.background = bg;
		this.dispatchEvent({'type': 'background_changed', 'viewer': this});
	}

	setDescription (value) {
		$('#potree_description')[0].innerHTML = value;
	};

	setNavigationMode (value) {
		this.scene.view.navigationMode = value;
	};

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

	setDEMCollisionsEnabled (value) {
		if (this.useDEMCollisions !== value) {
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
	};

	setClassificationVisibility (key, value) {
		if (!this.classifications[key]) {
			this.classifications[key] = {visible: value, name: 'no name'};
			this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
		} else if (this.classifications[key].visible !== value) {
			this.classifications[key].visible = value;
			this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
		}
	};

	setLengthUnit (value) {
		switch (value) {
			case 'm':
				this.lengthUnit = this.LENGTH_UNITS.METER;
				break;
			case 'ft':
				this.lengthUnit = this.LENGTH_UNITS.FEET;
				break;
			case 'in':
				this.lengthUnit = this.LENGTH_UNITS.INCH;
				break;
		}

		this.dispatchEvent({'type': 'length_unit_changed', 'viewer': this, value: value});
	}

	toMaterialID (materialName) {
		if (materialName === 'RGB') {
			return Potree.PointColorType.RGB;
		} else if (materialName === 'Color') {
			return Potree.PointColorType.COLOR;
		} else if (materialName === 'Elevation') {
			return Potree.PointColorType.HEIGHT;
		} else if (materialName === 'Intensity') {
			return Potree.PointColorType.INTENSITY;
		} else if (materialName === 'Intensity Gradient') {
			return Potree.PointColorType.INTENSITY_GRADIENT;
		} else if (materialName === 'Classification') {
			return Potree.PointColorType.CLASSIFICATION;
		} else if (materialName === 'Return Number') {
			return Potree.PointColorType.RETURN_NUMBER;
		} else if (materialName === 'Source') {
			return Potree.PointColorType.SOURCE;
		} else if (materialName === 'Level of Detail') {
			return Potree.PointColorType.LOD;
		} else if (materialName === 'Point Index') {
			return Potree.PointColorType.POINT_INDEX;
		} else if (materialName === 'Normal') {
			return Potree.PointColorType.NORMAL;
		} else if (materialName === 'Phong') {
			return Potree.PointColorType.PHONG;
		} else if (materialName === 'RGB and Elevation') {
			return Potree.PointColorType.RGB_HEIGHT;
		} else if (materialName === 'Composite') {
			return Potree.PointColorType.COMPOSITE;
		}
	};

	toMaterialName (materialID) {
		if (materialID === Potree.PointColorType.RGB) {
			return 'RGB';
		} else if (materialID === Potree.PointColorType.COLOR) {
			return 'Color';
		} else if (materialID === Potree.PointColorType.HEIGHT) {
			return 'Elevation';
		} else if (materialID === Potree.PointColorType.INTENSITY) {
			return 'Intensity';
		} else if (materialID === Potree.PointColorType.INTENSITY_GRADIENT) {
			return 'Intensity Gradient';
		} else if (materialID === Potree.PointColorType.CLASSIFICATION) {
			return 'Classification';
		} else if (materialID === Potree.PointColorType.RETURN_NUMBER) {
			return 'Return Number';
		} else if (materialID === Potree.PointColorType.SOURCE) {
			return 'Source';
		} else if (materialID === Potree.PointColorType.LOD) {
			return 'Level of Detail';
		} else if (materialID === Potree.PointColorType.POINT_INDEX) {
			return 'Point Index';
		} else if (materialID === Potree.PointColorType.NORMAL) {
			return 'Normal';
		} else if (materialID === Potree.PointColorType.PHONG) {
			return 'Phong';
		} else if (materialID === Potree.PointColorType.RGB_HEIGHT) {
			return 'RGB and Elevation';
		} else if (materialID === Potree.PointColorType.COMPOSITE) {
			return 'Composite';
		}
	};

	zoomTo (node, factor) {
		let view = this.scene.view;

		this.scene.cameraP.position.copy(view.position);
		this.scene.cameraP.rotation.order = 'ZXY';
		this.scene.cameraP.rotation.x = Math.PI / 2 + view.pitch;
		this.scene.cameraP.rotation.z = view.yaw;
		this.scene.cameraP.updateMatrix();
		this.scene.cameraP.updateMatrixWorld();
		this.scene.cameraP.zoomTo(node, factor);

		this.scene.cameraO.position.copy(view.position);
		this.scene.cameraO.rotation.order = 'ZXY';
		this.scene.cameraO.rotation.x = Math.PI / 2 + view.pitch;
		this.scene.cameraO.rotation.z = view.yaw;
		this.scene.cameraO.updateMatrix();
		this.scene.cameraO.updateMatrixWorld();

		let bs;
		if (node.boundingSphere) {
			bs = node.boundingSphere;
		} else if (node.geometry && node.geometry.boundingSphere) {
			bs = node.geometry.boundingSphere;
		} else {
			bs = node.boundingBox.getBoundingSphere();
		}

		bs = bs.clone().applyMatrix4(node.matrixWorld);

		view.position.copy(this.scene.cameraP.position);
		view.radius = view.position.distanceTo(bs.center);
		this.dispatchEvent({'type': 'zoom_to', 'viewer': this});
	};

	showAbout () {
		$(function () {
			$('#about-panel').dialog();
		});
	};

	getBoundingBox (pointclouds) {
		pointclouds = pointclouds || this.scene.pointclouds;

		let box = new THREE.Box3();

		this.scene.scenePointCloud.updateMatrixWorld(true);
		this.scene.referenceFrame.updateMatrixWorld(true);

		for (let pointcloud of this.scene.pointclouds) {
			pointcloud.updateMatrixWorld(true);

			let pointcloudBox = pointcloud.pcoGeometry.tightBoundingBox ? pointcloud.pcoGeometry.tightBoundingBox : pointcloud.boundingBox;
			let boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloudBox, pointcloud.matrixWorld);
			box.union(boxWorld);
		}

		return box;
	};

	fitToScreen (factor = 1) {
		let box = this.getBoundingBox(this.scene.pointclouds);

		let node = new THREE.Object3D();
		node.boundingBox = box;

		this.zoomTo(node, factor);
	};

	toggleNavigationCube () {
		this.navigationCube.visible = !this.navigationCube.visible;
	}

	setView (view) {
		if (!view) return;

		switch (view) {
			case 'F':
				this.setFrontView();
				break;
			case 'B':
				this.setBackView();
				break;
			case 'L':
				this.setLeftView();
				break;
			case 'R':
				this.setRightView();
				break;
			case 'U':
				this.setTopView();
				break;
			case 'D':
				this.setBottomView();
				break;
		}
	}

	setTopView () {
		this.scene.view.yaw = 0;
		this.scene.view.pitch = -Math.PI / 2;

		this.fitToScreen();
	};

	setBottomView () {
		this.scene.view.yaw = -Math.PI;
		this.scene.view.pitch = Math.PI / 2;

		this.fitToScreen();
	};

	setFrontView () {
		this.scene.view.yaw = 0;
		this.scene.view.pitch = 0;

		this.fitToScreen();
	};

	setBackView () {
		this.scene.view.yaw = Math.PI;
		this.scene.view.pitch = 0;

		this.fitToScreen();
	};

	setLeftView () {
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

	switchCameraMode (mode) {
		this.scene.cameraMode = mode;

		for (let pointcloud of this.scene.pointclouds) {
			pointcloud.material.useOrthographicCamera = mode === Potree.CameraMode.ORTHOGRAPHIC;
		}
	}

	loadSettingsFromURL () {
		if (Potree.utils.getParameterByName('pointSize')) {
			this.setPointSize(parseFloat(Potree.utils.getParameterByName('pointSize')));
		}

		if (Potree.utils.getParameterByName('FOV')) {
			this.setFOV(parseFloat(Potree.utils.getParameterByName('FOV')));
		}

		if (Potree.utils.getParameterByName('opacity')) {
			this.setOpacity(parseFloat(Potree.utils.getParameterByName('opacity')));
		}

		if (Potree.utils.getParameterByName('edlEnabled')) {
			let enabled = Potree.utils.getParameterByName('edlEnabled') === 'true';
			this.setEDLEnabled(enabled);
		}

		if (Potree.utils.getParameterByName('edlRadius')) {
			this.setEDLRadius(parseFloat(Potree.utils.getParameterByName('edlRadius')));
		}

		if (Potree.utils.getParameterByName('edlStrength')) {
			this.setEDLStrength(parseFloat(Potree.utils.getParameterByName('edlStrength')));
		}

		if (Potree.utils.getParameterByName('pointBudget')) {
			this.setPointBudget(parseFloat(Potree.utils.getParameterByName('pointBudget')));
		}

		if (Potree.utils.getParameterByName('showBoundingBox')) {
			let enabled = Potree.utils.getParameterByName('showBoundingBox') === 'true';
			if (enabled) {
				this.setShowBoundingBox(true);
			} else {
				this.setShowBoundingBox(false);
			}
		}

		if (Potree.utils.getParameterByName('material')) {
			let material = Potree.utils.getParameterByName('material');
			this.setMaterial(material);
		}

		if (Potree.utils.getParameterByName('pointSizing')) {
			let sizing = Potree.utils.getParameterByName('pointSizing');
			this.setPointSizing(sizing);
		}

		if (Potree.utils.getParameterByName('quality')) {
			let quality = Potree.utils.getParameterByName('quality');
			this.setQuality(quality);
		}

		if (Potree.utils.getParameterByName('position')) {
			let value = Potree.utils.getParameterByName('position');
			value = value.replace('[', '').replace(']', '');
			let tokens = value.split(';');
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);

			this.scene.view.position.set(x, y, z);
		}

		if (Potree.utils.getParameterByName('target')) {
			let value = Potree.utils.getParameterByName('target');
			value = value.replace('[', '').replace(']', '');
			let tokens = value.split(';');
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);

			this.scene.view.lookAt(new THREE.Vector3(x, y, z));
		}

		if (Potree.utils.getParameterByName('background')) {
			let value = Potree.utils.getParameterByName('background');
			this.setBackground(value);
		}

		// if(Potree.utils.getParameterByName("elevationRange")){
		//	let value = Potree.utils.getParameterByName("elevationRange");
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
			this.fpControls = new Potree.FirstPersonControls(this);
			this.fpControls.enabled = false;
			this.fpControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.fpControls.addEventListener('end', this.enableAnnotations.bind(this));
			// this.fpControls.addEventListener("double_click_move", (event) => {
			//	let distance = event.targetLocation.distanceTo(event.position);
			//	this.setMoveSpeed(Math.pow(distance, 0.4));
			// });
			// this.fpControls.addEventListener("move_speed_changed", (event) => {
			//	this.setMoveSpeed(this.fpControls.moveSpeed);
			// });
		}

		// { // create GEO CONTROLS
		//	this.geoControls = new Potree.GeoControls(this.scene.camera, this.renderer.domElement);
		//	this.geoControls.enabled = false;
		//	this.geoControls.addEventListener("start", this.disableAnnotations.bind(this));
		//	this.geoControls.addEventListener("end", this.enableAnnotations.bind(this));
		//	this.geoControls.addEventListener("move_speed_changed", (event) => {
		//		this.setMoveSpeed(this.geoControls.moveSpeed);
		//	});
		// }

		{ // create ORBIT CONTROLS
			this.orbitControls = new Potree.OrbitControls(this);
			this.orbitControls.enabled = false;
			this.orbitControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.orbitControls.addEventListener('end', this.enableAnnotations.bind(this));
		}

		{ // create EARTH CONTROLS
			this.earthControls = new Potree.EarthControls(this);
			this.earthControls.enabled = false;
			this.earthControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.earthControls.addEventListener('end', this.enableAnnotations.bind(this));
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

	loadGUI (callback) {
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

			this.mapView = new Potree.MapView(this);
			this.mapView.init();

			i18n.init({
				lng: 'en',
				resGetPath: Potree.resourcePath + '/lang/__lng__/__ns__.json',
				preload: ['en', 'fr', 'de', 'jp'],
				getAsync: true,
				debug: false
			}, function (t) {
				// Start translation once everything is loaded
				$('body').i18n();
			});

			$(() => {
				initSidebar(this);
			});

			let elProfile = $('<div>').load(new URL(Potree.scriptPath + '/profile.html').href, () => {
				$(document.body).append(elProfile.children());
				this.profileWindow = new Potree.ProfileWindow(this);
				this.profileWindowController = new Potree.ProfileWindowController(this);

				$('#profile_window').draggable({
					handle: $('#profile_titlebar'),
					containment: $(document.body)
				});
				$('#profile_window').resizable({
					containment: $(document.body),
					handles: 'n, e, s, w'
				});

				if (callback) {
					$(callback);
				}
			});
		});
	}

	setLanguage (lang) {
		i18n.setLng(lang);
		$('body').i18n();
	}

	setServer (server) {
		this.server = server;
	}

	initThree () {
		let width = this.renderArea.clientWidth;
		let height = this.renderArea.clientHeight;

		this.renderer = new THREE.WebGLRenderer({premultipliedAlpha: false});
		this.renderer.sortObjects = false;
		this.renderer.setSize(width, height);
		this.renderer.autoClear = false;
		this.renderArea.appendChild(this.renderer.domElement);
		this.renderer.domElement.tabIndex = '2222';
		this.renderer.domElement.addEventListener('mousedown', function () {
			this.renderer.domElement.focus();
		}.bind(this));

		this.skybox = Potree.utils.loadSkybox(new URL(Potree.resourcePath + '/textures/skybox2/').href);

		// enable frag_depth extension for the interpolation shader, if available
		this.renderer.context.getExtension('EXT_frag_depth');
	}

	updateAnnotations () {
		if (!this.getShowAnnotations()) {
			this.scene.annotations.traverseDescendants(descendant => {
				descendant.display = false;
			});

			return;
		}

		this.scene.annotations.updateBounds();
		this.scene.cameraP.updateMatrixWorld();
		this.scene.cameraO.updateMatrixWorld();

		// TODO: Unused: let distances = [];

		// TODO: Unused: let renderAreaWidth = this.renderArea.clientWidth;
		// TODO: Unused: let renderAreaHeight = this.renderArea.clientHeight;
		let viewer = this;
		this.scene.annotations.traverse(annotation => {
			if (annotation === this.scene.annotations) {
				annotation.display = false;
				return true;
			}

			if (!annotation.visible) {
				return false;
			}

			annotation.scene = this.scene;

			let element = annotation.domElement;

			let position = annotation.position;
			if (!position) {
				position = annotation.boundingBox.getCenter();
			}

			let distance = viewer.scene.cameraP.position.distanceTo(position);

			let radius = annotation.boundingBox.getBoundingSphere().radius;

			let screenPos = new THREE.Vector3();
			let screenSize = 0;

			/* eslint-disable no-lone-blocks */
			{
				// SCREEN POS
				screenPos.copy(position).project(this.scene.getActiveCamera());
				screenPos.x = this.renderArea.clientWidth * (screenPos.x + 1) / 2;
				screenPos.y = this.renderArea.clientHeight * (1 - (screenPos.y + 1) / 2);

				// screenPos.x = Math.floor(screenPos.x - element[0].clientWidth / 2);
				// screenPos.y = Math.floor(screenPos.y - annotation.elTitlebar[0].clientHeight / 2);
				screenPos.x = Math.floor(screenPos.x);
				screenPos.y = Math.floor(screenPos.y);

				// SCREEN SIZE
				if (viewer.scene.cameraMode === Potree.CameraMode.PERSPECTIVE) {
					let fov = Math.PI * viewer.scene.cameraP.fov / 180;
					let slope = Math.tan(fov / 2.0);
					let projFactor = 0.5 * this.renderArea.clientHeight / (slope * distance);
					screenSize = radius * projFactor;
				} else {
					screenSize = Potree.utils.projectedRadiusOrtho(radius, viewer.scene.cameraO.projectionMatrix, this.renderArea.clientWidth, this.renderArea.clientHeight);
				}
			}

			element[0].style.left = screenPos.x + 'px';
			element[0].style.top = screenPos.y + 'px';

			/*
			TODO: Unused:
			let zIndex = 10000000 - distance * (10000000 / this.scene.cameraP.far);
			if (annotation.descriptionVisible) {
				zIndex += 10000000;
			}
			*/

			if (annotation.children.length > 0) {
				let expand = screenSize > annotation.collapseThreshold || annotation.boundingBox.containsPoint(this.scene.getActiveCamera().position.position);
				annotation.expand = expand;

				if (!expand) {
					annotation.display = (screenPos.z >= -1 && screenPos.z <= 1);
				}

				return expand;
			} else {
				annotation.display = (screenPos.z >= -1 && screenPos.z <= 1);
			}
		});
	}

	update (delta, timestamp) {
		// if(window.urlToggle === undefined){
		//	window.urlToggle = 0;
		// }else{
		//
		//	if(window.urlToggle > 1){
		//		{
		//
		//			let currentValue = Potree.utils.getParameterByName("position");
		//			let strPosition = "["
		//				+ this.scene.view.position.x.toFixed(3) + ";"
		//				+ this.scene.view.position.y.toFixed(3) + ";"
		//				+ this.scene.view.position.z.toFixed(3) + "]";
		//			if(currentValue !== strPosition){
		//				Potree.utils.setParameter("position", strPosition);
		//			}
		//
		//		}
		//
		//		{
		//			let currentValue = Potree.utils.getParameterByName("target");
		//			let pivot = this.scene.view.getPivot();
		//			let strTarget = "["
		//				+ pivot.x.toFixed(3) + ";"
		//				+ pivot.y.toFixed(3) + ";"
		//				+ pivot.z.toFixed(3) + "]";
		//			if(currentValue !== strTarget){
		//				Potree.utils.setParameter("target", strTarget);
		//			}
		//		}
		//
		//		window.urlToggle = 0;
		//	}
		//
		//	window.urlToggle += delta;
		// }

		let scene = this.scene;
		let camera = scene.getActiveCamera();

		Potree.pointLoadLimit = Potree.pointBudget * 2;

		this.scene.directionalLight.position.copy(camera.position);
		this.scene.directionalLight.lookAt(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection()));

		for (let pointcloud of this.scene.pointclouds) {
			if (!pointcloud.material._defaultIntensityRangeChanged) {
				let root = pointcloud.pcoGeometry.root;
				if (root != null && root.loaded) {
					let attributes = pointcloud.pcoGeometry.root.geometry.attributes;
					if (attributes.intensity) {
						let array = attributes.intensity.array;

						// chose max value from the 0.75 percentile
						let ordered = [];
						for (let j = 0; j < array.length; j++) {
							ordered.push(array[j]);
						}
						ordered.sort();
						let capIndex = parseInt((ordered.length - 1) * 0.75);
						let cap = ordered[capIndex];

						if (cap <= 1) {
							pointcloud.material.intensityRange = [0, 1];
						} else if (cap <= 256) {
							pointcloud.material.intensityRange = [0, 255];
						} else {
							pointcloud.material.intensityRange = [0, cap];
						}
					}
					// pointcloud._intensityMaxEvaluated = true;
				}
			}

			pointcloud.showBoundingBox = this.showBoundingBox;
			pointcloud.generateDEM = this.generateDEM;
			pointcloud.minimumNodePixelSize = this.minNodeSize;
		}

		// update classification visibility
		for (let pointcloud of this.scene.pointclouds) {
			let classification = pointcloud.material.classification;
			let somethingChanged = false;
			for (let key of Object.keys(this.classifications)) {
				let w = this.classifications[key].visible ? 1 : 0;

				if (classification[key]) {
					if (classification[key].w !== w) {
						classification[key].w = w;
						somethingChanged = true;
					}
				} else if (classification.DEFAULT) {
					classification[key] = classification.DEFAULT;
					somethingChanged = true;
				} else {
					classification[key] = new THREE.Vector4(0.3, 0.6, 0.6, 0.5);
					somethingChanged = true;
				}
			}

			if (somethingChanged) {
				pointcloud.material.recomputeClassification();
			}
		}

		if (!this.freeze) {
			let result = Potree.updatePointClouds(scene.pointclouds, camera, this.renderer);
			camera.near = result.lowestSpacing * 10.0;
			camera.far = -this.getBoundingBox().applyMatrix4(camera.matrixWorldInverse).min.z;
			camera.far = Math.max(camera.far * 1.5, 1000);
			if (this.scene.cameraMode === Potree.CameraMode.ORTHOGRAPHIC) {
				camera.near = -camera.far;
			}
		}

		this.scene.cameraP.fov = this.fov;

		// Navigation mode changed?
		if (this.getControls(scene.view.navigationMode) !== this.controls) {
			if (this.controls) {
				this.controls.enabled = false;
				this.inputHandler.removeInputListener(this.controls);
			}

			this.controls = this.getControls(scene.view.navigationMode);
			this.controls.enabled = true;
			this.inputHandler.addInputListener(this.controls);
		}
		//
		if (this.controls !== null) {
			this.controls.setScene(scene);
			this.controls.update(delta);

			this.scene.cameraP.position.copy(scene.view.position);
			// camera.rotation.x = scene.view.pitch;
			// camera.rotation.y = scene.view.yaw;

			// camera.lookAt(scene.view.getPivot());
			this.scene.cameraP.rotation.order = 'ZXY';
			this.scene.cameraP.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			this.scene.cameraP.rotation.z = this.scene.view.yaw;

			this.scene.cameraO.position.copy(scene.view.position);
			this.scene.cameraO.rotation.order = 'ZXY';
			this.scene.cameraO.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			this.scene.cameraO.rotation.z = this.scene.view.yaw;
		}

		{ // update clip boxes
			// ordinary clip boxes (clip planes)
			let boxes = this.scene.clipVolumes;

			let clipBoxes = boxes.map(box => {
				box.updateMatrixWorld();
				let boxPosition = box.getWorldPosition();
				let boxMatrixWorld = new THREE.Matrix4().compose(boxPosition, box.getWorldQuaternion(), box.children[0].scale);
				let boxInverse = new THREE.Matrix4().getInverse(boxMatrixWorld);
				return {inverse: boxInverse, position: boxPosition};
			});

			// extraordinary clip boxes (volume, profile)
			boxes = this.scene.volumes.filter(v => v.clip);
			for (let profile of this.scene.profiles) {
				boxes = boxes.concat(profile.boxes);
			}

			clipBoxes = clipBoxes.concat(boxes.map(box => {
				box.updateMatrixWorld();
				let boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
				let boxPosition = box.getWorldPosition();
				return {inverse: boxInverse, position: boxPosition};
			}));

			// clip polygons
			let clipPolygons = this.scene.polygonClipVolumes.filter(vol => vol.initialized).map(vol => {
				let vp = vol.projMatrix.clone().multiply(vol.viewMatrix);
				return {polygon: vol.markersPosWorld, count: vol.markersPosWorld.length, view: vp};
			});

			// set clip volumes in material
			for (let pointcloud of this.scene.pointclouds) {
				pointcloud.material.setClipBoxes(clipBoxes);
				pointcloud.material.setClipPolygons(clipPolygons, this.clippingTool.maxPolygonVertices);
				pointcloud.material.clipMode = this.clippingTool.clipMode;
			}
		}

		{ // update navigation cube
			this.navigationCube.update(camera.rotation);
		}

		this.updateAnnotations();

		if (this.mapView) {
			this.mapView.update(delta);
			if (this.mapView.sceneProjection) {
				$('#potree_map_toggle').css('display', 'block');
			}
		}

		TWEEN.update(timestamp);

		this.dispatchEvent({
			'type': 'update',
			'delta': delta,
			'timestamp': timestamp});
	}

	loop (timestamp) {
		requestAnimationFrame(this.loop.bind(this));

		if(Potree.measureTimings) performance.mark("loop-start");

		this.stats.begin();

		if(Potree.measureTimings) performance.mark("update-start");

		this.update(this.clock.getDelta(), timestamp);
		
		if(Potree.measureTimings) {
			performance.mark("update-end");
			performance.measure("update", "update-start", "update-end");
		}

		let queryAll;
		if (Potree.timerQueriesEnabled) {
			queryAll = Potree.startQuery('frame', viewer.renderer.getContext());
		}

		if(Potree.measureTimings) performance.mark("render-start");

		if (this.useEDL && Potree.Features.SHADER_EDL.isSupported()) {
			if (!this.edlRenderer) {
				this.edlRenderer = new EDLRenderer(this);
			}
			this.edlRenderer.render(this.renderer);
		} else {
			if (!this.potreeRenderer) {
				this.potreeRenderer = new PotreeRenderer(this);
			}

			this.potreeRenderer.render();
		}

		if(Potree.measureTimings){
			performance.mark("render-end");
			performance.measure("render", "render-start", "render-end");

			performance.mark("loop-end");
			performance.measure("loop", "loop-start", "loop-end");
		}
		
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
						sum: 0,
						n: 0
					});
				}
				
				for(let measure of measures){
					let group = groups.get(measure.name);
					group.sum += measure.duration;
					group.n++;
				}
				
				let message = "===   TIMINGS   ===\n";
				for(let group of groups){
					let name = group[0];
					let mean = group[1].sum / group[1].n;
					
					message += `${name}: ${mean.toFixed(3)}ms\n`;
				}
				
				message += "===================\n"; 
				
				console.log(message);
				
				performance.clearMarks();
				performance.clearMeasures();
				this.toggle = timestamp;
			}
		}

		if (Potree.timerQueriesEnabled) {
			Potree.endQuery(queryAll, viewer.renderer.getContext());
			Potree.resolveQueries(viewer.renderer.getContext());
		}

		this.stats.end();

		Potree.framenumber++;
	};
};

// ------------------------------------------------------------------------------------
// Renderers
// ------------------------------------------------------------------------------------

class PotreeRenderer {
	constructor (viewer) {
		this.viewer = viewer;
	};

	render () {
		{ // resize
			let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
			let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
			let aspect = width / height;

			viewer.scene.cameraP.aspect = aspect;
			viewer.scene.cameraP.updateProjectionMatrix();

			let frustumScale = viewer.moveSpeed * 2.0;
			viewer.scene.cameraO.left = -frustumScale;
			viewer.scene.cameraO.right = frustumScale;
			viewer.scene.cameraO.top = frustumScale * 1 / aspect;
			viewer.scene.cameraO.bottom = -frustumScale * 1 / aspect;
			viewer.scene.cameraO.updateProjectionMatrix();

			viewer.scene.cameraScreenSpace.top = 1 / aspect;
			viewer.scene.cameraScreenSpace.bottom = -1 / aspect;
			viewer.scene.cameraScreenSpace.updateProjectionMatrix();

			// update frustum size for adaptive point size with ortho cameras
			for (let pointcloud of viewer.scene.pointclouds) {
				pointcloud.material.orthoRange = 2.0 * frustumScale;
			}

			viewer.renderer.setSize(width, height);
		}

		// render skybox
		if (viewer.background === 'skybox') {
			viewer.renderer.clear(true, true, false);
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		} else if (viewer.background === 'gradient') {
			// viewer.renderer.clear(true, true, false);
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		} else if (viewer.background === 'black') {
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear(true, true, false);
		} else if (viewer.background === 'white') {
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear(true, true, false);
		}

		for (let pointcloud of this.viewer.scene.pointclouds) {
			pointcloud.material.useEDL = false;
		}

		// var queryPC = Potree.startQuery("PointCloud", viewer.renderer.getContext());
		let activeCam = viewer.scene.getActiveCamera();
		viewer.renderer.render(viewer.scene.scenePointCloud, activeCam);
		// Potree.endQuery(queryPC, viewer.renderer.getContext());

		// render scene
		viewer.renderer.render(viewer.scene.scene, activeCam);

		viewer.volumeTool.update();
		viewer.renderer.render(viewer.volumeTool.sceneVolume, activeCam);

		viewer.clippingTool.update();
		viewer.renderer.render(viewer.clippingTool.sceneMarker, viewer.scene.cameraScreenSpace); // viewer.scene.cameraScreenSpace);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, activeCam);

		viewer.renderer.render(viewer.controls.sceneControls, activeCam);

		viewer.renderer.clearDepth();

		viewer.measuringTool.update();
		viewer.profileTool.update();
		viewer.transformationTool.update();

		viewer.renderer.render(viewer.measuringTool.sceneMeasurement, activeCam);
		viewer.renderer.render(viewer.profileTool.sceneProfile, activeCam);
		viewer.renderer.render(viewer.transformationTool.sceneTransform, activeCam);

		viewer.renderer.setViewport(
			viewer.renderer.domElement.clientWidth - viewer.navigationCube.width,
			viewer.renderer.domElement.clientHeight - viewer.navigationCube.width,
			viewer.navigationCube.width,
			viewer.navigationCube.width
		);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);
		viewer.renderer.setViewport(0, 0, viewer.renderer.domElement.clientWidth, viewer.renderer.domElement.clientHeight);

		// Potree.endQuery(queryAll, viewer.renderer.getContext());

		// Potree.resolveQueries(viewer.renderer.getContext());
	};
};

class EDLRenderer {
	constructor (viewer) {
		this.viewer = viewer;

		this.edlMaterial = null;
		this.attributeMaterials = [];

		this.rtColor = null;
		this.gl = viewer.renderer.context;

		this.initEDL = this.initEDL.bind(this);
		this.resize = this.resize.bind(this);
		this.render = this.render.bind(this);
	}

	initEDL () {
		if (this.edlMaterial != null) {
			return;
		}

		// var depthTextureExt = gl.getExtension("WEBGL_depth_texture");

		this.edlMaterial = new Potree.EyeDomeLightingMaterial();

		this.rtColor = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.rtColor.depthTexture = new THREE.DepthTexture();
		this.rtColor.depthTexture.type = THREE.UnsignedIntType;
	};

	resize () {
		let width = this.viewer.scaleFactor * this.viewer.renderArea.clientWidth;
		let height = this.viewer.scaleFactor * this.viewer.renderArea.clientHeight;
		let aspect = width / height;

		let needsResize = (this.rtColor.width !== width || this.rtColor.height !== height);

		// disposal will be unnecessary once this fix made it into three.js master:
		// https://github.com/mrdoob/three.js/pull/6355
		if (needsResize) {
			this.rtColor.dispose();
		}

		viewer.scene.cameraP.aspect = aspect;
		viewer.scene.cameraP.updateProjectionMatrix();

		let frustumScale = viewer.moveSpeed * 2.0;
		viewer.scene.cameraO.left = -frustumScale;
		viewer.scene.cameraO.right = frustumScale;
		viewer.scene.cameraO.top = frustumScale * 1 / aspect;
		viewer.scene.cameraO.bottom = -frustumScale * 1 / aspect;
		viewer.scene.cameraO.updateProjectionMatrix();

		viewer.scene.cameraScreenSpace.top = 1 / aspect;
		viewer.scene.cameraScreenSpace.bottom = -1 / aspect;
		viewer.scene.cameraScreenSpace.updateProjectionMatrix();

		viewer.renderer.setSize(width, height);
		this.rtColor.setSize(width, height);
	}

	render () {
		this.initEDL();
		const viewer = this.viewer;

		this.resize();

		let camera = viewer.scene.getActiveCamera();

		if (viewer.background === 'skybox') {
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
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		} else if (viewer.background === 'white') {
			viewer.renderer.setClearColor(0xFFFFFF, 0);
			viewer.renderer.clear();
		}

		viewer.measuringTool.update();
		viewer.profileTool.update();
		viewer.transformationTool.update();
		viewer.volumeTool.update();

		viewer.renderer.render(viewer.scene.scene, camera);

		viewer.renderer.clearTarget(this.rtColor, true, true, true);

		let width = viewer.renderArea.clientWidth;
		let height = viewer.renderArea.clientHeight;

		// COLOR & DEPTH PASS
		for (let pointcloud of viewer.scene.pointclouds) {
			let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

			let material = pointcloud.material;
			material.weighted = false;
			material.useLogarithmicDepthBuffer = false;
			material.useEDL = true;

			material.screenWidth = width;
			material.screenHeight = height;
			material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
			material.uniforms.octreeSize.value = octreeSize;
			// material.fov = viewer.scene.cameraP.fov * (Math.PI / 180);
			material.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
			// material.near = camera.near;
			// material.far = camera.far;
		}

		viewer.renderer.render(viewer.scene.scenePointCloud, camera, this.rtColor);
		viewer.renderer.render(viewer.scene.scene, camera, this.rtColor);

		// bit of a hack here. The EDL pass will mess up the text of the volume tool
		// so volume tool is rendered again afterwards
		// viewer.volumeTool.render(this.rtColor);

		// viewer.renderer.render(viewer.volumeTool.sceneVolume, camera, this.rtColor);
		// viewer.renderer.render(viewer.clippingTool.sceneVolume, camera, this.rtColor);

		{ // EDL OCCLUSION PASS
			this.edlMaterial.uniforms.screenWidth.value = width;
			this.edlMaterial.uniforms.screenHeight.value = height;
			this.edlMaterial.uniforms.colorMap.value = this.rtColor.texture;
			this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
			this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
			this.edlMaterial.uniforms.opacity.value = 1;
			this.edlMaterial.depthTest = true;
			this.edlMaterial.depthWrite = true;
			this.edlMaterial.transparent = true;

			Potree.utils.screenPass.render(viewer.renderer, this.edlMaterial);
		}

		viewer.renderer.clearDepth();
		viewer.renderer.render(viewer.controls.sceneControls, camera);

		viewer.renderer.render(viewer.measuringTool.sceneMeasurement, camera);
		viewer.renderer.render(viewer.volumeTool.sceneVolume, camera);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.profileTool.sceneProfile, camera);
		viewer.renderer.render(viewer.transformationTool.sceneTransform, camera);

		viewer.renderer.setViewport(
			viewer.renderer.domElement.clientWidth - viewer.navigationCube.width,
			viewer.renderer.domElement.clientHeight - viewer.navigationCube.width,
			viewer.navigationCube.width,
			viewer.navigationCube.width
		);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);
		viewer.renderer.setViewport(0, 0, viewer.renderer.domElement.clientWidth, viewer.renderer.domElement.clientHeight);
	}
};
