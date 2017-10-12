
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

Potree.measureTimings = false;
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
	
	let domWidth = renderer.domElement.clientWidth;
	let domHeight = renderer.domElement.clientHeight;

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

			let weight = 0; 
			if(camera.isPerspectiveCamera) {			
				let sphere = child.getBoundingSphere();
				let center = sphere.center;
				//let distance = sphere.center.distanceTo(camObjPos);
				
				let dx = camObjPos.x - center.x;
				let dy = camObjPos.y - center.y;
				let dz = camObjPos.z - center.z;
				
				let dd = dx * dx + dy * dy + dz * dz;
				let distance = Math.sqrt(dd);
				
				
				let radius = sphere.radius;
				
				let fov = (camera.fov * Math.PI) / 180;
				let slope = Math.tan(fov / 2);
				let projFactor = (0.5 * domHeight) / (slope * distance);
				let screenPixelRadius = radius * projFactor;
				
				if(screenPixelRadius < pointcloud.minimumNodePixelSize){
					continue;
				}
			
				weight = screenPixelRadius;

				if(distance - radius < 0){
					weight = Number.MAX_VALUE;
				}
			} else {
				// TODO ortho visibility
				let bb = child.getBoundingBox();				
				let distance = child.getBoundingSphere().center.distanceTo(camObjPos);
				let diagonal = bb.max.clone().sub(bb.min).length();
				weight = diagonal / distance;
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

	return {
		visibleNodes: visibleNodes,
		numVisiblePoints: numVisiblePoints,
		lowestSpacing: lowestSpacing
	};
};















