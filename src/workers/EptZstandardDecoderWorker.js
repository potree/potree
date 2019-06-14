/* eslint-disable no-global-assign, no-undef */

// https://github.com/connormanning/potree/blob/4e41f34d3dcd5a60935c6e0404e7d432dde12dd2/src/workers/EptZstandardDecoderWorker.js

// Global objects are undefined because we are running this code inside a worker
// so we need to define window and document variables as objects.
// This won't make any harm since this runs inside a worker
window = {};
document = {};

importScripts('/libs/zstd-codec/bundle.js', '/libs/ept/ParseBuffer.js');

onmessage = (event) => {
  new Promise(resolve => window.ZstdCodec.run(resolve)).then((zstd) => {
    const streaming = new zstd.Streaming();
    const arr = new Uint8Array(event.data.buffer);
    const decompressed = streaming.decompress(arr);

    event.data.buffer = decompressed.buffer;
    parseEpt(event);
  });
};
