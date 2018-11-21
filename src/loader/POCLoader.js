

import {PointCloudOctreeGeometry, PointCloudOctreeGeometryNode} from "../PointCloudOctreeGeometry.js";
import {Version} from "../Version.js";
import {XHRFactory} from "../XHRFactory.js";
import {LasLazLoader} from "./LasLazLoader.js";
import {BinaryLoader} from "./BinaryLoader.js";
import {Utils} from "../utils.js";
import {PointAttribute, PointAttributes} from "./PointAttributes.js";

export class POCLoader {

	static load(url, callback){
		try {
			let pco = new PointCloudOctreeGeometry();
			pco.url = url;
			let xhr = XHRFactory.createXMLHttpRequest();
			xhr.open('GET', url, true);

			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4 && (xhr.status === 200 || xhr.status === 0)) {
					let fMno = JSON.parse(xhr.responseText);

					let version = new Version(fMno.version);

					// assume octreeDir is absolute if it starts with http
					if (fMno.octreeDir.indexOf('http') === 0) {
						pco.octreeDir = fMno.octreeDir;
					} else {
						pco.octreeDir = url + '/../' + fMno.octreeDir;
					}

					pco.spacing = fMno.spacing;
					pco.hierarchyStepSize = fMno.hierarchyStepSize;

					pco.pointAttributes = fMno.pointAttributes;

					let min = new THREE.Vector3(fMno.boundingBox.lx, fMno.boundingBox.ly, fMno.boundingBox.lz);
					let max = new THREE.Vector3(fMno.boundingBox.ux, fMno.boundingBox.uy, fMno.boundingBox.uz);
					let boundingBox = new THREE.Box3(min, max);
					let tightBoundingBox = boundingBox.clone();

					if (fMno.tightBoundingBox) {
						tightBoundingBox.min.copy(new THREE.Vector3(fMno.tightBoundingBox.lx, fMno.tightBoundingBox.ly, fMno.tightBoundingBox.lz));
						tightBoundingBox.max.copy(new THREE.Vector3(fMno.tightBoundingBox.ux, fMno.tightBoundingBox.uy, fMno.tightBoundingBox.uz));
					}

					let offset = min.clone();

					boundingBox.min.sub(offset);
					boundingBox.max.sub(offset);

					tightBoundingBox.min.sub(offset);
					tightBoundingBox.max.sub(offset);

					pco.projection = fMno.projection;
					pco.boundingBox = boundingBox;
					pco.tightBoundingBox = tightBoundingBox;
					pco.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
					pco.tightBoundingSphere = tightBoundingBox.getBoundingSphere(new THREE.Sphere());
					pco.offset = offset;
					if (fMno.pointAttributes === 'LAS') {
						pco.loader = new LasLazLoader(fMno.version);
					} else if (fMno.pointAttributes === 'LAZ') {
						pco.loader = new LasLazLoader(fMno.version);
					} else {
						pco.loader = new BinaryLoader(fMno.version, boundingBox, fMno.scale);
						pco.pointAttributes = new PointAttributes(pco.pointAttributes);
					}

					let nodes = {};

					{ // load root
						let name = 'r';

						let root = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
						root.level = 0;
						root.hasChildren = true;
						root.spacing = pco.spacing;
						if (version.upTo('1.5')) {
							root.numPoints = fMno.hierarchy[0][1];
						} else {
							root.numPoints = 0;
						}
						pco.root = root;
						pco.root.load();
						nodes[name] = root;
					}

					// load remaining hierarchy
					if (version.upTo('1.4')) {
						for (let i = 1; i < fMno.hierarchy.length; i++) {
							let name = fMno.hierarchy[i][0];
							let numPoints = fMno.hierarchy[i][1];
							let index = parseInt(name.charAt(name.length - 1));
							let parentName = name.substring(0, name.length - 1);
							let parentNode = nodes[parentName];
							let level = name.length - 1;
							//let boundingBox = POCLoader.createChildAABB(parentNode.boundingBox, index);
							let boundingBox = Utils.createChildAABB(parentNode.boundingBox, index);

							let node = new PointCloudOctreeGeometryNode(name, pco, boundingBox);
							node.level = level;
							node.numPoints = numPoints;
							node.spacing = pco.spacing / Math.pow(2, level);
							parentNode.addChild(node);
							nodes[name] = node;
						}
					}

					pco.nodes = nodes;

					callback(pco);
				}
			};

			xhr.send(null);
		} catch (e) {
			console.log("loading failed: '" + url + "'");
			console.log(e);

			callback();
		}
	}

	loadPointAttributes(mno){
		let fpa = mno.pointAttributes;
		let pa = new PointAttributes();

		for (let i = 0; i < fpa.length; i++) {
			let pointAttribute = PointAttribute[fpa[i]];
			pa.add(pointAttribute);
		}

		return pa;
	}

	createChildAABB(aabb, index){
		let min = aabb.min.clone();
		let max = aabb.max.clone();
		let size = new THREE.Vector3().subVectors(max, min);

		if ((index & 0b0001) > 0) {
			min.z += size.z / 2;
		} else {
			max.z -= size.z / 2;
		}

		if ((index & 0b0010) > 0) {
			min.y += size.y / 2;
		} else {
			max.y -= size.y / 2;
		}

		if ((index & 0b0100) > 0) {
			min.x += size.x / 2;
		} else {
			max.x -= size.x / 2;
		}

		return new THREE.Box3(min, max);
	}
}

