

class HQSplatRenderer {
	constructor (viewer) {
		this.viewer = viewer;

		this.depthMaterial = null;
		this.attributeMaterial = null;
		this.normalizationMaterial = null;

		this.rtDepth = null;
		this.rtAttribute = null;
		this.gl = viewer.renderer.context;
	}

	init(){
		if (this.depthMaterial != null) {
			return;
		}

		this.depthMaterial = new Potree.PointCloudMaterial();
		this.attributeMaterial = new Potree.PointCloudMaterial();

		this.normalizationMaterial = new Potree.NormalizationMaterial();
		this.normalizationMaterial.depthTest = true;
		this.normalizationMaterial.depthWrite = true;
		this.normalizationMaterial.transparent = true;

		this.rtDepth = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});

		this.rtAttribute = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});
		
		{
			let geometry = new THREE.PlaneBufferGeometry( 1, 1, 32, 32);
			let material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map: this.rtDepth.texture} );
			let plane = new THREE.Mesh( geometry, material );
			plane.scale.set(0.3, 0.3, 1.0);
			plane.position.set(plane.scale.x / 2, plane.scale.y / 2, 0);
			this.viewer.overlay.add(plane);
		}
	};

	resize () {
		const viewer = this.viewer;

		let pixelRatio = viewer.renderer.getPixelRatio();
		let width = viewer.renderer.getSize().width;
		let height = viewer.renderer.getSize().height;
		this.rtDepth.setSize(width * pixelRatio , height * pixelRatio);
		this.rtAttribute.setSize(width * pixelRatio , height * pixelRatio);
	}

	render () {
		this.init();
		const viewer = this.viewer;

		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

		this.resize();

		let camera = viewer.scene.getActiveCamera();

		viewer.renderer.render(viewer.scene.scene, camera);
		
		viewer.renderer.clearTarget( this.rtDepth, true, true, true );
		viewer.renderer.clearTarget( this.rtAttribute, true, true, true );

		let width = viewer.renderer.getSize().width;
		let height = viewer.renderer.getSize().height;

		{ // DEPTH PASS
			for (let pointcloud of viewer.scene.pointclouds) {
				let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

				this.depthMaterial.pointSizeType = pointcloud.material.pointSizeType;
				this.depthMaterial.visibleNodesTexture = pointcloud.material.visibleNodesTexture;
				this.depthMaterial.weighted = false;
				this.depthMaterial.useLogarithmicDepthBuffer = false;
				this.depthMaterial.screenWidth = width;
				this.depthMaterial.screenHeight = height;
				this.depthMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				this.depthMaterial.uniforms.octreeSize.value = octreeSize;
				this.depthMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
			}
			
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtDepth, {
				material: this.depthMaterial
			});
		}

		{ // ATTRIBUTE PASS
			for (let pointcloud of viewer.scene.pointclouds) {
				let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

				this.attributeMaterial.pointSizeType = pointcloud.material.pointSizeType;
				this.attributeMaterial.visibleNodesTexture = pointcloud.material.visibleNodesTexture;
				this.attributeMaterial.weighted = true;
				this.attributeMaterial.useLogarithmicDepthBuffer = false;
				this.attributeMaterial.screenWidth = width;
				this.attributeMaterial.screenHeight = height;
				this.attributeMaterial.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				this.attributeMaterial.uniforms.octreeSize.value = octreeSize;
				this.attributeMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
			}
			
			let gl = this.gl;
			//gl.enable(gl.BLEND);
			//gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtAttribute, {
				material: this.attributeMaterial,
				blendFunc: [gl.SRC_ALPHA, gl.ONE]
			});

			//gl.disable(gl.BLEND);
		}

		{ // NORMALIZATION PASS
			this.normalizationMaterial.uniforms.uWeightMap.value = this.rtAttribute.texture;
			this.normalizationMaterial.uniforms.uDepthMap.value = this.rtAttribute.depthTexture;
			
			Potree.utils.screenPass.render(viewer.renderer, this.normalizationMaterial);
		}

		viewer.renderer.clearDepth();

		viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

		viewer.renderer.render(viewer.controls.sceneControls, camera);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.transformationTool.scene, camera);
		
		viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});

	}
};

