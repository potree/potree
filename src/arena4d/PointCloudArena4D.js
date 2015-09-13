
Potree.PointCloudArena4DProxyNode = function(geometryNode){
	THREE.Object3D.call( this );
	
	this.geometryNode = geometryNode;
	this.pcoGeometry = geometryNode;
	this.boundingBox = geometryNode.boundingBox;
	this.boundingSphere = geometryNode.boundingSphere;
	this.number = geometryNode.name;
	this.numPoints = geometryNode.numPoints;
	this.level = geometryNode.level;
}

Potree.PointCloudArena4DProxyNode.prototype = Object.create(THREE.Object3D.prototype);



Potree.PointCloudArena4D = function(geometry){
	THREE.Object3D.call( this );
	
	this.root = null;
	
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
	
	this.pickTarget;
	this.pickMaterial;
	
	this.updateMatrixWorld();
};

Potree.PointCloudArena4D.prototype = Object.create(THREE.Object3D.prototype);

Potree.PointCloudArena4D.prototype.updateMaterial = function(camera, renderer){
	this.material.fov = camera.fov * (Math.PI / 180);
	this.material.screenWidth = renderer.domElement.clientWidth;
	this.material.screenHeight = renderer.domElement.clientHeight;
	this.material.spacing = this.pcoGeometry.spacing;
	this.material.near = camera.near;
	this.material.far = camera.far;
	
	// reduce shader source updates by setting maxLevel slightly higher than actually necessary
	if(this.maxLevel > this.material.levels){
		this.material.levels = this.maxLevel + 2;
	}
	
	this.material.minSize = 3;
	
	var bbSize = this.boundingBox.size();
	this.material.bbSize = [bbSize.x, bbSize.y, bbSize.z];
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
}

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

var dbgFullyInside = 0;

