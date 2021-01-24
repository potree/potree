// window = { };
// document = { };
// importScripts('/libs/zstd-codec/bundle.js', '/libs/ept/ParseBuffer.js');

onmessage = async function(event) {
	
	const zstd = await new Promise(resolve => window.ZstdCodec.run(resolve));
	
	const streaming = new zstd.Streaming();
	const arr = new Uint8Array(event.data.buffer);
	const decompressed = streaming.decompress(arr);

	event.data.buffer = decompressed.buffer
	parseEpt(event);
	
};

