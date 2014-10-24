
function initSignals(){
	viewerControls = new ViewerControls(renderer.domElement, camera, scene);
	
	measuringControl = new Potree.MeasuringControls(scene, camera);
	viewerControls.addControl(measuringControl);
	
	
	viewerControls.addControl(translationTool); 
	
	
	var firstPersonControls = new THREE.FirstPersonControls(camera, renderer.domElement);
	firstPersonControls.moveSpeed *= 10;
	viewerControls.addControl(firstPersonControls);
}


ViewerControls = function(element, camera, scene){

	var scope = this;
	
	this.mouse = {x: 0, y: 0};
	this.element = element;
	this.camera = camera;
	this.scene = scene;

	this.events = {
		mousemove : new signals.Signal(),
		mouseclick : new signals.Signal(),
		mousedown : new signals.Signal(),
		mouseup : new signals.Signal(),
		mousewheel : new signals.Signal(),
		dblclick : new signals.Signal(),
		update : new signals.Signal(),
		keydown: new signals.Signal(),
		keyup: new signals.Signal()
	};
	
	
	
	this.addControl = function(control){
		if(control.onMouseMove !== undefined){
			scope.events.mousemove.add(control.onMouseMove);
		}
		
		if(control.onMouseClick !== undefined){
			scope.events.mouseclick.add(control.onMouseClick);
		}
		
		if(control.onMouseDown !== undefined){
			scope.events.mousedown.add(control.onMouseDown);
		}
		
		if(control.onMouseUp !== undefined){
			scope.events.mouseup.add(control.onMouseUp);
		}		
		
		if(control.onMouseWheel !== undefined){
			scope.events.mousewheel.add(control.onMouseWheel);
		}
		
		if(control.onDoubleClick !== undefined){
			scope.events.dblclick.add(control.onDoubleClick);
		}
		
		if(control.update !== undefined){
			scope.events.update.add(control.update);
		}
		
		if(control.onKeyDown !== undefined){
			scope.events.keydown.add(control.onKeyDown);
		}
		
		if(control.onKeyUp !== undefined){
			scope.events.keyup.add(control.onKeyUp);
		}
	}
	
	this.onMouseMove = function(event){
		scope.mouse.x = ( event.clientX / scope.element.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.element.clientHeight ) * 2 + 1;
	
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		var projector = new THREE.Projector();
		projector.unprojectVector( vector, scope.camera );
		
		scope.mouse.relativePosition = {x: event.clientX, y: event.clientY};
		scope.mouse.normalizedPosition = {x: scope.mouse.x, y: scope.mouse.y};
		scope.mouse.scenePosition = vector;
		
		var message = {
			relativePosition: scope.mouse.relativePosition,
			normalizedPosition: scope.mouse.normalizedPosition,
			scenePosition: scope.mouse.scenePosition,
			signal: scope.events.mousemove
		};
	
		scope.events.mousemove.dispatch(message);
	}
	
	this.onMouseClick = function(event){
		var message = {
			
		};
	
		scope.events.mouseclick.dispatch(message);
	}
	
	this.onDoubleClick = function(event){

		var message = {
			relativePosition: scope.mouse.relativePosition,
			normalizedPosition: scope.mouse.normalizedPosition,
			scenePosition: scope.mouse.scenePosition
		};

	
		scope.events.dblclick.dispatch(message);
	}
	
	this.onMouseDown = function(event){
		event.preventDefault();
	
		var message = {
			which: event.which,
			button: event.button,
			relativePosition: scope.mouse.relativePosition,
			normalizedPosition: scope.mouse.normalizedPosition,
			scenePosition: scope.mouse.scenePosition,
			signal: scope.events.mousedown
		};
	
		scope.events.mousedown.dispatch(message);
	}
	
	this.onMouseUp = function(event){
		event.preventDefault();
	
		var message = {
			
		};
	
		scope.events.mouseup.dispatch(message);
	}
	
	this.update = function(time){
		var message = {
			time: time
		};
	
		scope.events.update.dispatch(message);
	}

	this.onKeyDown = function(event){
		var message = {
			keyCode: event.keyCode
		};
	
		scope.events.keydown.dispatch(message);
	}
	
	this.onKeyUp = function(event){
		var message = {
			keyCode: event.keyCode
		};
	
		scope.events.keyup.dispatch(message);
	}
	
	this.onContextMenu = function(event){
		event.preventDefault();
	}
	
	this.onMouseWheel = function(event){
		event.preventDefault();
	
		var delta = 0;
		if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
			delta = event.wheelDelta;
		} else if ( event.detail !== undefined ) { // Firefox
			delta = - event.detail;
		}
	
		var message = {
			delta: delta
		};
		
		scope.events.mousewheel.dispatch(message);
	}
	

	element.addEventListener("mousemove", this.onMouseMove);
	element.addEventListener("click", this.onMouseClick);
	element.addEventListener("dblclick", this.onDoubleClick);
	element.addEventListener("mousedown", this.onMouseDown);
	element.addEventListener("mouseup", this.onMouseUp);
	element.addEventListener("contextmenu", this.onContextMenu);
	element.addEventListener("mousewheel", this.onMouseWheel);
	
	window.addEventListener("keydown", this.onKeyDown);
	window.addEventListener("keyup", this.onKeyUp);
};











































