

/**
 * Stands in place for invisible or unloaded octree nodes.
 * If a proxy node becomes visible and its geometry has not been loaded,
 * loading will begin.
 * If it is visible and the geometry has been loaded, the proxy node will 
 * be replaced with a point cloud node (THREE.PointCloud as of now)
 */
Potree.PointCloudOctreeProxyNode = function(geometryNode){
	THREE.Object3D.call( this );
	
	this.geometryNode = geometryNode;
	this.boundingBox = geometryNode.boundingBox;
	this.name = geometryNode.name;
	this.level = geometryNode.level;
	this.numPoints = geometryNode.numPoints;
}

Potree.PointCloudOctreeProxyNode.prototype = Object.create(THREE.Object3D.prototype);








Potree.PointCloudOctree = function(geometry, material){
	THREE.Object3D.call( this );
	
	this.pcoGeometry = geometry;
	this.boundingBox = this.pcoGeometry.boundingBox;
	this.material = material;
	this.maxVisibleNodes = 500;
	this.maxVisiblePoints = 20*1000*1000;
	this.level = 0;
	
	this.LODDistance = 20;
	this.LODFalloff = 1.3;
	this.LOD = 4;
	
	
	var rootProxy = new Potree.PointCloudOctreeProxyNode(this.pcoGeometry.root);
	this.add(rootProxy);
}

Potree.PointCloudOctree.prototype = Object.create(THREE.Object3D.prototype);

Potree.PointCloudOctree.prototype.update = function(camera){
	this.numVisibleNodes = 0;
	this.numVisiblePoints = 0;
	var frustum = new THREE.Frustum();
	frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );
	
	// check visibility
	var stack = [];
	stack.push(this);
	while(stack.length > 0){
		var object = stack.shift();
		
		var boxWorld = Potree.utils.computeTransformedBoundingBox(object.boundingBox, object.matrixWorld);
		var camWorldPos = new THREE.Vector3().setFromMatrixPosition( camera.matrixWorld );
		var distance = boxWorld.center().distanceTo(camWorldPos);
		var radius = boxWorld.size().length() * 0.5;
		
		var visible = true; 
		visible = visible && frustum.intersectsBox(boxWorld);
		if(object.level > 2){
			visible = visible && radius / distance > (1 / this.LOD);
			visible = visible && (this.numVisiblePoints + object.numPoints < Potree.pointLoadLimit);
			visible = visible && (this.numVisibleNodes <= this.maxVisibleNodes);
			visible = visible && (this.numVisiblePoints <= this.maxVisiblePoints);
		}else{
			visible = true;
		}
		
		
		
		
		object.visible = visible;
		
		if(!visible){
			this.hideDescendants(object);
			continue;
		}
		
		if(object instanceof THREE.PointCloud){
			this.numVisibleNodes++;
			this.numVisiblePoints += object.numPoints;
			Potree.lru.touch(object);
		}else if (object instanceof Potree.PointCloudOctreeProxyNode) {
			this.replaceProxy(object);
		}
		
		for(var i = 0; i < object.children.length; i++){
			stack.push(object.children[i]);
		}
	}
}


Potree.PointCloudOctree.prototype.replaceProxy = function(proxy){
	
	var geometryNode = proxy.geometryNode;
	if(geometryNode.loaded === true){
		var geometry = geometryNode.geometry;
		var node = new THREE.PointCloud(geometry, this.material);
		node.name = proxy.name;
		node.level = proxy.level;
		node.numPoints = proxy.numPoints;
		node.boundingBox = geometry.boundingBox;
		node.pcoGeometry = geometryNode;
		var parent = proxy.parent;
		parent.remove(proxy);
		parent.add(node);
		
		for(var i = 0; i < 8; i++){
			if(geometryNode.children[i] !== undefined){
				var child = geometryNode.children[i];
				var childProxy = new Potree.PointCloudOctreeProxyNode(child);
				node.add(childProxy);
			}
		}
	}else{
		geometryNode.load();
	}
}

Potree.PointCloudOctree.prototype.hideDescendants = function(object){
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
