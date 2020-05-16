
import {Enum} from "../Enum.js";

var GeoTIFF = (function (exports) {
'use strict';

const Endianness = new Enum({
	LITTLE: "II",
	BIG: "MM",
});

const Type = new Enum({
	BYTE: {value: 1, bytes: 1},
	ASCII: {value: 2, bytes: 1},
	SHORT: {value: 3, bytes: 2},
	LONG: {value: 4, bytes: 4},
	RATIONAL: {value: 5, bytes: 8},
	SBYTE: {value: 6, bytes: 1},
	UNDEFINED: {value: 7, bytes: 1},
	SSHORT: {value: 8, bytes: 2},
	SLONG: {value: 9, bytes: 4},
	SRATIONAL: {value: 10, bytes: 8},
	FLOAT: {value: 11, bytes: 4},
	DOUBLE: {value: 12, bytes: 8},
});

const Tag = new Enum({
	IMAGE_WIDTH: 256,
	IMAGE_HEIGHT: 257,
	BITS_PER_SAMPLE: 258,
	COMPRESSION: 259,
	PHOTOMETRIC_INTERPRETATION: 262,
	STRIP_OFFSETS: 273,
	ORIENTATION: 274,
	SAMPLES_PER_PIXEL: 277,
	ROWS_PER_STRIP: 278,
	STRIP_BYTE_COUNTS: 279,
	X_RESOLUTION: 282,
	Y_RESOLUTION: 283,
	PLANAR_CONFIGURATION: 284,
	RESOLUTION_UNIT: 296,
	SOFTWARE: 305,
	COLOR_MAP: 320,
	SAMPLE_FORMAT: 339,
	MODEL_PIXEL_SCALE: 33550,         // [GeoTIFF] TYPE: double   N: 3
	MODEL_TIEPOINT: 33922,            // [GeoTIFF] TYPE: double   N: 6 * NUM_TIEPOINTS
	GEO_KEY_DIRECTORY: 34735,         // [GeoTIFF] TYPE: short    N: >= 4
	GEO_DOUBLE_PARAMS: 34736,         // [GeoTIFF] TYPE: short    N: variable
	GEO_ASCII_PARAMS: 34737,          // [GeoTIFF] TYPE: ascii    N: variable
});

const typeMapping = new Map([
	[Type.BYTE, Uint8Array],
	[Type.ASCII, Uint8Array],
	[Type.SHORT, Uint16Array],
	[Type.LONG, Uint32Array],
	[Type.RATIONAL, Uint32Array],
	[Type.SBYTE, Int8Array],
	[Type.UNDEFINED, Uint8Array],
	[Type.SSHORT, Int16Array],
	[Type.SLONG, Int32Array],
	[Type.SRATIONAL, Int32Array],
	[Type.FLOAT, Float32Array],
	[Type.DOUBLE, Float64Array],
]);

class IFDEntry{

	constructor(tag, type, count, offset, value){
		this.tag = tag;
		this.type = type;
		this.count = count;
		this.offset = offset;
		this.value = value;
	}

}

class Image{

	constructor(){
		this.width = 0;
		this.height = 0;
		this.buffer = null;
		this.metadata = [];
	}

}

class Reader{

	constructor(){

	}

	static read(data){

		let endiannessTag = String.fromCharCode(...Array.from(data.slice(0, 2)));
		let endianness = Endianness.fromValue(endiannessTag);

		let tiffCheckTag = data.readUInt8(2);

		if(tiffCheckTag !== 42){
			throw new Error("not a valid tiff file");
		}

		let offsetToFirstIFD = data.readUInt32LE(4);

		console.log("offsetToFirstIFD", offsetToFirstIFD);

		let ifds = [];
		let IFDsRead = false;
		let currentIFDOffset = offsetToFirstIFD;
		let i = 0;
		while(IFDsRead || i < 100){

			console.log("currentIFDOffset", currentIFDOffset);
			let numEntries = data.readUInt16LE(currentIFDOffset);
			let nextIFDOffset = data.readUInt32LE(currentIFDOffset + 2 + numEntries * 12);

			console.log("next offset: ", currentIFDOffset + 2 + numEntries * 12);

			let entryBuffer = data.slice(currentIFDOffset + 2, currentIFDOffset + 2 + 12 * numEntries);

			for(let i = 0; i < numEntries; i++){
				let tag = Tag.fromValue(entryBuffer.readUInt16LE(i * 12));
				let type = Type.fromValue(entryBuffer.readUInt16LE(i * 12 + 2));
				let count = entryBuffer.readUInt32LE(i * 12 + 4);
				let offsetOrValue = entryBuffer.readUInt32LE(i * 12 + 8);
				let valueBytes = type.bytes * count;

				let value;
				if(valueBytes <= 4){
					value = offsetOrValue;
				}else{
					let valueBuffer = new Uint8Array(valueBytes);
					valueBuffer.set(data.slice(offsetOrValue, offsetOrValue + valueBytes));
					
					let ArrayType = typeMapping.get(type);

					value = new ArrayType(valueBuffer.buffer);

					if(type === Type.ASCII){
						value = String.fromCharCode(...value);
					}
				}

				let ifd = new IFDEntry(tag, type, count, offsetOrValue, value);

				ifds.push(ifd);
			}

			console.log("nextIFDOffset", nextIFDOffset);

			if(nextIFDOffset === 0){
				break;
			}

			currentIFDOffset = nextIFDOffset;
			i++;
		}

		let ifdForTag = (tag) => {
			for(let entry of ifds){
				if(entry.tag === tag){
					return entry;
				}
			}

			return null;
		};

		let width = ifdForTag(Tag.IMAGE_WIDTH, ifds).value;
		let height = ifdForTag(Tag.IMAGE_HEIGHT, ifds).value;
		let compression = ifdForTag(Tag.COMPRESSION, ifds).value;
		let rowsPerStrip = ifdForTag(Tag.ROWS_PER_STRIP, ifds).value; 
		let ifdStripOffsets = ifdForTag(Tag.STRIP_OFFSETS, ifds);
		let ifdStripByteCounts = ifdForTag(Tag.STRIP_BYTE_COUNTS, ifds);

		let numStrips = Math.ceil(height / rowsPerStrip);

		let stripByteCounts = [];
		for(let i = 0; i < ifdStripByteCounts.count; i++){
			let type = ifdStripByteCounts.type;
			let offset = ifdStripByteCounts.offset + i * type.bytes;

			let value;
			if(type === Type.SHORT){
				value = data.readUInt16LE(offset);
			}else if(type === Type.LONG){
				value = data.readUInt32LE(offset);
			}

			stripByteCounts.push(value);
		}

		let stripOffsets = [];
		for(let i = 0; i < ifdStripOffsets.count; i++){
			let type = ifdStripOffsets.type;
			let offset = ifdStripOffsets.offset + i * type.bytes;

			let value;
			if(type === Type.SHORT){
				value = data.readUInt16LE(offset);
			}else if(type === Type.LONG){
				value = data.readUInt32LE(offset);
			}

			stripOffsets.push(value);
		}

		let imageBuffer = new Uint8Array(width * height * 3);
		
		let linesProcessed = 0;
		for(let i = 0; i < numStrips; i++){
			let stripOffset = stripOffsets[i];
			let stripBytes = stripByteCounts[i];
			let stripData = data.slice(stripOffset, stripOffset + stripBytes);
			let lineBytes = width * 3;
			for(let y = 0; y < rowsPerStrip; y++){
				let line = stripData.slice(y * lineBytes, y * lineBytes + lineBytes);
				imageBuffer.set(line, linesProcessed * lineBytes);
		
				if(line.length === lineBytes){
					linesProcessed++;
				}else{
					break;
				}
			}
		}

		console.log(`width: ${width}`);
		console.log(`height: ${height}`);
		console.log(`numStrips: ${numStrips}`);
		console.log("stripByteCounts", stripByteCounts.join(", "));
		console.log("stripOffsets", stripOffsets.join(", "));

		let image = new Image();
		image.width = width;
		image.height = height;
		image.buffer = imageBuffer;
		image.metadata = ifds;

		return image;
	}

}


class Exporter{

	constructor(){

	}

	static toTiffBuffer(image, params = {}){

		let offsetToFirstIFD = 8;
		
		let headerBuffer = new Uint8Array([0x49, 0x49, 42, 0, offsetToFirstIFD, 0, 0, 0]);

		let [width, height] = [image.width, image.height];

		let ifds = [
			new IFDEntry(Tag.IMAGE_WIDTH,                Type.SHORT,    1,   null, width),
			new IFDEntry(Tag.IMAGE_HEIGHT,               Type.SHORT,    1,   null, height),
			new IFDEntry(Tag.BITS_PER_SAMPLE,            Type.SHORT,    4,   null, new Uint16Array([8, 8, 8, 8])),
			new IFDEntry(Tag.COMPRESSION,                Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.PHOTOMETRIC_INTERPRETATION, Type.SHORT,    1,   null, 2),
			new IFDEntry(Tag.ORIENTATION,                Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.SAMPLES_PER_PIXEL,          Type.SHORT,    1,   null, 4),
			new IFDEntry(Tag.ROWS_PER_STRIP,             Type.LONG,     1,   null, height),
			new IFDEntry(Tag.STRIP_BYTE_COUNTS,          Type.LONG,     1,   null, width * height * 3),
			new IFDEntry(Tag.PLANAR_CONFIGURATION,       Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.RESOLUTION_UNIT,            Type.SHORT,    1,   null, 1),
			new IFDEntry(Tag.SOFTWARE,                   Type.ASCII,    6,   null, "......"),
			new IFDEntry(Tag.STRIP_OFFSETS,              Type.LONG,     1,   null, null),
			new IFDEntry(Tag.X_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
			new IFDEntry(Tag.Y_RESOLUTION,               Type.RATIONAL, 1,   null, new Uint32Array([1, 1])),
		];

		if(params.ifdEntries){
			ifds.push(...params.ifdEntries);
		}

		let valueOffset = offsetToFirstIFD + 2 + ifds.length * 12 + 4;

		// create 12 byte buffer for each ifd and variable length buffers for ifd values
		let ifdEntryBuffers = new Map();
		let ifdValueBuffers = new Map();
		for(let ifd of ifds){
			let entryBuffer = new ArrayBuffer(12);
			let entryView = new DataView(entryBuffer);

			let valueBytes = ifd.type.bytes * ifd.count;

			entryView.setUint16(0, ifd.tag.value, true);
			entryView.setUint16(2, ifd.type.value, true);
			entryView.setUint32(4, ifd.count, true);

			if(ifd.count === 1 && ifd.type.bytes <= 4){
				entryView.setUint32(8, ifd.value, true);
			}else{
				entryView.setUint32(8, valueOffset, true);

				let valueBuffer = new Uint8Array(ifd.count * ifd.type.bytes);
				if(ifd.type === Type.ASCII){
					valueBuffer.set(new Uint8Array(ifd.value.split("").map(c => c.charCodeAt(0))));
				}else{
					valueBuffer.set(new Uint8Array(ifd.value.buffer));
				}
				ifdValueBuffers.set(ifd.tag, valueBuffer);

				valueOffset = valueOffset + valueBuffer.byteLength;
			}

			ifdEntryBuffers.set(ifd.tag, entryBuffer);
		}

		let imageBufferOffset = valueOffset;

		new DataView(ifdEntryBuffers.get(Tag.STRIP_OFFSETS)).setUint32(8, imageBufferOffset, true);

		let concatBuffers = (buffers) => {

			let totalLength = buffers.reduce( (sum, buffer) => (sum + buffer.byteLength), 0);
			let merged = new Uint8Array(totalLength);

			let offset = 0;
			for(let buffer of buffers){
				merged.set(new Uint8Array(buffer), offset);
				offset += buffer.byteLength;
			}

			return merged;
		};
		
		let ifdBuffer = concatBuffers([
			new Uint16Array([ifds.length]), 
			...ifdEntryBuffers.values(), 
			new Uint32Array([0])]);
		let ifdValueBuffer = concatBuffers([...ifdValueBuffers.values()]);

		let tiffBuffer = concatBuffers([
			headerBuffer,
			ifdBuffer,
			ifdValueBuffer,
			image.buffer
		]);

		return {width: width, height: height, buffer: tiffBuffer};
	}

}

exports.Tag = Tag;
exports.Type = Type;
exports.IFDEntry = IFDEntry;
exports.Image = Image;
exports.Reader = Reader;
exports.Exporter = Exporter;

return exports;

}({}));
