

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
			
			if(!this.pivot){
				return;
			}
			
			//if(!e.drag.intersectionStart){
			//	e.drag.camStart = this.scene.camera.clone();
			//}
			
			let camStart = this.camStart;
			
			//let camera = this.viewer.scene.camera;
			let mouse = e.drag.end;
			let domElement = this.viewer.renderer.domElement;
			
			if(e.drag.mouse === THREE.MOUSE.LEFT){
				let nmouse =  {
					x: (mouse.x / domElement.clientWidth ) * 2 - 1,
					y: - (mouse.y / domElement.clientHeight ) * 2 + 1
				};
				
				let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
				vector.unproject(camStart);
				
				let dir = vector.sub( camStart.position).normalize();
				let ray = new THREE.Ray(camStart.position, dir);
				let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
					new THREE.Vector3(0, 0, 1), 
					this.pivot);
				
				
				let distanceToPlane = ray.distanceToPlane(plane);

				if(distanceToPlane > 0){
					let I = new THREE.Vector3().addVectors(
						camStart.position, 
						dir.clone().multiplyScalar(distanceToPlane));
						
					let movedBy = new THREE.Vector3().subVectors(
						I, this.pivot);
					
					let newCamPos = camStart.position.clone().sub(movedBy);
					
					this.viewer.scene.view.position.copy(newCamPos);
					
					{
						let distance = newCamPos.distanceTo(this.pivot);
						this.viewer.scene.view.radius = distance;
						let speed = this.viewer.scene.view.radius / 2.5;
						this.viewer.setMoveSpeed(speed);
					}
				}
				
			}else if(e.drag.mouse === THREE.MOUSE.RIGHT){
				
			}
			
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
			this.pivot = null;
		};
		
		let scroll = (e) => {
			this.wheelDelta += e.delta
		};
		
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
				
				{
					let distance = resolvedPos.distanceTo(I.location);
					view.radius = distance;
					let speed = view.radius / 2.5;
					this.viewer.setMoveSpeed(speed);
				}
			}
		}
		
		// apply zoom
		if(this.zoomDelta.length() !== 0){
			let p = this.zoomDelta.clone().multiplyScalar(progression);
			
			let newPos = new THREE.Vector3().addVectors(view.position, p);
			view.position.copy(newPos);
		}
		
		//{
		//	let speed = view.radius / 2.5;
		//	this.viewer.setMoveSpeed(speed);
		//}
		
		// decelerate over time
		{
			this.zoomDelta.multiplyScalar(fade);
			this.wheelDelta = 0;
		}
		
	}
	 
}








