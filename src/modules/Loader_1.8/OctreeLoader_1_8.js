
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

		try{
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
						geometry.addAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
					}else if (property === "INDICES") {
						let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
						bufferAttribute.normalized = true;
						geometry.addAttribute('indices', bufferAttribute);
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

			let min = node.octreeGeometry.offset.clone().add(node.boundingBox.min);

			let message = {
				buffer: buffer,
				pointAttributes: pointAttributes,
				scale: scale,
				min: min,
				//min: node.boundingBox.min,
			};

			worker.postMessage(message, [message.buffer]);
		}catch(e){
			node.loaded = false;
			node.loading = false;

			console.log(`failed to load ${node.name}`);
			console.log(`trying again!`);
		}
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

	static async loadHierarchy(url, root){

		let hierarchyPath = `${url}/../hierarchy.bin`;
		let response = await fetch(hierarchyPath);
		let buffer = await response.arrayBuffer();
		let view = new DataView(buffer);

		let bytesPerNode = 21;
		let numNodes = buffer.byteLength / bytesPerNode;

		let octree = root.octreeGeometry;
		let nodes = [root];

		for(let i = 0; i < numNodes; i++){

			let node = nodes[i];

			let childMask = view.getUint8(i * bytesPerNode);
			let numPoints = view.getUint32(i * bytesPerNode + 1, true);
			let byteOffset = view.getBigInt64(i * bytesPerNode + 5, true);
			let byteSize = view.getBigInt64(i * bytesPerNode + 13, true);

			node.byteOffset = byteOffset;
			node.byteSize = byteSize;
			node.numPoints = numPoints;

			for(let childIndex = 0; childIndex < 8; childIndex++){
				let childExists = ((1 << childIndex) & childMask) !== 0;

				if(!childExists){
					continue;
				}

				let childName = node.name + childIndex;

				let childAABB = createChildAABB(node.boundingBox, childIndex);
				let child = new OctreeGeometryNode(childName, octree, childAABB);
				child.spacing = node.spacing / 2;
				child.level = node.level + 1;
				node.hasChildren = true;

				node.children[childIndex] = child;
				child.parent = node;

				if(nodes.length > numNodes){
					debugger;
				}

				nodes.push(child);
			}

			
		}

		console.log("lala");
	}

	static async load(url){

		let cloudJsPath = url;
		// let hierarchyPath = `${url}/../hierarchy.json`;
		let dataPath = `${url}/../octree.bin`;

		let cloudJsResponse = fetch(cloudJsPath);
		// let hierarchyResponse = fetch(hierarchyPath);

		let json = await (await cloudJsResponse).json();
		// let hierarchy = await (await hierarchyResponse).json();

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

		await OctreeLoader_1_8.loadHierarchy(url, root);

		// let traverse = (node, nodeJson) => {
		// 	node.numPoints = nodeJson.numPoints;

		// 	// node.spacing = node.spacing / 2;
		// 	node.byteOffset = nodeJson.byteOffset;
		// 	node.byteSize = nodeJson.byteSize;
		// 	node.numPoints = nodeJson.numPoints;

		// 	for(let childJson of nodeJson.children){
				
		// 		let index = childJson.name.charAt(childJson.name.length - 1);

		// 		let childAABB = createChildAABB(node.boundingBox, index);
		// 		let child = new OctreeGeometryNode(childJson.name, octree, childAABB);
		// 		child.spacing = node.spacing / 2;
		// 		child.level = node.level + 1;
		// 		node.hasChildren = true;

				
		// 		node.children[index] = child;
		// 		child.parent = node;

		// 		traverse(child, childJson);
		// 	}
		// };

		// traverse(root, hierarchy.hierarchy);


		let result = {
			geometry: octree,
		};

		return result;

	}

};