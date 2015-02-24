

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



THREE.EarthControls = function ( object, domElement ) {
	this.object = object;
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

	this.update = function (delta) {
		var position = this.object.position;
		
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
				camera.position.copy(newCamPos);
			}else if(state === STATE.ROTATE){
				var diff = mouseDelta.clone().multiplyScalar(delta);
			
				camera.updateMatrixWorld();	

				var p = new THREE.Object3D();
				var c = new THREE.Object3D();
				p.add(c);
				p.position.copy(pivot);
				c.position.copy(camera.position).sub(pivot);
				c.rotation.copy(camera.rotation);
				
				p.rotation.y += -diff.x;
				
				var dir = new THREE.Vector3().subVectors(pivot, camera.position).normalize();
				var dir = camera.getWorldDirection();
				var up = new THREE.Vector3(0,1,0);
				var side = new THREE.Vector3().cross(up, dir);
				
				p.rotateOnAxis(side, -diff.y);
				
				
				p.updateMatrixWorld();
				
				//camera.position.copy(c.position);
				//camera.rotation.copy(c.rotation);
				
				camera.position.copy(c.getWorldPosition());
				camera.quaternion.copy(c.getWorldQuaternion());


				
				
				//{
				//	var m = new THREE.Matrix4().copy(camera.matrix);
				//	var ry = camera.rotation.y;
				//	
				//	m.multiplyMatrices( new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z), m);
				//	//m.multiplyMatrices( new THREE.Matrix4().makeRotationY(-ry), m);
				//	m.multiplyMatrices( new THREE.Matrix4().makeRotationX(diff.y), m);
				//	//m.multiplyMatrices( new THREE.Matrix4().makeRotationY(ry), m);
				//	m.multiplyMatrices( new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z), m);
				//	
				//	//m.multiplyMatrices( new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z), m);
				//	//m.multiplyMatrices( new THREE.Matrix4().makeRotationY(diff.x), m);
				//	//m.multiplyMatrices( new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z), m);
				//	
				//	camera.matrix.copy(m);
				//	camera.matrix.decompose( camera.position, camera.quaternion, camera.scale );
				//}
				
				
			}
		}
			
		mouseDelta.set(0,0);
	};


	this.reset = function () {
		state = STATE.NONE;

		this.object.position.copy( this.position0 );
	};

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();
		
		// TODO don't use global variables !!!
		var accuracy = 1;
		var mouse =  {
			x: ( event.clientX / scope.domElement.clientWidth ) * 2 - 1,
			y: - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1
		};
		var I = getMousePointCloudIntersection(mouse, camera, renderer, scenePointCloud, accuracy)
		var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), I);
		
		var vec = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
		vec.unproject(camera);
		var dir = vec.sub(camera.position).normalize();
		
		var ray = new THREE.Ray(camera.position, dir);
		pivot = ray.intersectPlane(plane);
		
		//pivot = I;
		camStart = camera.clone();
		camStart.rotation.copy(camera.rotation);
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

		//var direction = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
		//scope.moveSpeed += scope.moveSpeed * 0.1 * direction;
		//scope.moveSpeed = Math.max(0.1, scope.moveSpeed);
		
		var amount = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
		var accuracy = 1;
		var mouse =  {
			x: ( event.clientX / scope.domElement.clientWidth ) * 2 - 1,
			y: - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1
		};
		var I = getMousePointCloudIntersection(mouse, camera, renderer, scenePointCloud, accuracy)
		
		if(I){
			var distance = I.distanceTo(camera.position);
			var dir = new THREE.Vector3().subVectors(I, camera.position).normalize();
			camera.position.add(dir.multiplyScalar(distance * 0.1 * amount));
		}

	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
};

THREE.EarthControls.prototype = Object.create( THREE.EventDispatcher.prototype );