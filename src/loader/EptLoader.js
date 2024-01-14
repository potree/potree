/**
 * @author Connor Manning
 */

import {PointCloudCopcGeometryNode} from "../PointCloudCopcGeometry"

export class EptLoader {
	static async load(file, callback) {

		let response = await fetch(file);
		let json = await response.json();

		let url = file.substr(0, file.lastIndexOf('/ept.json'));
		let geometry = new Potree.PointCloudEptGeometry(url, json);
		let root = new PointCloudCopcGeometryNode(geometry);

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
};

// export class CopcLoader {
// 	static async load(file, callback) {
// 		const { Copc, Getter } = window.Copc

// 		const url = file;
// 		const getter = Getter.http(url);
// 		const copc = await Copc.create(getter);

// 		let baseGeometry = new Potree.PointCloudCopcGeometry(getter, copc);
// 		// let root = new Potree.PointCloudCopcGeometryNode(baseGeometry);
// 		baseGeometry.root = new Potree.PointCloudCopcGeometryNode(baseGeometry);
// 		// baseGeometry.root = root;
// 		baseGeometry.root.load();

// 		callback(baseGeometry);
// 	}
// }
