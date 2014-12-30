

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
	this.boundingSphere = this.boundingBox.getBoundingSphere();
	this.name = geometryNode.name;
	this.level = geometryNode.level;
	this.numPoints = geometryNode.numPoints;
}

Potree.PointCloudOctreeProxyNode.prototype = Object.create(THREE.Object3D.prototype);








Potree.ProfileRequest = function(start, end, width, depth, callback){
	this.start = start;
	this.end = end;
	this.width = width;
	this.depth = depth;
	
	//var up = start.clone();
	//up.y += 10;
	//this.plane = new THREE.Plane().setFromCoplanarPoints(start, end, up);
	this.callback = callback;
	this.loadQueue = [];
	
	var center = new THREE.Vector3().addVectors(end, start).multiplyScalar(0.5);
	var length = new THREE.Vector3().subVectors(end, start).length();
	var side = new THREE.Vector3().subVectors(end, start).normalize();
	var up = new THREE.Vector3(0, 1, 0);
	var forward = new THREE.Vector3().crossVectors(side, up).normalize();
	var N = forward;
	this.plane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, start);
};








Potree.PointCloudOctree = function(geometry, material){
	THREE.Object3D.call( this );
	
	Potree.PointCloudOctree.lru = Potree.PointCloudOctree.lru || new LRU();
	
	this.pcoGeometry = geometry;
	this.boundingBox = this.pcoGeometry.tightBoundingBox;
	this.boundingSphere = this.boundingBox.getBoundingSphere();
	//this.boundingBox = this.pcoGeometry.root.boundingBox;
	//this.boundingSphere = this.boundingBox.getBoundingSphere();
	this.material = material || new Potree.PointCloudMaterial();
	this.visiblePointsTarget = 2*1000*1000;
	this.level = 0;
	this.position.sub(geometry.offset);
	this.updateMatrix();
	
	this.LODDistance = 20;
	this.LODFalloff = 1.3;
	this.LOD = 4;
	this.showBoundingBox = false;
	this.boundingBoxNodes = [];
	this.loadQueue = [];
	this.visibleBounds = new THREE.Box3();	
	this.profileRequests = [];
	this.visibleNodes = [];
	this.visibleGeometry = [];
	this.pickTarget;
	this.pickMaterial;
	this.maxLevel = 0;
	
	var rootProxy = new Potree.PointCloudOctreeProxyNode(this.pcoGeometry.root);
	this.add(rootProxy);
}

Potree.PointCloudOctree.prototype = Object.create(THREE.Object3D.prototype);