Potree.MeasuringControls = function(scene, camera){
	
	var scope = this;
	
	this.scene = scene;
	this.camera = camera;

	this.mouse = {x: 0, y: 0};
	
	var STATE = {
		DEFAULT: 0,
		PICKING: 1
	};
	
	var state = STATE.DEFAULT;
	
	this.activeMeasurement;
	this.measurements = [];
	this.sceneMeasurement = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneMeasurement.add(this.sceneRoot);
	
	function Measure(){
		this.points = [];
		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = [];
	}

	
	this.onDoubleClick = function(event){
		var I = getMousePointCloudIntersection(event.normalizedPosition);
		if(I){
			var pos = I.clone();
		
			var sphereMaterial = new THREE.MeshNormalMaterial({shading: THREE.SmoothShading})
			var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
			
			var sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
			sphere.position.copy(I);
			scope.sceneRoot.add(sphere);
			
			var sphereEnd = new THREE.Mesh(sphereGeometry, sphereMaterial);
			sphereEnd.position.copy(I);
			scope.sceneRoot.add(sphereEnd);
			
			var msg = pos.x.toFixed(2) + " / " + pos.y.toFixed(2) + " / " + pos.z.toFixed(2);
			
			var label = new Potree.TextSprite(msg);
			label.setBorderColor({r:0, g:255, b:0, a:1.0});
			label.material.depthTest = false;
			label.material.opacity = 0;
			label.position.copy(I);
			label.position.y += 0.5;
			scope.sceneRoot.add( label );
			
			var labelEnd = new Potree.TextSprite(msg);
			labelEnd.setBorderColor({r:0, g:255, b:0, a:1.0});
			labelEnd.material.depthTest = false;
			labelEnd.material.opacity = 0;
			labelEnd.position.copy(I);
			labelEnd.position.y += 0.5;
			scope.sceneRoot.add( labelEnd );
			
			var lc = new THREE.Color( 0xff0000 );
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(I.clone(), I.clone());
			lineGeometry.colors.push(lc, lc, lc);
			var lineMaterial = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors } );
			lineMaterial.depthTest = false;
			sConnection = new THREE.Line(lineGeometry, lineMaterial);
			scope.sceneRoot.add(sConnection);
			
			var edgeLabel = new Potree.TextSprite(0);
			edgeLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.material.depthTest = false;
			edgeLabel.position.copy(I);
			edgeLabel.position.y += 0.5;
			scope.sceneRoot.add( edgeLabel );
			
			
			//floatingOrigin.addReferenceFrame(sphere);
			//floatingOrigin.addReferenceFrame(sphereEnd);
			//floatingOrigin.addReferenceFrame(label);
			//floatingOrigin.addReferenceFrame(labelEnd);
			//floatingOrigin.addReferenceFrame(sConnection);
			//floatingOrigin.addReferenceFrame(edgeLabel);
			
			if(state === STATE.DEFAULT){
				state = STATE.PICKING;
				scope.activeMeasurement = new Measure();
				
				scope.activeMeasurement.spheres.push(sphere);
			}else if(state === STATE.PICKING){
			
			}
			
			scope.activeMeasurement.points.push(I);
			
			scope.activeMeasurement.spheres.push(sphereEnd);
			scope.activeMeasurement.sphereLabels.push(label);
			scope.activeMeasurement.sphereLabels.push(labelEnd);
			scope.activeMeasurement.edges.push(sConnection);
			scope.activeMeasurement.edgeLabels.push(edgeLabel);
			
			
			var event = {
				type: 'newpoint',
				position: pos.clone()
			};
			scope.dispatchEvent(event);
			
		}
	};
	
	this.onMouseMove = function(event){
		
		if(state == STATE.PICKING && scope.activeMeasurement){
			var I = getMousePointCloudIntersection(event.normalizedPosition);
			
			if(I){
				var pos = I.clone();
				var l = scope.activeMeasurement.spheres.length;
				var sphere = scope.activeMeasurement.spheres[l-1];
				var label = scope.activeMeasurement.sphereLabels[l-1];
				var edge = scope.activeMeasurement.edges[l-2];
				var edgeLabel = scope.activeMeasurement.edgeLabels[l-2];
				
				var msg = pos.x.toFixed(2) + " / " + pos.y.toFixed(2) + " / " + pos.z.toFixed(2);
				label.setText(msg);
				
				sphere.position.copy(I);
				label.position.copy(I);
				label.position.y += 0.5;
				
				edge.geometry.vertices[1].copy(I);
				edge.geometry.verticesNeedUpdate = true;
				edge.geometry.computeBoundingSphere();
				
				var edgeLabelPos = edge.geometry.vertices[1].clone().add(edge.geometry.vertices[0]).multiplyScalar(0.5);
				var edgeLabelText = edge.geometry.vertices[0].distanceTo(edge.geometry.vertices[1]).toFixed(2);
				edgeLabel.position.copy(edgeLabelPos);
				edgeLabel.setText(edgeLabelText);
				edgeLabel.scale.multiplyScalar(10);
			}
			
		}
	};
	
	this.onRightClick = function(event){
		if(state == STATE.PICKING){
			var sphere = scope.activeMeasurement.spheres.pop();
			var edge = scope.activeMeasurement.edges.pop();
			var sphereLabel = scope.activeMeasurement.sphereLabels.pop();
			var edgeLabel = scope.activeMeasurement.edgeLabels.pop();
			
			scope.sceneRoot.remove(sphere);
			scope.sceneRoot.remove(edge);
			scope.sceneRoot.remove(sphereLabel);
			scope.sceneRoot.remove(edgeLabel);
		
			scope.measurements.push(scope.activeMeasurement);
			scope.activeMeasurement = undefined;
		
			state = STATE.DEFAULT;
		}
	}
	
	this.onMouseDown = function(event){
		if(event.which === 3){	
			scope.onRightClick(event);
		}
	}
	
	function getMousePointCloudIntersection(mouse){
		var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
		var projector = new THREE.Projector();
		projector.unprojectVector( vector, scope.camera );
		
		var raycaster = new THREE.Raycaster();
		raycaster.params = {"PointCloud" : {threshold: 1}};
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree){
				pointClouds.push(object);
			}
		});
		
		var intersects = raycaster.intersectObjects(pointClouds, true);
		
		if(intersects.length > 0){
			var I = intersects[0];			
			
			return I.point;
		}else{
			return undefined;
		}
	}
};


