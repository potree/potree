
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
		this.priorityQueue.push({node: this.pointcloud.pcoGeometry.root, weight: 1});
		this.traverse(this.pointcloud.pcoGeometry.root);
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

			if (node.loaded) {
				// add points to result
				intersectedNodes.push(node);
				Potree.getLRU().touch(node);
				this.highestLevelServed = node.getLevel();

				if ((node.level % node.pcoGeometry.hierarchyStepSize) === 0 && node.hasChildren) {
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

	getPointsInsideProfile (nodes, target) {
		let totalMileage = 0;

		for (let segment of target.segments) {
			for (let node of nodes) {
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

				let nodeMatrix = new THREE.Matrix4().makeTranslation(...node.boundingBox.min.toArray());

				let matrix = new THREE.Matrix4().multiplyMatrices(
					this.pointcloud.matrixWorld, nodeMatrix);

				for (let i = 0; i < numPoints; i++) {
					let pos = new THREE.Vector3(p[3 * i], p[3 * i + 1], p[3 * i + 2]);
					pos.applyMatrix4(matrix);
					let distance = Math.abs(segment.cutPlane.distanceToPoint(pos));
					let centerDistance = Math.abs(segment.halfPlane.distanceToPoint(pos));

					if (distance < this.profile.width / 2 && centerDistance < segment.length / 2) {
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

				for (let attribute of Object.keys(geometry.attributes).filter(a => a !== 'indices')) {
					let bufferedAttribute = geometry.attributes[attribute];
					let Type = bufferedAttribute.array.constructor;

					let filteredBuffer = null;

					if (attribute === 'position') {
						filteredBuffer = new Type(acceptedPositions);
					} else {
						filteredBuffer = new Type(accepted.length * bufferedAttribute.itemSize);

						for (let i = 0; i < accepted.length; i++) {
							let index = accepted[i];

							filteredBuffer.set(
								bufferedAttribute.array.subarray(
									bufferedAttribute.itemSize * index,
									bufferedAttribute.itemSize * index + bufferedAttribute.itemSize),
								bufferedAttribute.itemSize * i);
						}
					}
					points.data[attribute] = filteredBuffer;
				}

				points.data['mileage'] = new Float64Array(mileage);
				points.numPoints = accepted.length;

				segment.points.add(points);
			}

			totalMileage += segment.length;
		}

		for (let segment of target.segments) {
			target.boundingBox.union(segment.points.boundingBox);
		}
	};

	finishLevelThenCancel () {
		if (this.cancelRequested) {
			return;
		}

		this.maxDepth = this.highestLevelServed + 1;
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