Potree.PointCloudOctree.prototype.update = function(camera, renderer){
	this.updateMatrixWorld(true);

	this.visibleGeometry = this.getVisibleGeometry(camera);
	var visibleGeometryNames = [];
	
	for(var i = 0; i < this.visibleGeometry.length; i++){
		visibleGeometryNames.push(this.visibleGeometry[i].node.name);
	}
	
	for(var i = 0; i < this.profileRequests.length; i++){
		var profileRequest = this.profileRequests[i];
		profileRequest.loadQueue = [];
	}
	
	for(var i = 0; i < this.boundingBoxNodes.length; i++){
		this.boundingBoxNodes[i].visible = false;
	}
	
	this.loadQueue = [];
	this.visibleNodes = [];
	this.numVisibleNodes = 0;
	this.numVisiblePoints = 0;
	
	this.material.fov = camera.fov * (Math.PI / 180);
	this.material.screenWidth = renderer.domElement.clientWidth;
	this.material.screenHeight = renderer.domElement.clientHeight;
	this.material.spacing = this.pcoGeometry.spacing;
	this.material.near = camera.near;
	this.material.far = camera.far;
	
	this.hideDescendants(this.children[0]);
	
	var stack = [];
	stack.push({node: this.children[0], weight: 1});	//TODO don't do it like that
	while(stack.length > 0){
		var element = stack.shift();
		var node = element.node;
		var weight = element.weight;
		
		node.visible = true;
		
		node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );
		
		if (node instanceof Potree.PointCloudOctreeProxyNode) {
			var geometryNode = node.geometryNode;
			if(geometryNode.loaded === true){
				this.replaceProxy(node);
			}else{
				this.loadQueue.push(element);
			}
		}else if(node instanceof THREE.PointCloud){
			this.numVisibleNodes++;
			this.numVisiblePoints += node.numPoints;
			node.material = this.material;
			this.visibleNodes.push(element);
			
			if(node.level){
				this.maxLevel = Math.max(node.level, this.maxLevel);
			}
			
			if(this.showBoundingBox && !node.boundingBoxNode){
				var boxHelper = new THREE.BoxHelper(node);
				scene.add(boxHelper);
				this.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
			}else if(this.showBoundingBox){
				node.boundingBoxNode.visible = true;
				node.boundingBoxNode.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.boundingBoxNode.matrix );
			}else if(!this.showBoundingBox && node.boundingBoxNode){
				node.boundingBoxNode.visible = false;
			}
			
			for(var i = 0; i < node.children.length; i++){
				var child = node.children[i];
				var visible = visibleGeometryNames.indexOf(child.name) >= 0;
				if(visible){
					for(var j = 0; j < this.visibleGeometry.length; j++){
						if(this.visibleGeometry[j].node.name === child.name){
							stack.push({node: child, weight: this.visibleGeometry[j].weight});
						}
					};
				}
			}
		}
	}
	
	this.material.octreeLevels = this.maxLevel;
	
	// check profile cut plane intersections
	for(var i = 0; i < this.profileRequests.length; i++){
		var profileRequest = this.profileRequests[i];
		var plane = profileRequest.plane;
		var start = profileRequest.start;
		var end = profileRequest.end;
		var depth = profileRequest.depth;
		
		var stack = [];
		stack.push(this);
		while(stack.length > 0){
			var object = stack.shift();
		
			if(object instanceof Potree.PointCloudOctreeProxyNode){
				var box = Potree.utils.computeTransformedBoundingBox(object.boundingBox, object.matrixWorld);
				
				var sphere = box.getBoundingSphere();
				if(Math.abs(plane.distanceToPoint(sphere.center)) < sphere.radius){
					profileRequest.loadQueue.push(object);
				}
			}
		
		
			if(object.level < depth){
				for(var i = 0; i < object.children.length; i++){
					var child = object.children[i];
					
					if(child instanceof Potree.PointCloudOctreeProxyNode || child instanceof THREE.PointCloud){
						stack.push(object.children[i]);
					}
				}
			}
		}
			
	}
	
	var leafNodes = [];
	for(var i = 0; i < this.visibleNodes.length; i++){
		var element = this.visibleNodes[i];
		var node = element.node;
		var isLeaf = true;
		
		for(var j = 0; j < node.children.length; j++){
			var child = node.children[j];
			if(child instanceof THREE.PointCloud){
				isLeaf = isLeaf && !child.visible;
			}
		}
		
		if(isLeaf){
			leafNodes.push(node);
		}
	}
	
	this.visibleBounds.min = new THREE.Vector3( Infinity, Infinity, Infinity );
	this.visibleBounds.max = new THREE.Vector3( - Infinity, - Infinity, - Infinity );
	for(var i = 0; i < leafNodes.length; i++){
		var node = leafNodes[i];
		
		this.visibleBounds.expandByPoint(node.boundingBox.min);
		this.visibleBounds.expandByPoint(node.boundingBox.max);
		//this.visibleBounds.intersect(node.boundingBox);
	}
	
	// schedule nodes needed for a profile request
	var finishedRequests = [];
	for(var i = 0; i < this.profileRequests.length; i++){
		var request = this.profileRequests[i];
		
		if(request.loadQueue.length > 0){
			var object = request.loadQueue[0];
			var geometryNode = object.geometryNode;
			if(geometryNode.loaded === true && object.parent !== undefined){
				var node = this.replaceProxy(object);
				node.updateMatrixWorld();
				node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );
				
				//var boxHelper = new THREE.BoxHelper(node);
				//scene.add(boxHelper);
			}else{
				object.geometryNode.load();
			}
		}else{
			var points = this.getProfile(request.start, request.end, request.width, request.depth);
		
			request.callback({type: "finished", points: points});
			finishedRequests.push(request);
		}
	}
	
	for(var i = 0; i < finishedRequests.length; i++){
		var index = this.profileRequests.indexOf(finishedRequests[i]);
		if (index > -1) {
			this.profileRequests.splice(index, 1);
		}
	}
	
	
	
	if(this.loadQueue.length > 0){
		if(this.loadQueue.length >= 2){
			this.loadQueue.sort(function(a,b){return b.weight - a.weight});
		}
		
		for(var i = 0; i < Math.min(5, this.loadQueue.length); i++){
			this.loadQueue[i].node.geometryNode.load();
		}
	}
	
	this.hideDescendants(this.children[0]);
	for(var i = 0; i < this.visibleNodes.length; i++){
		this.visibleNodes[i].node.visible = true;
	}
	
	if(this.material.pointSizeType){
		if(this.material.pointSizeType === Potree.PointSizeType.ADAPTIVE 
			|| this.material.pointColorType === Potree.PointColorType.OCTREE_DEPTH){
			this.updateVisibilityTexture();
		}
	}
};

