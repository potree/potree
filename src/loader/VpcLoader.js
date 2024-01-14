import {VpcBaseGeometry} from '../PointCloudVpcGeometry';
import {PointCloudCopcGeometryNode} from "../PointCloudCopcGeometry"

export class VpcLoader {
	static async load(file, callback) {
		const response = await fetch(file)

		if(!response.ok) {
			console.error(`Failed to load file form ${file}`);
			callback(null);
			return;
		}

		const vpc = await response.json();
		const vpcGeometries = []

		// start group logging
		console.group("VpcLoader.load")

		// debugger
		for (const feature of vpc.features){
			const baseGeometry = new VpcBaseGeometry(vpc,feature);

			// load propper copc getter for this file
			if (await baseGeometry.loadGetter()===false){
				throw Error("Failed to load getter in baseGeometry")
			}
			// assign root tree node to base geometry class
			baseGeometry.root = new PointCloudCopcGeometryNode(baseGeometry);
			await baseGeometry.root.load();

			console.log("baseGeometry...", baseGeometry)
			// add this geometry
			vpcGeometries.push(baseGeometry)
		}

		console.log("vpcGemometries...", vpcGeometries)
		console.groupEnd()

		// return vpc geometry
		callback(vpcGeometries);
	}
}
