

import {Version} from "../Version.js";
import {PointAttributes, PointAttribute, PointAttributeTypes} from "../loader/PointAttributes.js";

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

const typedArrayMapping = {
	"int8":   Int8Array,
	"int16":  Int16Array,
	"int32":  Int32Array,
	"int64":  Float64Array,
	"uint8":  Uint8Array,
	"uint16": Uint16Array,
	"uint32": Uint32Array,
	"uint64": Float64Array,
	"float":  Float32Array,
	"double": Float64Array,
};

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
		
		if (pointAttribute.name === "POSITION_CARTESIAN") {
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
		} else if (pointAttribute.name === "rgba") {
			let buff = new ArrayBuffer(numPoints * 4);
			let colors = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				colors[4 * j + 0] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 0);
				colors[4 * j + 1] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 1);
				colors[4 * j + 2] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 2);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === "NORMAL_SPHEREMAPPED") {
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
		} else if (pointAttribute.name === "NORMAL_OCT16") {
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
		} else if (pointAttribute.name === "NORMAL") {
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
		} else {
			let buff = new ArrayBuffer(numPoints * 4);
			let f32 = new Float32Array(buff);

			let TypedArray = typedArrayMapping[pointAttribute.type.name];
			preciseBuffer = new TypedArray(numPoints);

			let [min, max] = [Infinity, -Infinity];
			let [offset, scale] = [0, 1];

			const getterMap = {
				"int8":   cv.getInt8,
				"int16":  cv.getInt16,
				"int32":  cv.getInt32,
				"int64":  cv.getInt64,
				"uint8":  cv.getUint8,
				"uint16": cv.getUint16,
				"uint32": cv.getUint32,
				"uint64": cv.getUint64,
				"float":  cv.getFloat32,
				"double": cv.getFloat64,
			};
			const getter = getterMap[pointAttribute.type.name].bind(cv);

			// compute offset and scale to pack larger types into 32 bit floats
			if(pointAttribute.type.size > 4){
				for(let j = 0; j < numPoints; j++){
					let value = getter(inOffset + j * pointAttributes.byteSize);

					if(!Number.isNaN(value)){
						min = Math.min(min, value);
						max = Math.max(max, value);
					}
				}

				

				if(pointAttribute.initialRange != null){
					offset = pointAttribute.initialRange[0];
					scale = 1 / (pointAttribute.initialRange[1] - pointAttribute.initialRange[0]);
				}else{
					offset = min;
					scale = 1 / (max - min);
				}
			}

			

			for(let j = 0; j < numPoints; j++){
				let value = getter(inOffset + j * pointAttributes.byteSize);

				if(!Number.isNaN(value)){
					min = Math.min(min, value);
					max = Math.max(max, value);
				}

				f32[j] = (value - offset) * scale;
				preciseBuffer[j] = value;
			}

			pointAttribute.range = [min, max];

			attributeBuffers[pointAttribute.name] = { 
				buffer: buff,
				preciseBuffer: preciseBuffer,
				attribute: pointAttribute,
				offset: offset,
				scale: scale,
			};
		}

		inOffset += pointAttribute.byteSize;
	}

	{ // add indices
		let buff = new ArrayBuffer(numPoints * 4);
		let indices = new Uint32Array(buff);

		for (let i = 0; i < numPoints; i++) {
			indices[i] = i;
		}
		
		attributeBuffers["INDICES"] = { buffer: buff, attribute: PointAttribute.INDICES };
	}

	{ // handle attribute vectors

		

		let vectors = pointAttributes.vectors;

		for(let vector of vectors){

			let {name, attributes} = vector;
			let numVectorElements = attributes.length;
			let buffer = new ArrayBuffer(numVectorElements * numPoints * 4);
			let f32 = new Float32Array(buffer);

			let iElement = 0;
			for(let sourceName of attributes){
				let sourceBuffer = attributeBuffers[sourceName];
				let {offset, scale} = sourceBuffer;
				let cv = new CustomView(sourceBuffer.buffer);

				const getter = cv.getFloat32.bind(cv);

				for(let j = 0; j < numPoints; j++){
					let value = getter(j * 4);

					f32[j * numVectorElements + iElement] = (value / scale) + offset;
				}

				iElement++;
			}

			let vecAttribute = new PointAttribute(name, PointAttributeTypes.DATA_TYPE_FLOAT, 3);

			attributeBuffers[name] = { 
				buffer: buffer, 
				attribute: vecAttribute,
				// offset: offset,
				// scale: scale,
			};

		}

	}

	performance.mark("binary-decoder-end");

	// { // print timings
	// 	//performance.measure("spacing", "spacing-start", "spacing-end");
	// 	performance.measure("binary-decoder", "binary-decoder-start", "binary-decoder-end");
	// 	let measure = performance.getEntriesByType("measure")[0];
	// 	let dpp = 1000 * measure.duration / numPoints;
	// 	let pps = parseInt(numPoints / (measure.duration / 1000));
	// 	let debugMessage = `${measure.duration.toFixed(3)} ms, ${numPoints} points, ${pps.toLocaleString()} points/sec`;
	// 	console.log(debugMessage);
	// }

	performance.clearMarks();
	performance.clearMeasures();

	let message = {
		buffer: buffer,
		mean: mean,
		attributeBuffers: attributeBuffers,
		tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
	};

	let transferables = [];
	for (let property in message.attributeBuffers) {
		transferables.push(message.attributeBuffers[property].buffer);
	}
	transferables.push(buffer);

	postMessage(message, transferables);
};
