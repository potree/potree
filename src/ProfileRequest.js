
Potree.ProfileData = class ProfileData {
	constructor (profile) {
		this.profile = profile;

		this.segments = [];
		this.boundingBox = new THREE.Box3();

		for (let i = 0; i < profile.points.length - 1; i++) {
			let start = profile.points[i];
			let end = profile.points[i + 1];

			let startGround = new THREE.Vector3(start.x, start.y, 0);
			let endGround = new THREE.Vector3(end.x, end.y, 0);

			let center = new THREE.Vector3().addVectors(endGround, startGround).multiplyScalar(0.5);
			let length = startGround.distanceTo(endGround);
			let side = new THREE.Vector3().subVectors(endGround, startGround).normalize();
			let up = new THREE.Vector3(0, 0, 1);
			let forward = new THREE.Vector3().crossVectors(side, up).normalize();
			let N = forward;
			let cutPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(N, startGround);
			let halfPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(side, center);

			let segment = {
				start: start,
				end: end,
				cutPlane: cutPlane,
				halfPlane: halfPlane,
				length: length,
				points: new Potree.Points()
			};

			this.segments.push(segment);
		}
	}

	size () {
		let size = 0;
		for (let segment of this.segments) {
			size += segment.points.numPoints;
		}

		return size;
	}
};

