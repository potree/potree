

/**
 * 
 * @class
 * Single Node inside the octree. May have up to 8 children named 0 to 7
 * 
 * This is not a SceneNode
 */
function PointcloudOctreeNode(name, poc) {
	this.name = name;
	this.id = poc.octreeDir + "/" + name;
	this.pointCloud = null;
	this.level = name.length-1;
	this.children = new Object();
	this.age = 0;
	this.poc = poc;
	this.isLoading = false;
	this.points = 0;
	// because rendering transparent objects requires z-ordering and points are not ordered, 
	// opacity affects point size rather than transparency. 
	this.opacity = 0;
	// opacity raises or falls over time, depending whether fade is positive or negative. 
	this.fade = 0;
	
	this.aabb = null;
	
	if(PointcloudOctreeNode.lruNodes == null){
		PointcloudOctreeNode.lruNodes = new LRU();
	}
}

PointcloudOctreeNode.useFading = true;
PointcloudOctreeNode.loadingNodes = new Array();

/**
 * memory usage of all poc nodes combined. Has to be updated whenever point cloud data for a node is loaded or unloaded
 */
PointcloudOctreeNode.memoryThreshold = 300*1000*1000;

PointcloudOctreeNode.nodesLoadedThisFrame = 0;

PointcloudOctreeNode.lruNodes = null;

PointcloudOctreeNode.prototype.shouldBeRendered = false;

/**
 * returns the size of this nodes pointcloud data. The pointcloud does not have to be loaded.
 */
PointcloudOctreeNode.prototype.sizeInBytes = function(){
	return this.poc.pointAttributes.byteSize * this.points;
};

PointcloudOctreeNode.prototype.fadeIn = function(){
	if(PointcloudOctreeNode.useFading){
		this.fade = 1;
	}else{
		this.opacity = 1;
	}
};

PointcloudOctreeNode.prototype.isFadingOut = function(){
	return this.fade < 0;
};

PointcloudOctreeNode.prototype.fadeOut = function(){
	if(PointcloudOctreeNode.useFading){
		this.fade = -1;
	}else{
		this.opacity = 0;
	}
};



PointcloudOctreeNode.prototype.isVisible = function(){
//	return this.opacity > 0;
	return true;
};


/**
 * cancels fading
 */
PointcloudOctreeNode.prototype.setOpacity = function(opacity){
	this.fade = 0;
	this.opacity = opacity;
};

PointcloudOctreeNode.prototype.setPointCloud = function(pointCloud) {
	this.pointCloud = pointCloud;
	//this.aabb = this.pointCloud.getAABB();
	this.age = 0;
};

PointcloudOctreeNode.prototype.addTime = function addTime(time){
//	this.age += time;
//	this.opacity += this.fade * time;
//	if(this.opacity > 1){
//		this.opacity = 1;
//		this.fade = 0;
//	}else if(this.opacity < 0){
//		this.opacity = 0;
//		this.fade = 0;
//	}
//	
//	if(this.isVisible()){
//		for(var index in this.children){
//				this.children[index].addTime(time);
//		}
//	}
};

PointcloudOctreeNode.prototype.setAABB = function(aabb){
	this.aabb = aabb;
};

PointcloudOctreeNode.prototype.addChild = function(child) {

	var path = child.name.replace(this.name, "");
	if (path.length === 1) {
		if (this.children[path] == null) {
			this.children[path] = child;
			child.parent = this;
		} else {
			// TODO what did i intend to do? 
			/*
			 * if(this.children[path].name.length > child.name.length){ var
			 * deeperChild = this.children[path]; this.children[path] = child;
			 * child.addChild(deeperChild); }else{ logError("node
			 * '"+this.name+"' already has a child on position " + path); }
			 */
		}
	} else if (path.length > 1) {
		var childIndex = path[0];
		if (this.children[childIndex] != null) {
			this.children[childIndex].addChild(child);
		} else {
			this.children[childIndex] = child;
			child.parent = this;
		}
	} else {
		logError("something is wrong with the path: ");
		logError("this.name: " + this.name);
		logError("child.name: " + child.name);
		logError("path: " + path);
	}
	
//	this.setAABBRecursive(this.aabb);
};

/**
 * removes loaded point cloud data from gpu
 */
PointcloudOctreeNode.prototype.unload = function unloadPOCNode(){
	if(this.pointCloud !== null){
//		Logger.info("unload node: " + this.id);
		this.pointCloud.unload();
		this.pointCloud = null;
	}else{
		Logger.error("tried to unload node but it is not loaded");
	}
//	debugView.set("loadedNodes: ", PointcloudOctreeNode.lruNodes.size() );
};

PointcloudOctreeNode.loadCloudAjax = function loadPOCCloudAjax(node) {
	if(node.isLoading){
		console.log("node is already loading: " + node.name);
		return;
	}
	node.isLoading = true;
	PointcloudOctreeNode.loadingNodes.push(node);
	node.poc.nodesBeeingLoaded.push(node);
	
	var url = node.poc.octreeDir + "/" + node.name;

	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			// when accessing local files, req.status will be 0
			if (xhr.status === 200 || xhr.status === 0) {
				var buffer = xhr.response;
				PointcloudOctreeNode.loadCloudData(node, buffer, url);
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

PointcloudOctreeNode.loadCloudData = function(node, buffer, url) {
	PointcloudOctreeNode.nodesLoadedThisFrame++;

	var pointCloud = new PointCloud(url, node.poc.pointAttributes);
	pointCloud.setVertexBufferData(buffer);
	pointCloud.size = buffer.byteLength / node.poc.pointAttributes.byteSize;

	node.setPointCloud(pointCloud);
	PointcloudOctreeNode.lruNodes.touch(node);
	node.isLoading = false;
	PointcloudOctreeNode.loadingNodes.remove(node);
	node.poc.nodesBeeingLoaded.remove(node);
};