// Copied from three.js: WebGLRenderer.js
Potree.paramThreeToGL = function paramThreeToGL(_gl, p) {

	var extension;

	if ( p === THREE.RepeatWrapping ) return _gl.REPEAT;
	if ( p === THREE.ClampToEdgeWrapping ) return _gl.CLAMP_TO_EDGE;
	if ( p === THREE.MirroredRepeatWrapping ) return _gl.MIRRORED_REPEAT;

	if ( p === THREE.NearestFilter ) return _gl.NEAREST;
	if ( p === THREE.NearestMipMapNearestFilter ) return _gl.NEAREST_MIPMAP_NEAREST;
	if ( p === THREE.NearestMipMapLinearFilter ) return _gl.NEAREST_MIPMAP_LINEAR;

	if ( p === THREE.LinearFilter ) return _gl.LINEAR;
	if ( p === THREE.LinearMipMapNearestFilter ) return _gl.LINEAR_MIPMAP_NEAREST;
	if ( p === THREE.LinearMipMapLinearFilter ) return _gl.LINEAR_MIPMAP_LINEAR;

	if ( p === THREE.UnsignedByteType ) return _gl.UNSIGNED_BYTE;
	if ( p === THREE.UnsignedShort4444Type ) return _gl.UNSIGNED_SHORT_4_4_4_4;
	if ( p === THREE.UnsignedShort5551Type ) return _gl.UNSIGNED_SHORT_5_5_5_1;
	if ( p === THREE.UnsignedShort565Type ) return _gl.UNSIGNED_SHORT_5_6_5;

	if ( p === THREE.ByteType ) return _gl.BYTE;
	if ( p === THREE.ShortType ) return _gl.SHORT;
	if ( p === THREE.UnsignedShortType ) return _gl.UNSIGNED_SHORT;
	if ( p === THREE.IntType ) return _gl.INT;
	if ( p === THREE.UnsignedIntType ) return _gl.UNSIGNED_INT;
	if ( p === THREE.FloatType ) return _gl.FLOAT;

	if ( p === THREE.HalfFloatType ) {

		extension = extensions.get( 'OES_texture_half_float' );

		if ( extension !== null ) return extension.HALF_FLOAT_OES;

	}

	if ( p === THREE.AlphaFormat ) return _gl.ALPHA;
	if ( p === THREE.RGBFormat ) return _gl.RGB;
	if ( p === THREE.RGBAFormat ) return _gl.RGBA;
	if ( p === THREE.LuminanceFormat ) return _gl.LUMINANCE;
	if ( p === THREE.LuminanceAlphaFormat ) return _gl.LUMINANCE_ALPHA;
	if ( p === THREE.DepthFormat ) return _gl.DEPTH_COMPONENT;
	if ( p === THREE.DepthStencilFormat ) return _gl.DEPTH_STENCIL;

	if ( p === THREE.AddEquation ) return _gl.FUNC_ADD;
	if ( p === THREE.SubtractEquation ) return _gl.FUNC_SUBTRACT;
	if ( p === THREE.ReverseSubtractEquation ) return _gl.FUNC_REVERSE_SUBTRACT;

	if ( p === THREE.ZeroFactor ) return _gl.ZERO;
	if ( p === THREE.OneFactor ) return _gl.ONE;
	if ( p === THREE.SrcColorFactor ) return _gl.SRC_COLOR;
	if ( p === THREE.OneMinusSrcColorFactor ) return _gl.ONE_MINUS_SRC_COLOR;
	if ( p === THREE.SrcAlphaFactor ) return _gl.SRC_ALPHA;
	if ( p === THREE.OneMinusSrcAlphaFactor ) return _gl.ONE_MINUS_SRC_ALPHA;
	if ( p === THREE.DstAlphaFactor ) return _gl.DST_ALPHA;
	if ( p === THREE.OneMinusDstAlphaFactor ) return _gl.ONE_MINUS_DST_ALPHA;

	if ( p === THREE.DstColorFactor ) return _gl.DST_COLOR;
	if ( p === THREE.OneMinusDstColorFactor ) return _gl.ONE_MINUS_DST_COLOR;
	if ( p === THREE.SrcAlphaSaturateFactor ) return _gl.SRC_ALPHA_SATURATE;

	if ( p === THREE.RGB_S3TC_DXT1_Format || p === RGBA_S3TC_DXT1_Format ||
		p === THREE.RGBA_S3TC_DXT3_Format || p === RGBA_S3TC_DXT5_Format ) {

		extension = extensions.get( 'WEBGL_compressed_texture_s3tc' );

		if ( extension !== null ) {

			if ( p === THREE.RGB_S3TC_DXT1_Format ) return extension.COMPRESSED_RGB_S3TC_DXT1_EXT;
			if ( p === THREE.RGBA_S3TC_DXT1_Format ) return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
			if ( p === THREE.RGBA_S3TC_DXT3_Format ) return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
			if ( p === THREE.RGBA_S3TC_DXT5_Format ) return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT;

		}

	}

	if ( p === THREE.RGB_PVRTC_4BPPV1_Format || p === THREE.RGB_PVRTC_2BPPV1_Format ||
		p === THREE.RGBA_PVRTC_4BPPV1_Format || p === THREE.RGBA_PVRTC_2BPPV1_Format ) {

		extension = extensions.get( 'WEBGL_compressed_texture_pvrtc' );

		if ( extension !== null ) {

			if ( p === THREE.RGB_PVRTC_4BPPV1_Format ) return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
			if ( p === THREE.RGB_PVRTC_2BPPV1_Format ) return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
			if ( p === THREE.RGBA_PVRTC_4BPPV1_Format ) return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
			if ( p === THREE.RGBA_PVRTC_2BPPV1_Format ) return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;

		}

	}

	if ( p === THREE.RGB_ETC1_Format ) {

		extension = extensions.get( 'WEBGL_compressed_texture_etc1' );

		if ( extension !== null ) return extension.COMPRESSED_RGB_ETC1_WEBGL;

	}

	if ( p === THREE.MinEquation || p ===THREE. MaxEquation ) {

		extension = extensions.get( 'EXT_blend_minmax' );

		if ( extension !== null ) {

			if ( p === THREE.MinEquation ) return extension.MIN_EXT;
			if ( p === THREE.MaxEquation ) return extension.MAX_EXT;

		}

	}

	if ( p === UnsignedInt248Type ) {

		extension = extensions.get( 'WEBGL_depth_texture' );

		if ( extension !== null ) return extension.UNSIGNED_INT_24_8_WEBGL;

	}

	return 0;

};

