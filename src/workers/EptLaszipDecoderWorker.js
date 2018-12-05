function readUsingDataView(event) {
	performance.mark("laslaz-start");

	let buffer = event.data.buffer;
	let numPoints = event.data.numPoints;
	let pointSize = event.data.pointSize;
	let pointFormat = event.data.pointFormatID;
	let scale = event.data.scale;
	let offset = event.data.offset;

	let sourceUint8 = new Uint8Array(buffer);
	let sourceView = new DataView(buffer);

	let tightBoundingBox = {
		min: [
			Number.POSITIVE_INFINITY,
			Number.POSITIVE_INFINITY,
			Number.POSITIVE_INFINITY
		],
		max: [
			Number.NEGATIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
			Number.NEGATIVE_INFINITY
		]
	};

	let mean = [0, 0, 0];

	let pBuff = new ArrayBuffer(numPoints * 3 * 4);
	let cBuff = new ArrayBuffer(numPoints * 4);
	let iBuff = new ArrayBuffer(numPoints * 4);
	let clBuff = new ArrayBuffer(numPoints);
	let rnBuff = new ArrayBuffer(numPoints);
	let nrBuff = new ArrayBuffer(numPoints);
	let psBuff = new ArrayBuffer(numPoints * 2);

	let positions = new Float32Array(pBuff);
	let colors = new Uint8Array(cBuff);
	let intensities = new Float32Array(iBuff);
	let classifications = new Uint8Array(clBuff);
	let returnNumbers = new Uint8Array(rnBuff);
	let numberOfReturns = new Uint8Array(nrBuff);
	let pointSourceIDs = new Uint16Array(psBuff);

	// Point format 3 contains an 8-byte GpsTime before RGB values, so make
	// sure we have the correct color offset.
	let hasColor = pointFormat == 2 || pointFormat == 3;
	let co = pointFormat == 2 ? 20 : 28;

	// TODO This should be cached per-resource since this is an expensive check.
	let twoByteColor = false;
	if (hasColor) {
		let r, g, b, pos;
		for (let i = 0; i < numPoints && !twoByteColor; ++i) {
			pos = i * pointSize;
			r = sourceView.getUint16(pos + co, true)
			g = sourceView.getUint16(pos + co + 2, true)
			b = sourceView.getUint16(pos + co + 4, true)
			if (r > 255 || g > 255 || b > 255) twoByteColor = true;
		}
	}

	for (let i = 0; i < numPoints; i++) {
		// POSITION
		let ux = sourceView.getInt32(i * pointSize + 0, true);
		let uy = sourceView.getInt32(i * pointSize + 4, true);
		let uz = sourceView.getInt32(i * pointSize + 8, true);

		x = ux * scale[0] + offset[0] - event.data.mins[0];
		y = uy * scale[1] + offset[1] - event.data.mins[1];
		z = uz * scale[2] + offset[2] - event.data.mins[2];

		positions[3 * i + 0] = x;
		positions[3 * i + 1] = y;
		positions[3 * i + 2] = z;

		mean[0] += x / numPoints;
		mean[1] += y / numPoints;
		mean[2] += z / numPoints;

		tightBoundingBox.min[0] = Math.min(tightBoundingBox.min[0], x);
		tightBoundingBox.min[1] = Math.min(tightBoundingBox.min[1], y);
		tightBoundingBox.min[2] = Math.min(tightBoundingBox.min[2], z);

		tightBoundingBox.max[0] = Math.max(tightBoundingBox.max[0], x);
		tightBoundingBox.max[1] = Math.max(tightBoundingBox.max[1], y);
		tightBoundingBox.max[2] = Math.max(tightBoundingBox.max[2], z);

		// INTENSITY
		let intensity = sourceView.getUint16(i * pointSize + 12, true);
		intensities[i] = intensity;

		// RETURN NUMBER, stored in the first 3 bits - 00000111
		// number of returns stored in next 3 bits	 - 00111000
		let returnNumberAndNumberOfReturns = sourceView.getUint8(i * pointSize + 14, true);
		let returnNumber = returnNumberAndNumberOfReturns & 0b0111;
		let numberOfReturn = (returnNumberAndNumberOfReturns & 0b00111000) >> 3;
		returnNumbers[i] = returnNumber;
		numberOfReturns[i] = numberOfReturn;

		// CLASSIFICATION
		let classification = sourceView.getUint8(i * pointSize + 15, true);
		classifications[i] = classification;

		// POINT SOURCE ID
		let pointSourceID = sourceView.getUint16(i * pointSize + 18, true);
		pointSourceIDs[i] = pointSourceID;

		// COLOR, if available
		if (hasColor) {
			let r = sourceView.getUint16(i * pointSize + co, true)
			let g = sourceView.getUint16(i * pointSize + co + 2, true)
			let b = sourceView.getUint16(i * pointSize + co + 4, true)

			if (twoByteColor) {
				r /= 256;
				g /= 256;
				b /= 256;
			}

			colors[4 * i + 0] = r;
			colors[4 * i + 1] = g;
			colors[4 * i + 2] = b;
			colors[4 * i + 3] = 255;
		}
	}

	let indices = new ArrayBuffer(numPoints * 4);
	let iIndices = new Uint32Array(indices);
	for (let i = 0; i < numPoints; i++) {
		iIndices[i] = i;
	}

	performance.mark("laslaz-end");

	//{ // print timings
	//	  performance.measure("laslaz", "laslaz-start", "laslaz-end");
	//	  let measure = performance.getEntriesByType("measure")[0];
	//	  let dpp = 1000 * measure.duration / numPoints;
	//	  let debugMessage = `${measure.duration.toFixed(3)} ms, ${numPoints} points, ${dpp.toFixed(3)} µs / point`;
	//	  console.log(debugMessage);
	//}
	performance.clearMarks();
	performance.clearMeasures();

	let message = {
		mean: mean,
		position: pBuff,
		color: cBuff,
		intensity: iBuff,
		classification: clBuff,
		returnNumber: rnBuff,
		numberOfReturns: nrBuff,
		pointSourceID: psBuff,
		tightBoundingBox: tightBoundingBox,
		indices: indices
	};

	let transferables = [
		message.position,
		message.color,
		message.intensity,
		message.classification,
		message.returnNumber,
		message.numberOfReturns,
		message.pointSourceID,
		message.indices
	];

	postMessage(message, transferables);
};



onmessage = readUsingDataView;

