
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
		TRANSLATE_Z: 3
	};
	
	this.parts = {
		ARROW_X : {name: "arrow_x", object: undefined, color: new THREE.Color( 0xff0000 ), state: this.STATE.TRANSLATE_X},
		ARROW_Y : {name: "arrow_y", object: undefined, color: new THREE.Color( 0x00ff00 ), state: this.STATE.TRANSLATE_Y},
		ARROW_Z : {name: "arrow_z", object: undefined, color: new THREE.Color( 0x0000ff ), state: this.STATE.TRANSLATE_Z}
	}

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
	
	this.createBox = function(color){
		var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		var boxMaterial = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
		var box = new THREE.Mesh(boxGeometry, boxMaterial);
		
		return box;
	};
	
	var sph1, sph2, sph3;
	
	this.createArrow = function(partID, color){
		var material = new THREE.MeshBasicMaterial({color: color, depthTest: false, depthWrite: false});
		
		var shaftGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 10, 1, false);
		var shaftMaterial  = material;
		var shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
		shaft.position.y = 1.5;
		
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
			shaftMaterial.color.setRGB(1, 1, 0);
		};
		
		var leaveEvent = function(event){
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
		scope.mouse.x = ( event.clientX / scope.domElement.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1;
	
	
		if(scope.dragstart){
			
			scope.dragstart.object.dispatchEvent({type: "mousedrag", event: event});
			
		}else{
	
	
			var I = getHoveredElement();
			if(I){
				var object = I.object;
				
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
		var I = getHoveredElement();
		if(I){
			scope.dragstart = {
				object: I.object, 
				sceneClickPos: I.point,
				sceneStartPos: scope.sceneRoot.position.clone(),
				mousePos: {x: scope.mouse.x, y: scope.mouse.y}
			};
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
		
		var intersections = raycaster.intersectObject(scope.sceneRoot, true);
		if(intersections.length > 0){
			return intersections[0];
		}else{
			return false;
		}
	};
	
	this.setTargets = function(targets){
		scope.targets = targets;
		
		if(scope.targets.length === 0){
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
		
		//for(var i = 0; i < targets.length; i++){
		//	var target = targets[i];
		//}
		
		
	}
	
	this.update = function(){
		var node = this.sceneRoot;
		var wp = node.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
		var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
		var w = Math.abs((wp.z  / 20)); // * (2 - pp.z / pp.w);
		node.scale.set(w, w, w);
	};
	
	this.render = function(){
		this.update();
		renderer.render(this.sceneTransformation, this.camera);
	};
	
	this.buildTranslationNode();
	
	//this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, true );
	this.domElement.addEventListener( 'mousedown', onMouseDown, true );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
};