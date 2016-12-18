
Potree.ProfileData = function(profile){
	this.profile = profile;
	
	this.segments = [];
	this.boundingBox = new THREE.Box3();
	this.projectedBoundingBox = new THREE.Box2();
	
	var mileage = new THREE.Vector3();
	for(var i = 0; i < profile.points.length - 1; i++){
		var start = profile.points[i];
		var end = profile.points[i+1];
		
		var startGround = new THREE.Vector3(start.x, start.y, 0);
		var endGround = new THREE.Vector3(end.x, end.y, 0);
		
		var center = new THREE.Vector3().addVectors(endGround, startGround).multiplyScalar(0.5);
		var length = startGround.distanceTo(endGround);
		var side = new THREE.Vector3().subVectors(endGround, startGround).normalize();
		var up = new THREE.Vector3(0, 0, 1);
		var forward = new THREE.Vector3().crossVectors(side, up).normalize();
		var N = forward;
		var cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, startGround);
		var halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);
		
		var project = function(_start, _end, _mileage){
			var start = _start;
			var end = _end;
			var mileage = _mileage;
			
			var xAxis = new THREE.Vector3(1,0,0);
			var dir = new THREE.Vector3().subVectors(end, start);
			dir.z = 0;
			dir.normalize();
			var alpha = Math.acos(xAxis.dot(dir));
			if(dir.y > 0){
				alpha = -alpha;
			}
			
			
			return function(position){
				var toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -start.y, 0);
				var alignWithX = new THREE.Matrix4().makeRotationZ(-alpha);
				var applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

				var pos = position.clone();
				pos.applyMatrix4(toOrigin);
				pos.applyMatrix4(alignWithX);
				pos.applyMatrix4(applyMileage);
				
				return pos;
			};
			
		}(start, end, mileage.clone());
		
		var segment = {
			start: start,
			end: end,
			cutPlane: cutPlane,
			halfPlane: halfPlane,
			length: length,
			points: null,
			project: project
		};
		
		this.segments.push(segment);
		
		mileage.x += length;
		mileage.z += end.z - start.z;
	}
	
	this.projectedBoundingBox.min.x = 0;
	this.projectedBoundingBox.min.z = Number.POSITIVE_INFINITY;
	this.projectedBoundingBox.max.x = mileage.x;
	this.projectedBoundingBox.max.z = Number.NEGATIVE_INFINITY;
	
	this.size = function(){
		var size = 0;
		for(var i = 0; i < this.segments.length; i++){
			if(this.segments[i].points){
				size += this.segments[i].points.numPoints;
			}
		}
		return size;
	}
	
};

