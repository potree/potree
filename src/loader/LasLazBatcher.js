const context = require('../context');
const THREE = require('three');
const PointAttribute = require('./PointAttribute');
const InterleavedBuffer = require('../InterleavedBuffer');
const toInterleavedBufferAttribute = require('../utils/toInterleavedBufferAttribute');
const InterleavedBufferAttribute = require('../InterleavedBufferAttribute');

module.exports = class LasLazBatcher {
	constructor (node) {
		this.node = node;
	}

	push (lasBuffer) {
		let workerPath = context.scriptPath + '/workers/LASDecoderWorker.js';
		let worker = context.workerPool.getWorker(workerPath);

		worker.onmessage = (e) => {
			let numPoints = lasBuffer.pointsCount;

			let attributes = [
				PointAttribute.POSITION_CARTESIAN,
				PointAttribute.RGBA_PACKED,
				PointAttribute.INTENSITY,
				PointAttribute.CLASSIFICATION,
				PointAttribute.RETURN_NUMBER,
				PointAttribute.NUMBER_OF_RETURNS,
				PointAttribute.SOURCE_ID
			];

			let data = e.data;
			let iAttributes = attributes
				.map(pa => toInterleavedBufferAttribute(pa))
				.filter(ia => ia != null);
			iAttributes.push(new InterleavedBufferAttribute('index', 4, 4, 'UNSIGNED_BYTE', true));
			let iBuffer = new InterleavedBuffer(data.data, iAttributes, numPoints);

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			context.workerPool.returnWorker(workerPath, worker);

			this.node.estimatedSpacing = this.node.spacing;
			this.node.numPoints = iBuffer.numElements;
			this.node.buffer = iBuffer;
			this.node.mean = new THREE.Vector3(...data.mean);
			this.node.tightBoundingBox = tightBoundingBox;
			this.node.loaded = true;
			this.node.loading = false;
			this.node.pcoGeometry.numNodesLoading--;
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
