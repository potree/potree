/**
 * @author mschuetz / http://mschuetz.at/
 * 
 * adapted from THREE.OrbitControls by 
 * 
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
Potree.OrbitControls = class{

	constructor(renderer){
		this.renderer = renderer;
		this.domElement = renderer.domElement;
		
		this.dispatcher = new THREE.EventDispatcher();

		this.enabled = true;
		
		this.scene = null;

		// Limits to how far you can dolly in and out
		this.minDistance = 0;
		this.maxDistance = Infinity;

		this.zoomSpeed = 1.0;
		this.rotateSpeed = 1.0;
		this.keyPanSpeed = 7.0;	// pixels moved per arrow key push
		
		this.minimumJumpDistance = 0.2;
		this.jumpDistance = null;

		this.fadeFactor = 10;

		// How far you can orbit vertically, upper and lower limits.
		// Range is 0 to Math.PI radians.
		this.minPolarAngle = 0; // radians
		this.maxPolarAngle = Math.PI; // radians

		// The four arrow keys
		this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };


		this.EPS = 0.000001;

		this.rotateStart = new THREE.Vector2();
		this.rotateEnd = new THREE.Vector2();
		this.rotateDelta = new THREE.Vector2();

		this.panStart = new THREE.Vector2();
		this.panEnd = new THREE.Vector2();

		this.offset = new THREE.Vector3();

		this.dollyStart = new THREE.Vector2();
		this.dollyEnd = new THREE.Vector2();
		this.dollyDelta = new THREE.Vector2();

		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.panDelta = new THREE.Vector3();
		this.scale = 1;

		this.lastPosition = new THREE.Vector3();

		this.STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

		this.state = this.STATE.NONE;
		
		if(this.domElement.tabIndex === -1){
			this.domElement.tabIndex = 2222;
		}
		
		
		
		
		let onMouseDown = (event) => {
			if ( this.enabled === false ) return;
			event.preventDefault();

			if ( event.button === THREE.MOUSE.LEFT ) {
				this.state = this.STATE.ROTATE;

				this.rotateStart.set( event.clientX, event.clientY );
			} else if ( event.button === THREE.MOUSE.MIDDLE ) {
				this.state = this.STATE.DOLLY;

				this.dollyStart.set( event.clientX, event.clientY );
			} else if ( event.button === THREE.MOUSE.RIGHT ) {
				this.state = this.STATE.PAN;

				this.panStart.set( event.clientX, event.clientY );
			}

			this.domElement.addEventListener( 'mousemove', onMouseMove, false );
			this.domElement.addEventListener( 'mouseup', onMouseUp, false );
			this.dispatcher.dispatchEvent({type: 'start'});
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

			} else if ( this.state === this.STATE.DOLLY ) {
				this.dollyEnd.set( event.clientX, event.clientY );
				this.dollyDelta.subVectors( this.dollyEnd, this.dollyStart );

				if ( this.dollyDelta.y > 0 ) {

					this.dollyIn();

				} else {

					this.dollyOut();

				}

				this.dollyStart.copy( this.dollyEnd );

			} else if ( this.state === this.STATE.PAN ) {
				this.panEnd.set( event.clientX, event.clientY );
				let panDelta = new THREE.Vector2().subVectors( this.panEnd, this.panStart );
				
				this.panDelta.x -= panDelta.x;
				this.panDelta.y += panDelta.y;

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
			if ( this.enabled === false ) return;

			event.preventDefault();

			var delta = 0;

			if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
				delta = event.wheelDelta;
			} else if ( event.detail !== undefined ) { // Firefox
				delta = - event.detail;
			}

			if ( delta > 0 ) {
				this.dollyOut();
			} else {
				this.dollyIn();
			}

			this.dispatcher.dispatchEvent({type: 'start'});
			this.dispatcher.dispatchEvent({type: 'end'});
		};

		let onKeyDown = (event) => {
			if (this.enabled === false) return;
			
			if(event.keyCode === this.keys.UP){
				this.panDelta.y += this.keyPanSpeed;
			}else if(event.keyCode === this.keys.BOTTOM){
				this.panDelta.y -= this.keyPanSpeed;
			}else if(event.keyCode === this.keys.LEFT){
				this.panDelta.x -= this.keyPanSpeed;
			}else if(event.keyCode === this.keys.RIGHT){
				this.panDelta.x += this.keyPanSpeed;
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
		
		this.domElement.addEventListener( 'contextmenu', (e) => { e.preventDefault(); }, false );
		this.domElement.addEventListener( 'mousedown', onMouseDown, false );
		this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
		this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
		this.domElement.addEventListener( 'dblclick', onDoubleClick);
		this.domElement.addEventListener( 'keydown', onKeyDown, false );
	}
	
	setScene(scene){
		this.scene = scene;
	};

	rotateLeft(angle){
		this.yawDelta -= angle;
	};

	rotateUp(angle){
		this.pitchDelta -= angle;
	};

	dollyIn(dollyScale){
		if ( dollyScale === undefined ) {
			dollyScale = this.getZoomScale();
		}

		this.scale /= dollyScale;
	};

	dollyOut(dollyScale){
		if ( dollyScale === undefined ) {
			dollyScale = this.getZoomScale();
		}

		this.scale *= dollyScale;
	};

	update(delta){
		let position = this.scene.view.position.clone();

		this.offset.copy( position ).sub( this.scene.view.target );

		let yaw = Math.atan2( this.offset.x, this.offset.y );
		let pitch = Math.atan2( Math.sqrt( this.offset.x * this.offset.x + this.offset.y * this.offset.y ), this.offset.z );

		let progression = Math.min(1, this.fadeFactor * delta);
		
		yaw -= progression * this.yawDelta;
		pitch +=  progression * this.pitchDelta;

		pitch = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, pitch ) );
		pitch = Math.max( this.EPS, Math.min( Math.PI - this.EPS, pitch ) );

		let radius = this.offset.length();
		radius += (this.scale-1) * radius * progression;

		// restrict radius to be between desired limits
		radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );
		
		// resolve pan
		let dir = new THREE.Vector3().subVectors(this.scene.view.target, this.scene.view.position).normalize();
		let up = new THREE.Vector3(0, 0, 1);
		let pdx = new THREE.Vector3().crossVectors(dir, up);
		let pdy = new THREE.Vector3().crossVectors(pdx, dir);
		let panr = new THREE.Vector3().addVectors(
			pdx.multiplyScalar(2 * this.panDelta.x / this.domElement.clientWidth),
			pdy.multiplyScalar(2 * this.panDelta.y / this.domElement.clientHeight));
		
		// move target to panned location
		let newTarget = this.scene.view.target.clone().add(panr.multiplyScalar(progression * radius));

		this.offset.x = radius * Math.sin( pitch ) * Math.sin( yaw );
		this.offset.z = radius * Math.cos( pitch );
		this.offset.y = radius * Math.sin( pitch ) * Math.cos( yaw );

		position.copy( newTarget ).add( this.offset );
		
		// send transformation proposal to listeners
		var proposeTransformEvent = {
			type: "proposeTransform",
			oldPosition: this.scene.view.position,
			newPosition: position,
			objections: 0,
			counterProposals: []
		};
		this.dispatcher.dispatchEvent(proposeTransformEvent);
		
		// check some counter proposals if transformation wasn't accepted
		if(proposeTransformEvent.objections > 0 ){
			
			if(proposeTransformEvent.counterProposals.length > 0){
				var cp = proposeTransformEvent.counterProposals;
				position.copy(cp[0]);
				
				proposeTransformEvent.objections = 0;
				proposeTransformEvent.counterProposals = [];
			}
		}
		
		
		// apply transformation, if accepted
		if(proposeTransformEvent.objections > 0){
			this.yawDelta = 0;
			this.pitchDelta = 0;
			this.scale = 1;
			this.panDelta.set(0,0,0);
		}else{
			this.scene.view.position.copy(position);
			this.scene.view.target.copy(newTarget);
			
			var attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			
			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.scale = 1 + (this.scale-1) * attenuation;
			this.panDelta.multiplyScalar( attenuation );
		}

		if (this.lastPosition.distanceTo(this.scene.view.position) > 0 ) {
			this.dispatcher.dispatchEvent({type: "change"});

			this.lastPosition.copy( this.scene.view.position );
		}

	};

	getZoomScale(){
		return Math.pow( 0.95, this.zoomSpeed );
	}

	

};
