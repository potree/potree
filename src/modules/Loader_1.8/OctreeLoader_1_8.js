
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

		let workerPath = Potree.scriptPath + '/workers/OctreeDecoderWorker.js';
		let worker = Potree.workerPool.getWorker(workerPath);

		worker.onmessage = function (e) {

			let data = e.data;
			let buffers = data.attributeBuffers;

			Potree.workerPool.returnWorker(workerPath, worker);


			let geometry = new THREE.BufferGeometry();
			
			for(let property in buffers){

				let buffer = buffers[property].buffer;

				if(property === "POSITION_CARTESIAN"){
					geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
				}else if(property === "RGBA"){
					geometry.addAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
				}

			}
			// indices ??

			node.geometry = geometry;
			node.loaded = true;
			node.loading = false;
			Potree.numNodesLoading--;
		};

		let buffer = await response.arrayBuffer();

		let pointAttributes = node.octreeGeometry.pointAttributes;
		let scale = node.octreeGeometry.scale;

		let message = {
			buffer: buffer,
			pointAttributes: pointAttributes,
			scale: scale,
			min: node.boundingBox.min,
		};

		worker.postMessage(message, [message.buffer]);

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
		let dataPath = `${url}/../octree.data`;

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

			// node.spacing = node.spacing / 2;
			node.byteOffset = nodeJson.byteOffset;
			node.byteSize = nodeJson.byteSize;
			node.numPoints = nodeJson.numPoints;

			for(let childJson of nodeJson.children){
				
				let index = childJson.name.charAt(childJson.name.length - 1);

				let childAABB = createChildAABB(node.boundingBox, index);
				let child = new OctreeGeometryNode(childJson.name, octree, childAABB);
				child.spacing = node.spacing / 2;
				node.hasChildren = true;
				
				node.children[index] = child;
				child.parent = node;

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