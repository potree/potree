

function Potree(){
	
}

//================================
// POINT CLOUD
//================================
Potree.PointCloud = function(geometry, material){
	THREE.Object3D.call( this );

	this.geometry = geometry !== undefined ? geometry : new THREE.Geometry();
	this.material = material !== undefined ? material : new THREE.ParticleSystemMaterial( { color: Math.random() * 0xffffff } );
}

Potree.PointCloud.prototype = Object.create(THREE.Object3D.prototype);

Potree.PointCloud.prototype.clone = function ( object ) {
	if (object === undefined) object = new Potree.PointCloud(this.geometry, this.material);

	THREE.Object3D.prototype.clone.call(this, object);

	return object;
};
