
Potree.PointCloudOctreeNode = class PointCloudOctreeNode extends Potree.PointCloudTreeNode {
	constructor () {
		super();

		this.children = {};
		this.sceneNode = null;
		this.octree = null;
	}

	getNumPoints () {
		return this.geometryNode.numPoints;
	};

	isLoaded () {
		return true;
	};

	isTreeNode () {
		return true;
	};

	isGeometryNode () {
		return false;
	};

	getLevel () {
		return this.geometryNode.level;
	};

	getBoundingSphere () {
		return this.geometryNode.boundingSphere;
	};

	getBoundingBox () {
		return this.geometryNode.boundingBox;
	};

	getChildren () {
		let children = [];

		for (let i = 0; i < 8; i++) {
			if (this.children[i]) {
				children.push(this.children[i]);
			}
		}

		return children;
	};

	get name () {
		return this.geometryNode.name;
	}
};

Potree.PointCloudOctree = class extends Potree.PointCloudTree {
	constructor (geometry, material) {
		super();

		this.pcoGeometry = geometry;
		this.boundingBox = this.pcoGeometry.boundingBox;
		this.boundingSphere = this.boundingBox.getBoundingSphere();
		this.material = material || new Potree.PointCloudMaterial();
		this.visiblePointsTarget = 2 * 1000 * 1000;
		this.minimumNodePixelSize = 150;
		this.level = 0;
		this.position.copy(geometry.offset);
		this.updateMatrix();

		this.showBoundingBox = false;
		this.boundingBoxNodes = [];
		this.loadQueue = [];
		this.visibleBounds = new THREE.Box3();
		this.visibleNodes = [];
		this.visibleGeometry = [];
		this.generateDEM = false;
		this.profileRequests = [];
		this.name = '';

		{
			let box = [this.pcoGeometry.tightBoundingBox, this.getBoundingBoxWorld()]
				.find(v => v !== undefined);

			this.updateMatrixWorld(true);
			box = Potree.utils.computeTransformedBoundingBox(box, this.matrixWorld);

			let bWidth = box.max.z - box.min.z;
			let bMin = box.min.z - 0.2 * bWidth;
			let bMax = box.max.z + 0.2 * bWidth;
			this.material.heightMin = bMin;
			this.material.heightMax = bMax;
		}

		// TODO read projection from file instead
		this.projection = geometry.projection;

		this.root = this.pcoGeometry.root;
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

	toTreeNode (geometryNode, parent) {
		let node = new Potree.PointCloudOctreeNode();

		// if(geometryNode.name === "r40206"){
		//	console.log("creating node for r40206");
		// }
		let sceneNode = new THREE.Points(geometryNode.geometry, this.material);
		sceneNode.name = geometryNode.name;
		sceneNode.position.copy(geometryNode.boundingBox.min);
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

		// { // DEBUG
		//	let sg = new THREE.SphereGeometry(1, 16, 16);
		//	let sm = new THREE.MeshNormalMaterial();
		//	let s = new THREE.Mesh(sg, sm);
		//	s.scale.set(5, 5, 5);
		//	s.position.copy(geometryNode.mean)
		//		.add(this.position)
		//		.add(geometryNode.boundingBox.min);
		//
		//	viewer.scene.scene.add(s);
		// }

		node.geometryNode = geometryNode;
		node.sceneNode = sceneNode;
		node.pointcloud = this;
		node.children = {};
		for (let key in geometryNode.children) {
			node.children[key] = geometryNode.children[key];
		}

		if (!parent) {
			this.root = node;
			this.add(sceneNode);
		} else {
			let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.add(sceneNode);
			parent.children[childIndex] = node;
		}

		let disposeListener = function () {
			let childIndex = parseInt(geometryNode.name[geometryNode.name.length - 1]);
			parent.sceneNode.remove(node.sceneNode);
			parent.children[childIndex] = geometryNode;
		};
		geometryNode.oneTimeDisposeHandlers.push(disposeListener);

		return node;
	}

	updateVisibleBounds () {
		let leafNodes = [];
		for (let i = 0; i < this.visibleNodes.length; i++) {
			let node = this.visibleNodes[i];
			let isLeaf = true;

			for (let j = 0; j < node.children.length; j++) {
				let child = node.children[j];
				if (child instanceof Potree.PointCloudOctreeNode) {
					isLeaf = isLeaf && !child.sceneNode.visible;
				} else if (child instanceof Potree.PointCloudOctreeGeometryNode) {
					isLeaf = true;
				}
			}

			if (isLeaf) {
				leafNodes.push(node);
			}
		}

		this.visibleBounds.min = new THREE.Vector3(Infinity, Infinity, Infinity);
		this.visibleBounds.max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
		for (let i = 0; i < leafNodes.length; i++) {
			let node = leafNodes[i];

			this.visibleBounds.expandByPoint(node.getBoundingBox().min);
			this.visibleBounds.expandByPoint(node.getBoundingBox().max);
		}
	}

	updateMaterial (material, visibleNodes, camera, renderer) {
		material.fov = camera.fov * (Math.PI / 180);
		material.screenWidth = renderer.domElement.clientWidth;
		material.screenHeight = renderer.domElement.clientHeight;
		material.spacing = this.pcoGeometry.spacing * Math.max(this.scale.x, this.scale.y, this.scale.z);
		material.near = camera.near;
		material.far = camera.far;
		material.uniforms.octreeSize.value = this.pcoGeometry.boundingBox.getSize().x;

		// update visibility texture
		if (material.pointSizeType >= 0) {
			if (material.pointSizeType === Potree.PointSizeType.ADAPTIVE ||
				material.pointColorType === Potree.PointColorType.LOD) {
				this.updateVisibilityTexture(material, visibleNodes);
			}
		}
	}

	updateVisibilityTexture (material, visibleNodes) {
		if (!material) {
			return;
		}

		let texture = material.visibleNodesTexture;
		let data = texture.image.data;
		data.fill(0);

		this.visibleNodeTextureOffsets = new Map();

		// copy array
		visibleNodes = visibleNodes.slice();

		// sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
		let sort = function (a, b) {
			let na = a.geometryNode.name;
			let nb = b.geometryNode.name;
			if (na.length !== nb.length) return na.length - nb.length;
			if (na < nb) return -1;
			if (na > nb) return 1;
			return 0;
		};
		visibleNodes.sort(sort);

		for (let i = 0; i < visibleNodes.length; i++) {
			let node = visibleNodes[i];

			this.visibleNodeTextureOffsets.set(node, i);

			let children = [];
			for (let j = 0; j < 8; j++) {
				let child = node.children[j];
				if (child instanceof Potree.PointCloudOctreeNode && child.sceneNode.visible && visibleNodes.indexOf(child) >= 0) {
					children.push(child);
				}
			}
			children.sort(function (a, b) {
				if (a.geometryNode.name < b.geometryNode.name) return -1;
				if (a.geometryNode.name > b.geometryNode.name) return 1;
				return 0;
			});

			data[i * 3 + 0] = 0;
			data[i * 3 + 1] = 0;
			data[i * 3 + 2] = 0;
			for (let j = 0; j < children.length; j++) {
				let child = children[j];
				let index = parseInt(child.geometryNode.name.substr(-1));
				data[i * 3 + 0] += Math.pow(2, index);

				if (j === 0) {
					let vArrayIndex = visibleNodes.indexOf(child);
					data[i * 3 + 1] = (vArrayIndex - i) >> 8;
					data[i * 3 + 2] = (vArrayIndex - i) % 256;
				}
			}
		}

		texture.needsUpdate = true;
	}

	nodeIntersectsProfile (node, profile) {
		let bbWorld = node.boundingBox.clone().applyMatrix4(this.matrixWorld);
		let bsWorld = bbWorld.getBoundingSphere();

		for (let i = 0; i < profile.points.length - 1; i++) {
			let start = new THREE.Vector3(profile.points[i].x, bsWorld.center.y, profile.points[i].z);
			let end = new THREE.Vector3(profile.points[i + 1].x, bsWorld.center.y, profile.points[i + 1].z);

			let ray1 = new THREE.Ray(start, new THREE.Vector3().subVectors(end, start).normalize());
			let ray2 = new THREE.Ray(end, new THREE.Vector3().subVectors(start, end).normalize());

			if (ray1.intersectsSphere(bsWorld) && ray2.intersectsSphere(bsWorld)) {
				return true;
			}
		}

		return false;
	}

	nodesOnRay (nodes, ray) {
		let nodesOnRay = [];

		let _ray = ray.clone();
		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];
			// var inverseWorld = new THREE.Matrix4().getInverse(node.matrixWorld);
			// let sphere = node.getBoundingSphere().clone().applyMatrix4(node.sceneNode.matrixWorld);
			let sphere = node.getBoundingSphere().clone().applyMatrix4(this.matrixWorld);

			if (_ray.intersectsSphere(sphere)) {
				nodesOnRay.push(node);
			}
		}

		return nodesOnRay;
	}

	updateMatrixWorld (force) {
		if (this.matrixAutoUpdate === true) this.updateMatrix();

		if (this.matrixWorldNeedsUpdate === true || force === true) {
			if (!this.parent) {
				this.matrixWorld.copy(this.matrix);
			} else {
				this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrix);
			}

			this.matrixWorldNeedsUpdate = false;

			force = true;
		}
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
			let object = stack.shift();

			object.visible = false;

			for (let i = 0; i < object.children.length; i++) {
				let child = object.children[i];
				if (child.visible) {
					stack.push(child);
				}
			}
		}
	}

	moveToOrigin () {
		this.position.set(0, 0, 0);
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.set(0, 0, 0).sub(tBox.getCenter());
	};

	moveToGroundPlane () {
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);
		this.position.y += -tBox.min.y;
	};

	getBoundingBoxWorld () {
		this.updateMatrixWorld(true);
		let box = this.boundingBox;
		let transform = this.matrixWorld;
		let tBox = Potree.utils.computeTransformedBoundingBox(box, transform);

		return tBox;
	};

	/**
	 * returns points inside the profile points
	 *
	 * maxDepth:		search points up to the given octree depth
	 *
	 *
	 * The return value is an array with all segments of the profile path
	 *  var segment = {
	 * 		start: 	THREE.Vector3,
	 * 		end: 	THREE.Vector3,
	 * 		points: {}
	 * 		project: function()
	 *  };
	 *
	 * The project() function inside each segment can be used to transform
	 * that segments point coordinates to line up along the x-axis.
	 *
	 *
	 */
	getPointsInProfile (profile, maxDepth, callback) {
		if (callback) {
			let request = new Potree.ProfileRequest(this, profile, maxDepth, callback);
			this.profileRequests.push(request);

			return request;
		}

		let points = {
			segments: [],
			boundingBox: new THREE.Box3(),
			projectedBoundingBox: new THREE.Box2()
		};

		// evaluate segments
		for (let i = 0; i < profile.points.length - 1; i++) {
			let start = profile.points[i];
			let end = profile.points[i + 1];
			let ps = this.getProfile(start, end, profile.width, maxDepth);

			let segment = {
				start: start,
				end: end,
				points: ps,
				project: null
			};

			points.segments.push(segment);

			points.boundingBox.expandByPoint(ps.boundingBox.min);
			points.boundingBox.expandByPoint(ps.boundingBox.max);
		}

		// add projection functions to the segments
		let mileage = new THREE.Vector3();
		for (let i = 0; i < points.segments.length; i++) {
			let segment = points.segments[i];
			let start = segment.start;
			let end = segment.end;

			let project = (function (_start, _end, _mileage, _boundingBox) {
				let start = _start;
				let end = _end;
				let mileage = _mileage;
				let boundingBox = _boundingBox;

				let xAxis = new THREE.Vector3(1, 0, 0);
				let dir = new THREE.Vector3().subVectors(end, start);
				dir.y = 0;
				dir.normalize();
				let alpha = Math.acos(xAxis.dot(dir));
				if (dir.z > 0) {
					alpha = -alpha;
				}

				return function (position) {
					let toOrigin = new THREE.Matrix4().makeTranslation(-start.x, -boundingBox.min.y, -start.z);
					let alignWithX = new THREE.Matrix4().makeRotationY(-alpha);
					let applyMileage = new THREE.Matrix4().makeTranslation(mileage.x, 0, 0);

					let pos = position.clone();
					pos.applyMatrix4(toOrigin);
					pos.applyMatrix4(alignWithX);
					pos.applyMatrix4(applyMileage);

					return pos;
				};
			}(start, end, mileage.clone(), points.boundingBox.clone()));

			segment.project = project;

			mileage.x += new THREE.Vector3(start.x, 0, start.z).distanceTo(new THREE.Vector3(end.x, 0, end.z));
			mileage.y += end.y - start.y;
		}

		points.projectedBoundingBox.min.x = 0;
		points.projectedBoundingBox.min.y = points.boundingBox.min.y;
		points.projectedBoundingBox.max.x = mileage.x;
		points.projectedBoundingBox.max.y = points.boundingBox.max.y;

		return points;
	}

	/**
	 * returns points inside the given profile bounds.
	 *
	 * start:
	 * end:
	 * width:
	 * depth:		search points up to the given octree depth
	 * callback:	if specified, points are loaded before searching
	 *
	 *
	 */
	getProfile (start, end, width, depth, callback) {
		let request = new Potree.ProfileRequest(start, end, width, depth, callback);
		this.profileRequests.push(request);
	};

	getVisibleExtent () {
		return this.visibleBounds.applyMatrix4(this.matrixWorld);
	};

	/**
	 *
	 *
	 *
	 * params.pickWindowSize:	Look for points inside a pixel window of this size.
	 * 							Use odd values: 1, 3, 5, ...
	 *
	 *
	 * TODO: only draw pixels that are actually read with readPixels().
	 *
	 */
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
	};

	get progress () {
		return this.visibleNodes.length / this.visibleGeometry.length;
	}
};
