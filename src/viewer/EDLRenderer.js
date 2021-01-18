
import * as THREE from "../../libs/three.js/build/three.module.js";
import {PointCloudSM} from "../utils/PointCloudSM.js";
import {EyeDomeLightingMaterial} from "../materials/EyeDomeLightingMaterial.js";
import {SphereVolume} from "../utils/Volume.js";
import {Utils} from "../utils.js";

export class EDLRenderer{
	constructor(viewer){
		this.viewer = viewer;

		this.edlMaterial = null;

		this.rtRegular;
		this.rtEDL;

		this.gl = viewer.renderer.getContext();

		this.shadowMap = new PointCloudSM(this.viewer.pRenderer);
	}

	initEDL(){
		if (this.edlMaterial != null) {
			return;
		}

		this.edlMaterial = new EyeDomeLightingMaterial();
		this.edlMaterial.depthTest = true;
		this.edlMaterial.depthWrite = true;
		this.edlMaterial.transparent = true;

		this.rtEDL = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType,
			depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});

		this.rtRegular = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		});
	};

	resize(width, height){
		if(this.screenshot){
			width = this.screenshot.target.width;
			height = this.screenshot.target.height;
		}

		this.rtEDL.setSize(width , height);
		this.rtRegular.setSize(width , height);
	}

	makeScreenshot(camera, size, callback){

		if(camera === undefined || camera === null){
			camera = this.viewer.scene.getActiveCamera();
		}

		if(size === undefined || size === null){
			size = this.viewer.renderer.getSize(new THREE.Vector2());
		}

		let {width, height} = size;

		//let maxTextureSize = viewer.renderer.capabilities.maxTextureSize;
		//if(width * 4 < 
		width = 2 * width;
		height = 2 * height;

		let target = new THREE.WebGLRenderTarget(width, height, {
			format: THREE.RGBAFormat,
		});

		this.screenshot = {
			target: target
		};

		// HACK? removed because of error, was this important?
		//this.viewer.renderer.clearTarget(target, true, true, true);

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

	clearTargets(){
		const viewer = this.viewer;
		const {renderer} = viewer;

		const oldTarget = renderer.getRenderTarget();

		renderer.setRenderTarget( this.rtEDL );
		renderer.clear( true, true, true );

		renderer.setRenderTarget( this.rtRegular );
		renderer.clear( true, true, false );

		renderer.setRenderTarget(oldTarget);
	}

	clear(){
		this.initEDL();
		const viewer = this.viewer;

		const {renderer, background} = viewer;

		if(background === "skybox"){
			renderer.setClearColor(0x000000, 0);
		} else if (background === 'gradient') {
			renderer.setClearColor(0x000000, 0);
		} else if (background === 'black') {
			renderer.setClearColor(0x000000, 1);
		} else if (background === 'white') {
			renderer.setClearColor(0xFFFFFF, 1);
		} else {
			renderer.setClearColor(0x000000, 0);
		}
		
		renderer.clear();

		this.clearTargets();
	}

	renderShadowMap(visiblePointClouds, camera, lights){

		const {viewer} = this;

		const doShadows = lights.length > 0 && !(lights[0].disableShadowUpdates);
		if(doShadows){
			let light = lights[0];

			this.shadowMap.setLight(light);

			let originalAttributes = new Map();
			for(let pointcloud of viewer.scene.pointclouds){
				// TODO IMPORTANT !!! check
				originalAttributes.set(pointcloud, pointcloud.material.activeAttributeName);
				pointcloud.material.disableEvents();
				pointcloud.material.activeAttributeName = "depth";
				//pointcloud.material.pointColorType = PointColorType.DEPTH;
			}

			this.shadowMap.render(viewer.scene.scenePointCloud, camera);

			for(let pointcloud of visiblePointClouds){
				let originalAttribute = originalAttributes.get(pointcloud);
				// TODO IMPORTANT !!! check
				pointcloud.material.activeAttributeName = originalAttribute;
				pointcloud.material.enableEvents();
			}

			viewer.shadowTestCam.updateMatrixWorld();
			viewer.shadowTestCam.matrixWorldInverse.copy(viewer.shadowTestCam.matrixWorld).invert();
			viewer.shadowTestCam.updateProjectionMatrix();
		}

	}

	render(params){
		this.initEDL();

		const viewer = this.viewer;
		let camera = params.camera ? params.camera : viewer.scene.getActiveCamera();
		const {width, height} = this.viewer.renderer.getSize(new THREE.Vector2());


		viewer.dispatchEvent({type: "render.pass.begin",viewer: viewer});
		
		this.resize(width, height);

		const visiblePointClouds = viewer.scene.pointclouds.filter(pc => pc.visible);

		if(this.screenshot){
			let oldBudget = Potree.pointBudget;
			Potree.pointBudget = Math.max(10 * 1000 * 1000, 2 * oldBudget);
			let result = Potree.updatePointClouds(
				viewer.scene.pointclouds, 
				camera, 
				viewer.renderer);
			Potree.pointBudget = oldBudget;
		}

		let lights = [];
		viewer.scene.scene.traverse(node => {
			if(node.type === "SpotLight"){
				lights.push(node);
			}
		});

		if(viewer.background === "skybox"){
			viewer.skybox.camera.rotation.copy(viewer.scene.cameraP.rotation);
			viewer.skybox.camera.fov = viewer.scene.cameraP.fov;
			viewer.skybox.camera.aspect = viewer.scene.cameraP.aspect;

			viewer.skybox.parent.rotation.x = 0;
			viewer.skybox.parent.updateMatrixWorld();

			viewer.skybox.camera.updateProjectionMatrix();
			viewer.renderer.render(viewer.skybox.scene, viewer.skybox.camera);
		} else if (viewer.background === 'gradient') {
			viewer.renderer.render(viewer.scene.sceneBG, viewer.scene.cameraBG);
		} 

		//TODO adapt to multiple lights
		this.renderShadowMap(visiblePointClouds, camera, lights);

		{ // COLOR & DEPTH PASS
			for (let pointcloud of visiblePointClouds) {
				let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

				let material = pointcloud.material;
				material.weighted = false;
				material.useLogarithmicDepthBuffer = false;
				material.useEDL = true;

				material.screenWidth = width;
				material.screenHeight = height;
				material.uniforms.visibleNodes.value = pointcloud.material.visibleNodesTexture;
				material.uniforms.octreeSize.value = octreeSize;
				material.spacing = pointcloud.pcoGeometry.spacing; // * Math.max(pointcloud.scale.x, pointcloud.scale.y, pointcloud.scale.z);
			}
			
			// TODO adapt to multiple lights
			viewer.renderer.setRenderTarget(this.rtEDL);
			
			if(lights.length > 0){
				viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtEDL, {
					clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
					shadowMaps: [this.shadowMap],
					transparent: false,
				});
			}else{

				
				// let test = camera.clone();
				// test.matrixAutoUpdate = false;

				// //test.updateMatrixWorld = () => {};

				// let mat = new THREE.Matrix4().set(
				// 	1, 0, 0, 0,
				// 	0, 0, 1, 0,
				// 	0, -1, 0, 0,
				// 	0, 0, 0, 1,
				// );
				// mat.invert()

				// test.matrix.multiplyMatrices(mat, test.matrix);
				// test.updateMatrixWorld();

				//test.matrixWorld.multiplyMatrices(mat, test.matrixWorld);
				//test.matrixWorld.multiply(mat);
				//test.matrixWorldInverse.invert(test.matrixWorld);
				//test.matrixWorldInverse.multiplyMatrices(test.matrixWorldInverse, mat);
				

				viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtEDL, {
					clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
					transparent: false,
				});
			}

			
		}

		viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer, renderTarget: this.rtRegular});
		viewer.renderer.setRenderTarget(null);
		viewer.renderer.render(viewer.scene.scene, camera);

		{ // EDL PASS

			const uniforms = this.edlMaterial.uniforms;

			uniforms.screenWidth.value = width;
			uniforms.screenHeight.value = height;

			let proj = camera.projectionMatrix;
			let projArray = new Float32Array(16);
			projArray.set(proj.elements);

			uniforms.uNear.value = camera.near;
			uniforms.uFar.value = camera.far;
			uniforms.uEDLColor.value = this.rtEDL.texture;
			uniforms.uEDLDepth.value = this.rtEDL.depthTexture;
			uniforms.uProj.value = projArray;

			uniforms.edlStrength.value = viewer.edlStrength;
			uniforms.radius.value = viewer.edlRadius;
			uniforms.opacity.value = viewer.edlOpacity; // HACK
			
			Utils.screenPass.render(viewer.renderer, this.edlMaterial);

			if(this.screenshot){
				Utils.screenPass.render(viewer.renderer, this.edlMaterial, this.screenshot.target);
			}

		}

		viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer});

		viewer.renderer.clearDepth();

		viewer.transformationTool.update();

		viewer.dispatchEvent({type: "render.pass.perspective_overlay",viewer: viewer});

		viewer.renderer.render(viewer.controls.sceneControls, camera);
		viewer.renderer.render(viewer.clippingTool.sceneVolume, camera);
		viewer.renderer.render(viewer.transformationTool.scene, camera);
		
		viewer.dispatchEvent({type: "render.pass.end",viewer: viewer});

	}
}

