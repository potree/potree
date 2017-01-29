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
 
Potree.FirstPersonControls = class FirstPersonControls extends THREE.EventDispatcher{
	
	constructor(viewer){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.scene = null;
		
		this.rotationSpeed = 200;
		this.moveSpeed = 10;
		
		this.keys = {
			FORWARD:   ['W'.charCodeAt(0), 38],
			BACKWARD:  ['S'.charCodeAt(0), 40],
			LEFT:      ['A'.charCodeAt(0), 37],
			RIGHT:     ['D'.charCodeAt(0), 39],
			UP:        ['R'.charCodeAt(0), 33],
			DOWN:      ['F'.charCodeAt(0), 34]
		}
		
		this.fadeFactor = 50;
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.translationDelta = new THREE.Vector3(0, 0, 0);
		this.translationWorldDelta = new THREE.Vector3(0, 0, 0);
		
		let drag = (e) => {
			if(e.drag.object !== null){
				return;
			}
			
			let moveSpeed = this.viewer.getMoveSpeed();
			
			let ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
			};
			
			if(e.drag.mouse === THREE.MOUSE.LEFT){
				this.yawDelta += ndrag.x * this.rotationSpeed;
				this.pitchDelta += ndrag.y * this.rotationSpeed;
			}else if(e.drag.mouse === THREE.MOUSE.RIGHT){
				this.translationDelta.x -= ndrag.x * moveSpeed * 100;
				this.translationDelta.z += ndrag.y * moveSpeed * 100;
			}
		};
		
		this.addEventListener("drag", drag);
	}
	
	setScene(scene){
		this.scene = scene;
	}
	
	update(delta){
		let view = this.scene.view;
		
		{ // accelerate while input is given
			let ih = this.viewer.inputHandler;
			
			let moveForward = this.keys.FORWARD.some(e => ih.pressedKeys[e]);
			let moveBackward = this.keys.BACKWARD.some(e => ih.pressedKeys[e]);
			let moveLeft = this.keys.LEFT.some(e => ih.pressedKeys[e]);
			let moveRight = this.keys.RIGHT.some(e => ih.pressedKeys[e]);
			let moveUp = this.keys.UP.some(e => ih.pressedKeys[e]);
			let moveDown = this.keys.DOWN.some(e => ih.pressedKeys[e]);
			
			if(moveForward && moveBackward){
				this.translationDelta.y = 0;
			}else if(moveForward){
				this.translationDelta.y = this.viewer.getMoveSpeed();
			}else if(moveBackward){
				this.translationDelta.y = -this.viewer.getMoveSpeed();
			}
			
			if(moveLeft && moveRight){
				this.translationDelta.x = 0;
			}else if(moveLeft){
				this.translationDelta.x = -this.viewer.getMoveSpeed();
			}else if(moveRight){
				this.translationDelta.x = this.viewer.getMoveSpeed();
			}
			
			if(moveUp && moveDown){
				this.translationWorldDelta.z = 0;
			}else if(moveUp){
				this.translationWorldDelta.z = this.viewer.getMoveSpeed();
			}else if(moveDown){
				this.translationWorldDelta.z = -this.viewer.getMoveSpeed();
			}
			
		}
		
		{ // apply rotation
			let yaw = view.yaw;
			let pitch = view.pitch;
			
			yaw -= this.yawDelta * delta;
			pitch -= this.pitchDelta * delta;
			
			view.yaw = yaw;
			view.pitch = pitch;
		}
		
		{ // apply translation
			view.translate(
				this.translationDelta.x * delta,
				this.translationDelta.y * delta,
				this.translationDelta.z * delta
			);
			
			view.translateWorld(
				this.translationWorldDelta.x * delta,
				this.translationWorldDelta.y * delta,
				this.translationWorldDelta.z * delta
			);
		}
		
		{// decelerate over time
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.translationDelta.multiplyScalar(attenuation);
			this.translationWorldDelta.multiplyScalar(attenuation);
		}
		
	}

	
	
};




