


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
























Potree.PointCloudTreeNode = class{
	
	constructor(){
		
	}
	
	getChildren(){
		throw "override function";
	};
	
	getBoundingBox(){
		throw "override function";
	};

	isLoaded(){
		throw "override function";
	};
	
	isGeometryNode(){
		throw "override function";
	};
	
	isTreeNode(){
		throw "override function";
	};
	
	getLevel(){
		throw "override function";
	};

	getBoundingSphere(){
		throw "override function";
	};
	
};


Potree.PointCloudTree = class PointCloudTree extends THREE.Object3D{
	
	constructor(){
		super();
	}
	
	initialized(){
		return this.root !== null;
	};

	
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
	
}

Potree.workerPool = new Potree.WorkerPool();



Potree.Shaders["pointcloud.vs"] = [
 "",
 "precision mediump float;",
 "precision mediump int;",
 "",
 "",
 "",
 "",
 "#define max_clip_boxes 30",
 "",
 "attribute vec3 position;",
 "attribute vec3 color;",
 "attribute vec3 normal;",
 "attribute float intensity;",
 "attribute float classification;",
 "attribute float returnNumber;",
 "attribute float numberOfReturns;",
 "attribute float pointSourceID;",
 "attribute vec4 indices;",
 "",
 "uniform mat4 modelMatrix;",
 "uniform mat4 modelViewMatrix;",
 "uniform mat4 projectionMatrix;",
 "uniform mat4 viewMatrix;",
 "uniform mat3 normalMatrix;",
 "",
 "",
 "uniform float screenWidth;",
 "uniform float screenHeight;",
 "uniform float fov;",
 "uniform float spacing;",
 "uniform float near;",
 "uniform float far;",
 "",
 "#if defined use_clip_box",
 "	uniform mat4 clipBoxes[max_clip_boxes];",
 "	uniform vec3 clipBoxPositions[max_clip_boxes];",
 "#endif",
 "",
 "",
 "uniform float heightMin;",
 "uniform float heightMax;",
 "uniform float intensityMin;",
 "uniform float intensityMax;",
 "uniform float size;				// pixel size factor",
 "uniform float minSize;			// minimum pixel size",
 "uniform float maxSize;			// maximum pixel size",
 "uniform float octreeSize;",
 "uniform vec3 bbSize;",
 "uniform vec3 uColor;",
 "uniform float opacity;",
 "uniform float clipBoxCount;",
 "",
 "uniform vec2 intensityRange;",
 "uniform float intensityGamma;",
 "uniform float intensityContrast;",
 "uniform float intensityBrightness;",
 "uniform float rgbGamma;",
 "uniform float rgbContrast;",
 "uniform float rgbBrightness;",
 "uniform float transition;",
 "uniform float wRGB;",
 "uniform float wIntensity;",
 "uniform float wElevation;",
 "uniform float wClassification;",
 "uniform float wReturnNumber;",
 "uniform float wSourceID;",
 "",
 "",
 "uniform sampler2D visibleNodes;",
 "uniform sampler2D gradient;",
 "uniform sampler2D classificationLUT;",
 "uniform sampler2D depthMap;",
 "",
 "varying float	vOpacity;",
 "varying vec3	vColor;",
 "varying float	vLinearDepth;",
 "varying float	vLogDepth;",
 "varying vec3	vViewPosition;",
 "varying float 	vRadius;",
 "varying vec3	vWorldPosition;",
 "varying vec3	vNormal;",
 "",
 "",
 "// ---------------------",
 "// OCTREE",
 "// ---------------------",
 "",
 "#if (defined(adaptive_point_size) || defined(color_type_lod)) && defined(tree_type_octree)",
 "/**",
 " * number of 1-bits up to inclusive index position",
 " * number is treated as if it were an integer in the range 0-255",
 " *",
 " */",
 "float numberOfOnes(float number, float index){",
 "	float tmp = mod(number, pow(2.0, index + 1.0));",
 "	float numOnes = 0.0;",
 "	for(float i = 0.0; i < 8.0; i++){",
 "		if(mod(tmp, 2.0) != 0.0){",
 "			numOnes++;",
 "		}",
 "		tmp = floor(tmp / 2.0);",
 "	}",
 "	return numOnes;",
 "}",
 "",
 "",
 "/**",
 " * checks whether the bit at index is 1",
 " * number is treated as if it were an integer in the range 0-255",
 " *",
 " */",
 "bool isBitSet(float number, float index){",
 "	return mod(floor(number / pow(2.0, index)), 2.0) != 0.0;",
 "}",
 "",
 "",
 "/**",
 " * find the LOD at the point position",
 " */",
 "float getLOD(){",
 "	vec3 offset = vec3(0.0, 0.0, 0.0);",
 "	float iOffset = 0.0;",
 "	float depth = 0.0;",
 "	for(float i = 0.0; i <= 1000.0; i++){",
 "		float nodeSizeAtLevel = octreeSize  / pow(2.0, i);",
 "		vec3 index3d = (position - offset) / nodeSizeAtLevel;",
 "		index3d = floor(index3d + 0.5);",
 "		float index = 4.0*index3d.x + 2.0*index3d.y + index3d.z;",
 "		",
 "		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));",
 "		float mask = value.r * 255.0;",
 "		if(isBitSet(mask, index)){",
 "			// there are more visible child nodes at this position",
 "			iOffset = iOffset + value.g * 255.0 + numberOfOnes(mask, index - 1.0);",
 "			depth++;",
 "		}else{",
 "			// no more visible child nodes at this position",
 "			return depth;",
 "		}",
 "		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;",
 "	}",
 "		",
 "	return depth;",
 "}",
 "",
 "float getPointSizeAttenuation(){",
 "	return pow(1.9, getLOD());",
 "}",
 "",
 "",
 "#endif",
 "",
 "",
 "// ---------------------",
 "// KD-TREE",
 "// ---------------------",
 "",
 "#if (defined(adaptive_point_size) || defined(color_type_lod)) && defined(tree_type_kdtree)",
 "",
 "float getLOD(){",
 "	vec3 offset = vec3(0.0, 0.0, 0.0);",
 "	float iOffset = 0.0;",
 "	float depth = 0.0;",
 "		",
 "		",
 "	vec3 size = bbSize;	",
 "	vec3 pos = position;",
 "		",
 "	for(float i = 0.0; i <= 1000.0; i++){",
 "		",
 "		vec4 value = texture2D(visibleNodes, vec2(iOffset / 2048.0, 0.0));",
 "		",
 "		int children = int(value.r * 255.0);",
 "		float next = value.g * 255.0;",
 "		int split = int(value.b * 255.0);",
 "		",
 "		if(next == 0.0){",
 "		 	return depth;",
 "		}",
 "		",
 "		vec3 splitv = vec3(0.0, 0.0, 0.0);",
 "		if(split == 1){",
 "			splitv.x = 1.0;",
 "		}else if(split == 2){",
 "		 	splitv.y = 1.0;",
 "		}else if(split == 4){",
 "		 	splitv.z = 1.0;",
 "		}",
 "		",
 "		iOffset = iOffset + next;",
 "		",
 "		float factor = length(pos * splitv / size);",
 "		if(factor < 0.5){",
 "		 	// left",
 "		    if(children == 0 || children == 2){",
 "		    	return depth;",
 "		    }",
 "		}else{",
 "		  	// right",
 "		    pos = pos - size * splitv * 0.5;",
 "		    if(children == 0 || children == 1){",
 "		    	return depth;",
 "		    }",
 "		    if(children == 3){",
 "		    	iOffset = iOffset + 1.0;",
 "		    }",
 "		}",
 "		size = size * ((1.0 - (splitv + 1.0) / 2.0) + 0.5);",
 "		",
 "		depth++;",
 "	}",
 "		",
 "		",
 "	return depth;	",
 "}",
 "",
 "float getPointSizeAttenuation(){",
 "	return 0.5 * pow(1.3, getLOD());",
 "}",
 "",
 "#endif",
 "",
 "// formula adapted from: http://www.dfstudios.co.uk/articles/programming/image-programming-algorithms/image-processing-algorithms-part-5-contrast-adjustment/",
 "float getContrastFactor(float contrast){",
 "	return (1.0158730158730156 * (contrast + 1.0)) / (1.0158730158730156 - contrast);",
 "}",
 "",
 "vec3 getRGB(){",
 "	vec3 rgb = color;",
 "	",
 "	rgb = pow(rgb, vec3(rgbGamma));",
 "	rgb = rgb + rgbBrightness;",
 "	rgb = (rgb - 0.5) * getContrastFactor(rgbContrast) + 0.5;",
 "	rgb = clamp(rgb, 0.0, 1.0);",
 "	",
 "	return rgb;",
 "}",
 "",
 "float getIntensity(){",
 "	float w = (intensity - intensityRange.x) / (intensityRange.y - intensityRange.x);",
 "	w = pow(w, intensityGamma);",
 "	w = w + intensityBrightness;",
 "	w = (w - 0.5) * getContrastFactor(intensityContrast) + 0.5;",
 "	w = clamp(w, 0.0, 1.0);",
 "	",
 "	return w;",
 "}",
 "",
 "vec3 getElevation(){",
 "	vec4 world = modelMatrix * vec4( position, 1.0 );",
 "	float w = (world.z - heightMin) / (heightMax-heightMin);",
 "	vec3 cElevation = texture2D(gradient, vec2(w,1.0-w)).rgb;",
 "	",
 "	return cElevation;",
 "}",
 "",
 "vec4 getClassification(){",
 "	vec2 uv = vec2(classification / 255.0, 0.5);",
 "	vec4 classColor = texture2D(classificationLUT, uv);",
 "	",
 "	return classColor;",
 "}",
 "",
 "vec3 getReturnNumber(){",
 "	if(numberOfReturns == 1.0){",
 "		return vec3(1.0, 1.0, 0.0);",
 "	}else{",
 "		if(returnNumber == 1.0){",
 "			return vec3(1.0, 0.0, 0.0);",
 "		}else if(returnNumber == numberOfReturns){",
 "			return vec3(0.0, 0.0, 1.0);",
 "		}else{",
 "			return vec3(0.0, 1.0, 0.0);",
 "		}",
 "	}",
 "}",
 "",
 "vec3 getSourceID(){",
 "	float w = mod(pointSourceID, 10.0) / 10.0;",
 "	return texture2D(gradient, vec2(w,1.0 - w)).rgb;",
 "}",
 "",
 "vec3 getCompositeColor(){",
 "	vec3 c;",
 "	float w;",
 "",
 "	c += wRGB * getRGB();",
 "	w += wRGB;",
 "	",
 "	c += wIntensity * getIntensity() * vec3(1.0, 1.0, 1.0);",
 "	w += wIntensity;",
 "	",
 "	c += wElevation * getElevation();",
 "	w += wElevation;",
 "	",
 "	c += wReturnNumber * getReturnNumber();",
 "	w += wReturnNumber;",
 "	",
 "	c += wSourceID * getSourceID();",
 "	w += wSourceID;",
 "	",
 "	vec4 cl = wClassification * getClassification();",
 "    c += cl.a * cl.rgb;",
 "	w += wClassification * cl.a;",
 "",
 "	c = c / w;",
 "	",
 "	if(w == 0.0){",
 "		//c = color;",
 "		gl_Position = vec4(100.0, 100.0, 100.0, 0.0);",
 "	}",
 "	",
 "	return c;",
 "}",
 "",
 "void main() {",
 "	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
 "	vViewPosition = mvPosition.xyz;",
 "	gl_Position = projectionMatrix * mvPosition;",
 "	vOpacity = opacity;",
 "	vLinearDepth = gl_Position.w;",
 "	vLogDepth = log2(gl_Position.w);",
 "	vNormal = normalize(normalMatrix * normal);",
 "",
 "	// ---------------------",
 "	// POINT COLOR",
 "	// ---------------------",
 "	vec4 cl = getClassification(); ",
 "	",
 "	#ifdef color_type_rgb",
 "		vColor = getRGB();",
 "	#elif defined color_type_height",
 "		vColor = getElevation();",
 "	#elif defined color_type_rgb_height",
 "		vec3 cHeight = getElevation();",
 "		vColor = (1.0 - transition) * getRGB() + transition * cHeight;",
 "	#elif defined color_type_depth",
 "		float linearDepth = -mvPosition.z ;",
 "		float expDepth = (gl_Position.z / gl_Position.w) * 0.5 + 0.5;",
 "		vColor = vec3(linearDepth, expDepth, 0.0);",
 "	#elif defined color_type_intensity",
 "		float w = getIntensity();",
 "		vColor = vec3(w, w, w);",
 "	#elif defined color_type_intensity_gradient",
 "		float w = getIntensity();",
 "		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;",
 "	#elif defined color_type_color",
 "		vColor = uColor;",
 "	#elif defined color_type_lod",
 "		float depth = getLOD();",
 "		float w = depth / 10.0;",
 "		vColor = texture2D(gradient, vec2(w,1.0-w)).rgb;",
 "	#elif defined color_type_point_index",
 "		vColor = indices.rgb;",
 "	#elif defined color_type_classification",
 "		vColor = cl.rgb;",
 "	#elif defined color_type_return_number",
 "		vColor = getReturnNumber();",
 "	#elif defined color_type_source",
 "		vColor = getSourceID();",
 "	#elif defined color_type_normal",
 "		vColor = (modelMatrix * vec4(normal, 0.0)).xyz;",
 "	#elif defined color_type_phong",
 "		vColor = color;",
 "	#elif defined color_type_composite",
 "		vColor = getCompositeColor();",
 "	#endif",
 "	",
 "	#if !defined color_type_composite",
 "		if(cl.a == 0.0){",
 "			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);",
 "			",
 "			return;",
 "		}",
 "	#endif",
 "	",
 "	// ---------------------",
 "	// POINT SIZE",
 "	// ---------------------",
 "	float pointSize = 1.0;",
 "	",
 "	float slope = tan(fov / 2.0);",
 "	float projFactor =  -0.5 * screenHeight / (slope * vViewPosition.z);",
 "	",
 "	float r = spacing * 1.5;",
 "	vRadius = r;",
 "	#if defined fixed_point_size",
 "		pointSize = size;",
 "	#elif defined attenuated_point_size",
 "		pointSize = size * projFactor;",
 "	#elif defined adaptive_point_size",
 "		float worldSpaceSize = size * r / getPointSizeAttenuation();",
 "		pointSize = worldSpaceSize * projFactor;",
 "	#endif",
 "",
 "	pointSize = max(minSize, pointSize);",
 "	pointSize = min(maxSize, pointSize);",
 "	",
 "	vRadius = pointSize / projFactor;",
 "	",
 "	gl_PointSize = pointSize;",
 "	",
 "	",
 "	// ---------------------",
 "	// CLIPPING",
 "	// ---------------------",
 "	",
 "	#if defined use_clip_box",
 "		bool insideAny = false;",
 "		for(int i = 0; i < max_clip_boxes; i++){",
 "			if(i == int(clipBoxCount)){",
 "				break;",
 "			}",
 "		",
 "			vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4( position, 1.0 );",
 "			bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;",
 "			inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;",
 "			inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;",
 "			insideAny = insideAny || inside;",
 "		}",
 "		if(!insideAny){",
 "	",
 "			#if defined clip_outside",
 "				gl_Position = vec4(1000.0, 1000.0, 1000.0, 1.0);",
 "			#elif defined clip_highlight_inside && !defined(color_type_depth)",
 "				float c = (vColor.r + vColor.g + vColor.b) / 6.0;",
 "			#endif",
 "		}else{",
 "			#if defined clip_highlight_inside",
 "			vColor.r += 0.5;",
 "			#endif",
 "		}",
 "	#endif",
 "	",
 "}",
 "",
].join("\n");

Potree.Shaders["pointcloud.fs"] = [
 "",
 "precision mediump float;",
 "precision mediump int;",
 "",
 "#if defined use_interpolation",
 "	#extension GL_EXT_frag_depth : enable",
 "#endif",
 "",
 "uniform mat4 viewMatrix;",
 "uniform vec3 cameraPosition;",
 "",
 "",
 "uniform mat4 projectionMatrix;",
 "uniform float opacity;",
 "",
 "uniform float blendHardness;",
 "uniform float blendDepthSupplement;",
 "uniform float fov;",
 "uniform float spacing;",
 "uniform float near;",
 "uniform float far;",
 "uniform float pcIndex;",
 "uniform float screenWidth;",
 "uniform float screenHeight;",
 "",
 "uniform sampler2D depthMap;",
 "",
 "varying vec3	vColor;",
 "varying float	vOpacity;",
 "varying float	vLinearDepth;",
 "varying float	vLogDepth;",
 "varying vec3	vViewPosition;",
 "varying float	vRadius;",
 "varying vec3	vNormal;",
 "",
 "float specularStrength = 1.0;",
 "",
 "void main() {",
 "",
 "	vec3 color = vColor;",
 "	float depth = gl_FragCoord.z;",
 "",
 "	#if defined(circle_point_shape) || defined(use_interpolation) || defined (weighted_splats)",
 "		float u = 2.0 * gl_PointCoord.x - 1.0;",
 "		float v = 2.0 * gl_PointCoord.y - 1.0;",
 "	#endif",
 "	",
 "	#if defined(circle_point_shape) || defined (weighted_splats)",
 "		float cc = u*u + v*v;",
 "		if(cc > 1.0){",
 "			discard;",
 "		}",
 "	#endif",
 "	",
 "	#if defined weighted_splats",
 "		vec2 uv = gl_FragCoord.xy / vec2(screenWidth, screenHeight);",
 "		float sDepth = texture2D(depthMap, uv).r;",
 "		if(vLinearDepth > sDepth + vRadius + blendDepthSupplement){",
 "			discard;",
 "		}",
 "	#endif",
 "		",
 "	#if defined color_type_point_index",
 "		gl_FragColor = vec4(color, pcIndex / 255.0);",
 "	#else",
 "		gl_FragColor = vec4(color, vOpacity);",
 "	#endif",
 "",
 "	vec3 normal = normalize( vNormal );",
 "	normal.z = abs(normal.z);",
 "	vec3 viewPosition = normalize( vViewPosition );",
 "	",
 "	#if defined(color_type_phong)",
 "",
 "	// code taken from three.js phong light fragment shader",
 "	",
 "		#if MAX_POINT_LIGHTS > 0",
 "",
 "			vec3 pointDiffuse = vec3( 0.0 );",
 "			vec3 pointSpecular = vec3( 0.0 );",
 "",
 "			for ( int i = 0; i < MAX_POINT_LIGHTS; i ++ ) {",
 "",
 "				vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
 "				vec3 lVector = lPosition.xyz + vViewPosition.xyz;",
 "",
 "				float lDistance = 1.0;",
 "				if ( pointLightDistance[ i ] > 0.0 )",
 "					lDistance = 1.0 - min( ( length( lVector ) / pointLightDistance[ i ] ), 1.0 );",
 "",
 "				lVector = normalize( lVector );",
 "",
 "						// diffuse",
 "",
 "				float dotProduct = dot( normal, lVector );",
 "",
 "				#ifdef WRAP_AROUND",
 "",
 "					float pointDiffuseWeightFull = max( dotProduct, 0.0 );",
 "					float pointDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );",
 "",
 "					vec3 pointDiffuseWeight = mix( vec3( pointDiffuseWeightFull ), vec3( pointDiffuseWeightHalf ), wrapRGB );",
 "",
 "				#else",
 "",
 "					float pointDiffuseWeight = max( dotProduct, 0.0 );",
 "",
 "				#endif",
 "",
 "				pointDiffuse += diffuse * pointLightColor[ i ] * pointDiffuseWeight * lDistance;",
 "",
 "						// specular",
 "",
 "				vec3 pointHalfVector = normalize( lVector + viewPosition );",
 "				float pointDotNormalHalf = max( dot( normal, pointHalfVector ), 0.0 );",
 "				float pointSpecularWeight = specularStrength * max( pow( pointDotNormalHalf, shininess ), 0.0 );",
 "",
 "				float specularNormalization = ( shininess + 2.0 ) / 8.0;",
 "",
 "				vec3 schlick = specular + vec3( 1.0 - specular ) * pow( max( 1.0 - dot( lVector, pointHalfVector ), 0.0 ), 5.0 );",
 "				pointSpecular += schlick * pointLightColor[ i ] * pointSpecularWeight * pointDiffuseWeight * lDistance * specularNormalization;",
 "				pointSpecular = vec3(0.0, 0.0, 0.0);",
 "			}",
 "		",
 "		#endif",
 "		",
 "		#if MAX_DIR_LIGHTS > 0",
 "",
 "			vec3 dirDiffuse = vec3( 0.0 );",
 "			vec3 dirSpecular = vec3( 0.0 );",
 "",
 "			for( int i = 0; i < MAX_DIR_LIGHTS; i ++ ) {",
 "",
 "				vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );",
 "				vec3 dirVector = normalize( lDirection.xyz );",
 "",
 "						// diffuse",
 "",
 "				float dotProduct = dot( normal, dirVector );",
 "",
 "				#ifdef WRAP_AROUND",
 "",
 "					float dirDiffuseWeightFull = max( dotProduct, 0.0 );",
 "					float dirDiffuseWeightHalf = max( 0.5 * dotProduct + 0.5, 0.0 );",
 "",
 "					vec3 dirDiffuseWeight = mix( vec3( dirDiffuseWeightFull ), vec3( dirDiffuseWeightHalf ), wrapRGB );",
 "",
 "				#else",
 "",
 "					float dirDiffuseWeight = max( dotProduct, 0.0 );",
 "",
 "				#endif",
 "",
 "				dirDiffuse += diffuse * directionalLightColor[ i ] * dirDiffuseWeight;",
 "",
 "				// specular",
 "",
 "				vec3 dirHalfVector = normalize( dirVector + viewPosition );",
 "				float dirDotNormalHalf = max( dot( normal, dirHalfVector ), 0.0 );",
 "				float dirSpecularWeight = specularStrength * max( pow( dirDotNormalHalf, shininess ), 0.0 );",
 "",
 "				float specularNormalization = ( shininess + 2.0 ) / 8.0;",
 "",
 "				vec3 schlick = specular + vec3( 1.0 - specular ) * pow( max( 1.0 - dot( dirVector, dirHalfVector ), 0.0 ), 5.0 );",
 "				dirSpecular += schlick * directionalLightColor[ i ] * dirSpecularWeight * dirDiffuseWeight * specularNormalization;",
 "			}",
 "",
 "		#endif",
 "		",
 "		vec3 totalDiffuse = vec3( 0.0 );",
 "		vec3 totalSpecular = vec3( 0.0 );",
 "		",
 "		#if MAX_POINT_LIGHTS > 0",
 "",
 "			totalDiffuse += pointDiffuse;",
 "			totalSpecular += pointSpecular;",
 "",
 "		#endif",
 "		",
 "		#if MAX_DIR_LIGHTS > 0",
 "",
 "			totalDiffuse += dirDiffuse;",
 "			totalSpecular += dirSpecular;",
 "",
 "		#endif",
 "		",
 "		gl_FragColor.xyz = gl_FragColor.xyz * ( emissive + totalDiffuse + ambientLightColor * ambient ) + totalSpecular;",
 "",
 "	#endif",
 "	",
 "	#if defined weighted_splats",
 "	    //float w = pow(1.0 - (u*u + v*v), blendHardness);",
 "		",
 "		float wx = 2.0 * length(2.0 * gl_PointCoord - 1.0);",
 "		float w = exp(-wx * wx * 0.5);",
 "		",
 "		//float distance = length(2.0 * gl_PointCoord - 1.0);",
 "		//float w = exp( -(distance * distance) / blendHardness);",
 "		",
 "		gl_FragColor.rgb = gl_FragColor.rgb * w;",
 "		gl_FragColor.a = w;",
 "	#endif",
 "	",
 "	#if defined use_interpolation",
 "		float wi = 0.0 - ( u*u + v*v);",
 "		vec4 pos = vec4(vViewPosition, 1.0);",
 "		pos.z += wi * vRadius;",
 "		float linearDepth = -pos.z;",
 "		pos = projectionMatrix * pos;",
 "		pos = pos / pos.w;",
 "		float expDepth = pos.z;",
 "		depth = (pos.z + 1.0) / 2.0;",
 "		gl_FragDepthEXT = depth;",
 "		",
 "		#if defined(color_type_depth)",
 "			color.r = linearDepth;",
 "			color.g = expDepth;",
 "		#endif",
 "		",
 "		#if defined(use_edl)",
 "			gl_FragColor.a = log2(linearDepth);",
 "		#endif",
 "		",
 "	#else",
 "		#if defined(use_edl)",
 "			gl_FragColor.a = vLogDepth;",
 "		#endif",
 "	#endif",
 "	",
 "	",
 "		",
 "	",
 "	",
 "	",
 "	",
 "}",
 "",
 "",
 "",
].join("\n");

Potree.Shaders["normalize.vs"] = [
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "    vUv = uv;",
 "",
 "    gl_Position =   projectionMatrix * modelViewMatrix * vec4(position,1.0);",
 "}",
].join("\n");

