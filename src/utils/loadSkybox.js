Potree.utils.loadSkybox = (path) => {
	let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 100000);
	camera.up.set(0, 0, 1);
	let scene = new THREE.Scene();

	let format = '.jpg';
	let urls = [
		path + 'px' + format, path + 'nx' + format,
		path + 'py' + format, path + 'ny' + format,
		path + 'pz' + format, path + 'nz' + format
	];

	// var materialArray = [];
	// for (var i = 0; i < 6; i++){
	//	materialArray.push( new THREE.MeshBasicMaterial({
	//		map: THREE.ImageUtils.loadTexture( urls[i] ),
	//		side: THREE.BackSide,
	//		depthTest: false,
	//		depthWrite: false
	//		})
	//	);
	// }

	let materialArray = [];
	{
		for (let i = 0; i < 6; i++) {
			let material = new THREE.MeshBasicMaterial({
				map: null,
				side: THREE.BackSide,
				depthTest: false,
				depthWrite: false
			});

			materialArray.push(material);

			let loader = new THREE.TextureLoader();
			loader.load(urls[i],
				function loaded (texture) {
					material.map = texture;
					material.needsUpdate = true;
				}, function progress (xhr) {
					// console.log( (xhr.loaded / xhr.total * 100) + '% loaded' );
				}, function error (xhr) {
					console.log('An error happened', xhr);
				}
			);
		}
	}

	var skyGeometry = new THREE.CubeGeometry(5000, 5000, 5000);
	var skybox = new THREE.Mesh(skyGeometry, materialArray);

	scene.add(skybox);

	// z up
	scene.rotation.x = Math.PI / 2;

	return {'camera': camera, 'scene': scene};
};
