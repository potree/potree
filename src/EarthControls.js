

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

THREE.EarthControls = function ( camera, domElement, renderer ) {
	this.camera = camera;
	this.renderer = renderer;
	this.pointclouds = [];
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	
	// Set to false to disable this control
	this.enabled = true;

	var scope = this;
	

	var STATE = { NONE : -1, DRAG : 0, ROTATE: 1 };

	var state = STATE.NONE;
	
	var dragStart = new THREE.Vector2();
	var dragEnd = new THREE.Vector2();
	
	var mouseDelta = new THREE.Vector2();
	
	var camStart = null;
	var pivot = null;
	
	
	this.minAngle = (10 / 180) * Math.PI;	// 10°
	this.maxAngle = (70 / 180) * Math.PI;	// 70°

	this.update = function (delta) {
		var position = this.camera.position;
		
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
				
				var newCamPos = new THREE.Vector3().subVectors(pivot, dir.clone().multiplyScalar(distanceToPlane));
				this.camera.position.copy(newCamPos);
			}else if(state === STATE.ROTATE){
				// rotate around pivot point
			
				var diff = mouseDelta.clone().multiplyScalar(delta);
			
				this.camera.updateMatrixWorld();	

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
				
				this.camera.position.copy(c.getWorldPosition());
				this.camera.quaternion.copy(c.getWorldQuaternion());

			}
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
		
		var accuracy = 1;
		var mouse =  {
			x: ( event.clientX / scope.domElement.clientWidth ) * 2 - 1,
			y: - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1
		};
		var I = getMousePointCloudIntersection(mouse, scope.camera, scope.renderer, scope.pointclouds, accuracy)
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
		dragStart.set( event.clientX, event.clientY );
		dragEnd.set(event.clientX, event.clientY);

		if ( event.button === 0 ) {
			state = STATE.DRAG;
		} else if ( event.button === 2 ) {
			state = STATE.ROTATE;
		}
        
		scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
	}

	function onMouseMove( event ) {
		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		mouseDelta.set(event.clientX - dragEnd.x, event.clientY - dragEnd.y);
		dragEnd.set(event.clientX, event.clientY);
		
	}

	function onMouseUp() {
		if ( scope.enabled === false ) return;

		scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
		scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
		state = STATE.NONE;

	}

	function onMouseWheel(event) {
		if ( scope.enabled === false || scope.noZoom === true ) return;

		event.preventDefault();

		var amount = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
		var accuracy = 1;
		var mouse =  {
			x: ( event.clientX / scope.domElement.clientWidth ) * 2 - 1,
			y: - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1
		};
		var I = getMousePointCloudIntersection(mouse, scope.camera, scope.renderer, scope.pointclouds, accuracy)
		
		if(I){
			var distance = I.distanceTo(scope.camera.position);
			var dir = new THREE.Vector3().subVectors(I, scope.camera.position).normalize();
			scope.camera.position.add(dir.multiplyScalar(distance * 0.1 * amount));
		}

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
};

THREE.EarthControls.prototype = Object.create( THREE.EventDispatcher.prototype );