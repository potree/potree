
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