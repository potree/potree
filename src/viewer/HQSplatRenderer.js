

import {NormalizationMaterial} from "../materials/NormalizationMaterial.js";
import {NormalizationEDLMaterial} from "../materials/NormalizationEDLMaterial.js";
import {PointCloudMaterial} from "../materials/PointCloudMaterial.js";
import {PointShape} from "../defines.js";
import {SphereVolume} from "../utils/Volume.js";
import {Utils} from "../utils.js";


export class HQSplatRenderer{
	
	constructor(viewer){
		this.viewer = viewer;

		this.depthMaterials = new Map();
		this.attributeMaterials = new Map();
		this.normalizationMaterial = null;

		this.rtDepth = null;
		this.rtAttribute = null;
		this.gl = viewer.renderer.context;

		this.initialized = false;
	}

	init(){
		if (this.initialized) {
			return;
		}

		this.normalizationMaterial = new NormalizationMaterial();
		this.normalizationMaterial.depthTest = true;
		this.normalizationMaterial.depthWrite = true;
		this.normalizationMaterial.transparent = true;

		this.normalizationEDLMaterial = new NormalizationEDLMaterial();
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

		this.initialized = true;
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

		let visiblePointClouds = viewer.scene.pointclouds.filter(pc => pc.visible);
		let originalMaterials = new Map();

		for(let pointcloud of visiblePointClouds){
			originalMaterials.set(pointcloud, pointcloud.material);

			if(!this.attributeMaterials.has(pointcloud)){
				let attributeMaterial = new PointCloudMaterial();
				this.attributeMaterials.set(pointcloud, attributeMaterial);
			}

			if(!this.depthMaterials.has(pointcloud)){
				let depthMaterial = new PointCloudMaterial();

				depthMaterial.setDefine("depth_pass", "#define hq_depth_pass");
				depthMaterial.setDefine("use_edl", "#define use_edl");

				this.depthMaterials.set(pointcloud, depthMaterial);
			}
		}

		{ // DEPTH PASS
			for (let pointcloud of visiblePointClouds) {
				let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

				let material = originalMaterials.get(pointcloud);
				let depthMaterial = this.depthMaterials.get(pointcloud);

				depthMaterial.size = material.size;
				depthMaterial.minSize = material.minSize;
				depthMaterial.maxSize = material.maxSize;

				depthMaterial.pointSizeType = material.pointSizeType;
				depthMaterial.visibleNodesTexture = material.visibleNodesTexture;
				depthMaterial.weighted = false;
				depthMaterial.screenWidth = width;
				depthMaterial.shape = PointShape.CIRCLE;
				depthMaterial.screenHeight = height;
				depthMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
				depthMaterial.uniforms.octreeSize.value = octreeSize;
				depthMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(...pointcloud.scale.toArray());
				depthMaterial.classification = material.classification;

				depthMaterial.uniforms.uFilterReturnNumberRange.value = material.uniforms.uFilterReturnNumberRange.value;
				depthMaterial.uniforms.uFilterNumberOfReturnsRange.value = material.uniforms.uFilterNumberOfReturnsRange.value;
				depthMaterial.uniforms.uFilterGPSTimeClipRange.value = material.uniforms.uFilterGPSTimeClipRange.value;

				//depthMaterial.uniforms.uGPSOffset.value = material.uniforms.uGPSOffset.value;
				//depthMaterial.uniforms.uGPSRange.value = material.uniforms.uGPSRange.value;

				depthMaterial.clipTask = material.clipTask;
				depthMaterial.clipMethod = material.clipMethod;
				depthMaterial.setClipBoxes(material.clipBoxes);
				depthMaterial.setClipPolygons(material.clipPolygons);

				pointcloud.material = depthMaterial;
			}
			
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtDepth, {
				clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
				//material: this.depthMaterial
			});
		}

		{ // ATTRIBUTE PASS
			for (let pointcloud of visiblePointClouds) {
				let octreeSize = pointcloud.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;

				let material = originalMaterials.get(pointcloud);
				let attributeMaterial = this.attributeMaterials.get(pointcloud);

				attributeMaterial.size = material.size;
				attributeMaterial.minSize = material.minSize;
				attributeMaterial.maxSize = material.maxSize;

				attributeMaterial.pointSizeType = material.pointSizeType;
				attributeMaterial.pointColorType = material.pointColorType;
				attributeMaterial.visibleNodesTexture = material.visibleNodesTexture;
				attributeMaterial.weighted = true;
				attributeMaterial.screenWidth = width;
				attributeMaterial.screenHeight = height;
				attributeMaterial.shape = PointShape.CIRCLE;
				attributeMaterial.uniforms.visibleNodes.value = material.visibleNodesTexture;
				attributeMaterial.uniforms.octreeSize.value = octreeSize;
				attributeMaterial.spacing = pointcloud.pcoGeometry.spacing * Math.max(...pointcloud.scale.toArray());
				attributeMaterial.classification = material.classification;

				attributeMaterial.uniforms.uFilterReturnNumberRange.value = material.uniforms.uFilterReturnNumberRange.value;
				attributeMaterial.uniforms.uFilterNumberOfReturnsRange.value = material.uniforms.uFilterNumberOfReturnsRange.value;
				attributeMaterial.uniforms.uFilterGPSTimeClipRange.value = material.uniforms.uFilterGPSTimeClipRange.value;

				attributeMaterial.elevationRange = material.elevationRange;
				attributeMaterial.gradient = material.gradient;

				attributeMaterial.intensityRange = material.intensityRange;
				attributeMaterial.intensityGamma = material.intensityGamma;
				attributeMaterial.intensityContrast = material.intensityContrast;
				attributeMaterial.intensityBrightness = material.intensityBrightness;

				attributeMaterial.rgbGamma = material.rgbGamma;
				attributeMaterial.rgbContrast = material.rgbContrast;
				attributeMaterial.rgbBrightness = material.rgbBrightness;

				attributeMaterial.weightRGB = material.weightRGB;
				attributeMaterial.weightIntensity = material.weightIntensity;
				attributeMaterial.weightElevation = material.weightElevation;
				attributeMaterial.weightRGB = material.weightRGB;
				attributeMaterial.weightClassification = material.weightClassification;
				attributeMaterial.weightReturnNumber = material.weightReturnNumber;
				attributeMaterial.weightSourceID = material.weightSourceID;

				attributeMaterial.color = material.color;

				attributeMaterial.clipTask = material.clipTask;
				attributeMaterial.clipMethod = material.clipMethod;
				attributeMaterial.setClipBoxes(material.clipBoxes);
				attributeMaterial.setClipPolygons(material.clipPolygons);

				pointcloud.material = attributeMaterial;
			}
			
			let gl = this.gl;

			viewer.renderer.setRenderTarget(null);
			viewer.pRenderer.render(viewer.scene.scenePointCloud, camera, this.rtAttribute, {
				clipSpheres: viewer.scene.volumes.filter(v => (v instanceof SphereVolume)),
				//material: this.attributeMaterial,
				blendFunc: [gl.SRC_ALPHA, gl.ONE],
				//depthTest: false,
				depthWrite: false
			});
		}

		for(let [pointcloud, material] of originalMaterials){
			pointcloud.material = material;
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
			viewer.renderer.setClearColor(0x000000, 0);
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
			
			Utils.screenPass.render(viewer.renderer, normalizationMaterial);
		}

		viewer.renderer.render(viewer.scene.scene, camera);

		viewer.dispatchEvent({type: "render.pass.scene", viewer: viewer});

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

}

