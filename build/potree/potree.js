Potree.KeyCodes = {
	DELETE: 46
};

THREE.EventDispatcher.prototype.removeEventListeners = function (type) {
	if (this._listeners === undefined) {
		return;
	}

	if (this._listeners[ type ]) {
		delete this._listeners[ type ];
	}
};

THREE.PerspectiveCamera.prototype.zoomTo = function (node, factor) {
	if (!node.geometry && !node.boundingSphere && !node.boundingBox) {
		return;
	}

	if (node.geometry && node.geometry.boundingSphere === null) {
		node.geometry.computeBoundingSphere();
	}

	node.updateMatrixWorld();

	let bs;

	if (node.boundingSphere) {
		bs = node.boundingSphere;
	} else if (node.geometry && node.geometry.boundingSphere) {
		bs = node.geometry.boundingSphere;
	} else {
		bs = node.boundingBox.getBoundingSphere();
	}

	let _factor = factor || 1;

	bs = bs.clone().applyMatrix4(node.matrixWorld);
	let radius = bs.radius;
	let fovr = this.fov * Math.PI / 180;

	if (this.aspect < 1) {
		fovr = fovr * this.aspect;
	}

	let distanceFactor = Math.abs(radius / Math.sin(fovr / 2)) * _factor;

	let offset = this.getWorldDirection().multiplyScalar(-distanceFactor);
	this.position.copy(bs.center.clone().add(offset));
};


THREE.OrthographicCamera.prototype.zoomTo = function( node, factor = 1){

	if ( !node.geometry && !node.boundingBox) {
		return;
	}

	// TODO

	//let minWS = new THREE.Vector4(node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z, 1);
	//let minVS = minWS.applyMatrix4(this.matrixWorldInverse);

	//let right = node.boundingBox.max.x;
	//let bottom	= node.boundingBox.min.y;
	//let top = node.boundingBox.max.y;

	this.updateProjectionMatrix();	
};
THREE.Ray.prototype.distanceToPlaneWithNegative = function (plane) {
	let denominator = plane.normal.dot(this.direction);
	if (denominator === 0) {
		// line is coplanar, return origin
		if (plane.distanceToPoint(this.origin) === 0) {
			return 0;
		}

		// Null is preferable to undefined since undefined means.... it is undefined
		return null;
	}
	let t = -(this.origin.dot(plane.normal) + plane.constant) / denominator;

	return t;
};


function Potree () {

}
Potree.version = {
	major: 1,
	minor: 6,
	suffix: ''
};

console.log('Potree ' + Potree.version.major + '.' + Potree.version.minor + Potree.version.suffix);

Potree.pointBudget = 1 * 1000 * 1000;

Potree.framenumber = 0;

Potree.numNodesLoading = 0;
Potree.maxNodesLoading = 4;

Potree.Shaders = {};

Potree.webgl = {
	shaders: {},
	vaos: {},
	vbos: {}
};

Potree.debug = {};

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

class EnumItem{
	constructor(object){
		for(let key of Object.keys(object)){
			this[key] = object[key];
		}
	}

	inspect(){
		return `Enum(${this.name}: ${this.value})`;
	}
};

class Enum{

	constructor(object){
		this.object = object;

		for(let key of Object.keys(object)){
			let value = object[key];

			if(typeof value === "object"){
				value.name = key;
			}else{
				value = {name: key, value: value};
			}

			this[key] = new EnumItem(value);
		}
	}

	fromValue(value){
		for(let key of Object.keys(this.object)){
			if(this[key].value === value){
				return this[key];
			}
		}

		throw new Error(`No enum for value: ${value}`);
	}

};


Potree.CameraMode = {
	ORTHOGRAPHIC: 0,
	PERSPECTIVE: 1
};

Potree.ClipTask = {
	NONE: 0,
	HIGHLIGHT: 1,
	SHOW_INSIDE: 2,
	SHOW_OUTSIDE: 3
};

Potree.ClipMethod = {
	INSIDE_ANY: 0,
	INSIDE_ALL: 1
};

Potree.MOUSE = {
	LEFT: 0b0001,
	RIGHT: 0b0010,
	MIDDLE: 0b0100
};

Potree.timerQueries = {};

Potree.measureTimings = false;

Potree.startQuery = function (name, gl) {
	let ext = gl.getExtension('EXT_disjoint_timer_query');

	if(!ext){
		return;
	}

	if (Potree.timerQueries[name] === undefined) {
		Potree.timerQueries[name] = [];
	}

	let query = ext.createQueryEXT();
	ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, query);

	Potree.timerQueries[name].push(query);

	return query;
};

Potree.endQuery = function (query, gl) {
	let ext = gl.getExtension('EXT_disjoint_timer_query');

	if(!ext){
		return;
	}

	ext.endQueryEXT(ext.TIME_ELAPSED_EXT);
};

Potree.resolveQueries = function (gl) {
	let ext = gl.getExtension('EXT_disjoint_timer_query');

	let resolved = new Map();

	for (let name in Potree.timerQueries) {
		let queries = Potree.timerQueries[name];

		let remainingQueries = [];
		for(let query of queries){

			let available = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_AVAILABLE_EXT);
			let disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);

			if (available && !disjoint) {
				// See how much time the rendering of the object took in nanoseconds.
				let timeElapsed = ext.getQueryObjectEXT(query, ext.QUERY_RESULT_EXT);
				let miliseconds = timeElapsed / (1000 * 1000);

				if(!resolved.get(name)){
					resolved.set(name, []);
				}
				resolved.get(name).push(miliseconds);
			}else{
				remainingQueries.push(query);
			}
		}

		if (remainingQueries.length === 0) {
			delete Potree.timerQueries[name];
		}else{
			Potree.timerQueries[name] = remainingQueries;
		}
	}

	return resolved;
};

Potree.toMaterialID = function(materialName){
	if (materialName === 'RGB'){
		return Potree.PointColorType.RGB;
	} else if (materialName === 'Color') {
		return Potree.PointColorType.COLOR;
	} else if (materialName === 'Elevation') {
		return Potree.PointColorType.HEIGHT;
	} else if (materialName === 'Intensity') {
		return Potree.PointColorType.INTENSITY;
	} else if (materialName === 'Intensity Gradient') {
		return Potree.PointColorType.INTENSITY_GRADIENT;
	} else if (materialName === 'Classification') {
		return Potree.PointColorType.CLASSIFICATION;
	} else if (materialName === 'Return Number') {
		return Potree.PointColorType.RETURN_NUMBER;
	} else if (materialName === 'Source') {
		return Potree.PointColorType.SOURCE;
	} else if (materialName === 'Level of Detail') {
		return Potree.PointColorType.LOD;
	} else if (materialName === 'Point Index') {
		return Potree.PointColorType.POINT_INDEX;
	} else if (materialName === 'Normal') {
		return Potree.PointColorType.NORMAL;
	} else if (materialName === 'Phong') {
		return Potree.PointColorType.PHONG;
	} else if (materialName === 'Index') {
		return Potree.PointColorType.POINT_INDEX;
	} else if (materialName === 'RGB and Elevation') {
		return Potree.PointColorType.RGB_HEIGHT;
	} else if (materialName === 'Composite') {
		return Potree.PointColorType.COMPOSITE;
	}
};

Potree.toMaterialName = function(materialID) {
	if (materialID === Potree.PointColorType.RGB) {
		return 'RGB';
	} else if (materialID === Potree.PointColorType.COLOR) {
		return 'Color';
	} else if (materialID === Potree.PointColorType.HEIGHT) {
		return 'Elevation';
	} else if (materialID === Potree.PointColorType.INTENSITY) {
		return 'Intensity';
	} else if (materialID === Potree.PointColorType.INTENSITY_GRADIENT) {
		return 'Intensity Gradient';
	} else if (materialID === Potree.PointColorType.CLASSIFICATION) {
		return 'Classification';
	} else if (materialID === Potree.PointColorType.RETURN_NUMBER) {
		return 'Return Number';
	} else if (materialID === Potree.PointColorType.SOURCE) {
		return 'Source';
	} else if (materialID === Potree.PointColorType.LOD) {
		return 'Level of Detail';
	} else if (materialID === Potree.PointColorType.NORMAL) {
		return 'Normal';
	} else if (materialID === Potree.PointColorType.PHONG) {
		return 'Phong';
	} else if (materialID === Potree.PointColorType.POINT_INDEX) {
		return 'Index';
	} else if (materialID === Potree.PointColorType.RGB_HEIGHT) {
		return 'RGB and Elevation';
	} else if (materialID === Potree.PointColorType.COMPOSITE) {
		return 'Composite';
	}
};

Potree.getMeasurementIcon = function(measurement){
	if (measurement instanceof Potree.Measure) {
		if (measurement.showDistances && !measurement.showArea && !measurement.showAngles) {
			return `${Potree.resourcePath}/icons/distance.svg`;
		} else if (measurement.showDistances && measurement.showArea && !measurement.showAngles) {
			return `${Potree.resourcePath}/icons/area.svg`;
		} else if (measurement.maxMarkers === 1) {
			return `${Potree.resourcePath}/icons/point.svg`;
		} else if (!measurement.showDistances && !measurement.showArea && measurement.showAngles) {
			return `${Potree.resourcePath}/icons/angle.png`;
		} else if (measurement.showHeight) {
			return `${Potree.resourcePath}/icons/height.svg`;
		} else {
			return `${Potree.resourcePath}/icons/distance.svg`;
		}
	} else if (measurement instanceof Potree.Profile) {
		return `${Potree.resourcePath}/icons/profile.svg`;
	} else if (measurement instanceof Potree.Volume) {
		return `${Potree.resourcePath}/icons/volume.svg`;
	} else if (measurement instanceof Potree.PolygonClipVolume) {
		return `${Potree.resourcePath}/icons/clip-polygon.svg`;
	}
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

    let failed = function() {
        // callback({type: 'loading_failed'});
        console.error(new Error(`failed to load point cloud from URL: ${path}`));
    };

	// load pointcloud
	if (!path) {
		// TODO: callback? comment? Hello? Bueller? Anyone?
	} else if (path.indexOf('entwine.json') > 0) {
        Potree.EptLoader.load(path, function(geometry) {
            if (!geometry) {
                failed();
            }
            else {
                let pointcloud = new Potree.PointCloudOctree(geometry);
                loaded(pointcloud);
            }
        });
	} else if (path.indexOf('greyhound://') === 0) {
		// We check if the path string starts with 'greyhound:', if so we
        // assume it's a greyhound server URL.
		Potree.GreyhoundLoader.load(path, function (geometry) {
			if (!geometry) {
                failed();
			} else {
				let pointcloud = new Potree.PointCloudOctree(geometry);
				loaded(pointcloud);
			}
		});
	} else if (path.indexOf('cloud.js') > 0) {
		Potree.POCLoader.load(path, function (geometry) {
			if (!geometry) {
                failed();
			} else {
				let pointcloud = new Potree.PointCloudOctree(geometry);
				loaded(pointcloud);
			}
		});
	} else if (path.indexOf('.vpc') > 0) {
		Potree.PointCloudArena4DGeometry.load(path, function (geometry) {
			if (!geometry) {
                failed();
			} else {
				let pointcloud = new Potree.PointCloudArena4D(geometry);
				loaded(pointcloud);
			}
		});
	} else {
		//callback({'type': 'loading_failed'});
		console.error(new Error(`failed to load point cloud from URL: ${path}`));
	}
};
/* eslint-enable standard/no-callback-literal */

Potree.updatePointClouds = function (pointclouds, camera, renderer) {
	if (!Potree.lru) {
		Potree.lru = new LRU();
	}

	for (let pointcloud of pointclouds) {
		let start = performance.now();

		for (let profileRequest of pointcloud.profileRequests) {
			profileRequest.update();

			let duration = performance.now() - start;
			if(duration > 5){
				break;
			}
		}

		let duration = performance.now() - start;
	}

	let result = Potree.updateVisibility(pointclouds, camera, renderer);

	for (let pointcloud of pointclouds) {
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

Potree.updateVisibilityStructures = function(pointclouds, camera, renderer) {
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

		// use close near plane for frustum intersection
		let frustumCam = camera.clone();
		frustumCam.near = Math.min(camera.near, 0.1);
		frustumCam.updateProjectionMatrix();
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
};

Potree.getDEMWorkerInstance = function () {
	if (!Potree.DEMWorkerInstance) {
		let workerPath = Potree.scriptPath + '/workers/DEMWorker.js';
		Potree.DEMWorkerInstance = Potree.workerPool.getWorker(workerPath);
	}

	return Potree.DEMWorkerInstance;
};


Potree.updateVisibility = function(pointclouds, camera, renderer){

	let numVisibleNodes = 0;
	let numVisiblePoints = 0;

	let numVisiblePointsInPointclouds = new Map(pointclouds.map(pc => [pc, 0]));

	let visibleNodes = [];
	let visibleGeometry = [];
	let unloadedGeometry = [];

	let lowestSpacing = Infinity;

	// calculate object space frustum and cam pos and setup priority queue
	let s = Potree.updateVisibilityStructures(pointclouds, camera, renderer);
	let frustums = s.frustums;
	let camObjPositions = s.camObjPositions;
	let priorityQueue = s.priorityQueue;

	let loadedToGPUThisFrame = 0;

	let domWidth = renderer.domElement.clientWidth;
	let domHeight = renderer.domElement.clientHeight;

	// check if pointcloud has been transformed
	// some code will only be executed if changes have been detected
	if(!Potree._pointcloudTransformVersion){
		Potree._pointcloudTransformVersion = new Map();
	}
	let pointcloudTransformVersion = Potree._pointcloudTransformVersion;
	for(let pointcloud of pointclouds){

		if(!pointcloud.visible){
			continue;
		}

		pointcloud.updateMatrixWorld();

		if(!pointcloudTransformVersion.has(pointcloud)){
			pointcloudTransformVersion.set(pointcloud, {number: 0, transform: pointcloud.matrixWorld.clone()});
		}else{
			let version = pointcloudTransformVersion.get(pointcloud);

			if(!version.transform.equals(pointcloud.matrixWorld)){
				version.number++;
				version.transform.copy(pointcloud.matrixWorld);

				pointcloud.dispatchEvent({
					type: "transformation_changed",
					target: pointcloud
				});
			}
		}
	}

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
		visible = visible && !(numVisiblePointsInPointclouds.get(pointcloud) + node.getNumPoints() > pointcloud.pointBudget);
		visible = visible && level < maxLevel;


		if(!window.warned125){
			console.log("TODO");
			window.warned125 = true;
		}
		if(false && pointcloud.material.clipBoxes.length > 0){



			//node.debug = false;

			let numIntersecting = 0;
			let numIntersectionVolumes = 0;

			for(let clipBox of pointcloud.material.clipBoxes){

				let pcWorldInverse = new THREE.Matrix4().getInverse(pointcloud.matrixWorld);
				let toPCObject = pcWorldInverse.multiply(clipBox.box.matrixWorld);

				let px = new THREE.Vector3(+1, 0, 0).applyMatrix4(toPCObject);
				let nx = new THREE.Vector3(-1, 0, 0).applyMatrix4(toPCObject);
				let py = new THREE.Vector3(0, +1, 0).applyMatrix4(toPCObject);
				let ny = new THREE.Vector3(0, -1, 0).applyMatrix4(toPCObject);
				let pz = new THREE.Vector3(0, 0, +1).applyMatrix4(toPCObject);
				let nz = new THREE.Vector3(0, 0, -1).applyMatrix4(toPCObject);

				let pxN = new THREE.Vector3().subVectors(nx, px).normalize();
				let nxN = pxN.clone().multiplyScalar(-1);
				let pyN = new THREE.Vector3().subVectors(ny, py).normalize();
				let nyN = pyN.clone().multiplyScalar(-1);
				let pzN = new THREE.Vector3().subVectors(nz, pz).normalize();
				let nzN = pzN.clone().multiplyScalar(-1);

				let pxPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(pxN, px);
				let nxPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(nxN, nx);
				let pyPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(pyN, py);
				let nyPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(nyN, ny);
				let pzPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(pzN, pz);
				let nzPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(nzN, nz);

				let frustum = new THREE.Frustum(pxPlane, nxPlane, pyPlane, nyPlane, pzPlane, nzPlane);
				let intersects = frustum.intersectsBox(box);

				if(intersects){
					numIntersecting++;
				}
				numIntersectionVolumes++;
			}

			let insideAny = numIntersecting > 0;
			let insideAll = numIntersecting === numIntersectionVolumes;

			if(pointcloud.material.clipTask === Potree.ClipTask.SHOW_INSIDE){
				if(pointcloud.material.clipMethod === Potree.ClipMethod.INSIDE_ANY && insideAny){
					//node.debug = true
				}else if(pointcloud.material.clipMethod === Potree.ClipMethod.INSIDE_ALL && insideAll){
					//node.debug = true;
				}else{
					visible = false;
				}
			}


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
		let numVisiblePointsInPointcloud = numVisiblePointsInPointclouds.get(pointcloud);
		numVisiblePointsInPointclouds.set(pointcloud, numVisiblePointsInPointcloud + node.getNumPoints());

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

			if(node._transformVersion === undefined){
				node._transformVersion = -1;
			}
			let transformVersion = pointcloudTransformVersion.get(pointcloud);
			if(node._transformVersion !== transformVersion.number){
				node.sceneNode.updateMatrix();
				node.sceneNode.matrixWorld.multiplyMatrices(pointcloud.matrixWorld, node.sceneNode.matrix);
				node._transformVersion = transformVersion.number;
			}

			if (pointcloud.showBoundingBox && !node.boundingBoxNode && node.getBoundingBox) {
				let boxHelper = new Potree.Box3Helper(node.getBoundingBox());
				boxHelper.matrixAutoUpdate = false;
				pointcloud.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
			} else if (pointcloud.showBoundingBox) {
				node.boundingBoxNode.visible = true;
				node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
			} else if (!pointcloud.showBoundingBox && node.boundingBoxNode) {
				node.boundingBoxNode.visible = false;
			}
		}

		// add child nodes to priorityQueue
		let children = node.getChildren();
		for (let i = 0; i < children.length; i++) {
			let child = children[i];

			let weight = 0;
			if(camera.isPerspectiveCamera){
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

	for (let i = 0; i < Math.min(Potree.maxNodesLoading, unloadedGeometry.length); i++) {
		unloadedGeometry[i].load();
	}

	return {
		visibleNodes: visibleNodes,
		numVisiblePoints: numVisiblePoints,
		lowestSpacing: lowestSpacing
	};
};

Potree.XHRFactory = {
	config: {
		withCredentials: false,
		customHeaders: [
			{ header: null, value: null }
		]
	},

	createXMLHttpRequest: function () {
		let xhr = new XMLHttpRequest();

		if (this.config.customHeaders &&
			Array.isArray(this.config.customHeaders) &&
			this.config.customHeaders.length > 0) {
			let baseOpen = xhr.open;
			let customHeaders = this.config.customHeaders;
			xhr.open = function () {
				baseOpen.apply(this, [].slice.call(arguments));
				customHeaders.forEach(function (customHeader) {
					if (!!customHeader.header && !!customHeader.value) {
						xhr.setRequestHeader(customHeader.header, customHeader.value);
					}
				});
			};
		}

		return xhr;
	}
};



(function($){
	$.fn.extend({
		selectgroup: function(args = {}){

			let elGroup = $(this);
			let rootID = elGroup.prop("id");
			let groupID = `${rootID}`;
			let groupTitle = (args.title !== undefined) ? args.title : "";

			let elButtons = [];
			elGroup.find("option").each((index, value) => {
				let buttonID = $(value).prop("id");
				let label = $(value).html();
				let optionValue = $(value).prop("value");

				let elButton = $(`
					<span style="flex-grow: 1; display: inherit">
					<label for="${buttonID}" class="ui-button" style="width: 100%; padding: .4em .1em">${label}</label>
					<input type="radio" name="${groupID}" id="${buttonID}" value="${optionValue}" style="display: none"/>
					</span>
				`);
				let elLabel = elButton.find("label");
				let elInput = elButton.find("input");

				elInput.change( () => {
					elGroup.find("label").removeClass("ui-state-active");
					elGroup.find("label").addClass("ui-state-default");
					if(elInput.is(":checked")){
						elLabel.addClass("ui-state-active");
					}else{
						//elLabel.addClass("ui-state-default");
					}
				});

				elButtons.push(elButton);
			});

			let elFieldset = $(`
				<fieldset style="border: none; margin: 0px; padding: 0px">
					<legend>${groupTitle}</legend>
					<span style="display: flex">

					</span>
				</fieldset>
			`);

			let elButtonContainer = elFieldset.find("span");
			for(let elButton of elButtons){
				elButtonContainer.append(elButton);
			}

			elButtonContainer.find("label").each( (index, value) => {
				$(value).css("margin", "0px");
				$(value).css("border-radius", "0px");
				$(value).css("border", "1px solid black");
				$(value).css("border-left", "none");
			});
			elButtonContainer.find("label:first").each( (index, value) => {
				$(value).css("border-radius", "4px 0px 0px 4px");

			});
			elButtonContainer.find("label:last").each( (index, value) => {
				$(value).css("border-radius", "0px 4px 4px 0px");
				$(value).css("border-left", "none");
			});

			elGroup.empty();
			elGroup.append(elFieldset);



		}
	});
})(jQuery);



// Copied from three.js: WebGLRenderer.js
Potree.paramThreeToGL = function paramThreeToGL(_gl, p) {

	let extension;

	if (p === THREE.RepeatWrapping) return _gl.REPEAT;
	if (p === THREE.ClampToEdgeWrapping) return _gl.CLAMP_TO_EDGE;
	if (p === THREE.MirroredRepeatWrapping) return _gl.MIRRORED_REPEAT;

	if (p === THREE.NearestFilter) return _gl.NEAREST;
	if (p === THREE.NearestMipMapNearestFilter) return _gl.NEAREST_MIPMAP_NEAREST;
	if (p === THREE.NearestMipMapLinearFilter) return _gl.NEAREST_MIPMAP_LINEAR;

	if (p === THREE.LinearFilter) return _gl.LINEAR;
	if (p === THREE.LinearMipMapNearestFilter) return _gl.LINEAR_MIPMAP_NEAREST;
	if (p === THREE.LinearMipMapLinearFilter) return _gl.LINEAR_MIPMAP_LINEAR;

	if (p === THREE.UnsignedByteType) return _gl.UNSIGNED_BYTE;
	if (p === THREE.UnsignedShort4444Type) return _gl.UNSIGNED_SHORT_4_4_4_4;
	if (p === THREE.UnsignedShort5551Type) return _gl.UNSIGNED_SHORT_5_5_5_1;
	if (p === THREE.UnsignedShort565Type) return _gl.UNSIGNED_SHORT_5_6_5;

	if (p === THREE.ByteType) return _gl.BYTE;
	if (p === THREE.ShortType) return _gl.SHORT;
	if (p === THREE.UnsignedShortType) return _gl.UNSIGNED_SHORT;
	if (p === THREE.IntType) return _gl.INT;
	if (p === THREE.UnsignedIntType) return _gl.UNSIGNED_INT;
	if (p === THREE.FloatType) return _gl.FLOAT;

	if (p === THREE.HalfFloatType) {

		extension = extensions.get('OES_texture_half_float');

		if (extension !== null) return extension.HALF_FLOAT_OES;

	}

	if (p === THREE.AlphaFormat) return _gl.ALPHA;
	if (p === THREE.RGBFormat) return _gl.RGB;
	if (p === THREE.RGBAFormat) return _gl.RGBA;
	if (p === THREE.LuminanceFormat) return _gl.LUMINANCE;
	if (p === THREE.LuminanceAlphaFormat) return _gl.LUMINANCE_ALPHA;
	if (p === THREE.DepthFormat) return _gl.DEPTH_COMPONENT;
	if (p === THREE.DepthStencilFormat) return _gl.DEPTH_STENCIL;

	if (p === THREE.AddEquation) return _gl.FUNC_ADD;
	if (p === THREE.SubtractEquation) return _gl.FUNC_SUBTRACT;
	if (p === THREE.ReverseSubtractEquation) return _gl.FUNC_REVERSE_SUBTRACT;

	if (p === THREE.ZeroFactor) return _gl.ZERO;
	if (p === THREE.OneFactor) return _gl.ONE;
	if (p === THREE.SrcColorFactor) return _gl.SRC_COLOR;
	if (p === THREE.OneMinusSrcColorFactor) return _gl.ONE_MINUS_SRC_COLOR;
	if (p === THREE.SrcAlphaFactor) return _gl.SRC_ALPHA;
	if (p === THREE.OneMinusSrcAlphaFactor) return _gl.ONE_MINUS_SRC_ALPHA;
	if (p === THREE.DstAlphaFactor) return _gl.DST_ALPHA;
	if (p === THREE.OneMinusDstAlphaFactor) return _gl.ONE_MINUS_DST_ALPHA;

	if (p === THREE.DstColorFactor) return _gl.DST_COLOR;
	if (p === THREE.OneMinusDstColorFactor) return _gl.ONE_MINUS_DST_COLOR;
	if (p === THREE.SrcAlphaSaturateFactor) return _gl.SRC_ALPHA_SATURATE;

	if (p === THREE.RGB_S3TC_DXT1_Format || p === RGBA_S3TC_DXT1_Format ||
		p === THREE.RGBA_S3TC_DXT3_Format || p === RGBA_S3TC_DXT5_Format) {

		extension = extensions.get('WEBGL_compressed_texture_s3tc');

		if (extension !== null) {

			if (p === THREE.RGB_S3TC_DXT1_Format) return extension.COMPRESSED_RGB_S3TC_DXT1_EXT;
			if (p === THREE.RGBA_S3TC_DXT1_Format) return extension.COMPRESSED_RGBA_S3TC_DXT1_EXT;
			if (p === THREE.RGBA_S3TC_DXT3_Format) return extension.COMPRESSED_RGBA_S3TC_DXT3_EXT;
			if (p === THREE.RGBA_S3TC_DXT5_Format) return extension.COMPRESSED_RGBA_S3TC_DXT5_EXT;

		}

	}

	if (p === THREE.RGB_PVRTC_4BPPV1_Format || p === THREE.RGB_PVRTC_2BPPV1_Format ||
		p === THREE.RGBA_PVRTC_4BPPV1_Format || p === THREE.RGBA_PVRTC_2BPPV1_Format) {

		extension = extensions.get('WEBGL_compressed_texture_pvrtc');

		if (extension !== null) {

			if (p === THREE.RGB_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;
			if (p === THREE.RGB_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;
			if (p === THREE.RGBA_PVRTC_4BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;
			if (p === THREE.RGBA_PVRTC_2BPPV1_Format) return extension.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG;

		}

	}

	if (p === THREE.RGB_ETC1_Format) {

		extension = extensions.get('WEBGL_compressed_texture_etc1');

		if (extension !== null) return extension.COMPRESSED_RGB_ETC1_WEBGL;

	}

	if (p === THREE.MinEquation || p === THREE.MaxEquation) {

		extension = extensions.get('EXT_blend_minmax');

		if (extension !== null) {

			if (p === THREE.MinEquation) return extension.MIN_EXT;
			if (p === THREE.MaxEquation) return extension.MAX_EXT;

		}

	}

	if (p === UnsignedInt248Type) {

		extension = extensions.get('WEBGL_depth_texture');

		if (extension !== null) return extension.UNSIGNED_INT_24_8_WEBGL;

	}

	return 0;

};

Potree.attributeLocations = {
	"position": 0,
	"color": 1,
	"intensity": 2,
	"classification": 3, 
	"returnNumber": 4,
	"numberOfReturns": 5,
	"pointSourceID": 6,
	"indices": 7,
	"normal": 8,
	"spacing": 9,
};

Potree.Shader = class Shader {

	constructor(gl, name, vsSource, fsSource) {
		this.gl = gl;
		this.name = name;
		this.vsSource = vsSource;
		this.fsSource = fsSource;

		this.cache = new Map();

		this.vs = null;
		this.fs = null;
		this.program = null;

		this.uniformLocations = {};
		this.attributeLocations = {};

		this.update(vsSource, fsSource);
	}

	update(vsSource, fsSource) {
		this.vsSource = vsSource;
		this.fsSource = fsSource;

		this.linkProgram();
	}

	compileShader(shader, source){
		let gl = this.gl;

		gl.shaderSource(shader, source);

		gl.compileShader(shader);

		let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (!success) {
			let info = gl.getShaderInfoLog(shader);
			let numberedSource = source.split("\n").map((a, i) => `${i + 1}`.padEnd(5) + a).join("\n");
			throw `could not compile shader ${this.name}: ${info}, \n${numberedSource}`;
		}
	}

	linkProgram() {

		let gl = this.gl;

		this.uniformLocations = {};
		this.attributeLocations = {};

		gl.useProgram(null);

		let cached = this.cache.get(`${this.vsSource}, ${this.fsSource}`);
		if (cached) {
			this.program = cached.program;
			this.vs = cached.vs;
			this.fs = cached.fs;
			this.attributeLocations = cached.attributeLocations;
			this.uniformLocations = cached.uniformLocations;

			return;
		} else {

			this.vs = gl.createShader(gl.VERTEX_SHADER);
			this.fs = gl.createShader(gl.FRAGMENT_SHADER);
			this.program = gl.createProgram();

			for(let name of Object.keys(Potree.attributeLocations)){
				let location = Potree.attributeLocations[name];
				gl.bindAttribLocation(this.program, location, name);
			}

			this.compileShader(this.vs, this.vsSource);
			this.compileShader(this.fs, this.fsSource);

			let program = this.program;

			gl.attachShader(program, this.vs);
			gl.attachShader(program, this.fs);

			gl.linkProgram(program);

			gl.detachShader(program, this.vs);
			gl.detachShader(program, this.fs);

			let success = gl.getProgramParameter(program, gl.LINK_STATUS);
			if (!success) {
				let info = gl.getProgramInfoLog(program);
				throw `could not link program ${this.name}: ${info}`;
			}

			{ // attribute locations
				let numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

				for (let i = 0; i < numAttributes; i++) {
					let attribute = gl.getActiveAttrib(program, i);

					let location = gl.getAttribLocation(program, attribute.name);

					this.attributeLocations[attribute.name] = location;
				}
			}

			{ // uniform locations
				let numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

				for (let i = 0; i < numUniforms; i++) {
					let uniform = gl.getActiveUniform(program, i);

					let location = gl.getUniformLocation(program, uniform.name);

					this.uniformLocations[uniform.name] = location;
				}
			}

			let cached = {
				program: this.program,
				vs: this.vs,
				fs: this.fs,
				attributeLocations: this.attributeLocations,
				uniformLocations: this.uniformLocations
			};

			this.cache.set(`${this.vsSource}, ${this.fsSource}`, cached);
		}




	}

	setUniformMatrix4(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		let tmp = new Float32Array(value.elements);
		gl.uniformMatrix4fv(location, false, tmp);
	}

	setUniform1f(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1f(location, value);
	}

	setUniformBoolean(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1i(location, value);
	}

	setUniformTexture(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1i(location, value);
	}

	setUniform2f(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform2f(location, value[0], value[1]);
	}

	setUniform3f(name, value) {
		const gl = this.gl;
		const location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform3f(location, value[0], value[1], value[2]);
	}

	setUniform(name, value) {

		if (value.constructor === THREE.Matrix4) {
			this.setUniformMatrix4(name, value);
		} else if (typeof value === "number") {
			this.setUniform1f(name, value);
		} else if (typeof value === "boolean") {
			this.setUniformBoolean(name, value);
		} else if (value instanceof Potree.WebGLTexture) {
			this.setUniformTexture(name, value);
		} else if (value instanceof Array) {

			if (value.length === 2) {
				this.setUniform2f(name, value);
			} else if (value.length === 3) {
				this.setUniform3f(name, value);
			}

		} else {
			console.error("unhandled uniform type: ", name, value);
		}

	}


	setUniform1i(name, value) {
		let gl = this.gl;
		let location = this.uniformLocations[name];

		if (location == null) {
			return;
		}

		gl.uniform1i(location, value);
	}

};

Potree.WebGLTexture = class WebGLTexture {

	constructor(gl, texture) {
		this.gl = gl;

		this.texture = texture;
		this.id = gl.createTexture();

		this.target = gl.TEXTURE_2D;
		this.version = -1;

		this.update(texture);
	}

	update() {

		if (!this.texture.image) {
			this.version = this.texture.version;

			return;
		}

		let gl = this.gl;
		let texture = this.texture;

		if (this.version === texture.version) {
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

		if (texture instanceof THREE.DataTexture) {
			data = texture.image.data;

			gl.texParameteri(this.target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(this.target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.texParameteri(this.target, gl.TEXTURE_MAG_FILTER, Potree.paramThreeToGL(gl, texture.magFilter));
			gl.texParameteri(this.target, gl.TEXTURE_MIN_FILTER, Potree.paramThreeToGL(gl, texture.minFilter));

			gl.texImage2D(this.target, level, internalFormat,
				width, height, border, srcFormat, srcType,
				data);
		} else if (texture instanceof THREE.CanvasTexture) {
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

Potree.WebGLBuffer = class WebGLBuffer {

	constructor() {
		this.numElements = 0;
		this.vao = null;
		this.vbos = new Map();
	}

};

Potree.Renderer = class Renderer {

	constructor(threeRenderer) {
		this.threeRenderer = threeRenderer;
		this.gl = this.threeRenderer.context;

		this.buffers = new Map();
		this.shaders = new Map();
		this.textures = new Map();

		this.glTypeMapping = new Map();
		this.glTypeMapping.set(Float32Array, this.gl.FLOAT);
		this.glTypeMapping.set(Uint8Array, this.gl.UNSIGNED_BYTE);
		this.glTypeMapping.set(Uint16Array, this.gl.UNSIGNED_SHORT);

		this.toggle = 0;
	}

	createBuffer(geometry){
		let gl = this.gl;
		let webglBuffer = new Potree.WebGLBuffer();
		webglBuffer.vao = gl.createVertexArray();
		webglBuffer.numElements = geometry.attributes.position.count;

		gl.bindVertexArray(webglBuffer.vao);

		for(let attributeName in geometry.attributes){
			let bufferAttribute = geometry.attributes[attributeName];

			let vbo = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, bufferAttribute.array, gl.STATIC_DRAW);

			let attributeLocation = Potree.attributeLocations[attributeName];
			let normalized = bufferAttribute.normalized;
			let type = this.glTypeMapping.get(bufferAttribute.array.constructor);

			gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
			gl.enableVertexAttribArray(attributeLocation);

			webglBuffer.vbos.set(attributeName, {
				handle: vbo,
				name: attributeName,
				count: bufferAttribute.count,
				itemSize: bufferAttribute.itemSize,
				type: geometry.attributes.position.array.constructor,
				version: 0
			});
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);

		return webglBuffer;
	}

	updateBuffer(geometry){
		let gl = this.gl;

		let webglBuffer = this.buffers.get(geometry);

		gl.bindVertexArray(webglBuffer.vao);

		for(let attributeName in geometry.attributes){
			let bufferAttribute = geometry.attributes[attributeName];

			let attributeLocation = Potree.attributeLocations[attributeName];
			let normalized = bufferAttribute.normalized;
			let type = this.glTypeMapping.get(bufferAttribute.array.constructor);

			let vbo = null;
			if(!webglBuffer.vbos.has(attributeName)){
				vbo = gl.createBuffer();

				webglBuffer.vbos.set(attributeName, {
					handle: vbo,
					name: attributeName,
					count: bufferAttribute.count,
					itemSize: bufferAttribute.itemSize,
					type: geometry.attributes.position.array.constructor,
					version: bufferAttribute.version
				});
			}else{
				vbo = webglBuffer.vbos.get(attributeName).handle;
				webglBuffer.vbos.get(attributeName).version = bufferAttribute.version;
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, bufferAttribute.array, gl.STATIC_DRAW);
			gl.vertexAttribPointer(attributeLocation, bufferAttribute.itemSize, type, normalized, 0, 0);
			gl.enableVertexAttribArray(attributeLocation);
		}

		gl.bindBuffer(gl.ARRAY_BUFFER, null);
		gl.bindVertexArray(null);
	}

	traverse(scene) {

		let octrees = [];

		let stack = [scene];
		while (stack.length > 0) {

			let node = stack.pop();

			if (node instanceof Potree.PointCloudTree) {
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



	renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params) {

		if (Potree.measureTimings) performance.mark("renderNodes-start");

		let gl = this.gl;

		let material = params.material ? params.material : octree.material;
		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;
		let worldView = new THREE.Matrix4();

		let mat4holder = new Float32Array(16);

		let i = 0;
		for (let node of nodes) {

			if(Potree.debug.allowedNodes !== undefined){
				if(!Potree.debug.allowedNodes.includes(node.name)){
					continue;
				}
			}

			//if(![
			//	"r42006420226",
			//	]
			//	.includes(node.name)){
			//	continue;
			//}

			let world = node.sceneNode.matrixWorld;
			worldView.multiplyMatrices(view, world);
			//this.multiplyViewWithScaleTrans(view, world, worldView);

			if (visibilityTextureData) {
				let vnStart = visibilityTextureData.offsets.get(node);
				shader.setUniform1f("uVNStart", vnStart);
			}


			let level = node.getLevel();

			if(node.debug){
				shader.setUniform("uDebug", true);
			}else{
				shader.setUniform("uDebug", false);
			}

			let isLeaf;
			if(node instanceof Potree.PointCloudOctreeNode){
				isLeaf = Object.keys(node.children).length === 0;
			}else if(node instanceof Potree.PointCloudArena4DNode){
				isLeaf = node.geometryNode.isLeaf;
			}
			shader.setUniform("uIsLeafNode", isLeaf);


			// TODO consider passing matrices in an array to avoid uniformMatrix4fv overhead
			const lModel = shader.uniformLocations["modelMatrix"];
			if (lModel) {
				mat4holder.set(world.elements);
				gl.uniformMatrix4fv(lModel, false, mat4holder);
			}

			const lModelView = shader.uniformLocations["modelViewMatrix"];
			//mat4holder.set(worldView.elements);
			// faster then set in chrome 63
			for(let j = 0; j < 16; j++){
				mat4holder[j] = worldView.elements[j];
			}
			gl.uniformMatrix4fv(lModelView, false, mat4holder);

			{ // Clip Polygons
				if(material.clipPolygons && material.clipPolygons.length > 0){

					let clipPolygonVCount = [];
					let worldViewProjMatrices = [];

					for(let clipPolygon of material.clipPolygons){

						let view = clipPolygon.viewMatrix;
						let proj = clipPolygon.projMatrix;

						let worldViewProj = proj.clone().multiply(view).multiply(world);

						clipPolygonVCount.push(clipPolygon.markers.length);
						worldViewProjMatrices.push(worldViewProj);
					}

					let flattenedMatrices = [].concat(...worldViewProjMatrices.map(m => m.elements));

					let flattenedVertices = new Array(8 * 3 * material.clipPolygons.length);
					for(let i = 0; i < material.clipPolygons.length; i++){
						let clipPolygon = material.clipPolygons[i];
						for(let j = 0; j < clipPolygon.markers.length; j++){
							flattenedVertices[i * 24 + (j * 3 + 0)] = clipPolygon.markers[j].position.x;
							flattenedVertices[i * 24 + (j * 3 + 1)] = clipPolygon.markers[j].position.y;
							flattenedVertices[i * 24 + (j * 3 + 2)] = clipPolygon.markers[j].position.z;
						}
					}

					const lClipPolygonVCount = shader.uniformLocations["uClipPolygonVCount[0]"];
					gl.uniform1iv(lClipPolygonVCount, clipPolygonVCount);

					const lClipPolygonVP = shader.uniformLocations["uClipPolygonWVP[0]"];
					gl.uniformMatrix4fv(lClipPolygonVP, false, flattenedMatrices);

					const lClipPolygons = shader.uniformLocations["uClipPolygonVertices[0]"];
					gl.uniform3fv(lClipPolygons, flattenedVertices);

				}
			}


			//shader.setUniformMatrix4("modelMatrix", world);
			//shader.setUniformMatrix4("modelViewMatrix", worldView);
			shader.setUniform1f("uLevel", level);
			shader.setUniform1f("uNodeSpacing", node.geometryNode.estimatedSpacing);

			shader.setUniform1f("uPCIndex", i);
			// uBBSize

			if (shadowMaps.length > 0) {

				const lShadowMap = shader.uniformLocations["uShadowMap[0]"];

				shader.setUniform3f("uShadowColor", material.uniforms.uShadowColor.value);

				let bindingStart = 5;
				let bindingPoints = new Array(shadowMaps.length).fill(bindingStart).map((a, i) => (a + i));
				gl.uniform1iv(lShadowMap, bindingPoints);

				for (let i = 0; i < shadowMaps.length; i++) {
					let shadowMap = shadowMaps[i];
					let bindingPoint = bindingPoints[i];
					let glTexture = this.threeRenderer.properties.get(shadowMap.target.texture).__webglTexture;

					gl.activeTexture(gl[`TEXTURE${bindingPoint}`]);
					gl.bindTexture(gl.TEXTURE_2D, glTexture);
				}

				{

					let worldViewMatrices = shadowMaps
						.map(sm => sm.camera.matrixWorldInverse)
						.map(view => new THREE.Matrix4().multiplyMatrices(view, world))

					let flattenedMatrices = [].concat(...worldViewMatrices.map(c => c.elements));
					const lWorldView = shader.uniformLocations["uShadowWorldView[0]"];
					gl.uniformMatrix4fv(lWorldView, false, flattenedMatrices);
				}

				{
					let flattenedMatrices = [].concat(...shadowMaps.map(sm => sm.camera.projectionMatrix.elements));
					const lProj = shader.uniformLocations["uShadowProj[0]"];
					gl.uniformMatrix4fv(lProj, false, flattenedMatrices);
				}
			}

			let geometry = node.geometryNode.geometry;

			let webglBuffer = null;
			if(!this.buffers.has(geometry)){
				webglBuffer = this.createBuffer(geometry);
				this.buffers.set(geometry, webglBuffer);
			}else{
				webglBuffer = this.buffers.get(geometry);
				for(let attributeName in geometry.attributes){
					let attribute = geometry.attributes[attributeName];

					if(attribute.version > webglBuffer.vbos.get(attributeName).version){
						this.updateBuffer(geometry);
					}
				}
			}

			gl.bindVertexArray(webglBuffer.vao);

			let numPoints = webglBuffer.numElements;
			gl.drawArrays(gl.POINTS, 0, numPoints);

			i++;
		}

		gl.bindVertexArray(null);

		if (Potree.measureTimings) {
			performance.mark("renderNodes-end");
			performance.measure("render.renderNodes", "renderNodes-start", "renderNodes-end");
		}
	}

	renderOctree(octree, nodes, camera, target, params = {}){

		let gl = this.gl;

		let material = params.material ? params.material : octree.material;
		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;
		let viewInv = camera.matrixWorld;
		let proj = camera.projectionMatrix;
		let projInv = new THREE.Matrix4().getInverse(proj);
		let worldView = new THREE.Matrix4();

		let shader = null;
		let visibilityTextureData = null;

		let currentTextureBindingPoint = 0;

		//if(!["r", "r2", "r0", "r26", "r22", "r06", "r24", "r20", "r04", "r00", "r02"].includes(node.name)){
		//	if(!["r", "r2", "r0"].includes(node.name)){
		//		continue;
		//	}

		//nodes = nodes.filter(node => {
		//	return ["r", "r6", "r66", "r664", "r6646", "r6644", "r64", "r646", "r4", "r66446", "r6642", "r660", "r62", "r2", "r6640"].includes(node.name)});

		//nodes = nodes.filter(node => {
		//	return [
		//		//"r", 
		//		"r6", 
		//		"r2", 
		//		"r4", 
		//		"r64", 
		//		"r66", 
		//		"r62", 
		//		"r664", 
		//		"r646", 
		//		"r660", 
		//		"r6646", 
		//		//"r6644", 
		//		//"r6642", 
		//		//"r6640",
		//		//"r66446", 
		//		].includes(node.name)});

	


		if (material.pointSizeType >= 0) {
			if (material.pointSizeType === Potree.PointSizeType.ADAPTIVE ||
				material.pointColorType === Potree.PointColorType.LOD) {

				let vnNodes = (params.vnTextureNodes != null) ? params.vnTextureNodes : nodes;
				visibilityTextureData = octree.computeVisibilityTextureData(vnNodes, camera);

				const vnt = material.visibleNodesTexture;
				const data = vnt.image.data;
				data.set(visibilityTextureData.data);
				vnt.needsUpdate = true;

			}
		}

		//nodes = nodes.filter(node => {
		//	return [
		//		"r", 
		//		"r6", 
		//		"r2", 
		//		"r4", 
		//		"r64", 
		//		"r66", 
		//		"r62", 
		//		"r664", 
		//		"r646", 
		//		"r660", 

		//		"r6646", 

		//		"r6644", 
		//		"r6642", 
		//		"r6640",
		//		"r66446", 
		//		].includes(node.name)});

		{ // UPDATE SHADER AND TEXTURES
			if (!this.shaders.has(material)) {
				let [vs, fs] = [material.vertexShader, material.fragmentShader];
				let shader = new Potree.Shader(gl, "pointcloud", vs, fs);

				this.shaders.set(material, shader);
			}

			shader = this.shaders.get(material);

			//if(material.needsUpdate){
			{
				let [vs, fs] = [material.vertexShader, material.fragmentShader];

				let numSnapshots = material.snapEnabled ? material.numSnapshots : 0;
				let numClipBoxes = (material.clipBoxes && material.clipBoxes.length) ? material.clipBoxes.length : 0;
				let numClipPolygons = (material.clipPolygons && material.clipPolygons.length) ? material.clipPolygons.length : 0;
				let defines = [
					`#define num_shadowmaps ${shadowMaps.length}`,
					`#define num_snapshots ${numSnapshots}`,
					`#define num_clipboxes ${numClipBoxes}`,
					`#define num_clippolygons ${numClipPolygons}`,
				];

				//vs = `#define num_shadowmaps ${shadowMaps.length}\n` + vs;
				//fs = `#define num_shadowmaps ${shadowMaps.length}\n` + fs;

				let definesString = defines.join("\n");

				vs = `${definesString}\n${vs}`;
				fs = `${definesString}\n${fs}`;

				shader.update(vs, fs);

				material.needsUpdate = false;
			}

			for (let uniformName of Object.keys(material.uniforms)) {
				let uniform = material.uniforms[uniformName];

				if (uniform.type == "t") {

					let texture = uniform.value;

					if (!texture) {
						continue;
					}

					if (!this.textures.has(texture)) {
						let webglTexture = new Potree.WebGLTexture(gl, texture);

						this.textures.set(texture, webglTexture);
					}

					let webGLTexture = this.textures.get(texture);
					webGLTexture.update();


				}
			}
		}

		gl.useProgram(shader.program);

		let transparent = false;
		if(params.transparent !== undefined){
			transparent = params.transparent && material.opacity < 1;
		}else{
			transparent = material.opacity < 1;
		}

		if (transparent){
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
			gl.depthMask(false);
			gl.disable(gl.DEPTH_TEST);
		} else {
			gl.disable(gl.BLEND);
			gl.depthMask(true);
			gl.enable(gl.DEPTH_TEST);
		}

		if(params.blendFunc !== undefined){
			gl.enable(gl.BLEND);
			gl.blendFunc(...params.blendFunc);
		}

		if(params.depthTest !== undefined){
			if(params.depthTest === true){
				gl.enable(gl.DEPTH_TEST);
			}else{
				gl.disable(gl.DEPTH_TEST);
			}
		}

		if(params.depthWrite !== undefined){
			 if(params.depthWrite === true){
				 gl.depthMask(true);
			 }else{
				 gl.depthMask(false);
			 }
			 
		}


		{ // UPDATE UNIFORMS
			shader.setUniformMatrix4("projectionMatrix", proj);
			shader.setUniformMatrix4("viewMatrix", view);
			shader.setUniformMatrix4("uViewInv", viewInv);
			shader.setUniformMatrix4("uProjInv", projInv);

			let screenWidth = target ? target.width : material.screenWidth;
			let screenHeight = target ? target.height : material.screenHeight;

			shader.setUniform1f("uScreenWidth", screenWidth);
			shader.setUniform1f("uScreenHeight", screenHeight);
			shader.setUniform1f("fov", Math.PI * camera.fov / 180);
			shader.setUniform1f("near", camera.near);
			shader.setUniform1f("far", camera.far);
			
			if(camera instanceof THREE.OrthographicCamera){
				shader.setUniform("uUseOrthographicCamera", true);
				shader.setUniform("uOrthoWidth", camera.right - camera.left); 
				shader.setUniform("uOrthoHeight", camera.top - camera.bottom);
			}else{
				shader.setUniform("uUseOrthographicCamera", false);
			}

			if(material.clipBoxes.length + material.clipPolygons.length === 0){
				shader.setUniform1i("clipTask", Potree.ClipTask.NONE);
			}else{
				shader.setUniform1i("clipTask", material.clipTask);
			}

			shader.setUniform1i("clipMethod", material.clipMethod);

			if (material.clipBoxes && material.clipBoxes.length > 0) {
				
				let flattenedMatrices = [].concat(...material.clipBoxes.map(c => c.inverse.elements));

				const lClipBoxes = shader.uniformLocations["clipBoxes[0]"];
				gl.uniformMatrix4fv(lClipBoxes, false, flattenedMatrices);
			}

			shader.setUniform1f("size", material.size);
			shader.setUniform1f("maxSize", material.uniforms.maxSize.value);
			shader.setUniform1f("minSize", material.uniforms.minSize.value);

			// uniform float uPCIndex
			shader.setUniform1f("uOctreeSpacing", material.spacing);
			shader.setUniform("uOctreeSize", material.uniforms.octreeSize.value);


			//uniform vec3 uColor;
			shader.setUniform3f("uColor", material.color.toArray());
			//uniform float opacity;
			shader.setUniform1f("uOpacity", material.opacity);

			shader.setUniform2f("elevationRange", material.elevationRange);
			shader.setUniform2f("intensityRange", material.intensityRange);
			//uniform float intensityGamma;
			//uniform float intensityContrast;
			//uniform float intensityBrightness;
			shader.setUniform1f("intensityGamma", material.intensityGamma);
			shader.setUniform1f("intensityContrast", material.intensityContrast);
			shader.setUniform1f("intensityBrightness", material.intensityBrightness);

			shader.setUniform1f("rgbGamma", material.rgbGamma);
			shader.setUniform1f("rgbContrast", material.rgbContrast);
			shader.setUniform1f("rgbBrightness", material.rgbBrightness);
			shader.setUniform1f("uTransition", material.transition);
			shader.setUniform1f("wRGB", material.weightRGB);
			shader.setUniform1f("wIntensity", material.weightIntensity);
			shader.setUniform1f("wElevation", material.weightElevation);
			shader.setUniform1f("wClassification", material.weightClassification);
			shader.setUniform1f("wReturnNumber", material.weightReturnNumber);
			shader.setUniform1f("wSourceID", material.weightSourceID);

			let vnWebGLTexture = this.textures.get(material.visibleNodesTexture);
			shader.setUniform1i("visibleNodesTexture", currentTextureBindingPoint);
			gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
			gl.bindTexture(vnWebGLTexture.target, vnWebGLTexture.id);
			currentTextureBindingPoint++;

			let gradientTexture = this.textures.get(material.gradientTexture);
			shader.setUniform1i("gradient", currentTextureBindingPoint);
			gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
			gl.bindTexture(gradientTexture.target, gradientTexture.id);
			currentTextureBindingPoint++;

			let classificationTexture = this.textures.get(material.classificationTexture);
			shader.setUniform1i("classificationLUT", currentTextureBindingPoint);
			gl.activeTexture(gl.TEXTURE0 + currentTextureBindingPoint);
			gl.bindTexture(classificationTexture.target, classificationTexture.id);
			currentTextureBindingPoint++;


			if (material.snapEnabled === true) {

				{
					const lSnapshot = shader.uniformLocations["uSnapshot[0]"];
					const lSnapshotDepth = shader.uniformLocations["uSnapshotDepth[0]"];

					let bindingStart = currentTextureBindingPoint;
					let lSnapshotBindingPoints = new Array(5).fill(bindingStart).map((a, i) => (a + i));
					let lSnapshotDepthBindingPoints = new Array(5)
						.fill(1 + Math.max(...lSnapshotBindingPoints))
						.map((a, i) => (a + i));
					currentTextureBindingPoint = 1 + Math.max(...lSnapshotDepthBindingPoints);

					gl.uniform1iv(lSnapshot, lSnapshotBindingPoints);
					gl.uniform1iv(lSnapshotDepth, lSnapshotDepthBindingPoints);

					for (let i = 0; i < 5; i++) {
						let texture = material.uniforms[`uSnapshot`].value[i];
						let textureDepth = material.uniforms[`uSnapshotDepth`].value[i];

						if (!texture) {
							break;
						}

						let snapTexture = this.threeRenderer.properties.get(texture).__webglTexture;
						let snapTextureDepth = this.threeRenderer.properties.get(textureDepth).__webglTexture;

						let bindingPoint = lSnapshotBindingPoints[i];
						let depthBindingPoint = lSnapshotDepthBindingPoints[i];

						gl.activeTexture(gl[`TEXTURE${bindingPoint}`]);
						gl.bindTexture(gl.TEXTURE_2D, snapTexture);

						gl.activeTexture(gl[`TEXTURE${depthBindingPoint}`]);
						gl.bindTexture(gl.TEXTURE_2D, snapTextureDepth);
					}
				}

				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapView.value.map(c => c.elements));
					const lSnapView = shader.uniformLocations["uSnapView[0]"];
					gl.uniformMatrix4fv(lSnapView, false, flattenedMatrices);
				}
				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapProj.value.map(c => c.elements));
					const lSnapProj = shader.uniformLocations["uSnapProj[0]"];
					gl.uniformMatrix4fv(lSnapProj, false, flattenedMatrices);
				}
				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapProjInv.value.map(c => c.elements));
					const lSnapProjInv = shader.uniformLocations["uSnapProjInv[0]"];
					gl.uniformMatrix4fv(lSnapProjInv, false, flattenedMatrices);
				}
				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapViewInv.value.map(c => c.elements));
					const lSnapViewInv = shader.uniformLocations["uSnapViewInv[0]"];
					gl.uniformMatrix4fv(lSnapViewInv, false, flattenedMatrices);
				}

			}
		}

		this.renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE0);
	}

	render(scene, camera, target, params = {}) {

		const gl = this.gl;

		// PREPARE 
		if (target != null) {
			this.threeRenderer.setRenderTarget(target);
		}

		camera.updateProjectionMatrix();

		const traversalResult = this.traverse(scene);


		// RENDER
		for (const octree of traversalResult.octrees) {
			let nodes = octree.visibleNodes;
			this.renderOctree(octree, nodes, camera, target, params);
		}


		// CLEANUP
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null)

		this.threeRenderer.resetGLState();
	}



};










//
// index is in order xyzxyzxyz
//

Potree.DEMNode = class DEMNode {
	constructor (name, box, tileSize) {
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

	createMipMap () {
		this.mipMap = [this.data];

		let sourceSize = this.tileSize;
		let mipSize = parseInt(sourceSize / 2);
		let mipSource = this.data;
		while (mipSize > 1) {
			let mipData = new Float32Array(mipSize * mipSize);

			for (let i = 0; i < mipSize; i++) {
				for (let j = 0; j < mipSize; j++) {
					let h00 = mipSource[2 * i + 0 + 2 * j * sourceSize];
					let h01 = mipSource[2 * i + 0 + 2 * j * sourceSize + sourceSize];
					let h10 = mipSource[2 * i + 1 + 2 * j * sourceSize];
					let h11 = mipSource[2 * i + 1 + 2 * j * sourceSize + sourceSize];

					let [height, weight] = [0, 0];

					if (isFinite(h00)) { height += h00; weight += 1; };
					if (isFinite(h01)) { height += h01; weight += 1; };
					if (isFinite(h10)) { height += h10; weight += 1; };
					if (isFinite(h11)) { height += h11; weight += 1; };

					height = height / weight;

					// let hs = [h00, h01, h10, h11].filter(h => isFinite(h));
					// let height = hs.reduce( (a, v, i) => a + v, 0) / hs.length;

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

	uv (position) {
		let boxSize = this.box.getSize();

		let u = (position.x - this.box.min.x) / boxSize.x;
		let v = (position.y - this.box.min.y) / boxSize.y;

		return [u, v];
	}

	heightAtMipMapLevel (position, mipMapLevel) {
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

		if (wsum === 0) {
			return null;
		}

		let h = 0;

		if (isFinite(h00)) h += h00 * wh00;
		if (isFinite(h01)) h += h01 * wh01;
		if (isFinite(h10)) h += h10 * wh10;
		if (isFinite(h11)) h += h11 * wh11;

		return h;
	}

	height (position) {
		let h = null;

		for (let i = 0; i < this.mipMap.length; i++) {
			h = this.heightAtMipMapLevel(position, i);

			if (h !== null) {
				return h;
			}
		}

		return h;
	}

	traverse (handler, level = 0) {
		handler(this, level);

		for (let child of this.children.filter(c => c !== undefined)) {
			child.traverse(handler, level + 1);
		}
	}
};

Potree.DEM = class DEM {
	constructor (pointcloud) {
		this.pointcloud = pointcloud;
		this.matrix = null;
		this.boundingBox = null;
		this.tileSize = 64;
		this.root = null;
		this.version = 0;
	}

	// expands the tree to all nodes that intersect <box> at <level>
	// returns the intersecting nodes at <level>
	expandAndFindByBox (box, level) {
		if (level === 0) {
			return [this.root];
		}

		let result = [];
		let stack = [this.root];

		while (stack.length > 0) {
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
			if (min.x === 0 && min.y === 0 && max.x === 1 && max.y === 1) {
				childIndices = [0, 1, 2, 3];
			} else if (min.x === max.x && min.y === max.y) {
				childIndices = [(min.x << 1) | min.y];
			} else {
				childIndices = [(min.x << 1) | min.y, (max.x << 1) | max.y];
			}

			for (let index of childIndices) {
				if (node.children[index] === undefined) {
					let childBox = node.box.clone();

					if ((index & 2) > 0) {
						childBox.min.x += nodeBoxSize.x / 2.0;
					} else {
						childBox.max.x -= nodeBoxSize.x / 2.0;
					}

					if ((index & 1) > 0) {
						childBox.min.y += nodeBoxSize.y / 2.0;
					} else {
						childBox.max.y -= nodeBoxSize.y / 2.0;
					}

					let child = new Potree.DEMNode(node.name + index, childBox, this.tileSize);
					node.children[index] = child;
				}

				let child = node.children[index];

				if (child.level < level) {
					stack.push(child);
				} else {
					result.push(child);
				}
			}
		}

		return result;
	}

	childIndex (uv) {
		let [x, y] = uv.map(n => n < 0.5 ? 0 : 1);

		let index = (x << 1) | y;

		return index;
	}

	height (position) {
		// return this.root.height(position);

		if (!this.root) {
			return 0;
		}

		let height = null;
		let list = [this.root];
		while (true) {
			let node = list[list.length - 1];

			let currentHeight = node.height(position);

			if (currentHeight !== null) {
				height = currentHeight;
			}

			let uv = node.uv(position);
			let childIndex = this.childIndex(uv);

			if (node.children[childIndex]) {
				list.push(node.children[childIndex]);
			} else {
				break;
			}
		}

		return height + this.pointcloud.position.z;
	}

	update (visibleNodes) {
		if (Potree.getDEMWorkerInstance().working) {
			return;
		}

		// check if point cloud transformation changed
		if (this.matrix === null || !this.matrix.equals(this.pointcloud.matrixWorld)) {
			this.matrix = this.pointcloud.matrixWorld.clone();
			this.boundingBox = this.pointcloud.boundingBox.clone().applyMatrix4(this.matrix);
			this.root = new Potree.DEMNode('r', this.boundingBox, this.tileSize);
			this.version++;
		}

		// find node to update
		let node = null;
		for (let vn of visibleNodes) {
			if (vn.demVersion === undefined || vn.demVersion < this.version) {
				node = vn;
				break;
			}
		}
		if (node === null) {
			return;
		}

		// update node
		let projectedBox = node.getBoundingBox().clone().applyMatrix4(this.matrix);
		let projectedBoxSize = projectedBox.getSize();

		let targetNodes = this.expandAndFindByBox(projectedBox, node.getLevel());
		node.demVersion = this.version;

		Potree.getDEMWorkerInstance().onmessage = (e) => {
			let data = new Float32Array(e.data.dem.data);

			for (let demNode of targetNodes) {
				let boxSize = demNode.box.getSize();

				for (let i = 0; i < this.tileSize; i++) {
					for (let j = 0; j < this.tileSize; j++) {
						let u = (i / (this.tileSize - 1));
						let v = (j / (this.tileSize - 1));

						let x = demNode.box.min.x + u * boxSize.x;
						let y = demNode.box.min.y + v * boxSize.y;

						let ix = this.tileSize * (x - projectedBox.min.x) / projectedBoxSize.x;
						let iy = this.tileSize * (y - projectedBox.min.y) / projectedBoxSize.y;

						if (ix < 0 || ix > this.tileSize) {
							continue;
						}

						if (iy < 0 || iy > this.tileSize) {
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

			// let target = targetNodes[0];
			// target.data = new Float32Array(data);
			//
			//
			/// /node.dem = e.data.dem;
			//
			// Potree.getDEMWorkerInstance().working = false;
			//
			// { // create scene objects for debugging
			//	//for(let demNode of targetNodes){
			//		let bb = new Potree.Box3Helper(box);
			//		viewer.scene.scene.add(bb);
			//
			//		createDEMMesh(this, target);
			//	//}
			//
			// }
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

Potree.PointCloudTreeNode = class {

	constructor(){
		this.needsTransformUpdate = true;
	}

	getChildren () {
		throw new Error('override function');
	}

	getBoundingBox () {
		throw new Error('override function');
	}

	isLoaded () {
		throw new Error('override function');
	}

	isGeometryNode () {
		throw new Error('override function');
	}

	isTreeNode () {
		throw new Error('override function');
	}

	getLevel () {
		throw new Error('override function');
	}

	getBoundingSphere () {
		throw new Error('override function');
	}
};

Potree.PointCloudTree = class PointCloudTree extends THREE.Object3D {
	constructor () {
		super();

		this.dem = new Potree.DEM(this);
	}

	initialized () {
		return this.root !== null;
	}
};


Potree.WorkerPool = class WorkerPool{
	constructor(){
		this.workers = {};
	}

	getWorker(url){
		if (!this.workers[url]){
			this.workers[url] = [];
		}

		if (this.workers[url].length === 0){
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
precision highp float;
precision highp int;

#define max_clip_polygons 8
#define PI 3.141592653589793

attribute vec3 position;
attribute vec3 color;
attribute float intensity;
attribute float classification;
attribute float returnNumber;
attribute float numberOfReturns;
attribute float pointSourceID;
attribute vec4 indices;
attribute float spacing;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

uniform float uScreenWidth;
uniform float uScreenHeight;
uniform float fov;
uniform float near;
uniform float far;

uniform bool uDebug;

uniform bool uUseOrthographicCamera;
uniform float uOrthoWidth;
uniform float uOrthoHeight;


#define CLIPTASK_NONE 0
#define CLIPTASK_HIGHLIGHT 1
#define CLIPTASK_SHOW_INSIDE 2
#define CLIPTASK_SHOW_OUTSIDE 3

#define CLIPMETHOD_INSIDE_ANY 0
#define CLIPMETHOD_INSIDE_ALL 1

uniform int clipTask;
uniform int clipMethod;
#if defined(num_clipboxes) && num_clipboxes > 0
	uniform mat4 clipBoxes[num_clipboxes];
#endif

#if defined(num_clippolygons) && num_clippolygons > 0
	uniform int uClipPolygonVCount[num_clippolygons];
	uniform vec3 uClipPolygonVertices[num_clippolygons * 8];
	uniform mat4 uClipPolygonWVP[num_clippolygons];
#endif

uniform float size;
uniform float minSize;
uniform float maxSize;

uniform float uPCIndex;
uniform float uOctreeSpacing;
uniform float uNodeSpacing;
uniform float uOctreeSize;
uniform vec3 uBBSize;
uniform float uLevel;
uniform float uVNStart;
uniform bool uIsLeafNode;

uniform vec3 uColor;
uniform float uOpacity;

uniform vec2 elevationRange;
uniform vec2 intensityRange;
uniform float intensityGamma;
uniform float intensityContrast;
uniform float intensityBrightness;
uniform float rgbGamma;
uniform float rgbContrast;
uniform float rgbBrightness;
uniform float uTransition;
uniform float wRGB;
uniform float wIntensity;
uniform float wElevation;
uniform float wClassification;
uniform float wReturnNumber;
uniform float wSourceID;

uniform vec3 uShadowColor;

uniform sampler2D visibleNodes;
uniform sampler2D gradient;
uniform sampler2D classificationLUT;

#if defined(num_shadowmaps) && num_shadowmaps > 0
uniform sampler2D uShadowMap[num_shadowmaps];
uniform mat4 uShadowWorldView[num_shadowmaps];
uniform mat4 uShadowProj[num_shadowmaps];
#endif

#if defined(num_snapshots) && num_snapshots > 0
uniform sampler2D uSnapshot[num_snapshots];
uniform mat4 uSnapView[num_snapshots];
uniform mat4 uSnapProj[num_snapshots];
uniform mat4 uSnapScreenToCurrentView[num_snapshots];

varying float vSnapTextureID;
#endif

varying vec3	vColor;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float 	vRadius;
varying float 	vPointSize;


float round(float number){
	return floor(number + 0.5);
}

// 
//    ###    ########     ###    ########  ######## #### ##     ## ########     ######  #### ######## ########  ######  
//   ## ##   ##     ##   ## ##   ##     ##    ##     ##  ##     ## ##          ##    ##  ##       ##  ##       ##    ## 
//  ##   ##  ##     ##  ##   ##  ##     ##    ##     ##  ##     ## ##          ##        ##      ##   ##       ##       
// ##     ## ##     ## ##     ## ########     ##     ##  ##     ## ######       ######   ##     ##    ######    ######  
// ######### ##     ## ######### ##           ##     ##   ##   ##  ##                ##  ##    ##     ##             ## 
// ##     ## ##     ## ##     ## ##           ##     ##    ## ##   ##          ##    ##  ##   ##      ##       ##    ## 
// ##     ## ########  ##     ## ##           ##    ####    ###    ########     ######  #### ######## ########  ######  
// 																			


// ---------------------
// OCTREE
// ---------------------

#if (defined(adaptive_point_size) || defined(color_type_lod)) && defined(tree_type_octree)
/**
 * number of 1-bits up to inclusive index position
 * number is treated as if it were an integer in the range 0-255
 *
 */
int numberOfOnes(int number, int index){
	int numOnes = 0;
	int tmp = 128;
	for(int i = 7; i >= 0; i--){
		
		if(number >= tmp){
			number = number - tmp;

			if(i <= index){
				numOnes++;
			}
		}
		
		tmp = tmp / 2;
	}

	return numOnes;
}


/**
 * checks whether the bit at index is 1
 * number is treated as if it were an integer in the range 0-255
 *
 */
bool isBitSet(int number, int index){

	// weird multi else if due to lack of proper array, int and bitwise support in WebGL 1.0
	int powi = 1;
	if(index == 0){
		powi = 1;
	}else if(index == 1){
		powi = 2;
	}else if(index == 2){
		powi = 4;
	}else if(index == 3){
		powi = 8;
	}else if(index == 4){
		powi = 16;
	}else if(index == 5){
		powi = 32;
	}else if(index == 6){
		powi = 64;
	}else if(index == 7){
		powi = 128;
	}else{
		return false;
	}

	int ndp = number / powi;

	return mod(float(ndp), 2.0) != 0.0;
}


/**
 * find the LOD at the point position
 */
float getLOD(){
	
	vec3 offset = vec3(0.0, 0.0, 0.0);
	int iOffset = int(uVNStart);
	float depth = uLevel;
	for(float i = 0.0; i <= 30.0; i++){
		float nodeSizeAtLevel = uOctreeSize  / pow(2.0, i + uLevel + 0.0);
		
		vec3 index3d = (position-offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));
		
		vec4 value = texture2D(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
		int mask = int(round(value.r * 255.0));

		if(isBitSet(mask, index)){
			// there are more visible child nodes at this position
			int advanceG = int(round(value.g * 255.0)) * 256;
			int advanceB = int(round(value.b * 255.0));
			int advanceChild = numberOfOnes(mask, index - 1);
			int advance = advanceG + advanceB + advanceChild;

			iOffset = iOffset + advance;
			
			depth++;
		}else{
			// no more visible child nodes at this position
			return value.a * 255.0;
			//return depth;
		}
		
		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
	}
		
	return depth;
}

float getSpacing(){
	vec3 offset = vec3(0.0, 0.0, 0.0);
	int iOffset = int(uVNStart);
	float depth = uLevel;
	float spacing = uNodeSpacing;
	for(float i = 0.0; i <= 30.0; i++){
		float nodeSizeAtLevel = uOctreeSize  / pow(2.0, i + uLevel + 0.0);
		
		vec3 index3d = (position-offset) / nodeSizeAtLevel;
		index3d = floor(index3d + 0.5);
		int index = int(round(4.0 * index3d.x + 2.0 * index3d.y + index3d.z));
		
		vec4 value = texture2D(visibleNodes, vec2(float(iOffset) / 2048.0, 0.0));
		int mask = int(round(value.r * 255.0));
		float spacingFactor = value.a;

		if(i > 0.0){
			spacing = spacing / (255.0 * spacingFactor);
		}
		

		if(isBitSet(mask, index)){
			// there are more visible child nodes at this position
			int advanceG = int(round(value.g * 255.0)) * 256;
			int advanceB = int(round(value.b * 255.0));
			int advanceChild = numberOfOnes(mask, index - 1);
			int advance = advanceG + advanceB + advanceChild;

			iOffset = iOffset + advance;

			//spacing = spacing / (255.0 * spacingFactor);
			//spacing = spacing / 3.0;
			
			depth++;
		}else{
			// no more visible child nodes at this position
			return spacing;
		}
		
		offset = offset + (vec3(1.0, 1.0, 1.0) * nodeSizeAtLevel * 0.5) * index3d;
	}
		
	return spacing;
}

float getPointSizeAttenuation(){
	return pow(2.0, getLOD());
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
		
		
	vec3 size = uBBSize;	
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



// 
//    ###    ######## ######## ########  #### ########  ##     ## ######## ########  ######  
//   ## ##      ##       ##    ##     ##  ##  ##     ## ##     ##    ##    ##       ##    ## 
//  ##   ##     ##       ##    ##     ##  ##  ##     ## ##     ##    ##    ##       ##       
// ##     ##    ##       ##    ########   ##  ########  ##     ##    ##    ######    ######  
// #########    ##       ##    ##   ##    ##  ##     ## ##     ##    ##    ##             ## 
// ##     ##    ##       ##    ##    ##   ##  ##     ## ##     ##    ##    ##       ##    ## 
// ##     ##    ##       ##    ##     ## #### ########   #######     ##    ########  ######                                                                               
// 



// formula adapted from: http://www.dfstudios.co.uk/articles/programming/image-programming-algorithms/image-processing-algorithms-part-5-contrast-adjustment/
float getContrastFactor(float contrast){
	return (1.0158730158730156 * (contrast + 1.0)) / (1.0158730158730156 - contrast);
}

vec3 getRGB(){
	vec3 rgb = color;
	
	rgb = pow(rgb, vec3(rgbGamma));
	rgb = rgb + rgbBrightness;
	//rgb = (rgb - 0.5) * getContrastFactor(rgbContrast) + 0.5;
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

	//w = w + color.x * 0.0001;
	
	//float w = color.x * 0.001 + intensity / 1.0;

	return w;
}

vec3 getElevation(){
	vec4 world = modelMatrix * vec4( position, 1.0 );
	float w = (world.z - elevationRange.x) / (elevationRange.y - elevationRange.x);
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


// 
//  ######  ##       #### ########  ########  #### ##    ##  ######   
// ##    ## ##        ##  ##     ## ##     ##  ##  ###   ## ##    ##  
// ##       ##        ##  ##     ## ##     ##  ##  ####  ## ##        
// ##       ##        ##  ########  ########   ##  ## ## ## ##   #### 
// ##       ##        ##  ##        ##         ##  ##  #### ##    ##  
// ##    ## ##        ##  ##        ##         ##  ##   ### ##    ##  
//  ######  ######## #### ##        ##        #### ##    ##  ######                                                          
// 



vec3 getColor(){
	vec3 color;
	
	#ifdef color_type_rgb
		color = getRGB();
	#elif defined color_type_height
		color = getElevation();
	#elif defined color_type_rgb_height
		vec3 cHeight = getElevation();
		color = (1.0 - uTransition) * getRGB() + uTransition * cHeight;
	#elif defined color_type_depth
		float linearDepth = gl_Position.w;
		float expDepth = (gl_Position.z / gl_Position.w) * 0.5 + 0.5;
		color = vec3(linearDepth, expDepth, 0.0);
	#elif defined color_type_intensity
		float w = getIntensity();
		color = vec3(w, w, w);
	#elif defined color_type_intensity_gradient
		float w = getIntensity();
		color = texture2D(gradient, vec2(w,1.0-w)).rgb;
	#elif defined color_type_color
		color = uColor;
	#elif defined color_type_lod
		float depth = getLOD();
		float w = depth / 10.0;
		color = texture2D(gradient, vec2(w,1.0-w)).rgb;
	#elif defined color_type_point_index
		color = indices.rgb;
	#elif defined color_type_classification
		vec4 cl = getClassification(); 
		color = cl.rgb;
	#elif defined color_type_return_number
		color = getReturnNumber();
	#elif defined color_type_source
		color = getSourceID();
	#elif defined color_type_normal
		color = (modelMatrix * vec4(normal, 0.0)).xyz;
	#elif defined color_type_phong
		color = color;
	#elif defined color_type_composite
		color = getCompositeColor();
	#endif
	
	return color;
}

float getPointSize(){
	float pointSize = 1.0;
	
	float slope = tan(fov / 2.0);
	float projFactor = -0.5 * uScreenHeight / (slope * vViewPosition.z);
	
	float r = uOctreeSpacing * 1.7;
	vRadius = r;
	#if defined fixed_point_size
		pointSize = size;
	#elif defined attenuated_point_size
		if(uUseOrthographicCamera){
			pointSize = size;
		}else{
			pointSize = size * spacing * projFactor;
			//pointSize = pointSize * projFactor;
		}
	#elif defined adaptive_point_size
		if(uUseOrthographicCamera) {
			float worldSpaceSize = 1.0 * size * r / getPointSizeAttenuation();
			pointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
		} else {

			if(uIsLeafNode && false){
				pointSize = size * spacing * projFactor;
			}else{
				float worldSpaceSize = 1.0 * size * r / getPointSizeAttenuation();
				pointSize = worldSpaceSize * projFactor;
			}
		}
	#endif

	pointSize = max(minSize, pointSize);
	pointSize = min(maxSize, pointSize);
	
	vRadius = pointSize / projFactor;

	return pointSize;
}

#if defined(num_clippolygons) && num_clippolygons > 0
bool pointInClipPolygon(vec3 point, int polyIdx) {

	mat4 wvp = uClipPolygonWVP[polyIdx];
	//vec4 screenClipPos = uClipPolygonVP[polyIdx] * modelMatrix * vec4(point, 1.0);
	//screenClipPos.xy = screenClipPos.xy / screenClipPos.w * 0.5 + 0.5;

	vec4 pointNDC = wvp * vec4(point, 1.0);
	pointNDC.xy = pointNDC.xy / pointNDC.w;

	int j = uClipPolygonVCount[polyIdx] - 1;
	bool c = false;
	for(int i = 0; i < 8; i++) {
		if(i == uClipPolygonVCount[polyIdx]) {
			break;
		}

		//vec4 verti = wvp * vec4(uClipPolygonVertices[polyIdx * 8 + i], 1);
		//vec4 vertj = wvp * vec4(uClipPolygonVertices[polyIdx * 8 + j], 1);

		//verti.xy = verti.xy / verti.w;
		//vertj.xy = vertj.xy / vertj.w;

		//verti.xy = verti.xy / verti.w * 0.5 + 0.5;
		//vertj.xy = vertj.xy / vertj.w * 0.5 + 0.5;

		vec3 verti = uClipPolygonVertices[polyIdx * 8 + i];
		vec3 vertj = uClipPolygonVertices[polyIdx * 8 + j];

		if( ((verti.y > pointNDC.y) != (vertj.y > pointNDC.y)) && 
			(pointNDC.x < (vertj.x-verti.x) * (pointNDC.y-verti.y) / (vertj.y-verti.y) + verti.x) ) {
			c = !c;
		}
		j = i;
	}

	return c;
}
#endif

void doClipping(){

	#if !defined color_type_composite
		vec4 cl = getClassification(); 
		if(cl.a == 0.0){
			gl_Position = vec4(100.0, 100.0, 100.0, 0.0);
			
			return;
		}
	#endif

	int clipVolumesCount = 0;
	int insideCount = 0;

	#if defined(num_clipboxes) && num_clipboxes > 0
		for(int i = 0; i < num_clipboxes; i++){
			vec4 clipPosition = clipBoxes[i] * modelMatrix * vec4( position, 1.0 );
			bool inside = -0.5 <= clipPosition.x && clipPosition.x <= 0.5;
			inside = inside && -0.5 <= clipPosition.y && clipPosition.y <= 0.5;
			inside = inside && -0.5 <= clipPosition.z && clipPosition.z <= 0.5;

			insideCount = insideCount + (inside ? 1 : 0);
			clipVolumesCount++;
		}	
	#endif

	#if defined(num_clippolygons) && num_clippolygons > 0
		for(int i = 0; i < num_clippolygons; i++) {
			bool inside = pointInClipPolygon(position, i);

			insideCount = insideCount + (inside ? 1 : 0);
			clipVolumesCount++;
		}
	#endif

	bool insideAny = insideCount > 0;
	bool insideAll = (clipVolumesCount > 0) && (clipVolumesCount == insideCount);

	if(clipMethod == CLIPMETHOD_INSIDE_ANY){
		if(insideAny && clipTask == CLIPTASK_HIGHLIGHT){
			vColor.r += 0.5;
		}else if(!insideAny && clipTask == CLIPTASK_SHOW_INSIDE){
			gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
		}else if(insideAny && clipTask == CLIPTASK_SHOW_OUTSIDE){
			gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
		}
	}else if(clipMethod == CLIPMETHOD_INSIDE_ALL){
		if(insideAll && clipTask == CLIPTASK_HIGHLIGHT){
			vColor.r += 0.5;
		}else if(!insideAll && clipTask == CLIPTASK_SHOW_INSIDE){
			gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
		}else if(insideAll && clipTask == CLIPTASK_SHOW_OUTSIDE){
			gl_Position = vec4(100.0, 100.0, 100.0, 1.0);
		}
	}
}



// 
// ##     ##    ###    #### ##    ## 
// ###   ###   ## ##    ##  ###   ## 
// #### ####  ##   ##   ##  ####  ## 
// ## ### ## ##     ##  ##  ## ## ## 
// ##     ## #########  ##  ##  #### 
// ##     ## ##     ##  ##  ##   ### 
// ##     ## ##     ## #### ##    ## 
//

void main() {
	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	vViewPosition = mvPosition.xyz;
	gl_Position = projectionMatrix * mvPosition;
	vLogDepth = log2(-mvPosition.z);

	// POINT SIZE
	float pointSize = getPointSize();
	gl_PointSize = pointSize;
	vPointSize = pointSize;

	// COLOR
	vColor = getColor();


	#if defined hq_depth_pass
		float originalDepth = gl_Position.w;
		float adjustedDepth = originalDepth + 2.0 * vRadius;
		float adjust = adjustedDepth / originalDepth;

		mvPosition.xyz = mvPosition.xyz * adjust;
		gl_Position = projectionMatrix * mvPosition;
	#endif


	// CLIPPING
	doClipping();
	




	//#if defined(num_snapshots) && num_snapshots > 0

	//	for(int i = 0; i < num_snapshots; i++){
	//		vSnapProjected[i] = uSnapProj[i] * uSnapView[i] * modelMatrix * vec4(position, 1.0);	
	//		vSnapProjectedDistance[i] = -(uSnapView[i] * modelMatrix * vec4(position, 1.0)).z;
	//	}
	//	
	//#endif

	#if defined(num_shadowmaps) && num_shadowmaps > 0

		const float sm_near = 0.1;
		const float sm_far = 10000.0;

		for(int i = 0; i < num_shadowmaps; i++){
			vec3 viewPos = (uShadowWorldView[i] * vec4(position, 1.0)).xyz;
			float distanceToLight = abs(viewPos.z);
			
			vec4 projPos = uShadowProj[i] * uShadowWorldView[i] * vec4(position, 1);
			vec3 nc = projPos.xyz / projPos.w;
			
			float u = nc.x * 0.5 + 0.5;
			float v = nc.y * 0.5 + 0.5;

			vec2 sampleStep = vec2(1.0 / (2.0*1024.0), 1.0 / (2.0*1024.0)) * 1.5;
			vec2 sampleLocations[9];
			sampleLocations[0] = vec2(0.0, 0.0);
			sampleLocations[1] = sampleStep;
			sampleLocations[2] = -sampleStep;
			sampleLocations[3] = vec2(sampleStep.x, -sampleStep.y);
			sampleLocations[4] = vec2(-sampleStep.x, sampleStep.y);

			sampleLocations[5] = vec2(0.0, sampleStep.y);
			sampleLocations[6] = vec2(0.0, -sampleStep.y);
			sampleLocations[7] = vec2(sampleStep.x, 0.0);
			sampleLocations[8] = vec2(-sampleStep.x, 0.0);

			float visibleSamples = 0.0;
			float numSamples = 0.0;

			float bias = vRadius * 2.0;

			for(int j = 0; j < 9; j++){
				vec4 depthMapValue = texture2D(uShadowMap[i], vec2(u, v) + sampleLocations[j]);

				float linearDepthFromSM = depthMapValue.x + bias;
				float linearDepthFromViewer = distanceToLight;

				if(linearDepthFromSM > linearDepthFromViewer){
					visibleSamples += 1.0;
				}

				numSamples += 1.0;
			}

			float visibility = visibleSamples / numSamples;

			if(u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0 || nc.x < -1.0 || nc.x > 1.0 || nc.y < -1.0 || nc.y > 1.0 || nc.z < -1.0 || nc.z > 1.0){
				//vColor = vec3(0.0, 0.0, 0.2);
			}else{
				//vColor = vec3(1.0, 1.0, 1.0) * visibility + vec3(1.0, 1.0, 1.0) * vec3(0.5, 0.0, 0.0) * (1.0 - visibility);
				vColor = vColor * visibility + vColor * uShadowColor * (1.0 - visibility);
			}
		}

	#endif

	if(uDebug){
		vColor.b = (vColor.r + vColor.g + vColor.b) / 3.0;
		vColor.r = 1.0;
		vColor.g = 1.0;
	}

}
`

Potree.Shaders["pointcloud.fs"] = `
#if defined paraboloid_point_shape
	#extension GL_EXT_frag_depth : enable
#endif

precision highp float;
precision highp int;

uniform mat4 viewMatrix;
uniform mat4 uViewInv;
uniform mat4 uProjInv;
uniform vec3 cameraPosition;


uniform mat4 projectionMatrix;
uniform float uOpacity;

uniform float blendHardness;
uniform float blendDepthSupplement;
uniform float fov;
uniform float uSpacing;
uniform float near;
uniform float far;
uniform float uPCIndex;
uniform float uScreenWidth;
uniform float uScreenHeight;

varying vec3	vColor;
varying float	vLogDepth;
varying vec3	vViewPosition;
varying float	vRadius;
varying float 	vPointSize;
varying vec3 	vPosition;

#if defined(num_snapshots) && num_snapshots > 0
uniform sampler2D uSnapshot[num_snapshots];
uniform sampler2D uSnapshotDepth[num_snapshots];
uniform mat4 uSnapView[num_snapshots];
uniform mat4 uSnapProj[num_snapshots];
uniform mat4 uSnapProjInv[num_snapshots];
uniform mat4 uSnapViewInv[num_snapshots];

varying float vSnapTextureID;
#endif






float specularStrength = 1.0;

void main() {

	vec3 color = vColor;
	float depth = gl_FragCoord.z;


	//#if defined(num_snapshots) && num_snapshots > 0
	//	vec3 sRGB = vec3(0.0, 0.0, 0.0);
	//	float sA = 0.0;

	//	for(int i = 0; i < num_snapshots; i++){

	//		float snapLinearDistance = 0.0;
	//		float currentLinearDistance = vSnapProjectedDistance[i];
	//		vec2 uv;

	//		{
	//			vec2 pc = vec2(gl_PointCoord.x - 0.5, (1.0 - gl_PointCoord.y) - 0.5);
	//			vec2 offset = (pc * vPointSize) / vec2(uScreenWidth, uScreenHeight);
	//	
	//			uv = 0.5 * (vSnapProjected[i].xy /vSnapProjected[i].w) + 0.5 + offset;	
	//			
	//			vec4 td = texture2D(uSnapshotDepth[i], uv);
	//			float d = td.r;

	//			// TODO save linear distance in uSnapshotDepth!!!
	//			vec4 snapViewPos = uSnapProjInv[i] * vec4(uv * 2.0 - 1.0, d * 2.0 - 1.0, 1.0);
	//			snapViewPos = snapViewPos / snapViewPos.w;
	//			snapLinearDistance = -snapViewPos.z;

	//		}

	//		if(abs(currentLinearDistance - snapLinearDistance) < vRadius * 1.0){
	//			vec4 col = texture2D(uSnapshot[i], uv);
	//			//vec4 col = vec4(0.5, 1.0, 0.0, 1.0);
	//			sRGB += col.rgb;

	//			if(col.a != 0.0){
	//				sA = sA + 1.0;
	//			}
	//		}else{
	//			//sRGB += vColor;
	//			//sA += 1.0;
	//			
	//		}

	//	}


	//	color = sRGB / sA;
	//	if(sA == 0.0){
	//		//color = vColor;
	//		discard;
	//	}
	//
	//#endif


	#if defined(circle_point_shape) || defined(paraboloid_point_shape) 
		float u = 2.0 * gl_PointCoord.x - 1.0;
		float v = 2.0 * gl_PointCoord.y - 1.0;
	#endif
	
	#if defined(circle_point_shape) 
		float cc = u*u + v*v;
		if(cc > 1.0){
			discard;
		}
	#endif
		
	#if defined color_type_point_index
		gl_FragColor = vec4(color, uPCIndex / 255.0);
	#else
		gl_FragColor = vec4(color, uOpacity);
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

	#if defined(weighted_splats)
		float distance = 2.0 * length(gl_PointCoord.xy - 0.5);
		float weight = max(0.0, 1.0 - distance);
		weight = pow(weight, 1.5);

		gl_FragColor.a = weight;
		gl_FragColor.xyz = gl_FragColor.xyz * weight;
	#endif
	
}


`

Potree.Shaders["pointcloud_sm.vs"] = `
precision mediump float;
precision mediump int;

attribute vec3 position;
attribute vec3 color;

uniform mat4 modelMatrix;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;

uniform float uScreenWidth;
uniform float uScreenHeight;
uniform float near;
uniform float far;

uniform float uSpacing;
uniform float uOctreeSize;
uniform float uLevel;
uniform float uVNStart;

uniform sampler2D visibleNodes;

varying float vLinearDepth;
varying vec3 vColor;

#define PI 3.141592653589793



// ---------------------
// OCTREE
// ---------------------

#if defined(adaptive_point_size)
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
	float iOffset = uVNStart;
	float depth = uLevel;
	for(float i = 0.0; i <= 30.0; i++){
		float nodeSizeAtLevel = uOctreeSize  / pow(2.0, i + uLevel + 0.0);
		
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

#endif

float getPointSize(){
	float pointSize = 1.0;
	
	float slope = tan(fov / 2.0);
	float projFactor =  -0.5 * uScreenHeight / (slope * vViewPosition.z);
	
	float r = uOctreeSpacing * 1.5;
	vRadius = r;
	#if defined fixed_point_size
		pointSize = size;
	#elif defined attenuated_point_size
		if(uUseOrthographicCamera){
			pointSize = size;			
		}else{
			pointSize = pointSize * projFactor;
		}
	#elif defined adaptive_point_size
		if(uUseOrthographicCamera) {
			float worldSpaceSize = 1.5 * size * r / getPointSizeAttenuation();
			pointSize = (worldSpaceSize / uOrthoWidth) * uScreenWidth;
		} else {
			float worldSpaceSize = 1.5 * size * r / getPointSizeAttenuation();
			pointSize = worldSpaceSize * projFactor;
		}
	#endif

	pointSize = max(minSize, pointSize);
	pointSize = min(maxSize, pointSize);
	
	vRadius = pointSize / projFactor;

	return pointSize;
}


void main() {

	vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
	vLinearDepth = gl_Position.w;

	float pointSize = getPointSize();
	gl_PointSize = pointSize;

}
`

Potree.Shaders["pointcloud_sm.fs"] = `
precision mediump float;
precision mediump int;

varying vec3 vColor;
varying float vLinearDepth;

void main() {

	//gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
	//gl_FragColor = vec4(vColor, 1.0);
	//gl_FragColor = vec4(vLinearDepth, pow(vLinearDepth, 2.0), 0.0, 1.0);
	gl_FragColor = vec4(vLinearDepth, vLinearDepth / 30.0, vLinearDepth / 30.0, 1.0);
	
}


`

Potree.Shaders["normalize.vs"] = `
precision mediump float;
precision mediump int;

attribute vec3 position;
attribute vec2 uv;

uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;

varying vec2 vUv;

void main() {
	vUv = uv;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`

Potree.Shaders["normalize.fs"] = `
#extension GL_EXT_frag_depth : enable

precision mediump float;
precision mediump int;

uniform sampler2D uWeightMap;
uniform sampler2D uDepthMap;

varying vec2 vUv;

void main() {
	float depth = texture2D(uDepthMap, vUv).r;
	
	if(depth >= 1.0){
		discard;
	}

	gl_FragColor = vec4(depth, 1.0, 0.0, 1.0);

	vec4 color = texture2D(uWeightMap, vUv); 
	color = color / color.w;
	
	gl_FragColor = vec4(color.xyz, 1.0); 
	
	gl_FragDepthEXT = depth;


}`

Potree.Shaders["normalize_and_edl.fs"] = `
#extension GL_EXT_frag_depth : enable

precision mediump float;
precision mediump int;

uniform sampler2D uWeightMap;
uniform sampler2D uEDLMap;
uniform sampler2D uDepthMap;

uniform float screenWidth;
uniform float screenHeight;
uniform vec2 neighbours[NEIGHBOUR_COUNT];
uniform float edlStrength;
uniform float radius;

varying vec2 vUv;

float response(float depth){
	vec2 uvRadius = radius / vec2(screenWidth, screenHeight);
	
	float sum = 0.0;
	
	for(int i = 0; i < NEIGHBOUR_COUNT; i++){
		vec2 uvNeighbor = vUv + uvRadius * neighbours[i];
		
		float neighbourDepth = texture2D(uEDLMap, uvNeighbor).a;

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

void main() {

	float edlDepth = texture2D(uEDLMap, vUv).a;
	float res = response(edlDepth);
	float shade = exp(-res * 300.0 * edlStrength);

	float depth = texture2D(uDepthMap, vUv).r;
	if(depth >= 1.0 && res == 0.0){
		discard;
	}
	
	vec4 color = texture2D(uWeightMap, vUv); 
	color = color / color.w;
	color = color * shade;

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

//uniform sampler2D colorMap;
uniform sampler2D uRegularColor;
uniform sampler2D uRegularDepth;
uniform sampler2D uEDLColor;
uniform sampler2D uEDLDepth;

varying vec2 vUv;

float response(float depth){
	vec2 uvRadius = radius / vec2(screenWidth, screenHeight);
	
	float sum = 0.0;
	
	for(int i = 0; i < NEIGHBOUR_COUNT; i++){
		vec2 uvNeighbor = vUv + uvRadius * neighbours[i];
		
		float neighbourDepth = texture2D(uEDLColor, uvNeighbor).a;
		neighbourDepth = (neighbourDepth == 1.0) ? 0.0 : neighbourDepth;

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
	vec4 cReg = texture2D(uRegularColor, vUv);
	vec4 cEDL = texture2D(uEDLColor, vUv);
	
	float depth = cEDL.a;
	depth = (depth == 1.0) ? 0.0 : depth;
	float res = response(depth);
	float shade = exp(-res * 300.0 * edlStrength);

	float dReg = texture2D(uRegularDepth, vUv).r;
	float dEDL = texture2D(uEDLDepth, vUv).r;

	if(dEDL < dReg){
		gl_FragColor = vec4(cEDL.rgb * shade, opacity);
	}else{
		gl_FragColor = vec4(cReg.rgb * shade, cReg.a);
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


/**
 * @class Loads mno files and returns a PointcloudOctree
 * for a description of the mno binary file format, read mnoFileFormat.txt
 *
 * @author Markus Schuetz
 */
Potree.POCLoader = function () {

};

/**
 * @return a point cloud octree with the root node data loaded.
 * loading of descendants happens asynchronously when they're needed
 *
 * @param url
 * @param loadingFinishedListener executed after loading the binary has been finished
 */
Potree.POCLoader.load = function load (url, callback) {
	try {
		let pco = new Potree.PointCloudOctreeGeometry();
		pco.url = url;
		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);

		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
				let fMno = JSON.parse(xhr.responseText);

				let version = new Potree.Version(fMno.version);

				// assume octreeDir is absolute if it starts with http
				if (fMno.octreeDir.indexOf('http') === 0) {
					pco.octreeDir = fMno.octreeDir;
				} else {
					pco.octreeDir = url + '/../' + fMno.octreeDir;
				}

				pco.spacing = fMno.spacing;
				pco.hierarchyStepSize = fMno.hierarchyStepSize;

				pco.pointAttributes = fMno.pointAttributes;

				let min = new THREE.Vector3(fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz);
				let max = new THREE.Vector3(fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz);
				let boundingBox = new THREE.Box3(min, max);
				let tightBoundingBox = boundingBox.clone();

				if (fMno.tightBoundingBox) {
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
				if (fMno.pointAttributes === 'LAS') {
					pco.loader = new Potree.LasLazLoader(fMno.version);
				} else if (fMno.pointAttributes === 'LAZ') {
					pco.loader = new Potree.LasLazLoader(fMno.version);
				} else {
					pco.loader = new Potree.BinaryLoader(fMno.version, boundingBox, fMno.scale);
					pco.pointAttributes = new Potree.PointAttributes(pco.pointAttributes);
				}

				let nodes = {};

				{ // load root
					let name = 'r';

					let root = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
					root.level = 0;
					root.hasChildren = true;
					root.spacing = pco.spacing;
					if (version.upTo('1.5')) {
						root.numPoints = fMno.hierarchy[0][1];
					} else {
						root.numPoints = 0;
					}
					pco.root = root;
					pco.root.load();
					nodes[name] = root;
				}

				// load remaining hierarchy
				if (version.upTo('1.4')) {
					for (let i = 1; i < fMno.hierarchy.length; i++) {
						let name = fMno.hierarchy[i][0];
						let numPoints = fMno.hierarchy[i][1];
						let index = parseInt(name.charAt(name.length - 1));
						let parentName = name.substring(0, name.length - 1);
						let parentNode = nodes[parentName];
						let level = name.length - 1;
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
	} catch (e) {
		console.log("loading failed: '" + url + "'");
		console.log(e);

		callback();
	}
};

Potree.POCLoader.loadPointAttributes = function (mno) {
	let fpa = mno.pointAttributes;
	let pa = new Potree.PointAttributes();

	for (let i = 0; i < fpa.length; i++) {
		let pointAttribute = Potree.PointAttribute[fpa[i]];
		pa.add(pointAttribute);
	}

	return pa;
};

Potree.POCLoader.createChildAABB = function (aabb, index) {
	let min = aabb.min.clone();
	let max = aabb.max.clone();
	let size = new THREE.Vector3().subVectors(max, min);

	if ((index & 0b0001) > 0) {
		min.z += size.z / 2;
	} else {
		max.z -= size.z / 2;
	}

	if ((index & 0b0010) > 0) {
		min.y += size.y / 2;
	} else {
		max.y -= size.y / 2;
	}

	if ((index & 0b0100) > 0) {
		min.x += size.x / 2;
	} else {
		max.x -= size.x / 2;
	}

	return new THREE.Box3(min, max);
};


Potree.PointAttributeNames = {};

Potree.PointAttributeNames.POSITION_CARTESIAN = 0; // float x, y, z;
Potree.PointAttributeNames.COLOR_PACKED = 1; // byte r, g, b, a; 	I = [0,1]
Potree.PointAttributeNames.COLOR_FLOATS_1 = 2; // float r, g, b; 		I = [0,1]
Potree.PointAttributeNames.COLOR_FLOATS_255	= 3; // float r, g, b; 		I = [0,255]
Potree.PointAttributeNames.NORMAL_FLOATS = 4; // float x, y, z;
Potree.PointAttributeNames.FILLER = 5;
Potree.PointAttributeNames.INTENSITY = 6;
Potree.PointAttributeNames.CLASSIFICATION = 7;
Potree.PointAttributeNames.NORMAL_SPHEREMAPPED = 8;
Potree.PointAttributeNames.NORMAL_OCT16 = 9;
Potree.PointAttributeNames.NORMAL = 10;
Potree.PointAttributeNames.RETURN_NUMBER = 11;
Potree.PointAttributeNames.NUMBER_OF_RETURNS = 12;
Potree.PointAttributeNames.SOURCE_ID = 13;
Potree.PointAttributeNames.INDICES = 14;
Potree.PointAttributeNames.SPACING = 15;

/**
 * Some types of possible point attribute data formats
 *
 * @class
 */
Potree.PointAttributeTypes = {
	DATA_TYPE_DOUBLE: {ordinal: 0, size: 8},
	DATA_TYPE_FLOAT: {ordinal: 1, size: 4},
	DATA_TYPE_INT8: {ordinal: 2, size: 1},
	DATA_TYPE_UINT8: {ordinal: 3, size: 1},
	DATA_TYPE_INT16: {ordinal: 4, size: 2},
	DATA_TYPE_UINT16: {ordinal: 5, size: 2},
	DATA_TYPE_INT32: {ordinal: 6, size: 4},
	DATA_TYPE_UINT32: {ordinal: 7, size: 4},
	DATA_TYPE_INT64: {ordinal: 8, size: 8},
	DATA_TYPE_UINT64: {ordinal: 9, size: 8}
};

let i = 0;
for (let obj in Potree.PointAttributeTypes) {
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
Potree.PointAttribute = function (name, type, numElements) {
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
    
Potree.PointAttribute.RETURN_NUMBER = new Potree.PointAttribute(
	Potree.PointAttributeNames.RETURN_NUMBER,
    Potree.PointAttributeTypes.DATA_TYPE_UINT8, 1);
    
Potree.PointAttribute.NUMBER_OF_RETURNS = new Potree.PointAttribute(
	Potree.PointAttributeNames.NUMBER_OF_RETURNS,
    Potree.PointAttributeTypes.DATA_TYPE_UINT8, 1);
    
Potree.PointAttribute.SOURCE_ID = new Potree.PointAttribute(
	Potree.PointAttributeNames.SOURCE_ID,
	Potree.PointAttributeTypes.DATA_TYPE_UINT8, 1);

Potree.PointAttribute.INDICES = new Potree.PointAttribute(
	Potree.PointAttributeNames.INDICES,
	Potree.PointAttributeTypes.DATA_TYPE_UINT32, 1);

Potree.PointAttribute.SPACING = new Potree.PointAttribute(
	Potree.PointAttributeNames.SPACING,
	Potree.PointAttributeTypes.DATA_TYPE_FLOAT, 1);

/**
 * Ordered list of PointAttributes used to identify how points are aligned in a buffer.
 *
 * @class
 *
 */
Potree.PointAttributes = function (pointAttributes) {
	this.attributes = [];
	this.byteSize = 0;
	this.size = 0;

	if (pointAttributes != null) {
		for (let i = 0; i < pointAttributes.length; i++) {
			let pointAttributeName = pointAttributes[i];
			let pointAttribute = Potree.PointAttribute[pointAttributeName];
			this.attributes.push(pointAttribute);
			this.byteSize += pointAttribute.byteSize;
			this.size++;
		}
	}
};

Potree.PointAttributes.prototype.add = function (pointAttribute) {
	this.attributes.push(pointAttribute);
	this.byteSize += pointAttribute.byteSize;
	this.size++;
};

Potree.PointAttributes.prototype.hasColors = function () {
	for (let name in this.attributes) {
		let pointAttribute = this.attributes[name];
		if (pointAttribute.name === Potree.PointAttributeNames.COLOR_PACKED) {
			return true;
		}
	}

	return false;
};

Potree.PointAttributes.prototype.hasNormals = function () {
	for (let name in this.attributes) {
		let pointAttribute = this.attributes[name];
		if (
			pointAttribute === Potree.PointAttribute.NORMAL_SPHEREMAPPED ||
			pointAttribute === Potree.PointAttribute.NORMAL_FLOATS ||
			pointAttribute === Potree.PointAttribute.NORMAL ||
			pointAttribute === Potree.PointAttribute.NORMAL_OCT16) {
			return true;
		}
	}

	return false;
};


Potree.BinaryLoader = class BinaryLoader{

	constructor(version, boundingBox, scale){
		if (typeof (version) === 'string') {
			this.version = new Potree.Version(version);
		} else {
			this.version = version;
		}

		this.boundingBox = boundingBox;
		this.scale = scale;
	}

	load(node){
		if (node.loaded) {
			return;
		}

		let url = node.getURL();

		if (this.version.equalOrHigher('1.4')) {
			url += '.bin';
		}

		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if((xhr.status === 200 || xhr.status === 0) &&  xhr.response !== null){
					let buffer = xhr.response;
					this.parse(node, buffer);
				} else {
					throw new Error(`Failed to load file! HTTP status: ${xhr.status}, file: ${url}`);
				}
			}
		};
		
		try {
			xhr.send(null);
		} catch (e) {
			console.log('fehler beim laden der punktwolke: ' + e);
		}
	};

	parse(node, buffer){
		let pointAttributes = node.pcoGeometry.pointAttributes;
		let numPoints = buffer.byteLength / node.pcoGeometry.pointAttributes.byteSize;

		if (this.version.upTo('1.5')) {
			node.numPoints = numPoints;
		}

		let workerPath = Potree.scriptPath + '/workers/BinaryDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);

		worker.onmessage = function (e) {

			let data = e.data;
			let buffers = data.attributeBuffers;
			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(data.tightBoundingBox.max)
			);

			Potree.workerPool.returnWorker(workerPath, worker);

			let geometry = new THREE.BufferGeometry();

			for(let property in buffers){
				let buffer = buffers[property].buffer;

				if (parseInt(property) === Potree.PointAttributeNames.POSITION_CARTESIAN) {
					geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === Potree.PointAttributeNames.COLOR_PACKED) {
					geometry.addAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
				} else if (parseInt(property) === Potree.PointAttributeNames.INTENSITY) {
					geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(buffer), 1));
				} else if (parseInt(property) === Potree.PointAttributeNames.CLASSIFICATION) {
					geometry.addAttribute('classification', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				} else if (parseInt(property) === Potree.PointAttributeNames.NORMAL_SPHEREMAPPED) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === Potree.PointAttributeNames.NORMAL_OCT16) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === Potree.PointAttributeNames.NORMAL) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === Potree.PointAttributeNames.INDICES) {
					let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
					bufferAttribute.normalized = true;
					geometry.addAttribute('indices', bufferAttribute);
				} else if (parseInt(property) === Potree.PointAttributeNames.SPACING) {
					let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
					geometry.addAttribute('spacing', bufferAttribute);
				}
			}


			tightBoundingBox.max.sub(tightBoundingBox.min);
			tightBoundingBox.min.set(0, 0, 0);

			let numPoints = e.data.buffer.byteLength / pointAttributes.byteSize;
			
			node.numPoints = numPoints;
			node.geometry = geometry;
			node.mean = new THREE.Vector3(...data.mean);
			node.tightBoundingBox = tightBoundingBox;
			node.loaded = true;
			node.loading = false;
			node.estimatedSpacing = data.estimatedSpacing;
			Potree.numNodesLoading--;
		};

		let message = {
			buffer: buffer,
			pointAttributes: pointAttributes,
			version: this.version.version,
			min: [ node.boundingBox.min.x, node.boundingBox.min.y, node.boundingBox.min.z ],
			offset: [node.pcoGeometry.offset.x, node.pcoGeometry.offset.y, node.pcoGeometry.offset.z],
			scale: this.scale,
			spacing: node.spacing,
			hasChildren: node.hasChildren,
			name: node.name
		};
		worker.postMessage(message, [message.buffer]);
	};

	
};







Potree.GreyhoundBinaryLoader = class{

	constructor(version, boundingBox, scale){
		if (typeof (version) === 'string') {
			this.version = new Potree.Version(version);
		} else {
			this.version = version;
		}

		this.boundingBox = boundingBox;
		this.scale = scale;
	}

	load(node){
		if (node.loaded) return;

		let scope = this;
		let url = node.getURL();

		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');

		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					let buffer = xhr.response;
					scope.parse(node, buffer);
				} else {
					console.log(
						'Failed to load file! HTTP status:', xhr.status,
						'file:', url);
				}
			}
		};

		try {
			xhr.send(null);
		} catch (e) {
			console.log('error loading point cloud: ' + e);
		}
	}

	parse(node, buffer){
		let NUM_POINTS_BYTES = 4;

		let view = new DataView(
			buffer, buffer.byteLength - NUM_POINTS_BYTES, NUM_POINTS_BYTES);
		let numPoints = view.getUint32(0, true);
		let pointAttributes = node.pcoGeometry.pointAttributes;

		node.numPoints = numPoints;

		let workerPath = Potree.scriptPath + '/workers/GreyhoundBinaryDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);

		worker.onmessage = function (e) {

			let data = e.data;
			let buffers = data.attributeBuffers;
			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(data.tightBoundingBox.max)
			);

			Potree.workerPool.returnWorker(workerPath, worker);

			let geometry = new THREE.BufferGeometry();

			for(let property in buffers){
				let buffer = buffers[property].buffer;

				if (parseInt(property) === Potree.PointAttributeNames.POSITION_CARTESIAN) {
					geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === Potree.PointAttributeNames.COLOR_PACKED) {
					geometry.addAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
				} else if (parseInt(property) === Potree.PointAttributeNames.INTENSITY) {
					geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(buffer), 1));
				} else if (parseInt(property) === Potree.PointAttributeNames.CLASSIFICATION) {
					geometry.addAttribute('classification', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				} else if (parseInt(property) === Potree.PointAttributeNames.NORMAL_SPHEREMAPPED) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === Potree.PointAttributeNames.NORMAL_OCT16) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === Potree.PointAttributeNames.NORMAL) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === Potree.PointAttributeNames.INDICES) {
					let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
					bufferAttribute.normalized = true;
					geometry.addAttribute('indices', bufferAttribute);
				} else if (parseInt(property) === Potree.PointAttributeNames.SPACING) {
					let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
					geometry.addAttribute('spacing', bufferAttribute);
				}
			}

			tightBoundingBox.max.sub(tightBoundingBox.min);
			tightBoundingBox.min.set(0, 0, 0);

			node.numPoints = data.numPoints;
			node.geometry = geometry;
			node.mean = new THREE.Vector3(...data.mean);
			node.tightBoundingBox = tightBoundingBox;
			node.loaded = true;
			node.loading = false;
			Potree.numNodesLoading--;
		};

		let bb = node.boundingBox;
		let nodeOffset = node.pcoGeometry.boundingBox.getCenter().sub(node.boundingBox.min);

		let message = {
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
	}
}

/**
 * @class Loads greyhound metadata and returns a PointcloudOctree
 *
 * @author Maarten van Meersbergen
 * @author Oscar Martinez Rubi
 * @author Connor Manning
 */

class GreyhoundUtils {
	static getQueryParam (name) {
		name = name.replace(/[[\]]/g, '\\$&');
		let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
		let results = regex.exec(window.location.href);
		if (!results) return null;
		if (!results[2]) return '';
		return decodeURIComponent(results[2].replace(/\+/g, ' '));
	}

	static createSchema (attributes) {
		let schema = [
			{ 'name': 'X', 'size': 4, 'type': 'signed' },
			{ 'name': 'Y', 'size': 4, 'type': 'signed' },
			{ 'name': 'Z', 'size': 4, 'type': 'signed' }
		];

		// Once we include options in the UI to load a dynamic list of available
		// attributes for visualization (f.e. Classification, Intensity etc.)
		// we will be able to ask for that specific attribute from the server,
		// where we are now requesting all attributes for all points all the time.
		// If we do that though, we also need to tell Potree to redraw the points
		// that are already loaded (with different attributes).
		// This is not default behaviour.
		attributes.forEach(function (item) {
			if (item === 'COLOR_PACKED') {
				schema.push({ 'name': 'Red', 'size': 2, 'type': 'unsigned' });
				schema.push({ 'name': 'Green', 'size': 2, 'type': 'unsigned' });
				schema.push({ 'name': 'Blue', 'size': 2, 'type': 'unsigned' });
			} else if (item === 'INTENSITY') {
				schema.push({ 'name': 'Intensity', 'size': 2, 'type': 'unsigned' });
			} else if (item === 'CLASSIFICATION') {
				schema.push({ 'name': 'Classification', 'size': 1, 'type': 'unsigned' });
			}
		});

		return schema;
	}

	static fetch (url, cb) {
		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					cb(null, xhr.responseText);
				} else {
					cb(xhr.responseText);
				}
			}
		};
		xhr.send(null);
	};

	static fetchBinary (url, cb) {
		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					cb(null, xhr.response);
				}				else {
					cb(xhr.responseText);
				}
			}
		};
		xhr.send(null);
	};

	static pointSizeFrom (schema) {
		return schema.reduce((p, c) => p + c.size, 0);
	};

	static getNormalization (serverURL, baseDepth, cb) {
		let s = [
			{ 'name': 'X', 'size': 4, 'type': 'floating' },
			{ 'name': 'Y', 'size': 4, 'type': 'floating' },
			{ 'name': 'Z', 'size': 4, 'type': 'floating' },
			{ 'name': 'Red', 'size': 2, 'type': 'unsigned' },
			{ 'name': 'Green', 'size': 2, 'type': 'unsigned' },
			{ 'name': 'Blue', 'size': 2, 'type': 'unsigned' },
			{ 'name': 'Intensity', 'size': 2, 'type': 'unsigned' }
		];

		let url = serverURL + 'read?depth=' + baseDepth +
			'&schema=' + JSON.stringify(s);

		GreyhoundUtils.fetchBinary(url, function (err, buffer) {
			if (err) throw new Error(err);

			let view = new DataView(buffer);
			let numBytes = buffer.byteLength - 4;
			// TODO Unused: let numPoints = view.getUint32(numBytes, true);
			let pointSize = GreyhoundUtils.pointSizeFrom(s);

			let colorNorm = false;
			let intensityNorm = false;

			for (let offset = 0; offset < numBytes; offset += pointSize) {
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

Potree.GreyhoundLoader = function () { };
Potree.GreyhoundLoader.loadInfoJSON = function load (url, callback) { };

/**
 * @return a point cloud octree with the root node data loaded.
 * loading of descendants happens asynchronously when they're needed
 *
 * @param url
 * @param loadingFinishedListener executed after loading the binary has been
 * finished
 */
Potree.GreyhoundLoader.load = function load (url, callback) {
	let HIERARCHY_STEP_SIZE = 5;

	try {
		// We assume everything ater the string 'greyhound://' is the server url
		let serverURL = url.split('greyhound://')[1];
		if (serverURL.split('http://').length === 1) {
			serverURL = 'http://' + serverURL;
		}

		GreyhoundUtils.fetch(serverURL + 'info', function (err, data) {
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
			let greyhoundInfo = JSON.parse(data);
			let version = new Potree.Version('1.4');

			let bounds = greyhoundInfo.bounds;
			// TODO Unused: let boundsConforming = greyhoundInfo.boundsConforming;

			// TODO Unused: let width = bounds[3] - bounds[0];
			// TODO Unused: let depth = bounds[4] - bounds[1];
			// TODO Unused: let height = bounds[5] - bounds[2];
			// TODO Unused: let radius = width / 2;
			let scale = greyhoundInfo.scale || 0.01;
			if (Array.isArray(scale)) {
				scale = Math.min(scale[0], scale[1], scale[2]);
			}

			if (GreyhoundUtils.getQueryParam('scale')) {
				scale = parseFloat(GreyhoundUtils.getQueryParam('scale'));
			}

			let baseDepth = Math.max(8, greyhoundInfo.baseDepth);

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
			let attributes = ['POSITION_CARTESIAN'];

			// To be careful, we only add COLOR_PACKED as an option if all
			// colors are actually found.
			let red = false;
			let green = false;
			let blue = false;

			greyhoundInfo.schema.forEach(function (entry) {
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
			let pgg = new Potree.PointCloudGreyhoundGeometry();
			pgg.serverURL = serverURL;
			pgg.spacing = (bounds[3] - bounds[0]) / Math.pow(2, baseDepth);
			pgg.baseDepth = baseDepth;
			pgg.hierarchyStepSize = HIERARCHY_STEP_SIZE;

			pgg.schema = GreyhoundUtils.createSchema(attributes);
			let pointSize = GreyhoundUtils.pointSizeFrom(pgg.schema);

			pgg.pointAttributes = new Potree.PointAttributes(attributes);
			pgg.pointAttributes.byteSize = pointSize;

			let boundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(bounds, 0),
				new THREE.Vector3().fromArray(bounds, 3)
			);

			let offset = boundingBox.min.clone();

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

			pgg.loader = new Potree.GreyhoundBinaryLoader(version, boundingBox, pgg.scale);

			let nodes = {};

			{ // load root
				let name = 'r';

				let root = new Potree.PointCloudGreyhoundGeometryNode(
					name, pgg, boundingBox,
					scale, offset
				);

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
				function (_, normalize) {
					if (normalize.color) pgg.normalize.color = true;
					if (normalize.intensity) pgg.normalize.intensity = true;

					callback(pgg);
				}
			);
		});
	} catch (e) {
		console.log("loading failed: '" + url + "'");
		console.log(e);

		callback();
	}
};

Potree.GreyhoundLoader.loadPointAttributes = function (mno) {
	let fpa = mno.pointAttributes;
	let pa = new Potree.PointAttributes();

	for (let i = 0; i < fpa.length; i++) {
		let pointAttribute = Potree.PointAttribute[fpa[i]];
		pa.add(pointAttribute);
	}

	return pa;
};

Potree.GreyhoundLoader.createChildAABB = function (aabb, childIndex) {
	let min = aabb.min;
	let max = aabb.max;
	let dHalfLength = new THREE.Vector3().copy(max).sub(min).multiplyScalar(0.5);
	let xHalfLength = new THREE.Vector3(dHalfLength.x, 0, 0);
	let yHalfLength = new THREE.Vector3(0, dHalfLength.y, 0);
	let zHalfLength = new THREE.Vector3(0, 0, dHalfLength.z);

	let cmin = min;
	let cmax = new THREE.Vector3().add(min).add(dHalfLength);

	if (childIndex === 1) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength);
	} else if (childIndex === 3) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(yHalfLength);
	} else if (childIndex === 0) {
		min = cmin;
		max = cmax;
	} else if (childIndex === 2) {
		min = new THREE.Vector3().copy(cmin).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(yHalfLength);
	} else if (childIndex === 5) {
		min = new THREE.Vector3().copy(cmin).add(zHalfLength).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(zHalfLength).add(xHalfLength);
	} else if (childIndex === 7) {
		min = new THREE.Vector3().copy(cmin).add(dHalfLength);
		max = new THREE.Vector3().copy(cmax).add(dHalfLength);
	} else if (childIndex === 4) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength);
	} else if (childIndex === 6) {
		min = new THREE.Vector3().copy(cmin).add(xHalfLength).add(yHalfLength);
		max = new THREE.Vector3().copy(cmax).add(xHalfLength).add(yHalfLength);
	}

	return new THREE.Box3(min, max);
};

/**
 * @class Loads mno files and returns a PointcloudOctree
 * for a description of the mno binary file format, read mnoFileFormat.txt
 *
 * @author Markus Schuetz
 */

class EptUtils {
    static get(url) {
        return new Promise((resolve, reject) => {
            let xhr = Potree.XHRFactory.createXMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0) {
                        resolve(xhr.responseText);
                    }
                    else {
                        reject(xhr.responseText);
                    }
                }
            };
            xhr.send(null);
        });
    }

    static getJson(url) {
        return EptUtils.get(url).then((data) => JSON.parse(data));
    }
};

Potree.EptLoader = class {
    static load(file, callback) {
        EptUtils.getJson(file)
        .then((info) => {
            let url = file.substr(0, file.lastIndexOf('entwine.json'));
            let geometry = new Potree.PointCloudEptGeometry(url, info);
            let root = new Potree.PointCloudEptGeometryNode(geometry);

            geometry.root = root;
            geometry.root.load();

            callback(geometry);
        });
    }
};



/**
 * laslaz code taken and adapted from plas.io js-laslaz
 *	http://plas.io/
 *  https://github.com/verma/plasio
 *
 * Thanks to Uday Verma and Howard Butler
 *
 */

Potree.LasLazLoader = class LasLazLoader {
	constructor (version) {
		if (typeof (version) === 'string') {
			this.version = new Potree.Version(version);
		} else {
			this.version = version;
		}
	}

	static progressCB () {
	}

	load (node) {
		if (node.loaded) {
			return;
		}

		let pointAttributes = node.pcoGeometry.pointAttributes;

		let url = node.getURL();

		if (this.version.equalOrHigher('1.4')) {
			url += '.' + pointAttributes.toLowerCase();
		}

		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					let buffer = xhr.response;
					this.parse(node, buffer);
				} else {
					console.log('Failed to load file! HTTP status: ' + xhr.status + ', file: ' + url);
				}
			}
		};

		xhr.send(null);
	}

	parse(node, buffer){
		let lf = new LASFile(buffer);
		let handler = new Potree.LasLazBatcher(node);


		//
		// DEBUG
		//
		// invoke the laz decompress worker thousands of times to check for memory leaks
		// until 2018/03/05, it tended to run out of memory at ~6230 invocations
		// 
		//
		//lf.open()
		//.then( msg => {
		//	lf.isOpen = true;
		//	return lf;
		//}).catch( msg => {
		//	console.log("failed to open file. :(");	
		//}).then( lf => {
		//	return lf.getHeader().then(function (h) {
		//		return [lf, h];
		//	});
		//}).then( v => {
		//	let lf = v[0];
		//	let header = v[1];

		//	lf.readData(1000000, 0, 1)
		//	.then( v => {
		//		console.log("read");

		//		this.parse(node, buffer);
		//	}).then (v => {
		//		lf.close();	
		//	});

		//})



		lf.open()
		.then( msg => {
			lf.isOpen = true;
			return lf;
		}).catch( msg => {
			console.log("failed to open file. :(");	
		}).then( lf => {
			return lf.getHeader().then(function (h) {
				return [lf, h];
			});
		}).then( v => {
			let lf = v[0];
			let header = v[1];

			let skip = 1;
			let totalRead = 0;
			let totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);
			let reader = function () {
				let p = lf.readData(1000000, 0, skip);
				return p.then(function (data) {
					handler.push(new LASDecoder(data.buffer,
						header.pointsFormatId,
						header.pointsStructSize,
						data.count,
						header.scale,
						header.offset,
						header.mins, header.maxs));

					totalRead += data.count;
					Potree.LasLazLoader.progressCB(totalRead / totalToRead);

					if (data.hasMoreData) {
						return reader();
					} else {
						header.totalRead = totalRead;
						header.versionAsString = lf.versionAsString;
						header.isCompressed = lf.isCompressed;
						return [lf, header, handler];
					}
				});
			};

			return reader();
		}).then( v => {
			let lf = v[0];
			// we're done loading this file
			//
			Potree.LasLazLoader.progressCB(1);

			// Close it
			return lf.close().then(function () {
				lf.isOpen = false;

				return v.slice(1);
			}).catch(e => {
				// If there was a cancellation, make sure the file is closed, if the file is open
				// close and then fail
				if (lf.isOpen) {
					return lf.close().then(function () {
						lf.isOpen = false;
						throw e;
					});
				}
				throw e;	
			});	
		});
	}

	handle (node, url) {

	}
};

Potree.LasLazBatcher = class LasLazBatcher {
	constructor (node) {
		this.node = node;
	}

	push (lasBuffer) {
		let workerPath = Potree.scriptPath + '/workers/LASDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);
		let node = this.node;

		worker.onmessage = (e) => {
			let geometry = new THREE.BufferGeometry();
			let numPoints = lasBuffer.pointsCount;

			let positions = new Float32Array(e.data.position);
			let colors = new Uint8Array(e.data.color);
			let intensities = new Float32Array(e.data.intensity);
			let classifications = new Uint8Array(e.data.classification);
			let returnNumbers = new Uint8Array(e.data.returnNumber);
			let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			let indices = new Uint8Array(e.data.indices);

			geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 4, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(returnNumbers, 1));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(numberOfReturns, 1));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(pointSourceIDs, 1));
			//geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3));
			geometry.addAttribute('indices', new THREE.BufferAttribute(indices, 4));
			geometry.attributes.indices.normalized = true;

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			geometry.boundingBox = this.node.boundingBox;
			this.node.tightBoundingBox = tightBoundingBox;

			this.node.geometry = geometry;
			this.node.numPoints = numPoints;
			this.node.loaded = true;
			this.node.loading = false;
			Potree.numNodesLoading--;
			this.node.mean = new THREE.Vector3(...e.data.mean);

			//debugger;

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

/**
 * laslaz code taken and adapted from plas.io js-laslaz
 *    http://plas.io/
 *  https://github.com/verma/plasio
 *
 * Thanks to Uday Verma and Howard Butler
 *
 */

Potree.EptLazLoader = class {
    constructor() { }
    static progressCB () { }

    load(node) {
        if (node.loaded) return;

        let url = node.url() + '.laz';   // TODO Get from info.dataStorage.

        let xhr = Potree.XHRFactory.createXMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.overrideMimeType('text/plain; charset=x-user-defined');
        xhr.onreadystatechange = () => {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    let buffer = xhr.response;
                    this.parse(node, buffer);
                } else {
                    console.log('Failed ' + url + ': ' + xhr.status);
                }
            }
        };

        xhr.send(null);
    }

    parse(node, buffer){
        let lf = new LASFile(buffer);
        let handler = new Potree.EptLazBatcher(node);

        lf.open()
        .then(() => {
            lf.isOpen = true;
            return lf.getHeader();
        })
        .then((header) => {
            let i = 0;
            let np = header.pointsCount;

            let toArray = (v) => [v.x, v.y, v.z];
            let mins = toArray(node.key.b.min);
            let maxs = toArray(node.key.b.max);

            let read = () => {
                let p = lf.readData(1000000, 0, 1);
                return p.then(function (data) {
                    let d = new LASDecoder(
                            data.buffer,
                            header.pointsFormatId,
                            header.pointsStructSize,
                            data.count,
                            header.scale,
                            header.offset,
                            mins,
                            maxs);
                    d.extraBytes = header.extraBytes;
                    d.pointsFormatId = header.pointsFormatId;
                    handler.push(d);

                    i += data.count;

                    if (data.hasMoreData) {
                        return read();
                    }
                    else {
                        header.totalRead = i;
                        header.versionAsString = lf.versionAsString;
                        header.isCompressed = lf.isCompressed;
                        return null;
                    }
                });
            };

            return read();
        })
        .then(() => lf.close())
        .then(() => lf.isOpen = false)
        .catch((err) => {
            console.log('Error reading LAZ:', err);
            if (lf.isOpen) {
                lf.close().then(() => {
                    lf.isOpen = false;
                    throw err;
                });
            }
            else throw err;
        });
    }
};

Potree.EptLazBatcher = class {
    constructor(node) { this.node = node; }

    push(las) {
        let workerPath = Potree.scriptPath + '/workers/EptDecoderWorker.js';
        let worker = Potree.workerPool.getWorker(workerPath);

        worker.onmessage = (e) => {
            let g = new THREE.BufferGeometry();
            let numPoints = las.pointsCount;

            let positions = new Float32Array(e.data.position);
            let colors = new Uint8Array(e.data.color);

            let intensities = new Float32Array(e.data.intensity);
            let classifications = new Uint8Array(e.data.classification);
            let returnNumbers = new Uint8Array(e.data.returnNumber);
            let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
            let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
            let indices = new Uint8Array(e.data.indices);

            g.addAttribute('position',
                    new THREE.BufferAttribute(positions, 3));
            g.addAttribute('color',
                    new THREE.BufferAttribute(colors, 4, true));
            g.addAttribute('intensity',
                    new THREE.BufferAttribute(intensities, 1));
            g.addAttribute('classification',
                    new THREE.BufferAttribute(classifications, 1));
            g.addAttribute('returnNumber',
                    new THREE.BufferAttribute(returnNumbers, 1));
            g.addAttribute('numberOfReturns',
                    new THREE.BufferAttribute(numberOfReturns, 1));
            g.addAttribute('pointSourceID',
                    new THREE.BufferAttribute(pointSourceIDs, 1));
            g.addAttribute('indices',
                    new THREE.BufferAttribute(indices, 4));

            g.attributes.indices.normalized = true;

            let tightBoundingBox = new THREE.Box3(
                new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
                new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
            );

            this.node.doneLoading(
                    g,
                    tightBoundingBox,
                    numPoints,
                    new THREE.Vector3(...e.data.mean));

            Potree.workerPool.returnWorker(workerPath, worker);
        };

        let message = {
            buffer: las.arrayb,
            numPoints: las.pointsCount,
            pointSize: las.pointSize,
            pointFormatID: las.pointsFormatId,
            scale: las.scale,
            offset: las.offset,
            mins: las.mins,
            maxs: las.maxs
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
// let stops = [];
// for(let i = 0; i <= 10; i++){
//	let range = chroma.scale(['yellow', 'navy']).mode('lch').domain([10,0])(i)._rgb
//		.slice(0, 3)
//		.map(v => (v / 255).toFixed(4))
//		.join(", ");
//
//	let line = `[${i / 10}, new THREE.Color(${range})],`;
//
//	stops.push(line);
// }
// stops.join("\n");

// to get a ready to use gradient array from matplotlib:
// import matplotlib.pyplot as plt
// import matplotlib.colors as colors
//
// norm = colors.Normalize(vmin=0,vmax=1)
// cmap = plt.cm.viridis
//
// for i in range(0,11):
//    u = i / 10
//    rgb = cmap(norm(u))[0:3]
//    rgb = ["{0:.3f}".format(v) for v in rgb]
//    rgb = "[" + str(u) + ", new THREE.Color(" +  ", ".join(rgb) + ")],"
//    print(rgb)

Potree.Gradients = {
	RAINBOW: [
		[0, new THREE.Color(0.278, 0, 0.714)],
		[1 / 6, new THREE.Color(0, 0, 1)],
		[2 / 6, new THREE.Color(0, 1, 1)],
		[3 / 6, new THREE.Color(0, 1, 0)],
		[4 / 6, new THREE.Color(1, 1, 0)],
		[5 / 6, new THREE.Color(1, 0.64, 0)],
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
		[1, new THREE.Color(0.6196, 0.0039, 0.2588)]
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
		[1.0, new THREE.Color(0.940, 0.975, 0.131)]
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
		[1, new THREE.Color(0.9804, 0.9804, 0.4314)]
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
		[1.0, new THREE.Color(0.993, 0.906, 0.144)]
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
		[1.0, new THREE.Color(0.988, 0.998, 0.645)]
	],
	GRAYSCALE: [
		[0, new THREE.Color(0, 0, 0)],
		[1, new THREE.Color(1, 1, 1)]
	]
};

Potree.Classification = {
	'DEFAULT': {
		0: new THREE.Vector4(0.5, 0.5, 0.5, 1.0),
		1: new THREE.Vector4(0.5, 0.5, 0.5, 1.0),
		2: new THREE.Vector4(0.63, 0.32, 0.18, 1.0),
		3: new THREE.Vector4(0.0, 1.0, 0.0, 1.0),
		4: new THREE.Vector4(0.0, 0.8, 0.0, 1.0),
		5: new THREE.Vector4(0.0, 0.6, 0.0, 1.0),
		6: new THREE.Vector4(1.0, 0.66, 0.0, 1.0),
		7:	new THREE.Vector4(1.0, 0, 1.0, 1.0),
		8: new THREE.Vector4(1.0, 0, 0.0, 1.0),
		9: new THREE.Vector4(0.0, 0.0, 1.0, 1.0),
		12:	new THREE.Vector4(1.0, 1.0, 0.0, 1.0),
		'DEFAULT': new THREE.Vector4(0.3, 0.6, 0.6, 0.5)
	}
};

Potree.PointSizeType = {
	FIXED: 0,
	ATTENUATED: 1,
	ADAPTIVE: 2
};

Potree.PointShape = {
	SQUARE: 0,
	CIRCLE: 1,
	PARABOLOID: 2
};

Potree.PointColorType = {
	RGB: 0,
	COLOR: 1,
	DEPTH: 2,
	HEIGHT: 3,
	ELEVATION: 3,
	INTENSITY: 4,
	INTENSITY_GRADIENT:	5,
	LOD: 6,
	LEVEL_OF_DETAIL: 6,
	POINT_INDEX: 7,
	CLASSIFICATION: 8,
	RETURN_NUMBER: 9,
	SOURCE: 10,
	NORMAL: 11,
	PHONG: 12,
	RGB_HEIGHT: 13,
	COMPOSITE: 50
};

Potree.TreeType = {
	OCTREE:	0,
	KDTREE:	1
};

Potree.PointCloudMaterial = class PointCloudMaterial extends THREE.RawShaderMaterial {
	constructor (parameters = {}) {
		super();

		this.visibleNodesTexture = Potree.utils.generateDataTexture(2048, 1, new THREE.Color(0xffffff));
		this.visibleNodesTexture.minFilter = THREE.NearestFilter;
		this.visibleNodesTexture.magFilter = THREE.NearestFilter;

		let getValid = (a, b) => {
			if(a !== undefined){
				return a;
			}else{
				return b;
			}
		}

		let pointSize = getValid(parameters.size, 1.0);
		let minSize = getValid(parameters.minSize, 2.0);
		let maxSize = getValid(parameters.maxSize, 50.0);
		let treeType = getValid(parameters.treeType, Potree.TreeType.OCTREE);

		this._pointSizeType = Potree.PointSizeType.FIXED;
		this._shape = Potree.PointShape.SQUARE;
		this._pointColorType = Potree.PointColorType.RGB;
		this._useClipBox = false;
		this.clipBoxes = [];
		this.numClipBoxes = 0;
		this.clipPolygons = [];
		this._weighted = false;
		this._gradient = Potree.Gradients.SPECTRAL;
		this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
		this.lights = false;
		this.fog = false;
		this._treeType = treeType;
		this._useEDL = false;
		this._snapEnabled = false;
		this._numSnapshots = 0;
		this.defines = new Map();

		this._defaultIntensityRangeChanged = false;
		this._defaultElevationRangeChanged = false;

		this.attributes = {
			position: { type: 'fv', value: [] },
			color: { type: 'fv', value: [] },
			normal: { type: 'fv', value: [] },
			intensity: { type: 'f', value: [] },
			classification: { type: 'f', value: [] },
			returnNumber: { type: 'f', value: [] },
			numberOfReturns: { type: 'f', value: [] },
			pointSourceID: { type: 'f', value: [] },
			indices: { type: 'fv', value: [] }
		};

		this.uniforms = {
			level:				{ type: "f", value: 0.0 },
			vnStart:			{ type: "f", value: 0.0 },
			spacing:			{ type: "f", value: 1.0 },
			blendHardness:		{ type: "f", value: 2.0 },
			blendDepthSupplement:	{ type: "f", value: 0.0 },
			fov:				{ type: "f", value: 1.0 },
			screenWidth:		{ type: "f", value: 1.0 },
			screenHeight:		{ type: "f", value: 1.0 },
			near:				{ type: "f", value: 0.1 },
			far:				{ type: "f", value: 1.0 },
			uColor:				{ type: "c", value: new THREE.Color( 0xffffff ) },
			uOpacity:			{ type: "f", value: 1.0 },
			size:				{ type: "f", value: pointSize },
			minSize:			{ type: "f", value: minSize },
			maxSize:			{ type: "f", value: maxSize },
			octreeSize:			{ type: "f", value: 0 },
			bbSize:				{ type: "fv", value: [0, 0, 0] },
			elevationRange:		{ type: "2fv", value: [0, 0] },
			clipBoxCount:		{ type: "f", value: 0 },
			clipPolygonCount:	{ type: "i", value: 0 },
			visibleNodes:		{ type: "t", value: this.visibleNodesTexture },
			pcIndex:			{ type: "f", value: 0 },
			gradient:			{ type: "t", value: this.gradientTexture },
			classificationLUT:	{ type: "t", value: this.classificationTexture },
			uHQDepthMap:		{ type: "t", value: null },
			clipBoxes:			{ type: "Matrix4fv", value: [] },
			clipPolygons:		{ type: "3fv", value: [] },
			clipPolygonVCount:	{ type: "iv", value: [] },
			clipPolygonVP:		{ type: "Matrix4fv", value: [] },
			toModel:			{ type: "Matrix4f", value: [] },
			diffuse:			{ type: "fv", value: [1, 1, 1] },
			transition:			{ type: "f", value: 0.5 },
			intensityRange:		{ type: "fv", value: [0, 65000] },
			intensityGamma:		{ type: "f", value: 1 },
			intensityContrast:	{ type: "f", value: 0 },
			intensityBrightness:{ type: "f", value: 0 },
			rgbGamma:			{ type: "f", value: 1 },
			rgbContrast:		{ type: "f", value: 0 },
			rgbBrightness:		{ type: "f", value: 0 },
			wRGB:				{ type: "f", value: 1 },
			wIntensity:			{ type: "f", value: 0 },
			wElevation:			{ type: "f", value: 0 },
			wClassification:	{ type: "f", value: 0 },
			wReturnNumber:		{ type: "f", value: 0 },
			wSourceID:			{ type: "f", value: 0 },
			useOrthographicCamera: { type: "b", value: false },
			clipTask:			{ type: "i", value: 1 },
			clipMethod:			{ type: "i", value: 1 },
			uSnapshot:			{ type: "tv", value: [] },
			uSnapshotDepth:		{ type: "tv", value: [] },
			uSnapView:			{ type: "Matrix4fv", value: [] },
			uSnapProj:			{ type: "Matrix4fv", value: [] },
			uSnapProjInv:		{ type: "Matrix4fv", value: [] },
			uSnapViewInv:		{ type: "Matrix4fv", value: [] },
			uShadowColor:		{ type: "3fv", value: [0, 0, 0] }
		};

		this.classification = Potree.Classification.DEFAULT;

		this.defaultAttributeValues.normal = [0, 0, 0];
		this.defaultAttributeValues.classification = [0, 0, 0];
		this.defaultAttributeValues.indices = [0, 0, 0, 0];

		this.vertexShader = this.getDefines() + Potree.Shaders['pointcloud.vs'];
		this.fragmentShader = this.getDefines() + Potree.Shaders['pointcloud.fs'];
		this.vertexColors = THREE.VertexColors;
	}

	setDefine(key, value){
		if(value !== undefined && value !== null){
			if(this.defines.get(key) !== value){
				this.defines.set(key, value);
				this.updateShaderSource();
			}
		}else{
			this.removeDefine(key);
		}
	}

	removeDefine(key){
		this.defines.delete(key);
	}

	updateShaderSource () {
		this.vertexShader = this.getDefines() + Potree.Shaders['pointcloud.vs'];
		this.fragmentShader = this.getDefines() + Potree.Shaders['pointcloud.fs'];

		if (this.opacity === 1.0) {
			this.blending = THREE.NoBlending;
			this.transparent = false;
			this.depthTest = true;
			this.depthWrite = true;
			this.depthFunc = THREE.LessEqualDepth;
		} else if (this.opacity < 1.0 && !this.useEDL) {
			this.blending = THREE.AdditiveBlending;
			this.transparent = true;
			this.depthTest = false;
			this.depthWrite = true;
			this.depthFunc = THREE.AlwaysDepth;
		}

		if (this.weighted) {
			this.blending = THREE.AdditiveBlending;
			this.transparent = true;
			this.depthTest = true;
			this.depthWrite = false;
		}

		this.needsUpdate = true;
	}

	getDefines () {
		let defines = [];

		if (this.pointSizeType === Potree.PointSizeType.FIXED) {
			defines.push('#define fixed_point_size');
		} else if (this.pointSizeType === Potree.PointSizeType.ATTENUATED) {
			defines.push('#define attenuated_point_size');
		} else if (this.pointSizeType === Potree.PointSizeType.ADAPTIVE) {
			defines.push('#define adaptive_point_size');
		}

		if (this.shape === Potree.PointShape.SQUARE) {
			defines.push('#define square_point_shape');
		} else if (this.shape === Potree.PointShape.CIRCLE) {
			defines.push('#define circle_point_shape');
		} else if (this.shape === Potree.PointShape.PARABOLOID) {
			defines.push('#define paraboloid_point_shape');
		}

		if (this._useEDL) {
			defines.push('#define use_edl');
		}

		if (this._snapEnabled) {
			defines.push('#define snap_enabled');
		}

		if (this._pointColorType === Potree.PointColorType.RGB) {
			defines.push('#define color_type_rgb');
		} else if (this._pointColorType === Potree.PointColorType.COLOR) {
			defines.push('#define color_type_color');
		} else if (this._pointColorType === Potree.PointColorType.DEPTH) {
			defines.push('#define color_type_depth');
		} else if (this._pointColorType === Potree.PointColorType.HEIGHT) {
			defines.push('#define color_type_height');
		} else if (this._pointColorType === Potree.PointColorType.INTENSITY) {
			defines.push('#define color_type_intensity');
		} else if (this._pointColorType === Potree.PointColorType.INTENSITY_GRADIENT) {
			defines.push('#define color_type_intensity_gradient');
		} else if (this._pointColorType === Potree.PointColorType.LOD) {
			defines.push('#define color_type_lod');
		} else if (this._pointColorType === Potree.PointColorType.POINT_INDEX) {
			defines.push('#define color_type_point_index');
		} else if (this._pointColorType === Potree.PointColorType.CLASSIFICATION) {
			defines.push('#define color_type_classification');
		} else if (this._pointColorType === Potree.PointColorType.RETURN_NUMBER) {
			defines.push('#define color_type_return_number');
		} else if (this._pointColorType === Potree.PointColorType.SOURCE) {
			defines.push('#define color_type_source');
		} else if (this._pointColorType === Potree.PointColorType.NORMAL) {
			defines.push('#define color_type_normal');
		} else if (this._pointColorType === Potree.PointColorType.PHONG) {
			defines.push('#define color_type_phong');
		} else if (this._pointColorType === Potree.PointColorType.RGB_HEIGHT) {
			defines.push('#define color_type_rgb_height');
		} else if (this._pointColorType === Potree.PointColorType.COMPOSITE) {
			defines.push('#define color_type_composite');
		}
		
		if(this._treeType === Potree.TreeType.OCTREE){
			defines.push('#define tree_type_octree');
		}else if(this._treeType === Potree.TreeType.KDTREE){
			defines.push('#define tree_type_kdtree');
		}

		if (this.weighted) {
			defines.push('#define weighted_splats');
		}

		if (this.numClipBoxes > 0) {
			defines.push('#define use_clip_box');
		}

		if(this.clipPolygons.length > 0) {
			defines.push('#define use_clip_polygon');
		}

		for(let [key, value] of this.defines){
			defines.push(value);
		}

		return defines.join("\n");
	}

	setClipBoxes (clipBoxes) {
		if (!clipBoxes) {
			return;
		}

		this.clipBoxes = clipBoxes;
		let doUpdate = (this.numClipBoxes !== clipBoxes.length) && (clipBoxes.length === 0 || this.numClipBoxes === 0);

		this.numClipBoxes = clipBoxes.length;
		this.uniforms.clipBoxCount.value = this.numClipBoxes;

		if (doUpdate) {
			this.updateShaderSource();
		}

		this.uniforms.clipBoxes.value = new Float32Array(this.numClipBoxes * 16);

		for (let i = 0; i < this.numClipBoxes; i++) {
			let box = clipBoxes[i];

			this.uniforms.clipBoxes.value.set(box.inverse.elements, 16 * i);
		}

		for (let i = 0; i < this.uniforms.clipBoxes.value.length; i++) {
			if (Number.isNaN(this.uniforms.clipBoxes.value[i])) {
				this.uniforms.clipBoxes.value[i] = Infinity;
			}
		}
	}

	setClipPolygons(clipPolygons, maxPolygonVertices) {
		if(!clipPolygons){
			return;
		}

		this.clipPolygons = clipPolygons;

		let doUpdate = (this.clipPolygons.length !== clipPolygons.length);

		if(doUpdate){
			this.updateShaderSource();
		}
	}
	
	get gradient(){
		return this._gradient;
	}

	set gradient (value) {
		if (this._gradient !== value) {
			this._gradient = value;
			this.gradientTexture = Potree.PointCloudMaterial.generateGradientTexture(this._gradient);
			this.uniforms.gradient.value = this.gradientTexture;
		}
	}
	
	get useOrthographicCamera() {
		return this.uniforms.useOrthographicCamera.value;
	}

	set useOrthographicCamera(value) {
		if(this.uniforms.useOrthographicCamera.value !== value){
			this.uniforms.useOrthographicCamera.value = value;
		}
	}


	get classification () {
		return this._classification;
	}

	set classification (value) {

		let copy = {};
		for(let key of Object.keys(value)){
			copy[key] = value[key].clone();
		}

		let isEqual = false;
		if(this._classification === undefined){
			isEqual = false;
		}else{
			isEqual = Object.keys(copy).length === Object.keys(this._classification).length;

			for(let key of Object.keys(copy)){
				isEqual = isEqual && this._classification[key] !== undefined;
				isEqual = isEqual && copy[key].equals(this._classification[key]);
			}
		}

		if (!isEqual) {
			this._classification = copy;
			this.recomputeClassification();
		}
	}

	recomputeClassification () {
		this.classificationTexture = Potree.PointCloudMaterial.generateClassificationTexture(this._classification);
		this.uniforms.classificationLUT.value = this.classificationTexture;

		this.dispatchEvent({
			type: 'material_property_changed',
			target: this
		});
	}

	get numSnapshots(){
		return this._numSnapshots;
	}

	set numSnapshots(value){
		this._numSnapshots = value;
	}

	get snapEnabled(){
		return this._snapEnabled;
	}

	set snapEnabled(value){
		if(this._snapEnabled !== value){
			this._snapEnabled = value;
			//this.uniforms.snapEnabled.value = value;
			this.updateShaderSource();
		}
	}

	get spacing () {
		return this.uniforms.spacing.value;
	}

	set spacing (value) {
		if (this.uniforms.spacing.value !== value) {
			this.uniforms.spacing.value = value;
		}
	}

	get useClipBox () {
		return this._useClipBox;
	}

	set useClipBox (value) {
		if (this._useClipBox !== value) {
			this._useClipBox = value;
			this.updateShaderSource();
		}
	}

	get clipTask(){
		return this.uniforms.clipTask.value;
	}

	set clipTask(mode){
		this.uniforms.clipTask.value = mode;
	}

	get clipMethod(){
		return this.uniforms.clipMethod.value;
	}

	set clipMethod(mode){
		this.uniforms.clipMethod.value = mode;
	}

	get weighted(){
		return this._weighted;
	}

	set weighted (value) {
		if (this._weighted !== value) {
			this._weighted = value;
			this.updateShaderSource();
		}
	}

	get fov () {
		return this.uniforms.fov.value;
	}

	set fov (value) {
		if (this.uniforms.fov.value !== value) {
			this.uniforms.fov.value = value;
			// this.updateShaderSource();
		}
	}

	get screenWidth () {
		return this.uniforms.screenWidth.value;
	}

	set screenWidth (value) {
		if (this.uniforms.screenWidth.value !== value) {
			this.uniforms.screenWidth.value = value;
			// this.updateShaderSource();
		}
	}

	get screenHeight () {
		return this.uniforms.screenHeight.value;
	}

	set screenHeight (value) {
		if (this.uniforms.screenHeight.value !== value) {
			this.uniforms.screenHeight.value = value;
			// this.updateShaderSource();
		}
	}

	get near () {
		return this.uniforms.near.value;
	}

	set near (value) {
		if (this.uniforms.near.value !== value) {
			this.uniforms.near.value = value;
		}
	}

	get far () {
		return this.uniforms.far.value;
	}

	set far (value) {
		if (this.uniforms.far.value !== value) {
			this.uniforms.far.value = value;
		}
	}
	
	get opacity(){
		return this.uniforms.uOpacity.value;
	}

	set opacity (value) {
		if (this.uniforms && this.uniforms.uOpacity) {
			if (this.uniforms.uOpacity.value !== value) {
				this.uniforms.uOpacity.value = value;
				this.updateShaderSource();
				this.dispatchEvent({
					type: 'opacity_changed',
					target: this
				});
				this.dispatchEvent({
					type: 'material_property_changed',
					target: this
				});
			}
		}
	}

	get pointColorType () {
		return this._pointColorType;
	}

	set pointColorType (value) {
		if (this._pointColorType !== value) {
			this._pointColorType = value;
			this.updateShaderSource();
			this.dispatchEvent({
				type: 'point_color_type_changed',
				target: this
			});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get pointSizeType () {
		return this._pointSizeType;
	}

	set pointSizeType (value) {
		if (this._pointSizeType !== value) {
			this._pointSizeType = value;
			this.updateShaderSource();
			this.dispatchEvent({
				type: 'point_size_type_changed',
				target: this
			});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get useEDL(){
		return this._useEDL;
	}

	set useEDL (value) {
		if (this._useEDL !== value) {
			this._useEDL = value;
			this.updateShaderSource();
		}
	}

	get color () {
		return this.uniforms.uColor.value;
	}

	set color (value) {
		if (!this.uniforms.uColor.value.equals(value)) {
			this.uniforms.uColor.value.copy(value);
			
			this.dispatchEvent({
				type: 'color_changed',
				target: this
			});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get shape () {
		return this._shape;
	}

	set shape (value) {
		if (this._shape !== value) {
			this._shape = value;
			this.updateShaderSource();
			this.dispatchEvent({type: 'point_shape_changed', target: this});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get treeType () {
		return this._treeType;
	}

	set treeType (value) {
		if (this._treeType !== value) {
			this._treeType = value;
			this.updateShaderSource();
		}
	}

	get bbSize () {
		return this.uniforms.bbSize.value;
	}

	set bbSize (value) {
		this.uniforms.bbSize.value = value;
	}

	get size () {
		return this.uniforms.size.value;
	}

	set size (value) {
		if (this.uniforms.size.value !== value) {
			this.uniforms.size.value = value;

			this.dispatchEvent({
				type: 'point_size_changed',
				target: this
			});
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get elevationRange () {
		return this.uniforms.elevationRange.value;
	}

	set elevationRange (value) {
		let changed = this.uniforms.elevationRange.value[0] !== value[0]
			|| this.uniforms.elevationRange.value[1] !== value[1];

		if(changed){
			this.uniforms.elevationRange.value = value;

			this._defaultElevationRangeChanged = true;

			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get heightMin () {
		return this.uniforms.elevationRange.value[0];
	}

	set heightMin (value) {
		this.elevationRange = [value, this.elevationRange[1]];
	}

	get heightMax () {
		return this.uniforms.elevationRange.value[1];
	}

	set heightMax (value) {
		this.elevationRange = [this.elevationRange[0], value];
	}

	get transition () {
		return this.uniforms.transition.value;
	}

	set transition (value) {
		this.uniforms.transition.value = value;
	}

	get intensityRange () {
		return this.uniforms.intensityRange.value;
	}

	set intensityRange (value) {
		if (!(value instanceof Array && value.length === 2)) {
			return;
		}

		if (value[0] === this.uniforms.intensityRange.value[0] &&
			value[1] === this.uniforms.intensityRange.value[1]) {
			return;
		}

		this.uniforms.intensityRange.value = value;

		this._defaultIntensityRangeChanged = true;

		this.dispatchEvent({
			type: 'material_property_changed',
			target: this
		});
	}

	get intensityGamma () {
		return this.uniforms.intensityGamma.value;
	}

	set intensityGamma (value) {
		if (this.uniforms.intensityGamma.value !== value) {
			this.uniforms.intensityGamma.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get intensityContrast () {
		return this.uniforms.intensityContrast.value;
	}

	set intensityContrast (value) {
		if (this.uniforms.intensityContrast.value !== value) {
			this.uniforms.intensityContrast.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get intensityBrightness () {
		return this.uniforms.intensityBrightness.value;
	}

	set intensityBrightness (value) {
		if (this.uniforms.intensityBrightness.value !== value) {
			this.uniforms.intensityBrightness.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get rgbGamma () {
		return this.uniforms.rgbGamma.value;
	}

	set rgbGamma (value) {
		if (this.uniforms.rgbGamma.value !== value) {
			this.uniforms.rgbGamma.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get rgbContrast () {
		return this.uniforms.rgbContrast.value;
	}

	set rgbContrast (value) {
		if (this.uniforms.rgbContrast.value !== value) {
			this.uniforms.rgbContrast.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get rgbBrightness () {
		return this.uniforms.rgbBrightness.value;
	}

	set rgbBrightness (value) {
		if (this.uniforms.rgbBrightness.value !== value) {
			this.uniforms.rgbBrightness.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightRGB () {
		return this.uniforms.wRGB.value;
	}

	set weightRGB (value) {
		if(this.uniforms.wRGB.value !== value){
			this.uniforms.wRGB.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightIntensity () {
		return this.uniforms.wIntensity.value;
	}

	set weightIntensity (value) {
		if(this.uniforms.wIntensity.value !== value){
			this.uniforms.wIntensity.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightElevation () {
		return this.uniforms.wElevation.value;
	}

	set weightElevation (value) {
		if(this.uniforms.wElevation.value !== value){
			this.uniforms.wElevation.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightClassification () {
		return this.uniforms.wClassification.value;
	}

	set weightClassification (value) {
		if(this.uniforms.wClassification.value !== value){
			this.uniforms.wClassification.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightReturnNumber () {
		return this.uniforms.wReturnNumber.value;
	}

	set weightReturnNumber (value) {
		if(this.uniforms.wReturnNumber.value !== value){
			this.uniforms.wReturnNumber.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	get weightSourceID () {
		return this.uniforms.wSourceID.value;
	}

	set weightSourceID (value) {
		if(this.uniforms.wSourceID.value !== value){
			this.uniforms.wSourceID.value = value;
			this.dispatchEvent({
				type: 'material_property_changed',
				target: this
			});
		}
	}

	static generateGradientTexture (gradient) {
		let size = 64;

		// create canvas
		let canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;

		// get context
		let context = canvas.getContext('2d');

		// draw gradient
		context.rect(0, 0, size, size);
		let ctxGradient = context.createLinearGradient(0, 0, size, size);

		for (let i = 0; i < gradient.length; i++) {
			let step = gradient[i];

			ctxGradient.addColorStop(step[0], '#' + step[1].getHexString());
		}

		context.fillStyle = ctxGradient;
		context.fill();
		
		//let texture = new THREE.Texture(canvas);
		let texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		
		texture.minFilter = THREE.LinearFilter;
		// textureImage = texture.image;

		return texture;
	}

	static generateClassificationTexture (classification) {
		let width = 256;
		let height = 256;
		let size = width * height;

		let data = new Uint8Array(4 * size);

		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				let i = x + width * y;

				let color;
				if (classification[x]) {
					color = classification[x];
				} else if (classification[x % 32]) {
					color = classification[x % 32];
				} else {
					color = classification.DEFAULT;
				}

				data[4 * i + 0] = 255 * color.x;
				data[4 * i + 1] = 255 * color.y;
				data[4 * i + 2] = 255 * color.z;
				data[4 * i + 3] = 255 * color.w;
			}
		}

		let texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
		texture.magFilter = THREE.NearestFilter;
		texture.needsUpdate = true;

		return texture;
	}

	disableEvents(){
		if(this._hiddenListeners === undefined){
			this._hiddenListeners = this._listeners;
			this._listeners = {};
		}
	};

	enableEvents(){
		this._listeners = this._hiddenListeners;
		this._hiddenListeners = undefined;
	};

	copyFrom(from){

		for(let name of this.uniforms){
			this.uniforms[name].value = from.uniforms[name].value;
		}

		

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

Potree.EyeDomeLightingMaterial = class EyeDomeLightingMaterial extends THREE.ShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			screenWidth: 	{ type: 'f', 	value: 0 },
			screenHeight: 	{ type: 'f', 	value: 0 },
			edlStrength: 	{ type: 'f', 	value: 1.0 },
			radius: 		{ type: 'f', 	value: 1.0 },
			neighbours:		{ type: '2fv', 	value: [] },
			depthMap: 		{ type: 't', 	value: null },
			//colorMap: 		{ type: 't', 	value: null },
			uRegularColor:	{ type: 't', 	value: null },
			uRegularDepth:	{ type: 't', 	value: null },
			uEDLColor:		{ type: 't', 	value: null },
			uEDLDepth:		{ type: 't', 	value: null },
			opacity:		{ type: 'f',	value: 1.0 }
		};

		this.setValues({
			uniforms: uniforms,
			vertexShader: this.getDefines() + Potree.Shaders['edl.vs'],
			fragmentShader: this.getDefines() + Potree.Shaders['edl.fs'],
			lights: false
		});

		this.neighbourCount = 8;
	}

	getDefines() {
		let defines = '';

		defines += '#define NEIGHBOUR_COUNT ' + this.neighbourCount + '\n';

		return defines;
	}

	updateShaderSource() {

		let vs = this.getDefines() + Potree.Shaders['edl.vs'];
		let fs = this.getDefines() + Potree.Shaders['edl.fs'];

		this.setValues({
			vertexShader: vs,
			fragmentShader: fs
		});

		this.uniforms.neighbours.value = this.neighbours;

		this.needsUpdate = true;
	}

	get neighbourCount(){
		return this._neighbourCount;
	}

	set neighbourCount(value){
		if (this._neighbourCount !== value) {
			this._neighbourCount = value;
			this.neighbours = new Float32Array(this._neighbourCount * 2);
			for (let c = 0; c < this._neighbourCount; c++) {
				this.neighbours[2 * c + 0] = Math.cos(2 * c * Math.PI / this._neighbourCount);
				this.neighbours[2 * c + 1] = Math.sin(2 * c * Math.PI / this._neighbourCount);
			}

			this.updateShaderSource();
		}
	}

	
};



// see http://john-chapman-graphics.blogspot.co.at/2013/01/ssao-tutorial.html

Potree.BlurMaterial = class BlurMaterial extends THREE.ShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			near: { type: 'f', value: 0 },
			far: { type: 'f', value: 0 },
			screenWidth: { type: 'f', value: 0 },
			screenHeight: { type: 'f', value: 0 },
			map: { type: 't', value: null }
		};

		this.setValues({
			uniforms: uniforms,
			vertexShader: Potree.Shaders['blur.vs'],
			fragmentShader: Potree.Shaders['blur.fs']
		});
	}
};



Potree.NormalizationMaterial = class NormalizationMaterial extends THREE.RawShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			uDepthMap:		{ type: 't', value: null },
			uWeightMap:		{ type: 't', value: null },
		};

		this.setValues({
			uniforms: uniforms,
			vertexShader: this.getDefines() + Potree.Shaders['normalize.vs'],
			fragmentShader: this.getDefines() + Potree.Shaders['normalize.fs'],
		});
	}

	getDefines() {
		let defines = '';

		return defines;
	}

	updateShaderSource() {

		let vs = this.getDefines() + Potree.Shaders['normalize.vs'];
		let fs = this.getDefines() + Potree.Shaders['normalize.fs'];

		this.setValues({
			vertexShader: vs,
			fragmentShader: fs
		});

		this.needsUpdate = true;
	}
};



Potree.NormalizationEDLMaterial = class NormalizationEDLMaterial extends THREE.RawShaderMaterial{

	constructor(parameters = {}){
		super();

		let uniforms = {
			screenWidth: 	{ type: 'f', 	value: 0 },
			screenHeight: 	{ type: 'f', 	value: 0 },
			edlStrength: 	{ type: 'f', 	value: 1.0 },
			radius: 		{ type: 'f', 	value: 1.0 },
			neighbours:		{ type: '2fv', 	value: [] },
			uEDLMap:		{ type: 't', value: null },
			uDepthMap:		{ type: 't', value: null },
			uWeightMap:		{ type: 't', value: null },
		};

		this.setValues({
			uniforms: uniforms,
			vertexShader: this.getDefines() + Potree.Shaders['normalize.vs'],
			fragmentShader: this.getDefines() + Potree.Shaders['normalize_and_edl.fs'],
		});

		this.neighbourCount = 8;
	}

	getDefines() {
		let defines = '';

		defines += '#define NEIGHBOUR_COUNT ' + this.neighbourCount + '\n';

		return defines;
	}

	updateShaderSource() {

		let vs = this.getDefines() + Potree.Shaders['normalize.vs'];
		let fs = this.getDefines() + Potree.Shaders['normalize_and_edl.fs'];

		this.setValues({
			vertexShader: vs,
			fragmentShader: fs
		});

		this.uniforms.neighbours.value = this.neighbours;

		this.needsUpdate = true;
	}

	get neighbourCount(){
		return this._neighbourCount;
	}

	set neighbourCount(value){
		if (this._neighbourCount !== value) {
			this._neighbourCount = value;
			this.neighbours = new Float32Array(this._neighbourCount * 2);
			for (let c = 0; c < this._neighbourCount; c++) {
				this.neighbours[2 * c + 0] = Math.cos(2 * c * Math.PI / this._neighbourCount);
				this.neighbours[2 * c + 1] = Math.sin(2 * c * Math.PI / this._neighbourCount);
			}

			this.updateShaderSource();
		}
	}
	
};


/**
 * @author mschuetz / http://mschuetz.at
 *
 *
 */
Potree.InputHandler = class InputHandler extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;
		this.domElement = this.renderer.domElement;
		this.enabled = true;
		
		this.scene = null;
		this.interactiveScenes = [];
		this.interactiveObjects = new Set();
		this.inputListeners = [];
		this.blacklist = new Set();

		this.drag = null;
		this.mouse = new THREE.Vector2(0, 0);

		this.selection = [];

		this.hoveredElements = [];
		this.pressedKeys = {};

		this.wheelDelta = 0;

		this.speed = 1;

		this.logMessages = false;

		if (this.domElement.tabIndex === -1) {
			this.domElement.tabIndex = 2222;
		}

		this.domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
		this.domElement.addEventListener('click', this.onMouseClick.bind(this), false);
		this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
		this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);
		this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
		this.domElement.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
		this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel.bind(this), false); // Firefox
		this.domElement.addEventListener('dblclick', this.onDoubleClick.bind(this));
		this.domElement.addEventListener('keydown', this.onKeyDown.bind(this));
		this.domElement.addEventListener('keyup', this.onKeyUp.bind(this));
		this.domElement.addEventListener('touchstart', this.onTouchStart.bind(this));
		this.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
		this.domElement.addEventListener('touchmove', this.onTouchMove.bind(this));
	}

	addInputListener (listener) {
		this.inputListeners.push(listener);
	}

	removeInputListener (listener) {
		this.inputListeners = this.inputListeners.filter(e => e !== listener);
	}

	getSortedListeners(){
		return this.inputListeners.sort( (a, b) => {
			let ia = (a.importance !== undefined) ? a.importance : 0;
			let ib = (b.importance !== undefined) ? b.importance : 0;

			return ib - ia;
		});
	}

	onTouchStart (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchStart');

		e.preventDefault();

		if (e.touches.length === 1) {
			let rect = this.domElement.getBoundingClientRect();
			let x = e.touches[0].pageX - rect.left;
			let y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);

			this.startDragging(null);
		}

		
		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}
	}

	onTouchEnd (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchEnd');

		e.preventDefault();

		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: 'drop',
				drag: this.drag,
				viewer: this.viewer
			});
		}

		this.drag = null;

		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}
	}

	onTouchMove (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onTouchMove');

		e.preventDefault();

		if (e.touches.length === 1) {
			let rect = this.domElement.getBoundingClientRect();
			let x = e.touches[0].pageX - rect.left;
			let y = e.touches[0].pageY - rect.top;
			this.mouse.set(x, y);

			if (this.drag) {
				this.drag.mouse = 1;

				this.drag.lastDrag.x = x - this.drag.end.x;
				this.drag.lastDrag.y = y - this.drag.end.y;

				this.drag.end.set(x, y);

				if (this.logMessages) console.log(this.constructor.name + ': drag: ');
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}
		}

		for (let inputListener of this.getSortedListeners()) {
			inputListener.dispatchEvent({
				type: e.type,
				touches: e.touches,
				changedTouches: e.changedTouches
			});
		}

		// DEBUG CODE
		// let debugTouches = [...e.touches, {
		//	pageX: this.domElement.clientWidth / 2,
		//	pageY: this.domElement.clientHeight / 2}];
		// for(let inputListener of this.getSortedListeners()){
		//	inputListener.dispatchEvent({
		//		type: e.type,
		//		touches: debugTouches,
		//		changedTouches: e.changedTouches
		//	});
		// }
	}

	onKeyDown (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onKeyDown');

		// DELETE
		if (e.keyCode === Potree.KeyCodes.DELETE && this.selection.length > 0) {
			this.dispatchEvent({
				type: 'delete',
				selection: this.selection
			});

			this.deselectAll();
		}

		this.dispatchEvent({
			type: 'keydown',
			keyCode: e.keyCode,
			event: e
		});

		// for(let l of this.getSortedListeners()){
		//	l.dispatchEvent({
		//		type: "keydown",
		//		keyCode: e.keyCode,
		//		event: e
		//	});
		// }

		this.pressedKeys[e.keyCode] = true;

		// e.preventDefault();
	}

	onKeyUp (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onKeyUp');

		delete this.pressedKeys[e.keyCode];

		e.preventDefault();
	}

	onDoubleClick (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onDoubleClick');

		let consumed = false;
		for (let hovered of this.hoveredElements) {
			if (hovered._listeners && hovered._listeners['dblclick']) {
				hovered.object.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: hovered.object
				});
				consumed = true;
				break;
			}
		}

		if (!consumed) {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'dblclick',
					mouse: this.mouse,
					object: null
				});
			}
		}

		e.preventDefault();
	}

	onMouseClick (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseClick');

		e.preventDefault();
	}

	onMouseDown (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseDown');

		e.preventDefault();

		let consumed = false;
		let consume = () => { return consumed = true; };
		if (this.hoveredElements.length === 0) {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mousedown',
					viewer: this.viewer,
					mouse: this.mouse
				});
			}
		}else{
			for(let hovered of this.hoveredElements){
				let object = hovered.object;
				object.dispatchEvent({
					type: 'mousedown',
					viewer: this.viewer,
					consume: consume
				});

				if(consumed){
					break;
				}
			}
		}

		if (!this.drag) {
			let target = this.hoveredElements
				.find(el => (
					el.object._listeners &&
					el.object._listeners['drag'] &&
					el.object._listeners['drag'].length > 0));

			if (target) {
				this.startDragging(target.object, {location: target.point});
			} else {
				this.startDragging(null);
			}
		}

		if (this.scene) {
			this.viewStart = this.scene.view.clone();
		}
	}

	onMouseUp (e) {
		if (this.logMessages) console.log(this.constructor.name + ': onMouseUp');

		e.preventDefault();

		let noMovement = this.getNormalizedDrag().length() === 0;

		
		let consumed = false;
		let consume = () => { return consumed = true; };
		if (this.hoveredElements.length === 0) {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mouseup',
					viewer: this.viewer,
					mouse: this.mouse,
					consume: consume
				});

				if(consumed){
					break;
				}
			}
		}else{
			let hovered = this.hoveredElements
				.map(e => e.object)
				.find(e => (e._listeners && e._listeners['mouseup']));
			if(hovered){
				hovered.dispatchEvent({
					type: 'mouseup',
					viewer: this.viewer,
					consume: consume
				});
			}
		}

		if (this.drag) {
			if (this.drag.object) {
				if (this.logMessages) console.log(`${this.constructor.name}: drop ${this.drag.object.name}`);
				this.drag.object.dispatchEvent({
					type: 'drop',
					drag: this.drag,
					viewer: this.viewer

				});
			} else {
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drop',
						drag: this.drag,
						viewer: this.viewer
					});
				}
			}

			// check for a click
			let clicked = this.hoveredElements.map(h => h.object).find(v => v === this.drag.object) !== undefined;
			if(clicked){
				if (this.logMessages) console.log(`${this.constructor.name}: click ${this.drag.object.name}`);
				this.drag.object.dispatchEvent({
					type: 'click',
					viewer: this.viewer,
					consume: consume,
				});
			}

			this.drag = null;
		}

		if(!consumed){
			if (e.button === THREE.MOUSE.LEFT) {
				if (noMovement) {
					let selectable = this.hoveredElements
						.find(el => el.object._listeners && el.object._listeners['select']);

					if (selectable) {
						selectable = selectable.object;

						if (this.isSelected(selectable)) {
							this.selection
								.filter(e => e !== selectable)
								.forEach(e => this.toggleSelection(e));
						} else {
							this.deselectAll();
							this.toggleSelection(selectable);
						}
					} else {
						this.deselectAll();
					}
				}
			} else if ((e.button === THREE.MOUSE.RIGHT) && noMovement) {
				this.deselectAll();
			}
		}
	}

	onMouseMove (e) {
		e.preventDefault();

		let rect = this.domElement.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		this.mouse.set(x, y);

		let hoveredElements = this.getHoveredElements();
		if(hoveredElements.length > 0){
			let names = hoveredElements.map(h => h.object.name).join(", ");
			if (this.logMessages) console.log(`${this.constructor.name}: onMouseMove; hovered: '${names}'`);
		}

		if (this.drag) {
			this.drag.mouse = e.buttons;

			this.drag.lastDrag.x = x - this.drag.end.x;
			this.drag.lastDrag.y = y - this.drag.end.y;

			this.drag.end.set(x, y);

			if (this.drag.object) {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ' + this.drag.object.name);
				this.drag.object.dispatchEvent({
					type: 'drag',
					drag: this.drag,
					viewer: this.viewer
				});
			} else {
				if (this.logMessages) console.log(this.constructor.name + ': drag: ');

				let dragConsumed = false;
				for (let inputListener of this.getSortedListeners()) {
					inputListener.dispatchEvent({
						type: 'drag',
						drag: this.drag,
						viewer: this.viewer,
						consume: () => {dragConsumed = true;}
					});

					if(dragConsumed){
						break;
					}
				}
			}
		}else{
			let curr = hoveredElements.map(a => a.object).find(a => true);
			let prev = this.hoveredElements.map(a => a.object).find(a => true);

			if(curr !== prev){
				if(curr){
					if (this.logMessages) console.log(`${this.constructor.name}: mouseover: ${curr.name}`);
					curr.dispatchEvent({
						type: 'mouseover',
						object: curr,
					});
				}
				if(prev){
					if (this.logMessages) console.log(`${this.constructor.name}: mouseleave: ${prev.name}`);
					prev.dispatchEvent({
						type: 'mouseleave',
						object: prev,
					});
				}
			}

			if(hoveredElements.length > 0){
				let object = hoveredElements
					.map(e => e.object)
					.find(e => (e._listeners && e._listeners['mousemove']));
				
				if(object){
					object.dispatchEvent({
						type: 'mousemove',
						object: object
					});
				}
			}

		}
		
		

		this.hoveredElements = hoveredElements;
	}
	
	onMouseWheel(e){
		if(!this.enabled) return;

		if(this.logMessages) console.log(this.constructor.name + ": onMouseWheel");
		
		e.preventDefault();

		let delta = 0;
		if (e.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
			delta = e.wheelDelta;
		} else if (e.detail !== undefined) { // Firefox
			delta = -e.detail;
		}

		let ndelta = Math.sign(delta);

		// this.wheelDelta += Math.sign(delta);

		if (this.hoveredElement) {
			this.hoveredElement.object.dispatchEvent({
				type: 'mousewheel',
				delta: ndelta,
				object: this.hoveredElement.object
			});
		} else {
			for (let inputListener of this.getSortedListeners()) {
				inputListener.dispatchEvent({
					type: 'mousewheel',
					delta: ndelta,
					object: null
				});
			}
		}
	}

	startDragging (object, args = null) {

		let name = object ? object.name : "no name";
		if (this.logMessages) console.log(`${this.constructor.name}: startDragging: '${name}'`);

		this.drag = {
			start: this.mouse.clone(),
			end: this.mouse.clone(),
			lastDrag: new THREE.Vector2(0, 0),
			startView: this.scene.view.clone(),
			object: object
		};

		if (args) {
			for (let key of Object.keys(args)) {
				this.drag[key] = args[key];
			}
		}
	}

	getMousePointCloudIntersection (mouse) {
		return Potree.utils.getMousePointCloudIntersection(
			this.mouse, 
			this.scene.getActiveCamera(), 
			this.viewer, 
			this.scene.pointclouds);
	}

	toggleSelection (object) {
		let oldSelection = this.selection;

		let index = this.selection.indexOf(object);

		if (index === -1) {
			this.selection.push(object);
			object.dispatchEvent({
				type: 'select'
			});
		} else {
			this.selection.splice(index, 1);
			object.dispatchEvent({
				type: 'deselect'
			});
		}

		this.dispatchEvent({
			type: 'selection_changed',
			oldSelection: oldSelection,
			selection: this.selection
		});
	}

	deselect(object){

		let oldSelection = this.selection;

		let index = this.selection.indexOf(object);

		if(index >= 0){
			this.selection.splice(index, 1);
			object.dispatchEvent({
				type: 'deselect'
			});

			this.dispatchEvent({
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection
			});
		}
	}

	deselectAll () {
		for (let object of this.selection) {
			object.dispatchEvent({
				type: 'deselect'
			});
		}

		let oldSelection = this.selection;

		if (this.selection.length > 0) {
			this.selection = [];
			this.dispatchEvent({
				type: 'selection_changed',
				oldSelection: oldSelection,
				selection: this.selection
			});
		}
	}

	isSelected (object) {
		let index = this.selection.indexOf(object);

		return index !== -1;
	}

	registerInteractiveObject(object){
		this.interactiveObjects.add(object);
	}

	removeInteractiveObject(object){
		this.interactiveObjects.delete(object);
	}

	registerInteractiveScene (scene) {
		let index = this.interactiveScenes.indexOf(scene);
		if (index === -1) {
			this.interactiveScenes.push(scene);
		}
	}

	unregisterInteractiveScene (scene) {
		let index = this.interactiveScenes.indexOf(scene);
		if (index > -1) {
			this.interactiveScenes.splice(index, 1);
		}
	}

	getHoveredElement () {
		let hoveredElements = this.getHoveredElements();
		if (hoveredElements.length > 0) {
			return hoveredElements[0];
		} else {
			return null;
		}
	}

	getHoveredElements () {
		let scenes = this.interactiveScenes.concat(this.scene.scene);

		let interactableListeners = ['mouseup', 'mousemove', 'mouseover', 'mouseleave', 'drag', 'drop', 'click', 'select', 'deselect'];
		let interactables = [];
		for (let scene of scenes) {
			scene.traverseVisible(node => {
				if (node._listeners && node.visible && !this.blacklist.has(node)) {
					let hasInteractableListener = interactableListeners.filter((e) => {
						return node._listeners[e] !== undefined;
					}).length > 0;

					if (hasInteractableListener) {
						interactables.push(node);
					}
				}
			});
		}
		
		let camera = this.scene.getActiveCamera();
		let ray = Potree.utils.mouseToRay(this.mouse, camera, this.domElement.clientWidth, this.domElement.clientHeight);
		
		let raycaster = new THREE.Raycaster();
		raycaster.ray.set(ray.origin, ray.direction);
		raycaster.linePrecision = 0.2;

		let intersections = raycaster.intersectObjects(interactables.filter(o => o.visible), false);

		return intersections;

		// if(intersections.length > 0){
		//	return intersections[0];
		// }else{
		//	return null;
		// }
	}

	setScene (scene) {
		this.deselectAll();

		this.scene = scene;
	}

	update (delta) {

	}

	getNormalizedDrag () {
		if (!this.drag) {
			return new THREE.Vector2(0, 0);
		}

		let diff = new THREE.Vector2().subVectors(this.drag.end, this.drag.start);

		diff.x = diff.x / this.domElement.clientWidth;
		diff.y = diff.y / this.domElement.clientHeight;

		return diff;
	}

	getNormalizedLastDrag () {
		if (!this.drag) {
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

Potree.FirstPersonControls = class FirstPersonControls extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.scene = null;
		this.sceneControls = new THREE.Scene();

		this.rotationSpeed = 200;
		this.moveSpeed = 10;
		this.lockElevation = false;

		this.keys = {
			FORWARD: ['W'.charCodeAt(0), 38],
			BACKWARD: ['S'.charCodeAt(0), 40],
			LEFT: ['A'.charCodeAt(0), 37],
			RIGHT: ['D'.charCodeAt(0), 39],
			UP: ['R'.charCodeAt(0), 33],
			DOWN: ['F'.charCodeAt(0), 34]
		};

		this.fadeFactor = 50;
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.translationDelta = new THREE.Vector3(0, 0, 0);
		this.translationWorldDelta = new THREE.Vector3(0, 0, 0);

		this.tweens = [];

		let drag = (e) => {
			if (e.drag.object !== null) {
				return;
			}

			if (e.drag.startHandled === undefined) {
				e.drag.startHandled = true;

				this.dispatchEvent({type: 'start'});
			}

			let moveSpeed = this.viewer.getMoveSpeed();

			let ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
			};

			if (e.drag.mouse === Potree.MOUSE.LEFT) {
				this.yawDelta += ndrag.x * this.rotationSpeed;
				this.pitchDelta += ndrag.y * this.rotationSpeed;
			} else if (e.drag.mouse === Potree.MOUSE.RIGHT) {
				this.translationDelta.x -= ndrag.x * moveSpeed * 100;
				this.translationDelta.z += ndrag.y * moveSpeed * 100;
			}
		};

		let drop = e => {
			this.dispatchEvent({type: 'end'});
		};

		let scroll = (e) => {
			let speed = this.viewer.getMoveSpeed();

			if (e.delta < 0) {
				speed = speed * 0.9;
			} else if (e.delta > 0) {
				speed = speed / 0.9;
			}

			speed = Math.max(speed, 0.1);

			this.viewer.setMoveSpeed(speed);
		};

		let dblclick = (e) => {
			this.zoomToLocation(e.mouse);
		};

		this.addEventListener('drag', drag);
		this.addEventListener('drop', drop);
		this.addEventListener('mousewheel', scroll);
		this.addEventListener('dblclick', dblclick);
	}

	setScene (scene) {
		this.scene = scene;
	}

	stop(){
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.translationDelta.set(0, 0, 0);
	}
	
	zoomToLocation(mouse){
		let camera = this.scene.getActiveCamera();
		
		let I = Potree.utils.getMousePointCloudIntersection(
			mouse,
			camera,
			this.viewer,
			this.scene.pointclouds);

		if (I === null) {
			return;
		}

		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;

			let domElement = this.renderer.domElement;
			let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere().radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}

		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		// TODO Unused: let controlsTargetPosition = I.location;

		let animationDuration = 600;
		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate
			let value = {x: 0};
			let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);

			let startPos = this.scene.view.position.clone();
			let targetPos = cameraTargetPosition.clone();
			let startRadius = this.scene.view.radius;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);

			tween.onUpdate(() => {
				let t = value.x;
				this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

				this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
				this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
			});

			tween.onComplete(() => {
				this.tweens = this.tweens.filter(e => e !== tween);
			});

			tween.start();
		}
	}

	update (delta) {
		let view = this.scene.view;

		{ // cancel move animations on user input
			let changes = [ this.yawDelta,
				this.pitchDelta,
				this.translationDelta.length(),
				this.translationWorldDelta.length() ];
			let changeHappens = changes.some(e => Math.abs(e) > 0.001);
			if (changeHappens && this.tweens.length > 0) {
				this.tweens.forEach(e => e.stop());
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

			if(this.lockElevation){
				let dir = view.direction;
				dir.z = 0;
				dir.normalize();

				if (moveForward && moveBackward) {
					this.translationWorldDelta.set(0, 0, 0);
				} else if (moveForward) {
					this.translationWorldDelta.copy(dir.multiplyScalar(this.viewer.getMoveSpeed()));
				} else if (moveBackward) {
					this.translationWorldDelta.copy(dir.multiplyScalar(-this.viewer.getMoveSpeed()));
				}
			}else{
				if (moveForward && moveBackward) {
					this.translationDelta.y = 0;
				} else if (moveForward) {
					this.translationDelta.y = this.viewer.getMoveSpeed();
				} else if (moveBackward) {
					this.translationDelta.y = -this.viewer.getMoveSpeed();
				}
			}

			if (moveLeft && moveRight) {
				this.translationDelta.x = 0;
			} else if (moveLeft) {
				this.translationDelta.x = -this.viewer.getMoveSpeed();
			} else if (moveRight) {
				this.translationDelta.x = this.viewer.getMoveSpeed();
			}

			if (moveUp && moveDown) {
				this.translationWorldDelta.z = 0;
			} else if (moveUp) {
				this.translationWorldDelta.z = this.viewer.getMoveSpeed();
			} else if (moveDown) {
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

		{ // decelerate over time
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

Potree.GeoControls = class GeoControls extends THREE.EventDispatcher{

	constructor(object, domElement){
		super();

		console.log("deprecated?");

		this.object = object;
		this.domElement = (domElement !== undefined) ? domElement : document;

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

		let rotateStart = new THREE.Vector2();
		let rotateEnd = new THREE.Vector2();
		let rotateDelta = new THREE.Vector2();

		let panStart = new THREE.Vector2();
		let panEnd = new THREE.Vector2();
		let panDelta = new THREE.Vector2();
		let panOffset = new THREE.Vector3();

		// TODO Unused: let offset = new THREE.Vector3();

		let phiDelta = 0;
		let thetaDelta = 0;
		let pan = new THREE.Vector3();

		this.shiftDown = false;

		let lastPosition = new THREE.Vector3();

		let STATE = { NONE: -1, ROTATE: 0, SPEEDCHANGE: 1, PAN: 2 };

		let state = STATE.NONE;

		// for reset
		this.position0 = this.object.position.clone();

		// events

		let changeEvent = { type: 'change' };
		let startEvent = { type: 'start' };
		let endEvent = { type: 'end' };

		this.domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
		this.domElement.addEventListener('mousedown', this.onMouseDown.bind(this), false);
		this.domElement.addEventListener('mousewheel', this.onMouseWheel.bind(this), false);
		this.domElement.addEventListener('DOMMouseScroll', this.onMouseWheel.bind(this), false); // firefox

		this.domElement.addEventListener('mousemove', this.onMouseMove.bind(this), false);
		this.domElement.addEventListener('mouseup', this.onMouseUp.bind(this), false);

		if (this.domElement.tabIndex === -1) {
			this.domElement.tabIndex = 2222;
		}
		this.domElement.addEventListener('keydown', this.onKeyDown.bind(this), false);
		this.domElement.addEventListener('keyup', this.onKeyUp.bind(this), false);

	}

	setTrack(track) {
		if (this.track !== track) {
			this.track = track;
			this.trackPos = null;
		}
	};

	setTrackPos(trackPos, _preserveRelativeRotation){
		// TODO Unused: let preserveRelativeRotation = _preserveRelativeRotation || false;

		let newTrackPos = Math.max(0, Math.min(1, trackPos));
		let oldTrackPos = this.trackPos || newTrackPos;

		let newTangent = this.track.getTangentAt(newTrackPos);
		let oldTangent = this.track.getTangentAt(oldTrackPos);

		if (newTangent.equals(oldTangent)) {
			// no change in direction
		} else {
			let tangentDiffNormal = new THREE.Vector3().crossVectors(oldTangent, newTangent).normalize();
			let angle = oldTangent.angleTo(newTangent);
			let rot = new THREE.Matrix4().makeRotationAxis(tangentDiffNormal, angle);
			let dir = this.object.getWorldDirection().clone();
			dir = dir.applyMatrix4(rot);
			let target = new THREE.Vector3().addVectors(this.object.position, dir);
			this.object.lookAt(target);
			this.object.updateMatrixWorld();

			let event = {
				type: 'path_relative_rotation',
				angle: angle,
				axis: tangentDiffNormal,
				controls: this
			};
			this.dispatchEvent(event);
		}

		if (this.trackPos === null) {
			let target = new THREE.Vector3().addVectors(this.object.position, newTangent);
			this.object.lookAt(target);
		}

		this.trackPos = newTrackPos;

		// let pStart = this.track.getPointAt(oldTrackPos);
		// let pEnd = this.track.getPointAt(newTrackPos);
		// let pDiff = pEnd.sub(pStart);

		if (newTrackPos !== oldTrackPos) {
			let event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}
	}

	stop(){
		
	}

	getTrackPos(){
		return this.trackPos;
	}

	rotateLeft(angle){
		thetaDelta -= angle;
	}

	rotateUp(angle){
		phiDelta -= angle;
	}

	// pass in distance in world space to move left
	panLeft(distance){
		let te = this.object.matrix.elements;

		// get X column of matrix
		panOffset.set(te[ 0 ], te[ 1 ], te[ 2 ]);
		panOffset.multiplyScalar(-distance);

		pan.add(panOffset);
	}

	// pass in distance in world space to move up
	panUp(distance){
		let te = this.object.matrix.elements;

		// get Y column of matrix
		panOffset.set(te[ 4 ], te[ 5 ], te[ 6 ]);
		panOffset.multiplyScalar(distance);

		pan.add(panOffset);
	}

	// pass in distance in world space to move forward
	panForward(distance){
		if (this.track) {
			this.setTrackPos(this.getTrackPos() - distance / this.track.getLength());
		} else {
			let te = this.object.matrix.elements;

			// get Y column of matrix
			panOffset.set(te[ 8 ], te[ 9 ], te[ 10 ]);
			// panOffset.set( te[ 8 ], 0, te[ 10 ] );
			panOffset.multiplyScalar(distance);

			pan.add(panOffset);
		}
	}

	pan(deltaX, deltaY){
		let element = this.domElement === document ? this.domElement.body : this.domElement;

		if (this.object.fov !== undefined) {
			// perspective
			let position = this.object.position;
			let offset = position.clone();
			let targetDistance = offset.length();

			// half of the fov is center to top of screen
			targetDistance *= Math.tan((this.object.fov / 2) * Math.PI / 180.0);

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
			this.panLeft(2 * deltaX * targetDistance / element.clientHeight);
			this.panUp(2 * deltaY * targetDistance / element.clientHeight);
		} else if (this.object.top !== undefined) {
			// orthographic
			this.panLeft(deltaX * (this.object.right - this.object.left) / element.clientWidth);
			this.panUp(deltaY * (this.object.top - this.object.bottom) / element.clientHeight);
		} else {
			// camera neither orthographic or perspective
			console.warn('WARNING: GeoControls.js encountered an unknown camera type - pan disabled.');
		}
	}

	update(delta){
		this.object.rotation.order = 'ZYX';

		let object = this.object;

		this.object = new THREE.Object3D();
		this.object.position.copy(object.position);
		this.object.rotation.copy(object.rotation);
		this.object.updateMatrix();
		this.object.updateMatrixWorld();

		let position = this.object.position;

		if (delta !== undefined) {
			let multiplier = this.shiftDown ? 4 : 1;
			if (this.moveRight) {
				this.panLeft(-delta * this.moveSpeed * multiplier);
			}
			if (this.moveLeft) {
				this.panLeft(delta * this.moveSpeed * multiplier);
			}
			if (this.moveForward || this.moveForwardMouse) {
				this.panForward(-delta * this.moveSpeed * multiplier);
			}
			if (this.moveBackward) {
				this.panForward(delta * this.moveSpeed * multiplier);
			}
			if (this.rotLeft) {
				this.rotateLeft(-0.5 * Math.PI * delta / this.rotateSpeed);
			}
			if (this.rotRight) {
				this.rotateLeft(0.5 * Math.PI * delta / this.rotateSpeed);
			}
			if (this.raiseCamera) {
				// this.rotateUp( -0.5 * Math.PI * delta / this.rotateSpeed );
				this.panUp(delta * this.moveSpeed * multiplier);
			}
			if (this.lowerCamera) {
				// this.rotateUp( 0.5 * Math.PI * delta / this.rotateSpeed );
				this.panUp(-delta * this.moveSpeed * multiplier);
			}
		}

		if (!pan.equals(new THREE.Vector3(0, 0, 0))) {
			let event = {
				type: 'move',
				translation: pan.clone()
			};
			this.dispatchEvent(event);
		}

		position.add(pan);

		if (!(thetaDelta === 0.0 && phiDelta === 0.0)) {
			let event = {
				type: 'rotate',
				thetaDelta: thetaDelta,
				phiDelta: phiDelta
			};
			this.dispatchEvent(event);
		}

		this.object.updateMatrix();
		let rot = new THREE.Matrix4().makeRotationY(thetaDelta);
		let res = new THREE.Matrix4().multiplyMatrices(rot, this.object.matrix);
		this.object.quaternion.setFromRotationMatrix(res);

		this.object.rotation.x += phiDelta;
		this.object.updateMatrixWorld();

		// send transformation proposal to listeners
		let proposeTransformEvent = {
			type: 'proposeTransform',
			oldPosition: object.position,
			newPosition: this.object.position,
			objections: 0,
			counterProposals: []
		};
		this.dispatchEvent(proposeTransformEvent);

		// check some counter proposals if transformation wasn't accepted
		if (proposeTransformEvent.objections > 0) {
			if (proposeTransformEvent.counterProposals.length > 0) {
				let cp = proposeTransformEvent.counterProposals;
				this.object.position.copy(cp[0]);

				proposeTransformEvent.objections = 0;
				proposeTransformEvent.counterProposals = [];
			}
		}

		// apply transformation, if accepted
		if (proposeTransformEvent.objections > 0) {

		} else {
			object.position.copy(this.object.position);
		}

		object.rotation.copy(this.object.rotation);

		this.object = object;

		thetaDelta = 0;
		phiDelta = 0;
		pan.set(0, 0, 0);

		if (lastPosition.distanceTo(this.object.position) > 0) {
			this.dispatchEvent(changeEvent);

			lastPosition.copy(this.object.position);
		}

		if (this.track) {
			let pos = this.track.getPointAt(this.trackPos);
			object.position.copy(pos);
		}
	}

	reset(){
		state = STATE.NONE;

		this.object.position.copy(this.position0);
	}

	onMouseDown(){
		if (this.enabled === false) return;
		event.preventDefault();

		if (event.button === 0) {
			state = STATE.ROTATE;

			rotateStart.set(event.clientX, event.clientY);
		} else if (event.button === 1) {
			state = STATE.PAN;

			panStart.set(event.clientX, event.clientY);
		} else if (event.button === 2) {
			// state = STATE.PAN;
			// panStart.set( event.clientX, event.clientY );
			this.moveForwardMouse = true;
		}

		// this.domElement.addEventListener( 'mousemove', onMouseMove, false );
		// this.domElement.addEventListener( 'mouseup', onMouseUp, false );
		this.dispatchEvent(startEvent);
	}

	onMouseMove(event){
		if (this.enabled === false) return;

		event.preventDefault();

		let element = this.domElement === document ? this.domElement.body : this.domElement;

		if (state === STATE.ROTATE) {
			rotateEnd.set(event.clientX, event.clientY);
			rotateDelta.subVectors(rotateEnd, rotateStart);

			// rotating across whole screen goes 360 degrees around
			this.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * this.rotateSpeed);

			// rotating up and down along whole screen attempts to go 360, but limited to 180
			this.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * this.rotateSpeed);

			rotateStart.copy(rotateEnd);
		} else if (state === STATE.PAN) {
			panEnd.set(event.clientX, event.clientY);
			panDelta.subVectors(panEnd, panStart);
			// panDelta.multiplyScalar(this.moveSpeed).multiplyScalar(0.0001);
			panDelta.multiplyScalar(0.002).multiplyScalar(this.moveSpeed);

			this.pan(panDelta.x, panDelta.y);

			panStart.copy(panEnd);
		}
	}

	onMouseUp(event){
		if (this.enabled === false) return;

		// console.log(event.which);

		if (event.button === 2) {
			this.moveForwardMouse = false;
		} else {
			// this.domElement.removeEventListener( 'mousemove', onMouseMove, false );
			// this.domElement.removeEventListener( 'mouseup', onMouseUp, false );
			this.dispatchEvent(endEvent);
			state = STATE.NONE;
		}
	}

	onMouseWheel(event){
		if (this.enabled === false || this.noZoom === true) return;

		event.preventDefault();

		let direction = (event.detail < 0 || event.wheelDelta > 0) ? 1 : -1;
		let moveSpeed = this.moveSpeed + this.moveSpeed * 0.1 * direction;
		moveSpeed = Math.max(0.1, moveSpeed);

		this.setMoveSpeed(moveSpeed);

		this.dispatchEvent(startEvent);
		this.dispatchEvent(endEvent);
	}

	setMoveSpeed(value){
		if (this.moveSpeed !== value) {
			this.moveSpeed = value;
			this.dispatchEvent({
				type: 'move_speed_changed',
				controls: this
			});
		}
	}

	onKeyDown(event){
		if (this.enabled === false) return;

		this.shiftDown = event.shiftKey;

		switch (event.keyCode) {
			case this.keys.UP: this.moveForward = true; break;
			case this.keys.BOTTOM: this.moveBackward = true; break;
			case this.keys.LEFT: this.moveLeft = true; break;
			case this.keys.RIGHT: this.moveRight = true; break;
			case this.keys.W: this.moveForward = true; break;
			case this.keys.S: this.moveBackward = true; break;
			case this.keys.A: this.moveLeft = true; break;
			case this.keys.D: this.moveRight = true; break;
			case this.keys.Q: this.rotLeft = true; break;
			case this.keys.E: this.rotRight = true; break;
			case this.keys.R: this.raiseCamera = true; break;
			case this.keys.F: this.lowerCamera = true; break;
		}
	}

	onKeyUp(event){
		this.shiftDown = event.shiftKey;

		switch (event.keyCode) {
			case this.keys.W: this.moveForward = false; break;
			case this.keys.S: this.moveBackward = false; break;
			case this.keys.A: this.moveLeft = false; break;
			case this.keys.D: this.moveRight = false; break;
			case this.keys.UP: this.moveForward = false; break;
			case this.keys.BOTTOM: this.moveBackward = false; break;
			case this.keys.LEFT: this.moveLeft = false; break;
			case this.keys.RIGHT: this.moveRight = false; break;
			case this.keys.Q: this.rotLeft = false; break;
			case this.keys.E: this.rotRight = false; break;
			case this.keys.R: this.raiseCamera = false; break;
			case this.keys.F: this.lowerCamera = false; break;
		}
	}
}


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
		super();
		
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
			if (e.drag.object !== null) {
				return;
			}

			if (e.drag.startHandled === undefined) {
				e.drag.startHandled = true;

				this.dispatchEvent({type: 'start'});
			}

			let ndrag = {
				x: e.drag.lastDrag.x / this.renderer.domElement.clientWidth,
				y: e.drag.lastDrag.y / this.renderer.domElement.clientHeight
			};

			if (e.drag.mouse === Potree.MOUSE.LEFT) {
				this.yawDelta += ndrag.x * this.rotationSpeed;
				this.pitchDelta += ndrag.y * this.rotationSpeed;

				this.stopTweens();
			} else if (e.drag.mouse === Potree.MOUSE.RIGHT) {
				this.panDelta.x += ndrag.x;
				this.panDelta.y += ndrag.y;

				this.stopTweens();
			}
		};

		let drop = e => {
			this.dispatchEvent({type: 'end'});
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
			if (e.touches.length === 2 && previousTouch.touches.length === 2){
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
			}else if(e.touches.length === 3 && previousTouch.touches.length === 3){
				let prev = previousTouch;
				let curr = e;

				let prevMeanX = (prev.touches[0].pageX + prev.touches[1].pageX + prev.touches[2].pageX) / 3;
				let prevMeanY = (prev.touches[0].pageY + prev.touches[1].pageY + prev.touches[2].pageY) / 3;

				let currMeanX = (curr.touches[0].pageX + curr.touches[1].pageX + curr.touches[2].pageX) / 3;
				let currMeanY = (curr.touches[0].pageY + curr.touches[1].pageY + curr.touches[2].pageY) / 3;

				let delta = {
					x: (currMeanX - prevMeanX) / this.renderer.domElement.clientWidth,
					y: (currMeanY - prevMeanY) / this.renderer.domElement.clientHeight
				};

				this.panDelta.x += delta.x;
				this.panDelta.y += delta.y;

				this.stopTweens();
			}

			previousTouch = e;
		};

		this.addEventListener('touchstart', touchStart);
		this.addEventListener('touchend', touchEnd);
		this.addEventListener('touchmove', touchMove);
		this.addEventListener('drag', drag);
		this.addEventListener('drop', drop);
		this.addEventListener('mousewheel', scroll);
		this.addEventListener('dblclick', dblclick);
	}

	setScene (scene) {
		this.scene = scene;
	}

	stop(){
		this.yawDelta = 0;
		this.pitchDelta = 0;
		this.radiusDelta = 0;
		this.panDelta.set(0, 0);
	}
	
	zoomToLocation(mouse){
		let camera = this.scene.getActiveCamera();
		
		let I = Potree.utils.getMousePointCloudIntersection(
			mouse,
			camera,
			this.viewer,
			this.scene.pointclouds,
			{pickClipped: true});

		if (I === null) {
			return;
		}

		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;

			let domElement = this.renderer.domElement;
			let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere().radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}

		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		// TODO Unused: let controlsTargetPosition = I.location;

		let animationDuration = 600;
		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate
			let value = {x: 0};
			let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);

			let startPos = this.scene.view.position.clone();
			let targetPos = cameraTargetPosition.clone();
			let startRadius = this.scene.view.radius;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);

			tween.onUpdate(() => {
				let t = value.x;
				this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

				this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
				this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
			});

			tween.onComplete(() => {
				this.tweens = this.tweens.filter(e => e !== tween);
			});

			tween.start();
		}
	}

	stopTweens () {
		this.tweens.forEach(e => e.stop());
		this.tweens = [];
	}

	update (delta) {
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

			// let radius = view.radius + progression * this.radiusDelta * view.radius * 0.1;
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

		{ // decelerate over time
			let progression = Math.min(1, this.fadeFactor * delta);
			let attenuation = Math.max(0, 1 - this.fadeFactor * delta);

			this.yawDelta *= attenuation;
			this.pitchDelta *= attenuation;
			this.panDelta.multiplyScalar(attenuation);
			// this.radiusDelta *= attenuation;
			this.radiusDelta -= progression * this.radiusDelta;
		}
	}
};


Potree.EarthControls = class EarthControls extends THREE.EventDispatcher {
	constructor (viewer) {
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

		{
			let sg = new THREE.SphereGeometry(1, 16, 16);
			let sm = new THREE.MeshNormalMaterial();
			this.pivotIndicator = new THREE.Mesh(sg, sm);
			this.pivotIndicator.visible = false;
			this.sceneControls.add(this.pivotIndicator);
		}

		let drag = (e) => {
			if (e.drag.object !== null) {
				return;
			}

			if (!this.pivot) {
				return;
			}

			if (e.drag.startHandled === undefined) {
				e.drag.startHandled = true;

				this.dispatchEvent({type: 'start'});
			}

			let camStart = this.camStart;
			let view = this.viewer.scene.view;

			// let camera = this.viewer.scene.camera;
			let mouse = e.drag.end;
			let domElement = this.viewer.renderer.domElement;

			if (e.drag.mouse === Potree.MOUSE.LEFT) {

				let ray = Potree.utils.mouseToRay(mouse, camStart, domElement.clientWidth, domElement.clientHeight);
				let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
					new THREE.Vector3(0, 0, 1),
					this.pivot);

				let distanceToPlane = ray.distanceToPlane(plane);

				if (distanceToPlane > 0) {
					let I = new THREE.Vector3().addVectors(
						camStart.position,
						ray.direction.clone().multiplyScalar(distanceToPlane));

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
			} else if (e.drag.mouse === Potree.MOUSE.RIGHT) {
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
				// TODO: Unused: let newCamTarget = new THREE.Vector3().addVectors(this.pivot, pivotToCamTarget);

				view.position.copy(newCam);
				view.yaw += yawDelta;
				view.pitch += pitchDelta;
			}
		};

		let onMouseDown = e => {
			let I = Potree.utils.getMousePointCloudIntersection(
				e.mouse, 
				this.scene.getActiveCamera(), 
				this.viewer, 
				this.scene.pointclouds, 
				{pickClipped: false});

			if (I) {
				this.pivot = I.location;
				this.camStart = this.scene.getActiveCamera().clone();
				this.pivotIndicator.visible = true;
				this.pivotIndicator.position.copy(I.location);
			}
		};

		let drop = e => {
			this.dispatchEvent({type: 'end'});
		};

		let onMouseUp = e => {
			this.camStart = null;
			this.pivot = null;
			this.pivotIndicator.visible = false;
		};

		let scroll = (e) => {
			this.wheelDelta += e.delta;
		};

		let dblclick = (e) => {
			this.zoomToLocation(e.mouse);
		};

		this.addEventListener('drag', drag);
		this.addEventListener('drop', drop);
		this.addEventListener('mousewheel', scroll);
		this.addEventListener('mousedown', onMouseDown);
		this.addEventListener('mouseup', onMouseUp);
		this.addEventListener('dblclick', dblclick);
	}

	setScene (scene) {
		this.scene = scene;
	}

	stop(){
		this.wheelDelta = 0;
		this.zoomDelta.set(0, 0, 0);
	}
	
	zoomToLocation(mouse){
		let camera = this.scene.getActiveCamera();
		
		let I = Potree.utils.getMousePointCloudIntersection(
			mouse,
			camera,
			this.viewer,
			this.scene.pointclouds);

		if (I === null) {
			return;
		}

		let targetRadius = 0;
		{
			let minimumJumpDistance = 0.2;

			let domElement = this.renderer.domElement;
			let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);

			let nodes = I.pointcloud.nodesOnRay(I.pointcloud.visibleNodes, ray);
			let lastNode = nodes[nodes.length - 1];
			let radius = lastNode.getBoundingSphere().radius;
			targetRadius = Math.min(this.scene.view.radius, radius);
			targetRadius = Math.max(minimumJumpDistance, targetRadius);
		}

		let d = this.scene.view.direction.multiplyScalar(-1);
		let cameraTargetPosition = new THREE.Vector3().addVectors(I.location, d.multiplyScalar(targetRadius));
		// TODO Unused: let controlsTargetPosition = I.location;

		let animationDuration = 600;
		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate
			let value = {x: 0};
			let tween = new TWEEN.Tween(value).to({x: 1}, animationDuration);
			tween.easing(easing);
			this.tweens.push(tween);

			let startPos = this.scene.view.position.clone();
			let targetPos = cameraTargetPosition.clone();
			let startRadius = this.scene.view.radius;
			let targetRadius = cameraTargetPosition.distanceTo(I.location);

			tween.onUpdate(() => {
				let t = value.x;
				this.scene.view.position.x = (1 - t) * startPos.x + t * targetPos.x;
				this.scene.view.position.y = (1 - t) * startPos.y + t * targetPos.y;
				this.scene.view.position.z = (1 - t) * startPos.z + t * targetPos.z;

				this.scene.view.radius = (1 - t) * startRadius + t * targetRadius;
				this.viewer.setMoveSpeed(this.scene.view.radius / 2.5);
			});

			tween.onComplete(() => {
				this.tweens = this.tweens.filter(e => e !== tween);
			});

			tween.start();
		}
	}

	update (delta) {
		let view = this.scene.view;
		let fade = Math.pow(0.5, this.fadeFactor * delta);
		let progression = 1 - fade;
		let camera = this.scene.getActiveCamera();
		
		// compute zoom
		if (this.wheelDelta !== 0) {
			let I = Potree.utils.getMousePointCloudIntersection(
				this.viewer.inputHandler.mouse, 
				this.scene.getActiveCamera(), 
				this.viewer, 
				this.scene.pointclouds);

			if (I) {
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
		if (this.zoomDelta.length() !== 0) {
			let p = this.zoomDelta.clone().multiplyScalar(progression);

			let newPos = new THREE.Vector3().addVectors(view.position, p);
			view.position.copy(newPos);
		}

		if (this.pivotIndicator.visible) {
			let distance = this.pivotIndicator.position.distanceTo(view.position);
			let pixelwidth = this.renderer.domElement.clientwidth;
			let pixelHeight = this.renderer.domElement.clientHeight;
			let pr = Potree.utils.projectedRadius(1, camera, distance, pixelwidth, pixelHeight);
			let scale = (10 / pr);
			this.pivotIndicator.scale.set(scale, scale, scale);
		}

		// decelerate over time
		{
			this.zoomDelta.multiplyScalar(fade);
			this.wheelDelta = 0;
		}
	}
};


/**
 *
 * @param node
 * @class an item in the lru list.
 */
function LRUItem (node) {
	this.previous = null;
	this.next = null;
	this.node = node;
}

/**
 *
 * @class A doubly-linked-list of the least recently used elements.
 */
function LRU () {
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
LRU.prototype.size = function () {
	return this.elements;
};

LRU.prototype.contains = function (node) {
	return this.items[node.id] == null;
};

/**
 * makes node the most recently used item. if the list does not contain node, it will be added.
 *
 * @param node
 */
LRU.prototype.touch = function (node) {
	if (!node.loaded) {
		return;
	}

	let item;
	if (this.items[node.id] == null) {
		// add to list
		item = new LRUItem(node);
		item.previous = this.last;
		this.last = item;
		if (item.previous !== null) {
			item.previous.next = item;
		}

		this.items[node.id] = item;
		this.elements++;

		if (this.first === null) {
			this.first = item;
		}
		this.numPoints += node.numPoints;
	} else {
		// update in list
		item = this.items[node.id];
		if (item.previous === null) {
			// handle touch on first element
			if (item.next !== null) {
				this.first = item.next;
				this.first.previous = null;
				item.previous = this.last;
				item.next = null;
				this.last = item;
				item.previous.next = item;
			}
		} else if (item.next === null) {
			// handle touch on last element
		} else {
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

LRU.prototype.remove = function remove (node) {
	let lruItem = this.items[node.id];
	if (lruItem) {
		if (this.elements === 1) {
			this.first = null;
			this.last = null;
		} else {
			if (!lruItem.previous) {
				this.first = lruItem.next;
				this.first.previous = null;
			}
			if (!lruItem.next) {
				this.last = lruItem.previous;
				this.last.next = null;
			}
			if (lruItem.previous && lruItem.next) {
				lruItem.previous.next = lruItem.next;
				lruItem.next.previous = lruItem.previous;
			}
		}

		delete this.items[node.id];
		this.elements--;
		this.numPoints -= node.numPoints;
	}
};

LRU.prototype.getLRUItem = function () {
	if (this.first === null) {
		return null;
	}
	let lru = this.first;

	return lru.node;
};

LRU.prototype.toString = function () {
	let string = '{ ';
	let curr = this.first;
	while (curr !== null) {
		string += curr.node.id;
		if (curr.next !== null) {
			string += ', ';
		}
		curr = curr.next;
	}
	string += '}';
	string += '(' + this.size() + ')';
	return string;
};

LRU.prototype.freeMemory = function () {
	if (this.elements <= 1) {
		return;
	}

	while (this.numPoints > Potree.pointLoadLimit) {
		let element = this.first;
		let node = element.node;
		this.disposeDescendants(node);
	}
};

LRU.prototype.disposeDescendants = function (node) {
	let stack = [];
	stack.push(node);
	while (stack.length > 0) {
		let current = stack.pop();

		// console.log(current);

		current.dispose();
		this.remove(current);

		for (let key in current.children) {
			if (current.children.hasOwnProperty(key)) {
				let child = current.children[key];
				if (child.loaded) {
					stack.push(current.children[key]);
				}
			}
		}
	}
};

Potree.Annotation = class extends THREE.EventDispatcher {
	constructor (args = {}) {
		super();

		let valueOrDefault = (a, b) => {
			if(a === null || a === undefined){
				return b;
			}else{
				return a;
			}
		};

		this.scene = null;
		this._title = args.title || 'No Title';
		this._description = args.description || '';

		if (!args.position) {
			this.position = null;
		} else if (args.position instanceof THREE.Vector3) {
			this.position = args.position;
		} else {
			this.position = new THREE.Vector3(...args.position);
		}

		this.cameraPosition = (args.cameraPosition instanceof Array)
			? new THREE.Vector3().fromArray(args.cameraPosition) : args.cameraPosition;
		this.cameraTarget = (args.cameraTarget instanceof Array)
			? new THREE.Vector3().fromArray(args.cameraTarget) : args.cameraTarget;
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

		let iconClose = Potree.resourcePath + '/icons/close.svg';

		this.domElement = $(`
			<div class="annotation" oncontextmenu="return false;">
				<div class="annotation-titlebar">
					<span class="annotation-label"></span>
				</div>
				<div class="annotation-description">
					<span class="annotation-description-close">
						<img src="${iconClose}" width="16px">
					</span>
					<span class="annotation-description-content">${this._description}</span>
				</div>
			</div>
		`);

		this.elTitlebar = this.domElement.find('.annotation-titlebar');
		this.elTitle = this.elTitlebar.find('.annotation-label');
		this.elTitle.append(this._title);
		this.elDescription = this.domElement.find('.annotation-description');
		this.elDescriptionClose = this.elDescription.find('.annotation-description-close');
		// this.elDescriptionContent = this.elDescription.find(".annotation-description-content");

		this.clickTitle = () => {
			if(this.hasView()){
				this.moveHere(this.scene.getActiveCamera());
			}
			this.dispatchEvent({type: 'click', target: this});
		};

		this.elTitle.click(this.clickTitle);

		this.actions = this.actions.map(a => {
			if (a instanceof Potree.Action) {
				return a;
			} else {
				return new Potree.Action(a);
			}
		});

		for (let action of this.actions) {
			action.pairWith(this);
		}

		let actions = this.actions.filter(
			a => a.showIn === undefined || a.showIn.includes('scene'));

		for (let action of actions) {
			let elButton = $(`<img src="${action.icon}" class="annotation-action-icon">`);
			this.elTitlebar.append(elButton);
			elButton.click(() => action.onclick({annotation: this}));
		}

		this.elDescriptionClose.hover(
			e => this.elDescriptionClose.css('opacity', '1'),
			e => this.elDescriptionClose.css('opacity', '0.5')
		);
		this.elDescriptionClose.click(e => this.setHighlighted(false));
		// this.elDescriptionContent.html(this._description);

		this.domElement.mouseenter(e => this.setHighlighted(true));
		this.domElement.mouseleave(e => this.setHighlighted(false));

		this.domElement.on('touchstart', e => {
			this.setHighlighted(!this.isHighlighted);
		});

		this.display = false;
		//this.display = true;

	}

	get visible () {
		return this._visible;
	}

	set visible (value) {
		if (this._visible === value) {
			return;
		}

		this._visible = value;

		//this.traverse(node => {
		//	node.display = value;
		//});

		this.dispatchEvent({
			type: 'visibility_changed',
			annotation: this
		});
	}

	get display () {
		return this._display;
	}

	set display (display) {
		if (this._display === display) {
			return;
		}

		this._display = display;

		if (display) {
			// this.domElement.fadeIn(200);
			this.domElement.show();
		} else {
			// this.domElement.fadeOut(200);
			this.domElement.hide();
		}
	}

	get expand () {
		return this._expand;
	}

	set expand (expand) {
		if (this._expand === expand) {
			return;
		}

		if (expand) {
			this.display = false;
		} else {
			this.display = true;
			this.traverseDescendants(node => {
				node.display = false;
			});
		}

		this._expand = expand;
	}

	get title () {
		return this._title;
	}

	set title (title) {
		if (this._title === title) {
			return;
		}

		this._title = title;
		this.elTitle.empty();
		this.elTitle.append(this._title);
	}

	get description () {
		return this._description;
	}

	set description (description) {
		if (this._description === description) {
			return;
		}

		this._description = description;

		const elDescriptionContent = this.elDescription.find(".annotation-description-content");
		elDescriptionContent.empty();
		elDescriptionContent.append(this._description);
	}

	add (annotation) {
		if (!this.children.includes(annotation)) {
			this.children.push(annotation);
			annotation.parent = this;

			let descendants = [];
			annotation.traverse(a => { descendants.push(a); });

			for (let descendant of descendants) {
				let c = this;
				while (c !== null) {
					c.dispatchEvent({
						'type': 'annotation_added',
						'annotation': descendant
					});
					c = c.parent;
				}
			}
		}
	}

	level () {
		if (this.parent === null) {
			return 0;
		} else {
			return this.parent.level() + 1;
		}
	}

	hasChild(annotation) {
		return this.children.includes(annotation);
	}

	remove (annotation) {
		if (this.hasChild(annotation)) {
			annotation.removeAllChildren();
			annotation.dispose();
			this.children = this.children.filter(e => e !== annotation);
			annotation.parent = null;
		}
	}

	removeAllChildren() {
		this.children.forEach((child) => {
			if (child.children.length > 0) {
				child.removeAllChildren();
			}

			this.remove(child);
		});
	}

	updateBounds () {
		let box = new THREE.Box3();

		if (this.position) {
			box.expandByPoint(this.position);
		}

		for (let child of this.children) {
			child.updateBounds();

			box.union(child.boundingBox);
		}

		this.boundingBox.copy(box);
	}

	traverse (handler) {
		let expand = handler(this);

		if (expand === undefined || expand === true) {
			for (let child of this.children) {
				child.traverse(handler);
			}
		}
	}

	traverseDescendants (handler) {
		for (let child of this.children) {
			child.traverse(handler);
		}
	}

	flatten () {
		let annotations = [];

		this.traverse(annotation => {
			annotations.push(annotation);
		});

		return annotations;
	}

	descendants () {
		let annotations = [];

		this.traverse(annotation => {
			if (annotation !== this) {
				annotations.push(annotation);
			}
		});

		return annotations;
	}

	setHighlighted (highlighted) {
		if (highlighted) {
			this.domElement.css('opacity', '0.8');
			this.elTitlebar.css('box-shadow', '0 0 5px #fff');
			this.domElement.css('z-index', '1000');

			if (this._description) {
				this.descriptionVisible = true;
				this.elDescription.fadeIn(200);
				this.elDescription.css('position', 'relative');
			}
		} else {
			this.domElement.css('opacity', '0.5');
			this.elTitlebar.css('box-shadow', '');
			this.domElement.css('z-index', '100');
			this.descriptionVisible = false;
			this.elDescription.css('display', 'none');
		}

		this.isHighlighted = highlighted;
	}

	hasView () {
		let hasPosTargetView = this.cameraTarget instanceof THREE.Vector3;
		hasPosTargetView = hasPosTargetView && this.cameraPosition instanceof THREE.Vector3;

		let hasRadiusView = this.radius !== undefined;

		let hasView = hasPosTargetView || hasRadiusView;

		return hasView;
	};

	moveHere (camera) {
		if (!this.hasView()) {
			return;
		}

		let view = this.scene.view;
		let animationDuration = 500;
		let easing = TWEEN.Easing.Quartic.Out;

		let endTarget;
		if (this.cameraTarget) {
			endTarget = this.cameraTarget;
		} else if (this.position) {
			endTarget = this.position;
		} else {
			endTarget = this.boundingBox.getCenter();
		}

		if (this.cameraPosition) {
			let endPosition = this.cameraPosition;

			Potree.utils.moveTo(this.scene, endPosition, endTarget);

			//{ // animate camera position
			//	let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
			//	tween.easing(easing);
			//	tween.start();
			//}

			//{ // animate camera target
			//	let camTargetDistance = camera.position.distanceTo(endTarget);
			//	let target = new THREE.Vector3().addVectors(
			//		camera.position,
			//		camera.getWorldDirection().clone().multiplyScalar(camTargetDistance)
			//	);
			//	let tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
			//	tween.easing(easing);
			//	tween.onUpdate(() => {
			//		view.lookAt(target);
			//	});
			//	tween.onComplete(() => {
			//		view.lookAt(target);
			//		this.dispatchEvent({type: 'focusing_finished', target: this});
			//	});

			//	this.dispatchEvent({type: 'focusing_started', target: this});
			//	tween.start();
			//}
		} else if (this.radius) {
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
					.onUpdate(function () {
						view.radius = this.x * endRadius + (1 - this.x) * startRadius;
					});
				tween.easing(easing);
				tween.start();
			}
		}
	};

	dispose () {
		if (this.domElement.parentElement) {
			this.domElement.parentElement.removeChild(this.domElement);
		}
	};

	toString () {
		return 'Annotation: ' + this._title;
	}
};


Potree.Action = class Action extends THREE.EventDispatcher {
	constructor (args = {}) {
		super();

		this.icon = args.icon || '';
		this.tooltip = args.tooltip;

		if (args.onclick !== undefined) {
			this.onclick = args.onclick;
		}
	}

	onclick (event) {

	}

	pairWith (object) {

	}

	setIcon (newIcon) {
		let oldIcon = this.icon;

		if (newIcon === oldIcon) {
			return;
		}

		this.icon = newIcon;

		this.dispatchEvent({
			type: 'icon_changed',
			action: this,
			icon: newIcon,
			oldIcon: oldIcon
		});
	}
};

Potree.Actions = {};

Potree.Actions.ToggleAnnotationVisibility = class ToggleAnnotationVisibility extends Potree.Action {
	constructor (args = {}) {
		super(args);

		this.icon = Potree.resourcePath + '/icons/eye.svg';
		this.showIn = 'sidebar';
		this.tooltip = 'toggle visibility';
	}

	pairWith (annotation) {
		if (annotation.visible) {
			this.setIcon(Potree.resourcePath + '/icons/eye.svg');
		} else {
			this.setIcon(Potree.resourcePath + '/icons/eye_crossed.svg');
		}

		annotation.addEventListener('visibility_changed', e => {
			let annotation = e.annotation;

			if (annotation.visible) {
				this.setIcon(Potree.resourcePath + '/icons/eye.svg');
			} else {
				this.setIcon(Potree.resourcePath + '/icons/eye_crossed.svg');
			}
		});
	}

	onclick (event) {
		let annotation = event.annotation;

		annotation.visible = !annotation.visible;

		if (annotation.visible) {
			this.setIcon(Potree.resourcePath + '/icons/eye.svg');
		} else {
			this.setIcon(Potree.resourcePath + '/icons/eye_crossed.svg');
		}
	}
};


Potree.ProfileData = class ProfileData {
	constructor (profile) {
		this.profile = profile;

		this.segments = [];
		this.boundingBox = new THREE.Box3();

		for (let i = 0; i < profile.points.length - 1; i++) {
			let start = profile.points[i];
			let end = profile.points[i + 1];

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

	size () {
		let size = 0;
		for (let segment of this.segments) {
			size += segment.points.numPoints;
		}

		return size;
	}
};

Potree.ProfileRequest = class ProfileRequest {
	constructor (pointcloud, profile, maxDepth, callback) {
		this.pointcloud = pointcloud;
		this.profile = profile;
		this.maxDepth = maxDepth || Number.MAX_VALUE;
		this.callback = callback;
		this.temporaryResult = new Potree.ProfileData(this.profile);
		this.pointsServed = 0;
		this.highestLevelServed = 0;

		this.priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

		this.initialize();
	}

	initialize () {
		this.priorityQueue.push({node: this.pointcloud.pcoGeometry.root, weight: Infinity});
	};

	// traverse the node and add intersecting descendants to queue
	traverse (node) {
		let stack = [];
		for (let i = 0; i < 8; i++) {
			let child = node.children[i];
			if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
				stack.push(child);
			}
		}

		while (stack.length > 0) {
			let node = stack.pop();
			let weight = node.boundingSphere.radius;

			this.priorityQueue.push({node: node, weight: weight});

			// add children that intersect the cutting plane
			if (node.level < this.maxDepth) {
				for (let i = 0; i < 8; i++) {
					let child = node.children[i];
					if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
						stack.push(child);
					}
				}
			}
		}
	}

	update(){
		if(!this.updateGeneratorInstance){
			this.updateGeneratorInstance = this.updateGenerator();
		}

		let result = this.updateGeneratorInstance.next();
		if(result.done){
			this.updateGeneratorInstance = null;
		}
	}

	* updateGenerator(){
		// load nodes in queue
		// if hierarchy expands, also load nodes from expanded hierarchy
		// once loaded, add data to this.points and remove node from queue
		// only evaluate 1-50 nodes per frame to maintain responsiveness

		let start = performance.now();

		let maxNodesPerUpdate = 1;
		let intersectedNodes = [];

		for (let i = 0; i < Math.min(maxNodesPerUpdate, this.priorityQueue.size()); i++) {
			let element = this.priorityQueue.pop();
			let node = element.node;

			if(node.level > this.maxDepth){
				continue;
			}

			if (node.loaded) {
				// add points to result
				intersectedNodes.push(node);
				Potree.getLRU().touch(node);
				this.highestLevelServed = Math.max(node.getLevel(), this.highestLevelServed);

				let doTraverse = (node.level % node.pcoGeometry.hierarchyStepSize) === 0 && node.hasChildren;
				doTraverse = doTraverse || node.getLevel() === 0;
				if (doTraverse) {
					this.traverse(node);
				}
			} else {
				node.load();
				this.priorityQueue.push(element);
			}
		}

		if (intersectedNodes.length > 0) {

			for(let done of this.getPointsInsideProfile(intersectedNodes, this.temporaryResult)){
				if(!done){
					//console.log("updateGenerator yields");
					yield false;
				}
			}
			if (this.temporaryResult.size() > 100) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}
		}

		if (this.priorityQueue.size() === 0) {
			// we're done! inform callback and remove from pending requests

			if (this.temporaryResult.size() > 0) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}

			this.callback.onFinish({request: this});

			let index = this.pointcloud.profileRequests.indexOf(this);
			if (index >= 0) {
				this.pointcloud.profileRequests.splice(index, 1);
			}
		}

		yield true;
	};

	* getAccepted(numPoints, node, matrix, segment, segmentDir, points, totalMileage){
		let checkpoint = performance.now();

		let accepted = new Uint32Array(numPoints);
		let mileage = new Float64Array(numPoints);
		let acceptedPositions = new Float32Array(numPoints * 3);
		let numAccepted = 0;

		let pos = new THREE.Vector3();
		let svp = new THREE.Vector3();

		let view = new Float32Array(node.geometry.attributes.position.array);

		for (let i = 0; i < numPoints; i++) {

			pos.set(
				view[i * 3 + 0],
				view[i * 3 + 1],
				view[i * 3 + 2]);
		
			pos.applyMatrix4(matrix);
			let distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
			let centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));

			if (distance < this.profile.width / 2 && centerDistance < segment.length / 2) {
				svp.subVectors(pos, segment.start);
				let localMileage = segmentDir.dot(svp);

				accepted[numAccepted] = i;
				mileage[numAccepted] = localMileage + totalMileage;
				points.boundingBox.expandByPoint(pos);

				acceptedPositions[3 * numAccepted + 0] = pos.x;
				acceptedPositions[3 * numAccepted + 1] = pos.y;
				acceptedPositions[3 * numAccepted + 2] = pos.z;

				numAccepted++;
			}

			if((i % 1000) === 0){
				let duration = performance.now() - checkpoint;
				if(duration > 4){
					//console.log(`getAccepted yield after ${duration}ms`);
					yield false;
					checkpoint = performance.now();
				}
			}
		}

		accepted = accepted.subarray(0, numAccepted);
		mileage = mileage.subarray(0, numAccepted);
		acceptedPositions = acceptedPositions.subarray(0, numAccepted * 3);

		//let end = performance.now();
		//let duration = end - start;
		//console.log("accepted duration ", duration)

		//console.log(`getAccepted finished`);

		yield [accepted, mileage, acceptedPositions];
	}

	* getPointsInsideProfile(nodes, target){
		let checkpoint = performance.now();
		let totalMileage = 0;

		let pointsProcessed = 0;

		for (let segment of target.segments) {
			for (let node of nodes) {
				let numPoints = node.numPoints;
				let geometry = node.geometry;

				if(!numPoints){
					continue;
				}

				{ // skip if current node doesn't intersect current segment
					let bbWorld = node.boundingBox.clone().applyMatrix4(this.pointcloud.matrixWorld);
					let bsWorld = bbWorld.getBoundingSphere();

					let start = new THREE.Vector3(segment.start.x, segment.start.y, bsWorld.center.z);
					let end = new THREE.Vector3(segment.end.x, segment.end.y, bsWorld.center.z);
						
					let closest = new THREE.Line3(start, end).closestPointToPoint(bsWorld.center, true);
					let distance = closest.distanceTo(bsWorld.center);

					let intersects = (distance < (bsWorld.radius + target.profile.width));

					if(!intersects){
						continue;
					}
				}

				//{// DEBUG
				//	console.log(node.name);
				//	let boxHelper = new Potree.Box3Helper(node.getBoundingBox());
				//	boxHelper.matrixAutoUpdate = false;
				//	boxHelper.matrix.copy(viewer.scene.pointclouds[0].matrixWorld);
				//	viewer.scene.scene.add(boxHelper);
				//}

				let sv = new THREE.Vector3().subVectors(segment.end, segment.start).setZ(0);
				let segmentDir = sv.clone().normalize();

				let points = new Potree.Points();

				let nodeMatrix = new THREE.Matrix4().makeTranslation(...node.boundingBox.min.toArray());

				let matrix = new THREE.Matrix4().multiplyMatrices(
					this.pointcloud.matrixWorld, nodeMatrix);

				pointsProcessed = pointsProcessed + numPoints;

				let accepted = null;
				let mileage = null;
				let acceptedPositions = null;
				for(let result of this.getAccepted(numPoints, node, matrix, segment, segmentDir, points,totalMileage)){
					if(!result){
						let duration = performance.now() - checkpoint;
						//console.log(`getPointsInsideProfile yield after ${duration}ms`);
						yield false;
						checkpoint = performance.now();
					}else{
						[accepted, mileage, acceptedPositions] = result;
					}
				}

				let duration = performance.now() - checkpoint;
				if(duration > 4){
					//console.log(`getPointsInsideProfile yield after ${duration}ms`);
					yield false;
					checkpoint = performance.now();
				}

				points.data.position = acceptedPositions;

				let relevantAttributes = Object.keys(geometry.attributes).filter(a => !["position", "indices"].includes(a));
				for(let attributeName of relevantAttributes){

					let attribute = geometry.attributes[attributeName];
					let numElements = attribute.array.length / numPoints;

					if(numElements !== parseInt(numElements)){
						debugger;
					}

					let Type = attribute.array.constructor;

					let filteredBuffer = new Type(numElements * accepted.length);

					let source = attribute.array;
					let target = filteredBuffer;

					for(let i = 0; i < accepted.length; i++){

						let index = accepted[i];
						
						let start = index * numElements;
						let end = start + numElements;
						let sub = source.subarray(start, end);

						target.set(sub, i * numElements);
					}

					points.data[attributeName] = filteredBuffer;
				}

				points.data['mileage'] = mileage;
				points.numPoints = accepted.length;

				segment.points.add(points);
			}

			totalMileage += segment.length;
		}

		for (let segment of target.segments) {
			target.boundingBox.union(segment.points.boundingBox);
		}

		//console.log(`getPointsInsideProfile finished`);
		yield true;
	};

	finishLevelThenCancel () {
		if (this.cancelRequested) {
			return;
		}

		this.maxDepth = this.highestLevelServed;
		this.cancelRequested = true;

		//console.log(`maxDepth: ${this.maxDepth}`);
	};

	cancel () {
		this.callback.onCancel();

		this.priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

		let index = this.pointcloud.profileRequests.indexOf(this);
		if (index >= 0) {
			this.pointcloud.profileRequests.splice(index, 1);
		}
	};
};


Potree.PointCloudOctreeNode = class PointCloudOctreeNode extends Potree.PointCloudTreeNode {
	constructor () {
		super();

		this.children = {};
		this.sceneNode = null;
		this.octree = null;
	}

	getNumPoints () {
		return this.geometryNode.numPoints;
	}

	isLoaded () {
		return true;
	}

	isTreeNode () {
		return true;
	}

	isGeometryNode () {
		return false;
	}

	getLevel () {
		return this.geometryNode.level;
	}

	getBoundingSphere () {
		return this.geometryNode.boundingSphere;
	}

	getBoundingBox () {
		return this.geometryNode.boundingBox;
	}

	getChildren () {
		let children = [];

		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}

		return children;
	}

	getPointsInBox(boxNode){

		if(!this.sceneNode){
			return null;
		}

		let buffer = this.geometryNode.buffer;

		let posOffset = buffer.offset("position");
		let stride = buffer.stride;
		let view = new DataView(buffer.data);

		let worldToBox = new THREE.Matrix4().getInverse(boxNode.matrixWorld);
		let objectToBox = new THREE.Matrix4().multiplyMatrices(worldToBox, this.sceneNode.matrixWorld);

		let inBox = [];

		let pos = new THREE.Vector4();
		for(let i = 0; i < buffer.numElements; i++){
			let x = view.getFloat32(i * stride + posOffset + 0, true);
			let y = view.getFloat32(i * stride + posOffset + 4, true);
			let z = view.getFloat32(i * stride + posOffset + 8, true);

			pos.set(x, y, z, 1);
			pos.applyMatrix4(objectToBox);

			if(-0.5 < pos.x && pos.x < 0.5){
				if(-0.5 < pos.y && pos.y < 0.5){
					if(-0.5 < pos.z && pos.z < 0.5){
						pos.set(x, y, z, 1).applyMatrix4(this.sceneNode.matrixWorld);
						inBox.push(new THREE.Vector3(pos.x, pos.y, pos.z));
					}
				}
			}
		}

		return inBox;
	}

	get name () {
		return this.geometryNode.name;
	}
};

Potree.PointCloudOctree = class extends Potree.PointCloudTree {
	constructor (geometry, material) {
		super();

		this.pointBudget = Infinity;
		this.pcoGeometry = geometry;
		this.boundingBox = this.pcoGeometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		this.material = material || new Potree.PointCloudMaterial();
		this.visiblePointsTarget = 2 * 1000 * 1000;
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
		this.name = '';

		{
			let box = [this.pcoGeometry.tightBoundingBox, this.getBoundingBoxWorld()]
				.find(v => v !== undefined);

			this.updateMatrixWorld(true);
			box = Potree.utils.computeTransformedBoundingBox(box, this.matrixWorld);

			let bMin = box.min.z;
			let bMax = box.max.z;
			this.material.heightMin = bMin;
			this.material.heightMax = bMax;
		}

		// TODO read projection from file instead
		this.projection = geometry.projection;

		this.root = this.pcoGeometry.root;
	}

	setName (name) {
		if (this.name !== name) {
			this.name = name;
			this.dispatchEvent({type: 'name_changed', name: name, pointcloud: this});
		}
	}

	getName () {
		return this.name;
	}

	toTreeNode (geometryNode, parent) {
		let node = new Potree.PointCloudOctreeNode();

		// if(geometryNode.name === "r40206"){
		//	console.log("creating node for r40206");
		// }
		let sceneNode = new THREE.Points(geometryNode.geometry, this.material);
		sceneNode.name = geometryNode.name;
		sceneNode.position.copy(geometryNode.boundingBox.min);
		sceneNode.frustumCulled = false;
		sceneNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
			if (material.program) {
				_this.getContext().useProgram(material.program.program);

				if (material.program.getUniforms().map.level) {
					let level = geometryNode.getLevel();
					material.uniforms.level.value = level;
					material.program.getUniforms().map.level.setValue(_this.getContext(), level);
				}

				if (this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart) {
					let vnStart = this.visibleNodeTextureOffsets.get(node);
					material.uniforms.vnStart.value = vnStart;
					material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
				}

				if (material.program.getUniforms().map.pcIndex) {
					let i = node.pcIndex ? node.pcIndex : this.visibleNodes.indexOf(node);
					material.uniforms.pcIndex.value = i;
					material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), i);
				}
			}
		};

		// { // DEBUG
		//	let sg = new THREE.SphereGeometry(1, 16, 16);
		//	let sm = new THREE.MeshNormalMaterial();
		//	let s = new THREE.Mesh(sg, sm);
		//	s.scale.set(5, 5, 5);
		//	s.position.copy(geometryNode.mean)
		//		.add(this.position)
		//		.add(geometryNode.boundingBox.min);
		//
		//	viewer.scene.scene.add(s);
		// }

		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.pointcloud = this;
		node.children = {};
		for (let key in geometryNode.children) {
			node.children[key] = geometryNode.children[key];
		}

		if (!parent) {
			this.root = node;
			this.add(sceneNode);
		} else {
			let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.add(sceneNode);
			parent.children[childIndex] = node;
		}

		let disposeListener = function () {
			let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.remove(node.sceneNode);
			parent.children[childIndex] = geometryNode;
		};
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);

		return node;
	}

	updateVisibleBounds () {
		let leafNodes = [];
		for (let i = 0; i < this.visibleNodes.length; i++) {
			let node = this.visibleNodes[i];
			let isLeaf = true;

			for (let j = 0; j < node.children.length; j++) {
				let child = node.children[j];
				if (child instanceof Potree.PointCloudOctreeNode) {
					isLeaf = isLeaf && !child.sceneNode.visible;
				} else if (child instanceof Potree.PointCloudOctreeGeometryNode) {
					isLeaf = true;
				}
			}

			if (isLeaf) {
				leafNodes.push(node);
			}
		}

		this.visibleBounds.min = new THREE.Vector3(Infinity, Infinity, Infinity);
		this.visibleBounds.max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
		for (let i = 0; i < leafNodes.length; i++) {
			let node = leafNodes[i];

			this.visibleBounds.expandByPoint(node.getBoundingBox().min);
			this.visibleBounds.expandByPoint(node.getBoundingBox().max);
		}
	}

	updateMaterial (material, visibleNodes, camera, renderer) {
		material.fov = camera.fov * (Math.PI / 180);
		material.screenWidth = renderer.domElement.clientWidth;
		material.screenHeight = renderer.domElement.clientHeight;
		material.spacing = this.pcoGeometry.spacing * Math.max(this.scale.x, this.scale.y, this.scale.z);
		material.near = camera.near;
		material.far = camera.far;
		material.uniforms.octreeSize.value = this.pcoGeometry.boundingBox.getSize().x;
	}

	computeVisibilityTextureData(nodes, camera){
		
		if(Potree.measureTimings) performance.mark("computeVisibilityTextureData-start");

		let data = new Uint8Array(nodes.length * 4);
		let visibleNodeTextureOffsets = new Map();

		// copy array
		nodes = nodes.slice();

		// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
		let sort = function (a, b) {
			let na = a.geometryNode.name;
			let nb = b.geometryNode.name;
			if (na.length !== nb.length) return na.length - nb.length;
			if (na < nb) return -1;
			if (na > nb) return 1;
			return 0;
		};
		nodes.sort(sort);

		// code sample taken from three.js src/math/Ray.js
		let v1 = new THREE.Vector3();
		let intersectSphereBack = (ray, sphere) => {
			v1.subVectors( sphere.center, ray.origin );
			let tca = v1.dot( ray.direction );
			let d2 = v1.dot( v1 ) - tca * tca;
			let radius2 = sphere.radius * sphere.radius;

			if(d2 > radius2){
				return null;
			}

			let thc = Math.sqrt( radius2 - d2 );

			// t1 = second intersect point - exit point on back of sphere
			let t1 = tca + thc;

			if(t1 < 0 ){
				return null;
			}

			return t1;
		};

		let lodRanges = new Map();
		let leafNodeLodRanges = new Map();

		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];

			visibleNodeTextureOffsets.set(node, i);

			let children = [];
			for (let j = 0; j < 8; j++) {
				let child = node.children[j];

				if( child && child.constructor === Potree.PointCloudOctreeNode && nodes.includes(child, i)){
					children.push(child);
				}
			}

			let spacing = node.geometryNode.estimatedSpacing;
			let isLeafNode;

			data[i * 4 + 0] = 0;
			data[i * 4 + 1] = 0;
			data[i * 4 + 2] = 0;
			data[i * 4 + 3] = node.getLevel();
			for (let j = 0; j < children.length; j++) {
				let child = children[j];
				let index = parseInt(child.geometryNode.name.substr(-1));
				data[i * 4 + 0] += Math.pow(2, index);

				if (j === 0) {
					let vArrayIndex = nodes.indexOf(child, i);
					
					data[i * 4 + 1] = (vArrayIndex - i) >> 8;
					data[i * 4 + 2] = (vArrayIndex - i) % 256;
				}
			}

			{
				// TODO performance optimization
				// for some reason, this part can be extremely slow in chrome during a debugging session, but not during profiling
				let bBox = node.getBoundingBox().clone();
				//bBox.applyMatrix4(node.sceneNode.matrixWorld);
				//bBox.applyMatrix4(camera.matrixWorldInverse);
				let bSphere = bBox.getBoundingSphere();
				bSphere.applyMatrix4(node.sceneNode.matrixWorld);
				bSphere.applyMatrix4(camera.matrixWorldInverse);

				let ray = new THREE.Ray(camera.position, camera.getWorldDirection());
				let distance = intersectSphereBack(ray, bSphere);
				let distance2 = bSphere.center.distanceTo(camera.position) + bSphere.radius;
				if(distance === null){
					distance = distance2;
				}
				distance = Math.max(distance, distance2);

				if(!lodRanges.has(node.getLevel())){
					lodRanges.set(node.getLevel(), distance);
				}else{
					let prevDistance = lodRanges.get(node.getLevel());
					let newDistance = Math.max(prevDistance, distance);
					lodRanges.set(node.getLevel(), newDistance);
				}

				if(!node.geometryNode.hasChildren){
					let value = {
						distance: distance,
						i: i
					};
					leafNodeLodRanges.set(node, value);
				}
				
			}
		}

		for(let [node, value] of leafNodeLodRanges){
			let level = node.getLevel();
			let distance = value.distance;
			let i = value.i;

			if(level < 4){
				continue;
			}

			//if(node.name === "r6646"){
			//	var a = 10;
			//	a = 10 * 10;
			//}

			for(let [lod, range] of lodRanges){
				if(distance < range * 1.2){
					data[i * 4 + 3] = lod;
				}
			}
		}

		//{
		//	if(!window.debugSizes){
		//		let msg = viewer.postMessage("abc");
		//		window.debugSizes = { msg: msg};
		//	}

		//	let msg = window.debugSizes.msg;

		//	let txt = ``;
		//	for(let entry of lodRanges){
		//		txt += `${entry[0]}: ${entry[1]}<br>`;
		//	}

		//	msg.setMessage(txt);
		//}
		
		if(Potree.measureTimings){
			performance.mark("computeVisibilityTextureData-end");
			performance.measure("render.computeVisibilityTextureData", "computeVisibilityTextureData-start", "computeVisibilityTextureData-end");
		} 

		return {
			data: data,
			offsets: visibleNodeTextureOffsets
		};
	}

	nodeIntersectsProfile (node, profile) {
		let bbWorld = node.boundingBox.clone().applyMatrix4(this.matrixWorld);
		let bsWorld = bbWorld.getBoundingSphere();

		let intersects = false;

		for (let i = 0; i < profile.points.length - 1; i++) {

			let start = new THREE.Vector3(profile.points[i + 0].x, profile.points[i + 0].y, bsWorld.center.z);
			let end = new THREE.Vector3(profile.points[i + 1].x, profile.points[i + 1].y, bsWorld.center.z);
			
			let closest = new THREE.Line3(start, end).closestPointToPoint(bsWorld.center, true);
			let distance = closest.distanceTo(bsWorld.center);

			intersects = intersects || (distance < (bsWorld.radius + profile.width));
		}

		//console.log(`${node.name}: ${intersects}`);

		return intersects;
	}

	nodesOnRay (nodes, ray) {
		let nodesOnRay = [];

		let _ray = ray.clone();
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			// let inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
			// let sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
			let sphere = node.getBoundingSphere().clone().applyMatrix4(this.matrixWorld);

			if (_ray.intersectsSphere(sphere)) {
				nodesOnRay.push(node);
			}
		}

		return nodesOnRay;
	}

	updateMatrixWorld (force) {
		if (this.matrixAutoUpdate === true) this.updateMatrix();

		if (this.matrixWorldNeedsUpdate === true || force === true) {
			if (!this.parent) {
				this.matrixWorld.copy(this.matrix);
			} else {
				this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
			}

			this.matrixWorldNeedsUpdate = false;

			force = true;
		}
	}

	hideDescendants (object) {
		let stack = [];
		for (let i = 0; i < object.children.length; i++) {
			let child = object.children[i];
			if (child.visible) {
				stack.push(child);
			}
		}

		while (stack.length > 0) {
			let object = stack.shift();

			object.visible = false;

			for (let i = 0; i < object.children.length; i++) {
				let child = object.children[i];
				if (child.visible) {
					stack.push(child);
				}
			}
		}
	}

	moveToOrigin () {
		this.position.set(0, 0, 0);
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.set(0, 0, 0).sub(tBox.getCenter());
	};

	moveToGroundPlane () {
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.y += -tBox.min.y;
	};

	getBoundingBoxWorld () {
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
	 *  let segment = {
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
	getPointsInProfile (profile, maxDepth, callback) {
		if (callback) {
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
		for (let i = 0; i < profile.points.length - 1; i++) {
			let start = profile.points[i];
			let end = profile.points[i + 1];
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
		for (let i = 0; i < points.segments.length; i++) {
			let segment = points.segments[i];
			let start = segment.start;
			let end = segment.end;

			let project = (function (_start, _end, _mileage, _boundingBox) {
				let start = _start;
				let end = _end;
				let mileage = _mileage;
				let boundingBox = _boundingBox;

				let xAxis = new THREE.Vector3(1, 0, 0);
				let dir = new THREE.Vector3().subVectors(end, start);
				dir.y = 0;
				dir.normalize();
				let alpha = Math.acos(xAxis.dot(dir));
				if (dir.z > 0) {
					alpha = -alpha;
				}

				return function (position) {
					let toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -boundingBox.min.y, -start.z);
					let alignWithX = new THREE.Matrix4().makeRotationY(-alpha);
					let applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

					let pos = position.clone();
					pos.applyMatrix4(toOrigin);
					pos.applyMatrix4(alignWithX);
					pos.applyMatrix4(applyMileage);

					return pos;
				};
			}(start, end, mileage.clone(), points.boundingBox.clone()));

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
	getProfile (start, end, width, depth, callback) {
		let request = new Potree.ProfileRequest(start, end, width, depth, callback);
		this.profileRequests.push(request);
	};

	getVisibleExtent () {
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
	pick(viewer, camera, ray, params = {}){

		let renderer = viewer.renderer;
		let pRenderer = viewer.pRenderer;
		
		performance.mark("pick-start");
		
		let getVal = (a, b) => a !== undefined ? a : b;

		let pickWindowSize = getVal(params.pickWindowSize, 17);
		let pickOutsideClipRegion = getVal(params.pickOutsideClipRegion, false);

		let size = renderer.getSize();

		let width = Math.ceil(getVal(params.width, size.width));
		let height = Math.ceil(getVal(params.height, size.height));

		let pointSizeType = getVal(params.pointSizeType, this.material.pointSizeType);
		let pointSize = getVal(params.pointSize, this.material.size);

		let nodes = this.nodesOnRay(this.visibleNodes, ray);

		if (nodes.length === 0) {
			return null;
		}
		
		if (!this.pickState) {
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
			pickMaterial.pointSizeType = pointSizeType;
			pickMaterial.shape = this.material.shape;

			pickMaterial.size = pointSize;
			pickMaterial.uniforms.minSize.value = this.material.uniforms.minSize.value;
			pickMaterial.uniforms.maxSize.value = this.material.uniforms.maxSize.value;
			pickMaterial.classification = this.material.classification;
			if(params.pickClipped){
				pickMaterial.clipBoxes = this.material.clipBoxes;
				if(this.material.clipTask === Potree.ClipTask.HIGHLIGHT){
					pickMaterial.clipTask = Potree.ClipTask.NONE;
				}else{
					pickMaterial.clipTask = this.material.clipTask;
				}
			}else{
				pickMaterial.clipBoxes = [];
			}
			
			this.updateMaterial(pickMaterial, nodes, camera, renderer);
		}

		pickState.renderTarget.setSize(width, height);

		let pixelPos = new THREE.Vector2(params.x, params.y);
		
		let gl = renderer.getContext();
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(
			parseInt(pixelPos.x - (pickWindowSize - 1) / 2),
			parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
			parseInt(pickWindowSize), parseInt(pickWindowSize));

		
		renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
		renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
		renderer.state.setBlending(THREE.NoBlending);
		
		{ // RENDER
			renderer.setRenderTarget(pickState.renderTarget);
			gl.clearColor(0, 0, 0, 0);
			renderer.clearTarget( pickState.renderTarget, true, true, true );
			
			let tmp = this.material;
			this.material = pickMaterial;
			
			pRenderer.renderOctree(this, nodes, camera, pickState.renderTarget);
			
			this.material = tmp;
		}
		
		let clamp = (number, min, max) => Math.min(Math.max(min, number), max);

		let x = parseInt(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width));
		let y = parseInt(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height));
		let w = parseInt(Math.min(x + pickWindowSize, width) - x);
		let h = parseInt(Math.min(y + pickWindowSize, height) - y);

		let pixelCount = w * h;
		let buffer = new Uint8Array(4 * pixelCount);
		
		gl.readPixels(x, y, pickWindowSize, pickWindowSize, gl.RGBA, gl.UNSIGNED_BYTE, buffer); 
		
		renderer.setRenderTarget(null);
		renderer.resetGLState();
		renderer.setScissorTest(false);
		gl.disable(gl.SCISSOR_TEST);
		
		let pixels = buffer;
		let ibuffer = new Uint32Array(buffer.buffer);

		// find closest hit inside pixelWindow boundaries
		let min = Number.MAX_VALUE;
		let hits = [];
		for (let u = 0; u < pickWindowSize; u++) {
			for (let v = 0; v < pickWindowSize; v++) {
				let offset = (u + v * pickWindowSize);
				let distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

				let pcIndex = pixels[4 * offset + 3];
				pixels[4 * offset + 3] = 0;
				let pIndex = ibuffer[offset];

				if(!(pcIndex === 0 && pIndex === 0) && (pcIndex !== undefined) && (pIndex !== undefined)){
					let hit = {
						pIndex: pIndex,
						pcIndex: pcIndex,
						distanceToCenter: distance
					};

					if(params.all){
						hits.push(hit);
					}else{
						if(hits.length > 0){
							if(distance < hits[0].distanceToCenter){
								hits[0] = hit;
							}
						}else{
							hits.push(hit);
						}
					}

					
				}
			}
		}
		
		
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
		//		style="transform: scaleY(-1); width: 300px"/>`));
		//	//$(this.debugWindow.document).append($(`<img src="${screenshot}"/>`));
		//	//this.debugWindow.document.write('<img src="'+screenshot+'"/>');
		//}
		

		for(let hit of hits){
			let point = {};
		
			if (!nodes[hit.pcIndex]) {
				return null;
			}
		
			let node = nodes[hit.pcIndex];
			let pc = node.sceneNode;
			let geometry = node.geometryNode.geometry;
			
			for(let attributeName in geometry.attributes){
				let attribute = geometry.attributes[attributeName];
		
				if (attributeName === 'position') {
					let x = attribute.array[3 * hit.pIndex + 0];
					let y = attribute.array[3 * hit.pIndex + 1];
					let z = attribute.array[3 * hit.pIndex + 2];
					
					let position = new THREE.Vector3(x, y, z);
					position.applyMatrix4(pc.matrixWorld);
		
					point[attributeName] = position;
				} else if (attributeName === 'indices') {
		
				} else {
					//if (values.itemSize === 1) {
					//	point[attribute.name] = values.array[hit.pIndex];
					//} else {
					//	let value = [];
					//	for (let j = 0; j < values.itemSize; j++) {
					//		value.push(values.array[values.itemSize * hit.pIndex + j]);
					//	}
					//	point[attribute.name] = value;
					//}
				}
				
			}

			hit.point = point;
		}

		performance.mark("pick-end");
		performance.measure("pick", "pick-start", "pick-end");

		if(params.all){
			return hits.map(hit => hit.point);
		}else{
			if(hits.length === 0){
				return null;
			}else{
				return hits[0].point;
				//let sorted = hits.sort( (a, b) => a.distanceToCenter - b.distanceToCenter);

				//return sorted[0].point;
			}
		}
		
	};

	* getFittedBoxGen(boxNode){
		let start = performance.now();

		let shrinkedLocalBounds = new THREE.Box3();
		let worldToBox = new THREE.Matrix4().getInverse(boxNode.matrixWorld);

		for(let node of this.visibleNodes){
			if(!node.sceneNode){
				continue;
			}

			let buffer = node.geometryNode.buffer;

			let posOffset = buffer.offset("position");
			let stride = buffer.stride;
			let view = new DataView(buffer.data);
			
			let objectToBox = new THREE.Matrix4().multiplyMatrices(worldToBox, node.sceneNode.matrixWorld);

			let pos = new THREE.Vector4();
			for(let i = 0; i < buffer.numElements; i++){
				let x = view.getFloat32(i * stride + posOffset + 0, true);
				let y = view.getFloat32(i * stride + posOffset + 4, true);
				let z = view.getFloat32(i * stride + posOffset + 8, true);

				pos.set(x, y, z, 1);
				pos.applyMatrix4(objectToBox);

				if(-0.5 < pos.x && pos.x < 0.5){
					if(-0.5 < pos.y && pos.y < 0.5){
						if(-0.5 < pos.z && pos.z < 0.5){
							shrinkedLocalBounds.expandByPoint(pos);
						}
					}
				}
			}

			yield;
		}

		let fittedPosition = shrinkedLocalBounds.getCenter().applyMatrix4(boxNode.matrixWorld);

		let fitted = new THREE.Object3D();
		fitted.position.copy(fittedPosition);
		fitted.scale.copy(boxNode.scale);
		fitted.rotation.copy(boxNode.rotation);

		let ds = new THREE.Vector3().subVectors(shrinkedLocalBounds.max, shrinkedLocalBounds.min);
		fitted.scale.multiply(ds);

		let duration = performance.now() - start;
		console.log("duration: ", duration);

		yield fitted;
	}

	getFittedBox(boxNode, maxLevel = Infinity){

		maxLevel = Infinity;

		let start = performance.now();

		let shrinkedLocalBounds = new THREE.Box3();
		let worldToBox = new THREE.Matrix4().getInverse(boxNode.matrixWorld);

		for(let node of this.visibleNodes){
			if(!node.sceneNode || node.getLevel() > maxLevel){
				continue;
			}

			let buffer = node.geometryNode.buffer;

			let posOffset = buffer.offset("position");
			let stride = buffer.stride;
			let view = new DataView(buffer.data);
			
			let objectToBox = new THREE.Matrix4().multiplyMatrices(worldToBox, node.sceneNode.matrixWorld);

			let pos = new THREE.Vector4();
			for(let i = 0; i < buffer.numElements; i++){
				let x = view.getFloat32(i * stride + posOffset + 0, true);
				let y = view.getFloat32(i * stride + posOffset + 4, true);
				let z = view.getFloat32(i * stride + posOffset + 8, true);

				pos.set(x, y, z, 1);
				pos.applyMatrix4(objectToBox);

				if(-0.5 < pos.x && pos.x < 0.5){
					if(-0.5 < pos.y && pos.y < 0.5){
						if(-0.5 < pos.z && pos.z < 0.5){
							shrinkedLocalBounds.expandByPoint(pos);
						}
					}
				}
			}
		}

		let fittedPosition = shrinkedLocalBounds.getCenter().applyMatrix4(boxNode.matrixWorld);

		let fitted = new THREE.Object3D();
		fitted.position.copy(fittedPosition);
		fitted.scale.copy(boxNode.scale);
		fitted.rotation.copy(boxNode.rotation);

		let ds = new THREE.Vector3().subVectors(shrinkedLocalBounds.max, shrinkedLocalBounds.min);
		fitted.scale.multiply(ds);

		let duration = performance.now() - start;
		console.log("duration: ", duration);

		return fitted;
	}

	get progress () {
		return this.visibleNodes.length / this.visibleGeometry.length;
	}
};










Potree.PointCloudOctreeGeometry = class PointCloudOctreeGeometry{

    constructor(){
        this.url = null;
        this.octreeDir = null;
        this.spacing = 0;
        this.boundingBox = null;
        this.root = null;
        this.nodes = null;
        this.pointAttributes = null;
        this.hierarchyStepSize = -1;
        this.loader = null;
    }
};

Potree.PointCloudOctreeGeometryNode = class PointCloudOctreeGeometryNode extends Potree.PointCloudTreeNode{

    constructor(name, pcoGeometry, boundingBox){
        super();

        this.id = Potree.PointCloudOctreeGeometryNode.IDCount++;
        this.name = name;
        this.index = parseInt(name.charAt(name.length - 1));
        this.pcoGeometry = pcoGeometry;
        this.geometry = null;
        this.boundingBox = boundingBox;
        this.boundingSphere = boundingBox.getBoundingSphere();
        this.children = {};
        this.numPoints = 0;
        this.level = null;
        this.loaded = false;
        this.oneTimeDisposeHandlers = [];
    }

    isGeometryNode(){
        return true;
    }

    getLevel(){
        return this.level;
    }

    isTreeNode(){
        return false;
    }

    isLoaded(){
        return this.loaded;
    }

    getBoundingSphere(){
        return this.boundingSphere;
    }

    getBoundingBox(){
        return this.boundingBox;
    }

    getChildren(){
        let children = [];

        for (let i = 0; i < 8; i++) {
            if (this.children[i]) {
                children.push(this.children[i]);
            }
        }

        return children;
    }

    getBoundingBox(){
        return this.boundingBox;
    }

    getURL(){
        let url = '';

        let version = this.pcoGeometry.loader.version;

        if (version.equalOrHigher('1.5')) {
            url = this.pcoGeometry.octreeDir + '/' + this.getHierarchyPath() + '/' + this.name;
        } else if (version.equalOrHigher('1.4')) {
            url = this.pcoGeometry.octreeDir + '/' + this.name;
        } else if (version.upTo('1.3')) {
            url = this.pcoGeometry.octreeDir + '/' + this.name;
        }

        return url;
    }

    getHierarchyPath(){
        let path = 'r/';

        let hierarchyStepSize = this.pcoGeometry.hierarchyStepSize;
        let indices = this.name.substr(1);

        let numParts = Math.floor(indices.length / hierarchyStepSize);
        for (let i = 0; i < numParts; i++) {
            path += indices.substr(i * hierarchyStepSize, hierarchyStepSize) + '/';
        }

        path = path.slice(0, -1);

        return path;
    }

    addChild(child) {
        this.children[child.index] = child;
        child.parent = this;
    }

    load(){
        if (this.loading === true || this.loaded === true || Potree.numNodesLoading >= Potree.maxNodesLoading) {
            return;
        }

        this.loading = true;

        Potree.numNodesLoading++;

        if (this.pcoGeometry.loader.version.equalOrHigher('1.5')) {
            if ((this.level % this.pcoGeometry.hierarchyStepSize) === 0 && this.hasChildren) {
                this.loadHierachyThenPoints();
            } else {
                this.loadPoints();
            }
        } else {
            this.loadPoints();
        }
    }

    loadPoints(){
        this.pcoGeometry.loader.load(this);
    }

    loadHierachyThenPoints(){
        let node = this;

        // load hierarchy
        let callback = function (node, hbuffer) {
            let view = new DataView(hbuffer);

            let stack = [];
            let children = view.getUint8(0);
            let numPoints = view.getUint32(1, true);
            node.numPoints = numPoints;
            stack.push({children: children, numPoints: numPoints, name: node.name});

            let decoded = [];

            let offset = 5;
            while (stack.length > 0) {
                let snode = stack.shift();
                let mask = 1;
                for (let i = 0; i < 8; i++) {
                    if ((snode.children & mask) !== 0) {
                        let childName = snode.name + i;

                        let childChildren = view.getUint8(offset);
                        let childNumPoints = view.getUint32(offset + 1, true);

                        stack.push({children: childChildren, numPoints: childNumPoints, name: childName});

                        decoded.push({children: childChildren, numPoints: childNumPoints, name: childName});

                        offset += 5;
                    }

                    mask = mask * 2;
                }

                if (offset === hbuffer.byteLength) {
                    break;
                }
            }

            // console.log(decoded);

            let nodes = {};
            nodes[node.name] = node;
            let pco = node.pcoGeometry;

            for (let i = 0; i < decoded.length; i++) {
                let name = decoded[i].name;
                let decodedNumPoints = decoded[i].numPoints;
                let index = parseInt(name.charAt(name.length - 1));
                let parentName = name.substring(0, name.length - 1);
                let parentNode = nodes[parentName];
                let level = name.length - 1;
                let boundingBox = Potree.POCLoader.createChildAABB(parentNode.boundingBox, index);

                let currentNode = new Potree.PointCloudOctreeGeometryNode(name, pco, boundingBox);
                currentNode.level = level;
                currentNode.numPoints = decodedNumPoints;
                currentNode.hasChildren = decoded[i].children > 0;
                currentNode.spacing = pco.spacing / Math.pow(2, level);
                parentNode.addChild(currentNode);
                nodes[name] = currentNode;
            }

            node.loadPoints();
        };
        if ((node.level % node.pcoGeometry.hierarchyStepSize) === 0) {
            // let hurl = node.pcoGeometry.octreeDir + "/../hierarchy/" + node.name + ".hrc";
            let hurl = node.pcoGeometry.octreeDir + '/' + node.getHierarchyPath() + '/' + node.name + '.hrc';

            let xhr = Potree.XHRFactory.createXMLHttpRequest();
            xhr.open('GET', hurl, true);
            xhr.responseType = 'arraybuffer';
            xhr.overrideMimeType('text/plain; charset=x-user-defined');
            xhr.onreadystatechange = () => {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200 || xhr.status === 0) {
                        let hbuffer = xhr.response;
                        callback(node, hbuffer);
                    } else {
                        console.log('Failed to load file! HTTP status: ' + xhr.status + ', file: ' + hurl);
                        Potree.numNodesLoading--;
                    }
                }
            };
            try {
                xhr.send(null);
            } catch (e) {
                console.log('fehler beim laden der punktwolke: ' + e);
            }
        }
    }

    getNumPoints(){
        return this.numPoints;
    }

    dispose(){
        if (this.geometry && this.parent != null) {
            this.geometry.dispose();
            this.geometry = null;
            this.loaded = false;

            // this.dispatchEvent( { type: 'dispose' } );
            for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
                let handler = this.oneTimeDisposeHandlers[i];
                handler();
            }
            this.oneTimeDisposeHandlers = [];
        }
    }
}

Potree.PointCloudOctreeGeometryNode.IDCount = 0;

Object.assign(Potree.PointCloudOctreeGeometryNode.prototype, THREE.EventDispatcher.prototype);

Potree.PointCloudGreyhoundGeometry = function () {
	this.spacing = 0;
	this.boundingBox = null;
	this.root = null;
	this.nodes = null;
	this.pointAttributes = {};
	this.hierarchyStepSize = -1;
	this.loader = null;
	this.schema = null;

	this.baseDepth = null;
	this.offset = null;
	this.projection = null;

	this.boundingSphere = null;

	// the serverURL will contain the base URL of the greyhound server. f.e. http://dev.greyhound.io/resource/autzen/
	this.serverURL = null;

	this.normalize = { color: false, intensity: false };
};

Potree.PointCloudGreyhoundGeometryNode = function (
	name, pcoGeometry, boundingBox, scale, offset) {
	this.id = Potree.PointCloudGreyhoundGeometryNode.IDCount++;
	this.name = name;
	this.index = parseInt(name.charAt(name.length - 1));
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
	this.baseLoaded = false;

	let bounds = this.boundingBox.clone();
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
		this.pcoGeometry.boundingBox.getSize().multiplyScalar(0.5)
	);
};

Potree.PointCloudGreyhoundGeometryNode.IDCount = 0;

Potree.PointCloudGreyhoundGeometryNode.prototype =
	Object.create(Potree.PointCloudTreeNode.prototype);

Potree.PointCloudGreyhoundGeometryNode.prototype.isGeometryNode = function () {
	return true;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.isTreeNode = function () {
	return false;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.isLoaded = function () {
	return this.loaded;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getBoundingSphere = function () {
	return this.boundingSphere;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getBoundingBox = function () {
	return this.boundingBox;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getLevel = function () {
	return this.level;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getChildren = function () {
	let children = [];

	for (let i = 0; i < 8; ++i) {
		if (this.children[i]) {
			children.push(this.children[i]);
		}
	}

	return children;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getURL = function () {
	let schema = this.pcoGeometry.schema;
	let bounds = this.greyhoundBounds;

	let boundsString =
				bounds.min.x + ',' + bounds.min.y + ',' + bounds.min.z + ',' +
				bounds.max.x + ',' + bounds.max.y + ',' + bounds.max.z;

	let url = '' + this.pcoGeometry.serverURL +
				'read?depthBegin=' +
				(this.baseLoaded ? (this.level + this.pcoGeometry.baseDepth) : 0) +
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

	if (!this.baseLoaded) this.baseLoaded = true;

	return url;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.addChild = function (child) {
	this.children[child.index] = child;
	child.parent = this;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.load = function () {
	if (
		this.loading === true ||
		this.loaded === true ||
		Potree.numNodesLoading >= Potree.maxNodesLoading) {
		return;
	}

	this.loading = true;
	Potree.numNodesLoading++;

	if (
		this.level % this.pcoGeometry.hierarchyStepSize === 0 &&
		this.hasChildren) {
		this.loadHierarchyThenPoints();
	} else {
		this.loadPoints();
	}
};

Potree.PointCloudGreyhoundGeometryNode.prototype.loadPoints = function () {
	this.pcoGeometry.loader.load(this);
};

Potree.PointCloudGreyhoundGeometryNode.prototype.loadHierarchyThenPoints = function () {
	// From Greyhound (Cartesian) ordering for the octree to Potree-default
	let transform = [0, 2, 1, 3, 4, 6, 5, 7];

	let makeBitMask = function (node) {
		let mask = 0;
		Object.keys(node).forEach(function (key) {
			if (key === 'swd') mask += 1 << transform[0];
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

	let parseChildrenCounts = function (base, parentName, stack) {
		let keys = Object.keys(base);
		let child;
		let childName;

		keys.forEach(function (key) {
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
	let callback = function (node, greyhoundHierarchy) {
		let decoded = [];
		node.numPoints = greyhoundHierarchy.n;
		parseChildrenCounts(greyhoundHierarchy, node.name, decoded);

		let nodes = {};
		nodes[node.name] = node;
		let pgg = node.pcoGeometry;

		for (let i = 0; i < decoded.length; i++) {
			let name = decoded[i].name;
			let numPoints = decoded[i].numPoints;
			let index = parseInt(name.charAt(name.length - 1));
			let parentName = name.substring(0, name.length - 1);
			let parentNode = nodes[parentName];
			let level = name.length - 1;
			let boundingBox = Potree.GreyhoundLoader.createChildAABB(
				parentNode.boundingBox, index);

			let currentNode = new Potree.PointCloudGreyhoundGeometryNode(
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
		let depthBegin = this.level + this.pcoGeometry.baseDepth;
		let depthEnd = depthBegin + this.pcoGeometry.hierarchyStepSize + 2;

		let bounds = this.greyhoundBounds;

		let boundsString =
			bounds.min.x + ',' + bounds.min.y + ',' + bounds.min.z + ',' +
			bounds.max.x + ',' + bounds.max.y + ',' + bounds.max.z;

		let hurl = '' + this.pcoGeometry.serverURL +
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

		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', hurl, true);

		let that = this;
		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					let greyhoundHierarchy = JSON.parse(xhr.responseText) || { };
					callback(that, greyhoundHierarchy);
				} else {
					console.log(
						'Failed to load file! HTTP status:', xhr.status,
						'file:', hurl
					);
				}
			}
		};

		try {
			xhr.send(null);
		} catch (e) {
			console.log('fehler beim laden der punktwolke: ' + e);
		}
	}
};

Potree.PointCloudGreyhoundGeometryNode.prototype.getNumPoints = function () {
	return this.numPoints;
};

Potree.PointCloudGreyhoundGeometryNode.prototype.dispose = function () {
	if (this.geometry && this.parent != null) {
		this.geometry.dispose();
		this.geometry = null;
		this.loaded = false;

		// this.dispatchEvent( { type: 'dispose' } );
		for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
			let handler = this.oneTimeDisposeHandlers[i];
			handler();
		}
		this.oneTimeDisposeHandlers = [];
	}
};

// THREE.EventDispatcher.prototype.apply(
//        Potree.PointCloudGreyhoundGeometryNode.prototype);
Object.assign(Potree.PointCloudGreyhoundGeometryNode.prototype, THREE.EventDispatcher.prototype);

var toVector3 = function(v, offset) {
    return new THREE.Vector3().fromArray(v, offset || 0);
}

var toBox3 = function(b) {
    return new THREE.Box3(this.toVector3(b), this.toVector3(b, 3));
};

var toArray = function(b) {
    return [b.min.x, b.min.y, b.min.z, b.max.x, b.max.y, b.max.z];
}

Potree.PointCloudEptGeometry = class {
    constructor(url, info) {
        let version = info.version;
        let schema = info.schema;
        let bounds = info.bounds;
        let boundsConforming = info.boundsConforming;

        // TODO This is unused.
        let offset = info.offset || [0, 0, 0];
        let scale = info.scale || 0.01;
        if (Array.isArray(scale)) {
            scale = Math.min(scale[0], scale[1], scale[2]);
        }

        let dataStorage = info.dataStorage || 'laz';
        let hierarchyStorage = info.hierarchyStorage || 'json';

        // Now convert to three.js types.
        bounds = toBox3(bounds);
        boundsConforming = toBox3(boundsConforming);
        offset = toVector3(offset);     // TODO
        offset = bounds.min.clone();
        offset = toVector3([0, 0, 0]);  // TODO

        bounds.min.sub(offset);
        bounds.max.sub(offset);
        boundsConforming.min.sub(offset);
        boundsConforming.max.sub(offset);

        this.url = url;
        this.info = info;

        this.ticks = info.ticks;
        this.boundingBox = bounds;
        this.offset = offset;
        this.tightBoundingBox = boundsConforming;
        this.boundingSphere = this.boundingBox.getBoundingSphere();
        this.tightBoundingSphere = this.tightBoundingBox.getBoundingSphere();
        this.version = new Potree.Version('1.6');

        this.projection = info.srs;
        this.pointAttributes = 'LAZ';
        this.spacing =
            (this.boundingBox.max.x - this.boundingBox.min.x) / this.ticks;

        // TODO Switch on storage type.
        this.loader = new Potree.EptLazLoader();
        this.hierarchyStep = info.hierarchyStep || 0;
    }
};

Potree.EptKey = class {
    constructor(ept, b, d, x, y, z) {
        this.ept = ept;
        this.b = b;
        this.d = d;
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }

    name() {
        return this.d + '-' + this.x + '-' + this.y + '-' + this.z;
    }

    step(a, b, c) {
        let min = this.b.min.clone();
        let max = this.b.max.clone();
        let dst = new THREE.Vector3().subVectors(max, min);

        if (a)  min.x += dst.x / 2;
        else    max.x -= dst.x / 2;

        if (b)  min.y += dst.y / 2;
        else    max.y -= dst.y / 2;

        if (c)  min.z += dst.z / 2;
        else    max.z -= dst.z / 2;

        return new Potree.EptKey(
                this.ept,
                new THREE.Box3(min, max),
                this.d + 1,
                this.x * 2 + a,
                this.y * 2 + b,
                this.z * 2 + c);
    }

    children() {
        var result = [];
        for (var a = 0; a < 2; ++a) {
            for (var b = 0; b < 2; ++b) {
                for (var c = 0; c < 2; ++c) {
                    var add = this.step(a, b, c).name();
                    if (!result.includes(add)) result = result.concat(add);
                }
            }
        }
        return result;
    }
}

Potree.PointCloudEptGeometryNode = class extends Potree.PointCloudTreeNode {
    constructor(ept, b, d, x, y, z) {
        super();

        this.ept = ept;
        this.key = new Potree.EptKey(
                this.ept,
                b || this.ept.boundingBox,
                d || 0,
                x,
                y,
                z);

        this.id = Potree.PointCloudEptGeometryNode.NextId++;
        this.geometry = null;
        this.boundingBox = this.key.b;
        this.tightBoundingBox = this.boundingBox;
        this.spacing = this.ept.spacing / Math.pow(2, this.key.d);
        this.boundingSphere = this.boundingBox.getBoundingSphere();

        // These are set during hierarchy loading.
        this.hasChildren = false;
        this.children = { };
        this.numPoints = 0;

        this.level = this.key.d;
        this.loaded = false;
        this.loading = false;
        this.oneTimeDisposeHandlers = [];

        let k = this.key;
        this.name = this.toPotreeName(k.d, k.x, k.y, k.z);
        this.index = parseInt(this.name.charAt(this.name.length - 1));
    }

    isGeometryNode() { return true; }
    getLevel() { return this.level; }
    isTreeNode() { return false; }
    isLoaded() { return this.loaded; }
    getBoundingSphere() { return this.boundingSphere; }
    getBoundingBox() { return this.boundingBox; }
    url() { return this.ept.url + this.filename(); }
    getNumPoints() { return this.numPoints; }

    filename() { return this.key.name(); }

    getChildren() {
        let children = [];

        for (let i = 0; i < 8; i++) {
            if (this.children[i]) {
                children.push(this.children[i]);
            }
        }

        return children;
    }

    addChild(child) {
        this.children[child.index] = child;
        child.parent = this;
    }

    load() {
        if (this.loaded || this.loading) return;
        if (Potree.numNodesLoading >= Potree.maxNodesLoading) return;

        this.loading = true;
        ++Potree.numNodesLoading;

        let hs = this.ept.hierarchyStep;
        if (!this.key.d || (hs && (this.key.d % hs == 0) && this.hasChildren)) {
            this.loadHierarchy();
        }
        this.loadPoints();
    }

    loadPoints(){
        this.ept.loader.load(this);
    }

    loadHierarchy() {
        let nodes = { };
        nodes[this.filename()] = this;
        this.hasChildren = false;

        EptUtils.getJson(this.ept.url + 'h/' + this.filename() + '.json')
        .then((hier) => {
            // Since we want to traverse top-down, and 10 comes
            // lexicographically before 9 (for example), do a deep sort.
            var keys = Object.keys(hier).sort((a, b) => {
                let [da, xa, ya, za] = a.split('-').map((n) => parseInt(n, 10));
                let [db, xb, yb, zb] = b.split('-').map((n) => parseInt(n, 10));
                if (da < db) return -1; if (da > db) return 1;
                if (xa < xb) return -1; if (xa > xb) return 1;
                if (ya < yb) return -1; if (ya > yb) return 1;
                if (za < zb) return -1; if (za > zb) return 1;
                return 0;
            });

            keys.forEach((v) => {
                let [d, x, y, z] = v.split('-').map((n) => parseInt(n, 10));
                let a = x & 1, b = y & 1, c = z & 1;
                let parentName =
                    (d - 1) + '-' + (x >> 1) + '-' + (y >> 1) + '-' + (z >> 1);

                let parentNode = nodes[parentName];
                if (!parentNode) return;
                parentNode.hasChildren = true;

                let key = parentNode.key.step(a, b, c);

                let node = new Potree.PointCloudEptGeometryNode(
                        this.ept,
                        key.b,
                        key.d,
                        key.x,
                        key.y,
                        key.z);

                node.level = d;
                node.numPoints = hier[v];

                let hs = this.ept.hierarchyStep;
                if (hs && d % hs == 0) node.hasChildren = true;

                parentNode.addChild(node);
                nodes[key.name()] = node;
            });
        });
    }

    doneLoading(bufferGeometry, tightBoundingBox, np, mean) {
        bufferGeometry.boundingBox = this.boundingBox;
        this.geometry = bufferGeometry;
        this.tightBoundingBox = tightBoundingBox;
        this.numPoints = np;
        this.mean = mean;
        this.loaded = true;
        this.loading = false;
        --Potree.numNodesLoading;
    }

    toPotreeName(d, x, y, z) {
        var name = 'r';

        for (var i = 0; i < d; ++i) {
            var shift = d - i - 1;
            var mask = 1 << shift;
            var step = 0;

            if (x & mask) step += 4;
            if (y & mask) step += 2;
            if (z & mask) step += 1;

            name += step;
        }

        return name;
    }

    dispose() {
        if (this.geometry && this.parent != null) {
            this.geometry.dispose();
            this.geometry = null;
            this.loaded = false;

            // this.dispatchEvent( { type: 'dispose' } );
            for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
                let handler = this.oneTimeDisposeHandlers[i];
                handler();
            }
            this.oneTimeDisposeHandlers = [];
        }
    }
}

Potree.PointCloudEptGeometryNode.NextId = 0;

Object.assign(
        Potree.PointCloudEptGeometryNode.prototype,
        THREE.EventDispatcher.prototype);



Potree.utils = class {
	static loadShapefileFeatures (file, callback) {
		let features = [];

		let handleFinish = () => {
			callback(features);
		};

		shapefile.open(file)
			.then(source => {
				source.read()
					.then(function log (result) {
						if (result.done) {
							handleFinish();
							return;
						}

						// console.log(result.value);

						if (result.value && result.value.type === 'Feature' && result.value.geometry !== undefined) {
							features.push(result.value);
						}

						return source.read().then(log);
					});
			});
	}

	static toString (value) {
		if (value instanceof THREE.Vector3) {
			return value.x.toFixed(2) + ', ' + value.y.toFixed(2) + ', ' + value.z.toFixed(2);
		} else {
			return '' + value + '';
		}
	}

	static normalizeURL (url) {
		let u = new URL(url);

		return u.protocol + '//' + u.hostname + u.pathname.replace(/\/+/g, '/');
	};

	static pathExists (url) {
		let req = Potree.XHRFactory.createXMLHttpRequest();
		req.open('GET', url, false);
		req.send(null);
		if (req.status !== 200) {
			return false;
		}
		return true;
	};

	static debugSphere(parent, position, scale, color){
		let geometry = new THREE.SphereGeometry(1, 8, 8);
		let material;

		if(color !== undefined){
			material = new THREE.MeshBasicMaterial({color: color});
		}else{
			material = new THREE.MeshNormalMaterial();
		}
		let sphere = new THREE.Mesh(geometry, material);
		sphere.position.copy(position);
		sphere.scale.set(scale, scale, scale);
		parent.add(sphere);
	}

	static debugLine(parent, start, end, color){
		let material = new THREE.LineBasicMaterial({ color: color }); 
		let geometry = new THREE.Geometry(); 
		geometry.vertices.push( start, end); 
		let tl = new THREE.Line( geometry, material ); 
		parent.add(tl);
	}

	/**
	 * adapted from mhluska at https://github.com/mrdoob/three.js/issues/1561
	 */
	static computeTransformedBoundingBox (box, transform) {
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
		boundingBox.setFromPoints(vertices);

		return boundingBox;
	};

	/**
	 * add separators to large numbers
	 *
	 * @param nStr
	 * @returns
	 */
	static addCommas (nStr) {
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

	static removeCommas (str) {
		return str.replace(/,/g, '');
	}

	/**
	 * create worker from a string
	 *
	 * code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
	 */
	static createWorker (code) {
		let blob = new Blob([code], {type: 'application/javascript'});
		let worker = new Worker(URL.createObjectURL(blob));

		return worker;
	};

	static moveTo(scene, endPosition, endTarget){

		let view = scene.view;
		let camera = scene.getActiveCamera();
		let animationDuration = 500;
		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate camera position
			let tween = new TWEEN.Tween(view.position).to(endPosition, animationDuration);
			tween.easing(easing);
			tween.start();
		}

		{ // animate camera target
			let camTargetDistance = camera.position.distanceTo(endTarget);
			let target = new THREE.Vector3().addVectors(
				camera.position,
				camera.getWorldDirection().clone().multiplyScalar(camTargetDistance)
			);
			let tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
			tween.easing(easing);
			tween.onUpdate(() => {
				view.lookAt(target);
			});
			tween.onComplete(() => {
				view.lookAt(target);
			});
			tween.start();
		}

	}

	static loadSkybox (path) {
		let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
		camera.up.set(0, 0, 1);
		let scene = new THREE.Scene();

		let format = '.jpg';
		let urls = [
			path + 'px' + format, path + 'nx' + format,
			path + 'py' + format, path + 'ny' + format,
			path + 'pz' + format, path + 'nz' + format
		];

		let materialArray = [];
		{
			for (let i = 0; i < 6; i++) {
				let material = new THREE.MeshBasicMaterial({
					map: null,
					side: THREE.BackSide,
					depthTest: false,
					depthWrite: false,
					color: 0x424556
				});

				materialArray.push(material);

				let loader = new THREE.TextureLoader();
				loader.load(urls[i],
					function loaded (texture) {
						material.map = texture;
						material.needsUpdate = true;
						material.color.setHex(0xffffff);
					}, function progress (xhr) {
						// console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
					}, function error (xhr) {
						console.log('An error happened', xhr);
					}
				);
			}
		}

		let skyGeometry = new THREE.CubeGeometry(5000, 5000, 5000);
		let skybox = new THREE.Mesh(skyGeometry, materialArray);

		scene.add(skybox);

		// z up
		scene.rotation.x = Math.PI / 2;

		return {'camera': camera, 'scene': scene};
	};

	static createGrid (width, length, spacing, color) {
		let material = new THREE.LineBasicMaterial({
			color: color || 0x888888
		});

		let geometry = new THREE.Geometry();
		for (let i = 0; i <= length; i++) {
			geometry.vertices.push(new THREE.Vector3(-(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0));
			geometry.vertices.push(new THREE.Vector3(+(spacing * width) / 2, i * spacing - (spacing * length) / 2, 0));
		}

		for (let i = 0; i <= width; i++) {
			geometry.vertices.push(new THREE.Vector3(i * spacing - (spacing * width) / 2, -(spacing * length) / 2, 0));
			geometry.vertices.push(new THREE.Vector3(i * spacing - (spacing * width) / 2, +(spacing * length) / 2, 0));
		}

		let line = new THREE.LineSegments(geometry, material, THREE.LinePieces);
		line.receiveShadow = true;
		return line;
    };

	static createBackgroundTexture (width, height) {
		function gauss (x, y) {
			return (1 / (2 * Math.PI)) * Math.exp(-(x * x + y * y) / 2);
		};

		// map.magFilter = THREE.NearestFilter;
		let size = width * height;
		let data = new Uint8Array(3 * size);

		let chroma = [1, 1.5, 1.7];
		let max = gauss(0, 0);

		for (let x = 0; x < width; x++) {
			for (let y = 0; y < height; y++) {
				let u = 2 * (x / width) - 1;
				let v = 2 * (y / height) - 1;

				let i = x + width * y;
				let d = gauss(2 * u, 2 * v) / max;
				let r = (Math.random() + Math.random() + Math.random()) / 3;
				r = (d * 0.5 + 0.5) * r * 0.03;
				r = r * 0.4;

				// d = Math.pow(d, 0.6);

				data[3 * i + 0] = 255 * (d / 15 + 0.05 + r) * chroma[0];
				data[3 * i + 1] = 255 * (d / 15 + 0.05 + r) * chroma[1];
				data[3 * i + 2] = 255 * (d / 15 + 0.05 + r) * chroma[2];
			}
		}

		let texture = new THREE.DataTexture(data, width, height, THREE.RGBFormat);
		texture.needsUpdate = true;

		return texture;
	};

	static getMousePointCloudIntersection (mouse, camera, viewer, pointclouds, params = {}) {
		
		let renderer = viewer.renderer;
		
		let nmouse = {
			x: (mouse.x / renderer.domElement.clientWidth) * 2 - 1,
			y: -(mouse.y / renderer.domElement.clientHeight) * 2 + 1
		};

		let pickParams = {};

		if(params.pickClipped){
			pickParams.pickClipped = params.pickClipped;
		}

		pickParams.x = mouse.x;
		pickParams.y = renderer.domElement.clientHeight - mouse.y;

		let raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(nmouse, camera);
		let ray = raycaster.ray;

		let selectedPointcloud = null;
		let closestDistance = Infinity;
		let closestIntersection = null;
		let closestPoint = null;
		
		for(let pointcloud of pointclouds){
			let point = pointcloud.pick(viewer, camera, ray, pickParams);
			
			if(!point){
				continue;
			}

			let distance = camera.position.distanceTo(point.position);

			if (distance < closestDistance) {
				closestDistance = distance;
				selectedPointcloud = pointcloud;
				closestIntersection = point.position;
				closestPoint = point;
			}
		}

		if (selectedPointcloud) {
			return {
				location: closestIntersection,
				distance: closestDistance,
				pointcloud: selectedPointcloud,
				point: closestPoint
			};
		} else {
			return null;
		}
	};

	static pixelsArrayToImage (pixels, width, height) {
		let canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		let context = canvas.getContext('2d');

		pixels = new pixels.constructor(pixels);

		for (let i = 0; i < pixels.length; i++) {
			pixels[i * 4 + 3] = 255;
		}

		let imageData = context.createImageData(width, height);
		imageData.data.set(pixels);
		context.putImageData(imageData, 0, 0);

		let img = new Image();
		img.src = canvas.toDataURL();
		// img.style.transform = "scaleY(-1)";

		return img;
	};

	static pixelsArrayToDataUrl(pixels, width, height) {
		let canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		let context = canvas.getContext('2d');

		pixels = new pixels.constructor(pixels);

		for (let i = 0; i < pixels.length; i++) {
			pixels[i * 4 + 3] = 255;
		}

		let imageData = context.createImageData(width, height);
		imageData.data.set(pixels);
		context.putImageData(imageData, 0, 0);

		let dataURL = canvas.toDataURL();

		return dataURL;
	};

	static pixelsArrayToCanvas(pixels, width, height){
		let canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		let context = canvas.getContext('2d');

		pixels = new pixels.constructor(pixels);

		//for (let i = 0; i < pixels.length; i++) {
		//	pixels[i * 4 + 3] = 255;
		//}

		// flip vertically
		let bytesPerLine = width * 4;
		for(let i = 0; i < parseInt(height / 2); i++){
			let j = height - i - 1;

			let lineI = pixels.slice(i * bytesPerLine, i * bytesPerLine + bytesPerLine);
			let lineJ = pixels.slice(j * bytesPerLine, j * bytesPerLine + bytesPerLine);
			pixels.set(lineJ, i * bytesPerLine);
			pixels.set(lineI, j * bytesPerLine);
		}

		let imageData = context.createImageData(width, height);
		imageData.data.set(pixels);
		context.putImageData(imageData, 0, 0);

		return canvas;
	};

	static removeListeners(dispatcher, type){
		if (dispatcher._listeners === undefined) {
			return;
		}

		if (dispatcher._listeners[ type ]) {
			delete dispatcher._listeners[ type ];
		}
	}

	static mouseToRay(mouse, camera, width, height){

		let normalizedMouse = {
			x: (mouse.x / width) * 2 - 1,
			y: -(mouse.y / height) * 2 + 1
		};

		let vector = new THREE.Vector3(normalizedMouse.x, normalizedMouse.y, 0.5);
		let origin = new THREE.Vector3(normalizedMouse.x, normalizedMouse.y, 0);
		vector.unproject(camera);
		origin.unproject(camera);
		let direction = new THREE.Vector3().subVectors(vector, origin).normalize();

		let ray = new THREE.Ray(origin, direction);

		return ray;
	}

	static projectedRadius(radius, camera, distance, screenWidth, screenHeight){
		if(camera instanceof THREE.OrthographicCamera){
			return Potree.utils.projectedRadiusOrtho(radius, camera.projectionMatrix, screenWidth, screenHeight);
		}else if(camera instanceof THREE.PerspectiveCamera){
			return Potree.utils.projectedRadiusPerspective(radius, camera.fov * Math.PI / 180, distance, screenHeight);
		}else{
			throw new Error("invalid parameters");
		}
	}

	static projectedRadiusPerspective(radius, fov, distance, screenHeight) {
		let projFactor = (1 / Math.tan(fov / 2)) / distance;
		projFactor = projFactor * screenHeight / 2;

		return radius * projFactor;
	};

	static projectedRadiusOrtho(radius, proj, screenWidth, screenHeight) {
		let p1 = new THREE.Vector4(0);
		let p2 = new THREE.Vector4(radius);

		p1.applyMatrix4(proj);
		p2.applyMatrix4(proj);
		p1 = new THREE.Vector3(p1.x, p1.y, p1.z);
		p2 = new THREE.Vector3(p2.x, p2.y, p2.z);
		p1.x = (p1.x + 1.0) * 0.5 * screenWidth;
		p1.y = (p1.y + 1.0) * 0.5 * screenHeight;
		p2.x = (p2.x + 1.0) * 0.5 * screenWidth;
		p2.y = (p2.y + 1.0) * 0.5 * screenHeight;
		return p1.distanceTo(p2);
	}
		
		
	static topView(camera, node){
		camera.position.set(0, 1, 0);
		camera.rotation.set(-Math.PI / 2, 0, 0);
		camera.zoomTo(node, 1);
	};

	static frontView (camera, node) {
		camera.position.set(0, 0, 1);
		camera.rotation.set(0, 0, 0);
		camera.zoomTo(node, 1);
	};

	static leftView (camera, node) {
		camera.position.set(-1, 0, 0);
		camera.rotation.set(0, -Math.PI / 2, 0);
		camera.zoomTo(node, 1);
	};

	static rightView (camera, node) {
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
	static frustumSphereIntersection (frustum, sphere) {
		let planes = frustum.planes;
		let center = sphere.center;
		let negRadius = -sphere.radius;

		let minDistance = Number.MAX_VALUE;

		for (let i = 0; i < 6; i++) {
			let distance = planes[ i ].distanceToPoint(center);

			if (distance < negRadius) {
				return 0;
			}

			minDistance = Math.min(minDistance, distance);
		}

		return (minDistance >= sphere.radius) ? 2 : 1;
	};

	// code taken from three.js
	// ImageUtils - generateDataTexture()
	static generateDataTexture (width, height, color) {
		let size = width * height;
		let data = new Uint8Array(4 * width * height);

		let r = Math.floor(color.r * 255);
		let g = Math.floor(color.g * 255);
		let b = Math.floor(color.b * 255);

		for (let i = 0; i < size; i++) {
			data[ i * 3 ] = r;
			data[ i * 3 + 1 ] = g;
			data[ i * 3 + 2 ] = b;
		}

		let texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
		texture.needsUpdate = true;
		texture.magFilter = THREE.NearestFilter;

		return texture;
	};

	// from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
	static getParameterByName (name) {
		name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
		let regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
		let results = regex.exec(document.location.search);
		return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
	}

	static setParameter (name, value) {
		// value = encodeURIComponent(value);

		name = name.replace(/[[]/, '\\[').replace(/[\]]/, '\\]');
		let regex = new RegExp('([\\?&])(' + name + '=([^&#]*))');
		let results = regex.exec(document.location.search);

		let url = window.location.href;
		if (results === null) {
			if (window.location.search.length === 0) {
				url = url + '?';
			} else {
				url = url + '&';
			}

			url = url + name + '=' + value;
		} else {
			let newValue = name + '=' + value;
			url = url.replace(results[2], newValue);
		}
		window.history.replaceState({}, '', url);
	}

	// see https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript
	static clipboardCopy(text){
		let textArea = document.createElement("textarea");

		textArea.style.position = 'fixed';
		textArea.style.top = 0;
		textArea.style.left = 0;

		textArea.style.width = '2em';
		textArea.style.height = '2em';

		textArea.style.padding = 0;

		textArea.style.border = 'none';
		textArea.style.outline = 'none';
		textArea.style.boxShadow = 'none';

		textArea.style.background = 'transparent';

		textArea.value = text;

		document.body.appendChild(textArea);

		textArea.select();

		 try {
			let success = document.execCommand('copy');
			if(success){
				console.log("copied text to clipboard");
			}else{
				console.log("copy to clipboard failed");
			}
		} catch (err) {
			console.log("error while trying to copy to clipboard");
		}

		document.body.removeChild(textArea);

	}
};

Potree.utils.screenPass = new function () {
	this.screenScene = new THREE.Scene();
	this.screenQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 0));
	this.screenQuad.material.depthTest = true;
	this.screenQuad.material.depthWrite = true;
	this.screenQuad.material.transparent = true;
	this.screenScene.add(this.screenQuad);
	this.camera = new THREE.Camera();

	this.render = function (renderer, material, target) {
		this.screenQuad.material = material;

		if (typeof target === 'undefined') {
			renderer.render(this.screenScene, this.camera);
		} else {
			renderer.render(this.screenScene, this.camera, target);
		}
	};
}();


Potree.Features = (function () {
	let ftCanvas = document.createElement('canvas');
	let gl = ftCanvas.getContext('webgl') || ftCanvas.getContext('experimental-webgl');
	if (gl === null)		{ return null; }

	// -- code taken from THREE.WebGLRenderer --
	let _vertexShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
	let _vertexShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT);
	// Unused: let _vertexShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.LOW_FLOAT);

	let _fragmentShaderPrecisionHighpFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
	let _fragmentShaderPrecisionMediumpFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
	// Unused: let _fragmentShaderPrecisionLowpFloat = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.LOW_FLOAT);

	let highpAvailable = _vertexShaderPrecisionHighpFloat.precision > 0 && _fragmentShaderPrecisionHighpFloat.precision > 0;
	let mediumpAvailable = _vertexShaderPrecisionMediumpFloat.precision > 0 && _fragmentShaderPrecisionMediumpFloat.precision > 0;
	// -----------------------------------------

	let precision;
	if (highpAvailable) {
		precision = 'highp';
	} else if (mediumpAvailable) {
		precision = 'mediump';
	} else {
		precision = 'lowp';
	}

	return {
		SHADER_INTERPOLATION: {
			isSupported: function () {
				let supported = true;

				supported = supported && gl.getExtension('EXT_frag_depth');
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

				return supported;
			}
		},
		SHADER_SPLATS: {
			isSupported: function () {
				let supported = true;

				supported = supported && gl.getExtension('EXT_frag_depth');
				supported = supported && gl.getExtension('OES_texture_float');
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

				return supported;
			}

		},
		SHADER_EDL: {
			isSupported: function () {
				let supported = true;

				//supported = supported && gl.getExtension('EXT_frag_depth');
				supported = supported && gl.getExtension('OES_texture_float');
				supported = supported && gl.getParameter(gl.MAX_VARYING_VECTORS) >= 8;

				return supported;
			}

		},
		precision: precision
	};
}());

/**
 * adapted from http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
 */

Potree.TextSprite = class TextSprite extends THREE.Object3D{
	
	constructor(text){
		super();

		let texture = new THREE.Texture();
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		let spriteMaterial = new THREE.SpriteMaterial({
			map: texture,
			depthTest: false,
			depthWrite: false});

		this.material = spriteMaterial;
		this.sprite = new THREE.Sprite(spriteMaterial);
		this.add(this.sprite);

		this.borderThickness = 4;
		this.fontface = 'Arial';
		this.fontsize = 28;
		this.borderColor = { r: 0, g: 0, b: 0, a: 1.0 };
		this.backgroundColor = { r: 255, g: 255, b: 255, a: 1.0 };
		this.textColor = {r: 255, g: 255, b: 255, a: 1.0};
		this.text = '';

		this.setText(text);
	}

	setText(text){
		if (this.text !== text){
			this.text = text;

			this.update();
		}
	};

	setTextColor(color){
		this.textColor = color;

		this.update();
	};

	setBorderColor(color){
		this.borderColor = color;

		this.update();
	};

	setBackgroundColor(color){
		this.backgroundColor = color;

		this.update();
	};

	update(){
		let canvas = document.createElement('canvas');
		let context = canvas.getContext('2d');
		context.font = 'Bold ' + this.fontsize + 'px ' + this.fontface;

		// get size data (height depends only on font size)
		let metrics = context.measureText(this.text);
		let textWidth = metrics.width;
		let margin = 5;
		let spriteWidth = 2 * margin + textWidth + 2 * this.borderThickness;
		let spriteHeight = this.fontsize * 1.4 + 2 * this.borderThickness;

		context.canvas.width = spriteWidth;
		context.canvas.height = spriteHeight;
		context.font = 'Bold ' + this.fontsize + 'px ' + this.fontface;

		// background color
		context.fillStyle = 'rgba(' + this.backgroundColor.r + ',' + this.backgroundColor.g + ',' +
			this.backgroundColor.b + ',' + this.backgroundColor.a + ')';
		// border color
		context.strokeStyle = 'rgba(' + this.borderColor.r + ',' + this.borderColor.g + ',' +
			this.borderColor.b + ',' + this.borderColor.a + ')';

		context.lineWidth = this.borderThickness;
		this.roundRect(context, this.borderThickness / 2, this.borderThickness / 2,
			textWidth + this.borderThickness + 2 * margin, this.fontsize * 1.4 + this.borderThickness, 6);

		// text color
		context.strokeStyle = 'rgba(0, 0, 0, 1.0)';
		context.strokeText(this.text, this.borderThickness + margin, this.fontsize + this.borderThickness);

		context.fillStyle = 'rgba(' + this.textColor.r + ',' + this.textColor.g + ',' +
			this.textColor.b + ',' + this.textColor.a + ')';
		context.fillText(this.text, this.borderThickness + margin, this.fontsize + this.borderThickness);

		let texture = new THREE.Texture(canvas);
		texture.minFilter = THREE.LinearFilter;
		texture.magFilter = THREE.LinearFilter;
		texture.needsUpdate = true;

		this.sprite.material.map = texture;

		this.sprite.scale.set(spriteWidth * 0.01, spriteHeight * 0.01, 1.0);
	};

	roundRect(ctx, x, y, w, h, r){
		ctx.beginPath();
		ctx.moveTo(x + r, y);
		ctx.lineTo(x + w - r, y);
		ctx.quadraticCurveTo(x + w, y, x + w, y + r);
		ctx.lineTo(x + w, y + h - r);
		ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
		ctx.lineTo(x + r, y + h);
		ctx.quadraticCurveTo(x, y + h, x, y + h - r);
		ctx.lineTo(x, y + r);
		ctx.quadraticCurveTo(x, y, x + r, y);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	};

};





Potree.PathAnimation = class{
	
	constructor(path, start, end, speed, callback){
			this.path = path;
			this.length = this.path.spline.getLength();
			this.speed = speed;
			this.callback = callback;
			this.tween = null;
			this.startPoint = Math.max(start, 0);
			this.endPoint = Math.min(end, this.length);
			this.t = 0.0;
	}

	start(resume = false){
		if(this.tween){
			this.tween.stop();
			this.tween = null;
		}
	
		let tStart;
		if(resume){
			tStart = this.t;
		}else{
			tStart = this.startPoint / this.length;
		}
		let tEnd = this.endPoint / this.length;
		let animationDuration = (tEnd - tStart) * this.length * 1000 / this.speed;
	
		let progress = {t: tStart};
		this.tween = new TWEEN.Tween(progress).to({t: tEnd}, animationDuration);
		this.tween.easing(TWEEN.Easing.Linear.None);
		this.tween.onUpdate((e) => {
			this.t = progress.t;
			this.callback(progress.t);
		});
		this.tween.onComplete(() => {
			if(this.repeat){
				this.start();
			}
		});

		setTimeout(() => {
			this.tween.start();
		}, 0);
	}

	stop(){
		if(!this.tween){
			return;
		}
		this.tween.stop();
		this.tween = null;
		this.t = 0;
	}

	pause(){
		if(!this.tween){
			return;
		}
		
		this.tween.stop();
		TWEEN.remove(this.tween);
		this.tween = null;
	}

	resume(){
		this.start(true);
	}

	getPoint(t){
		return this.path.spline.getPoint(t);
	}


};

Potree.AnimationPath = class {
	constructor (points = []) {
		this.points = points;
		this.spline = new THREE.CatmullRomCurve3(points);
		//this.spline.reparametrizeByArcLength(1 / this.spline.getLength().total);
	}

	get (t) {
		return this.spline.getPoint(t);
	}

	getLength () {
		return this.spline.getLength();
	}

	animate (start, end, speed, callback) {
		let animation = new Potree.PathAnimation(this, start, end, speed, callback);
		animation.start();

		return animation;
	}

	pause () {
		if (this.tween) {
			this.tween.stop();
		}
	}

	resume () {
		if (this.tween) {
			this.tween.start();
		}
	}

	getGeometry () {
		let geometry = new THREE.Geometry();

		let samples = 500;
		let i = 0;
		for (let u = 0; u <= 1; u += 1 / samples) {
			let position = this.spline.getPoint(u);
			geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);

			i++;
		}

		if(this.closed){
			let position = this.spline.getPoint(0);
			geometry.vertices[i] = new THREE.Vector3(position.x, position.y, position.z);
		}

		return geometry;
	}

	get closed(){
		return this.spline.closed;
	}

	set closed(value){
		this.spline.closed = value;
	}
};
	
	/*
	{
		let target = new THREE.Vector3(589854.34, 231411.19, 692.77);
		let points = [
			new THREE.Vector3(589815.52, 231738.31, 959.48 ),
			new THREE.Vector3(589604.73, 231615.00, 968.10 ),
			new THREE.Vector3(589579.11, 231354.41, 1010.06),
			new THREE.Vector3(589723.00, 231169.95, 1015.57),
			new THREE.Vector3(589960.76, 231116.87, 978.60 ),
			new THREE.Vector3(590139.29, 231268.71, 972.33 )
		];
	
		let path = new Potree.AnimationPath(points);
	
		let geometry = path.getGeometry();
		let material = new THREE.LineBasicMaterial();
		let line = new THREE.Line(geometry, material);
		viewer.scene.scene.add(line);
	
		let [start, end, speed] = [0, path.getLength(), 10];
		path.animate(start, end, speed, t => {
			viewer.scene.view.position.copy(path.spline.getPoint(t));
		});
	
	}
	*/
	

Potree.Version = function (version) {
	this.version = version;
	let vmLength = (version.indexOf('.') === -1) ? version.length : version.indexOf('.');
	this.versionMajor = parseInt(version.substr(0, vmLength));
	this.versionMinor = parseInt(version.substr(vmLength + 1));
	if (this.versionMinor.length === 0) {
		this.versionMinor = 0;
	}
};

Potree.Version.prototype.newerThan = function (version) {
	let v = new Potree.Version(version);

	if (this.versionMajor > v.versionMajor) {
		return true;
	} else if (this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor) {
		return true;
	} else {
		return false;
	}
};

Potree.Version.prototype.equalOrHigher = function (version) {
	let v = new Potree.Version(version);

	if (this.versionMajor > v.versionMajor) {
		return true;
	} else if (this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor) {
		return true;
	} else {
		return false;
	}
};

Potree.Version.prototype.upTo = function (version) {
	return !this.newerThan(version);
};


Potree.Measure = class Measure extends THREE.Object3D {
	constructor () {
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;

		this.name = 'Measure_' + this.constructor.counter;
		this.points = [];
		this._showDistances = true;
		this._showCoordinates = false;
		this._showArea = false;
		this._closed = true;
		this._showAngles = false;
		this._showHeight = false;
		this.maxMarkers = Number.MAX_SAFE_INTEGER;

		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		this.color = new THREE.Color(0xff0000);

		this.lengthUnit = {code: 'm'};

		this.spheres = [];
		this.edges = [];
		this.sphereLabels = [];
		this.edgeLabels = [];
		this.angleLabels = [];
		this.coordinateLabels = [];

		// this.heightEdge;
		// this.heightLabel;
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
					{ color: 0xff0000, dashSize: 5, gapSize: 2 });

				lineMaterial.depthTest = false;
				this.heightEdge = new THREE.Line(lineGeometry, lineMaterial);
				this.heightEdge.visible = false;

				this.add(this.heightEdge);
			}

			{ // height label
				this.heightLabel = new Potree.TextSprite('');
				this.heightLabel.setBorderColor({r: 0, g: 0, b: 0, a: 0.8});
				this.heightLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 0.3});
				this.heightLabel.setTextColor({r: 180, g: 220, b: 180, a: 1.0});
				this.heightLabel.material.depthTest = false;
				this.heightLabel.material.opacity = 1;
				this.heightLabel.visible = false; ;
				this.add(this.heightLabel);
			}
		}

		this.areaLabel = new Potree.TextSprite('');
		this.areaLabel.setBorderColor({r: 0, g: 0, b: 0, a: 0.8});
		this.areaLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 0.3});
		this.areaLabel.setTextColor({r: 180, g: 220, b: 180, a: 1.0});
		this.areaLabel.material.depthTest = false;
		this.areaLabel.material.opacity = 1;
		this.areaLabel.visible = false; ;
		this.add(this.areaLabel);
	}

	createSphereMaterial () {
		let sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading,
			color: this.color,
			depthTest: false,
			depthWrite: false}
		);

		return sphereMaterial;
	};

	addMarker (point) {
		if (point instanceof THREE.Vector3) {
			point = {position: point};
		}else if(point instanceof Array){
			point = {position: new THREE.Vector3(...point)};
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
			let lineMaterial = new THREE.LineBasicMaterial({
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
			edgeLabel.setBorderColor({r: 0, g: 0, b: 0, a: 0.8});
			edgeLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 0.3});
			edgeLabel.material.depthTest = false;
			edgeLabel.visible = false;
			this.edgeLabels.push(edgeLabel);
			this.add(edgeLabel);
		}

		{ // angle labels
			let angleLabel = new Potree.TextSprite();
			angleLabel.setBorderColor({r: 0, g: 0, b: 0, a: 0.8});
			angleLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 0.3});
			angleLabel.material.depthTest = false;
			angleLabel.material.opacity = 1;
			angleLabel.visible = false;
			this.angleLabels.push(angleLabel);
			this.add(angleLabel);
		}

		{ // coordinate labels
			let coordinateLabel = new Potree.TextSprite();
			coordinateLabel.setBorderColor({r: 0, g: 0, b: 0, a: 0.8});
			coordinateLabel.setBackgroundColor({r: 0, g: 0, b: 0, a: 0.3});
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
					e.viewer.scene.getActiveCamera(), 
					e.viewer, 
					e.viewer.scene.pointclouds,
					{pickClipped: true});

				if (I) {
					let i = this.spheres.indexOf(e.drag.object);
					if (i !== -1) {
						let point = this.points[i];
						for (let key of Object.keys(I.point).filter(e => e !== 'position')) {
							point[key] = I.point[key];
						}

						this.setPosition(i, I.location);
					}
				}
			};

			let drop = e => {
				let i = this.spheres.indexOf(e.drag.object);
				if (i !== -1) {
					this.dispatchEvent({
						'type': 'marker_dropped',
						'measurement': this,
						'index': i
					});
				}
			};

			let mouseover = (e) => e.object.material.emissive.setHex(0x888888);
			let mouseleave = (e) => e.object.material.emissive.setHex(0x000000);

			sphere.addEventListener('drag', drag);
			sphere.addEventListener('drop', drop);
			sphere.addEventListener('mouseover', mouseover);
			sphere.addEventListener('mouseleave', mouseleave);
		}

		let event = {
			type: 'marker_added',
			measurement: this,
			sphere: sphere
		};
		this.dispatchEvent(event);

		this.setMarker(this.points.length - 1, point);
	};

	removeMarker (index) {
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

		this.dispatchEvent({type: 'marker_removed', measurement: this});
	};

	setMarker (index, point) {
		this.points[index] = point;

		let event = {
			type: 'marker_moved',
			measure:	this,
			index:	index,
			position: point.position.clone()
		};
		this.dispatchEvent(event);

		this.update();
	}

	setPosition (index, position) {
		let point = this.points[index];
		point.position.copy(position);

		let event = {
			type: 'marker_moved',
			measure:	this,
			index:	index,
			position: position.clone()
		};
		this.dispatchEvent(event);

		this.update();
	};

	getArea () {
		let area = 0;
		let j = this.points.length - 1;

		for (let i = 0; i < this.points.length; i++) {
			let p1 = this.points[i].position;
			let p2 = this.points[j].position;
			area += (p2.x + p1.x) * (p1.y - p2.y);
			j = i;
		}

		return Math.abs(area / 2);
	};

	getTotalDistance () {
		if (this.points.length === 0) {
			return 0;
		}

		let distance = 0;

		for (let i = 1; i < this.points.length; i++) {
			let prev = this.points[i - 1].position;
			let curr = this.points[i].position;
			let d = prev.distanceTo(curr);

			distance += d;
		}

		if (this.closed && this.points.length > 1) {
			let first = this.points[0].position;
			let last = this.points[this.points.length - 1].position;
			let d = last.distanceTo(first);

			distance += d;
		}

		return distance;
	}

	getAngleBetweenLines (cornerPoint, point1, point2) {
		let v1 = new THREE.Vector3().subVectors(point1.position, cornerPoint.position);
		let v2 = new THREE.Vector3().subVectors(point2.position, cornerPoint.position);
		return v1.angleTo(v2);
	};

	getAngle (index) {
		if (this.points.length < 3 || index >= this.points.length) {
			return 0;
		}

		let previous = (index === 0) ? this.points[this.points.length - 1] : this.points[index - 1];
		let point = this.points[index];
		let next = this.points[(index + 1) % (this.points.length)];

		return this.getAngleBetweenLines(point, previous, next);
	};

	update () {
		if (this.points.length === 0) {
			return;
		} else if (this.points.length === 1) {
			let point = this.points[0];
			let position = point.position;
			this.spheres[0].position.copy(position);

			{ // coordinate labels
				let coordinateLabel = this.coordinateLabels[0];
				
				let msg = position.toArray().map(p => Potree.utils.addCommas(p.toFixed(2))).join(", ");
				//let msg = Potree.utils.addCommas(position.z.toFixed(2) + " " + this.lengthUnit.code);
				coordinateLabel.setText(msg);

				coordinateLabel.visible = this.showCoordinates;
			}

			return;
		}

		let lastIndex = this.points.length - 1;

		let centroid = new THREE.Vector3();
		for (let i = 0; i <= lastIndex; i++) {
			let point = this.points[i];
			centroid.add(point.position);
		}
		centroid.divideScalar(this.points.length);

		for (let i = 0; i <= lastIndex; i++) {
			let index = i;
			let nextIndex = (i + 1 > lastIndex) ? 0 : i + 1;
			let previousIndex = (i === 0) ? lastIndex : i - 1;

			let point = this.points[index];
			let nextPoint = this.points[nextIndex];
			let previousPoint = this.points[previousIndex];

			let sphere = this.spheres[index];

			// spheres
			sphere.position.copy(point.position);
			sphere.material.color = this.color;

			{ // edges
				let edge = this.edges[index];

				edge.material.color = this.color;

				edge.position.copy(point.position);

				edge.geometry.vertices[0].set(0, 0, 0);
				edge.geometry.vertices[1].copy(nextPoint.position).sub(point.position);

				edge.geometry.verticesNeedUpdate = true;
				edge.geometry.computeBoundingSphere();
				edge.visible = index < lastIndex || this.closed;
			}

			{ // edge labels
				let edgeLabel = this.edgeLabels[i];

				let center = new THREE.Vector3().add(point.position);
				center.add(nextPoint.position);
				center = center.multiplyScalar(0.5);
				let distance = point.position.distanceTo(nextPoint.position);

				edgeLabel.position.copy(center);
				edgeLabel.setText(Potree.utils.addCommas(distance.toFixed(2)) + ' ' + this.lengthUnit.code);
				edgeLabel.visible = this.showDistances && (index < lastIndex || this.closed) && this.points.length >= 2 && distance > 0;
			}

			{ // angle labels
				let angleLabel = this.angleLabels[i];
				let angle = this.getAngleBetweenLines(point, previousPoint, nextPoint);

				let dir = nextPoint.position.clone().sub(previousPoint.position);
				dir.multiplyScalar(0.5);
				dir = previousPoint.position.clone().add(dir).sub(point.position).normalize();

				let dist = Math.min(point.position.distanceTo(previousPoint.position), point.position.distanceTo(nextPoint.position));
				dist = dist / 9;

				let labelPos = point.position.clone().add(dir.multiplyScalar(dist));
				angleLabel.position.copy(labelPos);

				let msg = Potree.utils.addCommas((angle * (180.0 / Math.PI)).toFixed(1)) + '\u00B0';
				angleLabel.setText(msg);

				angleLabel.visible = this.showAngles && (index < lastIndex || this.closed) && this.points.length >= 3 && angle > 0;
			}
		}

		{ // update height stuff
			let heightEdge = this.heightEdge;
			heightEdge.visible = this.showHeight;
			this.heightLabel.visible = this.showHeight;

			if (this.showHeight) {
				let sorted = this.points.slice().sort((a, b) => a.position.z - b.position.z);
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
				// heightEdge.geometry.computeLineDistances();
				// heightEdge.geometry.lineDistancesNeedUpdate = true;
				heightEdge.geometry.computeBoundingSphere();

				// heightEdge.material.dashSize = height / 40;
				// heightEdge.material.gapSize = height / 40;

				let heightLabelPosition = start.clone().add(end).multiplyScalar(0.5);
				this.heightLabel.position.copy(heightLabelPosition);
				let msg = Potree.utils.addCommas(height.toFixed(2)) + ' ' + this.lengthUnit.code;
				this.heightLabel.setText(msg);
			}
		}

		{ // update area label
			this.areaLabel.position.copy(centroid);
			this.areaLabel.visible = this.showArea && this.points.length >= 3;
			let msg = Potree.utils.addCommas(this.getArea().toFixed(1)) + ' ' + this.lengthUnit.code + '\u00B2';
			this.areaLabel.setText(msg);
		}
	};

	raycast (raycaster, intersects) {
		for (let i = 0; i < this.points.length; i++) {
			let sphere = this.spheres[i];

			sphere.raycast(raycaster, intersects);
		}

		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for (let i = 0; i < intersects.length; i++) {
			let I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort(function (a, b) { return a.distance - b.distance; });
	};

	get showCoordinates () {
		return this._showCoordinates;
	}

	set showCoordinates (value) {
		this._showCoordinates = value;
		this.update();
	}

	get showAngles () {
		return this._showAngles;
	}

	set showAngles (value) {
		this._showAngles = value;
		this.update();
	}

	get showHeight () {
		return this._showHeight;
	}

	set showHeight (value) {
		this._showHeight = value;
		this.update();
	}

	get showArea () {
		return this._showArea;
	}

	set showArea (value) {
		this._showArea = value;
		this.update();
	}

	get closed () {
		return this._closed;
	}

	set closed (value) {
		this._closed = value;
		this.update();
	}

	get showDistances () {
		return this._showDistances;
	}

	set showDistances (value) {
		this._showDistances = value;
		this.update();
	}
};


Potree.MeasuringTool = class MeasuringTool extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_measurement', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_measurement';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = (e) => { this.scene.remove(e.measurement);};
		this.onAdd = e => {this.scene.add(e.measurement);};

		for(let measurement of viewer.scene.measurements){
			this.onAdd({measurement: measurement});
		}

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('measurement_added', this.onAdd);
		viewer.scene.addEventListener('measurement_removed', this.onRemove);
	}

	onSceneChange(e){
		if(e.oldScene){
			e.oldScene.removeEventListener('measurement_added', this.onAdd);
			e.oldScene.removeEventListener('measurement_removed', this.onRemove);
		}

		e.scene.addEventListener('measurement_added', this.onAdd);
		e.scene.addEventListener('measurement_removed', this.onRemove);
	}

	startInsertion (args = {}) {
		let domElement = this.viewer.renderer.domElement;

		let measure = new Potree.Measure();

		this.dispatchEvent({
			type: 'start_inserting_measurement',
			measure: measure
		});

		measure.showDistances = (args.showDistances === null) ? true : args.showDistances;
		measure.showArea = args.showArea || false;
		measure.showAngles = args.showAngles || false;
		measure.showCoordinates = args.showCoordinates || false;
		measure.showHeight = args.showHeight || false;
		measure.closed = args.closed || false;
		measure.maxMarkers = args.maxMarkers || Infinity;
		measure.name = args.name || 'Measurement';

		this.scene.add(measure);

		let cancel = {
			removeLastMarker: measure.maxMarkers > 3,
			callback: null
		};

		let insertionCallback = (e) => {
			if (e.button === THREE.MOUSE.LEFT) {
				measure.addMarker(measure.points[measure.points.length - 1].position.clone());

				if (measure.points.length >= measure.maxMarkers) {
					cancel.callback();
				}

				this.viewer.inputHandler.startDragging(
					measure.spheres[measure.spheres.length - 1]);
			} else if (e.button === THREE.MOUSE.RIGHT) {
				cancel.callback();
			}
		};

		cancel.callback = e => {
			if (cancel.removeLastMarker) {
				measure.removeMarker(measure.points.length - 1);
			}
			domElement.removeEventListener('mouseup', insertionCallback, true);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		if (measure.maxMarkers > 1) {
			this.viewer.addEventListener('cancel_insertions', cancel.callback);
			domElement.addEventListener('mouseup', insertionCallback, true);
		}

		measure.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			measure.spheres[measure.spheres.length - 1]);

		this.viewer.scene.addMeasurement(measure);

		return measure;
	}
	
	update(){
		let camera = this.viewer.scene.getActiveCamera();
		let domElement = this.renderer.domElement;
		let measurements = this.viewer.scene.measurements;

		let clientWidth = this.renderer.getSize().width;
		let clientHeight = this.renderer.getSize().height;

		this.light.position.copy(camera.position);

		// make size independant of distance
		for (let measure of measurements) {
			measure.lengthUnit = this.viewer.lengthUnit;
			measure.update();

			// spheres
			for(let sphere of measure.spheres){			
				let distance = camera.position.distanceTo(sphere.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}

			// labels
			let labels = measure.edgeLabels.concat(measure.angleLabels);
			for(let label of labels){
				let distance = camera.position.distanceTo(label.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			// coordinate labels
			for (let j = 0; j < measure.coordinateLabels.length; j++) {
				let label = measure.coordinateLabels[j];
				let sphere = measure.spheres[j];
				// measure.points[j]

				let distance = camera.position.distanceTo(sphere.getWorldPosition());

				let screenPos = sphere.getWorldPosition().clone().project(camera);
				screenPos.x = Math.round((screenPos.x + 1) * clientWidth / 2);
				screenPos.y = Math.round((-screenPos.y + 1) * clientHeight / 2);
				screenPos.z = 0;
				screenPos.y -= 30;

				let labelPos = new THREE.Vector3( 
					(screenPos.x / clientWidth) * 2 - 1, 
					-(screenPos.y / clientHeight) * 2 + 1, 
					0.5 );
				labelPos.unproject(camera);
				if(this.viewer.scene.cameraMode == Potree.CameraMode.PERSPECTIVE) {
					let direction = labelPos.sub(camera.position).normalize();
					labelPos = new THREE.Vector3().addVectors(
						camera.position, direction.multiplyScalar(distance));

				}
				label.position.copy(labelPos);
				let pr = Potree.utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			// height label
			if (measure.showHeight) {
				let label = measure.heightLabel;

				{
					let distance = label.position.distanceTo(camera.position);
					let pr = Potree.utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
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
						r.x = r.x * clientWidth;
						r.y = r.y * clientHeight;
						r.z = 0;

						return r;
					};

					let lowEL = toPixelCoordinates(lowScreen);
					let startEL = toPixelCoordinates(startScreen);
					let endEL = toPixelCoordinates(endScreen);

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
				let pr = Potree.utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}
		}
	}

	render(){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}
};


Potree.Profile = class extends THREE.Object3D {
	constructor () {
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;

		this.name = 'Profile_' + this.constructor.counter;
		this.points = [];
		this.spheres = [];
		this.edges = [];
		this.boxes = [];
		this.width = 1;
		this.height = 20;
		this._modifiable = true;

		this.sphereGeometry = new THREE.SphereGeometry(0.4, 10, 10);
		this.color = new THREE.Color(0xff0000);
		this.lineColor = new THREE.Color(0xff0000);
	}

	createSphereMaterial () {
		let sphereMaterial = new THREE.MeshLambertMaterial({
			shading: THREE.SmoothShading,
			color: 0xff0000,
			depthTest: false,
			depthWrite: false}
		);

		return sphereMaterial;
	};

	getSegments () {
		let segments = [];

		for (let i = 0; i < this.points.length - 1; i++) {
			let start = this.points[i].clone();
			let end = this.points[i + 1].clone();
			segments.push({start: start, end: end});
		}

		return segments;
	}

	getSegmentMatrices () {
		let segments = this.getSegments();
		let matrices = [];

		for (let segment of segments) {
			let {start, end} = segment;

			let box = new THREE.Object3D();

			let length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
			box.scale.set(length, 10000, this.width);
			box.up.set(0, 0, 1);

			let center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
			let diff = new THREE.Vector3().subVectors(end, start);
			let target = new THREE.Vector3(diff.y, -diff.x, 0);

			box.position.set(0, 0, 0);
			box.lookAt(target);
			box.position.copy(center);

			box.updateMatrixWorld();
			matrices.push(box.matrixWorld);
		}

		return matrices;
	}

	addMarker (point) {
		this.points.push(point);

		let sphere = new THREE.Mesh(this.sphereGeometry, this.createSphereMaterial());

		this.add(sphere);
		this.spheres.push(sphere);

		// edges & boxes
		if (this.points.length > 1) {
			let lineGeometry = new THREE.Geometry();
			lineGeometry.vertices.push(new THREE.Vector3(), new THREE.Vector3());
			lineGeometry.colors.push(this.lineColor, this.lineColor, this.lineColor);
			let lineMaterial = new THREE.LineBasicMaterial({
				vertexColors: THREE.VertexColors,
				linewidth: 2,
				transparent: true,
				opacity: 0.4
			});
			lineMaterial.depthTest = false;
			let edge = new THREE.Line(lineGeometry, lineMaterial);
			edge.visible = false;

			this.add(edge);
			this.edges.push(edge);

			let boxGeometry = new THREE.BoxGeometry(1, 1, 1);
			let boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.2});
			let box = new THREE.Mesh(boxGeometry, boxMaterial);
			box.visible = false;

			this.add(box);
			this.boxes.push(box);
		}

		{ // event listeners
			let drag = (e) => {
				let I = Potree.utils.getMousePointCloudIntersection(
					e.drag.end, 
					e.viewer.scene.getActiveCamera(), 
					e.viewer, 
					e.viewer.scene.pointclouds);

				if (I) {
					let i = this.spheres.indexOf(e.drag.object);
					if (i !== -1) {
						this.setPosition(i, I.location);
						//this.dispatchEvent({
						//	'type': 'marker_moved',
						//	'profile': this,
						//	'index': i
						//});
					}
				}
			};

			let drop = e => {
				let i = this.spheres.indexOf(e.drag.object);
				if (i !== -1) {
					this.dispatchEvent({
						'type': 'marker_dropped',
						'profile': this,
						'index': i
					});
				}
			};

			let mouseover = (e) => e.object.material.emissive.setHex(0x888888);
			let mouseleave = (e) => e.object.material.emissive.setHex(0x000000);

			sphere.addEventListener('drag', drag);
			sphere.addEventListener('drop', drop);
			sphere.addEventListener('mouseover', mouseover);
			sphere.addEventListener('mouseleave', mouseleave);
		}

		let event = {
			type: 'marker_added',
			profile: this,
			sphere: sphere
		};
		this.dispatchEvent(event);

		this.setPosition(this.points.length - 1, point);
	}

	removeMarker (index) {
		this.points.splice(index, 1);

		this.remove(this.spheres[index]);

		let edgeIndex = (index === 0) ? 0 : (index - 1);
		this.remove(this.edges[edgeIndex]);
		this.edges.splice(edgeIndex, 1);
		this.remove(this.boxes[edgeIndex]);
		this.boxes.splice(edgeIndex, 1);

		this.spheres.splice(index, 1);

		this.update();

		this.dispatchEvent({
			'type': 'marker_removed',
			'profile': this
		});
	}

	setPosition (index, position) {
		let point = this.points[index];
		point.copy(position);

		let event = {
			type: 'marker_moved',
			profile:	this,
			index:	index,
			position: point.clone()
		};
		this.dispatchEvent(event);

		this.update();
	}

	setWidth (width) {
		this.width = width;

		let event = {
			type: 'width_changed',
			profile:	this,
			width:	width
		};
		this.dispatchEvent(event);

		this.update();
	}

	getWidth () {
		return this.width;
	}

	update () {
		if (this.points.length === 0) {
			return;
		} else if (this.points.length === 1) {
			let point = this.points[0];
			this.spheres[0].position.copy(point);

			return;
		}

		let min = this.points[0].clone();
		let max = this.points[0].clone();
		let centroid = new THREE.Vector3();
		let lastIndex = this.points.length - 1;
		for (let i = 0; i <= lastIndex; i++) {
			let point = this.points[i];
			let sphere = this.spheres[i];
			let leftIndex = (i === 0) ? lastIndex : i - 1;
			// let rightIndex = (i === lastIndex) ? 0 : i + 1;
			let leftVertex = this.points[leftIndex];
			// let rightVertex = this.points[rightIndex];
			let leftEdge = this.edges[leftIndex];
			let rightEdge = this.edges[i];
			let leftBox = this.boxes[leftIndex];
			// rightBox = this.boxes[i];

			// let leftEdgeLength = point.distanceTo(leftVertex);
			// let rightEdgeLength = point.distanceTo(rightVertex);
			// let leftEdgeCenter = new THREE.Vector3().addVectors(leftVertex, point).multiplyScalar(0.5);
			// let rightEdgeCenter = new THREE.Vector3().addVectors(point, rightVertex).multiplyScalar(0.5);

			sphere.position.copy(point);

			if (this._modifiable) {
				sphere.visible = true;
			} else {
				sphere.visible = false;
			}

			if (leftEdge) {
				leftEdge.geometry.vertices[1].copy(point);
				leftEdge.geometry.verticesNeedUpdate = true;
				leftEdge.geometry.computeBoundingSphere();
			}

			if (rightEdge) {
				rightEdge.geometry.vertices[0].copy(point);
				rightEdge.geometry.verticesNeedUpdate = true;
				rightEdge.geometry.computeBoundingSphere();
			}

			if (leftBox) {
				let start = leftVertex;
				let end = point;
				let length = start.clone().setZ(0).distanceTo(end.clone().setZ(0));
				leftBox.scale.set(length, 1000000, this.width);
				leftBox.up.set(0, 0, 1);

				let center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
				let diff = new THREE.Vector3().subVectors(end, start);
				let target = new THREE.Vector3(diff.y, -diff.x, 0);

				leftBox.position.set(0, 0, 0);
				leftBox.lookAt(target);
				leftBox.position.copy(center);
			}

			centroid.add(point);
			min.min(point);
			max.max(point);
		}
		centroid.multiplyScalar(1 / this.points.length);

		for (let i = 0; i < this.boxes.length; i++) {
			let box = this.boxes[i];

			box.position.z = min.z + (max.z - min.z) / 2;
		}
	}

	raycast (raycaster, intersects) {
		for (let i = 0; i < this.points.length; i++) {
			let sphere = this.spheres[i];

			sphere.raycast(raycaster, intersects);
		}

		// recalculate distances because they are not necessarely correct
		// for scaled objects.
		// see https://github.com/mrdoob/three.js/issues/5827
		// TODO: remove this once the bug has been fixed
		for (let i = 0; i < intersects.length; i++) {
			let I = intersects[i];
			I.distance = raycaster.ray.origin.distanceTo(I.point);
		}
		intersects.sort(function (a, b) { return a.distance - b.distance; });
	};

	get modifiable () {
		return this._modifiable;
	}

	set modifiable (value) {
		this._modifiable = value;
		this.update();
	}
};


Potree.ProfileTool = class ProfileTool extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_profile', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_profile';
		this.light = new THREE.PointLight(0xffffff, 1.0);
		this.scene.add(this.light);

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = e => this.scene.remove(e.profile);
		this.onAdd = e => this.scene.add(e.profile);

		for(let profile of viewer.scene.profiles){
			this.onAdd({profile: profile});
		}

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('profile_added', this.onAdd);
		viewer.scene.addEventListener('profile_removed', this.onRemove);
	}

	onSceneChange(e){
		if(e.oldScene){
			e.oldScene.removeEventListeners('profile_added', this.onAdd);
			e.oldScene.removeEventListeners('profile_removed', this.onRemove);
		}

		e.scene.addEventListener('profile_added', this.onAdd);
		e.scene.addEventListener('profile_removed', this.onRemove);
	}

	startInsertion (args = {}) {
		let domElement = this.viewer.renderer.domElement;

		let profile = new Potree.Profile();
		profile.name = args.name || 'Profile';

		this.dispatchEvent({
			type: 'start_inserting_profile',
			profile: profile
		});

		this.scene.add(profile);

		let cancel = {
			callback: null
		};

		let insertionCallback = (e) => {
			if(e.button === THREE.MOUSE.LEFT){
				if(profile.points.length <= 1){
					let camera = this.viewer.scene.getActiveCamera();
					let distance = camera.position.distanceTo(profile.points[0]);
					let clientSize = this.viewer.renderer.getSize();
					let pr = Potree.utils.projectedRadius(1, camera, distance, clientSize.width, clientSize.height);
					let width = (10 / pr);

					profile.setWidth(width);
				}

				profile.addMarker(profile.points[profile.points.length - 1].clone());

				this.viewer.inputHandler.startDragging(
					profile.spheres[profile.spheres.length - 1]);
			} else if (e.button === THREE.MOUSE.RIGHT) {
				cancel.callback();
			}
		};

		cancel.callback = e => {
			profile.removeMarker(profile.points.length - 1);
			domElement.removeEventListener('mouseup', insertionCallback, true);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		this.viewer.addEventListener('cancel_insertions', cancel.callback);
		domElement.addEventListener('mouseup', insertionCallback, true);

		profile.addMarker(new THREE.Vector3(0, 0, 0));
		this.viewer.inputHandler.startDragging(
			profile.spheres[profile.spheres.length - 1]);

		this.viewer.scene.addProfile(profile);

		return profile;
	}
	
	update(){
		let camera = this.viewer.scene.getActiveCamera();
		let profiles = this.viewer.scene.profiles;
		let clientWidth = this.renderer.getSize().width;
		let clientHeight = this.renderer.getSize().height;

		this.light.position.copy(camera.position);

		// make size independant of distance
		for(let profile of profiles){
			for(let sphere of profile.spheres){				
				let distance = camera.position.distanceTo(sphere.getWorldPosition());
				let pr = Potree.utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);
				let scale = (15 / pr);
				sphere.scale.set(scale, scale, scale);
			}
		}
	}

	render(){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}
};



Potree.TransformationTool = class TransformationTool {
	constructor(viewer) {
		this.viewer = viewer;

		this.scene = new THREE.Scene();

		this.selection = [];
		this.pivot = new THREE.Vector3();
		this.dragging = false;
		this.showPickVolumes = false;

		this.viewer.inputHandler.registerInteractiveScene(this.scene);
		this.viewer.inputHandler.addEventListener('selection_changed', (e) => {
			for(let selected of this.selection){
				this.viewer.inputHandler.blacklist.delete(selected);
			}

			this.selection = e.selection;

			for(let selected of this.selection){
				this.viewer.inputHandler.blacklist.add(selected);
			}

		});

		let red = 0xE73100;
		let green = 0x44A24A;
		let blue = 0x2669E7;
		
		this.activeHandle = null;
		this.scaleHandles = {
			"scale.x+": {name: "scale.x+", node: new THREE.Object3D(), color: red, alignment: [+1, +0, +0]},
			"scale.x-": {name: "scale.x-", node: new THREE.Object3D(), color: red, alignment: [-1, +0, +0]},
			"scale.y+": {name: "scale.y+", node: new THREE.Object3D(), color: green, alignment: [+0, +1, +0]},
			"scale.y-": {name: "scale.y-", node: new THREE.Object3D(), color: green, alignment: [+0, -1, +0]},
			"scale.z+": {name: "scale.z+", node: new THREE.Object3D(), color: blue, alignment: [+0, +0, +1]},
			"scale.z-": {name: "scale.z-", node: new THREE.Object3D(), color: blue, alignment: [+0, +0, -1]},
		};
		this.focusHandles = {
			"focus.x+": {name: "focus.x+", node:  new THREE.Object3D(), color: red, alignment: [+1, +0, +0]},
			"focus.x-": {name: "focus.x-", node:  new THREE.Object3D(), color: red, alignment: [-1, +0, +0]},
			"focus.y+": {name: "focus.y+", node:  new THREE.Object3D(), color: green, alignment: [+0, +1, +0]},
			"focus.y-": {name: "focus.y-", node:  new THREE.Object3D(), color: green, alignment: [+0, -1, +0]},
			"focus.z+": {name: "focus.z+", node:  new THREE.Object3D(), color: blue, alignment: [+0, +0, +1]},
			"focus.z-": {name: "focus.z-", node:  new THREE.Object3D(), color: blue, alignment: [+0, +0, -1]},
		};
		this.translationHandles = {
			"translation.x": {name: "translation.x", node:  new THREE.Object3D(), color: red, alignment: [1, 0, 0]},
			"translation.y": {name: "translation.y", node:  new THREE.Object3D(), color: green, alignment: [0, 1, 0]},
			"translation.z": {name: "translation.z", node:  new THREE.Object3D(), color: blue, alignment: [0, 0, 1]},
		};
		this.rotationHandles = {
			"rotation.x": {name: "rotation.x", node:  new THREE.Object3D(), color: red, alignment: [1, 0, 0]},
			"rotation.y": {name: "rotation.y", node:  new THREE.Object3D(), color: green, alignment: [0, 1, 0]},
			"rotation.z": {name: "rotation.z", node:  new THREE.Object3D(), color: blue, alignment: [0, 0, 1]},
		};
		this.handles = Object.assign({}, this.scaleHandles, this.focusHandles, this.translationHandles, this.rotationHandles);
		this.pickVolumes = [];

		this.initializeScaleHandles();
		this.initializeFocusHandles();
		this.initializeTranslationHandles();
		this.initializeRotationHandles();


		let boxFrameGeometry = new THREE.Geometry();
		{
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
		this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({color: 0xffff00}));
		this.scene.add(this.frame);

		
	}

	initializeScaleHandles(){
		let sgSphere = new THREE.SphereGeometry(1, 32, 32);
		let sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

		for(let handleName of Object.keys(this.scaleHandles)){
			let handle = this.scaleHandles[handleName];
			let node = handle.node;
			this.scene.add(node);
			node.position.set(...handle.alignment).multiplyScalar(0.5);

			let material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true
				});

			let outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000, 
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true});

			let pickMaterial = new THREE.MeshNormalMaterial({
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes});

			let sphere = new THREE.Mesh(sgSphere, material);
			sphere.scale.set(1.3, 1.3, 1.3);
			sphere.name = `${handleName}.handle`;
			node.add(sphere);
			
			let outline = new THREE.Mesh(sgSphere, outlineMaterial);
			outline.scale.set(1.4, 1.4, 1.4);
			outline.name = `${handleName}.outline`;
			sphere.add(outline);

			let pickSphere = new THREE.Mesh(sgLowPolySphere, pickMaterial);
			pickSphere.name = `${handleName}.pick_volume`;
			pickSphere.scale.set(3, 3, 3);
			sphere.add(pickSphere);
			pickSphere.handle = handleName;
			this.pickVolumes.push(pickSphere);

			node.setOpacity = (target) => {
				let opacity = {x: material.opacity};
				let t = new TWEEN.Tween(opacity).to({x: target}, 100);
				t.onUpdate(() => {
					sphere.visible = opacity.x > 0;
					pickSphere.visible = opacity.x > 0;
					material.opacity = opacity.x;
					outlineMaterial.opacity = opacity.x;
					pickSphere.material.opacity = opacity.x * 0.5;
				});
				t.start();
			};

			pickSphere.addEventListener("drag", (e) => this.dragScaleHandle(e));
			pickSphere.addEventListener("drop", (e) => this.dropScaleHandle(e));

			pickSphere.addEventListener("mouseover", e => {
				//node.setOpacity(1);
			});

			pickSphere.addEventListener("click", e => {
				e.consume();
			});

			pickSphere.addEventListener("mouseleave", e => {
				//node.setOpacity(0.4);
			});
		}
	}

	initializeFocusHandles(){
		//let sgBox = new THREE.BoxGeometry(1, 1, 1);
		let sgPlane = new THREE.PlaneGeometry(4, 4, 1, 1);
		let sgLowPolySphere = new THREE.SphereGeometry(1, 16, 16);

		let texture = new THREE.TextureLoader().load(`${Potree.resourcePath}/icons/eye_2.png`);

		for(let handleName of Object.keys(this.focusHandles)){
			let handle = this.focusHandles[handleName];
			let node = handle.node;
			this.scene.add(node);
			let align = handle.alignment;

			//node.lookAt(new THREE.Vector3().addVectors(node.position, new THREE.Vector3(...align)));
			node.lookAt(new THREE.Vector3(...align));

			let off = 0.8;
			if(align[0] === 1){
				node.position.set(1, off, -off).multiplyScalar(0.5);
				node.rotation.z = Math.PI / 2;
			}else if(align[0] === -1){
				node.position.set(-1, -off, -off).multiplyScalar(0.5);
				node.rotation.z = Math.PI / 2;
			}else if(align[1] === 1){
				node.position.set(-off, 1, -off).multiplyScalar(0.5);
				node.rotation.set(Math.PI / 2, Math.PI, 0.0);
			}else if(align[1] === -1){
				node.position.set(off, -1, -off).multiplyScalar(0.5);
				node.rotation.set(Math.PI / 2, 0.0, 0.0);
			}else if(align[2] === 1){
				node.position.set(off, off, 1).multiplyScalar(0.5);
			}else if(align[2] === -1){
				node.position.set(-off, off, -1).multiplyScalar(0.5);
			}

			let material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0,
				transparent: true,
				map: texture
			});

			//let outlineMaterial = new THREE.MeshBasicMaterial({
			//	color: 0x000000, 
			//	side: THREE.BackSide,
			//	opacity: 0,
			//	transparent: true});

			let pickMaterial = new THREE.MeshNormalMaterial({
				//opacity: 0,
				transparent: true,
				visible: this.showPickVolumes});

			let box = new THREE.Mesh(sgPlane, material);
			box.name = `${handleName}.handle`;
			box.scale.set(1.5, 1.5, 1.5);
			box.position.set(0, 0, 0);
			box.visible = false;
			node.add(box);
			//handle.focusNode = box;
			
			//let outline = new THREE.Mesh(sgPlane, outlineMaterial);
			//outline.scale.set(1.4, 1.4, 1.4);
			//outline.name = `${handleName}.outline`;
			//box.add(outline);

			let pickSphere = new THREE.Mesh(sgLowPolySphere, pickMaterial);
			pickSphere.name = `${handleName}.pick_volume`;
			pickSphere.scale.set(3, 3, 3);
			box.add(pickSphere);
			pickSphere.handle = handleName;
			this.pickVolumes.push(pickSphere);

			node.setOpacity = (target) => {
				let opacity = {x: material.opacity};
				let t = new TWEEN.Tween(opacity).to({x: target}, 100);
				t.onUpdate(() => {
					pickSphere.visible = opacity.x > 0;
					box.visible = opacity.x > 0;
					material.opacity = opacity.x;
					//outlineMaterial.opacity = opacity.x;
					pickSphere.material.opacity = opacity.x * 0.5;
				});
				t.start();
			};

			pickSphere.addEventListener("drag", e => {});

			pickSphere.addEventListener("mouseup", e => {
				e.consume();
			});

			pickSphere.addEventListener("mousedown", e => {
				e.consume();
			});

			pickSphere.addEventListener("click", e => {
				e.consume();

				let selected = this.selection[0];
				let maxScale = Math.max(...selected.scale.toArray());
				let minScale = Math.min(...selected.scale.toArray());
				let handleLength = Math.abs(selected.scale.dot(new THREE.Vector3(...handle.alignment)));
				let alignment = new THREE.Vector3(...handle.alignment).multiplyScalar(2 * maxScale / handleLength);
				alignment.applyMatrix4(selected.matrixWorld);
				let newCamPos = alignment;
				let newCamTarget = selected.getWorldPosition();

				Potree.utils.moveTo(this.viewer.scene, newCamPos, newCamTarget);
			});

			pickSphere.addEventListener("mouseover", e => {
				//box.setOpacity(1);
			});

			pickSphere.addEventListener("mouseleave", e => {
				//box.setOpacity(0.4);
			});
		}
	}

	initializeTranslationHandles(){
		let boxGeometry = new THREE.BoxGeometry(1, 1, 1);

		for(let handleName of Object.keys(this.translationHandles)){
			let handle = this.handles[handleName];
			let node = handle.node;
			this.scene.add(node);

			let material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true});

			let outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000, 
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true});

			let pickMaterial = new THREE.MeshNormalMaterial({
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes
			});

			let box = new THREE.Mesh(boxGeometry, material);
			box.name = `${handleName}.handle`;
			box.scale.set(0.2, 0.2, 40);
			box.lookAt(new THREE.Vector3(...handle.alignment));
			box.renderOrder = 10;
			node.add(box);
			handle.translateNode = box;

			let outline = new THREE.Mesh(boxGeometry, outlineMaterial);
			outline.name = `${handleName}.outline`;
			outline.scale.set(3, 3, 1.03);
			outline.renderOrder = 0;
			box.add(outline);

			let pickVolume = new THREE.Mesh(boxGeometry, pickMaterial);
			pickVolume.name = `${handleName}.pick_volume`;
			pickVolume.scale.set(12, 12, 1.1);
			pickVolume.handle = handleName;
			box.add(pickVolume);
			this.pickVolumes.push(pickVolume);

			node.setOpacity = (target) => {
				let opacity = {x: material.opacity};
				let t = new TWEEN.Tween(opacity).to({x: target}, 100);
				t.onUpdate(() => {
					box.visible = opacity.x > 0;
					pickVolume.visible = opacity.x > 0;
					material.opacity = opacity.x;
					outlineMaterial.opacity = opacity.x;
					pickMaterial.opacity = opacity.x * 0.5;
				});
				t.start();
			};

			pickVolume.addEventListener("drag", (e) => {this.dragTranslationHandle(e)});
			pickVolume.addEventListener("drop", (e) => {this.dropTranslationHandle(e)});
		}
	}

	initializeRotationHandles(){
		let adjust = 0.5;
		let torusGeometry = new THREE.TorusGeometry(1, adjust * 0.015, 8, 64, Math.PI / 2);
		let outlineGeometry = new THREE.TorusGeometry(1, adjust * 0.04, 8, 64, Math.PI / 2);
		let pickGeometry = new THREE.TorusGeometry(1, adjust * 0.1, 6, 4, Math.PI / 2);

		for(let handleName of Object.keys(this.rotationHandles)){
			let handle = this.handles[handleName];
			let node = handle.node;
			this.scene.add(node);

			let material = new THREE.MeshBasicMaterial({
				color: handle.color,
				opacity: 0.4,
				transparent: true});

			let outlineMaterial = new THREE.MeshBasicMaterial({
				color: 0x000000, 
				side: THREE.BackSide,
				opacity: 0.4,
				transparent: true});

			let pickMaterial = new THREE.MeshNormalMaterial({
				opacity: 0.2,
				transparent: true,
				visible: this.showPickVolumes
			});

			let box = new THREE.Mesh(torusGeometry, material);
			box.name = `${handleName}.handle`;
			box.scale.set(20, 20, 20);
			box.lookAt(new THREE.Vector3(...handle.alignment));
			node.add(box);
			handle.translateNode = box;

			let outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
			outline.name = `${handleName}.outline`;
			outline.scale.set(1, 1, 1);
			outline.renderOrder = 0;
			box.add(outline);

			let pickVolume = new THREE.Mesh(pickGeometry, pickMaterial);
			pickVolume.name = `${handleName}.pick_volume`;
			pickVolume.scale.set(1, 1, 1);
			pickVolume.handle = handleName;
			box.add(pickVolume);
			this.pickVolumes.push(pickVolume);

			node.setOpacity = (target) => {
				let opacity = {x: material.opacity};
				let t = new TWEEN.Tween(opacity).to({x: target}, 100);
				t.onUpdate(() => {
					box.visible = opacity.x > 0;
					pickVolume.visible = opacity.x > 0;
					material.opacity = opacity.x;
					outlineMaterial.opacity = opacity.x;
					pickMaterial.opacity = opacity.x * 0.5;
				});
				t.start();
			};


			//pickVolume.addEventListener("mouseover", (e) => {
			//	//let a = this.viewer.scene.getActiveCamera().getWorldDirection().dot(pickVolume.getWorldDirection());
			//	console.log(pickVolume.getWorldDirection());
			//});
			
			pickVolume.addEventListener("drag", (e) => {this.dragRotationHandle(e)});
			pickVolume.addEventListener("drop", (e) => {this.dropRotationHandle(e)});
		}
	}

	dragRotationHandle(e){
		let drag = e.drag;
		let handle = this.activeHandle;
		let camera = this.viewer.scene.getActiveCamera();

		if(!handle){
			return
		};

		let localNormal = new THREE.Vector3(...handle.alignment);
		let n = new THREE.Vector3();
		n.copy(new THREE.Vector4(...localNormal.toArray(), 0).applyMatrix4(handle.node.matrixWorld));
		n.normalize();

		if (!drag.intersectionStart){

			//this.viewer.scene.scene.remove(this.debug);
			//this.debug = new THREE.Object3D();
			//this.viewer.scene.scene.add(this.debug);
			//Potree.utils.debugSphere(this.debug, drag.location, 3, 0xaaaaaa);
			//let debugEnd = drag.location.clone().add(n.clone().multiplyScalar(20));
			//Potree.utils.debugLine(this.debug, drag.location, debugEnd, 0xff0000);

			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition();
			drag.handle = handle;

			let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, drag.intersectionStart);

			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;
		}else{
			handle = drag.handle;
		}

		this.dragging = true;

		let mouse = drag.end;
		let domElement = this.viewer.renderer.domElement;
		let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
		
		let I = ray.intersectPlane(drag.dragPlane);

		if (I) {
			let center = this.scene.getWorldPosition();
			let from = drag.pivot;
			let to = I;

			let v1 = from.clone().sub(center).normalize();
			let v2 = to.clone().sub(center).normalize();

			let angle = Math.acos(v1.dot(v2));
			let sign = Math.sign(v1.cross(v2).dot(n));
			angle = angle * sign;
			if (Number.isNaN(angle)) {
				return;
			}

			let normal = new THREE.Vector3(...handle.alignment);
			for (let selection of this.selection) {
				selection.rotateOnAxis(normal, angle);
				selection.dispatchEvent({
					type: "orientation_changed",
					object: selection
				});
			}

			drag.pivot = I;
		}
	}

	dropRotationHandle(e){
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dragTranslationHandle(e){
		let drag = e.drag;
		let handle = this.activeHandle;
		let camera = this.viewer.scene.getActiveCamera();
			
		if(!drag.intersectionStart && handle){
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition();

			let start = drag.intersectionStart;
			let dir = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
			let end = new THREE.Vector3().addVectors(start, dir);
			let line = new THREE.Line3(start.clone(), end.clone());
			drag.line = line;

			let camOnLine = line.closestPointToPoint(camera.position, false);
			let normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
			let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;
		}else{
			handle = drag.handle;
		}

		this.dragging = true;

		{
			let mouse = drag.end;
			let domElement = this.viewer.renderer.domElement;
			let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
			let I = ray.intersectPlane(drag.dragPlane);

			if (I) {
				let iOnLine = drag.line.closestPointToPoint(I, false);

				let diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);

				for (let selection of this.selection) {
					selection.position.add(diff);
					selection.dispatchEvent({
						type: "position_changed",
						object: selection
					});
				}

				drag.pivot = drag.pivot.add(diff);
			}
		}
	}

	dropTranslationHandle(e){
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dropScaleHandle(e){
		this.dragging = false;
		this.setActiveHandle(null);
	}

	dragScaleHandle(e){
		let drag = e.drag;
		let handle = this.activeHandle;
		let camera = this.viewer.scene.getActiveCamera();

		if(!drag.intersectionStart){
			drag.intersectionStart = drag.location;
			drag.objectStart = drag.object.getWorldPosition();
			drag.handle = handle;

			let start = drag.intersectionStart;
			let dir = new THREE.Vector4(...handle.alignment, 0).applyMatrix4(this.scene.matrixWorld);
			let end = new THREE.Vector3().addVectors(start, dir);
			let line = new THREE.Line3(start.clone(), end.clone());
			drag.line = line;

			let camOnLine = line.closestPointToPoint(camera.position, false);
			let normal = new THREE.Vector3().subVectors(camera.position, camOnLine);
			let plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, drag.intersectionStart);
			drag.dragPlane = plane;
			drag.pivot = drag.intersectionStart;

			//Potree.utils.debugSphere(viewer.scene.scene, drag.pivot, 0.05);
		}else{
			handle = drag.handle;
		}

		this.dragging = true;

		{
			let mouse = drag.end;
			let domElement = this.viewer.renderer.domElement;
			let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
			let I = ray.intersectPlane(drag.dragPlane);

			if (I) {
				let iOnLine = drag.line.closestPointToPoint(I, false);
				let direction = handle.alignment.reduce( (a, v) => a + v, 0);

				let toObjectSpace = new THREE.Matrix4().getInverse( this.selection[0].matrixWorld);
				let iOnLineOS = iOnLine.clone().applyMatrix4(toObjectSpace);
				let pivotOS = drag.pivot.clone().applyMatrix4(toObjectSpace);
				let diffOS = new THREE.Vector3().subVectors(iOnLineOS, pivotOS);
				let dragDirectionOS = diffOS.clone().normalize();
				if(iOnLine.distanceTo(drag.pivot) === 0){
					dragDirectionOS.set(0, 0, 0);
				}
				let dragDirection = dragDirectionOS.dot(new THREE.Vector3(...handle.alignment));

				let diff = new THREE.Vector3().subVectors(iOnLine, drag.pivot);
				let diffScale = new THREE.Vector3(...handle.alignment).multiplyScalar(diff.length() * direction * dragDirection);
				let diffPosition = diff.clone().multiplyScalar(0.5);

				for (let selection of this.selection) {
					selection.scale.add(diffScale);
					selection.scale.x = Math.max(0.1, selection.scale.x);
					selection.scale.y = Math.max(0.1, selection.scale.y);
					selection.scale.z = Math.max(0.1, selection.scale.z);
					selection.position.add(diffPosition);
					selection.dispatchEvent({
						type: "position_changed",
						object: selection
					});
					selection.dispatchEvent({
						type: "scale_changed",
						object: selection
					});
				}

				drag.pivot.copy(iOnLine);
				//Potree.utils.debugSphere(viewer.scene.scene, drag.pivot, 0.05);
			}
		}
	}

	setActiveHandle(handle){
		if(this.dragging){
			return;
		}

		if(this.activeHandle === handle){
			return;
		}

		this.activeHandle = handle;

		if(handle === null){
			for(let handleName of Object.keys(this.handles)){
				let handle = this.handles[handleName];
				handle.node.setOpacity(0);
			}
		}

		for(let handleName of Object.keys(this.focusHandles)){
			let handle = this.focusHandles[handleName];

			if(this.activeHandle === handle){
				handle.node.setOpacity(1.0);
			}else{
				handle.node.setOpacity(0.4)
			}
		}

		for(let handleName of Object.keys(this.translationHandles)){
			let handle = this.translationHandles[handleName];

			if(this.activeHandle === handle){
				handle.node.setOpacity(1.0);
			}else{
				handle.node.setOpacity(0.4)
			}
		}

		for(let handleName of Object.keys(this.rotationHandles)){
			let handle = this.rotationHandles[handleName];

			//if(this.activeHandle === handle){
			//	handle.node.setOpacity(1.0);
			//}else{
			//	handle.node.setOpacity(0.4)
			//}

			handle.node.setOpacity(0.4);
		}

		for(let handleName of Object.keys(this.scaleHandles)){
			let handle = this.scaleHandles[handleName];

			if(this.activeHandle === handle){
				handle.node.setOpacity(1.0);

				let relatedFocusHandle = this.focusHandles[handle.name.replace("scale", "focus")];
				let relatedFocusNode = relatedFocusHandle.node;
				relatedFocusNode.setOpacity(0.4);

				for(let translationHandleName of Object.keys(this.translationHandles)){
					let translationHandle = this.translationHandles[translationHandleName];
					translationHandle.node.setOpacity(0.4);
				}

				//let relatedTranslationHandle = this.translationHandles[
				//	handle.name.replace("scale", "translation").replace(/[+-]/g, "")];
				//let relatedTranslationNode = relatedTranslationHandle.node;
				//relatedTranslationNode.setOpacity(0.4);


			}else{
				handle.node.setOpacity(0.4)
			}
		}

		



		if(handle){
			handle.node.setOpacity(1.0);
		}

		
	}

	update () {

		if(this.selection.length === 1){

			this.scene.visible = true;

			this.scene.updateMatrix();
			this.scene.updateMatrixWorld();

			let selected = this.selection[0];
			let world = selected.matrixWorld;
			let camera = this.viewer.scene.getActiveCamera();
			let domElement = this.viewer.renderer.domElement;
			let mouse = this.viewer.inputHandler.mouse;

			let center = selected.boundingBox.getCenter().clone().applyMatrix4(selected.matrixWorld);

			this.scene.scale.copy(selected.boundingBox.getSize().multiply(selected.scale));
			this.scene.position.copy(center);
			this.scene.rotation.copy(selected.rotation);

			this.scene.updateMatrixWorld();

			{
				// adjust scale of components
				for(let handleName of Object.keys(this.handles)){
					let handle = this.handles[handleName];
					let node = handle.node;

					let handlePos = node.getWorldPosition();
					let distance = handlePos.distanceTo(camera.position);
					let pr = Potree.utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);

					let ws = node.parent.getWorldScale();

					let s = (7 / pr);
					let scale = new THREE.Vector3(s, s, s).divide(ws);

					let rot = new THREE.Matrix4().makeRotationFromEuler(node.rotation);
					let rotInv = new THREE.Matrix4().getInverse(rot);

					scale.applyMatrix4(rotInv);
					scale.x = Math.abs(scale.x);
					scale.y = Math.abs(scale.y);
					scale.z = Math.abs(scale.z);

					node.scale.copy(scale);
				}

				// adjust rotation handles
				if(!this.dragging){
					let tWorld = this.scene.matrixWorld;
					let tObject = new THREE.Matrix4().getInverse(tWorld)
					let camObjectPos = camera.getWorldPosition().applyMatrix4(tObject);

					let x = this.rotationHandles["rotation.x"].node.rotation;
					let y = this.rotationHandles["rotation.y"].node.rotation;
					let z = this.rotationHandles["rotation.z"].node.rotation;

					x.order = "ZYX";
					y.order = "ZYX";

					let above = camObjectPos.z > 0;
					let below = !above;
					let PI_HALF = Math.PI / 2;

					if(above){
						if(camObjectPos.x > 0 && camObjectPos.y > 0){
							x.x = 1 * PI_HALF;
							y.y = 3 * PI_HALF;
							z.z = 0 * PI_HALF;
						}else if(camObjectPos.x < 0 && camObjectPos.y > 0){
							x.x = 1 * PI_HALF;
							y.y = 2 * PI_HALF;
							z.z = 1 * PI_HALF;
						}else if(camObjectPos.x < 0 && camObjectPos.y < 0){
							x.x = 2 * PI_HALF;
							y.y = 2 * PI_HALF;
							z.z = 2 * PI_HALF;
						}else if(camObjectPos.x > 0 && camObjectPos.y < 0){
							x.x = 2 * PI_HALF;
							y.y = 3 * PI_HALF;
							z.z = 3 * PI_HALF;
						}
					}else if(below){
						if(camObjectPos.x > 0 && camObjectPos.y > 0){
							x.x = 0 * PI_HALF;
							y.y = 0 * PI_HALF;
							z.z = 0 * PI_HALF;
						}else if(camObjectPos.x < 0 && camObjectPos.y > 0){
							x.x = 0 * PI_HALF;
							y.y = 1 * PI_HALF;
							z.z = 1 * PI_HALF;
						}else if(camObjectPos.x < 0 && camObjectPos.y < 0){
							x.x = 3 * PI_HALF;
							y.y = 1 * PI_HALF;
							z.z = 2 * PI_HALF;
						}else if(camObjectPos.x > 0 && camObjectPos.y < 0){
							x.x = 3 * PI_HALF;
							y.y = 0 * PI_HALF;
							z.z = 3 * PI_HALF;
						}
					}
				}

				{
					let ray = Potree.utils.mouseToRay(mouse, camera, domElement.clientWidth, domElement.clientHeight);
					let raycaster = new THREE.Raycaster(ray.origin, ray.direction);
					let intersects = raycaster.intersectObjects(this.pickVolumes.filter(v => v.visible), true);

					if(intersects.length > 0){
						let I = intersects[0];
						let handleName = I.object.handle;
						this.setActiveHandle(this.handles[handleName]);
					}else{
						this.setActiveHandle(null);
					}
				}

				// 
				for(let handleName of Object.keys(this.scaleHandles)){
					let handle = this.handles[handleName];
					let node = handle.node;
					let alignment = handle.alignment;

					

				}
			}


			{
				let axisScale = (alignment) => {
					let transformed = new THREE.Vector3(...alignment).applyMatrix4(selected.matrixWorld);
					let distance = transformed.distanceTo(selected.getWorldPosition());

					return distance;
				};

				let scale = new THREE.Vector3(
					axisScale([1, 0, 0]),
					axisScale([0, 1, 0]),
					axisScale([0, 0, 1]),
				);

			}

		}else{
			this.scene.visible = false;
		}
		
	}

};


Potree.Volume = class extends THREE.Object3D {
	constructor (args = {}) {
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;

		this.name = 'volume_' + this.constructor.counter;

		this._clip = args.clip || false;
		this._visible = true;
		this.showVolumeLabel = true;
		this._modifiable = args.modifiable || true;

		let boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();

		let boxFrameGeometry = new THREE.Geometry();
		{
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

		this.dimension = new THREE.Vector3(1, 1, 1);
		this.material = new THREE.MeshBasicMaterial({
			color: 0x00ff00,
			transparent: true,
			opacity: 0.3,
			depthTest: true,
			depthWrite: false});
		this.box = new THREE.Mesh(boxGeometry, this.material);
		this.box.geometry.computeBoundingBox();
		this.boundingBox = this.box.geometry.boundingBox;
		this.add(this.box);

		this.frame = new THREE.LineSegments(boxFrameGeometry, new THREE.LineBasicMaterial({color: 0x000000}));
		// this.frame.mode = THREE.Lines;
		this.add(this.frame);

		this.label = new Potree.TextSprite('0');
		this.label.setBorderColor({r: 0, g: 255, b: 0, a: 0.0});
		this.label.setBackgroundColor({r: 0, g: 255, b: 0, a: 0.0});
		this.label.material.depthTest = false;
		this.label.material.depthWrite = false;
		this.label.material.transparent = true;
		this.label.position.y -= 0.5;
		this.add(this.label);

		this.label.updateMatrixWorld = () => {
			let volumeWorldPos = new THREE.Vector3();
			volumeWorldPos.setFromMatrixPosition(this.matrixWorld);
			this.label.position.copy(volumeWorldPos);
			this.label.updateMatrix();
			this.label.matrixWorld.copy(this.label.matrix);
			this.label.matrixWorldNeedsUpdate = false;

			for (let i = 0, l = this.label.children.length; i < l; i++) {
				this.label.children[ i ].updateMatrixWorld(true);
			}
		};

		{ // event listeners
			this.addEventListener('select', e => {});
			this.addEventListener('deselect', e => {});
		}

		this.update();
	}

	get visible(){
		return this._visible;
	}

	set visible(value){
		if(this._visible !== value){
			this._visible = value;

			this.dispatchEvent({type: "visibility_changed", object: this});
		}
	}

	getVolume () {
		return Math.abs(this.scale.x * this.scale.y * this.scale.z);
	}

	update () {
		this.boundingBox = this.box.geometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();

		if (this._clip) {
			this.box.visible = false;
			this.label.visible = false;
		} else {
			this.box.visible = true;
			this.label.visible = this.showVolumeLabel;
		}
	};

	raycast (raycaster, intersects) {
		let is = [];
		this.box.raycast(raycaster, is);

		if (is.length > 0) {
			let I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	};

	get clip () {
		return this._clip;
	}

	set clip (value) {

		if(this._clip !== value){
			this._clip = value;

			this.update();

			this.dispatchEvent({
				type: "clip_changed",
				object: this
			});
		}
		
	}

	get modifieable () {
		return this._modifiable;
	}

	set modifieable (value) {
		this._modifiable = value;

		this.update();
	}
};


Potree.VolumeTool = class VolumeTool extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.renderer = viewer.renderer;

		this.addEventListener('start_inserting_volume', e => {
			this.viewer.dispatchEvent({
				type: 'cancel_insertions'
			});
		});

		this.scene = new THREE.Scene();
		this.scene.name = 'scene_volume';

		this.viewer.inputHandler.registerInteractiveScene(this.scene);

		this.onRemove = e => {
			this.scene.remove(e.volume);
		};

		this.onAdd = e => {
			this.scene.add(e.volume);
		};

		for(let volume of viewer.scene.volumes){
			this.onAdd({volume: volume});
		}

		this.viewer.inputHandler.addEventListener('delete', e => {
			let volumes = e.selection.filter(e => (e instanceof Potree.Volume));
			volumes.forEach(e => this.viewer.scene.removeVolume(e));
		});

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.scene", e => this.render(e));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));

		viewer.scene.addEventListener('volume_added', this.onAdd);
		viewer.scene.addEventListener('volume_removed', this.onRemove);
	}

	onSceneChange(e){
		if(e.oldScene){
			e.oldScene.removeEventListeners('volume_added', this.onAdd);
			e.oldScene.removeEventListeners('volume_removed', this.onRemove);
		}

		e.scene.addEventListener('volume_added', this.onAdd);
		e.scene.addEventListener('volume_removed', this.onRemove);
	}

	startInsertion (args = {}) {
		let volume = new Potree.Volume();
		volume.clip = args.clip || false;
		volume.name = args.name || 'Volume';

		this.dispatchEvent({
			type: 'start_inserting_volume',
			volume: volume
		});

		this.viewer.scene.addVolume(volume);
		this.scene.add(volume);

		let cancel = {
			callback: null
		};

		let drag = e => {
			let camera = this.viewer.scene.getActiveCamera();
			
			let I = Potree.utils.getMousePointCloudIntersection(
				e.drag.end, 
				this.viewer.scene.getActiveCamera(), 
				this.viewer, 
				this.viewer.scene.pointclouds);

			if (I) {
				volume.position.copy(I.location);

				let wp = volume.getWorldPosition().applyMatrix4(camera.matrixWorldInverse);
				// let pp = new THREE.Vector4(wp.x, wp.y, wp.z).applyMatrix4(camera.projectionMatrix);
				let w = Math.abs((wp.z / 5));
				volume.scale.set(w, w, w);
			}
		};

		let drop = e => {
			volume.removeEventListener('drag', drag);
			volume.removeEventListener('drop', drop);

			cancel.callback();
		};

		cancel.callback = e => {
			volume.removeEventListener('drag', drag);
			volume.removeEventListener('drop', drop);
			this.viewer.removeEventListener('cancel_insertions', cancel.callback);
		};

		volume.addEventListener('drag', drag);
		volume.addEventListener('drop', drop);
		this.viewer.addEventListener('cancel_insertions', cancel.callback);

		this.viewer.inputHandler.startDragging(volume);

		return volume;
	}

	update(){
		if (!this.viewer.scene) {
			return;
		}
		
		let camera = this.viewer.scene.getActiveCamera();
		let clientWidth = this.viewer.renderer.getSize().width;
		let clientHeight = this.viewer.renderer.getSize().height;

		let volumes = this.viewer.scene.volumes;
		for (let volume of volumes) {
			let label = volume.label;
			
			{

				let distance = label.position.distanceTo(camera.position);
				let pr = Potree.utils.projectedRadius(1, camera, distance, clientWidth, clientHeight);

				let scale = (70 / pr);
				label.scale.set(scale, scale, scale);
			}

			let text = Potree.utils.addCommas(volume.getVolume().toFixed(3)) + '\u00B3';
			label.setText(text);
		}
	}

	render(params){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera(), params.renderTarget);
	}

};



Potree.ClippingTool = class ClippingTool extends THREE.EventDispatcher{

	constructor(viewer){
		super(); 

		this.viewer = viewer;

		this.maxPolygonVertices = 8; 
		
		this.addEventListener("start_inserting_clipping_volume", e => {
			this.viewer.dispatchEvent({
				type: "cancel_insertions"
			});
		});

		this.sceneMarker = new THREE.Scene();
		this.sceneVolume = new THREE.Scene();
		this.sceneVolume.name = "scene_clip_volume";
		this.viewer.inputHandler.registerInteractiveScene(this.sceneVolume);

		this.onRemove = e => {
			this.sceneVolume.remove(e.volume);
		};
		
		this.onAdd = e => {
			this.sceneVolume.add(e.volume);
		};
		
		this.viewer.inputHandler.addEventListener("delete", e => {
			let volumes = e.selection.filter(e => (e instanceof Potree.ClipVolume));
			volumes.forEach(e => this.viewer.scene.removeClipVolume(e));
			let polyVolumes = e.selection.filter(e => (e instanceof Potree.PolygonClipVolume));
			polyVolumes.forEach(e => this.viewer.scene.removePolygonClipVolume(e));
		});
	}

	setScene(scene){
		if(this.scene === scene){
			return;
		}
		
		if(this.scene){
			this.scene.removeEventListeners("clip_volume_added", this.onAdd);
			this.scene.removeEventListeners("clip_volume_removed", this.onRemove);
			this.scene.removeEventListeners("polygon_clip_volume_added", this.onAdd);
			this.scene.removeEventListeners("polygon_clip_volume_removed", this.onRemove);
		}
		
		this.scene = scene;
		
		this.scene.addEventListener("clip_volume_added", this.onAdd);
		this.scene.addEventListener("clip_volume_removed", this.onRemove);
		this.scene.addEventListener("polygon_clip_volume_added", this.onAdd);
		this.scene.addEventListener("polygon_clip_volume_removed", this.onRemove);
	}

	startInsertion(args = {}) {	
		let type = args.type || null;

		if(!type) return null;

		let domElement = this.viewer.renderer.domElement;
		let canvasSize = this.viewer.renderer.getSize();

		let svg = $(`
		<svg height="${canvasSize.height}" width="${canvasSize.width}" style="position:absolute; pointer-events: none">

			<defs>
				 <marker id="diamond" markerWidth="24" markerHeight="24" refX="12" refY="12"
						markerUnits="userSpaceOnUse">
					<circle cx="12" cy="12" r="6" fill="white" stroke="black" stroke-width="3"/>
				</marker>
			</defs>

			<polyline fill="none" stroke="black" 
				style="stroke:rgb(0, 0, 0);
				stroke-width:6;"
				stroke-dasharray="9, 6"
				stroke-dashoffset="2"
				/>

			<polyline fill="none" stroke="black" 
				style="stroke:rgb(255, 255, 255);
				stroke-width:2;"
				stroke-dasharray="5, 10"
				marker-start="url(#diamond)" 
				marker-mid="url(#diamond)" 
				marker-end="url(#diamond)" 
				/>
		</svg>`);
		$(domElement.parentElement).append(svg);

		let polyClipVol = new Potree.PolygonClipVolume(this.viewer.scene.getActiveCamera().clone());

		this.dispatchEvent({"type": "start_inserting_clipping_volume"});

		this.viewer.scene.addPolygonClipVolume(polyClipVol);
		this.sceneMarker.add(polyClipVol);

		let cancel = {
			callback: null
		};

		let insertionCallback = (e) => {
			if(e.button === THREE.MOUSE.LEFT){
				
				polyClipVol.addMarker();

				// SVC Screen Line
				svg.find("polyline").each((index, target) => {
					let newPoint = svg[0].createSVGPoint();
					newPoint.x = e.offsetX;
					newPoint.y = e.offsetY;
					let polyline = target.points.appendItem(newPoint);
				});
				
				
				if(polyClipVol.markers.length > this.maxPolygonVertices){
					cancel.callback();
				}
				
				this.viewer.inputHandler.startDragging(
					polyClipVol.markers[polyClipVol.markers.length - 1]);
			}else if(e.button === THREE.MOUSE.RIGHT){
				cancel.callback(e);
			}
		};
		
		cancel.callback = e => {

			//let first = svg.find("polyline")[0].points[0];
			//svg.find("polyline").each((index, target) => {
			//	let newPoint = svg[0].createSVGPoint();
			//	newPoint.x = first.x;
			//	newPoint.y = first.y;
			//	let polyline = target.points.appendItem(newPoint);
			//});
			svg.remove();

			if(polyClipVol.markers.length > 3) {
				polyClipVol.removeLastMarker();
				polyClipVol.initialized = true;	
			} else {
				this.viewer.scene.removePolygonClipVolume(polyClipVol);
			}

			this.viewer.renderer.domElement.removeEventListener("mouseup", insertionCallback, true);
			this.viewer.removeEventListener("cancel_insertions", cancel.callback);
			this.viewer.inputHandler.enabled = true;
		};
		
		this.viewer.addEventListener("cancel_insertions", cancel.callback);
		this.viewer.renderer.domElement.addEventListener("mouseup", insertionCallback , true);
		this.viewer.inputHandler.enabled = false;
		
		polyClipVol.addMarker();
		this.viewer.inputHandler.startDragging(
			polyClipVol.markers[polyClipVol.markers.length - 1]);

		return polyClipVol;
	}

	update() {

	}
};

Potree.ScreenBoxSelectTool = class ScreenBoxSelectTool extends THREE.EventDispatcher{

	constructor(viewer){
		super();

		this.viewer = viewer;
		this.scene = new THREE.Scene();

		viewer.addEventListener("update", this.update.bind(this));
		viewer.addEventListener("render.pass.perspective_overlay", this.render.bind(this));
		viewer.addEventListener("scene_changed", this.onSceneChange.bind(this));
	}

	onSceneChange(scene){
		console.log("scene changed");
	}

	startInsertion(){
		let domElement = this.viewer.renderer.domElement;

		let volume = new Potree.Volume();
		volume.position.set(12345, 12345, 12345);
		volume.showVolumeLabel = false;
		volume.visible = false;
		volume.update();
		this.viewer.scene.addVolume(volume);

		this.importance = 10;

		let selectionBox = $(`<div style="position: absolute; border: 2px solid white; pointer-events: none; border-style:dashed"></div>`);
		$(domElement.parentElement).append(selectionBox);
		selectionBox.css("right", "10px");
		selectionBox.css("bottom", "10px");

		let drag = e =>{

			volume.visible = true;

			let mStart = e.drag.start;
			let mEnd = e.drag.end;

			let box2D = new THREE.Box2();
			box2D.expandByPoint(mStart);
			box2D.expandByPoint(mEnd);

			selectionBox.css("left", `${box2D.min.x}px`);
			selectionBox.css("top", `${box2D.min.y}px`);
			selectionBox.css("width", `${box2D.max.x - box2D.min.x}px`);
			selectionBox.css("height", `${box2D.max.y - box2D.min.y}px`);

			let camera = e.viewer.scene.getActiveCamera();
			let size = new THREE.Vector2(
				e.viewer.renderer.getSize().width,
				e.viewer.renderer.getSize().height);
			let frustumSize = new THREE.Vector2(
				camera.right - camera.left, 
				camera.top - camera.bottom);

			let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			let ray = Potree.utils.mouseToRay(screenCentroid, camera, size.width, size.height);

			let diff = new THREE.Vector2().subVectors(e.drag.end, e.drag.start);
			diff.divide(size).multiply(frustumSize);
			
			volume.position.copy(ray.origin);
			volume.up.copy(camera.up);
			volume.rotation.copy(camera.rotation);
			volume.scale.set(diff.x, diff.y, 1000 * 100);

			e.consume();
		};

		let drop = e => {
			this.importance = 0;

			$(selectionBox).remove();

			this.viewer.inputHandler.deselectAll();
			this.viewer.inputHandler.toggleSelection(volume);

			let camera = e.viewer.scene.getActiveCamera();
			let size = new THREE.Vector2(
				e.viewer.renderer.getSize().width,
				e.viewer.renderer.getSize().height);
			let screenCentroid = new THREE.Vector2().addVectors(e.drag.end, e.drag.start).multiplyScalar(0.5);
			let ray = Potree.utils.mouseToRay(screenCentroid, camera, size.width, size.height);

			let line = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));

			this.removeEventListener("drag", drag);
			this.removeEventListener("drop", drop);

			let allPointsNear = [];
			let allPointsFar = [];

			// TODO support more than one point cloud
			for(let pointcloud of this.viewer.scene.pointclouds){

				if(!pointcloud.visible){
					continue;
				}

				let volCam = camera.clone();
				volCam.left = -volume.scale.x / 2; 
				volCam.right = +volume.scale.x / 2;
				volCam.top = +volume.scale.y / 2;
				volCam.bottom = -volume.scale.y / 2;
				volCam.near = -volume.scale.z / 2;
				volCam.far = +volume.scale.z / 2;
				volCam.rotation.copy(volume.rotation);
				volCam.position.copy(volume.position);

				volCam.updateMatrix();
				volCam.updateMatrixWorld();
				volCam.updateProjectionMatrix();
				volCam.matrixWorldInverse.getInverse(volCam.matrixWorld);

				let ray = new THREE.Ray(volCam.getWorldPosition(), volCam.getWorldDirection());
				let rayInverse = new THREE.Ray(
					ray.origin.clone().add(ray.direction.clone().multiplyScalar(volume.scale.z)),
					ray.direction.clone().multiplyScalar(-1));

				let pickerSettings = {
					width: 8, 
					height: 8, 
					pickWindowSize: 8, 
					all: true,
					pickClipped: true,
					pointSizeType: Potree.PointSizeType.FIXED,
					pointSize: 1};
				let pointsNear = pointcloud.pick(viewer, volCam, ray, pickerSettings);

				volCam.rotateX(Math.PI);
				volCam.updateMatrix();
				volCam.updateMatrixWorld();
				volCam.updateProjectionMatrix();
				volCam.matrixWorldInverse.getInverse(volCam.matrixWorld);
				let pointsFar = pointcloud.pick(viewer, volCam, rayInverse, pickerSettings);

				allPointsNear.push(...pointsNear);
				allPointsFar.push(...pointsFar);
			}

			if(allPointsNear.length > 0 && allPointsFar.length > 0){
				let viewLine = new THREE.Line3(ray.origin, new THREE.Vector3().addVectors(ray.origin, ray.direction));

				let closestOnLine = allPointsNear.map(p => viewLine.closestPointToPoint(p.position, false));
				let closest = closestOnLine.sort( (a, b) => ray.origin.distanceTo(a) - ray.origin.distanceTo(b))[0];

				let farthestOnLine = allPointsFar.map(p => viewLine.closestPointToPoint(p.position, false));
				let farthest = farthestOnLine.sort( (a, b) => ray.origin.distanceTo(b) - ray.origin.distanceTo(a))[0];

				let distance = closest.distanceTo(farthest);
				let centroid = new THREE.Vector3().addVectors(closest, farthest).multiplyScalar(0.5);
				volume.scale.z = distance * 1.1;
				volume.position.copy(centroid);
			}

			volume.clip = true;
		};

		this.addEventListener("drag", drag);
		this.addEventListener("drop", drop);

		viewer.inputHandler.addInputListener(this);

		return volume;
	}

	update(e){
		//console.log(e.delta)
	}

	render(){
		this.viewer.renderer.render(this.scene, this.viewer.scene.getActiveCamera());
	}

}


Potree.ClipVolume = class extends THREE.Object3D{
	
	constructor(args){
		super();
		
		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "clip_volume_" + this.constructor.counter;

		let alpha = args.alpha || 0;
		let beta = args.beta || 0;
		let gamma = args.gamma || 0;

		this.rotation.x = alpha;
		this.rotation.y = beta;
		this.rotation.z = gamma;

		this.clipOffset = 0.001;
		this.clipRotOffset = 1;
				
		let boxGeometry = new THREE.BoxGeometry(1, 1, 1);
		boxGeometry.computeBoundingBox();
		
		let boxFrameGeometry = new THREE.Geometry();
		{			
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

			boxFrameGeometry.colors.push(new THREE.Vector3(1, 1, 1));
		}

		let planeFrameGeometry = new THREE.Geometry();
		{						
			// middle line
			planeFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.0));
			planeFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.0));
			planeFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.0));
			planeFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.0));
			planeFrameGeometry.vertices.push(new THREE.Vector3(-0.5, 0.5, 0.0));
			planeFrameGeometry.vertices.push(new THREE.Vector3(0.5, 0.5, 0.0));
			planeFrameGeometry.vertices.push(new THREE.Vector3(-0.5, -0.5, 0.0));
			planeFrameGeometry.vertices.push(new THREE.Vector3(0.5, -0.5, 0.0));
		}

		this.dimension = new THREE.Vector3(1, 1, 1);
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
		this.add(this.frame);
		this.planeFrame = new THREE.LineSegments( planeFrameGeometry, new THREE.LineBasicMaterial({color: 0xff0000}));
		this.add(this.planeFrame);

		// set default thickness
		this.setScaleZ(0.1);

		// create local coordinate system
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
				depthTest: false, 
				depthWrite: false,
				transparent: true
				});
			let shaft = new THREE.Line(shaftGeometry, shaftMaterial);
			shaft.name = name + "_shaft";
			
			let headGeometry = new THREE.CylinderGeometry(0, 0.04, 0.1, 10, 1, false);
			let headMaterial = material;
			let head = new THREE.Mesh(headGeometry, headMaterial);
			head.name = name + "_head";
			head.position.y = 1;
			
			let arrow = new THREE.Object3D();
			arrow.name = name;
			arrow.add(shaft);
			arrow.add(head);

			return arrow;
		};
		
		this.arrowX = createArrow("arrow_x", new THREE.Vector3(1, 0, 0), 0xFF0000);
		this.arrowY = createArrow("arrow_y", new THREE.Vector3(0, 1, 0), 0x00FF00);
		this.arrowZ = createArrow("arrow_z", new THREE.Vector3(0, 0, 1), 0x0000FF);
		
		this.arrowX.rotation.z = -Math.PI / 2;
		this.arrowZ.rotation.x = Math.PI / 2;

		this.arrowX.visible = false;
		this.arrowY.visible = false;
		this.arrowZ.visible = false;

		this.add(this.arrowX);
		this.add(this.arrowY);
		this.add(this.arrowZ);
		
		{ // event listeners
			this.addEventListener("ui_select", e => { 
				this.arrowX.visible = true;
				this.arrowY.visible = true;
				this.arrowZ.visible = true; 
			});
			this.addEventListener("ui_deselect", e => {
				this.arrowX.visible = false;
				this.arrowY.visible = false;
				this.arrowZ.visible = false; 				
			});
			this.addEventListener("select", e => { 
				let scene_header = $("#" + this.name + " .scene_header");
				if(!scene_header.next().is(":visible")) {
					scene_header.click();
				}
			});
			this.addEventListener("deselect", e => { 
				let scene_header = $("#" + this.name + " .scene_header");
				if(scene_header.next().is(":visible")) {
					scene_header.click();
				}
			});
		}
		
		this.update();
	};

	setClipOffset(offset) {		
		this.clipOffset = offset;	
	}

	setClipRotOffset(offset) {		
		this.clipRotOffset = offset;		
	}

	setScaleX(x) {
		this.box.scale.x = x;
		this.frame.scale.x = x;
		this.planeFrame.scale.x = x;			
	}

	setScaleY(y) {
		this.box.scale.y = y;
		this.frame.scale.y = y;
		this.planeFrame.scale.y = y;		
	}

	setScaleZ(z) {
		this.box.scale.z = z;
		this.frame.scale.z = z;
		this.planeFrame.scale.z = z;		
	}

	offset(args) {
		let cs = args.cs || null;
		let axis = args.axis || null;
		let dir = args.dir || null;

		if(!cs || !axis || !dir) return;

		if(axis === "x") {
			if(cs === "local") {
				this.position.add(this.localX.clone().multiplyScalar(dir * this.clipOffset));
			} else if(cs === "global") {
				this.position.x = this.position.x + dir * this.clipOffset;
			}
		}else if(axis === "y") {
			if(cs === "local") {
				this.position.add(this.localY.clone().multiplyScalar(dir * this.clipOffset));
			} else if(cs === "global") {
				this.position.y = this.position.y + dir * this.clipOffset;
			}
		}else if(axis === "z") {
			if(cs === "local") {
				this.position.add(this.localZ.clone().multiplyScalar(dir * this.clipOffset));
			} else if(cs === "global") {
				this.position.z = this.position.z + dir * this.clipOffset;
			}
		}

		this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});
	}	

	rotate(args) {
		let cs = args.cs || null;
		let axis = args.axis || null;
		let dir = args.dir || null;

		if(!cs || !axis || !dir) return;

		if(cs === "local") {
			if(axis === "x") {
				this.rotateOnAxis(new THREE.Vector3(1, 0, 0), dir * this.clipRotOffset * Math.PI / 180);
			} else if(axis === "y") {
				this.rotateOnAxis(new THREE.Vector3(0, 1, 0), dir * this.clipRotOffset * Math.PI / 180);
			} else if(axis === "z") {
				this.rotateOnAxis(new THREE.Vector3(0, 0, 1), dir * this.clipRotOffset * Math.PI / 180);
			}
		} else if(cs === "global") {
			let rotaxis = new THREE.Vector4(1, 0, 0, 0);	
			if(axis === "y") {
				rotaxis = new THREE.Vector4(0, 1, 0, 0);
			} else if(axis === "z") {
				rotaxis = new THREE.Vector4(0, 0, 1, 0);
			}
			this.updateMatrixWorld();
			let invM = new THREE.Matrix4().getInverse(this.matrixWorld);
			rotaxis = rotaxis.applyMatrix4(invM).normalize();
			rotaxis = new THREE.Vector3(rotaxis.x, rotaxis.y, rotaxis.z);
			this.rotateOnAxis(rotaxis, dir * this.clipRotOffset * Math.PI / 180);
		}

		this.updateLocalSystem();

		this.dispatchEvent({"type": "clip_volume_changed", "viewer": viewer, "volume": this});
	}	

	update(){
		this.boundingBox = this.box.geometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		
		this.box.visible = false;

		this.updateLocalSystem();
	};

	updateLocalSystem() {		
		// extract local coordinate axes
		let rotQuat = this.getWorldQuaternion();
		this.localX = new THREE.Vector3(1, 0, 0).applyQuaternion(rotQuat).normalize();
		this.localY = new THREE.Vector3(0, 1, 0).applyQuaternion(rotQuat).normalize();
		this.localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(rotQuat).normalize();
	}
	
	raycast(raycaster, intersects){
		
		let is = [];
		this.box.raycast(raycaster, is);
	
		if(is.length > 0){
			let I = is[0];
			intersects.push({
				distance: I.distance,
				object: this,
				point: I.point.clone()
			});
		}
	};
};


Potree.PolygonClipVolume = class extends THREE.Object3D{
	
	constructor(camera){
		super();

		this.constructor.counter = (this.constructor.counter === undefined) ? 0 : this.constructor.counter + 1;
		this.name = "polygon_clip_volume_" + this.constructor.counter;

		this.camera = camera.clone();
		this.camera.rotation.set(...camera.rotation.toArray()); // [r85] workaround because camera.clone() doesn't work on rotation
		this.camera.updateMatrixWorld();
		this.camera.updateProjectionMatrix();
		this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);

		this.viewMatrix = this.camera.matrixWorldInverse.clone();
		this.projMatrix = this.camera.projectionMatrix.clone();

		// projected markers
		this.markers = [];
		this.initialized = false;
	}

	addMarker() {

		let marker = new THREE.Mesh();

		let cancel;

		let drag = e => {
			let size = e.viewer.renderer.getSize();
			let projectedPos = new THREE.Vector3(
				2.0 * (e.drag.end.x / size.width) - 1.0,
				-2.0 * (e.drag.end.y / size.height) + 1.0,
				0
			);

			marker.position.copy(projectedPos);
		};
		
		let drop = e => {	
			cancel();
		};
		
		cancel = e => {
			marker.removeEventListener("drag", drag);
			marker.removeEventListener("drop", drop);
		};
		
		marker.addEventListener("drag", drag);
		marker.addEventListener("drop", drop);


		this.markers.push(marker);
	}

	removeLastMarker() {
		if(this.markers.length > 0) {
			this.markers.splice(this.markers.length - 1, 1);
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

Potree.Box3Helper = class Box3Helper extends THREE.LineSegments {
	constructor (box, color) {
		if (color === undefined) color = 0xffff00;

		let indices = new Uint16Array([ 0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7 ]);
		let positions = new Float32Array([
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
		geometry.setIndex(new THREE.BufferAttribute(indices, 1));
		geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));

		let material = new THREE.LineBasicMaterial({ color: color });

		super(geometry, material);
	}
};


Potree.PointCloudSM = class PointCloudSM{

	constructor(potreeRenderer){

		this.potreeRenderer = potreeRenderer;
		this.threeRenderer = this.potreeRenderer.threeRenderer;

		this.target = new THREE.WebGLRenderTarget(2 * 1024, 2 * 1024, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.target.depthTexture = new THREE.DepthTexture();
		this.target.depthTexture.type = THREE.UnsignedIntType;

		//this.target = new THREE.WebGLRenderTarget(1024, 1024, {
		//	minFilter: THREE.NearestFilter,
		//	magFilter: THREE.NearestFilter,
		//	format: THREE.RGBAFormat,
		//	type: THREE.FloatType,
		//	depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		//});

		this.threeRenderer.setClearColor(0x000000, 1);
		this.threeRenderer.clearTarget(this.target, true, true, true);
	}

	setLight(light){
		this.light = light;

		let fov = (180 * light.angle) / Math.PI;
		let aspect = light.shadow.mapSize.width / light.shadow.mapSize.height;
		let near = 0.1;
		let far = light.distance === 0 ? 10000 : light.distance;
		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.camera.up.set(0, 0, 1);
		this.camera.position.copy(light.position);

		let target = new THREE.Vector3().addVectors(light.position, light.getWorldDirection());
		this.camera.lookAt(target);

		this.camera.updateProjectionMatrix();
		this.camera.updateMatrix();
		this.camera.updateMatrixWorld();
		this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);
	}

	setSize(width, height){
		if(this.target.width !== width || this.target.height !== height){
			this.target.dispose();
		}
		this.target.setSize(width, height);
	}

	render(scene, camera){
		//this.threeRenderer.setClearColor(0x00ff00, 1);

		this.threeRenderer.clearTarget( this.target, true, true, true );
		this.potreeRenderer.render(scene, this.camera, this.target, {});
	}


};

Potree.Message = class Message{

	constructor(content){
		this.content = content;

		let closeIcon = `${Potree.resourcePath}/icons/close.svg`;

		this.element = $(`
			<div class="potree_message">
				<span name="content_container" style="flex-grow: 1; padding: 5px"></span>
				<img name="close" src="${closeIcon}" class="button-icon" style="width: 16px; height: 16px;">
			</div>`);

		this.elClose = this.element.find("img[name=close]");

		this.elContainer = this.element.find("span[name=content_container]");

		if(typeof content === "string"){
			this.elContainer.append($(`<span>${content}</span>`));
		}else{
			this.elContainer.append(content);
		}

	}

	setMessage(content){
		this.elContainer.empty();
		if(typeof content === "string"){
			this.elContainer.append($(`<span>${content}</span>`));
		}else{
			this.elContainer.append(content);
		}
	}

};

Potree.SpotLightHelper = class SpotLightHelper extends THREE.Object3D{

	constructor(light, color){
		super();

		this.light = light;
		this.color = color;

		//this.up.set(0, 0, 1);
		this.updateMatrix();
		this.updateMatrixWorld();

		{ // SPHERE
			let sg = new THREE.SphereGeometry(1, 32, 32);
			let sm = new THREE.MeshNormalMaterial();
			this.sphere = new THREE.Mesh(sg, sm);
			this.sphere.scale.set(0.5, 0.5, 0.5);
			this.add(this.sphere);
		}

		{ // LINES
			

			let positions = new Float32Array([
				+0, +0, +0,     +0, +0, +1,

				+0, +0, +0,     -1, -1, +1,
				+0, +0, +0,     +1, -1, +1,
				+0, +0, +0,     +1, +1, +1,
				+0, +0, +0,     -1, +1, +1,

				-1, -1, +1,     +1, -1, +1,
				+1, -1, +1,     +1, +1, +1,
				+1, +1, +1,     -1, +1, +1,
				-1, +1, +1,     -1, -1, +1,
			]);

			let geometry = new THREE.BufferGeometry();
			geometry.addAttribute("position", new THREE.BufferAttribute(positions, 3));

			let material = new THREE.LineBasicMaterial();

			this.frustum = new THREE.LineSegments(geometry, material);
			this.add(this.frustum);

		}

		this.update();
	}

	update(){

		this.light.updateMatrix();
		this.light.updateMatrixWorld();

		let position = this.light.position;
		//let target = new THREE.Vector3().addVectors(
		//	light.position,
		//	new THREE.Vector3().subVectors(light.position, this.light.getWorldDirection()));
		let target = new THREE.Vector3().addVectors(
			light.position, this.light.getWorldDirection().multiplyScalar(-1));
		
		let quat = new THREE.Quaternion().setFromRotationMatrix(
			new THREE.Matrix4().lookAt( position, target, new THREE.Vector3( 0, 0, 1 ) )
		);

		this.setRotationFromQuaternion(quat);
		this.position.copy(position);


		let coneLength = (this.light.distance > 0) ? this.light.distance : 1000;
		let coneWidth = coneLength * Math.tan( this.light.angle * 0.5 );

		this.frustum.scale.set(coneWidth, coneWidth, coneLength);
		


		//{
		//	let fov = (180 * light.angle) / Math.PI;
		//	let aspect = light.shadow.mapSize.width / light.shadow.mapSize.height;
		//	let near = 0.1;
		//	let far = light.distance === 0 ? 10000 : light.distance;
		//	this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		//	this.camera.up.set(0, 0, 1);
		//	this.camera.position.copy(light.position);

		//	let target = new THREE.Vector3().addVectors(light.position, light.getWorldDirection());
		//	this.camera.lookAt(target);

		//	this.camera.updateProjectionMatrix();
		//	this.camera.updateMatrix();
		//	this.camera.updateMatrixWorld();
		//	this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);
		//}

	}

};
/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schütz / http://potree.org
 *
 */

Potree.GeoJSONExporter = class GeoJSONExporter {
	static measurementToFeatures (measurement) {
		let coords = measurement.points.map(e => e.position.toArray());

		let features = [];

		if (coords.length === 1) {
			let feature = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: coords[0]
				},
				properties: {
					name: measurement.name
				}
			};
			features.push(feature);
		} else if (coords.length > 1 && !measurement.closed) {
			let object = {
				'type': 'Feature',
				'geometry': {
					'type': 'LineString',
					'coordinates': coords
				},
				'properties': {
					name: measurement.name
				}
			};

			features.push(object);
		} else if (coords.length > 1 && measurement.closed) {
			let object = {
				'type': 'Feature',
				'geometry': {
					'type': 'Polygon',
					'coordinates': [[...coords, coords[0]]]
				},
				'properties': {
					name: measurement.name
				}
			};
			features.push(object);
		}

		if (measurement.showDistances) {
			measurement.edgeLabels.forEach((label) => {
				let labelPoint = {
					type: 'Feature',
					geometry: {
						type: 'Point',
						coordinates: label.position.toArray()
					},
					properties: {
						distance: label.text
					}
				};
				features.push(labelPoint);
			});
		}

		if (measurement.showArea) {
			let point = measurement.areaLabel.position;
			let labelArea = {
				type: 'Feature',
				geometry: {
					type: 'Point',
					coordinates: point.toArray()
				},
				properties: {
					area: measurement.areaLabel.text
				}
			};
			features.push(labelArea);
		}

		return features;
	}

	static toString (measurements) {
		if (!(measurements instanceof Array)) {
			measurements = [measurements];
		}

		measurements = measurements.filter(m => m instanceof Potree.Measure);

		let features = [];
		for (let measure of measurements) {
			let f = Potree.GeoJSONExporter.measurementToFeatures(measure);

			features = features.concat(f);
		}

		let geojson = {
			'type': 'FeatureCollection',
			'features': features
		};

		return JSON.stringify(geojson, null, '\t');
	}
};

/**
 *
 * @author sigeom sa / http://sigeom.ch
 * @author Ioda-Net Sàrl / https://www.ioda-net.ch/
 * @author Markus Schuetz / http://potree.org
 *
 */

Potree.DXFExporter = class DXFExporter {
	static measurementPointSection (measurement) {
		let position = measurement.points[0].position;

		if (!position) {
			return '';
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

	static measurementPolylineSection (measurement) {
		// bit code for polygons/polylines:
		// https://www.autodesk.com/techpubs/autocad/acad2000/dxf/polyline_dxf_06.htm
		let geomCode = 8;
		if (measurement.closed) {
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
		for (let point of measurement.points) {
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

	static measurementSection (measurement) {
		// if(measurement.points.length <= 1){
		//	return "";
		// }

		if (measurement.points.length === 0) {
			return '';
		} else if (measurement.points.length === 1) {
			return Potree.DXFExporter.measurementPointSection(measurement);
		} else if (measurement.points.length >= 2) {
			return Potree.DXFExporter.measurementPolylineSection(measurement);
		}
	}

	static toString(measurements){
		if (!(measurements instanceof Array)) {
			measurements = [measurements];
		}
		measurements = measurements.filter(m => m instanceof Potree.Measure);

		let points = measurements.filter(m => (m instanceof Potree.Measure))
			.map(m => m.points)
			.reduce((a, v) => a.concat(v))
			.map(p => p.position);

		let min = new THREE.Vector3(Infinity, Infinity, Infinity);
		let max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
		for (let point of points) {
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

		for (let measurement of measurements) {
			dxfBody += Potree.DXFExporter.measurementSection(measurement);
		}

		dxfBody += `0
ENDSEC
`;

		let dxf = dxfHeader + dxfBody + '0\nEOF';

		return dxf;
	}
};


Potree.CSVExporter = class CSVExporter {
	static toString (points) {
		let string = '';

		let attributes = Object.keys(points.data)
			.filter(a => a !== 'normal')
			.sort((a, b) => {
				if (a === 'position') return -1;
				if (b === 'position') return 1;
				if (a === 'color') return -1;
				if (b === 'color') return 1;
			});

		let headerValues = [];
		for (let attribute of attributes) {
			let itemSize = points.data[attribute].length / points.numPoints;

			if (attribute === 'position') {
				headerValues = headerValues.concat(['x', 'y', 'z']);
			} else if (attribute === 'color') {
				headerValues = headerValues.concat(['r', 'g', 'b', 'a']);
			} else if (itemSize > 1) {
				for (let i = 0; i < itemSize; i++) {
					headerValues.push(`${attribute}_${i}`);
				}
			} else {
				headerValues.push(attribute);
			}
		}
		string = headerValues.join(', ') + '\n';

		for (let i = 0; i < points.numPoints; i++) {
			let values = [];

			for (let attribute of attributes) {
				let itemSize = points.data[attribute].length / points.numPoints;
				let value = points.data[attribute]
					.subarray(itemSize * i, itemSize * i + itemSize)
					.join(', ');
				values.push(value);
			}

			string += values.join(', ') + '\n';
		}

		return string;
	}
};


Potree.LASExporter = class LASExporter {
	static toLAS (points) {
		// TODO Unused: let string = '';

		let boundingBox = points.boundingBox;
		let offset = boundingBox.min.clone();
		let diagonal = boundingBox.min.distanceTo(boundingBox.max);
		let scale = new THREE.Vector3(0.001, 0.001, 0.001);
		if (diagonal > 1000 * 1000) {
			scale = new THREE.Vector3(0.01, 0.01, 0.01);
		} else {
			scale = new THREE.Vector3(0.001, 0.001, 0.001);
		}

		let setString = function (string, offset, buffer) {
			let view = new Uint8Array(buffer);

			for (let i = 0; i < string.length; i++) {
				let charCode = string.charCodeAt(i);
				view[offset + i] = charCode;
			}
		};

		let buffer = new ArrayBuffer(227 + 28 * points.numPoints);
		let view = new DataView(buffer);
		let u8View = new Uint8Array(buffer);
		// let u16View = new Uint16Array(buffer);

		setString('LASF', 0, buffer);
		u8View[24] = 1;
		u8View[25] = 2;

		// system identifier o:26 l:32

		// generating software o:58 l:32
		setString('Potree 1.5', 58, buffer);

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
		for (let i = 0; i < points.numPoints; i++) {

			let px = points.data.position[3 * i + 0];
			let py = points.data.position[3 * i + 1];
			let pz = points.data.position[3 * i + 2];

			let ux = parseInt((px - offset.x) / scale.x);
			let uy = parseInt((py - offset.y) / scale.y);
			let uz = parseInt((pz - offset.z) / scale.z);

			view.setUint32(boffset + 0, ux, true);
			view.setUint32(boffset + 4, uy, true);
			view.setUint32(boffset + 8, uz, true);

			if (points.data.intensity) {
				view.setUint16(boffset + 12, (points.data.intensity[i]), true);
			}

			let rt = 0;
			if (points.data.returnNumber) {
				rt += points.data.returnNumber[i];
			}
			if (points.data.numberOfReturns) {
				rt += (points.data.numberOfReturns[i] << 3);
			}
			view.setUint8(boffset + 14, rt);

			if (points.data.classification) {
				view.setUint8(boffset + 15, points.data.classification[i]);
			}
			// scan angle rank
			// user data
			// point source id
			if (points.data.pointSourceID) {
				view.setUint16(boffset + 18, points.data.pointSourceID[i]);
			}

			if (points.data.color) {
				view.setUint16(boffset + 20, (points.data.color[4 * i + 0] * 255), true);
				view.setUint16(boffset + 22, (points.data.color[4 * i + 1] * 255), true);
				view.setUint16(boffset + 24, (points.data.color[4 * i + 2] * 255), true);
			}

			boffset += 28;
		}

		return buffer;
	}
};


Potree.PointCloudArena4DNode = class PointCloudArena4DNode extends Potree.PointCloudTreeNode {
	constructor () {
		super();

		this.left = null;
		this.right = null;
		this.sceneNode = null;
		this.kdtree = null;
	}

	getNumPoints () {
		return this.geometryNode.numPoints;
	}

	isLoaded () {
		return true;
	}

	isTreeNode () {
		return true;
	}

	isGeometryNode () {
		return false;
	}

	getLevel () {
		return this.geometryNode.level;
	}

	getBoundingSphere () {
		return this.geometryNode.boundingSphere;
	}

	getBoundingBox () {
		return this.geometryNode.boundingBox;
	}

	toTreeNode (child) {
		let geometryNode = null;

		if (this.left === child) {
			geometryNode = this.left;
		} else if (this.right === child) {
			geometryNode = this.right;
		}

		if (!geometryNode.loaded) {
			return;
		}

		let node = new Potree.PointCloudArena4DNode();
		let sceneNode = THREE.PointCloud(geometryNode.geometry, this.kdtree.material);
		sceneNode.visible = false;

		node.kdtree = this.kdtree;
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.parent = this;
		node.left = this.geometryNode.left;
		node.right = this.geometryNode.right;
	}

	getChildren () {
		let children = [];

		if (this.left) {
			children.push(this.left);
		}

		if (this.right) {
			children.push(this.right);
		}

		return children;
	}
};

Potree.PointCloudArena4D = class PointCloudArena4D extends Potree.PointCloudTree{
	constructor (geometry) {
		super();

		this.root = null;
		if (geometry.root) {
			this.root = geometry.root;
		} else {
			geometry.addEventListener('hierarchy_loaded', () => {
				this.root = geometry.root;
			});
		}

		this.visiblePointsTarget = 2 * 1000 * 1000;
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
		this.name = '';
	}

	getBoundingBoxWorld () {
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);

		return tBox;
	};

	setName (name) {
		if (this.name !== name) {
			this.name = name;
			this.dispatchEvent({type: 'name_changed', name: name, pointcloud: this});
		}
	}

	getName () {
		return this.name;
	}

	getLevel () {
		return this.level;
	}

	toTreeNode (geometryNode, parent) {
		let node = new Potree.PointCloudArena4DNode();
		let sceneNode = new THREE.Points(geometryNode.geometry, this.material);

		sceneNode.frustumCulled = false;
		sceneNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
			if (material.program) {
				_this.getContext().useProgram(material.program.program);

				if (material.program.getUniforms().map.level) {
					let level = geometryNode.getLevel();
					material.uniforms.level.value = level;
					material.program.getUniforms().map.level.setValue(_this.getContext(), level);
				}

				if (this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart) {
					let vnStart = this.visibleNodeTextureOffsets.get(node);
					material.uniforms.vnStart.value = vnStart;
					material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
				}

				if (material.program.getUniforms().map.pcIndex) {
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

		if (!parent) {
			this.root = node;
			this.add(sceneNode);
		} else {
			parent.sceneNode.add(sceneNode);

			if (parent.left === geometryNode) {
				parent.left = node;
			} else if (parent.right === geometryNode) {
				parent.right = node;
			}
		}

		let disposeListener = function () {
			parent.sceneNode.remove(node.sceneNode);

			if (parent.left === node) {
				parent.left = geometryNode;
			} else if (parent.right === node) {
				parent.right = geometryNode;
			}
		};
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);

		return node;
	}

	updateMaterial (material, visibleNodes, camera, renderer) {
		material.fov = camera.fov * (Math.PI / 180);
		material.screenWidth = renderer.domElement.clientWidth;
		material.screenHeight = renderer.domElement.clientHeight;
		material.spacing = this.pcoGeometry.spacing;
		material.near = camera.near;
		material.far = camera.far;

		// reduce shader source updates by setting maxLevel slightly higher than actually necessary
		if (this.maxLevel > material.levels) {
			material.levels = this.maxLevel + 2;
		}

		// material.uniforms.octreeSize.value = this.boundingBox.size().x;
		let bbSize = this.boundingBox.getSize();
		material.bbSize = [bbSize.x, bbSize.y, bbSize.z];
	}

	updateVisibleBounds () {

	}

	hideDescendants (object) {
		let stack = [];
		for (let i = 0; i < object.children.length; i++) {
			let child = object.children[i];
			if (child.visible) {
				stack.push(child);
			}
		}

		while (stack.length > 0) {
			let child = stack.shift();

			child.visible = false;
			if (child.boundingBoxNode) {
				child.boundingBoxNode.visible = false;
			}

			for (let i = 0; i < child.children.length; i++) {
				let childOfChild = child.children[i];
				if (childOfChild.visible) {
					stack.push(childOfChild);
				}
			}
		}
	}

	updateMatrixWorld (force) {
		// node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );

		if (this.matrixAutoUpdate === true) this.updateMatrix();

		if (this.matrixWorldNeedsUpdate === true || force === true) {
			if (this.parent === undefined) {
				this.matrixWorld.copy(this.matrix);
			} else {
				this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
			}

			this.matrixWorldNeedsUpdate = false;

			force = true;
		}
	}

	nodesOnRay (nodes, ray) {
		let nodesOnRay = [];

		let _ray = ray.clone();
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			let sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
			// TODO Unused: let box = node.getBoundingBox().clone().applyMatrix4(node.sceneNode.matrixWorld);

			if (_ray.intersectsSphere(sphere)) {
				nodesOnRay.push(node);
			}
			// if(_ray.isIntersectionBox(box)){
			//	nodesOnRay.push(node);
			// }
		}

		return nodesOnRay;
	}

	pick(viewer, camera, ray, params = {}){

		let renderer = viewer.renderer;
		let pRenderer = viewer.pRenderer;

		performance.mark("pick-start");

		let getVal = (a, b) => a !== undefined ? a : b;

		let pickWindowSize = getVal(params.pickWindowSize, 17);
		let pickOutsideClipRegion = getVal(params.pickOutsideClipRegion, false);

		let size = renderer.getSize();

		let width = Math.ceil(getVal(params.width, size.width));
		let height = Math.ceil(getVal(params.height, size.height));

		let pointSizeType = getVal(params.pointSizeType, this.material.pointSizeType);
		let pointSize = getVal(params.pointSize, this.material.size);

		let nodes = this.nodesOnRay(this.visibleNodes, ray);

		if (nodes.length === 0) {
			return null;
		}

		if (!this.pickState) {
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
			pickMaterial.pointSizeType = pointSizeType;
			pickMaterial.shape = this.material.shape;

			pickMaterial.size = pointSize;
			pickMaterial.uniforms.minSize.value = this.material.uniforms.minSize.value;
			pickMaterial.uniforms.maxSize.value = this.material.uniforms.maxSize.value;
			pickMaterial.classification = this.material.classification;
			if(params.pickClipped){
				pickMaterial.clipBoxes = this.material.clipBoxes;
				if(this.material.clipTask === Potree.ClipTask.HIGHLIGHT){
					pickMaterial.clipTask = Potree.ClipTask.NONE;
				}else{
					pickMaterial.clipTask = this.material.clipTask;
				}
			}else{
				pickMaterial.clipBoxes = [];
			}
			
			this.updateMaterial(pickMaterial, nodes, camera, renderer);
		}

		pickState.renderTarget.setSize(width, height);

		let pixelPos = new THREE.Vector2(params.x, params.y);
		
		let gl = renderer.getContext();
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(
			parseInt(pixelPos.x - (pickWindowSize - 1) / 2),
			parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
			parseInt(pickWindowSize), parseInt(pickWindowSize));


		renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
		renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
		renderer.state.setBlending(THREE.NoBlending);

		renderer.clearTarget(pickState.renderTarget, true, true, true);

		{ // RENDER
			renderer.setRenderTarget(pickState.renderTarget);
			gl.clearColor(0, 0, 0, 0);
			renderer.clearTarget( pickState.renderTarget, true, true, true );
			
			let tmp = this.material;
			this.material = pickMaterial;
			
			pRenderer.renderOctree(this, nodes, camera, pickState.renderTarget);
			
			this.material = tmp;
		}

		let clamp = (number, min, max) => Math.min(Math.max(min, number), max);

		let x = parseInt(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width));
		let y = parseInt(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height));
		let w = parseInt(Math.min(x + pickWindowSize, width) - x);
		let h = parseInt(Math.min(y + pickWindowSize, height) - y);

		let pixelCount = w * h;
		let buffer = new Uint8Array(4 * pixelCount);
		
		gl.readPixels(x, y, pickWindowSize, pickWindowSize, gl.RGBA, gl.UNSIGNED_BYTE, buffer); 
		
		renderer.setRenderTarget(null);
		renderer.resetGLState();
		renderer.setScissorTest(false);
		gl.disable(gl.SCISSOR_TEST);
		
		let pixels = buffer;
		let ibuffer = new Uint32Array(buffer.buffer);

		// find closest hit inside pixelWindow boundaries
		let min = Number.MAX_VALUE;
		let hits = [];
		for (let u = 0; u < pickWindowSize; u++) {
			for (let v = 0; v < pickWindowSize; v++) {
				let offset = (u + v * pickWindowSize);
				let distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

				let pcIndex = pixels[4 * offset + 3];
				pixels[4 * offset + 3] = 0;
				let pIndex = ibuffer[offset];

				if(!(pcIndex === 0 && pIndex === 0) && (pcIndex !== undefined) && (pIndex !== undefined)){
					let hit = {
						pIndex: pIndex,
						pcIndex: pcIndex,
						distanceToCenter: distance
					};

					if(params.all){
						hits.push(hit);
					}else{
						if(hits.length > 0){
							if(distance < hits[0].distanceToCenter){
								hits[0] = hit;
							}
						}else{
							hits.push(hit);
						}
					}

					
				}
			}
		}



		for(let hit of hits){
			let point = {};
		
			if (!nodes[hit.pcIndex]) {
				return null;
			}
		
			let node = nodes[hit.pcIndex];
			let pc = node.sceneNode;
			let geometry = node.geometryNode.geometry;
			
			for(let attributeName in geometry.attributes){
				let attribute = geometry.attributes[attributeName];
		
				if (attributeName === 'position') {
					let x = attribute.array[3 * hit.pIndex + 0];
					let y = attribute.array[3 * hit.pIndex + 1];
					let z = attribute.array[3 * hit.pIndex + 2];
					
					let position = new THREE.Vector3(x, y, z);
					position.applyMatrix4(pc.matrixWorld);
		
					point[attributeName] = position;
				} else if (attributeName === 'indices') {
		
				} else {
					//if (values.itemSize === 1) {
					//	point[attribute.name] = values.array[hit.pIndex];
					//} else {
					//	let value = [];
					//	for (let j = 0; j < values.itemSize; j++) {
					//		value.push(values.array[values.itemSize * hit.pIndex + j]);
					//	}
					//	point[attribute.name] = value;
					//}
				}
				
			}

			hit.point = point;
		}

		performance.mark("pick-end");
		performance.measure("pick", "pick-start", "pick-end");

		if(params.all){
			return hits.map(hit => hit.point);
		}else{
			if(hits.length === 0){
				return null;
			}else{
				return hits[0].point;
			}
		}
	}

	computeVisibilityTextureData(nodes){

		if(Potree.measureTimings) performance.mark("computeVisibilityTextureData-start");

		let data = new Uint8Array(nodes.length * 3);
		let visibleNodeTextureOffsets = new Map();

		// copy array
		nodes = nodes.slice();

		// sort by level and number
		let sort = function (a, b) {
			let la = a.geometryNode.level;
			let lb = b.geometryNode.level;
			let na = a.geometryNode.number;
			let nb = b.geometryNode.number;
			if (la !== lb) return la - lb;
			if (na < nb) return -1;
			if (na > nb) return 1;
			return 0;
		};
		nodes.sort(sort);

		let visibleNodeNames = [];
		for (let i = 0; i < nodes.length; i++) {
			visibleNodeNames.push(nodes[i].geometryNode.number);
		}

		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];

			visibleNodeTextureOffsets.set(node, i);

			let b1 = 0;	// children
			let b2 = 0;	// offset to first child
			let b3 = 0;	// split

			if (node.geometryNode.left && visibleNodeNames.indexOf(node.geometryNode.left.number) > 0) {
				b1 += 1;
				b2 = visibleNodeNames.indexOf(node.geometryNode.left.number) - i;
			}
			if (node.geometryNode.right && visibleNodeNames.indexOf(node.geometryNode.right.number) > 0) {
				b1 += 2;
				b2 = (b2 === 0) ? visibleNodeNames.indexOf(node.geometryNode.right.number) - i : b2;
			}

			if (node.geometryNode.split === 'X') {
				b3 = 1;
			} else if (node.geometryNode.split === 'Y') {
				b3 = 2;
			} else if (node.geometryNode.split === 'Z') {
				b3 = 4;
			}

			data[i * 3 + 0] = b1;
			data[i * 3 + 1] = b2;
			data[i * 3 + 2] = b3;
		}

		if(Potree.measureTimings){
			performance.mark("computeVisibilityTextureData-end");
			performance.measure("render.computeVisibilityTextureData", "computeVisibilityTextureData-start", "computeVisibilityTextureData-end");
		}

		return {
			data: data,
			offsets: visibleNodeTextureOffsets
		};
	}

	get progress () {
		if (this.pcoGeometry.root) {
			return Potree.numNodesLoading > 0 ? 0 : 1;
		} else {
			return 0;
		}
	}
};


Potree.PointCloudArena4DGeometryNode = class PointCloudArena4DGeometryNode{

	constructor(){
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
	}

	isGeometryNode(){
		return true;
	}

	isTreeNode(){
		return false;
	}

	isLoaded(){
		return this.loaded;
	}

	getBoundingSphere(){
		return this.boundingSphere;
	}

	getBoundingBox(){
		return this.boundingBox;
	}

	getChildren(){
		let children = [];

		if (this.left) {
			children.push(this.left);
		}

		if (this.right) {
			children.push(this.right);
		}

		return children;
	}

	getBoundingBox(){
		return this.boundingBox;
	}

	getLevel(){
		return this.level;
	}

	load(){
		if (this.loaded || this.loading) {
			return;
		}

		if (Potree.numNodesLoading >= Potree.maxNodesLoading) {
			return;
		}

		this.loading = true;

		Potree.numNodesLoading++;

		let url = this.pcoGeometry.url + '?node=' + this.number;
		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';

		let node = this;

		xhr.onreadystatechange = function () {
			if (!(xhr.readyState === 4 && xhr.status === 200)) {
				return;
			}

			let buffer = xhr.response;
			let sourceView = new DataView(buffer);
			let numPoints = buffer.byteLength / 17;
			let bytesPerPoint = 28;

			let data = new ArrayBuffer(numPoints * bytesPerPoint);
			let targetView = new DataView(data);

			let attributes = [
				Potree.PointAttribute.POSITION_CARTESIAN,
				Potree.PointAttribute.RGBA_PACKED,
				Potree.PointAttribute.INTENSITY,
				Potree.PointAttribute.CLASSIFICATION,
			];


			let position = new Float32Array(numPoints * 3);
			let color = new Uint8Array(numPoints * 4);
			let intensities = new Float32Array(numPoints);
			let classifications = new Uint8Array(numPoints);
			let indices = new ArrayBuffer(numPoints * 4);
			let u32Indices = new Uint32Array(indices);

			let tightBoundingBox = new THREE.Box3();

			for (let i = 0; i < numPoints; i++) {
				let x = sourceView.getFloat32(i * 17 + 0, true) + node.boundingBox.min.x;
				let y = sourceView.getFloat32(i * 17 + 4, true) + node.boundingBox.min.y;
				let z = sourceView.getFloat32(i * 17 + 8, true) + node.boundingBox.min.z;

				let r = sourceView.getUint8(i * 17 + 12, true);
				let g = sourceView.getUint8(i * 17 + 13, true);
				let b = sourceView.getUint8(i * 17 + 14, true);

				let intensity = sourceView.getUint8(i * 17 + 15, true);

				let classification = sourceView.getUint8(i * 17 + 16, true);

				tightBoundingBox.expandByPoint(new THREE.Vector3(x, y, z));

				position[i * 3 + 0] = x;
				position[i * 3 + 1] = y;
				position[i * 3 + 2] = z;

				color[i * 4 + 0] = r;
				color[i * 4 + 1] = g;
				color[i * 4 + 2] = b;
				color[i * 4 + 3] = 255;

				intensities[i] = intensity;
				classifications[i] = classification;

				u32Indices[i] = i;
			}

			let geometry = new THREE.BufferGeometry();

			geometry.addAttribute('position', new THREE.BufferAttribute(position, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(color, 4, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(intensities, 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			{
				let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(indices), 4, true);
				//bufferAttribute.normalized = true;
				geometry.addAttribute('indices', bufferAttribute);
			}
		
			node.geometry = geometry;
			node.numPoints = numPoints;
			node.loaded = true;
			node.loading = false;
			Potree.numNodesLoading--;
		};

		xhr.send(null);
	}

	dispose(){
		if (this.geometry && this.parent != null) {
			this.geometry.dispose();
			this.geometry = null;
			this.loaded = false;

			// this.dispatchEvent( { type: 'dispose' } );
			for (let i = 0; i < this.oneTimeDisposeHandlers.length; i++) {
				let handler = this.oneTimeDisposeHandlers[i];
				handler();
			}
			this.oneTimeDisposeHandlers = [];
		}
	}

	getNumPoints(){
		return this.numPoints;
	}
};





Potree.PointCloudArena4DGeometry = class PointCloudArena4DGeometry extends THREE.EventDispatcher{

	constructor(){
		super();

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
			'POSITION_CARTESIAN',
			'COLOR_PACKED'
		]);
	}

	static load(url, callback) {
		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url + '?info', true);

		xhr.onreadystatechange = function () {
			try {
				if (xhr.readyState === 4 && xhr.status === 200) {
					let response = JSON.parse(xhr.responseText);

					let geometry = new Potree.PointCloudArena4DGeometry();
					geometry.url = url;
					geometry.name = response.Name;
					geometry.provider = response.Provider;
					geometry.numNodes = response.Nodes;
					geometry.numPoints = response.Points;
					geometry.version = response.Version;
					geometry.boundingBox = new THREE.Box3(
						new THREE.Vector3().fromArray(response.BoundingBox.slice(0, 3)),
						new THREE.Vector3().fromArray(response.BoundingBox.slice(3, 6))
					);
					if (response.Spacing) {
						geometry.spacing = response.Spacing;
					}

					let offset = geometry.boundingBox.min.clone().multiplyScalar(-1);

					geometry.boundingBox.min.add(offset);
					geometry.boundingBox.max.add(offset);
					geometry.offset = offset;

					let center = geometry.boundingBox.getCenter();
					let radius = geometry.boundingBox.getSize().length() / 2;
					geometry.boundingSphere = new THREE.Sphere(center, radius);

					geometry.loadHierarchy();

					callback(geometry);
				} else if (xhr.readyState === 4) {
					callback(null);
				}
			} catch (e) {
				console.error(e.message);
				callback(null);
			}
		};

		xhr.send(null);
	};

	loadHierarchy(){
		let url = this.url + '?tree';
		let xhr = Potree.XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';

		xhr.onreadystatechange = () => {
			if (!(xhr.readyState === 4 && xhr.status === 200)) {
				return;
			}

			let buffer = xhr.response;
			let numNodes = buffer.byteLength /	3;
			let view = new DataView(buffer);
			let stack = [];
			let root = null;

			let levels = 0;

			// TODO Debug: let start = new Date().getTime();
			// read hierarchy
			for (let i = 0; i < numNodes; i++) {
				let mask = view.getUint8(i * 3 + 0, true);
				// TODO Unused: let numPoints = view.getUint16(i * 3 + 1, true);

				let hasLeft = (mask & 1) > 0;
				let hasRight = (mask & 2) > 0;
				let splitX = (mask & 4) > 0;
				let splitY = (mask & 8) > 0;
				let splitZ = (mask & 16) > 0;
				let split = null;
				if (splitX) {
					split = 'X';
				} else if (splitY) {
					split = 'Y';
				} if (splitZ) {
					split = 'Z';
				}

				let node = new Potree.PointCloudArena4DGeometryNode();
				node.hasLeft = hasLeft;
				node.hasRight = hasRight;
				node.split = split;
				node.isLeaf = !hasLeft && !hasRight;
				node.number = i;
				node.left = null;
				node.right = null;
				node.pcoGeometry = this;
				node.level = stack.length;
				levels = Math.max(levels, node.level);

				if (stack.length > 0) {
					let parent = stack[stack.length - 1];
					node.boundingBox = parent.boundingBox.clone();
					let parentBBSize = parent.boundingBox.getSize();

					if (parent.hasLeft && !parent.left) {
						parent.left = node;
						parent.children.push(node);

						if (parent.split === 'X') {
							node.boundingBox.max.x = node.boundingBox.min.x + parentBBSize.x / 2;
						} else if (parent.split === 'Y') {
							node.boundingBox.max.y = node.boundingBox.min.y + parentBBSize.y / 2;
						} else if (parent.split === 'Z') {
							node.boundingBox.max.z = node.boundingBox.min.z + parentBBSize.z / 2;
						}

						let center = node.boundingBox.getCenter();
						let radius = node.boundingBox.getSize().length() / 2;
						node.boundingSphere = new THREE.Sphere(center, radius);
					} else {
						parent.right = node;
						parent.children.push(node);

						if (parent.split === 'X') {
							node.boundingBox.min.x = node.boundingBox.min.x + parentBBSize.x / 2;
						} else if (parent.split === 'Y') {
							node.boundingBox.min.y = node.boundingBox.min.y + parentBBSize.y / 2;
						} else if (parent.split === 'Z') {
							node.boundingBox.min.z = node.boundingBox.min.z + parentBBSize.z / 2;
						}

						let center = node.boundingBox.getCenter();
						let radius = node.boundingBox.getSize().length() / 2;
						node.boundingSphere = new THREE.Sphere(center, radius);
					}
				} else {
					root = node;
					root.boundingBox = this.boundingBox.clone();
					let center = root.boundingBox.getCenter();
					let radius = root.boundingBox.getSize().length() / 2;
					root.boundingSphere = new THREE.Sphere(center, radius);
				}

				let bbSize = node.boundingBox.getSize();
				node.spacing = ((bbSize.x + bbSize.y + bbSize.z) / 3) / 75;
				node.estimatedSpacing = node.spacing;

				stack.push(node);

				if (node.isLeaf) {
					let done = false;
					while (!done && stack.length > 0) {
						stack.pop();

						let top = stack[stack.length - 1];

						done = stack.length > 0 && top.hasRight && top.right == null;
					}
				}
			}
			// TODO Debug:
			// let end = new Date().getTime();
			// let parseDuration = end - start;
			// let msg = parseDuration;
			// document.getElementById("lblDebug").innerHTML = msg;

			this.root = root;
			this.levels = levels;
			// console.log(this.root);

			this.dispatchEvent({type: 'hierarchy_loaded'});
		};

		xhr.send(null);
	};

	get spacing(){
		if (this._spacing) {
			return this._spacing;
		} else if (this.root) {
			return this.root.spacing;
		} else {
			// TODO ???: null;
		}
	}

	set spacing(value){
		this._spacing = value;
	}

};



class PotreeRenderer {
	constructor (viewer) {
		this.viewer = viewer;
	};
 
	render(){
		const viewer = this.viewer;
		let query = Potree.startQuery('render', viewer.renderer.getContext());

		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

		// render skybox
		if(viewer.background === "skybox"){
			viewer.renderer.clear(true, true, false);
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			viewer.renderer.clear(true, true, false);
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear(true, true, false);
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear(true, true, false);
		}else{
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear(true, true, false);
		}
		
		for(let pointcloud of this.viewer.scene.pointclouds){
			pointcloud.material.useEDL = false;
		}
		
		//let queryPC = Potree.startQuery("PointCloud", viewer.renderer.getContext());
		let activeCam = viewer.scene.getActiveCamera();
		//viewer.renderer.render(viewer.scene.scenePointCloud, activeCam);
		
		viewer.pRenderer.render(viewer.scene.scenePointCloud, activeCam);
		
		
		//Potree.endQuery(queryPC, viewer.renderer.getContext());
		
		// render scene
		viewer.renderer.render(viewer.scene.scene, activeCam);

		viewer.dispatchEvent({type: "render.pass.scene",viewer: viewer});
		
		viewer.clippingTool.update();
		viewer.renderer.render(viewer.clippingTool.sceneMarker, viewer.scene.cameraScreenSpace); //viewer.scene.cameraScreenSpace);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, activeCam);

		viewer.renderer.render(viewer.controls.sceneControls, activeCam);
		
		viewer.renderer.clearDepth();
		
		viewer.transformationTool.update();
		
		viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});
		
		viewer.renderer.render(viewer.transformationTool.scene, activeCam);

		viewer.renderer.setViewport(viewer.renderer.domElement.clientWidth - viewer.navigationCube.width, 
									viewer.renderer.domElement.clientHeight - viewer.navigationCube.width, 
									viewer.navigationCube.width, viewer.navigationCube.width);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		viewer.renderer.setViewport(0, 0, viewer.renderer.domElement.clientWidth, viewer.renderer.domElement.clientHeight);

		viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});
		
		Potree.endQuery(query, viewer.renderer.getContext());
	};
};



class EDLRenderer{
	constructor(viewer){
		this.viewer = viewer;

		this.edlMaterial = null;

		this.rtRegular;
		this.rtEDL;

		this.gl = viewer.renderer.context;

		this.shadowMap = new Potree.PointCloudSM(this.viewer.pRenderer);
	}

	initEDL(){
		if (this.edlMaterial != null) {
			return;
		}

		this.edlMaterial = new Potree.EyeDomeLightingMaterial();
		this.edlMaterial.depthTest = true;
		this.edlMaterial.depthWrite = true;
		this.edlMaterial.transparent = true;

		this.rtEDL = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});

		this.rtRegular = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});
		
		//{
		//	let geometry = new THREE.PlaneBufferGeometry( 1, 1, 32, 32);
		//	let material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map: this.shadowMap.target.texture} );
		//	let plane = new THREE.Mesh( geometry, material );
		//	plane.scale.set(0.5, 0.5, 1.0);
		//	plane.position.set(plane.scale.x / 2, plane.scale.y / 2, 0);
		//	this.viewer.overlay.add(plane);
		//}
	};

	resize(){
		const viewer = this.viewer;

		let pixelRatio = viewer.renderer.getPixelRatio();
		let {width, height} = viewer.renderer.getSize();

		if(this.screenshot){
			width = this.screenshot.target.width;
			height = this.screenshot.target.height;
		}

		this.rtEDL.setSize(width * pixelRatio , height * pixelRatio);
		this.rtRegular.setSize(width * pixelRatio , height * pixelRatio);
	}

	makeScreenshot(camera, size, callback){

		if(camera === undefined || camera === null){
			camera = this.viewer.scene.getActiveCamera();
		}

		if(size === undefined || size === null){
			size = this.viewer.renderer.getSize();
		}

		let {width, height} = size;

		//let maxTextureSize = viewer.renderer.capabilities.maxTextureSize;
		//if(width * 4 < 
		width = 2 * width;
		height = 2 * height;

		let target = new THREE.WebGLRenderTarget(width, height, {
			format: THREE.RGBAFormat,
		});

		this.screenshot = {
			target: target
		};

		this.viewer.renderer.clearTarget(target, true, true, true);

		this.render();

		let pixelCount = width * height;
		let buffer = new Uint8Array(4 * pixelCount);

		this.viewer.renderer.readRenderTargetPixels(target, 0, 0, width, height, buffer);

		// flip vertically
		let bytesPerLine = width * 4;
		for(let i = 0; i < parseInt(height / 2); i++){
			let j = height - i - 1;

			let lineI = buffer.slice(i * bytesPerLine, i * bytesPerLine + bytesPerLine);
			let lineJ = buffer.slice(j * bytesPerLine, j * bytesPerLine + bytesPerLine);
			buffer.set(lineJ, i * bytesPerLine);
			buffer.set(lineI, j * bytesPerLine);
		}

		this.screenshot.target.dispose();
		delete this.screenshot;

		return {
			width: width,
			height: height,
			buffer: buffer
		};
	}

	render(){
		this.initEDL();
		const viewer = this.viewer;

		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

		this.resize();

		if(this.screenshot){
			let oldBudget = Potree.pointBudget;
			Potree.pointBudget = Math.max(10 * 1000 * 1000, 2 * oldBudget);
			let result = Potree.updatePointClouds(
				viewer.scene.pointclouds, 
				viewer.scene.getActiveCamera(), 
				viewer.renderer);
			Potree.pointBudget = oldBudget;
		}

		let camera = viewer.scene.getActiveCamera();

		let lights = [];
		viewer.scene.scene.traverse(node => {
			if(node instanceof THREE.SpotLight){
				lights.push(node);
			}
		});

		let querySkybox = Potree.startQuery('EDL - Skybox', viewer.renderer.getContext());
		
		if(viewer.background === "skybox"){
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		} else if (viewer.background === 'gradient') {
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		} else if (viewer.background === 'black') {
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear();
		} else if (viewer.background === 'white') {
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear();
		} else {
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		}

		Potree.endQuery(querySkybox, viewer.renderer.getContext());

		// TODO adapt to multiple lights
		if(lights.length > 0 && !(lights[0].disableShadowUpdates)){
			let light = lights[0];

			let queryShadows = Potree.startQuery('EDL - shadows', viewer.renderer.getContext());

			this.shadowMap.setLight(light);

			let originalAttributes = new Map();
			for(let pointcloud of viewer.scene.pointclouds){
				originalAttributes.set(pointcloud, pointcloud.material.pointColorType);
				pointcloud.material.disableEvents();
				pointcloud.material.pointColorType = Potree.PointColorType.DEPTH;
			}

			this.shadowMap.render(viewer.scene.scenePointCloud, camera);

			for(let pointcloud of viewer.scene.pointclouds){
				let originalAttribute = originalAttributes.get(pointcloud);
				pointcloud.material.pointColorType = originalAttribute;
				pointcloud.material.enableEvents();
			}

			viewer.shadowTestCam.updateMatrixWorld();
			viewer.shadowTestCam.matrixWorldInverse.getInverse(viewer.shadowTestCam.matrixWorld);
			viewer.shadowTestCam.updateProjectionMatrix();

			Potree.endQuery(queryShadows, viewer.renderer.getContext());
		}

		let queryColors = Potree.startQuery('EDL - colorpass', viewer.renderer.getContext());

		viewer.renderer.render(viewer.scene.scene, camera);
		
		//viewer.renderer.clearTarget( this.rtColor, true, true, true );
		viewer.renderer.clearTarget(this.rtEDL, true, true, true);
		viewer.renderer.clearTarget(this.rtRegular, true, true, false);

		let width = viewer.renderer.getSize().width;
		let height = viewer.renderer.getSize().height;

		// COLOR & DEPTH PASS
		for (let pointcloud of viewer.scene.pointclouds) {
			let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

			let material = pointcloud.material;
			material.weighted = false;
			material.useLogarithmicDepthBuffer = false;
			material.useEDL = true;

			material.screenWidth = width;
			material.screenHeight = height;
			material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
			material.uniforms.octreeSize.value = octreeSize;
			material.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
		}
		
		// TODO adapt to multiple lights
		if(lights.length > 0){
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtEDL, {
				shadowMaps: [this.shadowMap],
				transparent: false,
			});
		}else{
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtEDL, {
				transparent: false,
			});
		}

		viewer.renderer.render(viewer.scene.scene, camera, this.rtRegular);

		//viewer.renderer.setRenderTarget(this.rtColor);
		viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer, renderTarget: this.rtRegular});

		Potree.endQuery(queryColors, viewer.renderer.getContext());
		
		{ // EDL OCCLUSION PASS
			let queryEDL = Potree.startQuery('EDL - resolve', viewer.renderer.getContext());

			this.edlMaterial.uniforms.screenWidth.value = width;
			this.edlMaterial.uniforms.screenHeight.value = height;

			//this.edlMaterial.uniforms.colorMap.value = this.rtColor.texture;

			this.edlMaterial.uniforms.uRegularColor.value = this.rtRegular.texture;
			this.edlMaterial.uniforms.uEDLColor.value = this.rtEDL.texture;
			this.edlMaterial.uniforms.uRegularDepth.value = this.rtRegular.depthTexture;
			this.edlMaterial.uniforms.uEDLDepth.value = this.rtEDL.depthTexture;

			this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
			this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
			this.edlMaterial.uniforms.opacity.value = 1;
			
			Potree.utils.screenPass.render(viewer.renderer, this.edlMaterial);

			if(this.screenshot){
				Potree.utils.screenPass.render(viewer.renderer, this.edlMaterial, this.screenshot.target);
			}

			Potree.endQuery(queryEDL, viewer.renderer.getContext());
		}

		let queryRest = Potree.startQuery('EDL - rest', viewer.renderer.getContext());

		viewer.renderer.clearDepth();

		viewer.transformationTool.update();

		viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

		viewer.renderer.render(viewer.controls.sceneControls, camera);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.transformationTool.scene, camera);
		
		viewer.renderer.setViewport(width - viewer.navigationCube.width, 
									height - viewer.navigationCube.width, 
									viewer.navigationCube.width, viewer.navigationCube.width);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		viewer.renderer.setViewport(0, 0, width, height);

		viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});

		Potree.endQuery(queryRest, viewer.renderer.getContext());
		
	}
};




class HQSplatRenderer {
	constructor (viewer) {
		this.viewer = viewer;

		this.depthMaterials = new Map();
		this.attributeMaterials = new Map();
		this.normalizationMaterial = null;

		this.rtDepth = null;
		this.rtAttribute = null;
		this.gl = viewer.renderer.context;

		this.initialized = false;
	}

	init(){
		if (this.initialized) {
			return;
		}

		this.normalizationMaterial = new Potree.NormalizationMaterial();
		this.normalizationMaterial.depthTest = true;
		this.normalizationMaterial.depthWrite = true;
		this.normalizationMaterial.transparent = true;

		this.normalizationEDLMaterial = new Potree.NormalizationEDLMaterial();
		this.normalizationEDLMaterial.depthTest = true;
		this.normalizationEDLMaterial.depthWrite = true;
		this.normalizationEDLMaterial.transparent = true;

		this.rtDepth = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});

		this.rtAttribute = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTexture: this.rtDepth.depthTexture,
			//depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});
		
		//{
		//	let geometry = new THREE.PlaneBufferGeometry( 1, 1, 32, 32);
		//	let material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map: this.rtDepth.texture} );
		//	let plane = new THREE.Mesh( geometry, material );
		//	plane.scale.set(0.3, 0.3, 1.0);
		//	plane.position.set(plane.scale.x / 2, plane.scale.y / 2, 0);
		//	this.viewer.overlay.add(plane);
		//}

		this.initialized = true;
	};

	resize () {
		const viewer = this.viewer;

		let pixelRatio = viewer.renderer.getPixelRatio();
		let width = viewer.renderer.getSize().width;
		let height = viewer.renderer.getSize().height;
		this.rtDepth.setSize(width * pixelRatio , height * pixelRatio);
		this.rtAttribute.setSize(width * pixelRatio , height * pixelRatio);
	}

	render () {
		this.init();
		const viewer = this.viewer;

		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

		this.resize();

		let camera = viewer.scene.getActiveCamera();
		
		viewer.renderer.setClearColor(0x000000, 0);
		viewer.renderer.clearTarget( this.rtDepth, true, true, true );
		viewer.renderer.clearTarget( this.rtAttribute, true, true, true );

		let width = viewer.renderer.getSize().width;
		let height = viewer.renderer.getSize().height;

		let queryHQSplats = Potree.startQuery('HQSplats', viewer.renderer.getContext());

		let visiblePointClouds = viewer.scene.pointclouds.filter(pc => pc.visible);
		let originalMaterials = new Map();

		for(let pointcloud of visiblePointClouds){
			originalMaterials.set(pointcloud, pointcloud.material);

			if(!this.attributeMaterials.has(pointcloud)){
				let attributeMaterial = new Potree.PointCloudMaterial();
				this.attributeMaterials.set(pointcloud, attributeMaterial);
			}

			if(!this.depthMaterials.has(pointcloud)){
				let depthMaterial = new Potree.PointCloudMaterial();

				depthMaterial.setDefine("depth_pass", "#define hq_depth_pass");
				depthMaterial.setDefine("use_edl", "#define use_edl");

				this.depthMaterials.set(pointcloud, depthMaterial);
			}
		}

		{ // DEPTH PASS
			for (let pointcloud of visiblePointClouds) {
				let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

				let material = originalMaterials.get(pointcloud);
				let depthMaterial = this.depthMaterials.get(pointcloud);

				depthMaterial.size = material.size;
				depthMaterial.minSize = material.minSize;
				depthMaterial.maxSize = material.maxSize;

				depthMaterial.pointSizeType = material.pointSizeType;
				depthMaterial.visibleNodesTexture = material.visibleNodesTexture;
				depthMaterial.weighted = false;
				depthMaterial.screenWidth = width;
				depthMaterial.shape = Potree.PointShape.CIRCLE;
				depthMaterial.screenHeight = height;
				depthMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
				depthMaterial.uniforms.octreeSize.value = octreeSize;
				depthMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(...pointcloud.scale.toArray());
				depthMaterial.classification = material.classification;

				depthMaterial.clipTask = material.clipTask;
				depthMaterial.clipMethod = material.clipMethod;
				depthMaterial.setClipBoxes(material.clipBoxes);
				depthMaterial.setClipPolygons(material.clipPolygons);

				pointcloud.material = depthMaterial;
			}
			
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtDepth, {
				//material: this.depthMaterial
			});
		}

		{ // ATTRIBUTE PASS
			for (let pointcloud of visiblePointClouds) {
				let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

				let material = originalMaterials.get(pointcloud);
				let attributeMaterial = this.attributeMaterials.get(pointcloud);

				attributeMaterial.size = material.size;
				attributeMaterial.minSize = material.minSize;
				attributeMaterial.maxSize = material.maxSize;

				attributeMaterial.pointSizeType = material.pointSizeType;
				attributeMaterial.pointColorType = material.pointColorType;
				attributeMaterial.visibleNodesTexture = material.visibleNodesTexture;
				attributeMaterial.weighted = true;
				attributeMaterial.screenWidth = width;
				attributeMaterial.screenHeight = height;
				attributeMaterial.shape = Potree.PointShape.CIRCLE;
				attributeMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
				attributeMaterial.uniforms.octreeSize.value = octreeSize;
				attributeMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(...pointcloud.scale.toArray());
				attributeMaterial.classification = material.classification;
				attributeMaterial.elevationRange = material.elevationRange;
				attributeMaterial.gradient = material.gradient;

				attributeMaterial.intensityRange = material.intensityRange;
				attributeMaterial.intensityGamma = material.intensityGamma;
				attributeMaterial.intensityContrast = material.intensityContrast;
				attributeMaterial.intensityBrightness = material.intensityBrightness;

				attributeMaterial.rgbGamma = material.rgbGamma;
				attributeMaterial.rgbContrast = material.rgbContrast;
				attributeMaterial.rgbBrightness = material.rgbBrightness;

				attributeMaterial.weightRGB = material.weightRGB;
				attributeMaterial.weightIntensity = material.weightIntensity;
				attributeMaterial.weightElevation = material.weightElevation;
				attributeMaterial.weightRGB = material.weightRGB;
				attributeMaterial.weightClassification = material.weightClassification;
				attributeMaterial.weightReturnNumber = material.weightReturnNumber;
				attributeMaterial.weightSourceID = material.weightSourceID;

				attributeMaterial.color = material.color;

				attributeMaterial.clipTask = material.clipTask;
				attributeMaterial.clipMethod = material.clipMethod;
				attributeMaterial.setClipBoxes(material.clipBoxes);
				attributeMaterial.setClipPolygons(material.clipPolygons);

				pointcloud.material = attributeMaterial;
			}
			
			let gl = this.gl;

			viewer.renderer.setRenderTarget(null);
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtAttribute, {
				//material: this.attributeMaterial,
				blendFunc: [gl.SRC_ALPHA, gl.ONE],
				//depthTest: false,
				depthWrite: false
			});
		}

		for(let [pointcloud, material] of originalMaterials){
			pointcloud.material = material;
		}

		viewer.renderer.setRenderTarget(null);
		if(viewer.background === "skybox"){
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		} else if (viewer.background === 'gradient') {
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		} else if (viewer.background === 'black') {
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear();
		} else if (viewer.background === 'white') {
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear();
		} else {
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		}

		{ // NORMALIZATION PASS
			let normalizationMaterial = this.useEDL ? this.normalizationEDLMaterial : this.normalizationMaterial;

			if(this.useEDL){
				normalizationMaterial.uniforms.edlStrength.value = viewer.edlStrength;
				normalizationMaterial.uniforms.radius.value = viewer.edlRadius;
				normalizationMaterial.uniforms.screenWidth.value = width;
				normalizationMaterial.uniforms.screenHeight.value = height;
				normalizationMaterial.uniforms.uEDLMap.value = this.rtDepth.texture;
			}

			normalizationMaterial.uniforms.uWeightMap.value = this.rtAttribute.texture;
			normalizationMaterial.uniforms.uDepthMap.value = this.rtAttribute.depthTexture;
			
			Potree.utils.screenPass.render(viewer.renderer, normalizationMaterial);
		}

		viewer.renderer.render(viewer.scene.scene, camera);

		viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer});

		Potree.endQuery(queryHQSplats, viewer.renderer.getContext());

		viewer.renderer.clearDepth();

		viewer.transformationTool.update();

		viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

		viewer.renderer.render(viewer.controls.sceneControls, camera);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.transformationTool.scene, camera);

		viewer.renderer.setViewport(width - viewer.navigationCube.width, 
									height - viewer.navigationCube.width, 
									viewer.navigationCube.width, viewer.navigationCube.width);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		viewer.renderer.setViewport(0, 0, width, height);
		
		viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});

	}
};



class RepSnapshot{

	constructor(){
		this.target = null;
		this.camera = null;
	}

};

class RepRenderer {
	constructor (viewer) {
		this.viewer = viewer;

		this.edlMaterial = null;
		this.attributeMaterials = [];

		this.rtColor = null;
		this.gl = viewer.renderer.context;

		this.initEDL = this.initEDL.bind(this);
		this.resize = this.resize.bind(this);
		this.render = this.render.bind(this);

		this.snapshotRequested = false;
		this.disableSnapshots = false;
		
		this.snap = {
			target: null,
			matrix: null	
		};

		this.history = {
			maxSnapshots: 10,
			snapshots: [],
			version: 0
		};
		
	}

	initEDL () {
		if (this.edlMaterial != null) {
			return;
		}

		// let depthTextureExt = gl.getExtension("WEBGL_depth_texture");

		this.edlMaterial = new Potree.EyeDomeLightingMaterial();

		this.rtColor = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.rtColor.depthTexture = new THREE.DepthTexture();
		this.rtColor.depthTexture.type = THREE.UnsignedIntType;
		
		
		this.rtShadow = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.rtShadow.depthTexture = new THREE.DepthTexture();
		this.rtShadow.depthTexture.type = THREE.UnsignedIntType;

		//{
		//	let geometry = new THREE.PlaneBufferGeometry( 20, 20, 32 );
		//	let material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map: this.snap.target.texture} );
		//	let plane = new THREE.Mesh( geometry, material );
		//	plane.position.z = 0.2;
		//	plane.position.y = -1;
		//	this.viewer.scene.scene.add( plane );
		//	this.debugPlane = plane;
		//}
	};

	resize () {
		let width = this.viewer.scaleFactor * this.viewer.renderArea.clientWidth;
		let height = this.viewer.scaleFactor * this.viewer.renderArea.clientHeight;
		let aspect = width / height;

		let needsResize = (this.rtColor.width !== width || this.rtColor.height !== height);

		// disposal will be unnecessary once this fix made it into three.js master:
		// https://github.com/mrdoob/three.js/pull/6355
		if (needsResize) {
			this.rtColor.dispose();
		}
		
		viewer.scene.cameraP.aspect = aspect;
		viewer.scene.cameraP.updateProjectionMatrix();

		let frustumScale = viewer.moveSpeed * 2.0;
		viewer.scene.cameraO.left = -frustumScale;
		viewer.scene.cameraO.right = frustumScale;		
		viewer.scene.cameraO.top = frustumScale * 1/aspect;
		viewer.scene.cameraO.bottom = -frustumScale * 1/aspect;		
		viewer.scene.cameraO.updateProjectionMatrix();

		viewer.scene.cameraScreenSpace.top = 1/aspect;
		viewer.scene.cameraScreenSpace.bottom = -1/aspect;
		viewer.scene.cameraScreenSpace.updateProjectionMatrix();
		
		viewer.renderer.setSize(width, height);
		this.rtColor.setSize(width, height);
	}

	makeSnapshot(){
		this.snapshotRequested = true;
	}

	render () {
		this.initEDL();
		const viewer = this.viewer;

		this.resize();
		
		let camera = viewer.scene.getActiveCamera();

		let query = Potree.startQuery('stuff', viewer.renderer.getContext());
		
		if(viewer.background === "skybox"){
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		} else if (viewer.background === 'gradient') {
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		} else if (viewer.background === 'black') {
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		} else if (viewer.background === 'white') {
			viewer.renderer.setClearColor(0xFFFFFF, 0);
			viewer.renderer.clear();
		}

		viewer.transformationTool.update();
		
		viewer.renderer.render(viewer.scene.scene, camera);
		
		viewer.renderer.clearTarget( this.rtShadow, true, true, true );
		viewer.renderer.clearTarget( this.rtColor, true, true, true );
		
		let width = viewer.renderArea.clientWidth;
		let height = viewer.renderArea.clientHeight;

		// COLOR & DEPTH PASS
		for (let pointcloud of viewer.scene.pointclouds) {
			let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

			let material = pointcloud.material;
			material.weighted = false;
			material.useLogarithmicDepthBuffer = false;
			material.useEDL = true;

			material.screenWidth = width;
			material.screenHeight = height;
			material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
			material.uniforms.octreeSize.value = octreeSize;
			material.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
		}

		viewer.shadowTestCam.updateMatrixWorld();
		viewer.shadowTestCam.matrixWorldInverse.getInverse(viewer.shadowTestCam.matrixWorld);
		viewer.shadowTestCam.updateProjectionMatrix();
		

		Potree.endQuery(query, viewer.renderer.getContext());

		//viewer.pRenderer.render(viewer.scene.scenePointCloud, viewer.shadowTestCam, this.rtShadow);

		if(!this.disableSnapshots){
			this.snapshotRequested = false;

			let query = Potree.startQuery('create snapshot', viewer.renderer.getContext());

			let snap;
			if(this.history.snapshots.length < this.history.maxSnapshots){
				snap = new RepSnapshot();
				snap.target = new THREE.WebGLRenderTarget(1024, 1024, {
					minFilter: THREE.NearestFilter,
					magFilter: THREE.NearestFilter,
					format: THREE.RGBAFormat,
					//type: THREE.FloatType
				});
				snap.target.depthTexture = new THREE.DepthTexture();
				snap.target.depthTexture.type = THREE.UnsignedIntType;
			}else{
				snap = this.history.snapshots.pop();
			}

			{ // resize
				let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
				let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
				let aspect = width / height;
		
				let needsResize = (snap.target.width !== width || snap.target.height !== height);

				if (needsResize) {
					snap.target.dispose();
				}

				snap.target.setSize(width, height);
			}

			viewer.renderer.clearTarget(snap.target, true, true, true);
			viewer.renderer.setRenderTarget(snap.target);


			for(const octree of viewer.scene.pointclouds){

				octree.material.snapEnabled = false;
				octree.material.needsUpdate = true;


			
				let from = this.history.version * (octree.visibleNodes.length / this.history.maxSnapshots);
				let to = (this.history.version + 1) * (octree.visibleNodes.length / this.history.maxSnapshots);
				
				// DEBUG!!!
				//let from = 0;
				//let to = 20;
				let nodes = octree.visibleNodes.slice(from, to);
				
				viewer.pRenderer.renderOctree(octree, nodes, camera, snap.target, {vnTextureNodes: nodes});
			}

			snap.camera = camera.clone();
			this.history.version = (this.history.version + 1) % this.history.maxSnapshots;

			if(this.debugPlane){
				this.debugPlane.material.map = snap.target.texture;
			}

			this.history.snapshots.unshift(snap);

			Potree.endQuery(query, viewer.renderer.getContext());
		}


		{

			let query = Potree.startQuery('render snapshots', viewer.renderer.getContext());

			viewer.renderer.clearTarget(this.rtColor, true, true, true);
			viewer.renderer.setRenderTarget(this.rtColor);
			for(const octree of viewer.scene.pointclouds){

				if(!this.disableSnapshots){
					octree.material.snapEnabled = true;
					octree.material.numSnapshots = this.history.maxSnapshots;
					octree.material.needsUpdate = true;

					let uniforms = octree.material.uniforms;
					if(this.history.snapshots.length === this.history.maxSnapshots){
						uniforms[`uSnapshot`].value = this.history.snapshots.map(s => s.target.texture);
						uniforms[`uSnapshotDepth`].value = this.history.snapshots.map(s => s.target.depthTexture);
						uniforms[`uSnapView`].value = this.history.snapshots.map(s => s.camera.matrixWorldInverse);
						uniforms[`uSnapProj`].value = this.history.snapshots.map(s => s.camera.projectionMatrix);
						uniforms[`uSnapProjInv`].value = this.history.snapshots.map(s => new THREE.Matrix4().getInverse(s.camera.projectionMatrix));
						uniforms[`uSnapViewInv`].value = this.history.snapshots.map(s => new THREE.Matrix4().getInverse(s.camera.matrixWorld));
					}
				}else{
					octree.material.snapEnabled = false;
					octree.material.needsUpdate = true;
				}
			
				let nodes = octree.visibleNodes.slice(0, 50);
				//let nodes = octree.visibleNodes;
				viewer.pRenderer.renderOctree(octree, nodes, camera, this.rtColor, {vnTextureNodes: nodes});

				if(!this.disableSnapshots){
					octree.material.snapEnabled = false;
					octree.material.needsUpdate = false;
				}
			}

			Potree.endQuery(query, viewer.renderer.getContext());
		}
		
		
		//viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtColor, {
		//	shadowMaps: [{map: this.rtShadow, camera: viewer.shadowTestCam}]
		//});
		
		//viewer.renderer.render(viewer.scene.scene, camera, this.rtColor);
		

		

		{ // EDL OCCLUSION PASS

			let query = Potree.startQuery('EDL', viewer.renderer.getContext());
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

			Potree.endQuery(query, viewer.renderer.getContext());
		}

		

		viewer.renderer.clearDepth();
		viewer.renderer.render(viewer.controls.sceneControls, camera);
		
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.transformationTool.scene, camera);
		
		viewer.renderer.setViewport(viewer.renderer.domElement.clientWidth - viewer.navigationCube.width, 
									viewer.renderer.domElement.clientHeight - viewer.navigationCube.width, 
									viewer.navigationCube.width, viewer.navigationCube.width);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		viewer.renderer.setViewport(0, 0, viewer.renderer.domElement.clientWidth, viewer.renderer.domElement.clientHeight);

		//

	}
};



Potree.View = class {
	constructor () {
		this.position = new THREE.Vector3(0, 0, 0);

		this.yaw = Math.PI / 4;
		this._pitch = -Math.PI / 4;
		this.radius = 1;

		this.maxPitch = Math.PI / 2;
		this.minPitch = -Math.PI / 2;

		this.navigationMode = Potree.OrbitControls;
	}

	clone () {
		let c = new Potree.View();
		c.yaw = this.yaw;
		c._pitch = this.pitch;
		c.radius = this.radius;
		c.maxPitch = this.maxPitch;
		c.minPitch = this.minPitch;
		c.navigationMode = this.navigationMode;

		return c;
	}

	get pitch () {
		return this._pitch;
	}

	set pitch (angle) {
		this._pitch = Math.max(Math.min(angle, this.maxPitch), this.minPitch);
	}

	get direction () {
		let dir = new THREE.Vector3(0, 1, 0);

		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		return dir;
	}

	set direction (dir) {

		//if(dir.x === dir.y){
		if(dir.x === 0 && dir.y === 0){
			this.pitch = Math.PI / 2 * Math.sign(dir.z);
		}else{
			let yaw = Math.atan2(dir.y, dir.x) - Math.PI / 2;
			let pitch = Math.atan2(dir.z, Math.sqrt(dir.x * dir.x + dir.y * dir.y));

			this.yaw = yaw;
			this.pitch = pitch;
		}
		
	}

	lookAt(t){
		let V;
		if(arguments.length === 1){
			V = new THREE.Vector3().subVectors(t, this.position);
		}else if(arguments.length === 3){
			V = new THREE.Vector3().subVectors(new THREE.Vector3(...arguments), this.position);
		}

		let radius = V.length();
		let dir = V.normalize();

		this.radius = radius;
		this.direction = dir;
	}

	getPivot () {
		return new THREE.Vector3().addVectors(this.position, this.direction.multiplyScalar(this.radius));
	}

	getSide () {
		let side = new THREE.Vector3(1, 0, 0);
		side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		return side;
	}

	pan (x, y) {
		let dir = new THREE.Vector3(0, 1, 0);
		dir.applyAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
		dir.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		// let side = new THREE.Vector3(1, 0, 0);
		// side.applyAxisAngle(new THREE.Vector3(0, 0, 1), this.yaw);

		let side = this.getSide();

		let up = side.clone().cross(dir);

		let pan = side.multiplyScalar(x).add(up.multiplyScalar(y));

		this.position = this.position.add(pan);
		// this.target = this.target.add(pan);
	}

	translate (x, y, z) {
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

	translateWorld (x, y, z) {
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
		this.sceneBG = new THREE.Scene();
		this.scenePointCloud = new THREE.Scene();

		this.cameraP = new THREE.PerspectiveCamera(this.fov, 1, 0.1, 1000*1000);
		this.cameraO = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1000*1000);
		this.cameraBG = new THREE.Camera();
		this.cameraScreenSpace = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
		this.cameraMode = Potree.CameraMode.PERSPECTIVE;
		this.pointclouds = [];

		this.measurements = [];
		this.profiles = [];
		this.volumes = [];
		this.polygonClipVolumes = [];
		
		this.fpControls = null;
		this.orbitControls = null;
		this.earthControls = null;
		this.geoControls = null;
		this.inputHandler = null;

		this.view = new Potree.View();

		this.directionalLight = null;

		this.initialize();
	}

	estimateHeightAt (position) {
		let height = null;
		let fromSpacing = Infinity;

		for (let pointcloud of this.pointclouds) {
			if (pointcloud.root.geometryNode === undefined) {
				continue;
			}

			let pHeight = null;
			let pFromSpacing = Infinity;

			let lpos = position.clone().sub(pointcloud.position);
			lpos.z = 0;
			let ray = new THREE.Ray(lpos, new THREE.Vector3(0, 0, 1));

			let stack = [pointcloud.root];
			while (stack.length > 0) {
				let node = stack.pop();
				let box = node.getBoundingBox();

				let inside = ray.intersectBox(box);

				if (!inside) {
					continue;
				}

				let h = node.geometryNode.mean.z +
					pointcloud.position.z +
					node.geometryNode.boundingBox.min.z;

				if (node.geometryNode.spacing <= pFromSpacing) {
					pHeight = h;
					pFromSpacing = node.geometryNode.spacing;
				}

				for (let index of Object.keys(node.children)) {
					let child = node.children[index];
					if (child.geometryNode) {
						stack.push(node.children[index]);
					}
				}
			}

			if (height === null || pFromSpacing < fromSpacing) {
				height = pHeight;
				fromSpacing = pFromSpacing;
			}
		}

		return height;
	}
	
	getBoundingBox(pointclouds = this.pointclouds){
		let box = new THREE.Box3();

		this.scenePointCloud.updateMatrixWorld(true);
		this.referenceFrame.updateMatrixWorld(true);

		for (let pointcloud of pointclouds) {
			pointcloud.updateMatrixWorld(true);

			let pointcloudBox = pointcloud.pcoGeometry.tightBoundingBox ? pointcloud.pcoGeometry.tightBoundingBox : pointcloud.boundingBox;
			let boxWorld = Potree.utils.computeTransformedBoundingBox(pointcloudBox, pointcloud.matrixWorld);
			box.union(boxWorld);
		}

		return box;
	}

	addPointCloud (pointcloud) {
		this.pointclouds.push(pointcloud);
		this.scenePointCloud.add(pointcloud);

		this.dispatchEvent({
			type: 'pointcloud_added',
			pointcloud: pointcloud
		});
	};

	addVolume (volume) {
		this.volumes.push(volume);
		this.dispatchEvent({
			'type': 'volume_added',
			'scene': this,
			'volume': volume
		});
	};

	removeVolume (volume) {
		let index = this.volumes.indexOf(volume);
		if (index > -1) {
			this.volumes.splice(index, 1);

			this.dispatchEvent({
				'type': 'volume_removed',
				'scene': this,
				'volume': volume
			});
		}
	};

	addPolygonClipVolume(volume){
		this.polygonClipVolumes.push(volume);
		this.dispatchEvent({
			"type": "polygon_clip_volume_added",
			"scene": this,
			"volume": volume
		});
	};
	
	removePolygonClipVolume(volume){
		let index = this.polygonClipVolumes.indexOf(volume);
		if (index > -1) {
			this.polygonClipVolumes.splice(index, 1);
			this.dispatchEvent({
				"type": "polygon_clip_volume_removed",
				"scene": this,
				"volume": volume
			});
		}
	};
	
	addMeasurement(measurement){
		measurement.lengthUnit = this.lengthUnit;
		this.measurements.push(measurement);
		this.dispatchEvent({
			'type': 'measurement_added',
			'scene': this,
			'measurement': measurement
		});
	};

	removeMeasurement (measurement) {
		let index = this.measurements.indexOf(measurement);
		if (index > -1) {
			this.measurements.splice(index, 1);
			this.dispatchEvent({
				'type': 'measurement_removed',
				'scene': this,
				'measurement': measurement
			});
		}
	}

	addProfile (profile) {
		this.profiles.push(profile);
		this.dispatchEvent({
			'type': 'profile_added',
			'scene': this,
			'profile': profile
		});
	}

	removeProfile (profile) {
		let index = this.profiles.indexOf(profile);
		if (index > -1) {
			this.profiles.splice(index, 1);
			this.dispatchEvent({
				'type': 'profile_removed',
				'scene': this,
				'profile': profile
			});
		}
	}

	removeAllMeasurements () {
		while (this.measurements.length > 0) {
			this.removeMeasurement(this.measurements[0]);
		}

		while (this.profiles.length > 0) {
			this.removeProfile(this.profiles[0]);
		}

		while (this.volumes.length > 0) {
			this.removeVolume(this.volumes[0]);
		}
	}

	removeAllClipVolumes(){
		let clipVolumes = this.volumes.filter(volume => volume.clip === true);
		for(let clipVolume of clipVolumes){
			this.removeVolume(clipVolume);
		}

		while(this.polygonClipVolumes.length > 0){
			this.removePolygonClipVolume(this.polygonClipVolumes[0]);
		}
	}

	getActiveCamera() {
		return this.cameraMode == Potree.CameraMode.PERSPECTIVE ? this.cameraP : this.cameraO;		
	}
	
	initialize(){
		
		this.referenceFrame = new THREE.Object3D();
		this.referenceFrame.matrixAutoUpdate = false;
		this.scenePointCloud.add(this.referenceFrame);

		this.cameraP.up.set(0, 0, 1);
		this.cameraP.position.set(1000, 1000, 1000);
		this.cameraO.up.set(0, 0, 1);
		this.cameraO.position.set(1000, 1000, 1000);
		//this.camera.rotation.y = -Math.PI / 4;
		//this.camera.rotation.x = -Math.PI / 6;
		this.cameraScreenSpace.lookAt(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
		
		this.directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
		this.directionalLight.position.set( 10, 10, 10 );
		this.directionalLight.lookAt( new THREE.Vector3(0, 0, 0));
		this.scenePointCloud.add( this.directionalLight );
		
		let light = new THREE.AmbientLight( 0x555555 ); // soft white light
		this.scenePointCloud.add( light );
		
		//let grid = Potree.utils.createGrid(5, 5, 2);
		//this.scene.add(grid);

		{ // background
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

		{ // lights
			{
				let light = new THREE.DirectionalLight(0xffffff);
				light.position.set(10, 10, 1);
				light.target.position.set(0, 0, 0);
				this.scene.add(light);
			}

			{
				let light = new THREE.DirectionalLight(0xffffff);
				light.position.set(-10, 10, 1);
				light.target.position.set(0, 0, 0);
				this.scene.add(light);
			}

			{
				let light = new THREE.DirectionalLight(0xffffff);
				light.position.set(0, -10, 20);
				light.target.position.set(0, 0, 0);
				this.scene.add(light);
			}
		}
	}
	
	addAnnotation(position, args = {}){		
		if(position instanceof Array){
			args.position = new THREE.Vector3().fromArray(position);
		} else if (position instanceof THREE.Vector3) {
			args.position = position;
		}
		let annotation = new Potree.Annotation(args);
		this.annotations.add(annotation);

		return annotation;
	}

	getAnnotations () {
		return this.annotations;
	};

	removeAnnotation(annotationToRemove) {
		this.annotations.remove(annotationToRemove);
	}
};


Potree.Viewer = class PotreeViewer extends THREE.EventDispatcher{
	
	constructor(domElement, args = {}){
		super();

		this.renderArea = domElement;
		this.guiLoaded = false;	
		this.guiLoadTasks = [];

		this.messages = [];
		this.elMessages = $(`
		<div id="message_listing" 
			style="position: absolute; z-index: 1000; left: 10px; bottom: 10px">
		</div>`);
		$(domElement).append(this.elMessages);
		
		try{

		{ // generate missing dom hierarchy
			if ($(domElement).find('#potree_map').length === 0) {
				let potreeMap = $(`
					<div id="potree_map" class="mapBox" style="position: absolute; left: 50px; top: 50px; width: 400px; height: 400px; display: none">
						<div id="potree_map_header" style="position: absolute; width: 100%; height: 25px; top: 0px; background-color: rgba(0,0,0,0.5); z-index: 1000; border-top-left-radius: 3px; border-top-right-radius: 3px;">
						</div>
						<div id="potree_map_content" class="map" style="position: absolute; z-index: 100; top: 25px; width: 100%; height: calc(100% - 25px); border: 2px solid rgba(0,0,0,0.5); box-sizing: border-box;"></div>
					</div>
				`);
				$(domElement).append(potreeMap);
			}

			if ($(domElement).find('#potree_description').length === 0) {
				let potreeDescription = $(`<div id="potree_description" class="potree_info_text"></div>`);
				$(domElement).append(potreeDescription);
			}

			if ($(domElement).find('#potree_annotations').length === 0) {
				let potreeAnnotationContainer = $(`
					<div id="potree_annotation_container" 
						style="position: absolute; z-index: 100000; width: 100%; height: 100%; pointer-events: none;"></div>`);
				$(domElement).append(potreeAnnotationContainer);
			}
		}

		this.pointCloudLoadedCallback = args.onPointCloudLoaded || function () {};

		// if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		//	defaultSettings.navigation = "Orbit";
		// }

		this.server = null;

		this.fov = 60;
		this.isFlipYZ = false;
		this.useDEMCollisions = false;
		this.generateDEM = false;
		this.minNodeSize = 30;
		this.edlStrength = 1.0;
		this.edlRadius = 1.4;
		this.useEDL = false;
		this.classifications = {
			0: { visible: true, name: 'never classified' },
			1: { visible: true, name: 'unclassified' },
			2: { visible: true, name: 'ground' },
			3: { visible: true, name: 'low vegetation' },
			4: { visible: true, name: 'medium vegetation' },
			5: { visible: true, name: 'high vegetation' },
			6: { visible: true, name: 'building' },
			7: { visible: true, name: 'low point(noise)' },
			8: { visible: true, name: 'key-point' },
			9: { visible: true, name: 'water' },
			12: { visible: true, name: 'overlap' }
		};

		this.moveSpeed = 10;

		this.LENGTH_UNITS = {
			METER: {code: 'm'},
			FEET: {code: 'ft'},
			INCH: {code: '\u2033'}
		};
		this.lengthUnit = this.LENGTH_UNITS.METER;

		this.showBoundingBox = false;
		this.showAnnotations = true;
		this.freeze = false;
		this.clipTask = Potree.ClipTask.HIGHLIGHT;
		this.clipMethod = Potree.ClipMethod.INSIDE_ANY;

		this.potreeRenderer = null;
		this.edlRenderer = null;
		this.renderer = null;
		this.pRenderer = null;

		this.scene = null;
		this.overlay = null;
		this.overlayCamera = null;

		this.inputHandler = null;

		this.clippingTool =  null;
		this.transformationTool = null;
		this.navigationCube = null;
		
		this.skybox = null;
		this.clock = new THREE.Clock();
		this.background = null;

		this.initThree();

		{
			this.overlay = new THREE.Scene();
			this.overlayCamera = new THREE.OrthographicCamera(
				0, 1,
				1, 0,
				-1000, 1000
			);
		}
		
		this.pRenderer = new Potree.Renderer(this.renderer);
		
		{
			let near = 2.5;
			let far = 10.0;
			let fov = 90;
			
			this.shadowTestCam = new THREE.PerspectiveCamera(90, 1, near, far);
			this.shadowTestCam.position.set(3.50, -2.80, 8.561);
			this.shadowTestCam.lookAt(new THREE.Vector3(0, 0, 4.87));
		}
		

		let scene = new Potree.Scene(this.renderer);
		this.setScene(scene);

		{
			this.inputHandler = new Potree.InputHandler(this);
			this.inputHandler.setScene(this.scene);

			this.clippingTool = new Potree.ClippingTool(this);
			this.transformationTool = new Potree.TransformationTool(this);
			this.navigationCube = new Potree.NavigationCube(this);
			this.navigationCube.visible = false;
			
			this.createControls();

			this.clippingTool.setScene(this.scene);
			
			let onPointcloudAdded = (e) => {
				if (this.scene.pointclouds.length === 1) {
					let speed = e.pointcloud.boundingBox.getSize().length();
					speed = speed / 5;
					this.setMoveSpeed(speed);
				}
			};

			let onVolumeRemoved = (e) => {
				this.inputHandler.deselect(e.volume);
			};

			this.addEventListener('scene_changed', (e) => {
				this.inputHandler.setScene(e.scene);
				this.clippingTool.setScene(this.scene);
				
				if(!e.scene.hasEventListener("pointcloud_added", onPointcloudAdded)){
					e.scene.addEventListener("pointcloud_added", onPointcloudAdded);
				}

				if(!e.scene.hasEventListener("volume_removed", onPointcloudAdded)){
					e.scene.addEventListener("volume_removed", onVolumeRemoved);
				}
				
			});

			this.scene.addEventListener("volume_removed", onVolumeRemoved);
			this.scene.addEventListener('pointcloud_added', onPointcloudAdded);
		}

		{ // set defaults
			this.setFOV(60);
			this.setEDLEnabled(false);
			this.setEDLRadius(1.4);
			this.setEDLStrength(0.4);
			this.setClipTask(Potree.ClipTask.HIGHLIGHT);
			this.setClipMethod(Potree.ClipMethod.INSIDE_ANY);
			this.setPointBudget(1*1000*1000);
			this.setShowBoundingBox(false);
			this.setFreeze(false);
			this.setNavigationMode(Potree.OrbitControls);
			this.setBackground('gradient');

			this.scaleFactor = 1;

			this.loadSettingsFromURL();
		}

		// start rendering!
		if(args.useDefaultRenderLoop === undefined || args.useDefaultRenderLoop === true){
			requestAnimationFrame(this.loop.bind(this));
		}

		this.loadGUI = this.loadGUI.bind(this);

		}catch(e){
			this.onCrash(e);
		}
	}

	onCrash(error){

		$(this.renderArea).empty();

		if ($(this.renderArea).find('#potree_failpage').length === 0) {
			let elFailPage = $(`
			<div id="#potree_failpage" class="potree_failpage"> 
				
				<h1>Potree Encountered An Error </h1>

				<p>
				This may happen if your browser or graphics card is not supported.
				<br>
				We recommend to use 
				<a href="https://www.google.com/chrome/browser" target="_blank" style="color:initial">Chrome</a>
				or 
				<a href="https://www.mozilla.org/" target="_blank">Firefox</a>.
				</p>

				<p>
				Please also visit <a href="http://webglreport.com/" target="_blank">webglreport.com</a> and 
				check whether your system supports WebGL.
				</p>
				<p>
				If you are already using one of the recommended browsers and WebGL is enabled, 
				consider filing an issue report at <a href="https://github.com/potree/potree/issues" target="_blank">github</a>,<br>
				including your operating system, graphics card, browser and browser version, as well as the 
				error message below.<br>
				Please do not report errors on unsupported browsers.
				</p>

				<pre id="potree_error_console" style="width: 100%; height: 100%"></pre>
				
			</div>`);

			let elErrorMessage = elFailPage.find('#potree_error_console');
			elErrorMessage.html(error.stack);

			$(this.renderArea).append(elFailPage);
		}

		throw error;
	}

	// ------------------------------------------------------------------------------------
	// Viewer API
	// ------------------------------------------------------------------------------------

	setScene (scene) {
		if (scene === this.scene) {
			return;
		}

		let oldScene = this.scene;
		this.scene = scene;

		this.dispatchEvent({
			type: 'scene_changed',
			oldScene: oldScene,
			scene: scene
		});

		{ // Annotations
			$('.annotation').detach();

			// for(let annotation of this.scene.annotations){
			//	this.renderArea.appendChild(annotation.domElement[0]);
			// }

			this.scene.annotations.traverse(annotation => {
				this.renderArea.appendChild(annotation.domElement[0]);
			});

			if (!this.onAnnotationAdded) {
				this.onAnnotationAdded = e => {
				// console.log("annotation added: " + e.annotation.title);

					e.annotation.traverse(node => {

						$("#potree_annotation_container").append(node.domElement);
						//this.renderArea.appendChild(node.domElement[0]);
						node.scene = this.scene;
					});
				};
			}

			if (oldScene) {
				oldScene.annotations.removeEventListener('annotation_added', this.onAnnotationAdded);
			}
			this.scene.annotations.addEventListener('annotation_added', this.onAnnotationAdded);
		}
	};

	getControls (navigationMode) {
		if (navigationMode === Potree.OrbitControls) {
			return this.orbitControls;
		} else if (navigationMode === Potree.FirstPersonControls) {
			return this.fpControls;
		} else if (navigationMode === Potree.EarthControls) {
			return this.earthControls;
		} else {
			return null;
		}
	}

	getMinNodeSize () {
		return this.minNodeSize;
	};

	setMinNodeSize (value) {
		if (this.minNodeSize !== value) {
			this.minNodeSize = value;
			this.dispatchEvent({'type': 'minnodesize_changed', 'viewer': this});
		}
	};

	getBackground () {
		return this.background;
	};

	setBackground(bg){
		if (this.background === bg) {
			return;
		}

		if(bg === "skybox"){
			this.skybox = Potree.utils.loadSkybox(new URL(Potree.resourcePath + '/textures/skybox2/').href);
		}

		this.background = bg;
		this.dispatchEvent({'type': 'background_changed', 'viewer': this});
	}

	setDescription (value) {
		$('#potree_description')[0].innerHTML = value;
	};

	setNavigationMode (value) {
		this.scene.view.navigationMode = value;
	};

	setShowBoundingBox (value) {
		if (this.showBoundingBox !== value) {
			this.showBoundingBox = value;
			this.dispatchEvent({'type': 'show_boundingbox_changed', 'viewer': this});
		}
	};

	getShowBoundingBox () {
		return this.showBoundingBox;
	};

	setMoveSpeed (value) {
		if (this.moveSpeed !== value) {
			this.moveSpeed = value;
			this.dispatchEvent({'type': 'move_speed_changed', 'viewer': this, 'speed': value});
		}
	};

	getMoveSpeed () {
		return this.moveSpeed;
	};

	setWeightClassification (w) {
		for (let i = 0; i < this.scene.pointclouds.length; i++) {
			this.scene.pointclouds[i].material.weightClassification = w;
			this.dispatchEvent({'type': 'attribute_weights_changed' + i, 'viewer': this});
		}
	};

	setFreeze (value) {
		value = Boolean(value);
		if (this.freeze !== value) {
			this.freeze = value;
			this.dispatchEvent({'type': 'freeze_changed', 'viewer': this});
		}
	};

	getFreeze () {
		return this.freeze;
	};

	getClipTask(){
		return this.clipTask;
	}

	getClipMethod(){
		return this.clipMethod;
	}

	setClipTask(value){
		if(this.clipTask !== value){

			this.clipTask = value;

			this.dispatchEvent({
				type: "cliptask_changed", 
				viewer: this});		
		}
	}

	setClipMethod(value){
		if(this.clipMethod !== value){

			this.clipMethod = value;
			
			this.dispatchEvent({
				type: "clipmethod_changed", 
				viewer: this});		
		}
	}

	setPointBudget (value) {
		if (Potree.pointBudget !== value) {
			Potree.pointBudget = parseInt(value);
			this.dispatchEvent({'type': 'point_budget_changed', 'viewer': this});
		}
	};

	getPointBudget () {
		return Potree.pointBudget;
	};

	setShowAnnotations (value) {
		if (this.showAnnotations !== value) {
			this.showAnnotations = value;
			this.dispatchEvent({'type': 'show_annotations_changed', 'viewer': this});
		}
	}

	getShowAnnotations () {
		return this.showAnnotations;
	}
	
	setDEMCollisionsEnabled(value){
		if(this.useDEMCollisions !== value){
			this.useDEMCollisions = value;
			this.dispatchEvent({'type': 'use_demcollisions_changed', 'viewer': this});
		};
	};

	getDEMCollisionsEnabled () {
		return this.useDEMCollisions;
	};

	setEDLEnabled (value) {
		value = Boolean(value);
		if (this.useEDL !== value) {
			this.useEDL = value;
			this.dispatchEvent({'type': 'use_edl_changed', 'viewer': this});
		}
	};

	getEDLEnabled () {
		return this.useEDL;
	};

	setEDLRadius (value) {
		if (this.edlRadius !== value) {
			this.edlRadius = value;
			this.dispatchEvent({'type': 'edl_radius_changed', 'viewer': this});
		}
	};

	getEDLRadius () {
		return this.edlRadius;
	};

	setEDLStrength (value) {
		if (this.edlStrength !== value) {
			this.edlStrength = value;
			this.dispatchEvent({'type': 'edl_strength_changed', 'viewer': this});
		}
	};

	getEDLStrength () {
		return this.edlStrength;
	};

	setFOV (value) {
		if (this.fov !== value) {
			this.fov = value;
			this.dispatchEvent({'type': 'fov_changed', 'viewer': this});
		}
	};

	getFOV () {
		return this.fov;
	};

	disableAnnotations () {
		this.scene.annotations.traverse(annotation => {
			annotation.domElement.css('pointer-events', 'none');

			// return annotation.visible;
		});
	};

	enableAnnotations () {
		this.scene.annotations.traverse(annotation => {
			annotation.domElement.css('pointer-events', 'auto');

			// return annotation.visible;
		});
	};

	setClassificationVisibility (key, value) {
		if (!this.classifications[key]) {
			this.classifications[key] = {visible: value, name: 'no name'};
			this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
		} else if (this.classifications[key].visible !== value) {
			this.classifications[key].visible = value;
			this.dispatchEvent({'type': 'classification_visibility_changed', 'viewer': this});
		}
	};

	setLengthUnit (value) {
		switch (value) {
			case 'm':
				this.lengthUnit = this.LENGTH_UNITS.METER;
				break;
			case 'ft':
				this.lengthUnit = this.LENGTH_UNITS.FEET;
				break;
			case 'in':
				this.lengthUnit = this.LENGTH_UNITS.INCH;
				break;
		}

		this.dispatchEvent({'type': 'length_unit_changed', 'viewer': this, value: value});
	}

	zoomTo(node, factor, animationDuration = 0){
		let view = this.scene.view;

		let camera = this.scene.cameraP.clone();
		camera.rotation.copy(this.scene.cameraP.rotation);
		camera.rotation.order = "ZXY";
		camera.rotation.x = Math.PI / 2 + view.pitch;
		camera.rotation.z = view.yaw;
		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.zoomTo(node, factor);

		let bs;
		if (node.boundingSphere) {
			bs = node.boundingSphere;
		} else if (node.geometry && node.geometry.boundingSphere) {
			bs = node.geometry.boundingSphere;
		} else {
			bs = node.boundingBox.getBoundingSphere();
		}
		bs = bs.clone().applyMatrix4(node.matrixWorld); 

		let startPosition = view.position.clone();
		let endPosition = camera.position.clone();
		let startTarget = view.getPivot();
		let endTarget = bs.center;
		let startRadius = view.radius;
		let endRadius = endPosition.distanceTo(endTarget);

		let easing = TWEEN.Easing.Quartic.Out;

		{ // animate camera position
			let pos = startPosition.clone();
			let tween = new TWEEN.Tween(pos).to(endPosition, animationDuration);
			tween.easing(easing);

			tween.onUpdate(() => {
				view.position.copy(pos);
			});

			tween.start();
		}

		{ // animate camera target
			let target = startTarget.clone();
			let tween = new TWEEN.Tween(target).to(endTarget, animationDuration);
			tween.easing(easing);
			tween.onUpdate(() => {
				view.lookAt(target);
			});
			tween.onComplete(() => {
				view.lookAt(target);
				this.dispatchEvent({type: 'focusing_finished', target: this});
			});

			this.dispatchEvent({type: 'focusing_started', target: this});
			tween.start();
		}
	};

	showAbout () {
		$(function () {
			$('#about-panel').dialog();
		});
	};

	getBoundingBox (pointclouds) {
		return this.scene.getBoundingBox(pointclouds);
	};

	fitToScreen (factor = 1, animationDuration = 0) {
		let box = this.getBoundingBox(this.scene.pointclouds);

		let node = new THREE.Object3D();
		node.boundingBox = box;

		this.zoomTo(node, factor, animationDuration);
		this.controls.stop();
	};

	toggleNavigationCube() {
		this.navigationCube.visible = !this.navigationCube.visible;
	}

	setView(view) {
		if(!view) return;

		switch(view) {
			case "F":
				this.setFrontView();
				break;
			case "B":
				this.setBackView();
				break;
			case "L":
				this.setLeftView();
				break;
			case "R":
				this.setRightView();
				break;
			case "U":
				this.setTopView();
				break;
			case "D":
				this.setBottomView();
				break;
		}
	}
	
	setTopView(){
		this.scene.view.yaw = 0;
		this.scene.view.pitch = -Math.PI / 2;

		this.fitToScreen();
	};
	
	setBottomView(){
		this.scene.view.yaw = -Math.PI;
		this.scene.view.pitch = Math.PI / 2;
		
		this.fitToScreen();
	};

	setFrontView(){
		this.scene.view.yaw = 0;
		this.scene.view.pitch = 0;

		this.fitToScreen();
	};
	
	setBackView(){
		this.scene.view.yaw = Math.PI;
		this.scene.view.pitch = 0;
		
		this.fitToScreen();
	};

	setLeftView(){
		this.scene.view.yaw = -Math.PI / 2;
		this.scene.view.pitch = 0;

		this.fitToScreen();
	};

	setRightView () {
		this.scene.view.yaw = Math.PI / 2;
		this.scene.view.pitch = 0;

		this.fitToScreen();
	};

	flipYZ () {
		this.isFlipYZ = !this.isFlipYZ;

		// TODO flipyz
		console.log('TODO');
	}
	
	setCameraMode(mode){
		this.scene.cameraMode = mode;

		for(let pointcloud of this.scene.pointclouds) {
			pointcloud.material.useOrthographicCamera = mode == Potree.CameraMode.ORTHOGRAPHIC;
		}
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

		if (Potree.utils.getParameterByName('edlRadius')) {
			this.setEDLRadius(parseFloat(Potree.utils.getParameterByName('edlRadius')));
		}

		if (Potree.utils.getParameterByName('edlStrength')) {
			this.setEDLStrength(parseFloat(Potree.utils.getParameterByName('edlStrength')));
		}

		if (Potree.utils.getParameterByName('pointBudget')) {
			this.setPointBudget(parseFloat(Potree.utils.getParameterByName('pointBudget')));
		}

		if (Potree.utils.getParameterByName('showBoundingBox')) {
			let enabled = Potree.utils.getParameterByName('showBoundingBox') === 'true';
			if (enabled) {
				this.setShowBoundingBox(true);
			} else {
				this.setShowBoundingBox(false);
			}
		}

		if (Potree.utils.getParameterByName('material')) {
			let material = Potree.utils.getParameterByName('material');
			this.setMaterial(material);
		}

		if (Potree.utils.getParameterByName('pointSizing')) {
			let sizing = Potree.utils.getParameterByName('pointSizing');
			this.setPointSizing(sizing);
		}

		if (Potree.utils.getParameterByName('quality')) {
			let quality = Potree.utils.getParameterByName('quality');
			this.setQuality(quality);
		}

		if (Potree.utils.getParameterByName('position')) {
			let value = Potree.utils.getParameterByName('position');
			value = value.replace('[', '').replace(']', '');
			let tokens = value.split(';');
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);

			this.scene.view.position.set(x, y, z);
		}

		if (Potree.utils.getParameterByName('target')) {
			let value = Potree.utils.getParameterByName('target');
			value = value.replace('[', '').replace(']', '');
			let tokens = value.split(';');
			let x = parseFloat(tokens[0]);
			let y = parseFloat(tokens[1]);
			let z = parseFloat(tokens[2]);

			this.scene.view.lookAt(new THREE.Vector3(x, y, z));
		}

		if (Potree.utils.getParameterByName('background')) {
			let value = Potree.utils.getParameterByName('background');
			this.setBackground(value);
		}

		// if(Potree.utils.getParameterByName("elevationRange")){
		//	let value = Potree.utils.getParameterByName("elevationRange");
		//	value = value.replace("[", "").replace("]", "");
		//	let tokens = value.split(";");
		//	let x = parseFloat(tokens[0]);
		//	let y = parseFloat(tokens[1]);
		//
		//	this.setElevationRange(x, y);
		//	//this.scene.view.target.set(x, y, z);
		// }
	};

	// ------------------------------------------------------------------------------------
	// Viewer Internals
	// ------------------------------------------------------------------------------------

	createControls () {
		{ // create FIRST PERSON CONTROLS
			this.fpControls = new Potree.FirstPersonControls(this);
			this.fpControls.enabled = false;
			this.fpControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.fpControls.addEventListener('end', this.enableAnnotations.bind(this));
			// this.fpControls.addEventListener("double_click_move", (event) => {
			//	let distance = event.targetLocation.distanceTo(event.position);
			//	this.setMoveSpeed(Math.pow(distance, 0.4));
			// });
			// this.fpControls.addEventListener("move_speed_changed", (event) => {
			//	this.setMoveSpeed(this.fpControls.moveSpeed);
			// });
		}

		// { // create GEO CONTROLS
		//	this.geoControls = new Potree.GeoControls(this.scene.camera, this.renderer.domElement);
		//	this.geoControls.enabled = false;
		//	this.geoControls.addEventListener("start", this.disableAnnotations.bind(this));
		//	this.geoControls.addEventListener("end", this.enableAnnotations.bind(this));
		//	this.geoControls.addEventListener("move_speed_changed", (event) => {
		//		this.setMoveSpeed(this.geoControls.moveSpeed);
		//	});
		// }

		{ // create ORBIT CONTROLS
			this.orbitControls = new Potree.OrbitControls(this);
			this.orbitControls.enabled = false;
			this.orbitControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.orbitControls.addEventListener('end', this.enableAnnotations.bind(this));
		}

		{ // create EARTH CONTROLS
			this.earthControls = new Potree.EarthControls(this);
			this.earthControls.enabled = false;
			this.earthControls.addEventListener('start', this.disableAnnotations.bind(this));
			this.earthControls.addEventListener('end', this.enableAnnotations.bind(this));
		}
	};

	toggleSidebar () {
		let renderArea = $('#potree_render_area');
		let isVisible = renderArea.css('left') !== '0px';

		if (isVisible) {
			renderArea.css('left', '0px');
		} else {
			renderArea.css('left', '300px');
		}
	};

	toggleMap () {
		// let map = $('#potree_map');
		// map.toggle(100);

		if (this.mapView) {
			this.mapView.toggle();
		}
	};

	onGUILoaded(callback){
		if(this.guiLoaded){
			callback();
		}else{
			this.guiLoadTasks.push(callback);
		}
	}

	loadGUI(callback){

		this.onGUILoaded(callback);

		let viewer = this;
		let sidebarContainer = $('#potree_sidebar_container');
		sidebarContainer.load(new URL(Potree.scriptPath + '/sidebar.html').href, () => {
			sidebarContainer.css('width', '300px');
			sidebarContainer.css('height', '100%');

			let imgMenuToggle = document.createElement('img');
			imgMenuToggle.src = new URL(Potree.resourcePath + '/icons/menu_button.svg').href;
			imgMenuToggle.onclick = this.toggleSidebar;
			imgMenuToggle.classList.add('potree_menu_toggle');

			let imgMapToggle = document.createElement('img');
			imgMapToggle.src = new URL(Potree.resourcePath + '/icons/map_icon.png').href;
			imgMapToggle.style.display = 'none';
			imgMapToggle.onclick = e => { this.toggleMap(); };
			imgMapToggle.id = 'potree_map_toggle';

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
			}, function (t) {
				// Start translation once everything is loaded
				$('body').i18n();
			});

			$(() => {
				initSidebar(this);

				//if (callback) {
				//	$(callback);
				//}

				let elProfile = $('<div>').load(new URL(Potree.scriptPath + '/profile.html').href, () => {
					$(document.body).append(elProfile.children());
					this.profileWindow = new Potree.ProfileWindow(this);
					this.profileWindowController = new Potree.ProfileWindowController(this);

					$('#profile_window').draggable({
						handle: $('#profile_titlebar'),
						containment: $(document.body)
					});
					$('#profile_window').resizable({
						containment: $(document.body),
						handles: 'n, e, s, w'
					});

					$(() => {
						this.guiLoaded = true;
						for(let task of this.guiLoadTasks){
							task();
						}

					});
				});

				

			});

			
		});
	}

	setLanguage (lang) {
		i18n.setLng(lang);
		$('body').i18n();
	}

	setServer (server) {
		this.server = server;
	}

	initThree () {
		let width = this.renderArea.clientWidth;
		let height = this.renderArea.clientHeight;

		this.renderer = new THREE.WebGLRenderer({alpha: true, premultipliedAlpha: false});
		this.renderer.sortObjects = false;
		this.renderer.setSize(width, height);
		this.renderer.autoClear = false;
		this.renderArea.appendChild(this.renderer.domElement);
		this.renderer.domElement.tabIndex = '2222';
		this.renderer.domElement.style.position = 'absolute';
		this.renderer.domElement.addEventListener('mousedown', () => {
			this.renderer.domElement.focus();
		});

		// enable frag_depth extension for the interpolation shader, if available
		let gl = this.renderer.context;
		gl.getExtension('EXT_frag_depth');
		gl.getExtension('WEBGL_depth_texture');
		
		let extVAO = gl.getExtension('OES_vertex_array_object');
		gl.createVertexArray = extVAO.createVertexArrayOES.bind(extVAO);
		gl.bindVertexArray = extVAO.bindVertexArrayOES.bind(extVAO);
		//gl.bindVertexArray = extVAO.asdfbindVertexArrayOES.bind(extVAO);
		
	}

	updateAnnotations () {

		if(!this.visibleAnnotations){
			this.visibleAnnotations = new Set();
		}

		this.scene.annotations.updateBounds();
		this.scene.cameraP.updateMatrixWorld();
		this.scene.cameraO.updateMatrixWorld();
		
		let distances = [];

		let renderAreaWidth = this.renderer.getSize().width;
		let renderAreaHeight = this.renderer.getSize().height;

		let viewer = this;

		let visibleNow = [];
		this.scene.annotations.traverse(annotation => {

			if (annotation === this.scene.annotations) {
				return true;
			}

			if (!annotation.visible) {
				return false;
			}

			annotation.scene = this.scene;

			let element = annotation.domElement;

			let position = annotation.position;
			if (!position) {
				position = annotation.boundingBox.getCenter();
			}

			let distance = viewer.scene.cameraP.position.distanceTo(position);
			let radius = annotation.boundingBox.getBoundingSphere().radius;

			let screenPos = new THREE.Vector3();
			let screenSize = 0;

			{
				// SCREEN POS
				screenPos.copy(position).project(this.scene.getActiveCamera());
				screenPos.x = renderAreaWidth * (screenPos.x + 1) / 2;
				screenPos.y = renderAreaHeight * (1 - (screenPos.y + 1) / 2);


				// SCREEN SIZE
				if(viewer.scene.cameraMode == Potree.CameraMode.PERSPECTIVE) {
					let fov = Math.PI * viewer.scene.cameraP.fov / 180;
					let slope = Math.tan(fov / 2.0);
					let projFactor =  0.5 * renderAreaHeight / (slope * distance);
					screenSize = radius * projFactor;
				} else {
					screenSize = Potree.utils.projectedRadiusOrtho(radius, viewer.scene.cameraO.projectionMatrix, renderAreaWidth, renderAreaHeight);
				}
			}

			element.css("left", screenPos.x + "px");
			element.css("top", screenPos.y + "px");
			//element.css("display", "block");

			let zIndex = 10000000 - distance * (10000000 / this.scene.cameraP.far);
			if(annotation.descriptionVisible){
				zIndex += 10000000;
			}
			element.css("z-index", parseInt(zIndex));

			if(annotation.children.length > 0){
				let expand = screenSize > annotation.collapseThreshold || annotation.boundingBox.containsPoint(this.scene.getActiveCamera().position);
				annotation.expand = expand;

				if (!expand) {
					//annotation.display = (screenPos.z >= -1 && screenPos.z <= 1);
					let inFrustum = (screenPos.z >= -1 && screenPos.z <= 1);
					if(inFrustum){
						visibleNow.push(annotation);
					}
				}

				return expand;
			} else {
				//annotation.display = (screenPos.z >= -1 && screenPos.z <= 1);
				let inFrustum = (screenPos.z >= -1 && screenPos.z <= 1);
				if(inFrustum){
					visibleNow.push(annotation);
				}
			}
			
		});

		let notVisibleAnymore = new Set(this.visibleAnnotations);
		for(let annotation of visibleNow){
			annotation.display = true;
			
			notVisibleAnymore.delete(annotation);
		}
		this.visibleAnnotations = visibleNow;

		for(let annotation of notVisibleAnymore){
			annotation.display = false;
		}

	}

	update(delta, timestamp){

		if(Potree.measureTimings) performance.mark("update-start");

		// if(window.urlToggle === undefined){
		//	window.urlToggle = 0;
		// }else{
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
		
		{
			let u = Math.sin(0.0005 * timestamp) * 0.5 - 0.4;
			
			let x = Math.cos(u);
			let y = Math.sin(u);
			
			this.shadowTestCam.position.set(7 * x, 7 * y, 8.561);
			this.shadowTestCam.lookAt(new THREE.Vector3(0, 0, 0));
		}
		
		
		let scene = this.scene;
		let camera = scene.getActiveCamera();
		
		Potree.pointLoadLimit = Potree.pointBudget * 2;

		this.scene.directionalLight.position.copy(camera.position);
		this.scene.directionalLight.lookAt(new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection()));

		for (let pointcloud of this.scene.pointclouds) {
			if (!pointcloud.material._defaultIntensityRangeChanged) {
				let root = pointcloud.pcoGeometry.root;
				if (root != null && root.loaded) {
					let attributes = pointcloud.pcoGeometry.root.geometry.attributes;
					if (attributes.intensity) {
						let array = attributes.intensity.array;

						// chose max value from the 0.75 percentile
						let ordered = [];
						for (let j = 0; j < array.length; j++) {
							ordered.push(array[j]);
						}
						ordered.sort();
						let capIndex = parseInt((ordered.length - 1) * 0.75);
						let cap = ordered[capIndex];

						if (cap <= 1) {
							pointcloud.material.intensityRange = [0, 1];
						} else if (cap <= 256) {
							pointcloud.material.intensityRange = [0, 255];
						} else {
							pointcloud.material.intensityRange = [0, cap];
						}

					}
					// pointcloud._intensityMaxEvaluated = true;
				}
			}
			
			pointcloud.showBoundingBox = this.showBoundingBox;
			pointcloud.generateDEM = this.generateDEM;
			pointcloud.minimumNodePixelSize = this.minNodeSize;
		}

		// update classification visibility
		for (let pointcloud of this.scene.pointclouds) {
			let classification = pointcloud.material.classification;
			let somethingChanged = false;
			for (let key of Object.keys(this.classifications)) {
				let w = this.classifications[key].visible ? 1 : 0;

				if (classification[key]) {
					if (classification[key].w !== w) {
						classification[key].w = w;
						somethingChanged = true;
					}
				} else if (classification.DEFAULT) {
					classification[key] = classification.DEFAULT;
					somethingChanged = true;
				} else {
					classification[key] = new THREE.Vector4(0.3, 0.6, 0.6, 0.5);
					somethingChanged = true;
				}
			}

			if (somethingChanged) {
				pointcloud.material.recomputeClassification();
			}
		}

		{
			if(this.showBoundingBox){
				let bbRoot = this.scene.scene.getObjectByName("potree_bounding_box_root");
				if(!bbRoot){
					let node = new THREE.Object3D();
					node.name = "potree_bounding_box_root";
					this.scene.scene.add(node);
					bbRoot = node;
				}

				let visibleBoxes = [];
				for(let pointcloud of this.scene.pointclouds){
					for(let node of pointcloud.visibleNodes.filter(vn => vn.boundingBoxNode !== undefined)){
						let box = node.boundingBoxNode;
						visibleBoxes.push(box);
					}
				}

				bbRoot.children = visibleBoxes;
			}
		}

		if (!this.freeze) {
			let result = Potree.updatePointClouds(scene.pointclouds, camera, this.renderer);

			if(result.lowestSpacing !== Infinity){
				let near = result.lowestSpacing * 10.0;
				let far = -this.getBoundingBox().applyMatrix4(camera.matrixWorldInverse).min.z;

				far = Math.max(far * 1.5, 1000);
				near = Math.min(100.0, Math.max(0.01, near));
				far = Math.max(far, near + 1000);

				if(near === Infinity){
					near = 0.1;
				}
				
				camera.near = near;
				camera.far = far;
			}else{
				// don't change near and far in this case
			}

			if(this.scene.cameraMode == Potree.CameraMode.ORTHOGRAPHIC) {
				camera.near = -camera.far;
			}
		} 
		
		this.scene.cameraP.fov = this.fov;
		
		// Navigation mode changed?
		if (this.getControls(scene.view.navigationMode) !== this.controls) {
			if (this.controls) {
				this.controls.enabled = false;
				this.inputHandler.removeInputListener(this.controls);
			}

			this.controls = this.getControls(scene.view.navigationMode);
			this.controls.enabled = true;
			this.inputHandler.addInputListener(this.controls);
		}
		
		if (this.controls !== null) {
			this.controls.setScene(scene);
			this.controls.update(delta);

			this.scene.cameraP.position.copy(scene.view.position);
			this.scene.cameraP.rotation.order = "ZXY";
			this.scene.cameraP.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			this.scene.cameraP.rotation.z = this.scene.view.yaw;

			this.scene.cameraO.position.copy(scene.view.position);
			this.scene.cameraO.rotation.order = "ZXY";
			this.scene.cameraO.rotation.x = Math.PI / 2 + this.scene.view.pitch;
			this.scene.cameraO.rotation.z = this.scene.view.yaw;
		}
		
		camera.updateMatrix();
		camera.updateMatrixWorld();
		camera.matrixWorldInverse.getInverse(camera.matrixWorld);

		{
			if(this._previousCamera === undefined){
				this._previousCamera = this.scene.getActiveCamera().clone();
				this._previousCamera.rotation.copy(this.scene.getActiveCamera());
			}

			if(!this._previousCamera.matrixWorld.equals(camera.matrixWorld)){
				this.dispatchEvent({
					type: "camera_changed",
					previous: this._previousCamera,
					camera: camera
				});
			}else if(!this._previousCamera.projectionMatrix.equals(camera.projectionMatrix)){
				this.dispatchEvent({
					type: "camera_changed",
					previous: this._previousCamera,
					camera: camera
				});
			}

			this._previousCamera = this.scene.getActiveCamera().clone();
			this._previousCamera.rotation.copy(this.scene.getActiveCamera());

		}

		{ // update clip boxes
			let boxes = [];
			
			// volumes with clipping enabled
			boxes.push(...this.scene.volumes.filter(v => v.clip));

			// profile segments
			for(let profile of this.scene.profiles){
				boxes.push(...profile.boxes);
			}
			
			let clipBoxes = boxes.map( box => {
				box.updateMatrixWorld();
				let boxInverse = new THREE.Matrix4().getInverse(box.matrixWorld);
				let boxPosition = box.getWorldPosition();
				return {box: box, inverse: boxInverse, position: boxPosition};
			});

			let clipPolygons = this.scene.polygonClipVolumes.filter(vol => vol.initialized);
			
			// set clip volumes in material
			for(let pointcloud of this.scene.pointclouds.filter(pc => pc.visible)){
				pointcloud.material.setClipBoxes(clipBoxes);
				pointcloud.material.setClipPolygons(clipPolygons, this.clippingTool.maxPolygonVertices);
				pointcloud.material.clipTask = this.clipTask;
				pointcloud.material.clipMethod = this.clipMethod;
			}
		}

		{ // update navigation cube
			this.navigationCube.update(camera.rotation);
		}

		this.updateAnnotations();
		
		if(this.mapView){
			this.mapView.update(delta);
			if(this.mapView.sceneProjection){
				$( "#potree_map_toggle" ).css("display", "block");
				
			}
		}

		TWEEN.update(timestamp);

		this.dispatchEvent({
			type: 'update',
			delta: delta,
			timestamp: timestamp});
			
		if(Potree.measureTimings) {
			performance.mark("update-end");
			performance.measure("update", "update-start", "update-end");
		}
	}
	
	render(){
		if(Potree.measureTimings) performance.mark("render-start");

		{ // resize
			let width = this.scaleFactor * this.renderArea.clientWidth;
			let height = this.scaleFactor * this.renderArea.clientHeight;
			let pixelRatio = this.renderer.getPixelRatio();
			let aspect = width / height;

			this.scene.cameraP.aspect = aspect;
			this.scene.cameraP.updateProjectionMatrix();

			//let frustumScale = viewer.moveSpeed * 2.0;
			let frustumScale = this.scene.view.radius;
			this.scene.cameraO.left = -frustumScale;
			this.scene.cameraO.right = frustumScale;		
			this.scene.cameraO.top = frustumScale * 1 / aspect;
			this.scene.cameraO.bottom = -frustumScale * 1 / aspect;		
			this.scene.cameraO.updateProjectionMatrix();

			this.scene.cameraScreenSpace.top = 1/aspect;
			this.scene.cameraScreenSpace.bottom = -1/aspect;
			this.scene.cameraScreenSpace.updateProjectionMatrix();
			
			this.renderer.setSize(width, height);
		}

		try{


		if(this.useRep){
			if (!this.repRenderer) {
				this.repRenderer = new RepRenderer(this);
			}
			this.repRenderer.render(this.renderer);
		}else if(this.useHQ){
			if (!this.hqRenderer) {
				this.hqRenderer = new HQSplatRenderer(this);
			}
			this.hqRenderer.useEDL = this.useEDL;
			this.hqRenderer.render(this.renderer);
		}else{
			if (this.useEDL && Potree.Features.SHADER_EDL.isSupported()) {
				if (!this.edlRenderer) {
					this.edlRenderer = new EDLRenderer(this);
				}
				this.edlRenderer.render(this.renderer);
			} else {
				if (!this.potreeRenderer) {
					this.potreeRenderer = new PotreeRenderer(this);
				}
				this.potreeRenderer.render();
			}
		}

		//if(this.useRep){
		//	if (!this.repRenderer) {
		//		this.repRenderer = new RepRenderer(this);
		//	}
		//	this.repRenderer.render(this.renderer);
		//} else if (this.useHQ && Potree.Features.SHADER_SPLATS.isSupported()) {
		//	if (!this.hqRenderer) {
		//		this.hqRenderer = new HQSplatRenderer(this);
		//	}
		//	this.hqRenderer.render(this.renderer);
		//} else if (this.useEDL && Potree.Features.SHADER_EDL.isSupported()) {
		//	if (!this.edlRenderer) {
		//		this.edlRenderer = new EDLRenderer(this);
		//	}
		//	this.edlRenderer.render(this.renderer);
		//} else {
		//	if (!this.potreeRenderer) {
		//		this.potreeRenderer = new PotreeRenderer(this);
		//	}

		//	this.potreeRenderer.render();
		//}

		this.renderer.render(this.overlay, this.overlayCamera);

		}catch(e){
			this.onCrash(e);
		}
		
		if(Potree.measureTimings){
			performance.mark("render-end");
			performance.measure("render", "render-start", "render-end");
		}
	}

	resolveTimings(timestamp){
		if(Potree.measureTimings){
			if(!this.toggle){
				this.toggle = timestamp;
			}
			let duration = timestamp - this.toggle;
			if(duration > 1000.0){
			
				let measures = performance.getEntriesByType("measure");
				
				let names = new Set();
				for(let measure of measures){
					names.add(measure.name);
				}
				
				let groups = new Map();
				for(let name of names){
					groups.set(name, {
						measures: [],
						sum: 0,
						n: 0,
						min: Infinity,
						max: -Infinity
					});
				}
				
				for(let measure of measures){
					let group = groups.get(measure.name);
					group.measures.push(measure);
					group.sum += measure.duration;
					group.n++;
					group.min = Math.min(group.min, measure.duration);
					group.max = Math.max(group.max, measure.duration);
				}

				let glQueries = Potree.resolveQueries(this.renderer.getContext());
				for(let [key, value] of glQueries){

					let group = {
						measures: value.map(v => {return {duration: v}}),
						sum: value.reduce( (a, i) => a + i, 0),
						n: value.length,
						min: Math.min(...value),
						max: Math.max(...value)
					};

					let groupname = `[tq] ${key}`;
					groups.set(groupname, group);
					names.add(groupname);
				}
				
				for(let [name, group] of groups){
					group.mean = group.sum / group.n;
					group.measures.sort( (a, b) => a.duration - b.duration );
					
					if(group.n === 1){
						group.median = group.measures[0].duration;
					}else if(group.n > 1){
						group.median = group.measures[parseInt(group.n / 2)].duration;
					}
					
				}
				
				let cn = Array.from(names).reduce( (a, i) => Math.max(a, i.length), 0) + 5;
				let cmin = 10;
				let cmed = 10;
				let cmax = 10;
				let csam = 6;
				
				let message = ` ${"NAME".padEnd(cn)} |` 
					+ ` ${"MIN".padStart(cmin)} |`
					+ ` ${"MEDIAN".padStart(cmed)} |`
					+ ` ${"MAX".padStart(cmax)} |`
					+ ` ${"SAMPLES".padStart(csam)} \n`;
				message += ` ${"-".repeat(message.length) }\n`;
				
				names = Array.from(names).sort();
				for(let name of names){
					let group = groups.get(name);
					let min = group.min.toFixed(3);
					let median = group.median.toFixed(3);
					let max = group.max.toFixed(3);
					let n = group.n;
					
					message += ` ${name.padEnd(cn)} |`
						+ ` ${min.padStart(cmin)} |`
						+ ` ${median.padStart(cmed)} |`
						+ ` ${max.padStart(cmax)} |`
						+ ` ${n.toString().padStart(csam)}\n`;
				}
				message += `\n`;
				console.log(message);
				
				performance.clearMarks();
				performance.clearMeasures();
				this.toggle = timestamp;
			}
		}
	}

	loop(timestamp){
		requestAnimationFrame(this.loop.bind(this));

		let queryAll;
		if(Potree.measureTimings){
			performance.mark("loop-start");
		}

		this.update(this.clock.getDelta(), timestamp);

		this.render();

		if(Potree.measureTimings){
			performance.mark("loop-end");
			performance.measure("loop", "loop-start", "loop-end");
		}
		
		this.resolveTimings(timestamp);

		Potree.framenumber++;
	}

	postError(content, params = {}){
		let message = this.postMessage(content, params);

		message.element.addClass("potree_message_error");

		return message;
	}

	postMessage(content, params = {}){
		let message = new Potree.Message(content);

		let animationDuration = 100;

		message.element.css("display", "none");
		message.elClose.click( () => {
			message.element.slideToggle(animationDuration);

			let index = this.messages.indexOf(message);
			if(index >= 0){
				this.messages.splice(index, 1);
			}
		});

		this.elMessages.prepend(message.element);

		message.element.slideToggle(animationDuration);

		this.messages.push(message);

		if(params.duration !== undefined){
			let fadeDuration = 500;
			let slideOutDuration = 200;
			setTimeout(() => {
				message.element.animate({
					opacity: 0	
				}, fadeDuration);
				message.element.slideToggle(slideOutDuration);
			}, params.duration)
		}

		return message;
	}
};



class ProfilePointCloudEntry{

	constructor(){

		this.points = [];

		//let geometry = new THREE.BufferGeometry();
		let material = ProfilePointCloudEntry.getMaterialInstance();
		material.uniforms.minSize.value = 2;
		material.uniforms.maxSize.value = 2;
		material.pointColorType = Potree.PointColorType.RGB;
		material.opacity = 1.0;

		this.material = material;

		this.sceneNode = new THREE.Object3D();
		//this.sceneNode = new THREE.Points(geometry, material);
	}

	static releaseMaterialInstance(instance){
		ProfilePointCloudEntry.materialPool.add(instance);
	}

	static getMaterialInstance(){

		let instance = ProfilePointCloudEntry.materialPool.values().next().value;
		if(!instance){
			instance = new Potree.PointCloudMaterial();
		}else{
			ProfilePointCloudEntry.materialPool.delete(instance);
		}

		return instance;
	}

	dispose(){

		for(let child of this.sceneNode.children){
			ProfilePointCloudEntry.releaseMaterialInstance(child.material);
			child.geometry.dispose();
		}

		this.sceneNode.children = [];		
	}

	addPoints(data){

		this.points.push(data);

		let batchSize = 10*1000;

		let createNewBatch = () => {
			let geometry = new THREE.BufferGeometry();

			let buffers = {
				position: new Float32Array(3 * batchSize),
				color: new Uint8Array(4 * batchSize),
				intensity: new Uint16Array(batchSize),
				classification: new Uint8Array(batchSize),
				returnNumber: new Uint8Array(batchSize),
				numberOfReturns: new Uint8Array(batchSize),
				pointSourceID: new Uint16Array(batchSize)
			};

			geometry.addAttribute('position', new THREE.BufferAttribute(buffers.position, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(buffers.color, 4, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(buffers.intensity, 1, false));
			geometry.addAttribute('classification', new THREE.BufferAttribute(buffers.classification, 1, false));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(buffers.returnNumber, 1, false));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(buffers.numberOfReturns, 1, false));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(buffers.pointSourceID, 1, false));

			geometry.drawRange.start = 0;
			geometry.drawRange.count = 0;

			this.currentBatch = new THREE.Points(geometry, this.material);
			this.sceneNode.add(this.currentBatch);
		}

		if(!this.currentBatch){
			createNewBatch();
		}
		
		{ // REBUILD MODEL

			let pointsProcessed = 0;
			let updateRange = {
				start: this.currentBatch.geometry.drawRange.count,
				count: 0
			};

			let projectedBox = new THREE.Box3();
			
			for(let i = 0; i < data.numPoints; i++){

				if(updateRange.start + updateRange.count >= batchSize){
					// finalize current batch, start new batch

					for(let key of Object.keys(this.currentBatch.geometry.attributes)){
						let attribute = this.currentBatch.geometry.attributes[key];
						attribute.updateRange.offset = updateRange.start;
						attribute.updateRange.count = updateRange.count;
						attribute.needsUpdate = true;
					}
					this.currentBatch.geometry.computeBoundingBox();
					this.currentBatch.geometry.computeBoundingSphere();

					createNewBatch();
					updateRange = {
						start: 0,
						count: 0
					};
				}


				let x = data.data.mileage[i];
				let y = 0;
				let z = data.data.position[3 * i + 2];

				projectedBox.expandByPoint(new THREE.Vector3(x, y, z));

				let currentIndex = updateRange.start + updateRange.count;

				let attributes = this.currentBatch.geometry.attributes;

				{
					attributes.position.array[3 * currentIndex + 0] = x;
					attributes.position.array[3 * currentIndex + 1] = y;
					attributes.position.array[3 * currentIndex + 2] = z;
				}

				if(data.data.color){
					attributes.color.array[4 * currentIndex + 0] = data.data.color[4 * i + 0];
					attributes.color.array[4 * currentIndex + 1] = data.data.color[4 * i + 1];
					attributes.color.array[4 * currentIndex + 2] = data.data.color[4 * i + 2];
					attributes.color.array[4 * currentIndex + 3] = 255;
				}

				if(data.data.intensity){
					attributes.intensity.array[currentIndex] = data.data.intensity[i];
				}

				if(data.data.classification){
					attributes.classification.array[currentIndex] = data.data.classification[i];
				}

				if(data.data.returnNumber){
					attributes.returnNumber.array[currentIndex] = data.data.returnNumber[i];
				}

				if(data.data.numberOfReturns){
					attributes.numberOfReturns.array[currentIndex] = data.data.numberOfReturns[i];
				}

				if(data.data.pointSourceID){
					attributes.pointSourceID.array[currentIndex] = data.data.pointSourceID[i];
				}

				updateRange.count++;
				this.currentBatch.geometry.drawRange.count++;
			}

			//for(let attribute of Object.values(this.currentBatch.geometry.attributes)){
			for(let key of Object.keys(this.currentBatch.geometry.attributes)){
				let attribute = this.currentBatch.geometry.attributes[key];
				attribute.updateRange.offset = updateRange.start;
				attribute.updateRange.count = updateRange.count;
				attribute.needsUpdate = true;
			}

			data.projectedBox = projectedBox;
			
			this.projectedBox = this.points.reduce( (a, i) => a.union(i.projectedBox), new THREE.Box3());
		}


	}

};

ProfilePointCloudEntry.materialPool = new Set();

Potree.ProfileWindow = class ProfileWindow extends THREE.EventDispatcher {
	constructor (viewer) {
		super();

		this.viewer = viewer;
		this.elRoot = $('#profile_window');
		this.renderArea = this.elRoot.find('#profileCanvasContainer');
		this.svg = d3.select('svg#profileSVG');
		this.mouseIsDown = false;

		this.projectedBox = new THREE.Box3();
		this.pointclouds = new Map();
		this.numPoints = 0;
		this.lastAddPointsTimestamp = undefined;

		this.mouse = new THREE.Vector2(0, 0);
		this.scale = new THREE.Vector3(1, 1, 1);

		let csvIcon = `${Potree.resourcePath}/icons/file_csv_2d.svg`;
		$('#potree_download_csv_icon').attr('src', csvIcon);

		let lasIcon = `${Potree.resourcePath}/icons/file_las_3d.svg`;
		$('#potree_download_las_icon').attr('src', lasIcon);

		let closeIcon = `${Potree.resourcePath}/icons/close.svg`;
		$('#closeProfileContainer').attr("src", closeIcon);

		this.initTHREE();
		this.initSVG();
		this.initListeners();

		this.elRoot.i18n();
	}

	initListeners () {
		$(window).resize(() => {
			this.render();
		});

		this.renderArea.mousedown(e => {
			this.mouseIsDown = true;
		});

		this.renderArea.mouseup(e => {
			this.mouseIsDown = false;
		});

		let viewerPickSphereSizeHandler = () => {
			let camera = this.viewer.scene.getActiveCamera();
			let domElement = this.viewer.renderer.domElement;
			let distance = this.viewerPickSphere.position.distanceTo(camera.position);
			let pr = Potree.utils.projectedRadius(1, camera, distance, domElement.clientWidth, domElement.clientHeight);
			let scale = (10 / pr);
			this.viewerPickSphere.scale.set(scale, scale, scale);
		};

		this.renderArea.mousemove(e => {
			if (this.pointclouds.size === 0) {
				return;
			}

			let rect = this.renderArea[0].getBoundingClientRect();
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top;

			let newMouse = new THREE.Vector2(x, y);

			if (this.mouseIsDown) {
				// DRAG
				this.autoFit = false;
				this.lastDrag = new Date().getTime();

				let cPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];
				let ncPos = [this.scaleX.invert(newMouse.x), this.scaleY.invert(newMouse.y)];

				this.camera.position.x -= ncPos[0] - cPos[0];
				this.camera.position.z -= ncPos[1] - cPos[1];

				this.render();
			} else if (this.pointclouds.size > 0) {
				// FIND HOVERED POINT
				let radius = Math.abs(this.scaleX.invert(0) - this.scaleX.invert(40));
				let mileage = this.scaleX.invert(newMouse.x);
				let elevation = this.scaleY.invert(newMouse.y);

				let point = this.selectPoint(mileage, elevation, radius);

				if (point) {
					this.elRoot.find('#profileSelectionProperties').fadeIn(200);
					this.pickSphere.visible = true;
					this.pickSphere.scale.set(0.5 * radius, 0.5 * radius, 0.5 * radius);
					this.pickSphere.position.set(point.mileage, 0, point.position[2]);

					this.viewerPickSphere.position.set(...point.position);
					
					if(!this.viewer.scene.scene.children.includes(this.viewerPickSphere)){
						this.viewer.scene.scene.add(this.viewerPickSphere);
						if(!this.viewer.hasEventListener("update", viewerPickSphereSizeHandler)){
							this.viewer.addEventListener("update", viewerPickSphereSizeHandler);
						}
					}
					

					let info = this.elRoot.find('#profileSelectionProperties');
					let html = '<table>';
					for (let attribute of Object.keys(point)) {
						let value = point[attribute];
						if (attribute === 'position') {
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
						} else if (attribute === 'color') {
							html += `
								<tr>
									<td>${attribute}</td>
									<td>${value.join(', ')}</td>
								</tr>`;
						} else if (attribute === 'normal') {
							continue;
						} else if (attribute === 'mileage') {
							html += `
								<tr>
									<td>${attribute}</td>
									<td>${value.toFixed(3)}</td>
								</tr>`;
						} else {
							html += `
								<tr>
									<td>${attribute}</td>
									<td>${value}</td>
								</tr>`;
						}
					}
					html += '</table>';
					info.html(html);

					this.selectedPoint = point;
				} else {
					// this.pickSphere.visible = false;
					// this.selectedPoint = null;

					this.viewer.scene.scene.add(this.viewerPickSphere);

					let index = this.viewer.scene.scene.children.indexOf(this.viewerPickSphere);
					if(index >= 0){
						this.viewer.scene.scene.children.splice(index, 1);
					}
					this.viewer.removeEventListener("update", viewerPickSphereSizeHandler);
					

				}
				this.render();
			}

			this.mouse.copy(newMouse);
		});

		let onWheel = e => {
			this.autoFit = false;
			let delta = 0;
			if (e.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
				delta = e.wheelDelta;
			} else if (e.detail !== undefined) { // Firefox
				delta = -e.detail;
			}

			let ndelta = Math.sign(delta);

			let cPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];

			if (ndelta > 0) {
				// + 10%
				this.scale.multiplyScalar(1.1);
			} else {
				// - 10%
				this.scale.multiplyScalar(100 / 110);
			}

			this.updateScales();
			let ncPos = [this.scaleX.invert(this.mouse.x), this.scaleY.invert(this.mouse.y)];

			this.camera.position.x -= ncPos[0] - cPos[0];
			this.camera.position.z -= ncPos[1] - cPos[1];

			this.render();
			this.updateScales();
		};
		$(this.renderArea)[0].addEventListener('mousewheel', onWheel, false);
		$(this.renderArea)[0].addEventListener('DOMMouseScroll', onWheel, false); // Firefox

		$('#closeProfileContainer').click(() => {
			this.hide();
		});

		$('#potree_download_csv_icon').click(() => {
			let points = new Potree.Points();
			
			for(let [pointcloud, entry] of this.pointclouds){
				for(let pointSet of entry.points){
					points.add(pointSet);
				}
			}

			let string = Potree.CSVExporter.toString(points);

			let blob = new Blob([string], {type: "text/string"});
			$('#potree_download_profile_ortho_link').attr('href', URL.createObjectURL(blob));

			//let uri = 'data:application/octet-stream;base64,' + btoa(string);
			//$('#potree_download_profile_ortho_link').attr('href', uri);
		});

		$('#potree_download_las_icon').click(() => {

			let points = new Potree.Points();

			for(let [pointcloud, entry] of this.pointclouds){
				for(let pointSet of entry.points){
					points.add(pointSet);
				}
			}

			let buffer = Potree.LASExporter.toLAS(points);

			let blob = new Blob([buffer], {type: "application/octet-binary"});
			$('#potree_download_profile_link').attr('href', URL.createObjectURL(blob));

			//let u8view = new Uint8Array(buffer);
			//let binString = '';
			//for (let i = 0; i < u8view.length; i++) {
			//	binString += String.fromCharCode(u8view[i]);
			//}
			//
			//let uri = 'data:application/octet-stream;base64,' + btoa(binString);
			//$('#potree_download_profile_link').attr('href', uri);
		});
	}

	selectPoint (mileage, elevation, radius) {
		let closest = {
			distance: Infinity,
			pointcloud: null,
			points: null,
			index: null
		};

		let pointBox = new THREE.Box2(
			new THREE.Vector2(mileage - radius, elevation - radius),
			new THREE.Vector2(mileage + radius, elevation + radius));

		//let debugNode = this.scene.getObjectByName("select_debug_node");
		//if(!debugNode){
		//	debugNode = new THREE.Object3D();
		//	debugNode.name = "select_debug_node";
		//	this.scene.add(debugNode);
		//}
		//debugNode.children = [];
		//let debugPointBox = new THREE.Box3(
		//	new THREE.Vector3(...pointBox.min.toArray(), -1),
		//	new THREE.Vector3(...pointBox.max.toArray(), +1)
		//);
		//debugNode.add(new Potree.Box3Helper(debugPointBox, 0xff0000));

		let numTested = 0;
		let numSkipped = 0;
		let numTestedPoints = 0;
		let numSkippedPoints = 0;

		for (let [pointcloud, entry] of this.pointclouds) {
			for(let points of entry.points){

				let collisionBox = new THREE.Box2(
					new THREE.Vector2(points.projectedBox.min.x, points.projectedBox.min.z),
					new THREE.Vector2(points.projectedBox.max.x, points.projectedBox.max.z)
				);

				let intersects = collisionBox.intersectsBox(pointBox);

				if(!intersects){
					numSkipped++;
					numSkippedPoints += points.numPoints;
					continue;
				}

				//let debugCollisionBox = new THREE.Box3(
				//	new THREE.Vector3(...collisionBox.min.toArray(), -1),
				//	new THREE.Vector3(...collisionBox.max.toArray(), +1)
				//);
				//debugNode.add(new Potree.Box3Helper(debugCollisionBox));

				numTested++;
				numTestedPoints += points.numPoints

				for (let i = 0; i < points.numPoints; i++) {

					let m = points.data.mileage[i] - mileage;
					let e = points.data.position[3 * i + 2] - elevation;

					let r = Math.sqrt(m * m + e * e);

					if (r < radius && r < closest.distance) {
						closest = {
							distance: r,
							pointcloud: pointcloud,
							points: points,
							index: i
						};
					}
				}
			}
		}


		//console.log(`nodes: ${numTested}, ${numSkipped} || points: ${numTestedPoints}, ${numSkippedPoints}`);

		if (closest.distance < Infinity) {
			let points = closest.points;

			let point = {};

			let attributes = Object.keys(points.data);
			for (let attribute of attributes) {
				let attributeData = points.data[attribute];
				let itemSize = attributeData.length / points.numPoints;
				let value = attributeData.subarray(itemSize * closest.index, itemSize * closest.index + itemSize);

				if (value.length === 1) {
					point[attribute] = value[0];
				} else {
					point[attribute] = value;
				}
			}

			return point;
		} else {
			return null;
		}
	}

	initTHREE () {
		this.renderer = new THREE.WebGLRenderer({alpha: true, premultipliedAlpha: false});
		this.renderer.setClearColor(0x000000, 0);
		this.renderer.setSize(10, 10);
		this.renderer.autoClear = true;
		this.renderArea.append($(this.renderer.domElement));
		this.renderer.domElement.tabIndex = '2222';
		this.renderer.context.getExtension('EXT_frag_depth');
		$(this.renderer.domElement).css('width', '100%');
		$(this.renderer.domElement).css('height', '100%');

		this.camera = new THREE.OrthographicCamera(-1000, 1000, 1000, -1000, -1000, 1000);
		this.camera.up.set(0, 0, 1);
		this.camera.rotation.order = "ZXY";
		this.camera.rotation.x = Math.PI / 2.0;
		


		this.scene = new THREE.Scene();

		let sg = new THREE.SphereGeometry(1, 16, 16);
		let sm = new THREE.MeshNormalMaterial();
		this.pickSphere = new THREE.Mesh(sg, sm);
		//this.pickSphere.visible = false;
		this.scene.add(this.pickSphere);

		this.viewerPickSphere = new THREE.Mesh(sg, sm);

		this.pointCloudRoot = new THREE.Object3D();
		this.scene.add(this.pointCloudRoot);
	}

	initSVG () {
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;
		let marginLeft = this.renderArea[0].offsetLeft;

		this.svg.selectAll('*').remove();

		this.scaleX = d3.scale.linear()
			.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
			.range([0, width]);
		this.scaleY = d3.scale.linear()
			.domain([this.camera.bottom + this.camera.position.z, this.camera.top + this.camera.position.z])
			.range([height, 0]);

		this.xAxis = d3.svg.axis()
			.scale(this.scaleX)
			.orient('bottom')
			.innerTickSize(-height)
			.outerTickSize(1)
			.tickPadding(10)
			.ticks(width / 50);

		this.yAxis = d3.svg.axis()
			.scale(this.scaleY)
			.orient('left')
			.innerTickSize(-width)
			.outerTickSize(1)
			.tickPadding(10)
			.ticks(height / 20);

		this.elXAxis = this.svg.append('g')
			.attr('class', 'x axis')
			.attr('transform', `translate(${marginLeft}, ${height})`)
			.call(this.xAxis);

		this.elYAxis = this.svg.append('g')
			.attr('class', 'y axis')
			.attr('transform', `translate(${marginLeft}, 0)`)
			.call(this.yAxis);
	}

	setProfile (profile) {
		this.render();
	}

	addPoints (pointcloud, points) {

		//this.lastAddPointsTimestamp = new Date().getTime();

		let entry = this.pointclouds.get(pointcloud);
		if(!entry){
			entry = new ProfilePointCloudEntry();
			this.pointclouds.set(pointcloud, entry);

			let materialChanged = () => this.render();
			pointcloud.material.addEventListener('material_property_changed', materialChanged);
			this.addEventListener("on_reset_once", () => {
				pointcloud.material.removeEventListener('material_property_changed', materialChanged);
			});
		}

		entry.addPoints(points);
		this.pointCloudRoot.add(entry.sceneNode);
		this.projectedBox.union(entry.projectedBox);
		//console.log(this.projectedBox.min.toArray().map(v => v.toFixed(2)).join(", "));
		//console.log(this.projectedBox.getSize().toArray().map(v => v.toFixed(2)).join(", "));

		if (this.autoFit) { 
			let width = this.renderArea[0].clientWidth;
			let height = this.renderArea[0].clientHeight;

			let size = this.projectedBox.getSize();

			let sx = width / size.x;
			let sy = height / size.z;
			let scale = Math.min(sx, sy);

			let center = this.projectedBox.getCenter();
			this.scale.set(scale, scale, 1);
			this.camera.position.copy(center);

			//console.log("camera: ", this.camera.position.toArray().join(", "));
		}

		//console.log(entry);

		this.render();

		let numPoints = 0;
		for (let [key, value] of this.pointclouds.entries()) {
			numPoints += value.points.reduce( (a, i) => a + i.numPoints, 0);
		}
		$(`#profile_num_points`).html(Potree.utils.addCommas(numPoints));

	}

	reset () {
		this.lastReset = new Date().getTime();

		this.dispatchEvent({type: "on_reset_once"});
		this.removeEventListeners("on_reset_once");

		this.autoFit = true;
		this.projectedBox = new THREE.Box3();

		for(let [key, entry] of this.pointclouds){
			entry.dispose();
		}

		this.pointclouds.clear();
		this.mouseIsDown = false;
		this.mouse.set(0, 0);
		this.scale.set(1, 1, 1);
		this.pickSphere.visible = false;

		this.pointCloudRoot.children = [];

		this.elRoot.find('#profileSelectionProperties').hide();

		this.render();
	}

	show () {
		this.elRoot.fadeIn();
		this.enabled = true;
	}

	hide () {
		this.elRoot.fadeOut();
		this.enabled = false;
	}

	updateScales () {
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;

		let left = (-width / 2) / this.scale.x;
		let right = (+width / 2) / this.scale.x;
		let top = (+height / 2) / this.scale.y;
		let bottom = (-height / 2) / this.scale.y;

		this.camera.left = left;
		this.camera.right = right;
		this.camera.top = top;
		this.camera.bottom = bottom;
		this.camera.updateProjectionMatrix();

		this.scaleX.domain([this.camera.left + this.camera.position.x, this.camera.right + this.camera.position.x])
			.range([0, width]);
		this.scaleY.domain([this.camera.bottom + this.camera.position.z, this.camera.top + this.camera.position.z])
			.range([height, 0]);

		let marginLeft = this.renderArea[0].offsetLeft;

		this.xAxis.scale(this.scaleX)
			.orient('bottom')
			.innerTickSize(-height)
			.outerTickSize(1)
			.tickPadding(10)
			.ticks(width / 50);
		this.yAxis.scale(this.scaleY)
			.orient('left')
			.innerTickSize(-width)
			.outerTickSize(1)
			.tickPadding(10)
			.ticks(height / 20);


		this.elXAxis
			.attr('transform', `translate(${marginLeft}, ${height})`)
			.call(this.xAxis);
		this.elYAxis
			.attr('transform', `translate(${marginLeft}, 0)`)
			.call(this.yAxis);
	}

	requestScaleUpdate(){

		let threshold = 100;
		let allowUpdate = ((this.lastReset === undefined) || (this.lastScaleUpdate === undefined)) 
			|| ((new Date().getTime() - this.lastReset) > threshold && (new Date().getTime() - this.lastScaleUpdate) > threshold);

		if(allowUpdate){

			this.updateScales();

			this.lastScaleUpdate = new Date().getTime();

			

			this.scaleUpdatePending = false;
		}else if(!this.scaleUpdatePending) {
			setTimeout(this.requestScaleUpdate.bind(this), 100);
			this.scaleUpdatePending = true;
		}
		
	}

	render () {
		let width = this.renderArea[0].clientWidth;
		let height = this.renderArea[0].clientHeight;

		//this.updateScales();

		{ // THREEJS
			let radius = Math.abs(this.scaleX.invert(0) - this.scaleX.invert(5));
			this.pickSphere.scale.set(radius, radius, radius);
			//this.pickSphere.position.z = this.camera.far - radius;
			//this.pickSphere.position.y = 0;

			for (let [pointcloud, entry] of this.pointclouds) {
				let material = entry.material;
			
				material.pointColorType = pointcloud.material.pointColorType;
				material.uniforms.uColor = pointcloud.material.uniforms.uColor;
				material.uniforms.intensityRange.value = pointcloud.material.uniforms.intensityRange.value;
				material.elevationRange = pointcloud.material.elevationRange;

				material.rgbGamma = pointcloud.material.rgbGamma;
				material.rgbContrast = pointcloud.material.rgbContrast;
				material.rgbBrightness = pointcloud.material.rgbBrightness;

				material.intensityRange = pointcloud.material.intensityRange;
				material.intensityGamma = pointcloud.material.intensityGamma;
				material.intensityContrast = pointcloud.material.intensityContrast;
				material.intensityBrightness = pointcloud.material.intensityBrightness;

				material.uniforms.wRGB.value = pointcloud.material.uniforms.wRGB.value;
				material.uniforms.wIntensity.value = pointcloud.material.uniforms.wIntensity.value;
				material.uniforms.wElevation.value = pointcloud.material.uniforms.wElevation.value;
				material.uniforms.wClassification.value = pointcloud.material.uniforms.wClassification.value;
				material.uniforms.wReturnNumber.value = pointcloud.material.uniforms.wReturnNumber.value;
				material.uniforms.wSourceID.value = pointcloud.material.uniforms.wSourceID.value;

			}

			this.pickSphere.visible = true;

			this.renderer.setSize(width, height);

			this.renderer.render(this.scene, this.camera);
		}

		this.requestScaleUpdate();
	}
};

Potree.ProfileWindowController = class ProfileWindowController {
	constructor (viewer) {
		this.viewer = viewer;
		this.profileWindow = viewer.profileWindow;
		this.profile = null;
		this.numPoints = 0;
		this.threshold = 60 * 1000;
		this.scheduledRecomputeTime = null;

		this.enabled = true;

		this.requests = [];

		this._recompute = () => { this.recompute(); };

		this.viewer.addEventListener("scene_changed", e => {
			e.oldScene.removeEventListener("pointcloud_added", this._recompute);
			e.scene.addEventListener("pointcloud_added", this._recompute);
		});
		this.viewer.scene.addEventListener("pointcloud_added", this._recompute);
	}

	setProfile (profile) {
		if (this.profile !== null && this.profile !== profile) {
			this.profile.removeEventListener('marker_moved', this._recompute);
			this.profile.removeEventListener('marker_added', this._recompute);
			this.profile.removeEventListener('marker_removed', this._recompute);
			this.profile.removeEventListener('width_changed', this._recompute);
		}

		this.profile = profile;

		{
			this.profile.addEventListener('marker_moved', this._recompute);
			this.profile.addEventListener('marker_added', this._recompute);
			this.profile.addEventListener('marker_removed', this._recompute);
			this.profile.addEventListener('width_changed', this._recompute);
		}

		this.recompute();
	}

	reset () {
		this.profileWindow.reset();

		this.numPoints = 0;

		if (this.profile) {
			for (let request of this.requests) {
				request.cancel();
			}
		}
	}

	progressHandler (pointcloud, progress) {
		for (let segment of progress.segments) {
			this.profileWindow.addPoints(pointcloud, segment.points);
			this.numPoints += segment.points.numPoints;
		}
	}

	cancel () {
		for (let request of this.requests) {
			request.cancel();
			// request.finishLevelThenCancel();
		}

		this.requests = [];
	};

	finishLevelThenCancel(){
		for (let request of this.requests) {
			request.finishLevelThenCancel();
		}

		this.requests = [];
	}

	recompute () {
		if (!this.profile) {
			return;
		}

		if (this.scheduledRecomputeTime !== null && this.scheduledRecomputeTime > new Date().getTime()) {
			return;
		} else {
			this.scheduledRecomputeTime = new Date().getTime() + 100;
		}
		this.scheduledRecomputeTime = null;

		this.reset();

		for (let pointcloud of this.viewer.scene.pointclouds.filter(p => p.visible)) {
			let request = pointcloud.getPointsInProfile(this.profile, null, {
				'onProgress': (event) => {
					if (!this.enabled) {
						return;
					}

					this.progressHandler(pointcloud, event.points);

					if (this.numPoints > this.threshold) {
						this.finishLevelThenCancel();
					}
				},
				'onFinish': (event) => {
					if (!this.enabled) {

					}
				},
				'onCancel': () => {
					if (!this.enabled) {

					}
				}
			});

			this.requests.push(request);
		}
	}
};


// http://epsg.io/
proj4.defs('UTM10N', '+proj=utm +zone=10 +ellps=GRS80 +datum=NAD83 +units=m +no_defs');

Potree.MapView = class {
	constructor (viewer) {
		this.viewer = viewer;

		this.webMapService = 'WMTS';
		this.mapProjectionName = 'EPSG:3857';
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
				}) */
			];
		};

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
		};
	}

	showSources (show) {
		this.sourcesLayer.setVisible(show);
		this.sourcesLabelLayer.setVisible(show);
	}

	init () {
		this.elMap = $('#potree_map');
		this.elMap.draggable({ handle: $('#potree_map_header') });
		this.elMap.resizable();

		this.elTooltip = $(`<div style="position: relative; z-index: 100"></div>`);
		this.elMap.append(this.elTooltip);

		let extentsLayer = this.getExtentsLayer();
		let cameraLayer = this.getCameraLayer();
		this.getToolLayer();
		let sourcesLayer = this.getSourcesLayer();
		this.getSourcesLabelLayer();
		this.getAnnotationsLayer();

		let mousePositionControl = new ol.control.MousePosition({
			coordinateFormat: ol.coordinate.createStringXY(5),
			projection: 'EPSG:4326',
			undefinedHTML: '&nbsp;'
		});

		let _this = this;
		let DownloadSelectionControl = function (optOptions) {
			let options = optOptions || {};

			// TOGGLE TILES
			let btToggleTiles = document.createElement('button');
			btToggleTiles.innerHTML = 'T';
			btToggleTiles.addEventListener('click', () => {
				let visible = sourcesLayer.getVisible();
				_this.showSources(!visible);
			}, false);
			btToggleTiles.style.float = 'left';
			btToggleTiles.title = 'show / hide tiles';

			// DOWNLOAD SELECTED TILES
			let link = document.createElement('a');
			link.href = '#';
			link.download = 'list.txt';
			link.style.float = 'left';

			let button = document.createElement('button');
			button.innerHTML = 'D';
			link.appendChild(button);

			let handleDownload = (e) => {
				let features = selectedFeatures.getArray();

				let url = [document.location.protocol, '//', document.location.host, document.location.pathname].join('');

				if (features.length === 0) {
					alert('No tiles were selected. Select area with ctrl + left mouse button!');
					e.preventDefault();
					e.stopImmediatePropagation();
					return false;
				} else if (features.length === 1) {
					let feature = features[0];

					if (feature.source) {
						let cloudjsurl = feature.pointcloud.pcoGeometry.url;
						let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
						link.href = sourceurl.href;
						link.download = feature.source.name;
					}
				} else {
					let content = '';
					for (let i = 0; i < features.length; i++) {
						let feature = features[i];

						if (feature.source) {
							let cloudjsurl = feature.pointcloud.pcoGeometry.url;
							let sourceurl = new URL(url + '/../' + cloudjsurl + '/../source/' + feature.source.name);
							content += sourceurl.href + '\n';
						}
					}

					let uri = 'data:application/octet-stream;base64,' + btoa(content);
					link.href = uri;
					link.download = 'list_of_files.txt';
				}
			};

			button.addEventListener('click', handleDownload, false);

			// assemble container
			let element = document.createElement('div');
			element.className = 'ol-unselectable ol-control';
			element.appendChild(link);
			element.appendChild(btToggleTiles);
			element.style.bottom = '0.5em';
			element.style.left = '0.5em';
			element.title = 'Download file or list of selected tiles. Select tile with left mouse button or area using ctrl + left mouse.';

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
				// this.controls.zoomToExtent,
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
			let feature = this.map.forEachFeatureAtPixel(pixel, function (feature) {
				return feature;
			});

			// console.log(feature);
			// this.elTooltip.css("display", feature ? '' : 'none');
			this.elTooltip.css('display', 'none');
			if (feature && feature.onHover) {
				feature.onHover(evt);
				// overlay.setPosition(evt.coordinate);
				// tooltip.innerHTML = feature.get('name');
			}
		});

		this.map.on('click', evt => {
			let pixel = evt.pixel;
			let feature = this.map.forEachFeatureAtPixel(pixel, function (feature) {
				return feature;
			});

			if (feature && feature.onHover) {
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

		this.viewer.addEventListener('scene_changed', e => {
			this.setScene(e.scene);
		});

		this.onPointcloudAdded = e => {
			this.load(e.pointcloud);
		};

		this.onAnnotationAdded = e => {
			if (!this.sceneProjection) {
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
				this.elTooltip.css('display', '');
				this.elTooltip.css('left', `${p[0]}px`);
				this.elTooltip.css('top', `${p[1]}px`);
			};

			feature.onClick = evt => {
				annotation.clickTitle();
			};

			this.getAnnotationsLayer().getSource().addFeature(feature);
		};

		this.setScene(this.viewer.scene);
	}

	setScene (scene) {
		if (this.scene === scene) {
			return;
		};

		if (this.scene) {
			this.scene.removeEventListener('pointcloud_added', this.onPointcloudAdded);
			this.scene.annotations.removeEventListener('annotation_added', this.onAnnotationAdded);
		}

		this.scene = scene;

		this.scene.addEventListener('pointcloud_added', this.onPointcloudAdded);
		this.scene.annotations.addEventListener('annotation_added', this.onAnnotationAdded);

		for (let pointcloud of this.viewer.scene.pointclouds) {
			this.load(pointcloud);
		}

		this.viewer.scene.annotations.traverseDescendants(annotation => {
			this.onAnnotationAdded({annotation: annotation});
		});
	}

	getExtentsLayer () {
		if (this.extentsLayer) {
			return this.extentsLayer;
		}

		this.gExtent = new ol.geom.LineString([[0, 0], [0, 0]]);

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

	getAnnotationsLayer () {
		if (this.annotationsLayer) {
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

	getCameraLayer () {
		if (this.cameraLayer) {
			return this.cameraLayer;
		}

		// CAMERA LAYER
		this.gCamera = new ol.geom.LineString([[0, 0], [0, 0], [0, 0], [0, 0]]);
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

	getToolLayer () {
		if (this.toolLayer) {
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

	getSourcesLayer () {
		if (this.sourcesLayer) {
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

	getSourcesLabelLayer () {
		if (this.sourcesLabelLayer) {
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

	setSceneProjection (sceneProjection) {
		this.sceneProjection = sceneProjection;
		this.toMap = proj4(this.sceneProjection, this.mapProjection);
		this.toScene = proj4(this.mapProjection, this.sceneProjection);
	};

	getMapExtent () {
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

	getMapCenter () {
		let mapExtent = this.getMapExtent();

		let mapCenter = [
			(mapExtent.bottomLeft[0] + mapExtent.topRight[0]) / 2,
			(mapExtent.bottomLeft[1] + mapExtent.topRight[1]) / 2
		];

		return mapCenter;
	};

	updateToolDrawings () {
		this.toolLayer.getSource().clear();

		let profiles = this.viewer.profileTool.profiles;
		for (let i = 0; i < profiles.length; i++) {
			let profile = profiles[i];
			let coordinates = [];

			for (let j = 0; j < profile.points.length; j++) {
				let point = profile.points[j];
				let pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}

			let line = new ol.geom.LineString(coordinates);
			let feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}

		let measurements = this.viewer.measuringTool.measurements;
		for (let i = 0; i < measurements.length; i++) {
			let measurement = measurements[i];
			let coordinates = [];

			for (let j = 0; j < measurement.points.length; j++) {
				let point = measurement.points[j].position;
				let pointMap = this.toMap.forward([point.x, point.y]);
				coordinates.push(pointMap);
			}

			if (measurement.closed && measurement.points.length > 0) {
				coordinates.push(coordinates[0]);
			}

			let line = new ol.geom.LineString(coordinates);
			let feature = new ol.Feature(line);
			this.toolLayer.getSource().addFeature(feature);
		}
	}

	load (pointcloud) {
		if (!pointcloud) {
			return;
		}

		if (!pointcloud.projection) {
			return;
		}

		if (!this.sceneProjection) {
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

		let url = pointcloud.pcoGeometry.url + '/../sources.json';
		$.getJSON(url, (data) => {
			let sources = data.sources;

			for (let i = 0; i < sources.length; i++) {
				let source = sources[i];
				let name = source.name;
				let bounds = source.bounds;

				let mapBounds = {
					min: this.toMap.forward([bounds.min[0], bounds.min[1]]),
					max: this.toMap.forward([bounds.max[0], bounds.max[1]])
				};
				let mapCenter = [
					(mapBounds.min[0] + mapBounds.max[0]) / 2,
					(mapBounds.min[1] + mapBounds.max[1]) / 2
				];

				let p1 = this.toMap.forward([bounds.min[0], bounds.min[1]]);
				let p2 = this.toMap.forward([bounds.max[0], bounds.min[1]]);
				let p3 = this.toMap.forward([bounds.max[0], bounds.max[1]]);
				let p4 = this.toMap.forward([bounds.min[0], bounds.max[1]]);

				// let feature = new ol.Feature({
				//	'geometry': new ol.geom.LineString([p1, p2, p3, p4, p1])
				// });
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

	toggle () {
		if (this.elMap.is(':visible')) {
			this.elMap.css('display', 'none');
			this.enabled = false;
		} else {
			this.elMap.css('display', 'block');
			this.enabled = true;
		}
	}

	update (delta) {
		if (!this.sceneProjection) {
			return;
		}

		let pm = $('#potree_map');

		if (!this.enabled) {
			return;
		}

		// resize
		let mapSize = this.map.getSize();
		let resized = (pm.width() !== mapSize[0] || pm.height() !== mapSize[1]);
		if (resized) {
			this.map.updateSize();
		}
		
		// 
		let camera = this.viewer.scene.getActiveCamera();

		let scale = this.map.getView().getResolution();
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

	get sourcesVisible () {
		return this.getSourcesLayer().getVisible();
	}

	set sourcesVisible (value) {
		this.getSourcesLayer().setVisible(value);
	}
};

initSidebar = (viewer) => {
	let createToolIcon = function (icon, title, callback) {
		let element = $(`
			<img src="${icon}"
				style="width: 32px; height: 32px"
				class="button-icon"
				data-i18n="${title}" />
		`);

		element.click(callback);

		return element;
	};

	let measuringTool = new Potree.MeasuringTool(viewer);
	let profileTool = new Potree.ProfileTool(viewer);
	let volumeTool = new Potree.VolumeTool(viewer);

	function initToolbar () {

		// ANGLE
		let elToolbar = $('#tools');
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/angle.png',
			'[title]tt.angle_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				let measurement = measuringTool.startInsertion({
					showDistances: false,
					showAngles: true,
					showArea: false,
					closed: true,
					maxMarkers: 3,
					name: 'Angle'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// POINT
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/point.svg',
			'[title]tt.point_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				let measurement = measuringTool.startInsertion({
					showDistances: false,
					showAngles: false,
					showCoordinates: true,
					showArea: false,
					closed: true,
					maxMarkers: 1,
					name: 'Point'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// DISTANCE
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/distance.svg',
			'[title]tt.distance_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				let measurement = measuringTool.startInsertion({
					showDistances: true,
					showArea: false,
					closed: false,
					name: 'Distance'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// HEIGHT
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/height.svg',
			'[title]tt.height_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				let measurement = measuringTool.startInsertion({
					showDistances: false,
					showHeight: true,
					showArea: false,
					closed: false,
					maxMarkers: 2,
					name: 'Height'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// AREA
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/area.svg',
			'[title]tt.area_measurement',
			function () {
				$('#menu_measurements').next().slideDown();
				let measurement = measuringTool.startInsertion({
					showDistances: true,
					showArea: true,
					closed: true,
					name: 'Area'});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === measurement.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// VOLUME
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/volume.svg',
			'[title]tt.volume_measurement',
			function () { 
				let volume = volumeTool.startInsertion(); 

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === volume.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// PROFILE
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/profile.svg',
			'[title]tt.height_profile',
			function () {
				$('#menu_measurements').next().slideDown(); ;
				let profile = profileTool.startInsertion();

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === profile.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// REMOVE ALL
		elToolbar.append(createToolIcon(
			Potree.resourcePath + '/icons/reset_tools.svg',
			'[title]tt.remove_all_measurement',
			function () {
				viewer.scene.removeAllMeasurements();
			}
		));
	}

	function initScene(){

		let elScene = $("#menu_scene");
		let elObjects = elScene.next().find("#scene_objects");
		let elProperties = elScene.next().find("#scene_object_properties");
		

		{
			let elExport = elScene.next().find("#scene_export");

			let geoJSONIcon = `${Potree.resourcePath}/icons/file_geojson.svg`;
			let dxfIcon = `${Potree.resourcePath}/icons/file_dxf.svg`;

			elExport.append(`
				Export: <br>
				<a href="#" download="measure.json"><img name="geojson_export_button" src="${geoJSONIcon}" class="button-icon" style="height: 24px" /></a>
				<a href="#" download="measure.dxf"><img name="dxf_export_button" src="${dxfIcon}" class="button-icon" style="height: 24px" /></a>
			`);

			let elDownloadJSON = elExport.find("img[name=geojson_export_button]").parent();
			elDownloadJSON.click( () => {
				let scene = viewer.scene;
				let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

				let geoJson = Potree.GeoJSONExporter.toString(measurements);

				let url = window.URL.createObjectURL(new Blob([geoJson], {type: 'data:application/octet-stream'}));
				elDownloadJSON.attr('href', url);
			});

			let elDownloadDXF = elExport.find("img[name=dxf_export_button]").parent();
			elDownloadDXF.click( () => {
				let scene = viewer.scene;
				let measurements = [...scene.measurements, ...scene.profiles, ...scene.volumes];

				let dxf = Potree.DXFExporter.toString(measurements);

				let url = window.URL.createObjectURL(new Blob([dxf], {type: 'data:application/octet-stream'}));
				elDownloadDXF.attr('href', url);
			});
		}

		let propertiesPanel = new Potree.PropertiesPanel(elProperties, viewer);
		propertiesPanel.setScene(viewer.scene);
		
		localStorage.removeItem('jstree');

		let tree = $(`<div id="jstree_scene"></div>`);
		elObjects.append(tree);

		tree.jstree({
			'plugins': ["checkbox", "state"],
			'core': {
				"dblclick_toggle": false,
				"state": {
					"checked" : true
				},
				'check_callback': true,
				"expand_selected_onload": true
			},
			"checkbox" : {
				"keep_selected_style": true,
				"three_state": false,
				"whole_node": false,
				"tie_selection": false,
			},
		});

		let createNode = (parent, text, icon, object) => {
			let nodeID = tree.jstree('create_node', parent, { 
					"text": text, 
					"icon": icon,
					"data": object
				}, 
				"last", false, false);
			
			if(object.visible){
				tree.jstree('check_node', nodeID);
			}else{
				tree.jstree('uncheck_node', nodeID);
			}

			return nodeID;
		}

		let pcID = tree.jstree('create_node', "#", { "text": "<b>Point Clouds</b>", "id": "pointclouds"}, "last", false, false);
		let measurementID = tree.jstree('create_node', "#", { "text": "<b>Measurements</b>", "id": "measurements" }, "last", false, false);
		let annotationsID = tree.jstree('create_node', "#", { "text": "<b>Annotations</b>", "id": "annotations" }, "last", false, false);
		let otherID = tree.jstree('create_node', "#", { "text": "<b>Other</b>", "id": "other" }, "last", false, false);

		tree.jstree("check_node", pcID);
		tree.jstree("check_node", measurementID);
		tree.jstree("check_node", annotationsID);
		tree.jstree("check_node", otherID);

		tree.on('create_node.jstree', function(e, data){
			tree.jstree("open_all");
		});

		tree.on("select_node.jstree", function(e, data){
			let object = data.node.data;
			propertiesPanel.set(object);

			viewer.inputHandler.deselectAll();

			if(object instanceof Potree.Volume){
				viewer.inputHandler.toggleSelection(object);
			}

			$(viewer.renderer.domElement).focus();
		});

		tree.on("deselect_node.jstree", function(e, data){
			propertiesPanel.set(null);
		});

		tree.on("delete_node.jstree", function(e, data){
			propertiesPanel.set(null);
		});

		tree.on('dblclick','.jstree-anchor', function (e) {
			let instance = $.jstree.reference(this);
			let node = instance.get_node(this);
			let object = node.data;

			// ignore double click on checkbox
			if(e.target.classList.contains("jstree-checkbox")){
				return;
			}

			if(object instanceof Potree.PointCloudTree){
				let box = viewer.getBoundingBox([object]);
				let node = new THREE.Object3D();
				node.boundingBox = box;
				viewer.zoomTo(node, 1, 500);
			}else if(object instanceof Potree.Measure){
				let points = object.points.map(p => p.position);
				let box = new THREE.Box3().setFromPoints(points);
				if(box.getSize().length() > 0){
					let node = new THREE.Object3D();
					node.boundingBox = box;
					viewer.zoomTo(node, 2, 500);
				}
			}else if(object instanceof Potree.Profile){
				let points = object.points;
				let box = new THREE.Box3().setFromPoints(points);
				if(box.getSize().length() > 0){
					let node = new THREE.Object3D();
					node.boundingBox = box;
					viewer.zoomTo(node, 1, 500);
				}
			}else if(object instanceof Potree.Volume){
				
				let box = object.boundingBox.clone().applyMatrix4(object.matrixWorld);

				if(box.getSize().length() > 0){
					let node = new THREE.Object3D();
					node.boundingBox = box;
					viewer.zoomTo(node, 1, 500);
				}
			}else if(object instanceof Potree.Annotation){
				object.moveHere(viewer.scene.getActiveCamera());
			}else if(object instanceof Potree.PolygonClipVolume){
				let dir = object.camera.getWorldDirection();
				let target;

				if(object.camera instanceof THREE.OrthographicCamera){
					dir.multiplyScalar(object.camera.right)
					target = new THREE.Vector3().addVectors(object.camera.position, dir);
					viewer.setCameraMode(Potree.CameraMode.ORTHOGRAPHIC);
				}else if(object.camera instanceof THREE.PerspectiveCamera){
					dir.multiplyScalar(viewer.scene.view.radius);
					target = new THREE.Vector3().addVectors(object.camera.position, dir);
					viewer.setCameraMode(Potree.CameraMode.PERSPECTIVE);
				}
				
				viewer.scene.view.position.copy(object.camera.position);
				viewer.scene.view.lookAt(target);
			}else if(object instanceof THREE.SpotLight){
				let distance = (object.distance > 0) ? object.distance / 4 : 5 * 1000;
				let position = object.position;
				let target = new THREE.Vector3().addVectors(
					position, 
					object.getWorldDirection().multiplyScalar(distance));

				viewer.scene.view.position.copy(object.position);
				viewer.scene.view.lookAt(target);
			}else if(object instanceof THREE.Object3D){
				let box = new THREE.Box3().setFromObject(object);

				if(box.getSize().length() > 0){
					let node = new THREE.Object3D();
					node.boundingBox = box;
					viewer.zoomTo(node, 1, 500);
				}
			}
		});

		tree.on("uncheck_node.jstree", function(e, data){
			let object = data.node.data;

			if(object){
				object.visible = false;
			}
		});

		tree.on("check_node.jstree", function(e, data){
			let object = data.node.data;

			if(object){
				object.visible = true;
			}
		});


		let onPointCloudAdded = (e) => {
			let pointcloud = e.pointcloud;
			let cloudIcon = `${Potree.resourcePath}/icons/cloud.svg`;
			createNode(pcID, pointcloud.name, cloudIcon, pointcloud);
		};

		let onMeasurementAdded = (e) => {
			let measurement = e.measurement;
			let icon = Potree.getMeasurementIcon(measurement);
			createNode(measurementID, measurement.name, icon, measurement);
		};

		let onVolumeAdded = (e) => {
			let volume = e.volume;
			let icon = Potree.getMeasurementIcon(volume);
			let node = createNode(measurementID, volume.name, icon, volume);

			volume.addEventListener("visibility_changed", () => {
				if(volume.visible){
					tree.jstree('check_node', node);
				}else{
					tree.jstree('uncheck_node', node);
				}
			});
		};

		let onProfileAdded = (e) => {
			let profile = e.profile;
			let icon = Potree.getMeasurementIcon(profile);
			createNode(measurementID, profile.name, icon, profile);
		};

		let onAnnotationAdded = (e) => {
			let annotation = e.annotation;

			let annotationIcon = `${Potree.resourcePath}/icons/annotation.svg`;
			let parentID = this.annotationMapping.get(annotation.parent);
			let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
			this.annotationMapping.set(annotation, annotationID);

			//let node = createNode(annotationsID, annotation.name, icon, volume);
			//oldScene.annotations.removeEventListener('annotation_added', this.onAnnotationAdded);
		};

		viewer.scene.addEventListener("pointcloud_added", onPointCloudAdded);
		viewer.scene.addEventListener("measurement_added", onMeasurementAdded);
		viewer.scene.addEventListener("profile_added", onProfileAdded);
		viewer.scene.addEventListener("volume_added", onVolumeAdded);
		viewer.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
		viewer.scene.annotations.addEventListener("annotation_added", onAnnotationAdded);

		let onMeasurementRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.measurement.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
		};

		let onVolumeRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.volume.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
		};

		let onProfileRemoved = (e) => {
			let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
			let jsonNode = measurementsRoot.children.find(child => child.data.uuid === e.profile.uuid);
			
			tree.jstree("delete_node", jsonNode.id);
		};

		viewer.scene.addEventListener("measurement_removed", onMeasurementRemoved);
		viewer.scene.addEventListener("volume_removed", onVolumeRemoved);
		viewer.scene.addEventListener("profile_removed", onProfileRemoved);

		{
			let annotationIcon = `${Potree.resourcePath}/icons/annotation.svg`;
			this.annotationMapping = new Map(); 
			this.annotationMapping.set(viewer.scene.annotations, annotationsID);
			viewer.scene.annotations.traverseDescendants(annotation => {
				let parentID = this.annotationMapping.get(annotation.parent);
				let annotationID = createNode(parentID, annotation.title, annotationIcon, annotation);
				this.annotationMapping.set(annotation, annotationID);
			});
		}

		for(let pointcloud of viewer.scene.pointclouds){
			onPointCloudAdded({pointcloud: pointcloud});
		}

		for(let measurement of viewer.scene.measurements){
			onMeasurementAdded({measurement: measurement});
		}

		for(let volume of [...viewer.scene.volumes, ...viewer.scene.polygonClipVolumes]){
			onVolumeAdded({volume: volume});
		}


		for(let profile of viewer.scene.profiles){
			onProfileAdded({profile: profile});
		}

		{
			createNode(otherID, "Camera", null, new THREE.Camera());
		}

		viewer.addEventListener("scene_changed", (e) => {
			propertiesPanel.setScene(e.scene);

			e.oldScene.removeEventListener("pointcloud_added", onPointCloudAdded);
			e.oldScene.removeEventListener("measurement_added", onMeasurementAdded);
			e.oldScene.removeEventListener("profile_added", onProfileAdded);
			e.oldScene.removeEventListener("volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.oldScene.removeEventListener("measurement_removed", onMeasurementRemoved);

			e.scene.addEventListener("pointcloud_added", onPointCloudAdded);
			e.scene.addEventListener("measurement_added", onMeasurementAdded);
			e.scene.addEventListener("profile_added", onProfileAdded);
			e.scene.addEventListener("volume_added", onVolumeAdded);
			e.scene.addEventListener("polygon_clip_volume_added", onVolumeAdded);
			e.scene.addEventListener("measurement_removed", onMeasurementRemoved);
		});

	}

	function initClippingTool() {


		viewer.addEventListener("cliptask_changed", function(event){
			console.log("TODO");
		});

		viewer.addEventListener("clipmethod_changed", function(event){
			console.log("TODO");
		});

		{
			let elClipTask = $("#cliptask_options");
			elClipTask.selectgroup({title: "Clip Task"});

			elClipTask.find("input").click( (e) => {
				viewer.setClipTask(Potree.ClipTask[e.target.value]);
			});

			let currentClipTask = Object.keys(Potree.ClipTask)
				.filter(key => Potree.ClipTask[key] === viewer.clipTask);
			elClipTask.find(`input[value=${currentClipTask}]`).trigger("click");
		}

		{
			let elClipMethod = $("#clipmethod_options");
			elClipMethod.selectgroup({title: "Clip Method"});

			elClipMethod.find("input").click( (e) => {
				viewer.setClipMethod(Potree.ClipMethod[e.target.value]);
			});

			let currentClipMethod = Object.keys(Potree.ClipMethod)
				.filter(key => Potree.ClipMethod[key] === viewer.clipMethod);
			elClipMethod.find(`input[value=${currentClipMethod}]`).trigger("click");
		}

		let clippingToolBar = $("#clipping_tools");

		// CLIP VOLUME
		clippingToolBar.append(createToolIcon(
			Potree.resourcePath + '/icons/clip_volume.svg',
			'[title]tt.clip_volume',
			() => {
				let item = volumeTool.startInsertion({clip: true}); 

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === item.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		// CLIP POLYGON
		clippingToolBar.append(createToolIcon(
			Potree.resourcePath + "/icons/clip-polygon.svg",
			"[title]tt.clip_polygon",
			() => {
				let item = viewer.clippingTool.startInsertion({type: "polygon"});

				let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
				let jsonNode = measurementsRoot.children.find(child => child.data.uuid === item.uuid);
				$.jstree.reference(jsonNode.id).deselect_all();
				$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
			}
		));

		{// SCREEN BOX SELECT
			let boxSelectTool = new Potree.ScreenBoxSelectTool(viewer);

			clippingToolBar.append(createToolIcon(
				Potree.resourcePath + "/icons/clip-screen.svg",
				"[title]tt.screen_clip_box",
				() => {
					if(!(viewer.scene.getActiveCamera() instanceof THREE.OrthographicCamera)){
						viewer.postMessage(`Switch to Orthographic Camera Mode before using the Screen-Box-Select tool.`, 
							{duration: 2000});
						return;
					}
					
					let item = boxSelectTool.startInsertion();

					let measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
					let jsonNode = measurementsRoot.children.find(child => child.data.uuid === item.uuid);
					$.jstree.reference(jsonNode.id).deselect_all();
					$.jstree.reference(jsonNode.id).select_node(jsonNode.id);
				}
			));
		}

		{ // REMOVE CLIPPING TOOLS
			clippingToolBar.append(createToolIcon(
				Potree.resourcePath + "/icons/remove.svg",
				"[title]tt.remove_all_measurement",
				() => {

					viewer.scene.removeAllClipVolumes();
				}
			));
		}

	}

	function initClassificationList () {
		let elClassificationList = $('#classificationList');

		let addClassificationItem = function (code, name) {
			let inputID = 'chkClassification_' + code;

			let element = $(`
				<li>
					<label style="whitespace: nowrap">
						<input id="${inputID}" type="checkbox" checked/>
						<span>${name}</span>
					</label>
				</li>
			`);

			let elInput = element.find('input');

			elInput.click(event => {
				viewer.setClassificationVisibility(code, event.target.checked);
			});

			elClassificationList.append(element);
		};

		addClassificationItem(0, 'never classified');
		addClassificationItem(1, 'unclassified');
		addClassificationItem(2, 'ground');
		addClassificationItem(3, 'low vegetation');
		addClassificationItem(4, 'medium vegetation');
		addClassificationItem(5, 'high vegetation');
		addClassificationItem(6, 'building');
		addClassificationItem(7, 'low point(noise)');
		addClassificationItem(8, 'key-point');
		addClassificationItem(9, 'water');
		addClassificationItem(12, 'overlap');
	}

	function initAccordion () {
		$('.accordion > h3').each(function () {
			let header = $(this);
			let content = $(this).next();

			//header.addClass('accordion-header ui-widget');
			//content.addClass('accordion-content ui-widget');

			content.hide();

			header.click(function () {
				content.slideToggle();
			});
		});

		let languages = [
			["EN", "en"],
			["FR", "fr"],
			["DE", "de"],
			["JP", "jp"]
		];

		let elLanguages = $('#potree_languages');
		for(let i = 0; i < languages.length; i++){
			let [key, value] = languages[i];
			let element = $(`<a>${key}</a>`);
			element.click(() => viewer.setLanguage(value));

			if(i === 0){
				element.css("margin-left", "30px");
			}
			
			elLanguages.append(element);

			if(i < languages.length - 1){
				elLanguages.append($(document.createTextNode(' - ')));	
			}
		}


		// to close all, call
		// $(".accordion > div").hide()

		// to open the, for example, tool menu, call:
		// $("#menu_tools").next().show()
	}

	function initAppearance () {

		$('#sldPointBudget').slider({
			value: viewer.getPointBudget(),
			min: 100 * 1000,
			max: 10 * 1000 * 1000,
			step: 1000,
			slide: function (event, ui) { viewer.setPointBudget(ui.value); }
		});

		$('#sldFOV').slider({
			value: viewer.getFOV(),
			min: 20,
			max: 100,
			step: 1,
			slide: function (event, ui) { viewer.setFOV(ui.value); }
		});

		$('#sldEDLRadius').slider({
			value: viewer.getEDLRadius(),
			min: 1,
			max: 4,
			step: 0.01,
			slide: function (event, ui) { viewer.setEDLRadius(ui.value); }
		});

		$('#sldEDLStrength').slider({
			value: viewer.getEDLStrength(),
			min: 0,
			max: 5,
			step: 0.01,
			slide: function (event, ui) { viewer.setEDLStrength(ui.value); }
		});

		viewer.addEventListener('point_budget_changed', function (event) {
			$('#lblPointBudget')[0].innerHTML = Potree.utils.addCommas(viewer.getPointBudget());
			$('#sldPointBudget').slider({value: viewer.getPointBudget()});
		});

		viewer.addEventListener('fov_changed', function (event) {
			$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
			$('#sldFOV').slider({value: viewer.getFOV()});
		});

		viewer.addEventListener('edl_radius_changed', function (event) {
			$('#lblEDLRadius')[0].innerHTML = viewer.getEDLRadius().toFixed(1);
			$('#sldEDLRadius').slider({value: viewer.getEDLRadius()});
		});

		viewer.addEventListener('edl_strength_changed', function (event) {
			$('#lblEDLStrength')[0].innerHTML = viewer.getEDLStrength().toFixed(1);
			$('#sldEDLStrength').slider({value: viewer.getEDLStrength()});
		});

		viewer.addEventListener('background_changed', function (event) {
			$("input[name=background][value='" + viewer.getBackground() + "']").prop('checked', true);
		});

		$('#lblPointBudget')[0].innerHTML = Potree.utils.addCommas(viewer.getPointBudget());
		$('#lblFOV')[0].innerHTML = parseInt(viewer.getFOV());
		$('#lblEDLRadius')[0].innerHTML = viewer.getEDLRadius().toFixed(1);
		$('#lblEDLStrength')[0].innerHTML = viewer.getEDLStrength().toFixed(1);
		$('#chkEDLEnabled')[0].checked = viewer.getEDLEnabled();
		
		{
			let elBackground = $(`#background_options`);
			elBackground.selectgroup();

			elBackground.find("input").click( (e) => {
				viewer.setBackground(e.target.value);
			});

			let currentBackground = viewer.getBackground();
			$(`input[name=background_options][value=${currentBackground}]`).trigger("click");
		}

		$('#chkEDLEnabled').click( () => {
			viewer.setEDLEnabled($('#chkEDLEnabled').prop("checked"));
		});
	}

	function initNavigation () {
		let elNavigation = $('#navigation');
		let sldMoveSpeed = $('#sldMoveSpeed');
		let lblMoveSpeed = $('#lblMoveSpeed');

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/earth_controls_1.png',
			'[title]tt.earth_control',
			function () { viewer.setNavigationMode(Potree.EarthControls); }
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/fps_controls.svg',
			'[title]tt.flight_control',
			function () {
				viewer.setNavigationMode(Potree.FirstPersonControls);
				viewer.fpControls.lockElevation = false;
			}
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/helicopter_controls.svg',
			'[title]tt.heli_control',
			() => { 
				viewer.setNavigationMode(Potree.FirstPersonControls);
				viewer.fpControls.lockElevation = true;
			}
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/orbit_controls.svg',
			'[title]tt.orbit_control',
			function () { viewer.setNavigationMode(Potree.OrbitControls); }
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + '/icons/focus.svg',
			'[title]tt.focus_control',
			function () { viewer.fitToScreen(); }
		));


		
		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/navigation_cube.svg",
			"[title]tt.navigation_cube_control",
			function(){viewer.toggleNavigationCube()}
		));

		elNavigation.append("<br>");


		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/left.svg",
			"[title]tt.left_view_control",
			function(){viewer.setLeftView()}
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/right.svg",
			"[title]tt.right_view_control",
			function(){viewer.setRightView()}
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/front.svg",
			"[title]tt.front_view_control",
			function(){viewer.setFrontView()}
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/back.svg",
			"[title]tt.back_view_control",
			function(){viewer.setBackView()}
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/top.svg",
			"[title]tt.top_view_control",
			function(){viewer.setTopView()}
		));

		elNavigation.append(createToolIcon(
			Potree.resourcePath + "/icons/bottom.svg",
			"[title]tt.bottom_view_control",
			function(){viewer.setBottomView()}
		));





		let elCameraProjection = $(`
			<selectgroup id="camera_projection_options">
				<option id="camera_projection_options_perspective" value="PERSPECTIVE">Perspective</option>
				<option id="camera_projection_options_orthigraphic" value="ORTHOGRAPHIC">Orthographic</option>
			</selectgroup>
		`);
		elNavigation.append(elCameraProjection);
		elCameraProjection.selectgroup({title: "Camera Projection"});
		elCameraProjection.find("input").click( (e) => {
			viewer.setCameraMode(Potree.CameraMode[e.target.value]);
		});
		let cameraMode = Object.keys(Potree.CameraMode)
			.filter(key => Potree.CameraMode[key] === viewer.scene.cameraMode);
		elCameraProjection.find(`input[value=${cameraMode}]`).trigger("click");

		let speedRange = new THREE.Vector2(1, 10 * 1000);

		let toLinearSpeed = function (value) {
			return Math.pow(value, 4) * speedRange.y + speedRange.x;
		};

		let toExpSpeed = function (value) {
			return Math.pow((value - speedRange.x) / speedRange.y, 1 / 4);
		};

		sldMoveSpeed.slider({
			value: toExpSpeed(viewer.getMoveSpeed()),
			min: 0,
			max: 1,
			step: 0.01,
			slide: function (event, ui) { viewer.setMoveSpeed(toLinearSpeed(ui.value)); }
		});

		viewer.addEventListener('move_speed_changed', function (event) {
			lblMoveSpeed.html(viewer.getMoveSpeed().toFixed(1));
			sldMoveSpeed.slider({value: toExpSpeed(viewer.getMoveSpeed())});
		});

		lblMoveSpeed.html(viewer.getMoveSpeed().toFixed(1));
	}


	let initSettings = function () {

		{
			$('#sldMinNodeSize').slider({
				value: viewer.getMinNodeSize(),
				min: 0,
				max: 1000,
				step: 0.01,
				slide: function (event, ui) { viewer.setMinNodeSize(ui.value); }
			});

			viewer.addEventListener('minnodesize_changed', function (event) {
				$('#lblMinNodeSize').html(parseInt(viewer.getMinNodeSize()));
				$('#sldMinNodeSize').slider({value: viewer.getMinNodeSize()});
			});
			$('#lblMinNodeSize').html(parseInt(viewer.getMinNodeSize()));
		}

		{
			let elSplatQuality = $("#splat_quality_options");
			elSplatQuality.selectgroup({title: "Splat Quality"});

			elSplatQuality.find("input").click( (e) => {
				if(e.target.value === "standard"){
					viewer.useHQ = false;
				}else if(e.target.value === "hq"){
					viewer.useHQ = true;
				}
			});

			let currentQuality = viewer.useHQ ? "hq" : "standard";
			elSplatQuality.find(`input[value=${currentQuality}]`).trigger("click");
		}

		$('#show_bounding_box').click(() => {
			viewer.setShowBoundingBox($('#show_bounding_box').prop("checked"));
		});

		$('#set_freeze').click(function(){
			viewer.setFreeze($('#set_freeze').prop("checked"));
		});
		

		
	};

	initAccordion();
	initAppearance();
	initToolbar();
	initScene();
	initNavigation();
	initClassificationList();
	initClippingTool();
	initSettings();
	
	$('#potree_version_number').html(Potree.version.major + "." + Potree.version.minor + Potree.version.suffix);
	$('.perfect_scrollbar').perfectScrollbar();
};



class MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		this.viewer = viewer;
		this.measurement = measurement;
		this.propertiesPanel = propertiesPanel;

		this._update = () => { this.update(); };
	}

	createCoordinatesTable(points){
		let table = $(`
			<table class="measurement_value_table">
				<tr>
					<th>x</th>
					<th>y</th>
					<th>z</th>
					<th></th>
				</tr>
			</table>
		`);

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';

		for (let point of points) {
			let x = Potree.utils.addCommas(point.x.toFixed(3));
			let y = Potree.utils.addCommas(point.y.toFixed(3));
			let z = Potree.utils.addCommas(point.z.toFixed(3));

			let row = $(`
				<tr>
					<td><span>${x}</span></td>
					<td><span>${y}</span></td>
					<td><span>${z}</span></td>
					<td align="right" style="width: 25%">
						<img name="copy" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			`);

			this.elCopy = row.find("img[name=copy]");
			this.elCopy.click( () => {
				let msg = point.toArray().map(c => c.toFixed(3)).join(", ");
				Potree.utils.clipboardCopy(msg);

				this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
			});

			table.append(row);
		}

		return table;
	};

	createAttributesTable(){
		let elTable = $('<table class="measurement_value_table"></table>');

		let point = this.measurement.points[0];

		if(point.color){
			let color = point.color;
			let text = color.join(', ');

			elTable.append($(`
				<tr>
					<td>rgb</td>
					<td>${text}</td>
				</tr>
			`));
		}

		return elTable;
	}

	update(){

	}
};

class DistancePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table id="distances_table" class="measurement_value_table"></table>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		let positions = this.measurement.points.map(p => p.position);
		let distances = [];
		for (let i = 0; i < positions.length - 1; i++) {
			let d = positions[i].distanceTo(positions[i + 1]);
			distances.push(d.toFixed(3));
		}

		let totalDistance = this.measurement.getTotalDistance().toFixed(3);
		let elDistanceTable = this.elContent.find(`#distances_table`);
		elDistanceTable.empty();

		for (let i = 0; i < distances.length; i++) {
			let label = (i === 0) ? 'Distances: ' : '';
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
	}
}


class PointPanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span class="attributes_table_container"></span>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		let elAttributesContainer = this.elContent.find('.attributes_table_container');
		elAttributesContainer.empty();
		elAttributesContainer.append(this.createAttributesTable());
	}
}


class AreaPanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span style="font-weight: bold">Area: </span>
				<span id="measurement_area"></span>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		let elArea = this.elContent.find(`#measurement_area`);
		elArea.html(this.measurement.getArea().toFixed(3));
	}
}


class AnglePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<table class="measurement_value_table">
					<tr>
						<th>\u03b1</th>
						<th>\u03b2</th>
						<th>\u03b3</th>
					</tr>
					<tr>
						<td align="center" id="angle_cell_alpha" style="width: 33%"></td>
						<td align="center" id="angle_cell_betta" style="width: 33%"></td>
						<td align="center" id="angle_cell_gamma" style="width: 33%"></td>
					</tr>
				</table>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		let angles = [];
		for(let i = 0; i < this.measurement.points.length; i++){
			angles.push(this.measurement.getAngle(i) * (180.0 / Math.PI));
		}
		angles = angles.map(a => a.toFixed(1) + '\u00B0');

		let elAlpha = this.elContent.find(`#angle_cell_alpha`);
		let elBetta = this.elContent.find(`#angle_cell_betta`);
		let elGamma = this.elContent.find(`#angle_cell_gamma`);

		elAlpha.html(angles[0]);
		elBetta.html(angles[1]);
		elGamma.html(angles[2]);
	}
}


class HeightPanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span id="height_label">Height: </span><br>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeMeasurement(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points.map(p => p.position)));

		{
			let points = this.measurement.points;

			let sorted = points.slice().sort((a, b) => a.position.z - b.position.z);
			let lowPoint = sorted[0].position.clone();
			let highPoint = sorted[sorted.length - 1].position.clone();
			let min = lowPoint.z;
			let max = highPoint.z;
			let height = max - min;
			height = height.toFixed(3);

			this.elHeightLabel = this.elContent.find(`#height_label`);
			this.elHeightLabel.html(`<b>Height:</b> ${height}`);
		}
	}
}

class VolumePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';

		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>

				<table class="measurement_value_table">
					<tr>
						<th>\u03b1</th>
						<th>\u03b2</th>
						<th>\u03b3</th>
						<th></th>
					</tr>
					<tr>
						<td align="center" id="angle_cell_alpha" style="width: 33%"></td>
						<td align="center" id="angle_cell_betta" style="width: 33%"></td>
						<td align="center" id="angle_cell_gamma" style="width: 33%"></td>
						<td align="right" style="width: 25%">
							<img name="copyRotation" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
				</table>

				<table class="measurement_value_table">
					<tr>
						<th>length</th>
						<th>width</th>
						<th>height</th>
						<th></th>
					</tr>
					<tr>
						<td align="center" id="cell_length" style="width: 33%"></td>
						<td align="center" id="cell_width" style="width: 33%"></td>
						<td align="center" id="cell_height" style="width: 33%"></td>
						<td align="right" style="width: 25%">
							<img name="copyScale" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
						</td>
					</tr>
				</table>

				<br>
				<span style="font-weight: bold">Volume: </span>
				<span id="measurement_volume"></span>

				<!--
				<li>
					<label style="whitespace: nowrap">
						<input id="volume_show" type="checkbox"/>
						<span>show volume</span>
					</label>
				</li>-->

				<li>
					<label style="whitespace: nowrap">
						<input id="volume_clip" type="checkbox"/>
						<span>make clip volume</span>
					</label>
				</li>

				<li>
					<input name="download_volume" type="button" value="download" style="display:hidden" />
				</li>


				<!-- ACTIONS -->
				<input id="volume_reset_orientation" type="button" value="reset orientation"/>
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		{ // download
			this.elDownloadButton = this.elContent.find("input[name=download_volume]");

			if(this.propertiesPanel.viewer.server){
				this.elDownloadButton.click(() => this.download());
			} else {
				this.elDownloadButton.hide();
			}
		}

		this.elCopyRotation = this.elContent.find("img[name=copyRotation]");
		this.elCopyRotation.click( () => {
			let rotation = this.measurement.rotation.toArray().slice(0, 3);
			let msg = rotation.map(c => c.toFixed(3)).join(", ");
			Potree.utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.elCopyScale = this.elContent.find("img[name=copyScale]");
		this.elCopyScale.click( () => {
			let scale = this.measurement.scale.toArray();
			let msg = scale.map(c => c.toFixed(3)).join(", ");
			Potree.utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeVolume(measurement);
		});

		this.elContent.find("#volume_reset_orientation").click(() => {
			measurement.rotation.set(0, 0, 0);
		});

		this.elCheckClip = this.elContent.find('#volume_clip');
		this.elCheckClip.click(event => {
			this.measurement.clip = event.target.checked;
		});

		this.elCheckShow = this.elContent.find('#volume_show');
		this.elCheckShow.click(event => {
			this.measurement.visible = event.target.checked;
		});

		this.propertiesPanel.addVolatileListener(measurement, "position_changed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "orientation_changed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "scale_changed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "clip_changed", this._update);

		this.update();
	}

	download(){
		let boxes = [this.measurement.matrixWorld]
			.map(m => m.elements.join(','))
			.join(',');

		let minLOD = 0;
		let maxLOD = 100;

		let pcs = [];
		for (let pointcloud of this.viewer.scene.pointclouds) {
			let urlIsAbsolute = new RegExp('^(?:[a-z]+:)?//', 'i').test(pointcloud.pcoGeometry.url);
			let pc = '';
			if (urlIsAbsolute) {
				pc = pointcloud.pcoGeometry.url;
			} else {
				pc = `${window.location.href}/../${pointcloud.pcoGeometry.url}`;
			}

			pcs.push(pc);
		}

		let pc = pcs
			.map(v => `pointcloud[]=${v}`)
			.join('&');

		let request = `${viewer.server}/start_extract_region_worker?minLOD=${minLOD}&maxLOD=${maxLOD}&box=${boxes}&${pc}`;
		console.log(request);
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable([this.measurement.position]));

		{
			let angles = this.measurement.rotation.toVector3();
			angles = angles.toArray();
			//angles = [angles.z, angles.x, angles.y];
			angles = angles.map(v => 180 * v / Math.PI);
			angles = angles.map(a => a.toFixed(1) + '\u00B0');

			let elAlpha = this.elContent.find(`#angle_cell_alpha`);
			let elBetta = this.elContent.find(`#angle_cell_betta`);
			let elGamma = this.elContent.find(`#angle_cell_gamma`);

			elAlpha.html(angles[0]);
			elBetta.html(angles[1]);
			elGamma.html(angles[2]);
		}

		{
			let dimensions = this.measurement.scale.toArray();
			dimensions = dimensions.map(v => Potree.utils.addCommas(v.toFixed(2)));

			let elLength = this.elContent.find(`#cell_length`);
			let elWidth = this.elContent.find(`#cell_width`);
			let elHeight = this.elContent.find(`#cell_height`);

			elLength.html(dimensions[0]);
			elWidth.html(dimensions[1]);
			elHeight.html(dimensions[2]);
		}

		{
			let elVolume = this.elContent.find(`#measurement_volume`);
			let volume = this.measurement.getVolume();
			elVolume.html(Potree.utils.addCommas(volume.toFixed(2)));
		}

		this.elCheckClip.prop("checked", this.measurement.clip);
		this.elCheckShow.prop("checked", this.measurement.visible);

	}
}


class ProfilePanel extends MeasurePanel{
	constructor(viewer, measurement, propertiesPanel){
		super(viewer, measurement, propertiesPanel);

		let removeIconPath = Potree.resourcePath + '/icons/remove.svg';
		this.elContent = $(`
			<div class="measurement_content selectable">
				<span class="coordinates_table_container"></span>
				<br>
				<span style="display:flex">
					<span style="display:flex; align-items: center; padding-right: 10px">Width: </span>
					<input id="sldProfileWidth" name="sldProfileWidth" value="5.06" style="flex-grow: 1; width:100%">
				</span>
				<br>

				<input type="button" value="Prepare Download" id="download_profile"/>
				<span id="download_profile_status"></span>
				<br>
				<input type="button" id="show_2d_profile" value="show 2d profile" style="width: 100%"/>

				<!-- ACTIONS -->
				<div style="display: flex; margin-top: 12px">
					<span></span>
					<span style="flex-grow: 1"></span>
					<img name="remove" class="button-icon" src="${removeIconPath}" style="width: 16px; height: 16px"/>
				</div>
			</div>
		`);

		this.elRemove = this.elContent.find("img[name=remove]");
		this.elRemove.click( () => {
			this.viewer.scene.removeProfile(measurement);
		});

		{ // download
			this.elDownloadButton = this.elContent.find(`#download_profile`);

			if(this.propertiesPanel.viewer.server){
				this.elDownloadButton.click(() => this.download());
			} else {
				this.elDownloadButton.hide();
			}
		}

		{ // width spinner
			let elWidthSlider = this.elContent.find(`#sldProfileWidth`);

			elWidthSlider.spinner({
				min: 0, max: 10 * 1000 * 1000, step: 0.01,
				numberFormat: 'n',
				start: () => {},
				spin: (event, ui) => {
					let value = elWidthSlider.spinner('value');
					measurement.setWidth(value);
				},
				change: (event, ui) => {
					let value = elWidthSlider.spinner('value');
					measurement.setWidth(value);
				},
				stop: (event, ui) => {
					let value = elWidthSlider.spinner('value');
					measurement.setWidth(value);
				},
				incremental: (count) => {
					let value = elWidthSlider.spinner('value');
					let step = elWidthSlider.spinner('option', 'step');

					let delta = value * 0.05;
					let increments = Math.max(1, parseInt(delta / step));

					return increments;
				}
			});
			elWidthSlider.spinner('value', measurement.getWidth());
			elWidthSlider.spinner('widget').css('width', '100%');

			let widthListener = (event) => {
				let value = elWidthSlider.spinner('value');
				if (value !== measurement.getWidth()) {
					elWidthSlider.spinner('value', measurement.getWidth());
				}
			};
			this.propertiesPanel.addVolatileListener(measurement, "width_changed", widthListener);
		}

		let elShow2DProfile = this.elContent.find(`#show_2d_profile`);
		elShow2DProfile.click(() => {
			this.propertiesPanel.viewer.profileWindow.show();
			this.propertiesPanel.viewer.profileWindowController.setProfile(measurement);
		});

		this.propertiesPanel.addVolatileListener(measurement, "marker_added", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_removed", this._update);
		this.propertiesPanel.addVolatileListener(measurement, "marker_moved", this._update);

		this.update();
	}

	update(){
		let elCoordiantesContainer = this.elContent.find('.coordinates_table_container');
		elCoordiantesContainer.empty();
		elCoordiantesContainer.append(this.createCoordinatesTable(this.measurement.points));
	}
}

class CameraPanel{
	constructor(viewer, propertiesPanel){
		this.viewer = viewer;
		this.propertiesPanel = propertiesPanel;

		this._update = () => { this.update(); };

		let copyIconPath = Potree.resourcePath + '/icons/copy.svg';
		this.elContent = $(`
		<div class="propertypanel_content">
			<table>
				<tr>
					<th colspan="3">position</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="camera_position_x" style="width: 25%"></td>
					<td align="center" id="camera_position_y" style="width: 25%"></td>
					<td align="center" id="camera_position_z" style="width: 25%"></td>
					<td align="right" id="copy_camera_position" style="width: 25%">
						<img name="copyPosition" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
				<tr>
					<th colspan="3">target</th>
					<th></th>
				</tr>
				<tr>
					<td align="center" id="camera_target_x" style="width: 25%"></td>
					<td align="center" id="camera_target_y" style="width: 25%"></td>
					<td align="center" id="camera_target_z" style="width: 25%"></td>
					<td align="right" id="copy_camera_target" style="width: 25%">
						<img name="copyTarget" title="copy" class="button-icon" src="${copyIconPath}" style="width: 16px; height: 16px"/>
					</td>
				</tr>
			</table>
		</div>
		`);

		this.elCopyPosition = this.elContent.find("img[name=copyPosition]");
		this.elCopyPosition.click( () => {
			let pos = this.viewer.scene.getActiveCamera().position.toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Potree.utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.elCopyTarget = this.elContent.find("img[name=copyTarget]");
		this.elCopyTarget.click( () => {
			let pos = this.viewer.scene.view.getPivot().toArray();
			let msg = pos.map(c => c.toFixed(3)).join(", ");
			Potree.utils.clipboardCopy(msg);

			this.viewer.postMessage(
					`Copied value to clipboard: <br>'${msg}'`,
					{duration: 3000});
		});

		this.propertiesPanel.addVolatileListener(viewer, "camera_changed", this._update);

		this.update();
	}

	update(){
		console.log("updating camera panel");

		let camera = this.viewer.scene.getActiveCamera();
		let view = this.viewer.scene.view;

		let pos = camera.position.toArray().map(c => Potree.utils.addCommas(c.toFixed(3)));
		this.elContent.find("#camera_position_x").html(pos[0]);
		this.elContent.find("#camera_position_y").html(pos[1]);
		this.elContent.find("#camera_position_z").html(pos[2]);

		let target = view.getPivot().toArray().map(c => Potree.utils.addCommas(c.toFixed(3)));
		this.elContent.find("#camera_target_x").html(target[0]);
		this.elContent.find("#camera_target_y").html(target[1]);
		this.elContent.find("#camera_target_z").html(target[2]);
	}
}


Potree.PropertiesPanel = class PropertriesPanel{

	constructor(container, viewer){
		this.container = container;
		this.viewer = viewer;
		this.object = null;
		this.cleanupTasks = [];
		this.scene = null;
	}

	setScene(scene){
		this.scene = scene;
	}

	set(object){
		if(this.object === object){
			return;
		}

		this.object = object;
		
		for(let task of this.cleanupTasks){
			task();
		}
		this.cleanupTasks = [];
		this.container.empty();

		if(object instanceof Potree.PointCloudTree){
			this.setPointCloud(object);
		}else if(object instanceof Potree.Measure || object instanceof Potree.Profile || object instanceof Potree.Volume){
			this.setMeasurement(object);
		}else if(object instanceof THREE.Camera){
			this.setCamera(object);
		}
		
	}

	//
	// Used for events that should be removed when the property object changes.
	// This is for listening to materials, scene, point clouds, etc.
	// not required for DOM listeners, since they are automatically cleared by removing the DOM subtree.
	//
	addVolatileListener(target, type, callback){
		target.addEventListener(type, callback);
		this.cleanupTasks.push(() => {
			target.removeEventListener(type, callback);
		});
	}

	setPointCloud(pointcloud){

		let material = pointcloud.material;

		let panel = $(`
			<div class="scene_content selectable">
				<ul class="pv-menu-list">

				<li>
				<span data-i18n="appearance.point_size"></span>:<span id="lblPointSize"></span> <div id="sldPointSize"></div>
				</li>

				<!-- SIZE TYPE -->
				<li>
					<label for="optPointSizing" class="pv-select-label" data-i18n="appearance.point_size_type">Point Sizing </label>
					<select id="optPointSizing" name="optPointSizing">
						<option>FIXED</option>
						<option>ATTENUATED</option>
						<option>ADAPTIVE</option>
					</select>
				</li>

				<!-- SHAPE -->
				<li>
					<label for="optShape" class="pv-select-label" data-i18n="appearance.point_shape"></label><br>
					<select id="optShape" name="optShape">
						<option>SQUARE</option>
						<option>CIRCLE</option>
						<option>PARABOLOID</option>
					</select>
				</li>

				<!-- OPACITY -->
				<li><span data-i18n="appearance.point_opacity"></span>:<span id="lblOpacity"></span><div id="sldOpacity"></div></li>

				<div class="divider">
					<span>Attribute</span>
				</div>

				<li>
					<!--<label for="optMaterial" class="pv-select-label">Attributes:</label><br>-->
					<select id="optMaterial" name="optMaterial">
					</select>
				</li>

				<div id="materials.composite_weight_container">
					<div class="divider">
						<span>Attribute Weights</span>
					</div>

					<li>RGB: <span id="lblWeightRGB"></span> <div id="sldWeightRGB"></div>	</li>
					<li>Intensity: <span id="lblWeightIntensity"></span> <div id="sldWeightIntensity"></div>	</li>
					<li>Elevation: <span id="lblWeightElevation"></span> <div id="sldWeightElevation"></div>	</li>
					<li>Classification: <span id="lblWeightClassification"></span> <div id="sldWeightClassification"></div>	</li>
					<li>Return Number: <span id="lblWeightReturnNumber"></span> <div id="sldWeightReturnNumber"></div>	</li>
					<li>Source ID: <span id="lblWeightSourceID"></span> <div id="sldWeightSourceID"></div>	</li>
				</div>

				<div id="materials.rgb_container">
					<div class="divider">
						<span>RGB</span>
					</div>

					<li>Gamma: <span id="lblRGBGamma"></span> <div id="sldRGBGamma"></div>	</li>
					<li>Brightness: <span id="lblRGBBrightness"></span> <div id="sldRGBBrightness"></div>	</li>
					<li>Contrast: <span id="lblRGBContrast"></span> <div id="sldRGBContrast"></div>	</li>
				</div>

				<div id="materials.color_container">
					<div class="divider">
						<span>Color</span>
					</div>

					<input id="materials.color.picker" />
				</div>


				<div id="materials.elevation_container">
					<div class="divider">
						<span>Elevation</span>
					</div>

					<li><span data-i18n="appearance.elevation_range"></span>: <span id="lblHeightRange"></span> <div id="sldHeightRange"></div>	</li>
					<li>
						<span>Gradient Scheme:</span>
						<div id="elevation_gradient_scheme_selection" style="display: flex">
						<!--
							<span style="flex-grow: 1;">
								<img id="gradient_spectral" class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_spectral.png" />
							</span>
							<span style="flex-grow: 1;">
								<img id="gradient_yellow_green" class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_yellow_green.png" />
							</span>
							<span style="flex-grow: 1;">
								<img class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_plasma.png" />
							</span>
							<span style="flex-grow: 1;">
								<img class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_grayscale.png" />
							</span>
							<span style="flex-grow: 1;">
								<img class="button-icon" style="max-width: 100%" src="${Potree.resourcePath}/icons/gradients_rainbow.png" />
							</span>
							-->
						</div>
					</li>
				</div>

				<div id="materials.transition_container">
					<div class="divider">
						<span>Transition</span>
					</div>

					<li>transition: <span id="lblTransition"></span> <div id="sldTransition"></div>	</li>
				</div>

				<div id="materials.intensity_container">
					<div class="divider">
						<span>Intensity</span>
					</div>

					<li>Range: <span id="lblIntensityRange"></span> <div id="sldIntensityRange"></div>	</li>
					<li>Gamma: <span id="lblIntensityGamma"></span> <div id="sldIntensityGamma"></div>	</li>
					<li>Brightness: <span id="lblIntensityBrightness"></span> <div id="sldIntensityBrightness"></div>	</li>
					<li>Contrast: <span id="lblIntensityContrast"></span> <div id="sldIntensityContrast"></div>	</li>
				</div>
				
				<div id="materials.index_container">
					<div class="divider">
						<span>Indices</span>
					</div>
				</div>


				</ul>
			</div>
		`);

		panel.i18n();
		this.container.append(panel);

		{ // POINT SIZE
			let sldPointSize = panel.find(`#sldPointSize`);
			let lblPointSize = panel.find(`#lblPointSize`);

			sldPointSize.slider({
				value: material.size,
				min: 0,
				max: 3,
				step: 0.01,
				slide: function (event, ui) { material.size = ui.value; }
			});

			let update = (e) => {
				lblPointSize.html(material.size.toFixed(2));
				sldPointSize.slider({value: material.size});
			};
			this.addVolatileListener(material, "point_size_changed", update);
			
			update();
		}

		{ // POINT SIZING
			let strSizeType = Object.keys(Potree.PointSizeType)[material.pointSizeType];

			let opt = panel.find(`#optPointSizing`);
			opt.selectmenu();
			opt.val(strSizeType).selectmenu('refresh');

			opt.selectmenu({
				change: (event, ui) => {
					material.pointSizeType = Potree.PointSizeType[ui.item.value];
				}
			});
		}

		{ // SHAPE
			let opt = panel.find(`#optShape`);

			opt.selectmenu({
				change: (event, ui) => {
					let value = ui.item.value;

					material.shape = Potree.PointShape[value];
				}
			});

			let update = () => {
				let typename = Object.keys(Potree.PointShape)[material.shape];

				opt.selectmenu().val(typename).selectmenu('refresh');
			};
			this.addVolatileListener(material, "point_shape_changed", update);

			update();
		}

		{ // OPACITY
			let sldOpacity = panel.find(`#sldOpacity`);
			let lblOpacity = panel.find(`#lblOpacity`);

			sldOpacity.slider({
				value: material.opacity,
				min: 0,
				max: 1,
				step: 0.001,
				slide: function (event, ui) { 
					material.opacity = ui.value;
				}
			});

			let update = (e) => {
				lblOpacity.html(material.opacity.toFixed(2));
				sldOpacity.slider({value: material.opacity});
			};
			this.addVolatileListener(material, "opacity_changed", update);

			update();
		}

		{
			let options = [
				'RGB',
				'RGB and Elevation',
				'Color',
				'Elevation',
				'Intensity',
				'Intensity Gradient',
				'Classification',
				'Return Number',
				'Source',
				'Index',
				'Level of Detail',
				'Composite'
			];

			let attributeSelection = panel.find('#optMaterial');
			for(let option of options){
				let elOption = $(`<option>${option}</option>`);
				attributeSelection.append(elOption);
			}

			let updateMaterialPanel = (event, ui) => {
				let selectedValue = attributeSelection.selectmenu().val();
				material.pointColorType = Potree.toMaterialID(selectedValue);

				let blockWeights = $('#materials\\.composite_weight_container');
				let blockElevation = $('#materials\\.elevation_container');
				let blockRGB = $('#materials\\.rgb_container');
				let blockColor = $('#materials\\.color_container');
				let blockIntensity = $('#materials\\.intensity_container');
				let blockIndex = $('#materials\\.index_container');
				let blockTransition = $('#materials\\.transition_container');

				blockIndex.css('display', 'none');
				blockIntensity.css('display', 'none');
				blockElevation.css('display', 'none');
				blockRGB.css('display', 'none');
				blockColor.css('display', 'none');
				blockWeights.css('display', 'none');
				blockTransition.css('display', 'none');

				if (selectedValue === 'Composite') {
					blockWeights.css('display', 'block');
					blockElevation.css('display', 'block');
					blockRGB.css('display', 'block');
					blockIntensity.css('display', 'block');
				} else if (selectedValue === 'Elevation') {
					blockElevation.css('display', 'block');
				} else if (selectedValue === 'RGB and Elevation') {
					blockRGB.css('display', 'block');
					blockElevation.css('display', 'block');
				} else if (selectedValue === 'RGB') {
					blockRGB.css('display', 'block');
				} else if (selectedValue === 'Color') {
					blockColor.css('display', 'block');
				} else if (selectedValue === 'Intensity') {
					blockIntensity.css('display', 'block');
				} else if (selectedValue === 'Intensity Gradient') {
					blockIntensity.css('display', 'block');
				} else if (selectedValue === "Index" ){
					blockIndex.css('display', 'block');
				}
			};

			attributeSelection.selectmenu({change: updateMaterialPanel});

			let update = () => {
				attributeSelection.val(Potree.toMaterialName(material.pointColorType)).selectmenu('refresh');
			};
			this.addVolatileListener(material, "point_color_type_changed", update);

			update();
			updateMaterialPanel();
		}

		{
			let schemes = [
				{name: "SPECTRAL", icon: `${Potree.resourcePath}/icons/gradients_spectral.png`},
				{name: "YELLOW_GREEN", icon: `${Potree.resourcePath}/icons/gradients_yellow_green.png`},
				{name: "PLASMA", icon: `${Potree.resourcePath}/icons/gradients_plasma.png`},
				{name: "GRAYSCALE", icon: `${Potree.resourcePath}/icons/gradients_grayscale.png`},
				{name: "RAINBOW", icon: `${Potree.resourcePath}/icons/gradients_rainbow.png`},
			];

			let elSchemeContainer = panel.find("#elevation_gradient_scheme_selection");

			for(let scheme of schemes){
				let elScheme = $(`
					<span style="flex-grow: 1;">
						<img src="${scheme.icon}" class="button-icon" style="max-width: 100%" />
					</span>
				`);

				elScheme.click( () => {
					material.gradient = Potree.Gradients[scheme.name];
				});

				elSchemeContainer.append(elScheme);
			}

			//panel.find("#gradient_spectral").click( () => {
			//	pointcloud.material.gradient = Potree.Gradients.SPECTRAL;
			//});

			//panel.find("#gradient_yellow_green").click( () => {
			//	pointcloud.material.gradient = Potree.Gradients.YELLOW_GREEN;
			//});
		}

		{
			panel.find('#sldRGBGamma').slider({
				value: material.rgbGamma,
				min: 0, max: 4, step: 0.01,
				slide: (event, ui) => {material.rgbGamma = ui.value}
			});

			panel.find('#sldRGBContrast').slider({
				value: material.rgbContrast,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.rgbContrast = ui.value}
			});

			panel.find('#sldRGBBrightness').slider({
				value: material.rgbBrightness,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.rgbBrightness = ui.value}
			});

			panel.find('#sldHeightRange').slider({
				range: true,
				min: 0, max: 1000, step: 0.01,
				values: [0, 1000],
				slide: (event, ui) => {
					material.heightMin = ui.values[0];
					material.heightMax = ui.values[1];
				}
			});

			panel.find('#sldIntensityRange').slider({
				range: true,
				min: 0, max: 1, step: 0.01,
				values: [0, 1],
				slide: (event, ui) => {
					let min = (Number(ui.values[0]) === 0) ? 0 : parseInt(Math.pow(2, 16 * ui.values[0]));
					let max = parseInt(Math.pow(2, 16 * ui.values[1]));
					material.intensityRange = [min, max];
				}
			});

			panel.find('#sldIntensityGamma').slider({
				value: material.intensityGamma,
				min: 0, max: 4, step: 0.01,
				slide: (event, ui) => {material.intensityGamma = ui.value}
			});

			panel.find('#sldIntensityContrast').slider({
				value: material.intensityContrast,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.intensityContrast = ui.value}
			});

			panel.find('#sldIntensityBrightness').slider({
				value: material.intensityBrightness,
				min: -1, max: 1, step: 0.01,
				slide: (event, ui) => {material.intensityBrightness = ui.value}
			});

			panel.find('#sldWeightRGB').slider({
				value: material.weightRGB,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightRGB = ui.value}
			});

			panel.find('#sldWeightIntensity').slider({
				value: material.weightIntensity,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightIntensity = ui.value}
			});

			panel.find('#sldWeightElevation').slider({
				value: material.weightElevation,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightElevation = ui.value}
			});

			panel.find('#sldWeightClassification').slider({
				value: material.weightClassification,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightClassification = ui.value}
			});

			panel.find('#sldWeightReturnNumber').slider({
				value: material.weightReturnNumber,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightReturnNumber = ui.value}
			});

			panel.find('#sldWeightSourceID').slider({
				value: material.weightSourceID,
				min: 0, max: 1, step: 0.01,
				slide: (event, ui) => {material.weightSourceID = ui.value}
			});

			panel.find(`#materials\\.color\\.picker`).spectrum({
				flat: true,
				showInput: true,
				preferredFormat: 'rgb',
				cancelText: '',
				chooseText: 'Apply',
				color: `#${material.color.getHexString()}`,
				move: color => {
					let cRGB = color.toRgb();
					let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
					material.color = tc;
				},
				change: color => {
					let cRGB = color.toRgb();
					let tc = new THREE.Color().setRGB(cRGB.r / 255, cRGB.g / 255, cRGB.b / 255);
					material.color = tc;
				}
			});

			this.addVolatileListener(material, "color_changed", () => {
				panel.find(`#materials\\.color\\.picker`)
					.spectrum('set', `#${material.color.getHexString()}`);
			});

			let updateHeightRange = function () {
				let box = [pointcloud.pcoGeometry.tightBoundingBox, pointcloud.getBoundingBoxWorld()]
					.find(v => v !== undefined);

				pointcloud.updateMatrixWorld(true);
				box = Potree.utils.computeTransformedBoundingBox(box, pointcloud.matrixWorld);

				let bWidth = box.max.z - box.min.z;
				let bMin = box.min.z - 0.2 * bWidth;
				let bMax = box.max.z + 0.2 * bWidth;

				let range = material.elevationRange;

				panel.find('#lblHeightRange').html(`${range[0].toFixed(2)} to ${range[1].toFixed(2)}`);
				panel.find('#sldHeightRange').slider({min: bMin, max: bMax, values: range});
			};

			let updateIntensityRange = function () {
				let range = material.intensityRange;
				let [min, max] = range.map(v => Math.log2(v) / 16);

				panel.find('#lblIntensityRange').html(`${parseInt(range[0])} to ${parseInt(range[1])}`);
				panel.find('#sldIntensityRange').slider({values: [min, max]});
			};

			{
				updateHeightRange();
				panel.find(`#sldHeightRange`).slider('option', 'min');
				panel.find(`#sldHeightRange`).slider('option', 'max');
			}

			let onIntensityChange = () => {
				let gamma = material.intensityGamma;
				let contrast = material.intensityContrast;
				let brightness = material.intensityBrightness;

				updateIntensityRange();

				panel.find('#lblIntensityGamma').html(gamma.toFixed(2));
				panel.find('#lblIntensityContrast').html(contrast.toFixed(2));
				panel.find('#lblIntensityBrightness').html(brightness.toFixed(2));

				panel.find('#sldIntensityGamma').slider({value: gamma});
				panel.find('#sldIntensityContrast').slider({value: contrast});
				panel.find('#sldIntensityBrightness').slider({value: brightness});
			};

			let onRGBChange = () => {
				let gamma = material.rgbGamma;
				let contrast = material.rgbContrast;
				let brightness = material.rgbBrightness;

				panel.find('#lblRGBGamma').html(gamma.toFixed(2));
				panel.find('#lblRGBContrast').html(contrast.toFixed(2));
				panel.find('#lblRGBBrightness').html(brightness.toFixed(2));

				panel.find('#sldRGBGamma').slider({value: gamma});
				panel.find('#sldRGBContrast').slider({value: contrast});
				panel.find('#sldRGBBrightness').slider({value: brightness});
			};

			this.addVolatileListener(material, "material_property_changed", updateHeightRange);
			this.addVolatileListener(material, "material_property_changed", onIntensityChange);
			this.addVolatileListener(material, "material_property_changed", onRGBChange);

			updateHeightRange();
			onIntensityChange();
			onRGBChange();
		}

	}

	

	setMeasurement(object){

		let TYPE = {
			DISTANCE: {panel: DistancePanel},
			AREA: {panel: AreaPanel},
			POINT: {panel: PointPanel},
			ANGLE: {panel: AnglePanel},
			HEIGHT: {panel: HeightPanel},
			PROFILE: {panel: ProfilePanel},
			VOLUME: {panel: VolumePanel}
		};

		let getType = (measurement) => {
			if (measurement instanceof Potree.Measure) {
				if (measurement.showDistances && !measurement.showArea && !measurement.showAngles) {
					return TYPE.DISTANCE;
				} else if (measurement.showDistances && measurement.showArea && !measurement.showAngles) {
					return TYPE.AREA;
				} else if (measurement.maxMarkers === 1) {
					return TYPE.POINT;
				} else if (!measurement.showDistances && !measurement.showArea && measurement.showAngles) {
					return TYPE.ANGLE;
				} else if (measurement.showHeight) {
					return TYPE.HEIGHT;
				} else {
					return TYPE.OTHER;
				}
			} else if (measurement instanceof Potree.Profile) {
				return TYPE.PROFILE;
			} else if (measurement instanceof Potree.Volume) {
				return TYPE.VOLUME;
			}
		};

		//this.container.html("measurement");

		let type = getType(object);
		let Panel = type.panel;

		let panel = new Panel(this.viewer, object, this);
		this.container.append(panel.elContent);
	}

	setCamera(camera){
		let panel = new CameraPanel(this.viewer, this);
		this.container.append(panel.elContent);
	}

}

Potree.NavigationCube = class NavigationCube extends THREE.Object3D {

	constructor(viewer){
		super();

		this.viewer = viewer;

		let createPlaneMaterial = (img) => {
			let material = new THREE.MeshBasicMaterial( {
				depthTest: true, 
				depthWrite: true,
				side: THREE.DoubleSide
			});
			new THREE.TextureLoader().load(
				Potree.resourcePath + '/textures/navigation/' + img,
				function(texture) {
					texture.anisotropy = viewer.renderer.getMaxAnisotropy();
					material.map = texture;
					material.needsUpdate = true;
				});
			return material;
		};

		let planeGeometry = new THREE.PlaneGeometry(1, 1);

		this.front = new THREE.Mesh(planeGeometry, createPlaneMaterial('F.png'));
		this.front.position.y = -0.5;
		this.front.rotation.x = Math.PI / 2.0;
		this.front.updateMatrixWorld();
		this.front.name = "F";
		this.add(this.front);

		this.back = new THREE.Mesh(planeGeometry, createPlaneMaterial('B.png'));
		this.back.position.y = 0.5;
		this.back.rotation.x = Math.PI / 2.0;
		this.back.updateMatrixWorld();
		this.back.name = "B";
		this.add(this.back);

		this.left = new THREE.Mesh(planeGeometry, createPlaneMaterial('L.png'));
		this.left.position.x = -0.5;
		this.left.rotation.y = Math.PI / 2.0;
		this.left.updateMatrixWorld();
		this.left.name = "L";
		this.add(this.left);

		this.right = new THREE.Mesh(planeGeometry, createPlaneMaterial('R.png'));
		this.right.position.x = 0.5;
		this.right.rotation.y = Math.PI / 2.0;
		this.right.updateMatrixWorld();
		this.right.name = "R";
		this.add(this.right);

		this.bottom = new THREE.Mesh(planeGeometry, createPlaneMaterial('D.png'));
		this.bottom.position.z = -0.5;
		this.bottom.updateMatrixWorld();
		this.bottom.name = "D";
		this.add(this.bottom);

		this.top = new THREE.Mesh(planeGeometry, createPlaneMaterial('U.png'));
		this.top.position.z = 0.5;
		this.top.updateMatrixWorld();
		this.top.name = "U";
		this.add(this.top);

		this.width = 150; // in px

		this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
		this.camera.position.copy(new THREE.Vector3(0, 0, 0));
		this.camera.lookAt(new THREE.Vector3(0, 1, 0));
		this.camera.updateMatrixWorld();
		this.camera.rotation.order = "ZXY";

		let onMouseDown = (event) => {
			this.pickedFace = null;
			let mouse = new THREE.Vector2();
			mouse.x = event.clientX - (window.innerWidth - this.width);
			mouse.y = event.clientY;

			if(mouse.x < 0 || mouse.y > this.width) return;

			mouse.x = (mouse.x / this.width) * 2 - 1;
			mouse.y = -(mouse.y / this.width) * 2 + 1;

			let raycaster = new THREE.Raycaster();
			raycaster.setFromCamera(mouse, this.camera);
			raycaster.ray.origin.sub(this.camera.getWorldDirection());

			let intersects = raycaster.intersectObjects(this.children);

			let minDistance = 1000;
			for (let i = 0; i < intersects.length; i++) {
				if(intersects[i].distance < minDistance) {
					this.pickedFace = intersects[i].object.name;
					minDistance = intersects[i].distance;
				}
			}
			if(this.pickedFace) {
				this.viewer.setView(this.pickedFace);
			}
		};

		this.viewer.renderer.domElement.addEventListener('mousedown', onMouseDown, false);
	}

	update(rotation) {
		this.camera.rotation.copy(rotation);
		this.camera.updateMatrixWorld();
	}

}

Potree.GLProgram = class GLProgram {
	constructor (gl, material) {
		this.gl = gl;
		this.material = material;
		this.program = gl.createProgram(); ;

		this.recompile();
	}

	compileShader (type, source) {
		let gl = this.gl;

		let vs = gl.createShader(type);

		gl.shaderSource(vs, source);
		gl.compileShader(vs);

		let success = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
		if (!success) {
			console.error('could not compile shader:');

			let log = gl.getShaderInfoLog(vs);
			console.error(log, source);

			return null;
		}

		return vs;
	}

	recompile () {
		let gl = this.gl;

		let vs = this.compileShader(gl.VERTEX_SHADER, this.material.vertexShader);
		let fs = this.compileShader(gl.FRAGMENT_SHADER, this.material.fragmentShader);

		if (vs === null || fs === null) {
			return;
		}

		// PROGRAM
		let program = this.program;
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		let success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (!success) {
			console.error('could not compile/link program:');
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

			for (let i = 0; i < n; i++) {
				let uniform = gl.getActiveUniform(program, i);
				let name = uniform.name;
				let loc = gl.getUniformLocation(program, name);

				uniforms[name] = loc;
			}

			this.uniforms = uniforms;
		}
	}
};


Potree.InterleavedBufferAttribute = class InterleavedBufferAttribute{
	
	constructor(name, bytes, numElements, type, normalized){
		this.name = name;
		this.bytes = bytes;
		this.numElements = numElements;
		this.normalized = normalized;
		this.type = type; // gl type without prefix, e.g. "FLOAT", "UNSIGNED_INT"
	}
	
};

Potree.InterleavedBuffer = class InterleavedBuffer{

	constructor(data, attributes, numElements){
		this.data = data;
		this.attributes = attributes;
		this.stride = attributes.reduce( (a, att) => a + att.bytes, 0);
		this.stride = Math.ceil(this.stride / 4) * 4;
		this.numElements = numElements;
	}
	
	offset(name){
		let offset = 0;
		
		for(let att of this.attributes){
			if(att.name === name){
				return offset;
			}
			
			offset += att.bytes;
		}
		
		return null;
	}
	
};

Potree.toInterleavedBufferAttribute = function toInterleavedBufferAttribute(pointAttribute){
	let att = null;
	
	if (pointAttribute.name === Potree.PointAttribute.POSITION_CARTESIAN.name) {
		att = new Potree.InterleavedBufferAttribute("position", 12, 3, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.COLOR_PACKED.name) {
		att = new Potree.InterleavedBufferAttribute("color", 4, 4, "UNSIGNED_BYTE", true);
	} else if (pointAttribute.name === Potree.PointAttribute.INTENSITY.name) {
		att = new Potree.InterleavedBufferAttribute("intensity", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.CLASSIFICATION.name) {
		att = new Potree.InterleavedBufferAttribute("classification", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.RETURN_NUMBER.name) {
		att = new Potree.InterleavedBufferAttribute("returnNumber", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.NUMBER_OF_RETURNS.name) {
		att = new Potree.InterleavedBufferAttribute("numberOfReturns", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.SOURCE_ID.name) {
		att = new Potree.InterleavedBufferAttribute("pointSourceID", 4, 1, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.NORMAL_SPHEREMAPPED.name) {
		att = new Potree.InterleavedBufferAttribute("normal", 12, 3, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.NORMAL_OCT16.name) {
		att = new Potree.InterleavedBufferAttribute("normal", 12, 3, "FLOAT", false);
	} else if (pointAttribute.name === Potree.PointAttribute.NORMAL.name) {
		att = new Potree.InterleavedBufferAttribute("normal", 12, 3, "FLOAT", false);
	}
	
	return att;
};

var GeoTIFF = (function (exports) {
'use strict';

class EnumItem{
	constructor(object){
		for(let key of Object.keys(object)){
			this[key] = object[key];
		}
	}

	inspect(){
		return `Enum(${this.name}: ${this.value})`;
	}
}

class Enum{

	constructor(object){
		this.object = object;

		for(let key of Object.keys(object)){
			let value = object[key];

			if(typeof value === "object"){
				value.name = key;
			}else{
				value = {name: key, value: value};
			}
			
			this[key] = new EnumItem(value);
		}
	}

	fromValue(value){
		for(let key of Object.keys(this.object)){
			if(this[key].value === value){
				return this[key];
			}
		}

		throw new Error(`No enum for value: ${value}`);
	}
	
}

const Endianness = new Enum({
	LITTLE: "II",
	BIG: "MM",
});

const Type = new Enum({
	BYTE: {value: 1, bytes: 1},
	ASCII: {value: 2, bytes: 1},
	SHORT: {value: 3, bytes: 2},
	LONG: {value: 4, bytes: 4},
	RATIONAL: {value: 5, bytes: 8},
	SBYTE: {value: 6, bytes: 1},
	UNDEFINED: {value: 7, bytes: 1},
	SSHORT: {value: 8, bytes: 2},
	SLONG: {value: 9, bytes: 4},
	SRATIONAL: {value: 10, bytes: 8},
	FLOAT: {value: 11, bytes: 4},
	DOUBLE: {value: 12, bytes: 8},
});

const Tag = new Enum({
	IMAGE_WIDTH: 256,
	IMAGE_HEIGHT: 257,
	BITS_PER_SAMPLE: 258,
	COMPRESSION: 259,
	PHOTOMETRIC_INTERPRETATION: 262,
	STRIP_OFFSETS: 273,
	ORIENTATION: 274,
	SAMPLES_PER_PIXEL: 277,
	ROWS_PER_STRIP: 278,
	STRIP_BYTE_COUNTS: 279,
	X_RESOLUTION: 282,
	Y_RESOLUTION: 283,
	PLANAR_CONFIGURATION: 284,
	RESOLUTION_UNIT: 296,
	SOFTWARE: 305,
	COLOR_MAP: 320,
	SAMPLE_FORMAT: 339,
	MODEL_PIXEL_SCALE: 33550,         // [GeoTIFF] TYPE: double   N: 3
	MODEL_TIEPOINT: 33922,            // [GeoTIFF] TYPE: double   N: 6 * NUM_TIEPOINTS
	GEO_KEY_DIRECTORY: 34735,         // [GeoTIFF] TYPE: short    N: >= 4
	GEO_DOUBLE_PARAMS: 34736,         // [GeoTIFF] TYPE: short    N: variable
	GEO_ASCII_PARAMS: 34737,          // [GeoTIFF] TYPE: ascii    N: variable
});

const typeMapping = new Map([
	[Type.BYTE, Uint8Array],
	[Type.ASCII, Uint8Array],
	[Type.SHORT, Uint16Array],
	[Type.LONG, Uint32Array],
	[Type.RATIONAL, Uint32Array],
	[Type.SBYTE, Int8Array],
	[Type.UNDEFINED, Uint8Array],
	[Type.SSHORT, Int16Array],
	[Type.SLONG, Int32Array],
	[Type.SRATIONAL, Int32Array],
	[Type.FLOAT, Float32Array],
	[Type.DOUBLE, Float64Array],
]);

class IFDEntry{

	constructor(tag, type, count, offset, value){
		this.tag = tag;
		this.type = type;
		this.count = count;
		this.offset = offset;
		this.value = value;
	}

}

class Image{

	constructor(){
		this.width = 0;
		this.height = 0;
		this.buffer = null;
		this.metadata = [];
	}

}

class Reader{

	constructor(){

	}

	static read(data){

		let endiannessTag = String.fromCharCode(...Array.from(data.slice(0, 2)));
		let endianness = Endianness.fromValue(endiannessTag);

		let tiffCheckTag = data.readUInt8(2);

		if(tiffCheckTag !== 42){
			throw new Error("not a valid tiff file");
		}

		let offsetToFirstIFD = data.readUInt32LE(4);

		console.log("offsetToFirstIFD", offsetToFirstIFD);

		let ifds = [];
		let IFDsRead = false;
		let currentIFDOffset = offsetToFirstIFD;
		let i = 0;
		while(IFDsRead || i < 100){

			console.log("currentIFDOffset", currentIFDOffset);
			let numEntries = data.readUInt16LE(currentIFDOffset);
			let nextIFDOffset = data.readUInt32LE(currentIFDOffset + 2 + numEntries * 12);

			console.log("next offset: ", currentIFDOffset + 2 + numEntries * 12);

			let entryBuffer = data.slice(currentIFDOffset + 2, currentIFDOffset + 2 + 12 * numEntries);

			for(let i = 0; i < numEntries; i++){
				let tag = Tag.fromValue(entryBuffer.readUInt16LE(i * 12));
				let type = Type.fromValue(entryBuffer.readUInt16LE(i * 12 + 2));
				let count = entryBuffer.readUInt32LE(i * 12 + 4);
				let offsetOrValue = entryBuffer.readUInt32LE(i * 12 + 8);
				let valueBytes = type.bytes * count;

				let value;
				if(valueBytes <= 4){
					value = offsetOrValue;
				}else{
					let valueBuffer = new Uint8Array(valueBytes);
					valueBuffer.set(data.slice(offsetOrValue, offsetOrValue + valueBytes));
					
					let ArrayType = typeMapping.get(type);

					value = new ArrayType(valueBuffer.buffer);

					if(type === Type.ASCII){
						value = String.fromCharCode(...value);
					}
				}

				let ifd = new IFDEntry(tag, type, count, offsetOrValue, value);

				ifds.push(ifd);
			}

			console.log("nextIFDOffset", nextIFDOffset);

			if(nextIFDOffset === 0){
				break;
			}

			currentIFDOffset = nextIFDOffset;
			i++;
		}

		let ifdForTag = (tag) => {
			for(let entry of ifds){
				if(entry.tag === tag){
					return entry;
				}
			}

			return null;
		};

		let width = ifdForTag(Tag.IMAGE_WIDTH, ifds).value;
		let height = ifdForTag(Tag.IMAGE_HEIGHT, ifds).value;
		let compression = ifdForTag(Tag.COMPRESSION, ifds).value;
		let rowsPerStrip = ifdForTag(Tag.ROWS_PER_STRIP, ifds).value; 
		let ifdStripOffsets = ifdForTag(Tag.STRIP_OFFSETS, ifds);
		let ifdStripByteCounts = ifdForTag(Tag.STRIP_BYTE_COUNTS, ifds);

		let numStrips = Math.ceil(height / rowsPerStrip);

		let stripByteCounts = [];
		for(let i = 0; i < ifdStripByteCounts.count; i++){
			let type = ifdStripByteCounts.type;
			let offset = ifdStripByteCounts.offset + i * type.bytes;

			let value;
			if(type === Type.SHORT){
				value = data.readUInt16LE(offset);
			}else if(type === Type.LONG){
				value = data.readUInt32LE(offset);
			}

			stripByteCounts.push(value);
		}

		let stripOffsets = [];
		for(let i = 0; i < ifdStripOffsets.count; i++){
			let type = ifdStripOffsets.type;
			let offset = ifdStripOffsets.offset + i * type.bytes;

			let value;
			if(type === Type.SHORT){
				value = data.readUInt16LE(offset);
			}else if(type === Type.LONG){
				value = data.readUInt32LE(offset);
			}

			stripOffsets.push(value);
		}

		let imageBuffer = new Uint8Array(width * height * 3);
		
		let linesProcessed = 0;
		for(let i = 0; i < numStrips; i++){
			let stripOffset = stripOffsets[i];
			let stripBytes = stripByteCounts[i];
			let stripData = data.slice(stripOffset, stripOffset + stripBytes);
			let lineBytes = width * 3;
			for(let y = 0; y < rowsPerStrip; y++){
				let line = stripData.slice(y * lineBytes, y * lineBytes + lineBytes);
				imageBuffer.set(line, linesProcessed * lineBytes);
		
				if(line.length === lineBytes){
					linesProcessed++;
				}else{
					break;
				}
			}
		}

		console.log(`width: ${width}`);
		console.log(`height: ${height}`);
		console.log(`numStrips: ${numStrips}`);
		console.log("stripByteCounts", stripByteCounts.join(", "));
		console.log("stripOffsets", stripOffsets.join(", "));

		let image = new Image();
		image.width = width;
		image.height = height;
		image.buffer = imageBuffer;
		image.metadata = ifds;

		return image;
	}

}


class Exporter{

	constructor(){

	}

	static toTiffBuffer(image, params = {}){

		let offsetToFirstIFD = 8;
		
		let headerBuffer = new Uint8Array([0x49, 0x49, 42, 0, offsetToFirstIFD, 0, 0, 0]);

		let [width, height] = [image.width, image.height];

		let ifds = [
			new IFDEntry(Tag.IMAGE_WIDTH,                Type.SHORT,    1,   null, width),
			new IFDEntry(Tag.IMAGE_HEIGHT,               Type.SHORT,    1,   null, height),
			new IFDEntry(Tag.BITS_PER_SAMPLE,            Type.SHORT,    4,   null, new Uint16Array([8, 8, 8, 8])),
			new IFDEntry(Tag.COMPRESSION,                Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.PHOTOMETRIC_INTERPRETATION, Type.SHORT,    1,   null, 2),
			new IFDEntry(Tag.ORIENTATION,                Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.SAMPLES_PER_PIXEL,          Type.SHORT,    1,   null, 4),
			new IFDEntry(Tag.ROWS_PER_STRIP,             Type.LONG,     1,   null, height),
			new IFDEntry(Tag.STRIP_BYTE_COUNTS,          Type.LONG,     1,   null, width * height * 3),
			new IFDEntry(Tag.PLANAR_CONFIGURATION,       Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.RESOLUTION_UNIT,            Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.SOFTWARE,                   Type.ASCII,    6,   null, "......"),
			new IFDEntry(Tag.STRIP_OFFSETS,              Type.LONG,     1,   null, null),
			new IFDEntry(Tag.X_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
			new IFDEntry(Tag.Y_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
		];

		if(params.ifdEntries){
			ifds.push(...params.ifdEntries);
		}

		let valueOffset = offsetToFirstIFD + 2 + ifds.length * 12 + 4;

		// create 12 byte buffer for each ifd and variable length buffers for ifd values
		let ifdEntryBuffers = new Map();
		let ifdValueBuffers = new Map();
		for(let ifd of ifds){
			let entryBuffer = new ArrayBuffer(12);
			let entryView = new DataView(entryBuffer);

			let valueBytes = ifd.type.bytes * ifd.count;

			entryView.setUint16(0, ifd.tag.value, true);
			entryView.setUint16(2, ifd.type.value, true);
			entryView.setUint32(4, ifd.count, true);

			if(ifd.count === 1 && ifd.type.bytes <= 4){
				entryView.setUint32(8, ifd.value, true);
			}else{
				entryView.setUint32(8, valueOffset, true);

				let valueBuffer = new Uint8Array(ifd.count * ifd.type.bytes);
				if(ifd.type === Type.ASCII){
					valueBuffer.set(new Uint8Array(ifd.value.split("").map(c => c.charCodeAt(0))));
				}else{
					valueBuffer.set(new Uint8Array(ifd.value.buffer));
				}
				ifdValueBuffers.set(ifd.tag, valueBuffer);

				valueOffset = valueOffset + valueBuffer.byteLength;
			}

			ifdEntryBuffers.set(ifd.tag, entryBuffer);
		}

		let imageBufferOffset = valueOffset;

		new DataView(ifdEntryBuffers.get(Tag.STRIP_OFFSETS)).setUint32(8, imageBufferOffset, true);

		let concatBuffers = (buffers) => {

			let totalLength = buffers.reduce( (sum, buffer) => (sum + buffer.byteLength), 0);
			let merged = new Uint8Array(totalLength);

			let offset = 0;
			for(let buffer of buffers){
				merged.set(new Uint8Array(buffer), offset);
				offset += buffer.byteLength;
			}

			return merged;
		};
		
		let ifdBuffer = concatBuffers([
			new Uint16Array([ifds.length]), 
			...ifdEntryBuffers.values(), 
			new Uint32Array([0])]);
		let ifdValueBuffer = concatBuffers([...ifdValueBuffers.values()]);

		let tiffBuffer = concatBuffers([
			headerBuffer,
			ifdBuffer,
			ifdValueBuffer,
			image.buffer
		]);

		return {width: width, height: height, buffer: tiffBuffer};
	}

}

exports.Tag = Tag;
exports.Type = Type;
exports.IFDEntry = IFDEntry;
exports.Image = Image;
exports.Reader = Reader;
exports.Exporter = Exporter;

return exports;

}({}));
