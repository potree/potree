
Potree.Measure = function(){
	var scope = this;
	
	THREE.Object3D.call( this );
	
	this.points = [];
	this._showDistances = true;
	this._showCoordinates = false;
	this._showArea = true;
	this._closed = true;
	this._showAngles = false;
	this.maxMarkers = Number.MAX_SAFE_INTEGER;
	
	this.spheres = [];
	this.edges = [];
	this.sphereLabels = [];
	this.edgeLabels = [];
	this.angleLabels = [];
	this.coordinateLabels = [];
	
	this.areaLabel = new Potree.TextSprite("");
	this.areaLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
	this.areaLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
	this.areaLabel.setTextColor({r:180, g:220, b:180, a:1.0});
	this.areaLabel.material.depthTest = false;
	this.areaLabel.material.opacity = 1;
	this.areaLabel.visible = false;;
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
	
		var point = tool.getMousePointCloudIntersection();
			
		if(point){
			var position = point.position;
			var index = scope.spheres.indexOf(tool.dragstart.object);
			//scope.setPosition(index, position);
			scope.setMarker(index, point);
		}
		
		event.event.stopImmediatePropagation();
	};
	
	var dropEvent = function(event){
	
	};
	
	this.addMarker = function(point){
		if(point instanceof THREE.Vector3){
			point = {position: point};
		}
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
			var edgeLabel = new Potree.TextSprite();
			edgeLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
			edgeLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
			edgeLabel.material.depthTest = false;
			edgeLabel.visible = false;
			this.edgeLabels.push(edgeLabel);
			this.add(edgeLabel);
		}
		
		{ // angle labels
			var angleLabel = new Potree.TextSprite();
            angleLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
			angleLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
            angleLabel.material.depthTest = false;
            angleLabel.material.opacity = 1;
			angleLabel.visible = false;
			this.angleLabels.push(angleLabel);
			this.add(angleLabel);
		}
		
		{ // coordinate labels
			var coordinateLabel = new Potree.TextSprite();
			coordinateLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
			coordinateLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
			coordinateLabel.material.depthTest = false;
			coordinateLabel.material.opacity = 1;
			coordinateLabel.visible = false;
			this.coordinateLabels.push(coordinateLabel);
			this.add(coordinateLabel);
		}

		
		
		var event = {
			type: "marker_added",
			measurement: this
		};
		this.dispatchEvent(event);
		
		//this.setPosition(this.points.length-1, point.position);
		this.setMarker(this.points.length-1, point);
	};
	
	this.removeMarker = function(index){
		this.points.splice(index, 1);
		
		this.remove(this.spheres[index]);
		
		var edgeIndex = (index === 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		
		this.remove(this.edgeLabels[edgeIndex]);
		this.edgeLabels.splice(edgeIndex, 1);
		this.coordinateLabels.splice(index, 1);
		
		this.spheres.splice(index, 1);
		
		this.update();
		
		this.dispatchEvent({type: "marker_removed", measurement: this});
	};
	
	this.setMarker = function(index, point){
		this.points[index] = point;
		
		var event = {
			type: 		'marker_moved',
			measure:	this,
			index:		index,
			position: 	point.position.clone()
		};
		this.dispatchEvent(event);
		
		this.update();
	}
	
	this.setPosition = function(index, position){
		var point = this.points[index];			
		point.position.copy(position);
		
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
			var p1 = this.points[i].position;
			var p2 = this.points[j].position;
			area += (p2.x + p1.x) * (p1.z - p2.z);
			j = i;
		}
		
		return Math.abs(area / 2);
	};
	
	this.getAngleBetweenLines = function(cornerPoint, point1, point2) {
        var v1 = new THREE.Vector3().subVectors(point1.position, cornerPoint.position);
        var v2 = new THREE.Vector3().subVectors(point2.position, cornerPoint.position);
        return v1.angleTo(v2);
    };
	
	this.getAngle = function(index){
	
		if(this.points.length < 3 || index >= this.points.length){
			return 0;
		}
		
		var previous = (index === 0) ? this.points[this.points.length-1] : this.points[index-1];
		var point = this.points[index];
		var next = this.points[(index + 1) % (this.points.length)];
		
		return this.getAngleBetweenLines(point, previous, next);
	};
	
	this.update = function(){
	
		if(this.points.length === 0){
			return;
		}else if(this.points.length === 1){
			var point = this.points[0];
			var position = point.position;
			this.spheres[0].position.copy(position);
			
			{// coordinate labels
				var coordinateLabel = this.coordinateLabels[0];
				
				var labelPos = position.clone().add(new THREE.Vector3(0,1,0));
				coordinateLabel.position.copy(labelPos);
				
				var msg = position.x.toFixed(2) + " / " + position.y.toFixed(2) + " / " + position.z.toFixed(2);
				coordinateLabel.setText(msg);
				
				coordinateLabel.visible = this.showCoordinates && (index < lastIndex || this.closed);
			}
			
			return;
		}
		
		var lastIndex = this.points.length - 1;
		
		var centroid = new THREE.Vector3();
		for(var i = 0; i <= lastIndex; i++){
			var point = this.points[i];
			centroid.add(point.position);
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
			sphere.position.copy(point.position);
			sphere.material.color = scope.color;

			{// edges
				var edge = this.edges[index];
				
				edge.material.color = this.color;
				
				edge.geometry.vertices[0].copy(point.position);
				edge.geometry.vertices[1].copy(nextPoint.position);
				
				edge.geometry.verticesNeedUpdate = true;
				edge.geometry.computeBoundingSphere();
				edge.visible = index < lastIndex || this.closed;
			}
			
			{// edge labels
				var edgeLabel = this.edgeLabels[i];
			
				var center = new THREE.Vector3().add(point.position);
				center.add(nextPoint.position);
				center = center.multiplyScalar(0.5);
				var distance = point.position.distanceTo(nextPoint.position);
				
				edgeLabel.position.copy(center);
				edgeLabel.setText(distance.toFixed(2));
				edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
			}
			
			{// angle labels
				var angleLabel = this.angleLabels[i];
				var angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);
				
				var dir = nextPoint.position.clone().sub(previousPoint.position);
				dir.multiplyScalar(0.5);
				dir = previousPoint.position.clone().add(dir).sub(point.position).normalize();
				
				var dist = Math.min(point.position.distanceTo(previousPoint.position), point.position.distanceTo(nextPoint.position));
				dist = dist / 9;
				
				var labelPos = point.position.clone().add(dir.multiplyScalar(dist));
				angleLabel.position.copy(labelPos);
				
				var msg = Potree.utils.addCommas((angle*(180.0/Math.PI)).toFixed(1)) + '\u00B0';
				angleLabel.setText(msg);
				
				angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
			}
			
			{// coordinate labels
				var coordinateLabel = this.coordinateLabels[0];
				
				var labelPos = point.position.clone().add(new THREE.Vector3(0,1,0));
				coordinateLabel.position.copy(labelPos);
				
				var msg = point.position.x.toFixed(2) + " / " + point.position.y.toFixed(2) + " / " + point.position.z.toFixed(2);
				coordinateLabel.setText(msg);
				
				coordinateLabel.visible = this.showCoordinates && (index < lastIndex || this.closed);
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
	};
};

