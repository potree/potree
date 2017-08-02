
function Potree () {

}
Potree.version = {
	major: 1,
	minor: 5,
	suffix: 'RC'
};

console.log('Potree ' + Potree.version.major + '.' + Potree.version.minor + Potree.version.suffix);

Potree.pointBudget = 1 * 1000 * 1000;

Potree.framenumber = 0;

// contains WebWorkers with base64 encoded code
// Potree.workers = {};

Potree.Shaders = {};

Potree.webgl = {
	shaders: {},
	vaos: {},
	vbos: {}
};

Potree.scriptPath = null;
if (document.currentScript.src) {
	Potree.scriptPath = new URL(document.currentScript.src + '/..').href;
	if (Potree.scriptPath.slice(-1) === '/') {
		Potree.scriptPath = Potree.scriptPath.slice(0, -1);
	}
} else {
	console.error('Potree was unable to find its script path using document.currentScript. Is Potree included with a script tag? Does your browser support this function?');
}

Potree.resourcePath = Potree.scriptPath + '/resources';

Potree.timerQueries = {};

Potree.timerQueriesEnabled = false;

Potree.startQuery = function (name, gl) {
	if (!Potree.timerQueriesEnabled) {
		return null;
	}

	if (Potree.timerQueries[name] === undefined) {
		Potree.timerQueries[name] = [];
	}

	let ext = gl.getExtension('EXT_disjoint_timer_query');
	let query = ext.createQueryEXT();
	ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);

	Potree.timerQueries[name].push(query);

	return query;
};

Potree.endQuery = function (query, gl) {
	if (!Potree.timerQueriesEnabled) {
		return;
	}

	let ext = gl.getExtension('EXT_disjoint_timer_query');
	ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
};

Potree.resolveQueries = function (gl) {
	if (!Potree.timerQueriesEnabled) {
		return;
	}

	let ext = gl.getExtension('EXT_disjoint_timer_query');

	for (let name in Potree.timerQueries) {
		let queries = Potree.timerQueries[name];

		if (queries.length > 0) {
			let query = queries[0];

			let available = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT);
			let disjoint = viewer.renderer.getContext().getParameter(ext.GPU_DISJOINT_EXT);

			if (available && !disjoint) {
				// See how much time the rendering of the object took in nanoseconds.
				let timeElapsed = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
				let miliseconds = timeElapsed / (1000 * 1000);

				console.log(name + ': ' + miliseconds + 'ms');
				queries.shift();
			}
		}

		if (queries.length === 0) {
			delete Potree.timerQueries[name];
		}
	}
};

Potree.MOUSE = {
	LEFT: 0b0001,
	RIGHT: 0b0010,
	MIDDLE: 0b0100
};

Potree.Points = class Points {
	constructor () {
		this.boundingBox = new THREE.Box3();
		this.numPoints = 0;
		this.data = {};
	}

	add (points) {
		let currentSize = this.numPoints;
		let additionalSize = points.numPoints;
		let newSize = currentSize + additionalSize;

		let thisAttributes = Object.keys(this.data);
		let otherAttributes = Object.keys(points.data);
		let attributes = new Set([...thisAttributes, ...otherAttributes]);

		for (let attribute of attributes) {
			if (thisAttributes.includes(attribute) && otherAttributes.includes(attribute)) {
				// attribute in both, merge
				let Type = this.data[attribute].constructor;
				let merged = new Type(this.data[attribute].length + points.data[attribute].length);
				merged.set(this.data[attribute], 0);
				merged.set(points.data[attribute], this.data[attribute].length);
				this.data[attribute] = merged;
			} else if (thisAttributes.includes(attribute) && !otherAttributes.includes(attribute)) {
				// attribute only in this; take over this and expand to new size
				let elementsPerPoint = this.data[attribute].length / this.numPoints;
				let Type = this.data[attribute].constructor;
				let expanded = new Type(elementsPerPoint * newSize);
				expanded.set(this.data[attribute], 0);
				this.data[attribute] = expanded;
			} else if (!thisAttributes.includes(attribute) && otherAttributes.includes(attribute)) {
				// attribute only in points to be added; take over new points and expand to new size
				let elementsPerPoint = points.data[attribute].length / points.numPoints;
				let Type = points.data[attribute].constructor;
				let expanded = new Type(elementsPerPoint * newSize);
				expanded.set(points.data[attribute], elementsPerPoint * currentSize);
				this.data[attribute] = expanded;
			}
		}

		this.numPoints = newSize;

		this.boundingBox.union(points.boundingBox);
	}
};

