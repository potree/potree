
import * as THREE from "../../libs/three.js/build/three.module.js";

export class PointCloudSM{

	constructor(potreeRenderer){

		this.potreeRenderer = potreeRenderer;
		this.threeRenderer = this.potreeRenderer.threeRenderer;

		this.target = new THREE.WebGLRenderTarget(2 * 1024, 2 * 1024, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.target.depthTexture = new THREE.DepthTexture();
		this.target.depthTexture.type = THREE.UnsignedIntType;

		//this.threeRenderer.setClearColor(0x000000, 1);
		this.threeRenderer.setClearColor(0xff0000, 1);

		//HACK? removed while moving to three.js 109
		//this.threeRenderer.clearTarget(this.target, true, true, true); 
		{
			const oldTarget = this.threeRenderer.getRenderTarget();

			this.threeRenderer.setRenderTarget(this.target);
			this.threeRenderer.clear(true, true, true);

			this.threeRenderer.setRenderTarget(oldTarget);
		}
	}

	setLight(light){
		this.light = light;

		let fov = (180 * light.angle) / Math.PI;
		let aspect = light.shadow.mapSize.width / light.shadow.mapSize.height;
		let near = 0.1;
		let far = light.distance === 0 ? 10000 : light.distance;
		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.camera.up.set(0, 0, 1);
		this.camera.position.copy(light.position);

		let target = new THREE.Vector3().subVectors(light.position, light.getWorldDirection(new THREE.Vector3()));
		this.camera.lookAt(target);

		this.camera.updateProjectionMatrix();
		this.camera.updateMatrix();
		this.camera.updateMatrixWorld();
		this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();
	}

	setSize(width, height){
		if(this.target.width !== width || this.target.height !== height){
			this.target.dispose();
		}
		this.target.setSize(width, height);
	}

	render(scene, camera){

		this.threeRenderer.setClearColor(0x000000, 1);
		
		const oldTarget = this.threeRenderer.getRenderTarget();

		this.threeRenderer.setRenderTarget(this.target);
		this.threeRenderer.clear(true, true, true);

		this.potreeRenderer.render(scene, this.camera, this.target, {});

		this.threeRenderer.setRenderTarget(oldTarget);
	}


}