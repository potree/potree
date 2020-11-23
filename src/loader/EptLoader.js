/**
 * @author Connor Manning
 */

export class EptLoader {
	static async load(file, callback) {

		let response = await fetch(file);
		let json = await response.json();

		let url = file.substr(0, file.lastIndexOf('ept.json'));
		let queryString = file.split('?')[1];
		queryString = (queryString ? '?' + queryString : queryString);

		let geometry = new Potree.PointCloudEptGeometry(url, json, queryString);
		let root = new Potree.PointCloudEptGeometryNode(geometry);

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
};