Potree.Shader = class Shader{
	
	constructor(gl, name, vsSource, fsSource){
		this.gl = gl;
		this.name = name;
		this.vsSource = vsSource;
		this.fsSource = fsSource;
		
		this.vs = gl.createShader(gl.VERTEX_SHADER);
		this.fs = gl.createShader(gl.FRAGMENT_SHADER);
		this.program = gl.createProgram();
		
		this.uniformLocations = {};
		this.attributeLocations = {};
		
		this.update(vsSource, fsSource);
	}
	
	update(vsSource, fsSource){
		this.vsSource = vsSource;
		this.fsSource = fsSource;
		
		this.linkProgram();
	}
	
	compileShader(shader, source){
		let gl = this.gl;
		
		gl.shaderSource(shader, source);
		
		gl.compileShader(shader);
		
		let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if(!success){
			let info = gl.getShaderInfoLog(shader);
			throw `could not compile shader ${this.name}: ${info}`;
		}
	}
	
	linkProgram(){
		
		let gl = this.gl;
		
		this.uniformLocations = {};
		this.attributeLocations = {};
		
		gl.useProgram(null);
		
		this.compileShader(this.vs, this.vsSource);
		this.compileShader(this.fs, this.fsSource);
		
		let program = this.program;
		
		gl.attachShader(program, this.vs);
		gl.attachShader(program, this.fs);
		
		gl.linkProgram(program);
		
		gl.detachShader(program, this.vs);
		gl.detachShader(program, this.fs);
		
		let success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if(!success){
			let info = gl.getProgramInfoLog (program);
			throw `could not link program ${this.name}: ${info}`;
		}
		
		{ // attribute locations
			let numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
			
			for(let i = 0; i < numAttributes; i++){
				let attribute = gl.getActiveAttrib(program, i);
				
				let location = gl.getAttribLocation(program, attribute.name);
				
				this.attributeLocations[attribute.name] = location;
			}
		}
		
		{ // uniform locations
			let numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
			
			for(let i = 0; i < numUniforms; i++){
				let uniform = gl.getActiveUniform(program, i);
				
				let location = gl.getUniformLocation(program, uniform.name);
				
				this.uniformLocations[uniform.name] = location;
			}
		}
		
		
	}
	
	setUniformMatrix4(name, value){
		const gl = this.gl;
		const location = this.uniformLocations[name];
		
		if(location == null){
			return;
		}
		
		let tmp = new Float32Array(value.elements);
		gl.uniformMatrix4fv(location, false, tmp);
	}
	
	setUniform1f(name, value){
		const gl = this.gl;
		const location = this.uniformLocations[name];
		
		if(location == null){
			return;
		}
		
		gl.uniform1f(location, value);
	}
	
	setUniformBoolean(name, value){
		const gl = this.gl;
		const location = this.uniformLocations[name];
		
		if(location == null){
			return;
		}
		
		gl.uniform1i(location, value);
	}
	
	setUniformTexture(name, value){
		const gl = this.gl;
		const location = this.uniformLocations[name];
		
		if(location == null){
			return;
		}
		
		gl.uniform1i(location, value);
	}
	
	setUniform2f(name, value){
		const gl = this.gl;
		const location = this.uniformLocations[name];
		
		if(location == null){
			return;
		}
		
		gl.uniform2f(location, value[0], value[1]);
	}
	
	setUniform3f(name, value){
		const gl = this.gl;
		const location = this.uniformLocations[name];
		
		if(location == null){
			return;
		}
		
		gl.uniform3f(location, value[0], value[1], value[2]);
	}
	
	setUniform(name, value){
		
		if(value.constructor === THREE.Matrix4){
			this.setUniformMatrix4(name, value);
		} else if(typeof value === "number"){
			this.setUniform1f(name, value);
		} else if(typeof value === "boolean"){
			this.setUniformBoolean(name, value);
		} else if(value instanceof Potree.WebGLTexture){
			this.setUniformTexture(name, value);
		} else if(value instanceof Array){
			
			if(value.length === 2){
				this.setUniform2f(name, value);
			}else if(value.length === 3){
				this.setUniform3f(name, value);
			}
			
		} else{
			console.error("unhandled uniform type: ", name, value);
		}
		
	}
		
		
	setUniform1i(name, value){
		let gl = this.gl;
		let location = this.uniformLocations[name];
		
		if(location == null){
			return;
		}
		
		gl.uniform1i(location, value);
	}
	
};


