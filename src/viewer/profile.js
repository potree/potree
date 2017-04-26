
Potree.ProfilePointStore = class ProfilePointStore{
	
	constructor(profile){
		this.profile = profile;
		this.boundingBox = new THREE.Box3();
		this.projectedBoundingBox = new THREE.Box3();
		this.maxPoints = 50*1000;
		this.numPoints = 0;
		
		this.buffers = {
			position: new Float32Array(3 * this.maxPoints),
			color: new Uint8Array(3 * this.maxPoints),
			intensity: new Uint16Array(this.maxPoints),
			classification: new Uint8Array(this.maxPoints),
		};
		
		this.segments = [];
		for(let i = 0; i < profile.points.length - 1; i++){
			let start = profile.points[i + 0];
			let end = profile.points[i + 1];
			
			let startGround = new THREE.Vector3(start.x, start.y, 0);
			let endGround = new THREE.Vector3(end.x, end.y, 0);
			
			let center = new THREE.Vector3().addVectors(endGround, startGround).multiplyScalar(0.5);
			let length = startGround.distanceTo(endGround);
			
			let segment = {
				start: start,
				end: end,
				points: {},
				length: length,
				numPoints: 0
			};
			
			this.segments.push(segment);
		}
	}
	
	onProgress(progress){
		
		if(this.segments.length !== progress.segments.length){
			return;
		}
		
		for(let i = 0; i < progress.segments.length; i++){
			let sourceSegment = progress.segments[i];
			let targetSegment = this.segments[i];

			for(let attribute of Object.keys(sourceSegment.points)){
				if(targetSegment.points[attribute] === undefined){
					targetSegment.points[attribute] = new Array(targetSegment.numPoints).fill(0);
				}
				
				targetSegment.points[attribute] = targetSegment.points[attribute]
					.concat(sourceSegment.points[attribute]);
					
				if(attribute === "position"){
					for(let j = 0; j < sourceSegment.numPoints; j++){
						
						let x = sourceSegment.points.mileage[j];
						let y = sourceSegment.points.position[j].z;
						let z = 0;
						
						let offset = 3 * (this.numPoints + j);
						
						this.buffers.position[offset + 0] = x;
						this.buffers.position[offset + 1] = y;
						this.buffers.position[offset + 2] = z;
					}
				}else if(attribute === "color"){
					for(let j = 0; j < sourceSegment.numPoints; j++){
						
						let r = sourceSegment.points.color[j][0];
						let g = sourceSegment.points.color[j][1];
						let b = sourceSegment.points.color[j][2];
						
						let offset = 3 * (this.numPoints + j);
						
						this.buffers.color[offset + 0] = r;
						this.buffers.color[offset + 1] = g;
						this.buffers.color[offset + 2] = b;
					}
				}else if(attribute === "intensity"){
					for(let j = 0; j < sourceSegment.numPoints; j++){
						this.buffers.intensity[this.numPoints + j] = sourceSegment.points.intensity[j];
					}
				}else if(attribute === "classification"){
					for(let j = 0; j < sourceSegment.numPoints; j++){
						this.buffers.classification[this.numPoints + j] = sourceSegment.points.classification[j];
					}
				}
				
			}
			
			targetSegment.numPoints += sourceSegment.numPoints;
			this.numPoints += sourceSegment.numPoints;
		}
		
	}
	
	selectPoint(mileage, elevation, radius){
		
		let closest = {
			distance: Infinity,
			segment: null,
			index: null
		};
		
		for(let segment of this.segments){
			for(let i = 0; i < segment.numPoints; i++){
				
				let m = segment.points.mileage[i] - mileage;
				let e = segment.points.position[i].z - elevation;
				
				let r = Math.sqrt(m * m + e * e);
				
				if(r < radius && r < closest.distance){
					closest = {
						distance: r,
						segment: segment,
						index: i
					};
				}
			}
		}
		
		if(closest.distance < Infinity){
			let point = {};
			
			let attributes = Object.keys(closest.segment.points);
			for(let attribute of attributes){
				point[attribute] = closest.segment.points[attribute][closest.index];
			}
			
			return point;
		}else{
			return null;
		}
	}
	
	
}

