// laz-loader-worker.js
//

//import {Module} from "./laz-perf.js";

let instance = null; // laz-perf instance

function readAs(buf, Type, offset, count) {
	count = (count === undefined || count === 0 ? 1 : count);
	var sub = buf.slice(offset, offset + Type.BYTES_PER_ELEMENT * count);

	var r = new Type(sub);
	if (count === undefined || count === 1)
		return r[0];

	var ret = [];
	for (var i = 0 ; i < count ; i ++) {
		ret.push(r[i]);
	}

	return ret;
}

function parseLASHeader(arraybuffer) {
	var o = { };

	o.pointsOffset = readAs(arraybuffer, Uint32Array, 32*3);
	o.pointsFormatId = readAs(arraybuffer, Uint8Array, 32*3+8) & 0b111111;
	o.pointsStructSize = readAs(arraybuffer, Uint16Array, 32*3+8+1);

	o.extraBytes = 0;

	switch (o.pointsFormatId) {
		case 0: o.extraBytes = o.pointsStructSize - 20; break;
		case 1: o.extraBytes = o.pointsStructSize - 28; break;
		case 2: o.extraBytes = o.pointsStructSize - 26; break;
		case 3: o.extraBytes = o.pointsStructSize - 34; break;
	}

	o.pointsCount = readAs(arraybuffer, Uint32Array, 32 * 3 + 11);

	var start = 32 * 3 + 35;
	o.scale = readAs(arraybuffer, Float64Array, start, 3); start += 24;
	o.offset = readAs(arraybuffer, Float64Array, start, 3); start += 24;

	var bounds = readAs(arraybuffer, Float64Array, start, 6); start += 48;
	o.maxs = [bounds[0], bounds[2], bounds[4]];
	o.mins = [bounds[1], bounds[3], bounds[5]];

	return o;
}

function handleEvent(msg) {
	switch(msg.type) {
		case "open":
			try {
				instance = new Module.LASZip();
				var abInt = new Uint8Array(msg.arraybuffer);
				var buf = Module._malloc(msg.arraybuffer.byteLength);

				instance.arraybuffer = msg.arraybuffer;
				instance.buf = buf;
				Module.HEAPU8.set(abInt, buf);
				instance.open(buf, msg.arraybuffer.byteLength);

				instance.readOffset = 0;

				postMessage({ type: "open", status: 1});
			}catch(e) {
				debugger;
				postMessage({ type: "open", status: 0, details: e });
			}
			break;

		case "header":
			if (!instance)
				throw new Error(
						"You need to open the file before reading the header");

			var header = parseLASHeader(instance.arraybuffer);
			header.pointsFormatId &= 0x3f;
			instance.header = header;
			postMessage({type: "header", status: 1, header: header});
			break;

		case "read":
			if (!instance)
				throw new Error(
						"You need to open the file before trying to read");

			var start = msg.start, count = msg.count, skip = msg.skip;
			var o = instance;

			if (!o.header)
				throw new Error(
						"You need to query header before reading");

			let h = o.header;

			var pointsToRead = Math.min(
					count * skip, h.pointsCount - o.readOffset);
			var bufferSize = Math.ceil(pointsToRead / skip);
			var pointsRead = 0;

			let buffer = new ArrayBuffer(bufferSize * h.pointsStructSize);
			let this_buf = new Uint8Array(buffer);
			var buf_read = Module._malloc(h.pointsStructSize);

			for (var i = 0 ; i < pointsToRead ; i ++) {
				o.getPoint(buf_read);

				if (i % skip === 0) {
					var a = new Uint8Array(
							Module.HEAPU8.buffer,
							buf_read,
							h.pointsStructSize);

					this_buf.set(
							a,
							pointsRead * h.pointsStructSize,
							h.pointsStructSize);

					++pointsRead;
				}

				++o.readOffset;
			}
			Module._free(buf_read);

			let transferables = [buffer];

			postMessage({
				type: 'header',
				status: 1,
				buffer: buffer,
				count: pointsRead,
				hasMoreData: o.readOffset < o.header.pointsCount
			}, transferables);

			break;

		case "close":
			if (instance !== null) {
				Module._free(instance.buf);
				instance.delete();
				instance = null;
			}else{
				debugger;
			}

			postMessage({ type: "close", status: 1});
			break;
	}
}

onmessage = function(event) {
	try {
		handleEvent(event.data);
	} catch(e) {
		debugger;
		postMessage({type: event.data.type, status: 0, details: e});
	}
};


