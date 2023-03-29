/**
 * @author Connor Manning
 */

export class EptLoader {
	static async load(file, callback) {
		const fetchOptions = { headers: {} };
		Potree.XHRFactory.config.customHeaders?.forEach(function (header) {
			fetchOptions.headers[header.header] = header.value;
		});

		let response = await fetch(file, fetchOptions);
		let json = await response.json();

		let url = file.substr(0, file.lastIndexOf('ept.json'));
		let geometry = new Potree.PointCloudEptGeometry(url, json);
		let root = new Potree.PointCloudEptGeometryNode(geometry);

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
};

