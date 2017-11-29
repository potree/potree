
class PotreeRenderer {
	constructor (viewer) {
		this.viewer = viewer;
	};
 
	render(){
		const viewer = this.viewer;
		let query = Potree.startQuery('render', viewer.renderer.getContext());

		{// resize
			let width = viewer.scaleFactor * viewer.renderArea.clientWidth;
			let height = viewer.scaleFactor * viewer.renderArea.clientHeight;
			let aspect = width / height;

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

			// update frustum size for adaptive point size with ortho cameras
			for(let pointcloud of viewer.scene.pointclouds){
				pointcloud.material.orthoRange = 2.0 * frustumScale;
			}
			
			viewer.renderer.setSize(width, height);
		}

		// render skybox
		if(viewer.background === "skybox"){
			viewer.renderer.clear(true, true, false);
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			//viewer.renderer.clear(true, true, false);
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear(true, true, false);
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear(true, true, false);
		}else{
			viewer.renderer.setClearColor(0xFF0000, 0);
			viewer.renderer.clear(true, true, false);
		}
		
		for(let pointcloud of this.viewer.scene.pointclouds){
			pointcloud.material.useEDL = false;
		}
		
		//var queryPC = Potree.startQuery("PointCloud", viewer.renderer.getContext());
		let activeCam = viewer.scene.getActiveCamera();
		//viewer.renderer.render(viewer.scene.scenePointCloud, activeCam);
		
		viewer.pRenderer.render(viewer.scene.scenePointCloud, activeCam);
		
		
		//Potree.endQuery(queryPC, viewer.renderer.getContext());
		
		// render scene
		viewer.renderer.render(viewer.scene.scene, activeCam);
		
		viewer.volumeTool.update();
		viewer.renderer.render(viewer.volumeTool.sceneVolume, activeCam);

		viewer.clippingTool.update();
		viewer.renderer.render(viewer.clippingTool.sceneMarker, viewer.scene.cameraScreenSpace); //viewer.scene.cameraScreenSpace);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, activeCam);

		viewer.renderer.render(viewer.controls.sceneControls, activeCam);
		
		viewer.renderer.clearDepth();
		
		viewer.measuringTool.update();
		viewer.profileTool.update();
		viewer.transformationTool.update();
		
		viewer.renderer.render(viewer.measuringTool.sceneMeasurement, activeCam);
		viewer.renderer.render(viewer.profileTool.sceneProfile, activeCam);
		viewer.renderer.render(viewer.transformationTool.sceneTransform, activeCam);

		viewer.renderer.setViewport(viewer.renderer.domElement.clientWidth - viewer.navigationCube.width, 
									viewer.renderer.domElement.clientHeight - viewer.navigationCube.width, 
									viewer.navigationCube.width, viewer.navigationCube.width);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		viewer.renderer.setViewport(0, 0, viewer.renderer.domElement.clientWidth, viewer.renderer.domElement.clientHeight);
		
		Potree.endQuery(query, viewer.renderer.getContext());
	};
};
