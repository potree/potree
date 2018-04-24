
class RepSnapshot{

	constructor(){
		this.target = null;
		this.camera = null;
	}

};

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
		this.disableSnapshots = false;
		
		this.snap = {
			target: null,
			matrix: null	
		};

		this.history = {
			maxSnapshots: 10,
			snapshots: [],
			version: 0
		};
		
	}

	initEDL () {
		if (this.edlMaterial != null) {
			return;
		}

		// let depthTextureExt = gl.getExtension("WEBGL_depth_texture");

		this.edlMaterial = new Potree.EyeDomeLightingMaterial();

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

		//{
		//	let geometry = new THREE.PlaneBufferGeometry( 20, 20, 32 );
		//	let material = new THREE.MeshBasicMaterial( {side: THREE.DoubleSide, map: this.snap.target.texture} );
		//	let plane = new THREE.Mesh( geometry, material );
		//	plane.position.z = 0.2;
		//	plane.position.y = -1;
		//	this.viewer.scene.scene.add( plane );
		//	this.debugPlane = plane;
		//}
	};

	resize () {
		let width = this.viewer.scaleFactor * this.viewer.renderArea.clientWidth;
		let height = this.viewer.scaleFactor * this.viewer.renderArea.clientHeight;
		let aspect = width / height;

		let needsResize = (this.rtColor.width !== width || this.rtColor.height !== height);

		// disposal will be unnecessary once this fix made it into three.js master:
		// https://github.com/mrdoob/three.js/pull/6355
		if (needsResize) {
			this.rtColor.dispose();
		}
		
		viewer.scene.cameraP.aspect = aspect;
		viewer.scene.cameraP.updateProjectionMatrix();

		let frustumScale = viewer.moveSpeed * 2.0;
		viewer.scene.cameraO.left = -frustumScale;
		viewer.scene.cameraO.right = frustumScale;		
		viewer.scene.cameraO.top = frustumScale * 1/aspect;
		viewer.scene.cameraO.bottom = -frustumScale * 1/aspect;		
		viewer.scene.cameraO.updateProjectionMatrix();

		viewer.scene.cameraScreenSpace.top = 1/aspect;
		viewer.scene.cameraScreenSpace.bottom = -1/aspect;
		viewer.scene.cameraScreenSpace.updateProjectionMatrix();
		
		viewer.renderer.setSize(width, height);
		this.rtColor.setSize(width, height);
	}

	makeSnapshot(){
		this.snapshotRequested = true;
	}

	render () {
		this.initEDL();
		const viewer = this.viewer;

		this.resize();
		
		let camera = viewer.scene.getActiveCamera();

		let query = Potree.startQuery('stuff', viewer.renderer.getContext());
		
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
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear();
		} else if (viewer.background === 'white') {
			viewer.renderer.setClearColor(0xFFFFFF, 0);
			viewer.renderer.clear();
		}

		viewer.transformationTool.update();
		
		viewer.renderer.render(viewer.scene.scene, camera);
		
		viewer.renderer.clearTarget( this.rtShadow, true, true, true );
		viewer.renderer.clearTarget( this.rtColor, true, true, true );
		
		let width = viewer.renderArea.clientWidth;
		let height = viewer.renderArea.clientHeight;

		// COLOR & DEPTH PASS
		for (let pointcloud of viewer.scene.pointclouds) {
			let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

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
		

		Potree.endQuery(query, viewer.renderer.getContext());

		//viewer.pRenderer.render(viewer.scene.scenePointCloud, viewer.shadowTestCam, this.rtShadow);

		if(!this.disableSnapshots){
			this.snapshotRequested = false;

			let query = Potree.startQuery('create snapshot', viewer.renderer.getContext());

			let snap;
			if(this.history.snapshots.length < this.history.maxSnapshots){
				snap = new RepSnapshot();
				snap.target = new THREE.WebGLRenderTarget(1024, 1024, {
					minFilter: THREE.NearestFilter,
					magFilter: THREE.NearestFilter,
					format: THREE.RGBAFormat,
					//type: THREE.FloatType
				});
				snap.target.depthTexture = new THREE.DepthTexture();
				snap.target.depthTexture.type = THREE.UnsignedIntType;
			}else{
				snap = this.history.snapshots.pop();
			}

			{ // resize
				let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
				let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
				let aspect = width / height;
		
				let needsResize = (snap.target.width !== width || snap.target.height !== height);

				if (needsResize) {
					snap.target.dispose();
				}

				snap.target.setSize(width, height);
			}

			viewer.renderer.clearTarget(snap.target, true, true, true);
			viewer.renderer.setRenderTarget(snap.target);


			for(const octree of viewer.scene.pointclouds){

				octree.material.snapEnabled = false;
				octree.material.needsUpdate = true;


			
				let from = this.history.version * (octree.visibleNodes.length / this.history.maxSnapshots);
				let to = (this.history.version + 1) * (octree.visibleNodes.length / this.history.maxSnapshots);
				
				// DEBUG!!!
				//let from = 0;
				//let to = 20;
				let nodes = octree.visibleNodes.slice(from, to);
				
				viewer.pRenderer.renderOctree(octree, nodes, camera, snap.target, {vnTextureNodes: nodes});
			}

			snap.camera = camera.clone();
			this.history.version = (this.history.version + 1) % this.history.maxSnapshots;

			if(this.debugPlane){
				this.debugPlane.material.map = snap.target.texture;
			}

			this.history.snapshots.unshift(snap);

			Potree.endQuery(query, viewer.renderer.getContext());
		}


		{

			let query = Potree.startQuery('render snapshots', viewer.renderer.getContext());

			viewer.renderer.clearTarget(this.rtColor, true, true, true);
			viewer.renderer.setRenderTarget(this.rtColor);
			for(const octree of viewer.scene.pointclouds){

				if(!this.disableSnapshots){
					octree.material.snapEnabled = true;
					octree.material.numSnapshots = this.history.maxSnapshots;
					octree.material.needsUpdate = true;

					let uniforms = octree.material.uniforms;
					if(this.history.snapshots.length === this.history.maxSnapshots){
						uniforms[`uSnapshot`].value = this.history.snapshots.map(s => s.target.texture);
						uniforms[`uSnapshotDepth`].value = this.history.snapshots.map(s => s.target.depthTexture);
						uniforms[`uSnapView`].value = this.history.snapshots.map(s => s.camera.matrixWorldInverse);
						uniforms[`uSnapProj`].value = this.history.snapshots.map(s => s.camera.projectionMatrix);
						uniforms[`uSnapProjInv`].value = this.history.snapshots.map(s => new THREE.Matrix4().getInverse(s.camera.projectionMatrix));
						uniforms[`uSnapViewInv`].value = this.history.snapshots.map(s => new THREE.Matrix4().getInverse(s.camera.matrixWorld));
					}
				}else{
					octree.material.snapEnabled = false;
					octree.material.needsUpdate = true;
				}
			
				let nodes = octree.visibleNodes.slice(0, 50);
				//let nodes = octree.visibleNodes;
				viewer.pRenderer.renderOctree(octree, nodes, camera, this.rtColor, {vnTextureNodes: nodes});

				if(!this.disableSnapshots){
					octree.material.snapEnabled = false;
					octree.material.needsUpdate = false;
				}
			}

			Potree.endQuery(query, viewer.renderer.getContext());
		}
		
		
		//viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtColor, {
		//	shadowMaps: [{map: this.rtShadow, camera: viewer.shadowTestCam}]
		//});
		
		//viewer.renderer.render(viewer.scene.scene, camera, this.rtColor);
		

		

		{ // EDL OCCLUSION PASS

			let query = Potree.startQuery('EDL', viewer.renderer.getContext());
			this.edlMaterial.uniforms.screenWidth.value = width;
			this.edlMaterial.uniforms.screenHeight.value = height;
			this.edlMaterial.uniforms.colorMap.value = this.rtColor.texture;
			this.edlMaterial.uniforms.edlStrength.value = viewer.edlStrength;
			this.edlMaterial.uniforms.radius.value = viewer.edlRadius;
			this.edlMaterial.uniforms.opacity.value = 1;
			this.edlMaterial.depthTest = true;
			this.edlMaterial.depthWrite = true;
			this.edlMaterial.transparent = true;

			Potree.utils.screenPass.render(viewer.renderer, this.edlMaterial);

			Potree.endQuery(query, viewer.renderer.getContext());
		}

		

		viewer.renderer.clearDepth();
		viewer.renderer.render(viewer.controls.sceneControls, camera);
		
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.transformationTool.scene, camera);
		
		viewer.renderer.setViewport(viewer.renderer.domElement.clientWidth - viewer.navigationCube.width, 
									viewer.renderer.domElement.clientHeight - viewer.navigationCube.width, 
									viewer.navigationCube.width, viewer.navigationCube.width);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		viewer.renderer.setViewport(0, 0, viewer.renderer.domElement.clientWidth, viewer.renderer.domElement.clientHeight);

		//

	}
};