Potree.Measure.prototype = Object.create( THREE.Object3D.prototype );

Object.defineProperty(Potree.Measure.prototype, "showCoordinates", {
	get: function(){
		return this._showCoordinates;
	},
	set: function(value){
		this._showCoordinates = value;
		this.update();
	}
});

Object.defineProperty(Potree.Measure.prototype, "showAngles", {
	get: function(){
		return this._showAngles;
	},
	set: function(value){
		this._showAngles = value;
		this.update();
	}
});

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












Potree.MeasuringTool = function(scene, camera, renderer, toGeo){
	
	var scope = this;
	this.enabled = false;
	this.toGeo = toGeo;
	
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
	
	this.activeMeasurement= null;
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
			var point = scope.getMousePointCloudIntersection();
			if(point){
				var pos = point.position.clone();
				
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
		
		//console.log(scope.mouse);
		
		if(scope.dragstart){
			var arg = {
				type: "drag", 
				event: event, 
				tool: scope
			};
			scope.dragstart.object.dispatchEvent(arg);
			
		}else if(state == STATE.INSERT && scope.activeMeasurement){
			var point = scope.getMousePointCloudIntersection();
			
			if(point){
				var position = point.position;
				var lastIndex = scope.activeMeasurement.points.length-1;
				//scope.activeMeasurement.setPosition(lastIndex, position);
				scope.activeMeasurement.setMarker(lastIndex, point);
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
	};
	
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
			event.stopImmediatePropagation();
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
		
		return closestPoint ? closestPoint : null;
	};
	
	this.startInsertion = function(args){
		state = STATE.INSERT;
		
		var args = args || {};
		var showDistances = (typeof args.showDistances != "undefined") ? args.showDistances : true;
		var showArea = (typeof args.showArea != "undefined") ? args.showArea : false;
		var showAngles = (typeof args.showAngles != "undefined") ? args.showAngles : false;
		var closed = (typeof args.closed != "undefined") ? args.closed : false;
		var showCoordinates = (typeof args.showCoordinates != "undefined") ? args.showCoordinates : false;
		var maxMarkers = args.maxMarkers || Number.MAX_SAFE_INTEGER;
		
		var measurement = new Potree.Measure();
		measurement.showDistances = showDistances;
		measurement.showArea = showArea;
		measurement.showAngles = showAngles;
		measurement.closed = closed;
		measurement.showCoordinates = showCoordinates;
		measurement.maxMarkers = maxMarkers;

		this.addMeasurement(measurement);
		measurement.addMarker(new THREE.Vector3(Infinity,Infinity,Infinity));
		
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
			
			this.dispatchEvent({"type": "measurement_removed", measurement: measurement});
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
			
			// coordinate labels
			for(var j = 0; j < measurement.coordinateLabels.length; j++){
				var label = measurement.coordinateLabels[j];
				var sphere = measurement.spheres[j];
				var point = measurement.points[j];
				
				var distance = scope.camera.position.distanceTo(sphere.getWorldPosition());
					
				var screenPos = sphere.getWorldPosition().clone().project( camera );
				screenPos.x = Math.round( ( screenPos.x + 1 ) * scope.renderer.domElement.clientWidth  / 2 ),
				screenPos.y = Math.round( ( - screenPos.y + 1 ) * scope.renderer.domElement.clientHeight / 2 );
				screenPos.z = 0;
				screenPos.y -= 30;
				
				var labelPos = new THREE.Vector3( 
					(screenPos.x / scope.renderer.domElement.clientWidth) * 2 - 1, 
					-(screenPos.y / scope.renderer.domElement.clientHeight) * 2 + 1, 
					0.5 );
				labelPos.unproject(scope.camera);
                
				var direction = labelPos.sub(scope.camera.position).normalize();
				labelPos = new THREE.Vector3().addVectors(
					scope.camera.position, direction.multiplyScalar(distance));
					
				label.position.copy(labelPos);
				
				var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (70 / pr);
				label.scale.set(scale, scale, scale);
				
				var geoCoord = scope.toGeo(point.position);
				var txt = geoCoord.x.toFixed(2) + " / ";
				txt += geoCoord.y.toFixed(2) + " / ";
				txt += geoCoord.z.toFixed(2);
				label.setText(txt);
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