Potree.PointCloudOctree.prototype.getVisibleGeometry = function(camera){
	
	var visibleGeometry = [];
	var geometry = this.pcoGeometry;
	
	
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
	
	var sortWeightFunction = function(a, b){return b.weight - a.weight};
	
	var root = geometry.root;
	var stack = [];
	var pointCount = 0;
	
	var sphere = root.boundingBox.getBoundingSphere();
	var distance = sphere.center.distanceTo(camObjPos);
	//var weight = sphere.radius / distance;
	var weight = 1 / Math.max(0.1, sphere.center.distanceTo(camObjPos) - sphere.radius);
	stack.push({node: root, weight: weight});
	var nodesTested = 0;
	while(stack.length > 0){
		nodesTested++;
		var element = stack.shift();
		var node = element.node;
		
		var box = node.boundingBox;
		var sphere = node.boundingSphere;
		//var insideFrustum = frustum.intersectsSphere(sphere);
		var insideFrustum = frustum.intersectsBox(box);
	
		
		var visible = insideFrustum; // && node.level <= 3;
		//visible = visible && "r7".indexOf(node.name) === 0;
		
		if(!visible){
			continue;
		}
		
		if(pointCount + node.numPoints > this.visiblePointsTarget){
			break;
		}
		
		pointCount += node.numPoints;
		visibleGeometry.push(element);
		
		for(var i in node.children){
			var child = node.children[i];
			
			var sphere = child.boundingSphere;
			var distance = sphere.center.distanceTo(camObjPos);
			var radius = sphere.radius;
			var weight = sphere.radius / distance;
			//var weight = (1 / Math.max(0.001, distance - radius)) * distance;
			
			// discarding nodes which are very small when projected onto the screen
			// TODO: pr threshold was a value choosen by trial & error. Validate that this is fine.
			// see http://stackoverflow.com/questions/21648630/radius-of-projected-sphere-in-screen-space
			var fov = camera.fov / 2 * Math.PI / 180.0;
			var pr = 1 / Math.tan(fov) * radius / Math.sqrt(distance * distance - radius * radius);
			if(pr < 0.1){
				continue;
			}
			
			weight = pr;
			if(distance - radius < 0){
				weight = Number.MAX_VALUE;
			}
			
			if(stack.length === 0){
				stack.push({node: child, weight: weight});
			}else{
				var ipos = 0;
			
				for(var j = 0; j < stack.length; j++){
					if(weight > stack[j].weight){
						var ipos = j;
						break;
					}else if(j == stack.length -1){
						ipos = stack.length;
						break;
					}
					
					
				}
				
				//if(stack.length < 200){
					stack.splice(ipos, 0, {node: child, weight: weight});
				//}
				
				//console.log(ipos);
			}
			
				//stack.push({node: child, weight: weight});
			//}
		}
		
		//stack.sort(sortWeightFunction);
		var a = 1;
	}
	//console.log(nodesTested);
	
	return visibleGeometry;
};

Potree.PointCloudOctree.prototype.updateVisibilityTexture = function(){

	if(!this.material){
		return;
	}
	
	var texture = this.material.visibleNodesTexture;
    var data = texture.image.data;
	
	var visibleNodes = [];
	for(var i = 0; i < this.visibleNodes.length; i++){
		visibleNodes.push(this.visibleNodes[i].node);
	}
	
	
	
	
	// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
	var sort = function(a, b){
		var na = a.name;
		var nb = b.name;
		if(na.length != nb.length) return na.length - nb.length;
		if(na < nb) return -1;
		if(na > nb) return 1;
		return 0;
	};
	visibleNodes.sort(sort);
	
	//var r = [];
	//for(var i = 0; i < visibleNodes.length; i++){
	//	var node = visibleNodes[i];
	//	
	//	if(node.level < 2){
	//		r.push(node);
	//	}else{
	//	
	//	ß0
	//	
	//	//if(node.numPoints > 5000){
	//	//	r.push(node);
	//	//}
	//}
	//visibleNodes = r;
	
	for(var i = 0; i < visibleNodes.length; i++){
		var node = visibleNodes[i];
		var children = [];
		for(var j = 0; j < node.children.length; j++){
			var child = node.children[j];
			if(child instanceof THREE.PointCloud && child.visible){
				children.push(child);
			}
		}
		children.sort(function(a, b){
			if(a.name < b.name) return -1;
			if(a.name > b.name) return 1;
			return 0;
		});
		
		data[i*3 + 0] = 0;
		data[i*3 + 1] = 0;
		data[i*3 + 2] = 0;
		for(var j = 0; j < children.length; j++){
			var child = children[j];
			var index = parseInt(child.name.substr(-1));
			data[i*3 + 0] += Math.pow(2, index);
			
			if(j === 0){
				var vArrayIndex = visibleNodes.indexOf(child);
				data[i*3 + 1] = vArrayIndex - i;
			}
			
		}
	}
	
	
	this.material.uniforms.nodeSize.value = this.pcoGeometry.boundingBox.size().x;
	texture.needsUpdate = true;
}