Potree.PointCloudArena4D.prototype.update = function(camera, renderer){
	var geometry = this.pcoGeometry;

	if(!geometry.root){
		return;
	}else if(!this.rootProxyGenerated){
		var rootProxy = new Potree.PointCloudArena4DProxyNode(this.pcoGeometry.root);
		this.add(rootProxy);
		this.rootProxyGenerated = true;
	}
	
	this.updateMatrixWorld(true);
	
	this.loadQueue = [];
	this.visibleNodes = [];
	this.numVisibleNodes = 0;
	this.numVisiblePoints = 0;
	dbgFullyInside = 0;
	
	if(!this.showBoundingBox){
		for(var i = 0; i < this.boundingBoxNodes.length; i++){
			var bbNode = this.boundingBoxNodes[i];
			this.remove(bbNode);
			bbNode.geometry.dispose();
		}
	}
	
	this.updateMaterial(camera, renderer);
	
	this.hideDescendants(this.children[0]);
	
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
	
	var stack = [];
	stack.push({node: this.children[0], weight: 1});
	while(stack.length > 0){
		var element = stack.shift();
		var node = element.node;
		var weight = element.weight;

		//if(node.level > 3){
		//	continue;
		//}
		
		node.matrixWorld.multiplyMatrices( this.matrixWorld, node.matrix );
		
		var box = node.boundingBox.clone();
		//box.min.sub(this.boundingBox.min);
		//box.max.sub(this.boundingBox.min);
		var insideFrustum = frustum.intersectsBox(box);
		
		var visible = insideFrustum;	
		node.visible = visible;
		
		
		
		if(!visible){
			continue;
		}
		
		var pointsInside = 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.min.x, box.min.y, box.min.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.min.x, box.min.y, box.max.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.min.x, box.max.y, box.min.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.min.x, box.max.y, box.max.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.max.x, box.min.y, box.min.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.max.x, box.min.y, box.max.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.max.x, box.max.y, box.min.z)) ? 1 : 0;
		//pointsInside += frustum.containsPoint(new THREE.Vector3(box.max.x, box.max.y, box.max.z)) ? 1 : 0;
		
		if(pointsInside === 8){
			dbgFullyInside++;
		}
		
	
		if (node instanceof Potree.PointCloudArena4DProxyNode) {
			var geometryNode = node.geometryNode;
			if(geometryNode.loaded === true){
				this.replaceProxy(node);
			}else{
				this.loadQueue.push(element);
			}
		}else if(node instanceof THREE.PointCloud){
			if(this.numVisiblePoints + node.pcoGeometry.numPoints > pointcloud.visiblePointsTarget){
				break;
			}
			this.numVisibleNodes++;
			this.numVisiblePoints += node.pcoGeometry.numPoints;
			this.visibleNodes.push({node: node, weight: weight});

			if(this.showBoundingBox && !node.boundingBoxNode){
				var boxHelper = new THREE.BoxHelper(node);
				this.add(boxHelper);
				this.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrixWorld.copy(node.matrixWorld);
			}else if(this.showBoundingBox && node.boundingBoxNode){
				node.boundingBoxNode.visible = true;
			}else if(!this.showBoundingBox){
				delete node.boundingBoxNode;
			}
			
			for(var i = 0; i < node.children.length; i++){
				var child = node.children[i];
				//var box = child.geometryNode.boundingBox;
				var sphere = child.boundingSphere;
				var distance = sphere.center.distanceTo(camObjPos);
				
				var radius = box.size().length() / 2;
				var fov = camera.fov / 2 * Math.PI / 180.0;
				var pr = 1 / Math.tan(fov) * radius / Math.sqrt(distance * distance - radius * radius);
				
				if(distance < radius){
					pr = Number.MAX_VALUE;
				}
				
				var screenPixelRadius = renderer.domElement.clientHeight * pr;
				if(screenPixelRadius < this.minimumNodePixelSize){
					continue;
				}
				
				var weight = pr;
				
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
					
					stack.splice(ipos, 0, {node: child, weight: weight});
				}
				
				//stack.push({node: child, weight: 1});
			}
		}
	}
	
	
	
	this.updateLoadQueue();
	
	this.maxLevel = 0;
	for(var i = 0; i < this.visibleNodes.length; i++){
		this.maxLevel = Math.max(this.visibleNodes[i].node.pcoGeometry.level, this.maxLevel);
	}
	
	var vn = [];
	for(var i = 0; i < this.visibleNodes.length; i++){
		vn.push(this.visibleNodes[i].node);
	}
	this.updateVisibilityTexture(this.material, vn);
	
	//{ // only show nodes on ray
	//	var vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
	//	vector.unproject(camera);
    //
	//	var direction = vector.sub(camera.position).normalize();
	//	var ray = new THREE.Ray(camera.position, direction);
	//		
	//		
	//	var nodesOnRay = pointcloud.nodesOnRay(pointcloud.visibleNodes, ray);	
	//	
	//	for(var i = 0; i < this.visibleNodes.length; i++){
	//		var node = this.visibleNodes[i].node;
	//		
	//		node.visible = false;
	//		if(node.boundingBoxNode){
	//			node.boundingBoxNode.visible = false;
	//		}
	//	}
	//	
	//	for(var i = 0; i < nodesOnRay.length; i++){
	//		var node = nodesOnRay[i];
	//	
	//		node.visible = true;
	//		this.numVisiblePoints += node.pcoGeometry.numPoints;
	//		if(node.boundingBoxNode){
	//			node.boundingBoxNode.visible = true;
	//		}
	//	}
	//	this.numVisibleNodes = nodesOnRay.length;
	//	
	//	var pickPos = this.pick(renderer, camera, ray, {});
	//	if(pickPos){
	//		var sg = new THREE.SphereGeometry(0.2);
	//		var sm = new THREE.Mesh(sg);
	//		sm.position.copy(pickPos.position);
	//		scene.add(sm);
	//	}
	//}
	
};

