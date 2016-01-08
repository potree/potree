

/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 * Navigation similar to Google Earth.
 *
 * left mouse: Drag with respect to intersection
 * wheel: zoom towards/away from intersection
 * right mouse: Rotate camera around intersection
 *
 *
 */

THREE.EarthControls = function ( camera, renderer, scene ) {
	this.camera = camera;
	this.renderer = renderer;
	this.pointclouds = [];
	this.domElement = renderer.domElement;
	this.scene = scene;
	
	// Set to false to disable this control
	this.enabled = true;

	var scope = this;
	

	var STATE = { NONE : -1, DRAG : 0, ROTATE: 1 };

	var state = STATE.NONE;
	
	var dragStart = new THREE.Vector2();
	var dragEnd = new THREE.Vector2();
	
	var sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
	var sphereMaterial = new THREE.MeshNormalMaterial({shading: THREE.SmoothShading, transparent: true, opacity: 0.5});
	this.pivotNode = new THREE.Mesh(sphereGeometry, sphereMaterial);

	var mouseDelta = new THREE.Vector2();
	
	var camStart = null;
	var pivot = null;
	
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};
	
	this.minAngle = (10 / 180) * Math.PI;	// 10°
	this.maxAngle = (70 / 180) * Math.PI;	// 70°

	this.update = function (delta) {
		var position = this.camera.position;
		this.camera.updateMatrixWorld();	
		
		var proposal = new THREE.Object3D();
		proposal.position.copy(this.camera.position);
		proposal.rotation.copy(this.camera.rotation);
		proposal.updateMatrix();
		proposal.updateMatrixWorld();
		
		if(pivot){
			if(state === STATE.DRAG){
				var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), pivot);
				var mouse = {
					x:   ( dragEnd.x / this.domElement.clientWidth  ) * 2 - 1,
					y: - ( dragEnd.y / this.domElement.clientHeight ) * 2 + 1
				};
				
				var vec = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
				vec.unproject(camStart);
				var dir = vec.sub(camStart.position).normalize();
				
				var ray = new THREE.Ray(camStart.position, dir);
				var distanceToPlane = ray.distanceToPlane(plane);
				
				if(distanceToPlane > 0){
					var newCamPos = new THREE.Vector3().subVectors(pivot, dir.clone().multiplyScalar(distanceToPlane));
					proposal.position.copy(newCamPos);
				}
				
				
			}else if(state === STATE.ROTATE){
				// rotate around pivot point
			
				var diff = mouseDelta.clone().multiplyScalar(delta);
				diff.x *= 0.3;
				diff.y *= -0.2;
			

				// do calculations on fresh nodes 
				var p = new THREE.Object3D();
				var c = new THREE.Object3D();
				p.add(c);
				p.position.copy(pivot);
				c.position.copy(this.camera.position).sub(pivot);
				c.rotation.copy(this.camera.rotation);
				
				
				// rotate left/right
				p.rotation.y += -diff.x;
				
				
				// rotate up/down
				var dir = this.camera.getWorldDirection();
				var up = new THREE.Vector3(0,1,0);
				var side = new THREE.Vector3().crossVectors(up, dir);

				var dirp = c.position.clone();
				dirp.y = 0;
				dirp.normalize();
				var ac = dirp.dot(c.position.clone().normalize());
				var angle = Math.acos(ac);
				if(c.position.y < 0){
					angle = -angle;
				}
				
				var amount = 0;
				if(diff.y > 0){
					// rotate downwards and apply minAngle limit
					amount = diff.y - Math.max(0, this.minAngle - (angle - diff.y));
				}else{
					// rotate upwards and apply maxAngle limit
					amount = diff.y + Math.max(0, (angle - diff.y) - this.maxAngle);
				}
				p.rotateOnAxis(side, -amount);
				
				// apply changes to object
				p.updateMatrixWorld();
				
				proposal.position.copy(c.getWorldPosition());
				proposal.quaternion.copy(c.getWorldQuaternion());

			}
			
			var proposeTransformEvent = {
				type: "proposeTransform",
				oldPosition: this.camera.position,
				newPosition: proposal.position,
				objections: 0
			};
			this.dispatchEvent(proposeTransformEvent);
			
			if(proposeTransformEvent.objections > 0){
				
			}else{
				this.camera.position.copy(proposal.position);
				this.camera.rotation.copy(proposal.rotation);
			}
			
			var wp = this.pivotNode.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
			var w = Math.abs(wp.z  / 30);
			var l = this.pivotNode.scale.length();
			this.pivotNode.scale.multiplyScalar(w / l);
		}
		
		
			
		mouseDelta.set(0,0);
	};


	this.reset = function () {
		state = STATE.NONE;

		this.camera.position.copy( this.position0 );
	};

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		
		var rect = scope.domElement.getBoundingClientRect();
		
		var mouse =  {
			x: ( (event.clientX - rect.left) / scope.domElement.clientWidth ) * 2 - 1,
			y: - ( (event.clientY - rect.top) / scope.domElement.clientHeight ) * 2 + 1
		};
		var I = getMousePointCloudIntersection(mouse, scope.camera, scope.renderer, scope.pointclouds);
		if(!I){
			return;
		}

		var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), I);
		
		var vec = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
		vec.unproject(scope.camera);
		var dir = vec.sub(scope.camera.position).normalize();
		
		var ray = new THREE.Ray(scope.camera.position, dir);
		pivot = ray.intersectPlane(plane);
		
		//pivot = I;
		camStart = scope.camera.clone();
		camStart.rotation.copy(scope.camera.rotation);
		dragStart.set( event.clientX - rect.left, event.clientY - rect.top);
		dragEnd.set(event.clientX - rect.left, event.clientY - rect.top);
		
		
		scope.scene.add(scope.pivotNode);
		scope.pivotNode.position.copy(pivot);

		if ( event.button === THREE.MOUSE.LEFT ) {
			state = STATE.DRAG;
		} else if ( event.button === THREE.MOUSE.RIGHT ) {
			state = STATE.ROTATE;
		}
        
		scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( startEvent );
	}

	function onMouseMove( event ) {
		if ( scope.enabled === false ) return;

		event.preventDefault();
		
		var rect = scope.domElement.getBoundingClientRect();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		mouseDelta.set(event.clientX - rect.left - dragEnd.x, event.clientY - rect.top - dragEnd.y);
		dragEnd.set(event.clientX - rect.left, event.clientY - rect.top);
		
	}

	function onMouseUp() {
		if ( scope.enabled === false ) return;

		scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
		state = STATE.NONE;
		
		//scope.dragStartIndicator.style.display = "none";
		scope.scene.remove(scope.pivotNode);
		
		scope.dispatchEvent( endEvent );
	}

	function onMouseWheel(event) {
		if ( scope.enabled === false || scope.noZoom === true ) return;

		event.preventDefault();
		
		var rect = scope.domElement.getBoundingClientRect();

		var amount = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
		var mouse =  {
			x: ( (event.clientX - rect.left) / scope.domElement.clientWidth ) * 2 - 1,
			y: - ( (event.clientY - rect.top) / scope.domElement.clientHeight ) * 2 + 1
		};
		var I = getMousePointCloudIntersection(mouse, scope.camera, scope.renderer, scope.pointclouds);
		
		if(I){
			var distance = I.distanceTo(scope.camera.position);
			var dir = new THREE.Vector3().subVectors(I, scope.camera.position).normalize();
			scope.camera.position.add(dir.multiplyScalar(distance * 0.1 * amount));	
		}
		
		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
};

THREE.EarthControls.prototype = Object.create( THREE.EventDispatcher.prototype );