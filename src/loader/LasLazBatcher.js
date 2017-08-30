const context = require('../context');
const THREE = require('three');

module.exports = class LasLazBatcher {
	constructor (node) {
		this.node = node;
	}

	push (lasBuffer) {
		let workerPath = context.scriptPath + '/workers/LASDecoderWorker.js';
		let worker = context.workerPool.getWorker(workerPath);

		worker.onmessage = (e) => {
			let geometry = new THREE.BufferGeometry();
			let numPoints = lasBuffer.pointsCount;

			/*
			TODO Unused:
			let endsWith = function (str, suffix) {
				return str.indexOf(suffix, str.length - suffix.length) !== -1;
			};
			*/

			let positions = e.data.position;
			let colors = new Uint8Array(e.data.color);
			let intensities = e.data.intensity;
			let classifications = new Uint8Array(e.data.classification);
			let returnNumbers = new Uint8Array(e.data.returnNumber);
			let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			// let indices = new ArrayBuffer(numPoints*4);
			// let iIndices = new Uint32Array(indices);

			// let box = new THREE.Box3();
			//
			// let fPositions = new Float32Array(positions);
			// for(let i = 0; i < numPoints; i++){
			//	box.expandByPoint(new THREE.Vector3(fPositions[3*i+0], fPositions[3*i+1], fPositions[3*i+2]));
			// }

			geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
			geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));
			geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(intensities), 1));
			geometry.addAttribute('classification', new THREE.BufferAttribute(classifications, 1));
			geometry.addAttribute('returnNumber', new THREE.BufferAttribute(returnNumbers, 1));
			geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(numberOfReturns, 1));
			geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(pointSourceIDs, 1));
			geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(numPoints * 3), 3));

			let indicesAttribute = new THREE.Uint8BufferAttribute(e.data.indices, 4);
			indicesAttribute.normalized = true;
			geometry.addAttribute('indices', indicesAttribute);

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			geometry.boundingBox = this.node.boundingBox;
			this.node.tightBoundingBox = tightBoundingBox;

			this.node.geometry = geometry;
			this.node.loaded = true;
			this.node.loading = false;
			this.node.pcoGeometry.numNodesLoading--;
			this.node.mean = new THREE.Vector3(...e.data.mean);

			context.workerPool.returnWorker(workerPath, worker);
		};

		let message = {
			buffer: lasBuffer.arrayb,
			numPoints: lasBuffer.pointsCount,
			pointSize: lasBuffer.pointSize,
			pointFormatID: 2,
			scale: lasBuffer.scale,
			offset: lasBuffer.offset,
			mins: lasBuffer.mins,
			maxs: lasBuffer.maxs
		};
		worker.postMessage(message, [message.buffer]);
	};
};

module.exports = LasLazBatcher;
