/**
 * @author mschuetz / http://mschuetz.at
 *
 * adapted from THREE.OrbitControls by 
 *
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 *
 *
 */
 
Potree.OrbitControls = class extends Potree.Controls{
	
	constructor(renderer){
		super(renderer);
		
		this.rotationSpeed = 10;
		
		this.STATE = { NONE : -1, ROTATE : 0, PAN : 2 };

		this.state = this.STATE.NONE;
		
		this.fadeFactor = 10;
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.panDelta = new THREE.Vector2(0, 0);
		this.radiusDelta = 0;
	}
	
	onMouseDown(e){
		if(!this.enabled){return;}
		
		super.onMouseDown(e);
		e.preventDefault();
		
		if(e.button === THREE.MOUSE.LEFT){
			this.state = this.STATE.ROTATE;
		}else if(event.button === THREE.MOUSE.RIGHT){
			this.state = this.STATE.PAN;
		}
	}
	
	onMouseUp(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
		
		this.state = this.STATE.NONE;
	}
	
	onDoubleClick(e){
		if(!this.enabled){ return; }
		
		e.preventDefault();
		
		this.zoomToLocation(this.mouse);
	}
	
	update(delta){
		if(!this.enabled){return;}
		
		let view = this.scene.view;
		let drag = this.getNormalizedLastDrag();
		
		{ // accelerate while input is given
			this.radiusDelta -= this.wheelDelta;
			if(this.state === this.STATE.ROTATE){
				this.yawDelta += drag.x * this.rotationSpeed;
				this.pitchDelta += drag.y * this.rotationSpeed;
			}else if(this.state === this.STATE.PAN){
				this.panDelta.x += drag.x;
				this.panDelta.y += drag.y;
			}
		}
		
		{ // apply rotation
			let progression = Math.min(1, this.fadeFactor * delta);
			
			let yaw = view.yaw;
			let pitch = view.pitch;
			let pivot = view.getPivot();
			
			yaw -= progression * this.yawDelta;
			pitch -= progression * this.pitchDelta;
			
			view.yaw = yaw;
			view.pitch = pitch;
			
			let V = this.scene.view.direction.multiplyScalar(-view.radius);
			let position = new THREE.Vector3().addVectors(pivot, V);
			
			view.position.copy(position);
		}
		
		{ // apply pan
			let progression = Math.min(1, this.fadeFactor * delta);
			let panDistance = progression * view.radius * 3;
			
			let px = -this.panDelta.x * panDistance;
			let py = this.panDelta.y * panDistance;
			
			view.pan(px, py);
		}
		
		{ // apply zoom
			let progression = Math.min(1, this.fadeFactor * delta);
			
			let radius = view.radius + progression * this.radiusDelta * view.radius * 0.1;
			
			let V = view.direction.multiplyScalar(-radius);
			let position = new THREE.Vector3().addVectors(view.getPivot(), V);
			view.radius = radius;
			
			view.position.copy(position);
		}
		
		{// decelerate over time
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.panDelta.multiplyScalar(attenuation);
			this.radiusDelta *= attenuation;
		}
		
		this.updateFinished();
	}
	
	
};