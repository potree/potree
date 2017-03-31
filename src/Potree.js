


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
        if (Potree.scriptPath.slice(-1) == '/') {
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
}


Potree.MOUSE = {
	LEFT:   0b0001,
	RIGHT:  0b0010,
	MIDDLE: 0b0100
};


Potree.loadPointCloud = function(path, name, callback){
	
	let loaded = function(pointcloud){
		pointcloud.name = name;
		
		callback({type: "pointcloud_loaded", pointcloud: pointcloud});
	}
	
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
}

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
	
	while(priorityQueue.size() > 0){
		let element = priorityQueue.pop();
		let node = element.node;
		let parent = element.parent;
		let pointcloud = pointclouds[element.pointcloud];
		
		let box = node.getBoundingBox();
		let frustum = frustums[element.pointcloud];
		let camObjPos = camObjPositions[element.pointcloud];
		
		let insideFrustum = frustum.intersectsBox(box);
		let maxLevel = pointcloud.maxLevel || Infinity;
		let level = node.getLevel();
		let visible = insideFrustum;
		visible = visible && !(numVisiblePoints + node.getNumPoints() > Potree.pointBudget);
		visible = visible && level < maxLevel;
		
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
			if(node.isLoaded()){
				node = pointcloud.toTreeNode(node, parent);
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

			if(node.parent){
				node.sceneNode.matrixWorld.multiplyMatrices( node.parent.sceneNode.matrixWorld, node.sceneNode.matrix );
			}else{
				node.sceneNode.matrixWorld.multiplyMatrices( pointcloud.matrixWorld, node.sceneNode.matrix );
			}

			if(pointcloud.showBoundingBox && !node.boundingBoxNode){
				let boxHelper = new THREE.BoxHelper(node.getBoundingBox());
				pointcloud.add(boxHelper);
				pointcloud.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrixWorld.copy(node.sceneNode.matrixWorld);
			}else if(pointcloud.showBoundingBox){
				node.boundingBoxNode.visible = true;
				node.boundingBoxNode.matrixWorld.copy(node.sceneNode.matrixWorld);
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
	
	for(let i = 0; i < Math.min(5, unloadedGeometry.length); i++){
		unloadedGeometry[i].load();
	}
	
	//for(let node of visibleNodes){
	//	//let allowedNodes = ["r", "r0", "r4", "r04", "r40", "r402", "r4020", "r4022", "r40206", "r40224", "r40202", "r40220", "r00", "r042"];
	//	//let allowedNodes = ["r", "r0", "r4", "r04", "r40", "r402", "r4020", "r4022", "r00", "r042"];
	//	//let allowedNodes = ["r", "r0", "r04", "r042"];
	//	let allowedNodes = ["r", "r4", "r40", "r402", "r4020", "r40206"];
	//	//let allowedNodes = ["r", "r4", "r40", "r402", "r4020"];
	//	node.sceneNode.visible = allowedNodes.includes(node.geometryNode.name);
	//	
	//	if(node.boundingBoxNode){
	//		node.boundingBoxNode.visible = node.boundingBoxNode.visible && node.sceneNode.visible;
	//	}
	//}
	
	
	Potree.updateDEMs(renderer, visibleNodes);

	return {
		visibleNodes: visibleNodes, 
		numVisiblePoints: numVisiblePoints,
		lowestSpacing: lowestSpacing
	};
};

Potree.updateDEMs = function(renderer, visibleNodes){
	
	return;
	
	let dems = Potree.__dems;
	if(dems === undefined){
		Potree.__dems = {};
		dems = Potree.__dems;
		
		dems.target = new THREE.WebGLRenderTarget(128, 128, {
			minFilter: THREE.NearestFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat, 
			type: THREE.FloatType
		});
		dems.scene = new THREE.Scene();
		dems.camera = new THREE.OrthographicCamera( 0, 128, 128, 0, 0, 10000 );
		dems.camera.up.set(0, 0, 1);
	}
	for(let node of visibleNodes){
		
		if(node.dem !== undefined){
			continue;
		}
		
		let geometry = node.geometryNode.geometry;
		let material = new THREE.PointsMaterial({color: 0x888888 });
		
		renderer.clearTarget( dems.target, true, true, true );
		var pc = new THREE.Points(geometry, material);
		let box = geometry.boundingBox;
		
		dems.scene.add(pc);
		dems.camera.position.set(0, 0, box.max.z);
		
		renderer.render(dems.scene, dems.camera, dems.target);
		
		dems.scene.remove(pc);
		
		//{
		//	let pickWindowSize = 128;
		//	let pixelCount = pickWindowSize * pickWindowSize;
		//	let buffer = new ArrayBuffer(pixelCount*4*4);
		//	let pixels = new Uint8Array(buffer);
		//	let ibuffer = new Uint32Array(buffer);
		//	renderer.context.readPixels(
		//		0, 0, 
		//		pickWindowSize, pickWindowSize, 
		//		renderer.context.RGBA, renderer.context.FLOAT, pixels);
		//		
		//	console.log(pixels[i]);
		//}
		
	}
	
	
}

Potree.Shader = class Shader{
	constructor(vertexShader, fragmentShader, program, uniforms){
		this.vertexShader = vertexShader;
		this.fragmentShader = fragmentShader;
		this.program = program;
		this.uniforms = uniforms;
	}
};

Potree.VBO = class VBO{
	constructor(name, id, attribute){
		this.name = name;
		this.id = id;
		this.attribute = attribute;
	}
};

Potree.VAO = class VAO{
	constructor(id, geometry, vbos){
		this.id = id;
		this.geometry = geometry;
		this.vbos = vbos;
	}
};

Potree.compileShader = function(gl, vertexShader, fragmentShader){
	// VERTEX SHADER
	let vs = gl.createShader(gl.VERTEX_SHADER);
	{
		gl.shaderSource(vs, vertexShader);
		gl.compileShader(vs);
		
		let success = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
		if (!success) {
			console.error("could not compile vertex shader:");
			
			let log = gl.getShaderInfoLog(vs);
			console.error(log, vertexShader);
			
			return;
		}
	}
	
	// FRAGMENT SHADER
	let fs = gl.createShader(gl.FRAGMENT_SHADER);
	{
		gl.shaderSource(fs, fragmentShader);
		gl.compileShader(fs);
		
		let success = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
		if (!success) {
			console.error("could not compile fragment shader:");
			console.error(fragmentShader);
			
			return;
		}
	}
	
	// PROGRAM
	let program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	let success = gl.getProgramParameter(program, gl.LINK_STATUS);
	if (!success) {
		console.error("could not compile shader:");
		console.error(vertexShader);
		console.error(fragmentShader);
			
		return;
	}
	
	gl.useProgram(program);
	
	let uniforms = {};
	{ // UNIFORMS
		let n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

		for(let i = 0; i < n; i++){
			let uniform = gl.getActiveUniform(program, i);
			let name = uniform.name;
			let loc = gl.getUniformLocation(program, name);

			uniforms[name] = loc;
		}
	}
	
	let shader = new Potree.Shader(vertexShader, fragmentShader, program, uniforms);
	
	return shader;
};

// http://blog.tojicode.com/2012/10/oesvertexarrayobject-extension.html
Potree.createVAO = function(gl, geometry){
	if(Potree.vaos[geometry.uuid] ==! undefined){
		return Potree.vaos[geometry.uuid];
	}
	
	let ext = gl.getExtension("OES_vertex_array_object");
	let id = ext.createVertexArrayOES();
	
	ext.bindVertexArrayOES(id);  
	
	let vbos = {};
	for(let key in geometry.attributes){
		let attribute = geometry.attributes[key];
		
		let type = gl.FLOAT;
		if(attribute.array instanceof Uint8Array){
			type = gl.UNSIGNED_BYTE;
		}else if(attribute.array instanceof Uint16Array){
			type = gl.UNSIGNED_SHORT;
		}else if(attribute.array instanceof Uint32Array){
			type = gl.UNSIGNED_INT;
		}else if(attribute.array instanceof Int8Array){
			type = gl.BYTE;
		}else if(attribute.array instanceof Int16Array){
			type = gl.SHORT;
		}else if(attribute.array instanceof Int32Array){
			type = gl.INT;
		}else if(attribute.array instanceof Float32Array){
			type = gl.FLOAT;
		}
		
		let vbo = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
		gl.bufferData(gl.ARRAY_BUFFER, attribute.array, gl.STATIC_DRAW);
		//gl.enableVertexAttribArray(attributePointer);
		//gl.vertexAttribPointer(attributePointer, numElements, type, attribute.normalized, 0, 0);
		
		vbos[key] = new Potree.VBO(key, vbo, attribute);
	}
	
	ext.bindVertexArrayOES(null);
	
	let vao = new Potree.VAO(id, geometry, vbos);
	Potree.vaos[geometry.uuid] = vao;
	
	return vao;
};

Potree.renderPointcloud = function(pointcloud, camera, renderer){
	let gl = renderer.context;
	let webgl = Potree.webgl;
	let material = pointcloud.material;
	
	if(gl.getExtension("OES_vertex_array_object") === null){
		console.error("OES_vertex_array_object extension not supported");
		return;
	}
	
	if(material.needsUpdate){
		Potree.pointcloudShader = Potree.compileShader(gl,
			material.vertexShader, material.fragmentShader);
			
		material.needsUpdate = false;
	}
	
	let shader = Potree.pointcloudShader;
	let uniforms = shader.uniforms;
	
	gl.useProgram(shader.program);
	
	gl.uniformMatrix4fv(uniforms["projectionMatrix"], false, camera.projectionMatrix.elements);
	gl.uniformMatrix4fv(uniforms["viewMatrix"], false, camera.matrixWorldInverse.elements);
	gl.uniform1f(uniforms["fov"], this.material.fov);
	gl.uniform1f(uniforms["screenWidth"], material.screenWidth);
	gl.uniform1f(uniforms["screenHeight"], material.screenHeight);
	gl.uniform1f(uniforms["spacing"], material.spacing);
	gl.uniform1f(uniforms["near"], material.near);
	gl.uniform1f(uniforms["far"], material.far);
	gl.uniform1f(uniforms["size"], material.size);
	gl.uniform1f(uniforms["minSize"], material.minSize);
	gl.uniform1f(uniforms["maxSize"], material.maxSize);
	gl.uniform1f(uniforms["octreeSize"], pointcloud.pcoGeometry.boundingBox.getSize().x);
	
	{
		let apPosition = gl.getAttribLocation(program, "position");
		let apColor = gl.getAttribLocation(program, "color");
		let apNormal = gl.getAttribLocation(program, "normal");
		let apClassification = gl.getAttribLocation(program, "classification");
		let apIndices = gl.getAttribLocation(program, "indices");
		
		gl.enableVertexAttribArray(apPosition);
		gl.enableVertexAttribArray(apColor);
		gl.enableVertexAttribArray(apNormal);
		gl.enableVertexAttribArray(apClassification);		
		gl.enableVertexAttribArray(apIndices);
	}
	
	let nodes = pointcloud.visibleNodes;
	for(let node of nodes){
		let object = node.sceneNode;
		let geometry = object.geometry;
		
		
	}
	
};



















