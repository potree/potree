

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
	
	Potree.PointCloudOctree.lru = Potree.PointCloudOctree.lru || new LRU();
	
	this.pcoGeometry = geometry;
	//this.boundingBox = this.pcoGeometry.boundingBox;
	this.boundingBox = this.pcoGeometry.root.boundingBox;
	this.material = material;
	this.visiblePointsTarget = 2*1000*1000;
	this.level = 0;
	
	this.LODDistance = 20;
	this.LODFalloff = 1.3;
	this.LOD = 4;
	this.showBoundingBox = false;
	this.loadQueue = [];
	
	
	var rootProxy = new Potree.PointCloudOctreeProxyNode(this.pcoGeometry.root);
	this.add(rootProxy);
}

Potree.PointCloudOctree.prototype = Object.create(THREE.Object3D.prototype);

Potree.PointCloudOctree.prototype.update = function(camera){
	this.numVisibleNodes = 0;
	this.numVisiblePoints = 0;
	this.loadQueue = [];
	
	// create frustum in object space
	camera.updateMatrixWorld();
	var frustum = new THREE.Frustum();
	var viewI = camera.matrixWorldInverse;
	var world = this.matrixWorld;
	var proj = camera.projectionMatrix;
	var fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
	frustum.setFromMatrix( fm );
	
	// calculate camera position in object space
	var view = camera.matrixWorld;
	var worldI = new THREE.Matrix4().getInverse(world);
	var camMatrixObject = new THREE.Matrix4().multiply(worldI).multiply(view);
	var camObjPos = new THREE.Vector3().setFromMatrixPosition( camMatrixObject );
	
	var ray = new THREE.Ray(camera.position, new THREE.Vector3( 0, 0, -1 ).applyQuaternion( camera.quaternion ) );
	
	
	// check visibility
	var visibleNodes = [];
	var outOfRange = [];
	var stack = [];
	stack.push(this);
	while(stack.length > 0){
		var object = stack.shift();
		
		if(object instanceof THREE.Mesh || object instanceof THREE.Line ){
			object.visible = true;
			continue;
		}
		
		var box = object.boundingBox;
		var distance = box.center().distanceTo(camObjPos);
		var radius = box.size().length() * 0.5;
		var weight = Math.pow(radius, 1) / distance;

		var visible = true;
		visible = visible && frustum.intersectsBox(box);
		if(object.level > 0){
			var inRange = weight >= (1 / this.LOD);
			visible = visible && inRange;
			
			if(!inRange){
				outOfRange.push({node: object, lod: weight});
			}

		}
		
		// trying to skip higher detail nodes, if parents already cover all holes
		//if(this.pcoGeometry !== undefined && this.pcoGeometry.spacing !== undefined){
		//	var spacing = this.pcoGeometry.spacing / Math.pow(2, object.level);
		//	spacing *= 10;
		//	if(spacing < this.material.size * 1.5){
		//		visible = false;
		//	}
		//}
		
		//if(object.level > 0){
		//	visible = parseInt(object.name.charAt(object.name.length-1)) == 0;
		//}
		
		object.visible = visible;
		
		if(!visible){
			this.hideDescendants(object);
			continue;
		}else if(visible && this.showBoundingBox && object instanceof THREE.PointCloud){
			if(object.boundingBoxNode === undefined && object.boundingBox !== undefined){
				var boxHelper = new THREE.BoxHelper(object);
				object.add(boxHelper);
				object.boundingBoxNode = boxHelper;
			}
			
			object.boundingBoxNode.matrixWorld.copy(object.matrixWorld);
		}else if(!this.showBoundingBox){
			if(object.boundingBoxNode !== undefined){
				object.remove(object.boundingBoxNode);
				object.boundingBoxNode = undefined;
			}
		}
		
		object.matrixWorld.multiplyMatrices( object.parent.matrixWorld, object.matrix );
		
		if(object instanceof THREE.PointCloud){
			this.numVisibleNodes++;
			this.numVisiblePoints += object.numPoints;
			Potree.PointCloudOctree.lru.touch(object);
			object.material = this.material;
			visibleNodes.push({node: object, lod: weight});
		}else if (object instanceof Potree.PointCloudOctreeProxyNode) {
			var geometryNode = object.geometryNode;
			if(geometryNode.loaded === true){
				this.replaceProxy(object);
			}else{
				this.loadQueue.push({node: object, lod: weight});
			}
		}
		
		for(var i = 0; i < object.children.length; i++){
			stack.push(object.children[i]);
		}
		
		//console.log(object.name);
	}
	
	// increase LOD if few points are visible
	if(this.numVisiblePoints < this.visiblePointsTarget * 0.9 && outOfRange.length > 0 && visibleNodes.length > 0){
		// increase lod to load some of the nodes that are currently out of range
		visibleNodes.sort(function(a,b){return a.lod - b.lod});
		outOfRange.sort(function(a,b){return b.lod - a.lod});
		var visibleMax = 1 / visibleNodes[0].lod;
		var oorIndex = Math.min(outOfRange.length - 1, 5);
		var outOfRangeMax = 1 / outOfRange[oorIndex].lod;
		var newMax = Math.max(visibleMax, outOfRangeMax);
		
		this.LOD = newMax;
	}
	
	// enforce visible point target limit 
	visibleNodes.sort(function(a,b){return b.lod - a.lod});
	var pointsSum = 0;
	for(var i = 0; i < visibleNodes.length; i++){
		var node = visibleNodes[i].node;
		
		if(pointsSum > this.visiblePointsTarget){
			node.visible = false;
		}else if(pointsSum + node.numPoints > this.visiblePointsTarget){
			var index = Math.min(i+5, visibleNodes.length-1);
			this.LOD = 1 / visibleNodes[index].lod;
			this.numVisiblePoints = pointsSum;
			this.numVisibleNodes = i+1;
		}
		
		pointsSum += node.numPoints;
	}
	
	// schedule some of the unloaded nodes for loading
	if(this.loadQueue.length > 0){
		if(this.loadQueue.length >= 2){
			this.loadQueue.sort(function(a,b){return b.lod - a.lod});
		}
		
		for(var i = 0; i < Math.min(5, this.loadQueue.length); i++){
			this.loadQueue[i].node.geometryNode.load();
		}
	}
}