Potree.PointCloudOctree.prototype.nodesOnRay = function(nodes, ray){
	var nodesOnRay = [];

	var _ray = ray.clone();
	for(var i = 0; i < nodes.length; i++){
		var node = nodes[i].node;
		var inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
		var sphere = node.boundingSphere.clone().applyMatrix4(node.matrixWorld);
		
		if(_ray.isIntersectionSphere(sphere)){
			nodesOnRay.push(nodes[i]);
			//node.visible = true;
		}else{
			//node.visible = false;
		}
	}
	
	return nodesOnRay;
};

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
		node.boundingSphere = node.boundingBox.getBoundingSphere();
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
		
		return node;
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
    this.updateMatrixWorld(true);
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.set(0,0,0).sub(tBox.center());
}

Potree.PointCloudOctree.prototype.moveToGroundPlane = function(){
    this.updateMatrixWorld(true);
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.y += -tBox.min.y;
}

Potree.PointCloudOctree.prototype.getBoundingBoxWorld = function(){
	this.updateMatrixWorld(true);
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
	
	return tBox;
}

Potree.PointCloudOctree.prototype.getPointsInProfile = function(profile, maxDepth){
	var points = [];
	for(var i = 0; i < profile.points.length - 1; i++){
		var start = profile.points[i];
		var end = profile.points[i+1];
		var ps = pointcloud.getProfile(start, end, profile.width, maxDepth);
		for(var j = 0; j < ps.length; j++){
			points.push(ps[j]);
		}
	}
	
	return points;
};

Potree.PointCloudOctree.prototype.getProfile = function(start, end, width, depth, callback){
	if(callback !== undefined){
		this.profileRequests.push(new Potree.ProfileRequest(start, end, width, depth, callback));
	}else{
		var stack = [];
		stack.push(this);
		
		var center = new THREE.Vector3().addVectors(end, start).multiplyScalar(0.5);
		var length = new THREE.Vector3().subVectors(end, start).length();
		var side = new THREE.Vector3().subVectors(end, start).normalize();
		var up = new THREE.Vector3(0, 1, 0);
		var forward = new THREE.Vector3().crossVectors(side, up).normalize();
		var N = forward;
		var cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, start);
		var halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);
		
		var inside = [];
		
		
		while(stack.length > 0){
			var object = stack.shift();
			
			
			var pointsFound = 0;
			
			if(object instanceof THREE.PointCloud){
				var geometry = object.geometry;
				var positions = geometry.attributes.position;
				var p = positions.array;
				var pointCount = positions.length / positions.itemSize;
				
				for(var i = 0; i < pointCount; i++){
					var pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
					pos.applyMatrix4(this.matrixWorld);
					var distance = Math.abs(cutPlane.distanceToPoint(pos));
					var centerDistance = Math.abs(halfPlane.distanceToPoint(pos));
					
					if(distance < width / 2 && centerDistance < length / 2){
						inside.push(pos);
						pointsFound++;
					}
				}
			}
			
			//console.log("traversing: " + object.name + ", #points found: " + pointsFound);
			
			if(object == this || object.level < depth){
				for(var i = 0; i < object.children.length; i++){
					var child = object.children[i];
					if(child instanceof THREE.PointCloud){
						var sphere = child.boundingSphere.clone().applyMatrix4(child.matrixWorld);
						if(cutPlane.distanceToSphere(sphere) < sphere.radius){
							stack.push(child);	
						}			
					}
				}
			}
		}
		
		return inside;
	}
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

Potree.PointCloudOctree.prototype.getVisibleExtent = function(){
	return this.visibleBounds.applyMatrix4(this.matrixWorld);
};

