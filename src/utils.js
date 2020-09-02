
import {XHRFactory} from "./XHRFactory.js";
// import {Volume} from "./utils/Volume.js";
// import {Profile} from "./utils/Profile.js";
// import {Measure} from "./utils/Measure.js";
// import {PolygonClipVolume} from "./utils/PolygonClipVolume.js";
import {PointColorType} from "./defines.js";

import {
	Box3,
} from '@zeainc/zea-engine'

/**
 * @ignore
 */
export class Utils {
	/**
	 * create worker from a string
	 * @param {array} code  - code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
	 */
	static createWorker (code) {
		let blob = new Blob([code], {type: 'application/javascript'});
		let worker = new Worker(URL.createObjectURL(blob));

		return worker;
	};

	/**
	 * Creates a child AABB
	 *
	 * @private
	 * @param {*} aabb -
	 * @param {*} index -
	 */
	static createChildAABB(aabb, index){
		let min = aabb.min.clone();
		let max = aabb.max.clone();
		let size = max.subtract(min);

		if ((index & 0b0001) > 0) {
			min.z += size.z / 2;
		} else {
			max.z -= size.z / 2;
		}

		if ((index & 0b0010) > 0) {
			min.y += size.y / 2;
		} else {
			max.y -= size.y / 2;
		}

		if ((index & 0b0100) > 0) {
			min.x += size.x / 2;
		} else {
			max.x -= size.x / 2;
		}

		return new Box3(min, max);
	}
}
