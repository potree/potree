
export class PotreeRenderer {

	constructor (viewer) {
		this.viewer = viewer;
		this.renderer = viewer.renderer;
	}

	clearTargets(){

	}

	clear(){
		let {viewer, renderer} = this;

		// render skybox
		if(viewer.background === "skybox"){
			renderer.setClearColor(0x000000, 0);
			renderer.clear(true, true, false);
		}else if(viewer.background === "gradient"){
			renderer.setClearColor(0x000000, 0);
			renderer.clear(true, true, false);
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
	}
 
	render(params){
		let {viewer, renderer} = this;

		const camera = params.camera ? params.camera : viewer.scene.getActiveCamera();

		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});

		const renderAreaSize = renderer.getSize(new THREE.Vector2());
		const width = params.viewport ? params.viewport[2] : renderAreaSize.x;
		const height = params.viewport ? params.viewport[3] : renderAreaSize.y;


		// render skybox
		if(viewer.background === "skybox"){
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;
			viewer.skybox.camera.updateProjectionMatrix();
			renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		}else if(viewer.background === "gradient"){
			renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		}
		
		for(let pointcloud of this.viewer.scene.pointclouds){
			const {material} = pointcloud;
			material.useEDL = false;
			//material.updateShaderSource();
		}
		
		viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, null, {
			clipSpheres: viewer.scene.volumes.filter(v => (v instanceof Potree.SphereVolume)),
		});
		
		// render scene
		renderer.render(viewer.scene.scene, camera);

		viewer.dispatchEvent({type: "render.pass.scene",viewer: viewer});
		
		viewer.clippingTool.update();
		renderer.render(viewer.clippingTool.sceneMarker, viewer.scene.cameraScreenSpace); //viewer.scene.cameraScreenSpace);
		renderer.render(viewer.clippingTool.sceneVolume, camera);

		renderer.render(viewer.controls.sceneControls, camera);
		
		renderer.clearDepth();
		
		viewer.transformationTool.update();
		
		viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

		renderer.render(viewer.controls.sceneControls, camera);
		renderer.render(viewer.clippingTool.sceneVolume, camera);
		renderer.render(viewer.transformationTool.scene, camera);
		
		renderer.setViewport(width - viewer.navigationCube.width, 
									height - viewer.navigationCube.width, 
									viewer.navigationCube.width, viewer.navigationCube.width);
		renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		renderer.setViewport(0, 0, width, height);
		
		// renderer.render(viewer.transformationTool.scene, camera);

		// renderer.setViewport(renderer.domElement.clientWidth - viewer.navigationCube.width, 
		// 							renderer.domElement.clientHeight - viewer.navigationCube.width, 
		// 							viewer.navigationCube.width, viewer.navigationCube.width);
		// renderer.render(viewer.navigationCube, viewer.navigationCube.camera);		
		// renderer.setViewport(0, 0, renderer.domElement.clientWidth, renderer.domElement.clientHeight);

		viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});
	}

}
