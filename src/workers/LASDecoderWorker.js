// let pointFormatReaders = {
//	0: function(dv) {
//		return {
//			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
//			"intensity": dv.getUint16(12, true),
//			"classification": dv.getUint8(16, true)
//		};
//	},
//	1: function(dv) {
//		return {
//			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
//			"intensity": dv.getUint16(12, true),
//			"classification": dv.getUint8(16, true)
//		};
//	},
//	2: function(dv) {
//		return {
//			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
//			"intensity": dv.getUint16(12, true),
//			"classification": dv.getUint8(16, true),
//			"color": [dv.getUint16(20, true), dv.getUint16(22, true), dv.getUint16(24, true)]
//		};
//	},
//	3: function(dv) {
//		return {
//			"position": [ dv.getInt32(0, true), dv.getInt32(4, true), dv.getInt32(8, true)],
//			"intensity": dv.getUint16(12, true),
//			"classification": dv.getUint8(16, true),
//			"color": [dv.getUint16(28, true), dv.getUint16(30, true), dv.getUint16(32, true)]
//		};
//	}
// };
//
//


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
    let sourceView = new DataView(buffer);
    
    let targetPointSize = 20;
    let targetBuffer = new ArrayBuffer(numPoints * targetPointSize);
    let targetView = new DataView(targetBuffer);

	let tightBoundingBox = {
		min: [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ],
		max: [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ]
	};

    let mean = [0, 0, 0];
    
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

        targetView.setFloat32(i * targetPointSize + 0, x, true);
        targetView.setFloat32(i * targetPointSize + 4, y, true);
        targetView.setFloat32(i * targetPointSize + 8, z, true);

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
		//targetView.setFloat32(i * numPoints + 0, x, true);

		// RETURN NUMBER, stored in the first 3 bits - 00000111
		let returnNumber = sourceUint8[i * sourcePointSize + 14] & 7;
		//returnNumbers[i] = returnNumber;

		// NUMBER OF RETURNS, stored in 00111000
		//numberOfReturns[i] = (sourceUint8[i * pointSize + 14] & 56) / 8;

		// CLASSIFICATION
		let classification = sourceUint8[i * sourcePointSize + 15];
		//classifications[i] = classification;

		// POINT SOURCE ID
		tempUint8[0] = sourceUint8[i * sourcePointSize + 18];
		tempUint8[1] = sourceUint8[i * sourcePointSize + 19];
		let pointSourceID = tempUint16[0];
		//pointSourceIDs[i] = pointSourceID;

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
            targetView.setUint8(i * targetPointSize + 12, r, true);
            targetView.setUint8(i * targetPointSize + 13, g, true);
            targetView.setUint8(i * targetPointSize + 14, b, true);
            targetView.setUint8(i * targetPointSize + 15, 255, true);
		}
	}

	for (let i = 0; i < numPoints; i++) {
		targetView.setUint32(i * targetPointSize + 16, i, true);
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
		data: targetBuffer,
		tightBoundingBox: tightBoundingBox
	};

	let transferables = [message.data];

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

    let sourceUint8 = new Uint8Array(buffer);
    let sourceView = new DataView(buffer);
    
    let targetPointSize = 40;
    let targetBuffer = new ArrayBuffer(numPoints * targetPointSize);
    let targetView = new DataView(targetBuffer);

	let tightBoundingBox = {
		min: [ Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY ],
		max: [ Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ]
	};

    let mean = [0, 0, 0];
    
	for (let i = 0; i < numPoints; i++) {
		// POSITION
        let x = sourceView.getUint32(i * sourcePointSize + 0, true);
        let y = sourceView.getUint32(i * sourcePointSize + 4, true);
        let z = sourceView.getUint32(i * sourcePointSize + 8, true);

		x = x * scale[0] + offset[0] - event.data.mins[0];
		y = y * scale[1] + offset[1] - event.data.mins[1];
		z = z * scale[2] + offset[2] - event.data.mins[2];

        targetView.setFloat32(i * targetPointSize + 0, x, true);
        targetView.setFloat32(i * targetPointSize + 4, y, true);
        targetView.setFloat32(i * targetPointSize + 8, z, true);

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
        targetView.setFloat32(i * targetPointSize + 16, intensity, true);

        // RETURN NUMBER, stored in the first 3 bits - 00000111
        // number of returns stored in next 3 bits   - 00111000
        let returnNumberAndNumberOfReturns = sourceView.getUint8(i * sourcePointSize + 14, true);
        let returnNumber = returnNumberAndNumberOfReturns & 0b0111;
        let numberOfReturns = (returnNumberAndNumberOfReturns & 0b00111000) >> 3;
        targetView.setFloat32(i * targetPointSize + 24, returnNumber, true);
        targetView.setFloat32(i * targetPointSize + 28, numberOfReturns, true);

		// CLASSIFICATION
        let classification = sourceView.getUint8(i * sourcePointSize + 15, true);
        targetView.setFloat32(i * targetPointSize + 20, classification, true);

		// POINT SOURCE ID
        let pointSourceID = sourceView.getUint16(i * sourcePointSize + 18, true);
        targetView.setFloat32(i * targetPointSize + 32, pointSourceID, true);

		// COLOR, if available
		if (pointFormatID === 2) {            
            let r = sourceView.getUint16(i * sourcePointSize + 20, true) / 256;
            let g = sourceView.getUint16(i * sourcePointSize + 22, true) / 256;
            let b = sourceView.getUint16(i * sourcePointSize + 24, true) / 256;

            targetView.setUint8(i * targetPointSize + 12, r, true);
            targetView.setUint8(i * targetPointSize + 13, g, true);
            targetView.setUint8(i * targetPointSize + 14, b, true);
            targetView.setUint8(i * targetPointSize + 15, 255, true);
		}
	}

	for (let i = 0; i < numPoints; i++) {
		targetView.setUint32(i * targetPointSize + 36, i, true);
    }

    performance.mark("laslaz-end");

    { // print timings
        performance.measure("laslaz", "laslaz-start", "laslaz-end");
        let measure = performance.getEntriesByType("measure")[0];
        let dpp = 1000 * measure.duration / numPoints;
        let debugMessage = `${measure.duration.toFixed(3)} ms, ${numPoints} points, ${dpp.toFixed(3)} µs / point`;
        console.log(debugMessage);
    }
    performance.clearMarks();
    performance.clearMeasures();
    
	let message = {
		mean: mean,
		data: targetBuffer,
		tightBoundingBox: tightBoundingBox
	};

	let transferables = [message.data];

	postMessage(message, transferables);
};



onmessage = readUsingDataView;
//onmessage = readUsingTempArrays;