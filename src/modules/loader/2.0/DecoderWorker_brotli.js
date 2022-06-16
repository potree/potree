

// import {Version} from "../../Version.js";
import {PointAttributes, PointAttribute, PointAttributeTypes} from "../../../loader/PointAttributes.js";
import {BrotliDecode} from "../../../../libs/brotli/decode.js";

const typedArrayMapping = {
	"int8":   Int8Array,
	"int16":  Int16Array,
	"int32":  Int32Array,
	"int64":  Float64Array,
	"uint8":  Uint8Array,
	"uint16": Uint16Array,
	"uint32": Uint32Array,
	"uint64": Float64Array,
	"float":  Float32Array,
	"double": Float64Array,
};

Potree = {};

function dealign24b(mortoncode){
	// see https://stackoverflow.com/questions/45694690/how-i-can-remove-all-odds-bits-in-c

	// input alignment of desired bits
	// ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p
	let x = mortoncode;

	//          ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p                     ..a..b..c..d..e..f..g..h..i..j..k..l..m..n..o..p 
	//          ..a.....c.....e.....g.....i.....k.....m.....o...                     .....b.....d.....f.....h.....j.....l.....n.....p 
	//          ....a.....c.....e.....g.....i.....k.....m.....o.                     .....b.....d.....f.....h.....j.....l.....n.....p 
	x = ((x & 0b001000001000001000001000) >>  2) | ((x & 0b000001000001000001000001) >> 0);
	//          ....ab....cd....ef....gh....ij....kl....mn....op                     ....ab....cd....ef....gh....ij....kl....mn....op
	//          ....ab..........ef..........ij..........mn......                     ..........cd..........gh..........kl..........op
	//          ........ab..........ef..........ij..........mn..                     ..........cd..........gh..........kl..........op
	x = ((x & 0b000011000000000011000000) >>  4) | ((x & 0b000000000011000000000011) >> 0);
	//          ........abcd........efgh........ijkl........mnop                     ........abcd........efgh........ijkl........mnop
	//          ........abcd....................ijkl............                     ....................efgh....................mnop
	//          ................abcd....................ijkl....                     ....................efgh....................mnop
	x = ((x & 0b000000001111000000000000) >>  8) | ((x & 0b000000000000000000001111) >> 0);
	//          ................abcdefgh................ijklmnop                     ................abcdefgh................ijklmnop
	//          ................abcdefgh........................                     ........................................ijklmnop
	//          ................................abcdefgh........                     ........................................ijklmnop
	x = ((x & 0b000000000000000000000000) >> 16) | ((x & 0b000000000000000011111111) >> 0);

	// sucessfully realigned! 
	//................................abcdefghijklmnop

	return x;
}

let mask_b0 = new Uint8Array([0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3, 0, 1, 0, 1, 0, 1, 0, 1, 2, 3, 2, 3, 2, 3, 2, 3]);