Potree.PointCloudArena4D.prototype.replaceProxy = function(proxy){
	
	var geometryNode = proxy.geometryNode;
	if(geometryNode.loaded === true){
		var geometry = geometryNode.geometry;
		var node = new THREE.PointCloud(geometry, this.material);
		node.number = proxy.number;
		node.numPoints = proxy.numPoints;
		node.boundingBox = geometryNode.boundingBox;
		node.boundingSphere = geometryNode.boundingSphere;
		node.pcoGeometry = geometryNode;
		var parent = proxy.parent;
		parent.remove(proxy);
		parent.add(node);
		//node.position.copy(node.boundingBox.min);
		//node.position.sub(this.pcoGeometry.boundingBox.min);
		//var current = parent;
		//while(!(current instanceof Potree.PointCloudArena4D)){
		//	node.position.sub(current.boundingBox.min);
		//	
		//	current = current.parent;
		//}
		
		node.updateMatrix();
		
		//console.log(geometryNode.number + ": " + node.position.x + ", " + node.position.y + ", " + node.position.z);
		
		node.matrixWorld.multiplyMatrices( this.matrixWorld, node.matrix );
		
		if(geometryNode.left){
			var child = geometryNode.left;
			var childProxy = new Potree.PointCloudArena4DProxyNode(child);
			node.add(childProxy);
		}
		if(geometryNode.right){
			var child = geometryNode.right;
			var childProxy = new Potree.PointCloudArena4DProxyNode(child);
			node.add(childProxy);
		}
		
		return node;
	}
}

Potree.PointCloudArena4D.prototype.updateLoadQueue = function(vn){
	if(this.loadQueue.length > 0){
		if(this.loadQueue.length >= 2){
			this.loadQueue.sort(function(a,b){return b.weight - a.weight});
		}
		
		for(var i = 0; i < Math.min(5, this.loadQueue.length); i++){
			this.loadQueue[i].node.geometryNode.load();
		}
	}
}

Potree.PointCloudArena4D.prototype.getVisibleGeometry = function(camera){
	var visibleGeometry = [];
	
	// create frustum in object space
	camera.updateMatrixWorld();
	var frustum = new THREE.Frustum();
	var viewI = camera.matrixWorldInverse;
	var world = this.matrixWorld;
	var proj = camera.projectionMatrix;
	var fm = new THREE.Matrix4().multiply(proj).multiply(viewI).multiply(world);
	frustum.setFromMatrix( fm );
	
	var stack = [];
	var pointCount = 0;
	
	stack.push(this.pcoGeometry.root);
	while(stack.length > 0){
		if(visibleGeometry.length > 12){
			break;
		}
	
		var node = stack.shift();
		
		var box = node.boundingBox.clone();
		box.max.sub(box.min);
		box.min.sub(box.min);
		var insideFrustum = frustum.intersectsBox(box);
		
		var visible = insideFrustum;
		
		if(!visible){
			continue;
		}
		
		if(pointCount + node.numPoints > this.visiblePointsTarget){
			break;
		}
		
		pointCount += node.numPoints;
		
		visibleGeometry.push(node);
		
		if(node.loaded){
			if(node.left){
				stack.push(node.left);
			}
			
			if(node.right){
				stack.push(node.right);
			}
		}
	}
	
	return visibleGeometry;
	
};

Potree.PointCloudArena4D.prototype.nodesOnRay = function(nodes, ray){
	var nodesOnRay = [];

	var _ray = ray.clone();
	for(var i = 0; i < nodes.length; i++){
		var node = nodes[i].node;
		//var inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
		var sphere = node.boundingSphere.clone().applyMatrix4(node.matrixWorld);
		var box = node.boundingBox.clone().applyMatrix4(node.matrixWorld);
		
		
		if(_ray.isIntersectionBox(box)){
		//if(_ray.isIntersectionSphere(sphere)){
			nodesOnRay.push(node);
		}
	}
	
	return nodesOnRay;
};

