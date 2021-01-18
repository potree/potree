

import * as THREE from "../../libs/three.js/build/three.module.js";
import {PointCloudTree, PointCloudTreeNode} from "../PointCloudTree.js";
import {PointCloudMaterial} from "../materials/PointCloudMaterial.js";
import {PointSizeType, ClipTask, TreeType} from "../defines.js";
import {Utils} from "../utils.js";



export class PointCloudArena4DNode extends PointCloudTreeNode {
	constructor () {
		super();

		this.left = null;
		this.right = null;
		this.sceneNode = null;
		this.kdtree = null;
	}

	getNumPoints () {
		return this.geometryNode.numPoints;
	}

	isLoaded () {
		return true;
	}

	isTreeNode () {
		return true;
	}

	isGeometryNode () {
		return false;
	}

	getLevel () {
		return this.geometryNode.level;
	}

	getBoundingSphere () {
		return this.geometryNode.boundingSphere;
	}

	getBoundingBox () {
		return this.geometryNode.boundingBox;
	}

	toTreeNode (child) {
		let geometryNode = null;

		if (this.left === child) {
			geometryNode = this.left;
		} else if (this.right === child) {
			geometryNode = this.right;
		}

		if (!geometryNode.loaded) {
			return;
		}

		let node = new PointCloudArena4DNode();
		let sceneNode = THREE.PointCloud(geometryNode.geometry, this.kdtree.material);
		sceneNode.visible = false;

		node.kdtree = this.kdtree;
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.parent = this;
		node.left = this.geometryNode.left;
		node.right = this.geometryNode.right;
	}

	getChildren () {
		let children = [];

		if (this.left) {
			children.push(this.left);
		}

		if (this.right) {
			children.push(this.right);
		}

		return children;
	}
};

export class PointCloudArena4D extends PointCloudTree{
	constructor (geometry) {
		super();

		this.root = null;
		if (geometry.root) {
			this.root = geometry.root;
		} else {
			geometry.addEventListener('hierarchy_loaded', () => {
				this.root = geometry.root;
			});
		}

		this.visiblePointsTarget = 2 * 1000 * 1000;
		this.minimumNodePixelSize = 150;

		this.position.sub(geometry.offset);
		this.updateMatrix();

		this.numVisibleNodes = 0;
		this.numVisiblePoints = 0;

		this.boundingBoxNodes = [];
		this.loadQueue = [];
		this.visibleNodes = [];

		this.pcoGeometry = geometry;
		this.boundingBox = this.pcoGeometry.boundingBox;
		this.boundingSphere = this.pcoGeometry.boundingSphere;
		this.material = new PointCloudMaterial({vertexColors: THREE.VertexColors, size: 0.05, treeType: TreeType.KDTREE});
		this.material.sizeType = PointSizeType.ATTENUATED;
		this.material.size = 0.05;
		this.profileRequests = [];
		this.name = '';
	}

	getBoundingBoxWorld () {
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Utils.computeTransformedBoundingBox(box, transform);

		return tBox;
	};

	setName (name) {
		if (this.name !== name) {
			this.name = name;
			this.dispatchEvent({type: 'name_changed', name: name, pointcloud: this});
		}
	}

	getName () {
		return this.name;
	}

	getLevel () {
		return this.level;
	}