Potree.Viewer.Profile = class ProfileWindow{
	
	constructor(viewer){
		this.viewer = viewer;
		this.enabled = true;
		this.currentProfile = null;
		this.requests = [];
		this.maximized = false;
		this.threshold = 20*1000;
		this.autoFit = true;
		this.numPoints = 0;
		this.mouse = new THREE.Vector2();
		this.points = null;
		this.selectedPoint = null;
		this.pointColorType = Potree.PointColorType.RGB;
		
		this.elRoot = $("#profile_window");
		
		this.renderArea = this.elRoot.find("#profileCanvasContainer");
		
		{ // THREE.JS
			this.renderer = new THREE.WebGLRenderer({alpha: true, premultipliedAlpha: false});
			this.renderer.setClearColor( 0x000000, 0 );
			this.renderer.setSize(10, 10);
			this.renderer.autoClear = true;
			this.renderArea.append($(this.renderer.domElement));
			this.renderer.domElement.tabIndex = "2222";
			this.renderer.context.getExtension("EXT_frag_depth");
			$(this.renderer.domElement).css("width", "100%");
			$(this.renderer.domElement).css("height", "100%");
			
			this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -1000, 1000);
			
			this.scene = new THREE.Scene();
			
			this.maxPoints = 50*1000;
			this.geometry = new THREE.BufferGeometry();
			this.buffers = {
				position: new Float32Array(3 * this.maxPoints),
				color: new Uint8Array(3 * this.maxPoints),
				intensity: new Uint16Array(this.maxPoints),
				classification: new Uint8Array(this.maxPoints),
				returnNumber: new Uint8Array(this.maxPoints),
				numberOfReturns: new Uint8Array(this.maxPoints),
				pointSourceID: new Uint16Array(this.maxPoints)
			};
			
			this.geometry.addAttribute("position", new THREE.BufferAttribute(this.buffers.position, 3));
			this.geometry.addAttribute("color", new THREE.BufferAttribute(this.buffers.color, 3, true));
			this.geometry.addAttribute("intensity", new THREE.BufferAttribute(this.buffers.intensity, 1, false));
			this.geometry.addAttribute("classification", new THREE.BufferAttribute(this.buffers.classification, 1, false));
			this.geometry.addAttribute("returnNumber", new THREE.BufferAttribute(this.buffers.returnNumber, 1, false));
			this.geometry.addAttribute("numberOfReturns", new THREE.BufferAttribute(this.buffers.numberOfReturns, 1, false));
			this.geometry.addAttribute("pointSourceID", new THREE.BufferAttribute(this.buffers.pointSourceID, 1, false));
			
			this.geometry.setDrawRange(0, 100);
			this.material =  new Potree.PointCloudMaterial({size: 2.0});
			this.material.pointSizeType = Potree.PointSizeType.FIXED;
			this.tPoints = new THREE.Points(this.geometry, this.material);
			this.scene.add(this.tPoints);
			
			
			let sg = new THREE.SphereGeometry(1, 16, 16);
			let sm = new THREE.MeshNormalMaterial();
			this.pickSphere = new THREE.Mesh(sg, sm);
			this.pickSphere.visible = false;
			this.scene.add(this.pickSphere);
		}
		
		{ // SVG
			let width = this.renderArea[0].clientWidth;
			let height = this.renderArea[0].clientHeight;
			let marginLeft = this.renderArea[0].offsetLeft;
		
			this.svg = d3.select("svg#profileSVG");
			this.svg.selectAll("*").remove();
			
			this.scaleX = d3.scale.linear()
				.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
				.range([0, width]);
			this.scaleY = d3.scale.linear()
				.domain([this.camera.bottom + this.camera.position.y, this.camera.top + this.camera.position.y])
				.range([height, 0]);
			
			this.xAxis = d3.svg.axis()
				.scale(this.scaleX)
				.orient("bottom")
				.innerTickSize(-height)
				.outerTickSize(1)
				.tickPadding(10)
				.ticks(width / 50);
				
			this.yAxis = d3.svg.axis()
				.scale(this.scaleY)
				.orient("left")
				.innerTickSize(-width)
				.outerTickSize(1)
				.tickPadding(10)
				.ticks(height / 20);
		
			this.svg.append("g")
				.attr("class", "x axis")
				.attr("transform", `translate(${marginLeft}, ${height})`)
				.call(this.xAxis);
				
			this.svg.append("g")
				.attr("class", "y axis")
				.attr("transform", `translate(${marginLeft}, 0)`)
				.call(this.yAxis);
		}
		
		this.min = new THREE.Vector3(0, 0, 0);
		this.max = new THREE.Vector3(0, 0, 0);
		this.size = new THREE.Vector3(0, 0, 0);
		this.center = new THREE.Vector3(0, 0, 0);
		this.scale = new THREE.Vector3(1, 1, 1);
		
		this.mouseIsDown = false;
		
		$(window).resize( () => {
			this.render();
		});
		
		this.renderArea.mousedown(e => {
			this.mouseIsDown = true;
		});
		
		this.renderArea.mouseup(e => {
			this.mouseIsDown = false;
		});

		this.renderArea.mousemove( e => {
			if(this.points === null || this.points.numPoints === 0){
				return;
			}
			
			let rect = this.renderArea[0].getBoundingClientRect();
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top;
			
			let newMouse = new THREE.Vector2(x, y);
			
			if(this.mouseIsDown){
				// DRAG
				let cPos = this.toCamSpace(new THREE.Vector3(this.mouse.x, this.mouse.y, 0));
				let ncPos = this.toCamSpace(new THREE.Vector3(newMouse.x, newMouse.y, 0));
				
				let diff = new THREE.Vector3().subVectors(ncPos, cPos);
				this.camera.position.sub(diff);
				this.render();
			}else if(this.points){
				// FIND HOVERED POINT 
				let pixelRadius = 10;
				let ncPos = this.toCamSpace(new THREE.Vector3(newMouse.x, newMouse.y, 0));
				let ncPosBorder = this.toCamSpace(new THREE.Vector3(newMouse.x + pixelRadius, newMouse.y, 0));
				let mileage = ncPos.x;
				let elevation = ncPos.y;
				let radius = Math.abs(ncPosBorder.x - ncPos.x);
				let point = this.points.selectPoint(mileage, elevation, radius);
				
				if(point){
					this.elRoot.find("#profileSelectionProperties").fadeIn(200);
					this.pickSphere.visible = true;
					this.pickSphere.scale.set(0.5 * radius, 0.5 * radius, 0.5 * radius);
					this.pickSphere.position.set(point.mileage, point.position.z, 0);
					
					let info = this.elRoot.find("#profileSelectionProperties");
					let html = "<table>";
					for(let attribute of Object.keys(point)){
						let value = point[attribute];
						if(attribute === "position"){
							let values = value.toArray().map(v => Potree.utils.addCommas(v.toFixed(3)));
							html += `
								<tr>
									<td>x</td>
									<td>${values[0]}</td>
								</tr>
								<tr>
									<td>y</td>
									<td>${values[1]}</td>
								</tr>
								<tr>
									<td>z</td>
									<td>${values[2]}</td>
								</tr>`;
						}else if(attribute === "color"){
							html += `
								<tr>
									<td>${attribute}</td>
									<td>${value.join(", ")}</td>
								</tr>`;
						}else if(attribute === "normal"){
							continue;
						}else if(attribute === "mileage"){
							html += `
								<tr>
									<td>${attribute}</td>
									<td>${value.toFixed(3)}</td>
								</tr>`;
						}else{
							html += `
								<tr>
									<td>${attribute}</td>
									<td>${value}</td>
								</tr>`;
						}
						
					}
					html += "</table>"
					info.html(html);
					
					this.selectedPoint = point;
				}else{
					//this.pickSphere.visible = false;
					//this.selectedPoint = null;
				}
				this.render();
				
				
			}
			
			this.mouse.copy(newMouse);
		});
		
		let onWheel = e => {
			this.autoFit = false;
			let delta = 0;
			if( e.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
				delta = e.wheelDelta;
			} else if ( e.detail !== undefined ) { // Firefox
				delta = -e.detail;
			}
			
			let ndelta = Math.sign(delta);
			
			let sPos = new THREE.Vector3(this.mouse.x, this.mouse.y, 0);
			let cPos = this.toCamSpace(sPos);
			
			if(ndelta > 0){
				// + 10%
				this.scale.multiplyScalar(1.1);
			}else{
				// - 10%
				this.scale.multiplyScalar(100/110);
			}
			
			this.scale.max(new THREE.Vector3(0.5, 0.5, 0.5));
			this.scale.min(new THREE.Vector3(100, 100, 100));
			
			let ncPos = this.toCamSpace(sPos);
			
			let diff = new THREE.Vector3().subVectors(ncPos, cPos);
			this.camera.position.sub(diff);
			
			this.render();
		};
		$(this.renderArea)[0].addEventListener("mousewheel", onWheel, false );
		$(this.renderArea)[0].addEventListener("DOMMouseScroll", onWheel, false ); // Firefox
		
		
		this.scheduledDraw = null;
		
		this.redraw = () => {
			if(this.currentProfile){
				this.draw(this.currentProfile);
			}
		};
		
		$('#closeProfileContainer').click(() => {
			this.hide();
			this.enabled = false;
		});
	}
	
	toCamSpace(coord){
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		
		let cam = new THREE.Vector3(
			coord.x - width / 2,
			-coord.y + height / 2,
			0);
		
		cam.divide(this.scale);
		cam.add(this.camera.position);
		
		return cam;
	}
	
	toScreenSpace(coord){
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		
		let v = new THREE.Vector3().subVectors(coord, this.camera.position);
		v.multiply(this.scale);
		
		let screen = new THREE.Vector3(
			width / 2 + v.x,
			height / 2 - v.y,
			0);
		
		return screen;
	}
	
	render(){
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		
		{ // THREEJS
			
			let left   = (-width  / 2) / this.scale.x;
			let right  = (+width  / 2) / this.scale.x;
			let top    = (+height / 2) / this.scale.y;
			let bottom = (-height / 2) / this.scale.y;
			
			this.camera.left = left;
			this.camera.right = right;
			this.camera.top = top;
			this.camera.bottom = bottom;
			this.camera.updateProjectionMatrix();

			let radius = 
				this.toCamSpace(new THREE.Vector3(0, 0, 0)).distanceTo(
				this.toCamSpace(new THREE.Vector3(5, 0, 0)));
			this.pickSphere.scale.set(radius, radius, radius);
			this.pickSphere.position.z = this.camera.far - radius;
			
			this.material.pointColorType = this.viewer.pointColorType;
			this.material.uniforms.intensityRange.value = this.viewer.getIntensityRange();
			this.material.heightMin = this.viewer.getHeightRange().min;
			this.material.heightMax = this.viewer.getHeightRange().max;
			
			this.renderer.setSize(width, height);
			
			this.renderer.render(this.scene, this.camera);
		}
		
		{ // SVG SCALES
			let marginLeft = this.renderArea[0].offsetLeft;
		
			this.scaleX.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
				.range([0, width]);
			this.scaleY.domain([this.camera.bottom + this.camera.position.y, this.camera.top + this.camera.position.y])
				.range([height, 0]);
				
			this.xAxis.scale(this.scaleX)
				.orient("bottom")
				.innerTickSize(-height)
				.outerTickSize(1)
				.tickPadding(10)
				.ticks(width / 50);
			this.yAxis.scale(this.scaleY)
				.orient("left")
				.innerTickSize(-width)
				.outerTickSize(1)
				.tickPadding(10)
				.ticks(height / 20);
				
			d3.select(".x,axis")
				.attr("transform", `translate(${marginLeft}, ${height})`)
				.call(this.xAxis);
			d3.select(".y,axis")
				.attr("transform", `translate(${marginLeft}, 0)`)
				.call(this.yAxis);
		}
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
	
	handleNewPoints(profileProgress){
		this.points.onProgress(profileProgress);
		
		let prepared = this.preparePoints(profileProgress);
		
		if(prepared.numPoints === 0){
			return;
		}
		
		if(this.numPoints === 0){
			this.min.fromArray(prepared.buffers.position, 3);
			this.max.fromArray(prepared.buffers.position, 3);
		}
		
		for(let i = 0; i < prepared.numPoints; i++){
			let pos = new THREE.Vector3().fromArray(
				prepared.buffers.position.slice(3*i, 3*i+3));
			this.min.min(pos);
			this.max.max(pos);
		}
		let newSize = new THREE.Vector3().subVectors(this.max, this.min);
		this.size.copy(newSize);
		
		let newNumPoints = this.numPoints + prepared.numPoints;
		
		let position = this.buffers.position;
		let color = this.buffers.color;
		let intensity = this.buffers.intensity;
		let classification = this.buffers.classification;
		
		position.set(this.points.buffers.position.slice(3 * this.numPoints, 3 * newNumPoints), 3 * this.numPoints);
		color.set(this.points.buffers.color.slice(3 * this.numPoints, 3 * newNumPoints), 3 * this.numPoints);
		intensity.set(this.points.buffers.intensity.slice(this.numPoints, newNumPoints), this.numPoints);
		classification.set(this.points.buffers.classification.slice(this.numPoints, newNumPoints), this.numPoints);
		
		
		for(let key of Object.keys(this.geometry.attributes)){
			this.geometry.attributes[key].needsUpdate = true;
		}
		
        
		this.geometry.setDrawRange(0, newNumPoints);
		
		this.numPoints = newNumPoints;
		
		this.center = new THREE.Vector3().addVectors(this.min, this.max)
			.multiplyScalar(0.5);
		
		if(this.geometry.boundingSphere){
			this.geometry.boundingSphere.center.copy(this.center);
			this.geometry.boundingSphere.radius = this.min.distanceTo(this.max) / 2;
		}

		if(this.autoFit){ // SCALE
			let width = this.renderArea[0].clientWidth;
			let height = this.renderArea[0].clientHeight;
			
			let sx = width / this.size.x;
			let sy = height / this.size.y;
			let scale = Math.min(sx, sy);
			
			this.scale.set(scale, scale, 1);
			this.camera.position.copy(this.center);
		}
		
		this.firstUpdateFollows = false;
		
		this.elRoot.find("#profile_num_points").html(
			Potree.utils.addCommas(this.numPoints.toFixed(0)));
	}
	
	preparePoints(profileProgress){
		
		let segments = profileProgress.segments;
		if (segments.length === 0){
			return false;
		}
		
		let numPoints = profileProgress.size();
		
		let position = new Float32Array(3 * numPoints);
		let color = new Uint8Array(3 * numPoints);
		let intensity = new Uint16Array(numPoints);
		let classification = new Uint8Array(numPoints);
		
		let distance = 0;
		let totalDistance = 0;
		let min = new THREE.Vector3(Math.max());
		let max = new THREE.Vector3(0);

		// Iterate the profile's segments
		let i = 0;
		for(let segment of segments){
			let sv = new THREE.Vector3().subVectors(segment.end, segment.start).setZ(0)
			let segmentDir = sv.clone().normalize();
			let points = segment.points;

			// Iterate the segments' points
			for(let j = 0; j < segment.numPoints; j++){
				let p = points.position[j];
				
				//let svp = new THREE.Vector3().subVectors(p, segment.start);
				//let distance = segmentDir.dot(svp);
				
				min.min(p);
				max.max(p);
				
				//position[3*i + 0] = distance + totalDistance;
				position[3*i + 0] = points.mileage[j];
				position[3*i + 1] = p.z;
				position[3*i + 2] = 0;
				
				let c = points.color ? points.color[j] : [0, 0, 0];
				color[3*i + 0] = c[0];
				color[3*i + 1] = c[1];
				color[3*i + 2] = c[2];
				
				intensity[i] = points.intensity ? points.intensity[j] : 0;
				classification[i] = points.classification ? points.classification[j] : 0;
				
				i++;
			}

			totalDistance += segment.length;
		}
		
		let result = {
			numPoints: numPoints,
			min: min,
			max: max,
			buffers: {
				position: position,
				color: color,
				intensity: intensity,
				classification: classification
			}
		};

		return result;
	};
	
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
			this.prepareDraw(this.scheduledDraw);
			this.scheduledDraw = null;
		};
		
		if(!this.scheduledDraw){
			setTimeout(executeScheduledDraw, 100);
		}
		this.scheduledDraw = profile;
	}
		
	prepareDraw(profile){
		this.autoFit = true;
		this.numPoints = 0;
		this.geometry.setDrawRange(0, this.numPoints);
		this.pickSphere.visible = false;
		this.elRoot.find("#profileSelectionProperties").hide();
		
		if(this.currentProfile){
			this.currentProfile.removeEventListener("marker_moved", this.redraw);
			this.currentProfile.removeEventListener("marker_added", this.redraw);
			this.currentProfile.removeEventListener("marker_removed", this.redraw);
			this.currentProfile.removeEventListener("width_changed", this.redraw);
			viewer.removeEventListener("material_changed", this.redraw);
			viewer.removeEventListener("height_range_changed", this.redraw);
			viewer.removeEventListener("intensity_range_changed", this.redraw);
			
			for(let request of this.requests){
				request.cancel();
			}
		}
		
		
		this.currentProfile = profile;
		this.points = new Potree.ProfilePointStore(this.currentProfile);
		
		{
			this.currentProfile.addEventListener("marker_moved", this.redraw);
			this.currentProfile.addEventListener("marker_added", this.redraw);
			this.currentProfile.addEventListener("marker_removed", this.redraw);
			this.currentProfile.addEventListener("width_changed", this.redraw);
			viewer.addEventListener("material_changed", this.redraw);
			viewer.addEventListener("height_range_changed", this.redraw);
			viewer.addEventListener("intensity_range_changed", this.redraw);
		}
		
		for(let pointcloud of this.viewer.scene.pointclouds.filter(p => p.visible)){
			
			let request = pointcloud.getPointsInProfile(profile, null, {
				"onProgress": (event) => {
					if(!this.enabled){
						return;
					}
					
					this.handleNewPoints(event.points);
					
					this.render();
					
					if(this.numPoints > this.threshold){
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
		
		let pointsPerSegment = this.points.segments.map(s => s.points);
		let points = {};
		let attributes = Object.keys(pointsPerSegment[0]);
		for(let attribute of attributes){
			let arrays = pointsPerSegment.map(p => p[attribute]);
			points[attribute] = arrays.reduce( (a, v) => a.concat(v));
		}
		
		{ // header-line
			let header = "x, y";
			
			if(points.hasOwnProperty("color")){
				header += ", r, g, b";
			}
			
			if(points.hasOwnProperty("intensity")){
				header += ", intensity";
			}
			
			if(points.hasOwnProperty("classification")){
				header += ", classification";
			}
			
			if(points.hasOwnProperty("numberOfReturns")){
				header += ", numberOfReturns";
			}
			
			if(points.hasOwnProperty("pointSourceID")){
				header += ", pointSourceID";
			}
			
			if(points.hasOwnProperty("returnNumber")){
				header += ", returnNumber";
			}
			
			file += header + "\n";
		}
		
		let numPoints = points.position.length;

		// actual data
		for(let i = 0; i < numPoints; i++){
			
			let values = [];
			
			values.push(points.mileage[i].toFixed(4));
			values.push(points.position[i].z.toFixed(4));
			
			if(attributes.includes("color")){
				values.push(points.color[i].join(", "));
			}
			
			if(attributes.includes("intensity")){
				values.push(points.intensity[i]);
			}
			
			if(attributes.includes("classification")){
				values.push(points.classification[i]);
			}
			
			if(attributes.includes("numberOfReturns")){
				values.push(points.numberOfReturns[i]);
			}
			
			if(attributes.includes("pointSourceID")){
				values.push(points.pointSourceID[i]);
			}
			
			if(attributes.includes("returnNumber")){
				values.push(points.returnNumber[i]);
			}
			
			let line = values.join(", ") + "\n";
			
			file = file + line;
		}
		
		return file;
	}
	
	getPointsInProfileAsLas(){
		
		let pointsPerSegment = this.points.segments.map(s => s.points);
		let points = {};
		let attributes = Object.keys(pointsPerSegment[0]);
		for(let attribute of attributes){
			let arrays = pointsPerSegment.map(p => p[attribute]);
			points[attribute] = arrays.reduce( (a, v) => a.concat(v));
		}
		let numPoints = points.position.length;
		
		let boundingBox = new THREE.Box3();
		
		for(let i = 0; i < numPoints; i++){
			let position = points.position[i];
			boundingBox.expandByPoint(position);
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
		
		let buffer = new ArrayBuffer(227 + 28 * numPoints);
		let view = new DataView(buffer);
		let u8View = new Uint8Array(buffer);
		
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
		view.setUint32(107, numPoints, true);
		
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
		
		let hasIntensity = attributes.includes("intensity");
		let hasReturnNumber = attributes.includes("returnNumber");
		let hasClassification = attributes.includes("classification");
		let hasPointSourceID = attributes.includes("pointSourceID");
		
		let boffset = 227;
		for(let i = 0; i < numPoints; i++){
			//let point = points[i];
			//let position = new THREE.Vector3(point.x, point.y, point.z);
			let position = points.position[i];
			
			let ux = parseInt((position.x - offset.x) / scale.x);
			let uy = parseInt((position.y - offset.y) / scale.y);
			let uz = parseInt((position.z - offset.z) / scale.z);
			
			view.setUint32(boffset + 0, ux, true);
			view.setUint32(boffset + 4, uy, true);
			view.setUint32(boffset + 8, uz, true);
		
			if(hasIntensity){
				view.setUint16(boffset + 12, (points.intensity[i]), true);
			}
			
			if(hasReturnNumber){
				let rt = points.returnNumber[i];
				rt += (points.numberOfReturns[i] << 3);
				view.setUint8(boffset + 14, rt);
			}
			
			if(hasClassification){
				view.setUint8(boffset + 15, points.classification[i]);
			}
			
			// scan angle rank
			// user data
			// point source id
			if(hasPointSourceID){
				view.setUint16(boffset + 18, points.pointSourceID[i]);
			}
			view.setUint16(boffset + 20, (points.color[i][0] * 255), true);
			view.setUint16(boffset + 22, (points.color[i][1] * 255), true);
			view.setUint16(boffset + 24, (points.color[i][2] * 255), true);
			
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