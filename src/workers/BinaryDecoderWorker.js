/* global onmessage:true postMessage:false */
/* exported onmessage */
// http://jsperf.com/uint8array-vs-dataview3/3
function CustomView (buffer) {
	this.buffer = buffer;
	this.u8 = new Uint8Array(buffer);

	let tmp = new ArrayBuffer(4);
	let tmpf = new Float32Array(tmp);
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

	this.getUint8 = function (i) {
		return this.u8[i];
	};
}

Potree = {};

onmessage = function (event) {
	let buffer = event.data.buffer;
	let pointAttributes = event.data.pointAttributes;
	let numPoints = buffer.byteLength / pointAttributes.byteSize;
	let cv = new CustomView(buffer);
	// let cv = new DataView(buffer);
	let version = new Potree.Version(event.data.version);
	// event.data.min
	let nodeOffset = event.data.offset;
	let scale = event.data.scale;
	let tightBoxMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
	let tightBoxMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];

	let attributeBuffers = {};

	let mean = [0, 0, 0];

	let offset = 0;
	for (let i = 0; i < pointAttributes.attributes.length; i++) {
		let pointAttribute = pointAttributes.attributes[i];

		if (pointAttribute.name === Potree.PointAttribute.POSITION_CARTESIAN.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let positions = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let x, y, z;

				if (version.newerThan('1.3')) {
					x = (cv.getUint32(offset + j * pointAttributes.byteSize + 0, true) * scale);
					y = (cv.getUint32(offset + j * pointAttributes.byteSize + 4, true) * scale);
					z = (cv.getUint32(offset + j * pointAttributes.byteSize + 8, true) * scale);
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

			for (let j = 0; j < numPoints; j++) {
				colors[3 * j + 0] = cv.getUint8(offset + j * pointAttributes.byteSize + 0);
				colors[3 * j + 1] = cv.getUint8(offset + j * pointAttributes.byteSize + 1);
				colors[3 * j + 2] = cv.getUint8(offset + j * pointAttributes.byteSize + 2);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === Potree.PointAttribute.INTENSITY.name) {
			let buff = new ArrayBuffer(numPoints * 4);
			let intensities = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let intensity = cv.getUint16(offset + j * pointAttributes.byteSize, true);
				intensities[j] = intensity;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === Potree.PointAttribute.CLASSIFICATION.name) {
			let buff = new ArrayBuffer(numPoints);
			let classifications = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let classification = cv.getUint8(offset + j * pointAttributes.byteSize);
				classifications[j] = classification;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		} else if (pointAttribute.name === Potree.PointAttribute.NORMAL_SPHEREMAPPED.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let bx = cv.getUint8(offset + j * pointAttributes.byteSize + 0);
				let by = cv.getUint8(offset + j * pointAttributes.byteSize + 1);

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
			for (let j = 0; j < numPoints; j++) {
				let bx = cv.getUint8(offset + j * pointAttributes.byteSize + 0);
				let by = cv.getUint8(offset + j * pointAttributes.byteSize + 1);

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
		} else if (pointAttribute.name === Potree.PointAttribute.NORMAL.name) {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let normals = new Float32Array(buff);
			for (let j = 0; j < numPoints; j++) {
				let x = cv.getFloat32(offset + j * pointAttributes.byteSize + 0, true);
				let y = cv.getFloat32(offset + j * pointAttributes.byteSize + 4, true);
				let z = cv.getFloat32(offset + j * pointAttributes.byteSize + 8, true);

				normals[3 * j + 0] = x;
				normals[3 * j + 1] = y;
				normals[3 * j + 2] = z;
			}
			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}

		offset += pointAttribute.byteSize;
	}

	let indices = new ArrayBuffer(numPoints * 4);
	let iIndices = new Uint32Array(indices);
	for (let i = 0; i < numPoints; i++) {
		iIndices[i] = i;
	}

	if (attributeBuffers[Potree.PointAttribute.CLASSIFICATION.name] === undefined) {
		let buff = new ArrayBuffer(numPoints * 4);
		let classifications = new Float32Array(buff);

		for (let j = 0; j < numPoints; j++) {
			classifications[j] = 0;
		}

		attributeBuffers[Potree.PointAttribute.CLASSIFICATION.name] = { buffer: buff, attribute: Potree.PointAttribute.CLASSIFICATION };
	}

	let message = {
		mean: mean,
		attributeBuffers: attributeBuffers,
		tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
		indices: indices
	};

	let transferables = [];

	for (let property in message.attributeBuffers) {
		if (message.attributeBuffers.hasOwnProperty(property)) {
			transferables.push(message.attributeBuffers[property].buffer);
		}
	}

	transferables.push(message.indices);

	postMessage(message, transferables);
};
