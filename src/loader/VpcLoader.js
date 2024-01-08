import { CopcLoader } from './EptLoader';
import { POCLoader } from './POCLoader';

export class VpcLoader {
	static async load(file, callback) {
		const response = await fetch(file)
		if(!response.ok) {
			console.error(`Failed to load file form ${file}`);
			callback(null);
			return;
		}

		const json = await response.json();

		const geometry = new Potree.PointCloudVpcGeometry(json);
		const geometries = [];
		const callbackGeom = g => geometries.push(g);
		for (const url of geometry.linksToCopcFiles) {
			if (url.endsWith('copc.laz')) {
				await CopcLoader.load(url, callbackGeom)
				// if (url.includes('lion')) {
				// 	setTimeout(() => CopcLoader.load(url, callback), 100);
				// } else {
				// 	setTimeout(() => CopcLoader.load(url, callback), 5000);
				// }
			} else if (url.endsWith('cloud.js')) {
				POCLoader.load(url, callbackGeom);
			}
		}

		callback(geometries);

	// 	// depends on type?
	// 	// let root = new Potree.PointCloudCopcGeometryNode(geometry);

	// 	// geometry.root = root;
	// 	// geometry.root.load();

	// 	callback(geometry);
	}
}
