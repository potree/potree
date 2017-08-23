Potree.DEM = class DEM {
	constructor (pointcloud) {
		this.pointcloud = pointcloud;
		this.matrix = null;
		this.boundingBox = null;
		this.tileSize = 64;
		this.root = null;
		this.version = 0;
	}

	// expands the tree to all nodes that intersect <box> at <level>
	// returns the intersecting nodes at <level>
	expandAndFindByBox (box, level) {
		if (level === 0) {
			return [this.root];
		}

		let result = [];
		let stack = [this.root];

		while (stack.length > 0) {
			let node = stack.pop();
			let nodeBoxSize = node.box.getSize();

			// check which children intersect by transforming min/max to quadrants
			let min = {
				x: (box.min.x - node.box.min.x) / nodeBoxSize.x,
				y: (box.min.y - node.box.min.y) / nodeBoxSize.y};
			let max = {
				x: (box.max.x - node.box.max.x) / nodeBoxSize.x,
				y: (box.max.y - node.box.max.y) / nodeBoxSize.y};

			min.x = min.x < 0.5 ? 0 : 1;
			min.y = min.y < 0.5 ? 0 : 1;
			max.x = max.x < 0.5 ? 0 : 1;
			max.y = max.y < 0.5 ? 0 : 1;

			let childIndices;
			if (min.x === 0 && min.y === 0 && max.x === 1 && max.y === 1) {
				childIndices = [0, 1, 2, 3];
			} else if (min.x === max.x && min.y === max.y) {
				childIndices = [(min.x << 1) | min.y];
			} else {
				childIndices = [(min.x << 1) | min.y, (max.x << 1) | max.y];
			}

			for (let index of childIndices) {
				if (node.children[index] === undefined) {
					let childBox = node.box.clone();

					if ((index & 2) > 0) {
						childBox.min.x += nodeBoxSize.x / 2.0;
					} else {
						childBox.max.x -= nodeBoxSize.x / 2.0;
					}

					if ((index & 1) > 0) {
						childBox.min.y += nodeBoxSize.y / 2.0;
					} else {
						childBox.max.y -= nodeBoxSize.y / 2.0;
					}

					let child = new Potree.DEMNode(node.name + index, childBox, this.tileSize);
					node.children[index] = child;
				}

				let child = node.children[index];

				if (child.level < level) {
					stack.push(child);
				} else {
					result.push(child);
				}
			}
		}

		return result;
	}

	childIndex (uv) {
		let [x, y] = uv.map(n => n < 0.5 ? 0 : 1);

		let index = (x << 1) | y;

		return index;
	}

	height (position) {
		// return this.root.height(position);

		if (!this.root) {
			return 0;
		}

		let height = null;
		let list = [this.root];
		while (true) {
			let node = list[list.length - 1];

			let currentHeight = node.height(position);

			if (currentHeight !== null) {
				height = currentHeight;
			}

			let uv = node.uv(position);
			let childIndex = this.childIndex(uv);

			if (node.children[childIndex]) {
				list.push(node.children[childIndex]);
			} else {
				break;
			}
		}

		return height + this.pointcloud.position.z;
	}

	update (visibleNodes) {
		if (Potree.getDEMWorkerInstance().working) {
			return;
		}

		// check if point cloud transformation changed
		if (this.matrix === null || !this.matrix.equals(this.pointcloud.matrixWorld)) {
			this.matrix = this.pointcloud.matrixWorld.clone();
			this.boundingBox = this.pointcloud.boundingBox.clone().applyMatrix4(this.matrix);
			this.root = new Potree.DEMNode('r', this.boundingBox, this.tileSize);
			this.version++;
		}

		// find node to update
		let node = null;
		for (let vn of visibleNodes) {
			if (vn.demVersion === undefined || vn.demVersion < this.version) {
				node = vn;
				break;
			}
		}
		if (node === null) {
			return;
		}

		// update node
		let projectedBox = node.getBoundingBox().clone().applyMatrix4(this.matrix);
		let projectedBoxSize = projectedBox.getSize();

		let targetNodes = this.expandAndFindByBox(projectedBox, node.getLevel());
		node.demVersion = this.version;

		Potree.getDEMWorkerInstance().onmessage = (e) => {
			let data = new Float32Array(e.data.dem.data);

			for (let demNode of targetNodes) {
				let boxSize = demNode.box.getSize();

				for (let i = 0; i < this.tileSize; i++) {
					for (let j = 0; j < this.tileSize; j++) {
						let u = (i / (this.tileSize - 1));
						let v = (j / (this.tileSize - 1));

						let x = demNode.box.min.x + u * boxSize.x;
						let y = demNode.box.min.y + v * boxSize.y;

						let ix = this.tileSize * (x - projectedBox.min.x) / projectedBoxSize.x;
						let iy = this.tileSize * (y - projectedBox.min.y) / projectedBoxSize.y;

						if (ix < 0 || ix > this.tileSize) {
							continue;
						}

						if (iy < 0 || iy > this.tileSize) {
							continue;
						}

						ix = Math.min(Math.floor(ix), this.tileSize - 1);
						iy = Math.min(Math.floor(iy), this.tileSize - 1);

						demNode.data[i + this.tileSize * j] = data[ix + this.tileSize * iy];
					}
				}

				demNode.createMipMap();
				demNode.mipMapNeedsUpdate = true;

				Potree.getDEMWorkerInstance().working = false;
			}

			// TODO only works somewhat if there is no rotation to the point cloud

			// let target = targetNodes[0];
			// target.data = new Float32Array(data);
			//
			//
			/// /node.dem = e.data.dem;
			//
			// Potree.getDEMWorkerInstance().working = false;
			//
			// { // create scene objects for debugging
			//	//for(let demNode of targetNodes){
			//		var bb = new Potree.Box3Helper(box);
			//		viewer.scene.scene.add(bb);
			//
			//		createDEMMesh(this, target);
			//	//}
			//
			// }
		};

		let position = node.geometryNode.geometry.attributes.position.array;
		let message = {
			boundingBox: {
				min: node.getBoundingBox().min.toArray(),
				max: node.getBoundingBox().max.toArray()
			},
			position: new Float32Array(position).buffer
		};
		let transferables = [message.position];
		Potree.getDEMWorkerInstance().working = true;
		Potree.getDEMWorkerInstance().postMessage(message, transferables);
	}
};
