
Potree.VolumeTool = class VolumeTool extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_volume', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.sceneVolume = new THREE.Scene();
		this.sceneVolume.name = 'scene_volume';

		this.viewer.inputHandler.registerInteractiveScene(this.sceneVolume);

		this.onRemove = e => {
			this.sceneVolume.remove(e.volume);
		};

		this.onAdd = e => {
			this.sceneVolume.add(e.volume);
		};

		this.viewer.inputHandler.addEventListener('delete', e => {
			let volumes = e.selection.filter(e => (e instanceof Potree.Volume));
			volumes.forEach(e => this.viewer.scene.removeVolume(e));
		});
	}

	setScene (scene) {
		if (this.scene === scene) {
			return;
		}

		if (this.scene) {
			this.scene.removeEventListeners('volume_added', this.onAdd);
			this.scene.removeEventListeners('volume_removed', this.onRemove);
		}

		this.scene = scene;

		this.scene.addEventListener('volume_added', this.onAdd);
		this.scene.addEventListener('volume_removed', this.onRemove);
	}

	startInsertion (args = {}) {
		let volume = new Potree.Volume();
		volume.clip = args.clip || false;
		volume.name = args.name || 'Volume';

		this.dispatchEvent({
			type: 'start_inserting_volume',
			volume: volume
		});

		// this.sceneVolume.add(volume);
		this.viewer.scene.addVolume(volume);

		let cancel = {
			callback: null
		};

		let drag = e => {
			let camera = this.viewer.scene.getActiveCamera();

			let I = Potree.utils.getMousePointCloudIntersection(
				e.drag.end,
				this.viewer.scene.getActiveCamera(),
				this.viewer.renderer,
				this.viewer.scene.pointclouds);

			if (I) {
				volume.position.copy(I.location);

				var wp = volume.getWorldPosition().applyMatrix4(camera.matrixWorldInverse);
				// var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				var w = Math.abs((wp.z / 10));
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
	}

	update (delta) {
		if (!this.scene) {
			return;
		}

		let camera = this.viewer.scene.getActiveCamera();
		let domElement = this.viewer.renderer.domElement;
		// let labels = this.viewer.scene.volumes.map(e => e.label);

		let volumes = this.viewer.scene.volumes;
		for (let volume of volumes) {
			let label = volume.label;

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

			let text = Potree.utils.addCommas(volume.getVolume().toFixed(3)) + '\u00B3';
			label.setText(text);
		}
	}
};