Potree.Shaders["normalize.fs"] = [
 "",
 "#extension GL_EXT_frag_depth : enable",
 "",
 "uniform sampler2D depthMap;",
 "uniform sampler2D texture;",
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "    float depth = texture2D(depthMap, vUv).g; ",
 "	",
 "	if(depth <= 0.0){",
 "		discard;",
 "	}",
 "	",
 "    vec4 color = texture2D(texture, vUv); ",
 "	color = color / color.w;",
 "    ",
 "	gl_FragColor = vec4(color.xyz, 1.0); ",
 "	",
 "	gl_FragDepthEXT = depth;",
 "}",
].join("\n");

Potree.Shaders["edl.vs"] = [
 "",
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "    vUv = uv;",
 "	",
 "	vec4 mvPosition = modelViewMatrix * vec4(position,1.0);",
 "",
 "    gl_Position = projectionMatrix * mvPosition;",
 "}",
].join("\n");

Potree.Shaders["edl.fs"] = [
 "// ",
 "// adapted from the EDL shader code from Christian Boucheny in cloud compare:",
 "// https://github.com/cloudcompare/trunk/tree/master/plugins/qEDL/shaders/EDL",
 "//",
 "",
 "//#define NEIGHBOUR_COUNT 4",
 "",
 "uniform float screenWidth;",
 "uniform float screenHeight;",
 "uniform vec2 neighbours[NEIGHBOUR_COUNT];",
 "uniform float edlStrength;",
 "uniform float radius;",
 "uniform float opacity;",
 "",
 "uniform sampler2D colorMap;",
 "",
 "varying vec2 vUv;",
 "",
 "const float infinity = 1.0 / 0.0;",
 "",
 "float response(float depth){",
 "	vec2 uvRadius = radius / vec2(screenWidth, screenHeight);",
 "	",
 "	float sum = 0.0;",
 "	",
 "	for(int i = 0; i < NEIGHBOUR_COUNT; i++){",
 "		vec2 uvNeighbor = vUv + uvRadius * neighbours[i];",
 "		",
 "		float neighbourDepth = texture2D(colorMap, uvNeighbor).a;",
 "		",
 "		if(neighbourDepth == 0.0){",
 "			neighbourDepth = infinity;",
 "		}",
 "		",
 "		sum += max(0.0, depth - neighbourDepth);",
 "	}",
 "	",
 "	return sum / float(NEIGHBOUR_COUNT);",
 "}",
 "",
 "void main(){",
 "	vec4 color = texture2D(colorMap, vUv);",
 "	",
 "	float depth = color.a;",
 "	if(depth == 0.0){",
 "		depth = infinity;",
 "	}",
 "	",
 "	float res = response(depth);",
 "	float shade = exp(-res * 300.0 * edlStrength);",
 "	",
 "	if(color.a == 0.0 && res == 0.0){",
 "		discard;",
 "	}",
 "	",
 "	gl_FragColor = vec4(color.rgb * shade, opacity);",
 "}",
 "",
].join("\n");

Potree.Shaders["blur.vs"] = [
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "    vUv = uv;",
 "",
 "    gl_Position =   projectionMatrix * modelViewMatrix * vec4(position,1.0);",
 "}",
].join("\n");

Potree.Shaders["blur.fs"] = [
 "",
 "uniform mat4 projectionMatrix;",
 "",
 "uniform float screenWidth;",
 "uniform float screenHeight;",
 "uniform float near;",
 "uniform float far;",
 "",
 "uniform sampler2D map;",
 "",
 "varying vec2 vUv;",
 "",
 "void main() {",
 "",
 "	float dx = 1.0 / screenWidth;",
 "	float dy = 1.0 / screenHeight;",
 "",
 "	vec3 color = vec3(0.0, 0.0, 0.0);",
 "	color += texture2D(map, vUv + vec2(-dx, -dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(  0, -dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(+dx, -dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(-dx,   0)).rgb;",
 "	color += texture2D(map, vUv + vec2(  0,   0)).rgb;",
 "	color += texture2D(map, vUv + vec2(+dx,   0)).rgb;",
 "	color += texture2D(map, vUv + vec2(-dx,  dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(  0,  dy)).rgb;",
 "	color += texture2D(map, vUv + vec2(+dx,  dy)).rgb;",
 "    ",
 "	color = color / 9.0;",
 "	",
 "	gl_FragColor = vec4(color, 1.0);",
 "	",
 "	",
 "}",
].join("\n");



