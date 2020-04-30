
import {PointAttribute, PointAttributes, PointAttributeTypes} from "../../loader/PointAttributes.js";
import {OctreeGeometry, OctreeGeometryNode} from "./LasOctreeGeometry.js";

export class NodeLoader{

	constructor(url, offsetToPointRecords){
		this.url = url;
		this.offsetToPointRecords = offsetToPointRecords;
	}

	async load(node){

		if(node.loaded){
			return;
		}

		let byteOffset = node.byteOffset + this.offsetToPointRecords;
		let byteSize = node.byteSize;

		try{
			let response = await fetch(this.url, {
				headers: {
					'content-type': 'multipart/byteranges',
					'Range': `bytes=${byteOffset}-${byteOffset + byteSize - 1n}`,
				},
			});

			let workerPath = Potree.scriptPath + '/workers/LasOctreeDecoderWorker.js';
			let worker = Potree.workerPool.getWorker(workerPath);

			worker.onmessage = function (e) {

				let data = e.data;
				let buffers = data.attributeBuffers;

				Potree.workerPool.returnWorker(workerPath, worker);


				let geometry = new THREE.BufferGeometry();
				
				for(let property in buffers){

					let buffer = buffers[property].buffer;

					if(property === "position"){
						geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					}else if(property === "rgba"){
						geometry.addAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
					}else if(property === "rgb"){
						geometry.addAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
					}else if (property === "INDICES") {
						let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
						bufferAttribute.normalized = true;
						geometry.addAttribute('indices', bufferAttribute);
					} 

				}
				// indices ??

				node.density = data.density;
				node.geometry = geometry;
				node.loaded = true;
				node.loading = false;
				Potree.numNodesLoading--;
			};

			let buffer = await response.arrayBuffer();

			let pointAttributes = node.octreeGeometry.pointAttributes;
			let scale = node.octreeGeometry.dbgScale;
			let offset = node.octreeGeometry.dbgOffset;

			let min = node.octreeGeometry.offset.clone().add(node.boundingBox.min);
			let max = node.octreeGeometry.offset.clone().add(node.boundingBox.max);

			let message = {
				name: node.name,
				buffer: buffer,
				pointAttributes: pointAttributes,
				scale: scale,
				offset: offset,
				min: min,
				max: max,
				nodeMin: node.boundingBox.min,
				nodeMax: node.boundingBox.max,
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

export class LasOctreeLoader{

	static parseAttributes(aJson){

		let attributes = new PointAttributes();

		//attributes.add(PointAttribute.POSITION_CARTESIAN);
		//attributes.add(new PointAttribute("rgba", PointAttributeTypes.DATA_TYPE_UINT8, 4));

		for(let attribute of aJson){
			let {name, size, numElements, elementSize} = attribute;

			let type;

			// TODO: read from file
			if(name === "position"){
				type = PointAttributeTypes.DATA_TYPE_INT32;
			}else if(name === "intensity"){
				type = PointAttributeTypes.DATA_TYPE_UINT16;
			}else if(name === "returns"){
				type = PointAttributeTypes.DATA_TYPE_UINT8;
			}else if(name === "classification"){
				type = PointAttributeTypes.DATA_TYPE_UINT8;
			}else if(name === "scan angle rank"){
				type = PointAttributeTypes.DATA_TYPE_UINT8;
			}else if(name === "user data"){
				type = PointAttributeTypes.DATA_TYPE_UINT8;
			}else if(name === "point source id"){
				type = PointAttributeTypes.DATA_TYPE_UINT16;
			}else if(name === "rgb"){
				type = PointAttributeTypes.DATA_TYPE_UINT16;
			}else if(name === "gps time"){
				type = PointAttributeTypes.DATA_TYPE_DOUBLE;
			}

			attributes.add(new PointAttribute(name, type, numElements));
		}

		return attributes;
	}

	static async parseHierarchy(buffer, root){

		// let buffer = await response.arrayBuffer();
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

				nodes.push(child);
			}

			
		}

		console.log("lala");
	}

	static async load(url){

		let lasPath = url;

		let headerSize = 375 + 4 + 4;
		let responseHeader = await fetch(lasPath, {
			headers: {
				'content-type': 'multipart/byteranges',
				'Range': `bytes=0-${headerSize - 1}`,
			},
		});

		let headerBuffer = await responseHeader.arrayBuffer();
		let headerView = new DataView(headerBuffer);
		let metadataSize = headerView.getInt32(375, true);
		let hierarchyDataSize = headerView.getInt32(375 + 4, true);
		let offsetToPointRecords = BigInt(headerSize + metadataSize + hierarchyDataSize);

		let responseMetadata = await fetch(lasPath, {
			headers: {
				'content-type': 'multipart/byteranges',
				'Range': `bytes=${headerSize}-${headerSize + metadataSize - 1}`,
			},
		});

		let responseHierarchyData = await fetch(lasPath, {
			headers: {
				'content-type': 'multipart/byteranges',
				'Range': `bytes=${headerSize + metadataSize}-${headerSize + metadataSize + hierarchyDataSize - 1}`,
			},
		});

		let json = await responseMetadata.json();
		let hierarchyBuffer = await responseHierarchyData.arrayBuffer();

		let octree = new OctreeGeometry();
		octree.url = url;
		octree.spacing = json.spacing;
		octree.dbgScale = new THREE.Vector3(...json.scale);
		octree.dbgOffset = new THREE.Vector3(...json.offset);

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
		octree.pointAttributes = LasOctreeLoader.parseAttributes(json.attributes);
		octree.loader = new NodeLoader(lasPath, offsetToPointRecords);

		let root = new OctreeGeometryNode("r", octree, boundingBox);
		root.level = 0;
		root.hasChildren = false;
		root.spacing = octree.spacing;
		root.byteOffset = 0;
		// root.byteSize = 1000 * 16;
		// root.numPoints = 1000;

		octree.root = root;

		await LasOctreeLoader.parseHierarchy(hierarchyBuffer, root);

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