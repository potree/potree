

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



Potree.GeoControls = function ( object, domElement ) {
	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	
	// Set to false to disable this control
	this.enabled = true;

	// Set this to a THREE.SplineCurve3 instance
	this.track = null;
	// position on track in intervall [0,1]
	this.trackPos = 0;
	
	this.rotateSpeed = 1.0;
	this.moveSpeed = 10.0;

	this.keys = { 
		LEFT: 37, 
		UP: 38, 
		RIGHT: 39, 
		BOTTOM: 40,
		A: 'A'.charCodeAt(0),
		S: 'S'.charCodeAt(0),
		D: 'D'.charCodeAt(0),
		W: 'W'.charCodeAt(0),
		Q: 'Q'.charCodeAt(0),
		E: 'E'.charCodeAt(0),
		R: 'R'.charCodeAt(0),
		F: 'F'.charCodeAt(0)
	};

	var scope = this;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();
	
	this.shiftDown = false;

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, SPEEDCHANGE : 1, PAN : 2 };

	var state = STATE.NONE;

	// for reset
	this.position0 = this.object.position.clone();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};
	
	this.setTrack = function(track){
		if(this.track !== track){
			this.track = track;
			this.trackPos = null;
		}
	};
	
	this.setTrackPos = function(trackPos, _preserveRelativeRotation){
		var preserveRelativeRotation = _preserveRelativeRotation || false;
	
		var newTrackPos = Math.max(0, Math.min(1, trackPos));
		var oldTrackPos = this.trackPos || newTrackPos;
		
		var newTangent = this.track.getTangentAt(newTrackPos);
		var oldTangent = this.track.getTangentAt(oldTrackPos);
		
		if(newTangent.equals(oldTangent)){
			// no change in direction
		}else{
			var tangentDiffNormal = new THREE.Vector3().crossVectors(oldTangent, newTangent).normalize();
			var angle = oldTangent.angleTo(newTangent);
			var rot = new THREE.Matrix4().makeRotationAxis(tangentDiffNormal, angle);
			var dir = this.object.getWorldDirection().clone();
			dir = dir.applyMatrix4(rot);
			var target = new THREE.Vector3().addVectors(this.object.position, dir);
			this.object.lookAt(target);
			this.object.updateMatrixWorld();
			
			var event = {
				type: 'path_relative_rotation',
				angle: angle,
				axis: tangentDiffNormal,
				controls: scope
			};
			this.dispatchEvent(event);
		}
		
		if(this.trackPos === null){
			var target = new THREE.Vector3().addVectors(this.object.position, newTangent);
			this.object.lookAt(target);
		}
		
		
		this.trackPos = newTrackPos;
		
		//var pStart = this.track.getPointAt(oldTrackPos);
		//var pEnd = this.track.getPointAt(newTrackPos);
		//var pDiff = pEnd.sub(pStart);
		
		
		if(newTrackPos !== oldTrackPos){
			var event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}
	}
	
	this.getTrackPos = function(){
		return this.trackPos;
	};

	this.rotateLeft = function ( angle ) {
		thetaDelta -= angle;
	};

	this.rotateUp = function ( angle ) {
		phiDelta -= angle;
	};

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );
		
		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

	};
	
	// pass in distance in world space to move forward
	this.panForward = function ( distance ) {

		if(this.track){
			this.setTrackPos( this.getTrackPos() - distance / this.track.getLength());
		}else{
			var te = this.object.matrix.elements;

			// get Y column of matrix
			panOffset.set( te[ 8 ], te[ 9 ], te[ 10 ] );
			//panOffset.set( te[ 8 ], 0, te[ 10 ] );
			panOffset.multiplyScalar( distance );
			
			pan.add( panOffset );
		}
	};
	
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object.fov !== undefined ) {
			// perspective
			var position = scope.object.position;
			var offset = position.clone();
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );
		} else if ( scope.object.top !== undefined ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );
		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: GeoControls.js encountered an unknown camera type - pan disabled.' );
		}
	};

	this.update = function (delta) {
		this.object.rotation.order = 'ZYX';
		
		var object = this.object;
		
		this.object = new THREE.Object3D();
		this.object.position.copy(object.position);
		this.object.rotation.copy(object.rotation);
		this.object.updateMatrix();
		this.object.updateMatrixWorld();
		
		var position = this.object.position;
		
		if(delta !== undefined){
		
			var multiplier = scope.shiftDown ? 4 : 1;
			if(this.moveRight){
				this.panLeft(-delta * this.moveSpeed * multiplier);
			}
			if(this.moveLeft){
				this.panLeft(delta * this.moveSpeed * multiplier);
			}
			if(this.moveForward || this.moveForwardMouse){
				this.panForward(-delta * this.moveSpeed * multiplier);
			}
			if(this.moveBackward){
				this.panForward(delta * this.moveSpeed * multiplier);
			}
			if(this.rotLeft){
				scope.rotateLeft( -0.5 * Math.PI * delta / scope.rotateSpeed );
			}
			if(this.rotRight){
				scope.rotateLeft( 0.5 * Math.PI * delta / scope.rotateSpeed );
			}
			if(this.raiseCamera){
				//scope.rotateUp( -0.5 * Math.PI * delta / scope.rotateSpeed );
				scope.panUp( delta * this.moveSpeed * multiplier );
			}
			if(this.lowerCamera){
				//scope.rotateUp( 0.5 * Math.PI * delta / scope.rotateSpeed );
				scope.panUp( -delta * this.moveSpeed * multiplier );
			}
			
		}
		
		if(!pan.equals(new THREE.Vector3(0,0,0))){
			var event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}
		
		position.add(pan);
		
		if(!(thetaDelta === 0.0 && phiDelta === 0.0)) {
			var event = {
				type: 'rotate',
				thetaDelta: thetaDelta,
				phiDelta: phiDelta
			};
			this.dispatchEvent(event);
		}
		
		this.object.updateMatrix();
		var rot = new THREE.Matrix4().makeRotationY(thetaDelta);
		var res = new THREE.Matrix4().multiplyMatrices(rot, this.object.matrix);
		this.object.quaternion.setFromRotationMatrix(res);
		
		this.object.rotation.x += phiDelta;
		this.object.updateMatrixWorld();
		
		// send transformation proposal to listeners
		var proposeTransformEvent = {
			type: "proposeTransform",
			oldPosition: object.position,
			newPosition: this.object.position,
			objections: 0,
			counterProposals: []
		};
		this.dispatchEvent(proposeTransformEvent);
		
		// check some counter proposals if transformation wasn't accepted
		if(proposeTransformEvent.objections > 0 ){
			if(proposeTransformEvent.counterProposals.length > 0){
				var cp = proposeTransformEvent.counterProposals;
				this.object.position.copy(cp[0]);
				
				proposeTransformEvent.objections = 0;
				proposeTransformEvent.counterProposals = [];
			}
		}
		
		// apply transformation, if accepted
		if(proposeTransformEvent.objections > 0){
			
		}else{
			object.position.copy(this.object.position);
		}
		
		object.rotation.copy(this.object.rotation);
		
		this.object = object;

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set( 0, 0, 0 );

		if ( lastPosition.distanceTo( this.object.position ) > 0 ) {
			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );
		}
		
		if(this.track){
			var pos = this.track.getPointAt(this.trackPos);
			object.position.copy(pos);
		}
	};


	this.reset = function () {
		state = STATE.NONE;

		this.object.position.copy( this.position0 );
	};

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === 0 ) {
			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );
		} else if ( event.button === 1 ) {
			state = STATE.PAN;
            
			panStart.set( event.clientX, event.clientY );
		} else if ( event.button === 2 ) {
			//state = STATE.PAN;
            //
			//panStart.set( event.clientX, event.clientY );
			scope.moveForwardMouse = true;
		}

		//scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		//scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( startEvent );
	}

	function onMouseMove( event ) {
		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( state === STATE.ROTATE ) {
			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.PAN ) {
			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			//panDelta.multiplyScalar(this.moveSpeed).multiplyScalar(0.0001);
			panDelta.multiplyScalar(0.002).multiplyScalar(scope.moveSpeed);
			
			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );
		}
	}

	function onMouseUp(event) {
		if ( scope.enabled === false ) return;
		
		//console.log(event.which);
		
		if(event.button === 2){
			scope.moveForwardMouse = false;
		}else{
			//scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
			//scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( endEvent );
			state = STATE.NONE;
		}
	}

	function onMouseWheel(event) {
		if ( scope.enabled === false || scope.noZoom === true ) return;

		event.preventDefault();

		var direction = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
		var moveSpeed = scope.moveSpeed + scope.moveSpeed * 0.1 * direction;
		moveSpeed = Math.max(0.1, moveSpeed);

		scope.setMoveSpeed(moveSpeed);

		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );
	}
	
	this.setMoveSpeed = function(value){
		if(scope.moveSpeed !== value){
			scope.moveSpeed = value;
			scope.dispatchEvent( {
				type: "move_speed_changed",
				controls: scope
			});
		}
	};

	function onKeyDown( event ) {
		if ( scope.enabled === false) return;
		
		scope.shiftDown = event.shiftKey;
		
		switch ( event.keyCode ) {
			case scope.keys.UP: scope.moveForward = true; break;
			case scope.keys.BOTTOM: scope.moveBackward = true; break;
			case scope.keys.LEFT: scope.moveLeft = true; break;
			case scope.keys.RIGHT: scope.moveRight = true; break;
			case scope.keys.W: scope.moveForward = true; break;
			case scope.keys.S: scope.moveBackward = true; break;
			case scope.keys.A: scope.moveLeft = true; break;
			case scope.keys.D: scope.moveRight = true; break;			
			case scope.keys.Q: scope.rotLeft = true; break;			
			case scope.keys.E: scope.rotRight = true; break;			
			case scope.keys.R: scope.raiseCamera = true; break;			
			case scope.keys.F: scope.lowerCamera = true; break;			
		}
	}
	
	function onKeyUp( event ) {
	
		scope.shiftDown = event.shiftKey;
		
		switch ( event.keyCode ) {
			case scope.keys.W: scope.moveForward = false; break;
			case scope.keys.S: scope.moveBackward = false; break;
			case scope.keys.A: scope.moveLeft = false; break;
			case scope.keys.D: scope.moveRight = false; break;
			case scope.keys.UP: scope.moveForward = false; break;
			case scope.keys.BOTTOM: scope.moveBackward = false; break;
			case scope.keys.LEFT: scope.moveLeft = false; break;
			case scope.keys.RIGHT: scope.moveRight = false; break;
			case scope.keys.Q: scope.rotLeft = false; break;			
			case scope.keys.E: scope.rotRight = false; break;
			case scope.keys.R: scope.raiseCamera = false; break;			
			case scope.keys.F: scope.lowerCamera = false; break;				
		}
	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
	
	scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
	scope.domElement.addEventListener( 'mouseup', onMouseUp, false );

	if(this.domElement.tabIndex === -1){
		this.domElement.tabIndex = 2222;
	}
	scope.domElement.addEventListener( 'keydown', onKeyDown, false );
	scope.domElement.addEventListener( 'keyup', onKeyUp, false );

};

Potree.GeoControls.prototype = Object.create( THREE.EventDispatcher.prototype );