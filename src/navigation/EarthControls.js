

Potree.EarthControls = class extends Potree.Controls{
	
	constructor(renderer){
		super(renderer);
		
		this.radius = 1;
		this.rotationSpeed = 10000;
		
		this.STATE = {
			NONE: 0,
			DRAG: 1,
			ZOOM: 2,
			ROTATE: 3
		};
		
		this.state = this.STATE.NONE;
		
		
		this.fadeFactor = 20;
		this.zoomDelta = new THREE.Vector3();
	}
	
	onMouseDown(e){
		if(!this.enabled){return;}

		super.onMouseDown(e);
		e.preventDefault();
		
		let I = this.getMousePointCloudIntersection(this.mouse);
		
		if(I){
			if(e.button === THREE.MOUSE.LEFT){
				this.state = this.STATE.DRAG;
			}else if(event.button === THREE.MOUSE.RIGHT){
				this.state = this.STATE.ROTATE;
			}
			
			this.pivot = I.location;
			this.camStart = this.scene.camera.clone();
		}
	}
	
	onMouseUp(e){
		if(!this.enabled){
			return;
		}
		
		super.onMouseUp(e);
		
		//this.pivot = null;
		this.camStart = null;
		this.state = this.STATE.NONE;
	}
	
	onDoubleClick(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
		
		this.zoomToLocation(this.mouse);
	}
	
	update(delta){
		if(!this.enabled){
			return;
		}
		
		let view = this.scene.view;
		let drag = this.getNormalizedDrag();
		let fade = Math.pow(0.5, this.fadeFactor * delta);
		let progression = 1 - fade;
		
		// accelerate while input is given
		if(this.wheelDelta !== 0){
			let I = this.getMousePointCloudIntersection(this.mouse);
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
		
		if(this.state === this.STATE.DRAG && this.pivot !== null){
			let V = new THREE.Vector3().subVectors(view.getPivot(), view.position);
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
				let newCamPos = new THREE.Vector3()
					.subVectors(this.pivot, dir.clone()
					.multiplyScalar(distanceToPlane));
				
				let pDiff = new THREE.Vector3().subVectors(newCamPos, view.position);
				
				//newCamPos.addVectors(view.position, pDiff.multiplyScalar(progression));
				newCamPos.addVectors(view.position, pDiff);
				view.position = newCamPos;

				let startDir = this.camStart.getWorldDirection();
				let newTarget = new THREE.Vector3().addVectors(view.position, startDir);
				view.lookAt(newTarget);
			}
		}else if(this.state === this.STATE.ROTATE && this.pivot !== null){
			
			let drag = this.getNormalizedLastDrag();
			
			
			let yawDelta = -drag.x * this.rotationSpeed * 0.05 * delta;
			let pitchDelta = drag.y * this.rotationSpeed * 0.02 * delta;
			
			let pivotToCam = new THREE.Vector3().subVectors(view.position, this.pivot);
			let pivotToCamTarget = new THREE.Vector3().subVectors(view.getPivot(), this.pivot);
			let side = view.getSide();
			
			pivotToCam.applyAxisAngle(side, pitchDelta);
			pivotToCamTarget.applyAxisAngle(side, pitchDelta);
			
			pivotToCam.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);
			pivotToCamTarget.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);
			
			let newCam = new THREE.Vector3().addVectors(this.pivot, pivotToCam);
			let newCamTarget = new THREE.Vector3().addVectors(this.pivot, pivotToCamTarget);
			
			view.position.copy(newCam);
			view.lookAt(newCamTarget);
			//view.pitch += pitchDelta;
			
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
		}
		
		this.updateFinished();
		
		//view.position.copy(newCamPos);
		//view.lookAt(newTarget);
	}
	 
}
