

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

		this.depthMaterial.setDefine("depth_pass", "#define hq_depth_pass");
		this.depthMaterial.setDefine("use_edl", "#define use_edl");

		this.normalizationMaterial = new Potree.NormalizationMaterial();
		this.normalizationMaterial.depthTest = true;
		this.normalizationMaterial.depthWrite = true;
		this.normalizationMaterial.transparent = true;

		this.normalizationEDLMaterial = new Potree.NormalizationEDLMaterial();
		this.normalizationEDLMaterial.depthTest = true;
		this.normalizationEDLMaterial.depthWrite = true;
		this.normalizationEDLMaterial.transparent = true;

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
			depthTexture: this.rtDepth.depthTexture,
			//depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});
		
		//{
		//	let geometry = new THREE.PlaneBufferGeometry( 1, 1, 32, 32);
		//	let material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map: this.rtDepth.texture} );
		//	let plane = new THREE.Mesh( geometry, material );
		//	plane.scale.set(0.3, 0.3, 1.0);
		//	plane.position.set(plane.scale.x / 2, plane.scale.y / 2, 0);
		//	this.viewer.overlay.add(plane);
		//}
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
		
		viewer.renderer.setClearColor(0x000000, 0);
		viewer.renderer.clearTarget( this.rtDepth, true, true, true );
		viewer.renderer.clearTarget( this.rtAttribute, true, true, true );

		let width = viewer.renderer.getSize().width;
		let height = viewer.renderer.getSize().height;

		let queryHQSplats = Potree.startQuery('HQSplats', viewer.renderer.getContext());

		{ // DEPTH PASS
			for (let pointcloud of viewer.scene.pointclouds) {
				let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

				let material = pointcloud.material;

				this.depthMaterial.size = material.size;
				this.depthMaterial.minSize = material.minSize;
				this.depthMaterial.maxSize = material.maxSize;

				this.depthMaterial.pointSizeType = material.pointSizeType;
				this.depthMaterial.visibleNodesTexture = material.visibleNodesTexture;
				this.depthMaterial.weighted = false;
				this.depthMaterial.screenWidth = width;
				this.depthMaterial.shape = Potree.PointShape.CIRCLE;
				this.depthMaterial.screenHeight = height;
				this.depthMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
				this.depthMaterial.uniforms.octreeSize.value = octreeSize;
				this.depthMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(...pointcloud.scale.toArray());
				this.depthMaterial.classification = material.classification;

				this.depthMaterial.clipTask = material.clipTask;
				this.depthMaterial.clipMethod = material.clipMethod;
				this.depthMaterial.setClipBoxes(material.clipBoxes);
				this.depthMaterial.setClipPolygons(material.clipPolygons);
			}
			
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtDepth, {
				material: this.depthMaterial
			});
		}

		{ // ATTRIBUTE PASS
			for (let pointcloud of viewer.scene.pointclouds) {
				let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize().x;

				let material = pointcloud.material;

				this.attributeMaterial.size = material.size;
				this.attributeMaterial.minSize = material.minSize;
				this.attributeMaterial.maxSize = material.maxSize;

				this.attributeMaterial.pointSizeType = material.pointSizeType;
				this.attributeMaterial.pointColorType = material.pointColorType;
				this.attributeMaterial.visibleNodesTexture = material.visibleNodesTexture;
				this.attributeMaterial.weighted = true;
				this.attributeMaterial.screenWidth = width;
				this.attributeMaterial.screenHeight = height;
				this.attributeMaterial.shape = Potree.PointShape.CIRCLE;
				this.attributeMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
				this.attributeMaterial.uniforms.octreeSize.value = octreeSize;
				this.attributeMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(...pointcloud.scale.toArray());
				this.attributeMaterial.classification = material.classification;
				this.attributeMaterial.elevationRange = material.elevationRange;
				this.attributeMaterial.gradient = material.gradient;

				this.attributeMaterial.intensityRange = material.intensityRange;
				this.attributeMaterial.intensityGamma = material.intensityGamma;
				this.attributeMaterial.intensityContrast = material.intensityContrast;
				this.attributeMaterial.intensityBrightness = material.intensityBrightness;

				this.attributeMaterial.rgbGamma = material.rgbGamma;
				this.attributeMaterial.rgbContrast = material.rgbContrast;
				this.attributeMaterial.rgbBrightness = material.rgbBrightness;

				this.attributeMaterial.weightRGB = material.weightRGB;
				this.attributeMaterial.weightIntensity = material.weightIntensity;
				this.attributeMaterial.weightElevation = material.weightElevation;
				this.attributeMaterial.weightRGB = material.weightRGB;
				this.attributeMaterial.weightClassification = material.weightClassification;
				this.attributeMaterial.weightReturnNumber = material.weightReturnNumber;
				this.attributeMaterial.weightSourceID = material.weightSourceID;

				this.attributeMaterial.color = material.color;



				this.attributeMaterial.clipTask = material.clipTask;
				this.attributeMaterial.clipMethod = material.clipMethod;
				this.attributeMaterial.setClipBoxes(material.clipBoxes);
				this.attributeMaterial.setClipPolygons(material.clipPolygons);

			}
			
			let gl = this.gl;

			viewer.renderer.setRenderTarget(null);
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtAttribute, {
				material: this.attributeMaterial,
				blendFunc: [gl.SRC_ALPHA, gl.ONE],
				//depthTest: false,
				depthWrite: false
			});
		}

		viewer.renderer.setRenderTarget(null);
		if(viewer.background === "skybox"){
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
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear();
		} else if (viewer.background === 'white') {
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear();
		} else {
			viewer.renderer.setClearColor(0xFF0000, 0);
			viewer.renderer.clear();
		}

		{ // NORMALIZATION PASS
			let normalizationMaterial = this.useEDL ? this.normalizationEDLMaterial : this.normalizationMaterial;

			if(this.useEDL){
				normalizationMaterial.uniforms.edlStrength.value = viewer.edlStrength;
				normalizationMaterial.uniforms.radius.value = viewer.edlRadius;
				normalizationMaterial.uniforms.screenWidth.value = width;
				normalizationMaterial.uniforms.screenHeight.value = height;
				normalizationMaterial.uniforms.uEDLMap.value = this.rtDepth.texture;
			}

			normalizationMaterial.uniforms.uWeightMap.value = this.rtAttribute.texture;
			normalizationMaterial.uniforms.uDepthMap.value = this.rtAttribute.depthTexture;
			
			Potree.utils.screenPass.render(viewer.renderer, normalizationMaterial);
		}

		viewer.renderer.render(viewer.scene.scene, camera);

		Potree.endQuery(queryHQSplats, viewer.renderer.getContext());

		viewer.renderer.clearDepth();

		viewer.transformationTool.update();

		viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

		viewer.renderer.render(viewer.controls.sceneControls, camera);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.transformationTool.scene, camera);

		viewer.renderer.setViewport(width - viewer.navigationCube.width, 
									height - viewer.navigationCube.width, 
									viewer.navigationCube.width, viewer.navigationCube.width);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		viewer.renderer.setViewport(0, 0, width, height);
		
		viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});

	}
};

