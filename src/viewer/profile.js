
Potree.Viewer.Profile = function(viewer, element){
	var scope = this;

	this.viewer = viewer;
	this.enabled = true;
	this.element = element;
	this.currentProfile = null;
	this.requests = [];
	this.pointsProcessed = 0;
	
	
	$('#closeProfileContainer').click(function(){
		scope.hide();
		scope.enabled = false;
	});
	
	this.show = function(){
		$('#profile_window').fadeIn();
		scope.enabled = true;
	};
	
	this.hide = function(){
		$('#profile_window').fadeOut();
	};
	
	this.cancel = function(){
		for(var i = 0; i < scope.requests.length; i++){
			scope.requests[i].cancel();
		}
		
		scope.requests = [];
	};
	
	this.preparePoints = function(profileProgress){
	
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
		//var minRange = scope.viewer.toGeo(new THREE.Vector3(0, args.heightMin, 0));
		//var maxRange = scope.viewer.toGeo(new THREE.Vector3(0, args.heightMax, 0));
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
			var segStartGeo = scope.viewer.toGeo(segment.start);
			var segEndGeo = scope.viewer.toGeo(segment.end);
			var xOA = segEndGeo.x - segStartGeo.x;
			var yOA = segEndGeo.y - segStartGeo.y;
			var segmentLength = Math.sqrt(xOA * xOA + yOA * yOA);
			var points = segment.points;

			// Iterate the segments' points
			for(var j = 0; j < points.numPoints; j++){
				var p = scope.viewer.toGeo(points.position[j]);
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
	
	this.redraw = function(){
		scope.draw(scope.currentProfile);
	};

	this.draw = function(profile){
		// TODO handle all pointclouds
		// TODO are the used closures safe for garbage collection?
		
		if(!scope.enabled){
			return;
		}
		if(profile){
			if(profile.points.length < 2){
				return;
			}
		}else{
			return;
		}
		if(scope.viewer.pointclouds.length === 0){
			return;
		}
		
		
		scope.currentProfile = profile;

		if(!scope.__drawData){
			scope.__drawData = {};
		}
		var dd = scope.__drawData;
		dd.points = [];
		
		scope.pointsProcessed = 0;
		
		for(var i = 0; i < scope.requests.length; i++){
			scope.requests[i].cancel();
		}
		scope.requests = [];
		
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
		
		var projectedBoundingBox = null;
		
		var setupAndDraw = function(){
			var containerWidth = scope.element.clientWidth;
			var containerHeight = scope.element.clientHeight;
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
			
			document.getElementById("profile_num_points").innerHTML = Potree.utils.addCommas(scope.pointsProcessed);
		};
		
		
		for(var i = 0; i < scope.viewer.pointclouds.length; i++){
			var pointcloud = scope.viewer.pointclouds[i];
			var request = pointcloud.getPointsInProfile(profile, null, {
				"onProgress": function(event){
					if(!scope.enabled){
						return;
					}
					
					if(!projectedBoundingBox){
						projectedBoundingBox = event.points.projectedBoundingBox;
					}else{
						projectedBoundingBox.union(event.points.projectedBoundingBox);
					}
					
					var result = scope.preparePoints(event.points);
					dd.points = dd.points.concat(result.data);
					
					setupAndDraw();
					
					scope.pointsProcessed += event.request.pointsServed;
					
					if(scope.pointsProcessed > 20*1000){
						scope.cancel();
					}
				},
				"onFinish": function(event){
					if(!scope.enabled){
						return;
					}
				},
				"onCancel": function(){
					if(!scope.enabled){
						return;
					}
				}
			});	
			
			scope.requests.push(request);
		}
	};
	
	var drawOnChange = function(event){
		if(event.profile === scope.currentProfile){
			scope.redraw();
		}
	};
	
	viewer.profileTool.addEventListener("marker_moved", drawOnChange);
	viewer.profileTool.addEventListener("width_changed", drawOnChange);
	//$(window).resize(function(event){
	//	console.log("resized");
	//	drawOnChange({profile: scope.currentProfile});
	//});
	
	
	var width = document.getElementById('profile_window').clientWidth;
	var height = document.getElementById('profile_window').clientHeight;
	function resizeLoop(){
		requestAnimationFrame(resizeLoop);
			
		var newWidth = document.getElementById('profile_window').clientWidth;
		var newHeight = document.getElementById('profile_window').clientHeight;
		
		if(newWidth !== width || newHeight !== height){
			setTimeout(drawOnChange, 50, {profile: scope.currentProfile});
		}
		
		width = newWidth;
		height = newHeight;
	};
	requestAnimationFrame(resizeLoop);
	
	
	
};