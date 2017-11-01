/* global self:false */
const funcs = {};
funcs.lasDecoder = require('./LasDecoderWorker');
funcs.greyhoundBinary = require('./greyhoundBinaryDecoderWorker');
funcs.demWorker = require('./DEMWorker');
funcs.binaryDecoder = require('./BinaryDecoderWorker');
funcs.lazload = require('../../libs/plasio/workers/laz-loader-worker.js');

self.onmessage = function (event) {
	if (!event.data) {
		return;
	}
	let func = funcs[event.data.type];
	if (!func) {
		return;
	}
	func(event.data.data, (data, transferables) => {
		data = data || {};
		self.postMessage(data, transferables);
	});
};
