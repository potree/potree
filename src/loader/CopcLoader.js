/**
 * @author Connor Manning
 */

import {PointCloudCopcGeometry,PointCloudCopcGeometryNode} from "../PointCloudCopcGeometry"

export class CopcLoader {
	static async load(file, callback) {
		const { Copc, Getter } = window.Copc

		const url = file;
		const getter = Getter.http(url);
		const copc = await Copc.create(getter);

		let baseGeometry = new PointCloudCopcGeometry(getter, copc);
		// let root = new Potree.PointCloudCopcGeometryNode(baseGeometry);
		baseGeometry.root = new PointCloudCopcGeometryNode(baseGeometry);
		// baseGeometry.root = root;
		baseGeometry.root.load();

		callback(baseGeometry);
	}
}
