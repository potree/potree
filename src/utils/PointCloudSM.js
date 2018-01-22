
Potree.PointCloudSM = class PointCloudSM{

	constructor(potreeRenderer){

		this.potreeRenderer = potreeRenderer;
		this.threeRenderer = this.potreeRenderer.threeRenderer;

		this.target = new THREE.WebGLRenderTarget(4 * 1024, 4 * 1024, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
		});
		this.target.depthTexture = new THREE.DepthTexture();
		this.target.depthTexture.type = THREE.UnsignedIntType;

		//this.target = new THREE.WebGLRenderTarget(1024, 1024, {
		//	minFilter: THREE.NearestFilter,
		//	magFilter: THREE.NearestFilter,
		//	format: THREE.RGBAFormat,
		//	type: THREE.FloatType,
		//	depthTexture: new THREE.DepthTexture(undefined, undefined, THREE.UnsignedIntType)
		//});

		this.threeRenderer.setClearColor(0xff0000, 1);
		this.threeRenderer.clearTarget(this.target, true, true, true);
	}

	setLight(light){
		this.light = light;

		//let fov = (180 / Math.PI) * 2 * light.angle;
		let fov = 90;
		let aspect = light.shadow.mapSize.width / light.shadow.mapSize.height;
		let near = 0.1;
		let far = 10000;
		this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
		this.camera.up.set(0, 0, 1);
		//this.camera.position.copy(light.position);
		//this.camera.position.set(10, 0, 15);
		this.camera.position.copy(light.position);
		//this.camera.lookAt(new THREE.Vector3(0, 0, 8));

		let target = new THREE.Vector3().addVectors(light.position, light.getWorldDirection());
		this.camera.lookAt(target);

		//this.camera.rotation.copy(light.rotation);
		this.camera.updateProjectionMatrix();
		this.camera.updateMatrix();
		this.camera.updateMatrixWorld();
		this.camera.matrixWorldInverse.getInverse(this.camera.matrixWorld);
	}

	setSize(width, height){
		if(this.target.width !== width || this.target.height !== height){
			this.target.dispose();
		}
		this.target.setSize(width, height);
	}

	render(scene, camera){
		//this.threeRenderer.setClearColor(0x00ff00, 1);

		this.threeRenderer.clearTarget( this.target, true, true, true );
		this.potreeRenderer.render(scene, this.camera, this.target, {});
	}


};