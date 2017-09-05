const GLQueries = require('./webgl/GLQueries');

function Potree () {}

const context = require('./context');
Potree.version = context.version;

console.log('Potree ' + context.version.major + '.' + context.version.minor + context.version.suffix);

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'pointBudget', {
	get: () => context.pointBudget,
	set: (value) => (context.pointBudget = value)
});

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'framenumber', {
	get: () => context.framenumber,
	set: (value) => (context.framenumber = value)
});

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'pointLoadLimit', {
	get: () => context.pointBudget,
	set: (value) => (context.pointBudget = value)
});

// contains WebWorkers with base64 encoded code
// Potree.workers = {};

Object.defineProperty(Potree, 'Shaders', {
	get: function () { throw new Error('legacy, has been removed for the greater good'); },
	set: function () { throw new Error('legacy, has been removed for the greater good'); }
});

Potree.webgl = {
	shaders: {},
	vaos: {},
	vbos: {}
};

Potree.scriptPath = context.scriptPath;
Potree.resourcePath = context.resourcePath;
Potree.workerPool = context.workerPool;

function legacyGL () {
	return window.viewer.renderer.getContext();
};

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'timerQueriesEnabled', {
	get: () => GLQueries.forGL(legacyGL()).enabled,
	set: (value) => (GLQueries.forGL(legacyGL()).enabled = value)
});

// LEGACY: this property exists just in case someone used it.
Object.defineProperty(Potree, 'timerQueries', {
	get: () => GLQueries.forGL(legacyGL()).queries,
	set: (value) => (GLQueries.forGL(legacyGL()).queries = value)
});

Potree.startQuery = function (name, gl) {
	return GLQueries.forGL(gl || legacyGL()).start(name);
};

Potree.endQuery = function (query, gl) {
	return GLQueries.forGL(gl || legacyGL()).end();
};

Potree.resolveQueries = function (gl) {
	return GLQueries.forGL(gl || legacyGL()).resolve();
};

// LEGACY: placeholder
Potree.getLRU = function () {
	Potree.lru = context.getLRU();
	return Potree.lru;
};

// LEGACY: placeholder
Potree.getDEMWorkerInstance = function () {
	Potree.DEMWorkerInstance = context.getDEMWorkerInstance();
	return Potree.DEMWorkerInstance;
};

/*
function createDEMMesh (dem) {
	let box = dem.boundingBox;

	let steps = 256;
	let triangles = [];
	for (let i = 0; i < steps; i++) {
		for (let j = 0; j < steps; j++) {
			let u0 = i / steps;
			let u1 = (i + 1) / steps;
			let v0 = j / steps;
			let v1 = (j + 1) / steps;

			// let x0 = box.min.x + u0 * box.getSize().x;
			// let x1 = box.min.x + u1 * box.getSize().x;
			// let y0 = box.min.y + v0 * box.getSize().y;
			// let y1 = box.min.y + v1 * box.getSize().y;
			//
			// let h00 = dem.height(new THREE.Vector3(x0, y0, 0));
			// let h10 = dem.height(new THREE.Vector3(x1, y0, 0));
			// let h01 = dem.height(new THREE.Vector3(x0, y1, 0));
			// let h11 = dem.height(new THREE.Vector3(x1, y1, 0));

			let x0 = u0 * box.getSize().x;
			let x1 = u1 * box.getSize().x;
			let y0 = v0 * box.getSize().y;
			let y1 = v1 * box.getSize().y;

			// let h00 = demNode.data[(i+0) + tileSize * (j+0)];
			// let h10 = demNode.data[(i+1) + tileSize * (j+0)];
			// let h01 = demNode.data[(i+0) + tileSize * (j+1)];
			// let h11 = demNode.data[(i+1) + tileSize * (j+1)];

			let h00 = dem.height(new THREE.Vector3(box.min.x + x0, box.min.y + y0));
			let h10 = dem.height(new THREE.Vector3(box.min.x + x1, box.min.y + y0));
			let h01 = dem.height(new THREE.Vector3(box.min.x + x0, box.min.y + y1));
			let h11 = dem.height(new THREE.Vector3(box.min.x + x1, box.min.y + y1));

			if (![h00, h10, h01, h11].every(n => isFinite(n))) {
				continue;
			}

			triangles.push(x0, y0, h00);
			triangles.push(x0, y1, h01);
			triangles.push(x1, y0, h10);

			triangles.push(x0, y1, h01);
			triangles.push(x1, y1, h11);
			triangles.push(x1, y0, h10);
		}
	}

	let geometry = new THREE.BufferGeometry();
	let positions = new Float32Array(triangles);
	geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.computeBoundingSphere();
	geometry.computeVertexNormals();
	let material = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
	let mesh = new THREE.Mesh(geometry, material);
	mesh.position.copy(box.min);
	// mesh.position.copy(pointcloud.position);
	viewer.scene.scene.add(mesh);
}
*/

