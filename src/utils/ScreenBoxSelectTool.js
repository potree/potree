
Potree.ScreenBoxSelectTool = class ScreenBoxSelectTool extends THREE.EventDispatcher{

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

		let volume = new Potree.Volume();
		volume.clip = true;
		this.viewer.scene.addVolume(volume);

		this.importance = 10;

		let drag = e =>{

			let camera = e.viewer.scene.getActiveCamera();
			let size = new THREE.Vector2(
				e.viewer.renderer.getSize().width,
				e.viewer.renderer.getSize().height);
			let frustumSize = new THREE.Vector2(
				camera.right - camera.left, 
				camera.top - camera.bottom);

			let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			let ray = Potree.utils.mouseToRay(screenCentroid, camera, size.width, size.height);

			let diff = new THREE.Vector2().subVectors(e.drag.end, e.drag.start);
			diff.divide(size).multiply(frustumSize);

			
			volume.position.copy(ray.origin);
			volume.up.copy(camera.up);
			volume.rotation.copy(camera.rotation);
			volume.scale.set(diff.x, diff.y, 100);

			e.consume();
		};

		let drop = e => {
			this.importance = 0;

			this.viewer.inputHandler.deselectAll();
			this.viewer.inputHandler.toggleSelection(volume);

			this.removeEventListener("drag", drag);
			this.removeEventListener("drop", drop);
		};

		this.addEventListener("drag", drag);
		this.addEventListener("drop", drop);

		viewer.inputHandler.addInputListener(this);
	}

	update(e){
		//console.log(e.delta)
	}

	render(){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}