

import {Version} from "../Version.js";
import {PointAttributes, PointAttribute} from "../loader/PointAttributes.js";
import {InterleavedBuffer} from "../InterleavedBuffer.js";
import {toInterleavedBufferAttribute} from "../utils/toInterleavedBufferAttribute.js";



/* global onmessage:true postMessage:false */
/* exported onmessage */
// http://jsperf.com/uint8array-vs-dataview3/3
function CustomView (buffer) {
	this.buffer = buffer;
	this.u8 = new Uint8Array(buffer);

	let tmp = new ArrayBuffer(8);
	let tmpf = new Float32Array(tmp);
	let tmpd = new Float64Array(tmp);
	let tmpu8 = new Uint8Array(tmp);

	this.getUint32 = function (i) {
		return (this.u8[i + 3] << 24) | (this.u8[i + 2] << 16) | (this.u8[i + 1] << 8) | this.u8[i];
	};

	this.getUint16 = function (i) {
		return (this.u8[i + 1] << 8) | this.u8[i];
	};

	this.getFloat32 = function (i) {
		tmpu8[0] = this.u8[i + 0];
		tmpu8[1] = this.u8[i + 1];
		tmpu8[2] = this.u8[i + 2];
		tmpu8[3] = this.u8[i + 3];

		return tmpf[0];
	};

	this.getFloat64 = function (i) {
		tmpu8[0] = this.u8[i + 0];
		tmpu8[1] = this.u8[i + 1];
		tmpu8[2] = this.u8[i + 2];
		tmpu8[3] = this.u8[i + 3];
		tmpu8[4] = this.u8[i + 4];
		tmpu8[5] = this.u8[i + 5];
		tmpu8[6] = this.u8[i + 6];
		tmpu8[7] = this.u8[i + 7];

		return tmpd[0];
	};

	this.getUint8 = function (i) {
		return this.u8[i];
	};
}

Potree = {};

