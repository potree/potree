

Potree.EarthControls = class EarthControls extends THREE.EventDispatcher{
	
	constructor(viewer){
		super(viewer);
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.rotationSpeed = 10000;
		
		this.fadeFactor = 20;
		this.wheelDelta = 0;
		this.zoomDelta = new THREE.Vector3();
		this.camStart = null;
		
		let drag = (e) => {
			if(e.drag.object !== null){
				return;
			}
			
			//let ndrag = {
			//	x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
			//	y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
			//};
			//
			//if(e.drag.mouse === THREE.MOUSE.LEFT){
			//	this.yawDelta += ndrag.x * this.rotationSpeed;
			//	this.pitchDelta += ndrag.y * this.rotationSpeed;
			//}else if(e.drag.mouse === THREE.MOUSE.RIGHT){
			//	this.panDelta.x += ndrag.x;
			//	this.panDelta.y += ndrag.y;
			//}
		};
		
		let onMouseDown = e => {
			let I = Potree.utils.getMousePointCloudIntersection(
				e.mouse, 
				this.scene.camera, 
				this.renderer, 
				this.scene.pointclouds);
				
			if(I){
				this.pivot = I.location;
				this.camStart = this.scene.camera.clone();
			}
		};
		
		let onMouseUp = e => {
			this.camStart = null;
		};
		
		let scroll = (e) => {this.wheelDelta += e.delta};
		
		this.addEventListener("drag", drag);
		this.addEventListener("mousewheel", scroll);
		this.addEventListener("mousedown", onMouseDown);
		this.addEventListener("mouseup", onMouseUp);
	}
	
	setScene(scene){
		this.scene = scene;
	}
	
	update(delta){
		let view = this.scene.view;
		let fade = Math.pow(0.5, this.fadeFactor * delta);
		let progression = 1 - fade;
		
		// compute zoom
		if(this.wheelDelta !== 0){
			let I = Potree.utils.getMousePointCloudIntersection(
				this.viewer.inputHandler.mouse, 
				this.scene.camera, 
				this.renderer, 
				this.scene.pointclouds);
				
			if(I){
				let resolvedPos = new THREE.Vector3().addVectors(view.position, this.zoomDelta);
				let distance = I.location.distanceTo(resolvedPos);
				let jumpDistance = distance * 0.2 * this.wheelDelta;
				let targetDir = new THREE.Vector3().subVectors(I.location, view.position);
				targetDir.normalize();
				
				resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
				this.zoomDelta.subVectors(resolvedPos, view.position);
			}
		}
		
		// apply zoom
		if(this.zoomDelta.length() !== 0){
			let p = this.zoomDelta.clone().multiplyScalar(progression);
			
			let newPos = new THREE.Vector3().addVectors(view.position, p);
			view.position.copy(newPos);
		}
		
		// decelerate over time
		{
			this.zoomDelta.multiplyScalar(fade);
			this.wheelDelta = 0;
		}
		
	}
	 
}








