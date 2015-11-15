

Potree.HeightProfile = function(){
	var scope = this;
	
	THREE.Object3D.call( this );

	this.points = [];
	this.spheres = [];
	this.edges = [];
	this.boxes = [];
	this.width = 1;
	this.height = 20;
	this._modifiable = true;
	
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
	
		if(event.event.ctrlKey){
		
			var mouseStart = new THREE.Vector3(dragstart.mousePos.x, dragstart.mousePos.y, 0);
			var mouseEnd = new THREE.Vector3(mouse.x, mouse.y, 0);
			var widthStart = dragstart.widthStart;
			
			var scale = 1 - 10 * (mouseStart.y - mouseEnd.y);
			scale = Math.max(0.01, scale);
			if(widthStart){
				scope.setWidth(widthStart *  scale);
			}
		
		}else{
	
			var I = tool.getMousePointCloudIntersection();
				
			if(I){
				var index = scope.spheres.indexOf(tool.dragstart.object);
				scope.setPosition(index, I);
			}
		}
		
		event.event.stopImmediatePropagation();
	};
	
	var dropEvent = function(event){
	
	};
	
	this.addMarker = function(point){	
		
		this.points.push(point);

		// sphere
		var sphere = new THREE.Mesh(sphereGeometry, createSphereMaterial());
		sphere.addEventListener("mousemove", moveEvent);
		sphere.addEventListener("mouseleave", leaveEvent);
		sphere.addEventListener("mousedrag", dragEvent);
		sphere.addEventListener("drop", dropEvent);
		
		this.add(sphere);
		this.spheres.push(sphere);
		
		// edges & boxes
		if(this.points.length > 1){
		
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(lineColor, lineColor, lineColor);
			var lineMaterial = new THREE.LineBasicMaterial( { 
				vertexColors: THREE.VertexColors, 
				linewidth: 2, 
				transparent: true, 
				opacity: 0.4 
			});
			lineMaterial.depthTest = false;
			var edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = false;
			
			this.add(edge);
			this.edges.push(edge);
			
			
			var boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			var boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.2});
			var box = new THREE.Mesh(boxGeometry, boxMaterial);
			box.visible = false;
			
			this.add(box);
			this.boxes.push(box);
			
		}

		
		var event = {
			"type": "marker_added",
			"profile": this
		};
		this.dispatchEvent(event);
		
		this.setPosition(this.points.length-1, point);
	};
	
	this.removeMarker = function(index){
		this.points.splice(index, 1);
		
		this.remove(this.spheres[index]);
		
		var edgeIndex = (index === 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		this.remove(this.boxes[edgeIndex]);
		this.boxes.splice(edgeIndex, 1);
		
		this.spheres.splice(index, 1);
		
		this.update();
		
		var event = {
			"type": "marker_removed",
			"profile": this
		};
		this.dispatchEvent(event);
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
		
		var event = {
			type: 		'marker_moved',
			profile:	this,
			index:		index,
			position: 	position.clone()
		};
		this.dispatchEvent(event);
		
		this.update();
	};
	
	this.setWidth = function(width){
		this.width = width;
		
		var event = {
			type: 		'width_changed',
			profile:	this,
			width:		width
		};
		this.dispatchEvent(event);
		
		this.update();
	};
	
	this.update = function(){
	
		if(this.points.length === 0){
			return;
		}else if(this.points.length === 1){
			var point = this.points[0];
			this.spheres[0].position.copy(point);
			
			return;
		}
		
		var min = this.points[0].clone();
		var max = this.points[0].clone();
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
			var leftBox = this.boxes[leftIndex];
			var rightBox = this.boxes[i];
			
			var leftEdgeLength = point.distanceTo(leftVertex);
			var rightEdgeLength = point.distanceTo(rightVertex);
			var leftEdgeCenter = new THREE.Vector3().addVectors(leftVertex, point).multiplyScalar(0.5);
			var rightEdgeCenter = new THREE.Vector3().addVectors(point, rightVertex).multiplyScalar(0.5);
			
			sphere.position.copy(point);
			
			if(this._modifiable){
				sphere.visible = true;
			}else{
				sphere.visible = false;
			}
			
			if(leftEdge){
				leftEdge.geometry.vertices[1].copy(point);
				leftEdge.geometry.verticesNeedUpdate = true;
				leftEdge.geometry.computeBoundingSphere();
			}
			
			if(rightEdge){
				rightEdge.geometry.vertices[0].copy(point);
				rightEdge.geometry.verticesNeedUpdate = true;
				rightEdge.geometry.computeBoundingSphere();
			}
			
			if(leftBox){
				var start = leftVertex;
				var end = point;
				var length = start.clone().setY(0).distanceTo(end.clone().setY(0));
				leftBox.scale.set(length, this.height, this.width);
				
				var center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
				var diff = new THREE.Vector3().subVectors(end, start);
				var target = new THREE.Vector3(diff.z, 0, -diff.x);
				
				leftBox.position.set(0,0,0);
				leftBox.lookAt(target);
				leftBox.position.copy(center);
			}
			
			
			
			
			centroid.add(point);
			min.min(point);
			max.max(point);
		}
		centroid.multiplyScalar(1 / this.points.length);
		
		for(var i = 0; i < this.boxes.length; i++){
			var box = this.boxes[i];
			
			box.position.y = min.y + (max.y - min.y) / 2;
			//box.scale.y = max.y - min.y + 50;
			box.scale.y = 1000000;
		}
		
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

Potree.HeightProfile.prototype = Object.create( THREE.Object3D.prototype );

Object.defineProperty(Potree.HeightProfile.prototype, "modifiable", {
	get: function(){
		return this.modifiable;
	},
	set: function(value){
		this._modifiable = value;
		this.update();
	}
});





//
// calculating area of a polygon:
// http://www.mathopenref.com/coordpolygonarea2.html
//
//
//

Potree.ProfileTool = function(scene, camera, renderer){
	
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
	
	var sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
	
	this.activeProfile = null;
	this.profiles = [];
	this.sceneProfile = new THREE.Scene();
	this.sceneRoot = new THREE.Object3D();
	this.sceneProfile.add(this.sceneRoot);
	
	this.light = new THREE.DirectionalLight( 0xffffff, 1 );
	this.light.position.set( 0, 0, 10 );
	this.light.lookAt(new THREE.Vector3(0,0,0));
	this.sceneProfile.add( this.light );
	
	this.hoveredElement = null;
	
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
	
		if(state === STATE.INSERT){
			var I = scope.getMousePointCloudIntersection();
			if(I){
				var pos = I.clone();
				
				if(scope.activeProfile.points.length === 1 && scope.activeProfile.width === null){
					scope.activeProfile.setWidth(camera.position.distanceTo(pos) / 50);
				}
				
				scope.activeProfile.addMarker(pos);
				
				var event = {
					type: 'newpoint',
					position: pos.clone()
				};
				scope.dispatchEvent(event);
				
			}
		}
	};
	
	function onMouseMove(event){
		var rect = scope.domElement.getBoundingClientRect();
		scope.mouse.x = ((event.clientX - rect.left) / scope.domElement.clientWidth) * 2 - 1;
        scope.mouse.y = -((event.clientY - rect.top) / scope.domElement.clientHeight) * 2 + 1;
		
		if(scope.dragstart){
			var arg = {
				type: "mousedrag", 
				event: event, 
				tool: scope
			};
			scope.dragstart.object.dispatchEvent(arg);
			
		}else if(state == STATE.INSERT && scope.activeProfile){
			var I = scope.getMousePointCloudIntersection();
			
			if(I){
			
				var lastIndex = scope.activeProfile.points.length-1;
				scope.activeProfile.setPosition(lastIndex, I);
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
		if(state == STATE.INSERT){			
			scope.finishInsertion();
		}
	}
	
	function onMouseDown(event){
	
		if(state !== STATE.DEFAULT){
			event.stopImmediatePropagation();
		}
	
		if(event.which === 1){
			
			var I = getHoveredElement();
			
			if(I){
			
				var widthStart = null;
				for(var i = 0; i < scope.profiles.length; i++){
					var profile = scope.profiles[i];
					for(var j = 0; j < profile.spheres.length; j++){
						var sphere = profile.spheres[j];
						
						if(sphere === I.object){
							widthStart = profile.width;
						}
					}
				}
				
				scope.dragstart = {
					object: I.object, 
					sceneClickPos: I.point,
					sceneStartPos: scope.sceneRoot.position.clone(),
					mousePos: {x: scope.mouse.x, y: scope.mouse.y},
					widthStart: widthStart
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
	
		if(scope.activeProfile && state === STATE.INSERT){
			scope.activeProfile.removeMarker(scope.activeProfile.points.length-1);
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
		
		var intersections = raycaster.intersectObjects(scope.profiles);
		
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
	};
	
	this.startInsertion = function(args){
		state = STATE.INSERT;
		
		var args = args || {};
		var clip = args.clip || false;
		var width = args.width || null;
		
		this.activeProfile = new Potree.HeightProfile();
		this.activeProfile.clip = clip;
		this.activeProfile.setWidth(width);
		this.addProfile(this.activeProfile);
		this.activeProfile.addMarker(new THREE.Vector3(0,0,0));
		
		return this.activeProfile;
	};
	
	this.finishInsertion = function(){
		this.activeProfile.removeMarker(this.activeProfile.points.length-1);
		
		var event = {
			type: "insertion_finished",
			profile: this.activeProfile
		};
		this.dispatchEvent(event);
		
		this.activeProfile = null;
		state = STATE.DEFAULT;
	};
	
	this.addProfile = function(profile){
		this.profiles.push(profile);
		this.sceneProfile.add(profile);
		profile.update();
		
		this.dispatchEvent({"type": "profile_added", profile: profile});
		profile.addEventListener("marker_added", function(event){
			scope.dispatchEvent(event);
		});
		profile.addEventListener("marker_removed", function(event){
			scope.dispatchEvent(event);
		});
		profile.addEventListener("marker_moved", function(event){
			scope.dispatchEvent(event);
		});
	};
	
	this.removeProfile = function(profile){
		this.sceneProfile.remove(profile);
		var index = this.profiles.indexOf(profile);
		if(index >= 0){
			this.profiles.splice(index, 1);
		}
		
		this.dispatchEvent({"type": "profile_removed", profile: profile});
	};
	
	this.reset = function(){
		for(var i = this.profiles.length - 1; i >= 0; i--){
			var profile = this.profiles[i];
			this.removeProfile(profile);
		}
	};
	
	this.update = function(){
		
		for(var i = 0; i < this.profiles.length; i++){
			var profile = this.profiles[i];
			for(var j = 0; j < profile.spheres.length; j++){
				var sphere = profile.spheres[j];
				
				var distance = scope.camera.position.distanceTo(sphere.getWorldPosition());
				var pr = projectedRadius(1, scope.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
				var scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
		}
	
		this.light.position.copy(this.camera.position);
		this.light.lookAt(this.camera.getWorldDirection().add(this.camera.position));
		
	};
	
	this.render = function(){
		this.update();
		renderer.render(this.sceneProfile, this.camera);
	};
	
	this.preparePoints = function(profileProgress, toGeo, args){
		
		var segments = profileProgress.segments;
		if (segments.length === 0){
			return false;
		}
		
		var data = [];
		var distance = 0;
		var totalDistance = 0;
		var minX = Math.max();
		var minY = Math.max();
		var minZ = Math.max();
		var maxX = 0;
		var maxY = 0;
		var maxZ = 0;

		//// Get the same color map as Three
		//var minRange = toGeo(new THREE.Vector3(0, args.heightMin, 0));
		//var maxRange = toGeo(new THREE.Vector3(0, args.heightMax, 0));
		//var heightRange = maxRange.z - minRange.z;
		//var colorRange = [];
		//var colorDomain = [];
        //
		//// Read the altitude gradient used in 3D scene
		//for (var c = 0; c < pv.scene3D.pointcloud.material.gradient.length; c++){
		//	colorDomain.push(minRange.z + heightRange * pv.scene3D.pointcloud.material.gradient[c][0]);
		//	colorRange.push('#' + pv.scene3D.pointcloud.material.gradient[c][1].getHexString());
		//}
        //
		//// Altitude color map scale
		//var colorRamp = d3.scale.linear()
		//  .domain(colorDomain)
		//  .range(colorRange);
		  
		// Iterate the profile's segments
		for(var i = 0; i < segments.length; i++){
			var segment = segments[i];
			var segStartGeo = toGeo(segment.start);
			var segEndGeo = toGeo(segment.end);
			var xOA = segEndGeo.x - segStartGeo.x;
			var yOA = segEndGeo.y - segStartGeo.y;
			var segmentLength = Math.sqrt(xOA * xOA + yOA * yOA);
			var points = segment.points;

			// Iterate the segments' points
			for(var j = 0; j < points.numPoints; j++){
				var p = toGeo(points.position[j]);
				// get min/max values            
				if (p.x < minX) { minX = p.x;}

				if (p.y < minY) { minY = p.y;}

				if (p.z < minZ) { minZ = p.z;}

				if (p.x > maxX) { maxX = p.x;}

				if (p.y < maxY) { maxY = p.y;}

				if (p.z < maxZ) { maxZ = p.z;}

				var xOB = p.x - segStartGeo.x;
				var yOB = p.y - segStartGeo.y;
				var hypo = Math.sqrt(xOB * xOB + yOB * yOB);
				var cosAlpha = (xOA * xOB + yOA * yOB)/(Math.sqrt(xOA * xOA + yOA * yOA) * hypo);
				var alpha = Math.acos(cosAlpha);
				var dist = hypo * cosAlpha + totalDistance;
				if (!isNaN(dist)) {
					data.push({
						'distance': dist,
						'x': p.x,
						'y': p.y,
						'altitude': p.z,
						'color': 'rgb(' + points.color[j][0] * 100 + '%,' + points.color[j][1] * 100 + '%,' + points.color[j][2] * 100 + '%)',
						'intensity': 'rgb(' + points.intensity[j] + '%,' + points.intensity[j] + '%,' + points.intensity[j] + '%)',
						'intensityCode': points.intensity[j],
						//'heightColor': colorRamp(p.z),
						'classificationCode': points.classification[j]
					});
				}
			}

			// Increment distance from the profile start point
			totalDistance += segmentLength;
		}

		var output = {
			'data': data,
			'minX': minX,
			'minY': minY,
			'minZ': minZ,
			'maxX': maxX,
			'maxY': maxY,
			'maxZ': maxZ
		};

		return output;
	};
	
	this.draw = function(profile, target, toGeo, args){
		// TODO handle all pointclouds
		// TODO are the used closures safe for garbage collection?
	
		if(!scope.__drawData){
			scope.__drawData = {};
		}
		var dd = scope.__drawData;
		
		if(dd.request){
			dd.request.cancel();
		}
		dd.points = [];
		
		var pointClouds = [];
		scope.scene.traverse(function(object){
			if(object instanceof Potree.PointCloudOctree || object instanceof Potree.PointCloudArena4D){
				pointClouds.push(object);
			}
		});
		
		var pointcloud = pointClouds[0];
		
		var drawPoints = function(canvas, points, scaleX, scaleY) {
			var pointSize = 2;
			var i = -1, n = points.length, d, cx, cy;
			while (++i < n) {
				d = points[i];
				cx = scaleX(d.distance);
				cy = scaleY(d.altitude);
				canvas.moveTo(cx, cy);
				canvas.fillRect(cx, cy, pointSize, pointSize);
				//canvas.fillStyle = pv.profile.strokeColor(d);
				canvas.fillStyle = d.color;
			}
		};
		
		{
			var elMarkers = document.getElementById("profile_markers");
			var message = "";
			
			for(var i = 0; i < profile.points.length; i++){
				var marker = profile.points[i];
				var markerPos = toGeo(marker);
				
				message += markerPos.x.toFixed(2) + ", "; 
				message += markerPos.y.toFixed(2) + ", ";
				message += markerPos.z.toFixed(2) + "<br>";
			}
			elMarkers.innerHTML = message;
		}
		
		
		
		var projectedBoundingBox = null;
		dd.request = pointcloud.getPointsInProfile(profile, null, {
			"onProgress": function(event){
				console.log("progress " + dd.request.pointsServed);
				
				var segments = event.points.segments;
				
				if(!projectedBoundingBox){
					projectedBoundingBox = event.points.projectedBoundingBox;
				}
				
				var result = scope.preparePoints(event.points, toGeo, args);
				dd.points = dd.points.concat(result.data);
				
				var markers =  profile.points;
				
				
				
				
				var containerWidth = target.clientWidth;
				var containerHeight = target.clientHeight;
				var margin = {top: 0, right: 0, bottom: 20, left: 40};
				var width = containerWidth - (margin.left + margin.right);
				var height = containerHeight - (margin.top + margin.bottom);
				
				var scaleX = d3.scale.linear().range([0, width]);
				scaleX.domain([d3.min(dd.points, function(d) { return d.distance; }), d3.max(dd.points, function(d) { return d.distance; })]);

				// Y scale
				var scaleY = d3.scale.linear().range([height,0]);
				scaleY.domain([d3.min(dd.points, function(d) { return d.altitude; }), d3.max(dd.points, function(d) { return d.altitude; })]);
				
				var zoom = d3.behavior.zoom()
				.x(scaleX)
				.y(scaleY)
				.scaleExtent([0,8])
				.size([width, height])
				.on("zoom",  function(){
					var t = zoom.translate();
					//var tx = t[0];
					//var ty = t[1];
                    //
					//tx = Math.min(tx, 0);
					//tx = Math.max(tx, width - projectedBoundingBox.max.x);
					//zoom.translate([tx, ty]);

					svg.select(".x.axis").call(xAxis);
					svg.select(".y.axis").call(yAxis);

					canvas.clearRect(0, 0, width, height);
					drawPoints(canvas, dd.points, scaleX, scaleY);
				});
				
				var canvas = d3.select("#profileCanvas")
				.attr("width", width)
				.attr("height", height)
				.call(zoom)
				.node().getContext("2d");
				
				//d3.select("svg#profile_draw_container").remove();
				d3.select("svg#profileSVG").selectAll("*").remove();
				
				svg = d3.select("svg#profileSVG")
				.call(zoom)
				.attr("width", (width + margin.left + margin.right).toString())
				.attr("height", (height + margin.top + margin.bottom).toString())
				.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
				.on("mousemove", function(){
					// TODO implement pointHighlight
				});
				
				
				// Create x axis
				var xAxis = d3.svg.axis()
					.scale(scaleX)
					.innerTickSize(-height)
					.outerTickSize(5)
					.orient("bottom")
					.ticks(10, "m");

				// Create y axis
				var yAxis = d3.svg.axis()
					.scale(scaleY)
					.innerTickSize(-width)
					.outerTickSize(5)
					.orient("left")
					.ticks(10, "m");
					
				// Append axis to the chart
				svg.append("g")
					.attr("class", "x axis")
					.call(xAxis);

				var gy = svg.append("g")
					.attr("class", "y axis")
					.call(yAxis);

				//gy.selectAll("g").filter(function(d) { return d; })
				//	.classed("minor", true);
					
				if(navigator.userAgent.indexOf("Firefox") == -1 ) {
					svg.select(".y.axis").attr("transform", "translate("+ (margin.left).toString() + "," + margin.top.toString() + ")");
					svg.select(".x.axis").attr("transform", "translate(" + margin.left.toString() + "," + (height + margin.top).toString() + ")");
				} else {
					svg.select(".x.axis").attr("transform", "translate( 0 ," + height.toString() + ")");
				}
				
				drawPoints(canvas, dd.points, scaleX, scaleY);
			
				document.getElementById("profile_num_points").innerHTML = Potree.utils.addCommas(dd.request.pointsServed);
				
				if(dd.request.pointsServed > 20*1000){
					dd.request.cancel();
				}
			},
			"onFinish": function(event){
			},
			"onCancel": function(){
			}
		});
		
		
	};
	
	
	
	
	
	this.domElement.addEventListener( 'click', onClick, false);
	this.domElement.addEventListener( 'dblclick', onDoubleClick, false);
	this.domElement.addEventListener( 'mousemove', onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', onMouseUp, true );
	
};


Potree.ProfileTool.prototype = Object.create( THREE.EventDispatcher.prototype );
