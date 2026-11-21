import {CopcLoader} from './EptLoader';

export class VpcNode {
	constructor(id, url, geometry) {
		this.id = id;
		this.url = url;
		this.geometry = geometry;
	}
}

export class VpcLoader {
	static async load(file, callback) {
		const response = await fetch(file)
		if(!response.ok) {
			console.error(`Failed to load file from ${file}`);
			callback(null);
			return;
		}

		const json = await response.json();

		const nodes = extractNodes(json);
		for (const node of nodes) {
			const urlLowerCase = node.url.toLowerCase();
			const callbackGeom = g => node.geometry = g;

			// TODO: we need to support more file formats, such as las and laz.
			// It seems like the supplied loader for las/laz does not work.
			if (urlLowerCase.endsWith('.copc.laz')) {
				await CopcLoader.load(node.url, callbackGeom);
			// } else if (urlLowerCase.endsWith('.las')) {
			//     await LasLazLoader.load(node.url, callbackGeom);
			// } else if (urlLowerCase.endsWith('.laz')) {
			//     await LasLazLoader.load(node.url, callbackGeom);
			} else {
				console.warn(`Format not supported: ${node.url}`);
			}
		}

		callback(nodes);
	}
}

function extractNodes(json) {
	const result = [];

	for (const feature of json.features) {
		const id = feature.id;
		const url = feature.assets.data.href;
		result.push(new VpcNode(id, url, null));
	}

	return result;
}
