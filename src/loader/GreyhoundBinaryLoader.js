import {Version} from "../Version";
import {XHRFactory} from "../XHRFactory";
import {PointAttributeNames} from "./PointAttributes";


export class GreyhoundBinaryLoader{

	constructor(version, boundingBox, scale){
		if (typeof (version) === 'string') {
			this.version = new Version(version);
		} else {
			this.version = version;
		}

		this.boundingBox = boundingBox;
		this.scale = scale;
	}

	load(node){
		if (node.loaded) return;

		let scope = this;
		let url = node.getURL();

		let xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');

		xhr.onreadystatechange = function () {
			if (xhr.readyState === 4) {
				if (xhr.status === 200 || xhr.status === 0) {
					let buffer = xhr.response;
					scope.parse(node, buffer);
				} else {
					console.log(
						'Failed to load file! HTTP status:', xhr.status,
						'file:', url);
				}
			}
		};

		try {
			xhr.send(null);
		} catch (e) {
			console.log('error loading point cloud: ' + e);
		}
	}

	parse(node, buffer){
		let NUM_POINTS_BYTES = 4;

		let view = new DataView(
			buffer, buffer.byteLength - NUM_POINTS_BYTES, NUM_POINTS_BYTES);
		let numPoints = view.getUint32(0, true);
		let pointAttributes = node.pcoGeometry.pointAttributes;

		node.numPoints = numPoints;

		let workerPath = Potree.scriptPath + '/workers/GreyhoundBinaryDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);

		worker.onmessage = function (e) {

			let data = e.data;
			let buffers = data.attributeBuffers;
			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(data.tightBoundingBox.max)
			);

			Potree.workerPool.returnWorker(workerPath, worker);

			let geometry = new THREE.BufferGeometry();

			for(let property in buffers){
				let buffer = buffers[property].buffer;

				if (parseInt(property) === PointAttributeNames.POSITION_CARTESIAN) {
					geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === PointAttributeNames.COLOR_PACKED) {
					geometry.addAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
				} else if (parseInt(property) === PointAttributeNames.INTENSITY) {
					geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(buffer), 1));
				} else if (parseInt(property) === PointAttributeNames.CLASSIFICATION) {
					geometry.addAttribute('classification', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
				} else if (parseInt(property) === PointAttributeNames.NORMAL_SPHEREMAPPED) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === PointAttributeNames.NORMAL_OCT16) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === PointAttributeNames.NORMAL) {
					geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				} else if (parseInt(property) === PointAttributeNames.INDICES) {
					let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
					bufferAttribute.normalized = true;
					geometry.addAttribute('indices', bufferAttribute);
				} else if (parseInt(property) === PointAttributeNames.SPACING) {
					let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
					geometry.addAttribute('spacing', bufferAttribute);
				}
			}

			tightBoundingBox.max.sub(tightBoundingBox.min);
			tightBoundingBox.min.set(0, 0, 0);

			node.numPoints = data.numPoints;
			node.geometry = geometry;
			node.mean = new THREE.Vector3(...data.mean);
			node.tightBoundingBox = tightBoundingBox;
			node.loaded = true;
			node.loading = false;
			Potree.numNodesLoading--;
		};

		let bb = node.boundingBox;
		let nodeOffset = node.pcoGeometry.boundingBox.getCenter(new THREE.Vector3()).sub(node.boundingBox.min);

		let message = {
			buffer: buffer,
			pointAttributes: pointAttributes,
			version: this.version.version,
			schema: node.pcoGeometry.schema,
			min: [bb.min.x, bb.min.y, bb.min.z],
			max: [bb.max.x, bb.max.y, bb.max.z],
			offset: nodeOffset.toArray(),
			scale: this.scale,
			normalize: node.pcoGeometry.normalize
		};

		worker.postMessage(message, [message.buffer]);
	}

}
