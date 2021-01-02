
import * as THREE from "../../libs/three.js/build/three.module.js";
import {Line2} from "../../libs/three.js/lines/Line2.js";
import {LineGeometry} from "../../libs/three.js/lines/LineGeometry.js";
import {LineMaterial} from "../../libs/three.js/lines/LineMaterial.js";
import {Utils} from "../utils.js";

const defaultColors = {
	"landuse":   [0.5, 0.5, 0.5],
	"natural":   [0.0, 1.0, 0.0],
	"places":    [1.0, 0.0, 1.0],
	"points":    [0.0, 1.0, 1.0],
	"roads":     [1.0, 1.0, 0.0],
	"waterways": [0.0, 0.0, 1.0],
	"default":   [0.9, 0.6, 0.1],
};

function getColor(feature){
	let color = defaultColors[feature];

	if(!color){
		color = defaultColors["default"];
	}

	return color;
}

export class Geopackage{
	constructor(){
		this.path = null;
		this.node = null;
	}
};

export class GeoPackageLoader{

	constructor(){

	}

	static async loadUrl(url, params){

		await Promise.all([
			Utils.loadScript(`${Potree.scriptPath}/lazylibs/geopackage/geopackage.js`),
			Utils.loadScript(`${Potree.scriptPath}/lazylibs/sql.js/sql-wasm.js`),
		]);
		
		const result = await fetch(url);
		const buffer = await result.arrayBuffer();

		params = params || {};

		params.source = url;

		return GeoPackageLoader.loadBuffer(buffer, params);
	}

	static async loadBuffer(buffer, params){

		await Promise.all([
			Utils.loadScript(`${Potree.scriptPath}/lazylibs/geopackage/geopackage.js`),
			Utils.loadScript(`${Potree.scriptPath}/lazylibs/sql.js/sql-wasm.js`),
		]);

		params = params || {};

		const resolver = async (resolve) => {
			
			let transform = params.transform;
			if(!transform){
				transform = {forward: (arg) => arg};
			}

			const wasmPath = `${Potree.scriptPath}/lazylibs/sql.js/sql-wasm.wasm`;
			const SQL = await initSqlJs({ locateFile: filename => wasmPath});

			const u8 = new Uint8Array(buffer);

			const data = await geopackage.open(u8);
			window.data = data;

			const geopackageNode = new THREE.Object3D();
			geopackageNode.name = params.source;
			geopackageNode.potree = {
				source: params.source,
			};

			const geo = new Geopackage();
			geo.path = params.source;
			geo.node = geopackageNode;

			const tables = data.getTables();

			for(const table of tables.features){
				const dao = data.getFeatureDao(table);

				let boundingBox = dao.getBoundingBox();
				boundingBox = boundingBox.projectBoundingBox(dao.projection, 'EPSG:4326');
				const geoJson = data.queryForGeoJSONFeaturesInTable(table, boundingBox);

				const matLine = new LineMaterial( {
					color: new THREE.Color().setRGB(...getColor(table)),
					linewidth: 2, 
					resolution:  new THREE.Vector2(1000, 1000),
					dashed: false
				} );

				const node = new THREE.Object3D();
				node.name = table;
				geo.node.add(node);

				for(const [index, feature] of Object.entries(geoJson)){
					//const featureNode = GeoPackageLoader.featureToSceneNode(feature, matLine, transform);
					const featureNode = GeoPackageLoader.featureToSceneNode(feature, matLine, dao.projection, transform);
					node.add(featureNode);
				}
			}

			resolve(geo);
		}

		return new Promise(resolver);
	}

	static featureToSceneNode(feature, matLine, geopackageProjection, transform){
		let geometry = feature.geometry;
		
		let color = new THREE.Color(1, 1, 1);
		
		if(feature.geometry.type === "Point"){
			let sg = new THREE.SphereGeometry(1, 18, 18);
			let sm = new THREE.MeshNormalMaterial();
			let s = new THREE.Mesh(sg, sm);
			
			let [long, lat] = geometry.coordinates;
			let pos = transform.forward(geopackageProjection.forward([long, lat]));
			
			s.position.set(...pos, 20);
			
			s.scale.set(10, 10, 10);
			
			return s;
		}else if(geometry.type === "LineString"){
			let coordinates = [];
			
			let min = new THREE.Vector3(Infinity, Infinity, Infinity);
			for(let i = 0; i < geometry.coordinates.length; i++){
				let [long, lat] = geometry.coordinates[i];
				let pos = transform.forward(geopackageProjection.forward([long, lat]));
				
				min.x = Math.min(min.x, pos[0]);
				min.y = Math.min(min.y, pos[1]);
				min.z = Math.min(min.z, 20);
				
				coordinates.push(...pos, 20);
				if(i > 0 && i < geometry.coordinates.length - 1){
					coordinates.push(...pos, 20);
				}
			}
			
			for(let i = 0; i < coordinates.length; i += 3){
				coordinates[i+0] -= min.x;
				coordinates[i+1] -= min.y;
				coordinates[i+2] -= min.z;
			}
			
			const lineGeometry = new LineGeometry();
			lineGeometry.setPositions( coordinates );

			const line = new Line2( lineGeometry, matLine );
			line.computeLineDistances();
			line.scale.set( 1, 1, 1 );
			line.position.copy(min);
			
			return line;
		}else if(geometry.type === "Polygon"){
			for(let pc of geometry.coordinates){
				let coordinates = [];
				
				let min = new THREE.Vector3(Infinity, Infinity, Infinity);
				for(let i = 0; i < pc.length; i++){
					let [long, lat] = pc[i];
					
					let pos = transform.forward(geopackageProjection.forward([long, lat]));
					
					min.x = Math.min(min.x, pos[0]);
					min.y = Math.min(min.y, pos[1]);
					min.z = Math.min(min.z, 20);
					
					coordinates.push(...pos, 20);
					if(i > 0 && i < pc.length - 1){
						coordinates.push(...pos, 20);
					}
				}
				
				for(let i = 0; i < coordinates.length; i += 3){
					coordinates[i+0] -= min.x;
					coordinates[i+1] -= min.y;
					coordinates[i+2] -= min.z;
				}

				const lineGeometry = new LineGeometry();
				lineGeometry.setPositions( coordinates );

				const line = new Line2( lineGeometry, matLine );
				line.computeLineDistances();
				line.scale.set( 1, 1, 1 );
				line.position.copy(min);
				
				return line;
			}
		}else{
			console.log("unhandled feature: ", feature);
		}
	}

};