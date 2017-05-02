
Potree.ProfileData = function(profile){
	this.profile = profile;
	
	this.segments = [];
	this.boundingBox = new THREE.Box3();
	
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
			points: new Potree.Points(),
			project: project
		};
		
		this.segments.push(segment);
		
		mileage.x += length;
		mileage.z += end.z - start.z;
	}
	
	this.size = function(){
		
		let size = 0;
		for(let segment of this.segments){
			size += segment.points.numPoints;
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
	this.highestLevelServed = 0;

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
				this.highestLevelServed = node.getLevel();
				
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
	
		let totalMileage = 0;
		
		
		for(let segment of target.segments){
			
			for(let node of nodes){
				let geometry = node.geometry;
				let positions = geometry.attributes.position;
				let p = positions.array;
				let numPoints = node.numPoints;
				
				let sv = new THREE.Vector3().subVectors(segment.end, segment.start).setZ(0);
				let segmentDir = sv.clone().normalize();
				
				let accepted = [];
				let mileage = [];
				let acceptedPositions = [];
				let points = new Potree.Points();
				
				for(var i = 0; i < numPoints; i++){
					var pos = new THREE.Vector3(p[3*i], p[3*i+1], p[3*i+2]);
					pos.applyMatrix4(pointcloud.matrixWorld);
					var distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
					var centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));
					
					if(distance < profile.width / 2 && centerDistance < segment.length / 2){
						
						let svp = new THREE.Vector3().subVectors(pos, segment.start);
						let localMileage = segmentDir.dot(svp);
						
						accepted.push(i);
						mileage.push(localMileage + totalMileage);
						points.boundingBox.expandByPoint(pos);
						
						acceptedPositions.push(pos.x);
						acceptedPositions.push(pos.y);
						acceptedPositions.push(pos.z);
					}
				}
				
				for(let attribute of Object.keys(geometry.attributes).filter(a => a !== "indices")) {

					let bufferedAttribute = geometry.attributes[attribute];
					let type = bufferedAttribute.array.constructor;
					
					let filteredBuffer = null;
					
					if(attribute === "position"){
						filteredBuffer = new type(acceptedPositions);
					}else{
						filteredBuffer = new type(accepted.length * bufferedAttribute.itemSize);
					
						for(let i = 0; i < accepted.length; i++){
							let index = accepted[i];
							
							filteredBuffer.set(
								bufferedAttribute.array.subarray(
									bufferedAttribute.itemSize * index, 
									bufferedAttribute.itemSize * index + bufferedAttribute.itemSize),
								bufferedAttribute.itemSize * i)
						}
					}
					points.data[attribute] = filteredBuffer;
					
					
				}
				
				points.data["mileage"] = new Float64Array(mileage);
				points.numPoints = accepted.length;
				
				segment.points.add(points);
				
			}
			
			totalMileage += segment.length;
		}
	
		for(let segment of target.segments){
			target.boundingBox.union(segment.points.boundingBox);
		}
		
		
		
	};
	
	this.finishLevelThenCancel = function(){
		if(this.cancelRequested){
			return;
		}
		
		this.maxDepth = this.highestLevelServed + 1;
		this.cancelRequested = true;
		
		console.log(`maxDepth: ${this.maxDepth}`);
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