Potree.WebGLBuffer = class WebGLBuffer{
	
	constructor(){
		this.iBuffer = null;
		this.vao = null;
		this.vbo = null;
	}
	
};

Potree.WebGLTexture = class WebGLTexture{
	
	constructor(gl, texture){
		this.gl = gl;
		
		this.texture = texture;
		this.id = gl.createTexture();
		
		this.target = gl.TEXTURE_2D;
		this.version = -1;
		
		this.update(texture);
	}
	
	update(){
		
		let gl = this.gl;
		let texture = this.texture;
		
		if(this.version === texture.version){
			return;
		}
		
		this.target = gl.TEXTURE_2D;
		
		gl.bindTexture(this.target, this.id);
		
		let level = 0;
		let internalFormat = Potree.paramThreeToGL(gl, texture.format);
		let width = texture.image.width;
		let height = texture.image.height;
		let border = 0;
		let srcFormat = internalFormat;
		let srcType = Potree.paramThreeToGL(gl, texture.type);
		let data;
		
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, texture.flipY);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, texture.premultiplyAlpha);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, texture.unpackAlignment);
		
		if(texture instanceof THREE.DataTexture){
			data = texture.image.data;
			
			gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			
			gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, Potree.paramThreeToGL(gl, texture.magFilter));
			gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, Potree.paramThreeToGL(gl, texture.minFilter));
			
			gl.texImage2D(this.target, level, internalFormat,
                width, height, border, srcFormat, srcType,
                data);
		}else if(texture instanceof THREE.CanvasTexture){
			data = texture.image;
			
			gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, Potree.paramThreeToGL(gl, texture.wrapS));
			gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, Potree.paramThreeToGL(gl, texture.wrapT));
			
			gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, Potree.paramThreeToGL(gl, texture.magFilter));
			gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, Potree.paramThreeToGL(gl, texture.minFilter));
			
			gl.texImage2D(this.target, level, internalFormat, 
				internalFormat, srcType, data);
		}
		
		gl.bindTexture(this.target, null);
		
		this.version = texture.version;
	}
	
	
	
};