Potree.MeasuringControls.prototype = Object.create( THREE.EventDispatcher.prototype );














































THREE.FirstPersonControls = function ( object, domElement ) {
	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	
	// Set to false to disable this control
	this.enabled = true;

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
		W: 'W'.charCodeAt(0)
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

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, SPEEDCHANGE : 1, PAN : 2 };

	var state = STATE.NONE;

	// for reset
	this.position0 = this.object.position.clone();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};

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

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 8 ], te[ 9 ], te[ 10 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

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
			console.warn( 'WARNING: FirstPersonControls.js encountered an unknown camera type - pan disabled.' );
		}
	};

	this.update = function (event) {
		var delta = event.time;
		var position = scope.object.position;
		
		if(delta !== undefined){
			if(scope.moveRight){
				scope.panLeft(-delta * scope.moveSpeed);
			}
			if(scope.moveLeft){
				scope.panLeft(delta * scope.moveSpeed);
			}
			if(scope.moveForward){
				scope.panForward(-delta * scope.moveSpeed);
			}
			if(scope.moveBackward){
				scope.panForward(delta * scope.moveSpeed);
			}
		}
		
		if(!pan.equals(new THREE.Vector3(0,0,0))){
			var event = {
				type: 'move',
				translation: pan.clone()
			};
			scope.dispatchEvent(event);
		}
		
		position.add(pan);
		
		scope.object.updateMatrix();
		var rot = new THREE.Matrix4().makeRotationY(thetaDelta);
		var res = new THREE.Matrix4().multiplyMatrices(rot, scope.object.matrix);
		scope.object.quaternion.setFromRotationMatrix(res);
		
		scope.object.rotation.x += phiDelta;

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set( 0, 0, 0 );

		if ( lastPosition.distanceTo( scope.object.position ) > 0 ) {
			scope.dispatchEvent( changeEvent );

			lastPosition.copy( scope.object.position );
		}
	};


	this.reset = function () {
		state = STATE.NONE;

		this.object.position.copy( this.position0 );
	};

	this.onMouseDown = function( event ) {
		if ( scope.enabled === false ) return;

		if ( event.button === 0 ) {
			state = STATE.ROTATE;

			rotateStart.set( event.relativePosition.x, event.relativePosition.y );
		} else if ( event.button === 2 ) {
			state = STATE.PAN;

			panStart.set( event.relativePosition.x, event.relativePosition.y );
		}

		scope.dispatchEvent( startEvent );
	}

	this.onMouseMove = function( event ) {
		if ( scope.enabled === false ) return;

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( state === STATE.ROTATE ) {
			rotateEnd.set( event.relativePosition.x, event.relativePosition.y );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.PAN ) {
			panEnd.set( event.relativePosition.x, event.relativePosition.y );
			panDelta.subVectors( panEnd, panStart );
			panDelta.multiplyScalar(0.0005).multiplyScalar(scope.moveSpeed);
			
			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );
		}
	}

	this.onMouseUp = function() {
		if ( scope.enabled === false ) return;

		scope.dispatchEvent( endEvent );
		state = STATE.NONE;

	}

	this.onMouseWheel = function(event) {
		if ( scope.enabled === false || scope.noZoom === true ) return;

		scope.moveSpeed += scope.moveSpeed * 0.001 * event.delta;
		scope.moveSpeed = Math.max(0.1, scope.moveSpeed);

		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );
	}

	this.onKeyDown = function( event ) {
		if ( scope.enabled === false) return;
		
		switch ( event.keyCode ) {
			case scope.keys.UP: scope.moveForward = true; break;
			case scope.keys.BOTTOM: scope.moveBackward = true; break;
			case scope.keys.LEFT: scope.moveLeft = true; break;
			case scope.keys.RIGHT: scope.moveRight = true; break;
			case scope.keys.W: scope.moveForward = true; break;
			case scope.keys.S: scope.moveBackward = true; break;
			case scope.keys.A: scope.moveLeft = true; break;
			case scope.keys.D: scope.moveRight = true; break;			
		}
	}
	
	this.onKeyUp = function( event ) {
		switch ( event.keyCode ) {
			case scope.keys.W: scope.moveForward = false; break;
			case scope.keys.S: scope.moveBackward = false; break;
			case scope.keys.A: scope.moveLeft = false; break;
			case scope.keys.D: scope.moveRight = false; break;
			case scope.keys.UP: scope.moveForward = false; break;
			case scope.keys.BOTTOM: scope.moveBackward = false; break;
			case scope.keys.LEFT: scope.moveLeft = false; break;
			case scope.keys.RIGHT: scope.moveRight = false; break;
		}
	}

};

THREE.FirstPersonControls.prototype = Object.create( THREE.EventDispatcher.prototype );