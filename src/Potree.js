


function Potree(){

}

Potree.pointBudget = 1*1000*1000;

// contains WebWorkers with base64 encoded code
Potree.workers = {};

Potree.Shaders = {};


Potree.updatePointClouds = function(pointclouds, camera, renderer){

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
	
	Potree.PointCloudOctree.lru.freeMemory();
	
	return result;
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
		
		if(pointcloud.visible){
			priorityQueue.push({pointcloud: i, node: pointcloud.root, weight: Number.MAX_VALUE});
		}
		
		// hide all previously visible nodes
		if(pointcloud.root instanceof Potree.PointCloudOctreeNode){
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
		
		var box = node.boundingBox;
		var frustum = frustums[element.pointcloud];
		var camObjPos = camObjPositions[element.pointcloud];
		
		var insideFrustum = frustum.intersectsBox(box);
		var visible = insideFrustum;
		visible = visible && !(numVisiblePoints + node.numPoints > Potree.pointBudget);
		
		if(!visible){
			continue;
		}
		
		numVisibleNodes++;
		numVisiblePoints += node.numPoints;
		
		pointcloud.numVisibleNodes++;
		pointcloud.numVisiblePoints += node.numPoints;
		
		
		// if geometry is loaded, create a scene node
		if(node instanceof Potree.PointCloudOctreeGeometryNode){
			var geometryNode = node;
			var geometry = geometryNode.geometry;
			
			if((typeof parent === "undefined" || parent instanceof Potree.PointCloudOctreeNode) 
					&& geometryNode.loaded){
				var pcoNode = new Potree.PointCloudOctreeNode();
				var sceneNode = new THREE.PointCloud(geometry, pointcloud.material);
				sceneNode.visible = false;
				
				pcoNode.octree = pointcloud;
				pcoNode.name = geometryNode.name;
				pcoNode.level = geometryNode.level;
				pcoNode.numPoints = geometryNode.numPoints;
				pcoNode.boundingBox = geometry.boundingBox;
				pcoNode.tightBoundingBox = geometry.tightBoundingBox;
				pcoNode.boundingSphere = pcoNode.boundingBox.getBoundingSphere();
				pcoNode.geometryNode = geometryNode;
				pcoNode.parent = parent;
				pcoNode.children = {};
				for(var key in geometryNode.children){
					pcoNode.children[key] = geometryNode.children[key];
				}
				
				sceneNode.boundingBox = pcoNode.boundingBox;
				sceneNode.boundingSphere = pcoNode.boundingSphere;
				sceneNode.numPoints = pcoNode.numPoints;
				sceneNode.level = pcoNode.level;
				
				pcoNode.sceneNode = sceneNode;
				
				if(typeof node.parent === "undefined"){
					pointcloud.root = pcoNode;
					pointcloud.add(pcoNode.sceneNode);
					
					sceneNode.matrixWorld.multiplyMatrices( pointcloud.matrixWorld, sceneNode.matrix );
				}else{
					var childIndex = parseInt(pcoNode.name[pcoNode.name.length - 1]);
					parent.sceneNode.add(sceneNode);
					parent.children[childIndex] = pcoNode;
					
					sceneNode.matrixWorld.multiplyMatrices( parent.sceneNode.matrixWorld, sceneNode.matrix );
				}
				
				// when a PointCloudOctreeGeometryNode is disposed, 
				// then replace reference to PointCloudOctreeNode with PointCloudOctreeGeometryNode
				// as it was before it was loaded
				var disposeListener = function(parent, pcoNode, geometryNode){
					return function(){
						var childIndex = parseInt(pcoNode.name[pcoNode.name.length - 1]);
						parent.sceneNode.remove(pcoNode.sceneNode);
						parent.children[childIndex] = geometryNode;
					}
				}(parent, pcoNode, node);
				pcoNode.geometryNode.oneTimeDisposeHandlers.push(disposeListener);
				
				node = pcoNode;
			}
			
			if(!geometryNode.loaded){
				unloadedGeometry.push(node);
				visibleGeometry.push(node);
			}
			
		}
		
		
		if(node instanceof Potree.PointCloudOctreeNode){
			Potree.PointCloudOctree.lru.touch(node.geometryNode);
			node.sceneNode.visible = true;
			node.sceneNode.material = pointcloud.material;
			
			visibleNodes.push(node);
			pointcloud.visibleNodes.push(node);
			
			visibleGeometry.push(node.geometryNode);
			pointcloud.visibleGeometry.push(node.geometryNode);
			
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
			
			if(pointcloud.generateDEM && node.level <= 6){
				if(!node.dem){
					node.dem = pointcloud.createDEM(node);
				}
			}
		} 
		
		
		// add child nodes to priorityQueue
		for(var i = 0; i < 8; i++){
			if(!node.children[i]){
				continue;
			}
			
			var child = node.children[i];
			
			var sphere = child.boundingSphere;
			var distance = sphere.center.distanceTo(camObjPos);
			var radius = sphere.radius;
			
			var fov = camera.fov / 2 * Math.PI / 180.0;
			var pr = 1 / Math.tan(fov) * radius / Math.sqrt(distance * distance - radius * radius);
			
			var screenPixelRadius = renderer.domElement.clientHeight * pr;
			if(screenPixelRadius < pointcloud.minimumNodePixelSize){
				continue;
			}
			
			var weight = pr;
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


