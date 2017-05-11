

Potree.PointCloudOctreeNode = class PointCloudOctreeNode extends Potree.PointCloudTreeNode{
	
	constructor(){
		super();
		
		this.children = {};
		this.sceneNode = null;
		this.octree = null;
	}
	
	getNumPoints(){
		return this.geometryNode.numPoints;
	};
	
	isLoaded(){
		return true;
	};
	
	isTreeNode(){
		return true;
	};
	
	isGeometryNode(){
		return false;
	};
	
	getLevel(){
		return this.geometryNode.level;
	};
	
	getBoundingSphere(){
		return this.geometryNode.boundingSphere;
	};
	
	getBoundingBox(){
		return this.geometryNode.boundingBox;
	};
	
	getChildren(){
		let children = [];
		
		for(let i = 0; i < 8; i++){
			if(this.children[i]){
				children.push(this.children[i]);
			}
		}
		
		return children;
	};
};


Potree.PointCloudOctree = class extends Potree.PointCloudTree{
	
	constructor(geometry, material){
		super();
		
		this.pcoGeometry = geometry;
		this.boundingBox = this.pcoGeometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		this.material = material || new Potree.PointCloudMaterial();
		this.visiblePointsTarget = 2*1000*1000;
		this.minimumNodePixelSize = 150;
		this.level = 0;
		this.position.copy(geometry.offset);
		this.updateMatrix();
		
		this.showBoundingBox = false;
		this.boundingBoxNodes = [];
		this.loadQueue = [];
		this.visibleBounds = new THREE.Box3();	
		this.visibleNodes = [];
		this.visibleGeometry = [];
		this.pickTarget = null;
		this.generateDEM = false;
		this.profileRequests = [];
		this.name = "";
		
		// TODO read projection from file instead
		this.projection = geometry.projection;
		
		this.root = this.pcoGeometry.root;
	}
	
	
	setName(name){
		if(this.name !== name){
			this.name = name;
			this.dispatchEvent({type: "name_changed", name: name, pointcloud: this});
		}
	}
	
	getName(){
		return name;
	}
	
	toTreeNode(geometryNode, parent){
		let node = new Potree.PointCloudOctreeNode();
		
		//if(geometryNode.name === "r40206"){
		//	console.log("creating node for r40206");
		//}
		let sceneNode = new THREE.Points(geometryNode.geometry, this.material);
		sceneNode.name = geometryNode.name;
		
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.pointcloud = this;
		node.children = {};
		for(let key in geometryNode.children){
			node.children[key] = geometryNode.children[key];
		}
		
		if(!parent){
			this.root = node;
			this.add(sceneNode);
		}else{
			let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.add(sceneNode);
			parent.children[childIndex] = node;
		}
		
		let disposeListener = function(){
			let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.remove(node.sceneNode);
			parent.children[childIndex] = geometryNode;
		}
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);
		
		return node;
	}
	
	updateVisibleBounds(){
		let leafNodes = [];
		for(let i = 0; i < this.visibleNodes.length; i++){
			let node = this.visibleNodes[i];
			let isLeaf = true;
			
			for(let j = 0; j < node.children.length; j++){
				let child = node.children[j];
				if(child instanceof Potree.PointCloudOctreeNode){
					isLeaf = isLeaf && !child.sceneNode.visible;
				}else if(child instanceof Potree.PointCloudOctreeGeometryNode){
					isLeaf = true;
				}
			}
			
			if(isLeaf){
				leafNodes.push(node);
			}
		}
		
		this.visibleBounds.min = new THREE.Vector3( Infinity, Infinity, Infinity );
		this.visibleBounds.max = new THREE.Vector3( - Infinity, - Infinity, - Infinity );
		for(let i = 0; i < leafNodes.length; i++){
			let node = leafNodes[i];
			
			this.visibleBounds.expandByPoint(node.getBoundingBox().min);
			this.visibleBounds.expandByPoint(node.getBoundingBox().max);
		}
	}
	
	updateMaterial(material, visibleNodes, camera, renderer){
		material.fov = camera.fov * (Math.PI / 180);
		material.screenWidth = renderer.domElement.clientWidth;
		material.screenHeight = renderer.domElement.clientHeight;
		material.spacing = this.pcoGeometry.spacing * Math.max(this.scale.x, this.scale.y, this.scale.z);
		material.near = camera.near;
		material.far = camera.far;
		material.uniforms.octreeSize.value = this.pcoGeometry.boundingBox.getSize().x;
		
		// update visibility texture
		if(material.pointSizeType >= 0){
			if(material.pointSizeType === Potree.PointSizeType.ADAPTIVE 
				|| material.pointColorType === Potree.PointColorType.LOD){
				
				this.updateVisibilityTexture(material, visibleNodes);
			}
		}
	}
	
	updateVisibilityTexture(material, visibleNodes){
		if(!material){
			return;
		}
		
		let texture = material.visibleNodesTexture;
		let data = texture.image.data;
		
		// copy array
		visibleNodes = visibleNodes.slice();
		
		// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
		let sort = function(a, b){
			let na = a.geometryNode.name;
			let nb = b.geometryNode.name;
			if(na.length != nb.length) return na.length - nb.length;
			if(na < nb) return -1;
			if(na > nb) return 1;
			return 0;
		};
		visibleNodes.sort(sort);

		
		for(let i = 0; i < visibleNodes.length; i++){
			let node = visibleNodes[i];
			
			let children = [];
			for(let j = 0; j < 8; j++){
				let child = node.children[j];
				if(child instanceof Potree.PointCloudOctreeNode && child.sceneNode.visible && visibleNodes.indexOf(child) >= 0){
					children.push(child);
				}
			}
			children.sort(function(a, b){
				if(a.geometryNode.name < b.geometryNode.name) return -1;
				if(a.geometryNode.name > b.geometryNode.name) return 1;
				return 0;
			});
			
			data[i*3 + 0] = 0;
			data[i*3 + 1] = 0;
			data[i*3 + 2] = 0;
			for(let j = 0; j < children.length; j++){
				let child = children[j];
				let index = parseInt(child.geometryNode.name.substr(-1));
				data[i*3 + 0] += Math.pow(2, index);
				
				if(j === 0){
					let vArrayIndex = visibleNodes.indexOf(child);
					data[i*3 + 1] = vArrayIndex - i;
				}
				
			}
		}
		
		
		texture.needsUpdate = true;
	}
	
	nodeIntersectsProfile(node, profile){
		let bbWorld = node.boundingBox.clone().applyMatrix4(this.matrixWorld);
		let bsWorld = bbWorld.getBoundingSphere();
		
		for(let i = 0; i < profile.points.length - 1; i++){
			let start = new THREE.Vector3(profile.points[i].x, bsWorld.center.y, profile.points[i].z);
			let end = new THREE.Vector3(profile.points[i+1].x, bsWorld.center.y, profile.points[i+1].z);
			
			let ray1 = new THREE.Ray(start, new THREE.Vector3().subVectors(end, start).normalize());
			let ray2 = new THREE.Ray(end, new THREE.Vector3().subVectors(start, end).normalize());
			
			if(ray1.intersectsSphere(bsWorld) && ray2.intersectsSphere(bsWorld)){
				return true;
			}
		}
		
		return false;
	}
	
	nodesOnRay(nodes, ray){
		let nodesOnRay = [];

		let _ray = ray.clone();
		for(let i = 0; i < nodes.length; i++){
			let node = nodes[i];
			//var inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
			let sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
			
			if(_ray.intersectsSphere(sphere)){
				nodesOnRay.push(node);
			}
		}
		
		return nodesOnRay;
	}
	
	updateMatrixWorld( force ){
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
	}
	
	hideDescendants(object){
		let stack = [];
		for(let i = 0; i < object.children.length; i++){
			let child = object.children[i];
			if(child.visible){
				stack.push(child);
			}
		}
		
		while(stack.length > 0){
			let object = stack.shift();
			
			object.visible = false;
			
			for(let i = 0; i < object.children.length; i++){
				let child = object.children[i];
				if(child.visible){
					stack.push(child);
				}
			}
		}
	}
	
	moveToOrigin(){
		this.position.set(0,0,0);
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.set(0,0,0).sub(tBox.getCenter());
	};

	moveToGroundPlane(){
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.y += -tBox.min.y;
	};

	getBoundingBoxWorld(){
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		
		return tBox;
	};
	
	/**
	 * returns points inside the profile points
	 *
	 * maxDepth:		search points up to the given octree depth
	 *
	 *
	 * The return value is an array with all segments of the profile path
	 *  var segment = {
	 * 		start: 	THREE.Vector3,
	 * 		end: 	THREE.Vector3,
	 * 		points: {}
	 * 		project: function()
	 *  };
	 *
	 * The project() function inside each segment can be used to transform
	 * that segments point coordinates to line up along the x-axis.
	 *
	 *
	 */
	getPointsInProfile(profile, maxDepth, callback){

		if(callback){
			let request = new Potree.ProfileRequest(this, profile, maxDepth, callback);
			this.profileRequests.push(request);
			
			return request;
		}

		let points = {
			segments: [],
			boundingBox: new THREE.Box3(),
			projectedBoundingBox: new THREE.Box2()
		};
		
		// evaluate segments
		for(let i = 0; i < profile.points.length - 1; i++){
			let start = profile.points[i];
			let end = profile.points[i+1];
			let ps = this.getProfile(start, end, profile.width, maxDepth);
			
			let segment = {
				start: start,
				end: end,
				points: ps,
				project: null
			};
			
			points.segments.push(segment);
			
			points.boundingBox.expandByPoint(ps.boundingBox.min);
			points.boundingBox.expandByPoint(ps.boundingBox.max);
		}
		
		// add projection functions to the segments
		let mileage = new THREE.Vector3();
		for(let i = 0; i < points.segments.length; i++){
			let segment = points.segments[i];
			let start = segment.start;
			let end = segment.end;
			
			let project = function(_start, _end, _mileage, _boundingBox){
				let start = _start;
				let end = _end;
				let mileage = _mileage;
				let boundingBox = _boundingBox;
				
				let xAxis = new THREE.Vector3(1,0,0);
				let dir = new THREE.Vector3().subVectors(end, start);
				dir.y = 0;
				dir.normalize();
				let alpha = Math.acos(xAxis.dot(dir));
				if(dir.z > 0){
					alpha = -alpha;
				}
				
				
				return function(position){
							
					let toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -boundingBox.min.y, -start.z);
					let alignWithX = new THREE.Matrix4().makeRotationY(-alpha);
					let applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

					let pos = position.clone();
					pos.applyMatrix4(toOrigin);
					pos.applyMatrix4(alignWithX);
					pos.applyMatrix4(applyMileage);
					
					return pos;
				};
				
			}(start, end, mileage.clone(), points.boundingBox.clone());
			
			segment.project = project;
			
			mileage.x += new THREE.Vector3(start.x, 0, start.z).distanceTo(new THREE.Vector3(end.x, 0, end.z));
			mileage.y += end.y - start.y;
		}
		
		points.projectedBoundingBox.min.x = 0;
		points.projectedBoundingBox.min.y = points.boundingBox.min.y;
		points.projectedBoundingBox.max.x = mileage.x;
		points.projectedBoundingBox.max.y = points.boundingBox.max.y;
		
		return points;
	}
	
	/**
	 * returns points inside the given profile bounds.
	 *
	 * start: 	
	 * end: 	
	 * width:	
	 * depth:		search points up to the given octree depth
	 * callback:	if specified, points are loaded before searching
	 *				
	 *
	 */
	getProfile(start, end, width, depth, callback){
		if(callback !== undefined){
			let request = new Potree.ProfileRequest(start, end, width, depth, callback);
			this.profileRequests.push(request);
		}else{
			let stack = [];
			stack.push(this);
			
			let center = new THREE.Vector3().addVectors(end, start).multiplyScalar(0.5);
			let length = new THREE.Vector3().subVectors(end, start).length();
			let side = new THREE.Vector3().subVectors(end, start).normalize();
			let up = new THREE.Vector3(0, 1, 0);
			let forward = new THREE.Vector3().crossVectors(side, up).normalize();
			let N = forward;
			let cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, start);
			let halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);
			
			let inside = null;
			
			let boundingBox = new THREE.Box3();
			
			
			while(stack.length > 0){
				let object = stack.shift();
				
				
				let pointsFound = 0;
				
				if(object instanceof THREE.Points){
					let geometry = object.geometry;
					let positions = geometry.attributes.position;
					let p = positions.array;
					let numPoints = object.numPoints;
					
					if(!inside){
						inside = {};
						
						for (let property in geometry.attributes) {
							if (geometry.attributes.hasOwnProperty(property)) {
								if(property === "indices"){
								
								}else{
									inside[property] = [];
								}
							}
						}
					}
					
					for(let i = 0; i < numPoints; i++){
						let pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
						pos.applyMatrix4(this.matrixWorld);
						let distance = Math.abs(cutPlane.distanceToPoint(pos));
						let centerDistance = Math.abs(halfPlane.distanceToPoint(pos));
						
						if(distance < width / 2 && centerDistance < length / 2){
							boundingBox.expandByPoint(pos);
							
							for (let property in geometry.attributes) {
								if (geometry.attributes.hasOwnProperty(property)) {
								
									if(property === "position"){
										inside[property].push(pos);
									}else if(property === "indices"){
										// skip indices
									}else{
										let values = geometry.attributes[property];
										if(values.itemSize === 1){
											inside[property].push(values.array[i + j]);
										}else{
											let value = [];
											for(let j = 0; j < values.itemSize; j++){
												value.push(values.array[i*values.itemSize + j]);
											}
											inside[property].push(value);
										}
									}
									
								}
							}
							
							
							pointsFound++;
						}
					}
				}
				
				//console.log("traversing: " + object.name + ", #points found: " + pointsFound);
				
				if(object == this || object.level < depth){
					for(let i = 0; i < object.children.length; i++){
						let child = object.children[i];
						if(child instanceof THREE.Points){
							let sphere = child.boundingSphere.clone().applyMatrix4(child.matrixWorld);
							if(cutPlane.distanceToSphere(sphere) < sphere.radius){
								stack.push(child);	
							}			
						}
					}
				}
			}
			
			inside.numPoints = inside.position.length;
			
			let project = function(_start, _end){
				let start = _start;
				let end = _end;
				
				let xAxis = new THREE.Vector3(1,0,0);
				let dir = new THREE.Vector3().subVectors(end, start);
				dir.y = 0;
				dir.normalize();
				let alpha = Math.acos(xAxis.dot(dir));
				if(dir.z > 0){
					alpha = -alpha;
				}
				
				
				return function(position){
							
					let toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -start.y, -start.z);
					let alignWithX = new THREE.Matrix4().makeRotationY(-alpha);

					let pos = position.clone();
					pos.applyMatrix4(toOrigin);
					pos.applyMatrix4(alignWithX);
					
					return pos;
				};
				
			}(start, end);
			
			inside.project = project;
			inside.boundingBox = boundingBox;
			
			return inside;
		}
	};

	getVisibleExtent(){
		return this.visibleBounds.applyMatrix4(this.matrixWorld);
	};


	/**
	 *
	 *
	 *
	 * params.pickWindowSize:	Look for points inside a pixel window of this size.
	 * 							Use odd values: 1, 3, 5, ...
	 * 
	 * 
	 * TODO: only draw pixels that are actually read with readPixels(). 
	 * 
	 */
	pick(renderer, camera, ray, params = {}){
		// this function finds intersections by rendering point indices and then checking the point index at the mouse location.
		// point indices are 3 byte and rendered to the RGB component.
		// point cloud node indices are 1 byte and stored in the ALPHA component.
		// this limits picking capabilities to 256 nodes and 2^24 points per node. 
		
		let pickWindowSize = params.pickWindowSize || 17;
		let pickOutsideClipRegion = params.pickOutsideClipRegion || false;
		let width = Math.ceil(renderer.domElement.clientWidth);
		let height = Math.ceil(renderer.domElement.clientHeight);
		
		let nodes = this.nodesOnRay(this.visibleNodes, ray);
		
		if(nodes.length === 0){
			return null;
		}
		
		let gl = renderer.context;
		
		if(!this.pickState){
			
			let material = new Potree.PointCloudMaterial();
			material.pointColorType = Potree.PointColorType.POINT_INDEX;		
			
			let glProgram = new Potree.GLProgram(gl, material);
			
			let image = material.visibleNodesTexture.image;
			let texture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, texture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.bindTexture(gl.TEXTURE_2D, null);
			
			let pickTarget = new THREE.WebGLRenderTarget( 
				1, 1, 
				{ minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat } 
			);
			
			this.pickState = {
				pickTarget: pickTarget,
				material: material,
				glProgram: glProgram,
				visibleNodesTexture: texture
			};
		};
		let pickState = this.pickState;
		
		let oldClearColor = {
			rgb: renderer.getClearColor().clone(),
			a: renderer.getClearAlpha()
		};
		
		renderer.setClearColor(new THREE.Color(0, 0, 0), 0);
		
		let pickMaterial = pickState.material;
		let glProgram = pickState.glProgram;
		
		{ // update pick material
			pickMaterial.pointSizeType = this.material.pointSizeType;
			pickMaterial.shape = this.material.shape;
			
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
			
			if(pickMaterial.needsUpdate){
				glProgram.recompile();
				pickMaterial.needsUpdate = false;
			};
		}
		
		let pixelPos = new THREE.Vector3().addVectors(camera.position, ray.direction)
			.project(camera);
		pixelPos.addScalar(1).multiplyScalar(0.5);
		pixelPos.x *= width;
		pixelPos.y *= height;
		
		if(pickState.pickTarget.width != width || pickState.pickTarget.height != height){
			pickState.pickTarget.dispose();
			pickState.pickTarget = new THREE.WebGLRenderTarget( 
				1, 1, 
				{ minFilter: THREE.LinearFilter, 
				magFilter: THREE.NearestFilter, 
				format: THREE.RGBAFormat } 
			);
		}
		pickState.pickTarget.setSize(width, height);
		
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(
			pixelPos.x - (pickWindowSize - 1) / 2, 
			pixelPos.y - (pickWindowSize - 1) / 2,
			pickWindowSize,pickWindowSize);
		
		renderer.setRenderTarget( pickState.pickTarget );
		
		renderer.state.setDepthTest(pickMaterial.depthTest);
		renderer.state.setDepthWrite(pickMaterial.depthWrite);
		renderer.state.setBlending(THREE.NoBlending);
		
		renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
		
		let program = glProgram.program;
		let uniforms = glProgram.uniforms;
		gl.useProgram(program);
			
		gl.uniformMatrix4fv(uniforms["projectionMatrix"], false, new Float32Array(camera.projectionMatrix.elements));
		gl.uniformMatrix4fv(uniforms["viewMatrix"], false, new Float32Array(camera.matrixWorldInverse.elements));
		
		{
			let texture = pickState.visibleNodesTexture;
			let image = pickMaterial.visibleNodesTexture.image;
			
			gl.uniform1i(uniforms["visibleNodes"], 0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture( gl.TEXTURE_2D, texture );
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, image.width, image.height, 0, gl.RGB, gl.UNSIGNED_BYTE, image.data);
			
		}
		
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
		
		if(uniforms["clipBoxes[0]"]){
			gl.uniform1f(uniforms["clipBoxCount"], pickMaterial.uniforms.clipBoxCount.value);
			gl.uniformMatrix4fv(uniforms["clipBoxes[0]"], false, pickMaterial.uniforms.clipBoxes.value);
		}
		
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

			//let numPoints = node.getNumPoints();
			let numPoints = geometry.attributes.position.count;
			if(numPoints > 0){
				gl.drawArrays( gl.POINTS, 0, numPoints);		
			}
			
			// TODO hack
			for(let i = 0; i < 16; i++){
				gl.disableVertexAttribArray(i);
			}
			gl.enableVertexAttribArray(0);
			gl.enableVertexAttribArray(1);
		}
		
		let pixelCount = pickWindowSize * pickWindowSize;
		let buffer = new ArrayBuffer(pixelCount*4);
		let pixels = new Uint8Array(buffer);
		let ibuffer = new Uint32Array(buffer);
		renderer.context.readPixels(
			pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2, 
			pickWindowSize, pickWindowSize, 
			renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);
			
		gl.disable(gl.SCISSOR_TEST);


		//{ // open window with image
		//	let br = new ArrayBuffer(width*height*4);
		//	let bp = new Uint8Array(br);
		//	renderer.context.readPixels( 0, 0, width, height, 
		//		renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, bp);
		//	
		//	let img = Potree.utils.pixelsArrayToImage(bp, width, height);
		//	let screenshot = img.src;
		//	
		//	let w = window.open();
		//	w.document.write('<img src="'+screenshot+'"/>');
		//}
		
		renderer.setRenderTarget(null);
			
		// find closest hit inside pixelWindow boundaries
		let min = Number.MAX_VALUE;
		let hit = null;
		for(let u = 0; u < pickWindowSize; u++){
			for(let v = 0; v < pickWindowSize; v++){
				let offset = (u + v*pickWindowSize);
				let distance = Math.pow(u - (pickWindowSize-1) / 2, 2) + Math.pow(v - (pickWindowSize-1) / 2, 2);
				
				let pcIndex = pixels[4*offset + 3];
				pixels[4*offset + 3] = 0;
				let pIndex = ibuffer[offset];
				
				if((pIndex !== 0 || pcIndex !== 0) && distance < min){
					
					hit = {
						pIndex: pIndex,
						pcIndex: pcIndex - 1
					};
					min = distance;
				}
			}
		}
		
		let point = null;
		
		if(hit){
			point = {};
			
			let pc = nodes[hit.pcIndex].sceneNode;
			let attributes = pc.geometry.attributes;
			
			for(let property in attributes) {
				if (attributes.hasOwnProperty(property)) {
					let values = pc.geometry.attributes[property];
				
					if(property === "position"){
						let positionArray = values.array;
						let x = positionArray[3*hit.pIndex+0];
						let y = positionArray[3*hit.pIndex+1];
						let z = positionArray[3*hit.pIndex+2];
						let position = new THREE.Vector3(x, y, z);
						position.applyMatrix4(this.matrixWorld);
					
						point[property] = position;
					}else if(property === "indices"){
					
					}else{
						if(values.itemSize === 1){
							point[property] = values.array[hit.pIndex];
						}else{
							let value = [];
							for(let j = 0; j < values.itemSize; j++){
								value.push(values.array[values.itemSize*hit.pIndex + j]);
							}
							point[property] = value;
						}
					}
				}
			}
		}
		
		renderer.resetGLState();
			
		renderer.setClearColor(oldClearColor.rgb, oldClearColor.a);
		
		return point;
	};
	
	get progress(){
		return this.visibleNodes.length / this.visibleGeometry.length;
	}
};