Potree.ProfileRequest = class ProfileRequest {
	constructor (pointcloud, profile, maxDepth, callback) {
		this.pointcloud = pointcloud;
		this.profile = profile;
		this.maxDepth = maxDepth || Number.MAX_VALUE;
		this.callback = callback;
		this.temporaryResult = new Potree.ProfileData(this.profile);
		this.pointsServed = 0;
		this.highestLevelServed = 0;

		this.priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

		this.initialize();
	}

	initialize () {
		this.priorityQueue.push({node: this.pointcloud.pcoGeometry.root, weight: Infinity});
	};

	// traverse the node and add intersecting descendants to queue
	traverse (node) {
		let stack = [];
		for (let i = 0; i < 8; i++) {
			let child = node.children[i];
			if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
				stack.push(child);
			}
		}

		while (stack.length > 0) {
			let node = stack.pop();
			let weight = node.boundingSphere.radius;

			this.priorityQueue.push({node: node, weight: weight});

			// add children that intersect the cutting plane
			if (node.level < this.maxDepth) {
				for (let i = 0; i < 8; i++) {
					let child = node.children[i];
					if (child && this.pointcloud.nodeIntersectsProfile(child, this.profile)) {
						stack.push(child);
					}
				}
			}
		}
	}

	update () {
		// load nodes in queue
		// if hierarchy expands, also load nodes from expanded hierarchy
		// once loaded, add data to this.points and remove node from queue
		// only evaluate 1-50 nodes per frame to maintain responsiveness

		let maxNodesPerUpdate = 1;
		let intersectedNodes = [];

		for (let i = 0; i < Math.min(maxNodesPerUpdate, this.priorityQueue.size()); i++) {
			let element = this.priorityQueue.pop();
			let node = element.node;

			if(node.level > this.maxDepth){
				continue;
			}

			if (node.loaded) {
				// add points to result
				intersectedNodes.push(node);
				Potree.getLRU().touch(node);
				this.highestLevelServed = Math.max(node.getLevel(), this.highestLevelServed);

				let doTraverse = (node.level % node.pcoGeometry.hierarchyStepSize) === 0 && node.hasChildren;
				doTraverse = doTraverse || node.getLevel() === 0;
				if (doTraverse) {
					this.traverse(node);
				}
			} else {
				node.load();
				this.priorityQueue.push(element);
			}
		}

		if (intersectedNodes.length > 0) {

			this.getPointsInsideProfile(intersectedNodes, this.temporaryResult);
			if (this.temporaryResult.size() > 100) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}
		}

		if (this.priorityQueue.size() === 0) {
			// we're done! inform callback and remove from pending requests

			if (this.temporaryResult.size() > 0) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new Potree.ProfileData(this.profile);
			}

			this.callback.onFinish({request: this});

			let index = this.pointcloud.profileRequests.indexOf(this);
			if (index >= 0) {
				this.pointcloud.profileRequests.splice(index, 1);
			}
		}
	};

	getAccepted(numPoints, buffer, posOffset, matrix, segment, segmentDir, points, totalMileage){
		let view = new DataView(buffer.data);

		let accepted = new Uint32Array(numPoints);
		let mileage = new Float64Array(numPoints);
		let acceptedPositions = new Float32Array(numPoints * 3);
		let numAccepted = 0;

		let pos = new THREE.Vector3();
		let svp = new THREE.Vector3();

		for (let i = 0; i < numPoints; i++) {

			pos.set(
				view.getFloat32(i * buffer.stride + posOffset + 0, true),
				view.getFloat32(i * buffer.stride + posOffset + 4, true),
				view.getFloat32(i * buffer.stride + posOffset + 8, true));
		
			pos.applyMatrix4(matrix);
			let distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
			let centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));

			if (distance < this.profile.width / 2 && centerDistance < segment.length / 2) {
				svp.subVectors(pos, segment.start);
				let localMileage = segmentDir.dot(svp);

				accepted[numAccepted] = i;
				mileage[numAccepted] = localMileage + totalMileage;
				points.boundingBox.expandByPoint(pos);

				acceptedPositions[3 * numAccepted + 0] = pos.x;
				acceptedPositions[3 * numAccepted + 1] = pos.y;
				acceptedPositions[3 * numAccepted + 2] = pos.z;

				numAccepted++;
			}
		}

		accepted = accepted.subarray(0, numAccepted);
		mileage = mileage.subarray(0, numAccepted);
		acceptedPositions = acceptedPositions.subarray(0, numAccepted * 3);

		return [accepted, mileage, acceptedPositions];
	}

	getPointsInsideProfile (nodes, target) {
		let totalMileage = 0;

		let tStart = new Date().getTime();
		let pointsProcessed = 0;

		for (let segment of target.segments) {
			for (let node of nodes) {
				let numPoints = node.numPoints;
				let buffer = node.buffer;
				let view = new DataView(buffer.data);

				if(!numPoints){
					continue;
				}

				{ // skip if current node doesn't intersect current segment
					let bbWorld = node.boundingBox.clone().applyMatrix4(this.pointcloud.matrixWorld);
					let bsWorld = bbWorld.getBoundingSphere();

					let start = new THREE.Vector3(segment.start.x, segment.start.y, bsWorld.center.z);
					let end = new THREE.Vector3(segment.end.x, segment.end.y, bsWorld.center.z);
						
					let closest = new THREE.Line3(start, end).closestPointToPoint(bsWorld.center, true);
					let distance = closest.distanceTo(bsWorld.center);

					let intersects = (distance < (bsWorld.radius + target.profile.width));

					if(!intersects){
						continue;
					}
				}


				//{// DEBUG
				//    console.log(node.name);
				//    let boxHelper = new Potree.Box3Helper(node.getBoundingBox());
				//    boxHelper.matrixAutoUpdate = false;
				//    boxHelper.matrix.copy(viewer.scene.pointclouds[0].matrixWorld);
				//    viewer.scene.scene.add(boxHelper);
				//}

				let sv = new THREE.Vector3().subVectors(segment.end, segment.start).setZ(0);
				let segmentDir = sv.clone().normalize();

				let points = new Potree.Points();

				let nodeMatrix = new THREE.Matrix4().makeTranslation(...node.boundingBox.min.toArray());

				let matrix = new THREE.Matrix4().multiplyMatrices(
					this.pointcloud.matrixWorld, nodeMatrix);

				let posOffset = buffer.offset("position");
				pointsProcessed = pointsProcessed + numPoints;

				let [accepted, mileage, acceptedPositions] = this.getAccepted(numPoints, buffer, posOffset, matrix, segment, segmentDir, points,totalMileage);

				points.data.position = acceptedPositions;

				let relevantAttributes = buffer.attributes.filter(a => !["position", "index"].includes(a.name));
				for(let attribute of relevantAttributes){

					let filteredBuffer = null;
					if(attribute.type === "FLOAT"){
						filteredBuffer = new Float32Array(attribute.numElements * accepted.length);
					}else if(attribute.type === "UNSIGNED_BYTE"){
						filteredBuffer = new Uint8Array(attribute.numElements * accepted.length);
					}else if(attribute.type === "UNSIGNED_SHORT"){
						filteredBuffer = new Uint16Array(attribute.numElements * accepted.length);
					}else if(attribute.type === "UNSIGNED_INT"){
						filteredBuffer = new Uint32Array(attribute.numElements * accepted.length);
					}

					let source = new Uint8Array(buffer.data);
					let target = new Uint8Array(filteredBuffer.buffer);

					let offset = buffer.offset(attribute.name);

					for(let i = 0; i < accepted.length; i++){

						let index = accepted[i];
						
						let start = buffer.stride * index + offset;
						let end = start + attribute.bytes;
						let sub = source.subarray(start, end);

						target.set(sub, i * attribute.bytes);
					}

					points.data[attribute.name] = filteredBuffer;
				}

				points.data['mileage'] = mileage;
				points.numPoints = accepted.length;

				//console.log(`getPointsInsideProfile - ${node.name} - accepted: ${accepted.length}`);

				//performance.measure("20 - 30", "getPointsInsideProfile-20", "getPointsInsideProfile-30");
				//performance.measure("10 - 50", "getPointsInsideProfile-10", "getPointsInsideProfile-50");
				//var measures = performance.getEntriesByType("measure");
				//for(let measure of measures){
				//	console.log(measure.name, measure.duration);
				//}
				//performance.clearMarks();
				//performance.clearMeasures();

				segment.points.add(points);
			}

			totalMileage += segment.length;
		}

		let tEnd = new Date().getTime();
		//console.log((tEnd - tStart).toFixed(2) + ", " + pointsProcessed);

		for (let segment of target.segments) {
			target.boundingBox.union(segment.points.boundingBox);
		}
	};

	finishLevelThenCancel () {
		if (this.cancelRequested) {
			return;
		}

		this.maxDepth = this.highestLevelServed;
		this.cancelRequested = true;

		console.log(`maxDepth: ${this.maxDepth}`);
	};

	cancel () {
		this.callback.onCancel();

		this.priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

		let index = this.pointcloud.profileRequests.indexOf(this);
		if (index >= 0) {
			this.pointcloud.profileRequests.splice(index, 1);
		}
	};
};
