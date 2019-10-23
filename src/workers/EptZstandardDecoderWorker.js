window = { };
document = { };
importScripts('/libs/zstd-codec/bundle.js', '/libs/ept/ParseBuffer.js');

onmessage = function(event) {
	new Promise(resolve => window.ZstdCodec.run(resolve))
	.then(zstd => {
		let streaming = new zstd.Streaming();
		let arr = new Uint8Array(event.data.buffer);
		const decompressed = streaming.decompress(arr);

		event.data.buffer = decompressed.buffer
		parseEpt(event);
	})
}

