const EyeDomeLightingMaterial = require('../materials/EyeDomeLightingMaterial');
const THREE = require('three');
const screenPass = require('../utils/screenPass');
const PointCloudSM = require('../utils/PointCloudSM');
const GLQueries = require('../webgl/GLQueries');

class EDLRenderer {
	constructor (viewer) {
		this.viewer = viewer;

		this.edlMaterial = null;

		this.rtColor = null;
		this.gl = viewer.renderer.context;

		// TODO obsolete?
		// this.initEDL = this.initEDL.bind(this);
		// this.resize = this.resize.bind(this);
		// this.render = this.render.bind(this);

		this.shadowMap = new PointCloudSM(this.viewer.pRenderer);
	}

	initEDL () {
		if (this.edlMaterial != null) {
			return;
		}

		this.edlMaterial = new EyeDomeLightingMaterial();
		this.edlMaterial.depthTest = true;
		this.edlMaterial.depthWrite = true;
		this.edlMaterial.transparent = true;

		this.rtColor = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});
		// {
		// 	let geometry = new THREE.PlaneBufferGeometry(10, 10, 32);
		// 	let material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: this.shadowMap.target.texture});
		// 	let plane = new THREE.Mesh(geometry, material);
		// 	plane.position.z = 0.2;
		// 	plane.position.y = 20;
		// 	this.viewer.scene.scene.add(plane);
		// }
	};

	resize () {
		const viewer = this.viewer;
		let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
		let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
		let aspect = width / height;

		viewer.scene.cameraP.aspect = aspect;
		viewer.scene.cameraP.updateProjectionMatrix();

		let frustumScale = viewer.moveSpeed * 2.0;
		viewer.scene.cameraO.left = -frustumScale;
		viewer.scene.cameraO.right = frustumScale;
		viewer.scene.cameraO.top = frustumScale * 1 / aspect;
		viewer.scene.cameraO.bottom = -frustumScale * 1 / aspect;
		viewer.scene.cameraO.updateProjectionMatrix();

		viewer.scene.cameraScreenSpace.top = 1 / aspect;
		viewer.scene.cameraScreenSpace.bottom = -1 / aspect;
		viewer.scene.cameraScreenSpace.updateProjectionMatrix();

		viewer.renderer.setSize(width, height);
		this.rtColor.setSize(width, height);
	}

	render () {
		this.initEDL();
		const viewer = this.viewer;

		this.resize();

		let camera = viewer.scene.getActiveCamera();
		let lights = [];
		viewer.scene.scene.traverse(node => {
			if (node instanceof THREE.PointLight) {
				lights.push(node);
			}
		});

		let querySkybox = GLQueries.forGL(viewer.renderer.getContext()).start('EDL - Skybox');

		if (viewer.background === 'skybox') {
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		} else if (viewer.background === 'gradient') {
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		} else if (viewer.background === 'black') {
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		} else if (viewer.background === 'white') {
			viewer.renderer.setClearColor(0xFFFFFF, 0);
			viewer.renderer.clear();
		} else {
			viewer.renderer.setClearColor(0xFF0000, 0);
			viewer.renderer.clear();
		}

		GLQueries.forGL(viewer.renderer.getContext()).end(querySkybox);

		// TODO adapt to multiple lights
		if (lights.length > 0 && !(lights[0].disableShadowUpdates)) {
			let light = lights[0];
			let queryShadows = GLQueries.forGL(viewer.renderer.getContext()).start('EDL - shadows');

			this.shadowMap.setLightPos(light.position);

			for (let octree of viewer.scene.pointclouds) {
				this.shadowMap.renderOctree(octree, octree.visibleNodes);
			}

			viewer.shadowTestCam.updateMatrixWorld();
			viewer.shadowTestCam.matrixWorldInverse.getInverse(viewer.shadowTestCam.matrixWorld);
			viewer.shadowTestCam.updateProjectionMatrix();

			GLQueries.forGL(viewer.renderer.getContext()).end(queryShadows);
		}

		let queryColors = GLQueries.forGL(viewer.renderer.getContext()).start('EDL - colorpass');

		viewer.measuringTool.update();
		viewer.profileTool.update();
		viewer.transformationTool.update();
		viewer.volumeTool.update();

		viewer.renderer.render(viewer.scene.scene, camera);

		viewer.renderer.clearTarget(this.rtColor, true, true, true);

		let width = viewer.renderArea.clientWidth;
		let height = viewer.renderArea.clientHeight;

		// COLOR & DEPTH PASS
		for (let pointcloud of viewer.scene.pointclouds) {
			let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

			let material = pointcloud.material;
			material.weighted = false;
			material.useLogarithmicDepthBuffer = false;
			material.useEDL = true;

			material.screenWidth = width;
			material.screenHeight = height;
			material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
			material.uniforms.octreeSize.value = octreeSize;
			material.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
		}

		// TODO adapt to multiple lights
		if (lights.length > 0) {
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtColor, {
				shadowMaps: [this.shadowMap]
			});
		} else {
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtColor, {});
		}

		viewer.renderer.render(viewer.scene.scene, camera, this.rtColor);
		GLQueries.forGL(viewer.renderer.getContext()).end(queryColors);

		{ // EDL OCCLUSION PASS
			let queryEDL = GLQueries.forGL(viewer.renderer.getContext()).start('EDL - resolve');

			this.edlMaterial.uniforms.screenWidth.value = width;
			this.edlMaterial.uniforms.screenHeight.value = height;
			this.edlMaterial.uniforms.colorMap.value = this.rtColor.texture;
			this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
			this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
			this.edlMaterial.uniforms.opacity.value = 1;
			this.edlMaterial.depthTest = true;
			this.edlMaterial.depthWrite = true;
			this.edlMaterial.transparent = true;

			screenPass.render(viewer.renderer, this.edlMaterial);

			GLQueries.forGL(viewer.renderer.getContext()).end(queryEDL);
		}

		let queryRest = GLQueries.forGL(viewer.renderer.getContext()).start('EDL - rest');

		viewer.renderer.clearDepth();
		viewer.renderer.render(viewer.controls.sceneControls, camera);

		viewer.renderer.render(viewer.measuringTool.sceneMeasurement, camera);
		viewer.renderer.render(viewer.volumeTool.sceneVolume, camera);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.profileTool.sceneProfile, camera);
		viewer.renderer.render(viewer.transformationTool.sceneTransform, camera);

		viewer.renderer.setViewport(
			viewer.renderer.domElement.clientWidth - viewer.navigationCube.width,
			viewer.renderer.domElement.clientHeight - viewer.navigationCube.width,
			viewer.navigationCube.width,
			viewer.navigationCube.width
		);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);
		viewer.renderer.setViewport(0, 0, viewer.renderer.domElement.clientWidth, viewer.renderer.domElement.clientHeight);

		GLQueries.forGL(viewer.renderer.getContext()).end(queryRest);
	}
};

module.exports = EDLRenderer;
