const WebGLBuffer = require('./webgl/WebGLBuffer');
const PointCloudTree = require('./tree/PointCloudTree');
const THREE = require('three');
const Shader = require('./webgl/Shader');
const WebGLTexture = require('./webgl/WebGLTexture');
const PointSizeType = require('./materials/PointSizeType');
const PointColorType = require('./materials/PointColorType');

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

	renderNodes (octree, nodes, visibilityTextureData, camera, target, shader, params) {
		let gl = this.gl;

		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;
		let worldView = new THREE.Matrix4();
		let i = 0;
		for (let node of nodes) {
			let world = node.sceneNode.matrixWorld;
			worldView.multiplyMatrices(view, world);

			let vnStart = visibilityTextureData.offsets.get(node);

			let level = node.getLevel();

			const lModel = shader.uniformLocations['modelMatrix'];
			gl.uniformMatrix4fv(lModel, false, world.elements);

			const lModelView = shader.uniformLocations['modelViewMatrix'];
			gl.uniformMatrix4fv(lModelView, false, worldView.elements);

			// shader.setUniformMatrix4("modelMatrix", world);
			// shader.setUniformMatrix4("modelViewMatrix", worldView);
			shader.setUniform1f('level', level);
			shader.setUniform1f('vnStart', vnStart);
			shader.setUniform1f('pcIndex', i);

			if (shadowMaps.length > 0) {
				let view = shadowMaps[0].camera.matrixWorldInverse;
				let proj = shadowMaps[0].camera.projectionMatrix;

				let worldView = new THREE.Matrix4()
					.multiplyMatrices(view, world);
				let worldViewProj = new THREE.Matrix4()
					.multiplyMatrices(proj, worldView);
				shader.setUniformMatrix4('smWorldViewProj', worldViewProj);

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

			gl.bindVertexArray(buffer.vao);

			let numPoints = iBuffer.numElements;
			gl.drawArrays(gl.POINTS, 0, numPoints);

			i++;
		}

		gl.bindVertexArray(null);
	}

	renderOctree (octree, nodes, camera, target, params = {}) {
		let gl = this.gl;

		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;
		let proj = camera.projectionMatrix;
		// TODO: unused: let worldView = new THREE.Matrix4();

		let material = octree.material;
		let shader = null;
		let visibilityTextureData = null;

		if (material.pointSizeType >= 0) {
			if (material.pointSizeType === PointSizeType.ADAPTIVE ||
				material.pointColorType === PointColorType.LOD) {
				visibilityTextureData = octree.computeVisibilityTextureData(nodes);

				const vnt = material.visibleNodesTexture;
				const data = vnt.image.data;
				data.set(visibilityTextureData.data);
				vnt.needsUpdate = true;
			}
		}

		{ // UPDATE SHADER AND TEXTURES
			if (!this.shaders.has(material)) {
				let [vs, fs] = [material.vertexShader, material.fragmentShader];
				let shader = new Shader(gl, 'pointcloud', vs, fs);

				this.shaders.set(material, shader);
			}

			shader = this.shaders.get(material);

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
		}

		gl.useProgram(shader.program);

		{ // UPDATE UNIFORMS
			shader.setUniformMatrix4('projectionMatrix', proj);
			shader.setUniformMatrix4('viewMatrix', view);

			shader.setUniform1f('screenHeight', material.screenHeight);
			shader.setUniform1f('screenWidth', material.screenWidth);
			shader.setUniform1f('fov', Math.PI * camera.fov / 180);
			shader.setUniform1f('near', camera.near);
			shader.setUniform1f('far', camera.far);

			shader.setUniform('useOrthographicCamera', material.useOrthographicCamera);
			// uniform float orthoRange;

			if (material.clipBoxes && material.clipBoxes.length > 0) {
				shader.setUniform1i('clipMode', material.clipMode);
				shader.setUniform('clipBoxCount', material.clipBoxes.length);
				let flattenedMatrices = [].concat(...material.clipBoxes.map(c => c.inverse.elements));
				// shader.setUniformMatrix4fv("clipBoxes", flattenedMatrices);

				const lClipBoxes = shader.uniformLocations['clipBoxes[0]'];
				gl.uniformMatrix4fv(lClipBoxes, false, flattenedMatrices);
			}

			// uniform int clipMode;
			// #if defined use_clip_box
			//	uniform float clipBoxCount;
			//	uniform mat4 clipBoxes[max_clip_boxes];
			// #endif

			// uniform int clipPolygonCount;
			// uniform int clipPolygonVCount[max_clip_polygons];
			// uniform vec3 clipPolygons[max_clip_polygons * 8];
			// uniform mat4 clipPolygonVP[max_clip_polygons];

			shader.setUniform1f('size', material.size);
			shader.setUniform1f('maxSize', 50);
			shader.setUniform1f('minSize', 1);

			// uniform float pcIndex
			shader.setUniform1f('spacing', material.spacing);
			shader.setUniform('octreeSize', material.uniforms.octreeSize.value);

			// uniform vec3 uColor;
			// uniform float opacity;

			shader.setUniform2f('elevationRange', material.elevationRange);
			shader.setUniform2f('intensityRange', material.intensityRange);
			// uniform float intensityGamma;
			// uniform float intensityContrast;
			// uniform float intensityBrightness;
			shader.setUniform1f('rgbGamma', material.rgbGamma);
			shader.setUniform1f('rgbContrast', material.rgbContrast);
			shader.setUniform1f('rgbBrightness', material.rgbBrightness);
			// uniform float transition;
			// uniform float wRGB;
			// uniform float wIntensity;
			// uniform float wElevation;
			// uniform float wClassification;
			// uniform float wReturnNumber;
			// uniform float wSourceID;

			shader.setUniform('useShadowMap', shadowMaps.length > 0);

			let vnWebGLTexture = this.textures.get(material.visibleNodesTexture);
			shader.setUniform1i('visibleNodesTexture', 0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(vnWebGLTexture.target, vnWebGLTexture.id);

			let gradientTexture = this.textures.get(material.gradientTexture);
			shader.setUniform1i('gradient', 1);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gradientTexture.target, gradientTexture.id);
		}

		gl.bindAttribLocation(shader.program, 0, 'position');
		gl.bindAttribLocation(shader.program, 1, 'color');
		gl.bindAttribLocation(shader.program, 2, 'intensity');
		gl.bindAttribLocation(shader.program, 3, 'classification');
		gl.bindAttribLocation(shader.program, 4, 'returnNumber');
		gl.bindAttribLocation(shader.program, 5, 'numberOfReturns');
		gl.bindAttribLocation(shader.program, 6, 'pointSourceID');
		gl.bindAttribLocation(shader.program, 7, 'index');

		this.renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params);
	}

	render (scene, camera, target, params = {}) {
		const gl = this.gl;

		// PREPARE
		if (target != null) {
			this.threeRenderer.setRenderTarget(target);
		}

		camera.updateProjectionMatrix();

		const traversalResult = this.traverse(scene);

		// RENDER
		for (const octree of traversalResult.octrees) {
			let nodes = octree.visibleNodes;
			this.renderOctree(octree, nodes, camera, target, params);
		}

		// CLEANUP
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);

		this.threeRenderer.resetGLState();
	}
};
