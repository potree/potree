//
//
// adapted from THREE.OrbitControls
//

Potree.OrbitControls = function ( object, domElement ) {
	var scope = this;

	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	
	this.speed = {phi: 0, theta: 0};
	this.zoomSpeed = 0;
	this.panAcceleration = new THREE.Vector2();
	this.panSpeed = new THREE.Vector2();
	this.target = new THREE.Vector3();
	this.mouse = new THREE.Vector2();
	this.dollyStart = new THREE.Vector2();
	
	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	this.update = function( delta ) {
	
		var up = new THREE.Vector3(0,1,0);
		var dir = new THREE.Vector3().subVectors(this.target, object.position).normalize();
		var right = new THREE.Vector3().crossVectors(dir, up).normalize();
		var tilt = new THREE.Vector3().crossVectors(right, dir).normalize();
		var radius = object.position.distanceTo(this.target);
	
		var p = new THREE.Vector3().subVectors(object.position, this.target);
		
		// apply rotation
		var angle = Math.acos(-dir.dot(up, dir));
		if(angle + this.speed.theta > 0){
			p.applyAxisAngle(right, this.speed.theta);
		}
		
		p.applyAxisAngle(up, this.speed.phi);
		
		
		// apply zoom
		var radius = radius + radius * 0.05 * this.zoomSpeed;
		p.normalize().multiplyScalar(radius);
		
		// apply pan
		var panX = right.clone().multiplyScalar( -500 * radius * delta * this.panSpeed.x);
		var panY = tilt.clone().multiplyScalar( 500 * radius * delta * this.panSpeed.y);
		
		
		var pos = new THREE.Vector3().addVectors(this.target, p);
		pos.add(panX);
		pos.add(panY);

		
		var proposeTransformEvent = {
			type: "proposeTransform",
			oldPosition: object.position,
			newPosition: pos,
			objections: 0
		};
		this.dispatchEvent(proposeTransformEvent);
		
		if(proposeTransformEvent.objections > 0){
			this.speed.phi = 0;
			this.speed.theta = 0;
			this.zoomSpeed = 0;
			this.panSpeed.multiplyScalar(0);
		}else{
			this.target.add(panX);
			this.target.add(panY);
			
			object.position.copy(pos);
			object.lookAt(this.target);
			
			var attenuation = (1 - delta) * 0.85;
			this.speed.phi *= attenuation;
			this.speed.theta *= attenuation;
			this.zoomSpeed *= attenuation;
			this.panSpeed.multiplyScalar(attenuation);
		}
		
	};

	function onMouseDown( event ) {
		if ( event.button === 0 ) {
			state = STATE.ROTATE;
		} else if ( event.button === 1 ) {
			state = STATE.DOLLY;
		} else if ( event.button === 2 ) {
			state = STATE.PAN;
		}
		
		scope.mouse.set(event.clientX, event.clientY);
		
		scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
	}

	function onMouseMove( event ) {
		event.preventDefault();
		
		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
		
		var newMouse = new THREE.Vector2(event.clientX, event.clientY);
		var diff = new THREE.Vector2().subVectors(newMouse, scope.mouse);
		
		if ( state === STATE.ROTATE ) {
			scope.speed.phi -= diff.x / element.clientWidth;
			scope.speed.theta -= diff.y / element.clientHeight;
		} else if ( state === STATE.DOLLY ) {
			scope.zoomSpeed = 20 * diff.y / element.clientHeight;
		} else if ( state === STATE.PAN ) {
			scope.panSpeed.x = diff.x / element.clientWidth;
			scope.panSpeed.y = diff.y / element.clientHeight;
		}
		
		scope.mouse.copy(newMouse);
	}

	function onMouseUp( /* event */ ) {
		scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
		state = STATE.NONE;
	}

	function onMouseWheel( event ) {
		
		event.preventDefault();
		
		var delta = 0;

		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

			delta = event.wheelDelta;

		} else if ( event.detail !== undefined ) { // Firefox

			delta = - event.detail;

		}
		
		scope.zoomSpeed = -Math.sign(delta);
		
	}

	function onKeyDown( event ) {
		
	}

	function touchstart( event ) {
		if(event.touches.length === 1){
			state = STATE.TOUCH_ROTATE;
			
			scope.mouse.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
		}else if(event.touches.length === 2){
			state = STATE.TOUCH_DOLLY;
			
			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
			var distance = Math.sqrt( dx * dx + dy * dy );
			scope.dollyStart.set( 0, distance );
		}else if(event.touches.length === 3){
			state = STATE.TOUCH_PAN;
			
			scope.mouse.set(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
		}else{
			state = STATE.NONE;
		}
	}

	function touchmove( event ) {
		event.preventDefault();
		event.stopPropagation();
		
		var newMouse = new THREE.Vector2(event.touches[ 0 ].pageX, event.touches[ 0 ].pageY);
		var diff = new THREE.Vector2().subVectors(newMouse, scope.mouse);
		
		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
		
		if(event.touches.length === 1){
		
			if ( state !== STATE.TOUCH_ROTATE ) return;
			
			scope.speed.phi -= diff.x / element.clientWidth;
			scope.speed.theta -= diff.y / element.clientHeight;
		}else if(event.touches.length === 2){
		
			if ( state !== STATE.TOUCH_DOLLY ) return;
			
			var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
			var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
			var distance = Math.sqrt( dx * dx + dy * dy );
            
			var dollyEnd = new THREE.Vector2( 0, distance );
			var diff = new THREE.Vector2().subVectors( dollyEnd, scope.dollyStart );
			
			scope.zoomSpeed = -20 * diff.y / element.clientHeight;
			//scope.zoomSpeed = distance;
			
			document.getElementById("lblMessage").innerHTML = scope.zoomSpeed;
			
			scope.dollyStart.copy( dollyEnd );
			
			//scope.zoomSpeed = 1;
		}else if(event.touches.length === 3){
			
			if ( state !== STATE.TOUCH_PAN ) return;
		
			scope.panSpeed.x = 0.5 * diff.x / element.clientWidth;
			scope.panSpeed.y = 0.5 * diff.y / element.clientHeight;
		}else{
			state = STATE.NONE;
		}
		
		scope.mouse.copy(newMouse);
	}

	function touchend( event ) {
		state = STATE.NONE;
	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );

	this.domElement.addEventListener( 'touchstart', touchstart, false );
	this.domElement.addEventListener( 'touchend', touchend, false );
	this.domElement.addEventListener( 'touchmove', touchmove, false );

	window.addEventListener( 'keydown', onKeyDown, false );

};

Potree.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );