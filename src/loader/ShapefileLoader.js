
import * as THREE from "../../libs/three.js/build/three.module.js";
import {Line2} from "../../libs/three.js/lines/Line2.js";
import {LineGeometry} from "../../libs/three.js/lines/LineGeometry.js";
import {LineMaterial} from "../../libs/three.js/lines/LineMaterial.js";

export class ShapefileLoader{

	constructor(){
		this.transform = null;
	}

	async load(path){

		const matLine = new LineMaterial( {
			color: 0xff0000,
			linewidth: 3, // in pixels
			resolution:  new THREE.Vector2(1000, 1000),
			dashed: false
		} );

		const features = await this.loadShapefileFeatures(path);
		const node = new THREE.Object3D();
		
		for(const feature of features){
			const fnode = this.featureToSceneNode(feature, matLine);
			node.add(fnode);
		}

		let setResolution = (x, y) => {
			matLine.resolution.set(x, y);
		};

		const result = {
			features: features,
			node: node,
			setResolution: setResolution,
		};

		return result;
	}

	featureToSceneNode(feature, matLine){
		let geometry = feature.geometry;
		
		let color = new THREE.Color(1, 1, 1);

		let transform = this.transform;
		if(transform === null){
			transform = {forward: (v) => v};
		}
		
		if(feature.geometry.type === "Point"){
			let sg = new THREE.SphereGeometry(1, 18, 18);
			let sm = new THREE.MeshNormalMaterial();
			let s = new THREE.Mesh(sg, sm);

			let [long, lat, height = 20] = geometry.coordinates;
			let pos = transform.forward([long, lat]);
			
			s.position.set(...pos, height);
			s.scale.set(10, 10, 10);

			return s;
		} else if (geometry.type === "MultiPoint") {
			let group = new THREE.Group();
			for (let coord of geometry.coordinates) {
				let sg = new THREE.SphereGeometry(1, 18, 18);
				let sm = new THREE.MeshNormalMaterial();
				let s = new THREE.Mesh(sg, sm);

				let [long, lat, height = 20] = coord;
				let pos = transform.forward([long, lat]);

				s.position.set(...pos, height);
				s.scale.set(10, 10, 10);
				console.log(pos);

				group.add(s);
			}
			return group;
		} else if (geometry.type === "LineString" || geometry.type === "LineStringZ") {
			let coordinates = [];
			let min = new THREE.Vector3(Infinity, Infinity, Infinity);
			for (let i = 0; i < geometry.coordinates.length; i++) {
				let [long, lat, height = 20] = geometry.coordinates[i];
				let pos = transform.forward([long, lat]);

				min.x = Math.min(min.x, pos[0]);
				min.y = Math.min(min.y, pos[1]);
				min.z = Math.min(min.z, height);

				coordinates.push(...pos, height);
				if (i > 0 && i < geometry.coordinates.length - 1) {
					coordinates.push(...pos, height);
				}
			}

			for (let i = 0; i < coordinates.length; i += 3) {
				coordinates[i + 0] -= min.x;
				coordinates[i + 1] -= min.y;
				coordinates[i + 2] -= min.z;
			}

			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions(coordinates);

			const line = new Line2(lineGeometry, matLine);
			line.computeLineDistances();
			line.scale.set(1, 1, 1);
			line.position.copy(min);

			return line;
		} else if (geometry.type === "Polygon" || geometry.type === "PolygonZ") {
			let group = new THREE.Group();
			for (let pc of geometry.coordinates) {
				let coordinates = [];
				let min = new THREE.Vector3(Infinity, Infinity, Infinity);
				for (let i = 0; i < pc.length; i++) {
					let [long, lat, height = 20] = pc[i];
					let pos = transform.forward([long, lat]);

					min.x = Math.min(min.x, pos[0]);
					min.y = Math.min(min.y, pos[1]);
					min.z = Math.min(min.z, height);

					coordinates.push(...pos, height);
					if (i > 0 && i < pc.length - 1) {
						coordinates.push(...pos, height);
					}
				}

				for (let i = 0; i < coordinates.length; i += 3) {
					coordinates[i + 0] -= min.x;
					coordinates[i + 1] -= min.y;
					coordinates[i + 2] -= min.z;
				}

				const lineGeometry = new LineGeometry();
				lineGeometry.setPositions(coordinates);

				const line = new Line2(lineGeometry, matLine);
				line.computeLineDistances();
				line.scale.set(1, 1, 1);
				line.position.copy(min);

				group.add(line);
			}
			return group;
		} else if (geometry.type === "MultiLineString") {
			let group = new THREE.Group();
			for (let lineString of geometry.coordinates) {
				let coordinates = [];
				let min = new THREE.Vector3(Infinity, Infinity, Infinity);
				for (let i = 0; i < lineString.length; i++) {
					let [long, lat, height = 20] = lineString[i];
					let pos = transform.forward([long, lat]);

					min.x = Math.min(min.x, pos[0]);
					min.y = Math.min(min.y, pos[1]);
					min.z = Math.min(min.z, height);

					coordinates.push(...pos, height);
					if (i > 0 && i < lineString.length - 1) {
						coordinates.push(...pos, height);
					}
				}

				for (let i = 0; i < coordinates.length; i += 3) {
					coordinates[i + 0] -= min.x;
					coordinates[i + 1] -= min.y;
					coordinates[i + 2] -= min.z;
				}

				const lineGeometry = new LineGeometry();
				lineGeometry.setPositions(coordinates);

				const line = new Line2(lineGeometry, matLine);
				line.computeLineDistances();
				line.scale.set(1, 1, 1);
				line.position.copy(min);

				group.add(line);
			}
			return group;
		} else if (geometry.type === "MultiPolygon") {
			let group = new THREE.Group();
			for (let polygon of geometry.coordinates) {
				for (let pc of polygon) {
					let coordinates = [];
					let min = new THREE.Vector3(Infinity, Infinity, Infinity);
					for (let i = 0; i < pc.length; i++) {
						let [long, lat, height = 20] = pc[i];
						let pos = transform.forward([long, lat]);

						min.x = Math.min(min.x, pos[0]);
						min.y = Math.min(min.y, pos[1]);
						min.z = Math.min(min.z, height);

						coordinates.push(...pos, height);
						if (i > 0 && i < pc.length - 1) {
							coordinates.push(...pos, height);
						}
					}

					for (let i = 0; i < coordinates.length; i += 3) {
						coordinates[i + 0] -= min.x;
						coordinates[i + 1] -= min.y;
						coordinates[i + 2] -= min.z;
					}

					const lineGeometry = new LineGeometry();
					lineGeometry.setPositions(coordinates);

					const line = new Line2(lineGeometry, matLine);
					line.computeLineDistances();
					line.scale.set(1, 1, 1);
					line.position.copy(min);

					group.add(line);
				}
			}
			return group;
		} else if (geometry.type === "MultiPatch") {
			console.log("MultiPatch geometry type is not yet implemented.");
		} else {
			console.log("Unhandled feature: ", feature);
		}
	}

	async loadShapefileFeatures(file) {
		let features = [];

		let source = await shapefile.open(file);

		while (true) {
			let result = await source.read();

			if (result.done) {
				break;
			}

			if (
				result.value &&
				result.value.type === "Feature" &&
				result.value.geometry !== undefined
			) {
				result.value
				features.push(result.value);
			}
		}

		return features;
	}
}