Potree.PointCloudOctree.prototype.updateMatrixWorld = function( force ){
	//node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );
	
	if ( this.matrixAutoUpdate === true ) this.updateMatrix();

	if ( this.matrixWorldNeedsUpdate === true || force === true ) {

		if ( this.parent === undefined ) {

			this.matrixWorld.copy( this.matrix );

		} else {

			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );

		}

		this.matrixWorldNeedsUpdate = false;

		force = true;

	}
};


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
		
		node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );

		for(var i = 0; i < 8; i++){
			if(geometryNode.children[i] !== undefined){
				var child = geometryNode.children[i];
				var childProxy = new Potree.PointCloudOctreeProxyNode(child);
				node.add(childProxy);
			}
		}
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

Potree.PointCloudOctree.prototype.moveToOrigin = function(){
    this.position.set(0,0,0);
    this.updateMatrixWorld();
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.set(0,0,0).sub(tBox.center());
}

Potree.PointCloudOctree.prototype.moveToGroundPlane = function(){
    this.updateMatrixWorld();
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.y += -tBox.min.y;
}

Potree.PointCloudOctree.prototype.getBoundingBoxWorld = function(){
	this.updateMatrixWorld();
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
	
	return tBox;
}

Potree.PointCloudOctree.prototype.getProfile = function(start, end, width, depth){
	var stack = [];
	stack.push(this);
	
	var side = new THREE.Vector3().subVectors(end, start).normalize();
	var up = new THREE.Vector3(0, 1, 0);
	var forward = new THREE.Vector3().crossVectors(side, up).normalize();
	var N = forward;
	var cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, start);
	
	var inside = [];
	
	
	while(stack.length > 0){
		var object = stack.shift();
		
		console.log("traversing: " + object.name);
		
		if(object instanceof THREE.PointCloud){
			var geometry = object.geometry;
			var positions = geometry.attributes.position;
			var p = positions.array;
			var pointCount = positions.length / positions.itemSize;
			
			for(var i = 0; i < pointCount; i++){
				var pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
				pos.applyMatrix4(this.matrixWorld);
				var distance = Math.abs(cutPlane.distanceToPoint(pos));
				
				if(distance < width/2){
					inside.push(pos);
				}
			}
		}
		
		if(object == this || object.level < depth){
			for(var i = 0; i < object.children.length; i++){
				stack.push(object.children[i]);
			}
		}
	}
	
	console.log("points inside: " + inside.length);
	
	return inside;
}

/**
 *
 * amount: minimum number of points to remove
 */
Potree.PointCloudOctree.disposeLeastRecentlyUsed = function(amount){
	
	
	var freed = 0;
	do{
		var node = this.lru.first.node;
		var parent = node.parent;
		var geometry = node.geometry;
		var pcoGeometry = node.pcoGeometry;
		var proxy = new Potree.PointCloudOctreeProxyNode(pcoGeometry);
	
		var result = Potree.PointCloudOctree.disposeNode(node);
		freed += result.freed;
		
		parent.add(proxy);
		
		if(result.numDeletedNodes == 0){
			break;
		}
	}while(freed < amount);
}

Potree.PointCloudOctree.disposeNode = function(node){
	
	var freed = 0;
	var numDeletedNodes = 0;
	var descendants = [];
	
	node.traverse(function(object){
		descendants.push(object);
	});
	
	for(var i = 0; i < descendants.length; i++){
		var descendant = descendants[i];
		if(descendant instanceof THREE.PointCloud){
			freed += descendant.pcoGeometry.numPoints;
			descendant.pcoGeometry.dispose();
			descendant.geometry.dispose();
			Potree.PointCloudOctree.lru.remove(descendant);
			numDeletedNodes++;
		}
	}
	
	Potree.PointCloudOctree.lru.remove(node);
	node.parent.remove(node);
	
	return {
		"freed": freed,
		"numDeletedNodes": numDeletedNodes
	};
}