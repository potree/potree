
Potree.Viewer.Profile = class ProfileWindow{
	
	constructor(viewer, element){
		this.viewer = viewer;
		this.enabled = true;
		this.element = element;
		this.currentProfile = null;
		this.requests = [];
		this.pointsProcessed = 0;
		this.margin = {top: 0, right: 0, bottom: 20, left: 40};
		this.maximized = false;
		this.threshold = 20*1000;
		
		this.scheduledDraw = null;
		
		$('#closeProfileContainer').click(() => {
			this.hide();
			this.enabled = false;
		});
		
		$('#profile_toggle_size_button').click(() => {
			this.maximized = !this.maximized;
		
			if(this.maximized){
				$('#profile_window').css("height", "100%");
			}else{
				$('#profile_window').css("height", "30%");
			}
		});
		
		//this.drawOnChange = (event) => {
		//	this.redraw();
		//};
		
		this.redraw = () => {
			if(this.currentProfile){
				this.draw(this.currentProfile);
			}
		};
		
		viewer.addEventListener("height_range_changed", this.redraw);
		
		let width = document.getElementById('profile_window').clientWidth;
		let height = document.getElementById('profile_window').clientHeight;
		let resizeLoop = () => {
			requestAnimationFrame(resizeLoop);

			let newWidth = document.getElementById('profile_window').clientWidth;
			let newHeight = document.getElementById('profile_window').clientHeight;

			if(newWidth !== width || newHeight !== height){
				setTimeout(this.redraw, 50, {profile: this.currentProfile});
			}

			width = newWidth;
			height = newHeight;
		};
		requestAnimationFrame(resizeLoop);
	}
	
	show(){
		$('#profile_window').fadeIn();
		this.enabled = true;
	};
	
	hide(){
		$('#profile_window').fadeOut();
	};
	
	cancel(){
		for(let request of this.requests){
			request.cancel();
		}
		
		this.requests = [];
	};
	
	preparePoints(profileProgress){
	
		let segments = profileProgress.segments;
		if (segments.length === 0){
			return false;
		}
		
		let data = [];
		let distance = 0;
		let totalDistance = 0;
		let min = new THREE.Vector3(Math.max());
		let max = new THREE.Vector3(0);

		// Get the same color map as Three
		let hr = this.viewer.getHeightRange();
		
		let heightRange = hr.max - hr.min;
		let colorRange = [];
		let colorDomain = [];
		
		// Read the altitude gradient used in 3D scene
		let gradient = viewer.scene.pointclouds[0].material.gradient;
		for (let c = 0; c < gradient.length; c++){
			colorDomain.push(hr.min + heightRange * gradient[c][0]);
			colorRange.push('#' + gradient[c][1].getHexString());
		}
		
		// Altitude color map scale
		let colorRamp = d3.scale.linear()
		  .domain(colorDomain)
		  .range(colorRange)
		  .clamp(true);
		  
		// Iterate the profile's segments
		for(let segment of segments){
			let sv = new THREE.Vector3().subVectors(segment.end, segment.start).setZ(0)
			let segmentLength = sv.length();
			let points = segment.points;

			// Iterate the segments' points
			for(let j = 0; j < points.numPoints; j++){
				let p = points.position[j];
				let pl = new THREE.Vector3().subVectors(p, segment.start).setZ(0);
				
				min.min(p);
				max.max(p);
				
				let distance = totalDistance + pl.length();
				
				let d = {
					distance: distance,
					x: p.x,
					y: p.y,
					z: p.z,
					altitude: p.z,
					heightColor: colorRamp(p.z),
					color: points.color ? points.color[j] : [0, 0, 0],
					intensity: points.intensity ? points.intensity[j] : 0,
					classification: points.classification ? points.classification[j] : 0,
					returnNumber: points.returnNumber ? points.returnNumber[j] : 0,
					numberOfReturns: points.numberOfReturns ? points.numberOfReturns[j] : 0,
					pointSourceID: points.pointSourceID ? points.pointSourceID[j] : 0,
				};
				
				data.push(d);
			}

			// Increment distance from the profile start point
			totalDistance += segmentLength;
		}

		let output = {
			'data': data,
			'minX': min.x,
			'minY': min.y,
			'minZ': min.z,
			'maxX': max.x,
			'maxY': max.y,
			'maxZ': max.z
		};

		return output;
	};
	
	pointHighlight(coordinates){
    
		let pointSize = 6;
		
		let svg = d3.select("svg#profileSVG");
		
		// Find the hovered point if applicable
		let d = this.points;
		let sx = this.scaleX;
		let sy = this.scaleY;
		let xs = coordinates[0];
		let ys = coordinates[1];
		
		// Fix FF vs Chrome discrepancy
		//if(navigator.userAgent.indexOf("Firefox") == -1 ) {
		//	xs = xs - this.margin.left;
		//	ys = ys - this.margin.top;
		//}
		let hP = [];
		let tol = pointSize;

		for (let i=0; i < d.length; i++){
			if(sx(d[i].distance) < xs + tol && sx(d[i].distance) > xs - tol && sy(d[i].altitude) < ys + tol && sy(d[i].altitude) > ys -tol){
				hP.push(d[i]); 
			}
		}

		if(hP.length > 0){
			let p = hP[0];
			this.hoveredPoint = hP[0];
			let cx, cy;
			if(navigator.userAgent.indexOf("Firefox") == -1 ) {
				cx = this.scaleX(p.distance) + this.margin.left;
				cy = this.scaleY(p.altitude) + this.margin.top;
			} else {
				cx = this.scaleX(p.distance);
				cy = this.scaleY(p.altitude);
			}
			
			//cx -= pointSize / 2;
			cy -= pointSize / 2;
			
			//let svg = d3.select("svg#profileSVG");
			d3.selectAll("rect").remove();
			let rectangle = svg.append("rect")
				.attr("x", cx)
				.attr("y", cy)
				.attr("id", p.id)
				.attr("width", pointSize)
				.attr("height", pointSize)
				.style("fill", 'yellow');
				
				
			let marker = $("#profile_selection_marker");
			marker.css("display", "initial");
			marker.css("left", cx + "px");
			marker.css("top", cy + "px");
			marker.css("width", pointSize + "px");
			marker.css("height", pointSize + "px");
			marker.css("background-color", "yellow");

			//let html = 'x: ' + Math.round(10 * p.x) / 10 + ' y: ' + Math.round(10 * p.y) / 10 + ' z: ' + Math.round( 10 * p.altitude) / 10 + '  -  ';
			//html += i18n.t('tools.classification') + ': ' + p.classificationCode + '  -  ';
			//html += i18n.t('tools.intensity') + ': ' + p.intensityCode;
			
			let html = 'x: ' + Math.round(10 * p.x) / 10 + ' y: ' + Math.round(10 * p.y) / 10 + ' z: ' + Math.round( 10 * p.altitude) / 10 + '  -  ';
			html += "offset: " + p.distance.toFixed(3) + '  -  ';
			html += "Classification: " + p.classification + '  -  ';
			html += "Intensity: " + p.intensity;
			
			$('#profileInfo').css('color', 'yellow');
			$('#profileInfo').html(html);

		} else {
			d3.selectAll("rect").remove();
			$('#profileInfo').html("");
			
			let marker = $("#profile_selection_marker");
			marker.css("display", "none");
		}
	};
	
	strokeColor(d){
		let material = this.viewer.getMaterial();
		if (material === Potree.PointColorType.RGB) {
			let [r, g, b] = d.color.map(e => parseInt(e));
			
			return `rgb( ${r}, ${g}, ${b})`;
		} else if (material === Potree.PointColorType.INTENSITY) {
			let irange = viewer.getIntensityRange();
			let i = parseInt(255 * (d.intensity - irange[0]) / (irange[1] - irange[0]));
			
			return `rgb(${i}, ${i}, ${i})`;
		} else if (material === Potree.PointColorType.CLASSIFICATION) {
			let classif = this.viewer.scene.pointclouds[0].material.classification;
			if (typeof classif[d.classification] != 'undefined'){
				let color = 'rgb(' + classif[d.classification].x * 100 + '%,';
				color += classif[d.classification].y * 100 + '%,';
				color += classif[d.classification].z * 100 + '%)';
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
	}

	draw(profile){
		if(!this.enabled){
			return;
		}
		
		if(!profile){
			return;
		}
		
		if(this.viewer.scene.pointclouds.length === 0){
			return;
		}
		
		// avoid too many expensive draws/redraws
		// 2d profile draws don't need frame-by-frame granularity, it's
		// fine to handle a redraw once every 100ms
		let executeScheduledDraw = () => {
			this.actuallyDraw(this.scheduledDraw);
			this.scheduledDraw = null;
		};
		
		if(!this.scheduledDraw){
			setTimeout(executeScheduledDraw, 100);
		}
		this.scheduledDraw = profile;
	}
		
	actuallyDraw(profile){

		if(this.context){
			let containerWidth = this.element.clientWidth;
			let containerHeight = this.element.clientHeight;
			
			let width = containerWidth - (this.margin.left + this.margin.right);
			let height = containerHeight - (this.margin.top + this.margin.bottom);
			this.context.clearRect(0, 0, width, height);
		}
		
		if(this.currentProfile){
			this.currentProfile.removeEventListener("marker_moved", this.redraw);
			this.currentProfile.removeEventListener("marker_added", this.redraw);
			this.currentProfile.removeEventListener("marker_removed", this.redraw);
			this.currentProfile.removeEventListener("width_changed", this.redraw);
			viewer.removeEventListener("material_changed", this.redraw);
			viewer.removeEventListener("height_range_changed", this.redraw);
			viewer.removeEventListener("intensity_range_changed", this.redraw);
		}
		
		
		this.currentProfile = profile;
		
		{
			this.currentProfile.addEventListener("marker_moved", this.redraw);
			this.currentProfile.addEventListener("marker_added", this.redraw);
			this.currentProfile.addEventListener("marker_removed", this.redraw);
			this.currentProfile.addEventListener("width_changed", this.redraw);
			viewer.addEventListener("material_changed", this.redraw);
			viewer.addEventListener("height_range_changed", this.redraw);
			viewer.addEventListener("intensity_range_changed", this.redraw);
		}

		if(!this.__drawData){
			this.__drawData = {};
		}
		this.points = [];
		this.rangeX = [Infinity, -Infinity];
		this.rangeY = [Infinity, -Infinity];
		
		this.pointsProcessed = 0;
		
		for(let request of this.requests){
			request.cancel();
		}
		this.requests = [];
		
		let drawPoints = (points, rangeX, rangeY) => {
		
			let mileage = 0;
			for(let i = 0; i < profile.points.length; i++){
				let point = profile.points[i];
				
				if(i > 0){
					let previous = profile.points[i-1];
					let dx = point.x - previous.x;
					let dy = point.y - previous.y;
					let distance = Math.sqrt(dx * dx + dy * dy);
					mileage += distance;
				}
				
				let radius = 4;
				
				let cx = this.scaleX(mileage);
				let cy = this.context.canvas.clientHeight;
				
				this.context.beginPath();
				this.context.arc(cx, cy, radius, 0, 2 * Math.PI, false);
				this.context.fillStyle = '#a22';
				this.context.fill();
			};
		
		
			let pointSize = 2;
			let i = -1, n = points.length, d, cx, cy;
			while (++i < n) {
				d = points[i];
				cx = this.scaleX(d.distance);
				cy = this.scaleY(d.altitude);
				this.context.beginPath();
				this.context.moveTo(cx, cy);
				this.context.fillStyle = this.strokeColor(d);
				this.context.fillRect(cx, cy, pointSize, pointSize);
			}
		};
		
		let projectedBoundingBox = null;
		
		let setupAndDraw = () => {
			let containerWidth = this.element.clientWidth;
			let containerHeight = this.element.clientHeight;
			
			let width = containerWidth - (this.margin.left + this.margin.right);
			let height = containerHeight - (this.margin.top + this.margin.bottom);
			
			this.scaleX = d3.scale.linear();
			this.scaleY = d3.scale.linear();
			
			let domainProfileWidth = this.rangeX[1] - this.rangeX[0];
			let domainProfileHeight = this.rangeY[1] - this.rangeY[0];
			let domainRatio = domainProfileWidth / domainProfileHeight;
			let rangeProfileWidth = width;
			let rangeProfileHeight = height;
			let rangeRatio = rangeProfileWidth / rangeProfileHeight;
			
			if(domainRatio < rangeRatio){
				// canvas scale
				let targetWidth = domainProfileWidth * (rangeProfileHeight / domainProfileHeight);
				this.scaleY.range([height, 0]);
				this.scaleX.range([width / 2 - targetWidth / 2, width / 2 + targetWidth / 2]);
				
				// axis scale
				let domainScale = rangeRatio / domainRatio;
				let domainScaledWidth = domainProfileWidth * domainScale;
				this.axisScaleX = d3.scale.linear()
					.domain([
						domainProfileWidth / 2 - domainScaledWidth / 2 , 
						domainProfileWidth / 2 + domainScaledWidth / 2 ])
					.range([0, width]);
				this.axisScaleY = d3.scale.linear()
					.domain(this.rangeY)
					.range([height, 0]);
			}else{
				// canvas scale
				let targetHeight = domainProfileHeight* (rangeProfileWidth / domainProfileWidth);
				this.scaleX.range([0, width]);
				this.scaleY.range([height / 2 + targetHeight / 2, height / 2 - targetHeight / 2]);
				
				// axis scale
				let domainScale =  domainRatio / rangeRatio;
				let domainScaledHeight = domainProfileHeight * domainScale;
				let domainHeightCentroid = (this.rangeY[1] + this.rangeY[0]) / 2;
				this.axisScaleX = d3.scale.linear()
					.domain(this.rangeX)
					.range([0, width]);
				this.axisScaleY = d3.scale.linear()
					.domain([
						domainHeightCentroid - domainScaledHeight / 2 , 
						domainHeightCentroid + domainScaledHeight / 2 ])
					.range([height, 0]);
			}
			this.scaleX.domain(this.rangeX);
			this.scaleY.domain(this.rangeY);
			
			

			this.axisZoom = d3.behavior.zoom()
				.x(this.axisScaleX)
				.y(this.axisScaleY)
				.scaleExtent([0,128])
				.size([width, height]);
				
			this.zoom = d3.behavior.zoom()
			.x(this.scaleX)
			.y(this.scaleY)
			.scaleExtent([0,128])
			.size([width, height])
			.on("zoom",  () => {
				this.axisZoom.translate(this.zoom.translate());
				this.axisZoom.scale(this.zoom.scale());
					
				let svg = d3.select("svg#profileSVG");
				svg.select(".x.axis").call(xAxis);
				svg.select(".y.axis").call(yAxis);

				this.context.clearRect(0, 0, width, height);
				drawPoints(this.points, this.rangeX, this.rangeY);
			});
			
			this.context = d3.select("#profileCanvas")
				.attr("width", width)
				.attr("height", height)
				.call(this.zoom)
				.node().getContext("2d");
			
			d3.select("svg#profileSVG").selectAll("*").remove();
			
			let svg = d3.select("svg#profileSVG")
				.call(this.zoom)
				.attr("width", (width + this.margin.left + this.margin.right).toString())
				.attr("height", (height + this.margin.top + this.margin.bottom).toString())
				.attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
			
			let scope = this;
			d3.select("#profileCanvas").on("mousemove", function(){
				let coord = d3.mouse(this);
				scope.pointHighlight(coord);
			});
			
			// Create x axis
			let xAxis = d3.svg.axis()
				.scale(this.axisScaleX)
				.innerTickSize(-height)
				.outerTickSize(5)
				.orient("bottom")
				.ticks(10, "m");

			// Create y axis
			let yAxis = d3.svg.axis()
				.scale(this.axisScaleY)
				.innerTickSize(-width)
				.outerTickSize(5)
				.orient("left")
				.ticks(10, "m");
				
			// Append axis to the chart
			let gx = svg.append("g")
				.attr("class", "x axis")
				.call(xAxis);

			svg.append("g")
				.attr("class", "y axis")
				.call(yAxis);
				
			if(navigator.userAgent.indexOf("Firefox") == -1 ) {
				svg.select(".y.axis").attr("transform", "translate("+ (this.margin.left).toString() + "," + this.margin.top.toString() + ")");
				svg.select(".x.axis").attr("transform", "translate(" + this.margin.left.toString() + "," + (height + this.margin.top).toString() + ")");
			} else {
				svg.select(".x.axis").attr("transform", "translate( 0 ," + height.toString() + ")");
			}
			
			drawPoints(this.points, this.rangeX, this.rangeY);
			
			document.getElementById("profile_num_points").innerHTML = Potree.utils.addCommas(this.pointsProcessed) + " ";
		};
		
		
		for(let pointcloud of this.viewer.scene.pointclouds.filter(p => p.visible)){
			
			let request = pointcloud.getPointsInProfile(profile, null, {
				"onProgress": (event) => {
					if(!this.enabled){
						return;
					}
					
					if(!projectedBoundingBox){
						projectedBoundingBox = event.points.projectedBoundingBox;
					}else{
						projectedBoundingBox.union(event.points.projectedBoundingBox);
					}
					
					let result = this.preparePoints(event.points);
					let points = result.data;
					this.points = this.points.concat(points);
					
					let batchRangeX = [d3.min(points, function(d) { return d.distance; }), d3.max(points, function(d) { return d.distance; })];
					let batchRangeY = [d3.min(points, function(d) { return d.altitude; }), d3.max(points, function(d) { return d.altitude; })];
					
					this.rangeX = [ Math.min(this.rangeX[0], batchRangeX[0]), Math.max(this.rangeX[1], batchRangeX[1]) ];
					this.rangeY = [ Math.min(this.rangeY[0], batchRangeY[0]), Math.max(this.rangeY[1], batchRangeY[1]) ];
					
					this.pointsProcessed += result.data.length;
					
					setupAndDraw();
					
					if(this.pointsProcessed > this.threshold){
						this.cancel();
					}
				},
				"onFinish": (event) => {
					if(!this.enabled){
						return;
					}
				},
				"onCancel": () => {
					if(!this.enabled){
						return;
					}
				}
			});	
			
			this.requests.push(request);
		}
	}
	
	setThreshold(value){
		this.threshold = value;
		
		this.redraw();
	}
	
	getPointsInProfileAsCSV(){
		if(this.points.length === 0){
			return "no points in profile";
		}
		
		let file = "";
		let points = this.points.slice();
		
		points.sort((a, b) => (a.distance - b.distance));
		
		{ // header-line
			let header = "x, y";
			
			if(points[0].hasOwnProperty("color")){
				header += ", r, g, b";
			}
			
			if(points[0].hasOwnProperty("intensity")){
				header += ", intensity";
			}
			
			if(points[0].hasOwnProperty("classification")){
				header += ", classification";
			}
			
			if(points[0].hasOwnProperty("numberOfReturns")){
				header += ", numberOfReturns";
			}
			
			if(points[0].hasOwnProperty("pointSourceID")){
				header += ", pointSourceID";
			}
			
			if(points[0].hasOwnProperty("returnNumber")){
				header += ", returnNumber";
			}
			
			file += header + "\n";
		}

		// actual data
		for(let point of points){
			let line = point.distance.toFixed(4) + ", ";
			line += point.altitude.toFixed(4) + ", ";
			
			if(point.hasOwnProperty("color")){
				line += point.color.join(", ");
			}
			
			if(point.hasOwnProperty("intensity")){
				line += ", " + point.intensity;
			}
			
			if(point.hasOwnProperty("classification")){
				line += ", " + point.classification;
			}
			
			if(point.hasOwnProperty("numberOfReturns")){
				line += ", " + point.numberOfReturns;
			}
			
			if(point.hasOwnProperty("pointSourceID")){
				line += ", " + point.pointSourceID;
			}
			
			if(point.hasOwnProperty("returnNumber")){
				line += ", " + point.returnNumber;
			}
			
			line += "\n";
			
			file = file + line;
		}
		
		return file;
	}
	
	getPointsInProfileAsLas(){
		let points = this.points;
		let boundingBox = new THREE.Box3();
		
		for(let point of points){
			boundingBox.expandByPoint(point);
		}
		
		let offset = boundingBox.min.clone();
		let diagonal = boundingBox.min.distanceTo(boundingBox.max);
		let scale = new THREE.Vector3(0.01, 0.01, 0.01);
		if(diagonal > 100*1000){
			scale = new THREE.Vector3(0.01, 0.01, 0.01);
		}else{
			scale = new THREE.Vector3(0.001, 0.001, 0.001);
		}
		
		let setString = function(string, offset, buffer){
			let view = new Uint8Array(buffer);
			
			for(let i = 0; i < string.length; i++){
				let charCode = string.charCodeAt(i);
				view[offset + i] = charCode;
			}
		}
		
		let buffer = new ArrayBuffer(227 + 28 * points.length);
		let view = new DataView(buffer);
		let u8View = new Uint8Array(buffer);
		//let u16View = new Uint16Array(buffer);
		
		setString("LASF", 0, buffer);
		u8View[24] = 1;
		u8View[25] = 2;
		
		// system identifier o:26 l:32
		
		// generating software o:58 l:32
		setString("potree 1.4", 58, buffer); 
		
		// file creation day of year o:90 l:2
		// file creation year o:92 l:2
		
		// header size o:94 l:2
		view.setUint16(94, 227, true);
		
		// offset to point data o:96 l:4
		view.setUint32(96, 227, true);
		
		// number of letiable length records o:100 l:4
		
		// point data record format 104 1
		u8View[104] = 2;
		
		// point data record length 105 2
		view.setUint16(105, 28, true);
		
		// number of point records 107 4 
		view.setUint32(107, points.length, true);
		
		// number of points by return 111 20
		
		// x scale factor 131 8
		view.setFloat64(131, scale.x, true);
		
		// y scale factor 139 8
		view.setFloat64(139, scale.y, true);
		
		// z scale factor 147 8
		view.setFloat64(147, scale.z, true);
		
		// x offset 155 8
		view.setFloat64(155, offset.x, true);
		
		// y offset 163 8
		view.setFloat64(163, offset.y, true);
		
		// z offset 171 8
		view.setFloat64(171, offset.z, true);
		
		let boffset = 227;
		for(let i = 0; i < points.length; i++){
			let point = points[i];
			let position = new THREE.Vector3(point.x, point.y, point.z);
			
			let ux = parseInt((position.x - offset.x) / scale.x);
			let uy = parseInt((position.y - offset.y) / scale.y);
			let uz = parseInt((position.z - offset.z) / scale.z);
			
			view.setUint32(boffset + 0, ux, true);
			view.setUint32(boffset + 4, uy, true);
			view.setUint32(boffset + 8, uz, true);
			
			view.setUint16(boffset + 12, (point.intensity), true);
			let rt = point.returnNumber;
			rt += (point.numberOfReturns << 3);
			view.setUint8(boffset + 14, rt);
			
			// classification
			view.setUint8(boffset + 15, point.classification);
			// scan angle rank
			// user data
			// point source id
			view.setUint16(boffset + 18, point.pointSourceID);
			view.setUint16(boffset + 20, (point.color[0] * 255), true);
			view.setUint16(boffset + 22, (point.color[1] * 255), true);
			view.setUint16(boffset + 24, (point.color[2] * 255), true);
			
			boffset += 28;
		}
		
		// max x 179 8
		view.setFloat64(179, boundingBox.max.x, true);
		
		// min x 187 8
		view.setFloat64(187, boundingBox.min.x, true);
		
		// max y 195 8
		view.setFloat64(195, boundingBox.max.y, true);
		
		// min y 203 8
		view.setFloat64(203, boundingBox.min.y, true);
		
		// max z 211 8
		view.setFloat64(211, boundingBox.max.z, true);
		
		// min z 219 8
		view.setFloat64(219, boundingBox.min.z, true);
		
		return buffer;
	}

};