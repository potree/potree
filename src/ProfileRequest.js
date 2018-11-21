
import {Points} from "./Points";

export class ProfileData {
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
				points: new Points()
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

export class ProfileRequest {
	constructor (pointcloud, profile, maxDepth, callback) {
		this.pointcloud = pointcloud;
		this.profile = profile;
		this.maxDepth = maxDepth || Number.MAX_VALUE;
		this.callback = callback;
		this.temporaryResult = new ProfileData(this.profile);
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

	update(){
		if(!this.updateGeneratorInstance){
			this.updateGeneratorInstance = this.updateGenerator();
		}

		let result = this.updateGeneratorInstance.next();
		if(result.done){
			this.updateGeneratorInstance = null;
		}
	}

	* updateGenerator(){
		// load nodes in queue
		// if hierarchy expands, also load nodes from expanded hierarchy
		// once loaded, add data to this.points and remove node from queue
		// only evaluate 1-50 nodes per frame to maintain responsiveness

		let start = performance.now();

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
				exports.lru.touch(node);
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

			for(let done of this.getPointsInsideProfile(intersectedNodes, this.temporaryResult)){
				if(!done){
					//console.log("updateGenerator yields");
					yield false;
				}
			}
			if (this.temporaryResult.size() > 100) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new ProfileData(this.profile);
			}
		}

		if (this.priorityQueue.size() === 0) {
			// we're done! inform callback and remove from pending requests

			if (this.temporaryResult.size() > 0) {
				this.pointsServed += this.temporaryResult.size();
				this.callback.onProgress({request: this, points: this.temporaryResult});
				this.temporaryResult = new ProfileData(this.profile);
			}

			this.callback.onFinish({request: this});

			let index = this.pointcloud.profileRequests.indexOf(this);
			if (index >= 0) {
				this.pointcloud.profileRequests.splice(index, 1);
			}
		}

		yield true;
	};

	* getAccepted(numPoints, node, matrix, segment, segmentDir, points, totalMileage){
		let checkpoint = performance.now();

		let accepted = new Uint32Array(numPoints);
		let mileage = new Float64Array(numPoints);
		let acceptedPositions = new Float32Array(numPoints * 3);
		let numAccepted = 0;

		let pos = new THREE.Vector3();
		let svp = new THREE.Vector3();

		let view = new Float32Array(node.geometry.attributes.position.array);

		for (let i = 0; i < numPoints; i++) {

			pos.set(
				view[i * 3 + 0],
				view[i * 3 + 1],
				view[i * 3 + 2]);
		
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

			if((i % 1000) === 0){
				let duration = performance.now() - checkpoint;
				if(duration > 4){
					//console.log(`getAccepted yield after ${duration}ms`);
					yield false;
					checkpoint = performance.now();
				}
			}
		}

		accepted = accepted.subarray(0, numAccepted);
		mileage = mileage.subarray(0, numAccepted);
		acceptedPositions = acceptedPositions.subarray(0, numAccepted * 3);

		//let end = performance.now();
		//let duration = end - start;
		//console.log("accepted duration ", duration)

		//console.log(`getAccepted finished`);

		yield [accepted, mileage, acceptedPositions];
	}

	* getPointsInsideProfile(nodes, target){
		let checkpoint = performance.now();
		let totalMileage = 0;

		let pointsProcessed = 0;

		for (let segment of target.segments) {
			for (let node of nodes) {
				let numPoints = node.numPoints;
				let geometry = node.geometry;

				if(!numPoints){
					continue;
				}

				{ // skip if current node doesn't intersect current segment
					let bbWorld = node.boundingBox.clone().applyMatrix4(this.pointcloud.matrixWorld);
					let bsWorld = bbWorld.getBoundingSphere(new THREE.Sphere());

					let start = new THREE.Vector3(segment.start.x, segment.start.y, bsWorld.center.z);
					let end = new THREE.Vector3(segment.end.x, segment.end.y, bsWorld.center.z);
						
					let closest = new THREE.Line3(start, end).closestPointToPoint(bsWorld.center, true, new THREE.Vector3());
					let distance = closest.distanceTo(bsWorld.center);

					let intersects = (distance < (bsWorld.radius + target.profile.width));

					if(!intersects){
						continue;
					}
				}

				//{// DEBUG
				//	console.log(node.name);
				//	let boxHelper = new Potree.Box3Helper(node.getBoundingBox());
				//	boxHelper.matrixAutoUpdate = false;
				//	boxHelper.matrix.copy(viewer.scene.pointclouds[0].matrixWorld);
				//	viewer.scene.scene.add(boxHelper);
				//}

				let sv = new THREE.Vector3().subVectors(segment.end, segment.start).setZ(0);
				let segmentDir = sv.clone().normalize();

				let points = new Points();

				let nodeMatrix = new THREE.Matrix4().makeTranslation(...node.boundingBox.min.toArray());

				let matrix = new THREE.Matrix4().multiplyMatrices(
					this.pointcloud.matrixWorld, nodeMatrix);

				pointsProcessed = pointsProcessed + numPoints;

				let accepted = null;
				let mileage = null;
				let acceptedPositions = null;
				for(let result of this.getAccepted(numPoints, node, matrix, segment, segmentDir, points,totalMileage)){
					if(!result){
						let duration = performance.now() - checkpoint;
						//console.log(`getPointsInsideProfile yield after ${duration}ms`);
						yield false;
						checkpoint = performance.now();
					}else{
						[accepted, mileage, acceptedPositions] = result;
					}
				}

				let duration = performance.now() - checkpoint;
				if(duration > 4){
					//console.log(`getPointsInsideProfile yield after ${duration}ms`);
					yield false;
					checkpoint = performance.now();
				}

				points.data.position = acceptedPositions;

				let relevantAttributes = Object.keys(geometry.attributes).filter(a => !["position", "indices"].includes(a));
				for(let attributeName of relevantAttributes){

					let attribute = geometry.attributes[attributeName];
					let numElements = attribute.array.length / numPoints;

					if(numElements !== parseInt(numElements)){
						debugger;
					}

					let Type = attribute.array.constructor;

					let filteredBuffer = new Type(numElements * accepted.length);

					let source = attribute.array;
					let target = filteredBuffer;

					for(let i = 0; i < accepted.length; i++){

						let index = accepted[i];
						
						let start = index * numElements;
						let end = start + numElements;
						let sub = source.subarray(start, end);

						target.set(sub, i * numElements);
					}

					points.data[attributeName] = filteredBuffer;
				}

				points.data['mileage'] = mileage;
				points.numPoints = accepted.length;

				segment.points.add(points);
			}

			totalMileage += segment.length;
		}

		for (let segment of target.segments) {
			target.boundingBox.union(segment.points.boundingBox);
		}

		//console.log(`getPointsInsideProfile finished`);
		yield true;
	};

	finishLevelThenCancel () {
		if (this.cancelRequested) {
			return;
		}

		this.maxDepth = this.highestLevelServed;
		this.cancelRequested = true;

		//console.log(`maxDepth: ${this.maxDepth}`);
	};

	cancel () {
		this.callback.onCancel();

		this.priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

		let index = this.pointcloud.profileRequests.indexOf(this);
		if (index >= 0) {
			this.pointcloud.profileRequests.splice(index, 1);
		}
	};
}
