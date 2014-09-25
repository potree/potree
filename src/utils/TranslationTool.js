
Potree.TranslationTool = function( ) {

	THREE.Object3D.call( this );

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

	this.build();
};

Potree.TranslationTool.prototype = Object.create( THREE.Object3D.prototype );

Potree.TranslationTool.prototype.build = function(){


	var arrowX = this.createArrow(this.parts.ARROW_X, this.parts.ARROW_X.color);
	arrowX.rotation.z = -Math.PI/2;
	
	var arrowY = this.createArrow(this.parts.ARROW_Y, this.parts.ARROW_Y.color);
	
	var arrowZ = this.createArrow(this.parts.ARROW_Z, this.parts.ARROW_Z.color);
	arrowZ.rotation.x = -Math.PI/2;
	
	this.add(arrowX);
	this.add(arrowY);
	this.add(arrowZ);
	
	
	var boxXY = this.createBox(new THREE.Color( 0xffff00 ));
	boxXY.scale.z = 0.02;
	boxXY.position.set(0.5, 0.5, 0);
	
	var boxXZ = this.createBox(new THREE.Color( 0xff00ff ));
	boxXZ.scale.y = 0.02;
	boxXZ.position.set(0.5, 0, -0.5);
	
	var boxYZ = this.createBox(new THREE.Color( 0x00ffff ));
	boxYZ.scale.x = 0.02;
	boxYZ.position.set(0, 0.5, -0.5);
	
	this.add(boxXY);
	this.add(boxXZ);
	this.add(boxYZ);
	
	
	this.parts.ARROW_X.object = arrowX;
	this.parts.ARROW_Y.object = arrowY;
	this.parts.ARROW_Z.object = arrowZ;
	
	
	this.scale.multiplyScalar(5);
};

Potree.TranslationTool.prototype.createBox = function(color){
	var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
	var boxMaterial = new THREE.MeshBasicMaterial({color: color, transparent: true, opacity: 0.5});
	var box = new THREE.Mesh(boxGeometry, boxMaterial);
	
	return box;
};

Potree.TranslationTool.prototype.createArrow = function(partID, color){
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

Potree.TranslationTool.prototype.setHighlighted = function(partID){
	if(partID === undefined){
		if(this.highlighted){
			this.highlighted.object.material.color = this.highlighted.color;
			this.highlighted = undefined;
		}
		
		return; 
	}else if(this.highlighted !== undefined && this.highlighted !== partID){
		this.highlighted.object.material.color = this.highlighted.color;
	}

	this.highlighted = partID;
	partID.object.material.color = new THREE.Color(0xffff00);
}

Potree.TranslationTool.prototype.getHoveredObject = function(mouse, camera){
	var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
	var projector = new THREE.Projector();
	projector.unprojectVector( vector, camera );
	
	var raycaster = new THREE.Raycaster();
	raycaster.ray.set( camera.position, vector.sub( camera.position ).normalize() );
	
	var intersections = raycaster.intersectObject(this, true);
	if(intersections.length === 0){
		this.setHighlighted(undefined);
		return undefined;
	}
	
	var I = intersections[0];
	var partID = I.object.parent.partID;
		
	return partID;	
}

Potree.TranslationTool.prototype.onMouseMove = function(mouse, camera){
	
	if(this.state === this.STATE.DEFAULT){
		this.setHighlighted(this.getHoveredObject(mouse, camera));
	}else if(state === this.STATE.TRANSLATE_X || state === this.STATE.TRANSLATE_Y){
		var origin = this.start.lineStart.clone();
		var direction = this.start.lineEnd.clone().sub(this.start.lineStart);
		direction.normalize();
		
		var mousePoint = new THREE.Vector3(mouse.x, mouse.y);
	    
		var directionDistance = new THREE.Vector3().subVectors(mousePoint, origin).dot(direction);
		var pointOnLine = direction.clone().multiplyScalar(directionDistance).add(origin);
		
		
		var projector = new THREE.Projector();
		projector.unprojectVector(pointOnLine, camera);
		
		var diff = pointOnLine.clone().sub(this.position);
		this.position.copy(pointOnLine);
		
		for(var i = 0; i < this.targets.length; i++){
			var target = this.targets[0];
			target.position.add(diff);
		}
	}
	
};

Potree.TranslationTool.prototype.onMouseDown = function(mouse, camera){
	
	if(this.state === this.STATE.DEFAULT){
		var hoveredObject = this.getHoveredObject(mouse, camera);
		if(hoveredObject){
			this.state = hoveredObject.state;
			
			var lineStart = this.position.clone();
			var lineEnd;
			
			if(this.state === this.STATE.TRANSLATE_X){
				lineEnd = this.position.clone();
				lineEnd.x += 2;
			}else if(this.state === this.STATE.TRANSLATE_Y){
				lineEnd = this.position.clone();
				lineEnd.y += 2;
			}else if(this.state === this.STATE.TRANSLATE_Z){
				lineEnd = this.position.clone();
				lineEnd.z -= 2;
			}
			
			//lineEnd = this.position.clone();
			
			var projector = new THREE.Projector();
			projector.projectVector( lineStart, camera );
			projector.projectVector( lineEnd, camera );
			
			this.start = {
				mouse: mouse,
				lineStart: lineStart,
				lineEnd: lineEnd
			};
			
			return true;
		}
		
	}
	
	return false;
	
};

Potree.TranslationTool.prototype.onMouseUp = function(){
	this.setHighlighted();
	this.state = this.STATE.DEFAULT;
	
};

Potree.TranslationTool.prototype.setTargets = function(targets){
	this.targets = targets;
	
	if(this.targets.length === 0){
		return;
	}
	
	//TODO calculate centroid of all targets
	var centroid = targets[0].position.clone();
	//for(var i = 0; i < targets.length; i++){
	//	var target = targets[i];
	//}
	
	this.position.copy(centroid);
	
}












