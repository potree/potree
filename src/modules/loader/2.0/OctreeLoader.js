
import * as THREE from "../../../../libs/three.js/build/three.module.js";
import {PointAttribute, PointAttributes, PointAttributeTypes} from "../../../loader/PointAttributes.js";
import {OctreeGeometry, OctreeGeometryNode} from "./OctreeGeometry.js";

// let loadedNodes = new Set();

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

		// console.log(node.name, node.numPoints);

		// if(loadedNodes.has(node.name)){
		// 	// debugger;
		// }
		// loadedNodes.add(node.name);

		try{
			if(node.nodeType === 2){
				await this.loadHierarchy(node);
			}

			let {byteOffset, byteSize} = node;


			let urlOctree = `${this.url}/../octree.bin`;

			let first = byteOffset;
			let last = byteOffset + byteSize - 1n;

			let buffer;

			if(byteSize === 0n){
				buffer = new ArrayBuffer(0);
				console.warn(`loaded node with 0 bytes: ${node.name}`);
			}else{
				let response = await fetch(urlOctree, {
					headers: {
						'content-type': 'multipart/byteranges',
						'Range': `bytes=${first}-${last}`,
					},
				});

				buffer = await response.arrayBuffer();
			}

			let workerPath;
			if(this.metadata.encoding === "BROTLI"){
				workerPath = Potree.scriptPath + '/workers/2.0/DecoderWorker_brotli.js';
			}else{
				workerPath = Potree.scriptPath + '/workers/2.0/DecoderWorker.js';
			}

			let worker = Potree.workerPool.getWorker(workerPath);

			worker.onmessage = function (e) {

				let data = e.data;
				let buffers = data.attributeBuffers;

				Potree.workerPool.returnWorker(workerPath, worker);

				let geometry = new THREE.BufferGeometry();
				
				for(let property in buffers){

					let buffer = buffers[property].buffer;

					if(property === "position"){
						geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					}else if(property === "rgba"){
						geometry.setAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
					}else if(property === "NORMAL"){
						//geometry.setAttribute('rgba', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
						geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
					}else if (property === "INDICES") {
						let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
						bufferAttribute.normalized = true;
						geometry.setAttribute('indices', bufferAttribute);
					}else{
						const bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);

						let batchAttribute = buffers[property].attribute;
						bufferAttribute.potree = {
							offset: buffers[property].offset,
							scale: buffers[property].scale,
							preciseBuffer: buffers[property].preciseBuffer,
							range: batchAttribute.range,
						};

						geometry.setAttribute(property, bufferAttribute);
					}

				}
				// indices ??

				node.density = data.density;
				node.geometry = geometry;
				node.loaded = true;
				node.loading = false;
				Potree.numNodesLoading--;
			};

			let pointAttributes = node.octreeGeometry.pointAttributes;
			let scale = node.octreeGeometry.scale;

			let box = node.boundingBox;
			let min = node.octreeGeometry.offset.clone().add(box.min);
			let size = box.max.clone().sub(box.min);
			let max = min.clone().add(size);
			let numPoints = node.numPoints;

			let offset = node.octreeGeometry.loader.offset;

			let message = {
				name: node.name,
				buffer: buffer,
				pointAttributes: pointAttributes,
				scale: scale,
				min: min,
				max: max,
				size: size,
				offset: offset,
				numPoints: numPoints
			};

			worker.postMessage(message, [message.buffer]);
		}catch(e){
			node.loaded = false;
			node.loading = false;
			Potree.numNodesLoading--;

			console.log(`failed to load ${node.name}`);
			console.log(e);
			console.log(`trying again!`);
		}
	}

	parseHierarchy(node, buffer){

		let view = new DataView(buffer);
		let tStart = performance.now();

		let bytesPerNode = 22;
		let numNodes = buffer.byteLength / bytesPerNode;

		let octree = node.octreeGeometry;
		// let nodes = [node];
		let nodes = new Array(numNodes);
		nodes[0] = node;
		let nodePos = 1;

		for(let i = 0; i < numNodes; i++){
			let current = nodes[i];

			let type = view.getUint8(i * bytesPerNode + 0);
			let childMask = view.getUint8(i * bytesPerNode + 1);
			let numPoints = view.getUint32(i * bytesPerNode + 2, true);
			let byteOffset = view.getBigInt64(i * bytesPerNode + 6, true);
			let byteSize = view.getBigInt64(i * bytesPerNode + 14, true);

			// if(byteSize === 0n){
			// 	// debugger;
			// }


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

			if(current.byteSize === 0n){
				// workaround for issue #1125
				// some inner nodes erroneously report >0 points even though have 0 points
				// however, they still report a byteSize of 0, so based on that we now set node.numPoints to 0
				current.numPoints = 0;
			}
			
			current.nodeType = type;

			if(current.nodeType === 2){
				continue;
			}

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

				// nodes.push(child);
				nodes[nodePos] = child;
				nodePos++;
			}

			// if((i % 500) === 0){
			// 	yield;
			// }
		}

		let duration = (performance.now() - tStart);

		// if(duration > 20){
		// 	let msg = `duration: ${duration}ms, numNodes: ${numNodes}`;
		// 	console.log(msg);
		// }
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

		this.parseHierarchy(node, buffer);

		// let promise = new Promise((resolve) => {
		// 	let generator = this.parseHierarchy(node, buffer);

		// 	let repeatUntilDone = () => {
		// 		let result = generator.next();

		// 		if(result.done){
		// 			resolve();
		// 		}else{
		// 			requestAnimationFrame(repeatUntilDone);
		// 		}
		// 	};
			
		// 	repeatUntilDone();
		// });

		// await promise;

		



	}

}

