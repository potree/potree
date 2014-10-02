
Potree.ProfileTool = function(width, height, depth){

	THREE.Object3D.call( this );

	var boxGeometry = new THREE.BoxGeometry(1,1,1,1,1,1);
	var boxMaterial = new THREE.MeshBasicMaterial({color: 0xFF0000, transparent: true, opacity: 0.3});
	
	this.profileFrustum = new THREE.Mesh(boxGeometry, boxMaterial);
	this.add(this.profileFrustum);
	
	this.camera = new THREE.OrthographicCamera( -width / 2, width / 2, height / 2, -height / 2, 1, 1 + depth );
	this.add(this.camera);
	this.setDimension(width, height, depth);
	
	this.rtProfile = new THREE.WebGLRenderTarget( 512, 512, { minFilter: THREE.LinearFilter, magFilter: THREE.NearestFilter, format: THREE.RGBFormat } );
	
	this.hudGeometry = new THREE.BoxGeometry(2,2,1);
	this.hudMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, map: this.rtProfile } );
	this.hudMaterial.depthTest = false;
	this.hudElement = new THREE.Mesh(this.hudGeometry, this.hudMaterial);
	this.hudElement.scale.set(1,1,1);
	this.hudElement.position.set(0, 0, 0);
}

Potree.ProfileTool.prototype = Object.create( THREE.Object3D.prototype );

Potree.ProfileTool.prototype.setDimension = function(width, height, depth){
	this.profileFrustum.scale.set(width, height, depth);
	this.width = width;
	this.height = height;
	this.depth = depth;
		
	this.camera.left = -width / 2;
	this.camera.right = width / 2;
	this.camera.top = height / 2;
	this.camera.bottom = -height / 2;
	this.camera.updateProjectionMatrix();
}

Potree.ProfileTool.prototype.setOrientation = function(forward, side){
	var oldPosition = this.position.clone();
	this.position.add(forward);
	this.lookAt(oldPosition);
	this.position.copy(oldPosition);
	
	this.camera.position.copy(oldPosition.clone().add(forward));
	this.camera.lookAt(oldPosition);
}

Potree.ProfileTool.prototype.render = function(renderer, scene){
	this.camera.matrixWorld.copy(this.matrixWorld);
	
	//TODO maybe we should store old sizes in a map instead of the objects
	scene.traverse(function(object){
		if(object instanceof Potree.PointCloudOctree){
			object.material.oldSize = object.material.size;
			object.material.size = 0;
		}
	});
	
	
	renderer.render(scene, this.camera, this.rtProfile, true);
	
	
	scene.traverse(function(object){
		if(object instanceof Potree.PointCloudOctree){
			object.material.size = object.material.oldSize;
		}
	});
	
	//this.hudElement.scale.x = 0.5;
	//this.hudElement.scale.y = 0.5 * (renderer.domElement.clientWidth / renderer.domElement.clientHeight) * (this.height / this.width);
	//this.hudElement.position.x = 0.7;
	//this.hudElement.position.y = -0.7;
	
}







