
export class PotreeRenderer {

	constructor (viewer) {
		this.viewer = viewer;
	}
 
	render(){
		const viewer = this.viewer;

		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

		// render skybox
		if(viewer.background === "skybox"){
			viewer.renderer.clear(true, true, false);
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			viewer.renderer.clear(true, true, false);
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}else if(viewer.background === "black"){
			viewer.renderer.setClearColor(0x000000, 1);
			viewer.renderer.clear(true, true, false);
		}else if(viewer.background === "white"){
			viewer.renderer.setClearColor(0xFFFFFF, 1);
			viewer.renderer.clear(true, true, false);
		}else{
			viewer.renderer.setClearColor(0x000000, 0);
			viewer.renderer.clear(true, true, false);
		}
		
		for(let pointcloud of this.viewer.scene.pointclouds){
			pointcloud.material.useEDL = false;
		}
		
		let activeCam = viewer.scene.getActiveCamera();
		//viewer.renderer.render(viewer.scene.scenePointCloud, activeCam);
		
		viewer.pRenderer.render(viewer.scene.scenePointCloud, activeCam, null, {
			clipSpheres: viewer.scene.volumes.filter(v => (v instanceof Potree.SphereVolume)),
		});
		
		// render scene
		viewer.renderer.render(viewer.scene.scene, activeCam);

		viewer.dispatchEvent({type: "render.pass.scene",viewer: viewer});
		
		viewer.clippingTool.update();
		viewer.renderer.render(viewer.clippingTool.sceneMarker, viewer.scene.cameraScreenSpace); //viewer.scene.cameraScreenSpace);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, activeCam);

		viewer.renderer.render(viewer.controls.sceneControls, activeCam);
		
		viewer.renderer.clearDepth();
		
		viewer.transformationTool.update();
		
		viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});
		
		viewer.renderer.render(viewer.transformationTool.scene, activeCam);

		viewer.renderer.setViewport(viewer.renderer.domElement.clientWidth - viewer.navigationCube.width, 
									viewer.renderer.domElement.clientHeight - viewer.navigationCube.width, 
									viewer.navigationCube.width, viewer.navigationCube.width);
		viewer.renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		viewer.renderer.setViewport(0, 0, viewer.renderer.domElement.clientWidth, viewer.renderer.domElement.clientHeight);

		viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});
	}

}
