/**
 * @author Connor Manning
 */

export class EptLoader {
        static async load(file, signUrl, callback) {

                let response = await fetch(await signUrl(file));
		let json = await response.json();

		let url = file.substr(0, file.lastIndexOf('ept.json'));
                let geometry = new Potree.PointCloudEptGeometry(url, signUrl, json);
		let root = new Potree.PointCloudEptGeometryNode(geometry);

		geometry.root = root;
		geometry.root.load();

		callback(geometry);
	}
};

