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
 
Potree.FirstPersonControls = class extends Potree.Controls{
	
	constructor(renderer){
		super(renderer);
		
		this.rotationSpeed = 200;
		this.moveSpeed = 10;
		
		this.minimumJumpDistance = 0.2;
		this.jumpDistance = null;

		this.keys = { 
			LEFT: 37, 
			UP: 38, 
			RIGHT: 39, 
			BOTTOM: 40,
			A: 'A'.charCodeAt(0),
			S: 'S'.charCodeAt(0),
			D: 'D'.charCodeAt(0),
			W: 'W'.charCodeAt(0)
		};

		this.STATE = { NONE : -1, ROTATE : 0, SPEEDCHANGE : 1, PAN : 2 };

		this.state = this.STATE.NONE;
		
		this.fadeFactor = 50;
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.translationDelta = new THREE.Vector3(0, 0, 0);
		
		if(this.domElement.tabIndex === -1){
			this.domElement.tabIndex = 2222;
		}
	}
	
	onMouseDown(e){
		if(this.enabled === false){
			return;
		}
		
		super.onMouseDown(e);
		e.preventDefault();
		
		if(e.button === THREE.MOUSE.LEFT){
			this.state = this.STATE.ROTATE;
		}else if(event.button === THREE.MOUSE.RIGHT){
			this.state = this.STATE.PAN;
		}
	}
	
	onMouseUp(e){
		if(this.enabled === false){
			return;
		}
		
		this.state = this.STATE.NONE;
	}
	
	onDoubleClick(e){
		if(!this.enabled){return;}
		
		this.zoomToLocation(this.mouse);
	}
	
	onKeyDown(e){
		if(this.enabled === false){
			return;
		}

		if(e.keyCode === this.keys.UP || e.keyCode === this.keys.W){
			this.moveForward = true;
		}else if(e.keyCode === this.keys.BOTTOM || e.keyCode === this.keys.S){
			this.moveBackward = true;
		}else if(e.keyCode === this.keys.LEFT || e.keyCode === this.keys.A){
			this.moveLeft = true;
		}else if(e.keyCode === this.keys.RIGHT || e.keyCode === this.keys.D){
			this.moveRight = true;
		}
	}
	
	onKeyUp(e){
		if(this.enabled === false){
			return;
		}
		
		if(e.keyCode === this.keys.UP || e.keyCode === this.keys.W){
			this.moveForward = false;
		}else if(e.keyCode === this.keys.BOTTOM || e.keyCode === this.keys.S){
			this.moveBackward = false;
		}else if(e.keyCode === this.keys.LEFT || e.keyCode === this.keys.A){
			this.moveLeft = false;
		}else if(e.keyCode === this.keys.RIGHT || e.keyCode === this.keys.D){
			this.moveRight = false;
		}
	}
	
	update(delta){
		if(!this.enabled){
			return;
		}
		
		let view = this.scene.view;
		let drag = this.getNormalizedLastDrag();
		
		{ // accelerate while input is given
			if(this.state === this.STATE.ROTATE){
				this.yawDelta += drag.x * this.rotationSpeed;
				this.pitchDelta += drag.y * this.rotationSpeed;
			}else if(this.state === this.STATE.PAN){
				this.translationDelta.x -= drag.x * this.speed * 50;
				this.translationDelta.z += drag.y * this.speed * 50;
			}
			
			{ // TRANSLATION
				
				if(this.moveForward && this.moveBackward){
					this.translationDelta.y = 0;
				}else if(this.moveForward){
					this.translationDelta.y = this.speed;
				}else if(this.moveBackward){
					this.translationDelta.y = -this.speed;
				}
				
				if(this.moveLeft && this.moveRight){
					this.translationDelta.x = 0;
				}else if(this.moveLeft){
					this.translationDelta.x = -this.speed;
				}else if(this.moveRight){
					this.translationDelta.x = this.speed;
				}
			}
		}
		
		{ // apply rotation
			let yaw = view.yaw;
			let pitch = view.pitch;
			
			yaw -= this.yawDelta * delta;
			pitch -= this.pitchDelta * delta;
			
			view.yaw = yaw;
			view.pitch = pitch;
			
			let V = this.scene.view.direction.multiplyScalar(-view.radius);
			let position = new THREE.Vector3().addVectors(view.getPivot(), V);
			
			view.position = position;
		}
		
		{ // apply translation
			let tx = this.translationDelta.x * delta;
			let ty = this.translationDelta.y * delta;
			let tz = this.translationDelta.z * delta;
			
			view.translate(tx, ty, tz);
		}
		
		{// decelerate over time
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.translationDelta.multiplyScalar(attenuation);
		}
		
		
		this.updateFinished();
	}

	
	
};