Potree.PointCloudArena4D.prototype.pick = function(renderer, camera, ray, params){

	var params = params || {};
	var pickWindowSize = params.pickWindowSize || 17;
	
	var nodes = this.nodesOnRay(this.visibleNodes, ray);
	
	if(nodes.length === 0){
		return null;
	}
	
	var width = Math.ceil(renderer.domElement.clientWidth);
	var height = Math.ceil(renderer.domElement.clientHeight);
	
	var pixelPos = new THREE.Vector3().addVectors(camera.position, ray.direction).project(camera);
	pixelPos.addScalar(1).multiplyScalar(0.5);
	pixelPos.x *= width;
	pixelPos.y *= height
	
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
	
	

	var _gl = renderer.context;
	
	_gl.enable(_gl.SCISSOR_TEST);
	_gl.scissor(pixelPos.x - (pickWindowSize - 1) / 2, pixelPos.y - (pickWindowSize - 1) / 2,pickWindowSize,pickWindowSize);
	_gl.disable(_gl.SCISSOR_TEST);
	
	var material = this.pickMaterial;
	
	renderer.setRenderTarget( this.pickTarget );
	
	renderer.state.setDepthTest( material.depthTest );
	renderer.state.setDepthWrite( material.depthWrite )
	renderer.state.setBlending( THREE.NoBlending );
	
	renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
	
	//TODO: UGLY HACK CHAMPIONSHIP SUBMISSION!! drawing first node does not work properly so we draw it twice.
	if(nodes.length > 0){
		nodes.push(nodes[0]);
	}
	
	for(var i = 0; i < nodes.length; i++){
		var object = nodes[i];
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
		var attributes = pc.geometry.attributes;
		
		for (var property in attributes) {
			if (attributes.hasOwnProperty(property)) {
				var values = geometry.attributes[property];
			
				if(property === "position"){
					var positionArray = pc.geometry.attributes.position.array;
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
		var la = a.pcoGeometry.level;
		var lb = b.pcoGeometry.level;
		var na = a.pcoGeometry.number;
		var nb = b.pcoGeometry.number;
		if(la != lb) return la - lb;
		if(na < nb) return -1;
		if(na > nb) return 1;
		return 0;
	};
	visibleNodes.sort(sort);
	
	var visibleNodeNames = [];
	for(var i = 0; i < visibleNodes.length; i++){
		//visibleNodeNames[visibleNodes[i].pcoGeometry.number] = true;
		visibleNodeNames.push(visibleNodes[i].pcoGeometry.number);
	}
	
	for(var i = 0; i < visibleNodes.length; i++){
		var node = visibleNodes[i];
		
		var b1 = 0;	// children
		var b2 = 0;	// offset to first child
		var b3 = 0;	// split 
		
		if(node.pcoGeometry.left && visibleNodeNames.indexOf(node.pcoGeometry.left.number) > 0){
			b1 += 1;
			b2 = visibleNodeNames.indexOf(node.pcoGeometry.left.number) - i;
		}
		if(node.pcoGeometry.right && visibleNodeNames.indexOf(node.pcoGeometry.right.number) > 0){
			b1 += 2;
			b2 = (b2 === 0) ? visibleNodeNames.indexOf(node.pcoGeometry.right.number) - i : b2;
		}
		
		if(node.pcoGeometry.split === "X"){
			b3 = 1;
		}else if(node.pcoGeometry.split === "Y"){
			b3 = 2;
		}else if(node.pcoGeometry.split === "Z"){
			b3 = 4;
		}
		
		
		data[i*3+0] = b1;
		data[i*3+1] = b2;
		data[i*3+2] = b3;
	}
	
	
	texture.needsUpdate = true;
}



Object.defineProperty(Potree.PointCloudArena4D.prototype, "progress", {
	get: function(){
		if(this.pcoGeometry.root){
			return Potree.PointCloudArena4DGeometryNode.nodesLoading > 0 ? 0 : 1;
		}else{
			return 0;
		}
	}
});

//Potree.PointCloudArena4D.prototype.updateMatrixWorld = function( force ){
//	//node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );
//	
//	if ( this.matrixAutoUpdate === true ) this.updateMatrix();
//
//	if ( this.matrixWorldNeedsUpdate === true || force === true ) {
//
//		if ( this.parent === undefined ) {
//
//			this.matrixWorld.copy( this.matrix );
//
//		} else {
//
//			this.matrixWorld.multiplyMatrices( this.parent.matrixWorld, this.matrix );
//
//		}
//
//		this.matrixWorldNeedsUpdate = false;
//
//		force = true;
//
//	}
//};