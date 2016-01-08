
Potree.PointCloudArena4DNode = function(){
	this.left = null;
	this.right = null;
	this.sceneNode = null;
	this.kdtree = null;
	
	this.getNumPoints = function(){
		return this.geometryNode.numPoints;
	};
	
	this.isLoaded = function(){
		return true;
	};
	
	this.isTreeNode = function(){
		return true;
	};
	
	this.isGeometryNode = function(){
		return false;
	};
	
	this.getLevel = function(){
		return this.geometryNode.level;
	};
	
	this.getBoundingSphere = function(){
		return this.geometryNode.boundingSphere;
	};
	
	this.getBoundingBox = function(){
		return this.geometryNode.boundingBox;
	};
	
	this.toTreeNode = function(child){
		var geometryNode = null;
		
		if(this.left === child){
			geometryNode = this.left;
		}else if(this.right === child){
			geometryNode = this.right;
		}
		
		if(!geometryNode.loaded){
			return;
		}
		
		var node = new Potree.PointCloudArena4DNode();
		var sceneNode = THREE.PointCloud(geometryNode.geometry, this.kdtree.material);
		sceneNode.visible = false;
		
		node.kdtree = this.kdtree;
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.parent = this;
		node.left = this.geometryNode.left;
		node.right = this.geometryNode.right;
	};
	
	this.getChildren = function(){
		var children = [];
		
		if(this.left){
			children.push(this.left);
		} 
		
		if(this.right){
			children.push(this.right);
		}
		
		return children;
	};
};

Potree.PointCloudOctreeNode.prototype = Object.create(Potree.PointCloudTreeNode.prototype);



Potree.PointCloudArena4D = function(geometry){
	THREE.Object3D.call( this );
	
	var scope = this;
	
	this.root = null;
	if(geometry.root){
		this.root = geometry.root;
	}else{
		geometry.addEventListener("hierarchy_loaded", function(){
			scope.root = geometry.root;
		});
	}
	
	this.visiblePointsTarget = 2*1000*1000;
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
	this.name = "";
	
	this.pickTarget;
	this.pickMaterial;
	
	this.updateMatrixWorld();
};

Potree.PointCloudArena4D.prototype = new Potree.PointCloudTree();

Potree.PointCloudOctree.prototype.setName = function(name){
	if(this.name !== name){
		this.name = name;
		this.dispatchEvent({type: "name_changed", name: name, pointcloud: this});
	}
};

Potree.PointCloudOctree.prototype.getName = function(){
	return this.name;
};

Potree.PointCloudArena4D.prototype.toTreeNode = function(geometryNode, parent){
	var node = new Potree.PointCloudArena4DNode();
	var sceneNode = new THREE.PointCloud(geometryNode.geometry, pointcloud.material);
	
	node.geometryNode = geometryNode;
	node.sceneNode = sceneNode;
	node.pointcloud = pointcloud;
	node.left = geometryNode.left;
	node.right = geometryNode.right;
	
	if(!parent){
		this.root = node;
		this.add(sceneNode);
	}else{
		parent.sceneNode.add(sceneNode);
		
		if(parent.left === geometryNode){
			parent.left = node;
		}else if(parent.right === geometryNode){
			parent.right = node;
		}
	}
	
	var disposeListener = function(){
		parent.sceneNode.remove(node.sceneNode);
		
		if(parent.left === node){
			parent.left = geometryNode;
		}else if(parent.right === node){
			parent.right = geometryNode;
		}
	}
	geometryNode.oneTimeDisposeHandlers.push(disposeListener);
	
	return node;
};

Potree.PointCloudArena4D.prototype.updateMaterial = function(material, visibleNodes, camera, renderer){
	material.fov = camera.fov * (Math.PI / 180);
	material.screenWidth = renderer.domElement.clientWidth;
	material.screenHeight = renderer.domElement.clientHeight;
	material.spacing = this.pcoGeometry.spacing;
	material.near = camera.near;
	material.far = camera.far;
	
	// reduce shader source updates by setting maxLevel slightly higher than actually necessary
	if(this.maxLevel > material.levels){
		material.levels = this.maxLevel + 2;
	}
	
	//material.minSize = 3;
	
	//material.uniforms.octreeSize.value = this.boundingBox.size().x;
	var bbSize = this.boundingBox.size();
	material.bbSize = [bbSize.x, bbSize.y, bbSize.z];
	
	// update visibility texture
	if(material.pointSizeType){
		if(material.pointSizeType === Potree.PointSizeType.ADAPTIVE 
			|| material.pointColorType === Potree.PointColorType.LOD){
			
			this.updateVisibilityTexture(material, visibleNodes);
		}
	}
};

Potree.PointCloudArena4D.prototype.updateVisibleBounds = function(){
	
};

