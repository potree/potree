
Potree.TransformationTool = function(scene, camera, renderer){

	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.camera = camera;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	this.dragstart = null;
	
	this.sceneTransformation = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneTransformation.add(this.sceneRoot);
	
	this.sceneRotation = new THREE.Scene();
	
	this.translationNode = new THREE.Object3D();
	this.rotationNode = new THREE.Object3D();
	this.scaleNode = new THREE.Object3D();
	
	this.sceneRoot.add(this.translationNode);
	this.sceneRoot.add(this.rotationNode);
	this.sceneRoot.add(this.scaleNode);
	
	this.sceneRoot.visible = false;
	
	this.hoveredElement = null;
	
	this.STATE = {
		DEFAULT: 0,
		TRANSLATE_X: 1,
		TRANSLATE_Y: 2,
		TRANSLATE_Z: 3,
		SCALE_X: 1,
		SCALE_Y: 2,
		SCALE_Z: 3
	};
	
	this.parts = {
		ARROW_X : 	{name: "arrow_x", 	object: undefined, color: new THREE.Color( 0xff0000 ), state: this.STATE.TRANSLATE_X},
		ARROW_Z : 	{name: "arrow_z", 	object: undefined, color: new THREE.Color( 0x0000ff ), state: this.STATE.TRANSLATE_Z},
		ARROW_Y : 	{name: "arrow_y", 	object: undefined, color: new THREE.Color( 0x00ff00 ), state: this.STATE.TRANSLATE_Y},
		SCALE_X : 	{name: "scale_x", 	object: undefined, color: new THREE.Color( 0xff0000 ), state: this.STATE.SCALE_X},
		SCALE_Z : 	{name: "scale_z", 	object: undefined, color: new THREE.Color( 0x0000ff ), state: this.STATE.SCALE_Z},
		SCALE_Y : 	{name: "scale_y", 	object: undefined, color: new THREE.Color( 0x00ff00 ), state: this.STATE.SCALE_Y},
		ROTATE_X : 	{name: "rotate_x", 	object: undefined, color: new THREE.Color( 0xff0000 ), state: this.STATE.ROTATE_X},
		ROTATE_Z : 	{name: "rotate_z", 	object: undefined, color: new THREE.Color( 0x0000ff ), state: this.STATE.ROTATE_Z},
		ROTATE_Y : 	{name: "rotate_y", 	object: undefined, color: new THREE.Color( 0x00ff00 ), state: this.STATE.ROTATE_Y}
	};

	this.buildTranslationNode = function(){
		var arrowX = scope.createArrow(scope.parts.ARROW_X, scope.parts.ARROW_X.color);
		arrowX.rotation.z = -Math.PI/2;
		
		var arrowY = scope.createArrow(scope.parts.ARROW_Y, scope.parts.ARROW_Y.color);
		
		var arrowZ = scope.createArrow(scope.parts.ARROW_Z, scope.parts.ARROW_Z.color);
		arrowZ.rotation.x = -Math.PI/2;
		
		this.translationNode.add(arrowX);
		this.translationNode.add(arrowY);
		this.translationNode.add(arrowZ);
	};
	
	this.buildScaleNode = function(){
		var xHandle = this.createScaleHandle(scope.parts.SCALE_X, 0xff0000);
		xHandle.rotation.z = -Math.PI/2;
		
		var yHandle = this.createScaleHandle(scope.parts.SCALE_Y, 0x00ff00);
		
		var zHandle = this.createScaleHandle(scope.parts.SCALE_Z, 0x0000ff);
		zHandle.rotation.x = -Math.PI/2;
		
		this.scaleNode.add(xHandle);
		this.scaleNode.add(yHandle);
		this.scaleNode.add(zHandle);
	};
	
	this.buildRotationNode = function(){
		var xHandle = this.createRotationCircle(scope.parts.ROTATE_X, 0xff0000);
		xHandle.rotation.y = -Math.PI/2;
		
		var yHandle = this.createRotationCircle(scope.parts.ROTATE_Y, 0x00ff00);
		
		var zHandle = this.createRotationCircle(scope.parts.ROTATE_Z, 0x0000ff);
		yHandle.rotation.x = -Math.PI/2;
		
		this.rotationNode.add(xHandle);
		this.rotationNode.add(yHandle);
		this.rotationNode.add(zHandle);
		
		
		var sg = new THREE.SphereGeometry(2.9, 24, 24);
		var sphere = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({color: 0xaaaaaa, transparent: true, opacity: 0.4}));
		
		this.sceneRotation.add(sphere);
		
		var moveEvent = function(event){
			sphere.material.color.setHex(0x555555);
		};
		
		var leaveEvent = function(event){
			sphere.material.color.setHex(0xaaaaaa);
		};
		
		var dragEvent = function(event){
			event.event.stopImmediatePropagation();
		
			var mouseStart = new THREE.Vector3(scope.dragstart.mousePos.x, scope.dragstart.mousePos.y, 0.1);
			var mouseEnd = new THREE.Vector3(scope.mouse.x, scope.mouse.y, 0.1);
			var mouseDiff = new THREE.Vector3().subVectors(mouseEnd, mouseStart);
			
			var sceneStart = mouseStart.clone().unproject(scope.camera);
			var sceneEnd = mouseEnd.clone().unproject(scope.camera);
			var sceneDiff = new THREE.Vector3().subVectors(sceneEnd, sceneStart);
			var sceneDir = sceneDiff.clone().normalize();
			var toCamDir = new THREE.Vector3().subVectors(scope.camera.position, sceneStart).normalize();
			var rotationAxis = toCamDir.clone().cross(sceneDir);
			var rotationAmount = 6 * mouseDiff.length();
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[i];
				var startRotation = scope.dragstart.rotations[i];
				
				target.rotation.copy(startRotation);

				var q = new THREE.Quaternion();

				q.setFromAxisAngle( rotationAxis, rotationAmount );
				target.quaternion.multiplyQuaternions( q, target.quaternion );

			}
		};
		
		var dropEvent = function(event){
		
		};
		
		sphere.addEventListener("mousemove", moveEvent);
		sphere.addEventListener("mouseleave", leaveEvent);
		sphere.addEventListener("mousedrag", dragEvent);
		sphere.addEventListener("drop", dropEvent);
		
	};
	
	
	
	this.createBox = function(color){
		var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		var boxMaterial = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
		var box = new THREE.Mesh(boxGeometry, boxMaterial);
		
		return box;
	};
	
	var sph1, sph2, sph3;
	
	this.createRotationCircle = function(partID, color){
		//var geometry = new THREE.TorusGeometry(3, 0.1, 12, 48);
		//var material = new THREE.MeshBasicMaterial({color: color});
		//
		//var ring = new THREE.Mesh(geometry, material);
		
		var vertices = [];
		var segments = 128;
		for(var i = 0; i <= segments; i++){
			var u = (2 * Math.PI * i) / segments;
			var x = 3 * Math.cos(u);
			var y = 3 * Math.sin(u);
			
			vertices.push(new THREE.Vector3(x, y, 0));
		}
		var geometry = new THREE.Geometry();
		for(var i = 0; i < vertices.length; i++){
			geometry.vertices.push(vertices[i]);
		}
		var material = new THREE.LineBasicMaterial({color: color});
		var ring = new THREE.Line( geometry, material);
		ring.mode = THREE.LineStrip;
		ring.scale.set(1, 1, 1);
		//this.rotationNode.add(ring);
		
		
		var moveEvent = function(event){
			material.color.setRGB(1, 1, 0);
		};
		
		var leaveEvent = function(event){
			material.color.setHex(color);
		};
		
		var dragEvent = function(event){
		
			event.event.stopImmediatePropagation();
		
			var normal = new THREE.Vector3();
			if(partID === scope.parts.ROTATE_X){
				normal.x = 1;
			}else if(partID === scope.parts.ROTATE_Y){
				normal.y = 1;
			}else if(partID === scope.parts.ROTATE_Z){
				normal.z = -1;
			}
			
			var sceneClickPos = scope.dragstart.sceneClickPos.clone();
			var sceneOrigin = scope.sceneRoot.position.clone();
			var sceneNormal = sceneClickPos.clone().sub(sceneOrigin).normalize();
			
			var screenClickPos = sceneClickPos.clone().project(scope.camera);
			var screenOrigin = sceneOrigin.clone().project(scope.camera);
			var screenNormal = screenClickPos.clone().sub(screenOrigin).normalize();
			var screenTangent = new THREE.Vector3(screenNormal.y, screenNormal.x, 0);
			
			var mouseStart = new THREE.Vector3(scope.dragstart.mousePos.x, scope.dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(scope.mouse.x, scope.mouse.y, 0);
			
			var plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, scope.sceneRoot.position);
			var camOrigin = scope.camera.position;
			var camDirection = new THREE.Vector3( 0, 0, -1 ).applyQuaternion( scope.camera.quaternion );
			var direction = new THREE.Vector3( mouseEnd.x, mouseEnd.y, 0.5 ).unproject(scope.camera).sub( scope.camera.position ).normalize();
			var ray = new THREE.Ray( camOrigin, direction);
			var I = ray.intersectPlane(plane);
			
			if(!I){
				return;
			}
			
			sceneTargetNormal = I.clone().sub(sceneOrigin).normalize();
			
			var angleToClick;
			var angleToTarget;
			
			if(partID === scope.parts.ROTATE_X){
				angleToClick = 2 * Math.PI + Math.atan2(sceneNormal.y, -sceneNormal.z);
				angleToTarget = 4 * Math.PI + Math.atan2(sceneTargetNormal.y, -sceneTargetNormal.z);
			}else if(partID === scope.parts.ROTATE_Y){
				angleToClick = 2 * Math.PI + Math.atan2(-sceneNormal.z, sceneNormal.x);
				angleToTarget = 4 * Math.PI + Math.atan2(-sceneTargetNormal.z, sceneTargetNormal.x);
			}else if(partID === scope.parts.ROTATE_Z){
				angleToClick = 2 * Math.PI + Math.atan2(sceneNormal.x, sceneNormal.y);
				angleToTarget = 4 * Math.PI + Math.atan2(sceneTargetNormal.x, sceneTargetNormal.y);
			}
			
			var diff = angleToTarget - angleToClick;
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[i];
				var startRotation = scope.dragstart.rotations[i];
				
				target.rotation.copy(startRotation);

				var q = new THREE.Quaternion();

				q.setFromAxisAngle( normal, diff ); // axis must be normalized, angle in radians
				target.quaternion.multiplyQuaternions( q, target.quaternion );

			}
			
			
			
			
		};
		
		var dropEvent = function(event){
		
		};
		
		ring.addEventListener("mousemove", moveEvent);
		ring.addEventListener("mouseleave", leaveEvent);
		ring.addEventListener("mousedrag", dragEvent);
		ring.addEventListener("drop", dropEvent);
		
		return ring;
	};
	
	this.createScaleHandle = function(partID, color){
		var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		var material = new THREE.MeshBasicMaterial({color: color, depthTest: false, depthWrite: false});
		
		var box = new THREE.Mesh(boxGeometry, material);
		box.scale.set(0.3, 0.3, 0.3);
		box.position.set(0, 3, 0);
		
		var shaftGeometry = new THREE.Geometry();
		shaftGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
		shaftGeometry.vertices.push(new THREE.Vector3(0, 3, 0));
		var shaftMaterial = new THREE.LineBasicMaterial({color: color, depthTest: false, depthWrite: false});
		var shaft = new THREE.Line(shaftGeometry, shaftMaterial);
		
		var handle = new THREE.Object3D();
		handle.add(box);
		handle.add(shaft);
		
		handle.partID = partID;
		
		
		var moveEvent = function(event){
			shaftMaterial.color.setRGB(1, 1, 0);
			material.color.setRGB(1, 1, 0);
		};
		
		var leaveEvent = function(event){
			shaftMaterial.color.setHex(color);
			material.color.setHex(color);
		};
		
		var dragEvent = function(event){
		
			var sceneDirection = new THREE.Vector3();
			if(partID === scope.parts.SCALE_X){
				sceneDirection.x = 1;
			}else if(partID === scope.parts.SCALE_Y){
				sceneDirection.y = 1;
			}else if(partID === scope.parts.SCALE_Z){
				sceneDirection.z = -1;
			}
			
			var sceneClickPos = scope.dragstart.sceneClickPos.clone();
			sceneClickPos.multiply(sceneDirection);
			sceneClickPos.z *= -1;
		
			var lineStart = scope.dragstart.sceneStartPos.clone().project(scope.camera);
			var lineEnd = scope.dragstart.sceneStartPos.clone().add(sceneDirection).project(scope.camera);
			
			var origin = lineStart.clone();
			var screenDirection = lineEnd.clone().sub(lineStart);
			screenDirection.normalize();
			
			var mouseStart = new THREE.Vector3(scope.dragstart.mousePos.x, scope.dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(scope.mouse.x, scope.mouse.y, 0);
	
			var directionDistance = new THREE.Vector3().subVectors(mouseEnd, mouseStart).dot(screenDirection);
			var pointOnLine = screenDirection.clone().multiplyScalar(directionDistance).add(origin);
			
			pointOnLine.unproject(scope.camera);
			
			var diff = scope.sceneRoot.position.clone().sub(pointOnLine);
			diff.multiply(new THREE.Vector3(-1, -1, 1));
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[i];
				var startScale = scope.dragstart.scales[i];
				target.scale.copy(startScale).add(diff);
				target.scale.x = Math.max(target.scale.x, 0.01);
				target.scale.y = Math.max(target.scale.y, 0.01);
				target.scale.z = Math.max(target.scale.z, 0.01);
			}

			event.event.stopImmediatePropagation();

		};
		
		var dropEvent = function(event){
			material.color.set(color);
		};
		
		box.addEventListener("mousemove", moveEvent);
		box.addEventListener("mouseleave", leaveEvent);
		box.addEventListener("mousedrag", dragEvent);
		box.addEventListener("drop", dropEvent);
		shaft.addEventListener("mousemove", moveEvent);
		shaft.addEventListener("mouseleave", leaveEvent);
		shaft.addEventListener("mousedrag", dragEvent);
		shaft.addEventListener("drop", dropEvent);
		
		return handle;
	};
	
	this.createArrow = function(partID, color){
		var material = new THREE.MeshBasicMaterial({color: color, depthTest: false, depthWrite: false});
		
		//var shaftGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 10, 1, false);
		//var shaftMaterial  = material;
		//var shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
		//shaft.position.y = 1.5;
		
		var shaftGeometry = new THREE.Geometry();
		shaftGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
		shaftGeometry.vertices.push(new THREE.Vector3(0, 3, 0));
		var shaftMaterial = new THREE.LineBasicMaterial({color: color, depthTest: false, depthWrite: false});
		var shaft = new THREE.Line(shaftGeometry, shaftMaterial);
		
		
		
		var headGeometry = new THREE.CylinderGeometry(0, 0.2, 0.5, 10, 1, false);
		var headMaterial  = material;
		var head = new THREE.Mesh(headGeometry, headMaterial);
		head.position.y = 3;
		
		var arrow = new THREE.Object3D();
		arrow.add(shaft);
		arrow.add(head);
		arrow.partID = partID;
		arrow.material = material;
		
		var moveEvent = function(event){
			headMaterial.color.setRGB(1, 1, 0);
			shaftMaterial.color.setRGB(1, 1, 0);
		};
		
		var leaveEvent = function(event){
			headMaterial.color.set(color);
			shaftMaterial.color.set(color);
		};
		
		var dragEvent = function(event){
		
			var sceneDirection = new THREE.Vector3();
			if(partID === scope.parts.ARROW_X){
				sceneDirection.x = 1;
			}else if(partID === scope.parts.ARROW_Y){
				sceneDirection.y = 1;
			}else if(partID === scope.parts.ARROW_Z){
				sceneDirection.z = -1;
			}
			
			var sceneClickPos = scope.dragstart.sceneClickPos.clone();
			sceneClickPos.multiply(sceneDirection);
			sceneClickPos.z *= -1;
		
			//var lineStart = new THREE.Vector3();
			//lineStart.x = scope.dragstart.mousePos.x;			
			//lineStart.y = scope.dragstart.mousePos.y;
			var lineStart = scope.dragstart.sceneStartPos.clone().project(scope.camera);
			var lineEnd = scope.dragstart.sceneStartPos.clone().add(sceneDirection).project(scope.camera);
			
			var origin = lineStart.clone();
			var screenDirection = lineEnd.clone().sub(lineStart);
			screenDirection.normalize();
			
			
			
			var mouseStart = new THREE.Vector3(scope.dragstart.mousePos.x, scope.dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(scope.mouse.x, scope.mouse.y, 0);
			
			//var htmlStart = mouseStart.clone().addScalar(1).multiplyScalar(0.5);
			//htmlStart.x *= scope.domElement.clientWidth;
			//htmlStart.y *= scope.domElement.clientHeight;
			//
			//var htmlEnd = mouseEnd.clone().addScalar(1).multiplyScalar(0.5);
			//htmlEnd.x *= scope.domElement.clientWidth;
			//htmlEnd.y *= scope.domElement.clientHeight;
			//
			//var el = document.getElementById("testDiv");
			//el.style.left = htmlStart.x;
			//el.style.width = htmlEnd.x - htmlStart.x;
			//el.style.bottom = htmlStart.y;
			//el.style.top = scope.domElement.clientHeight - htmlEnd.y;
			
			
			
			
			//var directionDistance = new THREE.Vector3().subVectors(mouseEnd, origin).dot(screenDirection);
			var directionDistance = new THREE.Vector3().subVectors(mouseEnd, mouseStart).dot(screenDirection);
			var pointOnLine = screenDirection.clone().multiplyScalar(directionDistance).add(origin);
			
			pointOnLine.unproject(scope.camera);
			
			var diff = scope.sceneRoot.position.clone();
			//scope.position.copy(pointOnLine);
			var offset = sceneClickPos.clone().sub(scope.dragstart.sceneStartPos);
			scope.sceneRoot.position.copy(pointOnLine);
			//scope.sceneRoot.position.sub(offset);
			diff.sub(scope.sceneRoot.position);
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[i];
				target.position.sub(diff);
			}
			
			//if(!sph1){
			//	var g = new THREE.SphereGeometry(0.2);
			//	
			//	var m1 = new THREE.MeshBasicMaterial({color: 0xff0000});
			//	var m2 = new THREE.MeshBasicMaterial({color: 0x00ff00});
			//	var m3 = new THREE.MeshBasicMaterial({color: 0x0000ff});
			//	
			//	sph1 = new THREE.Mesh(g, m1);
			//	sph2 = new THREE.Mesh(g, m2);
			//	sph3 = new THREE.Mesh(g, m3);
			//	
			//	scope.scene.add(sph1);
			//	scope.scene.add(sph2);
			//	scope.scene.add(sph3);
			//}
			//sph1.position.copy(scope.dragstart.sceneStartPos);
			//sph2.position.copy(scope.dragstart.sceneClickPos);
			//sph3.position.copy(pointOnLine);

			event.event.stopImmediatePropagation();

		};
		
		var dropEvent = function(event){
			shaftMaterial.color.set(color);
		};
		
		shaft.addEventListener("mousemove", moveEvent);
		head.addEventListener("mousemove", moveEvent);
		
		shaft.addEventListener("mouseleave", leaveEvent);
		head.addEventListener("mouseleave", leaveEvent);
		
		shaft.addEventListener("mousedrag", dragEvent);
		head.addEventListener("mousedrag", dragEvent);
		
		shaft.addEventListener("drop", dropEvent);
		head.addEventListener("drop", dropEvent);
		
		
		
		return arrow;
	};
	
	function onMouseMove(event){
		
		var rect = scope.domElement.getBoundingClientRect();
		scope.mouse.x = ((event.clientX - rect.left) / scope.domElement.clientWidth) * 2 - 1;
        scope.mouse.y = -((event.clientY - rect.top) / scope.domElement.clientHeight) * 2 + 1;
		
		if(scope.dragstart){
			
			scope.dragstart.object.dispatchEvent({
				type: "mousedrag", 
				event: event
			});
			
		}else{
	
	
			var I = getHoveredElement();
			if(I){
				var object = I.object;
				
				//var g = new THREE.SphereGeometry(2);
				//var m = new THREE.Mesh(g);
				//scope.scene.add(m);
				//m.position.copy(I.point);
				
				object.dispatchEvent({type: "mousemove", event: event});
				
				if(scope.hoveredElement && scope.hoveredElement !== object){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", event: event});
				}
				
				scope.hoveredElement = object;
				
			}else{
				if(scope.hoveredElement){
					scope.hoveredElement.dispatchEvent({type: "mouseleave", event: event});
				}
			
				scope.hoveredElement = null;
			}
		
		}
		
		
	};
	
	function onMouseDown(event){
	
	
		if(event.which === 1){
			// left click
			var I = getHoveredElement();
			if(I){
				
				var scales = [];
				var rotations = [];
				for(var i = 0; i < scope.targets.length; i++){
					scales.push(scope.targets[i].scale.clone());
					rotations.push(scope.targets[i].rotation.clone());
				}
			
				scope.dragstart = {
					object: I.object, 
					sceneClickPos: I.point,
					sceneStartPos: scope.sceneRoot.position.clone(),
					mousePos: {x: scope.mouse.x, y: scope.mouse.y},
					scales: scales,
					rotations: rotations
				};
				event.stopImmediatePropagation();
			}
		}else if(event.which === 3){
			// right click
			
			scope.setTargets([]);
		}
	};
	
	function onMouseUp(event){
	
		if(scope.dragstart){
			scope.dragstart.object.dispatchEvent({type: "drop", event: event});
			scope.dragstart = null;
		}
	};
	
	function getHoveredElement(){
	
		if(scope.targets.length === 0){
			return;
		}
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		raycaster.linePrecision = 0.2;
		
		var objects = [];
		if(scope.translationNode.visible){
			objects.push(scope.translationNode);
		}else if(scope.scaleNode.visible){
			objects.push(scope.scaleNode);
		}else if(scope.rotationNode.visible){
			objects.push(scope.rotationNode);
			objects.push(scope.sceneRotation);
		}
		
		var intersections = raycaster.intersectObjects(objects, true);
		
		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for(var i = 0; i < intersections.length; i++){
			var I = intersections[i];
			I.distance = scope.camera.position.distanceTo(I.point);
		}
		intersections.sort( function ( a, b ) { return a.distance - b.distance;} );
		
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	this.setTargets = function(targets){
		scope.targets = targets;
		
		if(scope.targets.length === 0){
			this.sceneRoot.visible = false;
			this.sceneRotation.visible = false;
		
			return;
		}else{
			this.sceneRoot.visible = true;
		}
		
		//TODO calculate centroid of all targets
		var target = targets[0];
		var bb;
		if(target.geometry && target.geometry.boundingBox){
			bb = target.geometry.boundingBox;
		}else{
			bb = target.boundingBox;
		}
		
		if(bb){
			var centroid = bb.clone().applyMatrix4(target.matrixWorld).center();
			scope.sceneRoot.position.copy(centroid);
		}
	};
	
	this.getBoundingBox = function(){
		var box = new THREE.Box3();
		
		for(var i = 0; i < scope.targets.length; i++){
			var target = scope.targets[i];
			var targetBB;

			if(target.boundingBox){
				targetBB = target.boundingBox;
			}else if(target.boundingSphere){
				targetBB = target.boundingSphere.getBoundingBox();
			}else if(target.geometry){
				if(target.geometry.boundingBox){
					targetBB = target.geometry.boundingBox;
				}else if(target.geometry.boundingSphere){
					targetBB = target.geometry.boundingSphere.getBoundingBox();
				}
			}
			
			targetBB = Potree.utils.computeTransformedBoundingBox(targetBB, target.matrixWorld);
			
			box.union(targetBB);
		}
		
		return box;
	};
	
	this.update = function(){
		var node = this.sceneRoot;
		var wp = node.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
		var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
		var w = Math.abs((wp.z  / 20)); // * (2 - pp.z / pp.w);
		node.scale.set(w, w, w);
		
		if(this.targets && this.targets.length === 1){
			this.scaleNode.rotation.copy(this.targets[0].rotation);
		}
		
		this.sceneRotation.scale.set(w,w,w);
	};
	
	this.render = function(){
		this.update();
		this.sceneRotation.position.copy(this.sceneRoot.position);
		this.sceneRotation.visible = this.rotationNode.visible && this.sceneRoot.visible;
		
		renderer.render(this.sceneRotation, this.camera);
		renderer.render(this.sceneTransformation, this.camera);
	};
	
	this.translate = function(){
		this.translationNode.visible = true;
		this.scaleNode.visible = false;
		this.rotationNode.visible = false;
	};
	
	this.scale = function(){
		this.translationNode.visible = false;
		this.scaleNode.visible = true;
		this.rotationNode.visible = false;
	};
	
	this.rotate = function(){
		this.translationNode.visible = false;
		this.scaleNode.visible = false;
		this.rotationNode.visible = true;
	};
	
	this.reset = function(){
		this.setTargets([]);
	};
	
	this.buildTranslationNode();
	this.buildScaleNode();
	this.buildRotationNode();
	
	//this.translate();
	this.rotate();
	
	this.setTargets([]);
	
	//this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, true );
	this.domElement.addEventListener( 'mousedown', onMouseDown, true );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
};