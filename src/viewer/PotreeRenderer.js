// eslint-disable-next-line no-unused-vars
class PotreeRenderer {
	constructor (viewer) {
		this.viewer = viewer;
	};
 
	render(){
		const viewer = this.viewer;

		viewer.renderers.forEach((renderer, index) => {
			let query = Potree.startQuery('render', renderer.getContext());

			viewer.dispatchEvent({type: "render.pass.begin", viewer: viewer});

			// render skybox
			if(viewer.background === "skybox"){
				renderer.clear(true, true, false);
				viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
				viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
				viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
				viewer.skybox.camera.updateProjectionMatrix();
				renderer.render(viewer.skybox.scene, viewer.skybox.camera);
			}else if(viewer.background === "gradient"){
				renderer.clear(true, true, false);
				renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
			}else if(viewer.background === "black"){
				renderer.setClearColor(0x000000, 1);
				renderer.clear(true, true, false);
			}else if(viewer.background === "white"){
				renderer.setClearColor(0xFFFFFF, 1);
				renderer.clear(true, true, false);
			}else{
				renderer.setClearColor(0x000000, 0);
				renderer.clear(true, true, false);
			}
			
			for(let pointcloud of this.viewer.scene.pointclouds){
				pointcloud.material.useEDL = false;
			}
			
			//let queryPC = Potree.startQuery("PointCloud", renderer.getContext());
			let activeCam = viewer.scene.getActiveCamera(index);
			//renderer.render(viewer.scene.scenePointCloud, activeCam);
			
			viewer.pRenderers[index].render(viewer.scene.scenePointCloud, activeCam);
			
			
			//Potree.endQuery(queryPC, renderer.getContext());
			
			// render scene
			renderer.render(viewer.scene.scene, activeCam);

			viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer});
			
			viewer.clippingTool.update();
			renderer.render(viewer.clippingTool.sceneMarker, viewer.scene.cameraScreenSpace); //viewer.scene.cameraScreenSpace);
			renderer.render(viewer.clippingTool.sceneVolume, activeCam);

			// renderer.render(viewer.controls.sceneControls, activeCam);
			
			renderer.clearDepth();
			
			viewer.transformationTool.update();
			
			viewer.dispatchEvent({type: "render.pass.perspective_overlay", viewer: viewer});
			
			renderer.render(viewer.transformationTool.scene, activeCam);

			renderer.setViewport(renderer.domElement.clientWidth - viewer.navigationCube.width, 
										renderer.domElement.clientHeight - viewer.navigationCube.width, 
										viewer.navigationCube.width, viewer.navigationCube.width);
			renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
			renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight);

			viewer.dispatchEvent({type: "render.pass.end", viewer: viewer});
			
			Potree.endQuery(query, renderer.getContext());
		});
	};
};
