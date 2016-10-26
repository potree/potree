


function Potree(){
	
}
Potree.version = {
	major: 1,
	minor: 4,
	suffix: "RC"
};

console.log("Potree " + Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);

Potree.pointBudget = 1*1000*1000;

// contains WebWorkers with base64 encoded code
Potree.workers = {};

Potree.Shaders = {};

Potree.webgl = {
	shaders: {},
	vaos: {},
	vbos: {}
};

Potree.scriptPath = null;
if(document.currentScript.src){
		Potree.scriptPath = new URL(document.currentScript.src + "/..").href;
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
	
	var ext = gl.getExtension("EXT_disjoint_timer_query");
	var query = ext.createQueryEXT();
	ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);
	
	Potree.timerQueries[name].push(query);
	
	return query;
};

Potree.endQuery = function(query, gl){
	if(!Potree.timerQueriesEnabled){
		return;
	}
	
	var ext = gl.getExtension("EXT_disjoint_timer_query");
	ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
};

Potree.resolveQueries = function(gl){
	if(!Potree.timerQueriesEnabled){
		return;
	}
	
	var ext = gl.getExtension("EXT_disjoint_timer_query");
	
	for(var name in Potree.timerQueries){
		var queries = Potree.timerQueries[name];
		
		if(queries.length > 0){
			var query = queries[0];
			
			var available = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT);
			var disjoint = viewer.renderer.getContext().getParameter(ext.GPU_DISJOINT_EXT);
			
			if (available && !disjoint) {
				// See how much time the rendering of the object took in nanoseconds.
				var timeElapsed = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
				var miliseconds = timeElapsed / (1000 * 1000);
			
				console.log(name + ": " + miliseconds + "ms");
				queries.shift();
			}
		}
		
		if(queries.length === 0){
			delete Potree.timerQueries[name];
		}
	}
}


Potree.updatePointClouds = function(pointclouds, camera, renderer){
	
	if(!Potree.lru){
		Potree.lru = new LRU();
	}

	for(var i = 0; i < pointclouds.length; i++){
		var pointcloud = pointclouds[i];
		for(var j = 0; j < pointcloud.profileRequests.length; j++){
			pointcloud.profileRequests[j].update();
		}
	}
	
	var result = Potree.updateVisibility(pointclouds, camera, renderer);
	
	for(var i = 0; i < pointclouds.length; i++){
		var pointcloud = pointclouds[i];
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


Potree.updateVisibility = function(pointclouds, camera, renderer){
	var numVisibleNodes = 0;
	var numVisiblePoints = 0;
	
	var visibleNodes = [];
	var visibleGeometry = [];
	var unloadedGeometry = [];
	
	var frustums = [];
	var camObjPositions = [];

	// calculate object space frustum and cam pos and setup priority queue
	var priorityQueue = new BinaryHeap(function(x){return 1 / x.weight;});
	for(var i = 0; i < pointclouds.length; i++){
		var pointcloud = pointclouds[i];
		
		if(!pointcloud.initialized()){
			continue;
		}
		
		pointcloud.numVisibleNodes = 0;
		pointcloud.numVisiblePoints = 0;
		pointcloud.visibleNodes = [];
		pointcloud.visibleGeometry = [];
		
		// frustum in object space
		camera.updateMatrixWorld();
		var frustum = new THREE.Frustum();
		var viewI = camera.matrixWorldInverse;
		var world = pointcloud.matrixWorld;
		var proj = camera.projectionMatrix;
		var fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
		frustum.setFromMatrix( fm );
		frustums.push(frustum);
		
		// camera position in object space
		var view = camera.matrixWorld;
		var worldI = new THREE.Matrix4().getInverse(world);
		var camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
		var camObjPos = new THREE.Vector3().setFromMatrixPosition( camMatrixObject );
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
		
		for(var j = 0; j < pointcloud.boundingBoxNodes.length; j++){
			pointcloud.boundingBoxNodes[j].visible = false;
		}
	}
	
	while(priorityQueue.size() > 0){
		var element = priorityQueue.pop();
		var node = element.node;
		var parent = element.parent;
		var pointcloud = pointclouds[element.pointcloud];
		
		var box = node.getBoundingBox();
		var frustum = frustums[element.pointcloud];
		var camObjPos = camObjPositions[element.pointcloud];
		
		var insideFrustum = frustum.intersectsBox(box);
		var visible = insideFrustum;
		visible = visible && !(numVisiblePoints + node.getNumPoints() > Potree.pointBudget);
		var maxLevel = pointcloud.maxLevel || Infinity;
		visible = visible && node.getLevel() < maxLevel;
		
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
				var boxHelper = new THREE.BoxHelper(node.sceneNode);
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
		var children = node.getChildren();
		for(var i = 0; i < children.length; i++){
			var child = children[i];
			
			var sphere = child.getBoundingSphere();
			var distance = sphere.center.distanceTo(camObjPos);
			var radius = sphere.radius;
			
			//var fov = camera.fov / 2 * Math.PI / 180.0;
			//var pr = 1 / Math.tan(fov) * radius / Math.sqrt(distance * distance - radius * radius);
			//var screenPixelRadius = renderer.domElement.clientHeight * pr;
			
			var fov = (camera.fov * Math.PI) / 180;
			var slope = Math.tan(fov / 2);
			var projFactor = (0.5 * renderer.domElement.clientHeight) / (slope * distance);
			var screenPixelRadius = radius * projFactor;
			
			if(screenPixelRadius < pointcloud.minimumNodePixelSize){
				continue;
			}
			
			var weight = screenPixelRadius;
			if(distance - radius < 0){
				weight = Number.MAX_VALUE;
			}
			
			priorityQueue.push({pointcloud: element.pointcloud, node: child, parent: node, weight: weight});
		}
		
		
	}// end priority queue loop
	
	for(var i = 0; i < Math.min(5, unloadedGeometry.length); i++){
		unloadedGeometry[i].load();
	}
	
	return {visibleNodes: visibleNodes, numVisiblePoints: numVisiblePoints};
};

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
	var program = gl.createProgram();
	gl.attachShader(program, vs);
	gl.attachShader(program, fs);
	gl.linkProgram(program);
	var success = gl.getProgramParameter(program, gl.LINK_STATUS);
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
			var uniform = gl.getActiveUniform(program, i);
			var name = uniform.name;
			var loc = gl.getUniformLocation(program, name);

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



















