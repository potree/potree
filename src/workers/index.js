/* global self:false */
const funcs = {};
funcs.lasDecoder = require('./LasDecoderWorker');
funcs.greyhoundBinary = require('./greyhoundBinaryDecoderWorker');
funcs.demWorker = require('./DEMWorker');
funcs.binaryDecoder = require('./BinaryDecoderWorker');
self.onmessage = function (event) {
	if (!event.data) {
		return;
	}
	let func = funcs[event.data.type];
	if (!func) {
		return;
	}
	func(event.data, self, (data, transferables) => {
		data = data || {};
		data.type = event.data.type;
		self.postMessage(data, transferables);
	});
};
