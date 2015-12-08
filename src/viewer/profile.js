
Potree.Viewer.Profile = function(viewer, element){
	var scope = this;

	this.viewer = viewer;
	this.enabled = true;
	this.element = element;
	this.currentProfile = null;
	this.requests = [];
	this.pointsProcessed = 0;
	this.margin = {top: 0, right: 0, bottom: 20, left: 40};
	this.maximized = false;
	
	
	$('#closeProfileContainer').click(function(){
		scope.hide();
		scope.enabled = false;
	});
	
	$('#profile_toggle_size_button').click(function(){
		scope.maximized = !scope.maximized;
	
		if(scope.maximized){
			$('#profile_window').css("height", "100%");
		}else{
			$('#profile_window').css("height", "30%");
		}
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

		// Get the same color map as Three
		var hr = scope.viewer.getHeightRange();
		var hrGeo = {
			min: scope.viewer.toGeo(new THREE.Vector3(0, hr.min, 0)).z,
			max: scope.viewer.toGeo(new THREE.Vector3(0, hr.max, 0)).z,
		};
		
		//var minRange = scope.viewer.toGeo(new THREE.Vector3(0, args.heightMin, 0));
		//var maxRange = scope.viewer.toGeo(new THREE.Vector3(0, args.heightMax, 0));
		var heightRange = hrGeo.max - hrGeo.min;
		var colorRange = [];
		var colorDomain = [];
		
		// Read the altitude gradient used in 3D scene
		var gradient = viewer.pointclouds[0].material.gradient;
		for (var c = 0; c < gradient.length; c++){
			colorDomain.push(hrGeo.min + heightRange * gradient[c][0]);
			colorRange.push('#' + gradient[c][1].getHexString());
		}
		
		// Altitude color map scale
		var colorRamp = d3.scale.linear()
		  .domain(colorDomain)
		  .range(colorRange)
		  .clamp(true);
		  
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
					var d =	{ };
					d.distance = dist;
					d.x = p.x;
					d.y = p.y;
					d.altitude = p.z;
					d.heightColor = colorRamp(p.z);
					d.color = points.color ? 'rgb(' + points.color[j][0] * 100 + '%,' + points.color[j][1] * 100 + '%,' + points.color[j][2] * 100 + '%)' : 'rgb(0,0,0)';
					d.intensity = points.intensity ? 'rgb(' + points.intensity[j] + '%,' + points.intensity[j] + '%,' + points.intensity[j] + '%)' : 'rgb(0,0,0)';
					d.intensityCode = points.intensity ? points.intensity[j] : 0;
					d.classificationCode = points.classification ? points.classification[j] : 0;
					d.returnNumber = points.returnNumber ? points.returnNumber[j] : 0;
					d.numberOfReturns = points.numberOfReturns ? points.numberOfReturns[j] : 0;
					data.push(d);
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
	
	this.pointHighlight = function(event){
    
		var pointSize = 6;
		
		// Find the hovered point if applicable
		var d = scope.points;
		var sx = scope.scaleX;
		var sy = scope.scaleY;
		var coordinates = [0, 0];
		coordinates = d3.mouse(this);
		var xs = coordinates[0];
		var ys = coordinates[1];
		
		// Fix FF vs Chrome discrepancy
		//if(navigator.userAgent.indexOf("Firefox") == -1 ) {
		//	xs = xs - scope.margin.left;
		//	ys = ys - scope.margin.top;
		//}
		var hP = [];
		var tol = pointSize;

		for (var i=0; i < d.length; i++){
			if(sx(d[i].distance) < xs + tol && sx(d[i].distance) > xs - tol && sy(d[i].altitude) < ys + tol && sy(d[i].altitude) > ys -tol){
				hP.push(d[i]); 
			}
		}

		if(hP.length > 0){
			var p = hP[0];
			this.hoveredPoint = hP[0];
			if(navigator.userAgent.indexOf("Firefox") == -1 ) {
				cx = scope.scaleX(p.distance) + scope.margin.left;
				cy = scope.scaleY(p.altitude) + scope.margin.top;
			} else {
				cx = scope.scaleX(p.distance);
				cy = scope.scaleY(p.altitude);
			}
			
			//cx -= pointSize / 2;
			cy -= pointSize / 2;
			
			var svg = d3.select("svg");
			d3.selectAll("rect").remove();
			var rectangle = svg.append("rect")
				.attr("x", cx)
				.attr("y", cy)
				.attr("id", p.id)
				.attr("width", pointSize)
				.attr("height", pointSize)
				.style("fill", 'yellow');
				
				
			var marker = $("#profile_selection_marker");
			marker.css("display", "initial");
			marker.css("left", cx + "px");
			marker.css("top", cy + "px");
			marker.css("width", pointSize + "px");
			marker.css("height", pointSize + "px");
			marker.css("background-color", "yellow");

			//var html = 'x: ' + Math.round(10 * p.x) / 10 + ' y: ' + Math.round(10 * p.y) / 10 + ' z: ' + Math.round( 10 * p.altitude) / 10 + '  -  ';
			//html += i18n.t('tools.classification') + ': ' + p.classificationCode + '  -  ';
			//html += i18n.t('tools.intensity') + ': ' + p.intensityCode;
			
			var html = 'x: ' + Math.round(10 * p.x) / 10 + ' y: ' + Math.round(10 * p.y) / 10 + ' z: ' + Math.round( 10 * p.altitude) / 10 + '  -  ';
			html += "offset: " + p.distance + '  -  ';
			html += "Classification: " + p.classificationCode + '  -  ';
			html += "Intensity: " + p.intensityCode;
			
			$('#profileInfo').css('color', 'yellow');
			$('#profileInfo').html(html);

		} else {
			d3.selectAll("rect").remove();
			$('#profileInfo').html("");
			
			var marker = $("#profile_selection_marker");
			marker.css("display", "none");
		}
	};
	
	this.strokeColor = function (d) {
		var material = scope.viewer.getMaterial();
		if (material === Potree.PointColorType.RGB) {
			return d.color;
		} else if (material === Potree.PointColorType.INTENSITY) {
			return d.intensity;
		} else if (material === Potree.PointColorType.CLASSIFICATION) {
			var classif = scope.viewer.pointclouds[0].material.classification;
			if (typeof classif[d.classificationCode] != 'undefined'){
				var color = 'rgb(' + classif[d.classificationCode].x * 100 + '%,';
				color += classif[d.classificationCode].y * 100 + '%,';
				color += classif[d.classificationCode].z * 100 + '%)';
				return color;
			} else {
				return 'rgb(255,255,255)';
			}
		} else if (material === Potree.PointColorType.HEIGHT) {
			return d.heightColor;
		} else if (material === Potree.PointColorType.RETURN_NUMBER) {
			
			if(d.numberOfReturns === 1){
					return 'rgb(255, 255, 0)';
			}else{
				if(d.returnNumber === 1){
					return 'rgb(255, 0, 0)';
				}else if(d.returnNumber === d.numberOfReturns){
					return 'rgb(0, 0, 255)';
				}else{
					return 'rgb(0, 255, 0)';
				}
			}
			
			return d.heightColor;
		} else {
			return d.color;
		}
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
		scope.points = [];
		scope.rangeX = [Infinity, -Infinity];
		scope.rangeY = [Infinity, -Infinity];
		
		scope.pointsProcessed = 0;
		
		for(var i = 0; i < scope.requests.length; i++){
			scope.requests[i].cancel();
		}
		scope.requests = [];
		
		var drawPoints = function(points, rangeX, rangeY) {
		
		
			var mileage = 0;
			for(var i = 0; i < profile.points.length; i++){
				var point = profile.points[i];
				var pointGeo = scope.viewer.toGeo(point);
				
				if(i > 0){
					var previousGeo = scope.viewer.toGeo(profile.points[i-1]);
					var dx = pointGeo.x - previousGeo.x;
					var dy = pointGeo.y - previousGeo.y;
					var distance = Math.sqrt(dx * dx + dy * dy);
					mileage += distance;
				}
				
				var radius = 4;
				
				var cx = scope.scaleX(mileage);
				var cy = scope.context.canvas.clientHeight;
				
				scope.context.beginPath();
				scope.context.arc(cx, cy, radius, 0, 2 * Math.PI, false);
				scope.context.fillStyle = '#a22';
				scope.context.fill();
			};
		
		
			var pointSize = 2;
			var i = -1, n = points.length, d, cx, cy;
			while (++i < n) {
				d = points[i];
				cx = scope.scaleX(d.distance);
				cy = scope.scaleY(d.altitude);
				scope.context.moveTo(cx, cy);
				scope.context.fillStyle = scope.strokeColor(d);
				scope.context.fillRect(cx, cy, pointSize, pointSize);
				//context.fillStyle = pv.profile.strokeColor(d);
			}
		};
		
		var projectedBoundingBox = null;
		
		var setupAndDraw = function(){
			var containerWidth = scope.element.clientWidth;
			var containerHeight = scope.element.clientHeight;
			
			var width = containerWidth - (scope.margin.left + scope.margin.right);
			var height = containerHeight - (scope.margin.top + scope.margin.bottom);
			
			scope.scaleX = d3.scale.linear();
			scope.scaleY = d3.scale.linear();
			
			var domainProfileWidth = scope.rangeX[1] - scope.rangeX[0];
			var domainProfileHeight = scope.rangeY[1] - scope.rangeY[0];
			var domainRatio = domainProfileWidth / domainProfileHeight;
			var rangeProfileWidth = width;
			var rangeProfileHeight = height;
			var rangeRatio = rangeProfileWidth / rangeProfileHeight;
			
			if(domainRatio < rangeRatio){
				// canvas scale
				var targetWidth = domainProfileWidth * (rangeProfileHeight / domainProfileHeight);
				scope.scaleY.range([height, 0]);
				scope.scaleX.range([width / 2 - targetWidth / 2, width / 2 + targetWidth / 2]);
				
				// axis scale
				var domainScale = rangeRatio / domainRatio;
				var domainScaledWidth = domainProfileWidth * domainScale;
				scope.axisScaleX = d3.scale.linear()
					.domain([
						domainProfileWidth / 2 - domainScaledWidth / 2 , 
						domainProfileWidth / 2 + domainScaledWidth / 2 ])
					.range([0, width]);
				scope.axisScaleY = d3.scale.linear()
					.domain(scope.rangeY)
					.range([height, 0]);
			}else{
				// canvas scale
				var targetHeight = domainProfileHeight* (rangeProfileWidth / domainProfileWidth);
				scope.scaleX.range([0, width]);
				scope.scaleY.range([height / 2 + targetHeight / 2, height / 2 - targetHeight / 2]);
				
				// axis scale
				var domainScale =  domainRatio / rangeRatio;
				var domainScaledHeight = domainProfileHeight * domainScale;
				var domainHeightCentroid = (scope.rangeY[1] + scope.rangeY[0]) / 2;
				scope.axisScaleX = d3.scale.linear()
					.domain(scope.rangeX)
					.range([0, width]);
				scope.axisScaleY = d3.scale.linear()
					.domain([
						domainHeightCentroid - domainScaledHeight / 2 , 
						domainHeightCentroid + domainScaledHeight / 2 ])
					.range([height, 0]);
			}
			scope.scaleX.domain(scope.rangeX);
			scope.scaleY.domain(scope.rangeY);
			
			

			scope.axisZoom = d3.behavior.zoom()
				.x(scope.axisScaleX)
				.y(scope.axisScaleY)
				.scaleExtent([0,128])
				.size([width, height]);
				
			scope.zoom = d3.behavior.zoom()
			.x(scope.scaleX)
			.y(scope.scaleY)
			.scaleExtent([0,128])
			.size([width, height])
			.on("zoom",  function(){
				//var t = zoom.translate();
				//var tx = t[0];
				//var ty = t[1];
				//
				//tx = Math.min(tx, 0);
				//tx = Math.max(tx, width - projectedBoundingBox.max.x);
				//zoom.translate([tx, ty]);
				
				scope.axisZoom.translate(scope.zoom.translate());
				scope.axisZoom.scale(scope.zoom.scale());
					
				svg.select(".x.axis").call(xAxis);
				svg.select(".y.axis").call(yAxis);

				scope.context.clearRect(0, 0, width, height);
				drawPoints(scope.points, scope.rangeX, scope.rangeY);
			});
			
			scope.context = d3.select("#profileCanvas")
				.attr("width", width)
				.attr("height", height)
				.call(scope.zoom)
				.node().getContext("2d");
			
			
			//d3.select("svg#profile_draw_container").remove();
			d3.select("svg#profileSVG").selectAll("*").remove();
			
			svg = d3.select("svg#profileSVG")
			.call(scope.zoom)
			.attr("width", (width + scope.margin.left + scope.margin.right).toString())
			.attr("height", (height + scope.margin.top + scope.margin.bottom).toString())
			.attr("transform", "translate(" + scope.margin.left + "," + scope.margin.top + ")")
			.on("mousemove", function(){
//				scope.pointHighlight
				// TODO implement pointHighlight
			});
			//scope.context.canvas.addEventListener("mousemove", scope.pointHighlight);
			
			d3.select("#profileCanvas")
			.on("mousemove", scope.pointHighlight);
			
			
			// Create x axis
			var xAxis = d3.svg.axis()
				.scale(scope.axisScaleX)
				.innerTickSize(-height)
				.outerTickSize(5)
				.orient("bottom")
				.ticks(10, "m");

			// Create y axis
			var yAxis = d3.svg.axis()
				.scale(scope.axisScaleY)
				.innerTickSize(-width)
				.outerTickSize(5)
				.orient("left")
				.ticks(10, "m");
				
			// Append axis to the chart
			var gx = svg.append("g")
				.attr("class", "x axis")
				.call(xAxis);

			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis);
				
			if(navigator.userAgent.indexOf("Firefox") == -1 ) {
				svg.select(".y.axis").attr("transform", "translate("+ (scope.margin.left).toString() + "," + scope.margin.top.toString() + ")");
				svg.select(".x.axis").attr("transform", "translate(" + scope.margin.left.toString() + "," + (height + scope.margin.top).toString() + ")");
			} else {
				svg.select(".x.axis").attr("transform", "translate( 0 ," + height.toString() + ")");
			}
			
			drawPoints(scope.points, scope.rangeX, scope.rangeY);
			
			document.getElementById("profile_num_points").innerHTML = Potree.utils.addCommas(scope.pointsProcessed) + " ( threshold: 20k )";
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
					var points = result.data;
					scope.points = scope.points.concat(points);
					
					var batchRangeX = [d3.min(points, function(d) { return d.distance; }), d3.max(points, function(d) { return d.distance; })];
					var batchRangeY = [d3.min(points, function(d) { return d.altitude; }), d3.max(points, function(d) { return d.altitude; })];
					
					scope.rangeX = [ Math.min(scope.rangeX[0], batchRangeX[0]), Math.max(scope.rangeX[1], batchRangeX[1]) ];
					scope.rangeY = [ Math.min(scope.rangeY[0], batchRangeY[0]), Math.max(scope.rangeY[1], batchRangeY[1]) ];
					
					scope.pointsProcessed += result.data.length;
					
					setupAndDraw();
					
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
	viewer.addEventListener("material_changed", function(){
		drawOnChange({profile: scope.currentProfile});
	});
	viewer.addEventListener("height_range_changed", function(){
		drawOnChange({profile: scope.currentProfile});
	});
	
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