Potree.PointCloudArena4D.prototype.hideDescendants = function(object){
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
		if(object.boundingBoxNode){
			object.boundingBoxNode.visible = false;
		}
		
		for(var i = 0; i < object.children.length; i++){
			var child = object.children[i];
			if(child.visible){
				stack.push(child);
			}
		}
	}
};

Potree.PointCloudArena4D.prototype.updateMatrixWorld = function( force ){
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

Potree.PointCloudArena4D.prototype.nodesOnRay = function(nodes, ray){
	var nodesOnRay = [];

	var _ray = ray.clone();
	for(var i = 0; i < nodes.length; i++){
		var node = nodes[i];
		var sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
		var box = node.getBoundingBox().clone().applyMatrix4(node.sceneNode.matrixWorld);
		
		
		if(_ray.isIntersectionBox(box)){
			nodesOnRay.push(node);
		}
	}
	
	return nodesOnRay;
};

Potree.PointCloudArena4D.prototype.pick = function(renderer, camera, ray, params){

	var params = params || {};
	var pickWindowSize = params.pickWindowSize || 17;
	var pickOutsideClipRegion = params.pickOutsideClipRegion || false;
	
	var nodes = this.nodesOnRay(this.visibleNodes, ray);
	
	if(nodes.length === 0){
		return null;
	}
	
	var width = Math.ceil(renderer.domElement.clientWidth);
	var height = Math.ceil(renderer.domElement.clientHeight);
	
	var pixelPos = new THREE.Vector3().addVectors(camera.position, ray.direction).project(camera);
	pixelPos.addScalar(1).multiplyScalar(0.5);
	pixelPos.x *= width;
	pixelPos.y *= height;
	
	if(!this.pickTarget){
		this.pickTarget = new THREE.WebGLRenderTarget( 
			1, 1, 
			{ minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat } 
		);
	}else if(this.pickTarget.width != width || this.pickTarget.height != height){
		this.pickTarget.dispose();
		this.pickTarget = new THREE.WebGLRenderTarget( 
			1, 1, 
			{ minFilter: THREE.LinearFilter, 
			magFilter: THREE.NearestFilter, 
			format: THREE.RGBAFormat } 
		);
	}
	this.pickTarget.setSize(width, height);
	
	// setup pick material.
	// use the same point size functions as the main material to get the same point sizes.
	if(!this.pickMaterial){
		this.pickMaterial = new Potree.PointCloudMaterial({treeType: Potree.TreeType.KDTREE});
		this.pickMaterial.pointColorType = Potree.PointColorType.POINT_INDEX;
		this.pickMaterial.pointSizeType = Potree.PointSizeType.FIXED;
	}
	
	this.pickMaterial.pointSizeType = this.material.pointSizeType;
	this.pickMaterial.size = this.material.size;
	
	if(this.pickMaterial.pointSizeType === Potree.PointSizeType.ADAPTIVE){
		this.updateVisibilityTexture(this.pickMaterial, nodes);
	}
	
	this.pickMaterial.fov 			= this.material.fov;
	this.pickMaterial.screenWidth 	= this.material.screenWidth;
	this.pickMaterial.screenHeight 	= this.material.screenHeight;
	this.pickMaterial.spacing 		= this.material.spacing;
	this.pickMaterial.near 			= this.material.near;
	this.pickMaterial.far 			= this.material.far;
	this.pickMaterial.levels 		= this.material.levels;
	this.pickMaterial.pointShape 	= this.material.pointShape;
	this.pickMaterial.minSize		= this.material.minSize;
	this.pickMaterial.maxSize		= this.material.maxSize;
	
	if(pickOutsideClipRegion){
		this.pickMaterial.clipMode = Potree.ClipMode.DISABLED;
	}else{
		this.pickMaterial.clipMode = this.material.clipMode;
		if(this.material.clipMode === Potree.ClipMode.CLIP_OUTSIDE){
			this.pickMaterial.setClipBoxes(this.material.clipBoxes);
		}else{
			this.pickMaterial.setClipBoxes([]);
		}
	}
	

	var _gl = renderer.context;
	
	_gl.enable(_gl.SCISSOR_TEST);
	_gl.scissor(pixelPos.x - (pickWindowSize - 1) / 2, pixelPos.y - (pickWindowSize - 1) / 2,pickWindowSize,pickWindowSize);
	_gl.disable(_gl.SCISSOR_TEST);
	
	var material = this.pickMaterial;
	
	renderer.setRenderTarget( this.pickTarget );
	
	renderer.state.setDepthTest( material.depthTest );
	renderer.state.setDepthWrite( material.depthWrite );
	renderer.state.setBlending( THREE.NoBlending );
	
	renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
	
	//TODO: UGLY HACK CHAMPIONSHIP SUBMISSION!! drawing first node does not work properly so we draw it twice.
	if(nodes.length > 0){
		nodes.push(nodes[0]);
	}
	
	for(var i = 0; i < nodes.length; i++){
		var object = nodes[i].sceneNode;
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
	
	
	
	var pickWindowSize = 17;
	var pixelCount = pickWindowSize * pickWindowSize;
	var buffer = new ArrayBuffer(pixelCount*4);
	var pixels = new Uint8Array(buffer);
	var ibuffer = new Uint32Array(buffer);
	renderer.context.readPixels(
		pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2, 
		pickWindowSize, pickWindowSize, 
		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);
		
	// find closest hit inside pixelWindow boundaries
	var min = Number.MAX_VALUE;
	var hit = null;
	//console.log("finding closest hit");
	for(var u = 0; u < pickWindowSize; u++){
		for(var v = 0; v < pickWindowSize; v++){
			var offset = (u + v*pickWindowSize);
			var distance = Math.pow(u - (pickWindowSize-1) / 2, 2) + Math.pow(v - (pickWindowSize-1) / 2, 2);
			
			var pcIndex = pixels[4*offset + 3];
			pixels[4*offset + 3] = 0;
			var pIndex = ibuffer[offset];
			
			if((pIndex !== 0 || pcIndex !== 0) && distance < min){
				
				hit = {
					pIndex: pIndex,
					pcIndex: pcIndex
				};
				min = distance;
			}
		}
	}	
	
	if(hit){
		var point = {};
		
		var pc = nodes[hit.pcIndex];
		var geometry = pc.sceneNode.geometry;
		var attributes = geometry.attributes;
		
		for (var property in attributes) {
			if (attributes.hasOwnProperty(property)) {
				var values = geometry.attributes[property];
			
				if(property === "position"){
					var positionArray = geometry.attributes.position.array;
					var x = positionArray[3*hit.pIndex+0];
					var y = positionArray[3*hit.pIndex+1];
					var z = positionArray[3*hit.pIndex+2];
					var position = new THREE.Vector3(x, y, z);
					position.applyMatrix4(this.matrixWorld);
				
					point[property] = position;
				}else if(property === "indices"){
				
				}else{
					if(values.itemSize === 1){
						point[property] = values.array[i + j];
					}else{
						var value = [];
						for(var j = 0; j < values.itemSize; j++){
							value.push(values.array[i*values.itemSize + j]);
						}
						point[property] = value;
					}
				}
			}
		}
		
		
		return point;
	}else{
		return null;
	}
};


Potree.PointCloudArena4D.prototype.updateVisibilityTexture = function(material, visibleNodes){

	if(!material){
		return;
	}
	
	var texture = material.visibleNodesTexture;
    var data = texture.image.data;
	
	// copy array
	visibleNodes = visibleNodes.slice();
	
	// sort by level and number
	var sort = function(a, b){
		var la = a.geometryNode.level;
		var lb = b.geometryNode.level;
		var na = a.geometryNode.number;
		var nb = b.geometryNode.number;
		if(la != lb) return la - lb;
		if(na < nb) return -1;
		if(na > nb) return 1;
		return 0;
	};
	visibleNodes.sort(sort);
	
	var visibleNodeNames = [];
	for(var i = 0; i < visibleNodes.length; i++){
		//visibleNodeNames[visibleNodes[i].pcoGeometry.number] = true;
		visibleNodeNames.push(visibleNodes[i].geometryNode.number);
	}
	
	for(var i = 0; i < visibleNodes.length; i++){
		var node = visibleNodes[i];
		
		var b1 = 0;	// children
		var b2 = 0;	// offset to first child
		var b3 = 0;	// split 
		
		if(node.geometryNode.left && visibleNodeNames.indexOf(node.geometryNode.left.number) > 0){
			b1 += 1;
			b2 = visibleNodeNames.indexOf(node.geometryNode.left.number) - i;
		}
		if(node.geometryNode.right && visibleNodeNames.indexOf(node.geometryNode.right.number) > 0){
			b1 += 2;
			b2 = (b2 === 0) ? visibleNodeNames.indexOf(node.geometryNode.right.number) - i : b2;
		}
		
		if(node.geometryNode.split === "X"){
			b3 = 1;
		}else if(node.geometryNode.split === "Y"){
			b3 = 2;
		}else if(node.geometryNode.split === "Z"){
			b3 = 4;
		}
		
		
		data[i*3+0] = b1;
		data[i*3+1] = b2;
		data[i*3+2] = b3;
	}
	
	
	texture.needsUpdate = true;
};



Object.defineProperty(Potree.PointCloudArena4D.prototype, "progress", {
	get: function(){
		if(this.pcoGeometry.root){
			return Potree.PointCloudArena4DGeometryNode.nodesLoading > 0 ? 0 : 1;
		}else{
			return 0;
		}
	}
});
