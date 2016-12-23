/**
 * @author mschuetz / http://mschuetz.at/
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
// 
// Adapted from THREE.OrbitControls
//

Potree.OrbitControls = function ( renderer ) {

	this.renderer = renderer;
	this.domElement = renderer.domElement;

	// Set to false to disable this control
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

	////////////
	// internals

	var scope = this;

	var EPS = 0.000001;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var dollyStart = new THREE.Vector2();
	var dollyEnd = new THREE.Vector2();
	var dollyDelta = new THREE.Vector2();

	this.yawDelta = 0;
	this.pitchDelta = 0;
	this.panDelta = new THREE.Vector3();
	var scale = 1;

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

	var state = STATE.NONE;

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};
	
	this.setScene = function(scene){
		this.scene = scene;
	};

	this.rotateLeft = function ( angle ) {
		this.yawDelta -= angle;
	};

	this.rotateUp = function ( angle ) {
		this.pitchDelta -= angle;
	};

	this.dollyIn = function ( dollyScale ) {
		if ( dollyScale === undefined ) {
			dollyScale = getZoomScale();
		}

		scale /= dollyScale;
	};

	this.dollyOut = function ( dollyScale ) {
		if ( dollyScale === undefined ) {
			dollyScale = getZoomScale();
		}

		scale *= dollyScale;
	};

	this.update = function ( delta ) {
		let position = this.scene.view.position.clone();

		offset.copy( position ).sub( this.scene.view.target );

		let yaw = Math.atan2( offset.x, offset.y );
		let pitch = Math.atan2( Math.sqrt( offset.x * offset.x + offset.y * offset.y ), offset.z );

		let progression = Math.min(1, this.fadeFactor * delta);
		
		yaw -= progression * this.yawDelta;
		pitch +=  progression * this.pitchDelta;

		pitch = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, pitch ) );
		pitch = Math.max( EPS, Math.min( Math.PI - EPS, pitch ) );

		let radius = offset.length();
		radius += (scale-1) * radius * progression;

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

		offset.x = radius * Math.sin( pitch ) * Math.sin( yaw );
		offset.z = radius * Math.cos( pitch );
		offset.y = radius * Math.sin( pitch ) * Math.cos( yaw );

		position.copy( newTarget ).add( offset );
		
		// send transformation proposal to listeners
		var proposeTransformEvent = {
			type: "proposeTransform",
			oldPosition: this.scene.view.position,
			newPosition: position,
			objections: 0,
			counterProposals: []
		};
		this.dispatchEvent(proposeTransformEvent);
		
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
			scale = 1;
			this.panDelta.set(0,0,0);
		}else{
			this.scene.view.position.copy(position);
			this.scene.view.target.copy(newTarget);
			
			var attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			
			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			scale = 1 + (scale-1) * attenuation;
			this.panDelta.multiplyScalar( attenuation );
		}

		if (lastPosition.distanceTo(this.scene.view.position) > 0 ) {
			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.scene.view.position );
		}

	};

	function getZoomScale() {
		return Math.pow( 0.95, scope.zoomSpeed );
	}

	function onMouseDown( event ) {

		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === THREE.MOUSE.LEFT ) {
			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );
		} else if ( event.button === THREE.MOUSE.MIDDLE ) {
			state = STATE.DOLLY;

			dollyStart.set( event.clientX, event.clientY );
		} else if ( event.button === THREE.MOUSE.RIGHT ) {
			state = STATE.PAN;

			panStart.set( event.clientX, event.clientY );
		}

		scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
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

		} else if ( state === STATE.DOLLY ) {
			dollyEnd.set( event.clientX, event.clientY );
			dollyDelta.subVectors( dollyEnd, dollyStart );

			if ( dollyDelta.y > 0 ) {

				scope.dollyIn();

			} else {

				scope.dollyOut();

			}

			dollyStart.copy( dollyEnd );

		} else if ( state === STATE.PAN ) {
			panEnd.set( event.clientX, event.clientY );
			let panDelta = new THREE.Vector2().subVectors( panEnd, panStart );
			
			scope.panDelta.x -= panDelta.x;
			scope.panDelta.y += panDelta.y;

			panStart.copy( panEnd );
		}
	}

	function onMouseUp( /* event */ ) {
		if ( scope.enabled === false ) return;

		scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( endEvent );
		state = STATE.NONE;
	}

	function onMouseWheel( event ) {
		if ( scope.enabled === false ) return;

		event.preventDefault();

		var delta = 0;

		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
			delta = event.wheelDelta;
		} else if ( event.detail !== undefined ) { // Firefox
			delta = - event.detail;
		}

		if ( delta > 0 ) {
			scope.dollyOut();
		} else {
			scope.dollyIn();
		}

		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );
	}

	function onKeyDown( event ) {
		if (scope.enabled === false) return;
		
		if(event.keyCode === scope.keys.UP){
			scope.panDelta.y += scope.keyPanSpeed;
		}else if(event.keyCode === scope.keys.BOTTOM){
			scope.panDelta.y -= scope.keyPanSpeed;
		}else if(event.keyCode === scope.keys.LEFT){
			scope.panDelta.x -= scope.keyPanSpeed;
		}else if(event.keyCode === scope.keys.RIGHT){
			scope.panDelta.x += scope.keyPanSpeed;
		}
	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox


	if(this.domElement.tabIndex === -1){
		this.domElement.tabIndex = 2222;
	}
	this.domElement.addEventListener( 'keydown', onKeyDown, false );
	
	
	this.domElement.addEventListener("dblclick", function(event){
		if(scope.scene.pointclouds.length === 0){
			return;
		}
		
		event.preventDefault();
	
		var rect = scope.domElement.getBoundingClientRect();
		
		var mouse =  {
			x: ( (event.clientX - rect.left) / scope.domElement.clientWidth ) * 2 - 1,
			y: - ( (event.clientY - rect.top) / scope.domElement.clientHeight ) * 2 + 1
		};
		
		var pointcloud = null;
		var distance = Number.POSITIVE_INFINITY;
		var I = null;
		
		for(var i = 0; i < scope.scene.pointclouds.length; i++){
			let intersection = Potree.utils.getMousePointCloudIntersection(mouse, scope.scene.camera, scope.renderer, [scope.scene.pointclouds[i]]);
			if(!intersection){
				continue;
			}
			
			var tDist = scope.scene.camera.position.distanceTo(intersection);
			if(tDist < distance){
				pointcloud = scope.scene.pointclouds[i];
				distance = tDist;
				I = intersection;
			}
		}
		
		if(I != null){
		
			var targetRadius = 0;
			if(!scope.jumpDistance){
				var camTargetDistance = scope.scene.camera.position.distanceTo(scope.scene.view.target);
			
				var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
				vector.unproject(scope.scene.camera);
    
				var direction = vector.sub(scope.scene.camera.position).normalize();
				var ray = new THREE.Ray(scope.scene.camera.position, direction);
				
				var nodes = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);
				var lastNode = nodes[nodes.length - 1];
				var radius = lastNode.getBoundingSphere().radius;
				var targetRadius = Math.min(camTargetDistance, radius);
				var targetRadius = Math.max(scope.minimumJumpDistance, targetRadius);
			}else{
				targetRadius = scope.jumpDistance;
			}
			
			var d = scope.scene.camera.getWorldDirection().multiplyScalar(-1);
			var cameraTargetPosition = new THREE.Vector3().addVectors(I, d.multiplyScalar(targetRadius));
			var controlsTargetPosition = I;
			
			var animationDuration = 600;
			
			var easing = TWEEN.Easing.Quartic.Out;
			
			scope.enabled = false;
			
			// animate position
			var tween = new TWEEN.Tween(scope.scene.view.position).to(cameraTargetPosition, animationDuration);
			tween.easing(easing);
			tween.start();
			
			// animate target
			var tween = new TWEEN.Tween(scope.scene.view.target).to(I, animationDuration);
			tween.easing(easing);
			tween.onComplete(function(){
				scope.enabled = true;
				
				if(scope.moveSpeed){
					scope.fpControls.moveSpeed = radius / 2;
					scope.geoControls.moveSpeed = radius / 2;
				}
			}.bind(this));
			tween.start();
		}
	}.bind(this));

};

Potree.OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );