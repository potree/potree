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
	let version = new Potree.Version(event.data.version);
	let nodeOffset = event.data.offset;
	let scale = event.data.scale;
	
	let tightBoxMin = [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ];
	let tightBoxMax = [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];
	let mean = [0, 0, 0];
	
	let iAttributes = pointAttributes.attributes
		.map(pa => Potree.toInterleavedBufferAttribute(pa))
		.filter(ia => ia != null);
	iAttributes.push(new Potree.InterleavedBufferAttribute("index", 4, 4, "UNSIGNED_BYTE", true));
	let iStride = iAttributes.reduce( (a, att) => a + att.bytes, 0);
	iStride = Math.ceil(iStride / 4) * 4; // round to nearest multiple of 4
	let iData = new ArrayBuffer(numPoints * iStride);
	let iView = new DataView(iData);
	
	let inOffset = 0;
	let outOffset = 0;
	for (let i = 0; i < pointAttributes.attributes.length; i++) {
		let pointAttribute = pointAttributes.attributes[i];
		let iAttribute = Potree.toInterleavedBufferAttribute(pointAttribute);
		
		if(iAttribute){
			if (pointAttribute.name === Potree.PointAttribute.POSITION_CARTESIAN.name) {
				//let positions = new Float32Array(iData, outOffset);
			
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

					//positions[iStride * j + 0] = x;
					//positions[iStride * j + 1] = y;
					//positions[iStride * j + 2] = z;
					let firstByte = j * iStride + outOffset;
					iView.setFloat32(firstByte + 0, x, true);
					iView.setFloat32(firstByte + 4, y, true);
					iView.setFloat32(firstByte + 8, z, true);

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
				
			} else if (pointAttribute.name === Potree.PointAttribute.COLOR_PACKED.name) {
				//let colors = new Uint8Array(iData, outOffset);

				for (let j = 0; j < numPoints; j++) {
					//colors[iStride * j + 0] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 0);
					//colors[iStride * j + 1] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 1);
					//colors[iStride * j + 2] = cv.getUint8(inOffset + j * pointAttributes.byteSize + 2);
					
					let r = cv.getUint8(inOffset + j * pointAttributes.byteSize + 0);
					let g = cv.getUint8(inOffset + j * pointAttributes.byteSize + 1);
					let b = cv.getUint8(inOffset + j * pointAttributes.byteSize + 2);
					
					let firstByte = j * iStride + outOffset;
					iView.setUint8(firstByte + 0, r, true);
					iView.setUint8(firstByte + 1, g, true);
					iView.setUint8(firstByte + 2, b, true);
				}
			} else if (pointAttribute.name === Potree.PointAttribute.INTENSITY.name) {
				//let intensities = new Float32Array(iData, outOffset);

				for (let j = 0; j < numPoints; j++) {
					let intensity = cv.getUint16(inOffset + j * pointAttributes.byteSize, true);
					//intensities[iStride * j] = intensity;
					let firstByte = j * iStride + outOffset;
					iView.setFloat32(firstByte + 0, intensity, true);
				}
			} else if (pointAttribute.name === Potree.PointAttribute.CLASSIFICATION.name) {
				//let classifications = new Uint8Array(iData, outOffset);

				for (let j = 0; j < numPoints; j++) {
					let classification = cv.getUint8(inOffset + j * pointAttributes.byteSize);
					//classifications[iStride * j] = classification;
					let firstByte = j * iStride + outOffset;
					iView.setUint8(firstByte + 0, classification, true);
				}
			} else if (pointAttribute.name === Potree.PointAttribute.NORMAL_SPHEREMAPPED.name) {
				//let normals = new Float32Array(iData, outOffset);

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

					//normals[iStride * j + 0] = nx;
					//normals[iStride * j + 1] = ny;
					//normals[iStride * j + 2] = nz;
					
					let firstByte = j * iStride + outOffset;
					iView.setFloat32(firstByte + 0, nx, true);
					iView.setFloat32(firstByte + 4, ny, true);
					iView.setFloat32(firstByte + 8, nz, true);
				}
			} else if (pointAttribute.name === Potree.PointAttribute.NORMAL_OCT16.name) {
				//let normals = new Float32Array(iData, outOffset);
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

					//normals[iStride * j + 0] = x;
					//normals[iStride * j + 1] = y;
					//normals[iStride * j + 2] = z;
					
					let firstByte = j * iStride + outOffset;
					iView.setFloat32(firstByte + 0, x, true);
					iView.setFloat32(firstByte + 4, y, true);
					iView.setFloat32(firstByte + 8, z, true);
				}
			} else if (pointAttribute.name === Potree.PointAttribute.NORMAL.name) {
				//let normals = new Float32Array(iData, outOffset);
				for (let j = 0; j < numPoints; j++) {
					let x = cv.getFloat32(inOffset + j * pointAttributes.byteSize + 0, true);
					let y = cv.getFloat32(inOffset + j * pointAttributes.byteSize + 4, true);
					let z = cv.getFloat32(inOffset + j * pointAttributes.byteSize + 8, true);

					//normals[iStride * j + 0] = x;
					//normals[iStride * j + 1] = y;
					//normals[iStride * j + 2] = z;
					
					let firstByte = j * iStride + outOffset;
					iView.setFloat32(firstByte + 0, x, true);
					iView.setFloat32(firstByte + 4, y, true);
					iView.setFloat32(firstByte + 8, z, true);
				}
			}
		}

		inOffset += pointAttribute.byteSize;
		outOffset += Math.ceil(iAttribute.bytes / 4) * 4;
	}

	{ // add indices
		//let iIndices = new Uint32Array(iData, outOffset);
		for (let i = 0; i < numPoints; i++) {
			//iIndices[iStride * i] = i;
			let firstByte = i * iStride + outOffset;
			iView.setUint32(firstByte, i, true);
		}
	}

	let message = {
		mean: mean,
		data: iData,
		tightBoundingBox: { min: tightBoxMin, max: tightBoxMax },
	};

	let transferables = [message.data];

	postMessage(message, transferables);
};
