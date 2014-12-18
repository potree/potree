
Potree.ProfileTool = function(scene, camera, renderer){

	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.camera = camera;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	this.accuracy = 0.5;
	
	var STATE = {
		DEFAULT: 0,
		PICKING_START: 1,
		PICKING_END: 2
	};
	
	var state = STATE.DEFAULT;
	
	this.activeProfile;
	this.profiles = [];
	this.sceneProfile = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneProfile.add(this.sceneRoot);
	
	this.hoveredElement = null;
	
	function Profile(root){
		this.root = root;
		
		this.start = new THREE.Vector3();
		this.end = new THREE.Vector3();
		this.width = 10;
		this.depth = 2;
		this.height = 20;
		
		var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		var cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16, 15);
	
		var boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.3});
		var startHandleMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
		var endHandleMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
		
		this.profileNode = new THREE.Object3D();
		
		this.box = new THREE.Mesh(boxGeometry, boxMaterial);
		this.box.scale.set(10, 10, 10);
		
		this.startHandle = new THREE.Mesh(cylinderGeometry, startHandleMaterial);
		this.endHandle = new THREE.Mesh(cylinderGeometry, endHandleMaterial);
		
		var moveEvent = function(event){
			if(!scope.dragstart){
				event.target.material.color.setHex(0xffff00);
			}
		};
		
		var leaveEvent = function(event){
			if(!scope.dragstart){
				event.target.material.color.setHex(0xff0000);
			}
		};
		
		var dragEvent = function(event){
			event.event.stopImmediatePropagation();
			
			
			var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
			vector.unproject(scope.camera);
			
			//var raycaster = new THREE.Raycaster();
			//raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
			
			var ray = new THREE.Ray(scope.camera.position, vector.sub( scope.camera.position ).normalize());
			
			var plane = new THREE.Plane();
			plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), scope.dragstart.sceneClickPos);
			//var intersections = raycaster.intersectObject(plane, true);
			var distance = ray.distanceToPlane(plane);
			
			if(distance){
				var I = ray.at(distance);
				
				for(var i = 0; i < scope.profiles.length; i++){
					var profile = scope.profiles[i];
					
					if(scope.dragstart.object === profile.startHandle){
						//profile.setStart(I);
						var pos = I.clone();
						pos.y = profile.start.y;
						profile.setStart(pos);
					}else if(scope.dragstart.object === profile.endHandle){
						//profile.setEnd(I);
						var pos = I.clone();
						pos.y = profile.end.y;
						profile.setEnd(pos);
					}
				}   
			}
			
			scope.dragstart.object.material.color.setHex(0xffff00);

			
			//var I = getMousePointCloudIntersection();
			//	
			//if(I){
			//	for(var i = 0; i < scope.profiles.length; i++){
			//		var profile = scope.profiles[i];
			//		
			//		if(scope.dragstart.object === profile.startHandle){
			//			
			//		}else if(scope.dragstart.object === profile.endHandle){
			//		
			//		}
			//	}
			//
			//}
			
		};
		
		var dropEvent = function(event){
			scope.dragstart.object.material.color.setHex(0xff0000);
		};
		
		this.startHandle.addEventListener("mousemove", moveEvent);
		this.startHandle.addEventListener("mouseleave", leaveEvent);
		this.startHandle.addEventListener("mousedrag", dragEvent);
		this.startHandle.addEventListener("drop", dropEvent);
		
		this.endHandle.addEventListener("mousemove", moveEvent);
		this.endHandle.addEventListener("mouseleave", leaveEvent);
		this.endHandle.addEventListener("mousedrag", dragEvent);
		this.endHandle.addEventListener("drop", dropEvent);
		
		
		this.profileNode.add(this.box);
		this.profileNode.add(this.startHandle);
		this.profileNode.add(this.endHandle);
		
		this.root.add(this.profileNode);
		
		this.setCoordinates = function(start, end){
			var width = start.clone().setY(0).distanceTo(end.clone().setY(0));
			var height = Math.abs(end.y - start.y) + 20;
			
			this.setDimension(width, height, this.depth);
			
			var center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
			var diff = new THREE.Vector3().subVectors(end, start);
			var target = new THREE.Vector3(diff.z, 0, -diff.x);
			
			this.profileNode.position.set(0,0,0);
			this.profileNode.lookAt(target);
			this.profileNode.position.copy(center);
			
			this.startHandle.position.x = width / 2;
			this.endHandle.position.x = -width / 2;
			this.startHandle.scale.y = height;
			this.endHandle.scale.y = height;
			
			this.start = start;
			this.end = end;
		};
		
		this.setStart = function(start){
			this.setCoordinates(start, this.end);
		};
		
		this.setEnd = function(end){
			this.setCoordinates(this.start, end);
		};
		
		this.setDimension = function(width, height, depth){
			this.width = width;
			this.height = height;
			this.depth =  depth;
			
			this.box.scale.set(width, height, depth);
		};
		
		
	};
	
	
	function onClick(event){
		if(state === STATE.PICKING_START){
			state = STATE.PICKING_END;
		}else if(state === STATE.PICKING_END){
			scope.finishPicking();
		}
	};
	
	function onMouseMove(event){
		scope.mouse.x = ( event.clientX / scope.domElement.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1;
		
		if(scope.dragstart){
			
			scope.dragstart.object.dispatchEvent({type: "mousedrag", event: event});
			
		}if(state == STATE.PICKING_START && scope.activeProfile){
			var I = getMousePointCloudIntersection();
			
			if(I){
				scope.activeProfile.setStart(I);
				scope.activeProfile.setEnd(I);
			}
			
		}else if(state == STATE.PICKING_END && scope.activeProfile){
			var I = getMousePointCloudIntersection();
			
			if(I){
				scope.activeProfile.setEnd(I);
			}
			
		}else{
			var I = getHoveredElement();
			
			if(I){
				
				I.object.dispatchEvent({type: "mousemove", target: I.object, event: event});
				
				if(scope.hoveredElement && scope.hoveredElement !== I.object){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = I.object;
				
			}else{
			
				if(scope.hoveredElement){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = null;
			
			}
		}
	};
	
	
	function onRightClick(event){
	
	};
	
	
	function onMouseDown(event){
		if(event.which === 1){
			
			var I = getHoveredElement();
			
			if(I){
				
				scope.dragstart = {
					object: I.object, 
					sceneClickPos: I.point,
					sceneStartPos: scope.sceneRoot.position.clone(),
					mousePos: {x: scope.mouse.x, y: scope.mouse.y}
				};
				
			}
			
		}else if(event.which === 3){	
			onRightClick(event);
		}
	};
	
	
	function onMouseUp(event){
	
		if(scope.dragstart){
			scope.dragstart.object.dispatchEvent({type: "drop", event: event});
			scope.dragstart = null;
		}
	
	};
	
	function getHoveredElement(){
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var objects = [];
		for(var i = 0; i < scope.profiles.length; i++){
			var profile = scope.profiles[i];
			
			objects.push(profile.startHandle);
			objects.push(profile.endHandle);
		}
		
		var intersections = raycaster.intersectObjects(objects, true);
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	function getMousePointCloudIntersection(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);

		var direction = vector.sub(scope.camera.position).normalize();
		var ray = new THREE.Ray(scope.camera.position, direction);
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree){
				pointClouds.push(object);
			}
		});
		
		var closestPoint = null;
		var closestPointDistance = null;
		
		for(var i = 0; i < pointClouds.length; i++){
			var pointcloud = pointClouds[i];
			var point = pointcloud.pick(scope.renderer, scope.camera, ray, {accuracy: scope.accuracy});
			
			if(!point){
				continue;
			}
			
			var distance = scope.camera.position.distanceTo(point.position);
			
			if(!closestPoint || distance < closestPointDistance){
				closestPoint = point;
				closestPointDistance = distance;
			}
		}
		
		return closestPoint ? closestPoint.position : null;
	};
	
	
	this.startPicking = function(){
		if(state === STATE.PICKING_START){
			return ;
		}
		
		state = STATE.PICKING_START;
		
		scope.activeProfile = new Profile(scope.sceneRoot);
	};
	
	this.finishPicking = function(){
		this.profiles.push(this.activeProfile);
		
		this.activeVolume = null;
		state = STATE.DEFAULT;
	};
	
	this.update = function(){
		//var profiles = [];
		//for(var i = 0; i < this.profiles.length; i++){
		//	profiles.push(this.profiles[i]);
		//}
		//if(this.activeProfile){
		//	profiles.push(this.activeProfile);
		//}
		//
		//for(var i = 0; i < profiles.length; i++){
		//	var profile = profiles[i];
		//	
		//	var start = profile.startHandle;
		//	var wp = start.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
		//	var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
		//	var w = Math.abs((wp.z  / 150)); // * (2 - pp.z / pp.w);
		//	start.scale.set(w, start.scale.y, w);
		//	
		//	var end = profile.endHandle;
		//	var wp = end.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
		//	var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
		//	var w = Math.abs((wp.z  / 150)); // * (2 - pp.z / pp.w);
		//	end.scale.set(w, end.scale.y, w);
		//	
		//}
	};

	this.render = function(){
	
		renderer.render(this.sceneProfile, this.camera);
		
	};
	
	this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
	

};

Potree.ProfileTool.prototype = Object.create( THREE.EventDispatcher.prototype );





