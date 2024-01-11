import { CopcLoader } from './EptLoader';
import { POCLoader } from './POCLoader';
import { VpcNode } from '../PointCloudEptGeometry';

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

		const loadingPromises = [];
		for (const g of geometries) {
			if (g.root.isLoaded()) {
				continue;
			}
			let resolve;
			const promise = new Promise(res => resolve = res);
			g.root._loaded = g.root.loaded;
			Object.defineProperty(g.root, "loaded", {
				set(b) {
					this._loaded = b;
					if (b === true) {
						resolve();
					}
				},
				get() {
					return this._loaded;
				}
			});
			loadingPromises.push(promise);
		}

		await Promise.allSettled(loadingPromises);


		for (const g of geometries) {
			geometry.add(g);
		}
		console.log(geometry.pointAttributes.attributes);
		geometry.root = new VpcNode(geometry);
		geometry.root.load();

		callback(geometry);

	// 	// depends on type?
	// 	// let root = new Potree.PointCloudCopcGeometryNode(geometry);

	// 	// geometry.root = root;
	// 	// geometry.root.load();

	// 	callback(geometry);
	}
}