onmessage = function (event) {

	performance.mark("binary-decoder-start");
	
	let buffer = event.data.buffer;
	let pointAttributes = event.data.pointAttributes;
	let numPoints = buffer.byteLength / pointAttributes.byteSize;
	let cv = new CustomView(buffer);
	let version = new Version(event.data.version);
	let nodeOffset = event.data.offset;
	let scale = event.data.scale;
	let spacing = event.data.spacing;
	let hasChildren = event.data.hasChildren;
	let name = event.data.name;
	
	let tightBoxMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
	let tightBoxMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
	let mean = [0, 0, 0];
	

	let attributeBuffers = {};
	let inOffset = 0;
	for (let pointAttribute of pointAttributes.attributes) {
		
		if (pointAttribute.name === PointAttribute.POSITION_CARTESIAN.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let positions = new Float32Array(buff);
		
			for (let j = 0; j < numPoints; j++) {
				let x, y, z;

				if (version.newerThan('1.3')) {
					x = (cv.getUint32(inOffset + j * pointAttributes.byteSize + 0, true) * scale);
					y = (cv.getUint32(inOffset + j * pointAttributes.byteSize + 4, true) * scale);
					z = (cv.getUint32(inOffset + j * pointAttributes.byteSize + 8, true) * scale);
				} else {
					x = cv.getFloat32(j * pointAttributes.byteSize + 0, true) + nodeOffset[0];
					y = cv.getFloat32(j * pointAttributes.byteSize + 4, true) + nodeOffset[1];
					z = cv.getFloat32(j * pointAttributes.byteSize + 8, true) + nodeOffset[2];
				}

				positions[3 * j + 0] = x;
				positions[3 * j + 1] = y;
				positions[3 * j + 2] = z;

				mean[0] += x / numPoints;
				mean[1] += y / numPoints;
				mean[2] += z / numPoints;

				tightBoxMin[0] = Math.min(tightBoxMin[0], x);
				tightBoxMin[1] = Math.min(tightBoxMin[1], y);
				tightBoxMin[2] = Math.min(tightBoxMin[2], z);

				tightBoxMax[0] = Math.max(tightBoxMax[0], x);
				tightBoxMax[1] = Math.max(tightBoxMax[1], y);
				tightBoxMax[2] = Math.max(tightBoxMax[2], z);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.COLOR_PACKED.name) {
			let buff = new ArrayBuffer(numPoints * 4);
			let colors = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				colors[4 * j + 0] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				colors[4 * j + 1] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 1);
				colors[4 * j + 2] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 2);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.INTENSITY.name) {
			let buff = new ArrayBuffer(numPoints * 4);
			let intensities = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let intensity = cv.getUint16(inOffset + j * pointAttributes.byteSize, true);
				intensities[j] = intensity;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.CLASSIFICATION.name) {
			let buff = new ArrayBuffer(numPoints);
			let classifications = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let classification = cv.getUint8(inOffset + j * pointAttributes.byteSize);
				classifications[j] = classification;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.RETURN_NUMBER.name) {
			let buff = new ArrayBuffer(numPoints);
			let returnNumbers = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let returnNumber = cv.getUint8(inOffset + j * pointAttributes.byteSize);
				returnNumbers[j] = returnNumber;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.NUMBER_OF_RETURNS.name) {
			let buff = new ArrayBuffer(numPoints);
			let numberOfReturns = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let numberOfReturn = cv.getUint8(inOffset + j * pointAttributes.byteSize);
				numberOfReturns[j] = numberOfReturn;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.SOURCE_ID.name) {
			let buff = new ArrayBuffer(numPoints * 2);
			let sourceIDs = new Uint16Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let sourceID = cv.getUint16(inOffset + j * pointAttributes.byteSize);
				sourceIDs[j] = sourceID;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.NORMAL_SPHEREMAPPED.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let bx = cv.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				let by = cv.getUint8(inOffset + j * pointAttributes.byteSize + 1);

				let ex = bx / 255;
				let ey = by / 255;

				let nx = ex * 2 - 1;
				let ny = ey * 2 - 1;
				let nz = 1;
				let nw = -1;

				let l = (nx * (-nx)) + (ny * (-ny)) + (nz * (-nw));
				nz = l;
				nx = nx * Math.sqrt(l);
				ny = ny * Math.sqrt(l);

				nx = nx * 2;
				ny = ny * 2;
				nz = nz * 2 - 1;

				normals[3 * j + 0] = nx;
				normals[3 * j + 1] = ny;
				normals[3 * j + 2] = nz;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.NORMAL_OCT16.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let bx = cv.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				let by = cv.getUint8(inOffset + j * pointAttributes.byteSize + 1);

				let u = (bx / 255) * 2 - 1;
				let v = (by / 255) * 2 - 1;

				let z = 1 - Math.abs(u) - Math.abs(v);

				let x = 0;
				let y = 0;
				if (z >= 0) {
					x = u;
					y = v;
				} else {
					x = -(v / Math.sign(v) - 1) / Math.sign(u);
					y = -(u / Math.sign(u) - 1) / Math.sign(v);
				}

				let length = Math.sqrt(x * x + y * y + z * z);
				x = x / length;
				y = y / length;
				z = z / length;
				
				normals[3 * j + 0] = x;
				normals[3 * j + 1] = y;
				normals[3 * j + 2] = z;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.NORMAL.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let x = cv.getFloat32(inOffset + j * pointAttributes.byteSize + 0, true);
				let y = cv.getFloat32(inOffset + j * pointAttributes.byteSize + 4, true);
				let z = cv.getFloat32(inOffset + j * pointAttributes.byteSize + 8, true);
				
				normals[3 * j + 0] = x;
				normals[3 * j + 1] = y;
				normals[3 * j + 2] = z;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === PointAttribute.GPS_TIME.name) {
			let buff = new ArrayBuffer(numPoints * 8);
			let gpstimes = new Float64Array(buff);

			for(let j = 0; j < numPoints; j++){
				let gpstime = cv.getFloat64(inOffset + j * pointAttributes.byteSize, true);
				gpstimes[j] = gpstime;
			}
			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}

		inOffset += pointAttribute.byteSize;
	}

	// Convert GPS time from double (unsupported by WebGL) to origin-aligned floats
	if(attributeBuffers[PointAttribute.GPS_TIME.name]){ 
		let attribute = attributeBuffers[PointAttribute.GPS_TIME.name];
		let sourceF64 = new Float64Array(attribute.buffer);
		let target = new ArrayBuffer(numPoints * 4);
		let targetF32 = new Float32Array(target);

		let min = Infinity;
		let max = -Infinity;
		for(let i = 0; i < numPoints; i++){
			let gpstime = sourceF64[i];

			min = Math.min(min, gpstime);
			max = Math.max(max, gpstime);
		}

		for(let i = 0; i < numPoints; i++){
			let gpstime = sourceF64[i];
			targetF32[i] = gpstime - min;
		}

		attributeBuffers[PointAttribute.GPS_TIME.name] = { 
			buffer: target, 
			attribute: PointAttribute.GPS_TIME,
			offset: min,
			range: max - min};
	}

	//let debugNodes = ["r026", "r0226","r02274"];
	//if(debugNodes.includes(name)){
	if(false){
		console.log("estimate spacing!");


		let sparseGrid = new Map();
		let gridSize = 16;

		let tightBoxSize = tightBoxMax.map( (a, i) => a - tightBoxMin[i]);
		let cubeLength = Math.max(...tightBoxSize);
		let cube = {
			min: tightBoxMin,
			max: tightBoxMin.map(v => v + cubeLength)
		};

		let positions = new Float32Array(attributeBuffers[PointAttribute.POSITION_CARTESIAN.name].buffer);
		for(let i = 0; i < numPoints; i++){
			let x = positions[3 * i + 0];
			let y = positions[3 * i + 1];
			let z = positions[3 * i + 2];

			let ix = Math.max(0, Math.min(gridSize * (x - cube.min[0]) / cubeLength, gridSize - 1));
			let iy = Math.max(0, Math.min(gridSize * (y - cube.min[1]) / cubeLength, gridSize - 1));
			let iz = Math.max(0, Math.min(gridSize * (z - cube.min[2]) / cubeLength, gridSize - 1));

			ix = Math.floor(ix);
			iy = Math.floor(iy);
			iz = Math.floor(iz);

			let cellIndex = ix | (iy << 8) | (iz << 16);
			
			if(!sparseGrid.has(cellIndex)){
				sparseGrid.set(cellIndex, []);
			}

			sparseGrid.get(cellIndex).push(i);
		}

		let kNearest = (pointIndex, candidates, numNearest) => {
			
			let x = positions[3 * pointIndex + 0];
			let y = positions[3 * pointIndex + 1];
			let z = positions[3 * pointIndex + 2];

			let candidateDistances = [];

			for(let candidateIndex of candidates){
				if(candidateIndex === pointIndex){
					continue;
				}

				let cx = positions[3 * candidateIndex + 0];
				let cy = positions[3 * candidateIndex + 1];
				let cz = positions[3 * candidateIndex + 2];

				let squaredDistance = (cx - x) ** 2 + (cy - y) ** 2 + (cz - z) ** 2;

				candidateDistances.push({candidateInde: candidateIndex, squaredDistance: squaredDistance});
			}

			candidateDistances.sort( (a, b) => a.squaredDistance - b.squaredDistance);
			let nearest = candidateDistances.slice(0, numNearest);

			return nearest;
		};

		let meansBuffer = new ArrayBuffer(numPoints * 4);
		let means = new Float32Array(meansBuffer);

		for(let [key, value] of sparseGrid){
			
			for(let pointIndex of value){

				if(value.length === 1){
					means[pointIndex] = 0;
					continue;
				}

				let [ix, iy, iz] = [(key & 255), ((key >> 8) & 255), ((key >> 16) & 255)];
				
				//let candidates = value;
				let candidates = [];
				for(let i of [-1, 0, 1]){
					for(let j of [-1, 0, 1]){
						for(let k of [-1, 0, 1]){
							let cellIndex = (ix + i) | ((iy + j) << 8) | ((iz + k) << 16);

							if(sparseGrid.has(cellIndex)){
								candidates.push(...sparseGrid.get(cellIndex));
							}
						}
					}
				}


				let nearestNeighbors = kNearest(pointIndex, candidates, 10);

				let sum = 0;
				for(let neighbor of nearestNeighbors){
					sum += Math.sqrt(neighbor.squaredDistance);
				}

				//let mean = sum / nearestNeighbors.length;
				let mean = Math.sqrt(Math.max(...nearestNeighbors.map(n => n.squaredDistance)));

				if(Number.isNaN(mean)){
					debugger;
				}


				means[pointIndex] = mean;

			}

		}


		let maxMean = Math.max(...means);
		let minMean = Math.min(...means);

		//let colors = new Uint8Array(attributeBuffers[PointAttribute.COLOR_PACKED.name].buffer);
		//for(let i = 0; i < numPoints; i++){
		//	let v = means[i] / 0.05;

		//	colors[4 * i + 0] = 255 * v;
		//	colors[4 * i + 1] = 255 * v;
		//	colors[4 * i + 2] = 255 * v;
		//}

		attributeBuffers[PointAttribute.SPACING.name] = { buffer: meansBuffer, attribute: PointAttribute.SPACING };


	}


	{ // add indices
		let buff = new ArrayBuffer(numPoints * 4);
		let indices = new Uint32Array(buff);

		for (let i = 0; i < numPoints; i++) {
			indices[i] = i;
		}
		
		attributeBuffers[PointAttribute.INDICES.name] = { buffer: buff, attribute: PointAttribute.INDICES };
	}

	performance.mark("binary-decoder-end");

	//{ // print timings
	//	//performance.measure("spacing", "spacing-start", "spacing-end");
	//	performance.measure("binary-decoder", "binary-decoder-start", "binary-decoder-end");
	//	let measure = performance.getEntriesByType("measure")[0];
	//	let dpp = 1000 * measure.duration / numPoints;
	//	let debugMessage = `${measure.duration.toFixed(3)} ms, ${numPoints} points, ${dpp.toFixed(3)} µs / point`;
	//	console.log(debugMessage);
	//}

	performance.clearMarks();
	performance.clearMeasures();

	let message = {
		buffer: buffer,
		mean: mean,
		attributeBuffers: attributeBuffers,
		tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
		//estimatedSpacing: estimatedSpacing,
	};

	let transferables = [];
	for (let property in message.attributeBuffers) {
		transferables.push(message.attributeBuffers[property].buffer);
	}
	transferables.push(buffer);

	postMessage(message, transferables);
};
