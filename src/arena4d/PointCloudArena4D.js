
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
	
	//this.updateMatrixWorld();
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

Potree.PointCloudArena4D.prototype.getLevel = function(){
	return this.level;
};

Potree.PointCloudArena4D.prototype.toTreeNode = function(geometryNode, parent){
	var node = new Potree.PointCloudArena4DNode();
	var sceneNode = new THREE.Points(geometryNode.geometry, this.material);
	
	node.geometryNode = geometryNode;
	node.sceneNode = sceneNode;
	node.pointcloud = this;
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
	var bbSize = this.boundingBox.getSize();
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
		
		if(_ray.intersectsSphere(sphere)){
			nodesOnRay.push(node);
		}
		//if(_ray.isIntersectionBox(box)){
		//	nodesOnRay.push(node);
		//}
	}
	
	return nodesOnRay;
};

Potree.PointCloudArena4D.prototype.pick = function(renderer, camera, ray, params){
	let gl = renderer.context;
	
	let compileMaterial = function(material){
		if(material._glstate === undefined){
			material._glstate = {};
		}
		
		let glstate = material._glstate;
		
		// VERTEX SHADER
		let vs = gl.createShader(gl.VERTEX_SHADER);
		{
			gl.shaderSource(vs, material.vertexShader);
			gl.compileShader(vs);
			
			let success = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
			if (!success) {
				console.error("could not compile vertex shader:");
				
				let log = gl.getShaderInfoLog(vs);
				console.error(log, material.vertexShader);
				
				return;
			}
		}
		
		// FRAGMENT SHADER
		let fs = gl.createShader(gl.FRAGMENT_SHADER);
		{
			gl.shaderSource(fs, material.fragmentShader);
			gl.compileShader(fs);
			
			let success = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
			if (!success) {
				console.error("could not compile fragment shader:");
				console.error(material.fragmentShader);
				
				return;
			}
		}
		
		// PROGRAM
		var program = gl.createProgram();
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		var success = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (!success) {
			console.error("could not compile shader:");
			console.error(material.vertexShader);
			console.error(material.fragmentShader);
				
			return;
		}
		
		glstate.program = program;
		
		gl.useProgram( program );
		
		{ // UNIFORMS
			let uniforms = {};
			let n = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

			for(let i = 0; i < n; i++){
				var uniform = gl.getActiveUniform(program, i);
				var name = uniform.name;
				var loc = gl.getUniformLocation(program, name);

				uniforms[name] = loc;
			}
			
			glstate.uniforms = uniforms;
			glstate.textures = {};
		}
	};
	
	if(Potree.PointCloudArena4D.pickMaterial === undefined){
		Potree.PointCloudArena4D.pickMaterial = new Potree.PointCloudMaterial({treeType: Potree.TreeType.KDTREE});
		Potree.PointCloudArena4D.pickMaterial.pointColorType = Potree.PointColorType.POINT_INDEX;		
		//Potree.PointCloudArena4D.pickMaterial.pointColorType = Potree.PointColorType.COLOR;
		
		compileMaterial(Potree.PointCloudArena4D.pickMaterial);
	}
	
	let pickMaterial = Potree.PointCloudArena4D.pickMaterial;
	
	var params = params || {};
	let pickWindowSize = params.pickWindowSize || 17;
	let pickOutsideClipRegion = params.pickOutsideClipRegion || false;
	
	let nodes = this.nodesOnRay(this.visibleNodes, ray);
	
	if(nodes.length === 0){
		return null;
	}
	
	
	
	{ // update pick material
		let doRecompile = false;
	
		if(pickMaterial.pointSizeType !== this.material.pointSizeType){
			pickMaterial.pointSizeType = this.material.pointSizeType;
			doRecompile = true;
		}
		
		if(pickMaterial.pointShape !== this.material.pointShape){
			pickMaterial.pointShape = this.material.pointShape;
			doRecompile = true;
		}
		
		if(pickMaterial.interpolate !== this.material.interpolate){
			pickMaterial.interpolate = this.material.interpolate;
			doRecompile = true;
		}
		
		pickMaterial.size = this.material.size;
		pickMaterial.minSize = this.material.minSize;
		pickMaterial.maxSize = this.material.maxSize;
		pickMaterial.classification = this.material.classification;
		
		if(pickOutsideClipRegion){
			pickMaterial.clipMode = Potree.ClipMode.DISABLED;
		}else{
			pickMaterial.clipMode = this.material.clipMode;
			if(this.material.clipMode === Potree.ClipMode.CLIP_OUTSIDE){
				pickMaterial.setClipBoxes(this.material.clipBoxes);
			}else{
				pickMaterial.setClipBoxes([]);
			}
		}
		
		this.updateMaterial(pickMaterial, nodes, camera, renderer);
		
		if(doRecompile){
			
			compileMaterial(pickMaterial);
			
		};
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
	
	gl.enable(gl.SCISSOR_TEST);
	gl.scissor(pixelPos.x - (pickWindowSize - 1) / 2, pixelPos.y - (pickWindowSize - 1) / 2,pickWindowSize,pickWindowSize);
	gl.disable(gl.SCISSOR_TEST);
	
	renderer.setRenderTarget( this.pickTarget );
	
	renderer.state.setDepthTest( pickMaterial.depthTest );
	renderer.state.setDepthWrite( pickMaterial.depthWrite );
	renderer.state.setBlending( THREE.NoBlending );
	
	renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
	
	let glstate = pickMaterial._glstate;
	let program = glstate.program;
	let uniforms = glstate.uniforms;
	gl.useProgram(program);
		
	gl.uniformMatrix4fv(uniforms["projectionMatrix"], false, new Float32Array(camera.projectionMatrix.elements));
	gl.uniformMatrix4fv(uniforms["viewMatrix"], false, new Float32Array(camera.matrixWorldInverse.elements));
	
	{
		if(glstate.textures.visibleNodes === undefined){
			let image = pickMaterial.visibleNodesTexture.image;
			let texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			//gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);
			glstate.textures.visibleNodes = {
				id: texture
			};
		}
		
		let texture = glstate.textures.visibleNodes.id;
		let image = pickMaterial.visibleNodesTexture.image;
		
		gl.uniform1i(uniforms["visibleNodes"], 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture( gl.TEXTURE_2D, texture );
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
		
	}
	
	let bbSize = this.pcoGeometry.boundingBox.getSize();
	
	gl.uniform1f(uniforms["fov"], this.material.fov);
	gl.uniform1f(uniforms["screenWidth"], this.material.screenWidth);
	gl.uniform1f(uniforms["screenHeight"], this.material.screenHeight);
	gl.uniform1f(uniforms["spacing"], this.material.spacing);
	gl.uniform1f(uniforms["near"], this.material.near);
	gl.uniform1f(uniforms["far"], this.material.far);
	gl.uniform1f(uniforms["size"], this.material.size);
	gl.uniform1f(uniforms["minSize"], this.material.minSize);
	gl.uniform1f(uniforms["maxSize"], this.material.maxSize);
	gl.uniform1f(uniforms["octreeSize"], this.pcoGeometry.boundingBox.getSize().x);
	gl.uniform3f(uniforms["bbSize"], bbSize.x, bbSize.y, bbSize.z);
	
	{
		let apPosition = gl.getAttribLocation(program, "position");
		let apNormal = gl.getAttribLocation(program, "normal");
		let apClassification = gl.getAttribLocation(program, "classification");
		let apIndices = gl.getAttribLocation(program, "indices");
		
		gl.enableVertexAttribArray( apPosition );
		gl.enableVertexAttribArray( apNormal );
		gl.enableVertexAttribArray( apClassification );		
		gl.enableVertexAttribArray( apIndices );
	}
	
	for(let i = 0; i < nodes.length; i++){
		let node = nodes[i];
		let object = node.sceneNode;
		let geometry = object.geometry;
		
		pickMaterial.pcIndex = i + 1;
		
		let modelView = new THREE.Matrix4().multiplyMatrices(camera.matrixWorldInverse, object.matrixWorld);
		gl.uniformMatrix4fv(uniforms["modelMatrix"], false, new Float32Array(object.matrixWorld.elements));
		gl.uniformMatrix4fv(uniforms["modelViewMatrix"], false, new Float32Array(modelView.elements));
		
		let apPosition = gl.getAttribLocation(program, "position");
		let apNormal = gl.getAttribLocation(program, "normal");
		let apClassification = gl.getAttribLocation(program, "classification");
		let apIndices = gl.getAttribLocation(program, "indices");
		
		let positionBuffer = renderer.properties.get(geometry.attributes.position).__webglBuffer;
		
		if(positionBuffer === undefined){
			continue;
		}
		
		let oldstate = {
			enabled: []
		};
		
		// TODO hack
		for(let i = 0; i < 16; i++){
			oldstate.enabled[i] = gl.getVertexAttrib(i, gl.VERTEX_ATTRIB_ARRAY_ENABLED);
			gl.disableVertexAttribArray(i);
		}
		
		gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
		gl.vertexAttribPointer( apPosition, 3, gl.FLOAT, false, 0, 0 ); 
		gl.enableVertexAttribArray(apPosition);
		
		let indexBuffer = renderer.properties.get(geometry.attributes.indices).__webglBuffer;
		gl.bindBuffer( gl.ARRAY_BUFFER, indexBuffer );
		gl.vertexAttribPointer( apIndices, 4, gl.UNSIGNED_BYTE, true, 0, 0 ); 
		gl.enableVertexAttribArray(apIndices);
		
		gl.uniform1f(uniforms["pcIndex"], pickMaterial.pcIndex);

		let numPoints = node.getNumPoints();
		if(numPoints > 0){
			gl.drawArrays( gl.POINTS, 0, node.getNumPoints());		
		}
		
		// TODO hack
		for(let i = 0; i < 16; i++){
			gl.disableVertexAttribArray(i);
		}
		gl.enableVertexAttribArray(0);
		gl.enableVertexAttribArray(1);
	}
	
	var pixelCount = pickWindowSize * pickWindowSize;
	var buffer = new ArrayBuffer(pixelCount*4);
	var pixels = new Uint8Array(buffer);
	var ibuffer = new Uint32Array(buffer);
	renderer.context.readPixels(
		pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2, 
		pickWindowSize, pickWindowSize, 
		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);


	//{ // open window with image
	//	var br = new ArrayBuffer(width*height*4);
	//	var bp = new Uint8Array(br);
	//	renderer.context.readPixels( 0, 0, width, height, 
	//		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, bp);
	//	
	//	var img = Potree.utils.pixelsArrayToImage(bp, width, height);
	//	var screenshot = img.src;
	//	
	//	var w = window.open();
	//	w.document.write('<img src="'+screenshot+'"/>');
	//}
		
		
	//{ // show big render target for debugging purposes
	//	var br = new ArrayBuffer(width*height*4);
	//	var bp = new Uint8Array(br);
	//	renderer.context.readPixels( 0, 0, width, height, 
	//		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, bp);
	//
	//	var img = pixelsArrayToImage(bp, width, height);
	//	img.style.boder = "2px solid red";
	//	img.style.position = "absolute";
	//	img.style.top  = "0px";
	//	img.style.width = width + "px";
	//	img.style.height = height + "px";
	//	img.onclick = function(){document.body.removeChild(img)};
	//	document.body.appendChild(img);
	//}
		
	// find closest hit inside pixelWindow boundaries
	var min = Number.MAX_VALUE;
	var hit = null;
	//console.log("finding closest hit");
	for(let u = 0; u < pickWindowSize; u++){
		for(var v = 0; v < pickWindowSize; v++){
			var offset = (u + v*pickWindowSize);
			var distance = Math.pow(u - (pickWindowSize-1) / 2, 2) + Math.pow(v - (pickWindowSize-1) / 2, 2);
			
			var pcIndex = pixels[4*offset + 3];
			pixels[4*offset + 3] = 0;
			var pIndex = ibuffer[offset];
			
			if((pIndex !== 0 || pcIndex !== 0) && distance < min){
				
				hit = {
					pIndex: pIndex,
					pcIndex: pcIndex - 1
				};
				min = distance;
			}
		}
	}	
	
	if(hit){
		var point = {};
		
		var pc = nodes[hit.pcIndex].sceneNode;
		var attributes = pc.geometry.attributes;
		
		for (var property in attributes) {
			if (attributes.hasOwnProperty(property)) {
				var values = pc.geometry.attributes[property];
			
				if(property === "position"){
					var positionArray = values.array;
					var x = positionArray[3*hit.pIndex+0];
					var y = positionArray[3*hit.pIndex+1];
					var z = positionArray[3*hit.pIndex+2];
					var position = new THREE.Vector3(x, y, z);
					position.applyMatrix4(this.matrixWorld);
				
					point[property] = position;
				}else if(property === "indices"){
				
				}else{
					if(values.itemSize === 1){
						point[property] = values.array[hit.pIndex];
					}else{
						var value = [];
						for(var j = 0; j < values.itemSize; j++){
							value.push(values.array[values.itemSize*hit.pIndex + j]);
						}
						point[property] = value;
					}
				}
			}
		}
		
		
		return point;
		//return null;
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