onmessage = function (event) {

	let {pointAttributes, scale, name, min, max, size, offset, numPoints} = event.data;

	let tStart = performance.now();

	let buffer; 
	if(numPoints === 0){
		buffer = {buffer: new ArrayBuffer(0)};
	}else{
		try{
			buffer = BrotliDecode(new Int8Array(event.data.buffer));
		}catch(e){
			buffer = {buffer: new ArrayBuffer(numPoints * (pointAttributes.byteSize + 12))};
			console.error(`problem with node ${name}: `, e);
		}
	}

	let view = new DataView(buffer.buffer);
	
	let attributeBuffers = {};
	let attributeOffset = 0;

	let bytesPerPoint = 0;
	for (let pointAttribute of pointAttributes.attributes) {
		bytesPerPoint += pointAttribute.byteSize;
	}

	let gridSize = 32;
	let grid = new Uint32Array(gridSize ** 3);
	let toIndex = (x, y, z) => {

		// min is already subtracted
		let dx = gridSize * x / size.x;
		let dy = gridSize * y / size.y;
		let dz = gridSize * z / size.z;

		let ix = Math.min(parseInt(dx), gridSize - 1);
		let iy = Math.min(parseInt(dy), gridSize - 1);
		let iz = Math.min(parseInt(dz), gridSize - 1);

		let index = ix + iy * gridSize + iz * gridSize * gridSize;

		return index;
	};

	let numOccupiedCells = 0;
	let byteOffset = 0;
	for (let pointAttribute of pointAttributes.attributes) {
		

		if(["POSITION_CARTESIAN", "position"].includes(pointAttribute.name)){

			// let tStart = performance.now();

			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let positions = new Float32Array(buff);
		
			for (let j = 0; j < numPoints; j++) {


				let mc_0 = view.getUint32(byteOffset +  4, true);
				let mc_1 = view.getUint32(byteOffset +  0, true);
				let mc_2 = view.getUint32(byteOffset + 12, true);
				let mc_3 = view.getUint32(byteOffset +  8, true);

				byteOffset += 16;

				let X = dealign24b((mc_3 & 0x00FFFFFF) >>> 0) 
						| (dealign24b(((mc_3 >>> 24) | (mc_2 << 8)) >>> 0) << 8);

				let Y = dealign24b((mc_3 & 0x00FFFFFF) >>> 1) 
						| (dealign24b(((mc_3 >>> 24) | (mc_2 << 8)) >>> 1) << 8)
						

				let Z = dealign24b((mc_3 & 0x00FFFFFF) >>> 2) 
						| (dealign24b(((mc_3 >>> 24) | (mc_2 << 8)) >>> 2) << 8)
						

				if(mc_1 != 0 || mc_2 != 0){
					X = X | (dealign24b((mc_1 & 0x00FFFFFF) >>> 0) << 16)
						| (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 0) << 24);

					Y = Y | (dealign24b((mc_1 & 0x00FFFFFF) >>> 1) << 16)
						| (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 1) << 24);

					Z = Z | (dealign24b((mc_1 & 0x00FFFFFF) >>> 2) << 16)
						| (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 2) << 24);
				}

				// =======================
				// VERIFY AGAINST LOOP VERSION
				// =======================
				// let reference;
				// { // correct reference

				// 	let mc_upper = view.getBigUint64(byteOffset + 0, true);
				// 	let mc_lower = view.getBigUint64(byteOffset + 8, true);

				// 	let X = 0n;
				// 	let Y = 0n;
				// 	let Z = 0n;

				// 	for(let k = 0n; k < 16n; k++){
				// 		let mask_lower = (mc_lower >> (3n * k)) & 0b111n;
				// 		let mask_upper = (mc_upper >> (3n * k)) & 0b111n;

				// 		X = X | (((mask_lower >> 0n) & 0b001n) << k);
				// 		X = X | ((((mask_upper >> 0n) & 0b001n) << k) << 16n);

				// 		Y = Y | (((mask_lower >> 1n) & 0b001n) << k);
				// 		Y = Y | ((((mask_upper >> 1n) & 0b001n) << k) << 16n);

				// 		Z = Z | (((mask_lower >> 2n) & 0b001n) << k);
				// 		Z = Z | ((((mask_upper >> 2n) & 0b001n) << k) << 16n);
				// 	}

				// 	reference = [X, Y, Z];
				// }
				// //dbgad += parseInt(reference[2]);
				// let [rX, rY, rZ] = reference;

				// if(X !== parseInt(rX)){
				// 	debugger;
				// }
				// if(Y !== parseInt(rY)){
				// 	debugger;
				// }
				// if(Z !== parseInt(rZ)){
				// 	debugger;
				// }

				


				// let mc_upper = view.getBigUint64(byteOffset + 0, true);
				// let mc_lower = view.getBigUint64(byteOffset + 8, true);
				// byteOffset += 16;

				// =======================
				// MAGIC NUMBERS 32BIT
				// =======================
				// let mc0 = parseInt((mc_lower >>  0n) & 0x00FFFFFFn);
				// let mc1 = parseInt((mc_lower >> 24n) & 0x00FFFFFFn);
				// let mc2 = parseInt((mc_lower >> 48n) & 0x00FFFFFFn);

				// let X = dealign24b(mc0 >> 0) | (dealign24b(mc1 >> 0) << 8) | (dealign24b(mc2 >> 0) << 16);
				// let Y = dealign24b(mc0 >> 1) | (dealign24b(mc1 >> 1) << 8) | (dealign24b(mc2 >> 1) << 16);
				// let Z = dealign24b(mc0 >> 2) | (dealign24b(mc1 >> 2) << 8) | (dealign24b(mc2 >> 2) << 16);


				// =======================
				// MAGIC NUMBERS BIGINT
				// =======================
				// let X = dealign(mc_lower >> 0n);// | (dealign(mc_upper >> 0n) << 16n);
				// let Y = dealign(mc_lower >> 1n);// | (dealign(mc_upper >> 1n) << 16n);
				// let Z = dealign(mc_lower >> 2n);// | (dealign(mc_upper >> 2n) << 16n);

				// =======================
				// LOOP
				// =======================
				// let X = 0n;
				// let Y = 0n;
				// let Z = 0n;

				// for(let k = 0n; k < 16n; k++){
				// 	let mask_lower = (mc_lower >> (3n * k)) & 0b111n;
				// 	let mask_upper = (mc_upper >> (3n * k)) & 0b111n;

				// 	X = X | (((mask_lower >> 0n) & 0b001n) << k);
				// 	X = X | ((((mask_upper >> 0n) & 0b001n) << k) << 16n);

				// 	Y = Y | (((mask_lower >> 1n) & 0b001n) << k);
				// 	Y = Y | ((((mask_upper >> 1n) & 0b001n) << k) << 16n);

				// 	Z = Z | (((mask_lower >> 2n) & 0b001n) << k);
				// 	Z = Z | ((((mask_upper >> 2n) & 0b001n) << k) << 16n);
				// }



				let x = parseInt(X) * scale[0] + offset[0] - min.x;
				let y = parseInt(Y) * scale[1] + offset[1] - min.y;
				let z = parseInt(Z) * scale[2] + offset[2] - min.z;

				let index = toIndex(x, y, z);
				let count = grid[index]++;
				if(count === 0){
					numOccupiedCells++;
				}

				positions[3 * j + 0] = x;
				positions[3 * j + 1] = y;
				positions[3 * j + 2] = z;
			}

			// let duration = performance.now() - tStart;
			// console.log(`xyz: ${duration.toFixed(1)}ms`);

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}else if(["RGBA", "rgba"].includes(pointAttribute.name)){

			let buff = new ArrayBuffer(numPoints * 4);
			let colors = new Uint8Array(buff);

			// for (let j = 0; j < numPoints; j++) {
			// 	let r = view.getUint16(byteOffset + 0, true);
			// 	let g = view.getUint16(byteOffset + 2, true);
			// 	let b = view.getUint16(byteOffset + 4, true);
			// 	byteOffset += 6;

			// 	colors[4 * j + 0] = r > 255 ? r / 256 : r;
			// 	colors[4 * j + 1] = g > 255 ? g / 256 : g;
			// 	colors[4 * j + 2] = b > 255 ? b / 256 : b;
			// }

			// let tStart = performance.now();

			for (let j = 0; j < numPoints; j++) {

				let mc_0 = view.getUint32(byteOffset +  4, true);
				let mc_1 = view.getUint32(byteOffset +  0, true);
				byteOffset += 8;

				let r = dealign24b((mc_1 & 0x00FFFFFF) >>> 0) 
						| (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 0) << 8);

				let g = dealign24b((mc_1 & 0x00FFFFFF) >>> 1) 
						| (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 1) << 8);

				let b = dealign24b((mc_1 & 0x00FFFFFF) >>> 2) 
						| (dealign24b(((mc_1 >>> 24) | (mc_0 << 8)) >>> 2) << 8);

				// let bits = mask_b0[mc_1 >>> 24];
				
				// if(((r >> 8) & 0b11) !== bits){
				// 	debugger;	
				// }

				// let r = dealign24b(mc0 >> 0) | (dealign24b(mc1 >> 0) << 8);
				// let g = dealign24b(mc0 >> 1) | (dealign24b(mc1 >> 1) << 8);
				// let b = dealign24b(mc0 >> 2) | (dealign24b(mc1 >> 2) << 8);


				colors[4 * j + 0] = r > 255 ? r / 256 : r;
				colors[4 * j + 1] = g > 255 ? g / 256 : g;
				colors[4 * j + 2] = b > 255 ? b / 256 : b;
			}
			// let duration = performance.now() - tStart;
			// console.log(`rgb: ${duration.toFixed(1)}ms`);

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}else{
			let buff = new ArrayBuffer(numPoints * 4);
			let f32 = new Float32Array(buff);

			let TypedArray = typedArrayMapping[pointAttribute.type.name];
			preciseBuffer = new TypedArray(numPoints);

			let [offset, scale] = [0, 1];

			const getterMap = {
				"int8":   view.getInt8,
				"int16":  view.getInt16,
				"int32":  view.getInt32,
				// "int64":  view.getInt64,
				"uint8":  view.getUint8,
				"uint16": view.getUint16,
				"uint32": view.getUint32,
				// "uint64": view.getUint64,
				"float":  view.getFloat32,
				"double": view.getFloat64,
			};
			const getter = getterMap[pointAttribute.type.name].bind(view);

			// compute offset and scale to pack larger types into 32 bit floats
			if(pointAttribute.type.size > 4){
				let [amin, amax] = pointAttribute.range;
				offset = amin;
				scale = 1 / (amax - amin);
			}

			for(let j = 0; j < numPoints; j++){
				// let pointOffset = j * bytesPerPoint;
				let value = getter(byteOffset, true);
				byteOffset += pointAttribute.byteSize;

				f32[j] = (value - offset) * scale;
				preciseBuffer[j] = value;
			}

			attributeBuffers[pointAttribute.name] = { 
				buffer: buff,
				preciseBuffer: preciseBuffer,
				attribute: pointAttribute,
				offset: offset,
				scale: scale,
			};
		}

		// attributeOffset += pointAttribute.byteSize;


	}

	let occupancy = parseInt(numPoints / numOccupiedCells);
	// console.log(`${name}: #points: ${numPoints}: #occupiedCells: ${numOccupiedCells}, occupancy: ${occupancy} points/cell`);

	{ // add indices
		let buff = new ArrayBuffer(numPoints * 4);
		let indices = new Uint32Array(buff);

		for (let i = 0; i < numPoints; i++) {
			indices[i] = i;
		}
		
		attributeBuffers["INDICES"] = { buffer: buff, attribute: PointAttribute.INDICES };
	}


	{ // handle attribute vectors
		let vectors = pointAttributes.vectors;

		for(let vector of vectors){

			let {name, attributes} = vector;
			let numVectorElements = attributes.length;
			let buffer = new ArrayBuffer(numVectorElements * numPoints * 4);
			let f32 = new Float32Array(buffer);

			let iElement = 0;
			for(let sourceName of attributes){
				let sourceBuffer = attributeBuffers[sourceName];
				let {offset, scale} = sourceBuffer;
				let view = new DataView(sourceBuffer.buffer);

				const getter = view.getFloat32.bind(view);

				for(let j = 0; j < numPoints; j++){
					let value = getter(j * 4, true);

					f32[j * numVectorElements + iElement] = (value / scale) + offset;
				}

				iElement++;
			}

			let vecAttribute = new PointAttribute(name, PointAttributeTypes.DATA_TYPE_FLOAT, 3);

			attributeBuffers[name] = { 
				buffer: buffer, 
				attribute: vecAttribute,
			};

		}

	}


	let duration = performance.now() - tStart;
	let pointsPerMs = numPoints / duration;
	// console.log(`duration: ${duration.toFixed(1)}ms, #points: ${numPoints}, points/ms: ${pointsPerMs.toFixed(1)}`);

	let message = {
		buffer: buffer,
		attributeBuffers: attributeBuffers,
		density: occupancy,
	};

	let transferables = [];
	for (let property in message.attributeBuffers) {
		transferables.push(message.attributeBuffers[property].buffer);
	}
	// transferables.push(buffer);

	postMessage(message, transferables);
};
