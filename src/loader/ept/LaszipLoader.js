
import * as THREE from "../../../libs/three.js/build/three.module.js";
import {XHRFactory} from "../../XHRFactory.js";

/**
 * laslaz code taken and adapted from plas.io js-laslaz
 *	  http://plas.io/
 *	https://github.com/verma/plasio
 *
 * Thanks to Uday Verma and Howard Butler
 *
 */

export class EptLaszipLoader {
	load(node) {
		if (node.loaded) return;

		let url = node.url() + '.laz';

		let xhr = XHRFactory.createXMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.responseType = 'arraybuffer';
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = () => {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					let buffer = xhr.response;
					this.parse(node, buffer);
				} else {
					console.log('Failed ' + url + ': ' + xhr.status);
				}
			}
		};

		xhr.send(null);
	}

	async parse(node, buffer){
		let lf = new LASFile(buffer);
		let handler = new EptLazBatcher(node);

		try{
			await lf.open();

			lf.isOpen = true;

			const header = await lf.getHeader();

			{
				let i = 0;

				let toArray = (v) => [v.x, v.y, v.z];
				let mins = toArray(node.key.b.min);
				let maxs = toArray(node.key.b.max);

				let hasMoreData = true;

				while(hasMoreData){
					const data = await lf.readData(1000000, 0, 1);

					let d = new LASDecoder(
						data.buffer,
						header.pointsFormatId,
						header.pointsStructSize,
						data.count,
						header.scale,
						header.offset,
						mins,
						maxs);

					d.extraBytes = header.extraBytes;
					d.pointsFormatId = header.pointsFormatId;
					handler.push(d);

					i += data.count;

					hasMoreData = data.hasMoreData;
				}

				header.totalRead = i;
				header.versionAsString = lf.versionAsString;
				header.isCompressed = lf.isCompressed;

				await lf.close();

				lf.isOpen = false;
			}

		}catch(err){
			console.error('Error reading LAZ:', err);
			
			if (lf.isOpen) {
				await lf.close();

				lf.isOpen = false;
			}
			
			throw err;
		}
	}
};

export class EptLazBatcher {
	constructor(node) { this.node = node; }

	push(las) {
		let workerPath = Potree.scriptPath +
			'/workers/EptLaszipDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);

		worker.onmessage = (e) => {
			let g = new THREE.BufferGeometry();
			let numPoints = las.pointsCount;

			let positions = new Float32Array(e.data.position);
			let colors = new Uint8Array(e.data.color);

			let intensities = new Float32Array(e.data.intensity);
			let classifications = new Uint8Array(e.data.classification);
			let returnNumbers = new Uint8Array(e.data.returnNumber);
			let numberOfReturns = new Uint8Array(e.data.numberOfReturns);
			let pointSourceIDs = new Uint16Array(e.data.pointSourceID);
			let indices = new Uint8Array(e.data.indices);
			let gpsTime = new Float32Array(e.data.gpsTime);

			g.setAttribute('position',
					new THREE.BufferAttribute(positions, 3));
			g.setAttribute('rgba',
					new THREE.BufferAttribute(colors, 4, true));
			g.setAttribute('intensity',
					new THREE.BufferAttribute(intensities, 1));
			g.setAttribute('classification',
					new THREE.BufferAttribute(classifications, 1));
			g.setAttribute('return number',
					new THREE.BufferAttribute(returnNumbers, 1));
			g.setAttribute('number of returns',
					new THREE.BufferAttribute(numberOfReturns, 1));
			g.setAttribute('source id',
					new THREE.BufferAttribute(pointSourceIDs, 1));
			g.setAttribute('indices',
					new THREE.BufferAttribute(indices, 4));
			g.setAttribute('gpsTime',
					new THREE.BufferAttribute(gpsTime, 1));
			this.node.gpsTime = e.data.gpsMeta;

			g.attributes.indices.normalized = true;

			let tightBoundingBox = new THREE.Box3(
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.min),
				new THREE.Vector3().fromArray(e.data.tightBoundingBox.max)
			);

			this.node.doneLoading(
				g,
				tightBoundingBox,
				numPoints,
				new THREE.Vector3(...e.data.mean));

			Potree.workerPool.returnWorker(workerPath, worker);
		};

		let message = {
			buffer: las.arrayb,
			numPoints: las.pointsCount,
			pointSize: las.pointSize,
			pointFormatID: las.pointsFormatId,
			scale: las.scale,
			offset: las.offset,
			mins: las.mins,
			maxs: las.maxs
		};

		worker.postMessage(message, [message.buffer]);
	};
};