Potree.ProfileRequest = function(pointcloud, profile, maxDepth, callback){

	this.pointcloud = pointcloud;
	this.profile = profile;
	this.maxDepth = maxDepth || Number.MAX_VALUE;
	this.callback = callback;
	this.temporaryResult = new Potree.ProfileData(this.profile);
	this.pointsServed = 0;

	this.priorityQueue = new BinaryHeap(function(x){return 1 / x.weight;});
	
	this.initialize = function(){
		this.priorityQueue.push({node: pointcloud.pcoGeometry.root, weight: 1});
		this.traverse(pointcloud.pcoGeometry.root);
	};
	
	// traverse the node and add intersecting descendants to queue
	this.traverse = function(node){
		
		var stack = [];
		for(var i = 0; i < 8; i++){
			var child = node.children[i];
			if(child && pointcloud.nodeIntersectsProfile(child, this.profile)){
				stack.push(child);
			}
		}
		
		while(stack.length > 0){
			var node = stack.pop();
			var weight = node.boundingSphere.radius;
			
			this.priorityQueue.push({node: node, weight: weight});
		
			// add children that intersect the cutting plane
			if(node.level < this.maxDepth){
				for(var i = 0; i < 8; i++){
					var child = node.children[i];
					if(child && pointcloud.nodeIntersectsProfile(child, this.profile)){
						stack.push(child);
					}
				}
			}
		}
	};
	
	this.update = function(){
		
		// load nodes in queue
		// if hierarchy expands, also load nodes from expanded hierarchy
		// once loaded, add data to this.points and remove node from queue
		// only evaluate 1-50 nodes per frame to maintain responsiveness
		
		var intersectedNodes = [];
		
		for(var i = 0; i < Math.min(2, this.priorityQueue.size()); i++){
			var element = this.priorityQueue.pop();
			var node = element.node;
			
			
			if(node.loaded){
				// add points to result
				intersectedNodes.push(node);
				Potree.getLRU().touch(node);
				
				if((node.level % node.pcoGeometry.hierarchyStepSize) === 0 && node.hasChildren){
					this.traverse(node);
				}
			}else{
				node.load();
				this.priorityQueue.push(element);
			}
		}
		
		if(intersectedNodes.length > 0){
			this.getPointsInsideProfile(intersectedNodes, this.temporaryResult);
			if(this.temporaryResult.size() > 100){
				this.pointsServed += this.temporaryResult.size();
				callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}
		}
		
		if(this.priorityQueue.size() === 0){
			// we're done! inform callback and remove from pending requests

			if(this.temporaryResult.size() > 0){
				this.pointsServed += this.temporaryResult.size();
				callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}
			
			callback.onFinish({request: this});
			
			var index = pointcloud.profileRequests.indexOf(this);
			if(index >= 0){
				pointcloud.profileRequests.splice(index, 1);
			}
		}
	};
	
	this.getPointsInsideProfile = function(nodes, target){
	
		for(var pi = 0; pi < target.segments.length; pi++){
			var segment = target.segments[pi];
			
			for(var ni = 0; ni < nodes.length; ni++){
				var node = nodes[ni];
				
				var geometry = node.geometry;
				var positions = geometry.attributes.position;
				var p = positions.array;
				var numPoints = node.numPoints;
				
				if(!segment.points){
					segment.points = {};
					segment.points.boundingBox = new THREE.Box3();
					
					for (var property in geometry.attributes) {
						if (geometry.attributes.hasOwnProperty(property)) {
							if(property === "indices"){
							
							}else{
								segment.points[property] = [];
							}
						}
					}
				}
				
				for(var i = 0; i < numPoints; i++){
					var pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
					pos.applyMatrix4(pointcloud.matrixWorld);
					var distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
					var centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));
					
					if(distance < profile.width / 2 && centerDistance < segment.length / 2){
						segment.points.boundingBox.expandByPoint(pos);
						
						for (var property in geometry.attributes) {
							if (geometry.attributes.hasOwnProperty(property)) {
							
								if(property === "position"){
									segment.points[property].push(pos);
								}else if(property === "indices"){
									// skip indices
								}else{
									var values = geometry.attributes[property];
									if(values.itemSize === 1){
										segment.points[property].push(values.array[i]);
									}else{
										var value = [];
										for(var j = 0; j < values.itemSize; j++){
											value.push(values.array[i*values.itemSize + j]);
										}
										segment.points[property].push(value);
									}
								}
								
							}
						}
					}else{
						var a;
					}
				}
			}
		
			segment.points.numPoints = segment.points.position.length;
			
			if(segment.points.numPoints > 0){
				target.boundingBox.expandByPoint(segment.points.boundingBox.min);
				target.boundingBox.expandByPoint(segment.points.boundingBox.max);
				
				target.projectedBoundingBox.expandByPoint(new THREE.Vector2(0, target.boundingBox.min.y));
				target.projectedBoundingBox.expandByPoint(new THREE.Vector2(0, target.boundingBox.max.y));
			}
		}
	};
	
	this.cancel = function(){
		callback.onCancel();
		
		this.priorityQueue = new BinaryHeap(function(x){return 1 / x.weight;});
		
		var index = pointcloud.profileRequests.indexOf(this);
		if(index >= 0){
			pointcloud.profileRequests.splice(index, 1);
		}
	};
	
	this.initialize();
	
};