Potree.Renderer = class{
	
	constructor(threeRenderer){
		this.threeRenderer = threeRenderer;
		this.gl = this.threeRenderer.context;
		
		this.buffers = new Map();
		this.shaders = new Map();
		this.textures = new Map();
		
		
		this.toggle = 0;
	}
	
	createBuffer(iBuffer){
		
		let gl = this.gl;
		let buffer = new Potree.WebGLBuffer();
		buffer.iBuffer = iBuffer;
		buffer.vao = gl.createVertexArray();
		buffer.vbo = gl.createBuffer();
		
		gl.bindVertexArray(buffer.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vbo);
		gl.bufferData(gl.ARRAY_BUFFER, iBuffer.data, gl.STATIC_DRAW);
		
		let offset = 0;
		let i = 0;
		for(let attribute of iBuffer.attributes){
			
			let type = gl[attribute.type];
			let normalized = attribute.normalized;
			let stride = iBuffer.stride;
			let numElements = attribute.numElements;
			
			gl.vertexAttribPointer(i, numElements, type, normalized, stride, offset);
			gl.enableVertexAttribArray(i);

			offset += attribute.bytes;
			i++;
		}
		
		gl.bindVertexArray(null);
		
		return buffer;
	}
	
	traverse(scene){
		
		let octrees = [];
		
		let stack = [scene];
		while(stack.length > 0){
			
			let node = stack.pop();
			
			if(node instanceof Potree.PointCloudTree){
				octrees.push(node);
				continue;
			}
			
			let visibleChildren = node.children.filter(c => c.visible);
			stack.push(...visibleChildren);
			
		}
		
		let result = {
			octrees: octrees
		};
		
		return result;
	}
	
	renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params){
		
		if(Potree.measureTimings) performance.mark("renderNodes-start");
		
		let gl = this.gl;
		
		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;
		let worldView = new THREE.Matrix4();
		
		let mat4holder = new Float32Array(16);
		
		let i = 0;
		for(let node of nodes){
				
			let world = node.sceneNode.matrixWorld;
			worldView.multiplyMatrices(view, world);
			
			let vnStart = visibilityTextureData.offsets.get(node);
			
			let level = node.getLevel();
			
			
			// TODO consider passing matrices in an array to avoid uniformMatrix4fv overhead
			const lModel = shader.uniformLocations["modelMatrix"];
			if(lModel){
				mat4holder.set(world.elements);
				gl.uniformMatrix4fv(lModel, false, mat4holder);
			}
			
			const lModelView = shader.uniformLocations["modelViewMatrix"];
			mat4holder.set(worldView.elements);
			gl.uniformMatrix4fv(lModelView, false, mat4holder);
			
			
			//shader.setUniformMatrix4("modelMatrix", world);
			//shader.setUniformMatrix4("modelViewMatrix", worldView);
			shader.setUniform1f("level", level);
			shader.setUniform1f("vnStart", vnStart);
			shader.setUniform1f("pcIndex", i);
			
			if(shadowMaps.length > 0){
			
				let view = shadowMaps[0].camera.matrixWorldInverse;
				let proj = shadowMaps[0].camera.projectionMatrix;
				
				let worldView = new THREE.Matrix4()
					.multiplyMatrices(view, world);
				let worldViewProj = new THREE.Matrix4()
					.multiplyMatrices(proj, worldView);
				shader.setUniformMatrix4("smWorldViewProj", worldViewProj);
				
				shader.setUniform1i("shadowMap", 1);
				let id = this.threeRenderer.properties.get(shadowMaps[0].map.depthTexture)
					.__webglTexture;
				gl.activeTexture(gl.TEXTURE1);
				gl.bindTexture(gl.TEXTURE_2D, id)
			}
			
			let iBuffer = node.geometryNode.buffer;
			
			if(!this.buffers.has(iBuffer)){
				let buffers = this.createBuffer(iBuffer);
				this.buffers.set(iBuffer, buffers);
			}
			
			let buffer = this.buffers.get(iBuffer);
			
			gl.bindVertexArray(buffer.vao);
			
			let numPoints = iBuffer.numElements;
			gl.drawArrays(gl.POINTS, 0, numPoints);
			
			i++;
		}
		
		gl.bindVertexArray(null);
		
		if(Potree.measureTimings){
			performance.mark("renderNodes-end");
			performance.measure("render.renderNodes", "renderNodes-start", "renderNodes-end");
		} 
	}
	
	renderOctree(octree, nodes, camera, target, params = {}){
		
		let gl = this.gl;
		
		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;
		let proj = camera.projectionMatrix;
		let worldView = new THREE.Matrix4();
		
		let material = octree.material;
		let shader = null;
		let visibilityTextureData = null;
		
		if (material.pointSizeType >= 0) {
			if (material.pointSizeType === Potree.PointSizeType.ADAPTIVE ||
				material.pointColorType === Potree.PointColorType.LOD) {
				visibilityTextureData = octree.computeVisibilityTextureData(nodes);
				
				const vnt = material.visibleNodesTexture;
				const data = vnt.image.data;
				data.set(visibilityTextureData.data);
				vnt.needsUpdate = true;
				
			}
		}
		
		{ // UPDATE SHADER AND TEXTURES
			if(!this.shaders.has(material)){
				let [vs, fs] = [material.vertexShader, material.fragmentShader];
				let shader = new Potree.Shader(gl, "pointcloud", vs, fs);
				
				this.shaders.set(material, shader);
			}
			
			shader = this.shaders.get(material);
			
			if(material.needsUpdate){
				let [vs, fs] = [material.vertexShader, material.fragmentShader];
				shader.update(vs, fs);
				
				material.needsUpdate = false;
			}
			
			for(let uniformName of Object.keys(material.uniforms)){
				let uniform = material.uniforms[uniformName];
				
				if(uniform.type == "t"){
					
					let texture = uniform.value;
					
					if(!this.textures.has(texture)){
						let webglTexture = new Potree.WebGLTexture(gl, texture);
						
						this.textures.set(texture, webglTexture);
					}
					
					let webGLTexture = this.textures.get(texture);
					webGLTexture.update();
					
					
				}
			}
		}
		
		gl.useProgram(shader.program);
		
		
		{ // UPDATE UNIFORMS
			shader.setUniformMatrix4("projectionMatrix", proj);
			shader.setUniformMatrix4("viewMatrix", view);
			
			shader.setUniform1f("screenHeight", material.screenHeight);
			shader.setUniform1f("screenWidth", material.screenWidth);
			shader.setUniform1f("fov", Math.PI * camera.fov / 180);
			shader.setUniform1f("near", camera.near);
			shader.setUniform1f("far", camera.far);
			
			shader.setUniform("useOrthographicCamera", material.useOrthographicCamera);
			// uniform float orthoRange;
			
			if(material.clipBoxes && material.clipBoxes.length > 0){
				shader.setUniform1i("clipMode", material.clipMode);
				shader.setUniform("clipBoxCount", material.clipBoxes.length);
				let flattenedMatrices = [].concat(...material.clipBoxes.map(c => c.inverse.elements));

				const lClipBoxes = shader.uniformLocations["clipBoxes[0]"];
				gl.uniformMatrix4fv(lClipBoxes, false, flattenedMatrices);
			}

			//uniform int clipMode;
			//#if defined use_clip_box
			//	uniform float clipBoxCount;
			//	uniform mat4 clipBoxes[max_clip_boxes];
			//#endif
			
			//uniform int clipPolygonCount;
			//uniform int clipPolygonVCount[max_clip_polygons];
			//uniform vec3 clipPolygons[max_clip_polygons * 8];
			//uniform mat4 clipPolygonVP[max_clip_polygons];
			
			shader.setUniform1f("size", material.size);
			shader.setUniform1f("maxSize", 50);
			shader.setUniform1f("minSize", 1);
			
			
			// uniform float pcIndex
			shader.setUniform1f("spacing", material.spacing);
			shader.setUniform("octreeSize", material.uniforms.octreeSize.value);
			
			
			//uniform vec3 uColor;
			//uniform float opacity;
			
			shader.setUniform2f("elevationRange", material.elevationRange);
			shader.setUniform2f("intensityRange", material.intensityRange);
			//uniform float intensityGamma;
			//uniform float intensityContrast;
			//uniform float intensityBrightness;
			shader.setUniform1f("rgbGamma", material.rgbGamma);
			shader.setUniform1f("rgbContrast", material.rgbContrast);
			shader.setUniform1f("rgbBrightness", material.rgbBrightness);
			//uniform float transition;
			//uniform float wRGB;
			//uniform float wIntensity;
			//uniform float wElevation;
			//uniform float wClassification;
			//uniform float wReturnNumber;
			//uniform float wSourceID;
			
			shader.setUniform("useShadowMap", shadowMaps.length > 0);
			
			
			let vnWebGLTexture = this.textures.get(material.visibleNodesTexture);
			shader.setUniform1i("visibleNodesTexture", 0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(vnWebGLTexture.target, vnWebGLTexture.id);
			
			let gradientTexture = this.textures.get(material.gradientTexture);
			shader.setUniform1i("gradient", 1);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gradientTexture.target, gradientTexture.id);
		}
		

		gl.bindAttribLocation(shader.program, 0, "position");
		gl.bindAttribLocation(shader.program, 1, "color");
		gl.bindAttribLocation(shader.program, 2, "intensity");
		gl.bindAttribLocation(shader.program, 3, "classification");
		gl.bindAttribLocation(shader.program, 4, "returnNumber");
		gl.bindAttribLocation(shader.program, 5, "numberOfReturns");
		gl.bindAttribLocation(shader.program, 6, "pointSourceID");
		gl.bindAttribLocation(shader.program, 7, "index");
		
		
		
		this.renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params);
	}
	
	render(scene, camera, target, params = {}){
		
		const gl = this.gl;
		
		// PREPARE 
		if(target != null){
			this.threeRenderer.setRenderTarget(target);
		}
		
		camera.updateProjectionMatrix();
		
		const traversalResult = this.traverse(scene);
		
		
		// RENDER
		for(const octree of traversalResult.octrees){
			let nodes = octree.visibleNodes;
			this.renderOctree(octree, nodes, camera, target, params);
		}
		
		
		// CLEANUP
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null)
		
		this.threeRenderer.resetGLState();
	}
	
	
	
};








