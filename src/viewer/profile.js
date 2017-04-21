
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
		
		this.elRoot = $("#profile_window");
		
		this.renderArea = this.elRoot.find("#profileCanvasContainer");
		this.renderer = new THREE.WebGLRenderer({premultipliedAlpha: false});
		this.renderer.setSize(10, 10);
		this.renderer.autoClear = false;
		this.renderArea.append($(this.renderer.domElement));
		this.renderer.domElement.tabIndex = "2222";
		this.renderer.context.getExtension("EXT_frag_depth");
		$(this.renderer.domElement).css("width", "100%");
		$(this.renderer.domElement).css("height", "100%");
		
		this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -1000, 1000);
		
		this.scene = new THREE.Scene();
		this.scene.background = new THREE.Color( 0x00ff00 );
		
		let sg = new THREE.SphereGeometry(5, 32, 32);
		let sm = new THREE.MeshNormalMaterial();
		let s = new THREE.Mesh(sg, sm);
		s.position.set(100, 100, 0);
		this.scene.add(s);
		
		this.maxPoints = 50*1000;
		this.geometry = new THREE.BufferGeometry();
		this.buffers = {
			position: new Float32Array(3 * this.maxPoints),
			color: new Uint8Array(3 * this.maxPoints),
		};
		this.numPoints = 0;
		this.geometry.addAttribute("position", new THREE.BufferAttribute(this.buffers.position, 3));
		this.geometry.addAttribute("color", new THREE.BufferAttribute(this.buffers.color, 3, true));
		this.geometry.setDrawRange(0, 100);
		this.material =  new THREE.PointsMaterial( { size: 0.001, vertexColors: THREE.VertexColors } );
		this.tPoints = new THREE.Points(this.geometry, this.material);
		this.scene.add(this.tPoints);
		
		this.min = new THREE.Vector3(0, 0, 0);
		this.max = new THREE.Vector3(0, 0, 0);
		
		//this.renderArea.mousemove(event => {
		//	this.render();
		//});
		
		
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
		
		$('#profile_toggle_size_button').click(() => {
			this.maximized = !this.maximized;
		
			if(this.maximized){
				$('#profile_window').css("height", "100%");
			}else{
				$('#profile_window').css("height", "30%");
			}
		});
		

	}
	
	render(){
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		
		this.camera.left = -width/2;
		this.camera.right = width/2;
		this.camera.top = height/2;
		this.camera.bottom = -height/2;
		this.camera.updateProjectionMatrix();
		
		this.renderer.setSize(width, height);
		
		this.renderer.render(this.scene, this.camera);
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
		
		let newNumPoints = this.numPoints + prepared.numPoints;
		
		let position = this.buffers.position;
		let color = this.buffers.color;
		
		position.set(prepared.buffers.position, 3 * this.numPoints);
		color.set(prepared.buffers.color, 3 * this.numPoints);
		
		for(let i = 1; i < 100; i+=3){
			position[i] = position[i] - 700;
		}
		
		this.geometry.attributes.position.needsUpdate = true;
		this.geometry.attributes.color.needsUpdate = true;
        
		this.geometry.setDrawRange(0, newNumPoints);
		
		this.numPoints = newNumPoints;
		
		let center = new THREE.Vector3().addVectors(this.min, this.max)
			.multiplyScalar(0.5);
		this.camera.position.copy(center);
	}
	
	preparePoints(profileProgress){
		
		let segments = profileProgress.segments;
		if (segments.length === 0){
			return false;
		}
		
		let numPoints = profileProgress.size();
		
		let position = new Float32Array(3 * numPoints);
		let color = new Uint8Array(3 * numPoints);
		
		let distance = 0;
		let totalDistance = 0;
		let min = new THREE.Vector3(Math.max());
		let max = new THREE.Vector3(0);

		// Iterate the profile's segments
		let i = 0;
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
				
				// TODO length is probably wrong here
				let distance = totalDistance + pl.length();
				
				// important are 
				// distance
				// p.z
				// points.color ? points.color[j] : [0, 0, 0]
				
				position[3*i + 0] = distance;
				position[3*i + 1] = p.z;
				position[3*i + 2] = 0;
				
				let c = points.color ? points.color[j] : [0, 0, 0];
				color[3*i + 0] = c[0];
				color[3*i + 1] = c[1];
				color[3*i + 2] = c[2];
				
				
				i++;
			}

			totalDistance += segmentLength;
		}
		
		let result = {
			numPoints: numPoints,
			min: min,
			max: max,
			buffers: {
				position: position,
				color: color
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
		this.numPoints = 0;
		this.geometry.setDrawRange(0, this.numPoints);
		
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
			scale = new THREE.Vector3(1.1, 0.001, 0.001);
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