Potree.PointCloudOctreeNode = function(){
	this.children = {};
	this.sceneNode = null;
	this.octree = null;
	
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
	
	this.getChildren = function(){
		var children = [];
		
		for(var i = 0; i < 8; i++){
			if(this.children[i]){
				children.push(this.children[i]);
			}
		}
		
		return children;
	};
};

Potree.PointCloudOctreeNode.prototype = Object.create(Potree.PointCloudTreeNode.prototype);


Potree.PointCloudOctree = function(geometry, material){
	//THREE.Object3D.call( this );
	Potree.PointCloudTree.call(this);
	
	this.pcoGeometry = geometry;
	this.boundingBox = this.pcoGeometry.boundingBox;
	this.boundingSphere = this.boundingBox.getBoundingSphere();
	this.material = material || new Potree.PointCloudMaterial();
	this.visiblePointsTarget = 2*1000*1000;
	this.minimumNodePixelSize = 150;
	this.level = 0;
	this.position.sub(geometry.offset);
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
};

Potree.PointCloudOctree.prototype = Object.create(Potree.PointCloudTree.prototype);

Potree.PointCloudOctree.prototype.setName = function(name){
	if(this.name !== name){
		this.name = name;
		this.dispatchEvent({type: "name_changed", name: name, pointcloud: this});
	}
};

Potree.PointCloudOctree.prototype.getName = function(){
	return this.name;
};

Potree.PointCloudOctree.prototype.toTreeNode = function(geometryNode, parent){
	var node = new Potree.PointCloudOctreeNode();
	var sceneNode = new THREE.Points(geometryNode.geometry, this.material);
	
	node.geometryNode = geometryNode;
	node.sceneNode = sceneNode;
	node.pointcloud = this;
	node.children = {};
	for(var key in geometryNode.children){
		node.children[key] = geometryNode.children[key];
	}
	
	if(!parent){
		this.root = node;
		this.add(sceneNode);
	}else{
		var childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
		parent.sceneNode.add(sceneNode);
		parent.children[childIndex] = node;
	}
	
	var disposeListener = function(){
		var childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
		parent.sceneNode.remove(node.sceneNode);
		parent.children[childIndex] = geometryNode;
	}
	geometryNode.oneTimeDisposeHandlers.push(disposeListener);
	
	return node;
};

