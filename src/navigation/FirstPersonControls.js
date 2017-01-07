
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
 * This set of controls performs first person navigation without mouse lock.
 * Instead, rotating the camera is done by dragging with the left mouse button.
 *
 * move: a/s/d/w or up/down/left/right
 * rotate: left mouse
 * pan: right mouse
 * change speed: mouse wheel
 *
 *
 */
Potree.FirstPersonControls = class extends Potree.Controls{
	
	constructor(renderer){
		super(renderer);
		
		this.rotateSpeed = 1.0;
		this.moveSpeed = 10.0;
		
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
		
		let drag = this.getNormalizedDrag();
		let startPosition = this.scene.view.position.clone();
		let startTarget = this.scene.view.target.clone();
		let up = new THREE.Vector3(0, 0, 1);
		
		
		let newPosition = this.scene.view.position.clone();
		let newTarget = this.scene.view.target.clone();
		
		if(this.state === this.STATE.ROTATE){
			let dir = new THREE.Vector3().subVectors(this.scene.view.target, this.scene.view.position);
			let radius = dir.length();
			dir.normalize();
			
			let side = new THREE.Vector3().crossVectors(dir, up);
			
			dir.applyAxisAngle(side, -4 * drag.y);
			dir.applyAxisAngle(up, -4 * drag.x);
			
			newTarget.addVectors(startPosition, dir.clone().multiplyScalar(radius));
		}
		
		let translation = new THREE.Vector3(0, 0, 0);
		if(this.state === this.STATE.PAN){
			translation.x = -drag.x * this.speed;
			translation.z = +drag.y * this.speed;
		}
		
		{ // TRANSLATION
		
			if(this.moveForward){
				translation.y -= delta * this.speed;
			}
			if(this.moveBackward){
				translation.y += delta * this.speed;
			}
			if(this.moveLeft){
				translation.x -= delta * this.speed;
			}
			if(this.moveRight){
				translation.x += delta * this.speed;
			}
			
			let dir = new THREE.Vector3().subVectors(this.scene.view.target, this.scene.view.position);
			let radius = dir.length();
			dir.normalize();
			
			let pdy = dir.clone();
			let pdx = new THREE.Vector3().crossVectors(up, dir);
			let pdz = new THREE.Vector3().crossVectors(pdx, pdy);
			
			let resolvedTranslation = new THREE.Vector3();
			resolvedTranslation.add(pdx.multiplyScalar(-this.speed * translation.x));
			resolvedTranslation.add(pdy.multiplyScalar(-this.speed * translation.y));
			resolvedTranslation.add(pdz.multiplyScalar(-this.speed * translation.z));
			
			newPosition.add(resolvedTranslation);
			newTarget.add(resolvedTranslation);
		}
		
		this.scene.view.position.copy(newPosition);
		this.scene.view.target.copy(newTarget);
		
		if(this.dragStart){
			this.dragStart.copy(this.dragEnd);
		}
		
	}

	
	
};




