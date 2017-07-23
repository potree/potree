


function Potree(){

}
Potree.version = {
	major: 1,
	minor: 5,
	suffix: "RC"
};

console.log("Potree " + Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);

Potree.pointBudget = 1*1000*1000;

Potree.framenumber = 0;

// contains WebWorkers with base64 encoded code
//Potree.workers = {};

Potree.Shaders = {};

Potree.webgl = {
	shaders: {},
	vaos: {},
	vbos: {}
};

Potree.scriptPath = null;
if(document.currentScript.src){
		Potree.scriptPath = new URL(document.currentScript.src + "/..").href;
        if (Potree.scriptPath.slice(-1) === '/') {
            Potree.scriptPath = Potree.scriptPath.slice(0, -1);
        }
}else{
	console.error("Potree was unable to find its script path using document.currentScript. Is Potree included with a script tag? Does your browser support this function?");
}

Potree.resourcePath = Potree.scriptPath + "/resources";


Potree.timerQueries = {};

Potree.timerQueriesEnabled = false;

Potree.startQuery = function(name, gl){
	if(!Potree.timerQueriesEnabled){
		return null;
	}
	
	if(Potree.timerQueries[name] === undefined){
		Potree.timerQueries[name] = [];
	}
	
	let ext = gl.getExtension("EXT_disjoint_timer_query");
	let query = ext.createQueryEXT();
	ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
	
	Potree.timerQueries[name].push(query);
	
	return query;
};

Potree.endQuery = function(query, gl){
	if(!Potree.timerQueriesEnabled){
		return;
	}
	
	let ext = gl.getExtension("EXT_disjoint_timer_query");
	ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
};

Potree.resolveQueries = function(gl){
	if(!Potree.timerQueriesEnabled){
		return;
	}
	
	let ext = gl.getExtension("EXT_disjoint_timer_query");
	
	for(let name in Potree.timerQueries){
		let queries = Potree.timerQueries[name];
		
		if(queries.length > 0){
			let query = queries[0];
			
			let available = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT);
			let disjoint = viewer.renderer.getContext().getParameter(ext.GPU_DISJOINT_EXT);
			
			if (available && !disjoint) {
				// See how much time the rendering of the object took in nanoseconds.
				let timeElapsed = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
				let miliseconds = timeElapsed / (1000 * 1000);
			
				console.log(name + ": " + miliseconds + "ms");
				queries.shift();
			}
		}
		
		if(queries.length === 0){
			delete Potree.timerQueries[name];
		}
	}
};


Potree.MOUSE = {
	LEFT:   0b0001,
	RIGHT:  0b0010,
	MIDDLE: 0b0100
};

Potree.Points = class Points{
	
	constructor(){
		
		this.boundingBox = new THREE.Box3();
		this.numPoints = 0;
		this.data = {};
		
	}
	
	add(points){
		
		let currentSize = this.numPoints;
		let additionalSize = points.numPoints;
		let newSize = currentSize + additionalSize;
		
		let thisAttributes = Object.keys(this.data);
		let otherAttributes = Object.keys(points.data);
		let attributes = new Set([...thisAttributes, ...otherAttributes]);
		
		for(let attribute of attributes){
			if(thisAttributes.includes(attribute) && otherAttributes.includes(attribute)){
				
				// attribute in both, merge
				let type = this.data[attribute].constructor;
				let merged = new type(this.data[attribute].length + points.data[attribute].length);
				merged.set(this.data[attribute], 0);
				merged.set(points.data[attribute], this.data[attribute].length);
				this.data[attribute] = merged;
				
			}else if(thisAttributes.includes(attribute) && !otherAttributes.includes(attribute)){
				
				// attribute only in this; take over this and expand to new size
				let elementsPerPoint = this.data[attribute].length / this.numPoints;
				let type = this.data[attribute].constructor;
				let expanded = new type(elementsPerPoint * newSize);
				expanded.set(this.data[attribute], 0);
				this.data[attribute] = expanded;
				
			}else if(!thisAttributes.includes(attribute) && otherAttributes.includes(attribute)){
				
				// attribute only in points to be added; take over new points and expand to new size
				let elementsPerPoint = points.data[attribute].length / points.numPoints;
				let type = points.data[attribute].constructor;
				let expanded = new type(elementsPerPoint * newSize);
				expanded.set(points.data[attribute], elementsPerPoint * currentSize);
				this.data[attribute] = expanded;
				
			}
		}
		
		this.numPoints = newSize;
		
		this.boundingBox.union(points.boundingBox);
	}
	
};


Potree.loadPointCloud = function(path, name, callback){
	
	let loaded = function(pointcloud){
		pointcloud.name = name;
		
		callback({type: "pointcloud_loaded", pointcloud: pointcloud});
	};
	
	// load pointcloud
	if(!path){
		
	}else if(path.indexOf("greyhound://") === 0){
		// We check if the path string starts with 'greyhound:', if so we assume it's a greyhound server URL.
		Potree.GreyhoundLoader.load(path, function(geometry) {
			if(!geometry){
				callback({type: "loading_failed"});
			}else{
				let pointcloud = new Potree.PointCloudOctree(geometry);
				loaded(pointcloud);
			}
		});
	}else if(path.indexOf("cloud.js") > 0){
		Potree.POCLoader.load(path, function(geometry){
			if(!geometry){
				callback({type: "loading_failed"});
			}else{
				let pointcloud = new Potree.PointCloudOctree(geometry);
				loaded(pointcloud);
			}
		}.bind(this));
	}else if(path.indexOf(".vpc") > 0){
		Potree.PointCloudArena4DGeometry.load(path, function(geometry){
			if(!geometry){
				callback({type: "loading_failed"});
			}else{
				let pointcloud = new Potree.PointCloudArena4D(geometry);
				loaded(pointcloud);
			}
		});
	}else{
		callback({"type": "loading_failed"});
	}
};

Potree.updatePointClouds = function(pointclouds, camera, renderer){

	if(!Potree.lru){
		Potree.lru = new LRU();
	}

	for(let i = 0; i < pointclouds.length; i++){
		let pointcloud = pointclouds[i];
		for(let j = 0; j < pointcloud.profileRequests.length; j++){
			pointcloud.profileRequests[j].update();
		}
	}
	
	let result = Potree.updateVisibility(pointclouds, camera, renderer);
	
	for(let i = 0; i < pointclouds.length; i++){
		let pointcloud = pointclouds[i];
		pointcloud.updateMaterial(pointcloud.material, pointcloud.visibleNodes, camera, renderer);
		pointcloud.updateVisibleBounds();
	}

	Potree.getLRU().freeMemory();

	return result;
};

Potree.getLRU = function(){
	if(!Potree.lru){
		Potree.lru = new LRU();
	}

	return Potree.lru;
};


function updateVisibilityStructures(pointclouds, camera, renderer){
	let frustums = [];
	let camObjPositions = [];
	let priorityQueue = new BinaryHeap(function(x){return 1 / x.weight;});
	
	for(let i = 0; i < pointclouds.length; i++){
		let pointcloud = pointclouds[i];
		
		if(!pointcloud.initialized()){
			continue;
		}

		pointcloud.numVisibleNodes = 0;
		pointcloud.numVisiblePoints = 0;
		pointcloud.deepestVisibleLevel = 0;
		pointcloud.visibleNodes = [];
		pointcloud.visibleGeometry = [];

		// frustum in object space
		camera.updateMatrixWorld();
		let frustum = new THREE.Frustum();
		let viewI = camera.matrixWorldInverse;
		let world = pointcloud.matrixWorld;
		let proj = camera.projectionMatrix;
		let fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
		frustum.setFromMatrix( fm );
		frustums.push(frustum);

		// camera position in object space
		let view = camera.matrixWorld;
		let worldI = new THREE.Matrix4().getInverse(world);
		let camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
		let camObjPos = new THREE.Vector3().setFromMatrixPosition( camMatrixObject );
		camObjPositions.push(camObjPos);

		if(pointcloud.visible && pointcloud.root !== null){
			priorityQueue.push({pointcloud: i, node: pointcloud.root, weight: Number.MAX_VALUE});
		}

		// hide all previously visible nodes
		//if(pointcloud.root instanceof Potree.PointCloudOctreeNode){
		//	pointcloud.hideDescendants(pointcloud.root.sceneNode);
		//}
		if(pointcloud.root.isTreeNode()){
			pointcloud.hideDescendants(pointcloud.root.sceneNode);
		}
		
		for(let j = 0; j < pointcloud.boundingBoxNodes.length; j++){
			pointcloud.boundingBoxNodes[j].visible = false;
		}
	}
	
	return {
		"frustums": frustums,
		"camObjPositions" : camObjPositions,
		"priorityQueue": priorityQueue
	};
}

Potree.getDEMWorkerInstance = function(){
	if(!Potree.DEMWorkerInstance){
		let workerPath = Potree.scriptPath + "/workers/DEMWorker.js";
		Potree.DEMWorkerInstance = Potree.workerPool.getWorker(workerPath);
	}
	
	return Potree.DEMWorkerInstance;
}

function createDEMMesh(dem){
	
	let box = dem.boundingBox;

	let steps = 256;
	let triangles =  [];
	for(let i = 0; i < steps; i++){
		for(let j = 0; j < steps; j++){
			let u0 = i / steps;
			let u1 = (i+1) / steps;
			let v0 = j / steps;
			let v1 = (j+1) / steps;
			
			//let x0 = box.min.x + u0 * box.getSize().x;
			//let x1 = box.min.x + u1 * box.getSize().x;
			//let y0 = box.min.y + v0 * box.getSize().y;
			//let y1 = box.min.y + v1 * box.getSize().y;
			//
			//let h00 = dem.height(new THREE.Vector3(x0, y0, 0));
			//let h10 = dem.height(new THREE.Vector3(x1, y0, 0));
			//let h01 = dem.height(new THREE.Vector3(x0, y1, 0));
			//let h11 = dem.height(new THREE.Vector3(x1, y1, 0));
			
			let x0 = u0 * box.getSize().x;
			let x1 = u1 * box.getSize().x;
			let y0 = v0 * box.getSize().y;
			let y1 = v1 * box.getSize().y;
			
			//let h00 = demNode.data[(i+0) + tileSize * (j+0)];
			//let h10 = demNode.data[(i+1) + tileSize * (j+0)];
			//let h01 = demNode.data[(i+0) + tileSize * (j+1)];
			//let h11 = demNode.data[(i+1) + tileSize * (j+1)];
			
			let h00 = dem.height(new THREE.Vector3(box.min.x + x0, box.min.y + y0));
			let h10 = dem.height(new THREE.Vector3(box.min.x + x1, box.min.y + y0));
			let h01 = dem.height(new THREE.Vector3(box.min.x + x0, box.min.y + y1));
			let h11 = dem.height(new THREE.Vector3(box.min.x + x1, box.min.y + y1));
			
			if(![h00, h10, h01, h11].every(n => isFinite(n))){
				continue;
			}
			
			triangles.push(x0, y0, h00);
			triangles.push(x0, y1, h01);
			triangles.push(x1, y0, h10);
			
			triangles.push(x0, y1, h01);
			triangles.push(x1, y1, h11);
			triangles.push(x1, y0, h10);
		}
	}
    
	let geometry = new THREE.BufferGeometry();
	let positions = new Float32Array(triangles);
	geometry.addAttribute( 'position', new THREE.BufferAttribute(positions, 3));
	geometry.computeBoundingSphere();
	geometry.computeVertexNormals();
	let material = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
	let mesh = new THREE.Mesh(geometry, material);
	mesh.position.copy(box.min);
	//mesh.position.copy(pointcloud.position);
	viewer.scene.scene.add(mesh);
}

function createDEMMeshNode(dem, demNode){
	
	let box = demNode.box;
	let tileSize = dem.tileSize * 1;
	
	let triangles =  [];
	for(let i = 0; i < tileSize; i++){
		//for(let j = 0; j < 1; j++){
		for(let j = 0; j < tileSize; j++){
			let u0 = i / tileSize;
			let u1 = (i+1) / tileSize;
			let v0 = j / tileSize;
			let v1 = (j+1) / tileSize;
			
			let x0 = u0 * box.getSize().x;
			let x1 = u1 * box.getSize().x;
			let y0 = v0 * box.getSize().y;
			let y1 = v1 * box.getSize().y;
			
			//let h00 = demNode.data[(i+0) + tileSize * (j+0)];
			//let h10 = demNode.data[(i+1) + tileSize * (j+0)];
			//let h01 = demNode.data[(i+0) + tileSize * (j+1)];
			//let h11 = demNode.data[(i+1) + tileSize * (j+1)];
			
			let h00 = demNode.height(new THREE.Vector3(box.min.x + x0, box.min.y + y0));
			let h10 = demNode.height(new THREE.Vector3(box.min.x + x1, box.min.y + y0));
			let h01 = demNode.height(new THREE.Vector3(box.min.x + x0, box.min.y + y1));
			let h11 = demNode.height(new THREE.Vector3(box.min.x + x1, box.min.y + y1));
			
			if(![h00, h10, h01, h11].every(n => isFinite(n))){
				continue;
			}
			
			triangles.push(x0, y0, h00);
			triangles.push(x0, y1, h01);
			triangles.push(x1, y0, h10);
			
			triangles.push(x0, y1, h01);
			triangles.push(x1, y1, h11);
			triangles.push(x1, y0, h10);
		}
	}
    
	let geometry = new THREE.BufferGeometry();
	let positions = new Float32Array(triangles);
	geometry.addAttribute( 'position', new THREE.BufferAttribute(positions, 3));
	geometry.computeBoundingSphere();
	geometry.computeVertexNormals();
	let material = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
	let mesh = new THREE.Mesh(geometry, material);
	mesh.position.copy(box.min);
	//mesh.position.copy(pointcloud.position);
	viewer.scene.scene.add(mesh);
	
	{ // DEBUG code
		//let data = demNode.data;
		
		let steps = 64;
		let data = new Float32Array(steps * steps);
		let imgData = new Uint8Array(data.length * 4);
		let box = demNode.box;
		let boxSize = box.getSize();
		for(let i = 0; i < steps; i++){
			for(let j = 0; j < steps; j++){
				let [u, v] = [i / (steps - 1), j / (steps - 1)];
				let pos = new THREE.Vector3(
					u * boxSize.x + box.min.x,
					v * boxSize.y + box.min.y,
					0
				);
				
				let height = demNode.height(pos);
				
				let index = i + steps * j;
				data[index] = height
				
				//let index = i + steps * j;
				//imgData[4*index + 0] = 255 * (height - min) / (max - min);
				//imgData[4*index + 1] = 100;
				//imgData[4*index + 2] = 0;
				//imgData[4*index + 3] = 255;
			}
		}
		
		let [min, max] = [Infinity, -Infinity];
		for(let height of data){
			if(!isFinite(height)){
				continue;
			}
			
			min = Math.min(min, height);
			max = Math.max(max, height);
		}
		
		for(let i = 0; i < data.length; i++){
			imgData[4*i + 0] = 255 * (data[i] - min) / (max - min);
			imgData[4*i + 1] = 100;
			imgData[4*i + 2] = 0;
			imgData[4*i + 3] = 255;
		}
		
		let img = Potree.utils.pixelsArrayToImage(imgData, steps, steps);
		
		let screenshot = img.src;
		
		if(!this.debugDIV){
			this.debugDIV = $(`
				<div id="pickDebug" 
				style="position: absolute; 
				right: 400px; width: 300px;
				bottom: 44px; width: 300px;
				z-index: 1000;
				"></div>`);
			$(document.body).append(this.debugDIV);
		}
		
		this.debugDIV.empty();
		this.debugDIV.append($(`<img src="${screenshot}"
			style="transform: scaleY(-1); width: 256px; height: 256px;"/>`));
		
	}
}

Potree.updateVisibility = function(pointclouds, camera, renderer){
	let numVisibleNodes = 0;
	let numVisiblePoints = 0;
	
	let visibleNodes = [];
	let visibleGeometry = [];
	let unloadedGeometry = [];
	
	let lowestSpacing = Infinity;
	
	// calculate object space frustum and cam pos and setup priority queue
	let s = updateVisibilityStructures(pointclouds, camera, renderer);
	let frustums = s.frustums;
	let camObjPositions = s.camObjPositions;
	let priorityQueue = s.priorityQueue;
	
	let loadedToGPUThisFrame = 0;
	
	while(priorityQueue.size() > 0){
		let element = priorityQueue.pop();
		let node = element.node;
		let parent = element.parent;
		let pointcloud = pointclouds[element.pointcloud];
		
		//{ // restrict to certain nodes for debugging
		//	let allowedNodes = ["r", "r0", "r4"];
		//	if(!allowedNodes.includes(node.name)){
		//		continue;
		//	}
		//}
		
		let box = node.getBoundingBox();
		let frustum = frustums[element.pointcloud];
		let camObjPos = camObjPositions[element.pointcloud];
		
		let insideFrustum = frustum.intersectsBox(box);
		let maxLevel = pointcloud.maxLevel || Infinity;
		let level = node.getLevel();
		let visible = insideFrustum;
		visible = visible && !(numVisiblePoints + node.getNumPoints() > Potree.pointBudget);
		visible = visible && level < maxLevel;
		
		if (pointcloud.material.numClipBoxes > 0 && visible && pointcloud.material.clipMode == Potree.ClipMode.CLIP_OUTSIDE) {
			let box2 = box.clone(); 
			pointcloud.updateMatrixWorld(true);
			box2.applyMatrix4(pointcloud.matrixWorld);
			let intersectsClipBoxes = false;
			for(let clipBox of pointcloud.material.clipBoxes) {
				let clipMatrixWorld = clipBox.matrix;
				let clipBoxWorld = new THREE.Box3(
						new THREE.Vector3(-0.5, -0.5, -0.5), 
						new THREE.Vector3(0.5, 0.5, 0.5))
					.applyMatrix4(clipMatrixWorld);
				if (box2.intersectsBox(clipBoxWorld)) {
					intersectsClipBoxes = true;
					break;
				}
			}
			visible = visible && intersectsClipBoxes;
		}
		
		//visible = ["r", "r0", "r06", "r060"].includes(node.name);
		//visible = ["r"].includes(node.name);
		
		if(node.spacing){
			lowestSpacing = Math.min(lowestSpacing, node.spacing);
		}else if(node.geometryNode && node.geometryNode.spacing){
			lowestSpacing = Math.min(lowestSpacing, node.geometryNode.spacing);
		}
		
		if(numVisiblePoints + node.getNumPoints() > Potree.pointBudget){
			break;
		}
		
		
		if(!visible){
			continue;
		}

		numVisibleNodes++;
		numVisiblePoints += node.getNumPoints();

		pointcloud.numVisibleNodes++;
		pointcloud.numVisiblePoints += node.getNumPoints();

		if(node.isGeometryNode() && (!parent || parent.isTreeNode())){
			if(node.isLoaded() && loadedToGPUThisFrame < 2){
				node = pointcloud.toTreeNode(node, parent);
				loadedToGPUThisFrame++;
			}else{
				unloadedGeometry.push(node);
				visibleGeometry.push(node);
			}
		}

		if(node.isTreeNode()){
			Potree.getLRU().touch(node.geometryNode);
			node.sceneNode.visible = true;
			node.sceneNode.material = pointcloud.material;

			visibleNodes.push(node);
			pointcloud.visibleNodes.push(node);

			node.sceneNode.updateMatrix();
			node.sceneNode.matrixWorld.multiplyMatrices( pointcloud.matrixWorld, node.sceneNode.matrix );

			if(pointcloud.showBoundingBox && !node.boundingBoxNode && node.getBoundingBox){
				let boxHelper = new Potree.Box3Helper(node.getBoundingBox());
				//let boxHelper = new THREE.BoxHelper(node.sceneNode);
				pointcloud.add(boxHelper);
				pointcloud.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrixWorld.copy(pointcloud.matrixWorld);
			}else if(pointcloud.showBoundingBox){
				node.boundingBoxNode.visible = true;
				node.boundingBoxNode.matrixWorld.copy(pointcloud.matrixWorld);
			}else if(!pointcloud.showBoundingBox && node.boundingBoxNode){
				node.boundingBoxNode.visible = false;
			}
			
		}

		// add child nodes to priorityQueue
		let children = node.getChildren();
		for(let i = 0; i < children.length; i++){
			let child = children[i];
			
			let sphere = child.getBoundingSphere();
			let distance = sphere.center.distanceTo(camObjPos);
			let radius = sphere.radius;
			
			let fov = (camera.fov * Math.PI) / 180;
			let slope = Math.tan(fov / 2);
			let projFactor = (0.5 * renderer.domElement.clientHeight) / (slope * distance);
			let screenPixelRadius = radius * projFactor;
			
			if(screenPixelRadius < pointcloud.minimumNodePixelSize){
				continue;
			}
			
			let weight = screenPixelRadius;

			if(distance - radius < 0){
				weight = Number.MAX_VALUE;
			}

			priorityQueue.push({pointcloud: element.pointcloud, node: child, parent: node, weight: weight});
		}


	}// end priority queue loop
	
	{ // update DEM
		let maxDEMLevel = 4;
		let candidates = pointclouds
			.filter(p => (p.generateDEM && p.dem instanceof Potree.DEM));
		for(let pointcloud of candidates){
			let updatingNodes = pointcloud.visibleNodes.filter(n => n.getLevel() <= maxDEMLevel);
			pointcloud.dem.update(updatingNodes);
		}
	}
	
	for(let i = 0; i < Math.min(5, unloadedGeometry.length); i++){
		unloadedGeometry[i].load();
	}
	
	//for(let node of visibleNodes){
	//	let allowedNodes = ["r", "r0", "r4"];
	//	node.sceneNode.visible = allowedNodes.includes(node.geometryNode.name);
	//	
	//	if(node.boundingBoxNode){
	//		node.boundingBoxNode.visible = node.boundingBoxNode.visible && node.sceneNode.visible;
	//	}
	//}
	
	
	//Potree.updateDEMs(renderer, visibleNodes);

	return {
		visibleNodes: visibleNodes, 
		numVisiblePoints: numVisiblePoints,
		lowestSpacing: lowestSpacing
	};
};



/*
//
// WAY TOO SLOW WITH SYNCHRONOUS READ PIXEL
//
Potree.DEMRenderer = class{
	constructor(renderer){
		this.renderer = renderer;
		
		this.tileWidth = 64;
		this.tileHeight = 64;
		
		//this.target = new THREE.WebGLRenderTarget( 64, 64, { 
		//	minFilter: THREE.NearestFilter, 
		//	magFilter: THREE.NearestFilter, 
		//	format: THREE.RGBAFormat, 
		//	type: THREE.FloatType
		//} );
		//this.target.depthTexture = new THREE.DepthTexture();
        //this.target.depthTexture.type = THREE.UnsignedIntType;
		
		this.targetElevation = new THREE.WebGLRenderTarget( this.tileWidth, this.tileHeight, { 
			minFilter: THREE.NearestFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat,
			//type: THREE.FloatType
		});
		
		this.targetMedian = new THREE.WebGLRenderTarget( this.tileWidth, this.tileHeight, { 
			minFilter: THREE.NearestFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat,
			//type: THREE.FloatType
		});
	
		this.vsElevation = `
			precision mediump float;
			precision mediump int;
			
			attribute vec3 position;
			
			uniform mat4 modelMatrix;
			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;
			
			varying float vElevation;
			
			void main(){
				vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
				gl_Position = projectionMatrix * mvPosition;
				gl_PointSize = 1.0;
				
				vElevation = position.z;
			}
		`;
	
		this.fsElevation = `
					precision mediump float;
					precision mediump int;
					
					varying float vElevation;
					
					void main(){
						gl_FragColor = vec4(vElevation, 0.0, 0.0, 1.0);
					}
		`;
		
		this.vsMedian = `
			precision mediump float;
			precision mediump int;
			
			attribute vec3 position;
			attribute vec2 uv;
			
			uniform mat4 modelMatrix;
			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;
		
			varying vec2 vUV;

			void main() {
				vUV = uv;
				
				vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

				gl_Position = projectionMatrix * mvPosition;
			}
		`;
		
		this.fsMedian = `
		
			precision mediump float;
			precision mediump int;
			
			uniform float uWidth;
			uniform float uHeight;					
			uniform sampler2D uTexture;

			varying vec2 vUV;
			
			void main(){
				vec2 uv = gl_FragCoord.xy / vec2(uWidth, uHeight);						
				
				vec4 color = texture2D(uTexture, uv);
				gl_FragColor = color;
                if(color.a == 0.0){
					
                    vec4 sum;
                    
                    float minVal = 1.0 / 0.0;
                    
                    float sumA = 0.0;
					for(int i = -1; i <= 1; i++){
						for(int j = -1; j <= 1; j++){
							vec2 n = gl_FragCoord.xy + vec2(i, j);
                            vec2 uv = n / vec2(uWidth, uHeight);	
                            vec4 c = texture2D(uTexture, uv);
                            
                            if(c.a == 1.0){
                            	minVal = min(c.r, minVal);
                            }
                            
                            sumA += c.a;
						}
					}
                    
                    if(sumA > 0.0){
                    	gl_FragColor = vec4(minVal, 0.0, 0.0, 1.0);
                    }else{
                    	discard;   
                    }
				}else{
					//gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
					gl_FragColor = vec4(color.rgb, 1.0);
				}
				
				
			}
		
		`;
		
		this.elevationMaterial = new THREE.RawShaderMaterial( {
			vertexShader: this.vsElevation,
			fragmentShader: this.fsElevation,
		} );
		
		this.medianFilterMaterial = new THREE.RawShaderMaterial( {
			uniforms: {
				uWidth: {value: 1.0},
				uHeight: {value: 1.0},
				uTexture: {type: "t", value: this.targetElevation.texture}
			},
			vertexShader: this.vsMedian,
			fragmentShader: this.fsMedian,
		});
		
		this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 1);
		
		
	}
	
	render(pointcloud, node){
		if(!node.geometryNode){
			return;
		}
		
		Potree.timerQueriesEnabled = true;
		let start = new Date().getTime();
		let queryAll = Potree.startQuery("All", this.renderer.getContext());
		
		this.renderer.setClearColor(0x0000FF, 0);
		this.renderer.clearTarget( this.target, true, true, true );
		this.renderer.clearTarget(this.targetElevation, true, true, false );
		this.renderer.clearTarget(this.targetMedian, true, true, false );
		
		let box = node.geometryNode.boundingBox;
		
		this.camera.up.set(0, 0, 1);
		//this.camera.rotation.x = Math.PI / 2;
		this.camera.left = box.min.x;
		this.camera.right = box.max.x;
		this.camera.top = box.max.y;
		this.camera.bottom = box.min.y;
		this.camera.near = -1000;
		this.camera.far = 1000;
		this.camera.updateProjectionMatrix();
		
		let scene = new THREE.Scene();
		//let material = new THREE.PointsMaterial({color: 0x00ff00, size: 0.0001});
		let material = this.elevationMaterial;
		let points = new THREE.Points(node.geometryNode.geometry, material);
		scene.add(points);
		
		this.renderer.render(points, this.camera, this.targetElevation);
		
		this.medianFilterMaterial.uniforms.uWidth.value = this.targetMedian.width;
		this.medianFilterMaterial.uniforms.uHeight.value = this.targetMedian.height;
		this.medianFilterMaterial.uniforms.uTexture.value = this.targetElevation.texture;
		
		Potree.utils.screenPass.render(this.renderer, this.medianFilterMaterial, this.targetMedian);
		
		Potree.endQuery(queryAll, this.renderer.getContext());
		Potree.resolveQueries(this.renderer.getContext());
		Potree.timerQueriesEnabled = false;
		
		
		setTimeout( () => {
			let start = new Date().getTime();
			
			let pixelCount = this.tileWidth * this.tileHeight;
			let buffer = new Uint8Array(4 * pixelCount);
			this.renderer.readRenderTargetPixels(this.targetMedian, 
				0, 0, this.tileWidth, this.tileHeight, 
				buffer);
				
			let end = new Date().getTime();
			let duration = end - start;
			console.log(`read duration: ${duration}ms`);
		}, 3000);
			
		let end = new Date().getTime();
		let duration = end - start;
		
		console.log(`duration: ${duration}ms`);
		
		//{ // open window with image
		//
		//	let pixelCount = this.tileWidth * this.tileHeight;
		//	let buffer = new Float32Array(4 * pixelCount);
		//	this.renderer.readRenderTargetPixels(this.targetMedian, 
		//		0, 0, this.tileWidth, this.tileHeight, 
		//		buffer);
		//		
		//	let uiBuffer = new Uint8Array(4 * pixelCount);
		//	for(let i = 0; i < pixelCount; i++){
		//		uiBuffer[i] = buffer[i] / 1.0;
		//	}
		//
		//	let img = Potree.utils.pixelsArrayToImage(uiBuffer, this.tileWidth, this.tileHeight);
		//	let screenshot = img.src;
		//	
		//	if(!this.debugDIV){
		//		this.debugDIV = $(`
		//			<div id="pickDebug" 
		//			style="position: absolute; 
		//			right: 400px; width: 300px;
		//			bottom: 44px; width: 300px;
		//			z-index: 1000;
		//			"></div>`);
		//		$(document.body).append(this.debugDIV);
		//	}
		//	
		//	this.debugDIV.empty();
		//	this.debugDIV.append($(`<img src="${screenshot}"
		//		style="transform: scaleY(-1);"/>`));
		//	//$(this.debugWindow.document).append($(`<img src="${screenshot}"/>`));
		//	//this.debugWindow.document.write('<img src="'+screenshot+'"/>');
		//}
	}
};
*/

// 
// index is in order xyzxyzxyz 
//

Potree.DEMNode = class DEMNode{
	constructor(name, box, tileSize){
		this.name = name;
		this.box = box;
		this.tileSize = tileSize;
		this.level = this.name.length - 1;
		this.data = new Float32Array(tileSize * tileSize);
		this.data.fill(-Infinity);
		this.children = [];
		
		this.mipMap = [this.data];
		this.mipMapNeedsUpdate = true;
	}
	
	createMipMap(){
		this.mipMap = [this.data];
		
		let sourceSize = this.tileSize;
		let mipSize = parseInt(sourceSize / 2);
		let mipSource = this.data;
		while(mipSize > 1){
			let mipData = new Float32Array(mipSize * mipSize);
			
			for(let i = 0; i < mipSize; i++){
				for(let j = 0; j < mipSize; j++){
					let h00 = mipSource[2*i+0 + 2*j*sourceSize];
					let h01 = mipSource[2*i+0 + 2*j*sourceSize + sourceSize];
					let h10 = mipSource[2*i+1 + 2*j*sourceSize];
					let h11 = mipSource[2*i+1 + 2*j*sourceSize + sourceSize];
					
					let [height, weight] = [0, 0];
					
					if(isFinite(h00)){height += h00; weight += 1};
					if(isFinite(h01)){height += h01; weight += 1};
					if(isFinite(h10)){height += h10; weight += 1};
					if(isFinite(h11)){height += h11; weight += 1};
					
					height = height / weight;
					
					//let hs = [h00, h01, h10, h11].filter(h => isFinite(h));
					//let height = hs.reduce( (a, v, i) => a + v, 0) / hs.length;
					
					mipData[i + j * mipSize] = height;
				}
			}
			
			this.mipMap.push(mipData);
			
			mipSource = mipData;
			sourceSize = mipSize;
			mipSize = parseInt(mipSize / 2);
		}
		
		this.mipMapNeedsUpdate = false;
	}
	
	uv(position){
		let boxSize = this.box.getSize();
		
		let u = (position.x - this.box.min.x) / boxSize.x;
		let v = (position.y - this.box.min.y) / boxSize.y;
		
		return [u, v];
	}
	
	heightAtMipMapLevel(position, mipMapLevel){
		let uv = this.uv(position);
		
		let tileSize = parseInt(this.tileSize / parseInt(2 ** mipMapLevel));
		let data = this.mipMap[mipMapLevel];
		
		let i = Math.min(uv[0] * tileSize, tileSize - 1);
		let j = Math.min(uv[1] * tileSize, tileSize - 1);
		
		let a = i % 1;
		let b = j % 1;
		
		let [i0, i1] = [Math.floor(i), Math.ceil(i)];
		let [j0, j1] = [Math.floor(j), Math.ceil(j)];
		
		let h00 = data[i0 + tileSize * j0];
		let h01 = data[i0 + tileSize * j1];
		let h10 = data[i1 + tileSize * j0];
		let h11 = data[i1 + tileSize * j1];
		
		let wh00 = isFinite(h00) ? (1 - a) * (1 - b) : 0;
		let wh01 = isFinite(h01) ? (1 - a) * b : 0;
		let wh10 = isFinite(h10) ? a * (1 - b) : 0;
		let wh11 = isFinite(h11) ? a * b : 0;
		
		let wsum = wh00 + wh01 + wh10 + wh11;
		wh00 = wh00 / wsum;
		wh01 = wh01 / wsum;
		wh10 = wh10 / wsum;
		wh11 = wh11 / wsum;
		
		if(wsum === 0){
			return null;
		}
		
		let h = 0;
		
		if(isFinite(h00)) h += h00 * wh00;
		if(isFinite(h01)) h += h01 * wh01;
		if(isFinite(h10)) h += h10 * wh10;
		if(isFinite(h11)) h += h11 * wh11;
		
		return h;
	}
	
	height(position){
		
		let h = null;
		
		for(let i = 0; i < this.mipMap.length; i++){
			h = this.heightAtMipMapLevel(position, i);
			
			if(h !== null){
				return h;
			}
		}
		
		return h;
	}
	
	traverse(callback, level = 0){
		callback(this, level);
		
		for(let child of this.children.filter(c => c !== undefined)){
			child.traverse(callback, level + 1);
		}
	}
}

Potree.DEM = class DEM{
	constructor(pointcloud){
		
		this.pointcloud = pointcloud;
		this.matrix = null;
		this.boundingBox = null;
		this.tileSize = 64;
		this.root = null;
		this.version = 0;
		
	}
	
	// expands the tree to all nodes that intersect <box> at <level>
	// returns the intersecting nodes at <level>
	expandAndFindByBox(box, level){
		
		if(level === 0){
			return [this.root];
		}
		
		let result = [];
		let stack = [this.root];
	
		while(stack.length > 0){
			
			let node = stack.pop();
			let nodeBoxSize = node.box.getSize();
		
			// check which children intersect by transforming min/max to quadrants
			let min = {
				x: (box.min.x - node.box.min.x) / nodeBoxSize.x,
				y: (box.min.y - node.box.min.y) / nodeBoxSize.y};
			let max = {
				x: (box.max.x - node.box.max.x) / nodeBoxSize.x,
				y: (box.max.y - node.box.max.y) / nodeBoxSize.y};
				
			min.x = min.x < 0.5 ? 0 : 1;
			min.y = min.y < 0.5 ? 0 : 1;
			max.x = max.x < 0.5 ? 0 : 1;
			max.y = max.y < 0.5 ? 0 : 1;
			
			let childIndices;
			if(min.x === 0 && min.y === 0 && max.x === 1 && max.y === 1){
				childIndices = [0, 1, 2, 3];
			}else if(min.x === max.x && min.y == max.y){
				childIndices = [(min.x << 1) | min.y];
			}else{
				childIndices = [(min.x << 1) | min.y, (max.x << 1) | max.y];
			}
			
			for(let index of childIndices){
				if(node.children[index] === undefined){
					let childBox = node.box.clone();
					
					if((index & 2) > 0){
						childBox.min.x += nodeBoxSize.x / 2.0;
					}else{
						childBox.max.x -= nodeBoxSize.x / 2.0;
					}
					
					if((index & 1) > 0){
						childBox.min.y += nodeBoxSize.y / 2.0;
					}else{
						childBox.max.y -= nodeBoxSize.y / 2.0;
					}
					
					let child = new Potree.DEMNode(node.name + index, childBox, this.tileSize);
					node.children[index] = child;
				}
				
				let child = node.children[index];
				
				if(child.level < level){
					stack.push(child);
				}else{
					result.push(child);
				}
			}
		}
		
		return result;
	}
	
	childIndex(uv){
		let [x, y] = uv.map(n => n < 0.5 ? 0 : 1);
		
		let index = (x << 1) | y;
		
		return index;
	}
	
	height(position){
		
		//return this.root.height(position);
		
		if(!this.root){
			return 0;
		}
        
		let height = null;
		let list = [this.root];
		while(true){
			let node = list[list.length - 1];
			
			let currentHeight = node.height(position);
			
			if(currentHeight !== null){
				height = currentHeight;
			}
			
			let uv = node.uv(position);
			let childIndex = this.childIndex(uv);
			
			if(node.children[childIndex]){
				list.push(node.children[childIndex]);
			}else{
				break;
			}
		}
		
		return height + this.pointcloud.position.z;
	}
	
	update(visibleNodes){
		
		if(Potree.getDEMWorkerInstance().working){
			return;
		}
		
		// check if point cloud transformation changed
		if(this.matrix === null || !this.matrix.equals(this.pointcloud.matrixWorld)){
			this.matrix = this.pointcloud.matrixWorld.clone();
			this.boundingBox = this.pointcloud.boundingBox.clone().applyMatrix4(this.matrix);
			this.root = new Potree.DEMNode("r", this.boundingBox, this.tileSize);
			this.version++;
		}
		
		// find node to update
		let node = null;
		for(let vn of visibleNodes){
			if(vn.demVersion === undefined || vn.demVersion < this.version){
				node = vn;
				break;
			}
		}
		if(node === null){
			return;
		}
		
		
		// update node
		let projectedBox = node.getBoundingBox().clone().applyMatrix4(this.matrix);
		let projectedBoxSize = projectedBox.getSize();
		
		let targetNodes = this.expandAndFindByBox(projectedBox, node.getLevel());
		node.demVersion = this.version;
		
		Potree.getDEMWorkerInstance().onmessage = (e) => {
			
			let data = new Float32Array(e.data.dem.data);
			
			for(let demNode of targetNodes){
				
				let boxSize = demNode.box.getSize();
				
				for(let i = 0; i < this.tileSize; i++){
					for(let j = 0; j < this.tileSize; j++){
						
						let u = (i / (this.tileSize - 1));
						let v = (j / (this.tileSize - 1));
						
						let x = demNode.box.min.x + u * boxSize.x;
						let y = demNode.box.min.y + v * boxSize.y;
						
						let ix = this.tileSize * (x - projectedBox.min.x) / projectedBoxSize.x;
						let iy = this.tileSize * (y - projectedBox.min.y) / projectedBoxSize.y;
						
						if(ix < 0 || ix > this.tileSize){
							continue;
						}
						
						if(iy < 0 || iy > this.tileSize){
							continue;
						}
						
						ix = Math.min(Math.floor(ix), this.tileSize - 1);
						iy = Math.min(Math.floor(iy), this.tileSize - 1);
						
						demNode.data[i + this.tileSize * j] = data[ix + this.tileSize * iy];
						
					}
				}
				
				demNode.createMipMap();
				demNode.mipMapNeedsUpdate = true;
				
				Potree.getDEMWorkerInstance().working = false;
				
				
				
			}
			
			
			
			// TODO only works somewhat if there is no rotation to the point cloud 
			
			//let target = targetNodes[0];
			//target.data = new Float32Array(data);
			//
			//
			////node.dem = e.data.dem;
		    //
			//Potree.getDEMWorkerInstance().working = false;
			//
			//{ // create scene objects for debugging
			//	//for(let demNode of targetNodes){
			//		var bb = new Potree.Box3Helper(box);
			//		viewer.scene.scene.add(bb);
            //
			//		createDEMMesh(this, target);
			//	//}
			//	
			//}
		};
		
		let position = node.geometryNode.geometry.attributes.position.array;
		let message = {
			boundingBox: {
				min: node.getBoundingBox().min.toArray(),
				max: node.getBoundingBox().max.toArray()
			},
			position: new Float32Array(position).buffer
		};
		let transferables = [message.position];
		Potree.getDEMWorkerInstance().working = true;
		Potree.getDEMWorkerInstance().postMessage(message, transferables);
		
		
	}
	
};

Potree.PointCloudTreeNode = class{
	
	constructor(){
		
	}
	
	getChildren(){
		throw "override function";
	}
	
	getBoundingBox(){
		throw "override function";
	}

	isLoaded(){
		throw "override function";
	}
	
	isGeometryNode(){
		throw "override function";
	}
	
	isTreeNode(){
		throw "override function";
	}
	
	getLevel(){
		throw "override function";
	}

	getBoundingSphere(){
		throw "override function";
	}
	
};


Potree.PointCloudTree = class PointCloudTree extends THREE.Object3D{
	
	constructor(){
		super();
		
		this.dem = new Potree.DEM(this);
	}
	
	initialized(){
		return this.root !== null;
	}

	
};



Potree.WorkerPool = class WorkerPool{

	constructor(){
		this.workers = {};
	}
	
	getWorker(url){
		
		if(!this.workers[url]){
			this.workers[url] = [];
		}

		if(this.workers[url].length === 0){
			let worker = new Worker(url);
			this.workers[url].push(worker);
		}
		
		let worker = this.workers[url].pop();
		
		return worker;
	}
	
	returnWorker(url, worker){
		this.workers[url].push(worker);
	}
	
};

Potree.workerPool = new Potree.WorkerPool();




Potree.Shaders["pointcloud.vs"] = `
precision mediump float;
precision mediump int;




#define max_clip_boxes 30

attribute vec3 position;
attribute vec3 color;
attribute vec3 normal;
attribute float intensity;
attribute float classification;
attribute float returnNumber;
attribute float numberOfReturns;
attribute float pointSourceID;
attribute vec4 indices;
//attribute float indices;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat3 normalMatrix;

uniform float pcIndex;

//uniform mat4 toModel;

uniform float screenWidth;
uniform float screenHeight;
uniform float fov;
uniform float spacing;
uniform float near;
uniform float far;

#if defined use_clip_box
	uniform mat4 clipBoxes[max_clip_boxes];
#endif


uniform float heightMin;
uniform float heightMax;
uniform float size;				// pixel size factor
uniform float minSize;			// minimum pixel size
uniform float maxSize;			// maximum pixel size
uniform float octreeSize;
uniform vec3 bbSize;
uniform vec3 uColor;
uniform float opacity;
uniform float clipBoxCount;
uniform float level;
uniform float vnStart;

uniform vec2 intensityRange;
uniform float intensityGamma;
uniform float intensityContrast;
uniform float intensityBrightness;
uniform float rgbGamma;
uniform float rgbContrast;
uniform float rgbBrightness;
uniform float transition;
uniform float wRGB;
uniform float wIntensity;
uniform float wElevation;
uniform float wClassification;
uniform float wReturnNumber;
uniform float wSourceID;


uniform sampler2D visibleNodes;
uniform sampler2D gradient;
uniform sampler2D classificationLUT;
uniform sampler2D depthMap;

varying float	vOpacity;
varying vec3	vColor;
varying float	vLinearDepth;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float 	vRadius;
varying vec3	vWorldPosition;
varying vec3	vNormal;


// ---------------------
// OCTREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_lod)) && defined(tree_type_octree)
/**
 * number of 1-bits up to inclusive index position
 * number is treated as if it were an integer in the range 0-255
 *
 */
float numberOfOnes(float number, float index){
	float tmp = mod(number, pow(2.0, index + 1.0));
	float numOnes = 0.0;
	for(float i = 0.0; i < 8.0; i++){
		if(mod(tmp, 2.0) != 0.0){
			numOnes++;
		}
		tmp = floor(tmp / 2.0);
	}
	return numOnes;
}


/**
 * checks whether the bit at index is 1
 * number is treated as if it were an integer in the range 0-255
 *
 */
bool isBitSet(float number, float index){
	return mod(floor(number / pow(2.0, index)), 2.0) != 0.0;
}


/**
 * find the LOD at the point position
 */
float getLOD(){
	
	vec3 offset = vec3(0.0, 0.0, 0.0);
	float iOffset = vnStart;
	float depth = level;
	for(float i = 0.0; i <= 30.0; i++){
		float nodeSizeAtLevel = octreeSize  / pow(2.0, i + level + 0.0);
		
		vec3 index3d = (position-offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		float index = 4.0 * index3d.x + 2.0 * index3d.y + index3d.z;
		
		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));
		float mask = value.r * 255.0;
		if(isBitSet(mask, index)){
			// there are more visible child nodes at this position
			iOffset = iOffset + value.g * 255.0 * 256.0 + value.b * 255.0 + numberOfOnes(mask, index - 1.0);
			depth++;
		}else{
			// no more visible child nodes at this position
			return depth;
		}
		
		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
        
	}
		
	return depth;
}

float getPointSizeAttenuation(){
	return pow(1.9, getLOD());
}


#endif


// ---------------------
// KD-TREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_lod)) && defined(tree_type_kdtree)

float getLOD(){
	vec3 offset = vec3(0.0, 0.0, 0.0);
	float iOffset = 0.0;
	float depth = 0.0;
		
		
	vec3 size = bbSize;	
	vec3 pos = position;
		
	for(float i = 0.0; i <= 1000.0; i++){
		
		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));
		
		int children = int(value.r * 255.0);
		float next = value.g * 255.0;
		int split = int(value.b * 255.0);
		
		if(next == 0.0){
		 	return depth;
		}
		
		vec3 splitv = vec3(0.0, 0.0, 0.0);
		if(split == 1){
			splitv.x = 1.0;
		}else if(split == 2){
		 	splitv.y = 1.0;
		}else if(split == 4){
		 	splitv.z = 1.0;
		}
		
		iOffset = iOffset + next;
		
		float factor = length(pos * splitv / size);
		if(factor < 0.5){
		 	// left
		    if(children == 0 || children == 2){
		    	return depth;
		    }
		}else{
		  	// right
		    pos = pos - size * splitv * 0.5;
		    if(children == 0 || children == 1){
		    	return depth;
		    }
		    if(children == 3){
		    	iOffset = iOffset + 1.0;
		    }
		}
		size = size * ((1.0 - (splitv + 1.0) / 2.0) + 0.5);
		
		depth++;
	}
		
		
	return depth;	
}

float getPointSizeAttenuation(){
	return 0.5 * pow(1.3, getLOD());
}

#endif

// formula adapted from: http://www.dfstudios.co.uk/articles/programming/image-programming-algorithms/image-processing-algorithms-part-5-contrast-adjustment/
float getContrastFactor(float contrast){
	return (1.0158730158730156 * (contrast + 1.0)) / (1.0158730158730156 - contrast);
}

vec3 getRGB(){
	vec3 rgb = color;
	
	rgb = pow(rgb, vec3(rgbGamma));
	rgb = rgb + rgbBrightness;
	rgb = (rgb - 0.5) * getContrastFactor(rgbContrast) + 0.5;
	rgb = clamp(rgb, 0.0, 1.0);
	
	//rgb = indices.rgb;
	//rgb.b = pcIndex / 255.0;
	
	
	return rgb;
}

float getIntensity(){
	float w = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);
	w = pow(w, intensityGamma);
	w = w + intensityBrightness;
	w = (w - 0.5) * getContrastFactor(intensityContrast) + 0.5;
	w = clamp(w, 0.0, 1.0);
	
	return w;
}

vec3 getElevation(){
	vec4 world = modelMatrix * vec4( position, 1.0 );
	float w = (world.z - heightMin) / (heightMax-heightMin);
	vec3 cElevation = texture2D(gradient, vec2(w,1.0-w)).rgb;
	
	return cElevation;
}

vec4 getClassification(){
	vec2 uv = vec2(classification / 255.0, 0.5);
	vec4 classColor = texture2D(classificationLUT, uv);
	
	return classColor;
}

vec3 getReturnNumber(){
	if(numberOfReturns == 1.0){
		return vec3(1.0, 1.0, 0.0);
	}else{
		if(returnNumber == 1.0){
			return vec3(1.0, 0.0, 0.0);
		}else if(returnNumber == numberOfReturns){
			return vec3(0.0, 0.0, 1.0);
		}else{
			return vec3(0.0, 1.0, 0.0);
		}
	}
}

vec3 getSourceID(){
	float w = mod(pointSourceID, 10.0) / 10.0;
	return texture2D(gradient, vec2(w,1.0 - w)).rgb;
}

vec3 getCompositeColor(){
	vec3 c;
	float w;

	c += wRGB * getRGB();
	w += wRGB;
	
	c += wIntensity * getIntensity() * vec3(1.0, 1.0, 1.0);
	w += wIntensity;
	
	c += wElevation * getElevation();
	w += wElevation;
	
	c += wReturnNumber * getReturnNumber();
	w += wReturnNumber;
	
	c += wSourceID * getSourceID();
	w += wSourceID;
	
	vec4 cl = wClassification * getClassification();
    c += cl.a * cl.rgb;
	w += wClassification * cl.a;

	c = c / w;
	
	if(w == 0.0){
		//c = color;
		gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
	}
	
	return c;
}

void main() {
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	vViewPosition = mvPosition.xyz;
	gl_Position = projectionMatrix * mvPosition;
	vOpacity = opacity;
	vLinearDepth = gl_Position.w;
	vLogDepth = log2(gl_Position.w);
	vNormal = normalize(normalMatrix * normal);

	// ---------------------
	// POINT COLOR
	// ---------------------
	vec4 cl = getClassification(); 
	
	#ifdef color_type_rgb
		vColor = getRGB();
	#elif defined color_type_height
		vColor = getElevation();
	#elif defined color_type_rgb_height
		vec3 cHeight = getElevation();
		vColor = (1.0 - transition) * getRGB() + transition * cHeight;
	#elif defined color_type_depth
		float linearDepth = -mvPosition.z ;
		float expDepth = (gl_Position.z / gl_Position.w) * 0.5 + 0.5;
		vColor = vec3(linearDepth, expDepth, 0.0);
	#elif defined color_type_intensity
		float w = getIntensity();
		vColor = vec3(w, w, w);
	#elif defined color_type_intensity_gradient
		float w = getIntensity();
		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;
	#elif defined color_type_color
		vColor = uColor;
	#elif defined color_type_lod
		float depth = getLOD();
		float w = depth / 5.0;
		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;
	#elif defined color_type_point_index
		//vColor = indices.rgb * 255.0;
		vColor = indices.rgb;
		
		//vColor.r = mod(indices, 256.0) / 255.0;
		//vColor.g = mod(indices / 256.0, 256.0) / 255.0;
		//vColor.b = 0.0;
		
	#elif defined color_type_classification
		vColor = cl.rgb;
	#elif defined color_type_return_number
		vColor = getReturnNumber();
	#elif defined color_type_source
		vColor = getSourceID();
	#elif defined color_type_normal
		vColor = (modelMatrix * vec4(normal, 0.0)).xyz;
	#elif defined color_type_phong
		vColor = color;
	#elif defined color_type_composite
		vColor = getCompositeColor();
	#endif
	
	#if !defined color_type_composite
		if(cl.a == 0.0){
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
			
			return;
		}
	#endif
	
	// ---------------------
	// POINT SIZE
	// ---------------------
	float pointSize = 1.0;
	
	float slope = tan(fov / 2.0);
	float projFactor =  -0.5 * screenHeight / (slope * vViewPosition.z);
	
	float r = spacing * 1.5;
	vRadius = r;
	#if defined fixed_point_size
		pointSize = size;
	#elif defined attenuated_point_size
		pointSize = size * projFactor;
	#elif defined adaptive_point_size
		float worldSpaceSize = size * r / getPointSizeAttenuation();
		pointSize = worldSpaceSize * projFactor;
	#endif

	pointSize = max(minSize, pointSize);
	pointSize = min(maxSize, pointSize);
	
	vRadius = pointSize / projFactor;
	
	gl_PointSize = pointSize;
	
	//gl_Position = vec4(1000.0, 1000.0, 1000.0, 1.0);
	
	
	// ---------------------
	// CLIPPING
	// ---------------------
	
	#if defined use_clip_box
		bool insideAny = false;
		for(int i = 0; i < max_clip_boxes; i++){
			if(i == int(clipBoxCount)){
				break;
			}
		
			vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4( position, 1.0 );
			bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;
			inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;
			inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;
			insideAny = insideAny || inside;
		}
		if(!insideAny){
	
			#if defined clip_outside
				gl_Position = vec4(1000.0, 1000.0, 1000.0, 1.0);
			#elif defined clip_highlight_inside && !defined(color_type_depth)
				float c = (vColor.r + vColor.g + vColor.b) / 6.0;
			#endif
		}else{
			#if defined clip_highlight_inside
				vColor.r += 0.5;
				
				//vec3 hsv = rgb2hsv(vColor);
            	//hsv.x = hsv.x - 0.3;
            	//hsv.z = hsv.z + 0.1;
            	//vColor = hsv2rgb(hsv);
				
			#endif
		}
	#endif

	//vColor = indices.rgb * 255.0;
	
}
`

Potree.Shaders["pointcloud.fs"] = `
precision mediump float;
precision mediump int;

#if defined paraboloid_point_shape
	#extension GL_EXT_frag_depth : enable
#endif

uniform mat4 viewMatrix;
uniform vec3 cameraPosition;


uniform mat4 projectionMatrix;
uniform float opacity;

uniform float blendHardness;
uniform float blendDepthSupplement;
uniform float fov;
uniform float spacing;
uniform float near;
uniform float far;
uniform float pcIndex;
uniform float screenWidth;
uniform float screenHeight;

uniform sampler2D depthMap;

varying vec3	vColor;
varying float	vOpacity;
varying float	vLinearDepth;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float	vRadius;
varying vec3	vNormal;

float specularStrength = 1.0;

void main() {

	vec3 color = vColor;
	float depth = gl_FragCoord.z;

	#if defined(circle_point_shape) || defined(paraboloid_point_shape) || defined (weighted_splats)
		float u = 2.0 * gl_PointCoord.x - 1.0;
		float v = 2.0 * gl_PointCoord.y - 1.0;
	#endif
	
	#if defined(circle_point_shape) || defined (weighted_splats)
		float cc = u*u + v*v;
		if(cc > 1.0){
			discard;
		}
	#endif
	
	#if defined weighted_splats
		vec2 uv = gl_FragCoord.xy / vec2(screenWidth, screenHeight);
		float sDepth = texture2D(depthMap, uv).r;
		if(vLinearDepth > sDepth + vRadius + blendDepthSupplement){
			discard;
		}
	#endif
		
	#if defined color_type_point_index
		gl_FragColor = vec4(color, pcIndex / 255.0);
	#else
		gl_FragColor = vec4(color, vOpacity);
	#endif

	vec3 normal = normalize( vNormal );
	normal.z = abs(normal.z);
	vec3 viewPosition = normalize( vViewPosition );
	
	#if defined(color_type_phong)

	// code taken from three.js phong light fragment shader
	
		#if MAX_POINT_LIGHTS > 0

			vec3 pointDiffuse = vec3( 0.0 );
			vec3 pointSpecular = vec3( 0.0 );

			for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {

				vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );
				vec3 lVector = lPosition.xyz + vViewPosition.xyz;

				float lDistance = 1.0;
				if ( pointLightDistance[ i ] > 0.0 )
					lDistance = 1.0 - min( ( length( lVector ) / pointLightDistance[ i ] ), 1.0 );

				lVector = normalize( lVector );

						// diffuse

				float dotProduct = dot( normal, lVector );

				#ifdef WRAP_AROUND

					float pointDiffuseWeightFull = max( dotProduct, 0.0 );
					float pointDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );

					vec3 pointDiffuseWeight = mix( vec3( pointDiffuseWeightFull ), vec3( pointDiffuseWeightHalf ), wrapRGB );

				#else

					float pointDiffuseWeight = max( dotProduct, 0.0 );

				#endif

				pointDiffuse += diffuse * pointLightColor[ i ] * pointDiffuseWeight * lDistance;

						// specular

				vec3 pointHalfVector = normalize( lVector + viewPosition );
				float pointDotNormalHalf = max( dot( normal, pointHalfVector ), 0.0 );
				float pointSpecularWeight = specularStrength * max( pow( pointDotNormalHalf, shininess ), 0.0 );

				float specularNormalization = ( shininess + 2.0 ) / 8.0;

				vec3 schlick = specular + vec3( 1.0 - specular ) * pow( max( 1.0 - dot( lVector, pointHalfVector ), 0.0 ), 5.0 );
				pointSpecular += schlick * pointLightColor[ i ] * pointSpecularWeight * pointDiffuseWeight * lDistance * specularNormalization;
				pointSpecular = vec3(0.0, 0.0, 0.0);
			}
		
		#endif
		
		#if MAX_DIR_LIGHTS > 0

			vec3 dirDiffuse = vec3( 0.0 );
			vec3 dirSpecular = vec3( 0.0 );

			for( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {

				vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );
				vec3 dirVector = normalize( lDirection.xyz );

						// diffuse

				float dotProduct = dot( normal, dirVector );

				#ifdef WRAP_AROUND

					float dirDiffuseWeightFull = max( dotProduct, 0.0 );
					float dirDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );

					vec3 dirDiffuseWeight = mix( vec3( dirDiffuseWeightFull ), vec3( dirDiffuseWeightHalf ), wrapRGB );

				#else

					float dirDiffuseWeight = max( dotProduct, 0.0 );

				#endif

				dirDiffuse += diffuse * directionalLightColor[ i ] * dirDiffuseWeight;

				// specular

				vec3 dirHalfVector = normalize( dirVector + viewPosition );
				float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );
				float dirSpecularWeight = specularStrength * max( pow( dirDotNormalHalf, shininess ), 0.0 );

				float specularNormalization = ( shininess + 2.0 ) / 8.0;

				vec3 schlick = specular + vec3( 1.0 - specular ) * pow( max( 1.0 - dot( dirVector, dirHalfVector ), 0.0 ), 5.0 );
				dirSpecular += schlick * directionalLightColor[ i ] * dirSpecularWeight * dirDiffuseWeight * specularNormalization;
			}

		#endif
		
		vec3 totalDiffuse = vec3( 0.0 );
		vec3 totalSpecular = vec3( 0.0 );
		
		#if MAX_POINT_LIGHTS > 0

			totalDiffuse += pointDiffuse;
			totalSpecular += pointSpecular;

		#endif
		
		#if MAX_DIR_LIGHTS > 0

			totalDiffuse += dirDiffuse;
			totalSpecular += dirSpecular;

		#endif
		
		gl_FragColor.xyz = gl_FragColor.xyz * ( emissive + totalDiffuse + ambientLightColor * ambient ) + totalSpecular;

	#endif
	
	#if defined weighted_splats
	    //float w = pow(1.0 - (u*u + v*v), blendHardness);
		
		float wx = 2.0 * length(2.0 * gl_PointCoord - 1.0);
		float w = exp(-wx * wx * 0.5);
		
		//float distance = length(2.0 * gl_PointCoord - 1.0);
		//float w = exp( -(distance * distance) / blendHardness);
		
		gl_FragColor.rgb = gl_FragColor.rgb * w;
		gl_FragColor.a = w;
	#endif
	
	#if defined paraboloid_point_shape
		float wi = 0.0 - ( u*u + v*v);
		vec4 pos = vec4(vViewPosition, 1.0);
		pos.z += wi * vRadius;
		float linearDepth = -pos.z;
		pos = projectionMatrix * pos;
		pos = pos / pos.w;
		float expDepth = pos.z;
		depth = (pos.z + 1.0) / 2.0;
		gl_FragDepthEXT = depth;
		
		#if defined(color_type_depth)
			color.r = linearDepth;
			color.g = expDepth;
		#endif
		
		#if defined(use_edl)
			gl_FragColor.a = log2(linearDepth);
		#endif
		
	#else
		#if defined(use_edl)
			gl_FragColor.a = vLogDepth;
		#endif
	#endif
	
	
		
	
	
	
	
}


`

Potree.Shaders["normalize.vs"] = `
varying vec2 vUv;

void main() {
    vUv = uv;

    gl_Position =   projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`

Potree.Shaders["normalize.fs"] = `
#extension GL_EXT_frag_depth : enable

uniform sampler2D depthMap;
uniform sampler2D texture;

varying vec2 vUv;

void main() {
    float depth = texture2D(depthMap, vUv).g; 
	
	if(depth <= 0.0){
		discard;
	}
	
    vec4 color = texture2D(texture, vUv); 
	color = color / color.w;
    
	gl_FragColor = vec4(color.xyz, 1.0); 
	
	gl_FragDepthEXT = depth;
}`

Potree.Shaders["edl.vs"] = `

varying vec2 vUv;

void main() {
    vUv = uv;
	
	vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

    gl_Position = projectionMatrix * mvPosition;
}`

Potree.Shaders["edl.fs"] = `// 
// adapted from the EDL shader code from Christian Boucheny in cloud compare:
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
//

uniform float screenWidth;
uniform float screenHeight;
uniform vec2 neighbours[NEIGHBOUR_COUNT];
uniform float edlStrength;
uniform float radius;
uniform float opacity;

uniform sampler2D colorMap;

varying vec2 vUv;

float response(float depth){
	vec2 uvRadius = radius / vec2(screenWidth, screenHeight);
	
	float sum = 0.0;
	
	for(int i = 0; i < NEIGHBOUR_COUNT; i++){
		vec2 uvNeighbor = vUv + uvRadius * neighbours[i];
		
		float neighbourDepth = texture2D(colorMap, uvNeighbor).a;

		if(neighbourDepth != 0.0){
			if(depth == 0.0){
				sum += 100.0;
			}else{
				sum += max(0.0, depth - neighbourDepth);
			}
		}
	}
	
	return sum / float(NEIGHBOUR_COUNT);
}

void main(){
	vec4 color = texture2D(colorMap, vUv);
	
	float depth = color.a;
	float res = response(depth);
	float shade = exp(-res * 300.0 * edlStrength);
	
	if(color.a == 0.0 && res == 0.0){
		discard;
	}else{
		gl_FragColor = vec4(color.rgb * shade, opacity);
	}
	
}
`

Potree.Shaders["blur.vs"] = `
varying vec2 vUv;

void main() {
    vUv = uv;

    gl_Position =   projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`

Potree.Shaders["blur.fs"] = `
uniform mat4 projectionMatrix;

uniform float screenWidth;
uniform float screenHeight;
uniform float near;
uniform float far;

uniform sampler2D map;

varying vec2 vUv;

void main() {

	float dx = 1.0 / screenWidth;
	float dy = 1.0 / screenHeight;

	vec3 color = vec3(0.0, 0.0, 0.0);
	color += texture2D(map, vUv + vec2(-dx, -dy)).rgb;
	color += texture2D(map, vUv + vec2(  0, -dy)).rgb;
	color += texture2D(map, vUv + vec2(+dx, -dy)).rgb;
	color += texture2D(map, vUv + vec2(-dx,   0)).rgb;
	color += texture2D(map, vUv + vec2(  0,   0)).rgb;
	color += texture2D(map, vUv + vec2(+dx,   0)).rgb;
	color += texture2D(map, vUv + vec2(-dx,  dy)).rgb;
	color += texture2D(map, vUv + vec2(  0,  dy)).rgb;
	color += texture2D(map, vUv + vec2(+dx,  dy)).rgb;
    
	color = color / 9.0;
	
	gl_FragColor = vec4(color, 1.0);
	
	
}`


THREE.EventDispatcher.prototype.removeEventListeners = function(type){
	
	if ( this._listeners === undefined ) {
		
		return;
		
	}
	
	if ( this._listeners[ type ] ) {
		
		delete this._listeners[ type ];
		
	}
	
};


THREE.PerspectiveCamera.prototype.zoomTo = function( node, factor ){

	if ( !node.geometry && !node.boundingSphere && !node.boundingBox) {
		return;
	}
	
	if ( node.geometry && node.geometry.boundingSphere === null ) { 
		node.geometry.computeBoundingSphere();
	}
	
	node.updateMatrixWorld();
	
	var bs;
	
	if(node.boundingSphere){
		bs = node.boundingSphere;
	}else if(node.geometry && node.geometry.boundingSphere){
		bs = node.geometry.boundingSphere;
	}else{
		bs = node.boundingBox.getBoundingSphere();
	}

	var _factor = factor || 1;
	
	bs = bs.clone().applyMatrix4(node.matrixWorld); 
	var radius = bs.radius;
	var fovr = this.fov * Math.PI / 180;
	
	if( this.aspect < 1 ){
		fovr = fovr * this.aspect;
	}
	
	var distanceFactor = Math.abs( radius / Math.sin( fovr / 2 ) ) * _factor ;
	
	var offset = this.getWorldDirection().multiplyScalar( -distanceFactor );
	this.position.copy(bs.center.clone().add( offset ));
	
};



//THREE.PerspectiveCamera.prototype.zoomTo = function(node, factor){
//	if(factor === undefined){
//		factor = 1;
//	}
//
//	node.updateMatrixWorld();
//	this.updateMatrix();
//	this.updateMatrixWorld();
//	
//	var box = Potree.utils.computeTransformedBoundingBox(node.boundingBox, node.matrixWorld);
//	var dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.quaternion);
//	var pos = box.center().sub(dir);
//	
//	var ps = [
//		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
//		new THREE.Vector3(box.min.x, box.min.y, box.min.z),
//		new THREE.Vector3(box.max.x, box.min.y, box.min.z),
//		new THREE.Vector3(box.min.x, box.max.y, box.min.z),
//		new THREE.Vector3(box.min.x, box.min.y, box.max.z),
//		new THREE.Vector3(box.min.x, box.max.y, box.max.z),
//		new THREE.Vector3(box.max.x, box.max.y, box.min.z),
//		new THREE.Vector3(box.max.x, box.min.y, box.max.z),
//		new THREE.Vector3(box.max.x, box.max.y, box.max.z)
//	];
//	
//	var frustum = new THREE.Frustum();
//	frustum.setFromMatrix(new THREE.Matrix4().multiplyMatrices(this.projectionMatrix, this.matrixWorldInverse));
//	
//	var max = Number.MIN_VALUE;
//	for(var i = 0; i < ps.length; i++){
//		var p  = ps[i];
//		
//		var distance = Number.MIN_VALUE;
//		// iterate through left, right, top and bottom planes
//		for(var j = 0; j < frustum.planes.length-2; j++){
//			var plane = frustum.planes[j];
//			var ray = new THREE.Ray(p, dir);
//			var dI = ray.distanceToPlaneWithNegative(plane);
//			distance = Math.max(distance, dI);
//		}
//		max = Math.max(max, distance);
//	}
//	var offset = dir.clone().multiplyScalar(-max);
//	offset.multiplyScalar(factor);
//	pos.add(offset);
//	this.position.copy(pos);
//	
//}
THREE.Ray.prototype.distanceToPlaneWithNegative = function ( plane ) {
	var denominator = plane.normal.dot( this.direction );
	if ( denominator === 0 ) {

		// line is coplanar, return origin
		if( plane.distanceToPoint( this.origin ) === 0 ) {
			return 0;
		}

		// Null is preferable to undefined since undefined means.... it is undefined
		return null;
	}
	var t = - ( this.origin.dot( plane.normal ) + plane.constant ) / denominator;

	return t;
};


/**
 * @class Loads mno files and returns a PointcloudOctree
 * for a description of the mno binary file format, read mnoFileFormat.txt
 * 
 * @author Markus Schuetz
 */
Potree.POCLoader = function(){
	
};
 
/**
 * @return a point cloud octree with the root node data loaded. 
 * loading of descendants happens asynchronously when they're needed
 * 
 * @param url
 * @param loadingFinishedListener executed after loading the binary has been finished
 */
Potree.POCLoader.load = function load(url, callback) {
	try{
		let pco = new Potree.PointCloudOctreeGeometry();
		pco.url = url;
		let xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		
		xhr.onreadystatechange = function(){
			if(xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)){
				let fMno = JSON.parse(xhr.responseText);
				
				let version = new Potree.Version(fMno.version);
				
				// assume octreeDir is absolute if it starts with http
				if(fMno.octreeDir.indexOf("http") === 0){
					pco.octreeDir = fMno.octreeDir;
				}else{
					pco.octreeDir = url + "/../" + fMno.octreeDir;
				}
				
				pco.spacing = fMno.spacing;
				pco.hierarchyStepSize = fMno.hierarchyStepSize;

				pco.pointAttributes = fMno.pointAttributes;
				
				let min = new THREE.Vector3(fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz);
				let max = new THREE.Vector3(fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz);
				let boundingBox = new THREE.Box3(min, max);
				let tightBoundingBox = boundingBox.clone();
				
				if(fMno.tightBoundingBox){
					tightBoundingBox.min.copy(new THREE.Vector3(fMno.tightBoundingBox.lx, fMno.tightBoundingBox.ly, fMno.tightBoundingBox.lz));
					tightBoundingBox.max.copy(new THREE.Vector3(fMno.tightBoundingBox.ux, fMno.tightBoundingBox.uy, fMno.tightBoundingBox.uz));
				}

				let offset = min.clone();
				
				boundingBox.min.sub(offset);
				boundingBox.max.sub(offset);
				
				tightBoundingBox.min.sub(offset);
				tightBoundingBox.max.sub(offset);
				
				pco.projection = fMno.projection;
				pco.boundingBox = boundingBox;
				pco.tightBoundingBox = tightBoundingBox;
				pco.boundingSphere = boundingBox.getBoundingSphere();
				pco.tightBoundingSphere = tightBoundingBox.getBoundingSphere();
				pco.offset = offset;
				if(fMno.pointAttributes === "LAS"){
					pco.loader = new Potree.LasLazLoader(fMno.version);
				}else if(fMno.pointAttributes === "LAZ"){
					pco.loader = new Potree.LasLazLoader(fMno.version);
				}else{
					pco.loader = new Potree.BinaryLoader(fMno.version, boundingBox, fMno.scale);
					pco.pointAttributes = new Potree.PointAttributes(pco.pointAttributes);
				}
				
				let nodes = {};
				
				{ // load root
					let name = "r";
					
					let root = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
					root.level = 0;
					root.hasChildren = true;
					root.spacing = pco.spacing;
					if(version.upTo("1.5")){
						root.numPoints = fMno.hierarchy[0][1];
					}else{
						root.numPoints = 0;
					}
					pco.root = root;
					pco.root.load();
					nodes[name] = root;
				}
				
				// load remaining hierarchy
				if(version.upTo("1.4")){
					for( let i = 1; i < fMno.hierarchy.length; i++){
						let name = fMno.hierarchy[i][0];
						let numPoints = fMno.hierarchy[i][1];
						let index = parseInt(name.charAt(name.length-1));
						let parentName = name.substring(0, name.length-1);
						let parentNode = nodes[parentName];
						let level = name.length-1;
						let boundingBox = Potree.POCLoader.createChildAABB(parentNode.boundingBox, index);
						
						let node = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
						node.level = level;
						node.numPoints = numPoints;
						node.spacing = pco.spacing / Math.pow(2, level);
						parentNode.addChild(node);
						nodes[name] = node;
					}
				}
				
				pco.nodes = nodes;
				
				callback(pco);
			}
		};
		
		xhr.send(null);
	}catch(e){
		console.log("loading failed: '" + url + "'");
		console.log(e);
		
		callback();
	}
};

Potree.POCLoader.loadPointAttributes = function(mno){
	
	let fpa = mno.pointAttributes;
	let pa = new Potree.PointAttributes();
	
	for(let i = 0; i < fpa.length; i++){   
		let pointAttribute = Potree.PointAttribute[fpa[i]];
		pa.add(pointAttribute);
	}                                                                     
	
	return pa;
};


Potree.POCLoader.createChildAABB = function(aabb, index){
	
	let min = aabb.min.clone();
	let max = aabb.max.clone();
	let size = new THREE.Vector3().subVectors(max, min);
	
	if((index & 0b0001) > 0){
		min.z += size.z / 2;
	}else{
		max.z -= size.z / 2;
	}
	
	if((index & 0b0010) > 0){
		min.y += size.y / 2;
	}else{
		max.y -= size.y / 2;
	}
	
	if((index & 0b0100) > 0){
		min.x += size.x / 2;
	}else{
		max.x -= size.x / 2;
	}
	
	return new THREE.Box3(min, max);
};




Potree.PointAttributeNames = {};

Potree.PointAttributeNames.POSITION_CARTESIAN 	= 0;	// float x, y, z;
Potree.PointAttributeNames.COLOR_PACKED		= 1;	// byte r, g, b, a; 	I = [0,1]
Potree.PointAttributeNames.COLOR_FLOATS_1		= 2;	// float r, g, b; 		I = [0,1]
Potree.PointAttributeNames.COLOR_FLOATS_255	= 3;	// float r, g, b; 		I = [0,255]
Potree.PointAttributeNames.NORMAL_FLOATS		= 4;  	// float x, y, z;
Potree.PointAttributeNames.FILLER				= 5;
Potree.PointAttributeNames.INTENSITY			= 6;
Potree.PointAttributeNames.CLASSIFICATION		= 7;
Potree.PointAttributeNames.NORMAL_SPHEREMAPPED	= 8;
Potree.PointAttributeNames.NORMAL_OCT16		= 9;
Potree.PointAttributeNames.NORMAL				= 10;

/**
 * Some types of possible point attribute data formats
 *
 * @class
 */
Potree.PointAttributeTypes = {
	DATA_TYPE_DOUBLE	: {ordinal : 0, size: 8},
	DATA_TYPE_FLOAT		: {ordinal : 1, size: 4},
	DATA_TYPE_INT8		: {ordinal : 2, size: 1},
	DATA_TYPE_UINT8		: {ordinal : 3, size: 1},
	DATA_TYPE_INT16		: {ordinal : 4, size: 2},
	DATA_TYPE_UINT16	: {ordinal : 5, size: 2},
	DATA_TYPE_INT32		: {ordinal : 6, size: 4},
	DATA_TYPE_UINT32	: {ordinal : 7, size: 4},
	DATA_TYPE_INT64		: {ordinal : 8, size: 8},
	DATA_TYPE_UINT64	: {ordinal : 9, size: 8}
};

var i = 0;
for(var obj in Potree.PointAttributeTypes){
	Potree.PointAttributeTypes[i] = Potree.PointAttributeTypes[obj];
	i++;
}

/**
 * A single point attribute such as color/normal/.. and its data format/number of elements/...
 *
 * @class
 * @param name
 * @param type
 * @param size
 * @returns
 */
Potree.PointAttribute = function(name, type, numElements){
	this.name = name;
	this.type = type;
	this.numElements = numElements;
	this.byteSize = this.numElements * this.type.size;
};

Potree.PointAttribute.POSITION_CARTESIAN = new Potree.PointAttribute(
		Potree.PointAttributeNames.POSITION_CARTESIAN,
		Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 3);

Potree.PointAttribute.RGBA_PACKED = new Potree.PointAttribute(
		Potree.PointAttributeNames.COLOR_PACKED,
		Potree.PointAttributeTypes.DATA_TYPE_INT8, 4);

Potree.PointAttribute.COLOR_PACKED = Potree.PointAttribute.RGBA_PACKED;

Potree.PointAttribute.RGB_PACKED = new Potree.PointAttribute(
		Potree.PointAttributeNames.COLOR_PACKED,
		Potree.PointAttributeTypes.DATA_TYPE_INT8, 3);

Potree.PointAttribute.NORMAL_FLOATS = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL_FLOATS,
		Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 3);

Potree.PointAttribute.FILLER_1B = new Potree.PointAttribute(
		Potree.PointAttributeNames.FILLER,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 1);

Potree.PointAttribute.INTENSITY = new Potree.PointAttribute(
		Potree.PointAttributeNames.INTENSITY,
		Potree.PointAttributeTypes.DATA_TYPE_UINT16, 1);

Potree.PointAttribute.CLASSIFICATION = new Potree.PointAttribute(
		Potree.PointAttributeNames.CLASSIFICATION,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 1);

Potree.PointAttribute.NORMAL_SPHEREMAPPED = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL_SPHEREMAPPED,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 2);

Potree.PointAttribute.NORMAL_OCT16 = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL_OCT16,
		Potree.PointAttributeTypes.DATA_TYPE_UINT8, 2);

Potree.PointAttribute.NORMAL = new Potree.PointAttribute(
		Potree.PointAttributeNames.NORMAL,
		Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 3);

/**
 * Ordered list of PointAttributes used to identify how points are aligned in a buffer.
 *
 * @class
 *
 */
Potree.PointAttributes = function(pointAttributes){
	this.attributes = [];
	this.byteSize = 0;
	this.size = 0;

	if(pointAttributes != null){
		for(var i = 0; i < pointAttributes.length; i++){
			var pointAttributeName = pointAttributes[i];
			var pointAttribute = Potree.PointAttribute[pointAttributeName];
			this.attributes.push(pointAttribute);
			this.byteSize += pointAttribute.byteSize;
			this.size++;
		}
	}
};

Potree.PointAttributes.prototype.add = function(pointAttribute){
	this.attributes.push(pointAttribute);
	this.byteSize += pointAttribute.byteSize;
	this.size++;
};

Potree.PointAttributes.prototype.hasColors = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(pointAttribute.name === Potree.PointAttributeNames.COLOR_PACKED){
			return true;
		}
	}

	return false;
};

Potree.PointAttributes.prototype.hasNormals = function(){
	for(var name in this.attributes){
		var pointAttribute = this.attributes[name];
		if(
			pointAttribute === Potree.PointAttribute.NORMAL_SPHEREMAPPED ||
			pointAttribute === Potree.PointAttribute.NORMAL_FLOATS ||
			pointAttribute === Potree.PointAttribute.NORMAL ||
			pointAttribute === Potree.PointAttribute.NORMAL_OCT16){
			return true;
		}
	}

	return false;
};


Potree.BinaryLoader = function(version, boundingBox, scale){
	if(typeof(version) === "string"){
		this.version = new Potree.Version(version);
	}else{
		this.version = version;
	}

	this.boundingBox = boundingBox;
	this.scale = scale;
};

Potree.BinaryLoader.prototype.load = function(node){
	if(node.loaded){
		return;
	}

	let scope = this;

	let url = node.getURL();

	if(this.version.equalOrHigher("1.4")){
		url += ".bin";
	}

	let xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200 || xhr.status === 0) {
				let buffer = xhr.response;
				scope.parse(node, buffer);
			} else {
				console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
			}
		}
	};
	try{
		xhr.send(null);
	}catch(e){
		console.log("fehler beim laden der punktwolke: " + e);
	}
};

Potree.BinaryLoader.prototype.parse = function(node, buffer){

	let numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;
	let pointAttributes = node.pcoGeometry.pointAttributes;

	if(this.version.upTo("1.5")){
		node.numPoints = numPoints;
	}

	let workerPath = Potree.scriptPath + "/workers/BinaryDecoderWorker.js";
	let worker = Potree.workerPool.getWorker(workerPath);
	
	worker.onmessage = function(e){
		let data = e.data;
		let buffers = data.attributeBuffers;
		let tightBoundingBox = new THREE.Box3(
			new THREE.Vector3().fromArray(data.tightBoundingBox.min),
			new THREE.Vector3().fromArray(data.tightBoundingBox.max)
		);

		Potree.workerPool.returnWorker(workerPath, worker);

		let geometry = new THREE.BufferGeometry();

		for(let property in buffers){
			if(buffers.hasOwnProperty(property)){
				let buffer = buffers[property].buffer;
				let attribute = buffers[property].attribute;
				let numElements = attribute.numElements;

				if(parseInt(property) === Potree.PointAttributeNames.POSITION_CARTESIAN){
					geometry.addAttribute("position", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.COLOR_PACKED){
					geometry.addAttribute("color", new THREE.BufferAttribute(new Uint8Array(buffer), 3, true));
				}else if(parseInt(property) === Potree.PointAttributeNames.INTENSITY){
					geometry.addAttribute("intensity", new THREE.BufferAttribute(new Float32Array(buffer), 1));
				}else if(parseInt(property) === Potree.PointAttributeNames.CLASSIFICATION){
					geometry.addAttribute("classification", new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				}else if(parseInt(property) === Potree.PointAttributeNames.NORMAL_SPHEREMAPPED){
					geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.NORMAL_OCT16){
					geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(parseInt(property) === Potree.PointAttributeNames.NORMAL){
					geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}
			}
		}
		let indicesAttribute = new THREE.Uint8BufferAttribute(data.indices, 4);
		indicesAttribute.normalized = true;
		geometry.addAttribute("indices", indicesAttribute);

		if(!geometry.attributes.normal){
			let buffer = new Float32Array(numPoints*3);
			geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
		}

		geometry.boundingBox = node.boundingBox;
		node.geometry = geometry;
		node.mean = new THREE.Vector3(...data.mean);
		node.tightBoundingBox = tightBoundingBox;
		node.loaded = true;
		node.loading = false;
		node.pcoGeometry.numNodesLoading--;
	};

	let message = {
		buffer: buffer,
		pointAttributes: pointAttributes,
		version: this.version.version,
		min: [ node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z ],
		offset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z],
		scale: this.scale
	};
	worker.postMessage(message, [message.buffer]);

};

function networkToNative(val) {
    return ((val & 0x00FF) << 24) |
           ((val & 0xFF00) <<  8) |
           ((val >> 8)  & 0xFF00) |
           ((val >> 24) & 0x00FF);
}

Potree.GreyhoundBinaryLoader = function(version, boundingBox, scale){
	if (typeof(version) === "string") {
		this.version = new Potree.Version(version);
	}
    else {
		this.version = version;
	}

	this.boundingBox = boundingBox;
	this.scale = scale;
};

Potree.GreyhoundBinaryLoader.prototype.load = function(node){
	if (node.loaded) return;

    var scope = this;
	var url = node.getURL();

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');

	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200 || xhr.status === 0) {
				var buffer = xhr.response;
				scope.parse(node, buffer);
			}
            else {
				console.log(
                        'Failed to load file! HTTP status:', xhr.status,
                        'file:', url);
			}
		}
	};

	try {
		xhr.send(null);
	}
    catch(e) {
		console.log("error loading point cloud: " + e);
	}
};

Potree.GreyhoundBinaryLoader.prototype.parse = function(node, buffer){
	var NUM_POINTS_BYTES = 4;

    var view = new DataView(
            buffer, buffer.byteLength - NUM_POINTS_BYTES, NUM_POINTS_BYTES);
    var numPoints = networkToNative(view.getUint32(0));
	var pointAttributes = node.pcoGeometry.pointAttributes;

    node.numPoints = numPoints;

	let workerPath = Potree.scriptPath + "/workers/GreyhoundBinaryDecoderWorker.js";
	let worker = Potree.workerPool.getWorker(workerPath);

	worker.onmessage = function(e){
		var data = e.data;
		var buffers = data.attributeBuffers;
		var tightBoundingBox = new THREE.Box3(
			new THREE.Vector3().fromArray(data.tightBoundingBox.min),
			new THREE.Vector3().fromArray(data.tightBoundingBox.max)
		);

		Potree.workerPool.returnWorker(workerPath, worker);

		var geometry = new THREE.BufferGeometry();

        var addAttribute = function(name, buffer, size) {
            geometry.addAttribute(
                    name,
                    new THREE.BufferAttribute(new Float32Array(buffer), size));
        };

		for (var property in buffers) {
			if (buffers.hasOwnProperty(property)) {
				var buffer = buffers[property].buffer;
				var attribute = buffers[property].attribute;
				var numElements = attribute.numElements;

                var pointAttributes = Potree.PointAttributeNames;

                switch (parseInt(property)) {
                    case pointAttributes.POSITION_CARTESIAN:
                        addAttribute('position', buffer, 3);
						//let fb = new Float32Array(buffer);
						//console.log(fb);
                        break;
                    case pointAttributes.COLOR_PACKED:
						geometry.addAttribute("color", 
							new THREE.BufferAttribute(new Uint8Array(buffer), 3, true));
                        break;
                    case pointAttributes.INTENSITY:
                        addAttribute('intensity', buffer, 1);
                        break;
                    case pointAttributes.CLASSIFICATION:
                        addAttribute('classification', buffer, 1);
                        break;
                    case pointAttributes.NORMAL_SPHEREMAPPED:
                    case pointAttributes.NORMAL_OCT16:
                    case pointAttributes.NORMAL:
                        addAttribute('normal', buffer, 3);
                        break;
                    default:
                        break;
                }
			}
		}

        //addAttribute('indices', data.indices, 1);
		
		let indicesAttribute = new THREE.Uint8BufferAttribute(data.indices, 4);
		indicesAttribute.normalized = true;
		geometry.addAttribute("indices", indicesAttribute);

		if (!geometry.attributes.normal) {
            addAttribute('normal', new Float32Array(numPoints * 3), 3);
        }

		geometry.boundingBox = node.boundingBox;
		node.geometry = geometry;
		node.tightBoundingBox = tightBoundingBox;
		node.loaded = true;
		node.loading = false;
		--node.pcoGeometry.numNodesLoading;
	};

    var bb = node.boundingBox;
    var pco = node.pcoGeometry;


	//let nodeOffset = node.boundingBox.getCenter();
	//let nodeOffset = new THREE.Vector3(0, 0, 0);
	let nodeOffset = node.pcoGeometry.boundingBox.getCenter().sub(node.boundingBox.min);
	//let nodeOffset = node.pcoGeometry.boundingBox.min;

	var message = {
		buffer: buffer,
		pointAttributes: pointAttributes,
		version: this.version.version,
        schema: node.pcoGeometry.schema,
		min: [bb.min.x, bb.min.y, bb.min.z],
		max: [bb.max.x, bb.max.y, bb.max.z],
		offset: nodeOffset.toArray(),
        scale: this.scale,
        normalize: node.pcoGeometry.normalize
	};

	worker.postMessage(message, [message.buffer]);
};


/**
 * @class Loads greyhound metadata and returns a PointcloudOctree
 *
 * @author Maarten van Meersbergen
 * @author Oscar Martinez Rubi
 * @author Connor Manning
 */

class GreyhoundUtils{
	
	static getQueryParam(name) {
		name = name.replace(/[\[\]]/g, "\\$&");
		var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
			results = regex.exec(window.location.href);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, " "));
	}
	
	static createSchema(attributes) {
		var schema = [
			{ "name": "X", "size": 4, "type": "signed" },
			{ "name": "Y", "size": 4, "type": "signed" },
			{ "name": "Z", "size": 4, "type": "signed" }
		];

		// Once we include options in the UI to load a dynamic list of available
		// attributes for visualization (f.e. Classification, Intensity etc.)
		// we will be able to ask for that specific attribute from the server,
		// where we are now requesting all attributes for all points all the time.
		// If we do that though, we also need to tell Potree to redraw the points
		// that are already loaded (with different attributes).
		// This is not default behaviour.
		attributes.forEach(function(item) {
			if(item === 'COLOR_PACKED') {
				schema.push({ "name": "Red",      "size": 2, "type": "unsigned" });
				schema.push({ "name": "Green",    "size": 2, "type": "unsigned" });
				schema.push({ "name": "Blue",     "size": 2, "type": "unsigned" });
			} else if(item === 'INTENSITY'){
				schema.push({ "name": "Intensity", "size": 2, "type": "unsigned" });
			} else if(item === 'CLASSIFICATION') {
				schema.push(
						{ "name": "Classification", "size": 1, "type": "unsigned" });
			}
		});

	  return schema;
	}
	
	static fetch(url, cb) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					cb(null, xhr.responseText);
				}
				else {
					cb(xhr.responseText);
				}
			}
		};
		xhr.send(null);
	};

	static fetchBinary(url, cb) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					cb(null, xhr.response);
				}
				else {
					cb(xhr.responseText);
				}
			}
		};
		xhr.send(null);
	};

	static pointSizeFrom(schema) {
		return schema.reduce((p, c) => p + c.size, 0);
	};

	static getNormalization(serverURL, baseDepth, cb) {
		var s = [
			{ "name": "X",          "size": 4, "type": "floating" },
			{ "name": "Y",          "size": 4, "type": "floating" },
			{ "name": "Z",          "size": 4, "type": "floating" },
			{ "name": "Red",        "size": 2, "type": "unsigned" },
			{ "name": "Green",      "size": 2, "type": "unsigned" },
			{ "name": "Blue",       "size": 2, "type": "unsigned" },
			{ "name": "Intensity",  "size": 2, "type": "unsigned" }
		];

		var url = serverURL + 'read?depth=' + baseDepth +
			'&schema=' + JSON.stringify(s);

		GreyhoundUtils.fetchBinary(url, function(err, buffer) {
			if (err) throw new Error(err);

			var view = new DataView(buffer);
			var numBytes = buffer.byteLength - 4;
			var numPoints = view.getUint32(numBytes, true);
			var pointSize = GreyhoundUtils.pointSizeFrom(s);

			var colorNorm = false, intensityNorm = false;
			var v;

			for (var offset = 0; offset < numBytes; offset += pointSize) {
				if (view.getUint16(offset + 12, true) > 255 ||
					view.getUint16(offset + 14, true) > 255 ||
					view.getUint16(offset + 16, true) > 255) {
					colorNorm = true;
				}

				if (view.getUint16(offset + 18, true) > 255) {
					intensityNorm = true;
				}

				if (colorNorm && intensityNorm) break;
			}

			if (colorNorm) console.log('Normalizing color');
			if (intensityNorm) console.log('Normalizing intensity');

			cb(null, { color: colorNorm, intensity: intensityNorm });
		});
	};
	
};

Potree.GreyhoundLoader = function() { };
Potree.GreyhoundLoader.loadInfoJSON = function load(url, callback) { }

/**
 * @return a point cloud octree with the root node data loaded.
 * loading of descendants happens asynchronously when they're needed
 *
 * @param url
 * @param loadingFinishedListener executed after loading the binary has been
 * finished
 */
Potree.GreyhoundLoader.load = function load(url, callback) {
	var HIERARCHY_STEP_SIZE = 5;

	try {
		// We assume everything ater the string 'greyhound://' is the server url
		var serverURL = url.split('greyhound://')[1];
        if (serverURL.split('http://').length == 1) {
            serverURL = 'http://' + serverURL;
        }

        GreyhoundUtils.fetch(serverURL + 'info', function(err, data) {
            if (err) throw new Error(err);

            /* We parse the result of the info query, which should be a JSON
             * datastructure somewhat like:
            {
              "bounds": [635577, 848882, -1000, 639004, 853538, 2000],
              "numPoints": 10653336,
              "schema": [
                  { "name": "X", "size": 8, "type": "floating" },
                  { "name": "Y", "size": 8, "type": "floating" },
                  { "name": "Z", "size": 8, "type": "floating" },
                  { "name": "Intensity", "size": 2, "type": "unsigned" },
                  { "name": "OriginId", "size": 4, "type": "unsigned" },
                  { "name": "Red", "size": 2, "type": "unsigned" },
                  { "name": "Green", "size": 2, "type": "unsigned" },
                  { "name": "Blue", "size": 2, "type": "unsigned" }
              ],
              "srs": "<omitted for brevity>",
              "type": "octree"
            }
            */
            var greyhoundInfo = JSON.parse(data);
            var version = new Potree.Version('1.4');

            var bounds = greyhoundInfo.bounds;
            var boundsConforming = greyhoundInfo.boundsConforming;

            var width = bounds[3] - bounds[0];
            var depth = bounds[4] - bounds[1];
            var height= bounds[5] - bounds[2];
            var radius = width / 2;

            var scale = greyhoundInfo.scale;
            var scale = greyhoundInfo.scale || .01;
            if (Array.isArray(scale)) {
                scale = Math.min(scale[0], scale[1], scale[2]);
            }

            if (GreyhoundUtils.getQueryParam('scale')) {
                scale = parseFloat(GreyhoundUtils.getQueryParam('scale'));
            }

            var baseDepth = Math.max(8, greyhoundInfo.baseDepth);

            // Ideally we want to change this bit completely, since
            // greyhound's options are wider than the default options for
            // visualizing pointclouds. If someone ever has time to build a
            // custom ui element for greyhound, the schema options from
            // this info request should be given to the UI, so the user can
            // choose between them. The selected option can then be
            // directly requested from the server in the
            // PointCloudGreyhoundGeometryNode without asking for
            // attributes that we are not currently visualizing.  We assume
            // XYZ are always available.
            var attributes = ['POSITION_CARTESIAN'];

            // To be careful, we only add COLOR_PACKED as an option if all
            // colors are actually found.
            var red = false, green = false, blue = false;

            greyhoundInfo.schema.forEach(function(entry) {
                // Intensity and Classification are optional.
                if (entry.name === 'Intensity') {
                    attributes.push('INTENSITY');
                }
                if (entry.name === 'Classification') {
                    attributes.push('CLASSIFICATION');
                }

                if (entry.name === 'Red') red = true;
                else if (entry.name === 'Green') green = true;
                else if (entry.name === 'Blue') blue = true;
            });

            if (red && green && blue) attributes.push('COLOR_PACKED');

            // Fill in geometry fields.
            var pgg = new Potree.PointCloudGreyhoundGeometry();
            pgg.serverURL = serverURL;
            pgg.spacing = (bounds[3] - bounds[0]) / Math.pow(2, baseDepth);
            pgg.baseDepth = baseDepth;
            pgg.hierarchyStepSize = HIERARCHY_STEP_SIZE;

            pgg.schema = GreyhoundUtils.createSchema(attributes);
            var pointSize = GreyhoundUtils.pointSizeFrom(pgg.schema);

            pgg.pointAttributes = new Potree.PointAttributes(attributes);
            pgg.pointAttributes.byteSize = pointSize;

            var boundingBox = new THREE.Box3(
                new THREE.Vector3().fromArray(bounds, 0),
                new THREE.Vector3().fromArray(bounds, 3));

            var offset = boundingBox.min.clone();

            boundingBox.max.sub(boundingBox.min);
            boundingBox.min.set(0, 0, 0);

            pgg.projection = greyhoundInfo.srs;
            pgg.boundingBox = boundingBox;
            pgg.boundingSphere = boundingBox.getBoundingSphere();

            pgg.scale = scale;
            pgg.offset = offset;

            console.log('Scale:', scale);
            console.log('Offset:', offset);
            console.log('Bounds:', boundingBox);

            pgg.loader = new Potree.GreyhoundBinaryLoader(
                    version, boundingBox, pgg.scale);

            var nodes = {};

            { // load root
                var name = "r";

                var root = new Potree.PointCloudGreyhoundGeometryNode(
                        name, pgg, boundingBox,
                        scale, offset);

                root.level = 0;
                root.hasChildren = true;
                root.numPoints = greyhoundInfo.numPoints;
                root.spacing = pgg.spacing;
                pgg.root = root;
                pgg.root.load();
                nodes[name] = root;
            }

            pgg.nodes = nodes;

            GreyhoundUtils.getNormalization(serverURL, greyhoundInfo.baseDepth,
                    function(err, normalize) {
                        if (normalize.color) pgg.normalize.color = true;
                        if (normalize.intensity) pgg.normalize.intensity = true;

                        callback(pgg);
                    });
        });
	}
    catch(e) {
		console.log("loading failed: '" + url + "'");
		console.log(e);

		callback();
	}
};

Potree.GreyhoundLoader.loadPointAttributes = function(mno){
	var fpa = mno.pointAttributes;
	var pa = new Potree.PointAttributes();

	for(var i = 0; i < fpa.length; i++){
		var pointAttribute = Potree.PointAttribute[fpa[i]];
		pa.add(pointAttribute);
	}

	return pa;
};


Potree.GreyhoundLoader.createChildAABB = function(aabb, childIndex){
	var V3 = THREE.Vector3;
	var min = aabb.min;
	var max = aabb.max;
	var dHalfLength = new THREE.Vector3().copy(max).sub(min).multiplyScalar(0.5);
	var xHalfLength = new THREE.Vector3(dHalfLength.x, 0, 0);
	var yHalfLength = new THREE.Vector3(0, dHalfLength.y, 0);
	var zHalfLength = new THREE.Vector3(0, 0, dHalfLength.z);

	var cmin = min;
	var cmax = new THREE.Vector3().add(min).add(dHalfLength);

	var min, max;
	if (childIndex === 1) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength);
	}else if (childIndex === 3) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(yHalfLength);
	}else if (childIndex === 0) {
		min = cmin;
		max = cmax;
	}else if (childIndex === 2) {
		min = new THREE.Vector3().copy(cmin).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(yHalfLength);
	}else if (childIndex === 5) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(xHalfLength);
	}else if (childIndex === 7) {
		min = new THREE.Vector3().copy(cmin).add(dHalfLength);
		max = new THREE.Vector3().copy(cmax).add(dHalfLength);
	}else if (childIndex === 4) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength);
	}else if (childIndex === 6) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength).add(yHalfLength);
	}

	return new THREE.Box3(min, max);
};


/**
 * laslaz code taken and adapted from plas.io js-laslaz
 *	http://plas.io/
 *  https://github.com/verma/plasio
 *
 * Thanks to Uday Verma and Howard Butler
 *
 */
 
Potree.LasLazLoader = class LasLazLoader{
	
	constructor(version){
		if(typeof(version) === "string"){
			this.version = new Potree.Version(version);
		}else{
			this.version = version;
		}
	}
	
	static progressCB(){
		
	}
	
	load(node){
		
		if(node.loaded){
			return;
		}
		
		let pointAttributes = node.pcoGeometry.pointAttributes;

		let url = node.getURL();
		
		if(this.version.equalOrHigher("1.4")){
			url += "." + pointAttributes.toLowerCase();
		}
		
		let scope = this;
		
		let xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					let buffer = xhr.response;
					scope.parse(node, buffer);
				} else {
					console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
				}
			}
		};
		
		xhr.send(null);
	}
	
	parse(node, buffer){
		let lf = new LASFile(buffer);
		let handler = new Potree.LasLazBatcher(node);
		
		return Promise.resolve(lf).cancellable().then(function(lf) {
			return lf.open().then(function() {
				lf.isOpen = true;
				return lf;
			})
			.catch(Promise.CancellationError, function(e) {
				// open message was sent at this point, but then handler was not called
				// because the operation was cancelled, explicitly close the file
				return lf.close().then(function() {
					throw e;
				});
			});
		}).then(function(lf) {
			return lf.getHeader().then(function(h) {
				return [lf, h];
			});
		}).then(function(v) {
			let lf = v[0];
			let header = v[1];
			
			let skip = 1;
			let totalRead = 0;
			let totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);
			let reader = function() {
				let p = lf.readData(1000000, 0, skip);
				return p.then(function(data) {
					handler.push(new LASDecoder(data.buffer,
													   header.pointsFormatId,
													   header.pointsStructSize,
													   data.count,
													   header.scale,
													   header.offset,
													   header.mins, header.maxs));

					totalRead += data.count;
					Potree.LasLazLoader.progressCB(totalRead / totalToRead);

					if (data.hasMoreData)
						return reader();
					else {

						header.totalRead = totalRead;
						header.versionAsString = lf.versionAsString;
						header.isCompressed = lf.isCompressed;
						return [lf, header, handler];
					}
				});
			};
			
			return reader();
		}).then(function(v) {
			let lf = v[0];
			// we're done loading this file
			//
			Potree.LasLazLoader.progressCB(1);

			// Close it
			return lf.close().then(function() {
				lf.isOpen = false;
				// Delay this a bit so that the user sees 100% completion
				//
				return Promise.delay(200).cancellable();
			}).then(function() {
				// trim off the first element (our LASFile which we don't really want to pass to the user)
				//
				return v.slice(1);
			});
		}).catch(Promise.CancellationError, function(e) {
			// If there was a cancellation, make sure the file is closed, if the file is open
			// close and then fail
			if (lf.isOpen) 
				return lf.close().then(function() {
					lf.isOpen = false;
					throw e;
				});
			throw e;
		});
	}
	
	handle(node, url){
		
	}
	
};

Potree.LasLazBatcher = class LasLazBatcher{
	
	constructor(node){	
		this.node = node;
	}
	
	push(lasBuffer){
		
		let workerPath = Potree.scriptPath + "/workers/LASDecoderWorker.js";
		let worker = Potree.workerPool.getWorker(workerPath);
		
		worker.onmessage = (e) => {
			let geometry = new THREE.BufferGeometry();
			let numPoints = lasBuffer.pointsCount;
			
			let endsWith = function(str, suffix) {
				return str.indexOf(suffix, str.length - suffix.length) !== -1;
			};
			
			let positions = e.data.position;
			let colors = new Uint8Array(e.data.color);
			let intensities = e.data.intensity;
			let classifications = new Uint8Array(e.data.classification);
			let returnNumbers = new Uint8Array(e.data.returnNumber);
			let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			//let indices = new ArrayBuffer(numPoints*4);
			//let iIndices = new Uint32Array(indices);
			
			//let box = new THREE.Box3();
			//
			//let fPositions = new Float32Array(positions);
			//for(let i = 0; i < numPoints; i++){				
			//	box.expandByPoint(new THREE.Vector3(fPositions[3*i+0], fPositions[3*i+1], fPositions[3*i+2]));
			//}
			
			geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(intensities), 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(returnNumbers, 1));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(numberOfReturns, 1));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(pointSourceIDs, 1));
			geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(numPoints*3), 3));
			
			let indicesAttribute = new THREE.Uint8BufferAttribute(e.data.indices, 4);
			indicesAttribute.normalized = true;
			geometry.addAttribute("indices", indicesAttribute);
			
			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);
			
			geometry.boundingBox = this.node.boundingBox;
			this.node.tightBoundingBox = tightBoundingBox;
			
			this.node.geometry = geometry;
			this.node.loaded = true;
			this.node.loading = false;
			this.node.pcoGeometry.numNodesLoading--;
			this.node.mean = new THREE.Vector3(...e.data.mean);
			
			Potree.workerPool.returnWorker(workerPath, worker);
		};
		
		let message = {
			buffer: lasBuffer.arrayb,
			numPoints: lasBuffer.pointsCount,
			pointSize: lasBuffer.pointSize,
			pointFormatID: 2,
			scale: lasBuffer.scale,
			offset: lasBuffer.offset,
			mins: lasBuffer.mins,
			maxs: lasBuffer.maxs
		};
		worker.postMessage(message, [message.buffer]);
	};
};


//
//
//
// how to calculate the radius of a projected sphere in screen space
// http://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
// http://stackoverflow.com/questions/3717226/radius-of-projected-sphere
//

//
// to get a ready to use gradient array from a chroma.js gradient:
// http://gka.github.io/chroma.js/
//
//var stops = [];
//for(let i = 0; i <= 10; i++){
//	let range = chroma.scale(['yellow', 'navy']).mode('lch').domain([10,0])(i)._rgb
//		.slice(0, 3)
//		.map(v => (v / 255).toFixed(4))
//		.join(", ");
//
//	let line = `[${i / 10}, new THREE.Color(${range})],`;
//
//	stops.push(line);
//}
//stops.join("\n");


// to get a ready to use gradient array from matplotlib:
//import matplotlib.pyplot as plt
//import matplotlib.colors as colors
//
//norm = colors.Normalize(vmin=0,vmax=1)
//cmap = plt.cm.viridis
//
//for i in range(0,11):
//    u = i / 10
//    rgb = cmap(norm(u))[0:3]
//    rgb = ["{0:.3f}".format(v) for v in rgb]
//    rgb = "[" + str(u) + ", new THREE.Color(" +  ", ".join(rgb) + ")],"
//    print(rgb)

Potree.Gradients = {
	RAINBOW: [
		[0, new THREE.Color(0.278, 0, 0.714)],
		[1/6, new THREE.Color(0, 0, 1)],
		[2/6, new THREE.Color(0, 1, 1)],
		[3/6, new THREE.Color(0, 1, 0)],
		[4/6, new THREE.Color(1, 1, 0)],
		[5/6, new THREE.Color(1, 0.64, 0)],
		[1, new THREE.Color(1, 0, 0)]
	],
	// From chroma spectral http://gka.github.io/chroma.js/
	SPECTRAL: [
		[0, new THREE.Color(0.3686, 0.3098, 0.6353)],
		[0.1, new THREE.Color(0.1961, 0.5333, 0.7412)],
		[0.2, new THREE.Color(0.4000, 0.7608, 0.6471)],
		[0.3, new THREE.Color(0.6706, 0.8667, 0.6431)],
		[0.4, new THREE.Color(0.9020, 0.9608, 0.5961)],
		[0.5, new THREE.Color(1.0000, 1.0000, 0.7490)],
		[0.6, new THREE.Color(0.9961, 0.8784, 0.5451)],
		[0.7, new THREE.Color(0.9922, 0.6824, 0.3804)],
		[0.8, new THREE.Color(0.9569, 0.4275, 0.2627)],
		[0.9, new THREE.Color(0.8353, 0.2431, 0.3098)],
		[1, new THREE.Color(0.6196, 0.0039, 0.2588)],
	],
	PLASMA: [
		[0.0, new THREE.Color(0.241, 0.015, 0.610)],
		[0.1, new THREE.Color(0.387, 0.001, 0.654)],
		[0.2, new THREE.Color(0.524, 0.025, 0.653)],
		[0.3, new THREE.Color(0.651, 0.125, 0.596)],
		[0.4, new THREE.Color(0.752, 0.227, 0.513)],
		[0.5, new THREE.Color(0.837, 0.329, 0.431)],
		[0.6, new THREE.Color(0.907, 0.435, 0.353)],
		[0.7, new THREE.Color(0.963, 0.554, 0.272)],
		[0.8, new THREE.Color(0.992, 0.681, 0.195)],
		[0.9, new THREE.Color(0.987, 0.822, 0.144)],
		[1.0, new THREE.Color(0.940, 0.975, 0.131)],
	],
	YELLOW_GREEN: [
		[0, new THREE.Color(0.1647, 0.2824, 0.3451)],
		[0.1, new THREE.Color(0.1338, 0.3555, 0.4227)],
		[0.2, new THREE.Color(0.0610, 0.4319, 0.4864)],
		[0.3, new THREE.Color(0.0000, 0.5099, 0.5319)],
		[0.4, new THREE.Color(0.0000, 0.5881, 0.5569)],
		[0.5, new THREE.Color(0.1370, 0.6650, 0.5614)],
		[0.6, new THREE.Color(0.2906, 0.7395, 0.5477)],
		[0.7, new THREE.Color(0.4453, 0.8099, 0.5201)],
		[0.8, new THREE.Color(0.6102, 0.8748, 0.4850)],
		[0.9, new THREE.Color(0.7883, 0.9323, 0.4514)],
		[1, new THREE.Color(0.9804, 0.9804, 0.4314)],
	],
	VIRIDIS: [
		[0.0, new THREE.Color(0.267, 0.005, 0.329)],
		[0.1, new THREE.Color(0.283, 0.141, 0.458)],
		[0.2, new THREE.Color(0.254, 0.265, 0.530)],
		[0.3, new THREE.Color(0.207, 0.372, 0.553)],
		[0.4, new THREE.Color(0.164, 0.471, 0.558)],
		[0.5, new THREE.Color(0.128, 0.567, 0.551)],
		[0.6, new THREE.Color(0.135, 0.659, 0.518)],
		[0.7, new THREE.Color(0.267, 0.749, 0.441)],
		[0.8, new THREE.Color(0.478, 0.821, 0.318)],
		[0.9, new THREE.Color(0.741, 0.873, 0.150)],
		[1.0, new THREE.Color(0.993, 0.906, 0.144)],
	],
	INFERNO: [
		[0.0, new THREE.Color(0.077, 0.042, 0.206)],
		[0.1, new THREE.Color(0.225, 0.036, 0.388)],
		[0.2, new THREE.Color(0.373, 0.074, 0.432)],
		[0.3, new THREE.Color(0.522, 0.128, 0.420)],
		[0.4, new THREE.Color(0.665, 0.182, 0.370)],
		[0.5, new THREE.Color(0.797, 0.255, 0.287)],
		[0.6, new THREE.Color(0.902, 0.364, 0.184)],
		[0.7, new THREE.Color(0.969, 0.516, 0.063)],
		[0.8, new THREE.Color(0.988, 0.683, 0.072)],
		[0.9, new THREE.Color(0.961, 0.859, 0.298)],
		[1.0, new THREE.Color(0.988, 0.998, 0.645)],
	],
	GRAYSCALE: [
		[0, new THREE.Color(0,0,0)],
		[1, new THREE.Color(1,1,1)]
	]
};

Potree.Classification = {
	"DEFAULT": {
		0: 			new THREE.Vector4(0.5, 0.5,0.5, 1.0),
		1: 			new THREE.Vector4(0.5, 0.5,0.5, 1.0),
		2: 			new THREE.Vector4(0.63, 0.32, 0.18, 1.0),
		3: 			new THREE.Vector4(0.0, 1.0, 0.0, 1.0),
		4: 			new THREE.Vector4(0.0, 0.8, 0.0, 1.0),
		5: 			new THREE.Vector4(0.0, 0.6, 0.0, 1.0),
		6: 			new THREE.Vector4(1.0, 0.66, 0.0, 1.0),
		7:			new THREE.Vector4(1.0, 0, 1.0, 1.0),
		8: 			new THREE.Vector4(1.0, 0, 0.0, 1.0),
		9: 			new THREE.Vector4(0.0, 0.0, 1.0, 1.0),
		12:			new THREE.Vector4(1.0, 1.0, 0.0, 1.0),
		"DEFAULT": 	new THREE.Vector4(0.3, 0.6, 0.6, 0.5)
	}
};



Potree.PointSizeType = {
	FIXED: 		0,
	ATTENUATED: 1,
	ADAPTIVE: 	2
};

Potree.PointShape = {
	SQUARE: 0,
	CIRCLE: 1,
	PARABOLOID: 2
};

Potree.PointColorType = {
	RGB: 				0,
	COLOR: 				1,
	DEPTH: 				2,
	HEIGHT: 			3,
	ELEVATION: 			3,
	INTENSITY: 			4,
	INTENSITY_GRADIENT:	5,
	LOD: 				6,
	LEVEL_OF_DETAIL: 	6,
	POINT_INDEX: 		7,
	CLASSIFICATION: 	8,
	RETURN_NUMBER: 		9,
	SOURCE: 			10,
	NORMAL: 			11,
	PHONG: 				12,
	RGB_HEIGHT: 		13,
	COMPOSITE: 			50
};

Potree.ClipMode = {
	DISABLED: 			0,
	CLIP_OUTSIDE: 		1,
	HIGHLIGHT_INSIDE:	2
};

Potree.TreeType = {
	OCTREE:				0,
	KDTREE:				1
};


Potree.PointCloudMaterial = class PointCloudMaterial extends THREE.RawShaderMaterial{
	
	constructor(parameters = {}){
		super();
		
		this.visibleNodesTexture = Potree.utils.generateDataTexture( 2048, 1, new THREE.Color( 0xffffff ) );
		this.visibleNodesTexture.minFilter = THREE.NearestFilter;
		this.visibleNodesTexture.magFilter = THREE.NearestFilter;
		
		let pointSize = parameters.size || 1.0;
		let minSize = parameters.minSize || 1.0;
		let maxSize = parameters.maxSize || 50.0;
		let treeType = parameters.treeType || Potree.TreeType.OCTREE;
		
		this._pointSizeType = Potree.PointSizeType.FIXED;
		this._shape = Potree.PointShape.SQUARE;
		this._pointColorType = Potree.PointColorType.RGB;
		this._useClipBox = false;
		this.numClipBoxes = 0;
		this._clipMode = Potree.ClipMode.DISABLED;
		this._weighted = false;
		this._depthMap = null;
		this._gradient = Potree.Gradients.SPECTRAL;
		this._classification = Potree.Classification.DEFAULT;
		this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
		this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
		this.lights = false;
		this.fog = false;
		this._treeType = treeType;
		this._useEDL = false;
		
		this.attributes = {
			position: 			{ type: "fv", value: [] },
			color: 				{ type: "fv", value: [] },
			normal: 			{ type: "fv", value: [] },
			intensity: 			{ type: "f", value: [] },
			classification: 	{ type: "f", value: [] },
			returnNumber: 		{ type: "f", value: [] },
			numberOfReturns: 	{ type: "f", value: [] },
			pointSourceID: 		{ type: "f", value: [] },
			indices: 			{ type: "fv", value: [] }
		};
		
		this.uniforms = {
			level:				{ type: "f", value: 0.0 },
			vnStart:				{ type: "f", value: 0.0 },
			spacing:			{ type: "f", value: 1.0 },
			blendHardness:		{ type: "f", value: 2.0 },
			blendDepthSupplement:	{ type: "f", value: 0.0 },
			fov:				{ type: "f", value: 1.0 },
			screenWidth:		{ type: "f", value: 1.0 },
			screenHeight:		{ type: "f", value: 1.0 },
			near:				{ type: "f", value: 0.1 },
			far:				{ type: "f", value: 1.0 },
			uColor:   			{ type: "c", value: new THREE.Color( 0xffffff ) },
			opacity:   			{ type: "f", value: 1.0 },
			size:   			{ type: "f", value: pointSize },
			minSize:   			{ type: "f", value: minSize },
			maxSize:   			{ type: "f", value: maxSize },
			octreeSize:			{ type: "f", value: 0 },
			bbSize:				{ type: "fv", value: [0,0,0] },
			heightMin:			{ type: "f", value: 0.0 },
			heightMax:			{ type: "f", value: 1.0 },
			clipBoxCount:		{ type: "f", value: 0 },
			visibleNodes:		{ type: "t", value: this.visibleNodesTexture },
			pcIndex:   			{ type: "f", value: 0 },
			gradient: 			{ type: "t", value: this.gradientTexture },
			classificationLUT: 	{ type: "t", value: this.classificationTexture },
			clipBoxes:			{ type: "Matrix4fv", value: [] },
			toModel:			{ type: "Matrix4f", value: [] },
			depthMap: 			{ type: "t", value: null },
			diffuse:			{ type: "fv", value: [1,1,1]},
			transition:         { type: "f", value: 0.5 },
			intensityRange:     { type: "fv", value: [0, 65000] },
			intensityGamma:     { type: "f", value: 1 },
			intensityContrast:	{ type: "f", value: 0 },
			intensityBrightness:{ type: "f", value: 0 },
			rgbGamma:     		{ type: "f", value: 1 },
			rgbContrast:		{ type: "f", value: 0 },
			rgbBrightness:		{ type: "f", value: 0 },
			wRGB:				{ type: "f", value: 1 },
			wIntensity:			{ type: "f", value: 0 },
			wElevation:			{ type: "f", value: 0 },
			wClassification:	{ type: "f", value: 0 },
			wReturnNumber:		{ type: "f", value: 0 },
			wSourceID:			{ type: "f", value: 0 },
		};
		
		this.defaultAttributeValues.normal = [0,0,0];
		this.defaultAttributeValues.classification = [0,0,0];
		this.defaultAttributeValues.indices = [0,0,0,0];
		
		this.vertexShader = this.getDefines() + Potree.Shaders["pointcloud.vs"];
		this.fragmentShader = this.getDefines() + Potree.Shaders["pointcloud.fs"];
		this.vertexColors = THREE.VertexColors;
	}
	
	updateShaderSource(){
		this.vertexShader = this.getDefines() + Potree.Shaders["pointcloud.vs"];
		this.fragmentShader = this.getDefines() + Potree.Shaders["pointcloud.fs"];
		
		if(this.depthMap){
			this.uniforms.depthMap.value = this.depthMap;
			//this.depthMap = depthMap;
			//this.setValues({
			//	depthMap: this.depthMap,
			//});
		}
		
		if(this.opacity === 1.0){
			this.blending = THREE.NoBlending;
			this.transparent = false;
			this.depthTest = true;
			this.depthWrite = true;
		}else if(this.opacity < 1.0 && !this.useEDL){
			this.blending = THREE.AdditiveBlending;
			this.transparent = true;
			this.depthTest = false;
			this.depthWrite = true;
			this.depthFunc = THREE.AlwaysDepth;
		}
			
		if(this.weighted){	
			this.blending = THREE.AdditiveBlending;
			this.transparent = true;
			this.depthTest = true;
			this.depthWrite = false;	
		}
			
		this.needsUpdate = true;
	}
	
	getDefines(){
		let defines = "";
	
		if(this.pointSizeType === Potree.PointSizeType.FIXED){
			defines += "#define fixed_point_size\n";
		}else if(this.pointSizeType === Potree.PointSizeType.ATTENUATED){
			defines += "#define attenuated_point_size\n";
		}else if(this.pointSizeType === Potree.PointSizeType.ADAPTIVE){
			defines += "#define adaptive_point_size\n";
		}
		
		if(this.shape === Potree.PointShape.SQUARE){
			defines += "#define square_point_shape\n";
		}else if(this.shape === Potree.PointShape.CIRCLE){
			defines += "#define circle_point_shape\n";
		}else if(this.shape === Potree.PointShape.PARABOLOID){
			defines += "#define paraboloid_point_shape\n";
		}
		
		if(this._useEDL){
			defines += "#define use_edl\n";
		}
		
		if(this._pointColorType === Potree.PointColorType.RGB){
			defines += "#define color_type_rgb\n";
		}else if(this._pointColorType === Potree.PointColorType.COLOR){
			defines += "#define color_type_color\n";
		}else if(this._pointColorType === Potree.PointColorType.DEPTH){
			defines += "#define color_type_depth\n";
		}else if(this._pointColorType === Potree.PointColorType.HEIGHT){
			defines += "#define color_type_height\n";
		}else if(this._pointColorType === Potree.PointColorType.INTENSITY){
			defines += "#define color_type_intensity\n";
		}else if(this._pointColorType === Potree.PointColorType.INTENSITY_GRADIENT){
			defines += "#define color_type_intensity_gradient\n";
		}else if(this._pointColorType === Potree.PointColorType.LOD){
			defines += "#define color_type_lod\n";
		}else if(this._pointColorType === Potree.PointColorType.POINT_INDEX){
			defines += "#define color_type_point_index\n";
		}else if(this._pointColorType === Potree.PointColorType.CLASSIFICATION){
			defines += "#define color_type_classification\n";
		}else if(this._pointColorType === Potree.PointColorType.RETURN_NUMBER){
			defines += "#define color_type_return_number\n";
		}else if(this._pointColorType === Potree.PointColorType.SOURCE){
			defines += "#define color_type_source\n";
		}else if(this._pointColorType === Potree.PointColorType.NORMAL){
			defines += "#define color_type_normal\n";
		}else if(this._pointColorType === Potree.PointColorType.PHONG){
			defines += "#define color_type_phong\n";
		}else if(this._pointColorType === Potree.PointColorType.RGB_HEIGHT){
			defines += "#define color_type_rgb_height\n";
		}else if(this._pointColorType === Potree.PointColorType.COMPOSITE){
			defines += "#define color_type_composite\n";
		}
		
		if(this.clipMode === Potree.ClipMode.DISABLED){
			defines += "#define clip_disabled\n";
		}else if(this.clipMode === Potree.ClipMode.CLIP_OUTSIDE){
			defines += "#define clip_outside\n";
		}else if(this.clipMode === Potree.ClipMode.HIGHLIGHT_INSIDE){
			defines += "#define clip_highlight_inside\n";
		}
		
		if(this._treeType === Potree.TreeType.OCTREE){
			defines += "#define tree_type_octree\n";
		}else if(this._treeType === Potree.TreeType.KDTREE){
			defines += "#define tree_type_kdtree\n";
		}
		
		if(this.weighted){
			defines += "#define weighted_splats\n";
		}
		
		if(this.numClipBoxes > 0){
			defines += "#define use_clip_box\n";
		}

		return defines;
	}

	
	setClipBoxes(clipBoxes){
		if(!clipBoxes){
			return;
		}

		this.clipBoxes = clipBoxes;
		let doUpdate = (this.numClipBoxes !== clipBoxes.length) && (clipBoxes.length === 0 || this.numClipBoxes === 0);

		this.numClipBoxes = clipBoxes.length;
		this.uniforms.clipBoxCount.value = this.numClipBoxes;
		
		if(doUpdate){
			this.updateShaderSource();
		}
		
		this.uniforms.clipBoxes.value = new Float32Array(this.numClipBoxes * 16);
		
		for(let i = 0; i < this.numClipBoxes; i++){
			let box = clipBoxes[i];
			
			this.uniforms.clipBoxes.value.set(box.inverse.elements, 16*i);
		}
		
		for(let i = 0; i < this.uniforms.clipBoxes.value.length; i++){
			if(Number.isNaN(this.uniforms.clipBoxes.value[i])){
				this.uniforms.clipBoxes.value[i] = Infinity;
			}
		}
	}
	
	get gradient(){
		return this._gradient;
	}
	
	set gradient(value){
		if(this._gradient !== value){
			this._gradient = value;
			this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
			this.uniforms.gradient.value = this.gradientTexture;
		}
	}
	
	

	get classification(){
		return this._classification;
	}
	
	set classification(value){
		
		let isEqual = Object.keys(value).length === Object.keys(this._classification).length;
		
		for(let key of Object.keys(value)){
			isEqual = isEqual && this._classification[key] !== undefined;
			isEqual = isEqual && value[key].equals(this._classification[key]);
		}
		
		
		if(!isEqual){
			recomputeClassification();
		}
	}
	
	recomputeClassification(){
		this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
		this.uniforms.classificationLUT.value = this.classificationTexture;
		
		this.dispatchEvent({
			type: "material_property_changed",
			target: this
		});
	}

	get spacing(){
		return this.uniforms.spacing.value;
	}
	
	set spacing(value){
		if(this.uniforms.spacing.value !== value){
			this.uniforms.spacing.value = value;
		}
	}

	
	
	get useClipBox(){
		return this._useClipBox;
	}
	
	set useClipBox(value){
		if(this._useClipBox !== value){
			this._useClipBox = value;
			this.updateShaderSource();
		}
	}


	get weighted(){
		return this._weighted;
	}
	
	set weighted(value){
		if(this._weighted !== value){
			this._weighted = value;
			this.updateShaderSource();
		}
	}

	
	get fov(){
		return this.uniforms.fov.value;
	}
	
	set fov(value){
		if(this.uniforms.fov.value !== value){
			this.uniforms.fov.value = value;
			//this.updateShaderSource();
		}
	}

	get screenWidth(){
		return this.uniforms.screenWidth.value;
	}
	
	set screenWidth(value){
		if(this.uniforms.screenWidth.value !== value){
			this.uniforms.screenWidth.value = value;
			//this.updateShaderSource();
		}
	}


	get screenHeight(){
		return this.uniforms.screenHeight.value;
	}
	
	set screenHeight(value){
		if(this.uniforms.screenHeight.value !== value){
			this.uniforms.screenHeight.value = value;
			//this.updateShaderSource();
		}
	}


	get near(){
		return this.uniforms.near.value;
	}
	
	set near(value){
		if(this.uniforms.near.value !== value){
			this.uniforms.near.value = value;
		}
	}


	get far(){
		return this.uniforms.far.value;
	}
	
	set far(value){
		if(this.uniforms.far.value !== value){
			this.uniforms.far.value = value;
		}
	}


	get opacity(){
		return this.uniforms.opacity.value;
	}
	
	set opacity(value){
		if(this.uniforms && this.uniforms.opacity){
			if(this.uniforms.opacity.value !== value){
				this.uniforms.opacity.value = value;
				this.updateShaderSource();
				this.dispatchEvent({
					type: "opacity_changed",
					target: this
				});
				this.dispatchEvent({
					type: "material_property_changed",
					target: this
				});
			}
		}
	}


	get pointColorType(){
		return this._pointColorType;
	}
	
	set pointColorType(value){
		if(this._pointColorType !== value){
			this._pointColorType = value;
			this.updateShaderSource();
			this.dispatchEvent({
				type: "point_color_type_changed",
				target: this
			});
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get depthMap(){
		return this._depthMap;
	}
	
	set depthMap(value){
		if(this._depthMap !== value){
			this._depthMap = value;
			this.updateShaderSource();
		}
	}

	
	get pointSizeType(){
		return this._pointSizeType;
	}
	
	set pointSizeType(value){
		if(this._pointSizeType !== value){
			this._pointSizeType = value;
			this.updateShaderSource();
			this.dispatchEvent({
				type: "point_size_type_changed",
				target: this
			});
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get clipMode(){
		return this._clipMode;
	}
	
	set clipMode(value){
		if(this._clipMode !== value){
			this._clipMode = value;
			this.updateShaderSource();
		}
	}


	get useEDL(){
		return this._useEDL;
	}
	
	set useEDL(value){
		if(this._useEDL !== value){
			this._useEDL = value;
			this.updateShaderSource();
		}
	}


	get color(){
		return this.uniforms.uColor.value;
	}
	
	set color(value){
		if(!this.uniforms.uColor.value.equals(value)){
			this.uniforms.uColor.value.copy(value);
			
			this.dispatchEvent({
				type: "color_changed",
				target: this
			});
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get shape(){
		return this._shape;
	}
	
	set shape(value){
		if(this._shape !== value){
			this._shape = value;
			this.updateShaderSource();
			this.dispatchEvent({type: "point_shape_changed", target: this});
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}



	get treeType(){
		return this._treeType;
	}
	
	set treeType(value){
		if(this._treeType !== value){
			this._treeType = value;
			this.updateShaderSource();
		}
	}


	get bbSize(){
		return this.uniforms.bbSize.value;
	}
	
	set bbSize(value){
		this.uniforms.bbSize.value = value;
	}


	get size(){
		return this.uniforms.size.value;
	}
	
	set size(value){
		if(this.uniforms.size.value !== value){
			this.uniforms.size.value = value;
			
			this.dispatchEvent({
				type: "point_size_changed",
				target: this
			});
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}

	get heightMin(){
		return this.uniforms.heightMin.value;
	}
	
	set heightMin(value){
		if(this.uniforms.heightMin.value !== value){
			this.uniforms.heightMin.value = value;
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get heightMax(){
		return this.uniforms.heightMax.value;
	}
	
	set heightMax(value){
		if(this.uniforms.heightMax.value !== value){
			this.uniforms.heightMax.value = value;
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get transition(){
		return this.uniforms.transition.value;
	}
	
	set transition(value){
		this.uniforms.transition.value = value;
	}


	get intensityRange(){
		return this.uniforms.intensityRange.value;
	}
	
	set intensityRange(value){
		
		if(!(value instanceof Array && value.length === 2)){
			return;
		}
		
		if(value[0] === this.uniforms.intensityRange.value[0] &&
			value[1] === this.uniforms.intensityRange.value[1]){
			
			return;
		}
		
		this.uniforms.intensityRange.value = value;
		
		this.dispatchEvent({
			type: "material_property_changed",
			target: this
		});
	}


	get intensityGamma(){
		return this.uniforms.intensityGamma.value;
	}
	
	set intensityGamma(value){
		if(this.uniforms.intensityGamma.value !== value){
			this.uniforms.intensityGamma.value = value;
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get intensityContrast(){
		return this.uniforms.intensityContrast.value;
	}
	
	set intensityContrast(value){
		if(this.uniforms.intensityContrast.value !== value){
			this.uniforms.intensityContrast.value = value;
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get intensityBrightness(){
		return this.uniforms.intensityBrightness.value;
	}
	
	set intensityBrightness(value){
		if(this.uniforms.intensityBrightness.value !== value){
			this.uniforms.intensityBrightness.value = value;
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get rgbGamma(){
		return this.uniforms.rgbGamma.value;
	}
	
	set rgbGamma(value){
		if(this.uniforms.rgbGamma.value !== value){
			this.uniforms.rgbGamma.value = value;
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get rgbContrast(){
		return this.uniforms.rgbContrast.value;
	}
	
	set rgbContrast(value){
		if(this.uniforms.rgbContrast.value !== value){
			this.uniforms.rgbContrast.value = value;
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get rgbBrightness(){
		return this.uniforms.rgbBrightness.value;
	}
	
	set rgbBrightness(value){
		if(this.uniforms.rgbBrightness.value !== value){
			this.uniforms.rgbBrightness.value = value;
			this.dispatchEvent({
				type: "material_property_changed",
				target: this
			});
		}
	}


	get weightRGB(){
		return this.uniforms.wRGB.value;
	}
	
	set weightRGB(value){
		this.uniforms.wRGB.value = value;
	}


	get weightIntensity(){
		return this.uniforms.wIntensity.value;
	}
	
	set weightIntensity(value){
		this.uniforms.wIntensity.value = value;
	}


	get weightElevation(){
		return this.uniforms.wElevation.value;
	}
	
	set weightElevation(value){
		this.uniforms.wElevation.value = value;
	}


	get weightClassification(){
		return this.uniforms.wClassification.value;
	}
	
	set weightClassification(value){
		this.uniforms.wClassification.value = value;
	}


	get weightReturnNumber(){
		return this.uniforms.wReturnNumber.value;
	}
	
	set weightReturnNumber(value){
		this.uniforms.wReturnNumber.value = value;
	}


	get weightSourceID(){
		return this.uniforms.wSourceID.value;
	}
	
	set weightSourceID(value){
		this.uniforms.wSourceID.value = value;
	}



	static generateGradientTexture(gradient){
		let size = 64;

		// create canvas
		let canvas = document.createElement( 'canvas' );
		canvas.width = size;
		canvas.height = size;

		// get context
		let context = canvas.getContext( '2d' );

		// draw gradient
		context.rect( 0, 0, size, size );
		let ctxGradient = context.createLinearGradient( 0, 0, size, size );
		
		for(let i = 0;i < gradient.length; i++){
			let step = gradient[i];
			
			ctxGradient.addColorStop(step[0], "#" + step[1].getHexString());
		} 
		
		context.fillStyle = ctxGradient;
		context.fill();
		
		let texture = new THREE.Texture( canvas );
		texture.needsUpdate = true;
		//textureImage = texture.image;

		return texture;
	}
	
	static generateClassificationTexture(classification){
		let width = 256;
		let height = 256;
		let size = width*height;
		
		let data = new Uint8Array(4*size);
		
		for(let x = 0; x < width; x++){
			for(let y = 0; y < height; y++){
				
				let i = x + width*y;
				
				let color;
				if(classification[x]){
					color = classification[x];
				}else if(classification[x % 32]){
					color = classification[x % 32];
				}else{
					color = classification.DEFAULT;
				}
				
				
				data[4*i+0] = 255 * color.x;
				data[4*i+1] = 255 * color.y;
				data[4*i+2] = 255 * color.z;
				data[4*i+3] = 255 * color.w;
			}
		}
		
		let texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
		texture.magFilter = THREE.NearestFilter;
		texture.needsUpdate = true;
		
		return texture;
	}
};


//
// Algorithm by Christian Boucheny
// shader code taken and adapted from CloudCompare
//
// see
// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL
// http://www.kitware.com/source/home/post/9
// https://tel.archives-ouvertes.fr/tel-00438464/document p. 115+ (french)




Potree.EyeDomeLightingMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};
	
	this._neighbourCount = 4;
	this.neighbours = new Float32Array(this.neighbourCount*2);
	for(var c = 0; c < this.neighbourCount; c++){
		this.neighbours[2*c+0] = Math.cos(2 * c * Math.PI / this.neighbourCount);
		this.neighbours[2*c+1] = Math.sin(2 * c * Math.PI / this.neighbourCount);
	}
	
	//var lightDir = new THREE.Vector3(0.0, 0.0, 1.0).normalize();
	
	var uniforms = {
		screenWidth: 	{ type: "f", 	value: 0 },
		screenHeight: 	{ type: "f", 	value: 0 },
		edlStrength: 		{ type: "f", 	value: 1.0 },
		radius: 		{ type: "f", 	value: 1.0 },
		neighbours:		{ type: "2fv", 	value: this.neighbours },
		depthMap: 		{ type: "t", 	value: null },
		colorMap: 		{ type: "t", 	value: null },
		opacity:		{ type: "f",	value: 1.0}
	};
	
	this.setValues({
		uniforms: uniforms,
		vertexShader: this.getDefines() + Potree.Shaders["edl.vs"],
		fragmentShader: this.getDefines() + Potree.Shaders["edl.fs"],
		lights: false
	});
	
};


Potree.EyeDomeLightingMaterial.prototype = new THREE.ShaderMaterial();


Potree.EyeDomeLightingMaterial.prototype.getDefines = function(){
	var defines = "";
	
	defines += "#define NEIGHBOUR_COUNT " + this.neighbourCount + "\n";

	return defines;
};

Potree.EyeDomeLightingMaterial.prototype.updateShaderSource = function(){
	var attributes = {};
	
	let PC = Potree.PointColorType;
	
	if([PC.INTENSITY, PC.INTENSITY_GRADIENT].includes(this.pointColorType)){
		attributes.intensity = { type: "f", value: [] };
	}else if(this.pointColorType === PC.CLASSIFICATION){
		//attributes.classification = { type: "f", value: [] };
	}else if(this.pointColorType === PC.RETURN_NUMBER){
		attributes.returnNumber = { type: "f", value: [] };
		attributes.numberOfReturns = { type: "f", value: [] };
	}else if(this.pointColorType === PC.SOURCE){
		attributes.pointSourceID = { type: "f", value: [] };
	}else if(this.pointColorType === PC.NORMAL || this.pointColorType === Potree.PointColorType.PHONG){
		attributes.normal = { type: "f", value: [] };
	}
	attributes.classification = { type: "f", value: 0 };
	
	var vs = this.getDefines() + Potree.Shaders["edl.vs"];
	var fs = this.getDefines() + Potree.Shaders["edl.fs"];

	this.setValues({
		vertexShader: vs,
		fragmentShader: fs
	});
	
	this.uniforms.neighbours.value = this.neighbours;
		
	this.needsUpdate = true;
};

Object.defineProperty(Potree.EyeDomeLightingMaterial.prototype, "neighbourCount", {
	get: function(){
		return this._neighbourCount;
	},
	set: function(value){
		if(this._neighbourCount !== value){
			this._neighbourCount = value;
			this.neighbours = new Float32Array(this._neighbourCount*2);
			for(var c = 0; c < this._neighbourCount; c++){
				this.neighbours[2*c+0] = Math.cos(2 * c * Math.PI / this._neighbourCount);
				this.neighbours[2*c+1] = Math.sin(2 * c * Math.PI / this._neighbourCount);
			}
			
			this.updateShaderSource();
		}
	}
});










// see http://john-chapman-graphics.blogspot.co.at/2013/01/ssao-tutorial.html



Potree.BlurMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};
	
	var uniforms = {
		near: 			{ type: "f", value: 0 },
		far: 			{ type: "f", value: 0 },
		screenWidth: 	{ type: "f", value: 0 },
		screenHeight: 	{ type: "f", value: 0 },
		map: 			{ type: "t", value: null }
	};
	
	this.setValues({
		uniforms: uniforms,
		vertexShader: Potree.Shaders["blur.vs"],
		fragmentShader: Potree.Shaders["blur.fs"],
	});
	
};


Potree.BlurMaterial.prototype = new THREE.ShaderMaterial();










/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 */ 
Potree.InputHandler = class InputHandler extends THREE.EventDispatcher{
	
	constructor(viewer){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		this.domElement = this.renderer.domElement;
		
		this.scene = null;
		this.interactiveScenes = [];
		this.inputListeners = [];
		
		this.drag = null;
		this.mouse = new THREE.Vector2(0, 0);
		
		this.selection = [];
		
		this.hoveredElements = [];
		this.pressedKeys = {};
		
		this.wheelDelta = 0;
		
		this.speed = 1;
		
		this.logMessages = false;
		
		if(this.domElement.tabIndex === -1){
			this.domElement.tabIndex = 2222;
		}
		
		this.domElement.addEventListener("contextmenu", (event) => { event.preventDefault(); }, false );
		this.domElement.addEventListener("click", this.onMouseClick.bind(this), false);
		this.domElement.addEventListener("mousedown", this.onMouseDown.bind(this), false);
		this.domElement.addEventListener("mouseup", this.onMouseUp.bind(this), false);
		this.domElement.addEventListener("mousemove", this.onMouseMove.bind(this), false);
		this.domElement.addEventListener("mousewheel", this.onMouseWheel.bind(this), false );
		this.domElement.addEventListener("DOMMouseScroll", this.onMouseWheel.bind(this), false ); // Firefox
		this.domElement.addEventListener("dblclick", this.onDoubleClick.bind(this));
		this.domElement.addEventListener("keydown", this.onKeyDown.bind(this));
		this.domElement.addEventListener("keyup", this.onKeyUp.bind(this));
		this.domElement.addEventListener("touchstart", this.onTouchStart.bind(this));
		this.domElement.addEventListener("touchend", this.onTouchEnd.bind(this));
		this.domElement.addEventListener("touchmove", this.onTouchMove.bind(this));
	}
	
	addInputListener(listener){
		this.inputListeners.push(listener);
	}
	
	removeInputListener(listener){
		this.inputListeners = this.inputListeners.filter(e => e !== listener);
	}
	
	onTouchStart(e){
		if(this.logMessages) console.log(this.constructor.name + ": onTouchStart");
		
		e.preventDefault();

		if(e.touches.length === 1){
			let rect = this.domElement.getBoundingClientRect();
			let x = e.touches[0].pageX - rect.left;
			let y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);
			
			this.startDragging(null);
		}
		
		for(let inputListener of this.inputListeners){
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}
	}
	
	onTouchEnd(e){
		if(this.logMessages) console.log(this.constructor.name + ": onTouchEnd");
		
		e.preventDefault();
		
		for(let inputListener of this.inputListeners){
			inputListener.dispatchEvent({
				type: "drop",
				drag: this.drag,
				viewer: this.viewer
			});
		}
		
		this.drag = null;
		
		for(let inputListener of this.inputListeners){
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}
	}
	
	onTouchMove(e){
		if(this.logMessages) console.log(this.constructor.name + ": onTouchMove");
		
		e.preventDefault();
		
		if(e.touches.length === 1){
			let rect = this.domElement.getBoundingClientRect();
			let x = e.touches[0].pageX - rect.left;
			let y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);
			
			if(this.drag){
				this.drag.mouse = 1;
				
				this.drag.lastDrag.x = x - this.drag.end.x;
				this.drag.lastDrag.y = y - this.drag.end.y;
				
				this.drag.end.set(x, y);
				
				if(this.logMessages) console.log(this.constructor.name + ": drag: ");
				for(let inputListener of this.inputListeners){
					inputListener.dispatchEvent({
						type: "drag",
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}
		}
		
		for(let inputListener of this.inputListeners){
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}
		
		// DEBUG CODE
		//let debugTouches = [...e.touches, {
		//	pageX: this.domElement.clientWidth / 2, 
		//	pageY: this.domElement.clientHeight / 2}];
		//for(let inputListener of this.inputListeners){
		//	inputListener.dispatchEvent({
		//		type: e.type,
		//		touches: debugTouches,
		//		changedTouches: e.changedTouches
		//	});
		//}
	}
	
	onKeyDown(e){
		if(this.logMessages) console.log(this.constructor.name + ": onKeyDown");
		
		if(e.keyCode === 46 && this.selection.length > 0){
			// DELETE
			this.dispatchEvent({
				type: "delete",
				selection: this.selection
			});
			
			this.deselectAll();
		}
		
		this.dispatchEvent({
			type: "keydown",
			keyCode: e.keyCode,
			event: e
		});
		
		//for(let l of this.inputListeners){
		//	l.dispatchEvent({
		//		type: "keydown",
		//		keyCode: e.keyCode,
		//		event: e
		//	});
		//}
		
		this.pressedKeys[e.keyCode] = true;
		
		//e.preventDefault();
	}
	
	onKeyUp(e){
		if(this.logMessages) console.log(this.constructor.name + ": onKeyUp");
		
		delete this.pressedKeys[e.keyCode];
		
		e.preventDefault();
	}
	
	onDoubleClick(e){
		if(this.logMessages) console.log(this.constructor.name + ": onDoubleClick");
		
		
		let consumed = false;
		for(let hovered of this.hoveredElements){
			if(hovered._listeners && hovered._listeners["dblclick"]){
				hovered.object.dispatchEvent({
					type: "dblclick",
					mouse: this.mouse,
					object: hovered.object
				});
				consumed = true;
				break;
			}
		}
		
		if(!consumed){
			for(let inputListener of this.inputListeners){
				inputListener.dispatchEvent({
					type: "dblclick",
					mouse: this.mouse,
					object: null
				});
			}
		}
		
		e.preventDefault();
	}
	
	onMouseClick(e){
		if(this.logMessages) console.log(this.constructor.name + ": onMouseClick");
		
		e.preventDefault();
	}
	
	onMouseDown(e){
		if(this.logMessages) console.log(this.constructor.name + ": onMouseDown");
		
		e.preventDefault();
		
		if(this.hoveredElements.length === 0){
			for(let inputListener of this.inputListeners){
				inputListener.dispatchEvent({
					type: "mousedown",
					viewer: this.viewer,
					mouse: this.mouse
				});
			}
		}
		
		if(!this.drag){
			let target = this.hoveredElements
				.find(el => (
					el.object._listeners 
					&& el.object._listeners["drag"]
					&& el.object._listeners["drag"].length > 0));
			
			if(target){
				this.startDragging(target.object, {location: target.point});
			}else{
				this.startDragging(null);
			}
		}
		
		if(this.scene){
			this.viewStart = this.scene.view.clone();
		}
	}
	
	onMouseUp(e){
		if(this.logMessages) console.log(this.constructor.name + ": onMouseUp");
		
		e.preventDefault();
		
		let noMovement = this.getNormalizedDrag().length() === 0; 
		
		if(e.button === THREE.MOUSE.LEFT){
			if(noMovement){
				
				let selectable = this.hoveredElements
					.find(el => el.object._listeners && el.object._listeners["select"]);
				
				if(selectable){
					selectable = selectable.object;
					
					if(this.isSelected(selectable)){
						this.selection
							.filter(e => e !== selectable)
							.forEach(e => this.toggleSelection(e));
					}else{
						this.deselectAll();
						this.toggleSelection(selectable);
					}
				}else{
					this.deselectAll();
				}
			}
		}else if((e.button === THREE.MOUSE.RIGHT) && noMovement){
			this.deselectAll();
		}
		
		if(this.hoveredElements.length === 0){
			for(let inputListener of this.inputListeners){
				inputListener.dispatchEvent({
					type: "mouseup",
					viewer: this.viewer,
					mouse: this.mouse
				});
			}
		}
		
		if(this.drag){
			if(this.drag.object){
				this.drag.object.dispatchEvent({
					type: "drop",
					drag: this.drag,
					viewer: this.viewer
						
				});
			}else{
				if(this.logMessages) console.log(this.constructor.name + ": drop: ");
				for(let inputListener of this.inputListeners){
					inputListener.dispatchEvent({
						type: "drop",
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}
			
			this.drag = null;
		}
	 }
	 
	onMouseMove(e){
		if(this.logMessages) console.log(this.constructor.name + ": onMouseMove");
		
		e.preventDefault();
		
		let rect = this.domElement.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		this.mouse.set(x, y);
		
		if(this.drag){
			this.drag.mouse = e.buttons;
			
			this.drag.lastDrag.x = x - this.drag.end.x;
			this.drag.lastDrag.y = y - this.drag.end.y;
			
			this.drag.end.set(x, y);
			
			if(this.drag.object){
				if(this.logMessages) console.log(this.constructor.name + ": drag: " + this.drag.object.name);
				this.drag.object.dispatchEvent({
					type: "drag",
					drag: this.drag,
					viewer: this.viewer
				});
			}else{
				if(this.logMessages) console.log(this.constructor.name + ": drag: ");
				for(let inputListener of this.inputListeners){
					inputListener.dispatchEvent({
						type: "drag",
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}
		}
		
		let hoveredElements = this.getHoveredElements();
		let currentlyHoveredObjects = hoveredElements.map(e => e.object);
		let previouslyHoveredObjects = this.hoveredElements.map(e => e.object);
		
		let now = currentlyHoveredObjects.find(e => (e._listeners && e._listeners["mouseover"]));
		let prev = previouslyHoveredObjects.find(e => (e._listeners && e._listeners["mouseover"]));
		
		if(now !== prev){
			if(now){
				now.dispatchEvent({
					type: "mouseover",
					object: now
				});
			}
			
			if(prev){
				prev.dispatchEvent({
					type: "mouseleave",
					object: prev
				});
			}
		}
		
		//let justHovered = currentlyHoveredObjects
		//	.filter(e => previouslyHoveredObjects.indexOf(e) === -1);
		//let justUnhovered = previouslyHoveredObjects
		//	.filter(e => currentlyHoveredObjects.indexOf(e) === -1);
		//	
		//justHovered = justHovered.find(e => (e._listeners && e._listeners["mouseover"]));
		//justUnhovered = justUnhovered.find(e => (e._listeners && e._listeners["mouseover"]));
		
		
		
		//let over = justHovered.find(e => (e._listeners && e._listeners["mouseover"]));
		//if(over){
		//	over.dispatchEvent({
		//		type: "mouseover",
		//		object: over
		//	});
		//}
		//
		//let leave = justUnhovered.find(e => (e._listeners && e._listeners["mouseleave"]));
		//if(leave){
		//	leave.dispatchEvent({
		//		type: "mouseleave",
		//		object: leave
		//	});
		//}
	
		this.hoveredElements = hoveredElements;
	}
	
	onMouseWheel(e){
		if(this.logMessages) console.log(this.constructor.name + ": onMouseWheel");
		
		e.preventDefault();
		
		let delta = 0;
		if( e.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9
			delta = e.wheelDelta;
		} else if ( e.detail !== undefined ) { // Firefox
			delta = -e.detail;
		}
		
		let ndelta = Math.sign(delta);
		
		//this.wheelDelta += Math.sign(delta);
		
		if(this.hoveredElement){
			this.hoveredElement.object.dispatchEvent({
				type: "mousewheel",
				delta: ndelta,
				object: this.hoveredElement.object
			});
		}else{
			for(let inputListener of this.inputListeners){
				inputListener.dispatchEvent({
					type: "mousewheel",
					delta: ndelta,
					object: null
				});
			}
		}
	}
	
	startDragging(object, args = null){
		this.drag = {
			start: this.mouse.clone(),
			end: this.mouse.clone(),
			lastDrag: new THREE.Vector2(0, 0),
			startView: this.scene.view.clone(),
			object: object
		};
		
		if(args){
			for(let key of Object.keys(args)){
				this.drag[key] = args[key];
			}
		}
	}
	
	getMousePointCloudIntersection(mouse){
		return Potree.utils.getMousePointCloudIntersection(
			this.mouse, 
			this.scene.camera, 
			this.renderer, 
			this.scene.pointclouds);
	}
	
	toggleSelection(object){
		
		let oldSelection = this.selection;
		
		let index = this.selection.indexOf(object);
		
		if(index === -1){
			this.selection.push(object);
			object.dispatchEvent({
				type: "select"
			});
		}else{
			this.selection.splice(index, 1);
			object.dispatchEvent({
				type: "deselect"
			});
		}
		
		this.dispatchEvent({
			type: "selection_changed",
			oldSelection: oldSelection,
			selection: this.selection
		});
	}
	
	deselectAll(){
		for(let object of this.selection){
			object.dispatchEvent({
				type: "deselect"
			});
		}
		
		let oldSelection = this.selection;
		
		if(this.selection.length > 0){
			this.selection = [];
			this.dispatchEvent({
				type: "selection_changed",
				oldSelection: oldSelection,
				selection: this.selection
			});
		}
		
		
	}
	
	isSelected(object){
		let index = this.selection.indexOf(object);
		
		return index !== -1;
	}
	
	registerInteractiveScene(scene){
		let index = this.interactiveScenes.indexOf(scene);
		if(index === -1){
			this.interactiveScenes.push(scene);
		}
	}
	
	unregisterInteractiveScene(scene){
		let index = this.interactiveScenes.indexOf(scene);
		if (index > -1) {
			this.interactiveScenes.splice(index, 1);
		}
	}
	
	getHoveredElement(){
		let hoveredElements = this.getHoveredElements();
		if(hoveredElements.length > 0){
			return hoveredElements[0];
		}else{
			return null;
		}
	}
	
	getHoveredElements(){
		
		let scenes = this.interactiveScenes.concat(this.scene.scene);
	
		let interactableListeners = ["mouseover", "mouseleave", "drag", "drop", "click", "select", "deselect"];
		let interactables = [];
		for(let scene of scenes){
			scene.traverseVisible(node => {
				if(node._listeners && node.visible){
					let hasInteractableListener = interactableListeners.filter((e) => {
						return node._listeners[e] !== undefined
					}).length > 0;
					
					if(hasInteractableListener){
						interactables.push(node);
					}
				}
			});
		}
		
		let nmouse =  {
			x: (this.mouse.x / this.domElement.clientWidth ) * 2 - 1,
			y: - (this.mouse.y / this.domElement.clientHeight ) * 2 + 1
		};
		
		let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
		vector.unproject(this.scene.camera);
		
		let raycaster = new THREE.Raycaster();
		raycaster.ray.set( this.scene.camera.position, vector.sub( this.scene.camera.position ).normalize() );
		raycaster.linePrecision = 0.2;
		
		let intersections = raycaster.intersectObjects(interactables, false);
		
		return intersections;
		
		//if(intersections.length > 0){
		//	return intersections[0];
		//}else{
		//	return null;
		//}
	}
	
	setScene(scene){
		this.deselectAll();
		
		this.scene = scene;
	}
	
	update(delta){
		
	}

	getNormalizedDrag(){
		if(!this.drag){
			return new THREE.Vector2(0, 0);
		}
		
		let diff = new THREE.Vector2().subVectors(this.drag.end, this.drag.start);

		diff.x = diff.x / this.domElement.clientWidth;
		diff.y = diff.y / this.domElement.clientHeight;
		
		return diff;
	}
	
	getNormalizedLastDrag(){
		if(!this.drag){
			return new THREE.Vector2(0, 0);
		}
		
		let lastDrag = this.drag.lastDrag.clone();
		
		lastDrag.x = lastDrag.x / this.domElement.clientWidth;
		lastDrag.y = lastDrag.y / this.domElement.clientHeight;
		
		return lastDrag;
	}
	
};
/**
 * @author mschuetz / http://mschuetz.at
 *
 * adapted from THREE.OrbitControls by 
 *
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 *
 *
 */
 
Potree.FirstPersonControls = class FirstPersonControls extends THREE.EventDispatcher{
	
	constructor(viewer){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.scene = null;
		this.sceneControls = new THREE.Scene();
		
		this.rotationSpeed = 200;
		this.moveSpeed = 10;
		
		this.keys = {
			FORWARD:   ['W'.charCodeAt(0), 38],
			BACKWARD:  ['S'.charCodeAt(0), 40],
			LEFT:      ['A'.charCodeAt(0), 37],
			RIGHT:     ['D'.charCodeAt(0), 39],
			UP:        ['R'.charCodeAt(0), 33],
			DOWN:      ['F'.charCodeAt(0), 34]
		};
		
		this.fadeFactor = 50;
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.translationDelta = new THREE.Vector3(0, 0, 0);
		this.translationWorldDelta = new THREE.Vector3(0, 0, 0);
		
		this.tweens = [];
		
		let drag = (e) => {
			if(e.drag.object !== null){
				return;
			}
			
			if(e.drag.startHandled === undefined){
				e.drag.startHandled = true;
				
				this.dispatchEvent({type: "start"});
			}
			
			let moveSpeed = this.viewer.getMoveSpeed();
			
			let ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
			};
			
			if(e.drag.mouse === Potree.MOUSE.LEFT){
				this.yawDelta += ndrag.x * this.rotationSpeed;
				this.pitchDelta += ndrag.y * this.rotationSpeed;
			}else if(e.drag.mouse === Potree.MOUSE.RIGHT){
				this.translationDelta.x -= ndrag.x * moveSpeed * 100;
				this.translationDelta.z += ndrag.y * moveSpeed * 100;
			}
		};
		
		let drop = e => {
			this.dispatchEvent({type: "end"});
		};
		
		let scroll = (e) => {
			let speed = this.viewer.getMoveSpeed();
			
			if(e.delta < 0){
				speed = speed * 0.9;
			}else if(e.delta > 0){
				speed = speed / 0.9;
			}
			
			speed = Math.max(speed, 0.1);
			
			this.viewer.setMoveSpeed(speed);
		};
		
		let dblclick = (e) => {
			this.zoomToLocation(e.mouse);
		};
		
		this.addEventListener("drag", drag);
		this.addEventListener("drop", drop);
		this.addEventListener("mousewheel", scroll);
		this.addEventListener("dblclick", dblclick);
	}
	
	setScene(scene){
		this.scene = scene;
	}
	
	zoomToLocation(mouse){
		let camera = this.scene.camera;
		
		let I = Potree.utils.getMousePointCloudIntersection(
			mouse, 
			camera, 
			this.renderer, 
			this.scene.pointclouds);
			
		if(I === null){
			return;
		}
		
		let nmouse =  {
			x: +( mouse.x / this.renderer.domElement.clientWidth )  * 2 - 1,
			y: -( mouse.y / this.renderer.domElement.clientHeight ) * 2 + 1
		};
		
		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;
			
			let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
			vector.unproject(camera);
			
			let direction = vector.sub(camera.position).normalize();
			let ray = new THREE.Ray(camera.position, direction);
			
			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere().radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}
		
		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		let controlsTargetPosition = I.location;
		
		var animationDuration = 600;
		var easing = TWEEN.Easing.Quartic.Out;
		
		{ // animate 
		
			let value = {x: 0};
			let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);
			
			let startPos = this.scene.view.position.clone();
			let targetPos = cameraTargetPosition.clone();
			let startRadius = this.scene.view.radius;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);
			
			tween.onUpdate( () => {
				let t = value.x;
				this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;
				
				this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
				this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
			});
			
			tween.onComplete( () => {
				this.tweens = this.tweens.filter( e => e !== tween);
			});
			
			tween.start();
		}

	}
	
	update(delta){
		let view = this.scene.view;
		
		{ // cancel move animations on user input
			let changes = [ this.yawDelta, 
				this.pitchDelta, 
				this.translationDelta.length(),
				this.translationWorldDelta.length() ];
			let changeHappens = changes.some( e => Math.abs(e) > 0.001);
			if(changeHappens && this.tweens.length > 0){
				this.tweens.forEach( e => e.stop() );
				this.tweens = [];
			}	
		}
		
		{ // accelerate while input is given
			let ih = this.viewer.inputHandler;
			
			let moveForward = this.keys.FORWARD.some(e => ih.pressedKeys[e]);
			let moveBackward = this.keys.BACKWARD.some(e => ih.pressedKeys[e]);
			let moveLeft = this.keys.LEFT.some(e => ih.pressedKeys[e]);
			let moveRight = this.keys.RIGHT.some(e => ih.pressedKeys[e]);
			let moveUp = this.keys.UP.some(e => ih.pressedKeys[e]);
			let moveDown = this.keys.DOWN.some(e => ih.pressedKeys[e]);
			
			if(moveForward && moveBackward){
				this.translationDelta.y = 0;
			}else if(moveForward){
				this.translationDelta.y = this.viewer.getMoveSpeed();
			}else if(moveBackward){
				this.translationDelta.y = -this.viewer.getMoveSpeed();
			}
			
			if(moveLeft && moveRight){
				this.translationDelta.x = 0;
			}else if(moveLeft){
				this.translationDelta.x = -this.viewer.getMoveSpeed();
			}else if(moveRight){
				this.translationDelta.x = this.viewer.getMoveSpeed();
			}
			
			if(moveUp && moveDown){
				this.translationWorldDelta.z = 0;
			}else if(moveUp){
				this.translationWorldDelta.z = this.viewer.getMoveSpeed();
			}else if(moveDown){
				this.translationWorldDelta.z = -this.viewer.getMoveSpeed();
			}
			
		}
		
		{ // apply rotation
			let yaw = view.yaw;
			let pitch = view.pitch;
			
			yaw -= this.yawDelta * delta;
			pitch -= this.pitchDelta * delta;
			
			view.yaw = yaw;
			view.pitch = pitch;
		}
		
		{ // apply translation
			view.translate(
				this.translationDelta.x * delta,
				this.translationDelta.y * delta,
				this.translationDelta.z * delta
			);
			
			view.translateWorld(
				this.translationWorldDelta.x * delta,
				this.translationWorldDelta.y * delta,
				this.translationWorldDelta.z * delta
			);
		}
		
		{ // set view target according to speed
			view.radius = 3 * this.viewer.getMoveSpeed();
		}
		
		{// decelerate over time
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.translationDelta.multiplyScalar(attenuation);
			this.translationWorldDelta.multiplyScalar(attenuation);
		}
		
	}

	
	
};







/**
 * @author mschuetz / http://mschuetz.at
 *
 * adapted from THREE.OrbitControls by 
 *
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 * This set of controls performs first person navigation without mouse lock.
 * Instead, rotating the camera is done by dragging with the left mouse button.
 *
 * move: a/s/d/w or up/down/left/right
 * rotate: left mouse
 * pan: right mouse
 * change speed: mouse wheel
 *
 *
 */



Potree.GeoControls = function ( object, domElement ) {
	this.object = object;
	this.domElement = ( domElement !== undefined ) ? domElement : document;
	
	// Set to false to disable this control
	this.enabled = true;

	// Set this to a THREE.SplineCurve3 instance
	this.track = null;
	// position on track in intervall [0,1]
	this.trackPos = 0;
	
	this.rotateSpeed = 1.0;
	this.moveSpeed = 10.0;

	this.keys = { 
		LEFT: 37, 
		UP: 38, 
		RIGHT: 39, 
		BOTTOM: 40,
		A: 'A'.charCodeAt(0),
		S: 'S'.charCodeAt(0),
		D: 'D'.charCodeAt(0),
		W: 'W'.charCodeAt(0),
		Q: 'Q'.charCodeAt(0),
		E: 'E'.charCodeAt(0),
		R: 'R'.charCodeAt(0),
		F: 'F'.charCodeAt(0)
	};

	var scope = this;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var offset = new THREE.Vector3();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();
	
	this.shiftDown = false;

	var lastPosition = new THREE.Vector3();

	var STATE = { NONE : -1, ROTATE : 0, SPEEDCHANGE : 1, PAN : 2 };

	var state = STATE.NONE;

	// for reset
	this.position0 = this.object.position.clone();

	// events

	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start'};
	var endEvent = { type: 'end'};
	
	this.setTrack = function(track){
		if(this.track !== track){
			this.track = track;
			this.trackPos = null;
		}
	};
	
	this.setTrackPos = function(trackPos, _preserveRelativeRotation){
		var preserveRelativeRotation = _preserveRelativeRotation || false;
	
		var newTrackPos = Math.max(0, Math.min(1, trackPos));
		var oldTrackPos = this.trackPos || newTrackPos;
		
		var newTangent = this.track.getTangentAt(newTrackPos);
		var oldTangent = this.track.getTangentAt(oldTrackPos);
		
		if(newTangent.equals(oldTangent)){
			// no change in direction
		}else{
			var tangentDiffNormal = new THREE.Vector3().crossVectors(oldTangent, newTangent).normalize();
			var angle = oldTangent.angleTo(newTangent);
			var rot = new THREE.Matrix4().makeRotationAxis(tangentDiffNormal, angle);
			var dir = this.object.getWorldDirection().clone();
			dir = dir.applyMatrix4(rot);
			var target = new THREE.Vector3().addVectors(this.object.position, dir);
			this.object.lookAt(target);
			this.object.updateMatrixWorld();
			
			var event = {
				type: 'path_relative_rotation',
				angle: angle,
				axis: tangentDiffNormal,
				controls: scope
			};
			this.dispatchEvent(event);
		}
		
		if(this.trackPos === null){
			var target = new THREE.Vector3().addVectors(this.object.position, newTangent);
			this.object.lookAt(target);
		}
		
		
		this.trackPos = newTrackPos;
		
		//var pStart = this.track.getPointAt(oldTrackPos);
		//var pEnd = this.track.getPointAt(newTrackPos);
		//var pDiff = pEnd.sub(pStart);
		
		
		if(newTrackPos !== oldTrackPos){
			var event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}
	}
	
	this.getTrackPos = function(){
		return this.trackPos;
	};

	this.rotateLeft = function ( angle ) {
		thetaDelta -= angle;
	};

	this.rotateUp = function ( angle ) {
		phiDelta -= angle;
	};

	// pass in distance in world space to move left
	this.panLeft = function ( distance ) {

		var te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
		panOffset.multiplyScalar( - distance );
		
		pan.add( panOffset );

	};

	// pass in distance in world space to move up
	this.panUp = function ( distance ) {

		var te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
		panOffset.multiplyScalar( distance );
		
		pan.add( panOffset );

	};
	
	// pass in distance in world space to move forward
	this.panForward = function ( distance ) {

		if(this.track){
			this.setTrackPos( this.getTrackPos() - distance / this.track.getLength());
		}else{
			var te = this.object.matrix.elements;

			// get Y column of matrix
			panOffset.set( te[ 8 ], te[ 9 ], te[ 10 ] );
			//panOffset.set( te[ 8 ], 0, te[ 10 ] );
			panOffset.multiplyScalar( distance );
			
			pan.add( panOffset );
		}
	};
	
	this.pan = function ( deltaX, deltaY ) {

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( scope.object.fov !== undefined ) {
			// perspective
			var position = scope.object.position;
			var offset = position.clone();
			var targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
			scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );
		} else if ( scope.object.top !== undefined ) {

			// orthographic
			scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
			scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );
		} else {

			// camera neither orthographic or perspective
			console.warn( 'WARNING: GeoControls.js encountered an unknown camera type - pan disabled.' );
		}
	};

	this.update = function (delta) {
		this.object.rotation.order = 'ZYX';
		
		var object = this.object;
		
		this.object = new THREE.Object3D();
		this.object.position.copy(object.position);
		this.object.rotation.copy(object.rotation);
		this.object.updateMatrix();
		this.object.updateMatrixWorld();
		
		var position = this.object.position;
		
		if(delta !== undefined){
		
			var multiplier = scope.shiftDown ? 4 : 1;
			if(this.moveRight){
				this.panLeft(-delta * this.moveSpeed * multiplier);
			}
			if(this.moveLeft){
				this.panLeft(delta * this.moveSpeed * multiplier);
			}
			if(this.moveForward || this.moveForwardMouse){
				this.panForward(-delta * this.moveSpeed * multiplier);
			}
			if(this.moveBackward){
				this.panForward(delta * this.moveSpeed * multiplier);
			}
			if(this.rotLeft){
				scope.rotateLeft( -0.5 * Math.PI * delta / scope.rotateSpeed );
			}
			if(this.rotRight){
				scope.rotateLeft( 0.5 * Math.PI * delta / scope.rotateSpeed );
			}
			if(this.raiseCamera){
				//scope.rotateUp( -0.5 * Math.PI * delta / scope.rotateSpeed );
				scope.panUp( delta * this.moveSpeed * multiplier );
			}
			if(this.lowerCamera){
				//scope.rotateUp( 0.5 * Math.PI * delta / scope.rotateSpeed );
				scope.panUp( -delta * this.moveSpeed * multiplier );
			}
			
		}
		
		if(!pan.equals(new THREE.Vector3(0,0,0))){
			var event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}
		
		position.add(pan);
		
		if(!(thetaDelta === 0.0 && phiDelta === 0.0)) {
			var event = {
				type: 'rotate',
				thetaDelta: thetaDelta,
				phiDelta: phiDelta
			};
			this.dispatchEvent(event);
		}
		
		this.object.updateMatrix();
		var rot = new THREE.Matrix4().makeRotationY(thetaDelta);
		var res = new THREE.Matrix4().multiplyMatrices(rot, this.object.matrix);
		this.object.quaternion.setFromRotationMatrix(res);
		
		this.object.rotation.x += phiDelta;
		this.object.updateMatrixWorld();
		
		// send transformation proposal to listeners
		var proposeTransformEvent = {
			type: "proposeTransform",
			oldPosition: object.position,
			newPosition: this.object.position,
			objections: 0,
			counterProposals: []
		};
		this.dispatchEvent(proposeTransformEvent);
		
		// check some counter proposals if transformation wasn't accepted
		if(proposeTransformEvent.objections > 0 ){
			if(proposeTransformEvent.counterProposals.length > 0){
				var cp = proposeTransformEvent.counterProposals;
				this.object.position.copy(cp[0]);
				
				proposeTransformEvent.objections = 0;
				proposeTransformEvent.counterProposals = [];
			}
		}
		
		// apply transformation, if accepted
		if(proposeTransformEvent.objections > 0){
			
		}else{
			object.position.copy(this.object.position);
		}
		
		object.rotation.copy(this.object.rotation);
		
		this.object = object;

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set( 0, 0, 0 );

		if ( lastPosition.distanceTo( this.object.position ) > 0 ) {
			this.dispatchEvent( changeEvent );

			lastPosition.copy( this.object.position );
		}
		
		if(this.track){
			var pos = this.track.getPointAt(this.trackPos);
			object.position.copy(pos);
		}
	};


	this.reset = function () {
		state = STATE.NONE;

		this.object.position.copy( this.position0 );
	};

	function onMouseDown( event ) {
		if ( scope.enabled === false ) return;
		event.preventDefault();

		if ( event.button === 0 ) {
			state = STATE.ROTATE;

			rotateStart.set( event.clientX, event.clientY );
		} else if ( event.button === 1 ) {
			state = STATE.PAN;
            
			panStart.set( event.clientX, event.clientY );
		} else if ( event.button === 2 ) {
			//state = STATE.PAN;
            //
			//panStart.set( event.clientX, event.clientY );
			scope.moveForwardMouse = true;
		}

		//scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
		//scope.domElement.addEventListener( 'mouseup', onMouseUp, false );
		scope.dispatchEvent( startEvent );
	}

	function onMouseMove( event ) {
		if ( scope.enabled === false ) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if ( state === STATE.ROTATE ) {
			rotateEnd.set( event.clientX, event.clientY );
			rotateDelta.subVectors( rotateEnd, rotateStart );

			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

			rotateStart.copy( rotateEnd );

		} else if ( state === STATE.PAN ) {
			panEnd.set( event.clientX, event.clientY );
			panDelta.subVectors( panEnd, panStart );
			//panDelta.multiplyScalar(this.moveSpeed).multiplyScalar(0.0001);
			panDelta.multiplyScalar(0.002).multiplyScalar(scope.moveSpeed);
			
			scope.pan( panDelta.x, panDelta.y );

			panStart.copy( panEnd );
		}
	}

	function onMouseUp(event) {
		if ( scope.enabled === false ) return;
		
		//console.log(event.which);
		
		if(event.button === 2){
			scope.moveForwardMouse = false;
		}else{
			//scope.domElement.removeEventListener( 'mousemove', onMouseMove, false );
			//scope.domElement.removeEventListener( 'mouseup', onMouseUp, false );
			scope.dispatchEvent( endEvent );
			state = STATE.NONE;
		}
	}

	function onMouseWheel(event) {
		if ( scope.enabled === false || scope.noZoom === true ) return;

		event.preventDefault();

		var direction = (event.detail<0 || event.wheelDelta>0) ? 1 : -1;
		var moveSpeed = scope.moveSpeed + scope.moveSpeed * 0.1 * direction;
		moveSpeed = Math.max(0.1, moveSpeed);

		scope.setMoveSpeed(moveSpeed);

		scope.dispatchEvent( startEvent );
		scope.dispatchEvent( endEvent );
	}
	
	this.setMoveSpeed = function(value){
		if(scope.moveSpeed !== value){
			scope.moveSpeed = value;
			scope.dispatchEvent( {
				type: "move_speed_changed",
				controls: scope
			});
		}
	};

	function onKeyDown( event ) {
		if ( scope.enabled === false) return;
		
		scope.shiftDown = event.shiftKey;
		
		switch ( event.keyCode ) {
			case scope.keys.UP: scope.moveForward = true; break;
			case scope.keys.BOTTOM: scope.moveBackward = true; break;
			case scope.keys.LEFT: scope.moveLeft = true; break;
			case scope.keys.RIGHT: scope.moveRight = true; break;
			case scope.keys.W: scope.moveForward = true; break;
			case scope.keys.S: scope.moveBackward = true; break;
			case scope.keys.A: scope.moveLeft = true; break;
			case scope.keys.D: scope.moveRight = true; break;			
			case scope.keys.Q: scope.rotLeft = true; break;			
			case scope.keys.E: scope.rotRight = true; break;			
			case scope.keys.R: scope.raiseCamera = true; break;			
			case scope.keys.F: scope.lowerCamera = true; break;			
		}
	}
	
	function onKeyUp( event ) {
	
		scope.shiftDown = event.shiftKey;
		
		switch ( event.keyCode ) {
			case scope.keys.W: scope.moveForward = false; break;
			case scope.keys.S: scope.moveBackward = false; break;
			case scope.keys.A: scope.moveLeft = false; break;
			case scope.keys.D: scope.moveRight = false; break;
			case scope.keys.UP: scope.moveForward = false; break;
			case scope.keys.BOTTOM: scope.moveBackward = false; break;
			case scope.keys.LEFT: scope.moveLeft = false; break;
			case scope.keys.RIGHT: scope.moveRight = false; break;
			case scope.keys.Q: scope.rotLeft = false; break;			
			case scope.keys.E: scope.rotRight = false; break;
			case scope.keys.R: scope.raiseCamera = false; break;			
			case scope.keys.F: scope.lowerCamera = false; break;				
		}
	}

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
	this.domElement.addEventListener( 'mousedown', onMouseDown, false );
	this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
	this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox
	
	scope.domElement.addEventListener( 'mousemove', onMouseMove, false );
	scope.domElement.addEventListener( 'mouseup', onMouseUp, false );

	if(this.domElement.tabIndex === -1){
		this.domElement.tabIndex = 2222;
	}
	scope.domElement.addEventListener( 'keydown', onKeyDown, false );
	scope.domElement.addEventListener( 'keyup', onKeyUp, false );

};

Potree.GeoControls.prototype = Object.create( THREE.EventDispatcher.prototype );
/**
 * @author mschuetz / http://mschuetz.at
 *
 * adapted from THREE.OrbitControls by 
 *
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 *
 *
 *
 */
 
Potree.OrbitControls = class OrbitControls extends THREE.EventDispatcher{
	
	constructor(viewer){
		super()
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.scene = null;
		this.sceneControls = new THREE.Scene();
		
		this.rotationSpeed = 5;
		
		this.fadeFactor = 10;
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.panDelta = new THREE.Vector2(0, 0);
		this.radiusDelta = 0;
		
		this.tweens = [];
		
		
		let drag = (e) => {
			if(e.drag.object !== null){
				return;
			}
			
			if(e.drag.startHandled === undefined){
				e.drag.startHandled = true;
				
				this.dispatchEvent({type: "start"});
			}
			
			let ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
			};
			
			if(e.drag.mouse === Potree.MOUSE.LEFT){
				this.yawDelta += ndrag.x * this.rotationSpeed;
				this.pitchDelta += ndrag.y * this.rotationSpeed;
				
				this.stopTweens();
			}else if(e.drag.mouse === Potree.MOUSE.RIGHT){
				this.panDelta.x += ndrag.x;
				this.panDelta.y += ndrag.y;
				
				this.stopTweens();
			}
			
			
		};
		
		let drop = e => {
			this.dispatchEvent({type: "end"});
		};
		
		let scroll = (e) => {
			let resolvedRadius = this.scene.view.radius + this.radiusDelta;
			
			this.radiusDelta += -e.delta * resolvedRadius * 0.1;
			
			this.stopTweens();
		};
		
		let dblclick = (e) => {
			this.zoomToLocation(e.mouse);
		};
		
		
		let previousTouch = null;
		let touchStart = e => {
			previousTouch = e;
		};
		
		let touchEnd = e => {
			previousTouch = e;
		};
		
		let touchMove = e => {
			
			if(e.touches.length === 2 && previousTouch.touches.length === 2){
				let prev = previousTouch;
				let curr = e;
				
				let prevDX = prev.touches[0].pageX - prev.touches[1].pageX;
				let prevDY = prev.touches[0].pageY - prev.touches[1].pageY;
				let prevDist = Math.sqrt(prevDX * prevDX + prevDY * prevDY);
				
				let currDX = curr.touches[0].pageX - curr.touches[1].pageX;
				let currDY = curr.touches[0].pageY - curr.touches[1].pageY;
				let currDist = Math.sqrt(currDX * currDX + currDY * currDY);
				
				let delta = currDist / prevDist;
				let resolvedRadius = this.scene.view.radius + this.radiusDelta;
				let newRadius = resolvedRadius / delta;
				this.radiusDelta = newRadius - resolvedRadius;

				this.stopTweens();
			}
			
			previousTouch = e;
		};
		
		this.addEventListener("touchstart", touchStart);
		this.addEventListener("touchend", touchEnd);
		this.addEventListener("touchmove", touchMove);
		this.addEventListener("drag", drag);
		this.addEventListener("drop", drop);
		this.addEventListener("mousewheel", scroll);
		this.addEventListener("dblclick", dblclick);
		
	}
	
	setScene(scene){
		this.scene = scene;
	}
	
	zoomToLocation(mouse){
		let camera = this.scene.camera;
		
		let I = Potree.utils.getMousePointCloudIntersection(
			mouse, 
			camera, 
			this.renderer, 
			this.scene.pointclouds);
			
		if(I === null){
			return;
		}
		
		let nmouse =  {
			x: +( mouse.x / this.renderer.domElement.clientWidth )  * 2 - 1,
			y: -( mouse.y / this.renderer.domElement.clientHeight ) * 2 + 1
		};
		
		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;
			
			let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
			vector.unproject(camera);
			
			let direction = vector.sub(camera.position).normalize();
			let ray = new THREE.Ray(camera.position, direction);
			
			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere().radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}
		
		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		let controlsTargetPosition = I.location;
		
		var animationDuration = 600;
		var easing = TWEEN.Easing.Quartic.Out;
		
		{ // animate 
		
			let value = {x: 0};
			let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);
			
			let startPos = this.scene.view.position.clone();
			let targetPos = cameraTargetPosition.clone();
			let startRadius = this.scene.view.radius;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);
			
			tween.onUpdate( () => {
				let t = value.x;
				this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;
				
				this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
				this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
			});
			
			tween.onComplete( () => {
				this.tweens = this.tweens.filter( e => e !== tween);
			});
			
			tween.start();
		}
	}
	
	stopTweens(){
		this.tweens.forEach( e => e.stop() );
		this.tweens = [];
	}
	
	update(delta){
		
		let view = this.scene.view;
		
		{ // apply rotation
			let progression = Math.min(1, this.fadeFactor * delta);
			
			let yaw = view.yaw;
			let pitch = view.pitch;
			let pivot = view.getPivot();
			
			yaw -= progression * this.yawDelta;
			pitch -= progression * this.pitchDelta;
			
			view.yaw = yaw;
			view.pitch = pitch;
			
			let V = this.scene.view.direction.multiplyScalar(-view.radius);
			let position = new THREE.Vector3().addVectors(pivot, V);
			
			view.position.copy(position);
		}
		
		{ // apply pan
			let progression = Math.min(1, this.fadeFactor * delta);
			let panDistance = progression * view.radius * 3;
			
			let px = -this.panDelta.x * panDistance;
			let py = this.panDelta.y * panDistance;
			
			view.pan(px, py);
		}
		
		{ // apply zoom
			let progression = Math.min(1, this.fadeFactor * delta);
			
			//let radius = view.radius + progression * this.radiusDelta * view.radius * 0.1;
			let radius = view.radius + progression * this.radiusDelta;
			
			let V = view.direction.multiplyScalar(-radius);
			let position = new THREE.Vector3().addVectors(view.getPivot(), V);
			view.radius = radius;
			
			view.position.copy(position);
		}
		
		{
			let speed = view.radius / 2.5;
			this.viewer.setMoveSpeed(speed);
		}
		
		{// decelerate over time
			let progression = Math.min(1, this.fadeFactor * delta);
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);
			
			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.panDelta.multiplyScalar(attenuation);
			//this.radiusDelta *= attenuation;
			this.radiusDelta -= progression * this.radiusDelta
		}
	}
	
};



Potree.EarthControls = class EarthControls extends THREE.EventDispatcher{
	
	constructor(viewer){
		super(viewer);
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.scene = null;
		this.sceneControls = new THREE.Scene();
		
		this.rotationSpeed = 10;
		
		this.fadeFactor = 20;
		this.wheelDelta = 0;
		this.zoomDelta = new THREE.Vector3();
		this.camStart = null;
		
		this.tweens = [];

		
		this.pivotIndicator;
		{
			let sg = new THREE.SphereGeometry(1, 16, 16);
			let sm = new THREE.MeshNormalMaterial();
			this.pivotIndicator = new THREE.Mesh(sg, sm);
			this.pivotIndicator.visible = false;
			this.sceneControls.add(this.pivotIndicator);
		}
		
		let drag = (e) => {
			if(e.drag.object !== null){
				return;
			}
			
			if(!this.pivot){
				return;
			}
			
			if(e.drag.startHandled === undefined){
				e.drag.startHandled = true;
				
				this.dispatchEvent({type: "start"});
			}
			
			let camStart = this.camStart;
			let view = this.viewer.scene.view;
			
			//let camera = this.viewer.scene.camera;
			let mouse = e.drag.end;
			let domElement = this.viewer.renderer.domElement;
			
			if(e.drag.mouse === Potree.MOUSE.LEFT){
				let nmouse =  {
					x: (mouse.x / domElement.clientWidth ) * 2 - 1,
					y: - (mouse.y / domElement.clientHeight ) * 2 + 1
				};
				
				let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
				vector.unproject(camStart);
				
				let dir = vector.sub( camStart.position).normalize();
				let ray = new THREE.Ray(camStart.position, dir);
				let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
					new THREE.Vector3(0, 0, 1), 
					this.pivot);
				
				
				let distanceToPlane = ray.distanceToPlane(plane);

				if(distanceToPlane > 0){
					let I = new THREE.Vector3().addVectors(
						camStart.position, 
						dir.clone().multiplyScalar(distanceToPlane));
						
					let movedBy = new THREE.Vector3().subVectors(
						I, this.pivot);
					
					let newCamPos = camStart.position.clone().sub(movedBy);
					
					view.position.copy(newCamPos);
					
					{
						let distance = newCamPos.distanceTo(this.pivot);
						view.radius = distance;
						let speed = view.radius / 2.5;
						this.viewer.setMoveSpeed(speed);
					}
				}
				
			}else if(e.drag.mouse === Potree.MOUSE.RIGHT){
				let ndrag = {
					x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
					y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
				};
				
				let yawDelta = -ndrag.x * this.rotationSpeed * 0.5;
				let pitchDelta = -ndrag.y * this.rotationSpeed * 0.2;
				
				let originalPitch = view.pitch;
				let tmpView = view.clone();
				tmpView.pitch = tmpView.pitch + pitchDelta;
				pitchDelta = tmpView.pitch - originalPitch;
				
				
				let pivotToCam = new THREE.Vector3().subVectors(view.position, this.pivot);
				let pivotToCamTarget = new THREE.Vector3().subVectors(view.getPivot(), this.pivot);
				let side = view.getSide();
				
				pivotToCam.applyAxisAngle(side, pitchDelta);
				pivotToCamTarget.applyAxisAngle(side, pitchDelta);
				
				pivotToCam.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);
				pivotToCamTarget.applyAxisAngle(new THREE.Vector3(0, 0, 1), yawDelta);
				
				let newCam = new THREE.Vector3().addVectors(this.pivot, pivotToCam);
				let newCamTarget = new THREE.Vector3().addVectors(this.pivot, pivotToCamTarget);
				
				view.position.copy(newCam);
				view.yaw += yawDelta;
				view.pitch += pitchDelta;

			}
			
		};
		
		let onMouseDown = e => {
			let I = Potree.utils.getMousePointCloudIntersection(
				e.mouse, 
				this.scene.camera, 
				this.renderer, 
				this.scene.pointclouds);
				
			if(I){
				this.pivot = I.location;
				this.camStart = this.scene.camera.clone();
				this.pivotIndicator.visible = true;
				this.pivotIndicator.position.copy(I.location);
			}
		};
		
		let drop = e => {
			this.dispatchEvent({type: "end"});
		};
		
		let onMouseUp = e => {
			this.camStart = null;
			this.pivot = null;
			this.pivotIndicator.visible = false;
		};
		
		let scroll = (e) => {
			this.wheelDelta += e.delta
		};
		
		let dblclick = (e) => {
			this.zoomToLocation(e.mouse);
		};
		
		this.addEventListener("drag", drag);
		this.addEventListener("drop", drop);
		this.addEventListener("mousewheel", scroll);
		this.addEventListener("mousedown", onMouseDown);
		this.addEventListener("mouseup", onMouseUp);
		this.addEventListener("dblclick", dblclick);
	}
	
	setScene(scene){
		this.scene = scene;
	}
	
	zoomToLocation(mouse){
		let camera = this.scene.camera;
		
		let I = Potree.utils.getMousePointCloudIntersection(
			mouse, 
			camera, 
			this.renderer, 
			this.scene.pointclouds);
			
		if(I === null){
			return;
		}
		
		let nmouse =  {
			x: +( mouse.x / this.renderer.domElement.clientWidth )  * 2 - 1,
			y: -( mouse.y / this.renderer.domElement.clientHeight ) * 2 + 1
		};
		
		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;
			
			let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
			vector.unproject(camera);
			
			let direction = vector.sub(camera.position).normalize();
			let ray = new THREE.Ray(camera.position, direction);
			
			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere().radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}
		
		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		let controlsTargetPosition = I.location;
		
		var animationDuration = 600;
		var easing = TWEEN.Easing.Quartic.Out;
		
		{ // animate 
		
			let value = {x: 0};
			let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);
			
			let startPos = this.scene.view.position.clone();
			let targetPos = cameraTargetPosition.clone();
			let startRadius = this.scene.view.radius;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);
			
			tween.onUpdate( () => {
				let t = value.x;
				this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;
				
				this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
				this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
			});
			
			tween.onComplete( () => {
				this.tweens = this.tweens.filter( e => e !== tween);
			});
			
			tween.start();
		}
	}
	
	update(delta){
		let view = this.scene.view;
		let fade = Math.pow(0.5, this.fadeFactor * delta);
		let progression = 1 - fade;
		let camera = this.scene.camera;
		
		// compute zoom
		if(this.wheelDelta !== 0){
			let I = Potree.utils.getMousePointCloudIntersection(
				this.viewer.inputHandler.mouse, 
				this.scene.camera, 
				this.renderer, 
				this.scene.pointclouds);
				
			if(I){
				let resolvedPos = new THREE.Vector3().addVectors(view.position, this.zoomDelta);
				let distance = I.location.distanceTo(resolvedPos);
				let jumpDistance = distance * 0.2 * this.wheelDelta;
				let targetDir = new THREE.Vector3().subVectors(I.location, view.position);
				targetDir.normalize();
				
				resolvedPos.add(targetDir.multiplyScalar(jumpDistance));
				this.zoomDelta.subVectors(resolvedPos, view.position);
				
				{
					let distance = resolvedPos.distanceTo(I.location);
					view.radius = distance;
					let speed = view.radius / 2.5;
					this.viewer.setMoveSpeed(speed);
				}
			}
		}
		
		// apply zoom
		if(this.zoomDelta.length() !== 0){
			let p = this.zoomDelta.clone().multiplyScalar(progression);
			
			let newPos = new THREE.Vector3().addVectors(view.position, p);
			view.position.copy(newPos);
		}
		
		if(this.pivotIndicator.visible){
			let distance = this.pivotIndicator.position.distanceTo(view.position);
			let pixelHeight = this.renderer.domElement.clientHeight;
			let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, pixelHeight);
			let scale = (10 / pr);
			this.pivotIndicator.scale.set(scale, scale, scale);
		}
		
		// decelerate over time
		{
			this.zoomDelta.multiplyScalar(fade);
			this.wheelDelta = 0;
		}
		
	}
	 
}











/**
 * 
 * @param node
 * @class an item in the lru list. 
 */
function LRUItem(node){
	this.previous = null;
	this.next = null;
	this.node = node;
}

/**
 * 
 * @class A doubly-linked-list of the least recently used elements.
 */
function LRU(){
	// the least recently used item
	this.first = null;
	// the most recently used item
	this.last = null;
	// a list of all items in the lru list
	this.items = {};
	this.elements = 0;
	this.numPoints = 0;
}

/**
 * number of elements in the list
 * 
 * @returns {Number}
 */
LRU.prototype.size = function(){
	return this.elements;
};

LRU.prototype.contains = function(node){
	return this.items[node.id] == null;
};

/**
 * makes node the most recently used item. if the list does not contain node, it will be added.
 * 
 * @param node
 */
LRU.prototype.touch = function(node){
	if(!node.loaded){
		return;
	}

	var item;
	if(this.items[node.id] == null){
		// add to list
		item = new LRUItem(node);
		item.previous = this.last;
		this.last = item;
		if(item.previous !== null){
			item.previous.next = item;
		}
		
		this.items[node.id] = item;
		this.elements++;
		
		if(this.first === null){
			this.first = item;
		}
		this.numPoints += node.numPoints;
	}else{
		// update in list
		item = this.items[node.id];
		if(item.previous === null){
			// handle touch on first element
			if(item.next !== null){
				this.first = item.next;
				this.first.previous = null;
				item.previous = this.last;
				item.next = null;
				this.last = item;
				item.previous.next = item;
			}
		}else if(item.next === null){
			// handle touch on last element
		}else{
			// handle touch on any other element
			item.previous.next = item.next;
			item.next.previous = item.previous;
			item.previous = this.last;
			item.next = null;
			this.last = item;
			item.previous.next = item;
		}
		
		
	}
};

///**
// * removes the least recently used item from the list and returns it. 
// * if the list was empty, null will be returned.
// */
//LRU.prototype.remove = function remove(){
//	if(this.first === null){
//		return null;
//	}
//	var lru = this.first;
//
//	// if the lru list contains at least 2 items, the item after the least recently used elemnt will be the new lru item. 
//	if(lru.next !== null){
//		this.first = lru.next;
//		this.first.previous = null;
//	}else{
//		this.first = null;
//		this.last = null;
//	}
//	
//	delete this.items[lru.node.id];
//	this.elements--;
//	this.numPoints -= lru.node.numPoints;
//	
////	Logger.info("removed node: " + lru.node.id);
//	return lru.node;
//};

LRU.prototype.remove = function remove(node){

	var lruItem = this.items[node.id];
	if(lruItem){
	
		if(this.elements === 1){
			this.first = null;
			this.last = null;
		}else{
			if(!lruItem.previous){
				this.first = lruItem.next;
				this.first.previous = null;
			}
			if(!lruItem.next){
				this.last = lruItem.previous;
				this.last.next = null;
			}
			if(lruItem.previous &&lruItem.next){
				lruItem.previous.next = lruItem.next;
				lruItem.next.previous = lruItem.previous;
			}
		}
	
		delete this.items[node.id];
		this.elements--;
		this.numPoints -= node.numPoints;
	}
	
};

LRU.prototype.getLRUItem = function(){
	if(this.first === null){
		return null;
	}
	var lru = this.first;
	
	return lru.node;
};

LRU.prototype.toString = function(){
	var string = "{ ";
	var curr = this.first;
	while(curr !== null){
		string += curr.node.id;
		if(curr.next !== null){
			string += ", ";
		}
		curr = curr.next;
	}
	string += "}";
	string += "(" + this.size() + ")";
	return string;
};

LRU.prototype.freeMemory = function(){
	if(this.elements <= 1){
		return;
	}

	while(this.numPoints > Potree.pointLoadLimit){
		var element = this.first;
		var node = element.node;
		this.disposeDescendants(node);
	
	}
};

LRU.prototype.disposeDescendants = function(node){
	var stack = [];
	stack.push(node);
	while(stack.length > 0){
		var current = stack.pop();
		
		//console.log(current);
		
		current.dispose();
		this.remove(current);
		
		for(var key in current.children){
			if(current.children.hasOwnProperty(key)){
				var child = current.children[key];
				if(child.loaded){
					stack.push(current.children[key]);
				}
			}
		}
	}
};
Potree.Annotation = class extends THREE.EventDispatcher{
	
	constructor(args = {}){
		super();
		
		this.scene = null;
		this.title = args.title || "No Title";
		this.description = args.description || "";
		
		if(!args.position){
			//this.position = new THREE.Vector3(0, 0, 0);
			this.position = null;
		}else if(args.position instanceof THREE.Vector3){
			this.position = args.position;
		}else{
			this.position = new THREE.Vector3(...args.position);
		}
		
		this.cameraPosition = (args.cameraPosition instanceof Array) ? 
			new THREE.Vector3().fromArray(args.cameraPosition) : args.cameraPosition;
		this.cameraTarget = (args.cameraTarget instanceof Array) ? 
			new THREE.Vector3().fromArray(args.cameraTarget) : args.cameraTarget;
		this.radius = args.radius;
		this.view = args.view || null;
		this.keepOpen = false;
		this.descriptionVisible = false;
		this.showDescription = true;
		this.actions = args.actions || [];
		this.isHighlighted = false;
		this._visible = true;
		this.__visible = true;
		this._display = true;
		this._expand = false;
		this.collapseThreshold = [args.collapseThreshold, 100].find(e => e !== undefined);
		
		this.children = [];
		this.parent = null;
		this.boundingBox = new THREE.Box3();
		
		let iconClose = Potree.resourcePath + "/icons/close.svg";
		
		this.domElement = $(`
			<div class="annotation" oncontextmenu="return false;">
				<div class="annotation-titlebar">
					<span class="annotation-label">${this.title}</span>
				</div>
				<div class="annotation-description">
					<span class="annotation-description-close">
						<img src="${iconClose}" width="16px">
					</span>
					<span class="annotation-description-content">${this.description}</span>
				</div>
			</div>
		`);
		
		this.elTitlebar = this.domElement.find(".annotation-titlebar");
		this.elTitle = this.elTitlebar.find(".annotation-label");
		this.elDescription = this.domElement.find(".annotation-description");
		this.elDescriptionClose = this.elDescription.find(".annotation-description-close");
		//this.elDescriptionContent = this.elDescription.find(".annotation-description-content");
		
		this.clickTitle = () => {
			if(this.hasView()){
				this.moveHere(this.scene.camera);
			}
			this.dispatchEvent({type: "click", target: this});
		};
		
		this.elTitle.click(this.clickTitle);
		
		this.actions = this.actions.map(a => {
			if(a instanceof Potree.Action){
				return a;
			}else{
				return new Potree.Action(a);
			}
		});
		
		for(let action of this.actions){
			action.pairWith(this);
		}
        
		let actions = this.actions.filter(
			a => a.showIn === undefined || a.showIn.includes("scene"));
		
		for(let action of actions){
			this.elTitle.css("padding", "1px 3px 0px 8px");
			
			let elButton = $(`<img src="${action.icon}" class="annotation-action-icon">`);
			this.elTitlebar.append(elButton);
			elButton.click(() => action.onclick({annotation: this}));
		}
		
		this.elDescriptionClose.hover(
			e => this.elDescriptionClose.css("opacity", "1"),
			e => this.elDescriptionClose.css("opacity", "0.5")
		);
		this.elDescriptionClose.click(e => this.setHighlighted(false));
		//this.elDescriptionContent.html(this.description);
		
		this.domElement.mouseenter(e => this.setHighlighted(true));
		this.domElement.mouseleave(e => this.setHighlighted(false));
		
		this.domElement.on("touchstart", e => {
			this.setHighlighted(!this.isHighlighted);
		});
		
		this.display = false;
	}
	
	get visible(){
		return this._visible;
	}
	
	set visible(value){
		if(this._visible === value){
			return;
		}
		
		this._visible = value;
		
		this.traverse(node => {
			node.display = value;
		});
		
		this.dispatchEvent({
			type: "visibility_changed",
			annotation: this
		});
	}
	
	get display(){
		return this._display;
	}
	
	set display(display){
		
		if(this._display === display){
			return;
		}
		
		this._display = display;
		
		if(display){
			//this.domElement.fadeIn(200);
			this.domElement.show();
		}else{
			//this.domElement.fadeOut(200);
			this.domElement.hide();
		}
	}
	
	get expand(){
		return this._expand;
	}
	
	set expand(expand){
		
		if(this._expand === expand){
			return;
		}
		
		if(expand){
			this.display = false;
		}else{
			this.display = true;
			this.traverseDescendants(node => {
				node.display = false;
			});
		}
		
		this._expand = expand;
	}
	
	add(annotation){
		if(!this.children.includes(annotation)){
			this.children.push(annotation);
			annotation.parent = this;
			
			let descendants = [];
			annotation.traverse(a => {descendants.push(a)});
			
			for(let descendant of descendants){
				let c = this;
				while(c !== null){
					c.dispatchEvent({
						"type": "annotation_added",
						"annotation": descendant
					});
					c = c.parent;
				}
			}
			
		}
	}
	
	level(){
		if(this.parent === null){
			return 0;
		}else{
			return this.parent.level() + 1;
		}
	}
	
	remove(annotation){
		this.children = this.children.filter(e => e !== annotation);
		annotation.parent = null;
	}
	
	updateBounds(){
		let box = new THREE.Box3();
		
		if(this.position){
			box.expandByPoint(this.position);
		}
		
		for(let child of this.children){
			child.updateBounds();
			
			box.union(child.boundingBox);
		}
		
		this.boundingBox.copy(box);
	}
	
	traverse(callback){
		let expand = callback(this);
		
		if(expand === undefined || expand === true){
			for(let child of this.children){
				child.traverse(callback);
			}
		}
	}
	
	traverseDescendants(callback){
		for(let child of this.children){
			child.traverse(callback);
		}
	}
	
	flatten(){
		let annotations = [];
		
		this.traverse(annotation => {
			annotations.push(annotation);
		});
		
		return annotations;
	}
	
	descendants(){
		let annotations = [];
		
		this.traverse(annotation => {
			if(annotation !== this){
				annotations.push(annotation);
			}
		});
		
		return annotations;
	}
	
	setHighlighted(highlighted){
		if(highlighted){
			this.domElement.css("opacity", "0.8");
			this.elTitlebar.css("box-shadow", "0 0 5px #fff");
			this.domElement.css("z-index", "1000");
			
			if(this.description){
				this.descriptionVisible = true;	
				//this.elDescription.css("display", "block");
				this.elDescription.fadeIn(200);
				this.elDescription.css("position", "relative");
			}
		}else{
			this.domElement.css("opacity", "0.5");
			this.elTitlebar.css("box-shadow", "");
			this.domElement.css("z-index", "100");
			this.descriptionVisible = false;	
			this.elDescription.css("display", "none");
			//this.elDescription.fadeOut(200);
		}
		
		this.isHighlighted = highlighted;
	}
	
	hasView(){
		let hasPosTargetView = this.cameraTarget instanceof THREE.Vector3;
		hasPosTargetView = hasPosTargetView && this.cameraPosition instanceof THREE.Vector3;
		
		let hasRadiusView = this.radius !== undefined;
		
		let hasView = hasPosTargetView || hasRadiusView;
				
		return hasView;
	};
	
	moveHere(camera){		
		if(!this.hasView()){
			return;
		}

		let view = this.scene.view;
		
		var animationDuration = 300;
		var easing = TWEEN.Easing.Quartic.Out;
		
		
		let endTarget;
		if(this.cameraTarget){
			endTarget = this.cameraTarget;
		}else if(this.position){
			endTarget = this.position;
		}else{
			endTarget = this.boundingBox.getCenter();
		}
		
		if(this.cameraPosition){
			
			let endPosition = this.cameraPosition;

			{ // animate camera position
				let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
				tween.easing(easing);
				tween.start();
			}
			
			{ // animate camera target
				var camTargetDistance = camera.position.distanceTo(endTarget);
				var target = new THREE.Vector3().addVectors(
					camera.position, 
					camera.getWorldDirection().clone().multiplyScalar(camTargetDistance)
				);
				var tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
				tween.easing(easing);
				tween.onUpdate(() => {
					view.lookAt(target);
				});
				tween.onComplete(() => {
					view.lookAt(target);
					this.dispatchEvent({type: "focusing_finished", target: this});
				});
				
				this.dispatchEvent({type: "focusing_started", target: this});
				tween.start();
			}
		}else if(this.radius){
			let direction = view.direction;
			let endPosition = endTarget.clone().add(direction.multiplyScalar(-this.radius));
			let startRadius = view.radius;
			let endRadius = this.radius;
			
			{ // animate camera position
				let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
				tween.easing(easing);
				tween.start();
			}
			
			{ // animate radius
				let t = {x: 0};
			
				let tween = new TWEEN.Tween(t)
					.to({x: 1}, animationDuration)
					.onUpdate(function(){
						view.radius = this.x * endRadius + (1 - this.x) * startRadius;
					});
				tween.easing(easing);
				tween.start();
			}
			
		}
	};
	
	dispose(){
		if(this.domElement.parentElement){
			this.domElement.parentElement.removeChild(this.domElement);
		}
    
	};
	
	
	
	toString(){
		return "Annotation: " + this.title;
	}
};


Potree.Action = class Action extends THREE.EventDispatcher{

	constructor(args = {}){
		super();
		
		this.icon = args.icon || "";
		this.tooltip = args.tooltip;
		
		if(args.onclick !== undefined){
			this.onclick = args.onclick;
		}
		
	}
	
	onclick(event){
		
	}
	
	pairWith(object){
		
	}
	
	setIcon(newIcon){
		let oldIcon = this.icon;
		
		if(newIcon === oldIcon){
			return;
		}
		
		this.icon = newIcon;
		
		this.dispatchEvent({
			type: "icon_changed",
			action: this,
			icon: newIcon,
			oldIcon: oldIcon
		});
	}

};

Potree.Actions = {};

Potree.Actions.ToggleAnnotationVisibility = class ToggleAnnotationVisibility extends Potree.Action{

	constructor(args = {}){
		super(args);
		
		this.icon = Potree.resourcePath + "/icons/eye.svg";
		this.showIn = "sidebar";
		this.tooltip = "toggle visibility";
	}
	
	pairWith(annotation){
		
		if(annotation.visible){
			this.setIcon(Potree.resourcePath + "/icons/eye.svg");
		}else{
			this.setIcon(Potree.resourcePath + "/icons/eye_crossed.svg");
		}
		
		annotation.addEventListener("visibility_changed", e => {
			let annotation = e.annotation;
			
			if(annotation.visible){
				this.setIcon(Potree.resourcePath + "/icons/eye.svg");
			}else{
				this.setIcon(Potree.resourcePath + "/icons/eye_crossed.svg");
			}
		});
	}
	
	onclick(event){
		let annotation = event.annotation;
		
		annotation.visible = !annotation.visible;
		
		if(annotation.visible){
			this.setIcon(Potree.resourcePath + "/icons/eye.svg");
		}else{
			this.setIcon(Potree.resourcePath + "/icons/eye_crossed.svg");
		}
	}
}





Potree.ProfileData = class ProfileData{
	
	constructor(profile){
		this.profile = profile;
		
		this.segments = [];
		this.boundingBox = new THREE.Box3();
		
		for(let i = 0; i < profile.points.length - 1; i++){
			let start = profile.points[i];
			let end = profile.points[i+1];
			
			let startGround = new THREE.Vector3(start.x, start.y, 0);
			let endGround = new THREE.Vector3(end.x, end.y, 0);
			
			let center = new THREE.Vector3().addVectors(endGround, startGround).multiplyScalar(0.5);
			let length = startGround.distanceTo(endGround);
			let side = new THREE.Vector3().subVectors(endGround, startGround).normalize();
			let up = new THREE.Vector3(0, 0, 1);
			let forward = new THREE.Vector3().crossVectors(side, up).normalize();
			let N = forward;
			let cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, startGround);
			let halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);
			
			let segment = {
				start: start,
				end: end,
				cutPlane: cutPlane,
				halfPlane: halfPlane,
				length: length,
				points: new Potree.Points()
			};
			
			this.segments.push(segment);
		}
	}
	
	size(){
		
		let size = 0;
		for(let segment of this.segments){
			size += segment.points.numPoints;
		}
		
		return size;
	}
	
};

Potree.ProfileRequest = class ProfileRequest{
	
	constructor(pointcloud, profile, maxDepth, callback){
		this.pointcloud = pointcloud;
		this.profile = profile;
		this.maxDepth = maxDepth || Number.MAX_VALUE;
		this.callback = callback;
		this.temporaryResult = new Potree.ProfileData(this.profile);
		this.pointsServed = 0;
		this.highestLevelServed = 0;

		this.priorityQueue = new BinaryHeap(function(x){return 1 / x.weight;});
		
		this.initialize();
	}

	initialize(){
		this.priorityQueue.push({node: this.pointcloud.pcoGeometry.root, weight: 1});
		this.traverse(this.pointcloud.pcoGeometry.root);
	};
	
	// traverse the node and add intersecting descendants to queue
	traverse(node){
		
		let stack = [];
		for(let i = 0; i < 8; i++){
			let child = node.children[i];
			if(child && this.pointcloud.nodeIntersectsProfile(child, this.profile)){
				stack.push(child);
			}
		}
		
		while(stack.length > 0){
			let node = stack.pop();
			let weight = node.boundingSphere.radius;
			
			this.priorityQueue.push({node: node, weight: weight});
		
			// add children that intersect the cutting plane
			if(node.level < this.maxDepth){
				for(let i = 0; i < 8; i++){
					let child = node.children[i];
					if(child && this.pointcloud.nodeIntersectsProfile(child, this.profile)){
						stack.push(child);
					}
				}
			}
		}
	}
	
	update(){
		
		// load nodes in queue
		// if hierarchy expands, also load nodes from expanded hierarchy
		// once loaded, add data to this.points and remove node from queue
		// only evaluate 1-50 nodes per frame to maintain responsiveness
		
		let maxNodesPerUpdate = 1;
		let intersectedNodes = [];
		
		for(let i = 0; i < Math.min(maxNodesPerUpdate, this.priorityQueue.size()); i++){
			let element = this.priorityQueue.pop();
			let node = element.node;
			
			
			if(node.loaded){
				// add points to result
				intersectedNodes.push(node);
				Potree.getLRU().touch(node);
				this.highestLevelServed = node.getLevel();
				
				if((node.level % node.pcoGeometry.hierarchyStepSize) === 0 && node.hasChildren){
					this.traverse(node);
				}
			}else{
				node.load();
				this.priorityQueue.push(element);
			}
		}
		
		if(intersectedNodes.length > 0){
			this.getPointsInsideProfile(intersectedNodes, this.temporaryResult);
			if(this.temporaryResult.size() > 100){
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}
		}
		
		if(this.priorityQueue.size() === 0){
			// we're done! inform callback and remove from pending requests

			if(this.temporaryResult.size() > 0){
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}
			
			this.callback.onFinish({request: this});
			
			let index = this.pointcloud.profileRequests.indexOf(this);
			if(index >= 0){
				this.pointcloud.profileRequests.splice(index, 1);
			}
		}
	};
	
	getPointsInsideProfile(nodes, target){
	
		let totalMileage = 0;
		
		
		for(let segment of target.segments){
			
			for(let node of nodes){
				let geometry = node.geometry;
				let positions = geometry.attributes.position;
				let p = positions.array;
				let numPoints = node.numPoints;
				
				let sv = new THREE.Vector3().subVectors(segment.end, segment.start).setZ(0);
				let segmentDir = sv.clone().normalize();
				
				let accepted = [];
				let mileage = [];
				let acceptedPositions = [];
				let points = new Potree.Points();
				
				let nodeMatrix = new THREE.Matrix4().makeTranslation(...node.boundingBox.min.toArray());
				
				let matrix = new THREE.Matrix4().multiplyMatrices(
					this.pointcloud.matrixWorld, nodeMatrix);
				
				for(let i = 0; i < numPoints; i++){
					let pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
					pos.applyMatrix4(matrix);
					let distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
					let centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));
					
					if(distance < this.profile.width / 2 && centerDistance < segment.length / 2){
						
						let svp = new THREE.Vector3().subVectors(pos, segment.start);
						let localMileage = segmentDir.dot(svp);
						
						accepted.push(i);
						mileage.push(localMileage + totalMileage);
						points.boundingBox.expandByPoint(pos);
						
						acceptedPositions.push(pos.x);
						acceptedPositions.push(pos.y);
						acceptedPositions.push(pos.z);
					}
				}
				
				for(let attribute of Object.keys(geometry.attributes).filter(a => a !== "indices")) {

					let bufferedAttribute = geometry.attributes[attribute];
					let type = bufferedAttribute.array.constructor;
					
					let filteredBuffer = null;
					
					if(attribute === "position"){
						filteredBuffer = new type(acceptedPositions);
					}else{
						filteredBuffer = new type(accepted.length * bufferedAttribute.itemSize);
					
						for(let i = 0; i < accepted.length; i++){
							let index = accepted[i];
							
							filteredBuffer.set(
								bufferedAttribute.array.subarray(
									bufferedAttribute.itemSize * index, 
									bufferedAttribute.itemSize * index + bufferedAttribute.itemSize),
								bufferedAttribute.itemSize * i)
						}
					}
					points.data[attribute] = filteredBuffer;
					
					
				}
				
				points.data["mileage"] = new Float64Array(mileage);
				points.numPoints = accepted.length;
				
				segment.points.add(points);
				
			}
			
			totalMileage += segment.length;
		}
	
		for(let segment of target.segments){
			target.boundingBox.union(segment.points.boundingBox);
		}
		
		
		
	};
	
	finishLevelThenCancel(){
		if(this.cancelRequested){
			return;
		}
		
		this.maxDepth = this.highestLevelServed + 1;
		this.cancelRequested = true;
		
		console.log(`maxDepth: ${this.maxDepth}`);
	};
	
	cancel(){
		this.callback.onCancel();
		
		this.priorityQueue = new BinaryHeap(function(x){return 1 / x.weight;});
		
		let index = this.pointcloud.profileRequests.indexOf(this);
		if(index >= 0){
			this.pointcloud.profileRequests.splice(index, 1);
		}
	};
	
};


Potree.PointCloudOctreeNode = class PointCloudOctreeNode extends Potree.PointCloudTreeNode{
	
	constructor(){
		super();
		
		this.children = {};
		this.sceneNode = null;
		this.octree = null;
	}
	
	getNumPoints(){
		return this.geometryNode.numPoints;
	};
	
	isLoaded(){
		return true;
	};
	
	isTreeNode(){
		return true;
	};
	
	isGeometryNode(){
		return false;
	};
	
	getLevel(){
		return this.geometryNode.level;
	};
	
	getBoundingSphere(){
		return this.geometryNode.boundingSphere;
	};
	
	getBoundingBox(){
		return this.geometryNode.boundingBox;
	};
	
	getChildren(){
		let children = [];
		
		for(let i = 0; i < 8; i++){
			if(this.children[i]){
				children.push(this.children[i]);
			}
		}
		
		return children;
	};
	
	get name(){
		return this.geometryNode.name;
	}
};


Potree.PointCloudOctree = class extends Potree.PointCloudTree{
	
	constructor(geometry, material){
		super();
		
		this.pcoGeometry = geometry;
		this.boundingBox = this.pcoGeometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		this.material = material || new Potree.PointCloudMaterial();
		this.visiblePointsTarget = 2*1000*1000;
		this.minimumNodePixelSize = 150;
		this.level = 0;
		this.position.copy(geometry.offset);
		this.updateMatrix();
		
		this.showBoundingBox = false;
		this.boundingBoxNodes = [];
		this.loadQueue = [];
		this.visibleBounds = new THREE.Box3();	
		this.visibleNodes = [];
		this.visibleGeometry = [];
		this.generateDEM = false;
		this.profileRequests = [];
		this.name = "";
		
		// TODO read projection from file instead
		this.projection = geometry.projection;
		
		this.root = this.pcoGeometry.root;
	}
	
	
	setName(name){
		if(this.name !== name){
			this.name = name;
			this.dispatchEvent({type: "name_changed", name: name, pointcloud: this});
		}
	}
	
	getName(){
		return name;
	}
	
	toTreeNode(geometryNode, parent){
		let node = new Potree.PointCloudOctreeNode();
		
		//if(geometryNode.name === "r40206"){
		//	console.log("creating node for r40206");
		//}
		let sceneNode = new THREE.Points(geometryNode.geometry, this.material);
		sceneNode.name = geometryNode.name;
		sceneNode.position.copy(geometryNode.boundingBox.min);
		sceneNode.frustumCulled = false;
		sceneNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
			
			if(material.program){
				_this.getContext().useProgram(material.program.program);
				
				if(material.program.getUniforms().map.level){
					let level = geometryNode.getLevel();
					material.uniforms.level.value = level;
					material.program.getUniforms().map.level.setValue(_this.getContext(), level);
				}
				
				if(this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart){
					let vnStart = this.visibleNodeTextureOffsets.get(node);
					material.uniforms.vnStart.value = vnStart;
					material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
				}
				
				if(material.program.getUniforms().map.pcIndex){
					let i = node.pcIndex ? node.pcIndex : this.visibleNodes.indexOf(node);
					material.uniforms.pcIndex.value = i;
					material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), i);
				}
			}
		};
		
		//{ // DEBUG
		//	let sg = new THREE.SphereGeometry(1, 16, 16);
		//	let sm = new THREE.MeshNormalMaterial();
		//	let s = new THREE.Mesh(sg, sm);
		//	s.scale.set(5, 5, 5);
		//	s.position.copy(geometryNode.mean)
		//		.add(this.position)
		//		.add(geometryNode.boundingBox.min);
		//	
		//	viewer.scene.scene.add(s);
		//}
		
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.pointcloud = this;
		node.children = {};
		for(let key in geometryNode.children){
			node.children[key] = geometryNode.children[key];
		}
		
		if(!parent){
			this.root = node;
			this.add(sceneNode);
		}else{
			let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.add(sceneNode);
			parent.children[childIndex] = node;
		}
		
		let disposeListener = function(){
			let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.remove(node.sceneNode);
			parent.children[childIndex] = geometryNode;
		}
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);
		
		return node;
	}
	
	updateVisibleBounds(){
		let leafNodes = [];
		for(let i = 0; i < this.visibleNodes.length; i++){
			let node = this.visibleNodes[i];
			let isLeaf = true;
			
			for(let j = 0; j < node.children.length; j++){
				let child = node.children[j];
				if(child instanceof Potree.PointCloudOctreeNode){
					isLeaf = isLeaf && !child.sceneNode.visible;
				}else if(child instanceof Potree.PointCloudOctreeGeometryNode){
					isLeaf = true;
				}
			}
			
			if(isLeaf){
				leafNodes.push(node);
			}
		}
		
		this.visibleBounds.min = new THREE.Vector3( Infinity, Infinity, Infinity );
		this.visibleBounds.max = new THREE.Vector3( - Infinity, - Infinity, - Infinity );
		for(let i = 0; i < leafNodes.length; i++){
			let node = leafNodes[i];
			
			this.visibleBounds.expandByPoint(node.getBoundingBox().min);
			this.visibleBounds.expandByPoint(node.getBoundingBox().max);
		}
	}
	
	updateMaterial(material, visibleNodes, camera, renderer){
		material.fov = camera.fov * (Math.PI / 180);
		material.screenWidth = renderer.domElement.clientWidth;
		material.screenHeight = renderer.domElement.clientHeight;
		material.spacing = this.pcoGeometry.spacing * Math.max(this.scale.x, this.scale.y, this.scale.z);
		material.near = camera.near;
		material.far = camera.far;
		material.uniforms.octreeSize.value = this.pcoGeometry.boundingBox.getSize().x;
		
		// update visibility texture
		if(material.pointSizeType >= 0){
			if(material.pointSizeType === Potree.PointSizeType.ADAPTIVE 
				|| material.pointColorType === Potree.PointColorType.LOD){
				
				this.updateVisibilityTexture(material, visibleNodes);
			}
		}
	}
	
	updateVisibilityTexture(material, visibleNodes){
		if(!material){
			return;
		}
		
		let texture = material.visibleNodesTexture;
		let data = texture.image.data;
		data.fill(0);
		
		this.visibleNodeTextureOffsets = new Map();
		
		// copy array
		visibleNodes = visibleNodes.slice();
		
		// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
		let sort = function(a, b){
			let na = a.geometryNode.name;
			let nb = b.geometryNode.name;
			if(na.length != nb.length) return na.length - nb.length;
			if(na < nb) return -1;
			if(na > nb) return 1;
			return 0;
		};
		visibleNodes.sort(sort);

		
		for(let i = 0; i < visibleNodes.length; i++){
			let node = visibleNodes[i];
			
			this.visibleNodeTextureOffsets.set(node, i);
			
			let children = [];
			for(let j = 0; j < 8; j++){
				let child = node.children[j];
				if(child instanceof Potree.PointCloudOctreeNode && child.sceneNode.visible && visibleNodes.indexOf(child) >= 0){
					children.push(child);
				}
			}
			children.sort(function(a, b){
				if(a.geometryNode.name < b.geometryNode.name) return -1;
				if(a.geometryNode.name > b.geometryNode.name) return 1;
				return 0;
			});
			
			data[i*3 + 0] = 0;
			data[i*3 + 1] = 0;
			data[i*3 + 2] = 0;
			for(let j = 0; j < children.length; j++){
				let child = children[j];
				let index = parseInt(child.geometryNode.name.substr(-1));
				data[i*3 + 0] += Math.pow(2, index);
				
				if(j === 0){
					let vArrayIndex = visibleNodes.indexOf(child);
					data[i*3 + 1] = (vArrayIndex - i) >> 8;
					data[i*3 + 2] = (vArrayIndex - i) % 256;
				}
				
			}
		}
		
		
		texture.needsUpdate = true;
	}
	
	nodeIntersectsProfile(node, profile){
		let bbWorld = node.boundingBox.clone().applyMatrix4(this.matrixWorld);
		let bsWorld = bbWorld.getBoundingSphere();
		
		for(let i = 0; i < profile.points.length - 1; i++){
			let start = new THREE.Vector3(profile.points[i].x, bsWorld.center.y, profile.points[i].z);
			let end = new THREE.Vector3(profile.points[i+1].x, bsWorld.center.y, profile.points[i+1].z);
			
			let ray1 = new THREE.Ray(start, new THREE.Vector3().subVectors(end, start).normalize());
			let ray2 = new THREE.Ray(end, new THREE.Vector3().subVectors(start, end).normalize());
			
			if(ray1.intersectsSphere(bsWorld) && ray2.intersectsSphere(bsWorld)){
				return true;
			}
		}
		
		return false;
	}
	
	nodesOnRay(nodes, ray){
		let nodesOnRay = [];

		let _ray = ray.clone();
		for(let i = 0; i < nodes.length; i++){
			let node = nodes[i];
			//var inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
			//let sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
			let sphere = node.getBoundingSphere().clone().applyMatrix4(this.matrixWorld);
			
			if(_ray.intersectsSphere(sphere)){
				nodesOnRay.push(node);
			}
		}
		
		return nodesOnRay;
	}
	
	updateMatrixWorld( force ){
		if ( this.matrixAutoUpdate === true ) this.updateMatrix();

		if ( this.matrixWorldNeedsUpdate === true || force === true ) {

			if ( this.parent === undefined ) {

				this.matrixWorld.copy( this.matrix );

			} else {

				this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

			}

			this.matrixWorldNeedsUpdate = false;

			force = true;

		}
	}
	
	hideDescendants(object){
		let stack = [];
		for(let i = 0; i < object.children.length; i++){
			let child = object.children[i];
			if(child.visible){
				stack.push(child);
			}
		}
		
		while(stack.length > 0){
			let object = stack.shift();
			
			object.visible = false;
			
			for(let i = 0; i < object.children.length; i++){
				let child = object.children[i];
				if(child.visible){
					stack.push(child);
				}
			}
		}
	}
	
	moveToOrigin(){
		this.position.set(0,0,0);
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.set(0,0,0).sub(tBox.getCenter());
	};

	moveToGroundPlane(){
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.y += -tBox.min.y;
	};

	getBoundingBoxWorld(){
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		
		return tBox;
	};
	
	/**
	 * returns points inside the profile points
	 *
	 * maxDepth:		search points up to the given octree depth
	 *
	 *
	 * The return value is an array with all segments of the profile path
	 *  var segment = {
	 * 		start: 	THREE.Vector3,
	 * 		end: 	THREE.Vector3,
	 * 		points: {}
	 * 		project: function()
	 *  };
	 *
	 * The project() function inside each segment can be used to transform
	 * that segments point coordinates to line up along the x-axis.
	 *
	 *
	 */
	getPointsInProfile(profile, maxDepth, callback){

		if(callback){
			let request = new Potree.ProfileRequest(this, profile, maxDepth, callback);
			this.profileRequests.push(request);
			
			return request;
		}

		let points = {
			segments: [],
			boundingBox: new THREE.Box3(),
			projectedBoundingBox: new THREE.Box2()
		};
		
		// evaluate segments
		for(let i = 0; i < profile.points.length - 1; i++){
			let start = profile.points[i];
			let end = profile.points[i+1];
			let ps = this.getProfile(start, end, profile.width, maxDepth);
			
			let segment = {
				start: start,
				end: end,
				points: ps,
				project: null
			};
			
			points.segments.push(segment);
			
			points.boundingBox.expandByPoint(ps.boundingBox.min);
			points.boundingBox.expandByPoint(ps.boundingBox.max);
		}
		
		// add projection functions to the segments
		let mileage = new THREE.Vector3();
		for(let i = 0; i < points.segments.length; i++){
			let segment = points.segments[i];
			let start = segment.start;
			let end = segment.end;
			
			let project = function(_start, _end, _mileage, _boundingBox){
				let start = _start;
				let end = _end;
				let mileage = _mileage;
				let boundingBox = _boundingBox;
				
				let xAxis = new THREE.Vector3(1,0,0);
				let dir = new THREE.Vector3().subVectors(end, start);
				dir.y = 0;
				dir.normalize();
				let alpha = Math.acos(xAxis.dot(dir));
				if(dir.z > 0){
					alpha = -alpha;
				}
				
				
				return function(position){
							
					let toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -boundingBox.min.y, -start.z);
					let alignWithX = new THREE.Matrix4().makeRotationY(-alpha);
					let applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

					let pos = position.clone();
					pos.applyMatrix4(toOrigin);
					pos.applyMatrix4(alignWithX);
					pos.applyMatrix4(applyMileage);
					
					return pos;
				};
				
			}(start, end, mileage.clone(), points.boundingBox.clone());
			
			segment.project = project;
			
			mileage.x += new THREE.Vector3(start.x, 0, start.z).distanceTo(new THREE.Vector3(end.x, 0, end.z));
			mileage.y += end.y - start.y;
		}
		
		points.projectedBoundingBox.min.x = 0;
		points.projectedBoundingBox.min.y = points.boundingBox.min.y;
		points.projectedBoundingBox.max.x = mileage.x;
		points.projectedBoundingBox.max.y = points.boundingBox.max.y;
		
		return points;
	}
	
	/**
	 * returns points inside the given profile bounds.
	 *
	 * start: 	
	 * end: 	
	 * width:	
	 * depth:		search points up to the given octree depth
	 * callback:	if specified, points are loaded before searching
	 *				
	 *
	 */
	getProfile(start, end, width, depth, callback){
		if(callback !== undefined){
			let request = new Potree.ProfileRequest(start, end, width, depth, callback);
			this.profileRequests.push(request);
		}else{
			let stack = [];
			stack.push(this);
			
			let center = new THREE.Vector3().addVectors(end, start).multiplyScalar(0.5);
			let length = new THREE.Vector3().subVectors(end, start).length();
			let side = new THREE.Vector3().subVectors(end, start).normalize();
			let up = new THREE.Vector3(0, 1, 0);
			let forward = new THREE.Vector3().crossVectors(side, up).normalize();
			let N = forward;
			let cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, start);
			let halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);
			
			let inside = null;
			
			let boundingBox = new THREE.Box3();
			
			
			while(stack.length > 0){
				let object = stack.shift();
				
				
				let pointsFound = 0;
				
				if(object instanceof THREE.Points){
					let geometry = object.geometry;
					let positions = geometry.attributes.position;
					let p = positions.array;
					let numPoints = object.numPoints;
					
					if(!inside){
						inside = {};
						
						for (let property in geometry.attributes) {
							if (geometry.attributes.hasOwnProperty(property)) {
								if(property === "indices"){
								
								}else{
									inside[property] = [];
								}
							}
						}
					}
					
					for(let i = 0; i < numPoints; i++){
						let pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
						pos.applyMatrix4(this.matrixWorld);
						let distance = Math.abs(cutPlane.distanceToPoint(pos));
						let centerDistance = Math.abs(halfPlane.distanceToPoint(pos));
						
						if(distance < width / 2 && centerDistance < length / 2){
							boundingBox.expandByPoint(pos);
							
							for (let property in geometry.attributes) {
								if (geometry.attributes.hasOwnProperty(property)) {
								
									if(property === "position"){
										inside[property].push(pos);
									}else if(property === "indices"){
										// skip indices
									}else{
										let values = geometry.attributes[property];
										if(values.itemSize === 1){
											inside[property].push(values.array[i + j]);
										}else{
											let value = [];
											for(let j = 0; j < values.itemSize; j++){
												value.push(values.array[i*values.itemSize + j]);
											}
											inside[property].push(value);
										}
									}
									
								}
							}
							
							
							pointsFound++;
						}
					}
				}
				
				//console.log("traversing: " + object.name + ", #points found: " + pointsFound);
				
				if(object == this || object.level < depth){
					for(let i = 0; i < object.children.length; i++){
						let child = object.children[i];
						if(child instanceof THREE.Points){
							let sphere = child.boundingSphere.clone().applyMatrix4(child.matrixWorld);
							if(cutPlane.distanceToSphere(sphere) < sphere.radius){
								stack.push(child);	
							}			
						}
					}
				}
			}
			
			inside.numPoints = inside.position.length;
			
			let project = function(_start, _end){
				let start = _start;
				let end = _end;
				
				let xAxis = new THREE.Vector3(1,0,0);
				let dir = new THREE.Vector3().subVectors(end, start);
				dir.y = 0;
				dir.normalize();
				let alpha = Math.acos(xAxis.dot(dir));
				if(dir.z > 0){
					alpha = -alpha;
				}
				
				
				return function(position){
							
					let toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -start.y, -start.z);
					let alignWithX = new THREE.Matrix4().makeRotationY(-alpha);

					let pos = position.clone();
					pos.applyMatrix4(toOrigin);
					pos.applyMatrix4(alignWithX);
					
					return pos;
				};
				
			}(start, end);
			
			inside.project = project;
			inside.boundingBox = boundingBox;
			
			return inside;
		}
	};

	getVisibleExtent(){
		return this.visibleBounds.applyMatrix4(this.matrixWorld);
	};


	/**
	 *
	 *
	 *
	 * params.pickWindowSize:	Look for points inside a pixel window of this size.
	 * 							Use odd values: 1, 3, 5, ...
	 * 
	 * 
	 * TODO: only draw pixels that are actually read with readPixels(). 
	 * 
	 */
	pick(renderer, camera, ray, params = {}){
		
		//let start = new Date().getTime();
		
		let pickWindowSize = params.pickWindowSize || 17;
		let pickOutsideClipRegion = params.pickOutsideClipRegion || false;
		let width = Math.ceil(renderer.domElement.clientWidth);
		let height = Math.ceil(renderer.domElement.clientHeight);
		
		let nodes = this.nodesOnRay(this.visibleNodes, ray);
		
		if(nodes.length === 0){
			return null;
		}
		
		if(!this.pickState){
			
			let scene = new THREE.Scene();
			
			let material = new Potree.PointCloudMaterial();
			material.pointColorType = Potree.PointColorType.POINT_INDEX;	
			
			let renderTarget = new THREE.WebGLRenderTarget( 
				1, 1, 
				{ minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat } 
			);
			
			this.pickState = {
				renderTarget: renderTarget,
				material: material,
				scene: scene
			};
		};
		
		let pickState = this.pickState;
		let pickMaterial = pickState.material;
		
		{ // update pick material
			pickMaterial.pointSizeType = this.material.pointSizeType;
			pickMaterial.shape = this.material.shape;
			
			pickMaterial.size = this.material.size;
			pickMaterial.minSize = this.material.minSize;
			pickMaterial.maxSize = this.material.maxSize;
			pickMaterial.classification = this.material.classification;
			
			if(pickOutsideClipRegion){
				pickMaterial.clipMode = Potree.ClipMode.DISABLED;
			}else{
				pickMaterial.clipMode = this.material.clipMode;
				if(this.material.clipMode === Potree.ClipMode.CLIP_OUTSIDE){
					pickMaterial.setClipBoxes(this.material.clipBoxes);
				}else{
					pickMaterial.setClipBoxes([]);
				}
			}
			
			this.updateMaterial(pickMaterial, nodes, camera, renderer);
		}
		
		if(pickState.renderTarget.width != width || pickState.renderTarget.height != height){
			pickState.renderTarget.dispose();
			pickState.renderTarget = new THREE.WebGLRenderTarget( 
				1, 1, 
				{ minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat } 
			);
		}
		pickState.renderTarget.setSize(width, height);
		renderer.setRenderTarget( pickState.renderTarget );
		
		let pixelPos = new THREE.Vector3()
			.addVectors(camera.position, ray.direction)
			.project(camera)
			.addScalar(1)
			.multiplyScalar(0.5);
		pixelPos.x *= width;
		pixelPos.y *= height;
		
		renderer.setScissor(
			parseInt(pixelPos.x - (pickWindowSize - 1) / 2), 
			parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
			parseInt(pickWindowSize), parseInt(pickWindowSize));
		renderer.setScissorTest(true);
		
		renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
		renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
		renderer.state.setBlending(THREE.NoBlending);
		
		renderer.clearTarget( pickState.renderTarget, true, true, true );
		
		//pickState.scene.children = nodes.map(n => n.sceneNode);
		
		//let childStates = [];
		let tempNodes = [];
		for(let i = 0; i < nodes.length; i++){
			let node = nodes[i];
			node.pcIndex = i+1;
			let sceneNode = node.sceneNode;
			
			let tempNode = new THREE.Points(sceneNode.geometry, pickMaterial);
			tempNode.matrix = sceneNode.matrix;
			tempNode.matrixWorld = sceneNode.matrixWorld;
			tempNode.matrixAutoUpdate = false;
			tempNode.frustumCulled = false;
			tempNode.pcIndex = i+1;
			
			let geometryNode = node.geometryNode;
			let material = pickMaterial;
			tempNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
				
				if(material.program){
					_this.getContext().useProgram(material.program.program);
					
					if(material.program.getUniforms().map.level){
						let level = geometryNode.getLevel();
						material.uniforms.level.value = level;
						material.program.getUniforms().map.level.setValue(_this.getContext(), level);
					}
					
					if(this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart){
						let vnStart = this.visibleNodeTextureOffsets.get(node);
						material.uniforms.vnStart.value = vnStart;
						material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
					}
					
					if(material.program.getUniforms().map.pcIndex){
						material.uniforms.pcIndex.value = node.pcIndex;
						material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), node.pcIndex);
					}
				}
				
			};
			tempNodes.push(tempNode);
			
			//for(let child of nodes[i].sceneNode.children){
			//	childStates.push({child: child, visible: child.visible});
			//	child.visible = false;
			//}
		}
		pickState.scene.autoUpdate = false;
		pickState.scene.children = tempNodes;
		//pickState.scene.overrideMaterial = pickMaterial;
		
		renderer.state.setBlending(THREE.NoBlending);
		
		// RENDER
		renderer.render(pickState.scene, camera, pickState.renderTarget);
		
		//for(let childState of childStates){
		//	childState.child = childState.visible;
		//}
		
		//pickState.scene.overrideMaterial = null;
		
		//renderer.context.readPixels(
		//	pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2, 
		//	pickWindowSize, pickWindowSize, 
		//	renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);
		
		let clamp = (number, min, max) => Math.min(Math.max(min, number), max);
		
		let x = parseInt(clamp(pixelPos.x - (pickWindowSize-1) / 2, 0, width));
		let y = parseInt(clamp(pixelPos.y - (pickWindowSize-1) / 2, 0, height));
		let w = parseInt(Math.min(x + pickWindowSize, width) - x);
		let h = parseInt(Math.min(y + pickWindowSize, height) - y);
		
		let pixelCount = w * h;
		let buffer = new Uint8Array(4 * pixelCount);
		renderer.readRenderTargetPixels(pickState.renderTarget, 
			x, y, w, h, 
			buffer);
		
		renderer.setScissorTest(false);
		
		renderer.setRenderTarget(null);
		
		let pixels = buffer;
		let ibuffer = new Uint32Array(buffer.buffer);
		
		// find closest hit inside pixelWindow boundaries
		let min = Number.MAX_VALUE;
		let hit = null;
		for(let u = 0; u < pickWindowSize; u++){
			for(let v = 0; v < pickWindowSize; v++){
				let offset = (u + v*pickWindowSize);
				let distance = Math.pow(u - (pickWindowSize-1) / 2, 2) + Math.pow(v - (pickWindowSize-1) / 2, 2);
				
				let pcIndex = pixels[4*offset + 3];
				pixels[4*offset + 3] = 0;
				let pIndex = ibuffer[offset];
				
				//if((pIndex !== 0 || pcIndex !== 0) && distance < min){
				if(pcIndex > 0 && distance < min){
					
					
					hit = {
						pIndex: pIndex,
						pcIndex: pcIndex - 1
					};
					min = distance;
					
					//console.log(hit);
				}
			}
		}
		//console.log(pixels);
		
		//{ // open window with image
		//	let img = Potree.utils.pixelsArrayToImage(buffer, w, h);
		//	let screenshot = img.src;
		//	
		//	if(!this.debugDIV){
		//		this.debugDIV = $(`
		//			<div id="pickDebug" 
		//			style="position: absolute; 
		//			right: 400px; width: 300px;
		//			bottom: 44px; width: 300px;
		//			z-index: 1000;
		//			"></div>`);
		//		$(document.body).append(this.debugDIV);
		//	}
		//	
		//	this.debugDIV.empty();
		//	this.debugDIV.append($(`<img src="${screenshot}"
		//		style="transform: scaleY(-1);"/>`));
		//	//$(this.debugWindow.document).append($(`<img src="${screenshot}"/>`));
		//	//this.debugWindow.document.write('<img src="'+screenshot+'"/>');
		//}
		
		//return;
		
		let point = null;
		
		if(hit){
			point = {};
			
			if(!nodes[hit.pcIndex]){
				return null;
			}
			
			let pc = nodes[hit.pcIndex].sceneNode;
			let attributes = pc.geometry.attributes;
			
			for(let property in attributes) {
				if (attributes.hasOwnProperty(property)) {
					let values = pc.geometry.attributes[property];
				
					if(property === "position"){
						let positionArray = values.array;
						let x = positionArray[3*hit.pIndex+0];
						let y = positionArray[3*hit.pIndex+1];
						let z = positionArray[3*hit.pIndex+2];
						let position = new THREE.Vector3(x, y, z);
						position.applyMatrix4(pc.matrixWorld);
					
						point[property] = position;
					}else if(property === "indices"){
					
					}else{
						if(values.itemSize === 1){
							point[property] = values.array[hit.pIndex];
						}else{
							let value = [];
							for(let j = 0; j < values.itemSize; j++){
								value.push(values.array[values.itemSize*hit.pIndex + j]);
							}
							point[property] = value;
						}
					}
				}
			}
		}
		
		//let end = new Date().getTime();
		//let duration = end - start;
		//console.log(`pick duration: ${duration}ms`);
		
		return point;
		
		
	};
	
	get progress(){
		return this.visibleNodes.length / this.visibleGeometry.length;
	}
};
















var nodesLoadTimes = {};

Potree.PointCloudOctreeGeometry = function(){
	this.url = null;
	this.octreeDir = null;
	this.spacing = 0;
	this.boundingBox = null;
	this.root = null;
	this.numNodesLoading = 0;
	this.nodes = null;
	this.pointAttributes = null;
	this.hierarchyStepSize = -1;
	this.loader = null;
};

Potree.PointCloudOctreeGeometryNode = function(name, pcoGeometry, boundingBox){
	this.id = Potree.PointCloudOctreeGeometryNode.IDCount++;
	this.name = name;
	this.index = parseInt(name.charAt(name.length-1));
	this.pcoGeometry = pcoGeometry;
	this.geometry = null;
	this.boundingBox = boundingBox;
	this.boundingSphere = boundingBox.getBoundingSphere();
	this.children = {};
	this.numPoints = 0;
	this.level = null;
	this.loaded = false;
	this.oneTimeDisposeHandlers = [];
};

Potree.PointCloudOctreeGeometryNode.IDCount = 0;

Potree.PointCloudOctreeGeometryNode.prototype = Object.create(Potree.PointCloudTreeNode.prototype);

Potree.PointCloudOctreeGeometryNode.prototype.isGeometryNode = function(){
	return true;
};

Potree.PointCloudOctreeGeometryNode.prototype.getLevel = function(){
	return this.level;
};

Potree.PointCloudOctreeGeometryNode.prototype.isTreeNode = function(){
	return false;
};

Potree.PointCloudOctreeGeometryNode.prototype.isLoaded = function(){
	return this.loaded;
};

Potree.PointCloudOctreeGeometryNode.prototype.getBoundingSphere = function(){
	return this.boundingSphere;
};

Potree.PointCloudOctreeGeometryNode.prototype.getBoundingBox = function(){
	return this.boundingBox;
};

Potree.PointCloudOctreeGeometryNode.prototype.getChildren = function(){
	var children = [];
	
	for(var i = 0; i < 8; i++){
		if(this.children[i]){
			children.push(this.children[i]);
		}
	}
	
	return children;
};

Potree.PointCloudOctreeGeometryNode.prototype.getBoundingBox = function(){
	return this.boundingBox;
};

Potree.PointCloudOctreeGeometryNode.prototype.getURL = function(){
	var url = "";
	
	var version = this.pcoGeometry.loader.version;
	
	if(version.equalOrHigher("1.5")){
		url = this.pcoGeometry.octreeDir + "/" + this.getHierarchyPath() + "/" + this.name;
	}else if(version.equalOrHigher("1.4")){
		url = this.pcoGeometry.octreeDir + "/" + this.name;
	}else if(version.upTo("1.3")){
		url = this.pcoGeometry.octreeDir + "/" + this.name;
	}
	
	return url;
};

Potree.PointCloudOctreeGeometryNode.prototype.getHierarchyPath = function(){
	var path = "r/";

	var hierarchyStepSize = this.pcoGeometry.hierarchyStepSize;
	var indices = this.name.substr(1);
	
	var numParts = Math.floor(indices.length / hierarchyStepSize);
	for(var i = 0; i < numParts; i++){
		path += indices.substr(i * hierarchyStepSize, hierarchyStepSize) + "/";
	}
	
	path = path.slice(0,-1);

	return path;
};

Potree.PointCloudOctreeGeometryNode.prototype.addChild = function(child){
	this.children[child.index] = child;
	child.parent = this;
};

Potree.PointCloudOctreeGeometryNode.prototype.load = function(){
	if(this.loading === true || this.loaded === true ||this.pcoGeometry.numNodesLoading > 3){
		return;
	}
	
	this.loading = true;
	
	this.pcoGeometry.numNodesLoading++;
	
	
	if(this.pcoGeometry.loader.version.equalOrHigher("1.5")){
		if((this.level % this.pcoGeometry.hierarchyStepSize) === 0 && this.hasChildren){
			this.loadHierachyThenPoints();
		}else{
			this.loadPoints();
		}
	}else{
		this.loadPoints();
	}
	
	
};

Potree.PointCloudOctreeGeometryNode.prototype.loadPoints = function(){
	this.pcoGeometry.loader.load(this);
};


Potree.PointCloudOctreeGeometryNode.prototype.loadHierachyThenPoints = function(){

	var node = this;

	// load hierarchy
	var callback = function(node, hbuffer){
		var count = hbuffer.byteLength / 5;
		var view = new DataView(hbuffer);
		
		var stack = [];
		var children = view.getUint8(0);
		var numPoints = view.getUint32(1, true);
		node.numPoints = numPoints;
		stack.push({children: children, numPoints: numPoints, name: node.name});
		
		var decoded = [];
		
		var offset = 5;
		while(stack.length > 0){
		
			var snode = stack.shift();
			var mask = 1;
			for(var i = 0; i < 8; i++){
				if((snode.children & mask) !== 0){
					var childIndex = i;
					var childName = snode.name + i;
					
					var childChildren = view.getUint8(offset);
					var childNumPoints = view.getUint32(offset + 1, true);
					
					stack.push({children: childChildren, numPoints: childNumPoints, name: childName});
					
					decoded.push({children: childChildren, numPoints: childNumPoints, name: childName});
					
					offset += 5;
				}
				
				mask = mask * 2;
			}
			
			if(offset === hbuffer.byteLength){
				break;
			}
			
		}
		
		//console.log(decoded);
		
		var nodes = {};
		nodes[node.name] = node;
		var pco = node.pcoGeometry;
		
		
		for( var i = 0; i < decoded.length; i++){
			var name = decoded[i].name;
			var numPoints = decoded[i].numPoints;
			var index = parseInt(name.charAt(name.length-1));
			var parentName = name.substring(0, name.length-1);
			var parentNode = nodes[parentName];
			var level = name.length-1;
			var boundingBox = Potree.POCLoader.createChildAABB(parentNode.boundingBox, index);
			
			var currentNode = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
			currentNode.level = level;
			currentNode.numPoints = numPoints;
			currentNode.hasChildren = decoded[i].children > 0;
			currentNode.spacing = pco.spacing / Math.pow(2, level);
			parentNode.addChild(currentNode);
			nodes[name] = currentNode;
		}
		
		node.loadPoints();
		
	};
	if((node.level % node.pcoGeometry.hierarchyStepSize) === 0){
		//var hurl = node.pcoGeometry.octreeDir + "/../hierarchy/" + node.name + ".hrc";
		var hurl = node.pcoGeometry.octreeDir + "/" + node.getHierarchyPath() + "/" + node.name + ".hrc";
		
		var xhr = new XMLHttpRequest();
		xhr.open('GET', hurl, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					var hbuffer = xhr.response;
					callback(node, hbuffer);
				} else {
					console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
				}
			}
		};
		try{
			xhr.send(null);
		}catch(e){
			console.log("fehler beim laden der punktwolke: " + e);
		}
	}

};


Potree.PointCloudOctreeGeometryNode.prototype.getNumPoints = function(){
	return this.numPoints;
};


Potree.PointCloudOctreeGeometryNode.prototype.dispose = function(){
	if(this.geometry && this.parent != null){
		this.geometry.dispose();
		this.geometry = null;
		this.loaded = false;
		
		//this.dispatchEvent( { type: 'dispose' } );
		for(var i = 0; i < this.oneTimeDisposeHandlers.length; i++){
			var handler = this.oneTimeDisposeHandlers[i];
			handler();
		}
		this.oneTimeDisposeHandlers = [];
	}
};

//THREE.EventDispatcher.prototype.apply( Potree.PointCloudOctreeGeometryNode.prototype );
Object.assign( Potree.PointCloudOctreeGeometryNode.prototype, THREE.EventDispatcher.prototype );
Potree.PointCloudGreyhoundGeometry = function(){
	this.spacing = 0;
	this.boundingBox = null;
	this.root = null;
	this.numNodesLoading = 0;
	this.nodes = null;
	this.pointAttributes = {};
	this.hierarchyStepSize = -1;
	this.loader = null;
    this.schema = null;

	this.baseDepth = null;
	this.offset = null;
	this.projection = null;

	this.boundingSphere = null;

	//the serverURL will contain the base URL of the greyhound server. f.e. http://dev.greyhound.io/resource/autzen/
	this.serverURL = null;

    this.normalize = { color: false, intensity: false };
};

var nodesLoadTimes = {};
var baseLoaded = false;

Potree.PointCloudGreyhoundGeometryNode = function(
        name, pcoGeometry, boundingBox, scale, offset) {
	this.id = Potree.PointCloudGreyhoundGeometryNode.IDCount++;
	this.name = name;
	this.index = parseInt(name.charAt(name.length-1));
	this.pcoGeometry = pcoGeometry;
	this.geometry = null;
	this.boundingBox = boundingBox;
	this.boundingSphere = boundingBox.getBoundingSphere();
    this.scale = scale;
    this.offset = offset;
	this.children = {};
	this.numPoints = 0;
	this.level = null;
	this.loaded = false;
	this.oneTimeDisposeHandlers = [];

	let bounds = this.boundingBox.clone()
	bounds.min.sub(this.pcoGeometry.boundingBox.getCenter());
	bounds.max.sub(this.pcoGeometry.boundingBox.getCenter());

	if (this.scale) {
		bounds.min.multiplyScalar(1 / this.scale);
		bounds.max.multiplyScalar(1 / this.scale);
	}

    // This represents the bounds for this node in the reference frame of the
    // global bounds from `info`, centered around the origin, and then scaled
    // by our selected scale.
    this.greyhoundBounds = bounds;

    // This represents the offset between the coordinate system described above
    // and our pcoGeometry bounds.
    this.greyhoundOffset = this.pcoGeometry.offset.clone().add(
            this.pcoGeometry.boundingBox.getSize().multiplyScalar(0.5));
};

Potree.PointCloudGreyhoundGeometryNode.IDCount = 0;

Potree.PointCloudGreyhoundGeometryNode.prototype =
    Object.create(Potree.PointCloudTreeNode.prototype);

Potree.PointCloudGreyhoundGeometryNode.prototype.isGeometryNode = function() {
	return true;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.isTreeNode = function() {
	return false;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.isLoaded = function() {
	return this.loaded;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getBoundingSphere = function() {
	return this.boundingSphere;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getBoundingBox = function() {
	return this.boundingBox;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getLevel = function(){
	return this.level;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getChildren = function() {
	var children = [];

	for (var i = 0; i < 8; ++i) {
		if (this.children[i]) {
			children.push(this.children[i]);
		}
	}

	return children;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getURL = function() {
    var schema = this.pcoGeometry.schema;
    let bounds = this.greyhoundBounds;

    var boundsString =
        bounds.min.x + ',' + bounds.min.y + ',' + bounds.min.z + ',' +
        bounds.max.x + ',' + bounds.max.y + ',' + bounds.max.z;

    var url = ''+this.pcoGeometry.serverURL +
        'read?depthBegin=' +
        (baseLoaded ? (this.level + this.pcoGeometry.baseDepth) : 0) +
        '&depthEnd=' + (this.level + this.pcoGeometry.baseDepth + 1) +
        '&bounds=[' + boundsString + ']' +
        '&schema=' + JSON.stringify(schema) +
        '&compress=true';

    if (this.scale) {
        url += '&scale=' + this.scale;
    }

    if (this.greyhoundOffset) {
		let offset = this.greyhoundOffset;
		url += '&offset=[' + offset.x + ',' + offset.y + ',' + offset.z + ']';
	}

	if(this.level === 1){
		let a = 1;
	}

    if (!baseLoaded) baseLoaded = true;

    return url;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.addChild = function(child) {
	this.children[child.index] = child;
	child.parent = this;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.load = function(){
	if (
            this.loading === true ||
            this.loaded === true ||
            this.pcoGeometry.numNodesLoading > 3) {
		return;
	}

	this.loading = true;
	this.pcoGeometry.numNodesLoading++;

	if (
            this.level % this.pcoGeometry.hierarchyStepSize === 0 &&
            this.hasChildren) {
		this.loadHierarchyThenPoints();
	}
    else {
		this.loadPoints();
	}
};

Potree.PointCloudGreyhoundGeometryNode.prototype.loadPoints = function(){
	this.pcoGeometry.loader.load(this);
};


Potree.PointCloudGreyhoundGeometryNode.prototype.loadHierarchyThenPoints =
        function() {
    // From Greyhound (Cartesian) ordering for the octree to Potree-default
	var transform = [0, 2, 1, 3, 4, 6, 5, 7];

    var makeBitMask = function(node) {
        var mask = 0;
        Object.keys(node).forEach(function(key) {
            if      (key === 'swd') mask += 1 << transform[0];
            else if (key === 'nwd') mask += 1 << transform[1];
            else if (key === 'swu') mask += 1 << transform[2];
            else if (key === 'nwu') mask += 1 << transform[3];
            else if (key === 'sed') mask += 1 << transform[4];
            else if (key === 'ned') mask += 1 << transform[5];
            else if (key === 'seu') mask += 1 << transform[6];
            else if (key === 'neu') mask += 1 << transform[7];
        });
        return mask;
    };

    var parseChildrenCounts = function(base, parentName, stack) {
        var keys = Object.keys(base);
        var child;
        var childName;

        keys.forEach(function(key) {
            if (key === 'n') return;
            switch (key) {
                case 'swd':
                    child = base.swd; childName = parentName + transform[0];
                    break;
                case 'nwd':
                    child = base.nwd; childName = parentName + transform[1];
                    break;
                case 'swu':
                    child = base.swu; childName = parentName + transform[2];
                    break;
                case 'nwu':
                    child = base.nwu; childName = parentName + transform[3];
                    break;
                case 'sed':
                    child = base.sed; childName = parentName + transform[4];
                    break;
                case 'ned':
                    child = base.ned; childName = parentName + transform[5];
                    break;
                case 'seu':
                    child = base.seu; childName = parentName + transform[6];
                    break;
                case 'neu':
                    child = base.neu; childName = parentName + transform[7];
                    break;
                default:
                    break;
            }

            stack.push({
                children: makeBitMask(child),
                numPoints: child.n,
                name: childName
            });

            parseChildrenCounts(child, childName, stack);
        });
    };

	// Load hierarchy.
	var callback = function(node, greyhoundHierarchy) {
		var decoded = [];
		node.numPoints = greyhoundHierarchy.n;
        parseChildrenCounts(greyhoundHierarchy, node.name, decoded);

		var nodes = {};
		nodes[node.name] = node;
		var pgg = node.pcoGeometry;

		for( var i = 0; i < decoded.length; i++){
			var name = decoded[i].name;
			var numPoints = decoded[i].numPoints;
			var index = parseInt(name.charAt(name.length-1));
			var parentName = name.substring(0, name.length-1);
			var parentNode = nodes[parentName];
			var level = name.length-1;
			var boundingBox = Potree.GreyhoundLoader.createChildAABB(
                    parentNode.boundingBox, index);

			var currentNode = new Potree.PointCloudGreyhoundGeometryNode(
                    name, pgg, boundingBox, node.scale, node.offset);

			currentNode.level = level;
			currentNode.numPoints = numPoints;
			currentNode.hasChildren = decoded[i].children > 0;
			currentNode.spacing = pgg.spacing / Math.pow(2, level);
			parentNode.addChild(currentNode);
			nodes[name] = currentNode;
		}

		node.loadPoints();
	};

	if (this.level % this.pcoGeometry.hierarchyStepSize === 0) {
        var depthBegin = this.level + this.pcoGeometry.baseDepth;
        var depthEnd = depthBegin + this.pcoGeometry.hierarchyStepSize + 2;

        let bounds = this.greyhoundBounds;

        var boundsString =
            bounds.min.x + ',' + bounds.min.y + ',' + bounds.min.z + ',' +
            bounds.max.x + ',' + bounds.max.y + ',' + bounds.max.z;

		var hurl = '' + this.pcoGeometry.serverURL +
            'hierarchy?bounds=[' + boundsString + ']' +
            '&depthBegin=' + depthBegin +
            '&depthEnd=' + depthEnd;

		if (this.scale) {
			hurl += '&scale=' + this.scale;
		}

        if (this.greyhoundOffset) {
            let offset = this.greyhoundOffset;
			hurl += '&offset=[' + offset.x + ',' + offset.y + ',' + offset.z + ']';
		}

		var xhr = new XMLHttpRequest();
		xhr.open('GET', hurl, true);

        var that = this;
		xhr.onreadystatechange = function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
                    var greyhoundHierarchy = JSON.parse(xhr.responseText) || { };
                    callback(that, greyhoundHierarchy);
				} else {
                    console.log(
                            'Failed to load file! HTTP status:', xhr.status,
                            'file:', hurl);
				}
			}
		};

		try {
			xhr.send(null);
		}
        catch(e) {
			console.log("fehler beim laden der punktwolke: " + e);
		}
	}
};


Potree.PointCloudGreyhoundGeometryNode.prototype.getNumPoints = function(){
	return this.numPoints;
};


Potree.PointCloudGreyhoundGeometryNode.prototype.dispose = function(){
	if (this.geometry && this.parent != null) {
		this.geometry.dispose();
		this.geometry = null;
		this.loaded = false;

		//this.dispatchEvent( { type: 'dispose' } );
		for (var i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
			var handler = this.oneTimeDisposeHandlers[i];
			handler();
		}
		this.oneTimeDisposeHandlers = [];
	}
};

//THREE.EventDispatcher.prototype.apply(
//        Potree.PointCloudGreyhoundGeometryNode.prototype);
Object.assign( Potree.PointCloudGreyhoundGeometryNode.prototype, THREE.EventDispatcher.prototype );




Potree.utils = class{
	
	static loadShapefileFeatures(file, callback){
		
		let features = [];
			
		let handleFinish = () => {
			callback(features);
		};
		
		shapefile.open(file)
		.then(source => {source.read()
			.then(function log(result){
				if(result.done){
					handleFinish();
					return;
				}
				
				//console.log(result.value);
				
				if(result.value && result.value.type === "Feature" && result.value.geometry !== undefined){
					features.push(result.value);
				}
			
				return source.read().then(log);
			})
		});
	}
	
	static toString(value){
		if(value instanceof THREE.Vector3){
			return value.x.toFixed(2) + ", " + value.y.toFixed(2) + ", " + value.z.toFixed(2);
		}else{
			return "" + value + "";
		}
	}
	
	static normalizeURL(url){
		let u = new URL(url);
		
		return u.protocol + "//" + u.hostname + u.pathname.replace(/\/+/g, "/");
	};

	static pathExists(url){
		let req = new XMLHttpRequest();
		req.open('GET', url, false);
		req.send(null);
		if (req.status !== 200) {
			return false;
		}
		return true;
	};

	/**
	 * adapted from mhluska at https://github.com/mrdoob/three.js/issues/1561
	 */
	static computeTransformedBoundingBox(box, transform){

		let vertices = [
			new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(transform)
		];
		
		let boundingBox = new THREE.Box3();
		boundingBox.setFromPoints( vertices );
		
		return boundingBox;
	};

	/**
	 * add separators to large numbers
	 * 
	 * @param nStr
	 * @returns
	 */
	static addCommas(nStr){
		nStr += '';
		let x = nStr.split('.');
		let x1 = x[0];
		let x2 = x.length > 1 ? '.' + x[1] : '';
		let rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	};
	
	static removeCommas(str){
		return str.replace(/,/g, "");
	}

	/**
	 * create worker from a string
	 *
	 * code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
	 */
	static createWorker(code){
		 let blob = new Blob([code], {type: 'application/javascript'});
		 let worker = new Worker(URL.createObjectURL(blob));
		 
		 return worker;
	};

	static loadSkybox(path){
		let camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100000 );
		camera.up.set(0, 0, 1);
		let scene = new THREE.Scene();

		let format = ".jpg";
		let urls = [
			path + 'px' + format, path + 'nx' + format,
			path + 'py' + format, path + 'ny' + format,
			path + 'pz' + format, path + 'nz' + format
		];
		
		//var materialArray = [];
		//for (var i = 0; i < 6; i++){
		//	materialArray.push( new THREE.MeshBasicMaterial({
		//		map: THREE.ImageUtils.loadTexture( urls[i] ),
		//		side: THREE.BackSide,
		//		depthTest: false,
		//		depthWrite: false
		//		})
		//	);
		//}
		
		let materialArray = [];
		{
			for (let i = 0; i < 6; i++){
				
				let material = new THREE.MeshBasicMaterial({
					map: null,
					side: THREE.BackSide,
					depthTest: false,
					depthWrite: false
				});
				
				materialArray.push(material);
				
				let loader = new THREE.TextureLoader();
				loader.load( urls[i],
					function loaded(texture){
						material.map = texture;
						material.needsUpdate = true;
					},function progress(xhr){
						//console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
					},function error(xhr){
						console.log( 'An error happened', xhr );
					}
				);
			}
			
			
		}
		
		var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );
		var skybox = new THREE.Mesh( skyGeometry, materialArray );

		scene.add(skybox);
		
		// z up
		scene.rotation.x = Math.PI / 2;
		
		return {"camera": camera, "scene": scene};
	};

	static createGrid(width, length, spacing, color){
		let material = new THREE.LineBasicMaterial({
			color: color || 0x888888
		});
		
		let geometry = new THREE.Geometry();
		for(let i = 0; i <= length; i++){
			 geometry.vertices.push(new THREE.Vector3(-(spacing*width)/2, i*spacing-(spacing*length)/2, 0));
			 geometry.vertices.push(new THREE.Vector3(+(spacing*width)/2, i*spacing-(spacing*length)/2, 0));
		}
		
		for(let i = 0; i <= width; i++){
			 geometry.vertices.push(new THREE.Vector3(i*spacing-(spacing*width)/2, -(spacing*length)/2, 0));
			 geometry.vertices.push(new THREE.Vector3(i*spacing-(spacing*width)/2, +(spacing*length)/2, 0));
		}
		
		let line = new THREE.LineSegments(geometry, material, THREE.LinePieces);
		line.receiveShadow = true;
		return line;
	};


	static createBackgroundTexture(width, height){

		function gauss(x, y){
			return (1 / (2 * Math.PI)) * Math.exp( - (x*x + y*y) / 2);
		};

		//map.magFilter = THREE.NearestFilter;
		let size = width * height;
		let data = new Uint8Array( 3 * size );

		let chroma = [1, 1.5, 1.7];
		let max = gauss(0, 0);

		for(let x = 0; x < width; x++){
			for(let y = 0; y < height; y++){
				let u = 2 * (x / width) - 1;
				let v = 2 * (y / height) - 1;
				
				let i = x + width*y;
				let d = gauss(2*u, 2*v) / max;
				let r = (Math.random() + Math.random() + Math.random()) / 3;
				r = (d * 0.5 + 0.5) * r * 0.03;
				r = r * 0.4;
				
				//d = Math.pow(d, 0.6);
				
				data[3*i+0] = 255 * (d / 15 + 0.05 + r) * chroma[0];
				data[3*i+1] = 255 * (d / 15 + 0.05 + r) * chroma[1];
				data[3*i+2] = 255 * (d / 15 + 0.05 + r) * chroma[2];
			}
		}
		
		let texture = new THREE.DataTexture( data, width, height, THREE.RGBFormat );
		texture.needsUpdate = true;
		
		return texture;
	};

	static getMousePointCloudIntersection(mouse, camera, renderer, pointclouds){
		let nmouse =  {
			x: (mouse.x / renderer.domElement.clientWidth ) * 2 - 1,
			y: - (mouse.y / renderer.domElement.clientHeight ) * 2 + 1
		};
		
		//let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
		//vector.unproject(camera);

		//let direction = vector.sub(camera.position).normalize();
		//let ray = new THREE.Ray(camera.position, direction);
		
		let raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(nmouse, camera);
		let ray = raycaster.ray;
		
		let selectedPointcloud = null;
		let closestDistance = Infinity;
		let closestIntersection = null;
		let closestPoint = null;
		
		for(let pointcloud of pointclouds){
			let point = pointcloud.pick(renderer, camera, ray);
			
			if(!point){
				continue;
			}
			
			let distance = camera.position.distanceTo(point.position);
			
			if(distance < closestDistance){
				closestDistance = distance;
				selectedPointcloud = pointcloud;
				closestIntersection = point.position;
				closestPoint = point;
			}
		}
		
		if(selectedPointcloud){
			return {
				location: closestIntersection,
				distance: closestDistance,
				pointcloud: selectedPointcloud,
				point: closestPoint
			};
		}else{
			return null;
		}
	};	
		
	static pixelsArrayToImage(pixels, width, height){
		let canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		let context = canvas.getContext('2d');
		
		pixels = new pixels.constructor(pixels);
		
		for(let i = 0; i < pixels.length; i++){
			pixels[i*4 + 3] = 255;
		}

		let imageData = context.createImageData(width, height);
		imageData.data.set(pixels);
		context.putImageData(imageData, 0, 0);

		let img = new Image();
		img.src = canvas.toDataURL();
		//img.style.transform = "scaleY(-1)";
		
		return img;
	};

	static projectedRadius(radius, fov, distance, screenHeight){
		let projFactor =  (1 / Math.tan(fov / 2)) / distance;
		projFactor = projFactor * screenHeight / 2;
		
		return radius * projFactor;
	};
		
		
	static topView(camera, node){
		camera.position.set(0, 1, 0);
		camera.rotation.set(-Math.PI / 2, 0, 0);
		camera.zoomTo(node, 1);
	};

	static frontView(camera, node){
		camera.position.set(0, 0, 1);
		camera.rotation.set(0, 0, 0);
		camera.zoomTo(node, 1);
	};


	static leftView(camera, node){
		camera.position.set(-1, 0, 0);
		camera.rotation.set(0, -Math.PI / 2, 0);
		camera.zoomTo(node, 1);
	};

	static rightView(camera, node){
		camera.position.set(1, 0, 0);
		camera.rotation.set(0, Math.PI / 2, 0);
		camera.zoomTo(node, 1);
	};
		
	/**
	 *  
	 * 0: no intersection
	 * 1: intersection
	 * 2: fully inside
	 */
	static frustumSphereIntersection(frustum, sphere){
		let planes = frustum.planes;
		let center = sphere.center;
		let negRadius = - sphere.radius;

		let minDistance = Number.MAX_VALUE;
		
		for ( let i = 0; i < 6; i ++ ) {

			let distance = planes[ i ].distanceToPoint( center );

			if ( distance < negRadius ) {

				return 0;

			}
			
			minDistance = Math.min(minDistance, distance);

		}

		return (minDistance >= sphere.radius) ? 2 : 1;
	};
		
	// code taken from three.js
	// ImageUtils - generateDataTexture()
	static generateDataTexture(width, height, color){
		let size = width * height;
		let data = new Uint8Array(3 * width * height);
		
		let r = Math.floor( color.r * 255 );
		let g = Math.floor( color.g * 255 );
		let b = Math.floor( color.b * 255 );
		
		for ( let i = 0; i < size; i ++ ) {
			data[ i * 3 ] 	   = r;
			data[ i * 3 + 1 ] = g;
			data[ i * 3 + 2 ] = b;
		}
		
		let texture = new THREE.DataTexture( data, width, height, THREE.RGBFormat );
		texture.needsUpdate = true;
		texture.magFilter = THREE.NearestFilter;
		
		return texture;
	};
		
	// from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
	static getParameterByName(name) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
		return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
	}
	
	static setParameter(name, value){
		//value = encodeURIComponent(value);
		
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		let regex = new RegExp("([\\?&])(" + name + "=([^&#]*))");
		let results = regex.exec(location.search);

		let url = window.location.href;
		if(results === null){
			if(window.location.search.length === 0){
				url = url + "?";
			}else{
				url = url + "&";
			}

			url = url + name + "=" + value;
		}else{
			let newValue = name + "=" + value;
			url = url.replace(results[2], newValue);
		}
		window.history.replaceState({}, "", url);
	}
	
};

Potree.utils.screenPass = new function(){

	this.screenScene = new THREE.Scene();
	this.screenQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 0));
	this.screenQuad.material.depthTest = true;
	this.screenQuad.material.depthWrite = true;
	this.screenQuad.material.transparent = true;
	this.screenScene.add(this.screenQuad);
	this.camera = new THREE.Camera();
	
	this.render = function(renderer, material, target){
		this.screenQuad.material = material;
		
		if(typeof target === "undefined"){
			renderer.render(this.screenScene, this.camera);
		}else{
			renderer.render(this.screenScene, this.camera, target);
		}
	};
}();




Potree.Features = function(){

	var ftCanvas = document.createElement("canvas");
	var gl = ftCanvas.getContext("webgl") || ftCanvas.getContext("experimental-webgl");
	if (gl === null)
		return null;

	// -- code taken from THREE.WebGLRenderer --
	var _vertexShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.HIGH_FLOAT );
	var _vertexShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.MEDIUM_FLOAT );
	var _vertexShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat( gl.VERTEX_SHADER, gl.LOW_FLOAT );

	var _fragmentShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.HIGH_FLOAT );
	var _fragmentShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT );
	var _fragmentShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat( gl.FRAGMENT_SHADER, gl.LOW_FLOAT );

	var highpAvailable = _vertexShaderPrecisionHighpFloat.precision > 0 && _fragmentShaderPrecisionHighpFloat.precision > 0;
	var mediumpAvailable = _vertexShaderPrecisionMediumpFloat.precision > 0 && _fragmentShaderPrecisionMediumpFloat.precision > 0;
	// -----------------------------------------

	var precision;
	if(highpAvailable){
		precision = "highp";
	}else if(mediumpAvailable){
		precision = "mediump";
	}else{
		precision = "lowp";
	}

	return {
		SHADER_INTERPOLATION: {
			isSupported: function(){

				var supported = true;

				supported = supported && gl.getExtension("EXT_frag_depth");
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

				return supported;
			}
		},
		SHADER_SPLATS: {
			isSupported: function(){

				var supported = true;

				supported = supported && gl.getExtension("EXT_frag_depth");
				supported = supported && gl.getExtension("OES_texture_float");
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

				return supported;

			}

		},
		SHADER_EDL: {
			isSupported: function(){
				
				var supported = true;
				
				supported = supported && gl.getExtension("EXT_frag_depth");
				supported = supported && gl.getExtension("OES_texture_float");
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;
				
				return supported;
				
			}
		
		},
		precision: precision
	};

}();

/**
 * adapted from http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
 */

Potree.TextSprite = function(text){

	THREE.Object3D.call(this);
	
	var scope = this;

	var texture = new THREE.Texture();
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	var spriteMaterial = new THREE.SpriteMaterial( { 
		map: texture, 
		//useScreenCoordinates: false,
		depthTest: false,
		depthWrite: false} );
	
	this.material = spriteMaterial;
	this.sprite = new THREE.Sprite(spriteMaterial);
	this.add(this.sprite);
	
	//THREE.Sprite.call(this, spriteMaterial);
	
	this.borderThickness = 4;
	this.fontface = "Arial";
	this.fontsize = 28;
	this.borderColor = { r:0, g:0, b:0, a:1.0 };
	this.backgroundColor = { r:255, g:255, b:255, a:1.0 };
	this.textColor = {r: 255, g: 255, b: 255, a: 1.0};
	this.text = "";
	
	this.setText(text);
};

Potree.TextSprite.prototype = new THREE.Object3D();

Potree.TextSprite.prototype.setText = function(text){
	if(this.text !== text){
		this.text = text;
		
		this.update();
	}
};

Potree.TextSprite.prototype.setTextColor = function(color){
	this.textColor = color;
	
	this.update();
};

Potree.TextSprite.prototype.setBorderColor = function(color){
	this.borderColor = color;
	
	this.update();
};

Potree.TextSprite.prototype.setBackgroundColor = function(color){
	this.backgroundColor = color;
	
	this.update();
};

Potree.TextSprite.prototype.update = function(){

	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + this.fontsize + "px " + this.fontface;
	
	// get size data (height depends only on font size)
	var metrics = context.measureText( this.text );
	var textWidth = metrics.width;
	var margin = 5;
	var spriteWidth = 2*margin + textWidth + 2 * this.borderThickness;
	var spriteHeight = this.fontsize * 1.4 + 2 * this.borderThickness;
	
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.canvas.width = spriteWidth;
	context.canvas.height = spriteHeight;
	context.font = "Bold " + this.fontsize + "px " + this.fontface;
	
	// background color
	context.fillStyle   = "rgba(" + this.backgroundColor.r + "," + this.backgroundColor.g + ","
								  + this.backgroundColor.b + "," + this.backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + this.borderColor.r + "," + this.borderColor.g + ","
								  + this.borderColor.b + "," + this.borderColor.a + ")";
								  
	context.lineWidth = this.borderThickness;
	this.roundRect(context, this.borderThickness/2, this.borderThickness/2, 
		textWidth + this.borderThickness + 2*margin, this.fontsize * 1.4 + this.borderThickness, 6);						  
		
	// text color
	context.strokeStyle = "rgba(0, 0, 0, 1.0)";
	context.strokeText( this.text, this.borderThickness + margin, this.fontsize + this.borderThickness);
	
	context.fillStyle = "rgba(" + this.textColor.r + "," + this.textColor.g + ","
								  + this.textColor.b + "," + this.textColor.a + ")";
	context.fillText( this.text, this.borderThickness + margin, this.fontsize + this.borderThickness);
	
								  
	var texture = new THREE.Texture(canvas); 
	texture.minFilter = THREE.LinearFilter;
	texture.magFilter = THREE.LinearFilter;
	texture.needsUpdate = true;	
	
	//var spriteMaterial = new THREE.SpriteMaterial( 
	//	{ map: texture, useScreenCoordinates: false } );
	this.sprite.material.map = texture;
		
	this.sprite.scale.set(spriteWidth*0.01,spriteHeight*0.01,1.0);
		
	//this.material = spriteMaterial;						  
};

Potree.TextSprite.prototype.roundRect = function(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x+r, y);
	ctx.lineTo(x+w-r, y);
	ctx.quadraticCurveTo(x+w, y, x+w, y+r);
	ctx.lineTo(x+w, y+h-r);
	ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
	ctx.lineTo(x+r, y+h);
	ctx.quadraticCurveTo(x, y+h, x, y+h-r);
	ctx.lineTo(x, y+r);
	ctx.quadraticCurveTo(x, y, x+r, y);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();   
};

// 
// TODO 
// 
// - option to look along path during animation
// - 
// 


Potree.AnimationPath = class{
	
	constructor(points = []){
		this.points = points;
		this.spline = new THREE.Spline(points);
		this.spline.reparametrizeByArcLength(1 / this.spline.getLength().total);
		this.tween = null;
	}
	
	get(t){
		return this.spline.getPoint(t);
	}
	
	animate(metersPerSecond = 1){
		
		stop();
		
		let length = this.spline.getLength().total;
		let animationDuration = (1000 * length) / metersPerSecond;

		let progress = {t: 0};
		this.tween = new TWEEN.Tween(progress).to({t: 1}, animationDuration);
		this.tween.easing(TWEEN.Easing.Linear.None);
		this.tween.onUpdate((e) => {
			viewer.scene.view.position.copy(this.spline.getPoint(progress.t));
		});
		
		this.tween.start();
	}
	
	stop(){
		if(this.tween){
			this.tween.stop();
		}
	}
	
	resume(){
		if(this.tween){
			this.tween.start();
		}
	}
	
	getGeometry(){
		let geometry = new THREE.Geometry();
		
		let samples = 100;
		let i = 0;
		for(let u = 0; u <= 1; u += 1 / samples){
			let position = this.spline.getPoint(u);
			geometry.vertices[i] = new THREE.Vector3( position.x, position.y, position.z );
			
			i++;
		}
		
		return geometry;
		
		//let material = new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 1, linewidth: 2 } );
		//let line = new THREE.Line(geometry, material);
		//viewer.scene.scene.add(line);
	}
};



//let target = new THREE.Vector3(589854.34, 231411.19, 692.77)
//let points = [
//	new THREE.Vector3(589815.52, 231738.31, 959.48 ),
//	new THREE.Vector3(589604.73, 231615.00, 968.10 ),
//	new THREE.Vector3(589579.11, 231354.41, 1010.06),
//	new THREE.Vector3(589723.00, 231169.95, 1015.57),
//	new THREE.Vector3(589960.76, 231116.87, 978.60 ),
//	new THREE.Vector3(590139.29, 231268.71, 972.33 )
//]
//
//let path = new Potree.AnimationPath(points);

Potree.Version = function(version){
	this.version = version;
	var vmLength = (version.indexOf(".") === -1) ? version.length : version.indexOf(".");
	this.versionMajor = parseInt(version.substr(0, vmLength));
	this.versionMinor = parseInt(version.substr(vmLength + 1));
	if(this.versionMinor.length === 0){
		this.versionMinor = 0;
	}
	
};

Potree.Version.prototype.newerThan = function(version){
	var v = new Potree.Version(version);
	
	if( this.versionMajor > v.versionMajor){
		return true;
	}else if( this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor){
		return true;
	}else{
		return false;
	}
};

Potree.Version.prototype.equalOrHigher = function(version){
	var v = new Potree.Version(version);
	
	if( this.versionMajor > v.versionMajor){
		return true;
	}else if( this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor){
		return true;
	}else{
		return false;
	}
};

Potree.Version.prototype.upTo = function(version){
	return !this.newerThan(version);
};

Potree.Measure = class Measure extends THREE.Object3D{
	constructor(){
		super();
		
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		
		this.name = "Measure_" + this.constructor.counter;
		this.points = [];
		this._showDistances = true;
		this._showCoordinates = false;
		this._showArea = false;
		this._closed = true;
		this._showAngles = false;
		this._showHeight = false;
		this.maxMarkers = Number.MAX_SAFE_INTEGER;
		
		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		this.color = new THREE.Color( 0xff0000 );

		this.lengthUnit = {code: "m"};
		
		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = [];
		this.angleLabels = [];
		this.coordinateLabels = [];
		
		this.heightEdge;
		this.heightLabel;
		{ // height stuff
			
			{ // height line
				let lineGeometry = new THREE.Geometry();
				lineGeometry.vertices.push(
					new THREE.Vector3(), 
					new THREE.Vector3(), 
					new THREE.Vector3(), 
					new THREE.Vector3());
				lineGeometry.colors.push(this.color, this.color, this.color);
				let lineMaterial = new THREE.LineDashedMaterial( 
					{ color: 0xff0000, dashSize: 5, gapSize: 2 } );
				
				lineMaterial.depthTest = false;
				this.heightEdge = new THREE.Line(lineGeometry, lineMaterial);
				this.heightEdge.visible = false;
				
				this.add(this.heightEdge);
			}
			
			{ // height label
				this.heightLabel = new Potree.TextSprite("");
				this.heightLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
				this.heightLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
				this.heightLabel.setTextColor({r:180, g:220, b:180, a:1.0});
				this.heightLabel.material.depthTest = false;
				this.heightLabel.material.opacity = 1;
				this.heightLabel.visible = false;;
				this.add(this.heightLabel);
			}
		}
		
		this.areaLabel = new Potree.TextSprite("");
		this.areaLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
		this.areaLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
		this.areaLabel.setTextColor({r:180, g:220, b:180, a:1.0});
		this.areaLabel.material.depthTest = false;
		this.areaLabel.material.opacity = 1;
		this.areaLabel.visible = false;;
		this.add(this.areaLabel);
		
		
	}
	
	createSphereMaterial(){
		let sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: this.color, 
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};
	
	addMarker(point){
		if(point instanceof THREE.Vector3){
			point = {position: point};
		}
		this.points.push(point);
		
		// sphere
		let sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());
		
		this.add(sphere);
		this.spheres.push(sphere);
		
		{ // edges
			let lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(this.color, this.color, this.color);
			let lineMaterial = new THREE.LineBasicMaterial( { 
				linewidth: 1
			});
			lineMaterial.depthTest = false;
			let edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = true;
			
			this.add(edge);
			this.edges.push(edge);
		}
		
		
		{ // edge labels
			let edgeLabel = new Potree.TextSprite();
			edgeLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
			edgeLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
			edgeLabel.material.depthTest = false;
			edgeLabel.visible = false;
			this.edgeLabels.push(edgeLabel);
			this.add(edgeLabel);
		}
		
		{ // angle labels
			let angleLabel = new Potree.TextSprite();
            angleLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
			angleLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
            angleLabel.material.depthTest = false;
            angleLabel.material.opacity = 1;
			angleLabel.visible = false;
			this.angleLabels.push(angleLabel);
			this.add(angleLabel);
		}
		
		{ // coordinate labels
			let coordinateLabel = new Potree.TextSprite();
			coordinateLabel.setBorderColor({r:0, g:0, b:0, a:0.8});
			coordinateLabel.setBackgroundColor({r:0, g:0, b:0, a:0.3});
			coordinateLabel.material.depthTest = false;
			coordinateLabel.material.opacity = 1;
			coordinateLabel.visible = false;
			this.coordinateLabels.push(coordinateLabel);
			this.add(coordinateLabel);
		}
		
		{ // Event Listeners
			let drag = (e) => {
				let I = Potree.utils.getMousePointCloudIntersection(
					e.drag.end, 
					e.viewer.scene.camera, 
					e.viewer.renderer, 
					e.viewer.scene.pointclouds);
				
				if(I){
					let i = this.spheres.indexOf(e.drag.object);
					if(i !== -1){
						
						let point = this.points[i];
						for(let key of Object.keys(I.point).filter(e => e !== "position")){
							point[key] = I.point[key];
						}
						
						this.setPosition(i, I.location);
					}
				}
			};
			
			let drop = e => {
				let i = this.spheres.indexOf(e.drag.object);
				if(i !== -1){
					this.dispatchEvent({
						"type": "marker_dropped",
						"measurement": this,
						"index": i
					});
				}
			};
			
			let mouseover = (e) => e.object.material.emissive.setHex(0x888888);
			let mouseleave = (e) => e.object.material.emissive.setHex(0x000000);
			
			sphere.addEventListener("drag", drag);
			sphere.addEventListener("drop", drop);
			sphere.addEventListener("mouseover", mouseover);
			sphere.addEventListener("mouseleave", mouseleave);
		}

		let event = {
			type: "marker_added",
			measurement: this,
			sphere: sphere
		};
		this.dispatchEvent(event);
		
		this.setMarker(this.points.length-1, point);
	};
	
	removeMarker(index){
		this.points.splice(index, 1);
		
		this.remove(this.spheres[index]);
		
		let edgeIndex = (index === 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		
		this.remove(this.edgeLabels[edgeIndex]);
		this.edgeLabels.splice(edgeIndex, 1);
		this.coordinateLabels.splice(index, 1);
		
		this.spheres.splice(index, 1);
		
		this.update();
		
		this.dispatchEvent({type: "marker_removed", measurement: this});
	};
	
	setMarker(index, point){
		this.points[index] = point;
		
		let event = {
			type: 		'marker_moved',
			measure:	this,
			index:		index,
			position: 	point.position.clone()
		};
		this.dispatchEvent(event);
		
		this.update();
	}
	
	setPosition(index, position){
		let point = this.points[index];			
		point.position.copy(position);
		
		let event = {
			type: 		'marker_moved',
			measure:	this,
			index:		index,
			position: 	position.clone()
		};
		this.dispatchEvent(event);
		
		this.update();
	};
	
	getArea(){
		let area = 0;
		let j = this.points.length - 1;
		
		for(let i = 0; i < this.points.length; i++){
			let p1 = this.points[i].position;
			let p2 = this.points[j].position;
			area += (p2.x + p1.x) * (p1.y - p2.y);
			j = i;
		}
		
		return Math.abs(area / 2);
	};
	
	getTotalDistance(){
		
		if(this.points.length === 0){
			return 0;
		}
		
		let distance = 0;
		
		for(let i = 1; i < this.points.length; i++){
			let prev = this.points[i-1].position;
			let curr = this.points[i].position;
			let d = prev.distanceTo(curr);
			
			distance += d;
		}
		
		if(this.closed && this.points.length > 1){
			let first = this.points[0].position;
			let last = this.points[this.points.length - 1].position;
			let d = last.distanceTo(first);
			
			distance += d;
		}
		
		return distance;
	}
	
	getAngleBetweenLines(cornerPoint, point1, point2) {
        let v1 = new THREE.Vector3().subVectors(point1.position, cornerPoint.position);
        let v2 = new THREE.Vector3().subVectors(point2.position, cornerPoint.position);
        return v1.angleTo(v2);
    };
	
	getAngle(index){
	
		if(this.points.length < 3 || index >= this.points.length){
			return 0;
		}
		
		let previous = (index === 0) ? this.points[this.points.length-1] : this.points[index-1];
		let point = this.points[index];
		let next = this.points[(index + 1) % (this.points.length)];
		
		return this.getAngleBetweenLines(point, previous, next);
	};
	
	update(){
	
		if(this.points.length === 0){
			return;
		}else if(this.points.length === 1){
			let point = this.points[0];
			let position = point.position;
			this.spheres[0].position.copy(position);
			
			{// coordinate labels
				let coordinateLabel = this.coordinateLabels[0];
				
				let labelPos = position.clone().add(new THREE.Vector3(0,1,0));
				coordinateLabel.position.copy(labelPos);
				
				/*let msg = Potree.utils.addCommas(position.x.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(position.y.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(position.z.toFixed(2));*/
				let msg = Potree.utils.addCommas(position.z.toFixed(2) + " " + this.lengthUnit.code);
				coordinateLabel.setText(msg);
				
				coordinateLabel.visible = this.showCoordinates;
			}
			
			return;
		}
		
		let lastIndex = this.points.length - 1;
		
		let centroid = new THREE.Vector3();
		for(let i = 0; i <= lastIndex; i++){
			let point = this.points[i];
			centroid.add(point.position);
		}
		centroid.divideScalar(this.points.length);
		
		for(let i = 0; i <= lastIndex; i++){
			let index = i;
			let nextIndex = ( i + 1 > lastIndex ) ? 0 : i + 1;
			let previousIndex = (i === 0) ? lastIndex : i - 1;
		
			let point = this.points[index];
			let nextPoint = this.points[nextIndex];
			let previousPoint = this.points[previousIndex];
			
			let sphere = this.spheres[index];
			
			// spheres
			sphere.position.copy(point.position);
			sphere.material.color = this.color;

			{// edges
				let edge = this.edges[index];
				
				edge.material.color = this.color;
				
				edge.position.copy(point.position);
				
				edge.geometry.vertices[0].set(0, 0, 0);
				edge.geometry.vertices[1].copy(nextPoint.position).sub(point.position);
				
				edge.geometry.verticesNeedUpdate = true;
				edge.geometry.computeBoundingSphere();
				edge.visible = index < lastIndex || this.closed;
			}
			
			{// edge labels
				let edgeLabel = this.edgeLabels[i];
			
				let center = new THREE.Vector3().add(point.position);
				center.add(nextPoint.position);
				center = center.multiplyScalar(0.5);
				let distance = point.position.distanceTo(nextPoint.position);
				
				edgeLabel.position.copy(center);
				edgeLabel.setText(Potree.utils.addCommas(distance.toFixed(2)) + " " + this.lengthUnit.code);
				edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
			}
			
			{// angle labels
				let angleLabel = this.angleLabels[i];
				let angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);
				
				let dir = nextPoint.position.clone().sub(previousPoint.position);
				dir.multiplyScalar(0.5);
				dir = previousPoint.position.clone().add(dir).sub(point.position).normalize();
				
				let dist = Math.min(point.position.distanceTo(previousPoint.position), point.position.distanceTo(nextPoint.position));
				dist = dist / 9;
				
				let labelPos = point.position.clone().add(dir.multiplyScalar(dist));
				angleLabel.position.copy(labelPos);
				
				let msg = Potree.utils.addCommas((angle*(180.0/Math.PI)).toFixed(1)) + '\u00B0';
				angleLabel.setText(msg);
				
				angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
			}
			
			{// coordinate labels
				let coordinateLabel = this.coordinateLabels[0];
				
				let labelPos = point.position.clone().add(new THREE.Vector3(0,1,0));
				coordinateLabel.position.copy(labelPos);
				
				/*let msg = Potree.utils.addCommas(point.position.x.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(point.position.y.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(point.position.z.toFixed(2));*/

				let msg = Potree.utils.addCommas(point.position.z.toFixed(2) + " " + this.lengthUnit.code);
				coordinateLabel.setText(msg);
				
				//coordinateLabel.visible = this.showCoordinates && (index < lastIndex || this.closed);
				coordinateLabel.visible = this.showCoordinates;
			}
		}

		{ // update height stuff
			let heightEdge = this.heightEdge;
			heightEdge.visible = this.showHeight;
			this.heightLabel.visible = this.showHeight;
			
			if(this.showHeight){
				let sorted = this.points.slice().sort( (a, b) => a.position.z - b.position.z );
				let lowPoint = sorted[0].position.clone();
				let highPoint = sorted[sorted.length - 1].position.clone();
				let min = lowPoint.z;
				let max = highPoint.z;
				let height = max - min;
				
				let start = new THREE.Vector3(highPoint.x, highPoint.y, min);
				let end = new THREE.Vector3(highPoint.x, highPoint.y, max);
				
				heightEdge.position.copy(lowPoint);
				
				heightEdge.geometry.vertices[0].set(0, 0, 0);
				heightEdge.geometry.vertices[1].copy(start).sub(lowPoint);
				heightEdge.geometry.vertices[2].copy(start).sub(lowPoint);
				heightEdge.geometry.vertices[3].copy(end).sub(lowPoint);
				
				heightEdge.geometry.verticesNeedUpdate = true;
				//heightEdge.geometry.computeLineDistances();
				//heightEdge.geometry.lineDistancesNeedUpdate = true;
				heightEdge.geometry.computeBoundingSphere();
				
				//heightEdge.material.dashSize = height / 40;
				//heightEdge.material.gapSize = height / 40;
				
				
				let heightLabelPosition = start.clone().add(end).multiplyScalar(0.5);
				this.heightLabel.position.copy(heightLabelPosition);
				let msg = Potree.utils.addCommas(height.toFixed(2)) + " " + this.lengthUnit.code;
				this.heightLabel.setText(msg);
			}
			
		}
		
		{ // update area label
			this.areaLabel.position.copy(centroid);
			this.areaLabel.visible = this.showArea && this.points.length >= 3;
			let msg = Potree.utils.addCommas(this.getArea().toFixed(1)) + " " + this.lengthUnit.code + "\u00B2";
			this.areaLabel.setText(msg);
		}
	};
	
	raycast(raycaster, intersects){
		
		for(let i = 0; i < this.points.length; i++){
			let sphere = this.spheres[i];
			
			sphere.raycast(raycaster, intersects);
		}
		
		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for(let i = 0; i < intersects.length; i++){
			let I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort( function ( a, b ) { return a.distance - b.distance;} );
	};
	
	get showCoordinates(){
		return this._showCoordinates;
	}
	
	set showCoordinates(value){
		this._showCoordinates = value;
		this.update();
	}
	
	get showAngles(){
		return this._showAngles;
	}
	
	set showAngles(value){
		this._showAngles = value;
		this.update();
	}
	
	get showHeight(){
		return this._showHeight;
	}
	
	set showHeight(value){
		this._showHeight = value;
		this.update();
	}
	
	get showArea(){
		return this._showArea;
	}
	
	set showArea(value){
		this._showArea = value;
		this.update();
	}
	
	get closed(){
		return this._closed;
	}
	
	set closed(value){
		this._closed = value;
		this.update();
	}
	
	get showDistances(){
		return this._showDistances;
	}
	
	set showDistances(value){
		this._showDistances = value;
		this.update();
	}
};


Potree.MeasuringTool = class MeasuringTool extends THREE.EventDispatcher{
	
	constructor(viewer){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.addEventListener("start_inserting_measurement", e => {
			this.viewer.dispatchEvent({
				type: "cancel_insertions"
			});
		});
		
		this.sceneMeasurement = new THREE.Scene();
		this.sceneMeasurement.name = "scene_measurement";
		this.light = new THREE.PointLight( 0xffffff, 1.0 );
		this.sceneMeasurement.add(this.light);
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneMeasurement);
		
		this.onRemove = (e) => {this.sceneMeasurement.remove(e.measurement)};
		this.onAdd = e => {this.sceneMeasurement.add(e.measurement)};
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		}
		
		if(this.scene){
			this.scene.removeEventListener("measurement_added", this.onAdd);
			this.scene.removeEventListener("measurement_removed", this.onRemove);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("measurement_added", this.onAdd);
		this.scene.addEventListener("measurement_removed", this.onRemove);
		
	}
	
	startInsertion(args = {}){
		
		let domElement = this.viewer.renderer.domElement;
		
		let measure = new Potree.Measure();
		
		this.dispatchEvent({
			type: "start_inserting_measurement",
			measure: measure
		});

		measure.showDistances =  (args.showDistances == null) ? true : args.showDistances;
		measure.showArea = args.showArea || false;
		measure.showAngles = args.showAngles || false;
		measure.showCoordinates = args.showCoordinates || false;
		measure.showHeight = args.showHeight || false;
		measure.closed = args.closed || false;
		measure.maxMarkers = args.maxMarkers || Infinity;
		measure.name = args.name || "Measurement";
		
		this.sceneMeasurement.add(measure);
		
		let cancel = {
			removeLastMarker: measure.maxMarkers > 3,
			callback: null
		};
		
		let insertionCallback = (e) => {
			if(e.button === THREE.MOUSE.LEFT){
				
				measure.addMarker(measure.points[measure.points.length - 1].position.clone());
				
				if(measure.points.length >= measure.maxMarkers){
					cancel.callback();
				}
				
				this.viewer.inputHandler.startDragging(
					measure.spheres[measure.spheres.length - 1]);
			}else if(e.button === THREE.MOUSE.RIGHT){
				cancel.callback();
			}
		};
		
		cancel.callback = e => {
			if(cancel.removeLastMarker){
				measure.removeMarker(measure.points.length - 1);
			}
			domElement.removeEventListener("mouseup", insertionCallback, true);
			this.viewer.removeEventListener("cancel_insertions", cancel.callback);
		};
		
		if(measure.maxMarkers > 1){
			this.viewer.addEventListener("cancel_insertions", cancel.callback);
			domElement.addEventListener("mouseup", insertionCallback , true);
		}
		
		measure.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			measure.spheres[measure.spheres.length - 1]);
			
		this.viewer.scene.addMeasurement(measure);
	}
	
	update(){
		let camera = this.viewer.scene.camera;
		let domElement = this.renderer.domElement;
		let measurements = this.viewer.scene.measurements;
		
		this.light.position.copy(camera.position);
		
		// make size independant of distance
		for(let measure of measurements){
			
			measure.lengthUnit = this.viewer.lengthUnit;
			measure.update();

			// spheres
			for(let sphere of measure.spheres){
				let distance = camera.position.distanceTo(sphere.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
			
			// labels
			let labels = measure.edgeLabels.concat(measure.angleLabels);
			for(let label of labels){
				let distance = camera.position.distanceTo(label.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			// coordinate labels
			for(let j = 0; j < measure.coordinateLabels.length; j++){
				let label = measure.coordinateLabels[j]
				let sphere = measure.spheres[j];
				let point = measure.points[j];
				
				let distance = camera.position.distanceTo(sphere.getWorldPosition());
					
				let screenPos = sphere.getWorldPosition().clone().project( camera );
				screenPos.x = Math.round( ( screenPos.x + 1 ) * domElement.clientWidth  / 2 ),
				screenPos.y = Math.round( ( - screenPos.y + 1 ) * domElement.clientHeight / 2 );
				screenPos.z = 0;
				screenPos.y -= 30;
				
				let labelPos = new THREE.Vector3( 
					(screenPos.x / domElement.clientWidth) * 2 - 1, 
					-(screenPos.y / domElement.clientHeight) * 2 + 1, 
					0.5 );
				labelPos.unproject(camera);
                
				let direction = labelPos.sub(camera.position).normalize();
				labelPos = new THREE.Vector3().addVectors(
					camera.position, direction.multiplyScalar(distance));
					
				label.position.copy(labelPos);
				
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			// height label
			if(measure.showHeight){ 
				let label = measure.heightLabel;
			
				{
					let distance = label.position.distanceTo(camera.position);
					let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
					let scale = (70 / pr);
					label.scale.set(scale, scale, scale);
				}
				
				{ // height edge
					let edge = measure.heightEdge;
					let lowpoint = edge.geometry.vertices[0].clone().add(edge.position);
					let start = edge.geometry.vertices[2].clone().add(edge.position);
					let end = edge.geometry.vertices[3].clone().add(edge.position);
					
					let lowScreen = lowpoint.clone().project(camera);
					let startScreen = start.clone().project(camera);
					let endScreen = end.clone().project(camera);
					
					let toPixelCoordinates = v => {
						let r = v.clone().addScalar(1).divideScalar(2);
						r.x = r.x * domElement.clientWidth;
						r.y = r.y * domElement.clientHeight;
						r.z = 0;
						
						return r;
					};
				
					let lowEL = toPixelCoordinates(lowScreen);
					let startEL = toPixelCoordinates(startScreen);
					let endEL = toPixelCoordinates(endScreen);
					
					let distances = [0, 
						lowEL.distanceTo(startEL),
						startEL.distanceTo(endEL), 0];
						
					let lToS = lowEL.distanceTo(startEL);
					let sToE = startEL.distanceTo(endEL);
					
					edge.geometry.lineDistances = [0, lToS, lToS, lToS + sToE];
					edge.geometry.lineDistancesNeedUpdate = true;
						
					edge.material.dashSize = 10;
					edge.material.gapSize = 10;
				}
			}
			
			
			
			{ // area label
				let label = measure.areaLabel;
			
				let distance = label.position.distanceTo(camera.position);
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
		}
		
		
	}
	
};







Potree.Profile = class extends THREE.Object3D{
	
	constructor(){
		super();
		
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		
		this.name = "Profile_" + this.constructor.counter;
		this.points = [];
		this.spheres = [];
		this.edges = [];
		this.boxes = [];
		this.width = 1;
		this.height = 20;
		this._modifiable = true;
	
		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		this.color = new THREE.Color( 0xff0000 );
		this.lineColor = new THREE.Color( 0xff0000 );
	}
	
	createSphereMaterial(){
		let sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading, 
			color: 0xff0000, 
			depthTest: false, 
			depthWrite: false}
		);
		
		return sphereMaterial;
	};
	
	getSegments(){
		let segments = [];
		
		for(let i = 0; i < this.points.length - 1; i++){
			let start = this.points[i].clone();
			let end = this.points[i+1].clone();
			segments.push({start: start, end: end});
		}
		
		return segments;
	}
	
	getSegmentMatrices(){
		let segments = this.getSegments();
		let matrices = [];
	
		for(let segment of segments){
			let {start, end} = segment;
			
			let box = new THREE.Object3D();
			
			let length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
			box.scale.set(length, 10000, this.width);
			box.up.set(0, 0, 1);

			let center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
			let diff = new THREE.Vector3().subVectors(end, start);
			let target = new THREE.Vector3(diff.y, -diff.x, 0);

			box.position.set(0,0,0);
			box.lookAt(target);
			box.position.copy(center);
			
			box.updateMatrixWorld();
			matrices.push(box.matrixWorld);
		}
		
		return matrices;
	}
	
	addMarker(point){
		this.points.push(point);
		
		let sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());
		
		this.add(sphere);
		this.spheres.push(sphere);
		
		// edges & boxes
		if(this.points.length > 1){
		
			var lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(this.lineColor, this.lineColor, this.lineColor);
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
		
		{ // event listeners
			let drag = (e) => {
				let I = Potree.utils.getMousePointCloudIntersection(
					e.drag.end, 
					e.viewer.scene.camera, 
					e.viewer.renderer, 
					e.viewer.scene.pointclouds);
				
				if(I){
					let i = this.spheres.indexOf(e.drag.object);
					if(i !== -1){
						this.setPosition(i, I.location);
						this.dispatchEvent({
							"type": "marker_moved",
							"profile": this,
							"index": i
						});
					}
				}
			};
			
			let drop = e => {
				let i = this.spheres.indexOf(e.drag.object);
				if(i !== -1){
					this.dispatchEvent({
						"type": "marker_dropped",
						"profile": this,
						"index": i
					});
				}
			};
			
			let mouseover = (e) => e.object.material.emissive.setHex(0x888888);
			let mouseleave = (e) => e.object.material.emissive.setHex(0x000000);
		
			sphere.addEventListener("drag", drag);
			sphere.addEventListener("drop", drop);
			sphere.addEventListener("mouseover", mouseover);
			sphere.addEventListener("mouseleave", mouseleave);
		}
		
		let event = {
			type: "marker_added",
			profile: this,
			sphere: sphere
		};
		this.dispatchEvent(event);
		
		this.setPosition(this.points.length-1, point);
	}
	
	removeMarker(index){
		this.points.splice(index, 1);
		
		this.remove(this.spheres[index]);
		
		var edgeIndex = (index === 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		this.remove(this.boxes[edgeIndex]);
		this.boxes.splice(edgeIndex, 1);
		
		this.spheres.splice(index, 1);
		
		this.update();
		
		this.dispatchEvent({
			"type": "marker_removed",
			"profile": this
		});
	}
	
	setPosition(index, position){
		let point = this.points[index];			
		point.copy(position);
		
		let event = {
			type: 		'marker_moved',
			profile:	this,
			index:		index,
			position: 	point.clone()
		};
		this.dispatchEvent(event);
		
		this.update();
	}
	
	setWidth(width){
		this.width = width;
		
		let event = {
			type: 		'width_changed',
			profile:	this,
			width:		width
		};
		this.dispatchEvent(event);
		
		this.update();
	}
	
	getWidth(){
		return this.width;
	}
	
	update(){
		
		if(this.points.length === 0){
			return;
		}else if(this.points.length === 1){
			let point = this.points[0];
			this.spheres[0].position.copy(point);
			
			return;
		}
		
		let min = this.points[0].clone();
		let max = this.points[0].clone();
		let centroid = new THREE.Vector3();
		let lastIndex = this.points.length - 1;
		for(var i = 0; i <= lastIndex; i++){
			let point = this.points[i];
			let sphere = this.spheres[i];
			let leftIndex = (i === 0) ? lastIndex : i - 1;
			let rightIndex = (i === lastIndex) ? 0 : i + 1;
			let leftVertex = this.points[leftIndex];
			let rightVertex = this.points[rightIndex];
			let leftEdge = this.edges[leftIndex];
			let rightEdge = this.edges[i];
			let leftBox = this.boxes[leftIndex];
			let rightBox = this.boxes[i];
			
			let leftEdgeLength = point.distanceTo(leftVertex);
			let rightEdgeLength = point.distanceTo(rightVertex);
			let leftEdgeCenter = new THREE.Vector3().addVectors(leftVertex, point).multiplyScalar(0.5);
			let rightEdgeCenter = new THREE.Vector3().addVectors(point, rightVertex).multiplyScalar(0.5);
			
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
				var length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
				leftBox.scale.set(length, 1000000, this.width);
				leftBox.up.set(0, 0, 1);
				
				var center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
				var diff = new THREE.Vector3().subVectors(end, start);
				var target = new THREE.Vector3(diff.y, -diff.x, 0);
				
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
			
			box.position.z = min.z + (max.z - min.z) / 2;
		}
	}
	
	raycast(raycaster, intersects){
		
		for(let i = 0; i < this.points.length; i++){
			let sphere = this.spheres[i];
			
			sphere.raycast(raycaster, intersects);
		}
		
		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for(let i = 0; i < intersects.length; i++){
			let I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort( function ( a, b ) { return a.distance - b.distance;} );
	};
	
	get modifiable(){
		return this._modifiable;
	}
	
	set modifiable(value){
		this._modifiable = value;
		this.update();
	}
};
















Potree.ProfileTool = class ProfileTool extends THREE.EventDispatcher{
	
	constructor(viewer){
		super();
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.addEventListener("start_inserting_profile", e => {
			this.viewer.dispatchEvent({
				type: "cancel_insertions"
			});
		});
		
		this.sceneProfile = new THREE.Scene();
		this.sceneProfile.name = "scene_profile";
		this.light = new THREE.PointLight( 0xffffff, 1.0 );
		this.sceneProfile.add(this.light);
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneProfile);

		this.onRemove = e => this.sceneProfile.remove(e.profile);
		this.onAdd = e => this.sceneProfile.add(e.profile);
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		}
		
		if(this.scene){
			this.scene.removeEventListeners("profile_added", this.onAdd);
			this.scene.removeEventListeners("profile_removed", this.onRemove);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("profile_added", this.onAdd);
		this.scene.addEventListener("profile_removed", this.onRemove);
	}
	
	startInsertion(args = {}){
		let domElement = this.viewer.renderer.domElement;
		
		let profile = new Potree.Profile();
		profile.name = args.name || "Profile";
		
		this.dispatchEvent({
			type: "start_inserting_profile",
			profile: profile
		});
		
		this.sceneProfile.add(profile);
		
		let cancel = {
			callback: null
		};
		
		let insertionCallback = (e) => {
			if(e.button === THREE.MOUSE.LEFT){
				if(profile.points.length <= 1){
					let camera = this.viewer.scene.camera;
					let distance = camera.position.distanceTo(profile.points[0]);
					let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
					let width = (10 / pr);
					
					profile.setWidth(width);
				}
				
				profile.addMarker(profile.points[profile.points.length - 1].clone());
				
				this.viewer.inputHandler.startDragging(
					profile.spheres[profile.spheres.length - 1]);
			}else if(e.button === THREE.MOUSE.RIGHT){
				cancel.callback();
			}
		};
		
		
		
		cancel.callback = e => {
			profile.removeMarker(profile.points.length - 1);
			domElement.removeEventListener("mouseup", insertionCallback, true);
			this.viewer.removeEventListener("cancel_insertions", cancel.callback);
		};
		
		this.viewer.addEventListener("cancel_insertions", cancel.callback);
		domElement.addEventListener("mouseup", insertionCallback , true);
		
		profile.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			profile.spheres[profile.spheres.length - 1]);
			
		this.viewer.scene.addProfile(profile);
	}
	
	update(){
		let camera = this.viewer.scene.camera;
		let domElement = this.renderer.domElement;
		let profiles = this.viewer.scene.profiles;
		
		this.light.position.copy(camera.position);
		
		// make size independant of distance
		for(let profile of profiles){
			for(let sphere of profile.spheres){
				let distance = camera.position.distanceTo(sphere.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
		}
	}
	
};






Potree.TransformationTool = class TransformationTool{
	
	constructor(viewer){
		
		this.viewer = viewer;
		
		this.sceneTransform = new THREE.Scene();
		this.translationNode = new THREE.Object3D();
		this.rotationNode = new THREE.Object3D();
		this.scaleNode = new THREE.Object3D();
		
		this.TRANSFORMATION_MODES = {
			DEFAULT: 0,
			TRANSLATE: 1,
			ROTATE: 2,
			SCALE: 3
		};
		
		this.keys = {
			TRANSLATE:  ['E'.charCodeAt(0)],
			SCALE:      ['R'.charCodeAt(0)],
			ROTATE:     ['T'.charCodeAt(0)]
		}
		
		this.mode = this.TRANSFORMATION_MODES.DEFAULT;
		
		this.menu = new HoverMenu(Potree.resourcePath + "/icons/menu_icon.svg");
		
		this.selection = [];
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneTransform);
		this.viewer.inputHandler.addEventListener("selection_changed", (e) => {
			this.selection = e.selection;
		});
		this.viewer.inputHandler.addEventListener("keydown", (e) => {
			if(this.selection.length > 0){
				if(this.keys.TRANSLATE.some(key => key === e.keyCode)){
					this.setMode(this.TRANSFORMATION_MODES.TRANSLATE);
				}else if(this.keys.SCALE.some(key => key === e.keyCode)){
					this.setMode(this.TRANSFORMATION_MODES.SCALE);
				}else if(this.keys.ROTATE.some(key => key === e.keyCode)){
					this.setMode(this.TRANSFORMATION_MODES.ROTATE);
				}
			}
			
		});
		
		{ // Menu
			this.menu.addItem(new HoverMenuItem(Potree.resourcePath + "/icons/translate.svg", e => {
				//console.log("translate!");
				this.setMode(this.TRANSFORMATION_MODES.TRANSLATE);
			}));
			this.menu.addItem(new HoverMenuItem(Potree.resourcePath + "/icons/rotate.svg", e => {
				//console.log("rotate!");
				this.setMode(this.TRANSFORMATION_MODES.ROTATE);
			}));
			this.menu.addItem(new HoverMenuItem(Potree.resourcePath + "/icons/scale.svg", e => {
				//console.log("scale!");
				this.setMode(this.TRANSFORMATION_MODES.SCALE);
			}));
			this.menu.setPosition(100, 100);
			$(this.viewer.renderArea).append(this.menu.element);
			this.menu.element.hide();
		}
		
		{ // translation node
			
			let createArrow = (name, direction, color) => {
				let material = new THREE.MeshBasicMaterial({
					color: color, 
					depthTest: false, 
					depthWrite: false});
					
				let shaftGeometry = new THREE.Geometry();
				shaftGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
				shaftGeometry.vertices.push(new THREE.Vector3(0, 1, 0));
				
				let shaftMaterial = new THREE.LineBasicMaterial({
					color: color, 
					depthTest: true, 
					depthWrite: true,
					transparent: true
					});
				let shaft = new THREE.Line(shaftGeometry, shaftMaterial);
				shaft.name = name + "_shaft";
				
				let headGeometry = new THREE.CylinderGeometry(0, 0.04, 0.1, 10, 1, false);
				let headMaterial  = material;
				let head = new THREE.Mesh(headGeometry, headMaterial);
				head.name = name + "_head";
				head.position.y = 1;
				
				let arrow = new THREE.Object3D();
				arrow.name = name;
				arrow.add(shaft);
				arrow.add(head);
				
				let mouseover = e => {
					let c = new THREE.Color(0xFFFF00);
					shaftMaterial.color = c;
					headMaterial.color = c;
				};
				
				let mouseleave = e => {
					let c = new THREE.Color(color);
					shaftMaterial.color = c;
					headMaterial.color = c;
				};
				
				let drag = e => {
					
					let camera = this.viewer.scene.camera;
					
					if(!e.drag.intersectionStart){
						e.drag.intersectionStart = e.drag.location;
						e.drag.objectStart = e.drag.object.getWorldPosition();
						
						let start = this.sceneTransform.position.clone();
						let end = direction.clone().applyMatrix4(this.sceneTransform.matrixWorld);
						//let end = start.clone().add(direction);
						let line = new THREE.Line3(start, end);
						e.drag.line = line;
						
						let camOnLine = line.closestPointToPoint(camera.position, false);
						let normal = new THREE.Vector3().subVectors(
							camera.position, camOnLine);
						let plane = new THREE.Plane()
							.setFromNormalAndCoplanarPoint(normal, e.drag.intersectionStart);
							
						e.drag.dragPlane = plane;
						e.drag.pivot = e.drag.intersectionStart;
					}
					
					{
						let mouse = e.drag.end;
						let domElement = viewer.renderer.domElement;
						let nmouse =  {
							x: (mouse.x / domElement.clientWidth ) * 2 - 1,
							y: - (mouse.y / domElement.clientHeight ) * 2 + 1
						};
						
						let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
						vector.unproject(camera);
						
						let ray = new THREE.Ray(camera.position, vector.sub( camera.position));
						let I = ray.intersectPlane(e.drag.dragPlane);
						
						if(I){
							
							let iOnLine = e.drag.line.closestPointToPoint(I, false);
							
							let diff = new THREE.Vector3().subVectors(
								iOnLine, e.drag.pivot);
								
							for(let selection of this.selection){
								selection.position.add(diff);
							}
							
							e.drag.pivot = e.drag.pivot.add(diff);
						}
					}
				};
				
				shaft.addEventListener("mouseover", mouseover);
				shaft.addEventListener("mouseleave", mouseleave);
				shaft.addEventListener("drag", drag);

				return arrow;
			};
			
			let arrowX = createArrow("arrow_x", new THREE.Vector3(1, 0, 0), 0xFF0000);
			let arrowY = createArrow("arrow_y", new THREE.Vector3(0, 1, 0), 0x00FF00);
			let arrowZ = createArrow("arrow_z", new THREE.Vector3(0, 0, 1), 0x0000FF);
			
			arrowX.rotation.z = -Math.PI/2;
			arrowZ.rotation.x = Math.PI/2;
			
			this.translationNode.add(arrowX);
			this.translationNode.add(arrowY);
			this.translationNode.add(arrowZ);
		}
		
		{ // Rotation Node
			let createCircle = (name, normal, color) => {
				let material = new THREE.LineBasicMaterial({
					color: color, 
					depthTest: true, 
					depthWrite: true,
					transparent: true
					});
				
				let segments = 32;
				let radius = 1;
				let geometry = new THREE.BufferGeometry();
				let positions = new Float32Array( (segments + 1) * 3 );
				for(let i = 0; i <= segments; i++){
					let u = (i / segments) * Math.PI * 2;
					let x = Math.cos(u) * radius;
					let y = Math.sin(u) * radius;
					
					positions[3 * i + 0] = x;
					positions[3 * i + 1] = y;
					positions[3 * i + 2] = 0;
				}
				geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));
				geometry.computeBoundingSphere();
				
				let circle = new THREE.Line(geometry, material);
				circle.name = name + "_circle";
				circle.lookAt(normal);
				
				let mouseover = e => {
					let c = new THREE.Color(0xFFFF00);
					material.color = c;
				};
				
				let mouseleave = e => {
					let c = new THREE.Color(color);
					material.color = c;
				};
				
				let drag = e => {
					
					let camera = this.viewer.scene.camera;
					let n = normal.clone().applyEuler(this.sceneTransform.rotation);
					
					if(!e.drag.intersectionStart){
						e.drag.objectStart = e.drag.object.getWorldPosition();
						
						let plane = new THREE.Plane()
							.setFromNormalAndCoplanarPoint(n, this.sceneTransform.getWorldPosition());
						
						{ // e.drag.location seems imprecisse, calculate real start location
							let mouse = e.drag.end;
							let domElement = viewer.renderer.domElement;
							let nmouse =  {
								x: (mouse.x / domElement.clientWidth ) * 2 - 1,
								y: - (mouse.y / domElement.clientHeight ) * 2 + 1
							};
							
							let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
							vector.unproject(camera);
							
							let ray = new THREE.Ray(camera.position, vector.sub( camera.position));
							let I = ray.intersectPlane(plane);
							
							e.drag.intersectionStart = I;
						}
						
						e.drag.dragPlane = plane;
						e.drag.pivot = e.drag.intersectionStart;
					}
					
					let mouse = e.drag.end;
					let domElement = viewer.renderer.domElement;
					let nmouse =  {
						x: (mouse.x / domElement.clientWidth ) * 2 - 1,
						y: - (mouse.y / domElement.clientHeight ) * 2 + 1
					};
					
					let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
					vector.unproject(camera);
					
					let ray = new THREE.Ray(camera.position, vector.sub( camera.position));
					let I = ray.intersectPlane(e.drag.dragPlane);
						
					if(I){
						let center = this.sceneTransform.position;
						let from = e.drag.pivot;
						let to = I;
						
						let v1 = from.clone().sub(center).normalize();
						let v2 = to.clone().sub(center).normalize();
						
						let angle = Math.acos(v1.dot(v2));
						let sign = Math.sign(v1.cross(v2).dot(n));
						angle = angle * sign;
						if(Number.isNaN(angle)){
							return;
						}
						
						for(let selection of this.selection){
							selection.rotateOnAxis(normal, angle);
						}
						
						e.drag.pivot = I;
					}
					
				};
				
				circle.addEventListener("mouseover", mouseover);
				circle.addEventListener("mouseleave", mouseleave);
				circle.addEventListener("drag", drag);
				
				
				return circle;
			};
			
			{ // transparent ball
				let sg = new THREE.SphereGeometry(1, 32, 32);
				let sm = new THREE.MeshBasicMaterial({
				//let sm = new THREE.MeshNormalMaterial({
					color: 0xaaaaaa,
					transparent: true,
					depthTest: true,
					depthWrite: true,
					opacity: 0.4
				});
				
				let sphere = new THREE.Mesh(sg, sm);
				sphere.name = name + "_sphere";
				sphere.scale.set(0.9, 0.9, 0.9);
				this.rotationNode.add(sphere);
			}
		
			let yaw = createCircle("yaw", new THREE.Vector3(0, 0, 1), 0xff0000);
			let pitch = createCircle("pitch", new THREE.Vector3(1, 0, 0), 0x00ff00);
			let roll = createCircle("roll", new THREE.Vector3(0, 1, 0), 0x0000ff);
		
			this.rotationNode.add(yaw);
			this.rotationNode.add(pitch);
			this.rotationNode.add(roll);
		}
		
		{ // scale node
			
			let createHandle = (name, direction, color) => {
				let material = new THREE.MeshBasicMaterial({
					color: color, 
					depthTest: false, 
					depthWrite: false});
					
				let shaftGeometry = new THREE.Geometry();
				shaftGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
				shaftGeometry.vertices.push(new THREE.Vector3(0, 1, 0));
				
				let shaftMaterial = new THREE.LineBasicMaterial({
					color: color, 
					depthTest: true, 
					depthWrite: true,
					transparent: true
					});
				let shaft = new THREE.Line(shaftGeometry, shaftMaterial);
				shaft.name = name + "_shaft";
				
				let headGeometry = new THREE.BoxGeometry(1, 1, 1);
				let headMaterial  = material;
				let head = new THREE.Mesh(headGeometry, headMaterial);
				head.name = name + "_head";
				head.position.y = 1;
				head.scale.set(0.07, 0.07, 0.07);
				
				let arrow = new THREE.Object3D();
				arrow.add(shaft);
				arrow.add(head);
				
				let mouseover = e => {
					let c = new THREE.Color(0xFFFF00);
					shaftMaterial.color = c;
					headMaterial.color = c;
				};
				
				let mouseleave = e => {
					let c = new THREE.Color(color);
					shaftMaterial.color = c;
					headMaterial.color = c;
				};
				
				let drag = e => {
					
					let camera = this.viewer.scene.camera;
					
					if(!e.drag.intersectionStart){
						e.drag.intersectionStart = e.drag.location;
						e.drag.scaleStart = this.selection[0].scale.clone();
						
						let start = this.sceneTransform.position.clone();
						let end = direction.clone().applyMatrix4(this.sceneTransform.matrixWorld);
						//let end = start.clone().add(direction);
						let line = new THREE.Line3(start, end);
						e.drag.line = line;
						
						let camOnLine = line.closestPointToPoint(camera.position, false);
						let normal = new THREE.Vector3().subVectors(
							camera.position, camOnLine);
						let plane = new THREE.Plane()
							.setFromNormalAndCoplanarPoint(normal, e.drag.intersectionStart);
							
						e.drag.dragPlane = plane;
						e.drag.pivot = e.drag.intersectionStart;
					}
					
					{
						let mouse = e.drag.end;
						let domElement = viewer.renderer.domElement;
						let nmouse =  {
							x: (mouse.x / domElement.clientWidth ) * 2 - 1,
							y: - (mouse.y / domElement.clientHeight ) * 2 + 1
						};
						
						let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
						vector.unproject(camera);
						
						let ray = new THREE.Ray(camera.position, vector.sub( camera.position));
						let I = ray.intersectPlane(e.drag.dragPlane);
						
						if(I){
							
							let iOnLine = e.drag.line.closestPointToPoint(I, false);
							
							//let diff = new THREE.Vector3().subVectors(
							//	iOnLine, e.drag.pivot);
							
							let oldDistance = this.sceneTransform.position.distanceTo(e.drag.pivot);
							let newDistance = this.sceneTransform.position.distanceTo(I);
							
							let s = newDistance / oldDistance;
							let scale = new THREE.Vector3(
								direction.x === 0 ? 1 : s * direction.x,
								direction.y === 0 ? 1 : s * direction.y,
								direction.z === 0 ? 1 : s * direction.z
							);
							
								
							for(let selection of this.selection){
								//selection.position.add(diff);
								
								selection.scale.copy(e.drag.scaleStart.clone().multiply(scale));
								
								//selection.scale.copy(
								//	e.drag.scaleStart.clone()
								//	.multiplyScalar(scale)
								//	.multiply(direction));
								//console.log(Potree.utils.toString(selection.scale));
							}
							
							//e.drag.pivot = e.drag.pivot.add(diff);
						}
					}
				};
				
				shaft.addEventListener("mouseover", mouseover);
				shaft.addEventListener("mouseleave", mouseleave);
				shaft.addEventListener("drag", drag);

				return arrow;
			};
			
			let arrowX = createHandle("arrow_x", new THREE.Vector3(1, 0, 0), 0xFF0000);
			let arrowY = createHandle("arrow_y", new THREE.Vector3(0, 1, 0), 0x00FF00);
			let arrowZ = createHandle("arrow_z", new THREE.Vector3(0, 0, 1), 0x0000FF);
			
			arrowX.rotation.z = -Math.PI/2;
			arrowZ.rotation.x = Math.PI/2;
			
			this.scaleNode.add(arrowX);
			this.scaleNode.add(arrowY);
			this.scaleNode.add(arrowZ);
		}
		
		
		this.setMode(this.TRANSFORMATION_MODES.TRANSLATE);
	}
	
	getSelectionBoundingBox(){
		
		let min = new THREE.Vector3(+Infinity, +Infinity, +Infinity);
		let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
		
		for(let node of this.selection){
			
			let box = null;
			if(node.boundingBox){
				box = node.boundingBox;
			}else if(node.geometry && node.geometry.boundingBox){
				box = node.geometry.boundingBox;
			}
			
			if(box){
				//let tbox = Potree.utils.computeTransformedBoundingBox(box, node.matrixWorld);				
				let tbox = box.clone().applyMatrix4(node.matrixWorld);
				
				min = min.min(tbox.min);
				max = max.max(tbox.max);
			}else{
				let wp = node.getWorldPosition();
				min = min.min(wp);
				max = max.max(wp);
			}
		}
		
		return new THREE.Box3(min, max);
		
	}
	
	setMode(mode){
		if(this.mode === mode){
			return;
		}
		
		this.sceneTransform.remove(this.translationNode);
		this.sceneTransform.remove(this.rotationNode);
		this.sceneTransform.remove(this.scaleNode);
		
		if(mode === this.TRANSFORMATION_MODES.TRANSLATE){
			this.sceneTransform.add(this.translationNode);
		}else if(mode === this.TRANSFORMATION_MODES.ROTATE){
			this.sceneTransform.add(this.rotationNode);
		}else if(mode === this.TRANSFORMATION_MODES.SCALE){
			this.sceneTransform.add(this.scaleNode);
		}
		
		this.mode = mode;
	}
	
	
	//setSelection(selection){
	//	this.selection = selection;
	//}
	
	update(){
		
		if(this.selection.length === 0){
			this.sceneTransform.visible = false;
			this.menu.element.hide();
			return;
		}else{
			this.sceneTransform.visible = true;
			this.menu.element.show();
		}
		
		if(this.selection.length === 1){
			this.sceneTransform.rotation.copy(this.selection[0].rotation);
		}
		
		let scene = this.viewer.scene;
		let renderer = this.viewer.renderer;
		let domElement = renderer.domElement;
		
		let box = this.getSelectionBoundingBox();
		let pivot = box.getCenter();
		this.sceneTransform.position.copy(pivot);
		
		{ // size
			let distance = scene.camera.position.distanceTo(pivot);
			let pr = Potree.utils.projectedRadius(1, scene.camera.fov * Math.PI / 180, distance, renderer.domElement.clientHeight);
			let scale = (120 / pr);
			this.sceneTransform.scale.set(scale, scale, scale);
		}
		
		{ // menu
			let screenPos = pivot.clone().project(scene.camera);
			screenPos.x = domElement.clientWidth * (screenPos.x + 1) / 2;
			screenPos.y = domElement.clientHeight * (1-(screenPos.y + 1) / 2);
			
			this.menu.setPosition(screenPos.x, screenPos.y);
		}
		
	}
	
	//render(camera, target){
	//	this.update();
	//	this.renderer.render(this.sceneTransform, camera, target);
	//}
	
};

Potree.Volume = class extends THREE.Object3D{
	
	constructor(args = {}){
		super();
		
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		
		this.name = "volume_" + this.constructor.counter;
		
		this._clip = args.clip || false;
		this._modifiable = args.modifiable || true;
		
		let boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();
		
		let boxFrameGeometry = new THREE.Geometry();
		{
			let l = 0.1;
			
			// corner vertices
			let v = [
				[-0.5, -0.5, -0.5],
				[-0.5, -0.5, +0.5],
				[-0.5, +0.5, -0.5],
				[-0.5, +0.5, +0.5],
				[+0.5, -0.5, -0.5],
				[+0.5, -0.5, +0.5],
				[+0.5, +0.5, -0.5],
				[+0.5, +0.5, +0.5]
			];
			//
			//// create a cross at each corner with cross length l
			//for(let b of v){
			//	
			//	let b1 = [ b[0] - l * Math.sign(b[0]), b[1], b[2] ];
			//	let b2 = [ b[0], b[1] - l * Math.sign(b[1]), b[2] ];
			//	let b3 = [ b[0], b[1], b[2] - l * Math.sign(b[2]) ];
			//	
			//	// create the 3 lines that a cross consists of
			//	for(let d of [b, b1, b, b2, b, b3]){
			//		boxFrameGeometry.vertices.push(new THREE.Vector3().fromArray(d));
			//	}
			//	
			//}
			
			// bottom
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
			// top
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
			// sides
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, -0.5));
			boxFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, -0.5));
		}

		this.dimension = new THREE.Vector3(1,1,1);
		this.material = new THREE.MeshBasicMaterial( {
			color: 0x00ff00, 
			transparent: true, 
			opacity: 0.3,
			depthTest: true, 
			depthWrite: false} );
		this.box = new THREE.Mesh(boxGeometry, this.material);
		this.box.geometry.computeBoundingBox();
		this.boundingBox = this.box.geometry.boundingBox;
		this.add(this.box);
		
		this.frame = new THREE.LineSegments( boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
		//this.frame.mode = THREE.Lines;
		this.add(this.frame);
		
		this.label = new Potree.TextSprite("0");
		this.label.setBorderColor({r:0, g:255, b:0, a:0.0});
		this.label.setBackgroundColor({r:0, g:255, b:0, a:0.0});
		this.label.material.depthTest = false;
		this.label.material.depthWrite = false;
		this.label.material.transparent = true;
		this.label.position.y -= 0.5;
		this.add(this.label);
		
		this.label.updateMatrixWorld = () => {
			var volumeWorldPos = new THREE.Vector3();
			volumeWorldPos.setFromMatrixPosition( this.matrixWorld );
			this.label.position.copy(volumeWorldPos);
			this.label.updateMatrix();
			this.label.matrixWorld.copy(this.label.matrix);
			this.label.matrixWorldNeedsUpdate = false;
			
			for ( var i = 0, l = this.label.children.length; i < l; i ++ ) {
				this.label.children[ i ].updateMatrixWorld( true );
			}
		};
		
		{ // event listeners
			this.addEventListener("select", e => {});
			this.addEventListener("deselect", e => {});
		}
		
		this.update();
	}

	getVolume(){
		return Math.abs(this.scale.x * this.scale.y * this.scale.z);
	}
	
	update(){
		this.boundingBox = this.box.geometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		
		if(this._clip){
			this.box.visible = false;
			this.label.visible = false;
		}else{
			this.box.visible = true;
			this.label.visible = true;
		}
	};
	
	raycast(raycaster, intersects){
		
		let is = [];
		this.box.raycast(raycaster, is);
	
		if(is.length > 0){
			var I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	};
	
	get clip(){
		return this._clip;
	}
	
	set clip(value){
		this._clip = value;
		
		this.update();
	}
	
	get modifieable(){
		return this._modifiable;
	}
	
	set modifieable(value){
		this._modifiable = value;
		
		this.update();
	}
};


Potree.VolumeTool = class VolumeTool extends THREE.EventDispatcher{
	
	constructor(viewer){
		super()
		
		this.viewer = viewer;
		this.renderer = viewer.renderer;
		
		this.addEventListener("start_inserting_volume", e => {
			this.viewer.dispatchEvent({
				type: "cancel_insertions"
			});
		});

		this.sceneVolume = new THREE.Scene();
		this.sceneVolume.name = "scene_volume";
		
		this.viewer.inputHandler.registerInteractiveScene(this.sceneVolume);

		this.onRemove = e => {
			this.sceneVolume.remove(e.volume);
		};
		
		this.onAdd = e => {
			this.sceneVolume.add(e.volume);
		};
		
		this.viewer.inputHandler.addEventListener("delete", e => {
			let volumes = e.selection.filter(e => (e instanceof Potree.Volume));
			volumes.forEach(e => this.viewer.scene.removeVolume(e));
		});
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		}
		
		if(this.scene){
			this.scene.removeEventListeners("volume_added", this.onAdd);
			this.scene.removeEventListeners("volume_removed", this.onRemove);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("volume_added", this.onAdd);
		this.scene.addEventListener("volume_removed", this.onRemove);
	}
	
	startInsertion(args = {}){
		let domElement = this.viewer.renderer.domElement;
		
		let volume = new Potree.Volume();
		volume.clip = args.clip || false;
		volume.name = args.name || "Volume";
		
		this.dispatchEvent({
			type: "start_inserting_volume",
			volume: volume
		});
		
		//this.sceneVolume.add(volume);
		this.viewer.scene.addVolume(volume);
		
		let cancel = {
			callback: null
		};

		let drag = e => {
			let camera = this.viewer.scene.camera;
			
			let I = Potree.utils.getMousePointCloudIntersection(
				e.drag.end, 
				this.viewer.scene.camera, 
				this.viewer.renderer, 
				this.viewer.scene.pointclouds);
				
			if(I){
				volume.position.copy(I.location);
				
				var wp = volume.getWorldPosition().applyMatrix4(camera.matrixWorldInverse);
				var pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				var w = Math.abs((wp.z  / 10)); 
				volume.scale.set(w,w,w);
			}
		};
		
		let drop = e => {
			volume.removeEventListener("drag", drag);
			volume.removeEventListener("drop", drop);
			
			cancel.callback();
		};
		
		cancel.callback = e => {
			volume.removeEventListener("drag", drag);
			volume.removeEventListener("drop", drop);
			this.viewer.removeEventListener("cancel_insertions", cancel.callback);
		};
		
		volume.addEventListener("drag", drag);
		volume.addEventListener("drop", drop);
		this.viewer.addEventListener("cancel_insertions", cancel.callback);
		
		this.viewer.inputHandler.startDragging(volume);
	}
	
	update(delta){
		
		if(!this.scene){
			return;
		}
		
		let camera = this.viewer.scene.camera;
		let domElement = this.viewer.renderer.domElement;
		//let labels = this.viewer.scene.volumes.map(e => e.label);
		
		let volumes = this.viewer.scene.volumes;
		for(let volume of volumes){
			let label = volume.label;
			
			{
				let distance = label.position.distanceTo(camera.position);
				let pr = Potree.utils.projectedRadius(1, camera.fov * Math.PI / 180, distance, domElement.clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
			
			let text = Potree.utils.addCommas(volume.getVolume().toFixed(3)) + "\u00B3";
			label.setText(text);
		}
		
	}

};
/**
 *
 * code adapted from three.js BoxHelper.js
 * https://github.com/mrdoob/three.js/blob/dev/src/helpers/BoxHelper.js
 *
 * @author mrdoob / http://mrdoob.com/
 * @author Mugen87 / http://github.com/Mugen87
 * @author mschuetz / http://potree.org
 */

Potree.Box3Helper = class Box3Helper extends THREE.LineSegments{

	constructor(box, color){

		if ( color === undefined ) color = 0xffff00;

		let indices = new Uint16Array([ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ]);
		let positions = new Float32Array( [
			box.min.x, box.min.y, box.min.z,
			box.max.x, box.min.y, box.min.z,
			box.max.x, box.min.y, box.max.z,
			box.min.x, box.min.y, box.max.z,
			box.min.x, box.max.y, box.min.z,
			box.max.x, box.max.y, box.min.z,
			box.max.x, box.max.y, box.max.z,
			box.min.x, box.max.y, box.max.z
		]);

		let geometry = new THREE.BufferGeometry();
		geometry.setIndex( new THREE.BufferAttribute( indices, 1 ) );
		geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );

		let material = new THREE.LineBasicMaterial( { color: color } ) ;
		
		super(geometry, material);
	}

}

/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schütz / http://potree.org
 *
 */

Potree.GeoJSONExporter = class GeoJSONExporter{
	
	static measurementToFeatures(measurement){
		
		let coords = measurement.points.map(e => e.position.toArray());
		
		let features = [];
		
		if(coords.length === 1){
			let feature = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: coords[0],
				},
				properties: {
					name: measurement.name
				}
			};
			features.push(feature);
		}else if(coords.length > 1 && !measurement.closed){
			let object = {
				"type": "Feature",
				"geometry": {
					"type": "LineString",
					"coordinates": coords
				},
				"properties": {
					name: measurement.name
				}
			};
			
			features.push(object);
		}else if(coords.length > 1 && measurement.closed){

			let object = {
				"type": "Feature",
				"geometry": {
					"type": "Polygon",
					"coordinates": [[...coords, coords[0]]]
				},
				"properties": {
					name: measurement.name
				}
			};
			features.push(object);
		}

		if(measurement.showDistances){
			measurement.edgeLabels.forEach((label) => {
				let labelPoint = {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: label.position.toArray(),
					},
					properties: {
						distance: label.text
					}
				};
				features.push(labelPoint);
			});
		}
		
		if(measurement.showArea){
			var point = measurement.areaLabel.position;
			var labelArea = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: point.toArray(),
				},
				properties: {
					area: measurement.areaLabel.text
				}
			};
			features.push(labelArea);
		}
		
		return features;
	}
	
	static toString(measurements){
		
		if(!(measurements instanceof Array)){
			measurements = [measurements];
		}
		
		measurements = measurements.filter(m => m instanceof Potree.Measure);
		
		let features = [];
		for(let measure of measurements){
			let f = Potree.GeoJSONExporter.measurementToFeatures(measure);
			
			features = features.concat(f);
		}
		
		let geojson = {
			"type": "FeatureCollection",
			"features": features
		};
		
		return JSON.stringify(geojson, null, "\t");
	}

}



/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net S�rl / https://www.ioda-net.ch/
 * @author Markus Sch�tz / http://potree.org
 *
 */

Potree.DXFExporter = class DXFExporter{
	
	static measurementPointSection(measurement){
		
		let position = measurement.points[0].position;
		
		if(!position){
			return "";
		}
		
		let dxfSection = `0
CIRCLE
8
layer_point
10
${position.x}
20
${position.y}
30
${position.z}
40
1.0
`;

		return dxfSection;
	}
	
	static measurementPolylineSection(measurement){
		// bit code for polygons/polylines: 
		// https://www.autodesk.com/techpubs/autocad/acad2000/dxf/polyline_dxf_06.htm
		let geomCode = 8; 
		if(measurement.closed){
			geomCode += 1;
		}
		
		let dxfSection = `0
POLYLINE
8
layer_polyline
62
1
66
1
10
0.0
20
0.0
30
0.0
70
${geomCode}
`;

		let xMax = 0.0;
		let yMax = 0.0;
		let zMax = 0.0;
		for(let point of measurement.points){
			point = point.position;
			xMax = Math.max(xMax, point.x);
			yMax = Math.max(yMax, point.y);
			zMax = Math.max(zMax, point.z);
			
			dxfSection += `0
VERTEX
8
0
10
${point.x}
20
${point.y}
30
${point.z}
70
32
`;

		}
            dxfSection += `0
SEQEND
`;

		return dxfSection;
	}
	
	static measurementSection(measurement){
		
		//if(measurement.points.length <= 1){
		//	return "";
		//}
		
		if(measurement.points.length === 0){
			return "";
		}else if(measurement.points.length === 1){
			return Potree.DXFExporter.measurementPointSection(measurement);
		}else if(measurement.points.length >= 2){
			return Potree.DXFExporter.measurementPolylineSection(measurement);
		}
	}
	
	
	static toString(measurements){
		
		if(!(measurements instanceof Array)){
			measurements = [measurements];
		}
		measurements = measurements.filter(m => m instanceof Potree.Measure);
		
		let points = measurements.filter(m => (m instanceof Potree.Measure))
			.map(m => m.points)
			.reduce((a, v) => a.concat(v))
			.map(p => p.position);
			
		let min = new THREE.Vector3(Infinity, Infinity, Infinity);
		let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
		for(let point of points){
			min.min(point);
			max.max(point);
		}
		
		
		
		let dxfHeader = `999
DXF created from potree
0
SECTION
2
HEADER
9
$ACADVER
1
AC1006
9
$INSBASE
10
0.0
20
0.0
30
0.0
9
$EXTMIN
10
${min.x}
20
${min.y}
30
${min.z}
9
$EXTMAX
10
${max.x}
20
${max.y}
30
${max.z}
0
ENDSEC
`;

		let dxfBody = `0
SECTION
2
ENTITIES
`;
		
		for(let measurement of measurements){
			dxfBody += Potree.DXFExporter.measurementSection(measurement);
		}
		
		dxfBody += `0
ENDSEC
`;

		let dxf = dxfHeader + dxfBody + '0\nEOF';
		
		return dxf;
	}

	
}

Potree.CSVExporter = class CSVExporter{
	
	static toString(points){
		let string = "";
		
		let attributes = Object.keys(points.data)
			.filter(a => a !== "normal")
			.sort((a, b) => {
				if(a === "position") return -1;
				if(b === "position") return 1;
				if(a === "color") return -1;
				if(b === "color") return 1;
			});
		
		let headerValues = [];
		for(let attribute of attributes){
			let itemSize = points.data[attribute].length / points.numPoints;
			
			if(attribute === "position"){
				headerValues = headerValues.concat(["x", "y", "z"]);
			}else if(attribute === "color"){
				headerValues = headerValues.concat(["r", "g", "b"]);
			}else if(itemSize > 1){
				for(let i = 0; i < itemSize; i++){
					headerValues.push(`${attribute}_${i}`);
				}
			}else{
				headerValues.push(attribute);
			}
		}
		string = headerValues.join(", ") + "\n";

		for(let i = 0; i < points.numPoints; i++){
			
			let values = [];
			
			for(let attribute of attributes){
				let itemSize = points.data[attribute].length / points.numPoints;
				let value = points.data[attribute]
					.subarray(itemSize * i, itemSize * i + itemSize)
					.join(", ");
				values.push(value);
			}
			
			string += values.join(", ") + "\n";
		}
		
		return string;
	}
	
};

Potree.LASExporter = class LASExporter{
	
	static toLAS(points){
		let string = "";
		
		let boundingBox = points.boundingBox;
		let offset = boundingBox.min.clone();
		let diagonal = boundingBox.min.distanceTo(boundingBox.max);
		let scale = new THREE.Vector3(0.001, 0.001, 0.001);
		if(diagonal > 1000*1000){
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
		
		let buffer = new ArrayBuffer(227 + 28 * points.numPoints);
		let view = new DataView(buffer);
		let u8View = new Uint8Array(buffer);
		//let u16View = new Uint16Array(buffer);
		
		setString("LASF", 0, buffer);
		u8View[24] = 1;
		u8View[25] = 2;
		
		// system identifier o:26 l:32
		
		// generating software o:58 l:32
		setString("Potree 1.5", 58, buffer); 
		
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
		view.setUint32(107, points.numPoints, true);
		
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
		
		let boffset = 227;
		for(let i = 0; i < points.numPoints; i++){
			//let point = points[i];
			//let position = new THREE.Vector3(point.x, point.y, point.z);
			
			let px = points.data.position[3*i + 0];
			let py = points.data.position[3*i + 1];
			let pz = points.data.position[3*i + 2];
			
			let ux = parseInt((px - offset.x) / scale.x);
			let uy = parseInt((py - offset.y) / scale.y);
			let uz = parseInt((pz - offset.z) / scale.z);
			
			view.setUint32(boffset + 0, ux, true);
			view.setUint32(boffset + 4, uy, true);
			view.setUint32(boffset + 8, uz, true);
			
			if(points.data.intensity){
				view.setUint16(boffset + 12, (points.data.intensity[i]), true);
			}
			
			let rt = 0;
			if(points.data.returnNumber){
				rt += points.data.returnNumber[i];
			}
			if(points.data.numberOfReturns){
				rt += (points.data.numberOfReturns[i] << 3);
			}
			view.setUint8(boffset + 14, rt);
			
			if(points.data.classification){
				view.setUint8(boffset + 15, points.data.classification[i]);
			}
			// scan angle rank
			// user data
			// point source id
			if(points.data.pointSourceID){
				view.setUint16(boffset + 18, points.data.pointSourceID[i]);
			}
			
			if(points.data.color){
				view.setUint16(boffset + 20, (points.data.color[3*i + 0] * 255), true);
				view.setUint16(boffset + 22, (points.data.color[3*i + 1] * 255), true);
				view.setUint16(boffset + 24, (points.data.color[3*i + 2] * 255), true);
			}
			
			boffset += 28;
		}

		return buffer;
	}
	
};

Potree.PointCloudArena4DNode = class PointCloudArena4DNode extends Potree.PointCloudTreeNode{
	
	constructor(){
		super(); 
		
		this.left = null;
		this.right = null;
		this.sceneNode = null;
		this.kdtree = null;
	}
	
	getNumPoints(){
		return this.geometryNode.numPoints;
	}
	
	isLoaded(){
		return true;
	}
	
	isTreeNode(){
		return true;
	}
	
	isGeometryNode(){
		return false;
	}
	
	getLevel(){
		return this.geometryNode.level;
	}
	
	getBoundingSphere(){
		return this.geometryNode.boundingSphere;
	}
	
	getBoundingBox(){
		return this.geometryNode.boundingBox;
	}
	
	toTreeNode(child){
		var geometryNode = null;
		
		if(this.left === child){
			geometryNode = this.left;
		}else if(this.right === child){
			geometryNode = this.right;
		}
		
		if(!geometryNode.loaded){
			return;
		}
		
		var node = new Potree.PointCloudArena4DNode();
		var sceneNode = THREE.PointCloud(geometryNode.geometry, this.kdtree.material);
		sceneNode.visible = false;
		
		node.kdtree = this.kdtree;
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.parent = this;
		node.left = this.geometryNode.left;
		node.right = this.geometryNode.right;
	}
	
	getChildren(){
		var children = [];
		
		if(this.left){
			children.push(this.left);
		} 
		
		if(this.right){
			children.push(this.right);
		}
		
		return children;
	}
};

Potree.PointCloudOctreeNode.prototype = Object.create(Potree.PointCloudTreeNode.prototype);



Potree.PointCloudArena4D = class PointCloudArena4D extends Potree.PointCloudTree{
	
	constructor(geometry){
		super()
		
		this.root = null;
		if(geometry.root){
			this.root = geometry.root;
		}else{
			geometry.addEventListener("hierarchy_loaded", () => {
				this.root = geometry.root;
			});
		}
		
		this.visiblePointsTarget = 2*1000*1000;
		this.minimumNodePixelSize = 150;
		
		this.position.sub(geometry.offset);
		this.updateMatrix();
		
		this.numVisibleNodes = 0;
		this.numVisiblePoints = 0;
		
		this.boundingBoxNodes = [];
		this.loadQueue = [];
		this.visibleNodes = [];
		
		this.pcoGeometry = geometry;
		this.boundingBox = this.pcoGeometry.boundingBox;
		this.boundingSphere = this.pcoGeometry.boundingSphere;
		this.material = new Potree.PointCloudMaterial({vertexColors: THREE.VertexColors, size: 0.05, treeType: Potree.TreeType.KDTREE});
		this.material.sizeType = Potree.PointSizeType.ATTENUATED;
		this.material.size = 0.05;
		this.profileRequests = [];
		this.name = "";
	}
	
	setName(name){
		if(this.name !== name){
			this.name = name;
			this.dispatchEvent({type: "name_changed", name: name, pointcloud: this});
		}
	}
	
	getName(){
		return this.name;
	}
	
	getLevel(){
		return this.level;
	}
	
	toTreeNode(geometryNode, parent){
		var node = new Potree.PointCloudArena4DNode();
		var sceneNode = new THREE.Points(geometryNode.geometry, this.material);
		
		sceneNode.frustumCulled = false;
		sceneNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
			
			if(material.program){
				_this.getContext().useProgram(material.program.program);
				
				if(material.program.getUniforms().map.level){
					let level = geometryNode.getLevel();
					material.uniforms.level.value = level;
					material.program.getUniforms().map.level.setValue(_this.getContext(), level);
				}
				
				if(this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart){
					let vnStart = this.visibleNodeTextureOffsets.get(node);
					material.uniforms.vnStart.value = vnStart;
					material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
				}
				
				if(material.program.getUniforms().map.pcIndex){
					let i = node.pcIndex ? node.pcIndex : this.visibleNodes.indexOf(node);
					material.uniforms.pcIndex.value = i;
					material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), i);
				}
			}
		};
		
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.pointcloud = this;
		node.left = geometryNode.left;
		node.right = geometryNode.right;
		
		if(!parent){
			this.root = node;
			this.add(sceneNode);
		}else{
			parent.sceneNode.add(sceneNode);
			
			if(parent.left === geometryNode){
				parent.left = node;
			}else if(parent.right === geometryNode){
				parent.right = node;
			}
		}
		
		var disposeListener = function(){
			parent.sceneNode.remove(node.sceneNode);
			
			if(parent.left === node){
				parent.left = geometryNode;
			}else if(parent.right === node){
				parent.right = geometryNode;
			}
		}
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);
		
		return node;
	}
	
	updateMaterial(material, visibleNodes, camera, renderer){
		material.fov = camera.fov * (Math.PI / 180);
		material.screenWidth = renderer.domElement.clientWidth;
		material.screenHeight = renderer.domElement.clientHeight;
		material.spacing = this.pcoGeometry.spacing;
		material.near = camera.near;
		material.far = camera.far;
		
		// reduce shader source updates by setting maxLevel slightly higher than actually necessary
		if(this.maxLevel > material.levels){
			material.levels = this.maxLevel + 2;
		}
		
		//material.minSize = 3;
		
		//material.uniforms.octreeSize.value = this.boundingBox.size().x;
		var bbSize = this.boundingBox.getSize();
		material.bbSize = [bbSize.x, bbSize.y, bbSize.z];
		
		// update visibility texture
		if(material.pointSizeType){
			if(material.pointSizeType === Potree.PointSizeType.ADAPTIVE 
				|| material.pointColorType === Potree.PointColorType.LOD){
				
				this.updateVisibilityTexture(material, visibleNodes);
			}
		}
	}
	
	updateVisibleBounds(){
		
	}
	
	hideDescendants(object){
		var stack = [];
		for(var i = 0; i < object.children.length; i++){
			var child = object.children[i];
			if(child.visible){
				stack.push(child);
			}
		}
		
		while(stack.length > 0){
			var object = stack.shift();
			
			object.visible = false;
			if(object.boundingBoxNode){
				object.boundingBoxNode.visible = false;
			}
			
			for(var i = 0; i < object.children.length; i++){
				var child = object.children[i];
				if(child.visible){
					stack.push(child);
				}
			}
		}
	}
	
	updateMatrixWorld( force ){
		//node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );
		
		if ( this.matrixAutoUpdate === true ) this.updateMatrix();

		if ( this.matrixWorldNeedsUpdate === true || force === true ) {

			if ( this.parent === undefined ) {

				this.matrixWorld.copy( this.matrix );

			} else {

				this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

			}

			this.matrixWorldNeedsUpdate = false;

			force = true;

		}
	}
	
	nodesOnRay(nodes, ray){
		var nodesOnRay = [];

		var _ray = ray.clone();
		for(var i = 0; i < nodes.length; i++){
			var node = nodes[i];
			var sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
			var box = node.getBoundingBox().clone().applyMatrix4(node.sceneNode.matrixWorld);
			
			if(_ray.intersectsSphere(sphere)){
				nodesOnRay.push(node);
			}
			//if(_ray.isIntersectionBox(box)){
			//	nodesOnRay.push(node);
			//}
		}
		
		return nodesOnRay;
	}
	
	pick(renderer, camera, ray, params = {}){
		
		//let start = new Date().getTime();
		
		let pickWindowSize = params.pickWindowSize || 17;
		let pickOutsideClipRegion = params.pickOutsideClipRegion || false;
		let width = Math.ceil(renderer.domElement.clientWidth);
		let height = Math.ceil(renderer.domElement.clientHeight);
		
		let nodes = this.nodesOnRay(this.visibleNodes, ray);
		
		if(nodes.length === 0){
			return null;
		}
		
		if(!this.pickState){
			
			let scene = new THREE.Scene();
			
			let material = new Potree.PointCloudMaterial();
			material.pointColorType = Potree.PointColorType.POINT_INDEX;	
			
			let renderTarget = new THREE.WebGLRenderTarget( 
				1, 1, 
				{ minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat } 
			);
			
			this.pickState = {
				renderTarget: renderTarget,
				material: material,
				scene: scene
			};
		};
		
		let pickState = this.pickState;
		let pickMaterial = pickState.material;
		
		{ // update pick material
			pickMaterial.pointSizeType = this.material.pointSizeType;
			pickMaterial.shape = this.material.shape;
			
			pickMaterial.size = this.material.size;
			pickMaterial.minSize = this.material.minSize;
			pickMaterial.maxSize = this.material.maxSize;
			pickMaterial.classification = this.material.classification;
			
			if(pickOutsideClipRegion){
				pickMaterial.clipMode = Potree.ClipMode.DISABLED;
			}else{
				pickMaterial.clipMode = this.material.clipMode;
				if(this.material.clipMode === Potree.ClipMode.CLIP_OUTSIDE){
					pickMaterial.setClipBoxes(this.material.clipBoxes);
				}else{
					pickMaterial.setClipBoxes([]);
				}
			}
			
			this.updateMaterial(pickMaterial, nodes, camera, renderer);
		}
		
		if(pickState.renderTarget.width != width || pickState.renderTarget.height != height){
			pickState.renderTarget.dispose();
			pickState.renderTarget = new THREE.WebGLRenderTarget( 
				1, 1, 
				{ minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat } 
			);
		}
		pickState.renderTarget.setSize(width, height);
		renderer.setRenderTarget( pickState.renderTarget );
		
		let pixelPos = new THREE.Vector3()
			.addVectors(camera.position, ray.direction)
			.project(camera)
			.addScalar(1)
			.multiplyScalar(0.5);
		pixelPos.x *= width;
		pixelPos.y *= height;
		
		renderer.setScissor(
			parseInt(pixelPos.x - (pickWindowSize - 1) / 2), 
			parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
			parseInt(pickWindowSize), parseInt(pickWindowSize));
		renderer.setScissorTest(true);
		
		renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
		renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
		renderer.state.setBlending(THREE.NoBlending);
		
		renderer.clearTarget( pickState.renderTarget, true, true, true );
		
		//pickState.scene.children = nodes.map(n => n.sceneNode);
		
		//let childStates = [];
		let tempNodes = [];
		for(let i = 0; i < nodes.length; i++){
			let node = nodes[i];
			node.pcIndex = i+1;
			let sceneNode = node.sceneNode;
			
			let tempNode = new THREE.Points(sceneNode.geometry, pickMaterial);
			tempNode.matrix = sceneNode.matrix;
			tempNode.matrixWorld = sceneNode.matrixWorld;
			tempNode.matrixAutoUpdate = false;
			tempNode.frustumCulled = false;
			tempNode.pcIndex = i+1;
			
			let geometryNode = node.geometryNode;
			let material = pickMaterial;
			tempNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
				
				if(material.program){
					_this.getContext().useProgram(material.program.program);
					
					if(material.program.getUniforms().map.level){
						let level = geometryNode.getLevel();
						material.uniforms.level.value = level;
						material.program.getUniforms().map.level.setValue(_this.getContext(), level);
					}
					
					if(this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart){
						let vnStart = this.visibleNodeTextureOffsets.get(node);
						material.uniforms.vnStart.value = vnStart;
						material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
					}
					
					if(material.program.getUniforms().map.pcIndex){
						material.uniforms.pcIndex.value = node.pcIndex;
						material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), node.pcIndex);
					}
				}
				
			};
			tempNodes.push(tempNode);
			
			//for(let child of nodes[i].sceneNode.children){
			//	childStates.push({child: child, visible: child.visible});
			//	child.visible = false;
			//}
		}
		pickState.scene.autoUpdate = false;
		pickState.scene.children = tempNodes;
		//pickState.scene.overrideMaterial = pickMaterial;
		
		renderer.state.setBlending(THREE.NoBlending);
		
		// RENDER
		renderer.render(pickState.scene, camera, pickState.renderTarget);
		
		//for(let childState of childStates){
		//	childState.child = childState.visible;
		//}
		
		//pickState.scene.overrideMaterial = null;
		
		//renderer.context.readPixels(
		//	pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2, 
		//	pickWindowSize, pickWindowSize, 
		//	renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);
		
		let clamp = (number, min, max) => Math.min(Math.max(min, number), max);
		
		let x = parseInt(clamp(pixelPos.x - (pickWindowSize-1) / 2, 0, width));
		let y = parseInt(clamp(pixelPos.y - (pickWindowSize-1) / 2, 0, height));
		let w = parseInt(Math.min(x + pickWindowSize, width) - x);
		let h = parseInt(Math.min(y + pickWindowSize, height) - y);
		
		let pixelCount = w * h;
		let buffer = new Uint8Array(4 * pixelCount);
		renderer.readRenderTargetPixels(pickState.renderTarget, 
			x, y, w, h, 
			buffer);
		
		renderer.setScissorTest(false);
		
		renderer.setRenderTarget(null);
		
		let pixels = buffer;
		let ibuffer = new Uint32Array(buffer.buffer);
		
		// find closest hit inside pixelWindow boundaries
		let min = Number.MAX_VALUE;
		let hit = null;
		for(let u = 0; u < pickWindowSize; u++){
			for(let v = 0; v < pickWindowSize; v++){
				let offset = (u + v*pickWindowSize);
				let distance = Math.pow(u - (pickWindowSize-1) / 2, 2) + Math.pow(v - (pickWindowSize-1) / 2, 2);
				
				let pcIndex = pixels[4*offset + 3];
				pixels[4*offset + 3] = 0;
				let pIndex = ibuffer[offset];
				
				//if((pIndex !== 0 || pcIndex !== 0) && distance < min){
				if(pcIndex > 0 && distance < min){
					
					
					hit = {
						pIndex: pIndex,
						pcIndex: pcIndex - 1
					};
					min = distance;
					
					//console.log(hit);
				}
			}
		}
		//console.log(pixels);
		
		//{ // open window with image
		//	let img = Potree.utils.pixelsArrayToImage(buffer, w, h);
		//	let screenshot = img.src;
		//	
		//	if(!this.debugDIV){
		//		this.debugDIV = $(`
		//			<div id="pickDebug" 
		//			style="position: absolute; 
		//			right: 400px; width: 300px;
		//			bottom: 44px; width: 300px;
		//			z-index: 1000;
		//			"></div>`);
		//		$(document.body).append(this.debugDIV);
		//	}
		//	
		//	this.debugDIV.empty();
		//	this.debugDIV.append($(`<img src="${screenshot}"
		//		style="transform: scaleY(-1);"/>`));
		//	//$(this.debugWindow.document).append($(`<img src="${screenshot}"/>`));
		//	//this.debugWindow.document.write('<img src="'+screenshot+'"/>');
		//}
		
		//return;
		
		let point = null;
		
		if(hit){
			point = {};
			
			if(!nodes[hit.pcIndex]){
				return null;
			}
			
			let pc = nodes[hit.pcIndex].sceneNode;
			let attributes = pc.geometry.attributes;
			
			for(let property in attributes) {
				if (attributes.hasOwnProperty(property)) {
					let values = pc.geometry.attributes[property];
				
					if(property === "position"){
						let positionArray = values.array;
						let x = positionArray[3*hit.pIndex+0];
						let y = positionArray[3*hit.pIndex+1];
						let z = positionArray[3*hit.pIndex+2];
						let position = new THREE.Vector3(x, y, z);
						position.applyMatrix4(pc.matrixWorld);
					
						point[property] = position;
					}else if(property === "indices"){
					
					}else{
						if(values.itemSize === 1){
							point[property] = values.array[hit.pIndex];
						}else{
							let value = [];
							for(let j = 0; j < values.itemSize; j++){
								value.push(values.array[values.itemSize*hit.pIndex + j]);
							}
							point[property] = value;
						}
					}
				}
			}
		}
		
		//let end = new Date().getTime();
		//let duration = end - start;
		//console.log(`pick duration: ${duration}ms`);
		
		return point;
		
		
	}
	
	updateVisibilityTexture(material, visibleNodes){

		if(!material){
			return;
		}
		
		var texture = material.visibleNodesTexture;
		var data = texture.image.data;
		
		// copy array
		visibleNodes = visibleNodes.slice();
		
		// sort by level and number
		var sort = function(a, b){
			var la = a.geometryNode.level;
			var lb = b.geometryNode.level;
			var na = a.geometryNode.number;
			var nb = b.geometryNode.number;
			if(la != lb) return la - lb;
			if(na < nb) return -1;
			if(na > nb) return 1;
			return 0;
		};
		visibleNodes.sort(sort);
		
		var visibleNodeNames = [];
		for(var i = 0; i < visibleNodes.length; i++){
			//visibleNodeNames[visibleNodes[i].pcoGeometry.number] = true;
			visibleNodeNames.push(visibleNodes[i].geometryNode.number);
		}
		
		for(var i = 0; i < visibleNodes.length; i++){
			var node = visibleNodes[i];
			
			var b1 = 0;	// children
			var b2 = 0;	// offset to first child
			var b3 = 0;	// split 
			
			if(node.geometryNode.left && visibleNodeNames.indexOf(node.geometryNode.left.number) > 0){
				b1 += 1;
				b2 = visibleNodeNames.indexOf(node.geometryNode.left.number) - i;
			}
			if(node.geometryNode.right && visibleNodeNames.indexOf(node.geometryNode.right.number) > 0){
				b1 += 2;
				b2 = (b2 === 0) ? visibleNodeNames.indexOf(node.geometryNode.right.number) - i : b2;
			}
			
			if(node.geometryNode.split === "X"){
				b3 = 1;
			}else if(node.geometryNode.split === "Y"){
				b3 = 2;
			}else if(node.geometryNode.split === "Z"){
				b3 = 4;
			}
			
			
			data[i*3+0] = b1;
			data[i*3+1] = b2;
			data[i*3+2] = b3;
		}
		
		
		texture.needsUpdate = true;
	}
	
	get progress(){
		if(this.pcoGeometry.root){
			return Potree.PointCloudArena4DGeometryNode.nodesLoading > 0 ? 0 : 1;
		}else{
			return 0;
		}
	}
}



Potree.PointCloudArena4DGeometryNode = function(){
	var scope = this;

	this.left = null;
	this.right = null;
	this.boundingBox = null;
	this.number = null;
	this.pcoGeometry = null;
	this.loaded = false;
	this.numPoints = 0;
	this.level = 0;
	this.children = [];
	this.oneTimeDisposeHandlers = [];
};

Potree.PointCloudArena4DGeometryNode.nodesLoading = 0;

Potree.PointCloudArena4DGeometryNode.prototype.isGeometryNode = function(){
	return true;
};

Potree.PointCloudArena4DGeometryNode.prototype.isTreeNode = function(){
	return false;
};

Potree.PointCloudArena4DGeometryNode.prototype.isLoaded = function(){
	return this.loaded;
};

Potree.PointCloudArena4DGeometryNode.prototype.getBoundingSphere = function(){
	return this.boundingSphere;
};

Potree.PointCloudArena4DGeometryNode.prototype.getBoundingBox = function(){
	return this.boundingBox;
};

Potree.PointCloudArena4DGeometryNode.prototype.getChildren = function(){
	var children = [];
	
	if(this.left){
		children.push(this.left);
	} 
	
	if(this.right){
		children.push(this.right);
	}
	
	return children;
};

Potree.PointCloudArena4DGeometryNode.prototype.getBoundingBox = function(){
	return this.boundingBox;
};

Potree.PointCloudArena4DGeometryNode.prototype.getLevel = function(){
	return this.level;
};

Potree.PointCloudArena4DGeometryNode.prototype.load = function(){

	if(this.loaded || this.loading){
		return;
	}
	
	if(Potree.PointCloudArena4DGeometryNode.nodesLoading >= 5){
		return;
	}
	
	this.loading = true;
	
	Potree.PointCloudArena4DGeometryNode.nodesLoading++;
	
	var url = this.pcoGeometry.url + "?node=" + this.number;
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.responseType = "arraybuffer";
	
	var scope = this;
	
	xhr.onreadystatechange = function(){
		if(!(xhr.readyState === 4 && xhr.status === 200)){
			return;
		}
		
		var buffer = xhr.response;
		var view = new DataView(buffer);
		var numPoints = buffer.byteLength / 17;
		
		var positions = new Float32Array(numPoints*3);
		var colors = new Uint8Array(numPoints*3);
		var indices = new ArrayBuffer(numPoints*4);
		var iIndices = new Uint32Array(indices);
		
		for(var i = 0; i < numPoints; i++){
			var x = view.getFloat32(i*17 + 0, true) + scope.boundingBox.min.x;
			var y = view.getFloat32(i*17 + 4, true) + scope.boundingBox.min.y;
			var z = view.getFloat32(i*17 + 8, true) + scope.boundingBox.min.z;
			var r = view.getUint8(i*17 + 12, true);
			var g = view.getUint8(i*17 + 13, true);
			var b = view.getUint8(i*17 + 14, true);
			
			positions[i*3+0] = x;
			positions[i*3+1] = y;
			positions[i*3+2] = z;
			
			colors[i*3+0] = r;
			colors[i*3+1] = g;
			colors[i*3+2] = b;
			
			iIndices[i] = i;
		}
		
		
		var geometry = new THREE.BufferGeometry();
		geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.addAttribute("color", new THREE.BufferAttribute(colors, 3, true));
		geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(numPoints*3), 3));
		
		let indicesAttribute = new THREE.Uint8BufferAttribute(indices, 4);
		indicesAttribute.normalized = true;
		geometry.addAttribute("indices", indicesAttribute);
		
		scope.geometry = geometry;
		scope.loaded = true;
		Potree.PointCloudArena4DGeometryNode.nodesLoading--;
		
		geometry.boundingBox = scope.boundingBox;
		geometry.boundingSphere = scope.boundingSphere;
		
		scope.numPoints = numPoints;

		scope.loading = false;
	};
	
	xhr.send(null);
};

Potree.PointCloudArena4DGeometryNode.prototype.dispose = function(){
	if(this.geometry && this.parent != null){
		this.geometry.dispose();
		this.geometry = null;
		this.loaded = false;
		
		//this.dispatchEvent( { type: 'dispose' } );
		for(var i = 0; i < this.oneTimeDisposeHandlers.length; i++){
			var handler = this.oneTimeDisposeHandlers[i];
			handler();
		}
		this.oneTimeDisposeHandlers = [];
	}
};

Potree.PointCloudArena4DGeometryNode.prototype.getNumPoints = function(){
	return this.numPoints;
};


Potree.PointCloudArena4DGeometry = function(){
	var scope = this;

	this.numPoints = 0;
	this.version = 0;
	this.boundingBox = null;
	this.numNodes = 0;
	this.name = null;
	this.provider = null;
	this.url = null;
	this.root = null;
	this.levels = 0;
	this._spacing = null;
	this.pointAttributes = new Potree.PointAttributes([
		"POSITION_CARTESIAN",
		"COLOR_PACKED"
	]);
};

Potree.PointCloudArena4DGeometry.prototype = Object.create( THREE.EventDispatcher.prototype );

Potree.PointCloudArena4DGeometry.load = function(url, callback){

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url + "?info", true);
	
	xhr.onreadystatechange = function(){
		try{
			if(xhr.readyState === 4 && xhr.status === 200){
				var response = JSON.parse(xhr.responseText);
				
				var geometry = new Potree.PointCloudArena4DGeometry();
				geometry.url = url;
				geometry.name = response.Name;
				geometry.provider = response.Provider;
				geometry.numNodes = response.Nodes;
				geometry.numPoints = response.Points;
				geometry.version = response.Version;
				geometry.boundingBox = new THREE.Box3(
					new THREE.Vector3().fromArray(response.BoundingBox.slice(0,3)),
					new THREE.Vector3().fromArray(response.BoundingBox.slice(3,6))
				);
				if(response.Spacing){
					geometry.spacing = response.Spacing;
				}
				
				var offset = geometry.boundingBox.min.clone().multiplyScalar(-1);
				
				geometry.boundingBox.min.add(offset);
				geometry.boundingBox.max.add(offset);
				geometry.offset = offset;
				
				var center = geometry.boundingBox.getCenter();
				var radius = geometry.boundingBox.getSize().length() / 2;
				geometry.boundingSphere = new THREE.Sphere(center, radius);
				
				geometry.loadHierarchy();
				
				callback(geometry);
			}else if(xhr.readyState === 4){
				callback(null);
			}
		}catch(e){
			console.error(e.message);
			callback(null);
		}
	};
		
	xhr.send(null);

};

Potree.PointCloudArena4DGeometry.prototype.loadHierarchy = function(){
	var url = this.url + "?tree"; 
	var xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.responseType = "arraybuffer";
	
	var scope = this;
	
	xhr.onreadystatechange = function(){
		if(!(xhr.readyState === 4 && xhr.status === 200)){
			return;
		}
	
		var buffer = xhr.response;
		var numNodes = buffer.byteLength /	3;
		var view = new DataView(buffer);
		var stack = [];
		var root = null;
		
		var levels = 0;
		
		var start = new Date().getTime();
		// read hierarchy
		for(var i = 0; i < numNodes; i++){
			var mask = view.getUint8(i*3+0, true);
			var numPoints = view.getUint16(i*3+1, true);
		
			
			var hasLeft = (mask & 1) > 0;
			var hasRight = (mask & 2) > 0;
			var splitX = (mask & 4) > 0;
			var splitY = (mask & 8) > 0;
			var splitZ = (mask & 16) > 0;
			var split = null;
			if(splitX){
				split = "X";
			}else if(splitY){
				split = "Y";
			}if(splitZ){
				split = "Z";
			}
			
			
			var node = new Potree.PointCloudArena4DGeometryNode();
			node.hasLeft = hasLeft;
			node.hasRight = hasRight;
			node.split = split;
			node.isLeaf = !hasLeft && !hasRight;
			node.number = i;
			node.left = null;
			node.right = null;
			node.pcoGeometry = scope;
			node.level = stack.length;
			levels = Math.max(levels, node.level);
			
			if(stack.length > 0){
				var parent = stack[stack.length-1];
				node.boundingBox = parent.boundingBox.clone();
				var parentBBSize = parent.boundingBox.getSize();
				
				if(parent.hasLeft && !parent.left){
					parent.left = node;
					parent.children.push(node);
					
					if(parent.split === "X"){
						node.boundingBox.max.x = node.boundingBox.min.x + parentBBSize.x / 2;
					}else if(parent.split === "Y"){
						node.boundingBox.max.y = node.boundingBox.min.y + parentBBSize.y / 2;
					}else if(parent.split === "Z"){
						node.boundingBox.max.z = node.boundingBox.min.z + parentBBSize.z / 2;
					}
					
					var center = node.boundingBox.getCenter();
					var radius = node.boundingBox.getSize().length() / 2;
					node.boundingSphere = new THREE.Sphere(center, radius);
					
				}else{
					parent.right = node;
					parent.children.push(node);
					
					if(parent.split === "X"){
						node.boundingBox.min.x = node.boundingBox.min.x + parentBBSize.x / 2;
					}else if(parent.split === "Y"){
						node.boundingBox.min.y = node.boundingBox.min.y + parentBBSize.y / 2;
					}else if(parent.split === "Z"){
						node.boundingBox.min.z = node.boundingBox.min.z + parentBBSize.z / 2;
					}
					
					var center = node.boundingBox.getCenter();
					var radius = node.boundingBox.getSize().length() / 2;
					node.boundingSphere = new THREE.Sphere(center, radius);
				}
			}else{
				root = node;
				root.boundingBox = scope.boundingBox.clone();
				var center = root.boundingBox.getCenter();
				var radius = root.boundingBox.getSize().length() / 2;
				root.boundingSphere = new THREE.Sphere(center, radius);
			}
			
			var bbSize = node.boundingBox.getSize();
			node.spacing = ((bbSize.x + bbSize.y + bbSize.z) / 3) / 75;
			
			stack.push(node);
			
			if(node.isLeaf){
				var done = false;
				while(!done && stack.length > 0){
					stack.pop();
					
					var top = stack[stack.length-1];
					
					done = stack.length > 0 && top.hasRight && top.right == null;
				}
			}
		}
		var end = new Date().getTime();
		var parseDuration = end - start;
		var msg = parseDuration;
		//document.getElementById("lblDebug").innerHTML = msg;
		
		scope.root = root;
		scope.levels = levels;
		//console.log(this.root);
		
		scope.dispatchEvent({type: "hierarchy_loaded"});
		
	};
	
	xhr.send(null);
	
	
};

Object.defineProperty(Potree.PointCloudArena4DGeometry.prototype, "spacing", {
	get: function(){
		if(this._spacing){
			return this._spacing;
		}else if(this.root){
			return this.root.spacing;
		}else{
			null;
		}
	},
	set: function(value){
		this._spacing = value;
	}
});





function ProgressBar(){
	this._progress = 0;
	this._message = "";
	
	this.maxOpacity = 0.6;
	
	this.element = document.createElement("div");
	this.elProgress = document.createElement("div");
	this.elProgressMessage = document.createElement("div");
	
	//this.element.innerHTML = "element";
	//this.elProgress.innerHTML = "progress";
	
	this.element.innerHTML = "";
	this.element.style.position = "fixed";
	this.element.style.bottom = "40px";
	this.element.style.width = "200px";
	this.element.style.marginLeft = "-100px";
	this.element.style.left = "50%";
	this.element.style.borderRadius = "5px";
	this.element.style.border = "1px solid #727678";
	this.element.style.height = "16px";
	this.element.style.padding = "1px";
	this.element.style.textAlign = "center";
	this.element.style.backgroundColor = "#6ba8e5";
	this.element.style.opacity = this.maxOpacity;
	this.element.style.pointerEvents = "none";
	
	this.elProgress.innerHTML = " ";
	this.elProgress.style.backgroundColor = "#b8e1fc";
	this.elProgress.style.position = "absolute";
	this.elProgress.style.borderRadius = "5px";
	this.elProgress.style.width = "0%";
	this.elProgress.style.height = "100%";
	this.elProgress.style.margin = "0px";
	this.elProgress.style.padding = "0px";
	
	this.elProgressMessage.style.position = "absolute";
	this.elProgressMessage.style.width = "100%";
	this.elProgressMessage.innerHTML = "loading 1 / 10";
	
	
	
	document.body.appendChild(this.element);
	this.element.appendChild(this.elProgress);
	this.element.appendChild(this.elProgressMessage);
	
	this.hide();
};

ProgressBar.prototype.hide = function(){
	this.element.style.opacity = 0;
	this.element.style.transition = "all 0.2s ease";
};

ProgressBar.prototype.show = function(){
	this.element.style.opacity = this.maxOpacity;
	this.element.style.transition = "all 0.2s ease";
};

Object.defineProperty(ProgressBar.prototype, "progress", {
	get: function(){
		return this._progress;
	},
	set: function(value){
		this._progress = value;
		this.elProgress.style.width = (value * 100) + "%";
	}
});

Object.defineProperty(ProgressBar.prototype, "message", {
	get: function(){
		return this._message;
	},
	set: function(message){
		this._message = message;
		this.elProgressMessage.innerHTML = message;
	}
});
//let getQueryParam = function(name) {
//    name = name.replace(/[\[\]]/g, "\\$&");
//    let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
//        results = regex.exec(window.location.href);
//    if (!results) return null;
//    if (!results[2]) return '';
//    return decodeURIComponent(results[2].replace(/\+/g, " "));
//}

Potree.View = class{
	constructor(){
		this.position = new THREE.Vector3(0, 0, 0);
		
		this.yaw = Math.PI / 4;
		this._pitch = -Math.PI / 4;
		this.radius = 1;
		
		this.maxPitch = Math.PI / 2;
		this.minPitch = -Math.PI / 2;
		
		this.navigationMode = Potree.OrbitControls;
	}
	
	clone(){
		let c = new Potree.View();
		c.yaw = this.yaw;
		c._pitch = this.pitch;
		c.radius = this.radius;
		c.maxPitch = this.maxPitch;
		c.minPitch = this.minPitch;
		c.navigationMode = this.navigationMode;
		
		return c;
	}
	
	get pitch(){
		return this._pitch;
	}
	
	set pitch(angle){
		this._pitch = Math.max(Math.min(angle, this.maxPitch), this.minPitch);
	}
	
	get direction(){
		let dir = new THREE.Vector3(0, 1, 0);
		
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		return dir;
	}
	
	set direction(dir){
		let yaw = Math.atan2(dir.y, dir.x) - Math.PI / 2;
		let pitch = Math.atan2(dir.z, Math.sqrt(dir.x * dir.x + dir.y * dir.y));
		
		this.yaw = yaw;
		this.pitch = pitch;
	}
	
	lookAt(t){
		let V = new THREE.Vector3().subVectors(t, this.position);
		let radius = V.length();
		let dir = V.normalize();
		
		this.radius = radius;
		this.direction = dir;
	}
	
	getPivot(){
		return new THREE.Vector3().addVectors(this.position, this.direction.multiplyScalar(this.radius));
	}
	
	getSide(){
		let side = new THREE.Vector3(1, 0, 0);
		side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		return side;
	}
	
	pan(x, y){
		let dir = new THREE.Vector3(0, 1, 0);
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		//let side = new THREE.Vector3(1, 0, 0);
		//side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		let side = this.getSide();
		
		let up = side.clone().cross(dir);
		
		let pan = side.multiplyScalar(x).add(up.multiplyScalar(y));
		
		this.position = this.position.add(pan);
		//this.target = this.target.add(pan);
	}
	
	translate(x, y, z){
		let dir = new THREE.Vector3(0, 1, 0);
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		let side = new THREE.Vector3(1, 0, 0);
		side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);
		
		let up = side.clone().cross(dir);
		
		let t = side.multiplyScalar(x)
			.add(dir.multiplyScalar(y))
			.add(up.multiplyScalar(z));
		
		this.position = this.position.add(t);
	}
	
	translateWorld(x, y, z){
		this.position.x += x;
		this.position.y += y;
		this.position.z += z;
	}
	
};

Potree.Scene = class extends THREE.EventDispatcher{
	constructor(){
		super();
		
		this.annotations = new Potree.Annotation();
		this.scene = new THREE.Scene();
		this.scenePointCloud = new THREE.Scene();
		this.sceneBG = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000*1000);
		this.cameraBG = new THREE.Camera();
		this.pointclouds = [];
		this.referenceFrame;
		
		this.measurements = [];
		this.profiles = [];
		this.volumes = [];
		
		this.fpControls;
		this.orbitControls;
		this.earthControls;
		this.geoControls;
		this.inputHandler;
		this.view = new Potree.View();
		
		this.directionalLight = null;
		
		this.initialize();
		
	}
	
	estimateHeightAt(position){
		
		let height = null;
		let fromSpacing = Infinity;
		
		
		for(let pointcloud of this.pointclouds){
			
			if(pointcloud.root.geometryNode === undefined){
				continue;
			}
			
			let pHeight = null;
			let pFromSpacing = Infinity;
			
			let lpos = position.clone().sub(pointcloud.position);
			lpos.z = 0;
			let ray = new THREE.Ray(lpos, new THREE.Vector3(0, 0, 1));
			
			let stack = [pointcloud.root];
			while(stack.length > 0){
				let node = stack.pop();
				let box = node.getBoundingBox();
				
				let inside = ray.intersectBox(box);
				
				if(!inside){
					continue;
				}
				
				let h = node.geometryNode.mean.z 
					+ pointcloud.position.z 
					+ node.geometryNode.boundingBox.min.z;
					
				if(node.geometryNode.spacing <= pFromSpacing){
					pHeight = h;
					pFromSpacing = node.geometryNode.spacing;
				}
				
				for(let index of Object.keys(node.children)){
					let child = node.children[index];
					if(child.geometryNode){
						stack.push(node.children[index]);
					}
				}
			}
			
			if(height === null || pFromSpacing < fromSpacing){
				height = pHeight;
				fromSpacing = pFromSpacing;
			}
		}
		
		return height;
	}
	
	addPointCloud(pointcloud){
		this.pointclouds.push(pointcloud);
		this.scenePointCloud.add(pointcloud);
		
		this.dispatchEvent({
			type: "pointcloud_added",
			pointcloud: pointcloud
		});
	};
	
	addVolume(volume){
		this.volumes.push(volume);
		this.dispatchEvent({
			"type": "volume_added",
			"scene": this,
			"volume": volume
		});
	};
	
	removeVolume(volume){
		let index = this.volumes.indexOf(volume);
		if (index > -1) {
			this.volumes.splice(index, 1);
			this.dispatchEvent({
				"type": "volume_removed",
				"scene": this,
				"volume": volume
			});
		}
	};
	
	addMeasurement(measurement){
		measurement.lengthUnit = this.lengthUnit;
		this.measurements.push(measurement);
		this.dispatchEvent({
			"type": "measurement_added",
			"scene": this,
			"measurement": measurement
		});
	};
	
	removeMeasurement(measurement){
		let index = this.measurements.indexOf(measurement);
		if (index > -1) {
			this.measurements.splice(index, 1);
			this.dispatchEvent({
				"type": "measurement_removed",
				"scene": this,
				"measurement": measurement
			});
		}
	}
	
	addProfile(profile){
		this.profiles.push(profile);
		this.dispatchEvent({
			"type": "profile_added",
			"scene": this,
			"profile": profile
		});
	}
	
	removeProfile(profile){
		let index = this.profiles.indexOf(profile);
		if (index > -1) {
			this.profiles.splice(index, 1);
			this.dispatchEvent({
				"type": "profile_removed",
				"scene": this,
				"profile": profile
			});
		}
	}
	
	removeAllMeasurements(){
		while(this.measurements.length > 0){
			this.removeMeasurement(this.measurements[0]);
		}
		
		while(this.profiles.length > 0){
			this.removeProfile(this.profiles[0]);
		}
		
		while(this.volumes.length > 0){
			this.removeVolume(this.volumes[0]);
		}
	}
	
	initialize(){
		
		this.referenceFrame = new THREE.Object3D();
		this.referenceFrame.matrixAutoUpdate = false;
		this.scenePointCloud.add(this.referenceFrame);

		this.camera.up.set(0, 0, 1);
		this.camera.position.set(1000, 1000, 1000);
		//this.camera.rotation.y = -Math.PI / 4;
		//this.camera.rotation.x = -Math.PI / 6;
		
		this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		this.directionalLight.position.set( 10, 10, 10 );
		this.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
		this.scenePointCloud.add( this.directionalLight );
		
		let light = new THREE.AmbientLight( 0x555555 ); // soft white light
		this.scenePointCloud.add( light );
		
		let grid = Potree.utils.createGrid(5, 5, 2);
		this.scene.add(grid);
		
		{// background
		// var texture = THREE.ImageUtils.loadTexture( Potree.resourcePath + '/textures/background.gif' );
			let texture = Potree.utils.createBackgroundTexture(512, 512);
			
			texture.minFilter = texture.magFilter = THREE.NearestFilter;
			texture.minFilter = texture.magFilter = THREE.LinearFilter;
			let bg = new THREE.Mesh(
				new THREE.PlaneBufferGeometry(2, 2, 0),
				new THREE.MeshBasicMaterial({
					map: texture
				})
			);
			bg.material.depthTest = false;
			bg.material.depthWrite = false;
			this.sceneBG.add(bg);
		}
		
		{// lights
		
			{
				let light = new THREE.DirectionalLight( 0xffffff );
				light.position.set( 10, 10, 1 );
				light.target.position.set( 0, 0,0 );
				this.scene.add(light);
			}
			
			{
				let light = new THREE.DirectionalLight( 0xffffff );
				light.position.set( -10, 10, 1 );
				light.target.position.set( 0, 0,0 );
				this.scene.add(light);
			}
			
			{
				let light = new THREE.DirectionalLight( 0xffffff );
				light.position.set( 0, -10, 20 );
				light.target.position.set( 0, 0,0 );
				this.scene.add(light);
			}
			
		}
	}
	
	addAnnotation(position, args = {}){
		
		if(position instanceof Array){
			args.position = new THREE.Vector3().fromArray(position);
		}else if(position instanceof THREE.Vector3){
			args.position = position;
		} 
		let annotation = new Potree.Annotation(args);
		this.annotations.add(annotation);
	}
	
	getAnnotations(){
		return this.annotations;
	};
	
};

Potree.Viewer = class PotreeViewer extends THREE.EventDispatcher{

	
	constructor(domElement, args){
		super();
		
		
		{ // generate missing dom hierarchy
			if($(domElement).find("#potree_map").length === 0){
				let potreeMap = $(`
					<div id="potree_map" class="mapBox" style="position: absolute; left: 50px; top: 50px; width: 400px; height: 400px; display: none">
						<div id="potree_map_header" style="position: absolute; width: 100%; height: 25px; top: 0px; background-color: rgba(0,0,0,0.5); z-index: 1000; border-top-left-radius: 3px; border-top-right-radius: 3px;">
						</div>
						<div id="potree_map_content" class="map" style="position: absolute; z-index: 100; top: 25px; width: 100%; height: calc(100% - 25px); border: 2px solid rgba(0,0,0,0.5); box-sizing: border-box;"></div>
					</div>
				`);
				$(domElement).append(potreeMap);
			}
			
			if($(domElement).find("#potree_description").length === 0){
				let potreeDescription = $(`<div id="potree_description" class="potree_info_text"></div>`);
				$(domElement).append(potreeDescription);
			}
		}
		
		
		let a = args || {};
		this.pointCloudLoadedCallback = a.onPointCloudLoaded || function(){};
		
		this.renderArea = domElement;
		
		//if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		//	defaultSettings.navigation = "Orbit";
		//}
		
		this.server = null;
		
		this.fov = 60;
		this.clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
		this.isFlipYZ = false;
		this.useDEMCollisions = false;
		this.generateDEM = false;
		this.minNodeSize = 100;
		this.directionalLight;
		this.edlStrength = 1.0;
		this.edlRadius = 1.4;
		this.useEDL = false;
		this.classifications = {
			0:  { visible: true, name: "never classified" },
			1:  { visible: true, name: "unclassified"     },
			2:  { visible: true, name: "ground"           },
			3:  { visible: true, name: "low vegetation"   },
			4:  { visible: true, name: "medium vegetation"},
			5:  { visible: true, name: "high vegetation"  },
			6:  { visible: true, name: "building"         },
			7:  { visible: true, name: "low point(noise)" },
			8:  { visible: true, name: "key-point"        },
			9:  { visible: true, name: "water"            },
			12: { visible: true, name: "overlap"          }
		};
		
		this.moveSpeed = 10;		

		this.LENGTH_UNITS = {
			METER : {code: "m"},
			FEET: {code: "ft"},
			INCH: {code: "\u2033"}
		};
		this.lengthUnit = this.LENGTH_UNITS.METER;

		this.showBoundingBox = false;
		this.showAnnotations = true;
		this.freeze = false;

		this.mapView;

		this.progressBar = new ProgressBar();

		this.stats = new Stats();
		//this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		//document.body.appendChild( this.stats.dom );
		//this.stats.dom.style.left = "100px";
		
		this.potreeRenderer = null;
		this.edlRenderer = null;
		this.renderer = null;
		
		this.scene = null;
		
		this.inputHandler = null;

		this.measuringTool = null;
		this.profileTool = null;
		this.volumeTool = null;
		this.transformationTool = null;
		
		this.skybox = null;
		this.clock = new THREE.Clock();
		this.background = null;
		
		this.initThree();
		
		let scene = new Potree.Scene(this.renderer);
		this.setScene(scene);
		
		{
			this.inputHandler = new Potree.InputHandler(this);
			this.inputHandler.setScene(this.scene);
			
			this.measuringTool = new Potree.MeasuringTool(this);
			this.profileTool = new Potree.ProfileTool(this);
			this.volumeTool = new Potree.VolumeTool(this);
			this.transformationTool = new Potree.TransformationTool(this);
			
			this.createControls();
			
			this.measuringTool.setScene(this.scene);
			this.profileTool.setScene(this.scene);
			this.volumeTool.setScene(this.scene);
			
			let onPointcloudAdded = (e) => {
				if(this.scene.pointclouds.length === 1){
					let speed = e.pointcloud.boundingBox.getSize().length();
					speed = speed / 5;
					this.setMoveSpeed(speed);
				}				
			};
			
			this.addEventListener("scene_changed", (e) => {
				this.inputHandler.setScene(e.scene);
				this.measuringTool.setScene(e.scene);
				this.profileTool.setScene(e.scene);
				this.volumeTool.setScene(e.scene);
				
				if(!e.scene.hasEventListener("pointcloud_added", onPointcloudAdded)){
					e.scene.addEventListener("pointcloud_added", onPointcloudAdded);
				}
			});
			
			this.scene.addEventListener("pointcloud_added", onPointcloudAdded);
		}
		
		{// set defaults
			this.setFOV(60);
			this.setEDLEnabled(false);
			this.setEDLRadius(1.4);
			this.setEDLStrength(0.4);
			this.setClipMode(Potree.ClipMode.HIGHLIGHT_INSIDE);
			this.setPointBudget(1*1000*1000);
			this.setShowBoundingBox(false);
			this.setFreeze(false);
			this.setNavigationMode(Potree.OrbitControls);
			this.setBackground("gradient");
			
			this.scaleFactor = 1;
		
			this.loadSettingsFromURL();
		}

		// start rendering!
		requestAnimationFrame(this.loop.bind(this));
		
	}

//------------------------------------------------------------------------------------
// Viewer API 
//------------------------------------------------------------------------------------

	
	
	setScene(scene){
		
		if(scene === this.scene){
			return;
		}
		
		let oldScene = this.scene;
		this.scene = scene;
		
		this.dispatchEvent({
			type: "scene_changed",
			oldScene: oldScene,
			scene: scene
		});
		
		
		{ // Annotations
			$(".annotation").detach();
			
			//for(let annotation of this.scene.annotations){
			//	this.renderArea.appendChild(annotation.domElement[0]);
			//}
			
			this.scene.annotations.traverse(annotation => {
				this.renderArea.appendChild(annotation.domElement[0]);
			});
			
			if(!this.onAnnotationAdded){
				this.onAnnotationAdded = e => {

				//console.log("annotation added: " + e.annotation.title);
				
				e.annotation.traverse(node => {
					this.renderArea.appendChild(node.domElement[0]);
					node.scene = this.scene;
				});

				};
			}
		
			if(oldScene){
				oldScene.annotations.removeEventListener("annotation_added", this.onAnnotationAdded);
			}
			this.scene.annotations.addEventListener("annotation_added", this.onAnnotationAdded);
		}
		
	};
	
	getControls(navigationMode){
		if(navigationMode === Potree.OrbitControls){
			return this.orbitControls;
		}else if(navigationMode === Potree.FirstPersonControls){
			return this.fpControls;
		}else if(navigationMode === Potree.EarthControls){
			return this.earthControls;
		}else{
			return null;
		}
	}
	
	getMinNodeSize(){
		return this.minNodeSize;
	};
	
	setMinNodeSize(value){
		if(this.minNodeSize !== value){
			this.minNodeSize = value;
			this.dispatchEvent({"type": "minnodesize_changed", "viewer": this});
		}
	};
	
	getBackground(){
		return this.background;
	};
	
	setBackground(bg){
		if(this.background === bg){
			return;
		}
		
		this.background = bg;
		this.dispatchEvent({"type": "background_changed", "viewer": this});
	}
	
	setDescription(value){
		$('#potree_description')[0].innerHTML = value;
	};
	
	setNavigationMode(value){
		this.scene.view.navigationMode = value;
	};
	
	setShowBoundingBox(value){
		if(this.showBoundingBox !== value){
			this.showBoundingBox = value;
			this.dispatchEvent({"type": "show_boundingbox_changed", "viewer": this});
		}
	};
	
	getShowBoundingBox(){
		return showBoundingBox;
	};
	
	setMoveSpeed(value){
		if(this.moveSpeed !== value){
			this.moveSpeed = value;
			this.dispatchEvent({"type": "move_speed_changed", "viewer": this, "speed": value});
		}
	};
	
	getMoveSpeed(){
		return this.moveSpeed;
	};
	
	setWeightClassification(w){
		for(let i = 0; i < this.scene.pointclouds.length; i++) {
			this.scene.pointclouds[i].material.weightClassification = w;	
			this.dispatchEvent({"type": "attribute_weights_changed" + i, "viewer": this});		
		}
	};
	
	setFreeze(value){
		if(this.freeze != value){
			this.freeze = value;
			this.dispatchEvent({"type": "freeze_changed", "viewer": this});
		}
	};
	
	getFreeze(){
		return this.freeze;
	};
	
	setPointBudget(value){

		if(Potree.pointBudget !== value){
			Potree.pointBudget = parseInt(value);
			this.dispatchEvent({"type": "point_budget_changed", "viewer": this});
		}
	};
	
	getPointBudget(){
		return Potree.pointBudget;
	};
	
	setShowAnnotations(value){
		if(this.showAnnotations !== value){
			this.showAnnotations = value;
			this.dispatchEvent({"type": "show_annotations_changed", "viewer": this});
		}
	}
	
	getShowAnnotations(){
		return this.showAnnotations;
	}
	
	setClipMode(clipMode){
		if(this.clipMode !== clipMode){
			this.clipMode = clipMode;
			this.dispatchEvent({"type": "clip_mode_changed", "viewer": this});
		}
	};
	
	getClipMode(){
		return this.clipMode;
	};
	
	setDEMCollisionsEnabled(value){
		if(this.useDEMCollisions !== value){
			this.useDEMCollisions = value;
			this.dispatchEvent({"type": "use_demcollisions_changed", "viewer": this});
		};
	};
	
	getDEMCollisionsEnabled(){
		return this.useDEMCollisions;
	};
	
	setEDLEnabled(value){
		if(this.useEDL != value){
			this.useEDL = value;
			this.dispatchEvent({"type": "use_edl_changed", "viewer": this});
		}
	};
	
	getEDLEnabled(){
		return this.useEDL;
	};
	
	setEDLRadius(value){
		if(this.edlRadius !== value){
			this.edlRadius = value;
			this.dispatchEvent({"type": "edl_radius_changed", "viewer": this});
		}
	};
	
	getEDLRadius(){
		return this.edlRadius;
	};
	
	setEDLStrength(value){
		if(this.edlStrength !== value){
			this.edlStrength = value;
			this.dispatchEvent({"type": "edl_strength_changed", "viewer": this});
		}
	};
	
	getEDLStrength(){
		return this.edlStrength;
	};
	
	setFOV(value){
		if(this.fov !== value){
			this.fov = value;
			this.dispatchEvent({"type": "fov_changed", "viewer": this});
		}
	};
	
	getFOV(){
		return this.fov;
	};
	
	disableAnnotations(){
		this.scene.annotations.traverse(annotation => {
			annotation.domElement.css("pointer-events", "none");
			
			//return annotation.visible;
		});
	};
	
	enableAnnotations(){
		this.scene.annotations.traverse(annotation => {
			annotation.domElement.css("pointer-events", "auto");
			
			//return annotation.visible;
		});
	};
	
	setClassificationVisibility(key, value){
		
		if(!this.classifications[key]){
			this.classifications[key] = {visible: value, name: "no name"};
			this.dispatchEvent({"type": "classification_visibility_changed", "viewer": this});
		}else if(this.classifications[key].visible !== value){
			this.classifications[key].visible = value;
			this.dispatchEvent({"type": "classification_visibility_changed", "viewer": this});
		}
	};

	setLengthUnit(value) {
		switch(value) {
			case "m":
				this.lengthUnit = this.LENGTH_UNITS.METER;
				break;
			case "ft":				
				this.lengthUnit = this.LENGTH_UNITS.FEET;
				break;
			case "in":				
				this.lengthUnit = this.LENGTH_UNITS.INCH;
				break;
		}

		this.dispatchEvent({"type": "length_unit_changed", "viewer": this, value: value});
	}
	
	toMaterialID(materialName){

		if(materialName === "RGB"){
			return Potree.PointColorType.RGB;
		}else if(materialName === "Color"){
			return Potree.PointColorType.COLOR;
		}else if(materialName === "Elevation"){
			return Potree.PointColorType.HEIGHT;
		}else if(materialName === "Intensity"){
			return Potree.PointColorType.INTENSITY;
		}else if(materialName === "Intensity Gradient"){
			return Potree.PointColorType.INTENSITY_GRADIENT;
		}else if(materialName === "Classification"){
			return Potree.PointColorType.CLASSIFICATION;
		}else if(materialName === "Return Number"){
			return Potree.PointColorType.RETURN_NUMBER;
		}else if(materialName === "Source"){
			return Potree.PointColorType.SOURCE;
		}else if(materialName === "Level of Detail"){
			return Potree.PointColorType.LOD;
		}else if(materialName === "Point Index"){
			return Potree.PointColorType.POINT_INDEX;
		}else if(materialName === "Normal"){
			return Potree.PointColorType.NORMAL;
		}else if(materialName === "Phong"){
			return Potree.PointColorType.PHONG;
		}else if(materialName === "RGB and Elevation"){
			return Potree.PointColorType.RGB_HEIGHT;
		}else if(materialName === "Composite"){
			return Potree.PointColorType.COMPOSITE;
		}
	};
	
	toMaterialName(materialID){

		if(materialID === Potree.PointColorType.RGB){
			return "RGB";
		}else if(materialID === Potree.PointColorType.COLOR){
			return "Color";
		}else if(materialID === Potree.PointColorType.HEIGHT){
			return "Elevation";
		}else if(materialID === Potree.PointColorType.INTENSITY){
			return "Intensity";
		}else if(materialID === Potree.PointColorType.INTENSITY_GRADIENT){
			return "Intensity Gradient";
		}else if(materialID === Potree.PointColorType.CLASSIFICATION){
			return "Classification";
		}else if(materialID === Potree.PointColorType.RETURN_NUMBER){
			return "Return Number";
		}else if(materialID === Potree.PointColorType.SOURCE){
			return "Source";
		}else if(materialID === Potree.PointColorType.LOD){
			return "Level of Detail";
		}else if(materialID === Potree.PointColorType.POINT_INDEX){
			return "Point Index";
		}else if(materialID === Potree.PointColorType.NORMAL){
			return "Normal";
		}else if(materialID === Potree.PointColorType.PHONG){
			return "Phong";
		}else if(materialID === Potree.PointColorType.RGB_HEIGHT){
			return "RGB and Elevation";
		}else if(materialID === Potree.PointColorType.COMPOSITE){
			return "Composite";
		}
	};
	
	zoomTo(node, factor){
		let view = this.scene.view;
		
		let camera = this.scene.camera.clone();
		camera.position.copy(view.position);
		camera.rotation.order = "ZXY";
		camera.rotation.x = Math.PI / 2 + view.pitch;
		camera.rotation.z = view.yaw;
		camera.updateMatrix();
		camera.updateMatrixWorld();
		
		let bs;
		if(node.boundingSphere){
			bs = node.boundingSphere;
		}else if(node.geometry && node.geometry.boundingSphere){
			bs = node.geometry.boundingSphere;
		}else{
			bs = node.boundingBox.getBoundingSphere();
		}
		
		bs = bs.clone().applyMatrix4(node.matrixWorld);
		
		let fov = Math.PI * this.scene.camera.fov / 180;
		let target = bs.center;
		let dir = view.direction;
		let radius = bs.radius;
		let distance = radius / (Math.tan(fov / 2));
		let position = target.clone().sub(dir.clone().multiplyScalar(distance));
		
		view.position.copy(position);
		view.radius = distance;
		
		this.dispatchEvent({"type": "zoom_to", "viewer": this});
	};
	
	showAbout(){
		$(function() {
			$( "#about-panel" ).dialog();
		});
	};
	
	getBoundingBox(pointclouds){
		pointclouds = pointclouds || this.scene.pointclouds;
		
		let box = new THREE.Box3();
		
		this.scene.scenePointCloud.updateMatrixWorld(true);
		this.scene.referenceFrame.updateMatrixWorld(true);
		
		for(let pointcloud of this.scene.pointclouds){
			pointcloud.updateMatrixWorld(true);
			
			let pointcloudBox = pointcloud.pcoGeometry.tightBoundingBox ?  pointcloud.pcoGeometry.tightBoundingBox : pointcloud.boundingBox;
			let boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloudBox, pointcloud.matrixWorld)
			box.union(boxWorld);
		}

		return box;
	};
	
	fitToScreen(factor = 1){
		let box = this.getBoundingBox(this.scene.pointclouds);
		
		let node = new THREE.Object3D();
		node.boundingBox = box;
		
		this.zoomTo(node, factor);
	};
	
	setTopView(){
		this.scene.view.yaw = 0;
		this.scene.view.pitch = -Math.PI / 2;
		
		this.fitToScreen();
	};
	
	setFrontView(){
		this.scene.view.yaw = 0;
		this.scene.view.pitch = 0;
		
		this.fitToScreen();
	};
	
	setLeftView(){
		this.scene.view.yaw = -Math.PI / 2;
		this.scene.view.pitch = 0;
		
		this.fitToScreen();
	};
	
	setRightView(){
		this.scene.view.yaw = Math.PI / 2;
		this.scene.view.pitch = 0;
		
		this.fitToScreen();
	};
	
	flipYZ(){
		this.isFlipYZ = !this.isFlipYZ
		
		// TODO flipyz 
		console.log("TODO");
	}
	
	loadSettingsFromURL(){
		if(Potree.utils.getParameterByName("pointSize")){
			this.setPointSize(parseFloat(Potree.utils.getParameterByName("pointSize")));
		}
		
		if(Potree.utils.getParameterByName("FOV")){
			this.setFOV(parseFloat(Potree.utils.getParameterByName("FOV")));
		}
		
		if(Potree.utils.getParameterByName("opacity")){
			this.setOpacity(parseFloat(Potree.utils.getParameterByName("opacity")));
		}
		
		if(Potree.utils.getParameterByName("edlEnabled")){
			let enabled = Potree.utils.getParameterByName("edlEnabled") === "true";
			this.setEDLEnabled(enabled);
		}
		
		if(Potree.utils.getParameterByName("edlRadius")){
			this.setEDLRadius(parseFloat(Potree.utils.getParameterByName("edlRadius")));
		}
		
		if(Potree.utils.getParameterByName("edlStrength")){
			this.setEDLStrength(parseFloat(Potree.utils.getParameterByName("edlStrength")));
		}
		
		if(Potree.utils.getParameterByName("clipMode")){
			let clipMode = Potree.utils.getParameterByName("clipMode");
			if(clipMode === "HIGHLIGHT_INSIDE"){
				this.setClipMode(Potree.ClipMode.HIGHLIGHT_INSIDE);
			}else if(clipMode === "CLIP_OUTSIDE"){
				this.setClipMode(Potree.ClipMode.CLIP_OUTSIDE);
			}else if(clipMode === "DISABLED"){
				this.setClipMode(Potree.ClipMode.DISABLED);
			}
		}

		if(Potree.utils.getParameterByName("pointBudget")){
			this.setPointBudget(parseFloat(Potree.utils.getParameterByName("pointBudget")));
		}

		if(Potree.utils.getParameterByName("showBoundingBox")){
			let enabled = Potree.utils.getParameterByName("showBoundingBox") === "true";
			if(enabled){
				this.setShowBoundingBox(true);
			}else{
				this.setShowBoundingBox(false);
			}
		}

		if(Potree.utils.getParameterByName("material")){
			let material = Potree.utils.getParameterByName("material");
			this.setMaterial(material);
		}

		if(Potree.utils.getParameterByName("pointSizing")){
			let sizing = Potree.utils.getParameterByName("pointSizing");
			this.setPointSizing(sizing);
		}

		if(Potree.utils.getParameterByName("quality")){
			let quality = Potree.utils.getParameterByName("quality");
			this.setQuality(quality);
		}
		
		if(Potree.utils.getParameterByName("position")){
			let value = Potree.utils.getParameterByName("position");
			value = value.replace("[", "").replace("]", "");
			let tokens = value.split(";");
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);
			
			this.scene.view.position.set(x, y, z);
		}
		
		if(Potree.utils.getParameterByName("target")){
			let value = Potree.utils.getParameterByName("target");
			value = value.replace("[", "").replace("]", "");
			let tokens = value.split(";");
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);
			
			this.scene.view.lookAt(new THREE.Vector3(x, y, z));
		}
		
		if(Potree.utils.getParameterByName("background")){
			let value = Potree.utils.getParameterByName("background");
			this.setBackground(value);
		}
		
		//if(Potree.utils.getParameterByName("elevationRange")){
		//	let value = Potree.utils.getParameterByName("elevationRange");
		//	value = value.replace("[", "").replace("]", "");
		//	let tokens = value.split(";");
		//	let x = parseFloat(tokens[0]);
		//	let y = parseFloat(tokens[1]);
		//	
		//	this.setElevationRange(x, y);
		//	//this.scene.view.target.set(x, y, z);
		//}
		
	};
	
	
	
	

	
	
	
//------------------------------------------------------------------------------------
// Viewer Internals
//------------------------------------------------------------------------------------

	createControls(){
		{ // create FIRST PERSON CONTROLS
			this.fpControls = new Potree.FirstPersonControls(this);
			this.fpControls.enabled = false;
			this.fpControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.fpControls.addEventListener("end", this.enableAnnotations.bind(this));
			//this.fpControls.addEventListener("double_click_move", (event) => {
			//	let distance = event.targetLocation.distanceTo(event.position);
			//	this.setMoveSpeed(Math.pow(distance, 0.4));
			//});
			//this.fpControls.addEventListener("move_speed_changed", (event) => {
			//	this.setMoveSpeed(this.fpControls.moveSpeed);
			//});
		}
		
		//{ // create GEO CONTROLS
		//	this.geoControls = new Potree.GeoControls(this.scene.camera, this.renderer.domElement);
		//	this.geoControls.enabled = false;
		//	this.geoControls.addEventListener("start", this.disableAnnotations.bind(this));
		//	this.geoControls.addEventListener("end", this.enableAnnotations.bind(this));
		//	this.geoControls.addEventListener("move_speed_changed", (event) => {
		//		this.setMoveSpeed(this.geoControls.moveSpeed);
		//	});
		//}
	
		{ // create ORBIT CONTROLS
			this.orbitControls = new Potree.OrbitControls(this);
			this.orbitControls.enabled = false;
			this.orbitControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.orbitControls.addEventListener("end", this.enableAnnotations.bind(this));
		}
		
		{ // create EARTH CONTROLS
			this.earthControls = new Potree.EarthControls(this);
			this.earthControls.enabled = false;
			this.earthControls.addEventListener("start", this.disableAnnotations.bind(this));
			this.earthControls.addEventListener("end", this.enableAnnotations.bind(this));
		}
	};

	toggleSidebar(){
		
		let renderArea = $('#potree_render_area');
		let sidebar = $('#potree_sidebar_container');
		let isVisible = renderArea.css("left") !== "0px";

		if(isVisible){
			renderArea.css("left", "0px");
		}else{
			renderArea.css("left", "300px");
		}
	};
	
	toggleMap(){
		//let map = $('#potree_map');
		//map.toggle(100);
		
		if(this.mapView){
			this.mapView.toggle();
		}

	};

	loadGUI(callback){
		let sidebarContainer = $('#potree_sidebar_container');
		sidebarContainer.load(new URL(Potree.scriptPath + "/sidebar.html").href, () => {
			
			sidebarContainer.css("width", "300px");
			sidebarContainer.css("height", "100%");
			
			let imgMenuToggle = document.createElement("img");
			imgMenuToggle.src = new URL(Potree.resourcePath + "/icons/menu_button.svg").href;
			imgMenuToggle.onclick = this.toggleSidebar;
			imgMenuToggle.classList.add("potree_menu_toggle");

			let imgMapToggle = document.createElement("img");
			imgMapToggle.src = new URL(Potree.resourcePath + "/icons/map_icon.png").href;
			imgMapToggle.style.display = "none";
			imgMapToggle.onclick = e => {this.toggleMap()};
			imgMapToggle.id = "potree_map_toggle";
			
			viewer.renderArea.insertBefore(imgMapToggle, viewer.renderArea.children[0]);
			viewer.renderArea.insertBefore(imgMenuToggle, viewer.renderArea.children[0]);
			
			this.mapView = new Potree.MapView(this);
			this.mapView.init();
			
			i18n.init({ 
				lng: 'en',
				resGetPath: Potree.resourcePath + '/lang/__lng__/__ns__.json',
				preload: ['en', 'fr', 'de', 'jp'],
				getAsync: true,
				debug: false
				}, function(t) { 
				// Start translation once everything is loaded
				$("body").i18n();
			});
			
			$(function() {
				initSidebar();
			});
			
			let elProfile = $('<div>').load(new URL(Potree.scriptPath + "/profile.html").href, () => {
				$(document.body).append(elProfile.children());
				this.profileWindow = new Potree.ProfileWindow(this);
				this.profileWindowController = new Potree.ProfileWindowController(this);
				
				$("#profile_window").draggable({
					handle: $("#profile_titlebar"),
					containment: $(document.body)
				});
				$("#profile_window").resizable({
					containment: $(document.body),
					handles: "n, e, s, w"
				});
				
				if(callback){
					$(callback);
				}
			});
			
			
			
		});
		
		
		
	}
    
    setLanguage(lang){
        i18n.setLng(lang);
        $("body").i18n();
    }
	
	setServer(server){
		this.server = server;
	}
	
	initThree(){
		let width = this.renderArea.clientWidth;
		let height = this.renderArea.clientHeight;

		this.renderer = new THREE.WebGLRenderer({premultipliedAlpha: false});
		this.renderer.sortObjects = false;
		this.renderer.setSize(width, height);
		this.renderer.autoClear = false;
		this.renderArea.appendChild(this.renderer.domElement);
		this.renderer.domElement.tabIndex = "2222";
		this.renderer.domElement.addEventListener("mousedown", function(){
			this.renderer.domElement.focus();
		}.bind(this));
		
		this.skybox = Potree.utils.loadSkybox(new URL(Potree.resourcePath + "/textures/skybox2/").href);

		// enable frag_depth extension for the interpolation shader, if available
		this.renderer.context.getExtension("EXT_frag_depth");
	}
	
	updateAnnotations(){
		
		if(!this.getShowAnnotations()){
			this.scene.annotations.traverseDescendants(descendant => {
				descendant.display = false;
				
				return;
			});
			
			return;
		}
		
		this.scene.annotations.updateBounds();
		this.scene.camera.updateMatrixWorld();
		
		let distances = [];

		let renderAreaWidth = this.renderArea.clientWidth;
		let renderAreaHeight = this.renderArea.clientHeight;
		this.scene.annotations.traverse(annotation => {
			
			if(annotation === this.scene.annotations){
				annotation.display = false;
				return true;
			}
			
			if(!annotation.visible){
				return false;
			}
			
			annotation.scene = this.scene;
			
			let element = annotation.domElement;
			
			let position = annotation.position;
			if(!position){
				position = annotation.boundingBox.getCenter();
			}
			
			let distance = viewer.scene.camera.position.distanceTo(position);
			let radius = annotation.boundingBox.getBoundingSphere().radius;
			
			let screenPos = new THREE.Vector3();
			let screenSize = 0;
			{
				// SCREEN POS
				screenPos.copy(position).project(this.scene.camera);
				screenPos.x = renderAreaWidth * (screenPos.x + 1) / 2;
				screenPos.y = renderAreaHeight * (1 - (screenPos.y + 1) / 2);
				
				//screenPos.x = Math.floor(screenPos.x - element[0].clientWidth / 2);
				//screenPos.y = Math.floor(screenPos.y - annotation.elTitlebar[0].clientHeight / 2);
				screenPos.x = Math.floor(screenPos.x);
				screenPos.y = Math.floor(screenPos.y);
				
				// SCREEN SIZE
				let fov = Math.PI * viewer.scene.camera.fov / 180;
				let slope = Math.tan(fov / 2.0);
				let projFactor =  0.5 * renderAreaHeight / (slope * distance);
				
				screenSize = radius * projFactor;
			}
			
			element[0].style.left = screenPos.x + "px";
			element[0].style.top = screenPos.y + "px";
			
			let zIndex = 10000000 - distance * (10000000 / this.scene.camera.far);
			if(annotation.descriptionVisible){
				zIndex += 10000000;
			}

			if(annotation.children.length > 0){
				let expand = screenSize > annotation.collapseThreshold || annotation.boundingBox.containsPoint(this.scene.camera.position);
				annotation.expand = expand;
				
				if(!expand){
					annotation.display = (-1 <= screenPos.z && screenPos.z <= 1);
				}
				
				return expand;
			}else{
				annotation.display = (-1 <= screenPos.z && screenPos.z <= 1);
			}
		});
	}

	update(delta, timestamp){
		
		//if(window.urlToggle === undefined){
		//	window.urlToggle = 0;
		//}else{
		//	
		//	if(window.urlToggle > 1){
		//		{
		//			
		//			let currentValue = Potree.utils.getParameterByName("position");
		//			let strPosition = "["  
		//				+ this.scene.view.position.x.toFixed(3) + ";"
		//				+ this.scene.view.position.y.toFixed(3) + ";"
		//				+ this.scene.view.position.z.toFixed(3) + "]";
		//			if(currentValue !== strPosition){
		//				Potree.utils.setParameter("position", strPosition);
		//			}
		//			
		//		}
		//		
		//		{
		//			let currentValue = Potree.utils.getParameterByName("target");
		//			let pivot = this.scene.view.getPivot();
		//			let strTarget = "["  
		//				+ pivot.x.toFixed(3) + ";"
		//				+ pivot.y.toFixed(3) + ";"
		//				+ pivot.z.toFixed(3) + "]";
		//			if(currentValue !== strTarget){
		//				Potree.utils.setParameter("target", strTarget);
		//			}
		//		}
		//		
		//		window.urlToggle = 0;
		//	}
		//	
		//	window.urlToggle += delta;
		//}
		
		
		
		
		let scene = this.scene;
		let camera = this.scene.camera;
		
		Potree.pointLoadLimit = Potree.pointBudget * 2;
		
		this.scene.directionalLight.position.copy(camera.position);
		this.scene.directionalLight.lookAt(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection()));
		
		let visibleNodes = 0;
		let visiblePoints = 0;
		let progress = 0;
		
		for(let pointcloud of this.scene.pointclouds){
			let bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
				
			if(!this.intensityMax){
				let root = pointcloud.pcoGeometry.root;
				if(root != null && root.loaded){
					let attributes = pointcloud.pcoGeometry.root.geometry.attributes;
					if(attributes.intensity){
						let array = attributes.intensity.array;

						// chose max value from the 0.75 percentile
						let ordered = [];
						for(let j = 0; j < array.length; j++){
							ordered.push(array[j]);
						}
						ordered.sort();
						let capIndex = parseInt((ordered.length - 1) * 0.75);
						let cap = ordered[capIndex];

						if(cap <= 1){
							this.intensityMax = 1;
						}else if(cap <= 256){
							this.intensityMax = 255;
						}else{
							this.intensityMax = cap;
						}
					}
				}
			}
			
			pointcloud.material.clipMode = this.clipMode;
			pointcloud.showBoundingBox = this.showBoundingBox;
			pointcloud.generateDEM = this.generateDEM;
			pointcloud.minimumNodePixelSize = this.minNodeSize;

			visibleNodes += pointcloud.numVisibleNodes;
			visiblePoints += pointcloud.numVisiblePoints;

			progress += pointcloud.progress;
		}
		
		// update classification visibility
		for(let pointcloud of this.scene.pointclouds){
			
			let classification = pointcloud.material.classification;
			let somethingChanged = false;
			for(let key of Object.keys(this.classifications)){
				
				let w = this.classifications[key].visible ? 1 : 0;
				
				if(classification[key]){
					if(classification[key].w !== w){
						classification[key].w = w;
						somethingChanged = true;
					}
				}else if(classification.DEFAULT){
					classification[key] = classification.DEFAULT;
					somethingChanged = true;
				}else{
					classification[key] = new THREE.Vector4(0.3, 0.6, 0.6, 0.5);
					somethingChanged = true;
				}
			}
			
			if(somethingChanged){
				pointcloud.material.recomputeClassification();
			}
		}
		
		if(!this.freeze){
			let result = Potree.updatePointClouds(scene.pointclouds, camera, this.renderer);
			visibleNodes = result.visibleNodes.length;
			visiblePoints = result.numVisiblePoints;
			camera.near = result.lowestSpacing * 10.0;
			camera.far = -this.getBoundingBox().applyMatrix4(camera.matrixWorldInverse).min.z;
			camera.far = Math.max(camera.far * 1.5, 1000);
		}
		
		camera.fov = this.fov;
		
		// Navigation mode changed?
		if(this.getControls(scene.view.navigationMode) !== this.controls){
			if(this.controls){
				this.controls.enabled = false;
				this.inputHandler.removeInputListener(this.controls);
			}
			
			this.controls = this.getControls(scene.view.navigationMode);
			this.controls.enabled = true;
			this.inputHandler.addInputListener(this.controls);
		}
		//
		if(this.controls !== null){
			this.controls.setScene(scene);
			this.controls.update(delta);
			
			camera.position.copy(scene.view.position);
			camera.rotation.order = "ZXY";
			camera.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			camera.rotation.z = this.scene.view.yaw;
		}

		{ // update clip boxes
			//let boxes = this.scene.profiles.reduce( (a, b) => {return a.boxes.concat(b.boxes)}, []);
			//boxes = boxes.concat(this.scene.volumes.filter(v => v.clip));
			
			let boxes = this.scene.volumes.filter(v => v.clip);
			for(let profile of this.scene.profiles){
				boxes = boxes.concat(profile.boxes);
			}
			
			
			let clipBoxes = boxes.map( box => {
				box.updateMatrixWorld();
				let boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
				let boxPosition = box.getWorldPosition();
				return {matrix: box.matrixWorld, inverse: boxInverse, position: boxPosition};
			});
			
			for(let pointcloud of this.scene.pointclouds){
				pointcloud.material.setClipBoxes(clipBoxes);
			}
		}

		this.updateAnnotations();
		
		if(this.mapView){
			this.mapView.update(delta, this.scene.camera);
			if(this.mapView.sceneProjection){
				$( "#potree_map_toggle" ).css("display", "block");
				
			}
		}

		TWEEN.update(timestamp);
		
		this.dispatchEvent({
			"type": "update", 
			"delta": delta, 
			"timestamp": timestamp});
	}


	loop(timestamp) {
		
		requestAnimationFrame(this.loop.bind(this));
		
		this.stats.begin();
		
		//var start = new Date().getTime();
		this.update(this.clock.getDelta(), timestamp);
		//var end = new Date().getTime();
		//var duration = end - start;
		//toggleMessage++;
		//if(toggleMessage > 30){
		//	document.getElementById("lblMessage").innerHTML = "update: " + duration + "ms";
		//	toggleMessage = 0;
		//}
		
		//let queryAll = Potree.startQuery("All", viewer.renderer.getContext());
		
		if(this.useEDL && Potree.Features.SHADER_EDL.isSupported()){
			if(!this.edlRenderer){
				this.edlRenderer = new EDLRenderer(this);
			}
			this.edlRenderer.render(this.renderer);
		}else{
			if(!this.potreeRenderer){
				this.potreeRenderer = new PotreeRenderer(this);
			}
			
			this.potreeRenderer.render();
		}
		
		//Potree.endQuery(queryAll, viewer.renderer.getContext());
		//Potree.resolveQueries(viewer.renderer.getContext());
		
		//let pointsRendered = viewer.scene.pointclouds[0].visibleNodes.map(n => n.geometryNode.geometry.attributes.position.count).reduce( (a, v) => a + v, 0);
		//console.log("rendered: ", pointsRendered);
		
		//if(this.takeScreenshot == true){
		//	this.takeScreenshot = false;
		//	
		//	let screenshot = this.renderer.domElement.toDataURL();
		//	
		//	//document.body.appendChild(screenshot); 
		//	let w = this.open();
		//	w.document.write('<img src="'+screenshot+'"/>');
		//}	
		
		this.stats.end();

		
		Potree.framenumber++;
	};

	
};







//------------------------------------------------------------------------------------
// Renderers
//------------------------------------------------------------------------------------

class PotreeRenderer{
	
	constructor(viewer){
		this.viewer = viewer;
	};

	render(){
		{// resize
			let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
			let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
			let aspect = width / height;
			
			viewer.scene.camera.aspect = aspect;
			viewer.scene.camera.updateProjectionMatrix();
			
			viewer.renderer.setSize(width, height);
		}
		
		// render skybox
		if(viewer.background === "skybox"){
			viewer.renderer.clear(true, true, false);
			viewer.skybox.camera.rotation.copy(viewer.scene.camera.rotation);
			viewer.skybox.camera.fov = viewer.scene.camera.fov;
			viewer.skybox.camera.aspect = viewer.scene.camera.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			//viewer.renderer.clear(true, true, false);
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear(true, true, false);
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear(true, true, false);
		}
		
		for(let pointcloud of this.viewer.scene.pointclouds){
			pointcloud.material.useEDL = false;
		}
		
		//var queryPC = Potree.startQuery("PointCloud", viewer.renderer.getContext());
		viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.camera);
		//Potree.endQuery(queryPC, viewer.renderer.getContext());
		
		// render scene
		viewer.renderer.render(viewer.scene.scene, viewer.scene.camera);
		
		viewer.volumeTool.update();
		viewer.renderer.render(viewer.volumeTool.sceneVolume, viewer.scene.camera);
		viewer.renderer.render(viewer.controls.sceneControls, viewer.scene.camera);
		
		viewer.renderer.clearDepth();
		
		viewer.measuringTool.update();
		viewer.profileTool.update();
		viewer.transformationTool.update();
		
		viewer.renderer.render(viewer.measuringTool.sceneMeasurement, viewer.scene.camera);
		viewer.renderer.render(viewer.profileTool.sceneProfile, viewer.scene.camera);
		viewer.renderer.render(viewer.transformationTool.sceneTransform, viewer.scene.camera);
		
		
		//Potree.endQuery(queryAll, viewer.renderer.getContext());
		
		//Potree.resolveQueries(viewer.renderer.getContext());
	};
};


class EDLRenderer{
	
	constructor(viewer){
		this.viewer = viewer;
		
		this.edlMaterial = null;
		this.attributeMaterials = [];
		
		this.rtColor = null;
		this.gl = viewer.renderer.context;
	}
	
	initEDL(){
		if(this.edlMaterial != null){
			return;
		}
		
		//var depthTextureExt = gl.getExtension("WEBGL_depth_texture"); 
		
		this.edlMaterial = new Potree.EyeDomeLightingMaterial();
		
		this.rtColor = new THREE.WebGLRenderTarget( 1024, 1024, { 
			minFilter: THREE.NearestFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat, 
			type: THREE.FloatType
		} );
		this.rtColor.depthTexture = new THREE.DepthTexture();
        this.rtColor.depthTexture.type = THREE.UnsignedIntType;
		
	};
	
	resize(){
		let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
		let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
		let aspect = width / height;
		
		let needsResize = (this.rtColor.width != width || this.rtColor.height != height);
	
		// disposal will be unnecessary once this fix made it into three.js master: 
		// https://github.com/mrdoob/three.js/pull/6355
		if(needsResize){
			this.rtColor.dispose();
		}
		
		viewer.scene.camera.aspect = aspect;
		viewer.scene.camera.updateProjectionMatrix();
		
		viewer.renderer.setSize(width, height);
		this.rtColor.setSize(width, height);
	}

	render(){
	
		this.initEDL();
		
		this.resize();
		
		
		if(viewer.background === "skybox"){
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.camera.rotation);
			viewer.skybox.camera.fov = viewer.scene.camera.fov;
			viewer.skybox.camera.aspect = viewer.scene.camera.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 0);
			viewer.renderer.clear();
		}
		
		viewer.measuringTool.update();
		viewer.profileTool.update();
		viewer.transformationTool.update();
		viewer.volumeTool.update();
		
		
		viewer.renderer.render(viewer.scene.scene, viewer.scene.camera);
		
		viewer.renderer.clearTarget( this.rtColor, true, true, true );
		
		let width = viewer.renderArea.clientWidth;
		let height = viewer.renderArea.clientHeight;
		
		// COLOR & DEPTH PASS
		for(let pointcloud of viewer.scene.pointclouds){
			let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;
		
			let material = pointcloud.material;
			material.weighted = false;
			material.useLogarithmicDepthBuffer = false;
			material.useEDL = true;
			
			material.screenWidth = width;
			material.screenHeight = height;
			material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
			material.uniforms.octreeSize.value = octreeSize;
			material.fov = viewer.scene.camera.fov * (Math.PI / 180);
			material.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
			material.near = viewer.scene.camera.near;
			material.far = viewer.scene.camera.far;
		}
		
		viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.camera, this.rtColor);
		viewer.renderer.render(viewer.scene.scene, viewer.scene.camera, this.rtColor);

		// bit of a hack here. The EDL pass will mess up the text of the volume tool
		// so volume tool is rendered again afterwards
		//viewer.volumeTool.render(this.rtColor);
				
		
		viewer.renderer.render(viewer.volumeTool.sceneVolume, viewer.scene.camera, this.rtColor);
		
		{ // EDL OCCLUSION PASS
			this.edlMaterial.uniforms.screenWidth.value = width;
			this.edlMaterial.uniforms.screenHeight.value = height;
			this.edlMaterial.uniforms.colorMap.value = this.rtColor.texture;
			this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
			this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
			this.edlMaterial.uniforms.opacity.value = 1;
			this.edlMaterial.depthTest = true;
			this.edlMaterial.depthWrite = true;
			this.edlMaterial.transparent = true;
		
			Potree.utils.screenPass.render(viewer.renderer, this.edlMaterial);
		}	
		
		viewer.renderer.clearDepth();
		viewer.renderer.render(viewer.controls.sceneControls, viewer.scene.camera);
		
		viewer.renderer.render(viewer.measuringTool.sceneMeasurement, viewer.scene.camera);
		viewer.renderer.render(viewer.profileTool.sceneProfile, viewer.scene.camera);
		viewer.renderer.render(viewer.transformationTool.sceneTransform, viewer.scene.camera);

	}
};


Potree.ProfileWindow = class ProfileWindow extends THREE.EventDispatcher{
	
	constructor(){
		super();
		
		this.elRoot = $("#profile_window");
		this.renderArea = this.elRoot.find("#profileCanvasContainer");
		this.svg = d3.select("svg#profileSVG");
		this.mouseIsDown = false;
		
		this.projectedBox = new THREE.Box3();
		this.pointclouds = new Map();
		this.numPoints = 0
		
		this.geometryPool = new class{
			constructor(){
				this.geometries = [];
				this.maxPoints = 50000;
			}
			
			getGeometry(){
				if(this.geometries.length === 0){
					
					let geometry = new THREE.BufferGeometry();
					let buffers = {
						position: new Float32Array(3 * this.maxPoints),
						color: new Uint8Array(3 * this.maxPoints),
						intensity: new Uint16Array(this.maxPoints),
						classification: new Uint8Array(this.maxPoints),
						returnNumber: new Uint8Array(this.maxPoints),
						numberOfReturns: new Uint8Array(this.maxPoints),
						pointSourceID: new Uint16Array(this.maxPoints)
					};
					
					geometry.addAttribute("position", new THREE.BufferAttribute(buffers.position, 3));
					geometry.addAttribute("color", new THREE.BufferAttribute(buffers.color, 3, true));
					geometry.addAttribute("intensity", new THREE.BufferAttribute(buffers.intensity, 1, false));
					geometry.addAttribute("classification", new THREE.BufferAttribute(buffers.classification, 1, false));
					geometry.addAttribute("returnNumber", new THREE.BufferAttribute(buffers.returnNumber, 1, false));
					geometry.addAttribute("numberOfReturns", new THREE.BufferAttribute(buffers.numberOfReturns, 1, false));
					geometry.addAttribute("pointSourceID", new THREE.BufferAttribute(buffers.pointSourceID, 1, false));
					
					geometry.setDrawRange(0, 0);
					
					this.geometries.push(geometry);
				}
				
				return this.geometries.pop();
			}
			
			returnGeometry(geometry){
				this.geometries.push(geometry);
			}
		};
		
		this.materialPool = new class{
			constructor(){
				this.materials = [];
			}
			
			getMaterial(){
				if(this.materials.length === 0){
					let material = new Potree.PointCloudMaterial();
					this.materials.push(material);
				}
				
				return this.materials.pop();
			}
			
			returnMaterial(material){
				this.materials.push(material);
			}
		};
		
		this.mouse = new THREE.Vector2(0, 0);
		this.scale = new THREE.Vector3(1, 1, 1);
		
		let csvIcon = `${Potree.resourcePath}/icons/file_csv_2d.svg`;
		$("#potree_download_csv_icon").attr("src", csvIcon);
		
		let lasIcon = `${Potree.resourcePath}/icons/file_las_3d.svg`;
		$("#potree_download_las_icon").attr("src", lasIcon);
		
		this.initTHREE();
		this.initSVG();
		this.initListeners();
	}
	
	initListeners(){
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
			if(this.pointclouds.size === 0){
				return;
			}
			
			let rect = this.renderArea[0].getBoundingClientRect();
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top;
			
			let newMouse = new THREE.Vector2(x, y);
			
			if(this.mouseIsDown){
				// DRAG
				this.autoFit = false;
				
				let cPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];
				let ncPos = [this.scaleX.invert(newMouse.x), this.scaleY.invert(newMouse.y)];
				
				this.camera.position.x -= ncPos[0] - cPos[0];
				this.camera.position.y -= ncPos[1] - cPos[1];
				
				this.render();
			}else if(this.pointclouds.size > 0){
				// FIND HOVERED POINT 
				let pixelRadius = 10;
				let radius = Math.abs(this.scaleX.invert(0) - this.scaleX.invert(5));
				let mileage = this.scaleX.invert(newMouse.x);
				let elevation = this.scaleY.invert(newMouse.y);
				let point = this.selectPoint(mileage, elevation, radius);
				
				if(point){
					this.elRoot.find("#profileSelectionProperties").fadeIn(200);
					this.pickSphere.visible = true;
					this.pickSphere.scale.set(0.5 * radius, 0.5 * radius, 0.5 * radius);
					this.pickSphere.position.set(point.mileage, point.position[2], 0);
					
					let info = this.elRoot.find("#profileSelectionProperties");
					let html = "<table>";
					for(let attribute of Object.keys(point)){
						let value = point[attribute];
						if(attribute === "position"){
							let values = [...value].map(v => Potree.utils.addCommas(v.toFixed(3)));
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
			
			//let sPos = new THREE.Vector3(this.mouse.x, this.mouse.y, 0);
			//let cPos = this.toCamSpace(sPos);
			
			let cPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];
			
			if(ndelta > 0){
				// + 10%
				this.scale.multiplyScalar(1.1);
			}else{
				// - 10%
				this.scale.multiplyScalar(100/110);
			}
			
			//this.scale.max(new THREE.Vector3(0.5, 0.5, 0.5));
			//this.scale.min(new THREE.Vector3(100, 100, 100));
			
			this.updateScales();
			let ncPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];
			
			this.camera.position.x -= ncPos[0] - cPos[0];
			this.camera.position.y -= ncPos[1] - cPos[1];
			
			this.render();
		};
		$(this.renderArea)[0].addEventListener("mousewheel", onWheel, false );
		$(this.renderArea)[0].addEventListener("DOMMouseScroll", onWheel, false ); // Firefox
		
		$('#closeProfileContainer').click(() => {
			this.hide();
		});
		
		$('#potree_download_csv_icon').click(() => {
			let points = new Potree.Points();
			this.pointclouds.forEach((value, key) => {
				points.add(value.points);
			});
			
			let string = Potree.CSVExporter.toString(points);
			
			let uri = "data:application/octet-stream;base64,"+btoa(string);
			$('#potree_download_profile_ortho_link').attr("href", uri);
		});
		
		$('#potree_download_las_icon').click(() => {
			let points = new Potree.Points();
			this.pointclouds.forEach((value, key) => {
				points.add(value.points);
			});
			
			let buffer = Potree.LASExporter.toLAS(points);
			let u8view = new Uint8Array(buffer);

			let binString = "";
			for(let i = 0; i < u8view.length; i++){
				binString += String.fromCharCode(u8view[i]);
			}
			
			let uri = "data:application/octet-stream;base64,"+btoa(binString);
			$('#potree_download_profile_link').attr("href", uri);
			
			//let uri = "data:application/octet-stream;base64,"+btoa(string);
			//$('#potree_download_profile_ortho_link').attr("href", uri);
			
			//let las = viewer.profileWindow.getPointsInProfileAsLas();
			//let u8view = new Uint8Array(las);
			//
			//let binString = "";
			//for(let i = 0; i < u8view.length; i++){
			//	binString += String.fromCharCode(u8view[i]);
			//}
			//
			//let uri = "data:application/octet-stream;base64,"+btoa(binString);
			//$('#potree_download_profile_link').attr("href", uri);
		});
	}
	
	selectPoint(mileage, elevation, radius){
		
		let closest = {
			distance: Infinity,
			pointcloud: null,
			points: null,
			index: null
		};

		for(let [pointcloud, entry] of this.pointclouds){
			let points = entry.points;
			
			for(let i = 0; i < points.numPoints; i++){
				
				//let pos = new THREE.Vector3(...points.data.position.subarray(3*i, 3*i+3));
				let m = points.data.mileage[i] - mileage;
				let e = points.data.position[3*i+2] - elevation;
				
				let r = Math.sqrt(m*m + e*e);
				
				if(r < radius && r < closest.distance){
					closest = {
						distance: r,
						pointcloud: pointcloud,
						points: points,
						index: i
					};
				}
			}
		}
		
		if(closest.distance < Infinity){
			let points = closest.points;
			
			let point = {};
			
			let attributes = Object.keys(points.data);
			for(let attribute of attributes){
				let attributeData = points.data[attribute];
				let itemSize = attributeData.length / points.numPoints;
				let value = attributeData.subarray(itemSize * closest.index, itemSize * closest.index + itemSize);
				
				if(value.length === 1){
					point[attribute] = value[0];
				}else{
					point[attribute] = value;
				}
			}
			
			return point;
		}else{
			return null;
		}
	}
	
	initTHREE(){
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
		
		let sg = new THREE.SphereGeometry(1, 16, 16);
		let sm = new THREE.MeshNormalMaterial();
		this.pickSphere = new THREE.Mesh(sg, sm);
		this.pickSphere.visible = false;
		this.scene.add(this.pickSphere);
	}
	
	initSVG(){
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		let marginLeft = this.renderArea[0].offsetLeft;
		
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
	
	setProfile(profile){
		
		this.render();
	}
	
	addPoints(pointcloud, points){
		
		if(this.pointclouds.get(pointcloud) === undefined){
			
			let material = this.materialPool.getMaterial();
			let geometry = this.geometryPool.getGeometry();
			let model = new THREE.Points(geometry, material);
			this.scene.add(model);
			
			let materialChanged = e => {
				this.render();
			};
			
			pointcloud.material.addEventListener("material_property_changed", materialChanged);
			
			this.pointclouds.set(pointcloud, {
				points: new Potree.Points(),
				material: material,
				geometry: geometry,
				model: model,
				listeners: [{
					target: pointcloud.material, 
					type: "material_property_changed", 
					callback: materialChanged}]
			});
		}
		
		let pc = this.pointclouds.get(pointcloud);
		pc.points.add(points);
		
		// rebuild 3d model
		let projectedBox = new THREE.Box3();
		{
			let geometry = pc.geometry;
			
			for(let attribute of Object.keys(pc.points.data)){
				
				let buffer = pc.points.data[attribute];
				let itemSize = buffer.length / pc.points.numPoints;
				
				if(attribute === "position"){
					
					let posBuffer = new Float32Array(buffer.length);
					
					for(let i = 0; i < pc.points.numPoints; i++){
						let x = pc.points.data.mileage[i];
						let y = buffer[3*i + 2];
						
						posBuffer[3*i + 0] = x;
						posBuffer[3*i + 1] = y;
						posBuffer[3*i + 2] = y;
						projectedBox.expandByPoint(new THREE.Vector3(x, y, 0));
					}
					
					if(!posBuffer){
						console.log("wtf");
					}
					
					geometry.attributes[attribute].array.set(posBuffer);
				}else if(attribute === "color"){
					geometry.attributes[attribute].array.set(buffer);
				}else if(attribute === "mileage"){
					continue;
				}else if(geometry.attributes[attribute] === undefined){
					continue;
				}else{
					geometry.attributes[attribute].array.set(buffer);
				}
				
				geometry.attributes[attribute].needsUpdate = true;
				geometry.setDrawRange(0, pc.points.numPoints);
			}
			
			let radius = pc.points.boundingBox.getSize().toArray().reduce((a, v) => Math.max(a, v))
			geometry.boundingSphere = new THREE.Sphere(this.camera.position, radius)
			geometry.boundingBox = geometry.boundingSphere.getBoundingBox();
		}
		
		this.projectedBox.union(projectedBox);
		
		if(this.autoFit){ // SCALE
			let width = this.renderArea[0].clientWidth;
			let height = this.renderArea[0].clientHeight;
			
			let size = this.projectedBox.getSize();
			
			let sx = width / size.x;
			let sy = height / size.y;
			let scale = Math.min(sx, sy);
			
			let center = this.projectedBox.getCenter();
			this.scale.set(scale, scale, 1);
			this.camera.position.copy(center);
		}
		
		let numPoints = 0;
		for(let entry of this.pointclouds.entries()){
			numPoints += entry[1].points.numPoints;
			
			$(`#profile_num_points`).html(Potree.utils.addCommas(numPoints));
		}
		
		this.render();
	}
	
	reset(){
		
		this.autoFit = true;
		this.projectedBox = new THREE.Box3();
		
		for(let entry of this.pointclouds){
			
			let pointcloud = entry[0];
			let material = entry[1].model.material;
			let geometry = entry[1].model.geometry;
			this.materialPool.returnMaterial(material);
			this.geometryPool.returnGeometry(geometry);
			entry[1].model.material = null;
			entry[1].model.geometry = null;
			
			for(let listener of entry[1].listeners){
				listener.target.removeEventListener(listener.type, listener.callback);
			}
			
		}
		
		this.pointclouds.clear();
		this.mouseIsDown = false;
		this.mouse.set(0, 0);
		this.scale.set(1, 1, 1);
		this.pickSphere.visible = false;
		
		this.scene.children
			.filter(c => c instanceof THREE.Points)
			.forEach(c => this.scene.remove(c));
			
		this.elRoot.find("#profileSelectionProperties").hide();
			
		
		this.render();
	}
	
	show(){
		this.elRoot.fadeIn();
		this.enabled = true;
	}
	
	hide(){
		this.elRoot.fadeOut();
		this.enabled = false;
	}
	
	updateScales(){
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		
		let left   = (-width  / 2) / this.scale.x;
		let right  = (+width  / 2) / this.scale.x;
		let top    = (+height / 2) / this.scale.y;
		let bottom = (-height / 2) / this.scale.y;
		
		this.camera.left = left;
		this.camera.right = right;
		this.camera.top = top;
		this.camera.bottom = bottom;
		this.camera.updateProjectionMatrix();
		
		this.scaleX.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
			.range([0, width]);
		this.scaleY.domain([this.camera.bottom + this.camera.position.y, this.camera.top + this.camera.position.y])
			.range([height, 0]);
	}
	
	render(){
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		
		this.updateScales();
		
		{ // THREEJS

			let radius = Math.abs(this.scaleX.invert(0) - this.scaleX.invert(5));
			this.pickSphere.scale.set(radius, radius, radius);
			this.pickSphere.position.z = this.camera.far - radius;
			
			for(let entry of this.pointclouds){
				let pointcloud = entry[0];
				let material = entry[1].material;
				
				material.pointColorType = pointcloud.material.pointColorType;
				material.uniforms.intensityRange.value = pointcloud.material.uniforms.intensityRange.value;
				material.heightMin = pointcloud.material.heightMin;
				material.heightMax = pointcloud.material.heightMax;
				material.rgbGamma = pointcloud.material.rgbGamma;
				material.rgbContrast = pointcloud.material.rgbContrast;
				material.rgbBrightness = pointcloud.material.rgbBrightness;
				material.intensityRange = pointcloud.material.intensityRange;
				material.intensityGamma = pointcloud.material.intensityGamma;
				material.intensityContrast = pointcloud.material.intensityContrast;
				material.intensityBrightness = pointcloud.material.intensityBrightness;
			}
			
			this.renderer.setSize(width, height);
			
			this.renderer.render(this.scene, this.camera);
		}
		
		{ // SVG SCALES
			let marginLeft = this.renderArea[0].offsetLeft;
				
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
	
};

Potree.ProfileWindowController = class ProfileWindowController{
	
	constructor(viewer){
		this.viewer = viewer;
		this.profileWindow = viewer.profileWindow;
		this.profile = null;
		this.numPoints = 0;
		this.threshold = 30*1000;
		this.scheduledRecomputeTime = null;
		
		this.enabled = true;
		
		this.requests = [];
		
		this._recompute = () => {this.recompute()};
	}
	
	setProfile(profile){
		
		if(this.profile !== null && this.profile !== profile){
			this.profile.removeEventListener("marker_moved", this._recompute);
			this.profile.removeEventListener("marker_added", this._recompute);
			this.profile.removeEventListener("marker_removed", this._recompute);
			this.profile.removeEventListener("width_changed", this._recompute);
		}
		
		this.profile = profile;
		
		{
			this.profile.addEventListener("marker_moved", this._recompute);
			this.profile.addEventListener("marker_added", this._recompute);
			this.profile.addEventListener("marker_removed", this._recompute);
			this.profile.addEventListener("width_changed", this._recompute);

		}
		
		this.recompute();
	}
	
	reset(){
		this.profileWindow.reset();
		
		this.numPoints = 0;
		
		if(this.profile){
			for(let request of this.requests){
				request.cancel();
			}
		}
	}
	
	progressHandler(pointcloud, progress){
		
		for(let segment of progress.segments){
			this.profileWindow.addPoints(pointcloud, segment.points);
			this.numPoints += segment.points.numPoints;
		}
	}
	
	cancel(){
		for(let request of this.requests){
			request.cancel();
			//request.finishLevelThenCancel();
		}
		
		this.requests = [];
	};
	
	recompute(){
		
		if(!this.profile){
			return;
		}
		
		if(this.scheduledRecomputeTime !== null && this.scheduledRecomputeTime > new Date().getTime()){
			return;
		}else{
			this.scheduledRecomputeTime = new Date().getTime() + 100;
		}
		this.scheduledRecomputeTime = null;
		
		this.reset();
		
		for(let pointcloud of this.viewer.scene.pointclouds.filter(p => p.visible)){
			
			let request = pointcloud.getPointsInProfile(this.profile, null, {
				"onProgress": (event) => {
					if(!this.enabled){
						return;
					}
					
					this.progressHandler(pointcloud, event.points);
					
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
	
	
};

// http://epsg.io/
proj4.defs("UTM10N", "+proj=utm +zone=10 +ellps=GRS80 +datum=NAD83 +units=m +no_defs");

Potree.MapView = class{
		
	constructor(viewer){
		this.viewer = viewer;
		
		this.webMapService = "WMTS";
		this.mapProjectionName = "EPSG:3857";
		this.mapProjection = proj4.defs(this.mapProjectionName);
		this.sceneProjection = null;
		
		this.extentsLayer = null;
		this.cameraLayer = null;
		this.toolLayer = null;
		this.sourcesLayer = null;
		this.sourcesLabelLayer = null;
		this.enabled = false;
		
		this.createAnnotationStyle = (text) => {
			return [
				new ol.style.Style({
					image: new ol.style.Circle({
						radius: 10,
						stroke: new ol.style.Stroke({
							color: [255, 255, 255, 0.5],
							width: 2
						}),
						fill: new ol.style.Fill({
							color: [0, 0, 0, 0.5]
						})
					})
				})/*,
				new ol.style.Style({
					text: new ol.style.Text({
						font: '12px helvetica,sans-serif',
						text: text,
						fill: new ol.style.Fill({
							color: '#000'
						}),
						stroke: new ol.style.Stroke({
							color: '#fff',
							width: 2
						})
					})
				})*/
			];
		}
		
		this.createLabelStyle = (text) => {
			let style = new ol.style.Style({
				image: new ol.style.Circle({
					radius: 6,
					stroke: new ol.style.Stroke({
						color: 'white',
						width: 2
					}),
					fill: new ol.style.Fill({
						color: 'green'
					})
				}),
				text: new ol.style.Text({
					font: '12px helvetica,sans-serif',
					text: text,
					fill: new ol.style.Fill({
						color: '#000'
					}),
					stroke: new ol.style.Stroke({
						color: '#fff',
						width: 2
					})
				})
			});
			
			return style;
		}
		
		
	}
	
	showSources(show){
		this.sourcesLayer.setVisible(show);
		this.sourcesLabelLayer.setVisible(show);
	}
	
	init(){
		this.elMap = $("#potree_map");
		this.elMap.draggable({ handle: $('#potree_map_header') });
		this.elMap.resizable();
		
		this.elTooltip = $(`<div style="position: relative; z-index: 100"></div>`);
		this.elMap.append(this.elTooltip);
	
		let extentsLayer = this.getExtentsLayer();
		let cameraLayer = this.getCameraLayer();
		let toolLayer = this.getToolLayer();
		let sourcesLayer = this.getSourcesLayer();
		let sourcesLabelLayer = this.getSourcesLabelLayer();
		let annotationsLayer = this.getAnnotationsLayer();
		
		let mousePositionControl = new ol.control.MousePosition({
			coordinateFormat: ol.coordinate.createStringXY(5),
			projection: "EPSG:4326",
			undefinedHTML: '&nbsp;'
		});
		
		let _this = this;
		let DownloadSelectionControl = function(opt_options){
			let options = opt_options || {};
			
			// TOGGLE TILES
			let btToggleTiles = document.createElement('button');
			btToggleTiles.innerHTML = 'T';
			btToggleTiles.addEventListener('click', () => {
				let visible = sourcesLayer.getVisible();
				_this.showSources(!visible);
				//sourcesLayer.setVisible(!visible);
				//sourcesLabelLayer.setVisible(!visible);
			}, false);
			btToggleTiles.style.float = "left";
			btToggleTiles.title = "show / hide tiles";
			
			// DOWNLOAD SELECTED TILES
			let link = document.createElement("a");
			link.href = "#";
			link.download = "list.txt";
			link.style.float = "left";
			
			let button = document.createElement('button');
			button.innerHTML = 'D';
			link.appendChild(button);
			
			let this_ = this;
			let handleDownload = (e) => {
				let features = selectedFeatures.getArray();
				
				let url =  [location.protocol, '//', location.host, location.pathname].join('');
				
				if(features.length === 0){
					alert("No tiles were selected. Select area with ctrl + left mouse button!");
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
				}else if(features.length === 1){
					let feature = features[0];
					
					if(feature.source){
						let cloudjsurl = feature.pointcloud.pcoGeometry.url;
						let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
						link.href = sourceurl.href;
						link.download = feature.source.name;
					}
				}else{
					let content = "";
					for(var i = 0; i < features.length; i++){
						let feature = features[i];
						
						if(feature.source){
							let cloudjsurl = feature.pointcloud.pcoGeometry.url;
							let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
							content += sourceurl.href + "\n";
						}
					}
					
					let uri = "data:application/octet-stream;base64,"+btoa(content);
					link.href = uri;
					link.download = "list_of_files.txt";
				}
			};
			
			button.addEventListener('click', handleDownload, false);
			
			// assemble container
			let element = document.createElement('div');
			element.className = 'ol-unselectable ol-control';
			element.appendChild(link);
			element.appendChild(btToggleTiles);
			element.style.bottom = "0.5em";
			element.style.left = "0.5em";
			element.title = "Download file or list of selected tiles. Select tile with left mouse button or area using ctrl + left mouse.";
			
			ol.control.Control.call(this, {
				element: element,
				target: options.target
			});
			
		};
		ol.inherits(DownloadSelectionControl, ol.control.Control);
		
		this.map = new ol.Map({
			controls: ol.control.defaults({
				attributionOptions: ({
				collapsible: false
				})
			}).extend([
				//this.controls.zoomToExtent,
				new DownloadSelectionControl(),
				mousePositionControl
			]),
			layers: [
				new ol.layer.Tile({source: new ol.source.OSM()}),
				this.toolLayer,
				this.annotationsLayer,
				this.sourcesLayer,
				this.sourcesLabelLayer,
				extentsLayer,
				cameraLayer
			],
			target: 'potree_map_content',
			view: new ol.View({
				center: this.olCenter,
				zoom: 9
			})
		});

		// DRAGBOX / SELECTION
		this.dragBoxLayer = new ol.layer.Vector({
			source: new ol.source.Vector({}),
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					  color: 'rgba(0, 0, 255, 1)',
					  width: 2
				})
			})
		});
		this.map.addLayer(this.dragBoxLayer);
		
		let select = new ol.interaction.Select();
		this.map.addInteraction(select);
		
		let selectedFeatures = select.getFeatures();
        
		let dragBox = new ol.interaction.DragBox({
		  condition: ol.events.condition.platformModifierKeyOnly
		});
        
		this.map.addInteraction(dragBox);
		
		this.map.on('pointermove', evt => {
			let pixel = evt.pixel;
			let feature = this.map.forEachFeatureAtPixel(pixel, function(feature) {
				return feature;
			});
			
			//console.log(feature);
			//this.elTooltip.css("display", feature ? '' : 'none');
			this.elTooltip.css("display", "none");
			if(feature && feature.onHover){
				feature.onHover(evt);
				//overlay.setPosition(evt.coordinate);
				//tooltip.innerHTML = feature.get('name');
			}
		});
		
		this.map.on('click', evt => {
			let pixel = evt.pixel;
			let feature = this.map.forEachFeatureAtPixel(pixel, function(feature) {
				return feature;
			});
			
			if(feature && feature.onHover){
				feature.onClick(evt);
			}
		});
        
		dragBox.on('boxend', (e) => {
			// features that intersect the box are added to the collection of
			// selected features, and their names are displayed in the "info"
			// div
			let extent = dragBox.getGeometry().getExtent();
			this.getSourcesLayer().getSource().forEachFeatureIntersectingExtent(extent, (feature) => {
				selectedFeatures.push(feature);
			});
		});
		
		// clear selection when drawing a new box and when clicking on the map
		dragBox.on('boxstart', (e) => {
			selectedFeatures.clear();
		});
		this.map.on('click', () => {
			selectedFeatures.clear();
		});

		this.viewer.addEventListener("scene_changed", e => {
			this.setScene(e.scene);
		});
		
		this.onPointcloudAdded = e => {
			this.load(e.pointcloud);
		};
		
		this.onAnnotationAdded = e => {
			if(!this.sceneProjection){
				return;
			}
			
			let annotation = e.annotation;
			let position = annotation.position;
			let mapPos = this.toMap.forward([position.x, position.y]);
			let feature = new ol.Feature({
				 geometry: new ol.geom.Point(mapPos),
				 name: annotation.title
			});
			feature.setStyle(this.createAnnotationStyle(annotation.title));
			
			feature.onHover = evt => {
				let coordinates = feature.getGeometry().getCoordinates();
				let p = this.map.getPixelFromCoordinate(coordinates);
				
				this.elTooltip.html(annotation.title);
				this.elTooltip.css("display", "");
				this.elTooltip.css("left", `${p[0]}px`);
				this.elTooltip.css("top", `${p[1]}px`);
			};
			
			feature.onClick = evt => {
				annotation.clickTitle();
			};
			
			this.getAnnotationsLayer().getSource().addFeature(feature);
		};
		
		this.setScene(this.viewer.scene);
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		};
		
		if(this.scene){
			this.scene.removeEventListener("pointcloud_added", this.onPointcloudAdded);
			this.scene.annotations.removeEventListener("annotation_added", this.onAnnotationAdded);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("pointcloud_added", this.onPointcloudAdded);
		this.scene.annotations.addEventListener("annotation_added", this.onAnnotationAdded);
		
		for(let pointcloud of this.viewer.scene.pointclouds){
			this.load(pointcloud);
		}
		
		this.viewer.scene.annotations.traverseDescendants(annotation => {
			this.onAnnotationAdded({annotation: annotation});
		});
	}
	
	getExtentsLayer(){
		if(this.extentsLayer){
			return this.extentsLayer;
		}
		
		this.gExtent = new ol.geom.LineString([[0,0], [0,0]]);
		
		let feature = new ol.Feature(this.gExtent);
		let featureVector = new ol.source.Vector({
			features: [feature]
		});
		
		this.extentsLayer = new ol.layer.Vector({
			source: featureVector,
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 255, 255, 0.2)'
				}),
				stroke: new ol.style.Stroke({
					  color: '#0000ff',
					  width: 2
				}),
				image: new ol.style.Circle({
					radius: 3,
					fill: new ol.style.Fill({
						color: '#0000ff'
					})
				})
			})
		});
		
		return this.extentsLayer;
	}
	
	getAnnotationsLayer(){
		if(this.annotationsLayer){
			return this.annotationsLayer;
		}
		
		this.annotationsLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
			}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 1)'
				}),
				stroke: new ol.style.Stroke({
					  color: 'rgba(255, 0, 0, 1)',
					  width: 2
				})
			})
		});
		
		return this.annotationsLayer;
	}
	
	getCameraLayer(){
		if(this.cameraLayer){
			return this.cameraLayer;
		}
		
		// CAMERA LAYER
		this.gCamera = new ol.geom.LineString([[0,0], [0,0], [0,0], [0,0]]);
		let feature = new ol.Feature(this.gCamera);
		let featureVector = new ol.source.Vector({
			features: [feature]
		});
		
		this.cameraLayer = new ol.layer.Vector({
			source: featureVector,
			style: new ol.style.Style({
				stroke: new ol.style.Stroke({
					  color: '#0000ff',
					  width: 2
				})
			})
		});
		
		return this.cameraLayer;
	}
	
	getToolLayer(){
		if(this.toolLayer){
			return this.toolLayer;
		}
		
		this.toolLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
			}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 1)'
				}),
				stroke: new ol.style.Stroke({
					  color: 'rgba(255, 0, 0, 1)',
					  width: 2
				})
			})
		});
		
		return this.toolLayer;
	}
	
	getSourcesLayer(){
		if(this.sourcesLayer){
			return this.sourcesLayer;
		}
		
		this.sourcesLayer = new ol.layer.Vector({
			source: new ol.source.Vector({}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(0, 0, 150, 0.1)'
				}),
				stroke: new ol.style.Stroke({
					  color: 'rgba(0, 0, 150, 1)',
					  width: 1
				})
			})
		});
		
		return this.sourcesLayer;
	}
	
	getSourcesLabelLayer(){
		if(this.sourcesLabelLayer){
			return this.sourcesLabelLayer;
		}
		
		this.sourcesLabelLayer = new ol.layer.Vector({
			source: new ol.source.Vector({
			}),
			style: new ol.style.Style({
				fill: new ol.style.Fill({
					color: 'rgba(255, 0, 0, 0.1)'
				}),
				stroke: new ol.style.Stroke({
					  color: 'rgba(255, 0, 0, 1)',
					  width: 2
				})
			}),
			minResolution: 0.01,
            maxResolution: 20
		});
		
		return this.sourcesLabelLayer;
	}
	
	setSceneProjection(sceneProjection){
		this.sceneProjection = sceneProjection;
		this.toMap = proj4(this.sceneProjection, this.mapProjection);
		this.toScene = proj4(this.mapProjection, this.sceneProjection);
	};
	
	getMapExtent(){
		let bb = this.viewer.getBoundingBox();
		
		let bottomLeft = this.toMap.forward([bb.min.x, bb.min.y]);
		let bottomRight = this.toMap.forward([bb.max.x, bb.min.y]);
		let topRight = this.toMap.forward([bb.max.x, bb.max.y]);
		let topLeft = this.toMap.forward([bb.min.x, bb.max.y]);
		
		let extent = {
			bottomLeft: bottomLeft,
			bottomRight: bottomRight,
			topRight: topRight,
			topLeft: topLeft
		};
		
		return extent;
	};
	
	getMapCenter(){
		let mapExtent = this.getMapExtent();
		
		let mapCenter = [
			(mapExtent.bottomLeft[0] + mapExtent.topRight[0]) / 2, 
			(mapExtent.bottomLeft[1] + mapExtent.topRight[1]) / 2
		];
		
		return mapCenter;
	};	
	
	updateToolDrawings(){
		this.toolLayer.getSource().clear();
		
		let profiles = this.viewer.profileTool.profiles;
		for(var i = 0; i < profiles.length; i++){
			let profile = profiles[i];
			let coordinates = [];
			
			for(var j = 0; j < profile.points.length; j++){
				let point = profile.points[j];
				let pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}
			
			let line = new ol.geom.LineString(coordinates);
			let feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}
		
		let measurements = this.viewer.measuringTool.measurements;
		for(var i = 0; i < measurements.length; i++){
			let measurement = measurements[i];
			let coordinates = [];
			
			for(var j = 0; j < measurement.points.length; j++){
				let point = measurement.points[j].position;
				let pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}
			
			if(measurement.closed && measurement.points.length > 0){
				coordinates.push(coordinates[0]);
			}
			
			let line = new ol.geom.LineString(coordinates);
			let feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}
	}
	
	
	load(pointcloud){
		
		if(!pointcloud){
			return;
		}
		
		if(!pointcloud.projection){
			return;
		}
		
		if(!this.sceneProjection){
			this.setSceneProjection(pointcloud.projection);
		}
		
		let mapExtent = this.getMapExtent();
		let mapCenter = this.getMapCenter();
		
		
		let view = this.map.getView();
		view.setCenter(mapCenter);
		
		this.gExtent.setCoordinates([
			mapExtent.bottomLeft, 
			mapExtent.bottomRight, 
			mapExtent.topRight, 
			mapExtent.topLeft,
			mapExtent.bottomLeft
		]);
		
		view.fit(this.gExtent, [300, 300], {
			constrainResolution: false
		});

		

		let url = pointcloud.pcoGeometry.url + "/../sources.json";
		$.getJSON(url, (data) => {
			let sources = data.sources;
			
			for(var i = 0; i < sources.length; i++){
				let source = sources[i];
				let name = source.name;
				let points = source.points;
				let bounds = source.bounds;

				let mapBounds = {
					min: this.toMap.forward( [bounds.min[0], bounds.min[1]] ),
					max: this.toMap.forward( [bounds.max[0], bounds.max[1]] )
				}
				let mapCenter = [
					(mapBounds.min[0] + mapBounds.max[0]) / 2,
					(mapBounds.min[1] + mapBounds.max[1]) / 2,
				];
				
				let p1 = this.toMap.forward( [bounds.min[0], bounds.min[1]] );
				let p2 = this.toMap.forward( [bounds.max[0], bounds.min[1]] );
				let p3 = this.toMap.forward( [bounds.max[0], bounds.max[1]] );
				let p4 = this.toMap.forward( [bounds.min[0], bounds.max[1]] );
				
				let boxes = [];
				//var feature = new ol.Feature({
				//	'geometry': new ol.geom.LineString([p1, p2, p3, p4, p1])
				//});
				let feature = new ol.Feature({
					'geometry': new ol.geom.Polygon([[p1, p2, p3, p4, p1]])
				});
				feature.source = source;
				feature.pointcloud = pointcloud;
				this.getSourcesLayer().getSource().addFeature(feature);
				
                
				feature = new ol.Feature({
					 geometry: new ol.geom.Point(mapCenter),
					 name: name 
				});
				feature.setStyle(this.createLabelStyle(name));
				this.sourcesLabelLayer.getSource().addFeature(feature);
			}
		});
		
	}
	
	toggle(){
		
		if(this.elMap.is(":visible")){
			this.elMap.css("display", "none");
			this.enabled = false;
		}else{
			this.elMap.css("display", "block");
			this.enabled = true;
		}
		
	}
	
	update(delta){
		if(!this.sceneProjection){
			return;
		}
		
		let pm = $( "#potree_map" );
		
		if(!this.enabled){
			return;
		}
		
		// resize
		let mapSize = this.map.getSize();
		let resized = (pm.width() != mapSize[0] || pm.height() != mapSize[1]);
		if(resized){
			this.map.updateSize();
		}
		
		// camera
		let scale = this.map.getView().getResolution();
		let camera = this.viewer.scene.camera;
		let campos = camera.position;
		let camdir = camera.getWorldDirection();
		let sceneLookAt = camdir.clone().multiplyScalar(30 * scale).add(campos);
		let geoPos = camera.position;
		let geoLookAt = sceneLookAt;
		let mapPos = new THREE.Vector2().fromArray(this.toMap.forward([geoPos.x, geoPos.y]));
		let mapLookAt = new THREE.Vector2().fromArray(this.toMap.forward([geoLookAt.x, geoLookAt.y]));
		let mapDir = new THREE.Vector2().subVectors(mapLookAt, mapPos).normalize();
		mapLookAt = mapPos.clone().add(mapDir.clone().multiplyScalar(30 * scale));
		let mapLength = mapPos.distanceTo(mapLookAt);
		let mapSide = new THREE.Vector2(-mapDir.y, mapDir.x);
		
		let p1 = mapPos.toArray();
		let p2 = mapLookAt.clone().sub(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();
		let p3 = mapLookAt.clone().add(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();

		
		this.gCamera.setCoordinates([p1, p2, p3, p1]);
	}
	
	get sourcesVisible(){
		return this.getSourcesLayer().getVisible();
	}
	
	set sourcesVisible(value){
		this.getSourcesLayer().setVisible(value);
	}
	
};







let createToolIcon = function(icon, title, callback){
	let element = $(`
		<img src="${icon}" 
			style="width: 32px; height: 32px" 
			class="button-icon" 
			data-i18n="${title}" />
	`);
	
	element.click(callback);
	
	return element;
};

function initToolbar(){

	// ANGLE
	let elToolbar = $("#tools");
	elToolbar.append(createToolIcon(
		Potree.resourcePath + "/icons/angle.png",
		"[title]tt.angle_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: false, 
				showAngles: true, 
				showArea: false, 
				closed: true, 
				maxMarkers: 3,
				name: "Angle"});
		}
	));
	
	// POINT
	elToolbar.append(createToolIcon(
		Potree.resourcePath + "/icons/point.svg",
		"[title]tt.point_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: false, 
				showAngles: false, 
				showCoordinates: true, 
				showArea: false, 
				closed: true, 
				maxMarkers: 1,
				name: "Point"});
		}
	));
	
	// DISTANCE
	elToolbar.append(createToolIcon(
		Potree.resourcePath + "/icons/distance.svg",
		"[title]tt.distance_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: true, 
				showArea: false, 
				closed: false,
				name: "Distance"});
		}
	));
	
	// HEIGHT
	elToolbar.append(createToolIcon(
		Potree.resourcePath + "/icons/height.svg",
		"[title]tt.height_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: false, 
				showHeight: true, 
				showArea: false, 
				closed: false, 
				maxMarkers: 2,
				name: "Height"});
		}
	));
	
	// AREA
	elToolbar.append(createToolIcon(
		Potree.resourcePath + "/icons/area.svg",
		"[title]tt.area_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: true, 
				showArea: true, 
				closed: true,
				name: "Area"});
		}
	));
	
	// VOLUME
	elToolbar.append(createToolIcon(
		Potree.resourcePath + "/icons/volume.svg",
		"[title]tt.volume_measurement",
		function(){viewer.volumeTool.startInsertion()}
	));
	
	// PROFILE
	elToolbar.append(createToolIcon(
		Potree.resourcePath + "/icons/profile.svg",
		"[title]tt.height_profile",
		function(){
			$("#menu_measurements").next().slideDown();;
			viewer.profileTool.startInsertion();
		}
	));
	
	// CLIP VOLUME
	elToolbar.append(createToolIcon(
		Potree.resourcePath + "/icons/clip_volume.svg",
		"[title]tt.clip_volume",
		function(){viewer.volumeTool.startInsertion({clip: true})}
	));
	
	// REMOVE ALL
	elToolbar.append(createToolIcon(
		Potree.resourcePath + "/icons/reset_tools.svg",
		"[title]tt.remove_all_measurement",
		function(){
			viewer.scene.removeAllMeasurements();
		}
	));
}

function initClassificationList(){
	let elClassificationList = $("#classificationList");
	
	let addClassificationItem = function(code, name){
		
		let inputID = "chkClassification_" + code;
		
		let element = $(`
			<li>
				<label style="whitespace: nowrap">
					<input id="${inputID}" type="checkbox" checked/>
					<span>${name}</span>
				</label>
			</li>
		`);
		
		let elInput = element.find("input");
		
		elInput.click(event => {
			viewer.setClassificationVisibility(code, event.target.checked);
		});
		
		elClassificationList.append(element);
	};
	
	addClassificationItem(0, "never classified");
	addClassificationItem(1, "unclassified");
	addClassificationItem(2, "ground");
	addClassificationItem(3, "low vegetation");
	addClassificationItem(4, "medium vegetation");
	addClassificationItem(5, "high vegetation");
	addClassificationItem(6, "building");
	addClassificationItem(7, "low point(noise)");
	addClassificationItem(8, "key-point");
	addClassificationItem(9, "water");
	addClassificationItem(12, "overlap");
}

function initAccordion(){
	
	$(".accordion > h3").each(function(){
		let header = $(this);
		let content = $(this).next();
		
		header.addClass("accordion-header ui-widget");
		content.addClass("accordion-content ui-widget");
		
		content.hide();
		
		header.click(function(){
			content.slideToggle();
		});
	});
	
	// to close all, call
	// $(".accordion > div").hide()
	
	// to open the, for example, tool menu, call: 
	// $("#menu_tools").next().show()
	
}

function initAppearance(){

	//$( "#optQuality" ).selectmenu();
	
	//$("#optQuality").val(viewer.getQuality()).selectmenu("refresh")
	//$("#optQuality").selectmenu({
	//	change: function(event, ui){
	//		viewer.setQuality(ui.item.value);
	//	}
	//});


	$( "#sldPointBudget" ).slider({
		value: viewer.getPointBudget(),
		min: 100*1000,
		max: 5*1000*1000,
		step: 1000,
		slide: function( event, ui ) {viewer.setPointBudget(ui.value);}
	});
	
	$( "#sldFOV" ).slider({
		value: viewer.getFOV(),
		min: 20,
		max: 100,
		step: 1,
		slide: function( event, ui ) {viewer.setFOV(ui.value);}
	});
	
	$( "#sldEDLRadius" ).slider({
		value: viewer.getEDLRadius(),
		min: 1,
		max: 4,
		step: 0.01,
		slide: function( event, ui ) {viewer.setEDLRadius(ui.value);}
	});
	
	$( "#sldEDLStrength" ).slider({
		value: viewer.getEDLStrength(),
		min: 0,
		max: 5,
		step: 0.01,
		slide: function( event, ui ) {viewer.setEDLStrength(ui.value);}
	});
	
	viewer.addEventListener("point_budget_changed", function(event){
		$( '#lblPointBudget')[0].innerHTML = Potree.utils.addCommas(viewer.getPointBudget());
		$( "#sldPointBudget" ).slider({value: viewer.getPointBudget()});
	});
	
	viewer.addEventListener("fov_changed", function(event){
		$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
		$( "#sldFOV" ).slider({value: viewer.getFOV()});
	});

	//viewer.addEventListener("quality_changed", e => {
	//	
	//	let name = viewer.quality;
	//	
	//	$( "#optQuality" )
	//		.selectmenu()
	//		.val(name)
	//		.selectmenu("refresh");
	//});
	
	viewer.addEventListener("edl_radius_changed", function(event){
		$('#lblEDLRadius')[0].innerHTML = viewer.getEDLRadius().toFixed(1);
		$( "#sldEDLRadius" ).slider({value: viewer.getEDLRadius()});
	});
	
	viewer.addEventListener("edl_strength_changed", function(event){
		$('#lblEDLStrength')[0].innerHTML = viewer.getEDLStrength().toFixed(1);
		$( "#sldEDLStrength" ).slider({value: viewer.getEDLStrength()});
	});
	
	viewer.addEventListener("background_changed", function(event){
		$("input[name=background][value='" + viewer.getBackground() +  "']").prop("checked",true);
	});
	
	
	$('#lblPointBudget')[0].innerHTML = Potree.utils.addCommas(viewer.getPointBudget());
	$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
	$('#lblEDLRadius')[0].innerHTML = viewer.getEDLRadius().toFixed(1);
	$('#lblEDLStrength')[0].innerHTML = viewer.getEDLStrength().toFixed(1);
	$('#chkEDLEnabled')[0].checked = viewer.getEDLEnabled();
	$("input[name=background][value='" + viewer.getBackground() +  "']").prop("checked",true);
}
	
	
function initNavigation(){

	let elNavigation = $("#navigation");
	let sldMoveSpeed = $("#sldMoveSpeed");
	let lblMoveSpeed = $('#lblMoveSpeed');
	
	elNavigation.append(createToolIcon(
		Potree.resourcePath + "/icons/earth_controls_1.png",
        "[title]tt.earth_control",
		function(){viewer.setNavigationMode(Potree.EarthControls)}
	));
	
	elNavigation.append(createToolIcon(
		Potree.resourcePath + "/icons/fps_controls.png",
        "[title]tt.flight_control",
		function(){viewer.setNavigationMode(Potree.FirstPersonControls)}
	));
	
	elNavigation.append(createToolIcon(
		Potree.resourcePath + "/icons/orbit_controls.svg",
		"[title]tt.orbit_control",
		function(){viewer.setNavigationMode(Potree.OrbitControls)}
	));
	
	elNavigation.append(createToolIcon(
		Potree.resourcePath + "/icons/focus.svg",
		"[title]tt.focus_control",
		function(){viewer.fitToScreen()}
	));
	
	elNavigation.append(createToolIcon(
		Potree.resourcePath + "/icons/topview.svg",
		"[title]tt.top_view_control",
		function(){viewer.setTopView()}
	));
	
	elNavigation.append(createToolIcon(
		Potree.resourcePath + "/icons/frontview.svg",
		"[title]tt.front_view_control",
		function(){viewer.setFrontView()}
	));
	
	elNavigation.append(createToolIcon(
		Potree.resourcePath + "/icons/leftview.svg",
		"[title]tt.left_view_control",
		function(){viewer.setLeftView()}
	));
	
	let speedRange = new THREE.Vector2(1, 10*1000);
	
	let toLinearSpeed = function(value){
		return Math.pow(value, 4) * speedRange.y + speedRange.x;
	};
	
	let toExpSpeed = function(value){
		return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
	};

	sldMoveSpeed.slider({
		value: toExpSpeed( viewer.getMoveSpeed() ),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) { viewer.setMoveSpeed(toLinearSpeed(ui.value)); }
	});
	
	viewer.addEventListener("move_speed_changed", function(event){
		lblMoveSpeed.html(viewer.getMoveSpeed().toFixed(1));
		sldMoveSpeed.slider({value: toExpSpeed(viewer.getMoveSpeed())});
	});
	
	lblMoveSpeed.html(viewer.getMoveSpeed().toFixed(1));
}

function initAnnotationDetails(){
	
	// annotation_details
	let annotationPanel = $("#annotation_details");
	
	let registeredEvents = [];
	
	let rebuild = () => {
		annotationPanel.empty();
		for(let registeredEvent of registeredEvents){
			let {type, dispatcher, callback} = registeredEvent;
			dispatcher.removeEventListener(type, callback);
		}
		registeredEvents = [];
		
		let checked = viewer.getShowAnnotations() ? "checked" : "";
		
		let chkEnable = $(`
			<li>
				<label>
					<input type="checkbox" id="chkShowAnnotations" ${checked}
						onClick="viewer.setShowAnnotations(this.checked)"/>
					<span data-i18n="annotations.show3D"></span>
				</label>
				<label>
					<input type="checkbox" id="chkShowAnnotationsMap" ${checked}
						onClick="viewer.mapView.getAnnotationsLayer().setVisible(this.checked)"/>
					<span data-i18n="annotations.showMap"></span>
				</label>
			</li>
		`);
		annotationPanel.append(chkEnable);
		
		
		//let stack = viewer.scene.annotations.children.reverse().map(
		//	a => ({annotation: a, container: annotationPanel}));
		
		let stack = viewer.scene.annotations.children.map(
			a => ({annotation: a, container: annotationPanel}));
		
		
		while(stack.length > 0){
			
			let {annotation, container} = stack.shift();
			
			// ►	U+25BA	\u25BA
			// ▼	U+25BC	\u25BC
			
			let element = $(`
				<div class="annotation-item" style="margin: 8px 20px">
					<span class="annotation-main">
						<span class="annotation-expand">\u25BA</span>
						<span class="annotation-label">
							${annotation.title}
						</span>
					</span>
				</div>
			`);
			
			let elMain = element.find(".annotation-main");
			let elExpand = element.find(".annotation-expand");
			
			elExpand.css("display", annotation.children.length > 0 ? "block" : "none");
			
			let actions = [];
			{ // ACTIONS, INCLUDING GOTO LOCATION
				if(annotation.hasView()){
					let action = new Potree.Action({
						"icon": Potree.resourcePath + "/icons/target.svg",
						"onclick": (e) => {annotation.moveHere(viewer.scene.camera)}
					});
					
					actions.push(action);
				}
				
				for(let action of annotation.actions){
					actions.push(action);
				}
			}
			
			actions = actions.filter(
				a => a.showIn === undefined || a.showIn.includes("sidebar"));
			
			// FIRST ACTION
			if(annotation.children.length === 0 && actions.length > 0){
				let action = actions[0];
				
				let elIcon = $(`<img src="${action.icon}" class="annotation-icon">`);
				
				if(action.tooltip){
					elIcon.attr("title", action.tooltip);
				}
				
				elMain.append(elIcon);
				elMain.click(e => action.onclick({annotation: annotation}));
				elMain.mouseover(e => elIcon.css("opacity", 1));
				elMain.mouseout(e => elIcon.css("opacity", 0.5));
				
				{
					let iconChanged = e => {
						elIcon.attr("src", e.icon);
					};
					
					action.addEventListener("icon_changed", iconChanged);
					registeredEvents.push({
						type: "icon_changed",
						dispatcher: action,
						callback: iconChanged
					});
				}
				
				actions.splice(0, 1);
			}
			
			// REMAINING ACTIONS
			for(let action of actions){
				
				let elIcon = $(`<img src="${action.icon}" class="annotation-icon">`);
				
				if(action.tooltip){
					elIcon.attr("title", action.tooltip);
				}
				
				elIcon.click(e => {
					action.onclick({annotation: annotation}); 
					return false;
				});
				elIcon.mouseover(e => elIcon.css("opacity", 1));
				elIcon.mouseout(e => elIcon.css("opacity", 0.5));
				
				{
					let iconChanged = e => {
						elIcon.attr("src", e.icon);
					};
					
					action.addEventListener("icon_changed", iconChanged);
					registeredEvents.push({
						type: "icon_changed",
						dispatcher: action,
						callback: iconChanged
					});
				}
				
				element.append(elIcon);
			}
			
			element.mouseover(e => annotation.setHighlighted(true));
			element.mouseout(e => annotation.setHighlighted(false));
			
			annotation.setHighlighted(false);
			
			container.append(element);
			
			if(annotation.children.length > 0){
				
				element.click(e => {
					
					if(element.next().is(":visible")){
						elExpand.html("\u25BA");
					}else{
						elExpand.html("\u25BC");
					}
					
					element.next().toggle(100);
				});
				
				//let left = ((annotation.level()) * 20) + "px";
				let left = "20px";
				let childContainer = $(`<div style="margin: 0px; padding: 0px 0px 0px ${left}; display: none"></div>`);
				for(let child of annotation.children){
					container.append(childContainer);
					stack.push({annotation: child, container: childContainer});
				}
			}
			
		};
		
		annotationPanel.i18n();
	};
	
	let annotationsChanged = e => {
		rebuild();
	};
	
	viewer.addEventListener("scene_changed", e => {
		e.oldScene.annotations.removeEventListener("annotation_added", annotationsChanged);
		e.scene.annotations.addEventListener("annotation_added", annotationsChanged);
		
		rebuild();
	});
	
	viewer.scene.annotations.addEventListener("annotation_added", annotationsChanged);
	
	rebuild();
}

function initMeasurementDetails(){
	
	let id = 0;
	let trackedItems = new Map();
	
	let removeIconPath = Potree.resourcePath + "/icons/remove.svg";
	let mlist = $("#measurement_list");
	
	let createCoordinatesTable = (measurement) => {
		
		let table = $(`
			<table class="measurement_value_table">
				<tr>
					<th>x</th>
					<th>y</th>
					<th>z</th>
				</tr>
			</table>
		`);
		
		for(let point of measurement.points){
			let position = point instanceof THREE.Vector3 ? point : point.position;
			
			let x = Potree.utils.addCommas(position.x.toFixed(3));
			let y = Potree.utils.addCommas(position.y.toFixed(3));
			let z = Potree.utils.addCommas(position.z.toFixed(3));
			
			let row = $(`
				<tr>
					<td><span>${x}</span></td>
					<td><span>${y}</span></td>
					<td><span>${z}</span></td>
				</tr>
			`);
			
			table.append(row);
		}
		
		return table;
	};
	
	let createAttributesTable = (measurement) => {
		
		let elTable = $('<table class="measurement_value_table"></table>');
		
		let point = measurement.points[0];
		
		if(point.color){
			let color = point.color;
			let text = color.join(", ");
			
			elTable.append($(`
				<tr>
					<td>rgb</td>
					<td>${text}</td>
				</tr>
			`));
		}
		
		return elTable;
	};
	
	class MeasurePanel{
		constructor(scene, measurement){
			this.scene = scene;
			this.measurement = measurement;
			this.icon = null;
			
			this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
			this.id = this.constructor.counter;
			
			let title = measurement.name;
			
			this.elPanel = $(`
				<span class="measurement_item">
					<!-- HEADER -->
					<div class="measurement_header" onclick="$(this).next().slideToggle(200)">
						<span class="measurement_icon"><img src="" class="measurement_item_icon" /></span>
						<span class="measurement_header_title">${title}</span>
					</div>
					
					<!-- DETAIL -->
					<div class="measurement_content selectable" style="display: none">
						
					</div>
				</span>
			`);
			
			this.elContentContainer = this.elPanel.find(".measurement_content");
			this.elIcon = this.elPanel.find(".measurement_item_icon");
			
			this._update = () => {this.update()};
		}
		
		destroy(){
			
		}
		
		update(){
			
		}
	};
	
	class DistancePanel extends MeasurePanel{
		constructor(scene, measurement){
			super(scene, measurement);
			
			this.typename = "Distance";
			this.icon = Potree.resourcePath + "/icons/distance.svg";
			this.elIcon.attr("src", this.icon);
			
			this.elContent = $(`
				<div>
					<span class="coordinates_table_container"></span>
					
					
					
					<br>
					<table id="distances_table_${this.id}" class="measurement_value_table">
					</table>
					
					<!-- ACTIONS -->
					<div style="display: flex; margin-top: 12px">
						<span></span>
						<span style="flex-grow: 1"></span>
						<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
					</div>
				</div>
			`);
			this.elContentContainer.append(this.elContent);
			
			let elRemove = this.elContent.find(".measurement_action_remove");
			elRemove.click(() => {this.scene.removeMeasurement(measurement)});
			
			this.measurement.addEventListener("marker_added", this._update);
			this.measurement.addEventListener("marker_removed", this._update);
			this.measurement.addEventListener("marker_moved", this._update);
			
			this.update();
		}
		
		update(){
			let elCoordiantesContainer = this.elContent.find(".coordinates_table_container");
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(createCoordinatesTable(this.measurement));
			
			
			let positions = this.measurement.points.map(p => p.position);
			let distances = [];
			for(let i = 0; i < positions.length - 1; i++){
				let d = positions[i].distanceTo(positions[i+1]);
				distances.push(d.toFixed(3));
			}
			
			let totalDistance = this.measurement.getTotalDistance().toFixed(3);
			let elDistanceTable = this.elContent.find(`#distances_table_${this.id}`);
			elDistanceTable.empty();
			
			for(let i = 0; i < distances.length; i++){
				let label = (i === 0) ? "Distances: " : "";
				let distance = distances[i];
				let elDistance = $(`
					<tr>
						<th>${label}</th>
						<td style="width: 100%; padding-left: 10px">${distance}</td>
					</tr>`);
				elDistanceTable.append(elDistance);
			}
			
			
			let elTotal = $(`
				<tr>
					<th>Total: </td><td style="width: 100%; padding-left: 10px">${totalDistance}</th>
				</tr>`);
			elDistanceTable.append(elTotal);
			
			//let elDistance = this.elContent.find(`#distance_${this.id}`);
			//elDistance.html(totalDistance);
		}
		
		destroy(){
			this.elPanel.remove();
			
			this.measurement.removeEventListener("marker_added", this._update);
			this.measurement.removeEventListener("marker_removed", this._update);
			this.measurement.removeEventListener("marker_moved", this._update);
		}
		
	};
	
	class PointPanel extends MeasurePanel{
		constructor(scene, measurement){
			super(scene, measurement);
			
			this.typename = "Point";
			this.icon = Potree.resourcePath + "/icons/point.svg";
			
			this.elIcon.attr("src", this.icon);
			
			let totalDistance = this.measurement.getTotalDistance().toFixed(3);
			this.elContent = $(`
				<div>
					<span class="coordinates_table_container"></span>
					
					<br>
					
					<span class="attributes_table_container"></span>
					
					
					<!-- ACTIONS -->
					<div style="display: flex; margin-top: 12px">
						<span></span>
						<span style="flex-grow: 1"></span>
						<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
					</div>
				</div>
			`);
			this.elContentContainer.append(this.elContent);
			
			let elRemove = this.elContent.find(".measurement_action_remove");
			elRemove.click(() => {this.scene.removeMeasurement(measurement)});
			
			this.measurement.addEventListener("marker_added", this._update);
			this.measurement.addEventListener("marker_removed", this._update);
			this.measurement.addEventListener("marker_moved", this._update);
			
			this.update();
		}
		
		update(){
			let elCoordiantesContainer = this.elContent.find(".coordinates_table_container");
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(createCoordinatesTable(this.measurement));
			
			let elAttributesContainer = this.elContent.find(".attributes_table_container");
			elAttributesContainer.empty();
			elAttributesContainer.append(createAttributesTable(this.measurement));
		}
		
		destroy(){
			this.elPanel.remove();
			
			this.measurement.removeEventListener("marker_added", this._update);
			this.measurement.removeEventListener("marker_removed", this._update);
			this.measurement.removeEventListener("marker_moved", this._update);
		}
		
	};
	
	class AreaPanel extends MeasurePanel{
		constructor(scene, measurement){
			super(scene, measurement);
			
			this.typename = "Area";
			this.icon = Potree.resourcePath + "/icons/area.svg";
			
			this.elIcon.attr("src", this.icon);
			
			let totalDistance = this.measurement.getTotalDistance().toFixed(3);
			this.elContent = $(`
				<div>
					<span class="coordinates_table_container"></span>
					
					<br>
					
					<span style="font-weight: bold">Area: </span>
					<span id="measurement_area_${this.id}"></span>
					
					<!-- ACTIONS -->
					<div style="display: flex; margin-top: 12px">
						<span></span>
						<span style="flex-grow: 1"></span>
						<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
					</div>
				</div>
			`);
			this.elContentContainer.append(this.elContent);
			
			let elRemove = this.elContent.find(".measurement_action_remove");
			elRemove.click(() => {this.scene.removeMeasurement(measurement)});
			
			this.measurement.addEventListener("marker_added", this._update);
			this.measurement.addEventListener("marker_removed", this._update);
			this.measurement.addEventListener("marker_moved", this._update);
			
			this.update();
		}
		
		update(){
			let elCoordiantesContainer = this.elContent.find(".coordinates_table_container");
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(createCoordinatesTable(this.measurement));
			
			let elArea = this.elContent.find(`#measurement_area_${this.id}`);
			elArea.html(this.measurement.getArea().toFixed(3));
		}
		
		destroy(){
			this.elPanel.remove();
			
			this.measurement.removeEventListener("marker_added", this._update);
			this.measurement.removeEventListener("marker_removed", this._update);
			this.measurement.removeEventListener("marker_moved", this._update);
		}
		
	};
	
	class AnglePanel extends MeasurePanel{
		constructor(scene, measurement){
			super(scene, measurement);
			
			this.typename = "Angle";
			this.icon = Potree.resourcePath + "/icons/angle.png";
			
			this.elIcon.attr("src", this.icon);
			
			let totalDistance = this.measurement.getTotalDistance().toFixed(3);
			this.elContent = $(`
				<div>
					<span class="coordinates_table_container"></span>
					
					<br>
					
					<table class="measurement_value_table">
						<tr>
							<th>\u03b1</th>
							<th>\u03b2</th>
							<th>\u03b3</th>
						</tr>
						<tr>
							<td align="center" id="angle_cell_alpha_${this.id}" style="width: 33%"></td>
							<td align="center" id="angle_cell_betta_${this.id}" style="width: 33%"></td>
							<td align="center" id="angle_cell_gamma_${this.id}" style="width: 33%"></td>
						</tr>
					</table>
					
					<!-- ACTIONS -->
					<div style="display: flex; margin-top: 12px">
						<span></span>
						<span style="flex-grow: 1"></span>
						<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
					</div>
				</div>
			`);
			this.elContentContainer.append(this.elContent);
			
			let elRemove = this.elContent.find(".measurement_action_remove");
			elRemove.click(() => {this.scene.removeMeasurement(measurement)});
			
			this.measurement.addEventListener("marker_added", this._update);
			this.measurement.addEventListener("marker_removed", this._update);
			this.measurement.addEventListener("marker_moved", this._update);
			
			this.update();
		}
		
		update(){
			let elCoordiantesContainer = this.elContent.find(".coordinates_table_container");
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(createCoordinatesTable(this.measurement));
			
			let angles = [];
			for(let i = 0; i < this.measurement.points.length; i++){
				angles.push(this.measurement.getAngle(i) * (180.0/Math.PI));
			}
			angles = angles.map(a => a.toFixed(1) + '\u00B0');
			
			let elAlpha = this.elContent.find(`#angle_cell_alpha_${this.id}`);
			let elBetta = this.elContent.find(`#angle_cell_betta_${this.id}`);
			let elGamma = this.elContent.find(`#angle_cell_gamma_${this.id}`);
			
			elAlpha.html(angles[0]);
			elBetta.html(angles[1]);
			elGamma.html(angles[2]);
		}
		
		destroy(){
			this.elPanel.remove();
			
			this.measurement.removeEventListener("marker_added", this._update);
			this.measurement.removeEventListener("marker_removed", this._update);
			this.measurement.removeEventListener("marker_moved", this._update);
		}
		
	};
	
	class HeightPanel extends MeasurePanel{
		constructor(scene, measurement){
			super(scene, measurement);
			
			this.typename = "Height";
			this.icon = Potree.resourcePath + "/icons/height.svg";
			
			this.elIcon.attr("src", this.icon);
			
			this.elContent = $(`
				<div>
					<span class="coordinates_table_container"></span>
					
					<br>
					
					<span id="height_label_${this.id}">Height: </span><br>
					
					<!-- ACTIONS -->
					<div style="display: flex; margin-top: 12px">
						<span></span>
						<span style="flex-grow: 1"></span>
						<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
					</div>
				</div>
			`);
			this.elContentContainer.append(this.elContent);
			
			let elRemove = this.elContent.find(".measurement_action_remove");
			elRemove.click(() => {this.scene.removeMeasurement(measurement)});
			
			this.measurement.addEventListener("marker_added", this._update);
			this.measurement.addEventListener("marker_removed", this._update);
			this.measurement.addEventListener("marker_moved", this._update);
			
			this.update();
		}
		
		update(){
			let elCoordiantesContainer = this.elContent.find(".coordinates_table_container");
			elCoordiantesContainer.empty();
			elCoordiantesContainer.append(createCoordinatesTable(this.measurement));
			
			{
				let points = this.measurement.points;
					
				let sorted = points.slice().sort( (a, b) => a.position.z - b.position.z );
				let lowPoint = sorted[0].position.clone();
				let highPoint = sorted[sorted.length - 1].position.clone();
				let min = lowPoint.z;
				let max = highPoint.z;
				let height = max - min;
				height = height.toFixed(3);
				
				this.elHeightLabel = this.elContent.find(`#height_label_${this.id}`);
				this.elHeightLabel.html(`<b>Height:</b> ${height}`);
			}
		}
		
		destroy(){
			this.elPanel.remove();
			
			this.measurement.removeEventListener("marker_added", this._update);
			this.measurement.removeEventListener("marker_removed", this._update);
			this.measurement.removeEventListener("marker_moved", this._update);
		}
		
	};
	
	class ProfilePanel extends MeasurePanel{
		constructor(scene, measurement){
			super(scene, measurement);
			
			this.typename = "Profile";
			this.icon = Potree.resourcePath + "/icons/profile.svg";
			
			this.elIcon.attr("src", this.icon);
			
			let labelID = "lblProfileWidth_" + this.id;
			let sliderID = "sldProfileWidth_" + this.id;
			
			this.elContent = $(`
				<div>
					<span class="coordinates_table_container"></span>
					
					<br>
					
					<span style="display:flex">
						<span style="display:flex; align-items: center; padding-right: 10px">Width: </span>
						<input id="${sliderID}" name="${sliderID}" value="5.06" style="flex-grow: 1; width:100%">
					</span>
					<br>
					
					<input type="button" value="Prepare Download" id="download_profile_${this.id}"/>
					<span id="download_profile_status_${this.id}"></span>
					
					<br>
					
					<input type="button" id="show_2d_profile_${this.id}" value="show 2d profile" style="width: 100%"/>
					
					<!-- ACTIONS -->
					<div style="display: flex; margin-top: 12px">
						<span></span>
						<span style="flex-grow: 1"></span>
						<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
					</div>
				</div>
			`);
			this.elContentContainer.append(this.elContent);
			this.elShow2DProfile = this.elContent.find(`#show_2d_profile_${this.id}`);
			this.elShow2DProfile.click(() => {
				viewer.profileWindow.show();
				viewer.profileWindowController.setProfile(measurement);
				//viewer.profileWindow.draw(measurement);
			});
			
			{ // download
				this.elDownloadButton = this.elContent.find(`#download_profile_${this.id}`);
				
				if(viewer.server){
					this.elDownloadButton.click(() => this.download());
				}else{
					this.elDownloadButton.hide();
				}
			}
			
			{ // width spinner
				let elWidthLabel = this.elContent.find(`#${labelID}`);
				let elWidthSlider = this.elContent.find(`#${sliderID}`);
				
				let startValue = 0;
				
				elWidthSlider.spinner({
					min: 0,
					max: 10*1000*1000,
					step: 0.01,
					numberFormat: "n",
					start: (event, ui) => {
						startValue = measurement.getWidth();
					},
					spin: (event, ui) => {
						let value = elWidthSlider.spinner("value");
						measurement.setWidth(value);
					},
					change: (event, ui) => {
						let value = elWidthSlider.spinner("value");
						measurement.setWidth(value);
					},
					stop: (event, ui) => {
						let value = elWidthSlider.spinner("value");
						measurement.setWidth(value);
					},
					incremental: (count) => {
						let value = elWidthSlider.spinner("value");
						let step = elWidthSlider.spinner("option", "step");
						
						let delta = value * 0.05;
						let increments = Math.max(1, parseInt(delta / step));
						
						return increments;
					}
				});
				elWidthSlider.spinner("value", measurement.getWidth());
				elWidthSlider.spinner("widget").css("width", "100%");

				this.widthListener = (event) => {
					let value = elWidthSlider.spinner("value");
					if(value !== measurement.getWidth()){
						elWidthSlider.spinner("value", measurement.getWidth());
					}
				};
				
				measurement.addEventListener("width_changed", this.widthListener);
			}
			
			
			let elRemove = this.elContent.find(".measurement_action_remove");
			elRemove.click(() => {this.scene.removeProfile(measurement)});
			
			this.measurement.addEventListener("marker_added", this._update);
			this.measurement.addEventListener("marker_removed", this._update);
			this.measurement.addEventListener("marker_moved", this._update);
			
			this.update();
		}
		
		update(){
			let elCoordiantesContainer = this.elContent.find(".coordinates_table_container");
			elCoordiantesContainer.empty();
			let coordinatesTable = createCoordinatesTable(this.measurement);
			
			let validate = input => {
				return !isNaN(Number(input));
			};
			
			let cells = coordinatesTable.find("span");
			cells.attr("contenteditable", "true");
			
			cells = cells.toArray();
			
			for(let i = 0; i < cells.length; i++){
				let cell = cells[i];
				let measure = this.measurement;
				let updateCallback = this._update;
				
				let assignValue = () => {
					let text = Potree.utils.removeCommas($(cell).html());
					
					let num = Number(text);
					
					if(!isNaN(num)){
						$(cell).removeClass("invalid_value");
						
						measure.removeEventListener("marker_moved", updateCallback);
						
						let index = parseInt(i / 3);
						let coordinateComponent = i % 3;
						
						let position = measure.points[index].clone();
						
						if(coordinateComponent === 0){
							position.x = num;
						} else if(coordinateComponent === 1){
							position.y = num;
						} else if(coordinateComponent === 2){
							position.z = num;
						}
						
						measure.setPosition(index, position);
						measure.addEventListener("marker_moved", updateCallback);
					}else{
						$(cell).addClass("invalid_value");
					}
				};
				
				$(cell).on("keypress", (e) => {
					if(e.which === 13){
						assignValue();
						return false;
					}
				});
				
				$(cell).focusout(() => assignValue());
				
				$(cell).on("input", function(e){
					let text = Potree.utils.removeCommas($(this).html());
					
					let num = Number(text);
					
					if(!isNaN(num)){
						$(this).removeClass("invalid_value");
					}else{
						$(this).addClass("invalid_value");
					}
					
				});
			}
			
			elCoordiantesContainer.append(coordinatesTable);
		}
		
		download(){
			
			let profile = this.measurement;
			let boxes = profile.getSegmentMatrices()
				.map(m => m.elements.join(","))
				.join(",");
			
			let minLOD = 0;
			let maxLOD = 100;
			
			let pcs = [];
			for(let pointcloud of this.scene.pointclouds){
				let urlIsAbsolute = new RegExp('^(?:[a-z]+:)?//', 'i').test(pointcloud.pcoGeometry.url);
				let pc = "";
				if(urlIsAbsolute){
					pc = pointcloud.pcoGeometry.url;
				}else{
					pc = `${window.location.href}/../${pointcloud.pcoGeometry.url}`;
				}
				
				pcs.push(pc);
			}
			
			let pc = pcs
				.map( v => `pointcloud[]=${v}`)
				.join("&");
			
			let request = `${viewer.server}/start_extract_region_worker?minLOD=${minLOD}&maxLOD=${maxLOD}&box=${boxes}&${pc}`;
			//console.log(request);
			
			let elMessage = this.elContent.find(`#download_profile_status_${this.id}`);
			elMessage.html("sending request...");
			
			let workerID = null;
			
			let start = new Date().getTime();
			
			let observe = () => {
				let request = `${viewer.server}/observe_status?workerID=${workerID}`;
				
				let loaded = 0;
				
				let xhr = new XMLHttpRequest();
				xhr.withCredentials = true;
				xhr.addEventListener("progress", e => {
					let nowLoaded = e.loaded;
					
					let response = xhr.responseText.substring(loaded, nowLoaded);
					response = JSON.parse(response);
					
					if(response.status === "FINISHED"){
						elMessage.html(`<br><a href="${viewer.server}/get_las?workerID=${workerID}">Download ready</a>`);
					}else{
						let current = new Date().getTime();
						let duration = (current - start);
						let seconds = parseInt(duration / 1000);
						
						elMessage.html(`processing request... ${seconds}s`);
					}
					
					
					loaded = nowLoaded;
				});
				xhr.open('GET', request, true);
				xhr.send(null)
			};
			
			let xhr = new XMLHttpRequest();
			xhr.withCredentials = true;
			xhr.onreadystatechange = () => {
				if (xhr.readyState == XMLHttpRequest.DONE) {
					//alert(xhr.responseText);
					let res = JSON.parse(xhr.responseText);
					console.log(res);
					
					if(res.status === "OK"){
						workerID = res.workerID;
						elMessage.html("request is being processed");
						//checkUntilFinished();
						observe();
					}else if(res.status === "ERROR_POINT_PROCESSED_ESTIMATE_TOO_LARGE"){
						elMessage.html("Too many candidate points in selection.");
					}else{
						elMessage.html(`${res.status}`);
					}
				}
			}
			xhr.open('GET', request, true);
			xhr.send(null);
			
		}
		
		destroy(){
			this.elPanel.remove();
			
			this.measurement.removeEventListener("marker_added", this._update);
			this.measurement.removeEventListener("marker_removed", this._update);
			this.measurement.removeEventListener("marker_moved", this._update);
			this.measurement.removeEventListener("width_changed", this.widthListener);
		}
		
	};
	
	class VolumePanel extends MeasurePanel{
		constructor(scene, measurement){
			super(scene, measurement);
			
			this.typename = "Volume";
			this.icon = Potree.resourcePath + "/icons/volume.svg";
			
			this.elIcon.attr("src", this.icon);
			
			this.values = {};
			
			this.elContent = $(`
				<div>

					<div style="width: 100%;">
						<div style="display:inline-flex; width: 100%; ">
							<span class="input-grid-label">x</span>
							<span class="input-grid-label">y</span>
							<span class="input-grid-label">z</span>
						</div>
						<div style="display:inline-flex; width: 100%;">
							<span class="input-grid-cell"><input type="text" id="volume_input_x_${measurement.id}"/></span>
							<span class="input-grid-cell"><input type="text" id="volume_input_y_${measurement.id}"/></span>
							<span class="input-grid-cell"><input type="text" id="volume_input_z_${measurement.id}"/></span>
						</div>
					</div>
					
					<div style="width: 100%;">
						<div style="display:inline-flex; width: 100%; ">
							<span class="input-grid-label">length</span>
							<span class="input-grid-label">width</span>
							<span class="input-grid-label">height</span>
						</div>
						<div style="display:inline-flex; width: 100%;">
							<span class="input-grid-cell"><input type="text" id="volume_input_length_${measurement.id}"/></span>
							<span class="input-grid-cell"><input type="text" id="volume_input_width_${measurement.id}"/></span>
							<span class="input-grid-cell"><input type="text" id="volume_input_height_${measurement.id}"/></span>
						</div>
					</div>

					<div style="width: 100%;">
						<div style="display:inline-flex; width: 100%; ">
							<span class="input-grid-label">&alpha;</span>
							<span class="input-grid-label">&beta;</span>
							<span class="input-grid-label">&gamma;</span>
						</div>
						<div style="display:inline-flex; width: 100%;">
							<span class="input-grid-cell"><input type="text" id="volume_input_alpha_${measurement.id}"/></span>
							<span class="input-grid-cell"><input type="text" id="volume_input_beta_${measurement.id}"/></span>
							<span class="input-grid-cell"><input type="text" id="volume_input_gamma_${measurement.id}"/></span>
						</div>
					</div>
					
					<label><input type="checkbox" id="chkClip_${this.measurement.id}"/><span data-i18n="measurements.clip"></span></label>
					<label><input type="checkbox" id="chkVisible_${this.measurement.id}"/><span data-i18n="measurements.show"></span></label>
				
					
					<input type="button" value="Prepare Download" id="download_volume_${this.id}"/>
					<span id="download_volume_status_${this.id}"></span>
					
					<!-- ACTIONS -->
					<div style="display: flex; margin-top: 12px">
						<span></span>
						<span style="flex-grow: 1"></span>
						<img class="measurement_action_remove" src="${removeIconPath}" style="width: 16px; height: 16px"/>
					</div>
				</div>
			`);
			this.elContentContainer.append(this.elContent);
			
			this.elClip = this.elContent.find(`#chkClip_${this.measurement.id}`);
			this.elVisible = this.elContent.find(`#chkVisible_${this.measurement.id}`);
			
			this.elClip.click( () => {
				this.measurement.clip = this.elClip.is(":checked");
			});
			
			this.elVisible.click( () => {
				this.measurement.visible = this.elVisible.is(":checked");
			});
			
			this.elClip.prop('checked', this.measurement.clip);
			this.elVisible.prop('checked', this.measurement.visible);
			
			this.elX = this.elContent.find(`#volume_input_x_${this.measurement.id}`);
			this.elY = this.elContent.find(`#volume_input_y_${this.measurement.id}`);
			this.elZ = this.elContent.find(`#volume_input_z_${this.measurement.id}`);
			
			this.elLength = this.elContent.find(`#volume_input_length_${this.measurement.id}`);
			this.elWidth  = this.elContent.find(`#volume_input_width_${this.measurement.id}`);
			this.elHeight = this.elContent.find(`#volume_input_height_${this.measurement.id}`);
			
			this.elAlpha = this.elContent.find(`#volume_input_alpha_${this.measurement.id}`);
			this.elBeta = this.elContent.find(`#volume_input_beta_${this.measurement.id}`);
			this.elGamma = this.elContent.find(`#volume_input_gamma_${this.measurement.id}`);
			
			
			this.elX.on("change", (e) => {
				let val = this.elX.val();
				if($.isNumeric(val)){
					val = parseFloat(val);
					
					this.measurement.position.x = val;
				}
			});
			
			this.elY.on("change", (e) => {
				let val = this.elY.val();
				if($.isNumeric(val)){
					val = parseFloat(val);
					
					this.measurement.position.y = val;
				}
			});
			
			this.elZ.on("change", (e) => {
				let val = this.elZ.val();
				if($.isNumeric(val)){
					val = parseFloat(val);
					
					this.measurement.position.z = val;
				}
			});
			
			this.elLength.on("change", (e) => {
				let val = this.elLength.val();
				if($.isNumeric(val)){
					val = parseFloat(val);
					
					this.measurement.scale.x = val;
				}
			});
			
			this.elWidth.on("change", (e) => {
				let val = this.elWidth.val();
				if($.isNumeric(val)){
					val = parseFloat(val);
					
					this.measurement.scale.y = val;
				}
			});
			
			this.elHeight.on("change", (e) => {
				let val = this.elHeight.val();
				if($.isNumeric(val)){
					val = parseFloat(val);
					
					this.measurement.scale.z = val;
				}
			});
			
			let toRadians = (d) => Math.PI * d / 180;
			
			this.elAlpha.on("change", (e) => {
				let val = this.elAlpha.val();
				if($.isNumeric(val)){
					val = parseFloat(val);
					
					this.measurement.rotation.x = toRadians(val);
				}
			});
			
			this.elBeta.on("change", (e) => {
				let val = this.elBeta.val();
				if($.isNumeric(val)){
					val = parseFloat(val);
					
					this.measurement.rotation.y = toRadians(val);
				}
			});
			
			this.elGamma.on("change", (e) => {
				let val = this.elGamma.val();
				if($.isNumeric(val)){
					val = parseFloat(val);
					
					this.measurement.rotation.z = toRadians(val);
				}
			});
			
			
			
			this.elDownloadButton = this.elContent.find(`#download_volume_${this.id}`);
			
			if(viewer.server){
				this.elDownloadButton.click(() => this.download());
			}else{
				this.elDownloadButton.hide();
			}
			
			let elRemove = this.elContent.find(".measurement_action_remove");
			elRemove.click(() => {this.scene.removeVolume(measurement)});
			
			this.measurement.addEventListener("marker_added", this._update);
			this.measurement.addEventListener("marker_removed", this._update);
			this.measurement.addEventListener("marker_moved", this._update);
			
			this.elContent.i18n();
			
			this.update();
		}
		
		download(){
			
			let volume = this.measurement;
			let boxes = volume.matrixWorld.elements.join(",");
			let minLOD = 0;
			let maxLOD = 100;
			
			let pcs = [];
			for(let pointcloud of this.scene.pointclouds){
				let urlIsAbsolute = new RegExp('^(?:[a-z]+:)?//', 'i').test(pointcloud.pcoGeometry.url);
				let pc = "";
				if(urlIsAbsolute){
					pc = pointcloud.pcoGeometry.url;
				}else{
					pc = `${window.location.href}/../${pointcloud.pcoGeometry.url}`;
				}
				
				pcs.push(pc);
			}
			
			let pc = pcs
				.map( v => `pointcloud[]=${v}`)
				.join("&");
			
			let request = `${viewer.server}/start_extract_region_worker?minLOD=${minLOD}&maxLOD=${maxLOD}&box=${boxes}&${pc}`;//&pointCloud=${pc}`;
			//console.log(request);
			
			let elMessage = this.elContent.find(`#download_volume_status_${this.id}`);
			elMessage.html("sending request...");
			
			let workerID = null;
			
			let start = new Date().getTime();
			
			let observe = () => {
				let request = `${viewer.server}/observe_status?workerID=${workerID}`;
				
				let loaded = 0;
				
				let xhr = new XMLHttpRequest();
				xhr.withCredentials = true;
				xhr.addEventListener("progress", e => {
					let nowLoaded = e.loaded;
					
					let response = xhr.responseText.substring(loaded, nowLoaded);
					response = JSON.parse(response);
					
					if(response.status === "FINISHED"){
						elMessage.html(`<br><a href="${viewer.server}/get_las?workerID=${workerID}">Download ready</a>`);
					}else{
						let current = new Date().getTime();
						let duration = (current - start);
						let seconds = parseInt(duration / 1000);
						
						elMessage.html(`processing request... ${seconds}s`);
					}
					
					
					loaded = nowLoaded;
				});
				xhr.open('GET', request, true);
				xhr.send(null)
			};
			
			let xhr = new XMLHttpRequest();
			xhr.withCredentials = true;
			xhr.onreadystatechange = () => {
				if (xhr.readyState == XMLHttpRequest.DONE) {
					//alert(xhr.responseText);
					let res = JSON.parse(xhr.responseText);
					console.log(res);
					
					if(res.status === "OK"){
						workerID = res.workerID;
						elMessage.html("request is being processed");
						//checkUntilFinished();
						observe();
					}else if(res.status === "ERROR_POINT_PROCESSED_ESTIMATE_TOO_LARGE"){
						elMessage.html("Too many candidate points in selection.");
					}else{
						elMessage.html(`${res.status}`);
					}
				}
			}
			xhr.open('GET', request, true);
			xhr.send(null);
			
		}
		
		update(){
			if(!this.destroyed){
				requestAnimationFrame(this._update);
			}
			
			if(!this.elContent.is(":visible")){
				return;
			}
			
			if(this.measurement.position.x !== this.values.x){
				this.elX.val(this.measurement.position.x.toFixed(3));
				this.values.x = this.measurement.position.x;
			}
			
			if(this.measurement.position.y !== this.values.y){
				let elY = this.elContent.find(`#volume_input_y_${this.measurement.id}`);
				elY.val(this.measurement.position.y.toFixed(3));
				this.values.y = this.measurement.position.y;
			}
			
			if(this.measurement.position.z !== this.values.z){
				let elZ = this.elContent.find(`#volume_input_z_${this.measurement.id}`);
				elZ.val(this.measurement.position.z.toFixed(3));
				this.values.z = this.measurement.position.z;
			}
			
			if(this.measurement.scale.x !== this.values.length){
				this.elLength.val(this.measurement.scale.x.toFixed(3));
				this.values.length = this.measurement.scale.x;
			}
			
			if(this.measurement.scale.y !== this.values.width){
				this.elWidth.val(this.measurement.scale.y.toFixed(3));
				this.values.width = this.measurement.scale.y;
			}
			
			if(this.measurement.scale.z !== this.values.height){
				this.elHeight.val(this.measurement.scale.z.toFixed(3));
				this.values.height = this.measurement.scale.z;
			}
			
			let toDegrees = (r) => 180 * r / Math.PI;
			
			if(this.measurement.rotation.x !== this.values.alpha){
				this.elAlpha.val(toDegrees(this.measurement.rotation.x).toFixed(1));
				this.values.alpha = this.measurement.rotation.x;
			}
			
			if(this.measurement.rotation.y !== this.values.beta){
				this.elBeta.val(toDegrees(this.measurement.rotation.y).toFixed(1));
				this.values.beta = this.measurement.rotation.y;
			}
			
			if(this.measurement.rotation.z !== this.values.gamma){
				this.elGamma.val(toDegrees(this.measurement.rotation.z).toFixed(1));
				this.values.gamma = this.measurement.rotation.z;
			}
			
		}
		
		destroy(){
			this.elPanel.remove();
			
			this.measurement.removeEventListener("marker_added", this._update);
			this.measurement.removeEventListener("marker_removed", this._update);
			this.measurement.removeEventListener("marker_moved", this._update);
			
			this.destroyed = true;
		}
		
	};
	
	let TYPE = {
		DISTANCE: {panel: DistancePanel},
		AREA: {panel: AreaPanel},
		POINT: {panel: PointPanel},
		ANGLE: {panel: AnglePanel},
		HEIGHT: {panel: HeightPanel},
		PROFILE: {panel: ProfilePanel},
		VOLUME: {panel: VolumePanel},
	};
	
	let getType = (measurement) => {
		if(measurement instanceof Potree.Measure){
			if(measurement.showDistances && !measurement.showArea && !measurement.showAngles){
				return TYPE.DISTANCE;
			}else if(measurement.showDistances && measurement.showArea && !measurement.showAngles){
				return TYPE.AREA;
			}else if(measurement.maxMarkers === 1){
				return TYPE.POINT;
			}else if(!measurement.showDistances && !measurement.showArea && measurement.showAngles){
				return TYPE.ANGLE;
			}else if(measurement.showHeight){
				return TYPE.HEIGHT;
			}else{
				return TYPE.OTHER;
			}
		}else if(measurement instanceof Potree.Profile){
			return TYPE.PROFILE;
		}else if(measurement instanceof Potree.Volume){
			return TYPE.VOLUME;
		}
	};
	
	let trackMeasurement = (scene, measurement) => {
		id++;
		
		let type = getType(measurement);
		
		let panel = new type.panel(scene, measurement);
		mlist.append(panel.elPanel);
		
		let track = {
			scene: scene,
			measurement: measurement,
			panel: panel,
			stopTracking: (e) => {panel.destroy()}
		};
		trackedItems.set(measurement, track);

		let onremove = (e) => {
			
			let remove = () => {
				panel.destroy();
				scene.removeEventListener("measurement_removed", onremove);
				scene.removeEventListener("profile_removed", onremove);
				scene.removeEventListener("volume_removed", onremove);
			};
			
			if(e.measurement instanceof Potree.Measure && e.measurement === measurement){
				remove();
			}else if(e.profile instanceof Potree.Profile && e.profile === measurement){
				remove();
			}else if(e.volume instanceof Potree.Volume && e.volume === measurement){
				remove();
			}
			
		};
		
		scene.addEventListener("measurement_removed", onremove);
		scene.addEventListener("profile_removed", onremove);
		scene.addEventListener("volume_removed", onremove);
	};
	
	let scenelistener = (e) => {
		if(e.measurement){
			trackMeasurement(e.scene, e.measurement);
		}else if(e.profile){
			trackMeasurement(e.scene, e.profile);
			
			viewer.profileWindow.show();
			viewer.profileWindowController.setProfile(e.profile);
		}else if(e.volume){
			trackMeasurement(e.scene, e.volume);
		}
	};
	
	let trackScene = (scene) => {
		//$("#measurement_details").empty();
		
		trackedItems.forEach(function(trackedItem, key, map){
			trackedItem.stopTracking();
		});
		
		let items = scene.measurements
			.concat(scene.profiles)
			.concat(scene.volumes);
		
		for(let measurement of items){
			trackMeasurement(scene, measurement);
		}
		
		if(!scene.hasEventListener("measurement_added", scenelistener)){
			scene.addEventListener("measurement_added", scenelistener);
		}
		
		if(!scene.hasEventListener("profile_added", scenelistener)){
			scene.addEventListener("profile_added", scenelistener);
		}
		
		if(!scene.hasEventListener("volume_added", scenelistener)){
			scene.addEventListener("volume_added", scenelistener);
		}
	};
	
	trackScene(viewer.scene);
	
	viewer.addEventListener("scene_changed", (e) => {trackScene(e.scene)});
	
	
	{ // BOTTOM ACTIONS
		let elActionsB = $("#measurement_list_after");
	
		{
			let icon = Potree.resourcePath + "/icons/file_geojson.svg";
			let elDownload = $(`
				<a href="#" download="measure.json" class="measurepanel_downloads">
					<img src="${icon}" style="height: 24px" />
				</a>`);
			elActionsB.append(elDownload);
			
			elDownload.click(function(e){
				let scene = viewer.scene;
				let measurements = [scene.measurements, scene.profiles, scene.volumes].reduce((a, v) => a.concat(v));
				
				let geojson = Potree.GeoJSONExporter.toString(measurements);
				
				let url = window.URL.createObjectURL(new Blob([geojson], {type: 'data:application/octet-stream'}));
				elDownload.attr("href", url);
			});
		}
		
		{
			let icon = Potree.resourcePath + "/icons/file_dxf.svg";
			let elDownload = $(`
				<a href="#" download="measure.dxf" class="measurepanel_downloads">
					<img src="${icon}" style="height: 24px" />
				</a>`);
			elActionsB.append(elDownload);
			
			elDownload.click(function(e){
				let scene = viewer.scene;
				let measurements = [scene.measurements, scene.profiles, scene.volumes].reduce((a, v) => a.concat(v));
				
				let dxf = Potree.DXFExporter.toString(measurements);
				
				let url = window.URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
				elDownload.attr("href", url);
			});
		}
	
	}

};

function initSceneList(){

	let scenelist = $('#scene_list');
	
	// length units
	$("#optLengthUnit").selectmenu({
		style:'popup',
		position: { 
			my: "top", 
			at: "bottom", 
			collision: "flip" },
		change: function(e) {
			let selectedValue = $("#optLengthUnit").selectmenu().val();
			viewer.setLengthUnit(selectedValue);
		}
	});	
	$("#optLengthUnit").selectmenu().val(viewer.lengthUnit.code);
	$("#optLengthUnit").selectmenu("refresh");
	
	let initUIElements = function(i) {
		// scene panel in scene list

		let pointcloud = viewer.scene.pointclouds[i];
		let title = pointcloud.name;
		let pcMaterial = pointcloud.material;
		let checked = pointcloud.visible ? "checked" : "";

		let scenePanel = $(`
			<span class="scene_item">
				<!-- HEADER -->
				<div style="float: right; margin: 6px; margin-right: 15px"><input id="scene_list_item_pointcloud_${i}" type="checkbox" ${checked} /></div>
				<div class="scene_header" onclick="$(this).next().slideToggle(200)">
					<span class="scene_icon"><img src="${Potree.resourcePath + "/icons/cloud_icon.svg"}" class="scene_item_icon" /></span>
					<span class="scene_header_title">${title}</span>
				</div>
				
				<!-- DETAIL -->
				<div class="scene_content selectable" style="display: none">
					<div>
						<ul class="pv-menu-list">
						
						<li>
						<span data-i18n="appearance.point_size"></span>:<span id="lblPointSize_${i}"></span> <div id="sldPointSize_${i}"></div>
						</li>
						
						<!-- SIZE TYPE -->
						<li>
							<label for="optPointSizing_${i}" class="pv-select-label" data-i18n="appearance.point_size_type">Point Sizing </label>
							<select id="optPointSizing_${i}" name="optPointSizing_${i}">
								<option>FIXED</option>
								<option>ATTENUATED</option>
								<option>ADAPTIVE</option>
							</select>
						</li>
	
						<!--
						Shape:
						<div id="sizing_${i}">
							<label for="radio_${i}_1">FIXED</label>
							<input type="radio" name="radio_${i}" id="radio_${i}_1">
							<label for="radio_${i}_2">ATTENUATED</label>
							<input type="radio" name="radio_${i}" id="radio_${i}_2">
							<label for="radio_${i}_3">ADAPTIVE</label>
							<input type="radio" name="radio_${i}" id="radio_${i}_3">
						</div>
						-->
						
						<!-- SHAPE -->
						<li>
							<label for="optShape_" class="pv-select-label" data-i18n="appearance.point_shape"></label>
							<select id="optShape_${i}" name="optShape_${i}">
								<option>SQUARE</option>
								<option>CIRCLE</option>
								<option>PARABOLOID</option>
							</select>
						</li>	
						
						<!-- OPACITY -->
						<li><span data-i18n="appearance.point_opacity"></span>:<span id="lblOpacity_${i}"></span><div id="sldOpacity_${i}"></div></li>
						
						<div class="divider">
							<span>Attribute</span>
						</div>
						
						<li>
						   <!--<label for="optMaterial${i}" class="pv-select-label">Attributes:</label><br>-->
						   <select id="optMaterial${i}" name="optMaterial${i}">
						   </select>
						</li>
						
						<div id="materials.composite_weight_container${i}">
							<div class="divider">
								<span>Attribute Weights</span>
							</div>
						
							<li>RGB: <span id="lblWeightRGB${i}"></span> <div id="sldWeightRGB${i}"></div>	</li>
							<li>Intensity: <span id="lblWeightIntensity${i}"></span> <div id="sldWeightIntensity${i}"></div>	</li>
							<li>Elevation: <span id="lblWeightElevation${i}"></span> <div id="sldWeightElevation${i}"></div>	</li>
							<li>Classification: <span id="lblWeightClassification${i}"></span> <div id="sldWeightClassification${i}"></div>	</li>
							<li>Return Number: <span id="lblWeightReturnNumber${i}"></span> <div id="sldWeightReturnNumber${i}"></div>	</li>
							<li>Source ID: <span id="lblWeightSourceID${i}"></span> <div id="sldWeightSourceID${i}"></div>	</li>
						</div>
						
						<div id="materials.rgb_container${i}">
							<div class="divider">
								<span>RGB</span>
							</div>
						
							<li>Gamma: <span id="lblRGBGamma${i}"></span> <div id="sldRGBGamma${i}"></div>	</li>
							<li>Brightness: <span id="lblRGBBrightness${i}"></span> <div id="sldRGBBrightness${i}"></div>	</li>
							<li>Contrast: <span id="lblRGBContrast${i}"></span> <div id="sldRGBContrast${i}"></div>	</li>
						</div>
						
						<div id="materials.color_container${i}">
							<div class="divider">
								<span>Color</span>
							</div>
							
							<input id="materials.color.picker${i}" />
						</div>
					
						
						<div id="materials.elevation_container${i}">
							<div class="divider">
								<span>Elevation</span>
							</div>
						
							<li><span data-i18n="appearance.elevation_range"></span>: <span id="lblHeightRange${i}"></span> <div id="sldHeightRange${i}"></div>	</li>
						</div>
						
						<div id="materials.transition_container${i}">
							<div class="divider">
								<span>Transition</span>
							</div>
						
							<li>transition: <span id="lblTransition${i}"></span> <div id="sldTransition${i}"></div>	</li>
						</div>
						
						<div id="materials.intensity_container${i}">
							<div class="divider">
								<span>Intensity</span>
							</div>
						
							<li>Range: <span id="lblIntensityRange${i}"></span> <div id="sldIntensityRange${i}"></div>	</li>
							<li>Gamma: <span id="lblIntensityGamma${i}"></span> <div id="sldIntensityGamma${i}"></div>	</li>
							<li>Brightness: <span id="lblIntensityBrightness${i}"></span> <div id="sldIntensityBrightness${i}"></div>	</li>
							<li>Contrast: <span id="lblIntensityContrast${i}"></span> <div id="sldIntensityContrast${i}"></div>	</li>
						</div>
							
						
						</ul>
					</div>
				</div>
			</span>
		`);
		
		{ // POINT SIZE
			let sldPointSize = scenePanel.find(`#sldPointSize_${i}`);
			let lblPointSize = scenePanel.find(`#lblPointSize_${i}`);
			
			sldPointSize.slider({
				value: pcMaterial.size,
				min: 0,
				max: 3,
				step: 0.01,
				slide: function( event, ui ) {pcMaterial.size = ui.value;}
			});
			
			let update = (e) => {
				lblPointSize.html(pcMaterial.size.toFixed(2));
				sldPointSize.slider({value: pcMaterial.size});
			};
			
			pcMaterial.addEventListener("point_size_changed", update);
			update();
		}
		
		{ // POINT SIZE TYPE
			let strSizeType = Object.keys(Potree.PointSizeType)[pcMaterial.pointSizeType];
			
			let opt = scenePanel.find(`#optPointSizing_${i}`);
			opt.selectmenu();
			opt.val(strSizeType).selectmenu("refresh");
			
			opt.selectmenu({
				change: (event, ui) => {
					pcMaterial.pointSizeType = Potree.PointSizeType[ui.item.value];
				}
			});
			
			pcMaterial.addEventListener("point_size_type_changed", e => {
				let typename = Object.keys(Potree.PointSizeType)[pcMaterial.pointSizeType];
				
				$( "#optPointSizing" ).selectmenu().val(typename).selectmenu("refresh");
			});
		}
		
		{ // SHAPE
			
			let opt = scenePanel.find(`#optShape_${i}`);
			
			opt.selectmenu({
				change: (event, ui) => {
					let value = ui.item.value;
					
					pcMaterial.shape = Potree.PointShape[value];
				}
			});
			
			pcMaterial.addEventListener("point_shape_changed", e => {
				let typename = Object.keys(Potree.PointShape)[pcMaterial.shape];
				
				opt.selectmenu().val(typename).selectmenu("refresh");
			});
		}
		
		{ // OPACITY
			let sldOpacity = scenePanel.find(`#sldOpacity_${i}`);
			let lblOpacity = scenePanel.find(`#lblOpacity_${i}`);
			
			sldOpacity.slider({
				value: pcMaterial.opacity,
				min: 0,
				max: 1,
				step: 0.001,
				slide: function( event, ui ) {pcMaterial.opacity = ui.value;}
			});
			
			let update = (e) => {
				lblOpacity.html(pcMaterial.opacity.toFixed(2));
				sldOpacity.slider({value: pcMaterial.opacity});
			};
			
			pcMaterial.addEventListener("opacity_changed", update);
			update();
		}

		let inputVis = scenePanel.find("input[type='checkbox']");
		
		inputVis.click(function(event){
			pointcloud.visible = event.target.checked;
			if(viewer.profileWindowController){
				viewer.profileWindowController.recompute();
			}
		});

		scenelist.append(scenePanel);


		// ui elements
		$( "#optMaterial" + i ).selectmenu({
			style:'popup',
			position: { 
				my: "top", 
				at: "bottom", 
				collision: "flip" }	
		});
			
		$( "#sldHeightRange" + i ).slider({
			range: true,
			min:	0,
			max:	1000,
			values: [0, 1000],
			step: 	0.01,
			slide: function( event, ui ) {
				pcMaterial.heightMin = ui.values[0];
				pcMaterial.heightMax = ui.values[1];
				viewer.dispatchEvent({"type": "height_range_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldTransition" + i ).slider({
			value: pcMaterial.materialTransition,
			min: 0,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.materialTransition = ui.value;
				viewer.dispatchEvent({"type": "material_transition_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldIntensityRange" + i ).slider({
			range: true,
			min:	0,
			max:	1,
			values: [0, 1],
			step: 	0.01,
			slide: function( event, ui ) {
				let min = (ui.values[0] == 0) ? 0 : parseInt(Math.pow(2, 16 * ui.values[0]));
				let max = parseInt(Math.pow(2, 16 * ui.values[1]));
				pcMaterial.intensityRange = [min, max];
				//pcMaterial.intensityRange[0] = min;
				//pcMaterial.intensityRange[1] = max;
				viewer.dispatchEvent({"type": "intensity_range_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldIntensityGamma" + i ).slider({
			value: pcMaterial.intensityGamma,
			min: 0,
			max: 4,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.intensityGamma = ui.value;
				viewer.dispatchEvent({"type": "intensity_gamma_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldIntensityContrast" + i ).slider({
			value: pcMaterial.intensityContrast,
			min: -1,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.intensityContrast = ui.value;
				viewer.dispatchEvent({"type": "intensity_contrast_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldIntensityBrightness" + i ).slider({
			value: pcMaterial.intensityBrightness,
			min: -1,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.intensityBrightness = ui.value;
				viewer.dispatchEvent({"type": "intensity_brightness_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldRGBGamma" + i ).slider({
			value: pcMaterial.rgbGamma,
			min: 0,
			max: 4,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.rgbGamma = ui.value;
				viewer.dispatchEvent({"type": "rgb_gamma_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldRGBContrast" + i ).slider({
			value: pcMaterial.rgbContrast,
			min: -1,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.rgbContrast = ui.value;
				viewer.dispatchEvent({"type": "rgb_contrast_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldRGBBrightness" + i ).slider({
			value: pcMaterial.rgbBrightness,
			min: -1,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.rgbBrightness = ui.value;
				viewer.dispatchEvent({"type": "rgb_brightness_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldWeightRGB" + i ).slider({
			value: pcMaterial.weightRGB,
			min: 0,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.weightRGB = ui.value;
				viewer.dispatchEvent({"type": "attribute_weights_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldWeightIntensity" + i ).slider({
			value: pcMaterial.weightIntensity,
			min: 0,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.weightIntensity = ui.value;
				viewer.dispatchEvent({"type": "attribute_weights_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldWeightElevation" + i ).slider({
			value: pcMaterial.weightElevation,
			min: 0,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.weightElevation = ui.value;
				viewer.dispatchEvent({"type": "attribute_weights_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldWeightClassification" + i ).slider({
			value: pcMaterial.weightClassification,
			min: 0,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.weightClassification = ui.value;
				viewer.dispatchEvent({"type": "attribute_weights_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldWeightReturnNumber" + i ).slider({
			value: pcMaterial.weightReturnNumber,
			min: 0,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.weightReturnNumber = ui.value;
				viewer.dispatchEvent({"type": "attribute_weights_changed" + i, "viewer": viewer});
			}
		});
		
		$( "#sldWeightSourceID" + i ).slider({
			value: pcMaterial.weightSourceID,
			min: 0,
			max: 1,
			step: 0.01,
			slide: function( event, ui ) {
				pcMaterial.weightSourceID = ui.value;
				viewer.dispatchEvent({"type": "attribute_weights_changed" + i, "viewer": viewer});
			}
		});
		
		$(`#materials\\.color\\.picker${i}`).spectrum({
			flat: true,
			showInput: true,
			preferredFormat: "rgb",
			cancelText: "",
			chooseText: "Apply",
			color: `#${pcMaterial.color.getHexString()}`,
			move: color => {
				let cRGB = color.toRgb();
				let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
				pcMaterial.color = tc;
			}, 
			change: color => {
				let cRGB = color.toRgb();
				let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
				pcMaterial.color = tc;
			}
		});
		
		pcMaterial.addEventListener("color_changed", e => {
			$(`#materials\\.color\\.picker${i}`)
				.spectrum("set", `#${pcMaterial.color.getHexString()}`);
		});

		let updateHeightRange = function(){
			let box = [pointcloud.pcoGeometry.tightBoundingBox, pointcloud.getBoundingBoxWorld()]
				.find(v => v !== undefined);
				
			pointcloud.updateMatrixWorld(true);
			box = Potree.utils.computeTransformedBoundingBox(box, pointcloud.matrixWorld);
			
			let bWidth = box.max.z - box.min.z;
			bMin = box.min.z - 0.2 * bWidth;
			bMax = box.max.z + 0.2 * bWidth;
			
			$( "#lblHeightRange" + i )[0].innerHTML = pcMaterial.heightMin.toFixed(2) + " to " + pcMaterial.heightMax.toFixed(2);
			$( "#sldHeightRange" + i ).slider({
				min: bMin,
				max: bMax,
				values: [pcMaterial.heightMin, pcMaterial.heightMax]
			});
		};
		
		let updateIntensityRange = function(){
			let range = pcMaterial.intensityRange;
			let min = Math.log2(range[0]) / 16;
			let max = Math.log2(range[1]) / 16;
			
			$( "#lblIntensityRange" + i )[0].innerHTML = 
				parseInt(pcMaterial.intensityRange[0]) + " to " + 
				parseInt(pcMaterial.intensityRange[1]);
			$( "#sldIntensityRange" + i ).slider({
				values: [min, max]
			});
		};
		
		{
			updateHeightRange();
			let min =  $(`#sldHeightRange${i}`).slider("option", "min");
			let max =  $(`#sldHeightRange${i}`).slider("option", "max");
			pcMaterial.heightMin = 0.8 * min + 0.2 * max;
			pcMaterial.heightMax = 0.2 * min + 0.8 * max;
		}
			
		viewer.addEventListener("height_range_changed" + i, updateHeightRange);
		viewer.addEventListener("intensity_range_changed" + i, updateIntensityRange);
		
		viewer.addEventListener("intensity_gamma_changed" + i, function(event){
			let gamma = pcMaterial.intensityGamma;
			
			$('#lblIntensityGamma' + i)[0].innerHTML = gamma.toFixed(2);
			$("#sldIntensityGamma" + i).slider({value: gamma});
		});
		
		viewer.addEventListener("intensity_contrast_changed" + i, function(event){
			let contrast = pcMaterial.intensityContrast;
			
			$('#lblIntensityContrast' + i)[0].innerHTML = contrast.toFixed(2);
			$("#sldIntensityContrast" + i).slider({value: contrast});
		});
		
		viewer.addEventListener("intensity_brightness_changed" + i, function(event){
			let brightness = pcMaterial.intensityBrightness;
			
			$('#lblIntensityBrightness' + i)[0].innerHTML = brightness.toFixed(2);
			$("#sldIntensityBrightness" + i).slider({value: brightness});
		});
		
		viewer.addEventListener("rgb_gamma_changed" + i, function(event){
			let gamma = pcMaterial.rgbGamma;
			
			$('#lblRGBGamma' + i)[0].innerHTML = gamma.toFixed(2);
			$("#sldRGBGamma" + i).slider({value: gamma});
		});
		
		viewer.addEventListener("rgb_contrast_changed" + i, function(event){
			let contrast = pcMaterial.rgbContrast;
			
			$('#lblRGBContrast' + i)[0].innerHTML = contrast.toFixed(2);
			$("#sldRGBContrast" + i).slider({value: contrast});
		});
		
		viewer.addEventListener("rgb_brightness_changed" + i, function(event){
			let brightness = pcMaterial.rgbBrightness;
			
			$('#lblRGBBrightness' + i)[0].innerHTML = brightness.toFixed(2);
			$("#sldRGBBrightness" + i).slider({value: brightness});
		});
		
		viewer.addEventListener("length_unit_changed", e => {
			$("#optLengthUnit").selectmenu().val(e.value);
			$("#optLengthUnit").selectmenu("refresh");
		});
		
		viewer.addEventListener("pointcloud_loaded", updateHeightRange);
		
		updateHeightRange();
		updateIntensityRange();
		$('#lblIntensityGamma' + i)[0].innerHTML = pcMaterial.intensityGamma.toFixed(2);
		$('#lblIntensityContrast' + i)[0].innerHTML = pcMaterial.intensityContrast.toFixed(2);
		$('#lblIntensityBrightness' + i)[0].innerHTML = pcMaterial.intensityBrightness.toFixed(2);
		
		$('#lblRGBGamma' + i)[0].innerHTML = pcMaterial.rgbGamma.toFixed(2);
		$('#lblRGBContrast' + i)[0].innerHTML = pcMaterial.rgbContrast.toFixed(2);
		$('#lblRGBBrightness' + i)[0].innerHTML = pcMaterial.rgbBrightness.toFixed(2);

		let options = [ 
			"RGB", 
			"RGB and Elevation",
			"Color", 
			"Elevation", 
			"Intensity", 
			"Intensity Gradient", 
			"Classification", 
			"Return Number", 
			"Source", 
			"Phong",
			"Level of Detail",
			"Composite",
		];
		
		let elMaterialList = $("#optMaterial" + i);
		for(let i = 0; i < options.length; i++){
			let option = options[i];
			let id = "optMaterial_" + option + "_" + i;

			let elOption = $(`
				<option id="${id}">
					${option}
				</option>`);
			elMaterialList.append(elOption);
		}
		
		let updateMaterialPanel = function(event, ui){			
			let selectedValue = $("#optMaterial" + i).selectmenu().val();
			pcMaterial.pointColorType = viewer.toMaterialID(selectedValue);
			viewer.dispatchEvent({"type": "material_changed" + i, "viewer": viewer});
			
			let blockWeights = $("#materials\\.composite_weight_container" + i);
			let blockElevation = $("#materials\\.elevation_container" + i);
			let blockRGB = $("#materials\\.rgb_container" + i);
			let blockColor = $("#materials\\.color_container" + i);
			let blockIntensity = $("#materials\\.intensity_container" + i);
			let blockTransition = $("#materials\\.transition_container" + i);
			
			blockIntensity.css("display", "none");
			blockElevation.css("display", "none");
			blockRGB.css("display", "none");
			blockColor.css("display", "none");
			blockWeights.css("display", "none");
			blockTransition.css("display", "none");
			
			if(selectedValue === "Composite"){
				blockWeights.css("display", "block");
				blockElevation.css("display", "block");
				blockRGB.css("display", "block");
				blockIntensity.css("display", "block");
			}else if(selectedValue === "Elevation"){
				blockElevation.css("display", "block");
			}else if(selectedValue === "RGB and Elevation"){
				blockRGB.css("display", "block");
				blockElevation.css("display", "block");
			}else if(selectedValue === "RGB"){
				blockRGB.css("display", "block");
			}else if(selectedValue === "Color"){
				blockColor.css("display", "block");
			}else if(selectedValue === "Intensity"){
				blockIntensity.css("display", "block");
			}else if(selectedValue === "Intensity Gradient"){
				blockIntensity.css("display", "block");
			}
		};
		
		$("#optMaterial" + i).selectmenu({change: updateMaterialPanel});
		$("#optMaterial" + i).val(viewer.toMaterialName(pcMaterial.pointColorType)).selectmenu("refresh");
		updateMaterialPanel();
		
		viewer.addEventListener("material_changed" + i, e => {
			$("#optMaterial" + i).val(viewer.toMaterialName(pcMaterial.pointColorType)).selectmenu("refresh");
		});

		scenePanel.i18n();
	};	
	
	let buildSceneList = () => {
		scenelist.empty();
		
		for(let i = 0; i < viewer.scene.pointclouds.length; i++) {
			initUIElements(i);
		}
	};
	
	buildSceneList();

	//for(let i = 0; i < viewer.scene.pointclouds.length; i++) {
	//	initUIElements(i);
	//}
	
	viewer.addEventListener("scene_changed", (e) => {
		buildSceneList();
		
		if(e.oldScene){
			e.oldScene.removeEventListener("pointcloud_added", buildSceneList);
		}
		e.scene.addEventListener("pointcloud_added", buildSceneList);
	});
	
	viewer.scene.addEventListener("pointcloud_added", buildSceneList);
	
	
	let lastPos = new THREE.Vector3();
	let lastTarget = new THREE.Vector3();
	viewer.addEventListener("update", e => {
		let pos = viewer.scene.view.position;
		let target = viewer.scene.view.getPivot();
		
		if(pos.equals(lastPos) && target.equals(lastTarget)){
			return;
		}else{
			lastPos.copy(pos);
			lastTarget.copy(target);
		}
		
		let strCamPos = "<br>" + [pos.x, pos.y, pos.z].map(e => e.toFixed(2)).join(", ");
		let strCamTarget = "<br>" + [target.x, target.y, target.z].map(e => e.toFixed(2)).join(", ");
		
		$('#lblCameraPosition').html(strCamPos);
		$('#lblCameraTarget').html(strCamTarget);
	});
};

let initSettings = function(){
	
	$( "#sldMinNodeSize" ).slider({
		value: viewer.getMinNodeSize(),
		min: 0,
		max: 1000,
		step: 0.01,
		slide: function( event, ui ) {viewer.setMinNodeSize(ui.value);}
	});
	
	viewer.addEventListener("minnodesize_changed", function(event){
		$('#lblMinNodeSize').html(parseInt(viewer.getMinNodeSize()));
		$("#sldMinNodeSize").slider({value: viewer.getMinNodeSize()});
	});
	$('#lblMinNodeSize').html(parseInt(viewer.getMinNodeSize()));
	
	
	let toClipModeCode = function(string){
		if(string === "No Clipping"){
			return Potree.ClipMode.DISABLED;
		}else if(string === "Highlight Inside"){
			return Potree.ClipMode.HIGHLIGHT_INSIDE;
		}else if(string === "Clip Outside"){
			return Potree.ClipMode.CLIP_OUTSIDE;
		}
	};
	
	let toClipModeString = function(code){
		if(code === Potree.ClipMode.DISABLED){
			return "No Clipping";
		}else if(code === Potree.ClipMode.HIGHLIGHT_INSIDE){
			return "Highlight Inside";
		}else if(code === Potree.ClipMode.CLIP_OUTSIDE){
			return "Clip Outside";
		}
	};
	
	$("#optClipMode").selectmenu();
	$("#optClipMode").val(toClipModeString(viewer.getClipMode())).selectmenu("refresh")
	$("#optClipMode").selectmenu({
		change: function(event, ui){
			viewer.setClipMode(toClipModeCode(ui.item.value));
		}
	});
	
	viewer.addEventListener("clip_mode_changed", e => {
		let string = toClipModeString(viewer.clipMode);
		
		$( "#optClipMode" )
			.selectmenu()
			.val(string)
			.selectmenu("refresh");
	});
};

let initSidebar = function(){
	initAccordion();
	initAppearance();
	initToolbar();
	initNavigation();
	initClassificationList();
	initAnnotationDetails();
	initMeasurementDetails();
	initSceneList();
	initSettings()
	
	$('#potree_version_number').html(Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);
	$('.perfect_scrollbar').perfectScrollbar();
}

class HoverMenuItem{

	constructor(icon, callback){
		this.icon = icon;
		this.callback = callback;
		
		this.element = $(`
			<span class="hover_menu_item">
				<img src="${icon}">
			</span>
		`);
		
		this.element.click(function(){
			callback();
		});
	}
};

class HoverMenu{

	constructor(icon){
		let scope = this;
	
		this.items = [];
	
		this.x = 0;
		this.y = 0;
		this.circumference = 32;
		
		this.element = $('<span class="hover_menu"></span>');
		this.elIcon = $(`<span class="hover_menu_icon">
			<img src="${icon}">
		</span>`);
		this.element.append(this.elIcon);
		
		this.element.click(function(){
			$(this).find(".hover_menu_item").fadeIn(200);
			$(this).find(".hover_menu_icon").fadeOut(200);
			
			$(this).css("left", (scope.x - scope.circumference - $(this).width() / 2) + "px");
			$(this).css("top", (scope.y - scope.circumference - $(this).height() / 2) + "px");
			$(this).css("border", scope.circumference + "px solid transparent");
		}).mouseleave(function(){
			$(this).find(".hover_menu_item").fadeOut(200);
			$(this).find(".hover_menu_icon").fadeIn(200);
			
			$(this).css("left", (scope.x - $(this).width() / 2) + "px");
			$(this).css("top", (scope.y - $(this).height() / 2) + "px");
			$(this).css("border", "0px solid black");
		});
	}
	
	addItem(item){
		this.items.push(item);
		this.element.append(item.element);
		item.element.hide();
		
		this.arrange();
	}
	
	removeItem(item){
		this.items = this.items.filter(e => e !== item);
		this.element.remove(item.element);
		
		this.arrange();
	}
	
	arrange(){
		let menuItems = this.element.find(".hover_menu_item");
		menuItems.each(function(index, value){
			let u = (index / menuItems.length) * Math.PI * 2;
			let radius = 22;
			let x = Math.cos(u) * radius;// + offset ;
			let y = Math.sin(u) * radius;// + offset ;
			
			$(this).css("left", x).css("top", y);
			
		});
	}
	
	setPosition(x, y){
		this.x = x;
		this.y = y;
		
		let rect = this.element.get(0).getBoundingClientRect();
		
		this.element.css("left", (this.x - rect.width / 2) + "px");
		this.element.css("top", (this.y - rect.height / 2) + "px");
	}

};

Potree.GLProgram = class GLProgram{
	
	constructor(gl, material){
		this.gl = gl;
		this.material = material;
		this.program = gl.createProgram();;
		
		this.recompile();
	}
	
	compileShader(type, source){
		let gl = this.gl;
		
		let vs = gl.createShader(type);
		
		gl.shaderSource(vs, source);
		gl.compileShader(vs);
		
		let success = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
		if (!success) {
			console.error("could not compile shader:");
			
			let log = gl.getShaderInfoLog(vs);
			console.error(log, source);
			
			return null;
		}
		
		return vs;
	}
	
	recompile(){
		let gl = this.gl;

		let vs = this.compileShader(gl.VERTEX_SHADER, this.material.vertexShader);
		let fs = this.compileShader(gl.FRAGMENT_SHADER, this.material.fragmentShader);
		
		if(vs === null || fs === null){
			return;
		}
		
		// PROGRAM
		let program = this.program;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		let success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (!success) {
			console.error("could not compile/link program:");
			console.error(this.material.vertexShader);
			console.error(this.material.fragmentShader);
				
			return;
		}
		
		gl.detachShader(program, vs);
		gl.detachShader(program, fs);
		gl.deleteShader(vs);
		gl.deleteShader(fs);
		
		gl.useProgram(program);
		
		{ // UNIFORMS
			let uniforms = {};
			let n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

			for(let i = 0; i < n; i++){
				var uniform = gl.getActiveUniform(program, i);
				var name = uniform.name;
				var loc = gl.getUniformLocation(program, name);

				uniforms[name] = loc;
			}
			
			this.uniforms = uniforms;
		}
	}
	
};