let tmpVec3 = new THREE.Vector3();
function createChildAABB(aabb, index){
	let min = aabb.min.clone();
	let max = aabb.max.clone();
	let size = tmpVec3.subVectors(max, min);

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

export class OctreeLoader{

	static parseAttributes(jsonAttributes){

		let attributes = new PointAttributes();

		let replacements = {
			"rgb": "rgba",
		};

		for (const jsonAttribute of jsonAttributes) {
			let {name, description, size, numElements, elementSize, min, max} = jsonAttribute;

			let type = typenameTypeattributeMap[jsonAttribute.type];

			let potreeAttributeName = replacements[name] ? replacements[name] : name;

			let attribute = new PointAttribute(potreeAttributeName, type, numElements);

			if(numElements === 1){
				attribute.range = [min[0], max[0]];
			}else{
				attribute.range = [min, max];
			}

			if (name === "gps-time") { // HACK: Guard against bad gpsTime range in metadata, see potree/potree#909
				if (attribute.range[0] === attribute.range[1]) {
					attribute.range[1] += 1;
				}
			}

			attribute.initialRange = attribute.range;

			attributes.add(attribute);
		}

		{
			// check if it has normals
			let hasNormals = 
				attributes.attributes.find(a => a.name === "NormalX") !== undefined &&
				attributes.attributes.find(a => a.name === "NormalY") !== undefined &&
				attributes.attributes.find(a => a.name === "NormalZ") !== undefined;

			if(hasNormals){
				let vector = {
					name: "NORMAL",
					attributes: ["NormalX", "NormalY", "NormalZ"],
				};
				attributes.addVector(vector);
			}
		}

		return attributes;
	}

	static async load(url){

		let response = await fetch(url);
		let metadata = await response.json();

		let attributes = OctreeLoader.parseAttributes(metadata.attributes);

		let loader = new NodeLoader(url);
		loader.metadata = metadata;
		loader.attributes = attributes;
		loader.scale = metadata.scale;
		loader.offset = metadata.offset;

		let octree = new OctreeGeometry();
		octree.url = url;
		octree.spacing = metadata.spacing;
		octree.scale = metadata.scale;

		// let aPosition = metadata.attributes.find(a => a.name === "position");
		// octree

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
		octree.pointAttributes = OctreeLoader.parseAttributes(metadata.attributes);
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

		loader.load(root);

		let result = {
			geometry: octree,
		};

		return result;

	}

};