/* eslint-disable standard/no-callback-literal */
Potree.loadPointCloud = function (path, name, callback) {
	let loaded = function (pointcloud) {
		pointcloud.name = name;
		callback({type: 'pointcloud_loaded', pointcloud: pointcloud});
	};

	// load pointcloud
	if (!path) {
		// TODO: callback? comment? Hello? Bueller? Anyone?
	} else if (path.indexOf('greyhound://') === 0) {
		// We check if the path string starts with 'greyhound:', if so we assume it's a greyhound server URL.
		Potree.GreyhoundLoader.load(path, function (geometry) {
			if (!geometry) {
				callback({type: 'loading_failed'});
			} else {
				let pointcloud = new Potree.PointCloudOctree(geometry);
				loaded(pointcloud);
			}
		});
	} else if (path.indexOf('cloud.js') > 0) {
		Potree.POCLoader.load(path, function (geometry) {
			if (!geometry) {
				callback({type: 'loading_failed'});
			} else {
				let pointcloud = new Potree.PointCloudOctree(geometry);
				loaded(pointcloud);
			}
		});
	} else if (path.indexOf('.vpc') > 0) {
		Potree.PointCloudArena4DGeometry.load(path, function (geometry) {
			if (!geometry) {
				callback({type: 'loading_failed'});
			} else {
				let pointcloud = new Potree.PointCloudArena4D(geometry);
				loaded(pointcloud);
			}
		});
	} else {
		callback({'type': 'loading_failed'});
	}
};
/* eslint-enable standard/no-callback-literal */

Potree.updatePointClouds = function (pointclouds, camera, renderer) {
	if (!Potree.lru) {
		Potree.lru = new LRU();
	}

	for (let i = 0; i < pointclouds.length; i++) {
		let pointcloud = pointclouds[i];
		for (let j = 0; j < pointcloud.profileRequests.length; j++) {
			pointcloud.profileRequests[j].update();
		}
	}

	let result = Potree.updateVisibility(pointclouds, camera, renderer);

	for (let i = 0; i < pointclouds.length; i++) {
		let pointcloud = pointclouds[i];
		pointcloud.updateMaterial(pointcloud.material, pointcloud.visibleNodes, camera, renderer);
		pointcloud.updateVisibleBounds();
	}

	Potree.getLRU().freeMemory();

	return result;
};

Potree.getLRU = function () {
	if (!Potree.lru) {
		Potree.lru = new LRU();
	}

	return Potree.lru;
};

