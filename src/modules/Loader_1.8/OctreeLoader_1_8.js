
import {PointAttribute, PointAttributes, PointAttributeTypes} from "../../loader/PointAttributes.js";
import {OctreeGeometry, OctreeGeometryNode} from "./OctreeGeometry.js";

export class NodeLoader{

	constructor(url){
		this.url = url;
	}

	async load(node){

		if(node.loaded || node.loading){
			return;
		}

		node.loading = true;
		Potree.numNodesLoading++;

		if(node.nodeType === 2){
			await this.loadHierarchy(node);
		}

		let {byteOffset, byteSize} = node;

		try{

			let urlOctree = `${this.url}/../octree.bin`;

			let first = byteOffset;
			let last = byteOffset + byteSize - 1n;

			let response = await fetch(urlOctree, {
				headers: {
					'content-type': 'multipart/byteranges',
					'Range': `bytes=${first}-${last}`,
				},
			});

			let buffer = await response.arrayBuffer();

			let workerPath = Potree.scriptPath + '/workers/OctreeDecoderWorker.js';
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

			let pointAttributes = node.octreeGeometry.pointAttributes;
			let scale = node.octreeGeometry.scale;

			let min = node.octreeGeometry.offset.clone().add(node.boundingBox.min);
			//let min = node.boundingBox.min;
			let offset = node.octreeGeometry.loader.offset;

			let message = {
				name: node.name,
				buffer: buffer,
				pointAttributes: pointAttributes,
				scale: scale,
				min: min,
				offset: offset,
				//min: node.boundingBox.min,
			};

			worker.postMessage(message, [message.buffer]);
		}catch(e){
			node.loaded = false;
			node.loading = false;
			Potree.numNodesLoading--;

			console.log(`failed to load ${node.name}`);
			console.log(`trying again!`);
		}
	}

	async loadHierarchy(node){

		let {hierarchyByteOffset, hierarchyByteSize} = node;
		let hierarchyPath = `${this.url}/../hierarchy.bin`;
		
		let first = hierarchyByteOffset;
		let last = first + hierarchyByteSize - 1n;

		let response = await fetch(hierarchyPath, {
			headers: {
				'content-type': 'multipart/byteranges',
				'Range': `bytes=${first}-${last}`,
			},
		});

		let buffer = await response.arrayBuffer();
		let view = new DataView(buffer);

		let bytesPerNode = 22;
		let numNodes = buffer.byteLength / bytesPerNode;

		let octree = node.octreeGeometry;
		let nodes = [node];

		for(let i = 0; i < numNodes; i++){
			let current = nodes[i];

			let type = view.getUint8(i * bytesPerNode + 0);
			let childMask = view.getUint8(i * bytesPerNode + 1);
			let numPoints = view.getUint32(i * bytesPerNode + 2, true);
			let byteOffset = view.getBigInt64(i * bytesPerNode + 6, true);
			let byteSize = view.getBigInt64(i * bytesPerNode + 14, true);


			if(current.nodeType === 2){
				// replace proxy with real node
				current.byteOffset = byteOffset;
				current.byteSize = byteSize;
				current.numPoints = numPoints;
			}else if(type === 2){
				// load proxy
				current.hierarchyByteOffset = byteOffset;
				current.hierarchyByteSize = byteSize;
				current.numPoints = numPoints;
			}else{
				// load real node 
				current.byteOffset = byteOffset;
				current.byteSize = byteSize;
				current.numPoints = numPoints;
			}
			
			current.nodeType = type;

			for(let childIndex = 0; childIndex < 8; childIndex++){
				let childExists = ((1 << childIndex) & childMask) !== 0;

				if(!childExists){
					continue;
				}

				let childName = current.name + childIndex;

				let childAABB = createChildAABB(current.boundingBox, childIndex);
				let child = new OctreeGeometryNode(childName, octree, childAABB);
				child.name = childName;
				child.spacing = current.spacing / 2;
				child.level = current.level + 1;

				current.children[childIndex] = child;
				child.parent = current;

				nodes.push(child);
			}
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

let typenameTypeattributeMap = {
	"double": PointAttributeTypes.DATA_TYPE_DOUBLE,
	"float": PointAttributeTypes.DATA_TYPE_FLOAT,
	"int8": PointAttributeTypes.DATA_TYPE_INT8,
	"uint8": PointAttributeTypes.DATA_TYPE_UINT8,
	"int16": PointAttributeTypes.DATA_TYPE_INT16,
	"uint16": PointAttributeTypes.DATA_TYPE_UINT16,
	"int32": PointAttributeTypes.DATA_TYPE_INT32,
	"uint32": PointAttributeTypes.DATA_TYPE_UINT32,
	"int64": PointAttributeTypes.DATA_TYPE_INT64,
	"uint64": PointAttributeTypes.DATA_TYPE_UINT64,
}

export class OctreeLoader_1_8{

	static parseAttributes(jsonAttributes){

		let attributes = new PointAttributes();

		let replacements = {
			"rgb": "rgba",
		};

		for(let jsonAttribute of jsonAttributes){
			let {name, description, size, numElements, elementSize} = jsonAttribute;

			let type = typenameTypeattributeMap[jsonAttribute.type];

			let potreeAttributeName = replacements[name] ? replacements[name] : name;

			let attribute = new PointAttribute(potreeAttributeName, type, numElements);

			attributes.add(attribute);
		}

		return attributes;
	}

	static async load(url){

		let response = await fetch(url);
		let metadata = await response.json();

		let attributes = OctreeLoader_1_8.parseAttributes(metadata.attributes);

		let loader = new NodeLoader(url);
		loader.metadata = metadata;
		loader.attributes = attributes;
		loader.scale = metadata.scale;
		loader.offset = metadata.offset;

		let octree = new OctreeGeometry();
		octree.url = url;
		octree.spacing = metadata.spacing;
		octree.scale = metadata.scale;

		let min = new THREE.Vector3(...metadata.boundingBox.min);
		let max = new THREE.Vector3(...metadata.boundingBox.max);
		let boundingBox = new THREE.Box3(min, max);

		let offset = min.clone();
		boundingBox.min.sub(offset);
		boundingBox.max.sub(offset);

		octree.projection = metadata.projection;
		octree.boundingBox = boundingBox;
		octree.tightBoundingBox = boundingBox.clone();
		octree.boundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		octree.tightBoundingSphere = boundingBox.getBoundingSphere(new THREE.Sphere());
		octree.offset = offset;
		octree.pointAttributes = OctreeLoader_1_8.parseAttributes(metadata.attributes);
		octree.loader = loader;

		let root = new OctreeGeometryNode("r", octree, boundingBox);
		root.level = 0;
		root.nodeType = 2;
		root.hierarchyByteOffset = 0n;
		root.hierarchyByteSize = BigInt(metadata.hierarchy.firstChunkSize);
		root.hasChildren = false;
		root.spacing = octree.spacing;
		root.byteOffset = 0;

		octree.root = root;

		//await OctreeLoader_1_8.loadHierarchy(url, root);
		await loader.load(root);

		let result = {
			geometry: octree,
		};

		return result;

	}

};