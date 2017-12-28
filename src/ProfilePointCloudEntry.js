const THREE = require('three');
const PointCloudMaterial = require('./materials/PointCloudMaterial');
const PointColorType = require('./materials/PointColorType');

module.exports = class ProfilePointCloudEntry {
	constructor () {
		this.points = [];

		let geometry = new THREE.BufferGeometry();
		let material = new PointCloudMaterial();
		material.uniforms.minSize.value = 2;
		material.uniforms.maxSize.value = 2;
		material.pointColorType = PointColorType.RGB;
		material.opacity = 1.0;
		this.sceneNode = new THREE.Points(geometry, material);
	}

	addPoints (data) {
		this.points.push(data);

		{ // REBUILD MODEL
			if (this.sceneNode) {
				this.sceneNode.geometry.dispose();
			}

			let numPoints = this.points.reduce((a, i) => a + i.numPoints, 0);

			let geometry = new THREE.BufferGeometry();
			let buffers = {
				position: new Float32Array(3 * numPoints),
				color: new Uint8Array(4 * numPoints),
				intensity: new Uint16Array(numPoints),
				classification: new Uint8Array(numPoints),
				returnNumber: new Uint8Array(numPoints),
				numberOfReturns: new Uint8Array(numPoints),
				pointSourceID: new Uint16Array(numPoints)
			};

			let pointsProcessed = 0;
			for (let part of this.points) {
				let projectedBox = new THREE.Box3();

				for (let i = 0; i < part.numPoints; i++) {
					let x = part.data.mileage[i];
					let y = part.data.position[3 * i + 2];
					let z = 0;

					projectedBox.expandByPoint(new THREE.Vector3(x, y, 0));

					buffers.position[3 * pointsProcessed + 0] = x;
					buffers.position[3 * pointsProcessed + 1] = y;
					buffers.position[3 * pointsProcessed + 2] = z;

					if (part.data.color) {
						buffers.color[4 * pointsProcessed + 0] = part.data.color[4 * i + 0];
						buffers.color[4 * pointsProcessed + 1] = part.data.color[4 * i + 1];
						buffers.color[4 * pointsProcessed + 2] = part.data.color[4 * i + 2];
						buffers.color[4 * pointsProcessed + 3] = 255;
					}

					pointsProcessed++;
				}

				data.projectedBox = projectedBox;
			}

			this.projectedBox = this.points.reduce((a, i) => a.union(i.projectedBox), new THREE.Box3());

			geometry.addAttribute('position', new THREE.BufferAttribute(buffers.position, 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(buffers.color, 4, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(buffers.intensity, 1, false));
			geometry.addAttribute('classification', new THREE.BufferAttribute(buffers.classification, 1, false));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(buffers.returnNumber, 1, false));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(buffers.numberOfReturns, 1, false));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(buffers.pointSourceID, 1, false));

			this.sceneNode.geometry = geometry;
		}
	}
};
