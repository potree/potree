
Potree.MeasuringTool = class MeasuringTool extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_measurement', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.sceneMeasurement = new THREE.Scene();
		this.sceneMeasurement.name = 'scene_measurement';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.sceneMeasurement.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.sceneMeasurement);

		this.onRemove = (e) => { this.sceneMeasurement.remove(e.measurement); };
		this.onAdd = e => { this.sceneMeasurement.add(e.measurement); };
	}

	setScene (scene) {
		if (this.scene === scene) {
			return;
		}

		if (this.scene) {
			this.scene.removeEventListener('measurement_added', this.onAdd);
			this.scene.removeEventListener('measurement_removed', this.onRemove);
		}

		this.scene = scene;

		this.scene.addEventListener('measurement_added', this.onAdd);
		this.scene.addEventListener('measurement_removed', this.onRemove);
	}

	startInsertion (args = {}) {
		let domElement = this.viewer.renderer.domElement;

		let measure = new Potree.Measure();

		this.dispatchEvent({
			type: 'start_inserting_measurement',
			measure: measure
		});

		measure.showDistances = (args.showDistances == null) ? true : args.showDistances;
		measure.showArea = args.showArea || false;
		measure.showAngles = args.showAngles || false;
		measure.showCoordinates = args.showCoordinates || false;
		measure.showHeight = args.showHeight || false;
		measure.closed = args.closed || false;
		measure.maxMarkers = args.maxMarkers || Infinity;
		measure.name = args.name || 'Measurement';

		this.sceneMeasurement.add(measure);

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
	}

	update () {
		let camera = this.viewer.scene.getActiveCamera();
		let domElement = this.renderer.domElement;
		let measurements = this.viewer.scene.measurements;

		this.light.position.copy(camera.position);

		// make size independant of distance
		for (let measure of measurements) {
			measure.lengthUnit = this.viewer.lengthUnit;
			measure.update();

			// spheres
			for (let sphere of measure.spheres) {
				let pr = 0;
				if (viewer.scene.cameraMode === Potree.CameraMode.PERSPECTIVE) {
					let distance = camera.position.distanceTo(sphere.getWorldPosition());
					pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				} else {
					pr = Potree.utils.projectedRadiusOrtho(1, camera.projectionMatrix, domElement.clientWidth, domElement.clientHeight);
				}
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}

			// labels
			let labels = measure.edgeLabels.concat(measure.angleLabels);
			for (let label of labels) {
				let pr = 0;
				if (viewer.scene.cameraMode === Potree.CameraMode.PERSPECTIVE) {
					let distance = camera.position.distanceTo(label.getWorldPosition());
					pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				} else {
					pr = Potree.utils.projectedRadiusOrtho(1, camera.projectionMatrix, domElement.clientWidth, domElement.clientHeight);
				}
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			// coordinate labels
			for (let j = 0; j < measure.coordinateLabels.length; j++) {
				let label = measure.coordinateLabels[j];
				let sphere = measure.spheres[j];
				// measure.points[j]

				let distance = camera.position.distanceTo(sphere.getWorldPosition());

				let screenPos = sphere.getWorldPosition().clone().project(camera);
				screenPos.x = Math.round((screenPos.x + 1) * domElement.clientWidth / 2);
				screenPos.y = Math.round((-screenPos.y + 1) * domElement.clientHeight / 2);
				screenPos.z = 0;
				screenPos.y -= 30;

				let labelPos = new THREE.Vector3(
					(screenPos.x / domElement.clientWidth) * 2 - 1,
					-(screenPos.y / domElement.clientHeight) * 2 + 1,
					0.5);
				labelPos.unproject(camera);
				if (this.viewer.scene.cameraMode === Potree.CameraMode.PERSPECTIVE) {
					let direction = labelPos.sub(camera.position).normalize();
					labelPos = new THREE.Vector3().addVectors(
						camera.position, direction.multiplyScalar(distance));
				}
				label.position.copy(labelPos);

				let pr = 0;
				if (viewer.scene.cameraMode === Potree.CameraMode.PERSPECTIVE) {
					pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				} else {
					pr = Potree.utils.projectedRadiusOrtho(1, camera.projectionMatrix, domElement.clientWidth, domElement.clientHeight);
				}

				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			// height label
			if (measure.showHeight) {
				let label = measure.heightLabel;

				{
					let pr = 0;
					if (viewer.scene.cameraMode === Potree.CameraMode.PERSPECTIVE) {
						let distance = label.position.distanceTo(camera.position);
						pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
					} else {
						pr = Potree.utils.projectedRadiusOrtho(1, camera.projectionMatrix, domElement.clientWidth, domElement.clientHeight);
					}
					let scale = (70 / pr);
					label.scale.set(scale, scale, scale);
				}

				{ // height edge
					let edge = measure.heightEdge;
					let lowpoint = edge.geometry.vertices[0].clone().add(edge.position);
					let start = edge.geometry.vertices[2].clone().add(edge.position);
					let end = edge.geometry.vertices[3].clone().add(edge.position);

					let lowScreen = lowpoint.clone().project(camera);
					let startScreen = start.clone().project(camera);
					let endScreen = end.clone().project(camera);

					let toPixelCoordinates = v => {
						let r = v.clone().addScalar(1).divideScalar(2);
						r.x = r.x * domElement.clientWidth;
						r.y = r.y * domElement.clientHeight;
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

				let pr = 0;
				if (viewer.scene.cameraMode === Potree.CameraMode.PERSPECTIVE) {
					let distance = label.position.distanceTo(camera.position);
					pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				} else {
					pr = Potree.utils.projectedRadiusOrtho(1, camera.projectionMatrix, domElement.clientWidth, domElement.clientHeight);
				}

				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
		}
	}
};