THREE.EventDispatcher.prototype.removeEventListeners = function(type){
	
	if ( this._listeners === undefined ) return;
	
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
		var pco = new Potree.PointCloudOctreeGeometry();
		pco.url = url;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		
		xhr.onreadystatechange = function(){
			if(xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)){
				var fMno = JSON.parse(xhr.responseText);
				
				var version = new Potree.Version(fMno.version);
				
				// assume octreeDir is absolute if it starts with http
				if(fMno.octreeDir.indexOf("http") === 0){
					pco.octreeDir = fMno.octreeDir;
				}else{
					pco.octreeDir = url + "/../" + fMno.octreeDir;
				}
				
				pco.spacing = fMno.spacing;
				pco.hierarchyStepSize = fMno.hierarchyStepSize;

				pco.pointAttributes = fMno.pointAttributes;
				
				var min = new THREE.Vector3(fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz);
				var max = new THREE.Vector3(fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz);
				var boundingBox = new THREE.Box3(min, max);
				var tightBoundingBox = boundingBox.clone();
				
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
				
				var nodes = {};
				
				{ // load root
					var name = "r";
					
					var root = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
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
					for( var i = 1; i < fMno.hierarchy.length; i++){
						var name = fMno.hierarchy[i][0];
						var numPoints = fMno.hierarchy[i][1];
						var index = parseInt(name.charAt(name.length-1));
						var parentName = name.substring(0, name.length-1);
						var parentNode = nodes[parentName];
						var level = name.length-1;
						var boundingBox = Potree.POCLoader.createChildAABB(parentNode.boundingBox, index);
						
						var node = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
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
	
	var fpa = mno.pointAttributes;
	var pa = new Potree.PointAttributes();
	
	for(var i = 0; i < fpa.length; i++){   
		var pointAttribute = Potree.PointAttribute[fpa[i]];
		pa.add(pointAttribute);
	}                                                                     
	
	return pa;
};


Potree.POCLoader.createChildAABB = function(aabb, childIndex){
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

	var scope = this;

	var url = node.getURL();

	if(this.version.equalOrHigher("1.4")){
		url += ".bin";
	}

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200 || xhr.status === 0) {
				var buffer = xhr.response;
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

	var numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;
	var pointAttributes = node.pcoGeometry.pointAttributes;

	if(this.version.upTo("1.5")){
		node.numPoints = numPoints;
	}

	let workerPath = Potree.scriptPath + "/workers/BinaryDecoderWorker.js";
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

		for(var property in buffers){
			if(buffers.hasOwnProperty(property)){
				var buffer = buffers[property].buffer;
				var attribute = buffers[property].attribute;
				var numElements = attribute.numElements;

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
		geometry.addAttribute("indices", new THREE.BufferAttribute(new Float32Array(data.indices), 1));

		if(!geometry.attributes.normal){
			var buffer = new Float32Array(numPoints*3);
			geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(buffer), 3));
		}

		geometry.boundingBox = node.boundingBox;
		//geometry.boundingBox = tightBoundingBox;
		node.geometry = geometry;
		//node.boundingBox = tightBoundingBox;
		node.tightBoundingBox = tightBoundingBox;
		node.loaded = true;
		node.loading = false;
		node.pcoGeometry.numNodesLoading--;
	};

	var message = {
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

        addAttribute('indices', data.indices, 1);

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


	//let nodeOffset = node.boundingBox.getSize().multiplyScalar(0.5);
	//let nodeOffset = new THREE.Vector3(0, 0, 0);
	let nodeOffset = node.pcoGeometry.boundingBox.getCenter();

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
var getQueryParam = function(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

Potree.GreyhoundLoader = function() { };
Potree.GreyhoundLoader.loadInfoJSON = function load(url, callback) { }

var createSchema = function(attributes) {
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

var fetch = function(url, cb) {
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

var fetchBinary = function(url, cb) {
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

var pointSizeFrom = function(schema) {
    return schema.reduce((p, c) => p + c.size, 0);
};

var getNormalization = function(serverURL, baseDepth, cb) {
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

    fetchBinary(url, function(err, buffer) {
        if (err) throw new Error(err);

        var view = new DataView(buffer);
        var numBytes = buffer.byteLength - 4;
        var numPoints = view.getUint32(numBytes, true);
        var pointSize = pointSizeFrom(s);

        var colorNorm = false, intensityNorm = false;
        var v;

        for (var offset = 0; offset < numBytes; offset += pointSize) {
            if (view.getUint16(offset + 12, true) > 255 ||
                view.getUint16(offset + 14, true) > 255 ||
                view.getUint16(offset + 16, true) > 255) {
                colorNorm = true;
            }

            if (view.getUint16(18, true) > 255) {
                intensityNorm = true;
            }

            if (colorNorm && intensityNorm) break;
        }

        if (colorNorm) console.log('Normalizing color');
        if (intensityNorm) console.log('Normalizing intensity');

        cb(null, { color: colorNorm, intensity: intensityNorm });
    });
};

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

        fetch(serverURL + 'info', function(err, data) {
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

            if (getQueryParam('scale')) {
                scale = parseFloat(getQueryParam('scale'));
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

            pgg.schema = createSchema(attributes);
            var pointSize = pointSizeFrom(pgg.schema);

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

            getNormalization(serverURL, greyhoundInfo.baseDepth,
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

Potree.LasLazLoader = function(version){
	if(typeof(version) === "string"){
		this.version = new Potree.Version(version);
	}else{
		this.version = version;
	}
};

Potree.LasLazLoader.prototype.load = function(node){

	if(node.loaded){
		return;
	}
	
	//var url = node.pcoGeometry.octreeDir + "/" + node.name;
	var pointAttributes = node.pcoGeometry.pointAttributes;
	//var url = node.pcoGeometry.octreeDir + "/" + node.name + "." + pointAttributes.toLowerCase()

	var url = node.getURL();
	
	if(this.version.equalOrHigher("1.4")){
		url += "." + pointAttributes.toLowerCase();
	}
	
	var scope = this;
	
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200) {
				var buffer = xhr.response;
				//LasLazLoader.loadData(buffer, handler);
				scope.parse(node, buffer);
			} else {
				console.log('Failed to load file! HTTP status: ' + xhr.status + ", file: " + url);
			}
		}
	};
	
	xhr.send(null);
};

Potree.LasLazLoader.progressCB = function(arg){

};

Potree.LasLazLoader.prototype.parse = function loadData(node, buffer){
	var lf = new LASFile(buffer);
	var handler = new Potree.LasLazBatcher(node);
	
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
		var lf = v[0];
		var header = v[1];
		
		var skip = 1;
		var totalRead = 0;
		var totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);
		var reader = function() {
			var p = lf.readData(1000000, 0, skip);
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
		var lf = v[0];
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
};

Potree.LasLazLoader.prototype.handle = function(node, url){

};






Potree.LasLazBatcher = function(node){	
	this.push = function(lasBuffer){
		
		let workerPath = Potree.scriptPath + "/workers/lasdecoder-worker.js";
		let worker = Potree.workerPool.getWorker(workerPath);
		
		var mins = new THREE.Vector3(lasBuffer.mins[0], lasBuffer.mins[1], lasBuffer.mins[2]);
		var maxs = new THREE.Vector3(lasBuffer.maxs[0], lasBuffer.maxs[1], lasBuffer.maxs[2]);
		mins.add(node.pcoGeometry.offset);
		maxs.add(node.pcoGeometry.offset);
		
		worker.onmessage = function(e){
			var geometry = new THREE.BufferGeometry();
			var numPoints = lasBuffer.pointsCount;
			
			var endsWith = function(str, suffix) {
				return str.indexOf(suffix, str.length - suffix.length) !== -1;
			};
			
			var positions = e.data.position;
			var colors = new Uint8Array(e.data.color);
			var intensities = e.data.intensity;
			var classifications = new Uint8Array(e.data.classification);
			var returnNumbers = new Uint8Array(e.data.returnNumber);
			var numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			var pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			var indices = new ArrayBuffer(numPoints*4);
			var iIndices = new Uint32Array(indices);
			
			var box = new THREE.Box3();
			
			var fPositions = new Float32Array(positions);
			for(var i = 0; i < numPoints; i++){				
				iIndices[i] = i;
				
				box.expandByPoint(new THREE.Vector3(fPositions[3*i+0], fPositions[3*i+1], fPositions[3*i+2]));
			}
			
			geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(intensities), 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(returnNumbers, 1));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(numberOfReturns, 1));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(pointSourceIDs, 1));
			geometry.addAttribute('indices', new THREE.BufferAttribute(indices, 1));
			geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(numPoints*3), 3));
			
			var tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);
			
			geometry.boundingBox = new THREE.Box3(mins, maxs);
			//geometry.boundingBox = tightBoundingBox;
			//node.boundingBox = geometry.boundingBox;
			node.tightBoundingBox = tightBoundingBox;
			
			node.geometry = geometry;
			node.loaded = true;
			node.loading = false;
			node.pcoGeometry.numNodesLoading--;
			
			Potree.workerPool.returnWorker(workerPath, worker);
		};
		
		var message = {
			buffer: lasBuffer.arrayb,
			numPoints: lasBuffer.pointsCount,
			pointSize: lasBuffer.pointSize,
			pointFormatID: 2,
			scale: lasBuffer.scale,
			offset: lasBuffer.offset,
			mins: [node.pcoGeometry.boundingBox.min.x, node.pcoGeometry.boundingBox.min.y, node.pcoGeometry.boundingBox.min.z],
			maxs: [node.pcoGeometry.boundingBox.max.x, node.pcoGeometry.boundingBox.max.y, node.pcoGeometry.boundingBox.max.z],
			bbOffset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z]
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
	CIRCLE: 1
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

Potree.PointCloudMaterial = function(parameters){
	THREE.Material.call( this );

	parameters = parameters || {};

	this.visibleNodesTexture = Potree.utils.generateDataTexture( 2048, 1, new THREE.Color( 0xffffff ) );
	this.visibleNodesTexture.minFilter = THREE.NearestFilter;
	this.visibleNodesTexture.magFilter = THREE.NearestFilter;
	
	let pointSize = parameters.size || 1.0;
	let minSize = parameters.minSize || 1.0;
	let maxSize = parameters.maxSize || 50.0;
	let treeType = parameters.treeType || Potree.TreeType.OCTREE;
	
	this._pointSizeType = Potree.PointSizeType.ATTENUATED;
	this._pointShape = Potree.PointShape.SQUARE;
	this._interpolate = false;
	this._pointColorType = Potree.PointColorType.RGB;
	this._useClipBox = false;
	this.numClipBoxes = 0;
	this._clipMode = Potree.ClipMode.DISABLED;
	this._weighted = false;
	this._depthMap = null;
	this._gradient = Potree.Gradients.RAINBOW;
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
		normal:				{ type: "f", value: [] }
	};
	
	this.uniforms = {
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
		intensityMin:		{ type: "f", value: 0.0 },
		intensityMax:		{ type: "f", value: 1.0 },
		clipBoxCount:		{ type: "f", value: 0 },
		visibleNodes:		{ type: "t", value: this.visibleNodesTexture },
		pcIndex:   			{ type: "f", value: 0 },
		gradient: 			{ type: "t", value: this.gradientTexture },
		classificationLUT: 	{ type: "t", value: this.classificationTexture },
		clipBoxes:			{ type: "Matrix4fv", value: [] },
		clipBoxPositions:	{ type: "fv", value: null },
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
		wSourceID:		{ type: "f", value: 0 },
	};
	
	this.defaultAttributeValues.normal = [0,0,0];
	this.defaultAttributeValues.classification = [0,0,0];
	
	this.vertexShader = this.getDefines() + Potree.Shaders["pointcloud.vs"];
	this.fragmentShader = this.getDefines() + Potree.Shaders["pointcloud.fs"];
	this.vertexColors = THREE.VertexColors;
};

Potree.PointCloudMaterial.prototype = new THREE.RawShaderMaterial();


//Potree.PointCloudMaterial.prototype.copyFrom = function(source){
//	
//	for(let uniform of source.uniforms){
//		this.uniforms.value = source.uniforms.value;
//	}
//	
//	this.pointSizeType = source.pointSizeType;
//	
//};
//
//Potree.PointCloudMaterial.prototype.clone = function(){
//	let material = new Potree.PointCloudMaterial();
//	material.copyFrom(this);
//	
//	return material;
//};

Potree.PointCloudMaterial.prototype.updateShaderSource = function(){
	
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
	}else{
		this.blending = THREE.AdditiveBlending;
		this.transparent = true;
		this.depthTest = false;
		this.depthWrite = true;
	}
		
	if(this.weighted){	
		this.blending = THREE.AdditiveBlending;
		this.transparent = true;
		this.depthTest = true;
		this.depthWrite = false;	
	}
		
	this.needsUpdate = true;
};

Potree.PointCloudMaterial.prototype.getDefines = function(){

	var defines = "";
	
	if(this.pointSizeType === Potree.PointSizeType.FIXED){
		defines += "#define fixed_point_size\n";
	}else if(this.pointSizeType === Potree.PointSizeType.ATTENUATED){
		defines += "#define attenuated_point_size\n";
	}else if(this.pointSizeType === Potree.PointSizeType.ADAPTIVE){
		defines += "#define adaptive_point_size\n";
	}
	
	if(this.pointShape === Potree.PointShape.SQUARE){
		defines += "#define square_point_shape\n";
	}else if(this.pointShape === Potree.PointShape.CIRCLE){
		defines += "#define circle_point_shape\n";
	}
	
	if(this._interpolate){
		defines += "#define use_interpolation\n";
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
};

Potree.PointCloudMaterial.prototype.setClipBoxes = function(clipBoxes){
	if(!clipBoxes){
		return;
	}

	this.clipBoxes = clipBoxes;
	var doUpdate = (this.numClipBoxes != clipBoxes.length) && (clipBoxes.length === 0 || this.numClipBoxes === 0);

	this.numClipBoxes = clipBoxes.length;
	this.uniforms.clipBoxCount.value = this.numClipBoxes;
	
	if(doUpdate){
		this.updateShaderSource();
	}
	
	this.uniforms.clipBoxes.value = new Float32Array(this.numClipBoxes * 16);
	this.uniforms.clipBoxPositions.value = new Float32Array(this.numClipBoxes * 3);
	
	for(var i = 0; i < this.numClipBoxes; i++){
		var box = clipBoxes[i];
		
		this.uniforms.clipBoxes.value.set(box.inverse.elements, 16*i);

		this.uniforms.clipBoxPositions.value[3*i+0] = box.position.x;
		this.uniforms.clipBoxPositions.value[3*i+1] = box.position.y;
		this.uniforms.clipBoxPositions.value[3*i+2] = box.position.z;
	}
};


Object.defineProperty(Potree.PointCloudMaterial.prototype, "gradient", {
	get: function(){
		return this._gradient;
	},
	set: function(value){
		if(this._gradient !== value){
			this._gradient = value;
			this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
			this.uniforms.gradient.value = this.gradientTexture;
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "classification", {
	get: function(){
		return this._classification;
	},
	set: function(value){
		//if(this._classification !== value){
			this._classification = value;
			this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
			this.uniforms.classificationLUT.value = this.classificationTexture;
		//}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "spacing", {
	get: function(){
		return this.uniforms.spacing.value;
	},
	set: function(value){
		if(this.uniforms.spacing.value !== value){
			this.uniforms.spacing.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "useClipBox", {
	get: function(){
		return this._useClipBox;
	},
	set: function(value){
		if(this._useClipBox !== value){
			this._useClipBox = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "weighted", {
	get: function(){
		return this._weighted;
	},
	set: function(value){
		if(this._weighted !== value){
			this._weighted = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "fov", {
	get: function(){
		return this.uniforms.fov.value;
	},
	set: function(value){
		if(this.uniforms.fov.value !== value){
			this.uniforms.fov.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "screenWidth", {
	get: function(){
		return this.uniforms.screenWidth.value;
	},
	set: function(value){
		if(this.uniforms.screenWidth.value !== value){
			this.uniforms.screenWidth.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "screenHeight", {
	get: function(){
		return this.uniforms.screenHeight.value;
	},
	set: function(value){
		if(this.uniforms.screenHeight.value !== value){
			this.uniforms.screenHeight.value = value;
			//this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "near", {
	get: function(){
		return this.uniforms.near.value;
	},
	set: function(value){
		if(this.uniforms.near.value !== value){
			this.uniforms.near.value = value;
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "far", {
	get: function(){
		return this.uniforms.far.value;
	},
	set: function(value){
		if(this.uniforms.far.value !== value){
			this.uniforms.far.value = value;
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "opacity", {
	get: function(){
		return this.uniforms.opacity.value;
	},
	set: function(value){
		if(this.uniforms.opacity){
			if(this.uniforms.opacity.value !== value){
				this.uniforms.opacity.value = value;
				this.updateShaderSource();
			}
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointColorType", {
	get: function(){
		return this._pointColorType;
	},
	set: function(value){
		if(this._pointColorType !== value){
			this._pointColorType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "depthMap", {
	get: function(){
		return this._depthMap;
	},
	set: function(value){
		if(this._depthMap !== value){
			this._depthMap = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointSizeType", {
	get: function(){
		return this._pointSizeType;
	},
	set: function(value){
		if(this._pointSizeType !== value){
			this._pointSizeType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "clipMode", {
	get: function(){
		return this._clipMode;
	},
	set: function(value){
		if(this._clipMode !== value){
			this._clipMode = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "interpolate", {
	get: function(){
		return this._interpolate;
	},
	set: function(value){
		if(this._interpolate !== value){
			this._interpolate = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "useEDL", {
	get: function(){
		return this._useEDL;
	},
	set: function(value){
		if(this._useEDL !== value){
			this._useEDL = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "color", {
	get: function(){
		return this.uniforms.uColor.value;
	},
	set: function(value){
		if(this.uniforms.uColor.value !== value){
			this.uniforms.uColor.value.copy(value);
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "pointShape", {
	get: function(){
		return this._pointShape;
	},
	set: function(value){
		if(this._pointShape !== value){
			this._pointShape = value;
			this.updateShaderSource();
		}
	}
});


Object.defineProperty(Potree.PointCloudMaterial.prototype, "treeType", {
	get: function(){
		return this._treeType;
	},
	set: function(value){
		if(this._treeType != value){
			this._treeType = value;
			this.updateShaderSource();
		}
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "bbSize", {
	get: function(){
		return this.uniforms.bbSize.value;
	},
	set: function(value){
		this.uniforms.bbSize.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "size", {
	get: function(){
		return this.uniforms.size.value;
	},
	set: function(value){
		this.uniforms.size.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "heightMin", {
	get: function(){
		return this.uniforms.heightMin.value;
	},
	set: function(value){
		this.uniforms.heightMin.value = value;
	}
});

Object.defineProperty(Potree.PointCloudMaterial.prototype, "heightMax", {
	get: function(){
		return this.uniforms.heightMax.value;
	},
	set: function(value){
		this.uniforms.heightMax.value = value;
	}
});

/**
 * Generates a look-up texture for gradient values (height, intensity, ...)
 *
 */
Potree.PointCloudMaterial.generateGradientTexture = function(gradient) {
	var size = 64;

	// create canvas
	canvas = document.createElement( 'canvas' );
	canvas.width = size;
	canvas.height = size;

	// get context
	var context = canvas.getContext( '2d' );

	// draw gradient
	context.rect( 0, 0, size, size );
	var ctxGradient = context.createLinearGradient( 0, 0, size, size );
	
	for(var i = 0;i < gradient.length; i++){
		var step = gradient[i];
		
		ctxGradient.addColorStop(step[0], "#" + step[1].getHexString());
	} 
    
	context.fillStyle = ctxGradient;
	context.fill();
	
	var texture = new THREE.Texture( canvas );
	texture.needsUpdate = true;
	textureImage = texture.image;

	return texture;
};

/**
 * Generates a look up texture for classification colors
 *
 */
Potree.PointCloudMaterial.generateClassificationTexture  = function(classification){
	var width = 256;
	var height = 256;
	var size = width*height;
	
	var data = new Uint8Array(4*size);
	
	for(var x = 0; x < width; x++){
		for(var y = 0; y < height; y++){
			var u = 2 * (x / width) - 1;
			var v = 2 * (y / height) - 1;
			
			var i = x + width*y;
			
			var color;
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
	
	var texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
	texture.magFilter = THREE.NearestFilter;
	texture.needsUpdate = true;
	
	return texture;
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
	
	var lightDir = new THREE.Vector3(0.0, 0.0, 1.0).normalize();
	
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
	if(this.pointColorType === Potree.PointColorType.INTENSITY
		|| this.pointColorType === Potree.PointColorType.INTENSITY_GRADIENT){
		attributes.intensity = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.CLASSIFICATION){
		//attributes.classification = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.RETURN_NUMBER){
		attributes.returnNumber = { type: "f", value: [] };
		attributes.numberOfReturns = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.SOURCE){
		attributes.pointSourceID = { type: "f", value: [] };
	}else if(this.pointColorType === Potree.PointColorType.NORMAL || this.pointColorType === Potree.PointColorType.PHONG){
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
}

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
		
		e.preventDefault();
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
			}else if(e.drag.mouse === Potree.MOUSE.RIGHT){
				this.panDelta.x += ndrag.x;
				this.panDelta.y += ndrag.y;
			}
		};
		
		let drop = e => {
			this.dispatchEvent({type: "end"});
		};
		
		let scroll = (e) => {
			let resolvedRadius = this.scene.view.radius + this.radiusDelta;
			
			this.radiusDelta += -e.delta * resolvedRadius * 0.1;
			
			//this.radiusDelta -= e.delta;
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
				
				//let newRadius = prevDist * (resolvedRadius / currDist);
				//this.radiusDelta = newRadius - resolvedRadius;
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
	
	update(delta){
		
		let view = this.scene.view;
		
		{ // cancel move animations on user input
			let changes = [ this.yawDelta, this.pitchDelta, this.radiusDelta, this.panDelta.length() ];
			let changeHappens = changes.some( e => Math.abs(e) > 0.001);
			if(changeHappens && this.tweens.length > 0){
				this.tweens.forEach( e => e.stop() );
				this.tweens = [];
			}
		}
		
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
Potree.Annotation = function(scene, args = {}){
	var scope = this;
	
	Potree.Annotation.counter++;
	
	this.scene = scene;
	this.ordinal = args.title || Potree.Annotation.counter;
	this.title = args.title || "No Title";
	this.description = args.description || "";
	this.position = args.position || new THREE.Vector3(0,0,0);
	this.cameraPosition = (args.cameraPosition instanceof Array) ? 
		new THREE.Vector3().fromArray(args.cameraPosition) : args.cameraPosition;
	this.cameraTarget = (args.cameraTarget instanceof Array) ? 
		new THREE.Vector3().fromArray(args.cameraTarget) : args.cameraTarget;
	this.view = args.view || null;
	this.keepOpen = false;
	this.descriptionVisible = false;
	this.showDescription = true;
	this.actions = args.actions || [];
	this.appearance = args.appearance || null;
	this.isHighlighted = false;
	
	this.domElement = document.createElement("div");
	this.domElement.style.position = "absolute";
	this.domElement.style.opacity = "0.5";
	this.domElement.style.padding = "10px";
	//this.domElement.style.whiteSpace = "nowrap";
	this.domElement.className = "annotation";
	
	if(this.appearance !== null){
		this.elOrdinal = document.createElement("div");
		this.elOrdinal.style.position = "relative";
		this.elOrdinal.style.zIndex = "100";
		this.elOrdinal.style.width = "fit-content";
		
		this.elOrdinal.innerHTML = this.appearance;
		this.domElement.appendChild(this.elOrdinal);
	}else{
		this.elOrdinal = document.createElement("div");
		this.elOrdinal.style.position = "relative";
		this.elOrdinal.style.color = "white";
		this.elOrdinal.style.backgroundColor = "black";
		this.elOrdinal.style.borderRadius = "1.5em";
		this.elOrdinal.style.fontSize = "1em";
		this.elOrdinal.style.opacity = "1";
		this.elOrdinal.style.margin = "auto";
		this.elOrdinal.style.zIndex = "100";
		this.elOrdinal.style.width = "fit-content";
		this.domElement.appendChild(this.elOrdinal);
		
		this.elOrdinalText = document.createElement("span");
		this.elOrdinalText.style.display = "inline-block";
		this.elOrdinalText.style.verticalAlign = "middle";
		this.elOrdinalText.style.lineHeight = "1.5em";
		this.elOrdinalText.style.textAlign = "center";
		this.elOrdinalText.style.fontFamily = "Arial";
		this.elOrdinalText.style.fontWeight = "bold";
		this.elOrdinalText.style.padding = "1px 8px 0px 8px";
		this.elOrdinalText.style.cursor = "default";
		this.elOrdinalText.innerHTML = this.ordinal;
		this.elOrdinalText.style.userSelect = "none";
		this.elOrdinal.appendChild(this.elOrdinalText);
		
		this.elOrdinal.onmouseenter = function(){};
		this.elOrdinal.onmouseleave = function(){};
		this.elOrdinalText.onclick = () => {
			if(this.hasView()){
				this.moveHere(this.scene.camera);
			}
			this.dispatchEvent({type: "click", target: this});
		};
	}
	
	this.domDescription = document.createElement("div");
	this.domDescription.style.position = "relative";
	this.domDescription.style.color = "white";
	this.domDescription.style.backgroundColor = "black";
	this.domDescription.style.padding = "10px";
	this.domDescription.style.margin = "5px 0px 0px 0px";
	this.domDescription.style.borderRadius = "4px";
	this.domDescription.style.display = "none";
	this.domDescription.style.maxWidth = "500px";
	//this.domDescription.className = "annotation";
	this.domElement.appendChild(this.domDescription);
	
	if(this.actions.length > 0){
		this.elOrdinalText.style.padding = "1px 3px 0px 8px";
		
		for(let action of this.actions){
			let elButton = document.createElement("img");
		
			elButton.src = action.icon;
			elButton.style.width = "24px";
			elButton.style.height = "24px";
			elButton.style.filter = "invert(1)";
			elButton.style.display = "inline-block";
			elButton.style.verticalAlign = "middle";
			elButton.style.lineHeight = "1.5em";
			elButton.style.textAlign = "center";
			elButton.style.fontFamily = "Arial";
			elButton.style.fontWeight = "bold";
			elButton.style.padding = "1px 8px 0px 1px";
			elButton.style.cursor = "default";	
			
			this.elOrdinal.appendChild(elButton);
			
			elButton.onclick = function(){
				action.onclick();
			};
		}
	}
	
	{
		let icon = Potree.resourcePath + "/icons/close.svg";
		let close = $(`<span><img src="${icon}" width="16px"></span>`);
		close.css("filter", "invert(100%)");
		close.css("float", "right");
		close.css("opacity", "0.5");
		close.css("margin", "0px 0px 8px 8px");
		close.hover(e => {
			close.css("opacity", "1");
		},e => {
			close.css("opacity", "0.5");
		});
		close.click(e => {
			this.setHighlighted(false);
		});
		$(this.domDescription).append(close);
		
		this.elDescriptionText = document.createElement("span");
		this.elDescriptionText.style.color = "#ffffff";
		this.elDescriptionText.innerHTML = this.description;
		this.domDescription.appendChild(this.elDescriptionText);
	
	}
	
	this.domElement.onmouseenter = () => {
		this.setHighlighted(true);
	};
	
	$(this.domElement).on("touchstart", e => {
		this.setHighlighted(!this.isHighlighted);
	});
	
	this.domElement.onmouseleave = () => {
		this.setHighlighted(false);
	};
	
	//$(this.domElement).click(e => {
	//	this.showDescription = !this.showDescription;
	//	
	//	if(this.showDescription){
	//		$(this.domElement).append($(this.domDescription));
	//	}else{
	//		$(this.domDescription).remove(); 
	//	}
	//});
	
	this.setHighlighted = function(highlighted){
		if(highlighted){
			this.domElement.style.opacity = "0.8";
			this.elOrdinal.style.boxShadow = "0 0 5px #fff";
			this.domElement.style.zIndex = "1000";
			
			if(this.description){
				this.descriptionVisible = true;	
				this.domDescription.style.display = "block";
				this.domDescription.style.position = "relative";
			}
			
		}else{
			this.domElement.style.opacity = "0.5";
			this.elOrdinal.style.boxShadow = "";
			this.domElement.style.zIndex = "100";
			this.descriptionVisible = false;	
			this.domDescription.style.display = "none";
		}
		
		this.isHighlighted = highlighted;
	};
	
	this.hasView = function(){
		let hasView = this.cameraTarget instanceof THREE.Vector3;
		hasView = hasView && this.cameraPosition instanceof THREE.Vector3;
				
		return hasView;
	};
	
	this.moveHere = function(camera){		
		if(!this.hasView()){
			return;
		}
	
		var animationDuration = 800;
		var easing = TWEEN.Easing.Quartic.Out;

		{ // animate camera position
			let tween = new TWEEN.Tween(scope.scene.view.position).to(scope.cameraPosition, animationDuration);
			tween.easing(easing);
			//tween.onUpdate(function(){
			//	console.log(scope.scene.view.position);
			//});
			tween.start();
		}
		
		{ // animate camera target
			var camTargetDistance = camera.position.distanceTo(scope.cameraTarget);
			var target = new THREE.Vector3().addVectors(
				camera.position, 
				camera.getWorldDirection().clone().multiplyScalar(camTargetDistance)
			);
			var tween = new TWEEN.Tween(target).to(scope.cameraTarget, animationDuration);
			tween.easing(easing);
			tween.onUpdate(function(){
				//camera.lookAt(target);
				scope.scene.view.lookAt(target);
			});
			tween.onComplete(function(){
				//camera.lookAt(target);
				scope.scene.view.lookAt(target);
				scope.dispatchEvent({type: "focusing_finished", target: scope});
			});
		}

		scope.dispatchEvent({type: "focusing_started", target: scope});
		tween.start();
	};
	
	this.dispose = function(){

		
		if(this.domElement.parentElement){
			this.domElement.parentElement.removeChild(this.domElement);
		}

	};
};

Potree.Annotation.prototype = Object.create( THREE.EventDispatcher.prototype );

Potree.Annotation.counter = 0;

Potree.ProfileData = function(profile){
	this.profile = profile;
	
	this.segments = [];
	this.boundingBox = new THREE.Box3();
	this.projectedBoundingBox = new THREE.Box2();
	
	var mileage = new THREE.Vector3();
	for(var i = 0; i < profile.points.length - 1; i++){
		var start = profile.points[i];
		var end = profile.points[i+1];
		
		var startGround = new THREE.Vector3(start.x, start.y, 0);
		var endGround = new THREE.Vector3(end.x, end.y, 0);
		
		var center = new THREE.Vector3().addVectors(endGround, startGround).multiplyScalar(0.5);
		var length = startGround.distanceTo(endGround);
		var side = new THREE.Vector3().subVectors(endGround, startGround).normalize();
		var up = new THREE.Vector3(0, 0, 1);
		var forward = new THREE.Vector3().crossVectors(side, up).normalize();
		var N = forward;
		var cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, startGround);
		var halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);
		
		var project = function(_start, _end, _mileage){
			var start = _start;
			var end = _end;
			var mileage = _mileage;
			
			var xAxis = new THREE.Vector3(1,0,0);
			var dir = new THREE.Vector3().subVectors(end, start);
			dir.z = 0;
			dir.normalize();
			var alpha = Math.acos(xAxis.dot(dir));
			if(dir.y > 0){
				alpha = -alpha;
			}
			
			
			return function(position){
				var toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -start.y, 0);
				var alignWithX = new THREE.Matrix4().makeRotationZ(-alpha);
				var applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

				var pos = position.clone();
				pos.applyMatrix4(toOrigin);
				pos.applyMatrix4(alignWithX);
				pos.applyMatrix4(applyMileage);
				
				return pos;
			};
			
		}(start, end, mileage.clone());
		
		var segment = {
			start: start,
			end: end,
			cutPlane: cutPlane,
			halfPlane: halfPlane,
			length: length,
			points: null,
			project: project
		};
		
		this.segments.push(segment);
		
		mileage.x += length;
		mileage.z += end.z - start.z;
	}
	
	this.projectedBoundingBox.min.x = 0;
	this.projectedBoundingBox.min.z = Number.POSITIVE_INFINITY;
	this.projectedBoundingBox.max.x = mileage.x;
	this.projectedBoundingBox.max.z = Number.NEGATIVE_INFINITY;
	
	this.size = function(){
		var size = 0;
		for(var i = 0; i < this.segments.length; i++){
			if(this.segments[i].points){
				size += this.segments[i].points.numPoints;
			}
		}
		return size;
	}
	
};

Potree.ProfileRequest = function(pointcloud, profile, maxDepth, callback){

	this.pointcloud = pointcloud;
	this.profile = profile;
	this.maxDepth = maxDepth || Number.MAX_VALUE;
	this.callback = callback;
	this.temporaryResult = new Potree.ProfileData(this.profile);
	this.pointsServed = 0;

	this.priorityQueue = new BinaryHeap(function(x){return 1 / x.weight;});
	
	this.initialize = function(){
		this.priorityQueue.push({node: pointcloud.pcoGeometry.root, weight: 1});
		this.traverse(pointcloud.pcoGeometry.root);
	};
	
	// traverse the node and add intersecting descendants to queue
	this.traverse = function(node){
		
		var stack = [];
		for(var i = 0; i < 8; i++){
			var child = node.children[i];
			if(child && pointcloud.nodeIntersectsProfile(child, this.profile)){
				stack.push(child);
			}
		}
		
		while(stack.length > 0){
			var node = stack.pop();
			var weight = node.boundingSphere.radius;
			
			this.priorityQueue.push({node: node, weight: weight});
		
			// add children that intersect the cutting plane
			if(node.level < this.maxDepth){
				for(var i = 0; i < 8; i++){
					var child = node.children[i];
					if(child && pointcloud.nodeIntersectsProfile(child, this.profile)){
						stack.push(child);
					}
				}
			}
		}
	};
	
	this.update = function(){
		
		// load nodes in queue
		// if hierarchy expands, also load nodes from expanded hierarchy
		// once loaded, add data to this.points and remove node from queue
		// only evaluate 1-50 nodes per frame to maintain responsiveness
		
		var intersectedNodes = [];
		
		for(var i = 0; i < Math.min(2, this.priorityQueue.size()); i++){
			var element = this.priorityQueue.pop();
			var node = element.node;
			
			
			if(node.loaded){
				// add points to result
				intersectedNodes.push(node);
				Potree.getLRU().touch(node);
				
				if((node.level % node.pcoGeometry.hierarchyStepSize) === 0 && node.hasChildren){
					this.traverse(node);
				}
			}else{
				console.log("loading " + node.name);
				node.load();
				this.priorityQueue.push(element);
			}
		}
		
		if(intersectedNodes.length > 0){
			this.getPointsInsideProfile(intersectedNodes, this.temporaryResult);
			if(this.temporaryResult.size() > 100){
				this.pointsServed += this.temporaryResult.size();
				callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}
		}
		
		if(this.priorityQueue.size() === 0){
			// we're done! inform callback and remove from pending requests

			if(this.temporaryResult.size() > 0){
				this.pointsServed += this.temporaryResult.size();
				callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}
			
			callback.onFinish({request: this});
			
			var index = pointcloud.profileRequests.indexOf(this);
			if(index >= 0){
				pointcloud.profileRequests.splice(index, 1);
			}
		}
	};
	
	this.getPointsInsideProfile = function(nodes, target){
	
		for(var pi = 0; pi < target.segments.length; pi++){
			var segment = target.segments[pi];
			
			for(var ni = 0; ni < nodes.length; ni++){
				var node = nodes[ni];
				
				var geometry = node.geometry;
				var positions = geometry.attributes.position;
				var p = positions.array;
				var numPoints = node.numPoints;
				
				if(!segment.points){
					segment.points = {};
					segment.points.boundingBox = new THREE.Box3();
					
					for (var property in geometry.attributes) {
						if (geometry.attributes.hasOwnProperty(property)) {
							if(property === "indices"){
							
							}else{
								segment.points[property] = [];
							}
						}
					}
				}
				
				for(var i = 0; i < numPoints; i++){
					var pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
					pos.applyMatrix4(pointcloud.matrixWorld);
					var distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
					var centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));
					
					if(distance < profile.width / 2 && centerDistance < segment.length / 2){
						segment.points.boundingBox.expandByPoint(pos);
						
						for (var property in geometry.attributes) {
							if (geometry.attributes.hasOwnProperty(property)) {
							
								if(property === "position"){
									segment.points[property].push(pos);
								}else if(property === "indices"){
									// skip indices
								}else{
									var values = geometry.attributes[property];
									if(values.itemSize === 1){
										segment.points[property].push(values.array[i]);
									}else{
										var value = [];
										for(var j = 0; j < values.itemSize; j++){
											value.push(values.array[i*values.itemSize + j]);
										}
										segment.points[property].push(value);
									}
								}
								
							}
						}
					}else{
						var a;
					}
				}
			}
		
			segment.points.numPoints = segment.points.position.length;
			
			if(segment.points.numPoints > 0){
				target.boundingBox.expandByPoint(segment.points.boundingBox.min);
				target.boundingBox.expandByPoint(segment.points.boundingBox.max);
				
				target.projectedBoundingBox.expandByPoint(new THREE.Vector2(0, target.boundingBox.min.y));
				target.projectedBoundingBox.expandByPoint(new THREE.Vector2(0, target.boundingBox.max.y));
			}
		}
	};
	
	this.cancel = function(){
		callback.onCancel();
		
		this.priorityQueue = new BinaryHeap(function(x){return 1 / x.weight;});
		
		var index = pointcloud.profileRequests.indexOf(this);
		if(index >= 0){
			pointcloud.profileRequests.splice(index, 1);
		}
	};
	
	this.initialize();
	
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
		var children = [];
		
		for(var i = 0; i < 8; i++){
			if(this.children[i]){
				children.push(this.children[i]);
			}
		}
		
		return children;
	};
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
		this.pickTarget = null;
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
		var node = new Potree.PointCloudOctreeNode();
		var sceneNode = new THREE.Points(geometryNode.geometry, this.material);
		
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.pointcloud = this;
		node.children = {};
		for(var key in geometryNode.children){
			node.children[key] = geometryNode.children[key];
		}
		
		if(!parent){
			this.root = node;
			this.add(sceneNode);
		}else{
			var childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.add(sceneNode);
			parent.children[childIndex] = node;
		}
		
		var disposeListener = function(){
			var childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.remove(node.sceneNode);
			parent.children[childIndex] = geometryNode;
		}
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);
		
		return node;
	}
	
	updateVisibleBounds(){
		var leafNodes = [];
		for(var i = 0; i < this.visibleNodes.length; i++){
			var node = this.visibleNodes[i];
			var isLeaf = true;
			
			for(var j = 0; j < node.children.length; j++){
				var child = node.children[j];
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
		for(var i = 0; i < leafNodes.length; i++){
			var node = leafNodes[i];
			
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
		
		var texture = material.visibleNodesTexture;
		var data = texture.image.data;
		
		// copy array
		visibleNodes = visibleNodes.slice();
		
		// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
		var sort = function(a, b){
			var na = a.geometryNode.name;
			var nb = b.geometryNode.name;
			if(na.length != nb.length) return na.length - nb.length;
			if(na < nb) return -1;
			if(na > nb) return 1;
			return 0;
		};
		visibleNodes.sort(sort);

		
		for(var i = 0; i < visibleNodes.length; i++){
			var node = visibleNodes[i];
			
			var children = [];
			for(var j = 0; j < 8; j++){
				var child = node.children[j];
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
			for(var j = 0; j < children.length; j++){
				var child = children[j];
				var index = parseInt(child.geometryNode.name.substr(-1));
				data[i*3 + 0] += Math.pow(2, index);
				
				if(j === 0){
					var vArrayIndex = visibleNodes.indexOf(child);
					data[i*3 + 1] = vArrayIndex - i;
				}
				
			}
		}
		
		
		texture.needsUpdate = true;
	}
	
	nodeIntersectsProfile(node, profile){
		var bbWorld = node.boundingBox.clone().applyMatrix4(this.matrixWorld);
		var bsWorld = bbWorld.getBoundingSphere();
		
		for(var i = 0; i < profile.points.length - 1; i++){
			var start = new THREE.Vector3(profile.points[i].x, bsWorld.center.y, profile.points[i].z);
			var end = new THREE.Vector3(profile.points[i+1].x, bsWorld.center.y, profile.points[i+1].z);
			
			var ray1 = new THREE.Ray(start, new THREE.Vector3().subVectors(end, start).normalize());
			var ray2 = new THREE.Ray(end, new THREE.Vector3().subVectors(start, end).normalize());
			
			if(ray1.intersectsSphere(bsWorld) && ray2.intersectsSphere(bsWorld)){
				return true;
			}
		}
		
		return false;
	}
	
	nodesOnRay(nodes, ray){
		var nodesOnRay = [];

		var _ray = ray.clone();
		for(var i = 0; i < nodes.length; i++){
			var node = nodes[i];
			//var inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
			var sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
			
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
			
			for(var i = 0; i < object.children.length; i++){
				var child = object.children[i];
				if(child.visible){
					stack.push(child);
				}
			}
		}
	}
	
	moveToOrigin(){
		this.position.set(0,0,0);
		this.updateMatrixWorld(true);
		var box = this.boundingBox;
		var transform = this.matrixWorld;
		var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.set(0,0,0).sub(tBox.getCenter());
	};

	moveToGroundPlane(){
		this.updateMatrixWorld(true);
		var box = this.boundingBox;
		var transform = this.matrixWorld;
		var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.y += -tBox.min.y;
	};

	getBoundingBoxWorld(){
		this.updateMatrixWorld(true);
		var box = this.boundingBox;
		var transform = this.matrixWorld;
		var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		
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
			var request = new Potree.ProfileRequest(this, profile, maxDepth, callback);
			this.profileRequests.push(request);
			
			return request;
		}

		var points = {
			segments: [],
			boundingBox: new THREE.Box3(),
			projectedBoundingBox: new THREE.Box2()
		};
		
		// evaluate segments
		for(var i = 0; i < profile.points.length - 1; i++){
			var start = profile.points[i];
			var end = profile.points[i+1];
			var ps = this.getProfile(start, end, profile.width, maxDepth);
			
			var segment = {
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
		var mileage = new THREE.Vector3();
		for(var i = 0; i < points.segments.length; i++){
			var segment = points.segments[i];
			var start = segment.start;
			var end = segment.end;
			
			var project = function(_start, _end, _mileage, _boundingBox){
				var start = _start;
				var end = _end;
				var mileage = _mileage;
				var boundingBox = _boundingBox;
				
				var xAxis = new THREE.Vector3(1,0,0);
				var dir = new THREE.Vector3().subVectors(end, start);
				dir.y = 0;
				dir.normalize();
				var alpha = Math.acos(xAxis.dot(dir));
				if(dir.z > 0){
					alpha = -alpha;
				}
				
				
				return function(position){
							
					var toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -boundingBox.min.y, -start.z);
					var alignWithX = new THREE.Matrix4().makeRotationY(-alpha);
					var applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

					var pos = position.clone();
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
			var request = new Potree.ProfileRequest(start, end, width, depth, callback);
			this.profileRequests.push(request);
		}else{
			var stack = [];
			stack.push(this);
			
			var center = new THREE.Vector3().addVectors(end, start).multiplyScalar(0.5);
			var length = new THREE.Vector3().subVectors(end, start).length();
			var side = new THREE.Vector3().subVectors(end, start).normalize();
			var up = new THREE.Vector3(0, 1, 0);
			var forward = new THREE.Vector3().crossVectors(side, up).normalize();
			var N = forward;
			var cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, start);
			var halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);
			
			var inside = null;
			
			var boundingBox = new THREE.Box3();
			
			
			while(stack.length > 0){
				var object = stack.shift();
				
				
				var pointsFound = 0;
				
				if(object instanceof THREE.Points){
					var geometry = object.geometry;
					var positions = geometry.attributes.position;
					var p = positions.array;
					var numPoints = object.numPoints;
					
					if(!inside){
						inside = {};
						
						for (var property in geometry.attributes) {
							if (geometry.attributes.hasOwnProperty(property)) {
								if(property === "indices"){
								
								}else{
									inside[property] = [];
								}
							}
						}
					}
					
					for(var i = 0; i < numPoints; i++){
						var pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
						pos.applyMatrix4(this.matrixWorld);
						var distance = Math.abs(cutPlane.distanceToPoint(pos));
						var centerDistance = Math.abs(halfPlane.distanceToPoint(pos));
						
						if(distance < width / 2 && centerDistance < length / 2){
							boundingBox.expandByPoint(pos);
							
							for (var property in geometry.attributes) {
								if (geometry.attributes.hasOwnProperty(property)) {
								
									if(property === "position"){
										inside[property].push(pos);
									}else if(property === "indices"){
										// skip indices
									}else{
										var values = geometry.attributes[property];
										if(values.itemSize === 1){
											inside[property].push(values.array[i + j]);
										}else{
											var value = [];
											for(var j = 0; j < values.itemSize; j++){
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
					for(var i = 0; i < object.children.length; i++){
						var child = object.children[i];
						if(child instanceof THREE.Points){
							var sphere = child.boundingSphere.clone().applyMatrix4(child.matrixWorld);
							if(cutPlane.distanceToSphere(sphere) < sphere.radius){
								stack.push(child);	
							}			
						}
					}
				}
			}
			
			inside.numPoints = inside.position.length;
			
			var project = function(_start, _end){
				var start = _start;
				var end = _end;
				
				var xAxis = new THREE.Vector3(1,0,0);
				var dir = new THREE.Vector3().subVectors(end, start);
				dir.y = 0;
				dir.normalize();
				var alpha = Math.acos(xAxis.dot(dir));
				if(dir.z > 0){
					alpha = -alpha;
				}
				
				
				return function(position){
							
					var toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -start.y, -start.z);
					var alignWithX = new THREE.Matrix4().makeRotationY(-alpha);

					var pos = position.clone();
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
		// this function finds intersections by rendering point indices and then checking the point index at the mouse location.
		// point indices are 3 byte and rendered to the RGB component.
		// point cloud node indices are 1 byte and stored in the ALPHA component.
		// this limits picking capabilities to 256 nodes and 2^24 points per node. 
		
		let gl = renderer.context;
		
		let compileMaterial = function(material){
			if(material._glstate === undefined){
				material._glstate = {};
			}
			
			let glstate = material._glstate;
			
			// VERTEX SHADER
			let vs = gl.createShader(gl.VERTEX_SHADER);
			{
				gl.shaderSource(vs, material.vertexShader);
				gl.compileShader(vs);
				
				let success = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
				if (!success) {
					console.error("could not compile vertex shader:");
					
					let log = gl.getShaderInfoLog(vs);
					console.error(log, material.vertexShader);
					
					return;
				}
			}
			
			// FRAGMENT SHADER
			let fs = gl.createShader(gl.FRAGMENT_SHADER);
			{
				gl.shaderSource(fs, material.fragmentShader);
				gl.compileShader(fs);
				
				let success = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
				if (!success) {
					console.error("could not compile fragment shader:");
					console.error(material.fragmentShader);
					
					return;
				}
			}
			
			// PROGRAM
			var program = gl.createProgram();
			gl.attachShader(program, vs);
			gl.attachShader(program, fs);
			gl.linkProgram(program);
			var success = gl.getProgramParameter(program, gl.LINK_STATUS);
			if (!success) {
				console.error("could not compile shader:");
				console.error(material.vertexShader);
				console.error(material.fragmentShader);
					
				return;
			}
			
			glstate.program = program;
			
			gl.useProgram( program );
			
			{ // UNIFORMS
				let uniforms = {};
				let n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

				for(let i = 0; i < n; i++){
					var uniform = gl.getActiveUniform(program, i);
					var name = uniform.name;
					var loc = gl.getUniformLocation(program, name);

					uniforms[name] = loc;
				}
				
				glstate.uniforms = uniforms;
				glstate.textures = {};
			}
		};
		
		if(Potree.PointCloudOctree.pickMaterial === undefined){
			Potree.PointCloudOctree.pickMaterial = new Potree.PointCloudMaterial();
			Potree.PointCloudOctree.pickMaterial.pointColorType = Potree.PointColorType.POINT_INDEX;		
			//Potree.PointCloudOctree.pickMaterial.pointColorType = Potree.PointColorType.COLOR;
			
			compileMaterial(Potree.PointCloudOctree.pickMaterial);
		}
		
		let pickMaterial = Potree.PointCloudOctree.pickMaterial;
		
		let pickWindowSize = params.pickWindowSize || 17;
		let pickOutsideClipRegion = params.pickOutsideClipRegion || false;
		
		let nodes = this.nodesOnRay(this.visibleNodes, ray);
		
		if(nodes.length === 0){
			return null;
		}
		
		
		
		{ // update pick material
			let doRecompile = false;
		
			if(pickMaterial.pointSizeType !== this.material.pointSizeType){
				pickMaterial.pointSizeType = this.material.pointSizeType;
				doRecompile = true;
			}
			
			if(pickMaterial.pointShape !== this.material.pointShape){
				pickMaterial.pointShape = this.material.pointShape;
				doRecompile = true;
			}
			
			if(pickMaterial.interpolate !== this.material.interpolate){
				pickMaterial.interpolate = this.material.interpolate;
				doRecompile = true;
			}
			
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
			
			if(doRecompile){
				
				compileMaterial(pickMaterial);
				
			};
		}
		
		var width = Math.ceil(renderer.domElement.clientWidth);
		var height = Math.ceil(renderer.domElement.clientHeight);
		
		var pixelPos = new THREE.Vector3().addVectors(camera.position, ray.direction).project(camera);
		pixelPos.addScalar(1).multiplyScalar(0.5);
		pixelPos.x *= width;
		pixelPos.y *= height;
		
		if(!this.pickTarget){
			this.pickTarget = new THREE.WebGLRenderTarget( 
				1, 1, 
				{ minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat } 
			);
		}else if(this.pickTarget.width != width || this.pickTarget.height != height){
			this.pickTarget.dispose();
			this.pickTarget = new THREE.WebGLRenderTarget( 
				1, 1, 
				{ minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat } 
			);
		}
		this.pickTarget.setSize(width, height);

		
		
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(pixelPos.x - (pickWindowSize - 1) / 2, pixelPos.y - (pickWindowSize - 1) / 2,pickWindowSize,pickWindowSize);
		gl.disable(gl.SCISSOR_TEST);
		
		renderer.setRenderTarget( this.pickTarget );
		
		renderer.state.setDepthTest( pickMaterial.depthTest );
		renderer.state.setDepthWrite( pickMaterial.depthWrite );
		renderer.state.setBlending( THREE.NoBlending );
		
		renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
		
		let glstate = pickMaterial._glstate;
		let program = glstate.program;
		let uniforms = glstate.uniforms;
		gl.useProgram(program);
			
		gl.uniformMatrix4fv(uniforms["projectionMatrix"], false, new Float32Array(camera.projectionMatrix.elements));
		gl.uniformMatrix4fv(uniforms["viewMatrix"], false, new Float32Array(camera.matrixWorldInverse.elements));
		
		{
			if(glstate.textures.visibleNodes === undefined){
				let image = pickMaterial.visibleNodesTexture.image;
				let texture = gl.createTexture();
				gl.bindTexture(gl.TEXTURE_2D, texture);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
				//gl.generateMipmap(gl.TEXTURE_2D);
				gl.bindTexture(gl.TEXTURE_2D, null);
				glstate.textures.visibleNodes = {
					id: texture
				};
			}
			
			let texture = glstate.textures.visibleNodes.id;
			let image = pickMaterial.visibleNodesTexture.image;
			
			gl.uniform1i(uniforms["visibleNodes"], 0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture( gl.TEXTURE_2D, texture );
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
			
		}
		
		gl.uniform1f(uniforms["fov"], this.material.fov);
		gl.uniform1f(uniforms["screenWidth"], this.material.screenWidth);
		gl.uniform1f(uniforms["screenHeight"], this.material.screenHeight);
		gl.uniform1f(uniforms["spacing"], this.material.spacing);
		gl.uniform1f(uniforms["near"], this.material.near);
		gl.uniform1f(uniforms["far"], this.material.far);
		gl.uniform1f(uniforms["size"], this.material.size);
		gl.uniform1f(uniforms["minSize"], this.material.minSize);
		gl.uniform1f(uniforms["maxSize"], this.material.maxSize);
		gl.uniform1f(uniforms["octreeSize"], this.pcoGeometry.boundingBox.getSize().x);
		
		{
			let apPosition = gl.getAttribLocation(program, "position");
			let apNormal = gl.getAttribLocation(program, "normal");
			let apClassification = gl.getAttribLocation(program, "classification");
			let apIndices = gl.getAttribLocation(program, "indices");
			
			gl.enableVertexAttribArray( apPosition );
			gl.enableVertexAttribArray( apNormal );
			gl.enableVertexAttribArray( apClassification );		
			gl.enableVertexAttribArray( apIndices );
		}
		
		for(let i = 0; i < nodes.length; i++){
			let node = nodes[i];
			let object = node.sceneNode;
			let geometry = object.geometry;
			
			pickMaterial.pcIndex = i + 1;
			
			let modelView = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
			gl.uniformMatrix4fv(uniforms["modelMatrix"], false, new Float32Array(object.matrixWorld.elements));
			gl.uniformMatrix4fv(uniforms["modelViewMatrix"], false, new Float32Array(modelView.elements));
			
			let apPosition = gl.getAttribLocation(program, "position");
			let apNormal = gl.getAttribLocation(program, "normal");
			let apClassification = gl.getAttribLocation(program, "classification");
			let apIndices = gl.getAttribLocation(program, "indices");
			
			let positionBuffer = renderer.properties.get(geometry.attributes.position).__webglBuffer;
			
			if(positionBuffer === undefined){
				continue;
			}
			
			let oldstate = {
				enabled: []
			};
			
			// TODO hack
			for(let i = 0; i < 16; i++){
				oldstate.enabled[i] = gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
				gl.disableVertexAttribArray(i);
			}
			
			gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
			gl.vertexAttribPointer( apPosition, 3, gl.FLOAT, false, 0, 0 ); 
			gl.enableVertexAttribArray(apPosition);
			
			let indexBuffer = renderer.properties.get(geometry.attributes.indices).__webglBuffer;
			gl.bindBuffer( gl.ARRAY_BUFFER, indexBuffer );
			gl.vertexAttribPointer( apIndices, 4, gl.UNSIGNED_BYTE, true, 0, 0 ); 
			gl.enableVertexAttribArray(apIndices);
			
			gl.uniform1f(uniforms["pcIndex"], pickMaterial.pcIndex);

			let numPoints = node.getNumPoints();
			if(numPoints > 0){
				gl.drawArrays( gl.POINTS, 0, node.getNumPoints());		
			}
			
			// TODO hack
			for(let i = 0; i < 16; i++){
				gl.disableVertexAttribArray(i);
			}
			gl.enableVertexAttribArray(0);
			gl.enableVertexAttribArray(1);
		}
		
		var pixelCount = pickWindowSize * pickWindowSize;
		var buffer = new ArrayBuffer(pixelCount*4);
		var pixels = new Uint8Array(buffer);
		var ibuffer = new Uint32Array(buffer);
		renderer.context.readPixels(
			pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2, 
			pickWindowSize, pickWindowSize, 
			renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);


		//{ // open window with image
		//	var br = new ArrayBuffer(width*height*4);
		//	var bp = new Uint8Array(br);
		//	renderer.context.readPixels( 0, 0, width, height, 
		//		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, bp);
		//	
		//	var img = pixelsArrayToImage(bp, width, height);
		//	var screenshot = img.src;
		//	
		//	var w = window.open();
		//	w.document.write('<img src="'+screenshot+'"/>');
		//}
			
		// find closest hit inside pixelWindow boundaries
		var min = Number.MAX_VALUE;
		var hit = null;
		//console.log("finding closest hit");
		for(let u = 0; u < pickWindowSize; u++){
			for(var v = 0; v < pickWindowSize; v++){
				var offset = (u + v*pickWindowSize);
				var distance = Math.pow(u - (pickWindowSize-1) / 2, 2) + Math.pow(v - (pickWindowSize-1) / 2, 2);
				
				var pcIndex = pixels[4*offset + 3];
				pixels[4*offset + 3] = 0;
				var pIndex = ibuffer[offset];
				
				if((pIndex !== 0 || pcIndex !== 0) && distance < min){
					
					hit = {
						pIndex: pIndex,
						pcIndex: pcIndex - 1
					};
					min = distance;
				}
			}
		}	
		
		if(hit){
			var point = {};
			
			var pc = nodes[hit.pcIndex].sceneNode;
			var attributes = pc.geometry.attributes;
			
			for (var property in attributes) {
				if (attributes.hasOwnProperty(property)) {
					var values = pc.geometry.attributes[property];
				
					if(property === "position"){
						var positionArray = values.array;
						var x = positionArray[3*hit.pIndex+0];
						var y = positionArray[3*hit.pIndex+1];
						var z = positionArray[3*hit.pIndex+2];
						var position = new THREE.Vector3(x, y, z);
						position.applyMatrix4(this.matrixWorld);
					
						point[property] = position;
					}else if(property === "indices"){
					
					}else{
						if(values.itemSize === 1){
							point[property] = values.array[hit.pIndex];
						}else{
							var value = [];
							for(var j = 0; j < values.itemSize; j++){
								value.push(values.array[values.itemSize*hit.pIndex + j]);
							}
							point[property] = value;
						}
					}
				}
			}
			
			
			return point;
			//return null;
		}else{
			return null;
		}
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
		
		var materialArray = [];
		for (var i = 0; i < 6; i++){
			materialArray.push( new THREE.MeshBasicMaterial({
				map: THREE.ImageUtils.loadTexture( urls[i] ),
				side: THREE.BackSide,
				depthTest: false,
				depthWrite: false
				})
			);
		}
		
		var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );
		var skyMaterial = new THREE.MultiMaterial( materialArray );
		var skybox = new THREE.Mesh( skyGeometry, skyMaterial );

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
		
		let vector = new THREE.Vector3( nmouse.x, nmouse.y, 0.5 );
		vector.unproject(camera);

		let direction = vector.sub(camera.position).normalize();
		let ray = new THREE.Ray(camera.position, direction);
		
		let selectedPointcloud = null;
		let closestDistance = Infinity;
		let closestIntersection = null;
		
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
			}
		}
		
		if(selectedPointcloud){
			return {
				location: closestIntersection,
				distance: closestDistance,
				pointcloud: selectedPointcloud
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
						this.setPosition(i, I.location);
						this.dispatchEvent({
							"type": "marker_moved",
							"measurement": this,
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
			area += (p2.x + p1.x) * (p1.z - p2.z);
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
				
				let msg = Potree.utils.addCommas(position.x.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(position.y.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(position.z.toFixed(2));
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
				edgeLabel.setText(Potree.utils.addCommas(distance.toFixed(2)));
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
				
				let msg = Potree.utils.addCommas(point.position.x.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(point.position.y.toFixed(2)) 
					+ " / " + Potree.utils.addCommas(point.position.z.toFixed(2));
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
				let msg = Potree.utils.addCommas(height.toFixed(2));
				this.heightLabel.setText(msg);
			}
			
		}
		
		{ // update area label
			this.areaLabel.position.copy(centroid);
			this.areaLabel.visible = this.showArea && this.points.length >= 3;
			let msg = Potree.utils.addCommas(this.getArea().toFixed(1)) + "\u00B2";
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
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schütz / http://potree.org
 *
 */

Potree.GeoJSONExporter = class GeoJSONExporter{
	
	static toString(measurement){
		
		let geojson = {
			"type": "FeatureCollection",
			"features": []
		};
		
		let isLine = measurement.showDistances && !measurement.showArea && !measurement.showAngles;
		let isPolygon = measurement.showDistances && measurement.showArea && !measurement.showAngles;
		
		if(isLine){
			geojson.features.push({
				"type": "Feature",
				"geometry": {
				"type": "LineString",
				"coordinates": []
				},
				"properties": {
				}
			});
		}else if (isPolygon) {
			geojson.features.push({
				"type": "Feature",
				"geometry": {
					"type": "Polygon",
					"coordinates": []
				},
				"properties": {
				}
			});
		}
		
		let coords = measurement.points.map(e => e.position.toArray());
		
		if(isLine){
			geojson.features[0].geometry.coordinates = coords;
		}else if(isPolygon){
			coords.push(coords[0]);
			geojson.features[0].geometry.coordinates.push(coords);
		}
		
		measurement.edgeLabels.forEach(function (label) {
			var labelPoint = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: label.position.toArray(),
				},
				properties: {
					name: label.text
				}
			};
			geojson.features.push(labelPoint);
		});
		
		if (isLine) {
			// There is one point more than the number of edges.
			geojson.features.pop();
		}
		
		if (isPolygon) {
			var point = measurement.areaLabel.position;
			var labelArea = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: point.toArray(),
				},
				properties: {
					name: measurement.areaLabel.text
				}
			};
			geojson.features.push(labelArea);
		}
		
		return JSON.stringify(geojson);
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
	
	static toString(measurement){
		let isLine = measurement.showDistances && !measurement.showArea && !measurement.showAngles;
		let isPolygon = measurement.showDistances && measurement.showArea && !measurement.showAngles;
		
		 if (!isLine && !isPolygon) {
			return;
		}
		
		let geomCode = isLine ? 8 : 9;
		
		let dxfBody = '0\n\
SECTION\n\
2\n\
ENTITIES\n\
0\n\
POLYLINE\n\
8\n\
0\n\
62\n\
1\n\
66\n\
1\n\
10\n\
0.0\n\
20\n\
0.0\n\
30\n\
0.0\n\
70\n\
{geomCode}\n'.replace('{geomCode}', geomCode);

		let xMax = 0.0;
		let yMax = 0.0;
		let zMax = 0.0;
		measurement.points.forEach(function (point) {
			point = point.position;
			xMax = Math.max(xMax, point.x);
			yMax = Math.max(yMax, point.y);
			zMax = Math.max(zMax, point.z);
			dxfBody += '0\n\
VERTEX\n\
8\n\
0\n\
10\n\
{X}\n\
20\n\
{Y}\n\
30\n\
{Z}\n\
70\n\
32\n'.replace('{X}', point.x)
                .replace('{Y}', point.y)
                .replace('{Z}', point.z);
            });

            dxfBody += '0\n\
SEQEND\n\
0\n\
ENDSEC\n';

            var dxfHeader = '999\n\
DXF created from potree\n\
0\n\
SECTION\n\
2\n\
HEADER\n\
9\n\
$ACADVER\n\
1\n\
AC1006\n\
9\n\
$INSBASE\n\
10\n\
0.0\n\
20\n\
0.0\n\
30\n\
0.0\n\
9\n\
$EXTMIN\n\
10\n\
0.0\n\
20\n\
0.0\n\
30\n\
0\n\
9\n\
$EXTMAX\n\
10\n\
{xMax}\n\
20\n\
{yMax}\n\
30\n\
{zMax}\n\
0\n\
ENDSEC\n'.replace('{xMax}', xMax)
                .replace('{yMax}', yMax)
                .replace('{zMax}', zMax);

            let dxf = dxfHeader + dxfBody + '0\n\
EOF';

		return dxf;
	}
	
}

Potree.PointCloudArena4DNode = function(){
	this.left = null;
	this.right = null;
	this.sceneNode = null;
	this.kdtree = null;
	
	this.getNumPoints = function(){
		return this.geometryNode.numPoints;
	};
	
	this.isLoaded = function(){
		return true;
	};
	
	this.isTreeNode = function(){
		return true;
	};
	
	this.isGeometryNode = function(){
		return false;
	};
	
	this.getLevel = function(){
		return this.geometryNode.level;
	};
	
	this.getBoundingSphere = function(){
		return this.geometryNode.boundingSphere;
	};
	
	this.getBoundingBox = function(){
		return this.geometryNode.boundingBox;
	};
	
	this.toTreeNode = function(child){
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
	};
	
	this.getChildren = function(){
		var children = [];
		
		if(this.left){
			children.push(this.left);
		} 
		
		if(this.right){
			children.push(this.right);
		}
		
		return children;
	};
};

Potree.PointCloudOctreeNode.prototype = Object.create(Potree.PointCloudTreeNode.prototype);



Potree.PointCloudArena4D = function(geometry){
	THREE.Object3D.call( this );
	
	var scope = this;
	
	this.root = null;
	if(geometry.root){
		this.root = geometry.root;
	}else{
		geometry.addEventListener("hierarchy_loaded", function(){
			scope.root = geometry.root;
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
	
	this.pickTarget;
	this.pickMaterial;
	
	//this.updateMatrixWorld();
};

Potree.PointCloudArena4D.prototype = new Potree.PointCloudTree();

Potree.PointCloudOctree.prototype.setName = function(name){
	if(this.name !== name){
		this.name = name;
		this.dispatchEvent({type: "name_changed", name: name, pointcloud: this});
	}
};

Potree.PointCloudOctree.prototype.getName = function(){
	return this.name;
};

Potree.PointCloudArena4D.prototype.getLevel = function(){
	return this.level;
};

Potree.PointCloudArena4D.prototype.toTreeNode = function(geometryNode, parent){
	var node = new Potree.PointCloudArena4DNode();
	var sceneNode = new THREE.Points(geometryNode.geometry, this.material);
	
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
};

Potree.PointCloudArena4D.prototype.updateMaterial = function(material, visibleNodes, camera, renderer){
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
};

Potree.PointCloudArena4D.prototype.updateVisibleBounds = function(){
	
};

Potree.PointCloudArena4D.prototype.hideDescendants = function(object){
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
};

Potree.PointCloudArena4D.prototype.updateMatrixWorld = function( force ){
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
};

Potree.PointCloudArena4D.prototype.nodesOnRay = function(nodes, ray){
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
};

Potree.PointCloudArena4D.prototype.pick = function(renderer, camera, ray, params){
	let gl = renderer.context;
	
	let compileMaterial = function(material){
		if(material._glstate === undefined){
			material._glstate = {};
		}
		
		let glstate = material._glstate;
		
		// VERTEX SHADER
		let vs = gl.createShader(gl.VERTEX_SHADER);
		{
			gl.shaderSource(vs, material.vertexShader);
			gl.compileShader(vs);
			
			let success = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
			if (!success) {
				console.error("could not compile vertex shader:");
				
				let log = gl.getShaderInfoLog(vs);
				console.error(log, material.vertexShader);
				
				return;
			}
		}
		
		// FRAGMENT SHADER
		let fs = gl.createShader(gl.FRAGMENT_SHADER);
		{
			gl.shaderSource(fs, material.fragmentShader);
			gl.compileShader(fs);
			
			let success = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
			if (!success) {
				console.error("could not compile fragment shader:");
				console.error(material.fragmentShader);
				
				return;
			}
		}
		
		// PROGRAM
		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		var success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (!success) {
			console.error("could not compile shader:");
			console.error(material.vertexShader);
			console.error(material.fragmentShader);
				
			return;
		}
		
		glstate.program = program;
		
		gl.useProgram( program );
		
		{ // UNIFORMS
			let uniforms = {};
			let n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

			for(let i = 0; i < n; i++){
				var uniform = gl.getActiveUniform(program, i);
				var name = uniform.name;
				var loc = gl.getUniformLocation(program, name);

				uniforms[name] = loc;
			}
			
			glstate.uniforms = uniforms;
			glstate.textures = {};
		}
	};
	
	if(Potree.PointCloudArena4D.pickMaterial === undefined){
		Potree.PointCloudArena4D.pickMaterial = new Potree.PointCloudMaterial({treeType: Potree.TreeType.KDTREE});
		Potree.PointCloudArena4D.pickMaterial.pointColorType = Potree.PointColorType.POINT_INDEX;		
		//Potree.PointCloudArena4D.pickMaterial.pointColorType = Potree.PointColorType.COLOR;
		
		compileMaterial(Potree.PointCloudArena4D.pickMaterial);
	}
	
	let pickMaterial = Potree.PointCloudArena4D.pickMaterial;
	
	var params = params || {};
	let pickWindowSize = params.pickWindowSize || 17;
	let pickOutsideClipRegion = params.pickOutsideClipRegion || false;
	
	let nodes = this.nodesOnRay(this.visibleNodes, ray);
	
	if(nodes.length === 0){
		return null;
	}
	
	
	
	{ // update pick material
		let doRecompile = false;
	
		if(pickMaterial.pointSizeType !== this.material.pointSizeType){
			pickMaterial.pointSizeType = this.material.pointSizeType;
			doRecompile = true;
		}
		
		if(pickMaterial.pointShape !== this.material.pointShape){
			pickMaterial.pointShape = this.material.pointShape;
			doRecompile = true;
		}
		
		if(pickMaterial.interpolate !== this.material.interpolate){
			pickMaterial.interpolate = this.material.interpolate;
			doRecompile = true;
		}
		
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
		
		if(doRecompile){
			
			compileMaterial(pickMaterial);
			
		};
	}
	
	var width = Math.ceil(renderer.domElement.clientWidth);
	var height = Math.ceil(renderer.domElement.clientHeight);
	
	var pixelPos = new THREE.Vector3().addVectors(camera.position, ray.direction).project(camera);
	pixelPos.addScalar(1).multiplyScalar(0.5);
	pixelPos.x *= width;
	pixelPos.y *= height;
	
	if(!this.pickTarget){
		this.pickTarget = new THREE.WebGLRenderTarget( 
			1, 1, 
			{ minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat } 
		);
	}else if(this.pickTarget.width != width || this.pickTarget.height != height){
		this.pickTarget.dispose();
		this.pickTarget = new THREE.WebGLRenderTarget( 
			1, 1, 
			{ minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat } 
		);
	}
	this.pickTarget.setSize(width, height);
	
	gl.enable(gl.SCISSOR_TEST);
	gl.scissor(pixelPos.x - (pickWindowSize - 1) / 2, pixelPos.y - (pickWindowSize - 1) / 2,pickWindowSize,pickWindowSize);
	gl.disable(gl.SCISSOR_TEST);
	
	renderer.setRenderTarget( this.pickTarget );
	
	renderer.state.setDepthTest( pickMaterial.depthTest );
	renderer.state.setDepthWrite( pickMaterial.depthWrite );
	renderer.state.setBlending( THREE.NoBlending );
	
	renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
	
	let glstate = pickMaterial._glstate;
	let program = glstate.program;
	let uniforms = glstate.uniforms;
	gl.useProgram(program);
		
	gl.uniformMatrix4fv(uniforms["projectionMatrix"], false, new Float32Array(camera.projectionMatrix.elements));
	gl.uniformMatrix4fv(uniforms["viewMatrix"], false, new Float32Array(camera.matrixWorldInverse.elements));
	
	{
		if(glstate.textures.visibleNodes === undefined){
			let image = pickMaterial.visibleNodesTexture.image;
			let texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			//gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);
			glstate.textures.visibleNodes = {
				id: texture
			};
		}
		
		let texture = glstate.textures.visibleNodes.id;
		let image = pickMaterial.visibleNodesTexture.image;
		
		gl.uniform1i(uniforms["visibleNodes"], 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture( gl.TEXTURE_2D, texture );
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
		
	}
	
	let bbSize = this.pcoGeometry.boundingBox.getSize();
	
	gl.uniform1f(uniforms["fov"], this.material.fov);
	gl.uniform1f(uniforms["screenWidth"], this.material.screenWidth);
	gl.uniform1f(uniforms["screenHeight"], this.material.screenHeight);
	gl.uniform1f(uniforms["spacing"], this.material.spacing);
	gl.uniform1f(uniforms["near"], this.material.near);
	gl.uniform1f(uniforms["far"], this.material.far);
	gl.uniform1f(uniforms["size"], this.material.size);
	gl.uniform1f(uniforms["minSize"], this.material.minSize);
	gl.uniform1f(uniforms["maxSize"], this.material.maxSize);
	gl.uniform1f(uniforms["octreeSize"], this.pcoGeometry.boundingBox.getSize().x);
	gl.uniform3f(uniforms["bbSize"], bbSize.x, bbSize.y, bbSize.z);
	
	{
		let apPosition = gl.getAttribLocation(program, "position");
		let apNormal = gl.getAttribLocation(program, "normal");
		let apClassification = gl.getAttribLocation(program, "classification");
		let apIndices = gl.getAttribLocation(program, "indices");
		
		gl.enableVertexAttribArray( apPosition );
		gl.enableVertexAttribArray( apNormal );
		gl.enableVertexAttribArray( apClassification );		
		gl.enableVertexAttribArray( apIndices );
	}
	
	for(let i = 0; i < nodes.length; i++){
		let node = nodes[i];
		let object = node.sceneNode;
		let geometry = object.geometry;
		
		pickMaterial.pcIndex = i + 1;
		
		let modelView = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
		gl.uniformMatrix4fv(uniforms["modelMatrix"], false, new Float32Array(object.matrixWorld.elements));
		gl.uniformMatrix4fv(uniforms["modelViewMatrix"], false, new Float32Array(modelView.elements));
		
		let apPosition = gl.getAttribLocation(program, "position");
		let apNormal = gl.getAttribLocation(program, "normal");
		let apClassification = gl.getAttribLocation(program, "classification");
		let apIndices = gl.getAttribLocation(program, "indices");
		
		let positionBuffer = renderer.properties.get(geometry.attributes.position).__webglBuffer;
		
		if(positionBuffer === undefined){
			continue;
		}
		
		let oldstate = {
			enabled: []
		};
		
		// TODO hack
		for(let i = 0; i < 16; i++){
			oldstate.enabled[i] = gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
			gl.disableVertexAttribArray(i);
		}
		
		gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
		gl.vertexAttribPointer( apPosition, 3, gl.FLOAT, false, 0, 0 ); 
		gl.enableVertexAttribArray(apPosition);
		
		let indexBuffer = renderer.properties.get(geometry.attributes.indices).__webglBuffer;
		gl.bindBuffer( gl.ARRAY_BUFFER, indexBuffer );
		gl.vertexAttribPointer( apIndices, 4, gl.UNSIGNED_BYTE, true, 0, 0 ); 
		gl.enableVertexAttribArray(apIndices);
		
		gl.uniform1f(uniforms["pcIndex"], pickMaterial.pcIndex);

		let numPoints = node.getNumPoints();
		if(numPoints > 0){
			gl.drawArrays( gl.POINTS, 0, node.getNumPoints());		
		}
		
		// TODO hack
		for(let i = 0; i < 16; i++){
			gl.disableVertexAttribArray(i);
		}
		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
	}
	
	var pixelCount = pickWindowSize * pickWindowSize;
	var buffer = new ArrayBuffer(pixelCount*4);
	var pixels = new Uint8Array(buffer);
	var ibuffer = new Uint32Array(buffer);
	renderer.context.readPixels(
		pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2, 
		pickWindowSize, pickWindowSize, 
		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);


	//{ // open window with image
	//	var br = new ArrayBuffer(width*height*4);
	//	var bp = new Uint8Array(br);
	//	renderer.context.readPixels( 0, 0, width, height, 
	//		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, bp);
	//	
	//	var img = Potree.utils.pixelsArrayToImage(bp, width, height);
	//	var screenshot = img.src;
	//	
	//	var w = window.open();
	//	w.document.write('<img src="'+screenshot+'"/>');
	//}
		
		
	//{ // show big render target for debugging purposes
	//	var br = new ArrayBuffer(width*height*4);
	//	var bp = new Uint8Array(br);
	//	renderer.context.readPixels( 0, 0, width, height, 
	//		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, bp);
	//
	//	var img = pixelsArrayToImage(bp, width, height);
	//	img.style.boder = "2px solid red";
	//	img.style.position = "absolute";
	//	img.style.top  = "0px";
	//	img.style.width = width + "px";
	//	img.style.height = height + "px";
	//	img.onclick = function(){document.body.removeChild(img)};
	//	document.body.appendChild(img);
	//}
		
	// find closest hit inside pixelWindow boundaries
	var min = Number.MAX_VALUE;
	var hit = null;
	//console.log("finding closest hit");
	for(let u = 0; u < pickWindowSize; u++){
		for(var v = 0; v < pickWindowSize; v++){
			var offset = (u + v*pickWindowSize);
			var distance = Math.pow(u - (pickWindowSize-1) / 2, 2) + Math.pow(v - (pickWindowSize-1) / 2, 2);
			
			var pcIndex = pixels[4*offset + 3];
			pixels[4*offset + 3] = 0;
			var pIndex = ibuffer[offset];
			
			if((pIndex !== 0 || pcIndex !== 0) && distance < min){
				
				hit = {
					pIndex: pIndex,
					pcIndex: pcIndex - 1
				};
				min = distance;
			}
		}
	}	
	
	if(hit){
		var point = {};
		
		var pc = nodes[hit.pcIndex].sceneNode;
		var attributes = pc.geometry.attributes;
		
		for (var property in attributes) {
			if (attributes.hasOwnProperty(property)) {
				var values = pc.geometry.attributes[property];
			
				if(property === "position"){
					var positionArray = values.array;
					var x = positionArray[3*hit.pIndex+0];
					var y = positionArray[3*hit.pIndex+1];
					var z = positionArray[3*hit.pIndex+2];
					var position = new THREE.Vector3(x, y, z);
					position.applyMatrix4(this.matrixWorld);
				
					point[property] = position;
				}else if(property === "indices"){
				
				}else{
					if(values.itemSize === 1){
						point[property] = values.array[hit.pIndex];
					}else{
						var value = [];
						for(var j = 0; j < values.itemSize; j++){
							value.push(values.array[values.itemSize*hit.pIndex + j]);
						}
						point[property] = value;
					}
				}
			}
		}
		
		
		return point;
		//return null;
	}else{
		return null;
	}
};


Potree.PointCloudArena4D.prototype.updateVisibilityTexture = function(material, visibleNodes){

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
};



Object.defineProperty(Potree.PointCloudArena4D.prototype, "progress", {
	get: function(){
		if(this.pcoGeometry.root){
			return Potree.PointCloudArena4DGeometryNode.nodesLoading > 0 ? 0 : 1;
		}else{
			return 0;
		}
	}
});



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
		var colors = new Float32Array(numPoints*3);
		var indices = new Uint32Array(numPoints);
		
		for(var i = 0; i < numPoints; i++){
			var x = view.getFloat32(i*17 + 0, true) + scope.boundingBox.min.x;
			var y = view.getFloat32(i*17 + 4, true) + scope.boundingBox.min.y;
			var z = view.getFloat32(i*17 + 8, true) + scope.boundingBox.min.z;
			var r = view.getUint8(i*17 + 12, true) / 256;
			var g = view.getUint8(i*17 + 13, true) / 256;
			var b = view.getUint8(i*17 + 14, true) / 256;
			
			positions[i*3+0] = x;
			positions[i*3+1] = y;
			positions[i*3+2] = z;
			
			colors[i*3+0] = r;
			colors[i*3+1] = g;
			colors[i*3+2] = b;
			
			indices[i] = i;
		}
		
		var geometry = new THREE.BufferGeometry();
		geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));
		geometry.addAttribute("color", new THREE.BufferAttribute(colors, 3));
		geometry.addAttribute("indices", new THREE.BufferAttribute(indices, 1));
		geometry.addAttribute("normal", new THREE.BufferAttribute(new Float32Array(numPoints*3), 3));
		
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
var getQueryParam = function(name) {
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(window.location.href);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

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
		
		this.annotations = [];
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
		
		var light = new THREE.AmbientLight( 0x555555 ); // soft white light
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
		
		
		if(!args.cameraTarget){
			args.cameraTarget = position;
		}
		
		var annotation = new Potree.Annotation(this, args);
		
		this.annotations.push(annotation);
		
		this.dispatchEvent({
			"type": "annotation_added", 
			"scene": this,
			"annotation": annotation});
		
		return annotation;
	}
	
	getAnnotations(){
		return this.annotations;
	};
	
};

Potree.Viewer = class PotreeViewer extends THREE.EventDispatcher{
	
	constructor(domElement, args){
		super();
		
		var a = args || {};
		this.pointCloudLoadedCallback = a.onPointCloudLoaded || function(){};
		
		this.renderArea = domElement;
		
		//if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		//	defaultSettings.navigation = "Orbit";
		//}
		
		this.fov = 60;
		this.pointSize = 1;
		this.minPointSize = 1;
		this.maxPointSize = 50;
		this.opacity = 1;
		this.sizeType = "Fixed";
		this.pointSizeType = Potree.PointSizeType.FIXED;
		this.pointColorType = null;
		this.clipMode = Potree.ClipMode.HIGHLIGHT_INSIDE;
		this.quality = "Squares";
		this.isFlipYZ = false;
		this.useDEMCollisions = false;
		this.minNodeSize = 100;
		this.directionalLight;
		this.edlStrength = 1.0;
		this.edlRadius = 1.4;
		this.useEDL = false;
		this.intensityMax = null;
		this.heightMin = 0;
		this.heightMax = 1;
		this.materialTransition = 0.5;
		this.weightRGB = 1.0;
		this.weightIntensity = 0.0;
		this.weightElevation = 0.0;
		this.weightClassification = 0.0;
		this.weightReturnNumber = 0.0;
		this.weightSourceID = 0.0;
		this.intensityRange = [0, 65000];
		this.intensityGamma = 1;
		this.intensityContrast = 0;
		this.intensityBrightness = 0;
		this.rgbGamma = 1;
		this.rgbContrast = 0;
		this.rgbBrightness = 0;
		
		this.moveSpeed = 10;

		this.showDebugInfos = false;
		this.showStats = false;
		this.showBoundingBox = false;
		this.freeze = false;

		this.mapView;

		this.progressBar = new ProgressBar();

		this.stats = new Stats();
		//this.stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
		//document.body.appendChild( this.stats.dom );
		//this.stats.dom.style.left = "100px";
		
		this.potreeRenderer = null;
		this.highQualityRenderer = null;
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
			//this.transformationTool.setScene(this.scene);
			
			let onPointcloudAdded = (e) => {
				this.updateHeightRange();
				
				if(this.scene.pointclouds.length === 1){
					let speed = e.pointcloud.boundingBox.getSize().length();
					speed = speed / 5;
					this.setMoveSpeed(speed);
					//this.scene.view.radius = speed * 2.5;
				}
				
				
				//if(e.pointcloud.projection){
				//	this.mapView = new Potree.MapView(this);
				//	this.mapView.init();
				//}
				
			};
			
			this.addEventListener("scene_changed", (e) => {
				this.inputHandler.setScene(e.scene);
				this.measuringTool.setScene(e.scene);
				this.profileTool.setScene(e.scene);
				this.volumeTool.setScene(e.scene);
				this.updateHeightRange();
				
				if(!e.scene.hasEventListener("pointcloud_added", onPointcloudAdded)){
					e.scene.addEventListener("pointcloud_added", onPointcloudAdded);
				}
			});
			
			this.scene.addEventListener("pointcloud_added", onPointcloudAdded);
		}
		
		{// set defaults
			this.setPointSize(1);
			this.setFOV(60);
			this.setOpacity(1);
			this.setEDLEnabled(false);
			this.setEDLRadius(1.4);
			this.setEDLStrength(1.0);
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
		
		let oldScene = scene;
		this.scene = scene;
		
		this.dispatchEvent({
			type: "scene_changed",
			oldScene: oldScene,
			scene: scene
		});
		
		
		{ // Annotations
			$(".annotation").detach();
			
			for(let annotation of this.scene.annotations){
				this.renderArea.appendChild(annotation.domElement);
			}
		
			// TODO make sure this isn't added multiple times on scene switches
			this.scene.addEventListener("annotation_added", (e) => {
				if(e.scene === this.scene){
					this.renderArea.appendChild(e.annotation.domElement);
				}
				
				//focusing_finished
				e.annotation.addEventListener("focusing_finished", (event) => {
					let distance = this.scene.view.position.distanceTo(this.scene.view.getPivot());
					//this.setMoveSpeed(distance / 3);
					this.setMoveSpeed(Math.pow(distance, 0.4));
					this.renderer.domElement.focus();
				});
			});
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
	
	//loadPointCloud(path, name, callback){
    //
	//	// load pointcloud
	//	if(!path){
    //
	//	}else if(path.indexOf("greyhound://") === 0){
	//		// We check if the path string starts with 'greyhound:', if so we assume it's a greyhound server URL.
	//		Potree.GreyhoundLoader.load(path, function(geometry) {
	//			if(!geometry){
	//				callback({type: "loading_failed"});
	//			}else{
	//				pointcloud = new Potree.PointCloudOctree(geometry);
	//				initPointcloud(pointcloud);
	//			}
	//		});
	//	}else if(path.indexOf("cloud.js") > 0){
	//		Potree.POCLoader.load(path, function(geometry){
	//			if(!geometry){
	//				callback({type: "loading_failed"});
	//			}else{
	//				let pointcloud = new Potree.PointCloudOctree(geometry);
    //                pointcloud.name = name;
	//				initPointcloud(pointcloud);				
	//			}
	//		}.bind(this));
	//	}else if(path.indexOf(".vpc") > 0){
	//		Potree.PointCloudArena4DGeometry.load(path, function(geometry){
	//			if(!geometry){
	//				callback({type: "loading_failed"});
	//			}else{
	//				let pointcloud = new Potree.PointCloudArena4D(geometry);
    //                pointcloud.name = name;
	//				initPointcloud(pointcloud);
	//			}
	//		});
	//	}else{
	//		callback({"type": "loading_failed"});
	//	}
	//}
	
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
			//this.fpControls.setSpeed(value);
			//this.geoControls.setSpeed(value);
			//this.earthControls.setSpeed(value);
			this.dispatchEvent({"type": "move_speed_changed", "viewer": this, "speed": value});
		}
	};
	
	getMoveSpeed(){
		return this.moveSpeed;
	};
	
	//setShowSkybox(value){
	//	if(this.showSkybox !== value){
	//		this.showSkybox = value;
	//		this.dispatchEvent({"type": "show_skybox_changed", "viewer": this});
	//	}
	//};
	//
	//getShowSkybox(){
	//	return this.showSkybox;
	//};
	
	setHeightRange(min, max){
		if(this.heightMin !== min || this.heightMax !== max){
			this.heightMin = min || this.heightMin;
			this.heightMax = max || this.heightMax;
			this.dispatchEvent({"type": "height_range_changed", "viewer": this});
		}
	};
	
	getHeightRange(){
		return {min: this.heightMin, max: this.heightMax};
	};
	
	getElevationRange(){
		return this.getHeightRange();
	};
	
	setElevationRange(min, max){
		this.setHeightRange(min, max);
	}
	
	setIntensityRange(min, max){
		if(this.intensityRange[0] !== min || this.intensityRange[1] !== max){
			this.intensityRange[0] = min || this.intensityRange[0];
			this.intensityRange[1] = max || this.intensityRange[1];
			this.dispatchEvent({"type": "intensity_range_changed", "viewer": this});
		}
	};
	
	getIntensityRange(){
		return this.intensityRange;
	};
	
	setIntensityGamma(value){
		if(this.intensityGamma !== value){
			this.intensityGamma = value;
			this.dispatchEvent({"type": "intensity_gamma_changed", "viewer": this});
		}
	};
	
	getIntensityGamma(){
		return this.intensityGamma;
	};
	
	setIntensityContrast(value){
		if(this.intensityContrast !== value){
			this.intensityContrast = value;
			this.dispatchEvent({"type": "intensity_contrast_changed", "viewer": this});
		}
	};
	
	getIntensityContrast(){
		return this.intensityContrast;
	};
	
	setIntensityBrightness(value){
		if(this.intensityBrightness !== value){
			this.intensityBrightness = value;
			this.dispatchEvent({"type": "intensity_brightness_changed", "viewer": this});
		}
	};
	
	getIntensityBrightness(){
		return this.intensityBrightness;
	};
	
	setRGBGamma(value){
		if(this.rgbGamma !== value){
			this.rgbGamma = value;
			this.dispatchEvent({"type": "rgb_gamma_changed", "viewer": this});
		}
	};
	
	getRGBGamma(){
		return this.rgbGamma;
	};
	
	setRGBContrast(value){
		if(this.rgbContrast !== value){
			this.rgbContrast = value;
			this.dispatchEvent({"type": "rgb_contrast_changed", "viewer": this});
		}
	};
	
	getRGBContrast(){
		return this.rgbContrast;
	};
	
	setRGBBrightness(value){
		if(this.rgbBrightness !== value){
			this.rgbBrightness = value;
			this.dispatchEvent({"type": "rgb_brightness_changed", "viewer": this});
		}
	};
	
	getRGBBrightness(){
		return this.rgbBrightness;
	};
	
	setMaterialTransition(t){
		if(this.materialTransition !== t){
			this.materialTransition = t;
			this.dispatchEvent({"type": "material_transition_changed", "viewer": this});
		}
	};
	
	getMaterialTransition(){
		return this.materialTransition;
	};
	
	setWeightRGB(w){
		if(this.weightRGB !== w){
			this.weightRGB = w;
			this.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightRGB(){
		return this.weightRGB;
	};
	
	setWeightIntensity(w){
		if(this.weightIntensity !== w){
			this.weightIntensity = w;
			this.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightIntensity(){
		return this.weightIntensity;
	};
	
	setWeightElevation(w){
		if(this.weightElevation !== w){
			this.weightElevation = w;
			this.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightElevation(){
		return this.weightElevation;
	};
	
	setWeightClassification(w){
		if(this.weightClassification !== w){
			this.weightClassification = w;
			this.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightClassification(){
		return this.weightClassification;
	};
	
	setWeightReturnNumber(w){
		if(this.weightReturnNumber !== w){
			this.weightReturnNumber = w;
			this.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightReturnNumber(){
		return this.weightReturnNumber;
	};
	
	setWeightSourceID(w){
		if(this.weightSourceID !== w){
			this.weightSourceID = w;
			this.dispatchEvent({"type": "attribute_weights_changed", "viewer": this});
		}
	};
	
	getWeightSourceID(){
		return this.weightSourceID;
	};
	
	setIntensityMax(max){
		if(this.intensityMax !== max){
			this.intensityMax = max;
			this.dispatchEvent({"type": "intensity_max_changed", "viewer": this});
		}
	};
	
	getIntensityMax(){
		return this.intensityMax;
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

		if(Potree.pointBudget != value){
			Potree.pointBudget = parseInt(value);
			this.dispatchEvent({"type": "point_budget_changed", "viewer": this});
		}
	};
	
	getPointBudget(){
		return Potree.pointBudget;
	};
	
	setClipMode(clipMode){
		if(this.clipMode != clipMode){
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
	
	setPointSize(value){
		if(this.pointSize !== value){
			this.pointSize = value;
			this.dispatchEvent({"type": "point_size_changed", "viewer": this});
		}
	};
	
	getPointSize(){
		return this.pointSize;
	};
	
	setMinPointSize(value){
		if(this.minPointSize !== value){
			this.minPointSize = value;
			this.dispatchEvent({"type": "min_point_size_changed", "viewer": this});
		}
	}
	
	getMinPointSize(){
		return this.minPointSize;
	}
	
	setMaxPointSize(value){
		if(this.maxPointSize !== value){
			this.maxPointSize = value;
			this.dispatchEvent({"type": "max_point_size_changed", "viewer": this});
		}
	}
	
	getMaxPointSize(){
		return this.maxPointSize;
	}
	
	setFOV(value){
		if(this.fov !== value){
			this.fov = value;
			this.dispatchEvent({"type": "fov_changed", "viewer": this});
		}
	};
	
	getFOV(){
		return this.fov;
	};
	
	setOpacity(value){
		if(this.opacity !== value){
			this.opacity = value;
			this.dispatchEvent({"type": "opacity_changed", "viewer": this});
		}
	};
	
	getOpacity(){
		return this.opacity;
	};

	setPointSizing(value){
		if(this.sizeType !== value){
			this.sizeType = value;
			if(value === "Fixed"){
				this.pointSizeType = Potree.PointSizeType.FIXED;
			}else if(value === "Attenuated"){
				this.pointSizeType = Potree.PointSizeType.ATTENUATED;
			}else if(value === "Adaptive"){
				this.pointSizeType = Potree.PointSizeType.ADAPTIVE;
			}
			
			this.dispatchEvent({"type": "point_sizing_changed", "viewer": this});
		}
	};
	
	getPointSizing(){
		return this.sizeType;
	};

	setQuality(value){
		var oldQuality = this.quality;
		if(value == "Interpolation" && !Potree.Features.SHADER_INTERPOLATION.isSupported()){
			this.quality = "Squares";
		}else if(value == "Splats" && !Potree.Features.SHADER_SPLATS.isSupported()){
			this.quality = "Squares";
		}else{
			this.quality = value;
		}
		
		if(oldQuality !== this.quality){
			this.dispatchEvent({"type": "quality_changed", "viewer": this});
		}
	};
	
	getQuality(){
		return this.quality;
	};
	
	disableAnnotations(){
		for(var i = 0; i < this.scene.annotations.length; i++){
			var annotation = this.scene.annotations[i];
			annotation.domElement.style.pointerEvents = "none";
		};
	};
	
	enableAnnotations(){
		for(var i = 0; i < this.scene.annotations.length; i++){
			var annotation = this.scene.annotations[i];
			annotation.domElement.style.pointerEvents = "auto";
		};
	};
	
	setClassificationVisibility(key, value){

		var changed = false;
		for(var i = 0; i < this.scene.pointclouds.length; i++){
			var pointcloud = this.scene.pointclouds[i];
			var newClass = pointcloud.material.classification;
			var oldValue = newClass[key].w;
			newClass[key].w = value ? 1 : 0;

			if(oldValue !== newClass[key].w){
				changed = true;
			}

			pointcloud.material.classification = newClass;
		}

		if(changed){
			this.dispatchEvent({"type": "classification_visibility_changed", "viewer": this});
		}
	};

	setMaterial(value){
		if(this.pointColorType !== this.toMaterialID(value)){
			this.pointColorType = this.toMaterialID(value);
			
			this.dispatchEvent({"type": "material_changed", "viewer": this});
		}
	};
	
	setMaterialID(value){
		if(this.pointColorType !== value){
			this.pointColorType = value;
			
			this.dispatchEvent({"type": "material_changed", "viewer": this});
		}
	}
	
	getMaterial(){
		return this.pointColorType;
	};
	
	getMaterialName(){
		return this.toMaterialName(this.pointColorType);
	};
	
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
		//this.scene.camera.zoomTo(node, factor);
		let view = this.scene.view;
		
		let camera = this.scene.camera.clone();
		camera.position.copy(view.position);
		camera.lookAt(view.getPivot());
		camera.updateMatrixWorld();
		camera.zoomTo(node, factor);
		
		var bs;
		if(node.boundingSphere){
			bs = node.boundingSphere;
		}else if(node.geometry && node.geometry.boundingSphere){
			bs = node.geometry.boundingSphere;
		}else{
			bs = node.boundingBox.getBoundingSphere();
		}
		
		bs = bs.clone().applyMatrix4(node.matrixWorld); 
		
		view.position.copy(camera.position);
		view.radius = view.position.distanceTo(bs.center);
		//let target = bs.center;
		//target.z = target.z - bs.radius * 0.8;
		//view.lookAt(target);
		
		this.dispatchEvent({"type": "zoom_to", "viewer": this});
	};
	
	showAbout(){
		$(function() {
			$( "#about-panel" ).dialog();
		});
	};
	
	getBoundingBox(pointclouds){
		pointclouds = pointclouds || this.scene.pointclouds;
		
		var box = new THREE.Box3();
		
		this.scene.scenePointCloud.updateMatrixWorld(true);
		this.scene.referenceFrame.updateMatrixWorld(true);
		
		for(var i = 0; i < this.scene.pointclouds.length; i++){
			var pointcloud = this.scene.pointclouds[i];
			
			pointcloud.updateMatrixWorld(true);
			
			let pointcloudBox = pointcloud.pcoGeometry.tightBoundingBox ?  pointcloud.pcoGeometry.tightBoundingBox : pointcloud.boundingBox;
			var boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloudBox, pointcloud.matrixWorld)
			box.union(boxWorld);
		}

		return box;
	};
	
	fitToScreen(factor = 1){
		var box = this.getBoundingBox(this.scene.pointclouds);
		
		var node = new THREE.Object3D();
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
	
	updateHeightRange(){
		var bbWorld = this.getBoundingBox();
		this.setHeightRange(bbWorld.min.z, bbWorld.max.z);
	};
	
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
			var enabled = Potree.utils.getParameterByName("edlEnabled") === "true";
			this.setEDLEnabled(enabled);
		}
		
		if(Potree.utils.getParameterByName("edlRadius")){
			this.setEDLRadius(parseFloat(Potree.utils.getParameterByName("edlRadius")));
		}
		
		if(Potree.utils.getParameterByName("edlStrength")){
			this.setEDLStrength(parseFloat(Potree.utils.getParameterByName("edlStrength")));
		}
		
		if(Potree.utils.getParameterByName("clipMode")){
			var clipMode = Potree.utils.getParameterByName("clipMode");
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
			var enabled = Potree.utils.getParameterByName("showBoundingBox") === "true";
			if(enabled){
				this.setShowBoundingBox(true);
			}else{
				this.setShowBoundingBox(false);
			}
		}

		if(Potree.utils.getParameterByName("material")){
			var material = Potree.utils.getParameterByName("material");
			this.setMaterial(material);
		}

		if(Potree.utils.getParameterByName("pointSizing")){
			var sizing = Potree.utils.getParameterByName("pointSizing");
			this.setPointSizing(sizing);
		}

		if(Potree.utils.getParameterByName("quality")){
			var quality = Potree.utils.getParameterByName("quality");
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
		
		var renderArea = $('#potree_render_area');
		var sidebar = $('#potree_sidebar_container');
		var isVisible = renderArea.css("left") !== "0px";

		if(isVisible){
			renderArea.css("left", "0px");
		}else{
			renderArea.css("left", "300px");
		}
	};
	
	toggleMap(){
		var map = $('#potree_map');
		map.toggle(100);

	};

	loadGUI(callback){
		var sidebarContainer = $('#potree_sidebar_container');
		sidebarContainer.load(new URL(Potree.scriptPath + "/sidebar.html").href, () => {
			
			sidebarContainer.css("width", "300px");
			sidebarContainer.css("height", "100%");

			var imgMenuToggle = document.createElement("img");
			imgMenuToggle.src = new URL(Potree.resourcePath + "/icons/menu_button.svg").href;
			imgMenuToggle.onclick = this.toggleSidebar;
			imgMenuToggle.classList.add("potree_menu_toggle");

			var imgMapToggle = document.createElement("img");
			imgMapToggle.src = new URL(Potree.resourcePath + "/icons/map_icon.png").href;
			imgMapToggle.style.display = "none";
			imgMapToggle.onclick = this.toggleMap;
			imgMapToggle.id = "potree_map_toggle";
			
			viewer.renderArea.insertBefore(imgMapToggle, viewer.renderArea.children[0]);
			viewer.renderArea.insertBefore(imgMenuToggle, viewer.renderArea.children[0]);
			
			this.mapView = new Potree.MapView(this);
			this.mapView.init();
			
			i18n.init({ 
				lng: 'en',
				resGetPath: Potree.resourcePath + '/lang/__lng__/__ns__.json',
				preload: ['en', 'fr', 'de'],
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
				$('#potree_render_area').append(elProfile.children());
				this._2dprofile = new Potree.Viewer.Profile(this, document.getElementById("profile_draw_container"));
				
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
	
	initThree(){
		let width = this.renderArea.clientWidth;
		let height = this.renderArea.clientHeight;

		this.renderer = new THREE.WebGLRenderer({premultipliedAlpha: false});
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
		
		var visibleNodes = 0;
		var visiblePoints = 0;
		var progress = 0;
		
		for(var i = 0; i < this.scene.pointclouds.length; i++){
			var pointcloud = this.scene.pointclouds[i];
			var bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
				
			if(!this.intensityMax){
				var root = pointcloud.pcoGeometry.root;
				if(root != null && root.loaded){
					var attributes = pointcloud.pcoGeometry.root.geometry.attributes;
					if(attributes.intensity){
						var array = attributes.intensity.array;

						// chose max value from the 0.75 percentile
						var ordered = [];
						for(var j = 0; j < array.length; j++){
							ordered.push(array[j]);
						}
						ordered.sort();
						var capIndex = parseInt((ordered.length - 1) * 0.75);
						var cap = ordered[capIndex];

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
			
			//if(this.heightMin === null){
			//	this.setHeightRange(bbWorld.min.y, bbWorld.max.y);
			//}
				
			pointcloud.material.clipMode = this.clipMode;
			pointcloud.material.heightMin = this.heightMin;
			pointcloud.material.heightMax = this.heightMax;
			//pointcloud.material.intensityMin = 0;
			//pointcloud.material.intensityMax = this.intensityMax;
			pointcloud.material.uniforms.intensityRange.value = this.getIntensityRange();
			pointcloud.material.uniforms.intensityGamma.value = this.getIntensityGamma();
			pointcloud.material.uniforms.intensityContrast.value = this.getIntensityContrast();
			pointcloud.material.uniforms.intensityBrightness.value = this.getIntensityBrightness();
			pointcloud.material.uniforms.rgbGamma.value = this.getRGBGamma();
			pointcloud.material.uniforms.rgbContrast.value = this.getRGBContrast();
			pointcloud.material.uniforms.rgbBrightness.value = this.getRGBBrightness();
			pointcloud.showBoundingBox = this.showBoundingBox;
			pointcloud.generateDEM = this.useDEMCollisions;
			pointcloud.minimumNodePixelSize = this.minNodeSize;
			pointcloud.material.uniforms.transition.value = this.materialTransition;
			
			pointcloud.material.uniforms.wRGB.value = this.getWeightRGB();
			pointcloud.material.uniforms.wIntensity.value = this.getWeightIntensity();
			pointcloud.material.uniforms.wElevation.value = this.getWeightElevation();
			pointcloud.material.uniforms.wClassification.value = this.getWeightClassification();
			pointcloud.material.uniforms.wReturnNumber.value = this.getWeightReturnNumber();
			pointcloud.material.uniforms.wSourceID.value = this.getWeightSourceID();
			
			//if(!this.freeze){
			//	pointcloud.update(this.scene.camera, this.renderer);
			//}

			visibleNodes += pointcloud.numVisibleNodes;
			visiblePoints += pointcloud.numVisiblePoints;

			progress += pointcloud.progress;
		}
		
		if(!this.freeze){
			var result = Potree.updatePointClouds(scene.pointclouds, camera, this.renderer);
			visibleNodes = result.visibleNodes.length;
			visiblePoints = result.numVisiblePoints;
			camera.near = result.lowestSpacing * 10.0;
			camera.far = -this.getBoundingBox().applyMatrix4(camera.matrixWorldInverse).min.z;
			camera.far = Math.max(camera.far * 1.5, 1000);
		}
		
		
		//if(this.stats && this.showStats){
		//	document.getElementById("lblNumVisibleNodes").style.display = "";
		//	document.getElementById("lblNumVisiblePoints").style.display = "";
		//	this.stats.domElement.style.display = "";
		//
		//	this.stats.update();
		//
		//	document.getElementById("lblNumVisibleNodes").innerHTML = "visible nodes: " + visibleNodes;
		//	document.getElementById("lblNumVisiblePoints").innerHTML = "visible points: " + Potree.utils.addCommas(visiblePoints);
		//}else if(this.stats){
		//	document.getElementById("lblNumVisibleNodes").style.display = "none";
		//	document.getElementById("lblNumVisiblePoints").style.display = "none";
		//	this.stats.domElement.style.display = "none";
		//}
		
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
			//camera.rotation.x = scene.view.pitch;
			//camera.rotation.y = scene.view.yaw;
			
			//camera.lookAt(scene.view.getPivot());
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
				return {inverse: boxInverse, position: boxPosition};
			});
			
			for(let pointcloud of this.scene.pointclouds){
				pointcloud.material.setClipBoxes(clipBoxes);
			}
		}

		{ // update annotations
			var distances = [];
			for(let ann of this.scene.annotations){
				var screenPos = ann.position.clone().project(this.scene.camera);
				
				screenPos.x = this.renderArea.clientWidth * (screenPos.x + 1) / 2;
				screenPos.y = this.renderArea.clientHeight * (1 - (screenPos.y + 1) / 2);
				
				ann.domElement.style.left = Math.floor(screenPos.x - ann.domElement.clientWidth / 2) + "px";
				ann.domElement.style.top = Math.floor(screenPos.y - ann.elOrdinal.clientHeight / 2) + "px";
				
				
				
				distances.push({annotation: ann, distance: screenPos.z});

				if(-1 > screenPos.z || screenPos.z > 1){
					ann.domElement.style.display = "none";
				}else{
					ann.domElement.style.display = "initial";
				}
			}
			
			distances.sort(function(a,b){return b.distance - a.distance});
			
			for(var i = 0; i < distances.length; i++){
				var ann = distances[i].annotation;
				ann.domElement.style.zIndex = "" + i;
				if(ann.descriptionVisible){
					ann.domElement.style.zIndex += 100;
				}
			}
		}
		
		if(this.showDebugInfos){
			this.infos.set("camera.position", "camera.position: " + 
				this.scene.camera.position.x.toFixed(2) 
				+ ", " + this.scene.camera.position.y.toFixed(2) 
				+ ", " + this.scene.camera.position.z.toFixed(2)
			);
		}
		
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
		
		let queryAll = Potree.startQuery("All", viewer.renderer.getContext());
		
		if(this.useEDL && Potree.Features.SHADER_EDL.isSupported()){
			if(!this.edlRenderer){
				this.edlRenderer = new EDLRenderer(this);
			}
			this.edlRenderer.render(this.renderer);
		}else if(this.quality === "Splats"){
			if(!this.highQualityRenderer){
				this.highQualityRenderer = new HighQualityRenderer(this);
			}
			this.highQualityRenderer.render(this.renderer);
		}else{
			if(!this.potreeRenderer){
				this.potreeRenderer = new PotreeRenderer(this);
			}
			
			this.potreeRenderer.render();
		}
		
		Potree.endQuery(queryAll, viewer.renderer.getContext());
		Potree.resolveQueries(viewer.renderer.getContext());
		
		//if(this.takeScreenshot == true){
		//	this.takeScreenshot = false;
		//	
		//	var screenshot = this.renderer.domElement.toDataURL();
		//	
		//	//document.body.appendChild(screenshot); 
		//	var w = this.open();
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
		
		if(Potree.framenumber > 20 && false){
			
			if(Potree.__dems === undefined){
				Potree.__dems = {};
				Potree.__dems.targetElevation = new THREE.WebGLRenderTarget( 128, 128, { 
					minFilter: THREE.NearestFilter, 
					magFilter: THREE.NearestFilter, 
					format: THREE.RGBAFormat
				} );
				
				Potree.__dems.targetMedian = new THREE.WebGLRenderTarget( 128, 128, { 
					minFilter: THREE.NearestFilter, 
					magFilter: THREE.NearestFilter, 
					format: THREE.RGBAFormat
				} );
				
				Potree.__dems.camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 1);
				
				// VERTEX SHADER
				let vsElevation = `
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
				
				// FRAGMENT SHADER
				let fsElevation = `
					precision mediump float;
					precision mediump int;
					
					varying float vElevation;
					
					void main(){
						gl_FragColor = vec4(vElevation / 50.0, 0.0, 0.0, 1.0);
					}
				`;
				
				let vsMedian = `
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
				
				let fsMedian = `
				
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
				
				Potree.__dems.elevationMaterial = new THREE.RawShaderMaterial( {
					vertexShader: vsElevation,
					fragmentShader: fsElevation,
				} );
				
				Potree.__dems.medianFilterMaterial = new THREE.RawShaderMaterial( {
					uniforms: {
						uWidth: {value: 1.0},
						uHeight: {value: 1.0},
						uTexture: {type: "t", value: Potree.__dems.targetElevation.texture}
					},
					vertexShader: vsMedian,
					fragmentShader: fsMedian,
				} );
				
			}
			let dems = Potree.__dems;
			let camera = dems.camera;
			viewer.renderer.setClearColor(0x0000FF, 0);
			viewer.renderer.clearTarget(dems.targetElevation, true, true, false );
			viewer.renderer.clearTarget(dems.targetMedian, true, true, false );

			let node = viewer.scene.pointclouds[0].root;
			if(node.geometryNode){
				let box = node.geometryNode.boundingBox;
				
				
				camera.up.set(0, 0, 1);
				//camera.rotation.x = Math.PI / 2;
				camera.left = box.min.x;
				camera.right = box.max.x;
				camera.top = box.max.y;
				camera.bottom = box.min.y;
				camera.near = -1000;
				camera.far = 1000;
				camera.updateProjectionMatrix();
				
				let scene = new THREE.Scene();
				//let material = new THREE.PointsMaterial({color: 0x00ff00, size: 0.0001});
				let material = dems.elevationMaterial;
				let pointcloud = new THREE.Points(node.geometryNode.geometry, material);
				scene.add(pointcloud);
				
				
				viewer.renderer.render(pointcloud, camera, dems.targetElevation);
				
				dems.medianFilterMaterial.uniforms.uWidth.value = dems.targetMedian.width;
				dems.medianFilterMaterial.uniforms.uHeight.value = dems.targetMedian.height;
				dems.medianFilterMaterial.uniforms.uTexture.value = dems.targetElevation.texture;
				
				Potree.utils.screenPass.render(viewer.renderer, dems.medianFilterMaterial, dems.targetMedian);

				plane.material = new THREE.MeshBasicMaterial({map: dems.targetMedian.texture});
			}
		}
		

		//var queryAll = Potree.startQuery("All", viewer.renderer.getContext());
		
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
		
		
		
		for(let i = 0; i < viewer.scene.pointclouds.length; i++){
			let pointcloud = viewer.scene.pointclouds[i];
			if(pointcloud.originalMaterial){
				pointcloud.material = pointcloud.originalMaterial;
			}
			
			let bbWorld = Potree.utils.computeTransformedBoundingBox(pointcloud.boundingBox, pointcloud.matrixWorld);
			
			pointcloud.material.useEDL = false;
			pointcloud.material.size = viewer.pointSize;
			pointcloud.material.minSize = viewer.minPointSize;
			pointcloud.material.maxSize = viewer.maxPointSize;
			pointcloud.material.opacity = viewer.opacity;
			pointcloud.material.pointColorType = viewer.pointColorType;
			pointcloud.material.pointSizeType = viewer.pointSizeType;
			pointcloud.material.pointShape = (viewer.quality === "Circles") ? Potree.PointShape.CIRCLE : Potree.PointShape.SQUARE;
			pointcloud.material.interpolate = (viewer.quality === "Interpolation");
			pointcloud.material.weighted = false;
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

// high quality rendering using splats
class HighQualityRenderer{
	
	constructor(viewer){
		this.viewer = viewer;
		
		this.depthMaterial = null;
		this.attributeMaterial = null;
		this.normalizationMaterial = null;
		
		this.rtDepth;
		this.rtNormalize;
	};

	
	
	initHQSPlats(){
		if(this.depthMaterial != null){
			return;
		}
	
		this.depthMaterial = new Potree.PointCloudMaterial();
		this.attributeMaterial = new Potree.PointCloudMaterial();
	
		this.depthMaterial.pointColorType = Potree.PointColorType.DEPTH;
		this.depthMaterial.pointShape = Potree.PointShape.CIRCLE;
		this.depthMaterial.interpolate = false;
		this.depthMaterial.weighted = false;
		this.depthMaterial.minSize = viewer.minPointSize;
		this.depthMaterial.maxSize = viewer.maxPointSize;
					
		this.attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
		this.attributeMaterial.interpolate = false;
		this.attributeMaterial.weighted = true;
		this.attributeMaterial.minSize = viewer.minPointSize;
		this.attributeMaterial.maxSize = viewer.maxPointSize;

		this.rtDepth = new THREE.WebGLRenderTarget( 1024, 1024, { 
			minFilter: THREE.NearestFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat, 
			type: THREE.FloatType
		} );

		this.rtNormalize = new THREE.WebGLRenderTarget( 1024, 1024, { 
			minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat, 
			type: THREE.FloatType
		} );
		
		var uniformsNormalize = {
			depthMap: { type: "t", value: this.rtDepth },
			texture: { type: "t", value: this.rtNormalize }
		};
		
		this.normalizationMaterial = new THREE.ShaderMaterial({
			uniforms: uniformsNormalize,
			vertexShader: Potree.Shaders["normalize.vs"],
			fragmentShader: Potree.Shaders["normalize.fs"]
		});
	};
	
	resize(width, height){
		if(this.rtDepth.width == width && this.rtDepth.height == height){
			return;
		}
		
		this.rtDepth.dispose();
		this.rtNormalize.dispose();
		
		viewer.scene.camera.aspect = width / height;
		viewer.scene.camera.updateProjectionMatrix();
		
		viewer.renderer.setSize(width, height);
		this.rtDepth.setSize(width, height);
		this.rtNormalize.setSize(width, height);
	};

	// render with splats
	render(renderer){
	
		var width = viewer.renderArea.clientWidth;
		var height = viewer.renderArea.clientHeight;
	
		this.initHQSPlats();
		
		this.resize(width, height);
		
		
		viewer.renderer.clear();
		if(viewer.background === "skybox"){
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.camera.rotation);
			viewer.skybox.camera.fov = viewer.scene.camera.fov;
			viewer.skybox.camera.aspect = viewer.scene.camera.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			viewer.renderer.clear();
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 0);
			viewer.renderer.clear();
		}
		
		viewer.renderer.render(viewer.scene.scene, viewer.scene.camera);
		
		for(let pointcloud of viewer.scene.pointclouds){
		
			this.depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
			this.attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
		
			let originalMaterial = pointcloud.material;
			
			{// DEPTH PASS
				this.depthMaterial.size = viewer.pointSize;
				this.depthMaterial.pointSizeType = viewer.pointSizeType;
				this.depthMaterial.screenWidth = width;
				this.depthMaterial.screenHeight = height;
				this.depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				this.depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
				this.depthMaterial.fov = viewer.scene.camera.fov * (Math.PI / 180);
				this.depthMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
				this.depthMaterial.near = viewer.scene.camera.near;
				this.depthMaterial.far = viewer.scene.camera.far;
				this.depthMaterial.heightMin = viewer.heightMin;
				this.depthMaterial.heightMax = viewer.heightMax;
				this.depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				this.depthMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
				this.depthMaterial.bbSize = pointcloud.material.bbSize;
				this.depthMaterial.treeType = pointcloud.material.treeType;
				this.depthMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
				
				viewer.scene.scenePointCloud.overrideMaterial = this.depthMaterial;
				viewer.renderer.clearTarget( this.rtDepth, true, true, true );
				viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.camera, this.rtDepth);
				viewer.scene.scenePointCloud.overrideMaterial = null;
			}
			
			{// ATTRIBUTE PASS
				this.attributeMaterial.size = viewer.pointSize;
				this.attributeMaterial.pointSizeType = viewer.pointSizeType;
				this.attributeMaterial.screenWidth = width;
				this.attributeMaterial.screenHeight = height;
				this.attributeMaterial.pointColorType = viewer.pointColorType;
				this.attributeMaterial.depthMap = this.rtDepth;
				this.attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				this.attributeMaterial.uniforms.octreeSize.value = pointcloud.pcoGeometry.boundingBox.getSize().x;
				this.attributeMaterial.fov = viewer.scene.camera.fov * (Math.PI / 180);
				this.attributeMaterial.uniforms.blendHardness.value = pointcloud.material.uniforms.blendHardness.value;
				this.attributeMaterial.uniforms.blendDepthSupplement.value = pointcloud.material.uniforms.blendDepthSupplement.value;
				this.attributeMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
				this.attributeMaterial.near = viewer.scene.camera.near;
				this.attributeMaterial.far = viewer.scene.camera.far;
				this.attributeMaterial.heightMin = viewer.heightMin;
				this.attributeMaterial.heightMax = viewer.heightMax;
				this.attributeMaterial.intensityMin = pointcloud.material.intensityMin;
				this.attributeMaterial.intensityMax = pointcloud.material.intensityMax;
				this.attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
				this.attributeMaterial.clipMode = pointcloud.material.clipMode;
				this.attributeMaterial.bbSize = pointcloud.material.bbSize;
				this.attributeMaterial.treeType = pointcloud.material.treeType;
				this.attributeMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
				
				viewer.scene.scenePointCloud.overrideMaterial = this.attributeMaterial;
				viewer.renderer.clearTarget( this.rtNormalize, true, true, true );
				viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.camera, this.rtNormalize);
				viewer.scene.scenePointCloud.overrideMaterial = null;
				
				pointcloud.material = originalMaterial;
			}
		}
		
		if(viewer.scene.pointclouds.length > 0){
			{// NORMALIZATION PASS
				this.normalizationMaterial.uniforms.depthMap.value = this.rtDepth;
				this.normalizationMaterial.uniforms.texture.value = this.rtNormalize;
				Potree.utils.screenPass.render(viewer.renderer, this.normalizationMaterial);
			}
			
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
		}

	}
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
		
		var needsResize = (this.rtColor.width != width || this.rtColor.height != height);
	
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
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.camera.rotation);
			viewer.skybox.camera.fov = viewer.scene.camera.fov;
			viewer.skybox.camera.aspect = viewer.scene.camera.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			viewer.renderer.clear();
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 0);
			viewer.renderer.clear();
		}
		
		
		viewer.renderer.render(viewer.scene.scene, viewer.scene.camera);
		
		viewer.renderer.clearTarget( this.rtColor, true, true, true );
		
		var originalMaterials = [];
		for(var i = 0; i < viewer.scene.pointclouds.length; i++){
			var pointcloud = viewer.scene.pointclouds[i];
			var width = viewer.renderArea.clientWidth;
			var height = viewer.renderArea.clientHeight;
			
			if(this.attributeMaterials.length <= i ){
				var attributeMaterial = new Potree.PointCloudMaterial();
					
				attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
				attributeMaterial.interpolate = (viewer.quality === "Interpolation");
				attributeMaterial.weighted = false;
				attributeMaterial.minSize = viewer.minPointSize;
				attributeMaterial.maxSize = viewer.maxPointSize;
				attributeMaterial.useLogarithmicDepthBuffer = false;
				attributeMaterial.useEDL = true;
				this.attributeMaterials.push(attributeMaterial);
			}
			var attributeMaterial = this.attributeMaterials[i];
		
			var octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;
		
			originalMaterials.push(pointcloud.material);
			
			{// COLOR & DEPTH PASS
				attributeMaterial = pointcloud.material;
				attributeMaterial.pointShape = Potree.PointShape.CIRCLE;
				attributeMaterial.interpolate = (viewer.quality === "Interpolation");
				attributeMaterial.weighted = false;
				attributeMaterial.minSize = viewer.minPointSize;
				attributeMaterial.maxSize = viewer.maxPointSize;
				attributeMaterial.useLogarithmicDepthBuffer = false;
				attributeMaterial.useEDL = true;
				
				attributeMaterial.size = viewer.pointSize;
				attributeMaterial.pointSizeType = viewer.pointSizeType;
				attributeMaterial.screenWidth = width;
				attributeMaterial.screenHeight = height;
				attributeMaterial.pointColorType = viewer.pointColorType;
				attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				attributeMaterial.uniforms.octreeSize.value = octreeSize;
				attributeMaterial.fov = viewer.scene.camera.fov * (Math.PI / 180);
				attributeMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
				attributeMaterial.near = viewer.scene.camera.near;
				attributeMaterial.far = viewer.scene.camera.far;
				attributeMaterial.heightMin = viewer.heightMin;
				attributeMaterial.heightMax = viewer.heightMax;
				attributeMaterial.intensityMin = pointcloud.material.intensityMin;
				attributeMaterial.intensityMax = pointcloud.material.intensityMax;
				attributeMaterial.setClipBoxes(pointcloud.material.clipBoxes);
				attributeMaterial.clipMode = pointcloud.material.clipMode;
				attributeMaterial.bbSize = pointcloud.material.bbSize;
				attributeMaterial.treeType = pointcloud.material.treeType;
				attributeMaterial.uniforms.classificationLUT.value = pointcloud.material.uniforms.classificationLUT.value;
				
				pointcloud.material = attributeMaterial;

				for(var j = 0; j < pointcloud.visibleNodes.length; j++){
					var node = pointcloud.visibleNodes[j];
					if(pointcloud instanceof Potree.PointCloudOctree){
						node.sceneNode.material = attributeMaterial;
					}else if(pointcloud instanceof Potree.PointCloudArena4D){
						node.material = attributeMaterial;
					}
				}
			}
			
		}
		
		//var queryPC = Potree.startQuery("PointCloud", viewer.renderer.getContext());
		viewer.renderer.render(viewer.scene.scenePointCloud, viewer.scene.camera, this.rtColor);
		viewer.renderer.render(viewer.scene.scene, viewer.scene.camera, this.rtColor);
		//Potree.endQuery(queryPC, viewer.renderer.getContext());
		
		
		// bit of a hack here. The EDL pass will mess up the text of the volume tool
		// so volume tool is rendered again afterwards
		//viewer.volumeTool.render(this.rtColor);
				
		for(var i = 0; i < viewer.scene.pointclouds.length; i++){
			var pointcloud = viewer.scene.pointclouds[i];
			var originalMaterial = originalMaterials[i];
			pointcloud.material = originalMaterial;
			for(var j = 0; j < pointcloud.visibleNodes.length; j++){
				var node = pointcloud.visibleNodes[j];
				if(pointcloud instanceof Potree.PointCloudOctree){
					node.sceneNode.material = originalMaterial;
				}else if(pointcloud instanceof Potree.PointCloudArena4D){
					node.material = originalMaterial;
				}
			}
		}
		
		viewer.volumeTool.update();
		viewer.renderer.render(viewer.volumeTool.sceneVolume, viewer.scene.camera, this.rtColor);
			
		if(viewer.scene.pointclouds.length > 0){
			
			//var ext = viewer.renderer.getContext().getExtension("EXT_disjoint_timer_query");
			//if(window.timerQuery == null){
			//	window.timerQuery = ext.createQueryEXT();
			//	ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, window.timerQuery);
			//}
			
			//var query = Potree.startQuery("EDL", viewer.renderer.getContext());
			
			{ // EDL OCCLUSION PASS
				this.edlMaterial.uniforms.screenWidth.value = width;
				this.edlMaterial.uniforms.screenHeight.value = height;
				this.edlMaterial.uniforms.colorMap.value = this.rtColor;
				this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
				this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
				this.edlMaterial.uniforms.opacity.value = viewer.opacity;
				this.edlMaterial.depthTest = true;
				this.edlMaterial.depthWrite = true;
				this.edlMaterial.transparent = true;
			
				Potree.utils.screenPass.render(viewer.renderer, this.edlMaterial);
			}	
			
//			viewer.renderer.render(viewer.scene.scene, viewer.scene.camera);
			
			//Potree.endQuery(query, viewer.renderer.getContext());
			//Potree.resolveQueries(viewer.renderer.getContext());
			
			
			viewer.renderer.clearDepth();
			//viewer.volumeTool.update();
			//viewer.renderer.render(viewer.volumeTool.sceneVolume, viewer.scene.camera);
			viewer.renderer.render(viewer.controls.sceneControls, viewer.scene.camera);
			
			
			viewer.measuringTool.update();
			viewer.profileTool.update();
			viewer.transformationTool.update();
			
			viewer.renderer.render(viewer.measuringTool.sceneMeasurement, viewer.scene.camera);
			viewer.renderer.render(viewer.profileTool.sceneProfile, viewer.scene.camera);
			viewer.renderer.render(viewer.transformationTool.sceneTransform, viewer.scene.camera);
			
			//viewer.profileTool.render();
			//viewer.volumeTool.render();
			//viewer.renderer.clearDepth();
			//viewer.measuringTool.render();
			//viewer.transformationTool.render();
		}
		
		
		//{
		//	let renderer = viewer.renderer;
		//	let pickWindowSize = 128;
		//	let pixelCount = pickWindowSize * pickWindowSize;
		//	let buffer = new ArrayBuffer(pixelCount*4);
		//	let pixels = new Uint8Array(buffer);
		//	let ibuffer = new Uint32Array(buffer);
		//	renderer.context.readPixels(
		//		800 - (pickWindowSize-1) / 2, 500 - (pickWindowSize-1) / 2, 
		//		pickWindowSize, pickWindowSize, 
		//		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);
		//		
		//	console.log(pixels[i]);
		//}

		

	}
};


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
	}
	
	init(){
		$( "#potree_map" ).draggable({ handle: $('#potree_map_header') });
		$( "#potree_map" ).resizable();
		//$( "#potree_map_toggle" ).css("display", "block");
	
		let extentsLayer = this.getExtentsLayer();
		let cameraLayer = this.getCameraLayer();
		let toolLayer = this.getToolLayer();
		let sourcesLayer = this.getSourcesLayer();
		let sourcesLabelLayer = this.getSourcesLabelLayer();
		
		var mousePositionControl = new ol.control.MousePosition({
			coordinateFormat: ol.coordinate.createStringXY(5),
			projection: "EPSG:4326",
			undefinedHTML: '&nbsp;'
		});
		
		let DownloadSelectionControl = function(opt_options){
			var options = opt_options || {};
			
			// TOGGLE TILES
			var btToggleTiles = document.createElement('button');
			btToggleTiles.innerHTML = 'T';
			btToggleTiles.addEventListener('click', () => {
				var visible = this.sourcesLayer.getVisible();
				this.sourcesLayer.setVisible(!visible);
				this.sourcesLabelLayer.setVisible(!visible);
			}, false);
			btToggleTiles.style.float = "left";
			btToggleTiles.title = "show / hide tiles";
			
			// DOWNLOAD SELECTED TILES
			var link = document.createElement("a");
			link.href = "#";
			link.download = "list.txt";
			link.style.float = "left";
			
			var button = document.createElement('button');
			button.innerHTML = 'D';
			link.appendChild(button);
			
			var this_ = this;
			var handleDownload = (e) => {
				var features = selectedFeatures.getArray();
				
				var url =  [location.protocol, '//', location.host, location.pathname].join('');
				
				if(features.length === 0){
					alert("No tiles were selected. Select area with ctrl + left mouse button!");
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
				}else if(features.length === 1){
					var feature = features[0];
					
					if(feature.source){
						var cloudjsurl = feature.pointcloud.pcoGeometry.url;
						var sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
						link.href = sourceurl.href;
						link.download = feature.source.name;
					}
				}else{
					var content = "";
					for(var i = 0; i < features.length; i++){
						var feature = features[i];
						
						if(feature.source){
							var cloudjsurl = feature.pointcloud.pcoGeometry.url;
							var sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
							content += sourceurl.href + "\n";
						}
					}
					
					var uri = "data:application/octet-stream;base64,"+btoa(content);
					link.href = uri;
					link.download = "list_of_files.txt";
				}
			};
			
			button.addEventListener('click', handleDownload, false);
			
			// assemble container
			var element = document.createElement('div');
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
		
		var select = new ol.interaction.Select();
		this.map.addInteraction(select);
		
		var selectedFeatures = select.getFeatures();
        
		var dragBox = new ol.interaction.DragBox({
		  condition: ol.events.condition.platformModifierKeyOnly
		});
        
		this.map.addInteraction(dragBox);
        
		
		dragBox.on('boxend', (e) => {
			// features that intersect the box are added to the collection of
			// selected features, and their names are displayed in the "info"
			// div
			var extent = dragBox.getGeometry().getExtent();
			this.sourcesLayer.getSource().forEachFeatureIntersectingExtent(extent, (feature) => {
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
		
		//// adding pointclouds to map
		//this.viewer.addEventListener("pointcloud_added", (event) => {
		//	this.load(event.pointcloud);
		//});
		//for(var i = 0; i < this.viewer.scene.pointclouds.length; i++){
		//	this.load(this.viewer.scene.pointclouds[i]);
		//}
		
		//this.viewer.profileTool.addEventListener("profile_added", this.updateToolDrawings);
		//this.viewer.profileTool.addEventListener("profile_removed", this.updateToolDrawings);
		//this.viewer.profileTool.addEventListener("marker_moved", this.updateToolDrawings);
		//this.viewer.profileTool.addEventListener("marker_removed", this.updateToolDrawings);
		//this.viewer.profileTool.addEventListener("marker_added", this.updateToolDrawings);
		//
		//this.viewer.measuringTool.addEventListener("measurement_added", this.updateToolDrawings);
		//this.viewer.measuringTool.addEventListener("marker_added", this.updateToolDrawings);
		//this.viewer.measuringTool.addEventListener("marker_removed", this.updateToolDrawings);
		//this.viewer.measuringTool.addEventListener("marker_moved", this.updateToolDrawings);

		this.viewer.addEventListener("scene_changed", e => {
			this.setScene(e.scene);
		});
		
		this.onPointcloudAdded = e => {
			this.load(e.pointcloud);
		};
		
		this.setScene(this.viewer.scene);
	}
	
	setScene(scene){
		if(this.scene === scene){
			return;
		};
		
		if(this.scene){
			this.scene.removeEventListener("pointcloud_added", this.onPointcloudAdded);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("pointcloud_added", this.onPointcloudAdded);
		
		for(var i = 0; i < this.viewer.scene.pointclouds.length; i++){
			this.load(this.viewer.scene.pointclouds[i]);
		}
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
	
	getCameraLayer(){
		if(this.cameraLayer){
			return this.cameraLayer;
		}
		
		// CAMERA LAYER
		this.gCamera = new ol.geom.LineString([[0,0], [0,0], [0,0], [0,0]]);
		var feature = new ol.Feature(this.gCamera);
		var featureVector = new ol.source.Vector({
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
		var bb = this.viewer.getBoundingBox();
		
		var bottomLeft = this.toMap.forward([bb.min.x, bb.min.y]);
		var bottomRight = this.toMap.forward([bb.max.x, bb.min.y]);
		var topRight = this.toMap.forward([bb.max.x, bb.max.y]);
		var topLeft = this.toMap.forward([bb.min.x, bb.max.y]);
		
		var extent = {
			bottomLeft: bottomLeft,
			bottomRight: bottomRight,
			topRight: topRight,
			topLeft: topLeft
		};
		
		return extent;
	};
	
	getMapCenter(){
		var mapExtent = this.getMapExtent();
		
		var mapCenter = [
			(mapExtent.bottomLeft[0] + mapExtent.topRight[0]) / 2, 
			(mapExtent.bottomLeft[1] + mapExtent.topRight[1]) / 2
		];
		
		return mapCenter;
	};	
	
	updateToolDrawings(){
		this.toolLayer.getSource().clear();
		
		var profiles = this.viewer.profileTool.profiles;
		for(var i = 0; i < profiles.length; i++){
			var profile = profiles[i];
			var coordinates = [];
			
			for(var j = 0; j < profile.points.length; j++){
				var point = profile.points[j];
				var pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}
			
			var line = new ol.geom.LineString(coordinates);
			var feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}
		
		var measurements = this.viewer.measuringTool.measurements;
		for(var i = 0; i < measurements.length; i++){
			var measurement = measurements[i];
			var coordinates = [];
			
			for(var j = 0; j < measurement.points.length; j++){
				var point = measurement.points[j].position;
				var pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}
			
			if(measurement.closed && measurement.points.length > 0){
				coordinates.push(coordinates[0]);
			}
			
			var line = new ol.geom.LineString(coordinates);
			var feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}
	}
	
	
	load(pointcloud){
		
		if(!(pointcloud instanceof Potree.PointCloudOctree)){
			return;
		}
		
		if(!pointcloud.projection){
			return;
		}
		
		if(!this.sceneProjection){
			this.setSceneProjection(pointcloud.projection);
		}
		
		var mapExtent = this.getMapExtent();
		var mapCenter = this.getMapCenter();
		
		
		var view = this.map.getView();
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

		let createLabelStyle = (text) => {
			var style = new ol.style.Style({
				image: new ol.style.Circle({
					fill: new ol.style.Fill({
						color: 'rgba(100,50,200,0.5)'
					}),
					stroke: new ol.style.Stroke({
						color: 'rgba(120,30,100,0.8)',
						width: 3
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

		var url = pointcloud.pcoGeometry.url + "/../sources.json";
		$.getJSON(url, (data) => {
			var sources = data.sources;
			
			for(var i = 0; i < sources.length; i++){
				var source = sources[i];
				var name = source.name;
				var points = source.points;
				var bounds = source.bounds;

				var mapBounds = {
					min: this.toMap.forward( [bounds.min[0], bounds.min[1]] ),
					max: this.toMap.forward( [bounds.max[0], bounds.max[1]] )
				}
				var mapCenter = [
					(mapBounds.min[0] + mapBounds.max[0]) / 2,
					(mapBounds.min[1] + mapBounds.max[1]) / 2,
				];
				
				var p1 = this.toMap.forward( [bounds.min[0], bounds.min[1]] );
				var p2 = this.toMap.forward( [bounds.max[0], bounds.min[1]] );
				var p3 = this.toMap.forward( [bounds.max[0], bounds.max[1]] );
				var p4 = this.toMap.forward( [bounds.min[0], bounds.max[1]] );
				
				var boxes = [];
				//var feature = new ol.Feature({
				//	'geometry': new ol.geom.LineString([p1, p2, p3, p4, p1])
				//});
				var feature = new ol.Feature({
					'geometry': new ol.geom.Polygon([[p1, p2, p3, p4, p1]])
				});
				feature.source = source;
				feature.pointcloud = pointcloud;
				this.sourcesLayer.getSource().addFeature(feature);
				
                
				feature = new ol.Feature({
					 geometry: new ol.geom.Point(mapCenter),
					 name: name 
				});
				feature.setStyle(createLabelStyle(name));
				this.sourcesLabelLayer.getSource().addFeature(feature);
			}
		});
	}
	
	update(delta){
		if(!this.sceneProjection){
			return;
		}
		
		var pm = $( "#potree_map" );
		
		if(!pm.is(":visible")){
			return;
		}
		
		// resize
		var mapSize = this.map.getSize();
		var resized = (pm.width() != mapSize[0] || pm.height() != mapSize[1]);
		if(resized){
			this.map.updateSize();
		}
		
		// camera
		var scale = this.map.getView().getResolution();
		var camera = this.viewer.scene.camera;
		var campos = camera.position;
		var camdir = camera.getWorldDirection();
		var sceneLookAt = camdir.clone().multiplyScalar(30 * scale).add(campos);
		var geoPos = camera.position;
		var geoLookAt = sceneLookAt;
		var mapPos = new THREE.Vector2().fromArray(this.toMap.forward([geoPos.x, geoPos.y]));
		var mapLookAt = new THREE.Vector2().fromArray(this.toMap.forward([geoLookAt.x, geoLookAt.y]));
		var mapDir = new THREE.Vector2().subVectors(mapLookAt, mapPos).normalize();
		mapLookAt = mapPos.clone().add(mapDir.clone().multiplyScalar(30 * scale));
		var mapLength = mapPos.distanceTo(mapLookAt);
		var mapSide = new THREE.Vector2(-mapDir.y, mapDir.x);
		
		var p1 = mapPos.toArray();
		var p2 = mapLookAt.clone().sub(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();
		var p3 = mapLookAt.clone().add(mapSide.clone().multiplyScalar(0.3 * mapLength)).toArray();

		
		this.gCamera.setCoordinates([p1, p2, p3, p1]);
	}
	
};







var createToolIcon = function(icon, title, callback){
	var elImg = document.createElement("img");
	elImg.src = icon;
	elImg.onclick = callback;
	elImg.style.width = "32px";
	elImg.style.height = "32px";
	elImg.classList.add("button-icon");
	elImg.setAttribute("data-i18n", title);
	return elImg;
};

function initToolbar(){

	// ANGLE
	let elToolbar = document.getElementById("tools");
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/angle.png",
		"[title]tt.angle_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: false, 
				showAngles: true, 
				showArea: false, 
				closed: true, 
				maxMarkers: 3});
		}
	));
	
	// POINT
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/point.svg",
		"[title]tt.angle_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: false, 
				showAngles: false, 
				showCoordinates: true, 
				showArea: false, 
				closed: true, 
				maxMarkers: 1});
		}
	));
	
	// DISTANCE
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/distance.svg",
		"[title]tt.distance_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: true, 
				showArea: false, 
				closed: false});
		}
	));
	
	// HEIGHT
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/height.svg",
		"[title]tt.height_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: false, 
				showHeight: true, 
				showArea: false, 
				closed: false, 
				maxMarkers: 2});
		}
	));
	
	// AREA
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/area.svg",
		"[title]tt.area_measurement",
		function(){
			$("#menu_measurements").next().slideDown();
			viewer.measuringTool.startInsertion({
				showDistances: true, 
				showArea: true, 
				closed: true});
		}
	));
	
	// VOLUME
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/volume.svg",
		"[title]tt.volume_measurement",
		function(){viewer.volumeTool.startInsertion()}
	));
	
	// PROFILE
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/profile.svg",
		"[title]tt.height_profile",
		function(){
			$("#menu_measurements").next().slideDown();;
			viewer.profileTool.startInsertion();
		}
	));
	
	// CLIP VOLUME
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/clip_volume.svg",
		"[title]tt.clip_volume",
		function(){viewer.volumeTool.startInsertion({clip: true})}
	));
	
	// REMOVE ALL
	elToolbar.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/reset_tools.svg",
		"[title]tt.remove_all_measurement",
		function(){
			viewer.scene.removeAllMeasurements();
		}
	));
}

function initMaterials(){
	
	$( "#optMaterial" ).selectmenu({
		style:'popup',
		position: { 
			my: "top", 
			at: "bottom", 
			collision: "flip" }	
	});
		
	$( "#sldHeightRange" ).slider({
		range: true,
		min:	0,
		max:	1000,
		values: [0, 1000],
		step: 	0.01,
		slide: function( event, ui ) {
			viewer.setHeightRange(ui.values[0], ui.values[1]);
		}
	});
	
	$( "#sldTransition" ).slider({
		value: viewer.getMaterialTransition(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setMaterialTransition(ui.value);}
	});
	
	$( "#sldIntensityRange" ).slider({
		range: true,
		min:	0,
		max:	1,
		values: [0, 1],
		step: 	0.01,
		slide: function( event, ui ) {
			let min = (ui.values[0] == 0) ? 0 : parseInt(Math.pow(2, 16 * ui.values[0]));
			let max = parseInt(Math.pow(2, 16 * ui.values[1]));
			viewer.setIntensityRange(min, max);
		}
	});
	
	$( "#sldIntensityGamma" ).slider({
		value: viewer.getIntensityGamma(),
		min: 0,
		max: 4,
		step: 0.01,
		slide: function( event, ui ) {viewer.setIntensityGamma(ui.value);}
	});
	
	$( "#sldIntensityContrast" ).slider({
		value: viewer.getIntensityContrast(),
		min: -1,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setIntensityContrast(ui.value);}
	});
	
	$( "#sldIntensityBrightness" ).slider({
		value: viewer.getIntensityBrightness(),
		min: -1,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setIntensityBrightness(ui.value);}
	});
	
	$( "#sldRGBGamma" ).slider({
		value: viewer.getRGBGamma(),
		min: 0,
		max: 4,
		step: 0.01,
		slide: function( event, ui ) {viewer.setRGBGamma(ui.value);}
	});
	
	$( "#sldRGBContrast" ).slider({
		value: viewer.getRGBContrast(),
		min: -1,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setRGBContrast(ui.value);}
	});
	
	$( "#sldRGBBrightness" ).slider({
		value: viewer.getRGBBrightness(),
		min: -1,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setRGBBrightness(ui.value);}
	});
	
	$( "#sldWeightRGB" ).slider({
		value: viewer.getWeightRGB(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightRGB(ui.value);}
	});
	
	$( "#sldWeightIntensity" ).slider({
		value: viewer.getWeightIntensity(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightIntensity(ui.value);}
	});
	
	$( "#sldWeightElevation" ).slider({
		value: viewer.getWeightElevation(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightElevation(ui.value);}
	});
	
	$( "#sldWeightClassification" ).slider({
		value: viewer.getWeightClassification(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightClassification(ui.value);}
	});
	
	$( "#sldWeightReturnNumber" ).slider({
		value: viewer.getWeightReturnNumber(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightReturnNumber(ui.value);}
	});
	
	$( "#sldWeightSourceID" ).slider({
		value: viewer.getWeightSourceID(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setWeightSourceID(ui.value);}
	});

	var updateHeightRange = function(){
		let box = viewer.getBoundingBox();
		let bWidth = box.max.z - box.min.z;
		bMin = box.min.z - 0.2 * bWidth;
		bMax = box.max.z + 0.2 * bWidth;
		
		let hr = viewer.getHeightRange();
		let hrWidth = hr.max - hr.min;
		
		$( '#lblHeightRange')[0].innerHTML = hr.min.toFixed(2) + " to " + hr.max.toFixed(2);
		$( "#sldHeightRange" ).slider({
			min: bMin,
			max: bMax,
			values: [hr.min, hr.max]
		});
	};
	
	let updateIntensityRange = function(){
		let range = viewer.getIntensityRange();
		let min = Math.log2(range[0]) / 16;
		let max = Math.log2(range[1]) / 16;
		
		$('#lblIntensityRange')[0].innerHTML = 
			parseInt(viewer.getIntensityRange()[0]) + " to " + 
			parseInt(viewer.getIntensityRange()[1]);
		$( "#sldIntensityRange" ).slider({
			values: [min, max]
		});
	};
	
	viewer.addEventListener("height_range_changed", updateHeightRange);
	viewer.addEventListener("intensity_range_changed", updateIntensityRange);
	
	viewer.addEventListener("intensity_gamma_changed", function(event){
		let gamma = viewer.getIntensityGamma();
		
		$('#lblIntensityGamma')[0].innerHTML = gamma.toFixed(2);
		$("#sldIntensityGamma").slider({value: gamma});
	});
	
	viewer.addEventListener("intensity_contrast_changed", function(event){
		let contrast = viewer.getIntensityContrast();
		
		$('#lblIntensityContrast')[0].innerHTML = contrast.toFixed(2);
		$("#sldIntensityContrast").slider({value: contrast});
	});
	
	viewer.addEventListener("intensity_brightness_changed", function(event){
		let brightness = viewer.getIntensityBrightness();
		
		$('#lblIntensityBrightness')[0].innerHTML = brightness.toFixed(2);
		$("#sldIntensityBrightness").slider({value: brightness});
	});
	
	viewer.addEventListener("rgb_gamma_changed", function(event){
		let gamma = viewer.getRGBGamma();
		
		$('#lblRGBGamma')[0].innerHTML = gamma.toFixed(2);
		$("#sldRGBGamma").slider({value: gamma});
	});
	
	viewer.addEventListener("rgb_contrast_changed", function(event){
		let contrast = viewer.getRGBContrast();
		
		$('#lblRGBContrast')[0].innerHTML = contrast.toFixed(2);
		$("#sldRGBContrast").slider({value: contrast});
	});
	
	viewer.addEventListener("rgb_brightness_changed", function(event){
		let brightness = viewer.getRGBBrightness();
		
		$('#lblRGBBrightness')[0].innerHTML = brightness.toFixed(2);
		$("#sldRGBBrightness").slider({value: brightness});
	});
	
	viewer.addEventListener("pointcloud_loaded", updateHeightRange);
	
	updateHeightRange();
	updateIntensityRange();
	$('#lblIntensityGamma')[0].innerHTML = viewer.getIntensityGamma().toFixed(2);
	$('#lblIntensityContrast')[0].innerHTML = viewer.getIntensityContrast().toFixed(2);
	$('#lblIntensityBrightness')[0].innerHTML = viewer.getIntensityBrightness().toFixed(2);
	
	$('#lblRGBGamma')[0].innerHTML = viewer.getRGBGamma().toFixed(2);
	$('#lblRGBContrast')[0].innerHTML = viewer.getRGBContrast().toFixed(2);
	$('#lblRGBBrightness')[0].innerHTML = viewer.getRGBBrightness().toFixed(2);

	var options = [ 
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
	
	var elMaterialList = document.getElementById("optMaterial");
	for(var i = 0; i < options.length; i++){
		var option = options[i];
		
		var elOption = document.createElement("option");
		elOption.innerHTML = option;
		elOption.id = "optMaterial_" + option;
		
		elMaterialList.appendChild(elOption);
	}
	
	let updateMaterialPanel = function(event, ui){
		//viewer.setMaterial(ui.item.value);
		
		let selectedValue = $("#optMaterial").selectmenu().val();
		viewer.setMaterial(selectedValue);
		
		let blockWeights = $("#materials\\.composite_weight_container");
		let blockElevation = $("#materials\\.elevation_container");
		let blockRGB = $("#materials\\.rgb_container");
		let blockIntensity = $("#materials\\.intensity_container");
		let blockTransition = $("#materials\\.transition_container");
		
		blockIntensity.css("display", "none");
		blockElevation.css("display", "none");
		blockRGB.css("display", "none");
		blockWeights.css("display", "none");
		blockTransition.css("display", "none");
		
		if(selectedValue === "Composite"){
			blockWeights.css("display", "block");
			blockElevation.css("display", "block");
			blockRGB.css("display", "block");
			blockIntensity.css("display", "block");
		}
		
		if(selectedValue === "Elevation"){
			blockElevation.css("display", "block");
		}
		
		if(selectedValue === "RGB and Elevation"){
			blockRGB.css("display", "block");
			blockElevation.css("display", "block");
		}
		
		if(selectedValue === "RGB"){
			blockRGB.css("display", "block");
		}
		
		if(selectedValue === "Intensity"){
			blockIntensity.css("display", "block");
		}
		
		if(selectedValue === "Intensity Gradient"){
			blockIntensity.css("display", "block");
		}
	};
	
	$("#optMaterial").selectmenu({change: updateMaterialPanel});
	$("#optMaterial").val(viewer.getMaterialName()).selectmenu("refresh");
	updateMaterialPanel();
	
	viewer.addEventListener("material_changed", e => {
		$("#optMaterial").val(viewer.getMaterialName()).selectmenu("refresh");
	});
}

function initClassificationList(){
	var addClassificationItem = function(code, name){
		var elClassificationList = document.getElementById("classificationList");
		
		var elLi = document.createElement("li");
		var elLabel = document.createElement("label");
		var elInput = document.createElement("input");
		var elText = document.createTextNode(" " + name);
		
		elInput.id = "chkClassification_" + code;
		elInput.type = "checkbox";
		elInput.checked = true;
		elInput.onclick = function(event){
			viewer.setClassificationVisibility(code, event.target.checked);
		}
		
		elLabel.style.whiteSpace = "nowrap";
		
		elClassificationList.appendChild(elLi);
		elLi.appendChild(elLabel);
		elLabel.appendChild(elInput);
		elLabel.appendChild(elText);
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

	$( "#optPointSizing" ).selectmenu();
	$( "#optQuality" ).selectmenu();
	
	$("#optPointSizing").val(viewer.getPointSizing()).selectmenu("refresh")
	$("#optPointSizing").selectmenu({
		change: function(event, ui){
			viewer.setPointSizing(ui.item.value);
		}
	});
	
	$("#optQuality").val(viewer.getQuality()).selectmenu("refresh")
	$("#optQuality").selectmenu({
		change: function(event, ui){
			viewer.setQuality(ui.item.value);
		}
	});


	$( "#sldPointBudget" ).slider({
		value: viewer.getPointBudget(),
		min: 100*1000,
		max: 5*1000*1000,
		step: 1000,
		slide: function( event, ui ) {viewer.setPointBudget(ui.value);}
	});
	
	$( "#sldPointSize" ).slider({
		value: viewer.getPointSize(),
		min: 0,
		max: 3,
		step: 0.01,
		slide: function( event, ui ) {viewer.setPointSize(ui.value);}
	});
	
	$( "#sldFOV" ).slider({
		value: viewer.getFOV(),
		min: 20,
		max: 100,
		step: 1,
		slide: function( event, ui ) {viewer.setFOV(ui.value);}
	});
	
	$( "#sldOpacity" ).slider({
		value: viewer.getOpacity(),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) {viewer.setOpacity(ui.value);}
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
	
	viewer.addEventListener("point_size_changed", function(event){
		$('#lblPointSize')[0].innerHTML = viewer.getPointSize().toFixed(2);
		$( "#sldPointSize" ).slider({value: viewer.getPointSize()});
	});
	
	viewer.addEventListener("fov_changed", function(event){
		$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
		$( "#sldFOV" ).slider({value: viewer.getFOV()});
	});
	
	viewer.addEventListener("opacity_changed", function(event){
		$('#lblOpacity')[0].innerHTML = viewer.getOpacity().toFixed(2);
		$( "#sldOpacity" ).slider({value: viewer.getOpacity()});
	});
	
	viewer.addEventListener("point_sizing_changed", e => {
		let type = viewer.pointSizeType;
		let conversion = new Map([
			[Potree.PointSizeType.FIXED, "Fixed"],
			[Potree.PointSizeType.ATTENUATED, "Attenuated"],
			[Potree.PointSizeType.ADAPTIVE, "Adaptive"]
		]);
		
		let typename = conversion.get(type);
		
		$( "#optPointSizing" )
			.selectmenu()
			.val(typename)
			.selectmenu("refresh");
	});
	
	viewer.addEventListener("quality_changed", e => {
		
		let name = viewer.quality;
		
		$( "#optQuality" )
			.selectmenu()
			.val(name)
			.selectmenu("refresh");
	});
	
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
	$('#lblPointSize')[0].innerHTML = viewer.getPointSize().toFixed(2);
	$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
	$('#lblOpacity')[0].innerHTML = viewer.getOpacity().toFixed(2);
	$('#lblEDLRadius')[0].innerHTML = viewer.getEDLRadius().toFixed(1);
	$('#lblEDLStrength')[0].innerHTML = viewer.getEDLStrength().toFixed(1);
	$('#chkEDLEnabled')[0].checked = viewer.getEDLEnabled();
	$("input[name=background][value='" + viewer.getBackground() +  "']").prop("checked",true);
}
	
	
function initNavigation(){

	var elNavigation = document.getElementById("navigation");
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/earth_controls_1.png",
        "[title]tt.earth_control",
		function(){viewer.setNavigationMode(Potree.EarthControls)}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/fps_controls.png",
        "[title]tt.flight_control",
		function(){viewer.setNavigationMode(Potree.FirstPersonControls)}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/orbit_controls.svg",
		"[title]tt.orbit_control",
		function(){viewer.setNavigationMode(Potree.OrbitControls)}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/focus.svg",
		"[title]tt.focus_control",
		function(){viewer.fitToScreen()}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/topview.svg",
		"[title]tt.top_view_control",
		function(){viewer.setTopView()}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/frontview.svg",
		"[title]tt.front_view_control",
		function(){viewer.setFrontView()}
	));
	
	elNavigation.appendChild(createToolIcon(
		Potree.resourcePath + "/icons/leftview.svg",
		"[title]tt.left_view_control",
		function(){viewer.setLeftView()}
	));
	
	var speedRange = new THREE.Vector2(1, 10*1000);
	
	var toLinearSpeed = function(value){
		return Math.pow(value, 4) * speedRange.y + speedRange.x;
	};
	
	var toExpSpeed = function(value){
		return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
	};

	$( "#sldMoveSpeed" ).slider({
		value: toExpSpeed( viewer.getMoveSpeed() ),
		min: 0,
		max: 1,
		step: 0.01,
		slide: function( event, ui ) { viewer.setMoveSpeed(toLinearSpeed(ui.value)); }
	});
	
	viewer.addEventListener("move_speed_changed", function(event){
		$('#lblMoveSpeed')[0].innerHTML = viewer.getMoveSpeed().toFixed(1);
		$( "#sldMoveSpeed" ).slider({value: toExpSpeed(viewer.getMoveSpeed())});
	});
	
	$('#lblMoveSpeed')[0].innerHTML = viewer.getMoveSpeed().toFixed(1);
}

function initAnnotationDetails(){
	
	// annotation_details
	let annotationPanel = $("#annotation_details");
	
	let trackAnnotation = (annotation) => {
		let elLi = document.createElement("li");
		let elItem = document.createElement("div");
		let elMain = document.createElement("span");
		let elLabel = document.createElement("span");
		
		elLi.appendChild(elItem);
		elItem.append(elMain);
		elMain.append(elLabel);
		annotationPanel.append(elLi);
		
		elItem.classList.add("annotation-item");
		
		elMain.style.display = "flex";
		elMain.classList.add("annotation-main");
		
		let elLabelText = document.createTextNode(annotation.ordinal);
		elLabel.appendChild(elLabelText);
		elLabel.classList.add("annotation-label");
		
		let actions = [];
		{ // ACTIONS, INCLUDING GOTO LOCATION
			if(annotation.hasView()){
				let action = {
					"icon": Potree.resourcePath + "/icons/target.svg",
					"onclick": (e) => {annotation.moveHere(viewer.scene.camera)}
				};
				
				actions.push(action);
			}
			
			for(let action of annotation.actions){
				actions.push(action);
			}
		}
		
		// FIRST ACTION
		if(actions.length > 0){
			let action = actions[0];
			let elIcon = document.createElement("img");
			elIcon.src = action.icon;
			elIcon.classList.add("annotation-icon");
			elMain.appendChild(elIcon);
			elMain.onclick = (e) => {
				action.onclick(e);
			};
			
			elMain.onmouseover = (e) => {
				elIcon.style.opacity = 1;
			};
			
			elMain.onmouseout = (e) => {
				elIcon.style.opacity = 0.5;
			};
			
			actions.splice(0, 1);
		}
		
		// REMAINING ACTIONS
		for(let action of actions){
			let elIcon = document.createElement("img");
			elIcon.src = action.icon;
			elIcon.classList.add("annotation-icon");
			
			elIcon.onmouseover = (e) => {
				elIcon.style.opacity = 1;
			};
			
			elIcon.onmouseout = (e) => {
				elIcon.style.opacity = 0.5;
			};
			
			elIcon.onclick = (e) => {
				action.onclick(e);
			};
			
			elItem.appendChild(elIcon);
		}
		
		elItem.onmouseover = (e) => {
			annotation.setHighlighted(true);
			
		};
		elItem.onmouseout = (e) => {
			annotation.setHighlighted(false);
		};
		
		annotation.setHighlighted(false);
	};
	
	let annotationAddedCallback = (e) => {
		trackAnnotation(e.annotation);
	};
	
	let setScene = (e) => {
		
		annotationPanel.empty();
		
		if(e.oldScene){
			if(e.oldScene.hasEventListener("annotation_added", annotationAddedCallback)){
				e.oldScene.removeEventListener("annotation_added", annotationAddedCallback);
			}
		}
		
		if(e.scene){
			for(let annotation of e.scene.annotations){
				trackAnnotation(annotation);
			}
			
			e.scene.addEventListener("annotation_added", annotationAddedCallback);
		}
		
	};
	
	setScene({
		"scene": viewer.scene
	});
	
	viewer.addEventListener("scene_changed", setScene);
}

function initMeasurementDetails(){

	var id = 0;
	let trackedItems = new Map();
	
	var trackMeasurement = function(scene, measurement){
		id++;
		
		let track = {
			scene: scene,
			measurement: measurement,
			untrack: null
		};
		
		trackedItems.set(measurement, track);
	
		var elLi = document.createElement("li");
		var elPanel = document.createElement("div");
		var elPanelHeader = document.createElement("div");
		var elPanelBody = document.createElement("div");
		var elPanelIcon = document.createElement("img");
		var elPanelStretch = document.createElement("span");
		var elPanelRemove = document.createElement("img");
		
		elPanel.classList.add("potree-panel", "panel-default");
		elPanelHeader.classList.add("potree-panel-heading", "pv-panel-heading");
		
		if(measurement instanceof Potree.Measure){
			if(measurement.showDistances && !measurement.showArea && !measurement.showAngles){
				elPanelIcon.src = Potree.resourcePath + "/icons/distance.svg";
				elPanelStretch.innerHTML = "Distance";
			}else if(measurement.showDistances && measurement.showArea && !measurement.showAngles){
				elPanelIcon.src = Potree.resourcePath + "/icons/area.svg";
				elPanelStretch.innerHTML = "Area";
			}else if(measurement.maxMarkers === 1){
				elPanelIcon.src = Potree.resourcePath + "/icons/point.svg";
				elPanelStretch.innerHTML = "Coordinate";
			}else if(!measurement.showDistances && !measurement.showArea && measurement.showAngles){
				elPanelIcon.src = Potree.resourcePath + "/icons/angle.png";
				elPanelStretch.innerHTML = "Angle";
			}else if(measurement.showHeight){
				elPanelIcon.src = Potree.resourcePath + "/icons/height.svg";
				elPanelStretch.innerHTML = "Height";
			}
			
			elPanelRemove.onclick = function(){scene.removeMeasurement(measurement);};
		} else if(measurement instanceof Potree.Profile){
			elPanelIcon.src = Potree.resourcePath + "/icons/profile.svg";
			elPanelStretch.innerHTML = "Profile";
			
			elPanelRemove.onclick = function(){scene.removeProfile(measurement);};
		} else if(measurement instanceof Potree.Volume){
			elPanelIcon.src = Potree.resourcePath + "/icons/volume.svg";
			elPanelStretch.innerHTML = "Volume";
			
			elPanelRemove.onclick = function(){scene.removeVolume(volume);};
		}
		
		elPanelIcon.style.width = "16px";
		elPanelIcon.style.height = "16px";
		elPanelStretch.style.flexGrow = 1;
		elPanelStretch.style.textAlign = "center";
		elPanelRemove.src = Potree.resourcePath + "/icons/remove.svg";
		elPanelRemove.style.width = "16px";
		elPanelRemove.style.height = "16px";
		elPanelBody.classList.add("panel-body");
		
		elLi.appendChild(elPanel);
		elPanel.appendChild(elPanelHeader);
		elPanelHeader.appendChild(elPanelIcon);
		elPanelHeader.appendChild(elPanelStretch);
		elPanelHeader.appendChild(elPanelRemove);
		elPanel.appendChild(elPanelBody);
		
		document.getElementById("measurement_details").appendChild(elLi);
		
		let widthListener = null;
		var updateDisplay = function(event){
		
			$(elPanelBody).empty();
			
			if(measurement instanceof Potree.Profile){
				var elLi = $('<li style="margin-bottom: 5px">');
				var elText = document.createTextNode("width: ");
				var elWidthLabel = $('<span id="lblProfileWidth_' + id + '">');
				var elWidthSlider = $('<div id="sldProfileWidth_' + id + '">');
				
				elWidthSlider.slider({
					value: Math.pow((measurement.getWidth() / 1000), 1/4).toFixed(3),
					min: 0,
					max: 1,
					step: 0.01,
					slide: function(event, ui){
						var val = Math.pow(ui.value, 4) * 1000;
						measurement.setWidth(val);
					}
				});
				if(measurement.getWidth()){
					elWidthLabel.html(Potree.utils.addCommas(measurement.getWidth().toFixed(3)));
				}else{
					elWidthLabel.html("-");
				}
				
				if(widthListener === null){
					widthListener = function(event){
						var val = Math.pow((event.width / 1000), 1/4);
						elWidthLabel.html(Potree.utils.addCommas(event.width.toFixed(3)));
						elWidthSlider.slider({value: val});
					};
				}
				if(!measurement.hasEventListener("width_changed", widthListener)){
					measurement.addEventListener("width_changed", widthListener);
				}
				
				elLi.append(elText);
				elLi.append(elWidthLabel);
				elLi.append(elWidthSlider);
				
				elPanelBody.appendChild(elLi[0]);
			}
			
			var positions = [];
			var points;
			
			if(measurement instanceof Potree.Measure){
				points = measurement.points;
				for(var i = 0; i < points.length; i++){
					positions.push(points[i].position);
				}
			} else if(measurement instanceof Potree.Profile){
				positions = measurement.points;
			}
			
			if(measurement instanceof Potree.Measure && measurement.showHeight){
				let points = measurement.points;
				
				let sorted = points.slice().sort( (a, b) => a.position.z - b.position.z );
				let lowPoint = sorted[0].position.clone();
				let highPoint = sorted[sorted.length - 1].position.clone();
				let min = lowPoint.z;
				let max = highPoint.z;
				let height = max - min;
				
				let txt = height.toFixed(3);
				
				var elNodeHeight = $('<div>').addClass("measurement-detail-node-marker");
				elNodeHeight.html(txt);
				$(elPanelBody).append(elNodeHeight);
			}
			
			for(var i = 0; i < positions.length; i++){
				// TODO clean this up from the toGeo legacy
				var point = positions[i];
				var geoCoord = point;
	
				var txt = geoCoord.x.toFixed(2) + ", ";
				txt += (geoCoord.y).toFixed(2) + ", ";
				txt += geoCoord.z.toFixed(2);
				
				if(measurement && !measurement.showHeight){
					var elNodeMarker = $('<div>').addClass("measurement-detail-node-marker");
					elNodeMarker.html(txt);
					$(elPanelBody).append(elNodeMarker);
				}
				
				if(i < positions.length - 1){
					if(measurement && measurement.showDistances){
						
						var elEdge = $('<div>').addClass("measurement-detail-edge");
						$(elPanelBody).append(elEdge);
						
						var nextPoint = positions[i+1];
						var nextGeo = nextPoint;
						var distance = nextGeo.distanceTo(geoCoord);
						var txt = Potree.utils.addCommas(distance.toFixed(2));
						
						var elNodeDistance = $('<div>').addClass("measurement-detail-node-distance");
						elNodeDistance.html(txt);
						
						$(elPanelBody).append(elNodeDistance);
						
					}
				}
				
				if(measurement && measurement.showAngles){
					var elEdge = $('<div>').addClass("measurement-detail-edge");
					$(elPanelBody).append(elEdge);
					
					var angle = measurement.getAngle(i);
					var txt = Potree.utils.addCommas((angle*(180.0/Math.PI)).toFixed(1)) + '\u00B0';
					var elNodeAngle = $('<div>').addClass("measurement-detail-node-angle");
					elNodeAngle.html(txt);
					$(elPanelBody).append(elNodeAngle);
				}
				
				if(i < positions.length - 1){
					var elEdge = $('<div>').addClass("measurement-detail-edge");
					$(elPanelBody).append(elEdge);
				}
			}
			
			if(points && points.length === 1){
				var point = points[0];
				
				var elTable = $('<table>').css("width", "100%");
				$(elPanelBody).append(elTable);
				
				if(point.color){
					var color = point.color;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					var value = parseInt(color[0]) 
						+ ", " + parseInt(color[1]) 
						+ ", " + parseInt(color[2]);
					
					elKey.html("rgb");
					elValue.html(value);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				if(typeof point.intensity !== "undefined"){
					var intensity = point.intensity;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					elKey.html("intensity");
					elValue.html(intensity);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				if(typeof point.classification !== "undefined"){
					var classification = point.classification;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					elKey.html("classification");
					elValue.html(classification);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				if(typeof point.returnNumber !== "undefined"){
					var returnNumber = point.returnNumber;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					elKey.html("return nr.");
					elValue.html(returnNumber);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				if(typeof point.pointSourceID !== "undefined"){
					var source = point.pointSourceID;
					
					var elTr = $('<tr>');
					var elKey = $('<td>').css("padding", "1px 5px");
					var elValue = $('<td>').css("width", "100%").css("padding", "1px 5px");
					
					elKey.html("source");
					elValue.html(source);
					
					elTable.append(elTr);
					elTr.append(elKey);
					elTr.append(elValue);
				}
				
				
			}
			
			if(measurement && measurement.showDistances && measurement.points.length > 1){
				var txt = "Total: " + Potree.utils.addCommas(measurement.getTotalDistance().toFixed(3));
				
				var elNodeTotalDistance = $('<div>').addClass("measurement-detail-node-distance");
				elNodeTotalDistance.html(txt);
				
				$(elPanelBody).append(elNodeTotalDistance);
			}
			
			if(measurement && measurement.showArea){
				var txt = Potree.utils.addCommas(measurement.getArea().toFixed(1)) + "\u00B2";
				
				var elNodeArea = $('<div>').addClass("measurement-detail-node-area");
				elNodeArea.html(txt);
				
				$(elPanelBody).append(elNodeArea);
			}
			
			if(measurement instanceof Potree.Profile){
				var elOpenProfileWindow = $('<input type="button" value="show 2d profile">')
					.addClass("measurement-detail-button");
				elOpenProfileWindow[0].onclick = function(){
					viewer._2dprofile.show();
					viewer._2dprofile.draw(measurement);
				};
				$(elPanelBody).append(elOpenProfileWindow);
			}
			
			let doExport = measurement.showDistances && !measurement.showAngles;
			if(doExport){
				let elBottomBar = $(`<span style="display:flex">
					<span style="flex-grow: 1"></span>
				</span>`);
				$(elPanelBody).append(elBottomBar);
				
				{
					let icon = Potree.resourcePath + "/icons/file_geojson.svg";
					let elDownload = $(`<a href="#" download="measure.json" class="measurepanel_downloads"><img src="${icon}"></img></a>`);
					
					elDownload.click(function(e){
						let geojson = Potree.GeoJSONExporter.toString(measurement);
						let url = window.URL.createObjectURL(new Blob([geojson], {type: 'data:application/octet-stream'}));
						elDownload.attr("href", url);
					});
					
					elBottomBar.append(elDownload);
				}
				
				{
					let icon = Potree.resourcePath + "/icons/file_dxf.svg";
					let elDownload = $(`<a href="#" download="measure.dxf" class="measurepanel_downloads"><img src="${icon}"></img></a>`);
					
					elDownload.click(function(e){
						let dxf = Potree.DXFExporter.toString(measurement);
						let url = window.URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
						elDownload.attr("href", url);
					});
					
					elBottomBar.append(elDownload);
				}
			}
		};
		
		updateDisplay();
		
		if(measurement instanceof Potree.Measure){
			let onremove = function(event){
				if(event.measurement === measurement){
					//scene.removeEventListener("marker_added", updateDisplay);
					//scene.removeEventListener("marker_removed", updateDisplay);
					//scene.removeEventListener("marker_moved", updateDisplay);
					$(elLi).remove();
				}
			};
		
			measurement.addEventListener("marker_added", updateDisplay);
			measurement.addEventListener("marker_removed", updateDisplay);
			measurement.addEventListener("marker_moved", updateDisplay);
			scene.addEventListener("measurement_removed", onremove);
			
			track.stopTracking = (e) => {
				measurement.removeEventListener("marker_added", updateDisplay);
				measurement.removeEventListener("marker_removed", updateDisplay);
				measurement.removeEventListener("marker_moved", updateDisplay);
				scene.removeEventListener("measurement_added", onremove);
				scene.removeEventListener("measurement_removed", onremove);
			};
		} else if(measurement instanceof Potree.Profile){
			let onremove = function(event){
				if(event.profile === measurement){
					scene.removeEventListener("marker_added", updateDisplay);
					scene.removeEventListener("marker_removed", updateDisplay);
					scene.removeEventListener("marker_moved", updateDisplay);
					$(elLi).remove();
				}
			};
		
			measurement.addEventListener("marker_added", updateDisplay);
			measurement.addEventListener("marker_removed", updateDisplay);
			measurement.addEventListener("marker_moved", updateDisplay);
			scene.addEventListener("profile_removed", onremove);
			
			track.stopTracking = (e) => {
				measurement.removeEventListener("marker_added", updateDisplay);
				measurement.removeEventListener("marker_removed", updateDisplay);
				measurement.removeEventListener("marker_moved", updateDisplay);
				scene.removeEventListener("profile_added", onremove);
				scene.removeEventListener("profile_removed", onremove);
			};
		}
		
	};
	
	let scenelistener = (e) => {
		if(e.measurement){
			trackMeasurement(e.scene, e.measurement);
		} else if(e.profile){
			trackMeasurement(e.scene, e.profile);
			
			viewer._2dprofile.show();
			viewer._2dprofile.draw(e.profile);
		}
	};
	
	let trackScene = (scene) => {
		$("#measurement_details").empty();
		
		trackedItems.forEach(function(trackedItem, key, map){
			trackedItem.stopTracking();
		});
		
		for(var i = 0; i < scene.measurements.length; i++){
			trackMeasurement(scene, scene.measurements[i]);
		}
		
		for(var i = 0; i < scene.profiles.length; i++){
			trackMeasurement(scene, scene.profiles[i]);
		}
		
		if(!scene.hasEventListener("measurement_added", scenelistener)){
			scene.addEventListener("measurement_added", scenelistener);
		}
		
		if(!scene.hasEventListener("profile_added", scenelistener)){
			scene.addEventListener("profile_added", scenelistener);
		}
	};
	
	trackScene(viewer.scene);
	
	viewer.addEventListener("scene_changed", (e) => {trackScene(e.scene)});
};

function initSceneList(){

	var scenelist = $('#sceneList');
	
	var id = 0;
	// this works but it looks so wrong. any better way to create a closure around pointcloud?
	var addPointcloud = function(pointcloud){
		(function(pointcloud){
			var elLi = $('<li>');
			var elLabel = $('<label>');
			var elInput = $('<input type="checkbox">');
			
			elInput[0].checked = pointcloud.visible;
			elInput[0].id = "scene_list_item_pointcloud_" + id;
			elLabel[0].id = "scene_list_item_label_pointcloud_" + id;
			elLabel[0].htmlFor = "scene_list_item_pointcloud_" + id;
			elLabel.addClass("menu-item");
			elInput.click(function(event){
				pointcloud.visible = event.target.checked;
				if(viewer._2dprofile){
					viewer._2dprofile.redraw();
				}
			});
			
			elLi.append(elLabel);
			elLabel.append(elInput);
			var pointcloudName = " " + (pointcloud.name ? pointcloud.name : "point cloud " + id);
			var elPointCloudName = document.createTextNode(pointcloudName);
			elLabel.append(elPointCloudName);
			
			scenelist.append(elLi);
			
			pointcloud.addEventListener("name_changed", function(e){
				if(e.name){
					elPointCloudName.textContent = " " + e.name;
				}else{
					elPointCloudName.textContent = " point cloud " + id;
				}
			});
			
			id++;
		})(pointcloud);
	};
	
	for(var i = 0; i < viewer.scene.pointclouds.length; i++){
		var pointcloud = viewer.scene.pointclouds[i];
		addPointcloud(pointcloud);
	}
	
	viewer.addEventListener("scene_changed", (e) => {
		scenelist.empty();
		
		let scene = e.scene;
		for(var i = 0; i < scene.pointclouds.length; i++){
			var pointcloud = scene.pointclouds[i];
			addPointcloud(pointcloud);
		}
	});
	
	// TODO update scene list on scene switch
	viewer.addEventListener("pointcloud_loaded", function(event){
		addPointcloud(event.pointcloud);
	});
	
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

initSettings = function(){
	//<li>Min Node Size: <span id="lblMinNodeSize"></span><div id="sldMinNodeSize"></div>	</li>
	
	$( "#sldMinNodeSize" ).slider({
		value: viewer.getMinNodeSize(),
		min: 0,
		max: 1000,
		step: 0.01,
		slide: function( event, ui ) {viewer.setMinNodeSize(ui.value);}
	});
	
	viewer.addEventListener("minnodesize_changed", function(event){
		$('#lblMinNodeSize')[0].innerHTML = parseInt(viewer.getMinNodeSize());
		$( "#lblMinNodeSize" ).slider({value: viewer.getMinNodeSize()});
	});
	
	
	var toClipModeCode = function(string){
		if(string === "No Clipping"){
			return Potree.ClipMode.DISABLED;
		}else if(string === "Highlight Inside"){
			return Potree.ClipMode.HIGHLIGHT_INSIDE;
		}else if(string === "Clip Outside"){
			return Potree.ClipMode.CLIP_OUTSIDE;
		}
	};
	
	var toClipModeString = function(code){
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
	initMaterials();
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