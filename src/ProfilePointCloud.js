const THREE = require('three');
const PointCloudMaterial = require('./materials/PointCloudMaterial');

module.exports = class ProfilePointCloud {
	constructor () {
		this.maxPoints = 0;

		this.geometry = new THREE.BufferGeometry();
		this.buffers = {
			position: new Float32Array(3 * this.maxPoints),
			color: new Uint8Array(4 * this.maxPoints),
			intensity: new Uint16Array(this.maxPoints),
			classification: new Uint8Array(this.maxPoints),
			returnNumber: new Uint8Array(this.maxPoints),
			numberOfReturns: new Uint8Array(this.maxPoints),
			pointSourceID: new Uint16Array(this.maxPoints)
		};

		this.geometry.addAttribute('position', new THREE.BufferAttribute(this.buffers.position, 3));
		this.geometry.addAttribute('color', new THREE.BufferAttribute(this.buffers.color, 4, true));
		this.geometry.addAttribute('intensity', new THREE.BufferAttribute(this.buffers.intensity, 1, false));
		this.geometry.addAttribute('classification', new THREE.BufferAttribute(this.buffers.classification, 1, false));
		this.geometry.addAttribute('returnNumber', new THREE.BufferAttribute(this.buffers.returnNumber, 1, false));
		this.geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(this.buffers.numberOfReturns, 1, false));
		this.geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(this.buffers.pointSourceID, 1, false));

		this.geometry.setDrawRange(0, 0);

		this.material = new PointCloudMaterial();
		this.material.uniforms.minSize.value = 2;
	}
};
