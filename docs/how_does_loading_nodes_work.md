
# How Does Loading Nodes Work?

Relevant classes are:

* <b>PointCloudOctree</b> <br>
Manages the octree. Contains methods that finds currently visible nodes for rendering
or loading.
* <b>PointCloudOctreeNode</b><br>
The hierarchy consists of instances of this class. Contains methods to load or unload
point cloud data.
* <b>PointCloudOctreeSceneNode</b><br>
A subclass of SceneNode that can be attached to the scenegraph. 
Contains the PointCloudOctree instance.
* <b>POCLoader</b><br>
Loads the point cloud hierarchy from a file.

## Loading Data

At first, <b>POCLoader.load(file)</b> reads the point cloud hierarchy from cloud.js and
builds a graph of _PointcloudOctreeNode_ instances.
This graph will be attached to a _PointCloudOctree_ instance.
During rendering, <b>PointCloudOctree.prepareRender()</b> traverses through nodes that
are visible from the current point of view. If it encounters a node whose point cloud data
has not been loaded, it will stop traversing further down the hierarchy and schedule
it for loading by adding it to _loadQueue_.

    // schedule loading of missing point cloud data
    if (shouldBeRendered && current.pointCloud == null) {
    	if(!current.isLoading){
    		this.loadQueue.push(current);
    	}
    	continue;
    }
    
The last step of _prepareRender() is a call to <b>PointcloudOctree.processLoadQueue()</b>.
Nodes in _loadQueue_ are sorted by their size and we want to load larger nodes first so
_processLoadQueue()_ will tell the first few nodes in _loadQueue_ to start loading 
point cloud data by calling _PointcloudOctreeNode.loadCloudAjax(node)_. 
The remaining nodes in the queue will be ignored. 
They'll be loaded at a later time once all their ancestors have been loaded.
Additionaly, there are checks to make sure that the size of all loaded nodes does not 
exceed the point cloud memory limit and that no more than _loadingNodesLimit_ 
nodes are loaded at a time.

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
    
<b>PointcloudOctreeNode.loadCloudAjax(node)</b> creates an asynchronous XMLHttpRequest
to read the point cloud data from the corresponding file in _./data_.
Read more about loading point data through XMLHttpRequests in 
[How To Create Your Own Pointcloud Loader](how_to_create_your_own_pointcloud_loader.md).
Once the request is finished, _PointcloudOctreeNode.loadCloudData(node, buffer, url)_
is called to send the data directly to the GPU. 

## Cleanup Data

Pointcloud data can be very large and often it might be necessary to unload some data 
to create space for new data. 
_PointcloudOctreeNode.memoryThreshold_ defines a limit for how much point cloud data
potree will load. If loading a new node exceeds this limit, potree will first remove
some old nodes that weren't rendered in a while. 
<b>PointcloudOctreeNode.lruNodes</b> (least-recently-used nodes) contains a list of all loaded nodes, ordered by 
the last time they've been rendered. Recently rendered nodes are at the end of the list.
<b>PointcloudOctree.cleanupCache(bytesNeeded, exceptionsRenderQueue)</b> 
checks if the byte size of all currently loaded nodes, plus the additional size of
_bytesNeeded_ exceeds the limit. If it does, it will remove the first few nodes
of _lruNodes_, except nodes contained in _exceptionsRenderQueue_. 
This is done to avoid removing nodes that were scheduled to be rendered. 
  










   
    

  

