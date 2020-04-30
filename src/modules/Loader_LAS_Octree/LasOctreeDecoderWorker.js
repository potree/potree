

import {Version} from "../../Version.js";
import {PointAttributes, PointAttribute} from "../../loader/PointAttributes.js";

Potree = {};

const gridSize = 64;
const grid = new Int32Array(gridSize * gridSize * gridSize);
let cellIterationID = 0;

onmessage = function (event) {

	let tStart = performance.now();
	
	let {buffer, pointAttributes, scale, offset, min, max} = event.data;
	let {nodeMin, nodeMax} = event.data;

	let numPoints = buffer.byteLength / pointAttributes.byteSize;
	let cv = new DataView(buffer);

	
	let attributeBuffers = {};
	let attributeOffset = 0;
	let density = 0.0;

	let bytesPerPoint = 0;
	for (let pointAttribute of pointAttributes.attributes) {
		bytesPerPoint += pointAttribute.byteSize;
	}

	for (let pointAttribute of pointAttributes.attributes) {
		
		if (pointAttribute.name === "position") {
			let buff = new ArrayBuffer(numPoints * 4 * 3);
			let positions = new Float32Array(buff);

			cellIterationID++;
			let numCells = 0;
			let nodeSize = max.x - min.x;
		
			for (let j = 0; j < numPoints; j++) {
				
				let pointOffset = j * bytesPerPoint;

				let x = (cv.getInt32(pointOffset + attributeOffset + 0, true) * scale.x) + offset.x; //- min.x;
				let y = (cv.getInt32(pointOffset + attributeOffset + 4, true) * scale.y) + offset.y; //- min.y;
				let z = (cv.getInt32(pointOffset + attributeOffset + 8, true) * scale.z) + offset.z; //- min.z;

				let mx = x - min.x;
				let my = y - min.y;
				let mz = z - min.z;

				positions[3 * j + 0] = mx;
				positions[3 * j + 1] = my;
				positions[3 * j + 2] = mz;

				let nx = mx / nodeSize;
				let ny = my / nodeSize;
				let nz = mz / nodeSize;

				let gx = parseInt(Math.max(Math.min(gridSize * nx, gridSize - 1), 0));
				let gy = parseInt(Math.max(Math.min(gridSize * ny, gridSize - 1), 0));
				let gz = parseInt(Math.max(Math.min(gridSize * nz, gridSize - 1), 0));
				let gridIndex = gx + gy * gridSize + gz * gridSize * gridSize;

				if(grid[gridIndex] != cellIterationID){
					grid[gridIndex] = cellIterationID;
					numCells++;
				}

			}

			{
				let ratio = numPoints / numCells;
				// let name = event.data.name;
				// console.log(`${name}: ${ratio}`);

				density = ratio;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}else if(pointAttribute.name === "rgba"){
			let buff = new ArrayBuffer(numPoints * 4);
			let colors = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let pointOffset = j * bytesPerPoint;

				colors[4 * j + 0] = cv.getUint8(pointOffset + attributeOffset + 0);
				colors[4 * j + 1] = cv.getUint8(pointOffset + attributeOffset + 1);
				colors[4 * j + 2] = cv.getUint8(pointOffset + attributeOffset + 2);
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}else if(pointAttribute.name === "rgb"){
			let buff = new ArrayBuffer(numPoints * 4);
			let colors = new Uint8Array(buff);

			for (let j = 0; j < numPoints; j++) {
				let pointOffset = j * bytesPerPoint;

				let r = cv.getUint16(pointOffset + attributeOffset + 0);
				let g = cv.getUint16(pointOffset + attributeOffset + 2);
				let b = cv.getUint16(pointOffset + attributeOffset + 4);

				r = r >= 256 ? r / 256 : r;
				g = g >= 256 ? g / 256 : g;
				b = b >= 256 ? b / 256 : b;

				colors[4 * j + 0] = r;
				colors[4 * j + 1] = g;
				colors[4 * j + 2] = b;
			}

			attributeBuffers[pointAttribute.name] = { buffer: buff, attribute: pointAttribute };
		}

		attributeOffset += pointAttribute.byteSize;
	}

	{ // add indices
		let buff = new ArrayBuffer(numPoints * 4);
		let indices = new Uint32Array(buff);

		for (let i = 0; i < numPoints; i++) {
			indices[i] = i;
		}
		
		attributeBuffers["INDICES"] = { buffer: buff, attribute: PointAttribute.INDICES };
	}

	let message = {
		buffer: buffer,
		attributeBuffers: attributeBuffers,
		density: density,
	};

	let transferables = [];
	for (let property in message.attributeBuffers) {
		transferables.push(message.attributeBuffers[property].buffer);
	}
	transferables.push(buffer);

	let duration = performance.now() - tStart;
	console.log(`${name}: ${duration.toFixed(3)}ms`);

	postMessage(message, transferables);
};
