
function readUsingTempArrays(event) {

	performance.mark("laslaz-start");

	let buffer = event.data.buffer;
	let numPoints = event.data.numPoints;
	let sourcePointSize = event.data.pointSize;
	let pointFormatID = event.data.pointFormatID;
	let scale = event.data.scale;
	let offset = event.data.offset;

	let temp = new ArrayBuffer(4);
	let tempUint8 = new Uint8Array(temp);
	let tempUint16 = new Uint16Array(temp);
	let tempInt32 = new Int32Array(temp);
	let sourceUint8 = new Uint8Array(buffer);

	let tightBoundingBox = {
		min: [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ],
		max: [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ]
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

	for (let i = 0; i < numPoints; i++) {
		// POSITION
		tempUint8[0] = sourceUint8[i * sourcePointSize + 0];
		tempUint8[1] = sourceUint8[i * sourcePointSize + 1];
		tempUint8[2] = sourceUint8[i * sourcePointSize + 2];
		tempUint8[3] = sourceUint8[i * sourcePointSize + 3];
		let x = tempInt32[0];

		tempUint8[0] = sourceUint8[i * sourcePointSize + 4];
		tempUint8[1] = sourceUint8[i * sourcePointSize + 5];
		tempUint8[2] = sourceUint8[i * sourcePointSize + 6];
		tempUint8[3] = sourceUint8[i * sourcePointSize + 7];
		let y = tempInt32[0];

		tempUint8[0] = sourceUint8[i * sourcePointSize + 8];
		tempUint8[1] = sourceUint8[i * sourcePointSize + 9];
		tempUint8[2] = sourceUint8[i * sourcePointSize + 10];
		tempUint8[3] = sourceUint8[i * sourcePointSize + 11];
		let z = tempInt32[0];

		x = x * scale[0] + offset[0] - event.data.mins[0];
		y = y * scale[1] + offset[1] - event.data.mins[1];
		z = z * scale[2] + offset[2] - event.data.mins[2];

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
		tempUint8[0] = sourceUint8[i * sourcePointSize + 12];
		tempUint8[1] = sourceUint8[i * sourcePointSize + 13];
		let intensity = tempUint16[0];
		intensities[i] = intensity;

		// RETURN NUMBER, stored in the first 3 bits - 00000111
		let returnNumber = sourceUint8[i * sourcePointSize + 14] & 0b111;
		returnNumbers[i] = returnNumber;

		// NUMBER OF RETURNS, stored in 00111000
		numberOfReturns[i] = (sourceUint8[i * pointSize + 14] & 0b111000) >> 3;

		debugger;

		// CLASSIFICATION
		let classification = sourceUint8[i * sourcePointSize + 15];
		classifications[i] = classification;

		// POINT SOURCE ID
		tempUint8[0] = sourceUint8[i * sourcePointSize + 18];
		tempUint8[1] = sourceUint8[i * sourcePointSize + 19];
		let pointSourceID = tempUint16[0];
		pointSourceIDs[i] = pointSourceID;

		// COLOR, if available
		if (pointFormatID === 2) {
			tempUint8[0] = sourceUint8[i * sourcePointSize + 20];
			tempUint8[1] = sourceUint8[i * sourcePointSize + 21];
			let r = tempUint16[0];

			tempUint8[0] = sourceUint8[i * sourcePointSize + 22];
			tempUint8[1] = sourceUint8[i * sourcePointSize + 23];
			let g = tempUint16[0];

			tempUint8[0] = sourceUint8[i * sourcePointSize + 24];
			tempUint8[1] = sourceUint8[i * sourcePointSize + 25];
			let b = tempUint16[0];

			r = r / 256;
			g = g / 256;
			b = b / 256;
			colors[4 * i + 0] = r;
			colors[4 * i + 1] = g;
			colors[4 * i + 2] = b;

		}
	}

	let indices = new ArrayBuffer(numPoints * 4);
	let iIndices = new Uint32Array(indices);
	for (let i = 0; i < numPoints; i++) {
		iIndices[i] = i;
	}

	performance.mark("laslaz-end");
	performance.measure("laslaz", "laslaz-start", "laslaz-end");

	let measure = performance.getEntriesByType("measure")[0];
	let dpp = 1000 * measure.duration / numPoints;
	let debugMessage = `${measure.duration.toFixed(3)} ms, ${numPoints} points, ${dpp.toFixed(3)} micros / point`;
	console.log(debugMessage);

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
		message.indices];

	debugger;

	postMessage(message, transferables);
};


