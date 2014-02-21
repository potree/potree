

/**
 * @class
 */
function POCRenderQueue(){
	this.byteSize = 0;
	this.nodes = new Object();
	this.nodeList = new Array();
	this.length = 0;
	this.points = 0;
}

POCRenderQueue.prototype.add = function(node){
	this.nodes[node.id] = node;
	this.nodeList.push(node);
	this.byteSize += node.sizeInBytes();
	this.points += node.points;
	this.length++;
};

POCRenderQueue.prototype.contains = function(node){
	return this.nodes[node.id] !== null;
};

POCRenderQueue.prototype.get = function(index){
	return this.nodeList[index];
};

/**
 * remove nodes from the end until this.byteSize is smaller than byteSize
 * @param byteSize
 */
POCRenderQueue.prototype.cap = function(byteSize){
	var numNodesToRemove = 0;
	var byteCountDown = this.byteSize;
	while(byteCountDown > byteSize){
		var node = this.nodeList[this.nodeList.length - numNodesToRemove -1];
		numNodesToRemove++;
		byteCountDown -= node.sizeInBytes();
	}
	if(numNodesToRemove < 0){
		this.nodeList.splice(-numNodesToRemove, numNodesToRemove);
	}
	this.length = this.nodeList.length;
};

POCRenderQueue.prototype.capNodeCount = function(numNodes){
	var num = Math.min(numNodes, this.length);
	this.nodeList = this.nodeList.splice(0, num);
	this.length = this.nodeList.length;
};

POCRenderQueue.prototype.clear = function(){
	this.byteSize = 0;
	this.nodes = new Object();
	this.nodeList.length = 0;
	this.length = 0;
	this.points = 0;
};

/**
 * Octree Object that might be attached to an PointcloudOctreeSceneNode.
 * 
 * @class
 * @author Markus Schuetz
 */
function PointcloudOctree(){
	this.rootNode = null;
	this.pointAttributes = null;
	// the maximum amount of nodes that will be rendered each frame 
	this.maxRenderingNodes = 500;
	this.nodesRenderedThisFrame = 0;
	this.octreeDir = null;
	this.loadQueue = new Array();
	if(MaterialManager.getMaterial("pointCloud") !== null){
		this.material = MaterialManager.getMaterial("pointCloud");
	}
	this.renderQueue = new POCRenderQueue();
	this.tmpStack = new Array();
	this.aabbVersion = 1;
	this.minDepth = 1;
	this.nodesBeeingLoaded = new Array();
	
	// maximum amount of nodes in this pointcloud that will be loaded at a given time
	this.loadingNodesLimit = 10;
}

PointcloudOctree.prototype.setMaterial = function(material){
	this.material = material;
};

PointcloudOctree.prototype.setRootNode = function(rootNode){
	this.rootNode = rootNode;
};

PointcloudOctree.prototype.setPointAttributes = function(pointAttributes){
	this.pointAttributes = pointAttributes;
};

PointcloudOctree.visibilityToggle = 0;

/**
 * - updates list of visible and loaded nodes<br>
 * - load visible but unloaded nodes<br>
 * - notify lru collection of all the visible nodes<br>
 */