Potree.PointCloudOctree.prototype.updateVisibleBounds = function(){

	var leafNodes = [];
	for(var i = 0; i < this.visibleNodes.length; i++){
		var node = this.visibleNodes[i];
		var isLeaf = true;
		
		for(var j = 0; j < node.children.length; j++){
			var child = node.children[j];
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
	for(var i = 0; i < leafNodes.length; i++){
		var node = leafNodes[i];
		
		this.visibleBounds.expandByPoint(node.getBoundingBox().min);
		this.visibleBounds.expandByPoint(node.getBoundingBox().max);
	}
	
};

Potree.PointCloudOctree.prototype.updateMaterial = function(material, visibleNodes, camera, renderer){
	material.fov = camera.fov * (Math.PI / 180);
	material.screenWidth = renderer.domElement.clientWidth;
	material.screenHeight = renderer.domElement.clientHeight;
	material.spacing = this.pcoGeometry.spacing;
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
};

Potree.PointCloudOctree.prototype.updateVisibilityTexture = function(material, visibleNodes){

	if(!material){
		return;
	}
	
	var texture = material.visibleNodesTexture;
    var data = texture.image.data;
	
	// copy array
	visibleNodes = visibleNodes.slice();
	
	// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
	var sort = function(a, b){
		var na = a.geometryNode.name;
		var nb = b.geometryNode.name;
		if(na.length != nb.length) return na.length - nb.length;
		if(na < nb) return -1;
		if(na > nb) return 1;
		return 0;
	};
	visibleNodes.sort(sort);

	
	for(var i = 0; i < visibleNodes.length; i++){
		var node = visibleNodes[i];
		
		var children = [];
		for(var j = 0; j < 8; j++){
			var child = node.children[j];
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
		for(var j = 0; j < children.length; j++){
			var child = children[j];
			var index = parseInt(child.geometryNode.name.substr(-1));
			data[i*3 + 0] += Math.pow(2, index);
			
			if(j === 0){
				var vArrayIndex = visibleNodes.indexOf(child);
				data[i*3 + 1] = vArrayIndex - i;
			}
			
		}
	}
	
	
	texture.needsUpdate = true;
};

Potree.PointCloudOctree.prototype.nodeIntersectsProfile = function(node, profile){
	var bbWorld = node.boundingBox.clone().applyMatrix4(this.matrixWorld);
	var bsWorld = bbWorld.getBoundingSphere();
	
	for(var i = 0; i < profile.points.length - 1; i++){
		var start = new THREE.Vector3(profile.points[i].x, bsWorld.center.y, profile.points[i].z);
		var end = new THREE.Vector3(profile.points[i+1].x, bsWorld.center.y, profile.points[i+1].z);
		
		var ray1 = new THREE.Ray(start, new THREE.Vector3().subVectors(end, start).normalize());
		var ray2 = new THREE.Ray(end, new THREE.Vector3().subVectors(start, end).normalize());
		
		if(ray1.intersectsSphere(bsWorld) && ray2.intersectsSphere(bsWorld)){
			return true;
		}
	}
	
	return false;
};
















Potree.PointCloudOctree.prototype.nodesOnRay = function(nodes, ray){
	var nodesOnRay = [];

	var _ray = ray.clone();
	for(var i = 0; i < nodes.length; i++){
		var node = nodes[i];
		//var inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
		var sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
		
		if(_ray.intersectsSphere(sphere)){
			nodesOnRay.push(node);
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
};

Potree.PointCloudOctree.prototype.moveToOrigin = function(){
    this.position.set(0,0,0);
    this.updateMatrixWorld(true);
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.set(0,0,0).sub(tBox.getCenter());
};

Potree.PointCloudOctree.prototype.moveToGroundPlane = function(){
    this.updateMatrixWorld(true);
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
    this.position.y += -tBox.min.y;
};

Potree.PointCloudOctree.prototype.getBoundingBoxWorld = function(){
	this.updateMatrixWorld(true);
    var box = this.boundingBox;
    var transform = this.matrixWorld;
    var tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
	
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
Potree.PointCloudOctree.prototype.getPointsInProfile = function(profile, maxDepth, callback){

	if(callback){
		var request = new Potree.ProfileRequest(this, profile, maxDepth, callback);
		this.profileRequests.push(request);
		
		return request;
	}

	var points = {
		segments: [],
		boundingBox: new THREE.Box3(),
		projectedBoundingBox: new THREE.Box2()
	};
	
	// evaluate segments
	for(var i = 0; i < profile.points.length - 1; i++){
		var start = profile.points[i];
		var end = profile.points[i+1];
		var ps = this.getProfile(start, end, profile.width, maxDepth);
		
		var segment = {
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
	var mileage = new THREE.Vector3();
	for(var i = 0; i < points.segments.length; i++){
		var segment = points.segments[i];
		var start = segment.start;
		var end = segment.end;
		
		var project = function(_start, _end, _mileage, _boundingBox){
			var start = _start;
			var end = _end;
			var mileage = _mileage;
			var boundingBox = _boundingBox;
			
			var xAxis = new THREE.Vector3(1,0,0);
			var dir = new THREE.Vector3().subVectors(end, start);
			dir.y = 0;
			dir.normalize();
			var alpha = Math.acos(xAxis.dot(dir));
			if(dir.z > 0){
				alpha = -alpha;
			}
			
			
			return function(position){
						
				var toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -boundingBox.min.y, -start.z);
				var alignWithX = new THREE.Matrix4().makeRotationY(-alpha);
				var applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

				var pos = position.clone();
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
};

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
Potree.PointCloudOctree.prototype.getProfile = function(start, end, width, depth, callback){
	if(callback !== undefined){
		var request = new Potree.ProfileRequest(start, end, width, depth, callback);
		this.profileRequests.push(request);
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
		
		var inside = null;
		
		var boundingBox = new THREE.Box3();
		
		
		while(stack.length > 0){
			var object = stack.shift();
			
			
			var pointsFound = 0;
			
			if(object instanceof THREE.Points){
				var geometry = object.geometry;
				var positions = geometry.attributes.position;
				var p = positions.array;
				var numPoints = object.numPoints;
				
				if(!inside){
					inside = {};
					
					for (var property in geometry.attributes) {
						if (geometry.attributes.hasOwnProperty(property)) {
							if(property === "indices"){
							
							}else{
								inside[property] = [];
							}
						}
					}
				}
				
				for(var i = 0; i < numPoints; i++){
					var pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
					pos.applyMatrix4(this.matrixWorld);
					var distance = Math.abs(cutPlane.distanceToPoint(pos));
					var centerDistance = Math.abs(halfPlane.distanceToPoint(pos));
					
					if(distance < width / 2 && centerDistance < length / 2){
						boundingBox.expandByPoint(pos);
						
						for (var property in geometry.attributes) {
							if (geometry.attributes.hasOwnProperty(property)) {
							
								if(property === "position"){
									inside[property].push(pos);
								}else if(property === "indices"){
									// skip indices
								}else{
									var values = geometry.attributes[property];
									if(values.itemSize === 1){
										inside[property].push(values.array[i + j]);
									}else{
										var value = [];
										for(var j = 0; j < values.itemSize; j++){
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
				for(var i = 0; i < object.children.length; i++){
					var child = object.children[i];
					if(child instanceof THREE.Points){
						var sphere = child.boundingSphere.clone().applyMatrix4(child.matrixWorld);
						if(cutPlane.distanceToSphere(sphere) < sphere.radius){
							stack.push(child);	
						}			
					}
				}
			}
		}
		
		inside.numPoints = inside.position.length;
		
		var project = function(_start, _end){
			var start = _start;
			var end = _end;
			
			var xAxis = new THREE.Vector3(1,0,0);
			var dir = new THREE.Vector3().subVectors(end, start);
			dir.y = 0;
			dir.normalize();
			var alpha = Math.acos(xAxis.dot(dir));
			if(dir.z > 0){
				alpha = -alpha;
			}
			
			
			return function(position){
						
				var toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -start.y, -start.z);
				var alignWithX = new THREE.Matrix4().makeRotationY(-alpha);

				var pos = position.clone();
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

Potree.PointCloudOctree.prototype.getVisibleExtent = function(){
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
Potree.PointCloudOctree.prototype.pick = function(renderer, camera, ray, params){
	// this function finds intersections by rendering point indices and then checking the point index at the mouse location.
	// point indices are 3 byte and rendered to the RGB component.
	// point cloud node indices are 1 byte and stored in the ALPHA component.
	// this limits picking capabilities to 256 nodes and 2^24 points per node. 
	
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
	
	if(Potree.PointCloudOctree.pickMaterial === undefined){
		Potree.PointCloudOctree.pickMaterial = new Potree.PointCloudMaterial();
		Potree.PointCloudOctree.pickMaterial.pointColorType = Potree.PointColorType.POINT_INDEX;		
		//Potree.PointCloudOctree.pickMaterial.pointColorType = Potree.PointColorType.COLOR;
		
		compileMaterial(Potree.PointCloudOctree.pickMaterial);
	}
	
	let pickMaterial = Potree.PointCloudOctree.pickMaterial;
	
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
		
		gl.bindBuffer( gl.ARRAY_BUFFER, positionBuffer );
		gl.vertexAttribPointer( apPosition, 3, gl.FLOAT, false, 0, 0 ); 
		
		let normalBuffer = renderer.properties.get(geometry.attributes.normal).__webglBuffer;
		gl.bindBuffer( gl.ARRAY_BUFFER, normalBuffer );
		gl.vertexAttribPointer( apNormal, 3, gl.FLOAT, true, 0, 0 ); 
		
		let classificationBuffer = renderer.properties.get(geometry.attributes.classification).__webglBuffer;
		gl.bindBuffer( gl.ARRAY_BUFFER, classificationBuffer );
		gl.vertexAttribPointer( apClassification, 1, gl.UNSIGNED_BYTE, false, 0, 0 ); 
		
		let indexBuffer = renderer.properties.get(geometry.attributes.indices).__webglBuffer;
		gl.bindBuffer( gl.ARRAY_BUFFER, indexBuffer );
		gl.vertexAttribPointer( apIndices, 4, gl.UNSIGNED_BYTE, true, 0, 0 ); 
		
		gl.uniform1f(uniforms["pcIndex"], pickMaterial.pcIndex);

		let numPoints = node.getNumPoints();
		if(numPoints > 0){
			gl.drawArrays( gl.POINTS, 0, node.getNumPoints());		
		}
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
	//	var img = pixelsArrayToImage(bp, width, height);
	//	var screenshot = img.src;
	//	
	//	var w = window.open();
	//	w.document.write('<img src="'+screenshot+'"/>');
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

var demTime = 0;

Potree.PointCloudOctree.prototype.createDEM = function(node){	
	var start = new Date().getTime();

	var sceneNode = node.sceneNode;

	var world = sceneNode.matrixWorld;

	var boundingBox = sceneNode.boundingBox.clone().applyMatrix4(world);
	var bbSize = boundingBox.getSize();
	var positions = sceneNode.geometry.attributes.position.array;
	var demSize = 64;
	var demMArray = new Array(demSize*demSize);
	var dem = new Float32Array(demSize*demSize);
	var n = positions.length / 3;
	
	var toWorld = function(dx, dy){
		var x = (dx * bbSize.x) / (demSize - 1) + boundingBox.min.x;
		var y = dem[dx + dy * demSize];
		var z = (dy * bbSize.z) / (demSize - 1)+ boundingBox.min.z;
		
		return [x, y, z];
	};
	
	var toDem = function(x, y){
		var dx = parseInt(demSize * (x - boundingBox.min.x) / bbSize.x);
		var dy = parseInt(demSize * (z - boundingBox.min.z) / bbSize.z);
		dx = Math.min(dx, demSize - 1);
		dy = Math.min(dy, demSize - 1);
		
		return [dx, dy];
	};

	for(var i = 0; i < n; i++){
		var x = positions[3*i + 0];
		var y = positions[3*i + 1];
		var z = positions[3*i + 2];
		
		var worldPos = new THREE.Vector3(x,y,z).applyMatrix4(world);
		
		var dx = parseInt(demSize * (worldPos.x - boundingBox.min.x) / bbSize.x);
		var dy = parseInt(demSize * (worldPos.z - boundingBox.min.z) / bbSize.z);
		dx = Math.min(dx, demSize - 1);
		dy = Math.min(dy, demSize - 1);
		
		var index = dx + dy * demSize;
		if(!demMArray[index]){
			demMArray[index] = [];
		}
		demMArray[index].push(worldPos.y);
		
		//if(dem[dx + dy * demSize] === 0){
		//	dem[dx + dy * demSize] = worldPos.y;
		//}else{
		//	dem[dx + dy * demSize] = Math.max(dem[dx + dy * demSize], worldPos.y);
		//}
	}
	
	for(var i = 0; i < demMArray.length; i++){
		var values = demMArray[i];
		
		if(!values){
			dem[i] = 0;
		}else if(values.length === 0){
			dem[i] = 0;
		}else{
			var medianIndex = parseInt((values.length-1) / 2); 
			dem[i] = values[medianIndex];
		}
	}
	
	var box2 = new THREE.Box2();
	box2.expandByPoint(new THREE.Vector3(boundingBox.min.x, boundingBox.min.z));
	box2.expandByPoint(new THREE.Vector3(boundingBox.max.x, boundingBox.max.z));
	
	var result = {
		boundingBox: boundingBox,
		boundingBox2D: box2,
		dem: dem,
		demSize: demSize
	};
	
	
	
	
	//if(node.level === 6){
	//	var geometry = new THREE.BufferGeometry();
	//	var vertices = new Float32Array((demSize-1)*(demSize-1)*2*3*3);
	//	var offset = 0;
	//	for(var i = 0; i < demSize-1; i++){
	//		for(var j = 0; j < demSize-1; j++){
	//			//var offset = 18*i + 18*j*demSize;
	//			
	//			var dx = i;
	//			var dy = j;
	//			
	//			var v1 = toWorld(dx, dy);
	//			var v2 = toWorld(dx+1, dy);
	//			var v3 = toWorld(dx+1, dy+1);
	//			var v4 = toWorld(dx, dy+1);
	//			
	//			vertices[offset+0] = v3[0];
	//			vertices[offset+1] = v3[1];
	//			vertices[offset+2] = v3[2];
	//			
	//			vertices[offset+3] = v2[0];
	//			vertices[offset+4] = v2[1];
	//			vertices[offset+5] = v2[2];
	//			
	//			vertices[offset+6] = v1[0];
	//			vertices[offset+7] = v1[1];
	//			vertices[offset+8] = v1[2];
	//			
	//			
	//			vertices[offset+9 ] = v3[0];
	//			vertices[offset+10] = v3[1];
	//			vertices[offset+11] = v3[2];
	//			
	//			vertices[offset+12] = v1[0];
	//			vertices[offset+13] = v1[1];
	//			vertices[offset+14] = v1[2];
	//			
	//			vertices[offset+15] = v4[0];
	//			vertices[offset+16] = v4[1];
	//			vertices[offset+17] = v4[2];
	//					 
	//					
	//			
	//			//var x = (dx * bbSize.min.x) / demSize + boundingBox.min.x;
	//			//var y = (dy * bbSize.min.y) / demSize + boundingBox.min.y;
	//			//var z = dem[dx + dy * demSize];
	//			
	//			offset += 18;
	//			
	//		}
	//	}
	//	
	//	geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
	//	geometry.computeFaceNormals();
	//	geometry.computeVertexNormals();
	//	
	//	var material = new THREE.MeshNormalMaterial( { color: 0xff0000, shading: THREE.SmoothShading } );
	//	var mesh = new THREE.Mesh( geometry, material );
	//	viewer.scene.add(mesh);
	//}
	
	
	//if(node.level == 0){
	//	scene.add(mesh);
	//	
	//	var demb = new Uint8Array(demSize*demSize*4);
	//	for(var i = 0; i < demSize*demSize; i++){
	//		demb[4*i + 0] = 255 * dem[i] / 300;
	//		demb[4*i + 1] = 255 * dem[i] / 300;
	//		demb[4*i + 2] = 255 * dem[i] / 300;
	//		demb[4*i + 3] = 255;
	//	}
	//
	//	var img = pixelsArrayToImage(demb, demSize, demSize);
	//	img.style.boder = "2px solid red";
	//	img.style.position = "absolute";
	//	img.style.top  = "0px";
	//	img.style.width = "400px";
	//	img.style.height = "200px";
	//	var txt = document.createElement("div");
	//	txt.innerHTML = node.name;
	//	//document.body.appendChild(txt);
	//	document.body.appendChild(img);
	//}
	
	
	
	var end = new Date().getTime();
	var duration = end - start;
	
	demTime += duration;

	return result;
};

Potree.PointCloudOctree.prototype.getDEMHeight = function(position){
	var pos2 = new THREE.Vector2(position.x, position.z);
	
	var demHeight = function(dem){
		var demSize = dem.demSize;
		var box = dem.boundingBox2D;
		var insideBox = box.containsPoint(pos2);
		if(box.containsPoint(pos2)){
			var uv = pos2.clone().sub(box.min).divide(box.getSize());
			var xy = uv.clone().multiplyScalar(demSize);
			
			var demHeight = 0;
			
			if((xy.x > 0.5 && xy.x < demSize - 0.5) && (xy.y > 0.5 && xy.y < demSize - 0.5)){
				var i = Math.floor(xy.x - 0.5);
				var j = Math.floor(xy.y - 0.5);
				i = (i === demSize - 1) ? (demSize-2) : i;
				j = (j === demSize - 1) ? (demSize-2) : j;
				
				var u = xy.x - i - 0.5;
				var v = xy.y - j - 0.5; 
				
				var index00 = i + j * demSize;
				var index10 = (i+1) + j * demSize;
				var index01 = i + (j+1) * demSize;
				var index11 = (i+1) + (j+1) * demSize;
				
				var height00 = dem.dem[index00];
				var height10 = dem.dem[index10];
				var height01 = dem.dem[index01];
				var height11 = dem.dem[index11];
				
				if(height00 === 0 || height10 === 0 || height01 === 0 || height11 === 0){
					demHeight = null;
				}else{
				
					var hx1 = height00 * (1-u) + height10 * u;
					var hx2 = height01 * (1-u) + height11 * u;
					
					demHeight = hx1 * (1-v) + hx2 * v;
				}
				
				var bla;
			}else{
				xy.x = Math.min(parseInt(Math.min(xy.x, demSize)), demSize-1);
				xy.y = Math.min(parseInt(Math.min(xy.y, demSize)), demSize-1);
			
				var index = xy.x + xy.y * demSize;
				demHeight = dem.dem[index];
			}
			
			
			return demHeight;
		}
		
		return null;
	};
	
	var height = null;
	
	var stack = [];
	var chosenNode = null;
	if(this.root.dem){
		stack.push(this.root);
	}
	while(stack.length > 0){
		var node = stack.shift();
		var dem = node.dem;
		
		var demSize = dem.demSize;
		var box = dem.boundingBox2D;
		var insideBox = box.containsPoint(pos2);
		if(!insideBox){
			continue;
		}
		
		var dh = demHeight(dem);
		if(!height){
			height = dh;
		}else if(dh != null && dh > 0){
			height = dh;
		}

		if(node.level <= 6){
			for(var i = 0; i < 8; i++){
				var child = node.children[i];
				if(typeof child !== "undefined" && typeof child.dem !== "undefined"){
					stack.push(child);
				}
			}
		}
	}
	
	
	
	return height;
};

//Potree.PointCloudOctree.prototype.generateTerain = function(){
//	var bb = this.boundingBox.clone().applyMatrix4(this.matrixWorld);
//	
//	var width = 300;
//	var height = 300;
//	var geometry = new THREE.BufferGeometry();
//	var vertices = new Float32Array(width*height*3);
//	
//	var offset = 0;
//	for(var i = 0; i < width; i++){
//		for( var j = 0; j < height; j++){
//			var u = i / width;
//			var v = j / height;
//			
//			var x = u * bb.size().x + bb.min.x;
//			var z = v * bb.size().z + bb.min.z;
//			
//			var y = this.getDEMHeight(new THREE.Vector3(x, 0, z));
//			if(!y){
//				y = 0;
//			}
//			
//			vertices[offset + 0] = x;
//			vertices[offset + 1] = y;
//			vertices[offset + 2] = z;
//			
//			//var sm = new THREE.Mesh(sg);
//			//sm.position.set(x,y,z);
//			//scene.add(sm);
//			
//			offset += 3;
//		}
//	}
//	
//	geometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
//	var material = new THREE.PointCloudMaterial({size: 20, color: 0x00ff00});
//	
//	var pc = new THREE.Points(geometry, material);
//	scene.add(pc);
//	
//};

Object.defineProperty(Potree.PointCloudOctree.prototype, "progress", {
	get: function(){
		return this.visibleNodes.length / this.visibleGeometry.length;
	}
});