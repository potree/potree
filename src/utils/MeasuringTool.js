
Potree.MeasuringTool = function(scene, camera, renderer){
	
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
		PICKING: 1
	};
	
	var state = STATE.DEFAULT;
	
	var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
	
	this.activeMeasurement;
	this.measurements = [];
	this.sceneMeasurement = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneMeasurement.add(this.sceneRoot);
	
	this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( 0, 0, 10 );
	this.light.lookAt(new THREE.Vector3(0,0,0));
	this.sceneMeasurement.add( this.light );
	
	this.hoveredElement = null;
	
	var moveEvent = function(event){
		event.target.material.emissive.setHex(0x888888);
	};
	
	var leaveEvent = function(event){
		event.target.material.emissive.setHex(0x000000);
	};
	
	var dragEvent = function(event){
		var I = getMousePointCloudIntersection();
			
		if(I){
			for(var i = 0; i < scope.measurements.length; i++){
				var m = scope.measurements[i];
				var index = m.spheres.indexOf(scope.dragstart.object);
				
				if(index >= 0){
					var sphere = m.spheres[index];
					
					if(index === 0){
						var edge = m.edges[index];
						var edgeLabel = m.edgeLabels[index];
						
						sphere.position.copy(I);
						edge.geometry.vertices[0].copy(I);
						edge.geometry.verticesNeedUpdate = true;
						edge.geometry.computeBoundingSphere();
						
						var edgeLabelPos = edge.geometry.vertices[0].clone().add(edge.geometry.vertices[1]).multiplyScalar(0.5);
						var edgeLabelText = edge.geometry.vertices[0].distanceTo(edge.geometry.vertices[1]).toFixed(2);
						
						edgeLabel.position.copy(edgeLabelPos);
						edgeLabel.setText(edgeLabelText);
						edgeLabel.scale.multiplyScalar(10);
					}else if(index === m.spheres.length - 1){
						var edge = m.edges[index - 1];
						var edgeLabel = m.edgeLabels[index - 1];
						
						sphere.position.copy(I);
						edge.geometry.vertices[1].copy(I);
						edge.geometry.verticesNeedUpdate = true;
						edge.geometry.computeBoundingSphere();
						
						var edgeLabelPos = edge.geometry.vertices[0].clone().add(edge.geometry.vertices[1]).multiplyScalar(0.5);
						var edgeLabelText = edge.geometry.vertices[0].distanceTo(edge.geometry.vertices[1]).toFixed(2);
						
						edgeLabel.position.copy(edgeLabelPos);
						edgeLabel.setText(edgeLabelText);
						edgeLabel.scale.multiplyScalar(10);
					}else{
						var edge1 = m.edges[index-1];
						var edge2 = m.edges[index];
						
						var edge1Label = m.edgeLabels[index-1];
						var edge2Label = m.edgeLabels[index];
						
						sphere.position.copy(I);
						
						edge1.geometry.vertices[1].copy(I);
						edge1.geometry.verticesNeedUpdate = true;
						edge1.geometry.computeBoundingSphere();
						
						edge2.geometry.vertices[0].copy(I);
						edge2.geometry.verticesNeedUpdate = true;
						edge2.geometry.computeBoundingSphere();
						
						var edge1LabelPos = edge1.geometry.vertices[0].clone().add(edge1.geometry.vertices[1]).multiplyScalar(0.5);
						var edge1LabelText = edge1.geometry.vertices[0].distanceTo(edge1.geometry.vertices[1]).toFixed(2);
						
						edge1Label.position.copy(edge1LabelPos);
						edge1Label.setText(edge1LabelText);
						edge1Label.scale.multiplyScalar(10);
						
						var edge2LabelPos = edge2.geometry.vertices[0].clone().add(edge2.geometry.vertices[1]).multiplyScalar(0.5);
						var edge2LabelText = edge2.geometry.vertices[0].distanceTo(edge2.geometry.vertices[1]).toFixed(2);
						
						edge2Label.position.copy(edge2LabelPos);
						edge2Label.setText(edge2LabelText);
						edge2Label.scale.multiplyScalar(10);
						
					}
					
					
					break;
				}
			}
		
			//scope.dragstart.object.position.copy(I);
		}
		
		event.event.stopImmediatePropagation();
	};
	
	var dropEvent = function(event){
	
	};
	
	
	function Measure(){
		this.points = [];
		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = [];
	}
	
	function createSphereMaterial(){
		var sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: 0xff0000, 
			ambient: 0xaaaaaa,
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};

	
	function onClick(event){
	
		if(!scope.enabled){
			return;
		}
	
		var I = getMousePointCloudIntersection();
		if(I){
			var pos = I.clone();
			
			var sphere = new THREE.Mesh(sphereGeometry, createSphereMaterial());
			sphere.position.copy(I);
			scope.sceneRoot.add(sphere);
			sphere.addEventListener("mousemove", moveEvent);
			sphere.addEventListener("mouseleave", leaveEvent);
			sphere.addEventListener("mousedrag", dragEvent);
			sphere.addEventListener("drop", dropEvent);
			
			var sphereEnd = new THREE.Mesh(sphereGeometry, createSphereMaterial());
			sphereEnd.position.copy(I);
			scope.sceneRoot.add(sphereEnd);
			sphereEnd.addEventListener("mousemove", moveEvent);
			sphereEnd.addEventListener("mouseleave", leaveEvent);
			sphereEnd.addEventListener("mousedrag", dragEvent);
			sphereEnd.addEventListener("drop", dropEvent);
			
			var msg = pos.x.toFixed(2) + " / " + pos.y.toFixed(2) + " / " + pos.z.toFixed(2);
			
			var label = new Potree.TextSprite(msg);
			label.setBorderColor({r:0, g:255, b:0, a:1.0});
			label.material.depthTest = false;
			label.material.opacity = 0;
			label.position.copy(I);
			label.position.y += 0.5;
			
			
			var labelEnd = new Potree.TextSprite(msg);
			labelEnd.setBorderColor({r:0, g:255, b:0, a:1.0});
			labelEnd.material.depthTest = false;
			labelEnd.material.opacity = 0;
			labelEnd.position.copy(I);
			labelEnd.position.y += 0.5;
			
			
			var lc = new THREE.Color( 0xff0000 );
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(I.clone(), I.clone());
			lineGeometry.colors.push(lc, lc, lc);
			var lineMaterial = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors, linewidth: 10 } );
			lineMaterial.depthTest = false;
			sConnection = new THREE.Line(lineGeometry, lineMaterial);
			
			var edgeLabel = new Potree.TextSprite(0);
			edgeLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.material.depthTest = false;
			edgeLabel.position.copy(I);
			edgeLabel.position.y += 0.5;
			
			
			scope.sceneRoot.add(sConnection);
			scope.sceneRoot.add( label );
			scope.sceneRoot.add( labelEnd );
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
				scope.sceneRoot.remove(sphere);
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
		//event.stopImmediatePropagation();
	};
	
	function onMouseMove(event){
		scope.mouse.x = ( event.clientX / scope.domElement.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1;
		
		if(scope.dragstart){
			
			scope.dragstart.object.dispatchEvent({type: "mousedrag", event: event});
			
		}else if(state == STATE.PICKING && scope.activeMeasurement){
			var I = getMousePointCloudIntersection();
			
			if(I){
				if(scope.activeMeasurement.spheres.length === 1){
					var pos = I.clone();
					var sphere = scope.activeMeasurement.spheres[0];
					sphere.position.copy(I);
				}else{
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
			scope.setEnabled(false);
		}
	}
	
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
				
				event.stopImmediatePropagation();
				
			}
			
		}else if(event.which === 3){	
			onRightClick(event);
		}
	}
	
	function onMouseUp(event){
		
		if(scope.dragstart){
			scope.dragstart.object.dispatchEvent({type: "drop", event: event});
			scope.dragstart = null;
		}
		
	}
	
	function getHoveredElement(){
			
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);
		
		var raycaster = new THREE.Raycaster();
		raycaster.ray.set( scope.camera.position, vector.sub( scope.camera.position ).normalize() );
		
		var spheres = [];
		for(var i = 0; i < scope.measurements.length; i++){
			var m = scope.measurements[i];
			
			for(var j = 0; j < m.spheres.length; j++){
				spheres.push(m.spheres[j]);
			}
		}
		
		var intersections = raycaster.intersectObjects(spheres, true);
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
	}	
	
	this.setEnabled = function(enable){
		if(this.enabled === enable){
			return;
		}
		
		this.enabled = enable;
		
		if(enable){
			
			state = STATE.PICKING; 
			scope.activeMeasurement = new Measure();
			
			var sphere = new THREE.Mesh(sphereGeometry, createSphereMaterial());
			scope.sceneRoot.add(sphere);
			scope.activeMeasurement.spheres.push(sphere);
			
			sphere.addEventListener("mousemove", moveEvent);
			sphere.addEventListener("mouseleave", leaveEvent);
			sphere.addEventListener("mousedrag", dragEvent);
			sphere.addEventListener("drop", dropEvent);
		}else{
			//this.domElement.removeEventListener( 'click', onClick, false);
			//this.domElement.removeEventListener( 'mousemove', onMouseMove, false );
			//this.domElement.removeEventListener( 'mousedown', onMouseDown, false );
		}
	};
	
	this.update = function(){
		var measurements = [];
		for(var i = 0; i < this.measurements.length; i++){
			measurements.push(this.measurements[i]);
		}
		if(this.activeMeasurement){
			measurements.push(this.activeMeasurement);
		}
		
		
		for(var i = 0; i < measurements.length; i++){
			var measurement = measurements[i];
			for(var j = 0; j < measurement.spheres.length; j++){
				var sphere = measurement.spheres[j];
				var wp = sphere.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
				var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				var w = Math.abs((wp.z  / 60)); // * (2 - pp.z / pp.w);
				sphere.scale.set(w, w, w);
			}
			
			for(var j = 0; j < measurement.edgeLabels.length; j++){
				var label = measurement.edgeLabels[j];
				var wp = label.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
				var w = Math.abs(wp.z  / 10);
				var l = label.scale.length();
				label.scale.multiplyScalar(w / l);
			}
		}
	
		this.light.position.copy(this.camera.position);
		this.light.lookAt(this.camera.getWorldDirection().add(this.camera.position));
		
	};
	
	this.render = function(){
		this.update();
		renderer.render(this.sceneMeasurement, this.camera);
	};
	
	this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
};


Potree.MeasuringTool.prototype = Object.create( THREE.EventDispatcher.prototype );
