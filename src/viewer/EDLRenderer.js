

class EDLRenderer{
	constructor(viewer){
		this.viewer = viewer;

		this.edlMaterial = null;

		this.rtRegular = [];
		this.rtEDL = [];

		this.gl = viewer.renderer.context;

		this.shadowMaps = [];
		this.viewer.pRenderers.forEach((pRenderer) => {
			this.shadowMaps.push(new Potree.PointCloudSM(pRenderer));
		});
	}

	initEDL(){
		if (this.edlMaterial != null) {
			return;
		}

		this.edlMaterial = new Potree.EyeDomeLightingMaterial();
		this.edlMaterial.depthTest = true;
		this.edlMaterial.depthWrite = true;
		this.edlMaterial.transparent = true;

		this.viewer.renderers.forEach((_, i) => {
			this.rtEDL[i] = new THREE.WebGLRenderTarget(1024, 1024, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				type: THREE.FloatType,
				depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
			});

			this.rtRegular[i] = new THREE.WebGLRenderTarget(1024, 1024, {
				minFilter: THREE.NearestFilter,
				magFilter: THREE.NearestFilter,
				format: THREE.RGBAFormat,
				depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
			});
		});
	};

	resize(){
		const viewer = this.viewer;

		viewer.renderers.forEach((renderer, index) => {
			let pixelRatio = renderer.getPixelRatio();
			let {width, height} = renderer.getSize();

			if(this.screenshot){
				width = this.screenshot.target.width;
				height = this.screenshot.target.height;
			}

			this.rtEDL[index].setSize(width * pixelRatio , height * pixelRatio);
			this.rtRegular[index].setSize(width * pixelRatio , height * pixelRatio);
		});
	}

	makeScreenshot(camera, size, callback){

		if(camera === undefined || camera === null){
			camera = this.viewer.scene.getActiveCamera();
		}

		if(size === undefined || size === null){
			size = this.viewer.renderer.getSize();
		}

		let {width, height} = size;

		width = 2 * width;
		height = 2 * height;

		let target = new THREE.WebGLRenderTarget(width, height, {
			format: THREE.RGBAFormat,
		});

		this.screenshot = {
			target: target
		};

		this.viewer.renderer.clearTarget(target, true, true, true);

		this.render();

		let pixelCount = width * height;
		let buffer = new Uint8Array(4 * pixelCount);

		this.viewer.renderer.readRenderTargetPixels(target, 0, 0, width, height, buffer);

		// flip vertically
		let bytesPerLine = width * 4;
		for(let i = 0; i < parseInt(height / 2); i++){
			let j = height - i - 1;

			let lineI = buffer.slice(i * bytesPerLine, i * bytesPerLine + bytesPerLine);
			let lineJ = buffer.slice(j * bytesPerLine, j * bytesPerLine + bytesPerLine);
			buffer.set(lineJ, i * bytesPerLine);
			buffer.set(lineI, j * bytesPerLine);
		}

		this.screenshot.target.dispose();
		delete this.screenshot;

		return {
			width: width,
			height: height,
			buffer: buffer
		};
	}

	render(){
		this.initEDL();
		const viewer = this.viewer;

		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

		this.resize();

		if(this.screenshot){
			let oldBudget = Potree.pointBudget;
			Potree.pointBudget = Math.max(10 * 1000 * 1000, 2 * oldBudget);
			let result = Potree.updatePointClouds(
				viewer.scene.pointclouds, 
				viewer.scene.getActiveCamera(), 
				viewer.renderer);
			Potree.pointBudget = oldBudget;
		}

		let camera = viewer.scene.getActiveCamera();

		let lights = [];
		viewer.scene.scene.traverse(node => {
			if(node instanceof THREE.SpotLight){
				lights.push(node);
			}
		});

		// TODO adapt to multiple lights
		if(lights.length > 0 && !(lights[0].disableShadowUpdates)){
			let light = lights[0];

			let queryShadows = Potree.startQuery('EDL - shadows', viewer.renderer.getContext());

			this.shadowMaps[index].setLight(light);

			let originalAttributes = new Map();
			for(let pointcloud of viewer.scene.pointclouds){
				originalAttributes.set(pointcloud, pointcloud.material.pointColorType);
				pointcloud.material.disableEvents();
				pointcloud.material.pointColorType = Potree.PointColorType.DEPTH;
			}

			this.shadowMaps[index].render(viewer.scene.scenePointCloud, camera);

			for(let pointcloud of viewer.scene.pointclouds){
				let originalAttribute = originalAttributes.get(pointcloud);
				pointcloud.material.pointColorType = originalAttribute;
				pointcloud.material.enableEvents();
			}

			viewer.shadowTestCam.updateMatrixWorld();
			viewer.shadowTestCam.matrixWorldInverse.getInverse(viewer.shadowTestCam.matrixWorld);
			viewer.shadowTestCam.updateProjectionMatrix();

			Potree.endQuery(queryShadows, viewer.renderer.getContext());
		}

		let width = viewer.renderer.getSize().width;
		let height = viewer.renderer.getSize().height;

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
		
		// Loop through all renderers
		viewer.renderers.forEach((renderer, index) => {
			// Render background
			let querySkybox = Potree.startQuery('EDL - Skybox', renderer.getContext());

			if(viewer.background === "skybox"){
				renderer.setClearColor(0x000000, 0);
				renderer.clear();
				viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
				viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
				viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
				viewer.skybox.camera.updateProjectionMatrix();
				renderer.render(viewer.skybox.scene, viewer.skybox.camera);
			} else if (viewer.background === 'gradient') {
				renderer.setClearColor(0x000000, 0);
				renderer.clear();
				renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
			} else if (viewer.background === 'black') {
				renderer.setClearColor(0x000000, 1);
				renderer.clear();
			} else if (viewer.background === 'white') {
				renderer.setClearColor(0xFFFFFF, 1);
				renderer.clear();
			} else {
				renderer.setClearColor(0x000000, 0);
				renderer.clear();
			}

			Potree.endQuery(querySkybox, renderer.getContext());

			let queryColors = Potree.startQuery('EDL - colorpass', renderer.getContext());

			let cameraInstance = viewer.scene.getActiveCamera(index);
			
			renderer.render(viewer.scene.scene, cameraInstance);

			// Clear point clouds before next render
			renderer.clearTarget(this.rtEDL[index], true, true, true);
			renderer.clearTarget(this.rtRegular[index], true, true, false);

			// TODO adapt to multiple lights
			if(lights.length > 0) {
				viewer.pRenderers[index].render(viewer.scene.scenePointCloud, cameraInstance, this.rtEDL[index], {
					shadowMaps: [this.shadowMaps[index]],
					transparent: false,
				});
			} else {
				// Render only point clouds for the current view
				viewer.pRenderers[index].render(viewer.scene.scenePointClouds[index], cameraInstance, this.rtEDL[index], {
					transparent: false,
				});
			}

			viewer.dispatchEvent({type: "render.pass.scene", viewer, renderTarget: this.rtRegular[index]});

			Potree.endQuery(queryColors, renderer.getContext());

			{ // EDL OCCLUSION PASS
				let queryEDL = Potree.startQuery('EDL - resolve', renderer.getContext());
	
				this.edlMaterial.uniforms.screenWidth.value = width;
				this.edlMaterial.uniforms.screenHeight.value = height;

				this.edlMaterial.uniforms.uRegularColor.value = this.rtRegular[index].texture;
				this.edlMaterial.uniforms.uEDLColor.value = this.rtEDL[index].texture;
				this.edlMaterial.uniforms.uRegularDepth.value = this.rtRegular[index].depthTexture;
				this.edlMaterial.uniforms.uEDLDepth.value = this.rtEDL[index].depthTexture;
	
				this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
				this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
				this.edlMaterial.uniforms.opacity.value = 1;
				
				Potree.utils.screenPass.render(renderer, this.edlMaterial);
	
				if(this.screenshot){
					Potree.utils.screenPass.render(renderer, this.edlMaterial, this.screenshot.target);
				}
	
				Potree.endQuery(queryEDL, renderer.getContext());
			}

			let queryRest = Potree.startQuery('EDL - rest', renderer.getContext());

			renderer.clearDepth();

			viewer.transformationTool.update();

			viewer.dispatchEvent({type: "render.pass.perspective_overlay", viewer });

			renderer.render(viewer.clippingTool.sceneVolume, camera);
			renderer.render(viewer.transformationTool.scene, camera);
			
			renderer.setViewport(width - viewer.navigationCube.width, 
										height - viewer.navigationCube.width, 
										viewer.navigationCube.width, viewer.navigationCube.width);
			renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
			renderer.setViewport(0, 0, width, height);

			viewer.dispatchEvent({ type: "render.pass.end", viewer });

			Potree.endQuery(queryRest, renderer.getContext());
		});
	}
};
