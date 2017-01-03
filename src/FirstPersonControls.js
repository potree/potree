

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



Potree.FirstPersonControls = class{
	
	constructor(renderer){
		this.renderer = renderer;
		this.domElement = renderer.domElement;
		
		this.dispatcher = new THREE.EventDispatcher();
		
		this.enabled = true;
		
		this.scene = null;

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

		this.rotateStart = new THREE.Vector2();
		this.rotateEnd = new THREE.Vector2();
		this.rotateDelta = new THREE.Vector2();

		this.panStart = new THREE.Vector2();
		this.panEnd = new THREE.Vector2();
		//this.panDelta = new THREE.Vector2();
		this.panOffset = new THREE.Vector3();

		this.phiDelta = 0;
		this.thetaDelta = 0;
		this.scale = 1;
		this.translation = new THREE.Vector3();

		this.STATE = { NONE : -1, ROTATE : 0, SPEEDCHANGE : 1, PAN : 2 };

		this.state = this.STATE.NONE;
		
		
		let onMouseDown = (event) => {
			if ( this.enabled === false ) return;
			event.preventDefault();

			if ( event.button === 0 ) {
				this.state = this.STATE.ROTATE;

				this.rotateStart.set( event.clientX, event.clientY );
			} else if ( event.button === 2 ) {
				this.state = this.STATE.PAN;

				this.panStart.set( event.clientX, event.clientY );
			}

			this.domElement.addEventListener( 'mousemove', onMouseMove, false );
			this.domElement.addEventListener( 'mouseup', onMouseUp, false );
			this.dispatcher.dispatchEvent({ type: 'start'});
		};

		let onMouseMove = (event) => {
			if ( this.enabled === false ) return;

			event.preventDefault();

			var element = this.domElement === document ? this.domElement.body : this.domElement;

			if ( this.state === this.STATE.ROTATE ) {
				this.rotateEnd.set( event.clientX, event.clientY );
				this.rotateDelta.subVectors( this.rotateEnd, this.rotateStart );

				// rotating across whole screen goes 360 degrees around
				this.rotateLeft( 2 * Math.PI * this.rotateDelta.x / element.clientWidth * this.rotateSpeed );

				// rotating up and down along whole screen attempts to go 360, but limited to 180
				this.rotateUp( 2 * Math.PI * this.rotateDelta.y / element.clientHeight * this.rotateSpeed );

				this.rotateStart.copy( this.rotateEnd );

			} else if ( this.state === this.STATE.PAN ) {
				this.panEnd.set( event.clientX, event.clientY );
				let panDelta = new THREE.Vector2().subVectors( this.panEnd, this.panStart );
				
				this.translation.x -= (2 * panDelta.x) / this.domElement.clientWidth;
				this.translation.z += (2 * panDelta.y) / this.domElement.clientHeight;
						
				this.panStart.copy( this.panEnd );
			}
		};

		let onMouseUp = (event) => {
			if ( this.enabled === false ) return;

			this.domElement.removeEventListener( 'mousemove', onMouseMove, false );
			this.domElement.removeEventListener( 'mouseup', onMouseUp, false );
			this.dispatcher.dispatchEvent({ type: 'end'});
			this.state = this.STATE.NONE;
		};

		let onMouseWheel = (event) => {
			if ( this.enabled === false || this.noZoom === true ) return;

			event.preventDefault();

			var direction = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;

			var moveSpeed = this.moveSpeed + this.moveSpeed * 0.1 * direction;
			moveSpeed = Math.max(0.1, moveSpeed);

			this.setMoveSpeed(moveSpeed);
			
			
			this.dispatcher.dispatchEvent({ type: 'start'});
			this.dispatcher.dispatchEvent({ type: 'end'});
		};

		let onKeyDown = (event) => {
			if ( this.enabled === false) return;
			
			switch ( event.keyCode ) {
				case this.keys.UP: this.moveForward = true; break;
				case this.keys.BOTTOM: this.moveBackward = true; break;
				case this.keys.LEFT: this.moveLeft = true; break;
				case this.keys.RIGHT: this.moveRight = true; break;
				case this.keys.W: this.moveForward = true; break;
				case this.keys.S: this.moveBackward = true; break;
				case this.keys.A: this.moveLeft = true; break;
				case this.keys.D: this.moveRight = true; break;			
			}
		};
		
		let onKeyUp = (event) => {
			if ( this.enabled === false ) return;
			
			switch ( event.keyCode ) {
				case this.keys.W: this.moveForward = false; break;
				case this.keys.S: this.moveBackward = false; break;
				case this.keys.A: this.moveLeft = false; break;
				case this.keys.D: this.moveRight = false; break;
				case this.keys.UP: this.moveForward = false; break;
				case this.keys.BOTTOM: this.moveBackward = false; break;
				case this.keys.LEFT: this.moveLeft = false; break;
				case this.keys.RIGHT: this.moveRight = false; break;
			}
		};
		
		let onDoubleClick = (event) => {
			if ( this.enabled === false ) return;
			
			if(this.scene.pointclouds.length === 0){
				return;
			}
			
			event.preventDefault();
		
			var rect = this.domElement.getBoundingClientRect();
			
			var mouse =  {
				x: ( (event.clientX - rect.left) / this.domElement.clientWidth ) * 2 - 1,
				y: - ( (event.clientY - rect.top) / this.domElement.clientHeight ) * 2 + 1
			};
			
			var pointcloud = null;
			var distance = Number.POSITIVE_INFINITY;
			var I = null;
			
			for(var i = 0; i < this.scene.pointclouds.length; i++){
				let intersection = Potree.utils.getMousePointCloudIntersection(mouse, this.scene.camera, this.renderer, [this.scene.pointclouds[i]]);
				if(!intersection){
					continue;
				}
				
				var tDist = this.scene.camera.position.distanceTo(intersection);
				if(tDist < distance){
					pointcloud = this.scene.pointclouds[i];
					distance = tDist;
					I = intersection;
				}
			}
			
			if(I != null){
			
				var targetRadius = 0;
				if(!this.jumpDistance){
					var camTargetDistance = this.scene.camera.position.distanceTo(this.scene.view.target);
				
					var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
					vector.unproject(this.scene.camera);
		
					var direction = vector.sub(this.scene.camera.position).normalize();
					var ray = new THREE.Ray(this.scene.camera.position, direction);
					
					var nodes = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);
					var lastNode = nodes[nodes.length - 1];
					var radius = lastNode.getBoundingSphere().radius;
					var targetRadius = Math.min(camTargetDistance, radius);
					var targetRadius = Math.max(this.minimumJumpDistance, targetRadius);
				}else{
					targetRadius = this.jumpDistance;
				}
				
				var d = this.scene.camera.getWorldDirection().multiplyScalar(-1);
				var cameraTargetPosition = new THREE.Vector3().addVectors(I, d.multiplyScalar(targetRadius));
				var controlsTargetPosition = I;
				
				var animationDuration = 600;
				
				var easing = TWEEN.Easing.Quartic.Out;
				
				this.enabled = false;
				
				// animate position
				var tween = new TWEEN.Tween(this.scene.view.position).to(cameraTargetPosition, animationDuration);
				tween.easing(easing);
				tween.start();
				
				// animate target
				var tween = new TWEEN.Tween(this.scene.view.target).to(I, animationDuration);
				tween.easing(easing);
				tween.onComplete(function(){
					this.enabled = true;
					
					this.dispatcher.dispatchEvent({
						type: "double_click_move",
						controls: this,
						position: cameraTargetPosition,
						targetLocation: I
					});
				}.bind(this));
				tween.start();
			}
		};

		this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
		this.domElement.addEventListener( 'mousedown', onMouseDown, false );
		this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
		this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
		this.domElement.addEventListener( 'dblclick', onDoubleClick);
		this.domElement.addEventListener( 'keydown', onKeyDown, false );
		this.domElement.addEventListener( 'keyup', onKeyUp, false );

		if(this.domElement.tabIndex === -1){
			this.domElement.tabIndex = 2222;
		}

	}
	
	setScene(scene){
		this.scene = scene;
	};
	
	setMoveSpeed(value){
			if(this.moveSpeed !== value){
				this.moveSpeed = value;
				this.dispatcher.dispatchEvent( {
					type: "move_speed_changed",
					controls: this
				});
			}
		};

	rotateLeft(angle){
		this.thetaDelta -= angle;
	};

	rotateUp(angle){
		this.phiDelta -= angle;
	};
	
	update(delta){
		
		let position = this.scene.view.position;
		let target = this.scene.view.target;
		let dir = new THREE.Vector3().subVectors(target, position).normalize();
		let up = new THREE.Vector3(0, 0, 1);
		let distance = position.distanceTo(target);
		
		let newPosition = new THREE.Vector3();
		let newTarget = new THREE.Vector3();
	
		if(delta !== undefined){
			if(this.moveRight){
				this.translation.x += delta * this.moveSpeed;
			}
			if(this.moveLeft){
				this.translation.x -= delta * this.moveSpeed;
			}
			if(this.moveForward){
				this.translation.y -= delta * this.moveSpeed;
			}
			if(this.moveBackward){
				this.translation.y += delta * this.moveSpeed;
			}
		}
		
		let resolvedTranslation = new THREE.Vector3();
		{
			let pdy = dir.clone();
			let pdx = new THREE.Vector3().crossVectors(up, dir);
			let pdz = new THREE.Vector3().crossVectors(pdx, pdy);
			
			resolvedTranslation.add(pdx.multiplyScalar(-this.moveSpeed * this.translation.x));
			resolvedTranslation.add(pdy.multiplyScalar(-this.moveSpeed * this.translation.y));
			resolvedTranslation.add(pdz.multiplyScalar(-this.moveSpeed * this.translation.z));
		}
		
		newPosition.add(position).add(resolvedTranslation);
		newTarget.add(target).add(resolvedTranslation);
		
		{
			let d = new THREE.Vector2(dir.x, dir.y).length();
			let pitch = Math.atan2(dir.z, d);
			let yaw = Math.atan2(dir.y, dir.x);
			
			let mPitch = new THREE.Matrix4().makeRotationY(-(pitch + 0.8 * this.phiDelta));
			var mYaw = new THREE.Matrix4().makeRotationZ(yaw + 0.8 * this.thetaDelta);
			
			let newDir = new THREE.Vector3(1, 0, 0);
			newDir.applyMatrix4(mPitch);
			newDir.applyMatrix4(mYaw);
			
			newTarget.copy(newPosition).add(newDir.multiplyScalar(distance));
		}
		
		// send transformation proposal to listeners
		var proposeTransformEvent = {
			type: "proposeTransform",
			oldPosition: position,
			newPosition: newPosition,
			objections: 0,
			counterProposals: []
		};
		this.dispatcher.dispatchEvent(proposeTransformEvent);
		
		// check some counter proposals if transformation wasn't accepted
		if(proposeTransformEvent.objections > 0 ){
			if(proposeTransformEvent.counterProposals.length > 0){
				var cp = proposeTransformEvent.counterProposals;
				newPosition.copy(cp[0]);
				
				proposeTransformEvent.objections = 0;
				proposeTransformEvent.counterProposals = [];
			}
		}
		
		// apply transformation, if accepted
		if(proposeTransformEvent.objections > 0){
			
		}else{
			this.scene.view.position.copy(newPosition);
		}
		
		this.scene.view.target.copy(newTarget);
		
		if(!this.translation.equals(new THREE.Vector3(0,0,0))){
			var event = {
				type: 'move',
				translation: this.translation.clone()
			};
			this.dispatcher.dispatchEvent(event);
		}
		
		if(!(this.thetaDelta === 0.0 && this.phiDelta === 0.0)) {
			var event = {
				type: 'rotate',
				thetaDelta: this.thetaDelta,
				phiDelta: this.phiDelta
			};
			this.dispatcher.dispatchEvent(event);
		}
		
		
		
		

		this.phiDelta = 0;
		this.thetaDelta = 0;
		this.scale = 1;
		this.translation.set( 0, 0, 0 );

		if ( position.distanceTo( newPosition ) > 0 ) {
			this.dispatcher.dispatchEvent({ type: 'change' });
		}
	};

	
	
};