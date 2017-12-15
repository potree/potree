const THREE = require('three');
const EyeDomeLightingMaterial = require('../materials/EyeDomeLightingMaterial');
const screenPass = require('../utils/screenPass');

class RepRenderer {
	constructor (viewer) {
		this.viewer = viewer;

		this.edlMaterial = null;
		this.attributeMaterials = [];

		this.rtColor = null;
		this.gl = viewer.renderer.context;

		this.initEDL = this.initEDL.bind(this);
		this.resize = this.resize.bind(this);
		this.render = this.render.bind(this);

		this.snapshotRequested = false;

		this.snap = {
			target: null,
			matrix: null
		};
	}

	initEDL () {
		if (this.edlMaterial != null) {
			return;
		}

		// var depthTextureExt = gl.getExtension("WEBGL_depth_texture");

		this.edlMaterial = new EyeDomeLightingMaterial();

		this.rtColor = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.rtColor.depthTexture = new THREE.DepthTexture();
		this.rtColor.depthTexture.type = THREE.UnsignedIntType;

		this.rtShadow = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.rtShadow.depthTexture = new THREE.DepthTexture();
		this.rtShadow.depthTexture.type = THREE.UnsignedIntType;

		this.snap.target = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.snap.target.generateMipMaps = false;

		{
			let geometry = new THREE.PlaneBufferGeometry(10, 7, 32);
			let material = new THREE.MeshBasicMaterial({side: THREE.DoubleSide, map: this.snap.target.texture});
			let plane = new THREE.Mesh(geometry, material);
			plane.position.z = 0.2;
			plane.position.y = -1;
			this.viewer.scene.scene.add(plane);
		}
	};

	resize () {
		const viewer = this.viewer;
		let width = this.viewer.scaleFactor * this.viewer.renderArea.clientWidth;
		let height = this.viewer.scaleFactor * this.viewer.renderArea.clientHeight;
		let aspect = width / height;

		let needsResize = (this.rtColor.width !== width || this.rtColor.height !== height);

		// disposal will be unnecessary once this fix made it into three.js master:
		// https://github.com/mrdoob/three.js/pull/6355
		if (needsResize) {
			this.rtColor.dispose();
			this.snap.target.dispose();
		}

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
		this.snap.target.setSize(width, height);
	}

	makeSnapshot () {
		this.snapshotRequested = true;
	}

	render () {
		this.initEDL();
		const viewer = this.viewer;

		this.resize();

		let camera = viewer.scene.getActiveCamera();

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
		}

		viewer.measuringTool.update();
		viewer.profileTool.update();
		viewer.transformationTool.update();
		viewer.volumeTool.update();

		viewer.renderer.render(viewer.scene.scene, camera);

		viewer.renderer.clearTarget(this.rtShadow, true, true, true);
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

		viewer.shadowTestCam.updateMatrixWorld();
		viewer.shadowTestCam.matrixWorldInverse.getInverse(viewer.shadowTestCam.matrixWorld);
		viewer.shadowTestCam.updateProjectionMatrix();

		// viewer.pRenderer.render(viewer.scene.scenePointCloud, viewer.shadowTestCam, this.rtShadow);

		if (this.snapshotRequested || !this.snap.camera) {
			viewer.renderer.clearTarget(this.snap.target, true, true, true);
			viewer.renderer.setRenderTarget(this.snap.target);
			camera.updateProjectionMatrix();
			this.snap.camera = camera.clone();
			for (const octree of viewer.scene.pointclouds) {
				octree.material.snapEnabled = false;
				octree.material.needsUpdate = true;
				viewer.pRenderer.renderOctree(octree, octree.visibleNodes, camera, this.snap.target, {});
			}
			this.snapshotRequested = false;
		}

		viewer.renderer.clearTarget(this.rtColor, true, true, true);
		viewer.renderer.setRenderTarget(this.rtColor);
		for (const octree of viewer.scene.pointclouds) {
			octree.material.snapEnabled = true;
			octree.material.needsUpdate = true;
			octree.material.uniforms.snapshot.value = this.snap.target.texture;
			octree.material.uniforms.snapView.value = this.snap.camera.matrixWorldInverse;
			octree.material.uniforms.snapProj.value = this.snap.camera.projectionMatrix;

			// let nodes = octree.visibleNodes.slice(0, 10);
			let nodes = octree.visibleNodes;
			viewer.pRenderer.renderOctree(octree, nodes, camera, this.rtColor, {});
		}

		// viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtColor, {
		//	shadowMaps: [{map: this.rtShadow, camera: viewer.shadowTestCam}]
		// });

		// viewer.renderer.render(viewer.scene.scene, camera, this.rtColor);

		{ // EDL OCCLUSION PASS
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
		}

		viewer.renderer.clearDepth();
		viewer.renderer.render(viewer.controls.sceneControls, camera);

		viewer.renderer.render(viewer.measuringTool.sceneMeasurement, camera);
		viewer.renderer.render(viewer.volumeTool.sceneVolume, camera);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.profileTool.sceneProfile, camera);
		viewer.renderer.render(viewer.transformationTool.sceneTransform, camera);

		viewer.renderer.setViewport(viewer.renderer.domElement.clientWidth - viewer.navigationCube.width,
			viewer.renderer.domElement.clientHeight - viewer.navigationCube.width,
			viewer.navigationCube.width, viewer.navigationCube.width);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);
		viewer.renderer.setViewport(0, 0, viewer.renderer.domElement.clientWidth, viewer.renderer.domElement.clientHeight);
	}
};

module.exports = RepRenderer;