PointcloudOctree.prototype.prepareRender = function prepareRender(pocSceneNode, camera){
	PointcloudOctree.visibilityToggle = PointcloudOctree.visibilityToggle + 1;
//	this.renderQueue = new POCRenderQueue();
	this.renderQueue.clear();
//	var stack = new Array();
	var stack = this.tmpStack;
	stack.length = 0;
	stack.push(this.rootNode);
	
	var view = camera.viewMatrix;
	var frustum = null;
	if(Potree.Settings.frustumCulling){
		frustum = camera.frustum;
	}
	
	while(stack.length > 0){
		var childStack = new Array();
		
		while(stack.length > 0 /*&& this.renderQueue.length < 100*/){
			var current = stack.pop();
			var shouldBeRendered = true;
			
			// update aabb transformation only if frustum culling is enabled or node is visible and lod is enabled´
			var updateAABB = this.aabbVersion > current.aabb.version; 
			updateAABB = updateAABB && (Potree.Settings.frustumCulling || (shouldBeRendered && Potree.Settings.LOD));
			if(updateAABB){
				current.aabb.setTransform(pocSceneNode.globalTransformation);
				current.aabb.version = this.aabbVersion;
			}
			
			//FIXME clean this mess
			// frustum culling
			if(Potree.Settings.frustumCulling){
				if(frustum.isOutside(current.aabb)){
					shouldBeRendered = false;
				}
			}

			// LOD
			if (shouldBeRendered && Potree.Settings.LOD) {
				
				var vCenter = V3.transform(current.aabb.center, view);
//				var vCenter = this.tmpVec3;
//				V3.transform(current.aabb.center, view, vCenter);
				var distSquare = vCenter[0]*vCenter[0] + vCenter[1] * vCenter[1] + vCenter[2] * vCenter[2];
				
				if (current.level > this.minDepth && distSquare > 10*Potree.Settings.LODMultiplicator*current.aabb.radius* current.aabb.radius) {
					// cull nodes that are far away.
					current.fadeOut();
					shouldBeRendered = false;
				}
			}
			
			// schedule loading of missing point cloud data
			if (shouldBeRendered && current.pointCloud === null) {
				if(!current.isLoading){
					this.loadQueue.push(current);
				}
				continue;
			}
			
			if(current.isLoading){
				continue;
			}
			
			// make nodes visible if they're in sight
			if(!current.isVisible()){
				if(shouldBeRendered){
					current.fadeIn();
				}
				continue;
			}
			
			if(shouldBeRendered){
				for ( var index in current.children) {
					childStack.push(current.children[index]);
				}
				
				this.renderQueue.add(current);
				PointcloudOctreeNode.lruNodes.touch(current);
			}
			
			current.shouldBeRendered = shouldBeRendered;
		}
		
		stack = childStack;
	}
	
//	if(PointcloudOctree.visibilityToggle >= 10000){
//		PointcloudOctree.visibilityToggle = 0;
//	}
	
//	this.renderQueue.capNodeCount(200);
//	this.renderQueue.cap(PointcloudOctreeNode.memoryThreshold);
	
	this.processLoadQueue();
};


/**
 * remove some data from memory if cache limit has been reached.
 * 
 * exceptionsRenderQueue nodes in the renderQueue will not be unloaded
 */
PointcloudOctree.cleanupCache = function(bytesNeeded, exceptionsRenderQueue){
	var lru = PointcloudOctreeNode.lruNodes;
	for(var i = 0; i < 6; i++){
		if(lru.byteSize + bytesNeeded > PointcloudOctreeNode.memoryThreshold){
			var node = lru.getLRUItem();
			if(node !== null && !exceptionsRenderQueue.contains(node)){
				node = lru.removeLRUItem();
				node.unload();
			}
		}
	}
};
	
PointcloudOctree.prototype.render = function(pocSceneNode, renderer) {
	this.prepareRender(pocSceneNode, renderer.camera);
	
	this.material.render(pocSceneNode, renderer);
};

PointcloudOctree.prototype.addTime = function(time){
	this.rootNode.addTime(time);
};

PointcloudOctree.prototype.processLoadQueue = function(){
	var lru = PointcloudOctreeNode.lruNodes;
	var x = 5;
	var bytesNeeded = 0;
	
	if(this.loadQueue.length > 0){
		for(var i = 0; i < Math.min(x, this.loadQueue.length); i++){
			bytesNeeded += this.loadQueue[i].sizeInBytes();
		}
	}
	
	// free some cache
	PointcloudOctree.cleanupCache(bytesNeeded, this.renderQueue);
	
	// process the first x nodes in the queue.
	if(this.loadQueue.length > 0 ){
		for(var i = 0; i < Math.min(x, this.loadQueue.length); i++){
			if(lru.byteSize + this.loadQueue[i].sizeInBytes() < PointcloudOctreeNode.memoryThreshold){
				if(this.nodesBeeingLoaded.length < this.loadingNodesLimit){
					PointcloudOctreeNode.loadCloudAjax(this.loadQueue[i]);
				}
			}
		}
	}
	
	// clear loadQueue
	this.loadQueue.length = 0;
//	this.loadQueue = new Array();
};