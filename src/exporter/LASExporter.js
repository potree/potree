
import * as THREE from "../../libs/three.js/build/three.module.js";

export class LASExporter {
	static toLAS (points) {
		// TODO Unused: let string = '';

		let boundingBox = points.boundingBox;
		let offset = boundingBox.min.clone();
		let diagonal = boundingBox.min.distanceTo(boundingBox.max);
		let scale = new THREE.Vector3(0.001, 0.001, 0.001);
		if (diagonal > 1000 * 1000) {
			scale = new THREE.Vector3(0.01, 0.01, 0.01);
		} else {
			scale = new THREE.Vector3(0.001, 0.001, 0.001);
		}

		let setString = function (string, offset, buffer) {
			let view = new Uint8Array(buffer);

			for (let i = 0; i < string.length; i++) {
				let charCode = string.charCodeAt(i);
				view[offset + i] = charCode;
			}
		};

		let buffer = new ArrayBuffer(227 + 28 * points.numPoints);
		let view = new DataView(buffer);
		let u8View = new Uint8Array(buffer);
		// let u16View = new Uint16Array(buffer);

		setString('LASF', 0, buffer);
		u8View[24] = 1;
		u8View[25] = 2;

		// system identifier o:26 l:32

		// generating software o:58 l:32
		setString('Potree 1.7', 58, buffer);

		// file creation day of year o:90 l:2
		// file creation year o:92 l:2

		// header size o:94 l:2
		view.setUint16(94, 227, true);

		// offset to point data o:96 l:4
		view.setUint32(96, 227, true);

		// number of letiable length records o:100 l:4

		// point data record format 104 1
		u8View[104] = 2;

		// point data record length 105 2
		view.setUint16(105, 28, true);

		// number of point records 107 4
		view.setUint32(107, points.numPoints, true);

		// number of points by return 111 20

		// x scale factor 131 8
		view.setFloat64(131, scale.x, true);

		// y scale factor 139 8
		view.setFloat64(139, scale.y, true);

		// z scale factor 147 8
		view.setFloat64(147, scale.z, true);

		// x offset 155 8
		view.setFloat64(155, offset.x, true);

		// y offset 163 8
		view.setFloat64(163, offset.y, true);

		// z offset 171 8
		view.setFloat64(171, offset.z, true);

		// max x 179 8
		view.setFloat64(179, boundingBox.max.x, true);

		// min x 187 8
		view.setFloat64(187, boundingBox.min.x, true);

		// max y 195 8
		view.setFloat64(195, boundingBox.max.y, true);

		// min y 203 8
		view.setFloat64(203, boundingBox.min.y, true);

		// max z 211 8
		view.setFloat64(211, boundingBox.max.z, true);

		// min z 219 8
		view.setFloat64(219, boundingBox.min.z, true);

		let boffset = 227;
		for (let i = 0; i < points.numPoints; i++) {

			let px = points.data.position[3 * i + 0];
			let py = points.data.position[3 * i + 1];
			let pz = points.data.position[3 * i + 2];

			let ux = parseInt((px - offset.x) / scale.x);
			let uy = parseInt((py - offset.y) / scale.y);
			let uz = parseInt((pz - offset.z) / scale.z);

			view.setUint32(boffset + 0, ux, true);
			view.setUint32(boffset + 4, uy, true);
			view.setUint32(boffset + 8, uz, true);

			if (points.data.intensity) {
				view.setUint16(boffset + 12, (points.data.intensity[i]), true);
			}

			let rt = 0;
			if (points.data.returnNumber) {
				rt += points.data.returnNumber[i];
			}
			if (points.data.numberOfReturns) {
				rt += (points.data.numberOfReturns[i] << 3);
			}
			view.setUint8(boffset + 14, rt);

			if (points.data.classification) {
				view.setUint8(boffset + 15, points.data.classification[i]);
			}
			// scan angle rank
			// user data
			// point source id
			if (points.data.pointSourceID) {
				view.setUint16(boffset + 18, points.data.pointSourceID[i]);
			}

			if (points.data.rgba || points.data.color) {
				let rgba = points.data.rgba ?? points.data.color;
				view.setUint16(boffset + 20, (rgba[4 * i + 0] * 255), true);
				view.setUint16(boffset + 22, (rgba[4 * i + 1] * 255), true);
				view.setUint16(boffset + 24, (rgba[4 * i + 2] * 255), true);
			}

			boffset += 28;
		}

		return buffer;
	}
	
}
