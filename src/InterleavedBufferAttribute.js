module.exports = class InterleavedBufferAttribute {
	constructor (name, bytes, numElements, type, normalized) {
		this.name = name;
		this.bytes = bytes;
		this.numElements = numElements;
		this.normalized = normalized;
		this.type = type; // gl type without prefix, e.g. "FLOAT", "UNSIGNED_INT"
	}
};
