const updateVisibilityStructures = require('./updateVisibilityStructures');
const THREE = require('three');
const context = require('context');
const ClipMode = require('./materials/ClipMode');
const Box3Helper = require('./utils/Box3Helper');
const DEM = require('./tree/DEM');

module.exports = function (pointclouds, camera, renderer) {
	// TODO: unused: let numVisibleNodes = 0;
	let numVisiblePoints = 0;

	let visibleNodes = [];
	let visibleGeometry = [];
	let unloadedGeometry = [];

	let lowestSpacing = Infinity;

	// calculate object space frustum and cam pos and setup priority queue
	let s = updateVisibilityStructures(pointclouds, camera, renderer);
	let frustums = s.frustums;
	let camObjPositions = s.camObjPositions;
	let priorityQueue = s.priorityQueue;

	let loadedToGPUThisFrame = 0;

	while (priorityQueue.size() > 0) {
		let element = priorityQueue.pop();
		let node = element.node;
		let parent = element.parent;
		let pointcloud = pointclouds[element.pointcloud];

		// { // restrict to certain nodes for debugging
		//	let allowedNodes = ["r", "r0", "r4"];
		//	if(!allowedNodes.includes(node.name)){
		//		continue;
		//	}
		// }

		let box = node.getBoundingBox();
		let frustum = frustums[element.pointcloud];
		let camObjPos = camObjPositions[element.pointcloud];

		let insideFrustum = frustum.intersectsBox(box);
		let maxLevel = pointcloud.maxLevel || Infinity;
		let level = node.getLevel();
		let visible = insideFrustum;
		visible = visible && !(numVisiblePoints + node.getNumPoints() > contet.pointBudget);
		visible = visible && level < maxLevel;

		if (pointcloud.material.numClipBoxes > 0 && visible && pointcloud.material.clipMode === ClipMode.CLIP_OUTSIDE) {
			let box2 = box.clone();
			pointcloud.updateMatrixWorld(true);
			box2.applyMatrix4(pointcloud.matrixWorld);
			let intersectsClipBoxes = false;
			for (let clipBox of pointcloud.material.clipBoxes) {
				let clipMatrixWorld = clipBox.matrix;
				let clipBoxWorld = new THREE.Box3(
					new THREE.Vector3(-0.5, -0.5, -0.5),
					new THREE.Vector3(0.5, 0.5, 0.5)
				).applyMatrix4(clipMatrixWorld);
				if (box2.intersectsBox(clipBoxWorld)) {
					intersectsClipBoxes = true;
					break;
				}
			}
			visible = visible && intersectsClipBoxes;
		}

		// visible = ["r", "r0", "r06", "r060"].includes(node.name);
		// visible = ["r"].includes(node.name);

		if (node.spacing) {
			lowestSpacing = Math.min(lowestSpacing, node.spacing);
		} else if (node.geometryNode && node.geometryNode.spacing) {
			lowestSpacing = Math.min(lowestSpacing, node.geometryNode.spacing);
		}

		if (numVisiblePoints + node.getNumPoints() > context.pointBudget) {
			break;
		}

		if (!visible) {
			continue;
		}

		// TODO: not used, same as the declaration?
		// numVisibleNodes++;
		numVisiblePoints += node.getNumPoints();

		pointcloud.numVisibleNodes++;
		pointcloud.numVisiblePoints += node.getNumPoints();

		if (node.isGeometryNode() && (!parent || parent.isTreeNode())) {
			if (node.isLoaded() && loadedToGPUThisFrame < 2) {
				node = pointcloud.toTreeNode(node, parent);
				loadedToGPUThisFrame++;
			} else {
				unloadedGeometry.push(node);
				visibleGeometry.push(node);
			}
		}

		if (node.isTreeNode()) {
			context.getLRU().touch(node.geometryNode);
			node.sceneNode.visible = true;
			node.sceneNode.material = pointcloud.material;

			visibleNodes.push(node);
			pointcloud.visibleNodes.push(node);

			node.sceneNode.updateMatrix();
			node.sceneNode.matrixWorld.multiplyMatrices(pointcloud.matrixWorld, node.sceneNode.matrix);

			if (pointcloud.showBoundingBox && !node.boundingBoxNode && node.getBoundingBox) {
				let boxHelper = new Box3Helper(node.getBoundingBox());
				// let boxHelper = new THREE.BoxHelper(node.sceneNode);
				pointcloud.add(boxHelper);
				pointcloud.boundingBoxNodes.push(boxHelper);
				node.boundingBoxNode = boxHelper;
				node.boundingBoxNode.matrixWorld.copy(pointcloud.matrixWorld);
			} else if (pointcloud.showBoundingBox) {
				node.boundingBoxNode.visible = true;
				node.boundingBoxNode.matrixWorld.copy(pointcloud.matrixWorld);
			} else if (!pointcloud.showBoundingBox && node.boundingBoxNode) {
				node.boundingBoxNode.visible = false;
			}
		}

		// add child nodes to priorityQueue
		let children = node.getChildren();
		for (let i = 0; i < children.length; i++) {
			let child = children[i];

			let weight = 0;
			if (camera.isPerspectiveCamera) {
				let sphere = child.getBoundingSphere();
				let distance = sphere.center.distanceTo(camObjPos);
				let radius = sphere.radius;

				let fov = (camera.fov * Math.PI) / 180;
				let slope = Math.tan(fov / 2);
				let projFactor = (0.5 * renderer.domElement.clientHeight) / (slope * distance);
				let screenPixelRadius = radius * projFactor;

				if (screenPixelRadius < pointcloud.minimumNodePixelSize) {
					continue;
				}

				weight = screenPixelRadius;

				if (distance - radius < 0) {
					weight = Number.MAX_VALUE;
				}
			} else {
				// TODO ortho visibility
				let bb = child.getBoundingBox();
				let distance = child.getBoundingSphere().center.distanceTo(camObjPos);
				let diagonal = bb.max.clone().sub(bb.min).length();
				weight = diagonal / distance;
			}

			priorityQueue.push({pointcloud: element.pointcloud, node: child, parent: node, weight: weight});
		}
	}// end priority queue loop

	{ // update DEM
		let maxDEMLevel = 4;
		let candidates = pointclouds
			.filter(p => (p.generateDEM && p.dem instanceof DEM));
		for (let pointcloud of candidates) {
			let updatingNodes = pointcloud.visibleNodes.filter(n => n.getLevel() <= maxDEMLevel);
			pointcloud.dem.update(updatingNodes);
		}
	}

	for (let i = 0; i < Math.min(5, unloadedGeometry.length); i++) {
		unloadedGeometry[i].load();
	}

	// for(let node of visibleNodes){
	//	let allowedNodes = ["r", "r0", "r4"];
	//	node.sceneNode.visible = allowedNodes.includes(node.geometryNode.name);
	//
	//	if(node.boundingBoxNode){
	//		node.boundingBoxNode.visible = node.boundingBoxNode.visible && node.sceneNode.visible;
	//	}
	// }

	// Potree.updateDEMs(renderer, visibleNodes);

	return {
		visibleNodes: visibleNodes,
		numVisiblePoints: numVisiblePoints,
		lowestSpacing: lowestSpacing
	};
};
