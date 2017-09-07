/* global onmessage:true postMessage:false Module */
/* exported onmessage */
// http://jsperf.com/uint8array-vs-dataview3/3
function CustomView (buffer) {
	this.buffer = buffer;
	this.u8 = new Uint8Array(buffer);

	var tmp = new ArrayBuffer(4);
	var tmpf = new Float32Array(tmp);
	var tmpu8 = new Uint8Array(tmp);

	this.getUint32 = function (i) {
		return (this.u8[i + 3] << 24) | (this.u8[i + 2] << 16) | (this.u8[i + 1] << 8) | this.u8[i];
	};

	this.getUint16 = function (i) {
		return (this.u8[i + 1] << 8) | this.u8[i];
	};

	this.getFloat = function (i) {
		tmpu8[0] = this.u8[i + 0];
		tmpu8[1] = this.u8[i + 1];
		tmpu8[2] = this.u8[i + 2];
		tmpu8[3] = this.u8[i + 3];

		return tmpf[0];
	};

	this.getUint8 = function (i) {
		return this.u8[i];
	};
}

function networkToNative (val) {
	return ((val & 0x00FF) << 24) |
		((val & 0xFF00) << 8) |
		((val >> 8) & 0xFF00) |
		((val >> 24) & 0x00FF);
}

var decompress = function (schema, input, numPoints) {
	var x = new Module.DynamicLASZip();

	var abInt = new Uint8Array(input);
	var buf = Module._malloc(input.byteLength);

	Module.HEAPU8.set(abInt, buf);
	x.open(buf, input.byteLength);

	var pointSize = 0;

	schema.forEach(function (f) {
		pointSize += f.size;
		if (f.type === 'floating') x.addFieldFloating(f.size);
		else if (f.type === 'unsigned') x.addFieldUnsigned(f.size);
		else if (f.type === 'signed') x.addFieldSigned(f.size);
		else throw new Error('Unrecognized field desc:', f);
	});

	var out = Module._malloc(numPoints * pointSize);

	for (var i = 0; i < numPoints; i++) {
		x.getPoint(out + i * pointSize);
	}

	var ret = new Uint8Array(numPoints * pointSize);
	ret.set(Module.HEAPU8.subarray(out, out + numPoints * pointSize));

	Module._free(out);
	Module._free(buf);

	return ret.buffer;
};

Potree = {};

