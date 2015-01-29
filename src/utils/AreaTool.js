
//
// calculating area of a polygon:
// http://www.mathopenref.com/coordpolygonarea2.html
//
//
//

Potree.AreaTool = function(scene, camera, renderer){
	
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
					scope.measurements[i].setPosition(index, I);
					
					
					break;
				}
			}
		
			//scope.dragstart.object.position.copy(I);
		}
		
		event.event.stopImmediatePropagation();
	};
	
	var dropEvent = function(event){
	
	};
	
	
	function Measure(root){
		this.points = [];
		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = []; 
		this.root = root;
		this.closed = true;
		
		this.areaLabel = new Potree.TextSprite();
		this.areaLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
		this.areaLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
		this.areaLabel.material.depthTest = false;
		this.areaLabel.material.opacity = 1;
		root.add(this.areaLabel);
		
		var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		var lineColor = new THREE.Color( 0xff0000 );
		
		var createSphereMaterial = function(){
			var sphereMaterial = new THREE.MeshLambertMaterial({
				shading: THREE.SmoothShading, 
				color: 0xff0000, 
				ambient: 0xaaaaaa,
				depthTest: false, 
				depthWrite: false}
			);
			
			return sphereMaterial;
		};
		
		this.add = function(point){	
			
			this.points.push(point);

			// sphere
			var sphere = new THREE.Mesh(sphereGeometry, createSphereMaterial());
			sphere.addEventListener("mousemove", moveEvent);
			sphere.addEventListener("mouseleave", leaveEvent);
			sphere.addEventListener("mousedrag", dragEvent);
			sphere.addEventListener("drop", dropEvent);
			
			// edge
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(lineColor, lineColor, lineColor);
			var lineMaterial = new THREE.LineBasicMaterial( { vertexColors: THREE.VertexColors, linewidth: 2 } );
			lineMaterial.depthTest = false;
			var edge = new THREE.Line(lineGeometry, lineMaterial);
			
			
			// edgeLabel
			var edgeLabel = new Potree.TextSprite("abc");
			edgeLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.material.depthTest = false;
			edgeLabel.material.opacity = 1;
			
			
			this.root.add(sphere);
			this.root.add(edge);
			this.root.add(edgeLabel);
			
			this.spheres.push(sphere);
			this.edges.push(edge);
			this.edgeLabels.push(edgeLabel);

			this.setPosition(this.points.length-1, point);
		};
		
		this.remove = function(index){
			this.points.splice(index, 1);
			
			this.root.remove(this.spheres[index]);
			this.root.remove(this.edges[index]);
			this.root.remove(this.edgeLabels[index]);
			
			this.spheres.splice(index, 1);
			this.edges.splice(index, 1);
			this.edgeLabels.splice(index, 1);
			
			this.update();
		};
		
		/**
		 * see http://www.mathopenref.com/coordpolygonarea2.html
		 */
		this.getArea = function(){
			var area = 0;
			var j = this.points.length - 1;
			
			for(var i = 0; i < this.points.length; i++){
				var p1 = this.points[i];
				var p2 = this.points[j];
				area += (p2.x + p1.x) * (p1.z - p2.z);
				j = i;
			}
			
			return Math.abs(area / 2);
		};
		
		this.setPosition = function(index, position){
			var point = this.points[index];			
			point.copy(position);
			
			this.update();
		};
		
		this.setClosed = function(closed){
			this.closed = closed;
			
			this.update();
		};
		
		this.update = function(){
			this.areaLabel.visible = this.points.length >= 3;
		
			if(this.points.length === 1){
				var point = this.points[0];
				this.spheres[0].position.copy(point);
				this.edges[0].visible = false;
				this.edgeLabels[0].visible = false;
				
				return;
			}
			
			
			var centroid = new THREE.Vector3();
			var lastIndex = this.points.length - 1;
			for(var i = 0; i <= lastIndex; i++){
				var point = this.points[i];
				var sphere = this.spheres[i];
				var leftIndex = (i === 0) ? lastIndex : i - 1;
				var rightIndex = (i === lastIndex) ? 0 : i + 1;
				var leftVertex = this.points[leftIndex];
				var rightVertex = this.points[rightIndex];
				var leftEdge = this.edges[leftIndex];
				var rightEdge = this.edges[i];
				var leftEdgeLabel = this.edgeLabels[leftIndex];
				var rightEdgeLabel = this.edgeLabels[i];
				
				var leftEdgeLength = point.distanceTo(leftVertex);
				var rightEdgeLength = point.distanceTo(rightVertex);
				var leftEdgeCenter = new THREE.Vector3().addVectors(leftVertex, point).multiplyScalar(0.5);
				var rightEdgeCenter = new THREE.Vector3().addVectors(point, rightVertex).multiplyScalar(0.5);
				
				leftEdgeLabel.position.copy(leftEdgeCenter);
				rightEdgeLabel.position.copy(rightEdgeCenter);
				leftEdgeLabel.setText(leftEdgeLength.toFixed(2));
				rightEdgeLabel.setText(rightEdgeLength.toFixed(2));
				
				sphere.position.copy(point);
				leftEdge.geometry.vertices[1].copy(point);
				leftEdge.geometry.verticesNeedUpdate = true;
				leftEdge.geometry.computeBoundingSphere();
				rightEdge.geometry.vertices[0].copy(point);
				rightEdge.geometry.verticesNeedUpdate = true;
				rightEdge.geometry.computeBoundingSphere();
				
				if(i === lastIndex && !this.closed){
					rightEdge.visible = false;
					rightEdgeLabel.visible = false;
				}else{
					rightEdge.visible = true;
					rightEdgeLabel.visible = true;
				}
				
				centroid.add(point);
			}
			centroid.multiplyScalar(1 / this.points.length);
			
			
			var msg = Potree.utils.addCommas(this.getArea().toFixed(1)) + "²";
			this.areaLabel.setText(msg);
			this.areaLabel.position.copy(centroid);
		};
		
		
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

			if(state === STATE.DEFAULT){
				state = STATE.PICKING;
				scope.activeMeasurement = new Measure();
			}
			
			scope.activeMeasurement.add(pos);
			
			var event = {
				type: 'newpoint',
				position: pos.clone()
			};
			scope.dispatchEvent(event);
			
		}
	};
	
	function onMouseMove(event){
		scope.mouse.x = ( event.clientX / scope.domElement.clientWidth ) * 2 - 1;
		scope.mouse.y = - ( event.clientY / scope.domElement.clientHeight ) * 2 + 1;
		
		if(scope.dragstart){
			
			scope.dragstart.object.dispatchEvent({type: "mousedrag", event: event});
			
		}else if(state == STATE.PICKING && scope.activeMeasurement){
			var I = getMousePointCloudIntersection();
			
			if(I){
			
				var lastIndex = scope.activeMeasurement.points.length-1;
				scope.activeMeasurement.setPosition(lastIndex, I);
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
			scope.activeMeasurement.remove(scope.activeMeasurement.points.length-1);
		
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
			scope.activeMeasurement = new Measure(scope.sceneRoot);
			
			scope.activeMeasurement.add(new THREE.Vector3(0,0,0));
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
			
			var wp = measurement.areaLabel.getWorldPosition().applyMatrix4(this.camera.matrixWorldInverse);
			var w = Math.abs(wp.z  / 8);
			var l = measurement.areaLabel.scale.length();
			measurement.areaLabel.scale.multiplyScalar(w / l);
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


Potree.AreaTool.prototype = Object.create( THREE.EventDispatcher.prototype );