var point = Potree.PointCloudOctree.prototype.pick = function(renderer, camera, ray, params){
	var params = params || {};
	var accuracy = params.accuracy || 0.5;
	
	var nodes = this.nodesOnRay(this.visibleNodes, ray);
	
	if(nodes.length === 0){
		return null;
	}
	
	var width = Math.ceil(renderer.domElement.clientWidth * accuracy);
	var height = Math.ceil(renderer.domElement.clientHeight * accuracy);
	
	if(!this.pickTarget){
		this.pickTarget = new THREE.WebGLRenderTarget( 
			1, 1, 
			{ minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat } 
		);
	}
	
	if(!this.pickMaterial){
		//this.pickMaterial = new Potree.PointCloudIndexMaterial({ size: 0.01, minSize: 3});
		this.pickMaterial = new Potree.PointCloudMaterial();
		this.pickMaterial.pointColorType = Potree.PointColorType.POINT_INDEX;
		this.pickMaterial.pointSizeType = Potree.PointSizeType.FIXED;
		this.pickMaterial.size = accuracy * 5;
	}
	
	// TODO
	// Right now point size for picking is fixed 
	// To work with adaptive size, the pick hierarchy texture must
	// be updated to the hierarchy that is rendered during picking
	
	this.pickTarget.setSize(width, height);
	
	//this.pickMaterial.size = accuracy * (this.material.size || 0.01);
	//this.pickMaterial.minSize = accuracy * (this.material.minSize || 1);
	//this.pickMaterial.pointColorType = this.material.pointColorType;
	//this.pickMaterial.pointSizeType = this.material.pointSizeType;
	//this.pickMaterial.pointShape = this.material.pointShape;

	var _gl = renderer.context;
	
	var material = this.pickMaterial;
	
	renderer.setRenderTarget( this.pickTarget );
	
	renderer.setDepthTest( material.depthTest );
	renderer.setDepthWrite( material.depthWrite )
	renderer.setBlending( THREE.NoBlending );
	
	renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
	
	for(var i = 0; i < nodes.length; i++){
		var object = nodes[i].node;
		var geometry = object.geometry;
		
		if(!geometry.attributes.indices.buffer){
			continue;
		}
		
		material.pcIndex = i;
		
		if(material.program){
			var program = material.program.program;
			_gl.useProgram( program );
			//_gl.disable( _gl.BLEND );
			
			var attributePointer = _gl.getAttribLocation(program, "indices");
			var attributeSize = 4;
			_gl.bindBuffer( _gl.ARRAY_BUFFER, geometry.attributes.indices.buffer );
			//if(!bufferSubmitted){
			//	_gl.bufferData( _gl.ARRAY_BUFFER, new Uint8Array(geometry.attributes.indices.array), _gl.STATIC_DRAW );
			//	bufferSubmitted = true;
			//}
			_gl.enableVertexAttribArray( attributePointer );
			_gl.vertexAttribPointer( attributePointer, attributeSize, _gl.UNSIGNED_BYTE, true, 0, 0 ); 
		
			_gl.uniform1f(material.program.uniforms.pcIndex, material.pcIndex);
		}	
		
		renderer.renderBufferDirect(camera, [], null, material, geometry, object);
	}
	
	
	//_gl.bindTexture( _gl.TEXTURE_2D, this.pickTarget.__webglTexture );
	//_gl.generateMipmap( _gl.TEXTURE_2D );
	//_gl.bindTexture( _gl.TEXTURE_2D, null );
	
	
	var ps = new THREE.Vector3().addVectors(camera.position, ray.direction).project(camera);
	ps.addScalar(1).multiplyScalar(0.5);
	
	var buffer = new ArrayBuffer(4);
	var pixels = new Uint8Array(buffer);
	var ibuffer = new Uint32Array(buffer);
	renderer.context.readPixels(
		ps.x * width, ps.y * height, 
		1, 1, 
		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);
	var pcIndex = pixels[3];
	pixels[3] = 0;
	var pIndex = ibuffer[0];
	
	//console.log(pcIndex);
	//
	//return null;
	
	var pc = nodes[pcIndex].node;
	var positionArray = pc.geometry.attributes.position.array;
	var x = positionArray[3*pIndex+0];
	var y = positionArray[3*pIndex+1];
	var z = positionArray[3*pIndex+2];
	var position = new THREE.Vector3(x, y, z);
	position.applyMatrix4(this.matrixWorld);
	
	if(pIndex === 0 && pcIndex === 0){
		return null;
	}
	
	return {position: position};
}