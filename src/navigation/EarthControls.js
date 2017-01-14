

Potree.EarthControls = class extends Potree.Controls{
	
	constructor(renderer){
		super(renderer);
		
		this.radius = 1;
		
		this.STATE = {
			NONE: 0,
			DRAG: 1,
			ZOOM: 2,
			ROTATE: 3
		};
		
		this.state = this.STATE.NONE;
	}
	
	onMouseDown(e){
		if(!this.enabled){
			return;
		}
		
		super.onMouseDown(e);
		e.preventDefault();
		
		if(e.button === THREE.MOUSE.LEFT){
			this.state = this.STATE.DRAG;
		}else if(event.button === THREE.MOUSE.RIGHT){
			this.state = this.STATE.ROTATE;
		}
		
		this.pivot = this.getMousePointCloudIntersection(e);
		this.camStart = this.scene.camera.clone();
	}
	
	onMouseUp(e){
		if(!this.enabled){
			return;
		}
		
		super.onMouseUp(e);
		
		this.pivot = null;
		this.camStart = null;
	}
	
	update(delta){
		if(!this.enabled){
			return;
		}
		
		
		let drag = this.getNormalizedDrag();
		if(drag.length() === 0 || this.pivot === null){
			return;
		}
		
		let newCamPos = new THREE.Vector3();
		let newTarget = new THREE.Vector3();
		
		if(this.state === this.STATE.DRAG){
			let V = new THREE.Vector3().subVectors(this.scene.view.target, this.scene.view.position);
			let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), this.pivot);
			let mouse = {
				x:   ( this.dragEnd.x / this.domElement.clientWidth  ) * 2 - 1,
				y: - ( this.dragEnd.y / this.domElement.clientHeight ) * 2 + 1
			};
			
			let vec = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
			vec.unproject(this.camStart);
			var dir = vec.sub(this.camStart.position).normalize();
			
			var ray = new THREE.Ray(this.camStart.position, dir);
			var distanceToPlane = ray.distanceToPlane(plane);
			
			
			if(distanceToPlane > 0){
				newCamPos.subVectors(this.pivot, dir.clone().multiplyScalar(distanceToPlane));
			}
			
			newTarget.addVectors(newCamPos, V);
		}else if(this.state === this.STATE.ROTATE){
			let V = new THREE.Vector3().subVectors(this.scene.view.position, this.scene.view.target);
			
			let yaw = Math.atan2(V.y, V.x) - Math.PI / 2;
			let pitch = Math.atan2(Math.sqrt(V.x * V.x + V.y * V.y), V.z);
			
			let drag = this.getNormalizedLastDrag();
			
			yaw = yaw + drag.x * delta;
			pitch = pitch + drag.y * delta;
			
			let radius = this.scene.view.position.distanceTo(this.scene.view.target);
			
			//let dir = 
		}
		
		this.scene.view.position.copy(newCamPos);
		this.scene.view.target.copy(newTarget);
	}
	 
}
