
export const ClassificationScheme = {

	DEFAULT: {
		// never classified
		0: new THREE.Vector4(0.5, 0.5, 0.5, 1.0),

		// unclassified
		1: new THREE.Vector4(0.5, 0.5, 0.5, 1.0),

		// ground
		2: new THREE.Vector4(0.63, 0.32, 0.18, 1.0),

		// low vegetation
		3: new THREE.Vector4(0.0, 1.0, 0.0, 1.0),

		// med vegetation 
		4: new THREE.Vector4(0.0, 0.8, 0.0, 1.0),

		// high vegetation
		5: new THREE.Vector4(0.0, 0.6, 0.0, 1.0),

		// building
		6: new THREE.Vector4(1.0, 0.66, 0.0, 1.0),

		// noise
		7: new THREE.Vector4(1.0, 0, 1.0, 1.0),

		// key point
		8: new THREE.Vector4(1.0, 0, 0.0, 1.0),

		// water
		9: new THREE.Vector4(0.0, 0.0, 1.0, 1.0),

		// overlap
		12: new THREE.Vector4(1.0, 1.0, 0.0, 1.0),

		// everything else
		'DEFAULT': new THREE.Vector4(0.3, 0.6, 0.6, 0.5)
	}
};

Object.defineProperty(ClassificationScheme, 'RANDOM', {
	get: function() { 

		let scheme = {};

		for(let i = 0; i <= 255; i++){
			scheme[i] = new THREE.Vector4(Math.random(), Math.random(), Math.random());
		}

		scheme["DEFAULT"] = new THREE.Vector4(Math.random(), Math.random(), Math.random());

		return scheme;
	}
});