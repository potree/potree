

class EDLRenderer {
	constructor (viewer) {
		this.viewer = viewer;

		this.edlMaterial = null;

		this.rtColor = null;
		this.gl = viewer.renderer.context;

		// TODO obsolete?
		//this.initEDL = this.initEDL.bind(this);
		//this.resize = this.resize.bind(this);
		//this.render = this.render.bind(this);
		
		this.shadowMap = new Potree.PointCloudSM(this.viewer.pRenderer);
	}

	initEDL () {
		if (this.edlMaterial != null) {
			return;
		}

		this.edlMaterial = new Potree.EyeDomeLightingMaterial();
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
		
		//{
		//	let geometry = new THREE.PlaneBufferGeometry( 1, 1, 32, 32);
		//	let material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map: this.shadowMap.target.texture} );
		//	let plane = new THREE.Mesh( geometry, material );
		//	plane.scale.set(0.5, 0.5, 1.0);
		//	plane.position.set(plane.scale.x / 2, plane.scale.y / 2, 0);
		//	this.viewer.overlay.add(plane);
		//}
	};

	resize () {
		const viewer = this.viewer;

		let pixelRatio = viewer.renderer.getPixelRatio();
		let width = viewer.renderer.getSize().width;
		let height = viewer.renderer.getSize().height;
		this.rtColor.setSize(width * pixelRatio , height * pixelRatio);
	}

	render () {
		this.initEDL();
		const viewer = this.viewer;

		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

		this.resize();
		
		let camera = viewer.scene.getActiveCamera();

		let lights = [];
		viewer.scene.scene.traverse(node => {
			if(node instanceof THREE.PointLight){
				lights.push(node);
			}
		});

		let querySkybox = Potree.startQuery('EDL - Skybox', viewer.renderer.getContext());
		
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

		Potree.endQuery(querySkybox, viewer.renderer.getContext());

		// TODO adapt to multiple lights
		if(lights.length > 0 && !(lights[0].disableShadowUpdates)){
			let light = lights[0];

			let queryShadows = Potree.startQuery('EDL - shadows', viewer.renderer.getContext());

			this.shadowMap.setLightPos(light.position);

			for(let octree of viewer.scene.pointclouds){
				this.shadowMap.renderOctree(octree, octree.visibleNodes);
			}

			viewer.shadowTestCam.updateMatrixWorld();
			viewer.shadowTestCam.matrixWorldInverse.getInverse(viewer.shadowTestCam.matrixWorld);
			viewer.shadowTestCam.updateProjectionMatrix();

			Potree.endQuery(queryShadows, viewer.renderer.getContext());
		}

		let queryColors = Potree.startQuery('EDL - colorpass', viewer.renderer.getContext());

		viewer.transformationTool.update();
		viewer.renderer.render(viewer.scene.scene, camera);
		
		viewer.renderer.clearTarget( this.rtColor, true, true, true );

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
		
		// TODO adapt to multiple lights
		if(lights.length > 0){
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtColor, {
				shadowMaps: [this.shadowMap]
			});
		}else{
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtColor, {});
		}
		
		viewer.renderer.render(viewer.scene.scene, camera, this.rtColor);

		viewer.renderer.setRenderTarget(this.rtColor);
		viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer, renderTarget: this.rtColor});
		
		//viewer.dispatchEvent({type: "render.pass.scene",viewer: viewer});

		Potree.endQuery(queryColors, viewer.renderer.getContext());
		
		
		{ // EDL OCCLUSION PASS
			let queryEDL = Potree.startQuery('EDL - resolve', viewer.renderer.getContext());

			this.edlMaterial.uniforms.screenWidth.value = width;
			this.edlMaterial.uniforms.screenHeight.value = height;
			this.edlMaterial.uniforms.colorMap.value = this.rtColor.texture;
			this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
			this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
			this.edlMaterial.uniforms.opacity.value = 1;
			
			Potree.utils.screenPass.render(viewer.renderer, this.edlMaterial);

			Potree.endQuery(queryEDL, viewer.renderer.getContext());
		}

		let queryRest = Potree.startQuery('EDL - rest', viewer.renderer.getContext());

		viewer.renderer.clearDepth();

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

		Potree.endQuery(queryRest, viewer.renderer.getContext());
		
	}
};

