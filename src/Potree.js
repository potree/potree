


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


