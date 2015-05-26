
Potree.Measure = function(){
	var scope = this;
	
	THREE.Object3D.call( this );
	
	this.points = [];
	this._showDistances = true;
	this._showArea = true;
	this._closed = true;
	this.maxMarkers = Number.MAX_SAFE_INTEGER;
	
	this.spheres = [];
	this.edges = [];
	this.sphereLabels = [];
	this.edgeLabels = [];
	this.angleLabels = [];
	
	this.areaLabel = new Potree.TextSprite("");
	this.areaLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
	this.areaLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
	this.areaLabel.setTextColor({r:180, g:220, b:180, a:1.0});
	this.areaLabel.material.depthTest = false;
	this.areaLabel.material.opacity = 1;
	this.add(this.areaLabel);
	
	var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
	this.color = new THREE.Color( 0xff0000 );
	
	var createSphereMaterial = function(){
		var sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: scope.color, 
			ambient: 0xaaaaaa,
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};
	
	var moveEvent = function(event){
		event.target.material.emissive.setHex(0x888888);
	};
	
	var leaveEvent = function(event){
		event.target.material.emissive.setHex(0x000000);
	};
	
	var dragEvent = function(event){
		var tool = event.tool;
		var dragstart = tool.dragstart;
		var mouse = tool.mouse;
	
		var I = tool.getMousePointCloudIntersection();
			
		if(I){
			var index = scope.spheres.indexOf(tool.dragstart.object);
			scope.setPosition(index, I);
		}
		
		//event.event.stopImmediatePropagation();
	};
	
	var dropEvent = function(event){
	
	};
	
	this.addMarker = function(point){
		this.points.push(point);
		
		// sphere
		var sphere = new THREE.Mesh(sphereGeometry, createSphereMaterial());
		sphere.addEventListener("move", moveEvent);
		sphere.addEventListener("leave", leaveEvent);
		sphere.addEventListener("drag", dragEvent);
		sphere.addEventListener("drop", dropEvent);
		
		this.add(sphere);
		this.spheres.push(sphere);
		
		{ // edges
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(this.color, this.color, this.color);
			var lineMaterial = new THREE.LineBasicMaterial( { 
				linewidth: 1
			});
			lineMaterial.depthTest = false;
			var edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = true;
			
			this.add(edge);
			this.edges.push(edge);
		}
		
		{ // edge labels
			var edgeLabel = new Potree.TextSprite(0);
			edgeLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
			edgeLabel.material.depthTest = false;
			edgeLabel.visible = false;
			this.edgeLabels.push(edgeLabel);
			this.add(edgeLabel);
		}
		
		{ // angle labels
			var angleLabel = new Potree.TextSprite();
            angleLabel.setBorderColor({r:0, g:255, b:0, a:0.0});
            angleLabel.setBackgroundColor({r:0, g:255, b:0, a:0.0});
            angleLabel.material.depthTest = false;
            angleLabel.material.opacity = 1;
			angleLabel.visible = false;
			this.angleLabels.push(angleLabel);
			this.add(angleLabel);
		}

		
		
		var event = {
			type: "marker_added",
			measurement: this
		};
		this.dispatchEvent(event);
		
		this.setPosition(this.points.length-1, point);
	};
	
	this.removeMarker = function(index){
		this.points.splice(index, 1);
		
		this.remove(this.spheres[index]);
		
		var edgeIndex = (index == 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		
		this.remove(this.edgeLabels[edgeIndex]);
		this.edgeLabels.splice(edgeIndex, 1);
		
		this.spheres.splice(index, 1);
		
		this.update();
	};
	
	this.setPosition = function(index, position){
		var point = this.points[index];			
		point.copy(position);
		
		var event = {
			type: 		'marker_moved',
			measure:	this,
			index:		index,
			position: 	position.clone()
		};
		this.dispatchEvent(event);
		
		this.update();
	};
	
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
	
	this.getAngleBetweenLines = function(cornerPoint, point1, point2) {
        var v1 = new THREE.Vector3().subVectors(point1, cornerPoint);
        var v2 = new THREE.Vector3().subVectors(point2, cornerPoint);
        return v1.angleTo(v2);
    };
	
	this.update = function(){
	
		if(this.points.length === 0){
			return;
		}else if(this.points.length === 1){
			var point = this.points[0];
			this.spheres[0].position.copy(point);
			
			return;
		}
		
		var lastIndex = this.points.length - 1;
		
		var centroid = new THREE.Vector3();
		for(var i = 0; i <= lastIndex; i++){
			var point = this.points[i];
			centroid.add(point);
		}
		centroid.divideScalar(this.points.length);
		
		for(var i = 0; i <= lastIndex; i++){
			var index = i;
			var nextIndex = ( i + 1 > lastIndex ) ? 0 : i + 1;
			var previousIndex = (i === 0) ? lastIndex : i - 1;
		
			var point = this.points[index];
			var nextPoint = this.points[nextIndex];
			var previousPoint = this.points[previousIndex];
			
			var sphere = this.spheres[index];
			
			// spheres
			sphere.position.copy(point);
			sphere.material.color = scope.color;

			{// edges
				var edge = this.edges[index];
				
				edge.material.color = this.color;
				
				edge.geometry.vertices[0].copy(point);
				edge.geometry.vertices[1].copy(nextPoint);
				
				edge.geometry.verticesNeedUpdate = true;
				edge.geometry.computeBoundingSphere();
				edge.visible = index < lastIndex || this.closed;
			}
			
			{// edge labels
				var edgeLabel = this.edgeLabels[i];
			
				var center = new THREE.Vector3().add(point);
				center.add(nextPoint);
				center = center.multiplyScalar(0.5);
				var distance = point.distanceTo(nextPoint);
				
				edgeLabel.position.copy(center);
				edgeLabel.setText(distance.toFixed(2));
				edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
			}
			
			{// angle labels
				var angleLabel = this.angleLabels[i];
				var angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);
				
				var dir = nextPoint.clone().sub(previousPoint);
				dir.multiplyScalar(0.5);
				dir = previousPoint.clone().add(dir).sub(point).normalize();
				
				var dist = Math.min(point.distanceTo(previousPoint), point.distanceTo(nextPoint));
				dist = dist / 9;
				
				var labelPos = point.clone().add(dir.multiplyScalar(dist));
				angleLabel.position.copy(labelPos);
				
				var msg = Potree.utils.addCommas((angle*(180.0/Math.PI)).toFixed(1)) + '\u00B0';
				angleLabel.setText(msg);
				
				angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
			}
		}
		
		// update area label
		this.areaLabel.position.copy(centroid);
		this.areaLabel.visible = this.showArea && this.points.length >= 3;
		var msg = Potree.utils.addCommas(this.getArea().toFixed(1)) + "²";
		this.areaLabel.setText(msg);
	};
	
	this.raycast = function(raycaster, intersects){
		
		for(var i = 0; i < this.points.length; i++){
			var sphere = this.spheres[i];
			
			sphere.raycast(raycaster, intersects);
		}
		
		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for(var i = 0; i < intersects.length; i++){
			var I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort( function ( a, b ) { return a.distance - b.distance;} );
	}
};

Potree.Measure.prototype = Object.create( THREE.Object3D.prototype );

Object.defineProperty(Potree.Measure.prototype, "showArea", {
	get: function(){
		return this._showArea;
	},
	set: function(value){
		this._showArea = value;
		this.update();
	}
});

Object.defineProperty(Potree.Measure.prototype, "closed", {
	get: function(){
		return this._closed;
	},
	set: function(value){
		this._closed = value;
		this.update();
	}
});

Object.defineProperty(Potree.Measure.prototype, "showDistances", {
	get: function(){
		return this._showDistances;
	},
	set: function(value){
		this._showDistances = value;
		this.update();
	}
});

Potree.MeasuringTool = function(scene, camera, renderer){
	
	var scope = this;
	this.enabled = false;
	
	this.scene = scene;
	this.camera = camera;
	this.renderer = renderer;
	this.domElement = renderer.domElement;
	this.mouse = {x: 0, y: 0};
	
	var STATE = {
		DEFAULT: 0,
		INSERT: 1
	};
	
	var state = STATE.DEFAULT;
	
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
	
	function onClick(event){
		if(state === STATE.INSERT){
			var I = scope.getMousePointCloudIntersection();
			if(I){
				var pos = I.clone();
				
				scope.activeMeasurement.addMarker(pos);
				
				var event = {
					type: 'newpoint',
					position: pos.clone()
				};
				scope.dispatchEvent(event);
				
				if(scope.activeMeasurement.points.length > scope.activeMeasurement.maxMarkers){
					scope.finishInsertion();
				}
				
			}
		}
	};
	
	function onMouseMove(event){
	
		var rect = scope.domElement.getBoundingClientRect();
		scope.mouse.x = ((event.clientX - rect.left) / scope.domElement.clientWidth) * 2 - 1;
        scope.mouse.y = -((event.clientY - rect.top) / scope.domElement.clientHeight) * 2 + 1;
		
		if(scope.dragstart){
			var arg = {
				type: "drag", 
				event: event, 
				tool: scope
			};
			scope.dragstart.object.dispatchEvent(arg);
			
		}else if(state == STATE.INSERT && scope.activeMeasurement){
			var I = scope.getMousePointCloudIntersection();
			
			if(I){
			
				var lastIndex = scope.activeMeasurement.points.length-1;
				scope.activeMeasurement.setPosition(lastIndex, I);
			}
			
		}else{
			var I = getHoveredElement();
			
			if(I){
				
				I.object.dispatchEvent({type: "move", target: I.object, event: event});
				
				if(scope.hoveredElement && scope.hoveredElement !== I.object){
					scope.hoveredElement.dispatchEvent({type: "leave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = I.object;
				
			}else{
			
				if(scope.hoveredElement){
					scope.hoveredElement.dispatchEvent({type: "leave", target: scope.hoveredElement, event: event});
				}
				
				scope.hoveredElement = null;
			
			}
		}
	};
	
	function onRightClick(event){
		if(state == STATE.INSERT){			
			scope.finishInsertion();
		}
	}
	
	this.getState = function(){
		// TODO remove
	
		return state;
	}
	
	function onMouseDown(event){

		if(event.which === 1){
		
			if(state !== STATE.DEFAULT){
				event.stopImmediatePropagation();
			}
			
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
	
	function onDoubleClick(event){
		
		// fix move event after double click
		// see: http://stackoverflow.com/questions/8125165/event-listener-for-dblclick-causes-event-for-mousemove-to-not-work-and-show-a-ci
		if (window.getSelection){
			window.getSelection().removeAllRanges();
		}else if (document.selection){
			document.selection.empty();
		}
		
		
		if(scope.activeMeasurement && state === STATE.INSERT){
			scope.activeMeasurement.removeMarker(scope.activeMeasurement.points.length-1);
			scope.finishInsertion();
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
	
	this.getMousePointCloudIntersection = function(){
		var vector = new THREE.Vector3( scope.mouse.x, scope.mouse.y, 0.5 );
		vector.unproject(scope.camera);

		var direction = vector.sub(scope.camera.position).normalize();
		var ray = new THREE.Ray(scope.camera.position, direction);
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree || object instanceof Potree.PointCloudArena4D){
				pointClouds.push(object);
			}
		});
		
		var closestPoint = null;
		var closestPointDistance = null;
		
		for(var i = 0; i < pointClouds.length; i++){
			var pointcloud = pointClouds[i];
			var point = pointcloud.pick(scope.renderer, scope.camera, ray);
			
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
	
	this.startInsertion = function(args){
		state = STATE.INSERT;
		
		var args = args || {};
		var showDistances = (typeof args.showDistances != "undefined") ? args.showDistances : true;
		var showArea = (typeof args.showArea != "undefined") ? args.showArea : false;
		var showAngles = (typeof args.showAngles != "undefined") ? args.showAngles : false;
		var closed = (typeof args.closed != "undefined") ? args.closed : false;
		var maxMarkers = args.maxMarkers || Number.MAX_SAFE_INTEGER;
		
		var measurement = new Potree.Measure();
		measurement.showDistances = showDistances;
		measurement.showArea = showArea;
		measurement.showAngles = showAngles;
		measurement.closed = closed;
		measurement.maxMarkers = maxMarkers;

		this.addMeasurement(measurement);
		measurement.addMarker(new THREE.Vector3(0,0,0));
		
		this.activeMeasurement = measurement;
	};
	
	this.finishInsertion = function(){
		this.activeMeasurement.removeMarker(this.activeMeasurement.points.length-1);
		
		var event = {
			type: "insertion_finished",
			measurement: this.activeMeasurement
		};
		this.dispatchEvent(event);
		
		this.activeMeasurement = null;
		state = STATE.DEFAULT;
	};
	
	this.addMeasurement = function(measurement){
		this.sceneMeasurement.add(measurement);
		this.measurements.push(measurement);
		
		this.dispatchEvent({"type": "measurement_added", measurement: measurement});
		measurement.addEventListener("marker_added", function(event){
			scope.dispatchEvent(event);
		});
		measurement.addEventListener("marker_removed", function(event){
			scope.dispatchEvent(event);
		});
		measurement.addEventListener("marker_moved", function(event){
			scope.dispatchEvent(event);
		});
	};
	
	this.removeMeasurement = function(measurement){
		this.sceneMeasurement.remove(measurement);
		var index = this.measurements.indexOf(measurement);
		if(index >= 0){
			this.measurements.splice(index, 1);
		}
	};
	
	this.reset = function(){
		for(var i = this.measurements.length - 1; i >= 0; i--){
			var measurement = this.measurements[i];
			this.removeMeasurement(measurement);
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
		
		// make sizes independant of distance and fov
		for(var i = 0; i < measurements.length; i++){
			var measurement = measurements[i];
			
			// spheres
			for(var j = 0; j < measurement.spheres.length; j++){
				var sphere = measurement.spheres[j];
				
				var distance = scope.camera.position.distanceTo(sphere.getWorldPosition());
				var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
				
			}
			
			// edgeLabels
			for(var j = 0; j < measurement.edgeLabels.length; j++){
				var label = measurement.edgeLabels[j];
				
				var distance = scope.camera.position.distanceTo(label.getWorldPosition());
				var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			// angle labels
			for(var j = 0; j < measurement.edgeLabels.length; j++){
				var label = measurement.angleLabels[j];
				
				var distance = scope.camera.position.distanceTo(label.getWorldPosition());
				var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			// areaLabel
			var distance = scope.camera.position.distanceTo(measurement.areaLabel.getWorldPosition());
			var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
			var scale = (80 / pr);
			measurement.areaLabel.scale.set(scale, scale, scale);
		}
	
		this.light.position.copy(this.camera.position);
		this.light.lookAt(this.camera.getWorldDirection().add(this.camera.position));
		
	};
	
	this.render = function(){
		this.update();
		this.renderer.render(this.sceneMeasurement, this.camera);
	};
	
	this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'dblclick', onDoubleClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
};


Potree.MeasuringTool.prototype = Object.create( THREE.EventDispatcher.prototype );