/*
function createDEMMeshNode (dem, demNode) {
	let box = demNode.box;
	let tileSize = dem.tileSize * 1;

	let triangles = [];
	for (let i = 0; i < tileSize; i++) {
		// for(let j = 0; j < 1; j++){
		for (let j = 0; j < tileSize; j++) {
			let u0 = i / tileSize;
			let u1 = (i + 1) / tileSize;
			let v0 = j / tileSize;
			let v1 = (j + 1) / tileSize;

			let x0 = u0 * box.getSize().x;
			let x1 = u1 * box.getSize().x;
			let y0 = v0 * box.getSize().y;
			let y1 = v1 * box.getSize().y;

			// let h00 = demNode.data[(i+0) + tileSize * (j+0)];
			// let h10 = demNode.data[(i+1) + tileSize * (j+0)];
			// let h01 = demNode.data[(i+0) + tileSize * (j+1)];
			// let h11 = demNode.data[(i+1) + tileSize * (j+1)];

			let h00 = demNode.height(new THREE.Vector3(box.min.x + x0, box.min.y + y0));
			let h10 = demNode.height(new THREE.Vector3(box.min.x + x1, box.min.y + y0));
			let h01 = demNode.height(new THREE.Vector3(box.min.x + x0, box.min.y + y1));
			let h11 = demNode.height(new THREE.Vector3(box.min.x + x1, box.min.y + y1));

			if (![h00, h10, h01, h11].every(n => isFinite(n))) {
				continue;
			}

			triangles.push(x0, y0, h00);
			triangles.push(x0, y1, h01);
			triangles.push(x1, y0, h10);

			triangles.push(x0, y1, h01);
			triangles.push(x1, y1, h11);
			triangles.push(x1, y0, h10);
		}
	}

	let geometry = new THREE.BufferGeometry();
	let positions = new Float32Array(triangles);
	geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.computeBoundingSphere();
	geometry.computeVertexNormals();
	let material = new THREE.MeshNormalMaterial({side: THREE.DoubleSide});
	let mesh = new THREE.Mesh(geometry, material);
	mesh.position.copy(box.min);
	// mesh.position.copy(pointcloud.position);
	viewer.scene.scene.add(mesh);

	{ // DEBUG code
		// let data = demNode.data;

		let steps = 64;
		let data = new Float32Array(steps * steps);
		let imgData = new Uint8Array(data.length * 4);
		let box = demNode.box;
		let boxSize = box.getSize();
		for (let i = 0; i < steps; i++) {
			for (let j = 0; j < steps; j++) {
				let [u, v] = [i / (steps - 1), j / (steps - 1)];
				let pos = new THREE.Vector3(
					u * boxSize.x + box.min.x,
					v * boxSize.y + box.min.y,
					0
				);

				let height = demNode.height(pos);

				let index = i + steps * j;
				data[index] = height;

				// let index = i + steps * j;
				// imgData[4*index + 0] = 255 * (height - min) / (max - min);
				// imgData[4*index + 1] = 100;
				// imgData[4*index + 2] = 0;
				// imgData[4*index + 3] = 255;
			}
		}

		let [min, max] = [Infinity, -Infinity];
		for (let height of data) {
			if (!isFinite(height)) {
				continue;
			}

			min = Math.min(min, height);
			max = Math.max(max, height);
		}

		for (let i = 0; i < data.length; i++) {
			imgData[4 * i + 0] = 255 * (data[i] - min) / (max - min);
			imgData[4 * i + 1] = 100;
			imgData[4 * i + 2] = 0;
			imgData[4 * i + 3] = 255;
		}

		let img = Potree.utils.pixelsArrayToImage(imgData, steps, steps);

		let screenshot = img.src;

		if (!this.debugDIV) {
			this.debugDIV = $(`
				<div id="pickDebug"
				style="position: absolute;
				right: 400px; width: 300px;
				bottom: 44px; width: 300px;
				z-index: 1000;
				"></div>`);
			$(document.body).append(this.debugDIV);
		}

		this.debugDIV.empty();
		this.debugDIV.append($(`<img src="${screenshot}"
			style="transform: scaleY(-1); width: 256px; height: 256px;"/>`));
	}
}
*/
/*
//
// WAY TOO SLOW WITH SYNCHRONOUS READ PIXEL
//
Potree.DEMRenderer = class{
	constructor(renderer){
		this.renderer = renderer;

		this.tileWidth = 64;
		this.tileHeight = 64;

		//this.target = new THREE.WebGLRenderTarget( 64, 64, {
		//	minFilter: THREE.NearestFilter,
		//	magFilter: THREE.NearestFilter,
		//	format: THREE.RGBAFormat,
		//	type: THREE.FloatType
		//} );
		//this.target.depthTexture = new THREE.DepthTexture();
        //this.target.depthTexture.type = THREE.UnsignedIntType;

		this.targetElevation = new THREE.WebGLRenderTarget( this.tileWidth, this.tileHeight, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			//type: THREE.FloatType
		});

		this.targetMedian = new THREE.WebGLRenderTarget( this.tileWidth, this.tileHeight, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			//type: THREE.FloatType
		});

		this.vsElevation = `
			precision mediump float;
			precision mediump int;

			attribute vec3 position;

			uniform mat4 modelMatrix;
			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			varying float vElevation;

			void main(){
				vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
				gl_Position = projectionMatrix * mvPosition;
				gl_PointSize = 1.0;

				vElevation = position.z;
			}
		`;

		this.fsElevation = `
					precision mediump float;
					precision mediump int;

					varying float vElevation;

					void main(){
						gl_FragColor = vec4(vElevation, 0.0, 0.0, 1.0);
					}
		`;

		this.vsMedian = `
			precision mediump float;
			precision mediump int;

			attribute vec3 position;
			attribute vec2 uv;

			uniform mat4 modelMatrix;
			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			varying vec2 vUV;

			void main() {
				vUV = uv;

				vec4 mvPosition = modelViewMatrix * vec4(position,1.0);

				gl_Position = projectionMatrix * mvPosition;
			}
		`;

		this.fsMedian = `

			precision mediump float;
			precision mediump int;

			uniform float uWidth;
			uniform float uHeight;
			uniform sampler2D uTexture;

			varying vec2 vUV;

			void main(){
				vec2 uv = gl_FragCoord.xy / vec2(uWidth, uHeight);

				vec4 color = texture2D(uTexture, uv);
				gl_FragColor = color;
                if(color.a == 0.0){

                    vec4 sum;

                    float minVal = 1.0 / 0.0;

                    float sumA = 0.0;
					for(int i = -1; i <= 1; i++){
						for(int j = -1; j <= 1; j++){
							vec2 n = gl_FragCoord.xy + vec2(i, j);
                            vec2 uv = n / vec2(uWidth, uHeight);
                            vec4 c = texture2D(uTexture, uv);

                            if(c.a == 1.0){
                            	minVal = min(c.r, minVal);
                            }

                            sumA += c.a;
						}
					}

                    if(sumA > 0.0){
                    	gl_FragColor = vec4(minVal, 0.0, 0.0, 1.0);
                    }else{
                    	discard;
                    }
				}else{
					//gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
					gl_FragColor = vec4(color.rgb, 1.0);
				}

			}

		`;

		this.elevationMaterial = new THREE.RawShaderMaterial( {
			vertexShader: this.vsElevation,
			fragmentShader: this.fsElevation,
		} );

		this.medianFilterMaterial = new THREE.RawShaderMaterial( {
			uniforms: {
				uWidth: {value: 1.0},
				uHeight: {value: 1.0},
				uTexture: {type: "t", value: this.targetElevation.texture}
			},
			vertexShader: this.vsMedian,
			fragmentShader: this.fsMedian,
		});

		this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, 0, 1);

	}

	render(pointcloud, node){
		if(!node.geometryNode){
			return;
		}

		Potree.timerQueriesEnabled = true;
		let start = new Date().getTime();
		let queryAll = Potree.startQuery("All", this.renderer.getContext());

		this.renderer.setClearColor(0x0000FF, 0);
		this.renderer.clearTarget( this.target, true, true, true );
		this.renderer.clearTarget(this.targetElevation, true, true, false );
		this.renderer.clearTarget(this.targetMedian, true, true, false );

		let box = node.geometryNode.boundingBox;

		this.camera.up.set(0, 0, 1);
		//this.camera.rotation.x = Math.PI / 2;
		this.camera.left = box.min.x;
		this.camera.right = box.max.x;
		this.camera.top = box.max.y;
		this.camera.bottom = box.min.y;
		this.camera.near = -1000;
		this.camera.far = 1000;
		this.camera.updateProjectionMatrix();

		let scene = new THREE.Scene();
		//let material = new THREE.PointsMaterial({color: 0x00ff00, size: 0.0001});
		let material = this.elevationMaterial;
		let points = new THREE.Points(node.geometryNode.geometry, material);
		scene.add(points);

		this.renderer.render(points, this.camera, this.targetElevation);

		this.medianFilterMaterial.uniforms.uWidth.value = this.targetMedian.width;
		this.medianFilterMaterial.uniforms.uHeight.value = this.targetMedian.height;
		this.medianFilterMaterial.uniforms.uTexture.value = this.targetElevation.texture;

		Potree.utils.screenPass.render(this.renderer, this.medianFilterMaterial, this.targetMedian);

		Potree.endQuery(queryAll, this.renderer.getContext());
		Potree.resolveQueries(this.renderer.getContext());
		Potree.timerQueriesEnabled = false;

		setTimeout( () => {
			let start = new Date().getTime();

			let pixelCount = this.tileWidth * this.tileHeight;
			let buffer = new Uint8Array(4 * pixelCount);
			this.renderer.readRenderTargetPixels(this.targetMedian,
				0, 0, this.tileWidth, this.tileHeight,
				buffer);

			let end = new Date().getTime();
			let duration = end - start;
			console.log(`read duration: ${duration}ms`);
		}, 3000);

		let end = new Date().getTime();
		let duration = end - start;

		console.log(`duration: ${duration}ms`);

		//{ // open window with image
		//
		//	let pixelCount = this.tileWidth * this.tileHeight;
		//	let buffer = new Float32Array(4 * pixelCount);
		//	this.renderer.readRenderTargetPixels(this.targetMedian,
		//		0, 0, this.tileWidth, this.tileHeight,
		//		buffer);
		//
		//	let uiBuffer = new Uint8Array(4 * pixelCount);
		//	for(let i = 0; i < pixelCount; i++){
		//		uiBuffer[i] = buffer[i] / 1.0;
		//	}
		//
		//	let img = Potree.utils.pixelsArrayToImage(uiBuffer, this.tileWidth, this.tileHeight);
		//	let screenshot = img.src;
		//
		//	if(!this.debugDIV){
		//		this.debugDIV = $(`
		//			<div id="pickDebug"
		//			style="position: absolute;
		//			right: 400px; width: 300px;
		//			bottom: 44px; width: 300px;
		//			z-index: 1000;
		//			"></div>`);
		//		$(document.body).append(this.debugDIV);
		//	}
		//
		//	this.debugDIV.empty();
		//	this.debugDIV.append($(`<img src="${screenshot}"
		//		style="transform: scaleY(-1);"/>`));
		//	//$(this.debugWindow.document).append($(`<img src="${screenshot}"/>`));
		//	//this.debugWindow.document.write('<img src="'+screenshot+'"/>');
		//}
	}
};
*/