function readUsingDataView(event) {

	performance.mark("laslaz-start");

	let buffer = event.data.buffer;
	let numPoints = event.data.numPoints;
	let sourcePointSize = event.data.pointSize;
	let pointFormatID = event.data.pointFormatID;
	let scale = event.data.scale;
	let offset = event.data.offset;

	let sourceView = new DataView(buffer);

	let tightBoundingBox = {
		min: [Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE],
		max: [-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]
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
	
	const rangeIntensity = [Infinity, -Infinity];
	const rangeClassification = [Infinity, -Infinity];
	const rangeReturnNumber = [Infinity, -Infinity];
	const rangeNumberOfReturns = [Infinity, -Infinity];
	const rangeSourceID = [Infinity, -Infinity];

	for (let i = 0; i < numPoints; i++) {
		// POSITION
		let ux = sourceView.getInt32(i * sourcePointSize + 0, true);
		let uy = sourceView.getInt32(i * sourcePointSize + 4, true);
		let uz = sourceView.getInt32(i * sourcePointSize + 8, true);

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
		let intensity = sourceView.getUint16(i * sourcePointSize + 12, true);
		intensities[i] = intensity;
		rangeIntensity[0] = Math.min(rangeIntensity[0], intensity);
		rangeIntensity[1] = Math.max(rangeIntensity[1], intensity);

		// RETURN NUMBER, stored in the first 3 bits - 00000111
		// number of returns stored in next 3 bits   - 00111000
		let returnNumberAndNumberOfReturns = sourceView.getUint8(i * sourcePointSize + 14, true);
		let returnNumber = returnNumberAndNumberOfReturns & 0b0111;
		let numberOfReturn = (returnNumberAndNumberOfReturns & 0b00111000) >> 3;
		returnNumbers[i] = returnNumber;
		numberOfReturns[i] = numberOfReturn;
		rangeReturnNumber[0] = Math.min(rangeReturnNumber[0], returnNumber);
		rangeReturnNumber[1] = Math.max(rangeReturnNumber[1], returnNumber);
		rangeNumberOfReturns[0] = Math.min(rangeNumberOfReturns[0], numberOfReturn);
		rangeNumberOfReturns[1] = Math.max(rangeNumberOfReturns[1], numberOfReturn);

		// CLASSIFICATION
		let classification = sourceView.getUint8(i * sourcePointSize + 15, true);
		classifications[i] = classification;
		rangeClassification[0] = Math.min(rangeClassification[0], classification);
		rangeClassification[1] = Math.max(rangeClassification[1], classification);

		// POINT SOURCE ID
		let pointSourceID = sourceView.getUint16(i * sourcePointSize + 18, true);
		pointSourceIDs[i] = pointSourceID;
		rangeSourceID[0] = Math.min(rangeSourceID[0], pointSourceID);
		rangeSourceID[1] = Math.max(rangeSourceID[1], pointSourceID);

		// COLOR, if available
		if (pointFormatID === 2) {
			let r = sourceView.getUint16(i * sourcePointSize + 20, true) / 256;
			let g = sourceView.getUint16(i * sourcePointSize + 22, true) / 256;
			let b = sourceView.getUint16(i * sourcePointSize + 24, true) / 256;

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
	//	performance.measure("laslaz", "laslaz-start", "laslaz-end");
	//	let measure = performance.getEntriesByType("measure")[0];
	//	let dpp = 1000 * measure.duration / numPoints;
	//	let debugMessage = `${measure.duration.toFixed(3)} ms, ${numPoints} points, ${dpp.toFixed(3)} µs / point`;
	//	console.log(debugMessage);
	//}
	performance.clearMarks();
	performance.clearMeasures();

	const ranges = {
		"intensity": rangeIntensity,
		"classification": rangeClassification,
		"return number": rangeReturnNumber,
		"number of returns": rangeNumberOfReturns,
		"source id": rangeSourceID,
	};

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
		indices: indices,
		ranges: ranges,
	};

	let transferables = [
		message.position,
		message.color,
		message.intensity,
		message.classification,
		message.returnNumber,
		message.numberOfReturns,
		message.pointSourceID,
		message.indices];

	postMessage(message, transferables);
};



onmessage = readUsingDataView;
//onmessage = readUsingTempArrays;