onmessage = function (event) {
	var NUM_POINTS_BYTES = 4;

	var buffer = event.data.buffer;
	var pointAttributes = event.data.pointAttributes;

	var view = new DataView(
		buffer, buffer.byteLength - NUM_POINTS_BYTES, NUM_POINTS_BYTES);
	var numPoints = networkToNative(view.getUint32(0));
	buffer = buffer.slice(0, buffer.byteLength - NUM_POINTS_BYTES);

	buffer = decompress(event.data.schema, buffer, numPoints);

	var cv = new CustomView(buffer);
	// event.data.version
	// event.data.min
	// event.data.max
	var nodeOffset = event.data.offset;
	var scale = event.data.scale;
	var tightBoxMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
	var tightBoxMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];

	var attributeBuffers = {};
	var offset = 0;
	var pointSize = pointAttributes.byteSize;

	let mean = [0, 0, 0];

	for (let i = 0; i < pointAttributes.attributes.length; i++) {
		var pointAttribute = pointAttributes.attributes[i];

		if (pointAttribute.name === Potree.PointAttribute.POSITION_CARTESIAN.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let positions = new Float32Array(buff);

			for (let j = 0; j < numPoints; ++j) {
				let ux = cv.getUint32(offset + j * pointSize + 0);
				let uy = cv.getUint32(offset + j * pointSize + 4);
				let uz = cv.getUint32(offset + j * pointSize + 8);

				let x = (scale * ux) + nodeOffset[0];
				let y = (scale * uy) + nodeOffset[1];
				let z = (scale * uz) + nodeOffset[2];

				positions[3 * j + 0] = x;
				positions[3 * j + 1] = y;
				positions[3 * j + 2] = z;

				mean[0] += x / numPoints;
				mean[1] += y / numPoints;
				mean[2] += z / numPoints;

				tightBoxMin[0] = Math.min(tightBoxMin[0], positions[3 * j + 0]);
				tightBoxMin[1] = Math.min(tightBoxMin[1], positions[3 * j + 1]);
				tightBoxMin[2] = Math.min(tightBoxMin[2], positions[3 * j + 2]);

				tightBoxMax[0] = Math.max(tightBoxMax[0], positions[3 * j + 0]);
				tightBoxMax[1] = Math.max(tightBoxMax[1], positions[3 * j + 1]);
				tightBoxMax[2] = Math.max(tightBoxMax[2], positions[3 * j + 2]);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === Potree.PointAttribute.COLOR_PACKED.name) {
			let buff = new ArrayBuffer(numPoints * 3);
			let colors = new Uint8Array(buff);

			let div = event.data.normalize.color ? 256 : 1;

			for (let j = 0; j < numPoints; ++j) {
				colors[3 * j + 0] = cv.getUint16(offset + j * pointSize + 0) / div;
				colors[3 * j + 1] = cv.getUint16(offset + j * pointSize + 2) / div;
				colors[3 * j + 2] = cv.getUint16(offset + j * pointSize + 4) / div;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === Potree.PointAttribute.INTENSITY.name) {
			let buff = new ArrayBuffer(numPoints * 4);
			let intensities = new Float32Array(buff);

			for (let j = 0; j < numPoints; ++j) {
				var intensity = cv.getUint16(offset + j * pointSize);
				// if (event.data.normalize.intensity) {
				//    intensity = Math.floor(intensity / 256);
				// }
				intensities[j] = intensity;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === Potree.PointAttribute.CLASSIFICATION.name) {
			let buff = new ArrayBuffer(numPoints * 4);
			let classifications = new Float32Array(buff);

			for (let j = 0; j < numPoints; ++j) {
				var classification = cv.getUint8(offset + j * pointSize);
				classifications[j] = classification;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === Potree.PointAttribute.NORMAL_SPHEREMAPPED.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; ++j) {
				let bx = cv.getUint8(offset + j * pointSize + 0);
				let by = cv.getUint8(offset + j * pointSize + 1);

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
		} else if (pointAttribute.name === Potree.PointAttribute.NORMAL_OCT16.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);
			for (let j = 0; j < numPoints; ++j) {
				let bx = cv.getUint8(offset + j * pointSize + 0);
				let by = cv.getUint8(offset + j * pointSize + 1);

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

				var length = Math.sqrt(x * x + y * y + z * z);
				x = x / length;
				y = y / length;
				z = z / length;

				normals[3 * j + 0] = x;
				normals[3 * j + 1] = y;
				normals[3 * j + 2] = z;
			}
			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === Potree.PointAttribute.NORMAL.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);
			for (var j = 0; j < numPoints; ++j) {
				let x = cv.getFloat(offset + j * pointSize + 0);
				let y = cv.getFloat(offset + j * pointSize + 4);
				let z = cv.getFloat(offset + j * pointSize + 8);

				normals[3 * j + 0] = x;
				normals[3 * j + 1] = y;
				normals[3 * j + 2] = z;
			}
			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}

		offset += pointAttribute.byteSize;
	}

	var indices = new ArrayBuffer(numPoints * 4);
	var iIndices = new Uint32Array(indices);
	for (let i = 0; i < numPoints; i++) {
		iIndices[i] = i;
	}

	var message = {
		mean: mean,
		attributeBuffers: attributeBuffers,
		tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
		indices: indices
	};

	var transferables = [];

	for (var property in message.attributeBuffers) {
		if (message.attributeBuffers.hasOwnProperty(property)) {
			transferables.push(message.attributeBuffers[property].buffer);
		}
	}

	transferables.push(message.indices);

	postMessage(message, transferables);
};
