



Potree.PointCloudOctreeGeometry = function(){
	this.numNodesLoading = 0;
}

Potree.PointCloudOctreeGeometryNode = function(name, pcoGeometry, boundingBox){
	this.name = name;
	this.index = parseInt(name.charAt(name.length-1));
	this.pcoGeometry = pcoGeometry;
	this.boundingBox = boundingBox;
	this.children = {};
}

Potree.PointCloudOctreeGeometryNode.prototype.addChild = function(child){
	this.children[child.index] = child;
	child.parent = this;
}

Potree.PointCloudOctreeGeometryNode.prototype.load = function(){
	if(this.loading === true || this.pcoGeometry.numNodesLoading > 3){
		return;
	}
	this.pcoGeometry.numNodesLoading++;
	this.loading = true;
	var url = this.pcoGeometry.octreeDir + "/" + this.name;
	var node = this;
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.responseType = 'arraybuffer';
	xhr.overrideMimeType('text/plain; charset=x-user-defined');
	xhr.onreadystatechange = function() {
		if (xhr.readyState === 4) {
			if (xhr.status === 200 || xhr.status === 0) {
				var buffer = xhr.response;
				node.bufferLoaded(buffer);
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
}

Potree.PointCloudOctreeGeometryNode.prototype.bufferLoaded = function(buffer){
	
	var geometry = new THREE.BufferGeometry();
	var numPoints = buffer.byteLength / 16;
	
	var positions = new Float32Array(numPoints*3);
	var colors = new Float32Array(numPoints*3);
	var color = new THREE.Color();
	
	var fView = new Float32Array(buffer);
	var uiView = new Uint8Array(buffer);
	
	for(var i = 0; i < numPoints; i++){
		positions[3*i] = fView[4*i];
		positions[3*i+1] = fView[4*i+1];
		positions[3*i+2] = fView[4*i+2];
		
		color.setRGB(uiView[16*i+12], uiView[16*i+13], uiView[16*i+14]);
		colors[3*i] = color.r /255;
		colors[3*i+1] = color.g / 255;
		colors[3*i+2] = color.b / 255;
	}
	
	geometry.addAttribute('position', new THREE.Float32Attribute(positions, 3));
	geometry.addAttribute('color', new THREE.Float32Attribute(colors, 3));
	geometry.boundingBox = this.boundingBox;
	this.geometry = geometry;
	this.loaded = true;
	this.loading = false;
	this.pcoGeometry.numNodesLoading--;
}








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
}

Potree.PointCloudOctreeProxyNode.prototype = Object.create(THREE.Object3D.prototype);











Potree.PointCloudOctree = function(geometry, material){
	THREE.Object3D.call( this );
	
	this.pcoGeometry = geometry;
	this.boundingBox = this.pcoGeometry.boundingBox;
	this.material = material;
	this.maxVisibleNodes = 300;
	this.level = 0;
	
	this.LODDistance = 20;
	this.LODFalloff = 1.3;
	this.LOD = 4;
}

Potree.PointCloudOctree.prototype = Object.create(THREE.Object3D.prototype);

abcd = null;

Potree.PointCloudOctree.prototype.update = function(camera){
	this.numVisibleNodes = 0;
	this.numVisiblePoints = 0;
	var frustum = new THREE.Frustum();
	frustum.setFromMatrix( new THREE.Matrix4().multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse ) );
	
	var groot = this.pcoGeometry.root;
	if(groot != undefined && groot.loaded == true && this.root === undefined){
		var root = new THREE.PointCloud(groot.geometry, this.material);
		root.level = 0;
		root.name = groot.name;
		root.numPoints = groot.numPoints;
		root.boundingBox = groot.boundingBox;
		this.add(root);
		this.root = root;
		
		for(var i = 0; i < 8; i++){
			if(groot.children[i] !== undefined){
				var child = groot.children[i];
				var childProxy = new Potree.PointCloudOctreeProxyNode(child);
				childProxy.level = child.level;
				childProxy.numPoints = child.numPoints;
				childProxy.name = child.name;
				root.add(childProxy);
			}
		}
	}else{
		var _this = this;
		
		var stack = [];
		stack.push(this);
		
		while(stack.length > 0){
			var object = stack.shift();
			
			
			var boxWorld = Potree.utils.computeTransformedBoundingBox(object.boundingBox, object.matrixWorld);
			var camWorldPos = new THREE.Vector3().setFromMatrixPosition( camera.matrixWorld );
			var distance = object.level;
			distance = boxWorld.center().distanceTo(camWorldPos);
			var radius = boxWorld.size().length() * 0.5;
			
			var visible = true; 
			visible = visible && frustum.intersectsBox(boxWorld);
			visible = visible && radius / distance > (1 / this.LOD);
			object.visible = visible;
			
			if(!visible){
				this.hideDescendants(object);
				continue;
			}
			
			if(object instanceof THREE.PointCloud){
				_this.numVisibleNodes++;
				_this.numVisiblePoints += object.numPoints;
			}else if (object instanceof Potree.PointCloudOctreeProxyNode) {
				_this.replaceProxy(object);
			}
			
			
			
			
			for(var i = 0; i < object.children.length; i++){
				stack.push(object.children[i]);
			}
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
		var parent = proxy.parent;
		parent.remove(proxy);
		parent.add(node);
		
		for(var i = 0; i < 8; i++){
			if(geometryNode.children[i] !== undefined){
				var child = geometryNode.children[i];
				var childProxy = new Potree.PointCloudOctreeProxyNode(child);
				childProxy.name = child.name;
				childProxy.level = child.level;
				childProxy.numPoints = child.numPoints;
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

//THREE.Object3D.prototype.traverseBreadthFirst = function(callback){
//	var stack = [];
//	stack.push(this);
//	
//	while(stack.length > 0){
//		var current = stack.shift();
//		
//		var accepted = callback(current);
//		if(!accepted){
//			continue;
//		}
//		
//		for(var i = 0; i < current.children.length; i++){
//			stack.push(current.children[i]);
//		}
//	}
//}















