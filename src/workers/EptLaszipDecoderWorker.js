/* global onmessage:true postMessage:false Copc */
/* exported onmessage */
// ept-laszip-decoder-worker.js
//

// importScripts('/libs/copc/index.js');

async function readUsingDataView(event) {
	performance.mark("laslaz-start");

	// TODO: Handle extra-bytes.
	const { isFullFile, compressed, header, eb, pointCount, nodemin } = event.data
	const { pointDataRecordFormat, pointDataRecordLength } = header

	// Note that for the chunk version, we use the point count passed in the
	// event rather than the point count from the header, since the header has
	// the point count for the entire file, not just our slice.
	const u = new Uint8Array(compressed)
	const buffer = isFullFile
		? await Copc.Las.PointData.decompressFile(u)
		: await Copc.Las.PointData.decompressChunk(
			u,
			{ pointDataRecordFormat, pointDataRecordLength, pointCount },
		)

	const view = Copc.Las.View.create(buffer, header, eb)

	const buffers = {
		position: new ArrayBuffer(pointCount * 3 * 4),
		color: new ArrayBuffer(pointCount * 3 * 2),
		intensity: new ArrayBuffer(pointCount * 4),
		classification: new ArrayBuffer(pointCount),
		returnNumber: new ArrayBuffer(pointCount),
		numberOfReturns: new ArrayBuffer(pointCount),
		pointSourceId: new ArrayBuffer(pointCount * 2),
		gpsTime: new ArrayBuffer(pointCount * 4),
		indices: new ArrayBuffer(pointCount * 4),
	}
	const tempBuffers = {
		gpsTime64: new ArrayBuffer(pointCount * 8),
		color16: new ArrayBuffer(pointCount * 3 * 2), // Does not include alpha.
	}

	const views = {
		position: new Float32Array(buffers.position),
		color16: new Uint16Array(tempBuffers.color16),
		color8: new Uint8Array(buffers.color),
		intensity: new Float32Array(buffers.intensity),
		classification: new Uint8Array(buffers.classification),
		returnNumber: new Uint8Array(buffers.returnNumber),
		numberOfReturns: new Uint8Array(buffers.numberOfReturns),
		pointSourceId: new Uint16Array(buffers.pointSourceId),
		gpsTime64: new Float64Array(tempBuffers.gpsTime64),
		gpsTime32: new Float32Array(buffers.gpsTime),
		indices: new Uint32Array(buffers.indices),
	}

	const mean = [0, 0, 0];

	const get = {
		x: view.getter('X'),
		y: view.getter('Y'),
		z: view.getter('Z'),
		intensity: view.getter('Intensity'),
		classification: view.getter('Classification'),
		returnNumber: view.getter('ReturnNumber'),
		numberOfReturns: view.getter('NumberOfReturns'),
		pointSourceId: view.getter('PointSourceId'),
		...(view.dimensions.GpsTime && { gpsTime: view.getter('GpsTime') }),
		...(view.dimensions.Red && {
			red: view.getter('Red'),
			green: view.getter('Green'),
			blue: view.getter('Blue'),
		}),
	}

	const ranges = [
		'x', 
		'y', 
		'z', 
		'intensity', 
		'classification',
		'returnNumber',
		'numberOfReturns',
		'pointSourceId',
		'gpsTime',
		'color',
	].reduce((map, name) => ({ ...map, [name]: [Infinity, -Infinity] }), {})

	function update(range, value) {
		range[0] = Math.min(range[0], value)
		range[1] = Math.max(range[1], value)
	}

	for (let i = 0; i < pointCount; i++) {
		views.indices[i] = i;

		const x = get.x(i) - nodemin[0];
		const y = get.y(i) - nodemin[1];
		const z = get.z(i) - nodemin[2];

		views.position[3 * i + 0] = x;
		views.position[3 * i + 1] = y;
		views.position[3 * i + 2] = z;

		mean[0] += x / pointCount;
		mean[1] += y / pointCount;
		mean[2] += z / pointCount;

		update(ranges.x, x)
		update(ranges.y, y)
		update(ranges.z, z)

		views.intensity[i] = get.intensity(i)
		update(ranges.intensity, views.intensity[i])

		views.returnNumber[i] = get.returnNumber(i)
		update(ranges.returnNumber, views.returnNumber[i])

		views.numberOfReturns[i] = get.numberOfReturns(i)
		update(ranges.numberOfReturns, views.numberOfReturns[i])

		views.classification[i] = get.classification(i)
		update(ranges.classification, views.classification[i])

		views.classification[i] = get.classification(i)
		update(ranges.classification, views.classification[i])

		views.pointSourceId[i] = get.pointSourceId(i)
		update(ranges.pointSourceId, views.pointSourceId[i])

		if (get.gpsTime) {
			views.gpsTime64[i] = get.gpsTime(i)
			update(ranges.gpsTime, views.gpsTime64[i])
		}

		if (get.red) {
			let r = get.red(i)
			let g = get.green(i)
			let b = get.blue(i)

			// We only really care about the max here to decide if we will need
			// to normalize the colors downward to 8-bit values.
			update(ranges.color, Math.max(r, g, b))

			views.color16[3 * i + 0] = r
			views.color16[3 * i + 1] = g
			views.color16[3 * i + 2] = b
		}
	}

	// Do some normalizations:
	// 	- if colors are 16-bit, normalize them down to 8-bit
	// 	- normalize the GPS times to 32-bit offset values.
	const normalizeColor = ranges.color[1] > 255 ? (c) => c / 256 : c => c
	ranges.color[0] = normalizeColor(ranges.color[0])
	ranges.color[1] = normalizeColor(ranges.color[1])
	for (let i = 0; i < pointCount; i++) {
		views.color8[4 * i + 0] = normalizeColor(views.color16[3 * i + 0]);
		views.color8[4 * i + 1] = normalizeColor(views.color16[3 * i + 1]);
		views.color8[4 * i + 2] = normalizeColor(views.color16[3 * i + 2]);
		views.gpsTime32[i] = views.gpsTime64[i] - ranges.gpsTime[0]
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
		...buffers,
		mean,
		tightBoundingBox: {
			min: [ranges.x[0], ranges.y[0], ranges.z[0]],
			max: [ranges.x[1], ranges.y[1], ranges.z[1]],
		},
		gpsMeta: { 
			offset: ranges.gpsTime[0], 
			range: ranges.gpsTime[1] - ranges.gpsTime[0]
		},
		ranges: { 
			intensity: ranges.intensity,
			classification: ranges.classification,
			'return number': ranges.returnNumber,
			'number of returns': ranges.numberOfReturns,
			'source id': ranges.pointSourceId,
			'gps-time': ranges.gpsTime,
		}
	};

	let transferables = Object.values(buffers)

	postMessage(message, transferables);
};

onmessage = readUsingDataView;