function updateVisibilityStructures (pointclouds, camera, renderer) {
	let frustums = [];
	let camObjPositions = [];
	let priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

	for (let i = 0; i < pointclouds.length; i++) {
		let pointcloud = pointclouds[i];

		if (!pointcloud.initialized()) {
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
		frustum.setFromMatrix(fm);
		frustums.push(frustum);

		// camera position in object space
		let view = camera.matrixWorld;
		let worldI = new THREE.Matrix4().getInverse(world);
		let camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
		let camObjPos = new THREE.Vector3().setFromMatrixPosition(camMatrixObject);
		camObjPositions.push(camObjPos);

		if (pointcloud.visible && pointcloud.root !== null) {
			priorityQueue.push({pointcloud: i, node: pointcloud.root, weight: Number.MAX_VALUE});
		}

		// hide all previously visible nodes
		// if(pointcloud.root instanceof Potree.PointCloudOctreeNode){
		//	pointcloud.hideDescendants(pointcloud.root.sceneNode);
		// }
		if (pointcloud.root.isTreeNode()) {
			pointcloud.hideDescendants(pointcloud.root.sceneNode);
		}

		for (let j = 0; j < pointcloud.boundingBoxNodes.length; j++) {
			pointcloud.boundingBoxNodes[j].visible = false;
		}
	}

	return {
		'frustums': frustums,
		'camObjPositions': camObjPositions,
		'priorityQueue': priorityQueue
	};
}

Potree.getDEMWorkerInstance = function () {
	if (!Potree.DEMWorkerInstance) {
		let workerPath = Potree.scriptPath + '/workers/DEMWorker.js';
		Potree.DEMWorkerInstance = Potree.workerPool.getWorker(workerPath);
	}

	return Potree.DEMWorkerInstance;
};

/*
function createDEMMesh (dem) {
	let box = dem.boundingBox;

	let steps = 256;
	let triangles = [];
	for (let i = 0; i < steps; i++) {
		for (let j = 0; j < steps; j++) {
			let u0 = i / steps;
			let u1 = (i + 1) / steps;
			let v0 = j / steps;
			let v1 = (j + 1) / steps;

			// let x0 = box.min.x + u0 * box.getSize().x;
			// let x1 = box.min.x + u1 * box.getSize().x;
			// let y0 = box.min.y + v0 * box.getSize().y;
			// let y1 = box.min.y + v1 * box.getSize().y;
			//
			// let h00 = dem.height(new THREE.Vector3(x0, y0, 0));
			// let h10 = dem.height(new THREE.Vector3(x1, y0, 0));
			// let h01 = dem.height(new THREE.Vector3(x0, y1, 0));
			// let h11 = dem.height(new THREE.Vector3(x1, y1, 0));

			let x0 = u0 * box.getSize().x;
			let x1 = u1 * box.getSize().x;
			let y0 = v0 * box.getSize().y;
			let y1 = v1 * box.getSize().y;

			// let h00 = demNode.data[(i+0) + tileSize * (j+0)];
			// let h10 = demNode.data[(i+1) + tileSize * (j+0)];
			// let h01 = demNode.data[(i+0) + tileSize * (j+1)];
			// let h11 = demNode.data[(i+1) + tileSize * (j+1)];

			let h00 = dem.height(new THREE.Vector3(box.min.x + x0, box.min.y + y0));
			let h10 = dem.height(new THREE.Vector3(box.min.x + x1, box.min.y + y0));
			let h01 = dem.height(new THREE.Vector3(box.min.x + x0, box.min.y + y1));
			let h11 = dem.height(new THREE.Vector3(box.min.x + x1, box.min.y + y1));

			if (![h00, h10, h01, h11].every(n => isFinite(n))) {
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
	geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.computeBoundingSphere();
	geometry.computeVertexNormals();
	let material = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
	let mesh = new THREE.Mesh(geometry, material);
	mesh.position.copy(box.min);
	// mesh.position.copy(pointcloud.position);
	viewer.scene.scene.add(mesh);
}
*/

/*
function createDEMMeshNode (dem, demNode) {
	let box = demNode.box;
	let tileSize = dem.tileSize * 1;

	let triangles = [];
	for (let i = 0; i < tileSize; i++) {
		// for(let j = 0; j < 1; j++){
		for (let j = 0; j < tileSize; j++) {
			let u0 = i / tileSize;
			let u1 = (i + 1) / tileSize;
			let v0 = j / tileSize;
			let v1 = (j + 1) / tileSize;

			let x0 = u0 * box.getSize().x;
			let x1 = u1 * box.getSize().x;
			let y0 = v0 * box.getSize().y;
			let y1 = v1 * box.getSize().y;

			// let h00 = demNode.data[(i+0) + tileSize * (j+0)];
			// let h10 = demNode.data[(i+1) + tileSize * (j+0)];
			// let h01 = demNode.data[(i+0) + tileSize * (j+1)];
			// let h11 = demNode.data[(i+1) + tileSize * (j+1)];

			let h00 = demNode.height(new THREE.Vector3(box.min.x + x0, box.min.y + y0));
			let h10 = demNode.height(new THREE.Vector3(box.min.x + x1, box.min.y + y0));
			let h01 = demNode.height(new THREE.Vector3(box.min.x + x0, box.min.y + y1));
			let h11 = demNode.height(new THREE.Vector3(box.min.x + x1, box.min.y + y1));

			if (![h00, h10, h01, h11].every(n => isFinite(n))) {
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
	geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.computeBoundingSphere();
	geometry.computeVertexNormals();
	let material = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
	let mesh = new THREE.Mesh(geometry, material);
	mesh.position.copy(box.min);
	// mesh.position.copy(pointcloud.position);
	viewer.scene.scene.add(mesh);

	{ // DEBUG code
		// let data = demNode.data;

		let steps = 64;
		let data = new Float32Array(steps * steps);
		let imgData = new Uint8Array(data.length * 4);
		let box = demNode.box;
		let boxSize = box.getSize();
		for (let i = 0; i < steps; i++) {
			for (let j = 0; j < steps; j++) {
				let [u, v] = [i / (steps - 1), j / (steps - 1)];
				let pos = new THREE.Vector3(
					u * boxSize.x + box.min.x,
					v * boxSize.y + box.min.y,
					0
				);

				let height = demNode.height(pos);

				let index = i + steps * j;
				data[index] = height;

				// let index = i + steps * j;
				// imgData[4*index + 0] = 255 * (height - min) / (max - min);
				// imgData[4*index + 1] = 100;
				// imgData[4*index + 2] = 0;
				// imgData[4*index + 3] = 255;
			}
		}

		let [min, max] = [Infinity, -Infinity];
		for (let height of data) {
			if (!isFinite(height)) {
				continue;
			}

			min = Math.min(min, height);
			max = Math.max(max, height);
		}

		for (let i = 0; i < data.length; i++) {
			imgData[4 * i + 0] = 255 * (data[i] - min) / (max - min);
			imgData[4 * i + 1] = 100;
			imgData[4 * i + 2] = 0;
			imgData[4 * i + 3] = 255;
		}

		let img = Potree.utils.pixelsArrayToImage(imgData, steps, steps);

		let screenshot = img.src;

		if (!this.debugDIV) {
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
*/

Potree.updateVisibility = function (pointclouds, camera, renderer) {
	// let numVisibleNodes = 0;
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

	while (priorityQueue.size() > 0) {
		let element = priorityQueue.pop();
		let node = element.node;
		let parent = element.parent;
		let pointcloud = pointclouds[element.pointcloud];

		// { // restrict to certain nodes for debugging
		//	let allowedNodes = ["r", "r0", "r4"];
		//	if(!allowedNodes.includes(node.name)){
		//		continue;
		//	}
		// }

		let box = node.getBoundingBox();
		let frustum = frustums[element.pointcloud];
		let camObjPos = camObjPositions[element.pointcloud];

		let insideFrustum = frustum.intersectsBox(box);
		let maxLevel = pointcloud.maxLevel || Infinity;
		let level = node.getLevel();
		let visible = insideFrustum;
		visible = visible && !(numVisiblePoints + node.getNumPoints() > Potree.pointBudget);
		visible = visible && level < maxLevel;

		if (pointcloud.material.numClipBoxes > 0 && visible && pointcloud.material.clipMode === Potree.ClipMode.CLIP_OUTSIDE) {
			let box2 = box.clone();
			pointcloud.updateMatrixWorld(true);
			box2.applyMatrix4(pointcloud.matrixWorld);
			let intersectsClipBoxes = false;
			for (let clipBox of pointcloud.material.clipBoxes) {
				let clipMatrixWorld = clipBox.matrix;
				let clipBoxWorld = new THREE.Box3(
					new THREE.Vector3(-0.5, -0.5, -0.5),
					new THREE.Vector3(0.5, 0.5, 0.5)
				).applyMatrix4(clipMatrixWorld);
				if (box2.intersectsBox(clipBoxWorld)) {
					intersectsClipBoxes = true;
					break;
				}
			}
			visible = visible && intersectsClipBoxes;
		}

		// visible = ["r", "r0", "r06", "r060"].includes(node.name);
		// visible = ["r"].includes(node.name);

		if (node.spacing) {
			lowestSpacing = Math.min(lowestSpacing, node.spacing);
		} else if (node.geometryNode && node.geometryNode.spacing) {
			lowestSpacing = Math.min(lowestSpacing, node.geometryNode.spacing);
		}

		if (numVisiblePoints + node.getNumPoints() > Potree.pointBudget) {
			break;
		}

		if (!visible) {
			continue;
		}

		// TODO: not used, same as the declaration?
		// numVisibleNodes++;
		numVisiblePoints += node.getNumPoints();

		pointcloud.numVisibleNodes++;
		pointcloud.numVisiblePoints += node.getNumPoints();

		if (node.isGeometryNode() && (!parent || parent.isTreeNode())) {
			if (node.isLoaded() && loadedToGPUThisFrame < 2) {
				node = pointcloud.toTreeNode(node, parent);
				loadedToGPUThisFrame++;
			} else {
				unloadedGeometry.push(node);
				visibleGeometry.push(node);
			}
		}

		if (node.isTreeNode()) {
			Potree.getLRU().touch(node.geometryNode);
			node.sceneNode.visible = true;
			node.sceneNode.material = pointcloud.material;

			visibleNodes.push(node);
			pointcloud.visibleNodes.push(node);

			node.sceneNode.updateMatrix();
			node.sceneNode.matrixWorld.multiplyMatrices(pointcloud.matrixWorld, node.sceneNode.matrix);

			if (pointcloud.showBoundingBox && !node.boundingBoxNode && node.getBoundingBox) {
				let boxHelper = new Potree.Box3Helper(node.getBoundingBox());
				// let boxHelper = new THREE.BoxHelper(node.sceneNode);
				pointcloud.add(boxHelper);
				pointcloud.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrixWorld.copy(pointcloud.matrixWorld);
			} else if (pointcloud.showBoundingBox) {
				node.boundingBoxNode.visible = true;
				node.boundingBoxNode.matrixWorld.copy(pointcloud.matrixWorld);
			} else if (!pointcloud.showBoundingBox && node.boundingBoxNode) {
				node.boundingBoxNode.visible = false;
			}
		}

		// add child nodes to priorityQueue
		let children = node.getChildren();
		for (let i = 0; i < children.length; i++) {
			let child = children[i];

			let sphere = child.getBoundingSphere();
			let distance = sphere.center.distanceTo(camObjPos);
			let radius = sphere.radius;

			let fov = (camera.fov * Math.PI) / 180;
			let slope = Math.tan(fov / 2);
			let projFactor = (0.5 * renderer.domElement.clientHeight) / (slope * distance);
			let screenPixelRadius = radius * projFactor;

			if (screenPixelRadius < pointcloud.minimumNodePixelSize) {
				continue;
			}

			let weight = screenPixelRadius;

			if (distance - radius < 0) {
				weight = Number.MAX_VALUE;
			}

			priorityQueue.push({pointcloud: element.pointcloud, node: child, parent: node, weight: weight});
		}
	}// end priority queue loop

	{ // update DEM
		let maxDEMLevel = 4;
		let candidates = pointclouds
			.filter(p => (p.generateDEM && p.dem instanceof Potree.DEM));
		for (let pointcloud of candidates) {
			let updatingNodes = pointcloud.visibleNodes.filter(n => n.getLevel() <= maxDEMLevel);
			pointcloud.dem.update(updatingNodes);
		}
	}

	for (let i = 0; i < Math.min(5, unloadedGeometry.length); i++) {
		unloadedGeometry[i].load();
	}

	// for(let node of visibleNodes){
	//	let allowedNodes = ["r", "r0", "r4"];
	//	node.sceneNode.visible = allowedNodes.includes(node.geometryNode.name);
	//
	//	if(node.boundingBoxNode){
	//		node.boundingBoxNode.visible = node.boundingBoxNode.visible && node.sceneNode.visible;
	//	}
	// }

	// Potree.updateDEMs(renderer, visibleNodes);

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
