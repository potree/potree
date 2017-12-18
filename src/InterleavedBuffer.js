module.exports = class InterleavedBuffer {
	constructor (data, attributes, numElements) {
		this.data = data;
		this.attributes = attributes;
		this.stride = attributes.reduce((a, att) => a + att.bytes, 0);
		this.stride = Math.ceil(this.stride / 4) * 4;
		this.numElements = numElements;
	}

	offset (name) {
		let offset = 0;

		for (let att of this.attributes) {
			if (att.name === name) {
				return offset;
			}

			offset += att.bytes;
		}

		return null;
	}
};
