
import {PointAttribute, PointAttributes, PointAttributeTypes} from "../../loader/PointAttributes.js";
import {OctreeGeometry, OctreeGeometryNode} from "./OctreeGeometry.js";

export class NodeLoader{

	constructor(url){
		this.url = url;
	}

	async load(node){

		if(node.loaded){
			return;
		}

		let byteOffset = node.byteOffset;
		let byteSize = node.byteSize;

		let response = await fetch(this.url, {
			headers: {
				'content-type': 'multipart/byteranges',
				'Range': `bytes=${byteOffset}-${byteOffset + byteSize}`,
			},
		});


		let scale = node.octreeGeometry.scale;
		let buffer = await response.arrayBuffer();
		let view = new DataView(buffer);

		let numPoints = node.numPoints;
		let position = new Float32Array(3 * numPoints);
		let rgba = new Uint8Array(4 * numPoints);

		for(let i = 0; i < numPoints; i++){

			let byteOffset = i * 16;

			let ix = view.getInt32(byteOffset + 0, true);
			let iy = view.getInt32(byteOffset + 4, true);
			let iz = view.getInt32(byteOffset + 8, true);

			let x = ix * scale - node.boundingBox.min.x;
			let y = iy * scale - node.boundingBox.min.y;
			let z = iz * scale - node.boundingBox.min.z;

			let r = view.getUint8(byteOffset + 12);
			let g = view.getUint8(byteOffset + 13);
			let b = view.getUint8(byteOffset + 14);

			position[3 * i + 0] = x;
			position[3 * i + 1] = y;
			position[3 * i + 2] = z;

			rgba[4 * i + 0] = r;
			rgba[4 * i + 1] = g;
			rgba[4 * i + 2] = b;
		}

		let geometry = new THREE.BufferGeometry();
		geometry.addAttribute('position', new THREE.BufferAttribute(position, 3));
		geometry.addAttribute('color', new THREE.BufferAttribute(rgba, 4, true));
		// indices ??

		node.geometry = geometry;
		node.loaded = true;
		node.loading = false;
		Potree.numNodesLoading--;

	}

}

function createChildAABB(aabb, index){
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

export class OctreeLoader_1_8{

	static parseAttributes(aJson){

		let attributes = new PointAttributes();

		attributes.add(PointAttribute.POSITION_CARTESIAN);
		attributes.add(new PointAttribute("RGBA", PointAttributeTypes.DATA_TYPE_UINT8, 4));

		return attributes;
	}

	static async load(url){

		let cloudJsPath = url;
		let hierarchyPath = `${url}/../hierarchy.json`;
		let dataPath = `${url}/../pointcloud.data`;

		let cloudJsResponse = fetch(cloudJsPath);
		let hierarchyResponse = fetch(hierarchyPath);

		let json = await (await cloudJsResponse).json();
		let hierarchy = await (await hierarchyResponse).json();

		let octree = new OctreeGeometry();
		octree.url = url;
		octree.spacing = json.spacing;
		octree.scale = json.scale;

		let min = new THREE.Vector3(...json.boundingBox.min);
		let max = new THREE.Vector3(...json.boundingBox.max);
		let boundingBox = new THREE.Box3(min, max);

		let offset = min.clone();
		boundingBox.min.sub(offset);
		boundingBox.max.sub(offset);

		octree.projection = json.projection;
		octree.boundingBox = boundingBox;
		octree.tightBoundingBox = boundingBox.clone();
		octree.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		octree.tightBoundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		octree.offset = offset;
		octree.pointAttributes = OctreeLoader_1_8.parseAttributes(json.attributes);
		octree.loader = new NodeLoader(dataPath);

		let root = new OctreeGeometryNode("r", octree, boundingBox);
		root.level = 0;
		root.hasChildren = false;
		root.spacing = octree.spacing;
		root.byteOffset = 0;
		// root.byteSize = 1000 * 16;
		// root.numPoints = 1000;

		octree.root = root;


		let traverse = (node, nodeJson) => {
			node.numPoints = nodeJson.numPoints;

			node.spacing = node.spacing / 2;
			node.byteOffset = nodeJson.byteOffset;
			node.byteSize = nodeJson.byteSize;
			node.numPoints = nodeJson.numPoints;

			for(let childJson of nodeJson.children){
				
				let index = childJson.name.charAt(childJson.name.length - 1);

				let childAABB = createChildAABB(node.boundingBox, index);
				let child = new OctreeGeometryNode(childJson.name, octree, childAABB);
				node.hasChildren = true;
				
				node.children[index] = child;

				traverse(child, childJson);
			}
		};

		traverse(root, hierarchy.hierarchy);


		let result = {
			geometry: octree,
		};

		return result;

	}

};