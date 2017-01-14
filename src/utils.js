

Potree.utils = class{
	
	static toString(value){
		if(value instanceof THREE.Vector3){
			return value.x.toFixed(2) + ", " + value.y.toFixed(2) + ", " + value.z.toFixed(2);
		}else{
			return "" + value + "";
		}
	}
	
	static normalizeURL(url){
		let u = new URL(url);
		
		return u.protocol + "//" + u.hostname + u.pathname.replace(/\/+/g, "/");
	};

	static pathExists(url){
		let req = new XMLHttpRequest();
		req.open('GET', url, false);
		req.send(null);
		if (req.status !== 200) {
			return false;
		}
		return true;
	};

	/**
	 * adapted from mhluska at https://github.com/mrdoob/three.js/issues/1561
	 */
	static computeTransformedBoundingBox(box, transform){

		let vertices = [
			new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.min.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.min.x, box.max.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.max.y, box.min.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.min.y, box.max.z).applyMatrix4(transform),
			new THREE.Vector3(box.max.x, box.max.y, box.max.z).applyMatrix4(transform)
		];
		
		let boundingBox = new THREE.Box3();
		boundingBox.setFromPoints( vertices );
		
		return boundingBox;
	};

	/**
	 * add separators to large numbers
	 * 
	 * @param nStr
	 * @returns
	 */
	static addCommas(nStr){
		nStr += '';
		let x = nStr.split('.');
		let x1 = x[0];
		let x2 = x.length > 1 ? '.' + x[1] : '';
		let rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	};

	/**
	 * create worker from a string
	 *
	 * code from http://stackoverflow.com/questions/10343913/how-to-create-a-web-worker-from-a-string
	 */
	static createWorker(code){
		 let blob = new Blob([code], {type: 'application/javascript'});
		 let worker = new Worker(URL.createObjectURL(blob));
		 
		 return worker;
	};

	static loadSkybox(path){
		let camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 100000 );
		camera.up.set(0, 0, 1);
		let scene = new THREE.Scene();

		let format = ".jpg";
		let urls = [
			path + 'px' + format, path + 'nx' + format,
			path + 'py' + format, path + 'ny' + format,
			path + 'pz' + format, path + 'nz' + format
		];
		
		var materialArray = [];
		for (var i = 0; i < 6; i++){
			materialArray.push( new THREE.MeshBasicMaterial({
				map: THREE.ImageUtils.loadTexture( urls[i] ),
				side: THREE.BackSide,
				depthTest: false,
				depthWrite: false
				})
			);
		}
		
		var skyGeometry = new THREE.CubeGeometry( 5000, 5000, 5000 );
		var skyMaterial = new THREE.MeshFaceMaterial( materialArray );
		var skybox = new THREE.Mesh( skyGeometry, skyMaterial );

		scene.add(skybox);
		
		// z up
		scene.rotation.x = Math.PI / 2;
		
		return {"camera": camera, "scene": scene};

		//let textureCube = THREE.ImageUtils.loadTextureCube(urls, THREE.CubeRefractionMapping );
        //
		//let shader = {
		//	uniforms: {
		//		"tCube": {type: "t", value: textureCube},
		//		"tFlip": {type: "f", value: -1}
		//	},
		//	vertexShader: THREE.ShaderLib["cube"].vertexShader,
		//	fragmentShader: THREE.ShaderLib["cube"].fragmentShader
		//};
        //
		//let material = new THREE.ShaderMaterial({
		//	fragmentShader: shader.fragmentShader,
		//	vertexShader: shader.vertexShader,
		//	uniforms: shader.uniforms,
		//	depthWrite: false,
		//	side: THREE.BackSide
		//});
		//let mesh = new THREE.Mesh(new THREE.BoxGeometry(1000, 1000, 1000), material);
		//mesh.rotation.x = Math.PI / 2;
		//scene.add(mesh);
        //
		//return {"camera": camera, "scene": scene};
	};

	static createGrid(width, length, spacing, color){
		let material = new THREE.LineBasicMaterial({
			color: color || 0x888888
		});
		
		let geometry = new THREE.Geometry();
		for(let i = 0; i <= length; i++){
			 geometry.vertices.push(new THREE.Vector3(-(spacing*width)/2, i*spacing-(spacing*length)/2, 0));
			 geometry.vertices.push(new THREE.Vector3(+(spacing*width)/2, i*spacing-(spacing*length)/2, 0));
		}
		
		for(let i = 0; i <= width; i++){
			 geometry.vertices.push(new THREE.Vector3(i*spacing-(spacing*width)/2, -(spacing*length)/2, 0));
			 geometry.vertices.push(new THREE.Vector3(i*spacing-(spacing*width)/2, +(spacing*length)/2, 0));
		}
		
		let line = new THREE.Line(geometry, material, THREE.LinePieces);
		line.receiveShadow = true;
		return line;
	};


	static createBackgroundTexture(width, height){

		function gauss(x, y){
			return (1 / (2 * Math.PI)) * Math.exp( - (x*x + y*y) / 2);
		};

		//map.magFilter = THREE.NearestFilter;
		let size = width * height;
		let data = new Uint8Array( 3 * size );

		let chroma = [1, 1.5, 1.7];
		let max = gauss(0, 0);

		for(let x = 0; x < width; x++){
			for(let y = 0; y < height; y++){
				let u = 2 * (x / width) - 1;
				let v = 2 * (y / height) - 1;
				
				let i = x + width*y;
				let d = gauss(2*u, 2*v) / max;
				let r = (Math.random() + Math.random() + Math.random()) / 3;
				r = (d * 0.5 + 0.5) * r * 0.03;
				r = r * 0.4;
				
				//d = Math.pow(d, 0.6);
				
				data[3*i+0] = 255 * (d / 15 + 0.05 + r) * chroma[0];
				data[3*i+1] = 255 * (d / 15 + 0.05 + r) * chroma[1];
				data[3*i+2] = 255 * (d / 15 + 0.05 + r) * chroma[2];
			}
		}
		
		let texture = new THREE.DataTexture( data, width, height, THREE.RGBFormat );
		texture.needsUpdate = true;
		
		return texture;
	};

	static getMousePointCloudIntersection(mouse, camera, renderer, pointclouds){
		let vector = new THREE.Vector3( mouse.x, mouse.y, 0.5 );
		vector.unproject(camera);

		let direction = vector.sub(camera.position).normalize();
		let ray = new THREE.Ray(camera.position, direction);
		
		let closestPoint = null;
		let closestPointDistance = null;
		
		for(let i = 0; i < pointclouds.length; i++){
			let pointcloud = pointclouds[i];
			let point = pointcloud.pick(renderer, camera, ray);
			
			if(!point){
				continue;
			}
			
			let distance = camera.position.distanceTo(point.position);
			
			if(!closestPoint || distance < closestPointDistance){
				closestPoint = point;
				closestPointDistance = distance;
			}
		}
		
		return closestPoint ? closestPoint.position : null;
	};	
		
	static pixelsArrayToImage(pixels, width, height){
		let canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;

		let context = canvas.getContext('2d');
		
		pixels = new pixels.constructor(pixels);
		
		for(let i = 0; i < pixels.length; i++){
			pixels[i*4 + 3] = 255;
		}

		let imageData = context.createImageData(width, height);
		imageData.data.set(pixels);
		context.putImageData(imageData, 0, 0);

		let img = new Image();
		img.src = canvas.toDataURL();
		//img.style.transform = "scaleY(-1)";
		
		return img;
	};

	static projectedRadius(radius, fov, distance, screenHeight){
		let projFactor =  (1 / Math.tan(fov / 2)) / distance;
		projFactor = projFactor * screenHeight / 2;
		
		return radius * projFactor;
	};
		
		
	static topView(camera, node){
		camera.position.set(0, 1, 0);
		camera.rotation.set(-Math.PI / 2, 0, 0);
		camera.zoomTo(node, 1);
	};

	static frontView(camera, node){
		camera.position.set(0, 0, 1);
		camera.rotation.set(0, 0, 0);
		camera.zoomTo(node, 1);
	};


	static leftView(camera, node){
		camera.position.set(-1, 0, 0);
		camera.rotation.set(0, -Math.PI / 2, 0);
		camera.zoomTo(node, 1);
	};

	static rightView(camera, node){
		camera.position.set(1, 0, 0);
		camera.rotation.set(0, Math.PI / 2, 0);
		camera.zoomTo(node, 1);
	};
		
	/**
	 *  
	 * 0: no intersection
	 * 1: intersection
	 * 2: fully inside
	 */
	static frustumSphereIntersection(frustum, sphere){
		let planes = frustum.planes;
		let center = sphere.center;
		let negRadius = - sphere.radius;

		let minDistance = Number.MAX_VALUE;
		
		for ( let i = 0; i < 6; i ++ ) {

			let distance = planes[ i ].distanceToPoint( center );

			if ( distance < negRadius ) {

				return 0;

			}
			
			minDistance = Math.min(minDistance, distance);

		}

		return (minDistance >= sphere.radius) ? 2 : 1;
	};
		
	// code taken from three.js
	// ImageUtils - generateDataTexture()
	static generateDataTexture(width, height, color){
		let size = width * height;
		let data = new Uint8Array(3 * width * height);
		
		let r = Math.floor( color.r * 255 );
		let g = Math.floor( color.g * 255 );
		let b = Math.floor( color.b * 255 );
		
		for ( let i = 0; i < size; i ++ ) {
			data[ i * 3 ] 	   = r;
			data[ i * 3 + 1 ] = g;
			data[ i * 3 + 2 ] = b;
		}
		
		let texture = new THREE.DataTexture( data, width, height, THREE.RGBFormat );
		texture.needsUpdate = true;
		texture.magFilter = THREE.NearestFilter;
		
		return texture;
	};
		
	// from http://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
	static getParameterByName(name) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		let regex = new RegExp("[\\?&]" + name + "=([^&#]*)"), results = regex.exec(location.search);
		return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
	}
	
	static setParameter(name, value){
		//value = encodeURIComponent(value);
		
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		let regex = new RegExp("([\\?&])(" + name + "=([^&#]*))");
		let results = regex.exec(location.search);

		let url = window.location.href;
		if(results === null){
			if(window.location.search.length === 0){
				url = url + "?";
			}else{
				url = url + "&";
			}

			url = url + name + "=" + value;
		}else{
			let newValue = name + "=" + value;
			url = url.replace(results[2], newValue);
		}
		window.history.replaceState({}, "", url);
	}
	
};

Potree.utils.screenPass = new function(){

	this.screenScene = new THREE.Scene();
	this.screenQuad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 0));
	this.screenQuad.material.depthTest = true;
	this.screenQuad.material.depthWrite = true;
	this.screenQuad.material.transparent = true;
	this.screenScene.add(this.screenQuad);
	this.camera = new THREE.Camera();
	
	this.render = function(renderer, material, target){
		this.screenQuad.material = material;
		
		if(typeof target === "undefined"){
			renderer.render(this.screenScene, this.camera);
		}else{
			renderer.render(this.screenScene, this.camera, target);
		}
	};
}();