	toTreeNode (geometryNode, parent) {
		let node = new PointCloudArena4DNode();
		let sceneNode = new THREE.Points(geometryNode.geometry, this.material);

		sceneNode.frustumCulled = false;
		sceneNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
			if (material.program) {
				_this.getContext().useProgram(material.program.program);

				if (material.program.getUniforms().map.level) {
					let level = geometryNode.getLevel();
					material.uniforms.level.value = level;
					material.program.getUniforms().map.level.setValue(_this.getContext(), level);
				}

				if (this.visibleNodeTextureOffsets && material.program.getUniforms().map.vnStart) {
					let vnStart = this.visibleNodeTextureOffsets.get(node);
					material.uniforms.vnStart.value = vnStart;
					material.program.getUniforms().map.vnStart.setValue(_this.getContext(), vnStart);
				}

				if (material.program.getUniforms().map.pcIndex) {
					let i = node.pcIndex ? node.pcIndex : this.visibleNodes.indexOf(node);
					material.uniforms.pcIndex.value = i;
					material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), i);
				}
			}
		};

		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.pointcloud = this;
		node.left = geometryNode.left;
		node.right = geometryNode.right;

		if (!parent) {
			this.root = node;
			this.add(sceneNode);
		} else {
			parent.sceneNode.add(sceneNode);

			if (parent.left === geometryNode) {
				parent.left = node;
			} else if (parent.right === geometryNode) {
				parent.right = node;
			}
		}

		let disposeListener = function () {
			parent.sceneNode.remove(node.sceneNode);

			if (parent.left === node) {
				parent.left = geometryNode;
			} else if (parent.right === node) {
				parent.right = geometryNode;
			}
		};
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);

		return node;
	}

	updateMaterial (material, visibleNodes, camera, renderer) {
		material.fov = camera.fov * (Math.PI / 180);
		material.screenWidth = renderer.domElement.clientWidth;
		material.screenHeight = renderer.domElement.clientHeight;
		material.spacing = this.pcoGeometry.spacing;
		material.near = camera.near;
		material.far = camera.far;

		// reduce shader source updates by setting maxLevel slightly higher than actually necessary
		if (this.maxLevel > material.levels) {
			material.levels = this.maxLevel + 2;
		}

		// material.uniforms.octreeSize.value = this.boundingBox.size().x;
		let bbSize = this.boundingBox.getSize(new THREE.Vector3());
		material.bbSize = [bbSize.x, bbSize.y, bbSize.z];
	}

	updateVisibleBounds () {

	}

	hideDescendants (object) {
		let stack = [];
		for (let i = 0; i < object.children.length; i++) {
			let child = object.children[i];
			if (child.visible) {
				stack.push(child);
			}
		}

		while (stack.length > 0) {
			let child = stack.shift();

			child.visible = false;
			if (child.boundingBoxNode) {
				child.boundingBoxNode.visible = false;
			}

			for (let i = 0; i < child.children.length; i++) {
				let childOfChild = child.children[i];
				if (childOfChild.visible) {
					stack.push(childOfChild);
				}
			}
		}
	}

	updateMatrixWorld (force) {
		// node.matrixWorld.multiplyMatrices( node.parent.matrixWorld, node.matrix );

		if (this.matrixAutoUpdate === true) this.updateMatrix();

		if (this.matrixWorldNeedsUpdate === true || force === true) {
			if (this.parent === undefined) {
				this.matrixWorld.copy(this.matrix);
			} else {
				this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
			}

			this.matrixWorldNeedsUpdate = false;

			force = true;
		}
	}

	nodesOnRay (nodes, ray) {
		let nodesOnRay = [];

		let _ray = ray.clone();
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			let sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
			// TODO Unused: let box = node.getBoundingBox().clone().applyMatrix4(node.sceneNode.matrixWorld);

			if (_ray.intersectsSphere(sphere)) {
				nodesOnRay.push(node);
			}
			// if(_ray.isIntersectionBox(box)){
			//	nodesOnRay.push(node);
			// }
		}

		return nodesOnRay;
	}

	pick(viewer, camera, ray, params = {}){

		let renderer = viewer.renderer;
		let pRenderer = viewer.pRenderer;

		performance.mark("pick-start");

		let getVal = (a, b) => a !== undefined ? a : b;

		let pickWindowSize = getVal(params.pickWindowSize, 17);
		let pickOutsideClipRegion = getVal(params.pickOutsideClipRegion, false);

		let size = renderer.getSize(new THREE.Vector2());

		let width = Math.ceil(getVal(params.width, size.width));
		let height = Math.ceil(getVal(params.height, size.height));

		let pointSizeType = getVal(params.pointSizeType, this.material.pointSizeType);
		let pointSize = getVal(params.pointSize, this.material.size);

		let nodes = this.nodesOnRay(this.visibleNodes, ray);

		if (nodes.length === 0) {
			return null;
		}

		if (!this.pickState) {
			let scene = new THREE.Scene();

			let material = new PointCloudMaterial();
			material.activeAttributeName = "indices";

			let renderTarget = new THREE.WebGLRenderTarget(
				1, 1,
				{ minFilter: THREE.LinearFilter,
					magFilter: THREE.NearestFilter,
					format: THREE.RGBAFormat }
			);

			this.pickState = {
				renderTarget: renderTarget,
				material: material,
				scene: scene
			};
		};

		let pickState = this.pickState;
		let pickMaterial = pickState.material;

		{ // update pick material
			pickMaterial.pointSizeType = pointSizeType;
			pickMaterial.shape = this.material.shape;

			pickMaterial.size = pointSize;
			pickMaterial.uniforms.minSize.value = this.material.uniforms.minSize.value;
			pickMaterial.uniforms.maxSize.value = this.material.uniforms.maxSize.value;
			pickMaterial.classification = this.material.classification;
			if(params.pickClipped){
				pickMaterial.clipBoxes = this.material.clipBoxes;
				if(this.material.clipTask === ClipTask.HIGHLIGHT){
					pickMaterial.clipTask = ClipTask.NONE;
				}else{
					pickMaterial.clipTask = this.material.clipTask;
				}
			}else{
				pickMaterial.clipBoxes = [];
			}
			
			this.updateMaterial(pickMaterial, nodes, camera, renderer);
		}

		pickState.renderTarget.setSize(width, height);

		let pixelPos = new THREE.Vector2(params.x, params.y);
		
		let gl = renderer.getContext();
		gl.enable(gl.SCISSOR_TEST);
		gl.scissor(
			parseInt(pixelPos.x - (pickWindowSize - 1) / 2),
			parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
			parseInt(pickWindowSize), parseInt(pickWindowSize));


		renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
		renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
		renderer.state.setBlending(THREE.NoBlending);

		renderer.clearTarget(pickState.renderTarget, true, true, true);

		{ // RENDER
			renderer.setRenderTarget(pickState.renderTarget);
			gl.clearColor(0, 0, 0, 0);
			renderer.clearTarget( pickState.renderTarget, true, true, true );
			
			let tmp = this.material;
			this.material = pickMaterial;
			
			pRenderer.renderOctree(this, nodes, camera, pickState.renderTarget);
			
			this.material = tmp;
		}

		let clamp = (number, min, max) => Math.min(Math.max(min, number), max);

		let x = parseInt(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width));
		let y = parseInt(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height));
		let w = parseInt(Math.min(x + pickWindowSize, width) - x);
		let h = parseInt(Math.min(y + pickWindowSize, height) - y);

		let pixelCount = w * h;
		let buffer = new Uint8Array(4 * pixelCount);
		
		gl.readPixels(x, y, pickWindowSize, pickWindowSize, gl.RGBA, gl.UNSIGNED_BYTE, buffer); 
		
		renderer.setRenderTarget(null);
		renderer.state.reset();
		renderer.setScissorTest(false);
		gl.disable(gl.SCISSOR_TEST);
		
		let pixels = buffer;
		let ibuffer = new Uint32Array(buffer.buffer);

		// find closest hit inside pixelWindow boundaries
		let min = Number.MAX_VALUE;
		let hits = [];
		for (let u = 0; u < pickWindowSize; u++) {
			for (let v = 0; v < pickWindowSize; v++) {
				let offset = (u + v * pickWindowSize);
				let distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

				let pcIndex = pixels[4 * offset + 3];
				pixels[4 * offset + 3] = 0;
				let pIndex = ibuffer[offset];

				if(!(pcIndex === 0 && pIndex === 0) && (pcIndex !== undefined) && (pIndex !== undefined)){
					let hit = {
						pIndex: pIndex,
						pcIndex: pcIndex,
						distanceToCenter: distance
					};

					if(params.all){
						hits.push(hit);
					}else{
						if(hits.length > 0){
							if(distance < hits[0].distanceToCenter){
								hits[0] = hit;
							}
						}else{
							hits.push(hit);
						}
					}

					
				}
			}
		}



		for(let hit of hits){
			let point = {};
		
			if (!nodes[hit.pcIndex]) {
				return null;
			}
		
			let node = nodes[hit.pcIndex];
			let pc = node.sceneNode;
			let geometry = node.geometryNode.geometry;
			
			for(let attributeName in geometry.attributes){
				let attribute = geometry.attributes[attributeName];
		
				if (attributeName === 'position') {
					let x = attribute.array[3 * hit.pIndex + 0];
					let y = attribute.array[3 * hit.pIndex + 1];
					let z = attribute.array[3 * hit.pIndex + 2];
					
					let position = new THREE.Vector3(x, y, z);
					position.applyMatrix4(pc.matrixWorld);
		
					point[attributeName] = position;
				} else if (attributeName === 'indices') {
		
				} else {
					//if (values.itemSize === 1) {
					//	point[attribute.name] = values.array[hit.pIndex];
					//} else {
					//	let value = [];
					//	for (let j = 0; j < values.itemSize; j++) {
					//		value.push(values.array[values.itemSize * hit.pIndex + j]);
					//	}
					//	point[attribute.name] = value;
					//}
				}
				
			}

			hit.point = point;
		}

		performance.mark("pick-end");
		performance.measure("pick", "pick-start", "pick-end");

		if(params.all){
			return hits.map(hit => hit.point);
		}else{
			if(hits.length === 0){
				return null;
			}else{
				return hits[0].point;
			}
		}
	}

	computeVisibilityTextureData(nodes){

		if(exports.measureTimings) performance.mark("computeVisibilityTextureData-start");

		let data = new Uint8Array(nodes.length * 3);
		let visibleNodeTextureOffsets = new Map();

		// copy array
		nodes = nodes.slice();

		// sort by level and number
		let sort = function (a, b) {
			let la = a.geometryNode.level;
			let lb = b.geometryNode.level;
			let na = a.geometryNode.number;
			let nb = b.geometryNode.number;
			if (la !== lb) return la - lb;
			if (na < nb) return -1;
			if (na > nb) return 1;
			return 0;
		};
		nodes.sort(sort);

		let visibleNodeNames = [];
		for (let i = 0; i < nodes.length; i++) {
			visibleNodeNames.push(nodes[i].geometryNode.number);
		}

		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];

			visibleNodeTextureOffsets.set(node, i);

			let b1 = 0;	// children
			let b2 = 0;	// offset to first child
			let b3 = 0;	// split

			if (node.geometryNode.left && visibleNodeNames.indexOf(node.geometryNode.left.number) > 0) {
				b1 += 1;
				b2 = visibleNodeNames.indexOf(node.geometryNode.left.number) - i;
			}
			if (node.geometryNode.right && visibleNodeNames.indexOf(node.geometryNode.right.number) > 0) {
				b1 += 2;
				b2 = (b2 === 0) ? visibleNodeNames.indexOf(node.geometryNode.right.number) - i : b2;
			}

			if (node.geometryNode.split === 'X') {
				b3 = 1;
			} else if (node.geometryNode.split === 'Y') {
				b3 = 2;
			} else if (node.geometryNode.split === 'Z') {
				b3 = 4;
			}

			data[i * 3 + 0] = b1;
			data[i * 3 + 1] = b2;
			data[i * 3 + 2] = b3;
		}

		if(exports.measureTimings){
			performance.mark("computeVisibilityTextureData-end");
			performance.measure("render.computeVisibilityTextureData", "computeVisibilityTextureData-start", "computeVisibilityTextureData-end");
		}

		return {
			data: data,
			offsets: visibleNodeTextureOffsets
		};
	}

	get progress () {
		if (this.pcoGeometry.root) {
			return exports.numNodesLoading > 0 ? 0 : 1;
		} else {
			return 0;
		}
	}
};
