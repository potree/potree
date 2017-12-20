const THREE = require('three');
const PointCloudMaterial = require('./materials/PointCloudMaterial');
const PointColorType = require('./materials/PointColorType');

class ProfilePointCloudEntry {
	constructor () {
		this.points = [];

		// let geometry = new THREE.BufferGeometry();
		let material = ProfilePointCloudEntry.getMaterialInstance();
		material.uniforms.minSize.value = 2;
		material.uniforms.maxSize.value = 2;
		material.pointColorType = PointColorType.RGB;
		material.opacity = 1.0;

		this.material = material;

		this.sceneNode = new THREE.Object3D();
		// this.sceneNode = new THREE.Points(geometry, material);
	}

	static releaseMaterialInstance (instance) {
		ProfilePointCloudEntry.materialPool.add(instance);
	}

	static getMaterialInstance () {
		let instance = ProfilePointCloudEntry.materialPool.values().next().value;
		if (!instance) {
			instance = new PointCloudMaterial();
		} else {
			ProfilePointCloudEntry.materialPool.delete(instance);
		}

		return instance;
	}

	dispose () {
		for (let child of this.sceneNode.children) {
			ProfilePointCloudEntry.releaseMaterialInstance(child.material);
			child.geometry.dispose();
		}

		this.sceneNode.children = [];
	}

	addPoints (data) {
		this.points.push(data);
		let batchSize = 10 * 1000;
		let createNewBatch = () => {
			let geometry = new THREE.BufferGeometry();
			let buffers = {
				position: new Float32Array(3 * batchSize),
				color: new Uint8Array(4 * batchSize),
				intensity: new Uint16Array(batchSize),
				classification: new Uint8Array(batchSize),
				returnNumber: new Uint8Array(batchSize),
				numberOfReturns: new Uint8Array(batchSize),
				pointSourceID: new Uint16Array(batchSize)
			};

			geometry.addAttribute('position', new THREE.BufferAttribute(buffers.position, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(buffers.color, 4, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(buffers.intensity, 1, false));
			geometry.addAttribute('classification', new THREE.BufferAttribute(buffers.classification, 1, false));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(buffers.returnNumber, 1, false));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(buffers.numberOfReturns, 1, false));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(buffers.pointSourceID, 1, false));

			geometry.drawRange.start = 0;
			geometry.drawRange.count = 0;

			this.currentBatch = new THREE.Points(geometry, this.material);
			this.sceneNode.add(this.currentBatch);
		};

		if (!this.currentBatch) {
			createNewBatch();
		}

		{ // REBUILD MODEL
			// TODO: unused: let pointsProcessed = 0;

			let updateRange = {
				start: this.currentBatch.geometry.drawRange.count,
				count: 0
			};

			let projectedBox = new THREE.Box3();

			for (let i = 0; i < data.numPoints; i++) {
				if (updateRange.start + updateRange.count >= batchSize) {
					// finalize current batch, start new batch

					for (let attribute of Object.values(this.currentBatch.geometry.attributes)) {
						attribute.updateRange.offset = updateRange.start;
						attribute.updateRange.count = updateRange.count;
						attribute.needsUpdate = true;
					}
					this.currentBatch.geometry.computeBoundingBox();
					this.currentBatch.geometry.computeBoundingSphere();

					createNewBatch();
					updateRange = {
						start: 0,
						count: 0
					};
				}

				let x = data.data.mileage[i];
				let y = data.data.position[3 * i + 2];
				let z = 0;
				projectedBox.expandByPoint(new THREE.Vector3(x, y, 0));
				let currentIndex = updateRange.start + updateRange.count;
				this.currentBatch.geometry.attributes.position.array[3 * currentIndex + 0] = x;
				this.currentBatch.geometry.attributes.position.array[3 * currentIndex + 1] = y;
				this.currentBatch.geometry.attributes.position.array[3 * currentIndex + 2] = z;

				if (data.data.color) {
					this.currentBatch.geometry.attributes.color.array[4 * currentIndex + 0] = data.data.color[4 * i + 0];
					this.currentBatch.geometry.attributes.color.array[4 * currentIndex + 1] = data.data.color[4 * i + 1];
					this.currentBatch.geometry.attributes.color.array[4 * currentIndex + 2] = data.data.color[4 * i + 2];
					this.currentBatch.geometry.attributes.color.array[4 * currentIndex + 3] = 255;
				}

				updateRange.count++;
				this.currentBatch.geometry.drawRange.count++;
			}

			for (let attribute of Object.values(this.currentBatch.geometry.attributes)) {
				attribute.updateRange.offset = updateRange.start;
				attribute.updateRange.count = updateRange.count;
				attribute.needsUpdate = true;
			}

			data.projectedBox = projectedBox;

			// debugger;

			this.projectedBox = this.points.reduce((a, i) => a.union(i.projectedBox), new THREE.Box3());
		}
	}
};
ProfilePointCloudEntry.materialPool = [];
module.exports = ProfilePointCloudEntry;
