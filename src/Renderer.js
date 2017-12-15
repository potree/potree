const WebGLBuffer = require('./webgl/WebGLBuffer');
const PointCloudTree = require('./tree/PointCloudTree');
const THREE = require('three');
const Shader = require('./webgl/Shader');
const WebGLTexture = require('./webgl/WebGLTexture');

module.exports = class Renderer {
	constructor (threeRenderer) {
		this.threeRenderer = threeRenderer;
		this.gl = this.threeRenderer.context;

		this.buffers = new Map();
		this.shaders = new Map();
		this.textures = new Map();

		this.toggle = 0;
	}

	createBuffer (iBuffer) {
		let gl = this.gl;
		let buffer = new WebGLBuffer();
		buffer.iBuffer = iBuffer;
		buffer.vao = gl.createVertexArray();
		buffer.vbo = gl.createBuffer();

		gl.bindVertexArray(buffer.vao);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.vbo);
		gl.bufferData(gl.ARRAY_BUFFER, iBuffer.data, gl.STATIC_DRAW);

		let offset = 0;
		let i = 0;
		for (let attribute of iBuffer.attributes) {
			let type = gl[attribute.type];
			let normalized = attribute.normalized;
			let stride = iBuffer.stride;
			let numElements = attribute.numElements;

			gl.vertexAttribPointer(i, numElements, type, normalized, stride, offset);
			gl.enableVertexAttribArray(i);

			offset += attribute.bytes;
			i++;
		}

		gl.bindVertexArray(null);

		return buffer;
	}

	traverse (scene) {
		let octrees = [];

		let stack = [scene];
		while (stack.length > 0) {
			let node = stack.pop();
			if (node instanceof PointCloudTree) {
				octrees.push(node);
				continue;
			}

			let visibleChildren = node.children.filter(c => c.visible);
			stack.push(...visibleChildren);
		}

		let result = {
			octrees: octrees
		};

		return result;
	}

	render (scene, camera, target, params = {}) {
		let gl = this.gl;

		// TODO unused: let doLog = this.toggle > 100;
		this.toggle = this.toggle > 100 ? 0 : this.toggle + 1;

		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;

		if (target != null) {
			this.threeRenderer.setRenderTarget(target);
		}

		let traversalResult = this.traverse(scene);

		let view = camera.matrixWorldInverse;
		let proj = camera.projectionMatrix;
		let worldView = new THREE.Matrix4();

		for (let octree of traversalResult.octrees) {
			let material = octree.material;

			if (!this.shaders.has(material)) {
				let [vs, fs] = [material.vertexShader, material.fragmentShader];
				let shader = new Shader(gl, 'pointcloud', vs, fs);

				this.shaders.set(material, shader);
			}
			let shader = this.shaders.get(material);
			if (material.needsUpdate) {
				let [vs, fs] = [material.vertexShader, material.fragmentShader];
				shader.update(vs, fs);

				material.needsUpdate = false;
			}

			for (let uniformName of Object.keys(material.uniforms)) {
				let uniform = material.uniforms[uniformName];

				if (uniform.type === 't') {
					let texture = uniform.value;

					if (!this.textures.has(texture)) {
						let webglTexture = new WebGLTexture(gl, texture);

						this.textures.set(texture, webglTexture);
					}

					let webGLTexture = this.textures.get(texture);
					webGLTexture.update();
				}
			}

			gl.useProgram(shader.program);

			shader.setUniform('projectionMatrix', proj);
			shader.setUniform('viewMatrix', view);
			shader.setUniform('fov', Math.PI * camera.fov / 180);
			shader.setUniform('maxSize', 50);
			shader.setUniform('minSize', 2);
			shader.setUniform('rgbGamma', material.rgbGamma);
			shader.setUniform('rgbContrast', material.rgbContrast);
			shader.setUniform('rgbBrightness', material.rgbBrightness);
			shader.setUniform('screenHeight', material.screenHeight);
			shader.setUniform('screenWidth', material.screenWidth);
			shader.setUniform('size', material.size);
			shader.setUniform('spacing', material.spacing);
			shader.setUniform('useOrthographicCamera', material.useOrthographicCamera);
			shader.setUniform('octreeSize', material.uniforms.octreeSize.value);

			shader.setUniform('useShadowMap', shadowMaps.length > 0);

			let vnWebGLTexture = this.textures.get(material.visibleNodesTexture);
			shader.setUniform1i('visibleNodesTexture', 0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(vnWebGLTexture.target, vnWebGLTexture.id);
			// shader.setUniform("visibleNodesTexture", vnWebGLTexture);

			gl.bindAttribLocation(shader.program, 0, 'position');
			gl.bindAttribLocation(shader.program, 1, 'color');

			// for(let i = 2; i < Math.min(3, octree.visibleNodes.length); i++){
			// 	let node = octree.visibleNodes[i];
			for (let node of octree.visibleNodes) {
				let world = node.sceneNode.matrixWorld;
				worldView.multiplyMatrices(view, world);

				let vnStart = octree.visibleNodeTextureOffsets.get(node);

				shader.setUniform('modelMatrix', world);
				shader.setUniform('modelViewMatrix', worldView);
				shader.setUniform('level', node.getLevel());
				shader.setUniform('vnStart', vnStart);

				if (shadowMaps.length > 0) {
					let view = shadowMaps[0].camera.matrixWorldInverse;
					let proj = shadowMaps[0].camera.projectionMatrix;

					let worldView = new THREE.Matrix4()
						.multiplyMatrices(view, world);
					let worldViewProj = new THREE.Matrix4()
						.multiplyMatrices(proj, worldView);
					shader.setUniform('smWorldViewProj', worldViewProj);

					shader.setUniform1i('shadowMap', 1);
					let id = this.threeRenderer.properties.get(shadowMaps[0].map.depthTexture)
						.__webglTexture;
					gl.activeTexture(gl.TEXTURE1);
					gl.bindTexture(gl.TEXTURE_2D, id);
				}

				let iBuffer = node.geometryNode.buffer;

				if (!this.buffers.has(iBuffer)) {
					let buffers = this.createBuffer(iBuffer);
					this.buffers.set(iBuffer, buffers);
				}

				let buffer = this.buffers.get(iBuffer);

				// for(let attributeName of Object.keys(bufferGeometry.attributes)){
				//
				// 	let attribute = bufferGeometry.attributes[attributeName];
				// 	let buffer = buffers.vbos.get(attribute);
				//
				// 	let itemSize = attribute.itemSize;
				// 	let normalized = attribute.normalized;
				// 	let stride = 0;
				// 	let offset = 0;
				//
				// 	let location = shader.attributeLocations[attributeName];
				//
				// 	if(location == null){
				// 		//gl.bindBuffer(gl.ARRAY_BUFFER, buffer.id);
				// 		//gl.disableVertexAttribArray(location);
				// 	}else{
				// 		gl.bindBuffer(gl.ARRAY_BUFFER, buffer.id);
				// 		gl.vertexAttribPointer(location,
				// 			itemSize, buffer.type, normalized, stride, offset);
				// 		gl.enableVertexAttribArray(location);
				// 	}
				//
				//
				// }

				// gl.bindBuffer(gl.ARRAY_BUFFER, null);
				gl.bindVertexArray(buffer.vao);

				let numPoints = iBuffer.numElements;
				gl.drawArrays(gl.POINTS, 0, numPoints);
			}

			gl.bindVertexArray(null);

			// if(doLog) console.log(octree);
			// if(doLog) console.log(octree.visibleNodes);
		}

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);

		// if(doLog) console.log(traversalResult);
		this.threeRenderer.resetGLState();
	}
};
