const WebGLBuffer = require('./webgl/WebGLBuffer');
const PointCloudTree = require('./tree/PointCloudTree');
const THREE = require('three');
const Shader = require('./webgl/Shader');
const WebGLTexture = require('./webgl/WebGLTexture');
const PointSizeType = require('./materials/PointSizeType');
const PointColorType = require('./materials/PointColorType');
const context = require('./context');
const attributeLocations = require('./attributeLocations');

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
		for (let attribute of iBuffer.attributes) {
			let type = gl[attribute.type];
			let normalized = attribute.normalized;
			let stride = iBuffer.stride;
			let numElements = attribute.numElements;

			let location = attributeLocations[attribute.name];
			gl.vertexAttribPointer(location, numElements, type, normalized, stride, offset);
			gl.enableVertexAttribArray(location);

			offset += Math.ceil(attribute.bytes / 4) * 4;
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
		if (context.measureTimings) {
			performance.mark('renderNodes-start');
		}

		let gl = this.gl;

		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;
		let worldView = new THREE.Matrix4();
		let mat4holder = new Float32Array(16);
		let i = 0;
		for (let node of nodes) {
			let world = node.sceneNode.matrixWorld;
			worldView.multiplyMatrices(view, world);

			if (visibilityTextureData) {
				let vnStart = visibilityTextureData.offsets.get(node);
				shader.setUniform1f('uVNStart', vnStart);
			}

			let level = node.getLevel();

			// TODO consider passing matrices in an array to avoid uniformMatrix4fv overhead
			const lModel = shader.uniformLocations['modelMatrix'];
			if (lModel) {
				mat4holder.set(world.elements);
				gl.uniformMatrix4fv(lModel, false, mat4holder);
			}

			const lModelView = shader.uniformLocations['modelViewMatrix'];
			mat4holder.set(worldView.elements);
			gl.uniformMatrix4fv(lModelView, false, mat4holder);

			// shader.setUniformMatrix4("modelMatrix", world);
			// shader.setUniformMatrix4("modelViewMatrix", worldView);
			shader.setUniform1f('uLevel', level);
			shader.setUniform1f('uPCIndex', i);

			if (shadowMaps.length > 0) {
				const lShadowMap = shader.uniformLocations['uShadowMap[0]'];

				shader.setUniform3f('uShadowColor', octree.material.uniforms.uShadowColor.value);

				let bindingStart = 5;
				let bindingPoints = new Array(shadowMaps.length).fill(bindingStart).map((a, i) => (a + i));
				gl.uniform1iv(lShadowMap, bindingPoints);

				for (let i = 0; i < shadowMaps.length; i++) {
					let shadowMap = shadowMaps[i];
					let bindingPoint = bindingPoints[i];
					let glTexture = this.threeRenderer.properties.get(shadowMap.target.texture).__webglTexture;

					gl.activeTexture(gl[`TEXTURE${bindingPoint}`]);
					gl.bindTexture(gl.TEXTURE_2D, glTexture);
				}
				{
					let worldViewMatrices = shadowMaps
						.map(sm => new THREE.Matrix4().makeTranslation(...sm.lightPos.clone().multiplyScalar(-1).toArray()))
						.map(view => new THREE.Matrix4().multiplyMatrices(view, world));

					let flattenedMatrices = [].concat(...worldViewMatrices.map(c => c.elements));
					const lWorldView = shader.uniformLocations['uShadowWorldView[0]'];
					gl.uniformMatrix4fv(lWorldView, false, flattenedMatrices);
				}
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

		if (context.measureTimings) {
			performance.mark('renderNodes-end');
			performance.measure('render.renderNodes', 'renderNodes-start', 'renderNodes-end');
		}
	}

	renderOctree (octree, nodes, camera, target, params = {}) {
		let gl = this.gl;

		let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
		let view = camera.matrixWorldInverse;
		let viewInv = camera.matrixWorld;
		let proj = camera.projectionMatrix;
		let projInv = new THREE.Matrix4().getInverse(camera.projectionMatrix);
		// TODO: unused: let worldView = new THREE.Matrix4();

		let material = octree.material;
		let shader = null;
		let visibilityTextureData = null;

		// if(!["r", "r2", "r0", "r26", "r22", "r06", "r24", "r20", "r04", "r00", "r02"].includes(node.name)){
		// 	if(!["r", "r2", "r0"].includes(node.name)){
		// 		continue;
		// 	}
		//
		// nodes = nodes.filter(node => {
		// 	//return ["r",
		// 	//	"r3", "r1", "r0", "r2",
		// 	//	"r30", "r21", "r03", "r02", "r01", "r12", "r20", "r15", "r05", "r14", "r00", "r10", "r04"].includes(node.name)
		//
		// 	return ["r",
		// 		"r06", "r07"].includes(node.name)
		// });

		if (material.pointSizeType >= 0) {
			if (material.pointSizeType === PointSizeType.ADAPTIVE ||
				material.pointColorType === PointColorType.LOD) {
				let vnNodes = (params.vnTextureNodes != null) ? params.vnTextureNodes : nodes;
				visibilityTextureData = octree.computeVisibilityTextureData(vnNodes);

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

			// if (material.needsUpdate){
			{
				let [vs, fs] = [material.vertexShader, material.fragmentShader];

				let numSnapshots = material.snapEnabled ? material.numSnapshots : 0;
				let numClipBoxes = (material.clipBoxes && material.clipBoxes.length) ? material.clipBoxes.length : 0;
				let defines = [
					`#define num_shadowmaps ${shadowMaps.length}`,
					`#define num_snapshots ${numSnapshots}`,
					`#define num_clipboxes ${numClipBoxes}`
				];

				// vs = `#define num_shadowmaps ${shadowMaps.length}\n` + vs;
				// fs = `#define num_shadowmaps ${shadowMaps.length}\n` + fs;

				let definesString = defines.join('\n');

				vs = `${definesString}\n${vs}`;
				fs = `${definesString}\n${fs}`;

				shader.update(vs, fs);

				material.needsUpdate = false;
			}

			for (let uniformName of Object.keys(material.uniforms)) {
				let uniform = material.uniforms[uniformName];

				if (uniform.type === 't') {
					let texture = uniform.value;

					if (!texture) {
						continue;
					}

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

		if (material.opacity < 1) {
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
			gl.depthMask(false);
			gl.disable(gl.DEPTH_TEST);
		} else {
			gl.disable(gl.BLEND);
			gl.depthMask(true);
			gl.enable(gl.DEPTH_TEST);
		}

		{ // UPDATE UNIFORMS
			shader.setUniformMatrix4('projectionMatrix', proj);
			shader.setUniformMatrix4('viewMatrix', view);
			shader.setUniformMatrix4('uViewInv', viewInv);
			shader.setUniformMatrix4('uProjInv', projInv);

			shader.setUniform1f('uScreenHeight', material.screenHeight);
			shader.setUniform1f('uScreenWidth', material.screenWidth);
			shader.setUniform1f('fov', Math.PI * camera.fov / 180);
			shader.setUniform1f('near', camera.near);
			shader.setUniform1f('far', camera.far);

			shader.setUniform('useOrthographicCamera', material.useOrthographicCamera);
			shader.setUniform('orthoRange', material.orthoRange);

			if (material.clipBoxes && material.clipBoxes.length > 0) {
				shader.setUniform1i('clipMode', material.clipMode);
				let flattenedMatrices = [].concat(...material.clipBoxes.map(c => c.inverse.elements));

				const lClipBoxes = shader.uniformLocations['clipBoxes[0]'];
				gl.uniformMatrix4fv(lClipBoxes, false, flattenedMatrices);
			}

			// uniform int clipPolygonCount;
			// uniform int clipPolygonVCount[max_clip_polygons];
			// uniform vec3 clipPolygons[max_clip_polygons * 8];
			// uniform mat4 clipPolygonVP[max_clip_polygons];

			shader.setUniform1f('size', material.size);
			shader.setUniform1f('maxSize', 50);
			shader.setUniform1f('minSize', 1);

			// uniform float uPCIndex
			shader.setUniform1f('uSpacing', material.spacing);
			shader.setUniform('uOctreeSize', material.uniforms.octreeSize.value);

			// uniform vec3 uColor;
			// uniform float opacity;
			shader.setUniform1f('uOpacity', material.opacity);

			shader.setUniform2f('elevationRange', material.elevationRange);
			shader.setUniform2f('intensityRange', material.intensityRange);
			// uniform float intensityGamma;
			// uniform float intensityContrast;
			// uniform float intensityBrightness;
			shader.setUniform1f('intensityGamma', material.intensityGamma);
			shader.setUniform1f('intensityContrast', material.intensityContrast);
			shader.setUniform1f('intensityBrightness', material.intensityBrightness);

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

			let vnWebGLTexture = this.textures.get(material.visibleNodesTexture);
			shader.setUniform1i('visibleNodesTexture', 0);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(vnWebGLTexture.target, vnWebGLTexture.id);

			let gradientTexture = this.textures.get(material.gradientTexture);
			shader.setUniform1i('gradient', 1);
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gradientTexture.target, gradientTexture.id);

			// let classificationTexture = this.textures.get(material.classificationTexture);
			// shader.setUniform1i('classificationLUT', 2);
			// gl.activeTexture(gl.TEXTURE2);
			// gl.bindTexture(classificationTexture.target, classificationTexture.id);

			if (material.snapEnabled === true) {
				{
					const lSnapshot = shader.uniformLocations['uSnapshot[0]'];
					const lSnapshotDepth = shader.uniformLocations['uSnapshotDepth[0]'];

					let bindingStart = 2;
					let lSnapshotBindingPoints = new Array(5).fill(bindingStart).map((a, i) => (a + i));
					let lSnapshotDepthBindingPoints = new Array(5)
						.fill(1 + Math.max(...lSnapshotBindingPoints))
						.map((a, i) => (a + i));

					gl.uniform1iv(lSnapshot, lSnapshotBindingPoints);
					gl.uniform1iv(lSnapshotDepth, lSnapshotDepthBindingPoints);

					for (let i = 0; i < 5; i++) {
						let texture = material.uniforms[`uSnapshot`].value[i];
						let textureDepth = material.uniforms[`uSnapshotDepth`].value[i];

						if (!texture) {
							break;
						}

						let snapTexture = this.threeRenderer.properties.get(texture).__webglTexture;
						let snapTextureDepth = this.threeRenderer.properties.get(textureDepth).__webglTexture;
						let bindingPoint = lSnapshotBindingPoints[i];
						let depthBindingPoint = lSnapshotDepthBindingPoints[i];

						gl.activeTexture(gl[`TEXTURE${bindingPoint}`]);
						gl.bindTexture(gl.TEXTURE_2D, snapTexture);

						gl.activeTexture(gl[`TEXTURE${depthBindingPoint}`]);
						gl.bindTexture(gl.TEXTURE_2D, snapTextureDepth);
					}
				}

				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapView.value.map(c => c.elements));
					const lSnapView = shader.uniformLocations['uSnapView[0]'];
					gl.uniformMatrix4fv(lSnapView, false, flattenedMatrices);
				}
				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapProj.value.map(c => c.elements));
					const lSnapProj = shader.uniformLocations['uSnapProj[0]'];
					gl.uniformMatrix4fv(lSnapProj, false, flattenedMatrices);
				}
				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapProjInv.value.map(c => c.elements));
					const lSnapProjInv = shader.uniformLocations['uSnapProjInv[0]'];
					gl.uniformMatrix4fv(lSnapProjInv, false, flattenedMatrices);
				}
				{
					let flattenedMatrices = [].concat(...material.uniforms.uSnapViewInv.value.map(c => c.elements));
					const lSnapViewInv = shader.uniformLocations['uSnapViewInv[0]'];
					gl.uniformMatrix4fv(lSnapViewInv, false, flattenedMatrices);
				}
			}
		}

		// gl.bindAttribLocation(shader.program, 0, 'position');
		// gl.bindAttribLocation(shader.program, 1, 'color');
		// gl.bindAttribLocation(shader.program, 2, 'intensity');
		// gl.bindAttribLocation(shader.program, 3, 'classification');
		// gl.bindAttribLocation(shader.program, 4, 'returnNumber');
		// gl.bindAttribLocation(shader.program, 5, 'numberOfReturns');
		// gl.bindAttribLocation(shader.program, 6, 'pointSourceID');
		// gl.bindAttribLocation(shader.program, 7, 'index');

		this.renderNodes(octree, nodes, visibilityTextureData, camera, target, shader, params);

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE0);
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
