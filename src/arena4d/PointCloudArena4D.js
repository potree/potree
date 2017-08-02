
Potree.PointCloudArena4DNode = class PointCloudArena4DNode extends Potree.PointCloudTreeNode {
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
		var geometryNode = null;

		if (this.left === child) {
			geometryNode = this.left;
		} else if (this.right === child) {
			geometryNode = this.right;
		}

		if (!geometryNode.loaded) {
			return;
		}

		var node = new Potree.PointCloudArena4DNode();
		var sceneNode = THREE.PointCloud(geometryNode.geometry, this.kdtree.material);
		sceneNode.visible = false;

		node.kdtree = this.kdtree;
		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.parent = this;
		node.left = this.geometryNode.left;
		node.right = this.geometryNode.right;
	}

	getChildren () {
		var children = [];

		if (this.left) {
			children.push(this.left);
		}

		if (this.right) {
			children.push(this.right);
		}

		return children;
	}
};

Potree.PointCloudOctreeNode.prototype = Object.create(Potree.PointCloudTreeNode.prototype);

Potree.PointCloudArena4D = class PointCloudArena4D extends Potree.PointCloudTree {
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
		this.material = new Potree.PointCloudMaterial({vertexColors: THREE.VertexColors, size: 0.05, treeType: Potree.TreeType.KDTREE});
		this.material.sizeType = Potree.PointSizeType.ATTENUATED;
		this.material.size = 0.05;
		this.profileRequests = [];
		this.name = '';
	}

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
		var node = new Potree.PointCloudArena4DNode();
		var sceneNode = new THREE.Points(geometryNode.geometry, this.material);

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

		var disposeListener = function () {
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

		// material.minSize = 3;

		// material.uniforms.octreeSize.value = this.boundingBox.size().x;
		var bbSize = this.boundingBox.getSize();
		material.bbSize = [bbSize.x, bbSize.y, bbSize.z];

		// update visibility texture
		if (material.pointSizeType) {
			if (material.pointSizeType === Potree.PointSizeType.ADAPTIVE ||
				material.pointColorType === Potree.PointColorType.LOD) {
				this.updateVisibilityTexture(material, visibleNodes);
			}
		}
	}

	updateVisibleBounds () {

	}

	hideDescendants (object) {
		var stack = [];
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
		var nodesOnRay = [];

		var _ray = ray.clone();
		for (var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			var sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
			// TODO Unused: var box = node.getBoundingBox().clone().applyMatrix4(node.sceneNode.matrixWorld);

			if (_ray.intersectsSphere(sphere)) {
				nodesOnRay.push(node);
			}
			// if(_ray.isIntersectionBox(box)){
			//	nodesOnRay.push(node);
			// }
		}

		return nodesOnRay;
	}

	pick (renderer, camera, ray, params = {}) {
		// let start = new Date().getTime();

		let pickWindowSize = params.pickWindowSize || 17;
		let pickOutsideClipRegion = params.pickOutsideClipRegion || false;
		let width = Math.ceil(renderer.domElement.clientWidth);
		let height = Math.ceil(renderer.domElement.clientHeight);

		let nodes = this.nodesOnRay(this.visibleNodes, ray);

		if (nodes.length === 0) {
			return null;
		}

		if (!this.pickState) {
			let scene = new THREE.Scene();

			let material = new Potree.PointCloudMaterial();
			material.pointColorType = Potree.PointColorType.POINT_INDEX;

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
			pickMaterial.pointSizeType = this.material.pointSizeType;
			pickMaterial.shape = this.material.shape;

			pickMaterial.size = this.material.size;
			pickMaterial.minSize = this.material.minSize;
			pickMaterial.maxSize = this.material.maxSize;
			pickMaterial.classification = this.material.classification;

			if (pickOutsideClipRegion) {
				pickMaterial.clipMode = Potree.ClipMode.DISABLED;
			} else {
				pickMaterial.clipMode = this.material.clipMode;
				if (this.material.clipMode === Potree.ClipMode.CLIP_OUTSIDE) {
					pickMaterial.setClipBoxes(this.material.clipBoxes);
				} else {
					pickMaterial.setClipBoxes([]);
				}
			}

			this.updateMaterial(pickMaterial, nodes, camera, renderer);
		}

		if (pickState.renderTarget.width !== width || pickState.renderTarget.height !== height) {
			pickState.renderTarget.dispose();
			pickState.renderTarget = new THREE.WebGLRenderTarget(
				1, 1,
				{ minFilter: THREE.LinearFilter,
					magFilter: THREE.NearestFilter,
					format: THREE.RGBAFormat }
			);
		}
		pickState.renderTarget.setSize(width, height);
		renderer.setRenderTarget(pickState.renderTarget);

		let pixelPos = new THREE.Vector3()
			.addVectors(camera.position, ray.direction)
			.project(camera)
			.addScalar(1)
			.multiplyScalar(0.5);
		pixelPos.x *= width;
		pixelPos.y *= height;

		renderer.setScissor(
			parseInt(pixelPos.x - (pickWindowSize - 1) / 2),
			parseInt(pixelPos.y - (pickWindowSize - 1) / 2),
			parseInt(pickWindowSize), parseInt(pickWindowSize));
		renderer.setScissorTest(true);

		renderer.state.buffers.depth.setTest(pickMaterial.depthTest);
		renderer.state.buffers.depth.setMask(pickMaterial.depthWrite);
		renderer.state.setBlending(THREE.NoBlending);

		renderer.clearTarget(pickState.renderTarget, true, true, true);

		// pickState.scene.children = nodes.map(n => n.sceneNode);

		// let childStates = [];
		let tempNodes = [];
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			node.pcIndex = i + 1;
			let sceneNode = node.sceneNode;

			let tempNode = new THREE.Points(sceneNode.geometry, pickMaterial);
			tempNode.matrix = sceneNode.matrix;
			tempNode.matrixWorld = sceneNode.matrixWorld;
			tempNode.matrixAutoUpdate = false;
			tempNode.frustumCulled = false;
			tempNode.pcIndex = i + 1;

			let geometryNode = node.geometryNode;
			// TODO Unused: let material = pickMaterial;
			tempNode.onBeforeRender = (_this, scene, camera, geometry, material, group) => {
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
						material.uniforms.pcIndex.value = node.pcIndex;
						material.program.getUniforms().map.pcIndex.setValue(_this.getContext(), node.pcIndex);
					}
				}
			};
			tempNodes.push(tempNode);

			// for(let child of nodes[i].sceneNode.children){
			//	childStates.push({child: child, visible: child.visible});
			//	child.visible = false;
			// }
		}
		pickState.scene.autoUpdate = false;
		pickState.scene.children = tempNodes;
		// pickState.scene.overrideMaterial = pickMaterial;

		renderer.state.setBlending(THREE.NoBlending);

		// RENDER
		renderer.render(pickState.scene, camera, pickState.renderTarget);

		// for(let childState of childStates){
		//	childState.child = childState.visible;
		// }

		// pickState.scene.overrideMaterial = null;

		// renderer.context.readPixels(
		//	pixelPos.x - (pickWindowSize-1) / 2, pixelPos.y - (pickWindowSize-1) / 2,
		//	pickWindowSize, pickWindowSize,
		//	renderer.context.RGBA, renderer.context.UNSIGNED_BYTE, pixels);

		let clamp = (number, min, max) => Math.min(Math.max(min, number), max);

		let x = parseInt(clamp(pixelPos.x - (pickWindowSize - 1) / 2, 0, width));
		let y = parseInt(clamp(pixelPos.y - (pickWindowSize - 1) / 2, 0, height));
		let w = parseInt(Math.min(x + pickWindowSize, width) - x);
		let h = parseInt(Math.min(y + pickWindowSize, height) - y);

		let pixelCount = w * h;
		let buffer = new Uint8Array(4 * pixelCount);
		renderer.readRenderTargetPixels(pickState.renderTarget,
			x, y, w, h,
			buffer);

		renderer.setScissorTest(false);

		renderer.setRenderTarget(null);

		let pixels = buffer;
		let ibuffer = new Uint32Array(buffer.buffer);

		// find closest hit inside pixelWindow boundaries
		let min = Number.MAX_VALUE;
		let hit = null;
		for (let u = 0; u < pickWindowSize; u++) {
			for (let v = 0; v < pickWindowSize; v++) {
				let offset = (u + v * pickWindowSize);
				let distance = Math.pow(u - (pickWindowSize - 1) / 2, 2) + Math.pow(v - (pickWindowSize - 1) / 2, 2);

				let pcIndex = pixels[4 * offset + 3];
				pixels[4 * offset + 3] = 0;
				let pIndex = ibuffer[offset];

				// if((pIndex !== 0 || pcIndex !== 0) && distance < min){
				if (pcIndex > 0 && distance < min) {
					hit = {
						pIndex: pIndex,
						pcIndex: pcIndex - 1
					};
					min = distance;

					// console.log(hit);
				}
			}
		}
		// console.log(pixels);

		// { // open window with image
		//	let img = Potree.utils.pixelsArrayToImage(buffer, w, h);
		//	let screenshot = img.src;
		//
		//	if(!this.debugDIV){
		//		this.debugDIV = $(`
		//			<div id="pickDebug"
		//			style="position: absolute;
		//			right: 400px; width: 300px;
		//			bottom: 44px; width: 300px;
		//			z-index: 1000;
		//			"></div>`);
		//		$(document.body).append(this.debugDIV);
		//	}
		//
		//	this.debugDIV.empty();
		//	this.debugDIV.append($(`<img src="${screenshot}"
		//		style="transform: scaleY(-1);"/>`));
		//	//$(this.debugWindow.document).append($(`<img src="${screenshot}"/>`));
		//	//this.debugWindow.document.write('<img src="'+screenshot+'"/>');
		// }

		// return;

		let point = null;

		if (hit) {
			point = {};

			if (!nodes[hit.pcIndex]) {
				return null;
			}

			let pc = nodes[hit.pcIndex].sceneNode;
			let attributes = pc.geometry.attributes;

			for (let property in attributes) {
				if (attributes.hasOwnProperty(property)) {
					let values = pc.geometry.attributes[property];

					if (property === 'position') {
						let positionArray = values.array;
						let x = positionArray[3 * hit.pIndex + 0];
						let y = positionArray[3 * hit.pIndex + 1];
						let z = positionArray[3 * hit.pIndex + 2];
						let position = new THREE.Vector3(x, y, z);
						position.applyMatrix4(pc.matrixWorld);

						point[property] = position;
					} else if (property === 'indices') {

					} else {
						if (values.itemSize === 1) {
							point[property] = values.array[hit.pIndex];
						} else {
							let value = [];
							for (let j = 0; j < values.itemSize; j++) {
								value.push(values.array[values.itemSize * hit.pIndex + j]);
							}
							point[property] = value;
						}
					}
				}
			}
		}

		// let end = new Date().getTime();
		// let duration = end - start;
		// console.log(`pick duration: ${duration}ms`);

		return point;
	}

	updateVisibilityTexture (material, visibleNodes) {
		if (!material) {
			return;
		}

		var texture = material.visibleNodesTexture;
		var data = texture.image.data;

		// copy array
		visibleNodes = visibleNodes.slice();

		// sort by level and number
		var sort = function (a, b) {
			var la = a.geometryNode.level;
			var lb = b.geometryNode.level;
			var na = a.geometryNode.number;
			var nb = b.geometryNode.number;
			if (la !== lb) return la - lb;
			if (na < nb) return -1;
			if (na > nb) return 1;
			return 0;
		};
		visibleNodes.sort(sort);

		var visibleNodeNames = [];
		for (let i = 0; i < visibleNodes.length; i++) {
			// visibleNodeNames[visibleNodes[i].pcoGeometry.number] = true;
			visibleNodeNames.push(visibleNodes[i].geometryNode.number);
		}

		for (let i = 0; i < visibleNodes.length; i++) {
			var node = visibleNodes[i];

			var b1 = 0;	// children
			var b2 = 0;	// offset to first child
			var b3 = 0;	// split

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

		texture.needsUpdate = true;
	}

	get progress () {
		if (this.pcoGeometry.root) {
			return Potree.PointCloudArena4DGeometryNode.nodesLoading > 0 ? 0 : 1;
		} else {
			return 0;
		}
	}
};
