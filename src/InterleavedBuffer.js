module.exports = class InterleavedBuffer {
	constructor (data, attributes, numElements) {
		this.data = data;
		this.attributes = attributes;
		this.stride = attributes.reduce((a, att) => a + att.bytes, 0);
		this.numElements = numElements;
	}
};
