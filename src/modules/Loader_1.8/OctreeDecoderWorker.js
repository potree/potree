

import {Version} from "../../Version.js";
import {PointAttributes, PointAttribute} from "../../loader/PointAttributes.js";

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
	let tmpi8 = new Int8Array(tmp);

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

	// let buffer = event.data.buffer;
	// let pointAttributes = event.data.pointAttributes;
	let {buffer, pointAttributes, scale, min} = event.data;

	let numPoints = buffer.byteLength / pointAttributes.byteSize;
	let cv = new CustomView(buffer);

	// let scale = event.data.scale;
	// let min = event.data.min;

	
	let attributeBuffers = {};
	let attributeOffset = 0;

	let bytesPerPoint = 0;
	for (let pointAttribute of pointAttributes.attributes) {
		bytesPerPoint += pointAttribute.byteSize;
	}

	for (let pointAttribute of pointAttributes.attributes) {
		
		if (pointAttribute.name === "POSITION_CARTESIAN") {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let positions = new Float32Array(buff);
		
			for (let j = 0; j < numPoints; j++) {
				
				let pointOffset = j * bytesPerPoint;

				let x = (cv.getUint32(pointOffset + attributeOffset + 0, true) * scale) - min.x;
				let y = (cv.getUint32(pointOffset + attributeOffset + 4, true) * scale) - min.y;
				let z = (cv.getUint32(pointOffset + attributeOffset + 8, true) * scale) - min.z;

				positions[3 * j + 0] = x;
				positions[3 * j + 1] = y;
				positions[3 * j + 2] = z;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}else if(pointAttribute.name === "RGBA"){
			let buff = new ArrayBuffer(numPoints * 4);
			let colors = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let pointOffset = j * bytesPerPoint;

				colors[4 * j + 0] = cv.getUint8(pointOffset + attributeOffset + 0);
				colors[4 * j + 1] = cv.getUint8(pointOffset + attributeOffset + 1);
				colors[4 * j + 2] = cv.getUint8(pointOffset + attributeOffset + 2);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}

		attributeOffset += pointAttribute.byteSize;
	}

	{ // add indices
		let buff = new ArrayBuffer(numPoints * 4);
		let indices = new Uint32Array(buff);

		for (let i = 0; i < numPoints; i++) {
			indices[i] = i;
		}
		
		attributeBuffers["INDICES"] = { buffer: buff, attribute: PointAttribute.INDICES };
	}

	let message = {
		buffer: buffer,
		attributeBuffers: attributeBuffers,
	};

	let transferables = [];
	for (let property in message.attributeBuffers) {
		transferables.push(message.attributeBuffers[property].buffer);
	}
	transferables.push(buffer);

	postMessage(message, transferables);
};
