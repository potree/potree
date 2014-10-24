
Potree.TranslationTool = function(camera) {
	THREE.Object3D.call( this );
	var scope = this;

	this.camera = camera;

	this.geometry = new THREE.Geometry();
	this.material = new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff } );
	
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
	
	this.translateStart;
	
	this.state = this.STATE.DEFAULT;
	this.highlighted;
	this.targets;
	
	this.build = function(){
		var arrowX = scope.createArrow(scope.parts.ARROW_X, scope.parts.ARROW_X.color);
		arrowX.rotation.z = -Math.PI/2;
		
		var arrowY = scope.createArrow(scope.parts.ARROW_Y, scope.parts.ARROW_Y.color);
		
		var arrowZ = scope.createArrow(scope.parts.ARROW_Z, scope.parts.ARROW_Z.color);
		arrowZ.rotation.x = -Math.PI/2;
		
		scope.add(arrowX);
		scope.add(arrowY);
		scope.add(arrowZ);
		
		
		var boxXY = scope.createBox(new THREE.Color( 0xffff00 ));
		boxXY.scale.z = 0.02;
		boxXY.position.set(0.5, 0.5, 0);
		
		var boxXZ = scope.createBox(new THREE.Color( 0xff00ff ));
		boxXZ.scale.y = 0.02;
		boxXZ.position.set(0.5, 0, -0.5);
		
		var boxYZ = scope.createBox(new THREE.Color( 0x00ffff ));
		boxYZ.scale.x = 0.02;
		boxYZ.position.set(0, 0.5, -0.5);
		
		scope.add(boxXY);
		scope.add(boxXZ);
		scope.add(boxYZ);
		
		
		scope.parts.ARROW_X.object = arrowX;
		scope.parts.ARROW_Y.object = arrowY;
		scope.parts.ARROW_Z.object = arrowZ;
		
		
		scope.scale.multiplyScalar(5);
	};
	
	this.createBox = function(color){
		var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		var boxMaterial = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
		var box = new THREE.Mesh(boxGeometry, boxMaterial);
		
		return box;
	};
	
	this.createArrow = function(partID, color){
		var material = new THREE.MeshBasicMaterial({color: color});
		
		var shaftGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 10, 1, false);
		var shaftMatterial  = material;
		var shaft = new THREE.Mesh(shaftGeometry, shaftMatterial);
		shaft.position.y = 1.5;
		
		var headGeometry = new THREE.CylinderGeometry(0, 0.3, 1, 10, 1, false);
		var headMaterial  = material;
		var head = new THREE.Mesh(headGeometry, headMaterial);
		head.position.y = 3;
		
		var arrow = new THREE.Object3D();
		arrow.add(shaft);
		arrow.add(head);
		arrow.partID = partID;
		arrow.material = material;
		
		return arrow;
	};
	
	this.setHighlighted = function(partID){
		if(partID === undefined){
			if(scope.highlighted){
				scope.highlighted.object.material.color = scope.highlighted.color;
				scope.highlighted = undefined;
			}
			
			return; 
		}else if(scope.highlighted !== undefined && scope.highlighted !== partID){
			scope.highlighted.object.material.color = scope.highlighted.color;
		}

		scope.highlighted = partID;
		partID.object.material.color = new THREE.Color(0xffff00);
	}
	
	this.getHoveredObject = function(mouse){
		var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
		var projector = new THREE.Projector();
		projector.unprojectVector( vector, scope.camera );
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var intersections = raycaster.intersectObject(scope, true);
		if(intersections.length === 0){
			scope.setHighlighted(undefined);
			return undefined;
		}
		
		var I = intersections[0];
		var partID = I.object.parent.partID;
			
		return partID;	
	}
	
	this.onMouseMove = function(event){

		var mouse = event.normalizedPosition;
		
		if(scope.state === scope.STATE.DEFAULT){
			scope.setHighlighted(scope.getHoveredObject(mouse));
		}else if(scope.state === scope.STATE.TRANSLATE_X || scope.state === scope.STATE.TRANSLATE_Y || scope.state === scope.STATE.TRANSLATE_Z){
			var origin = scope.start.lineStart.clone();
			var direction = scope.start.lineEnd.clone().sub(scope.start.lineStart);
			direction.normalize();
			
			var mousePoint = new THREE.Vector3(mouse.x, mouse.y);
			
			var directionDistance = new THREE.Vector3().subVectors(mousePoint, origin).dot(direction);
			var pointOnLine = direction.clone().multiplyScalar(directionDistance).add(origin);
			
			
			var projector = new THREE.Projector();
			projector.unprojectVector(pointOnLine, scope.camera);
			
			var diff = pointOnLine.clone().sub(scope.position);
			scope.position.copy(pointOnLine);
			
			for(var i = 0; i < scope.targets.length; i++){
				var target = scope.targets[0];
				target.position.add(diff);
			}
			
			event.signal.halt();
		}
		
	};
	
	this.onMouseDown = function(event){
	
		if(scope.state === scope.STATE.DEFAULT){
			var hoveredObject = scope.getHoveredObject(event.normalizedPosition, scope.camera);
			if(hoveredObject){
				scope.state = hoveredObject.state;
				
				var lineStart = scope.position.clone();
				var lineEnd;
				
				if(scope.state === scope.STATE.TRANSLATE_X){
					lineEnd = scope.position.clone();
					lineEnd.x += 2;
				}else if(scope.state === scope.STATE.TRANSLATE_Y){
					lineEnd = scope.position.clone();
					lineEnd.y += 2;
				}else if(scope.state === scope.STATE.TRANSLATE_Z){
					lineEnd = scope.position.clone();
					lineEnd.z -= 2;
				}
				
				//lineEnd = scope.position.clone();
				
				var projector = new THREE.Projector();
				projector.projectVector( lineStart, scope.camera );
				projector.projectVector( lineEnd, scope.camera );
				
				scope.start = {
					mouse: event.normalizedPosition,
					lineStart: lineStart,
					lineEnd: lineEnd
				};
				
				event.signal.halt();
			}
			
		}		
	};
	
	this.onMouseUp = function(event){
		scope.setHighlighted();
		scope.state = scope.STATE.DEFAULT;
		
	};
	
	this.setTargets = function(targets){
		scope.targets = targets;
		
		if(scope.targets.length === 0){
			return;
		}
		
		//TODO calculate centroid of all targets
		var centroid = targets[0].position.clone();
		//for(var i = 0; i < targets.length; i++){
		//	var target = targets[i];
		//}
		
		scope.position.copy(centroid);
		
	}

	this.build();
};

Potree.TranslationTool.prototype = Object.create( THREE.Object3D.prototype );

















