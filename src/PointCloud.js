//
// Potree.PointCloud = class PointCloud extends THREE.Object3D{
//
//	constructor(octree){
//		this.octree = octree;
//	}
//
// };
//
// Potree.GLObject = class GLObject{
//	constructor(tBuffer){
//		this.tBuffer = tBuffer;
//		this.vbos = new Map();
//	}
// };
//
// Potree.GLProgram = class GLProgram{
//	constructor(tMaterial){
//		this.tMaterial = tMaterial;
//		this.program = null;
//		this.uniforms = new Map();
//	}
// };
//
//
//
// Potree.Renderer = class PotreeRenderer{
//	constructor(threeRenderer){
//		this.threeRenderer = threeRenderer;
//		this.gl = this.threeRenderer.getContext();
//
//		this.glObjects = new Map();
//		this.glPrograms = new Map();
//	}
//
//	render(pointcloud){
//		let gl = this.gl;
//		this.threeRenderer.resetGLState();
//
//		let visibleNodes = pointcloud.visibleNodes;
//		let material = pointcloud.material;
//
//		let glProgram = this.glPrograms.get(material);
//		if(!glProgram){
//			this.createProgram(material);
//			glProgram = this.glPrograms.get(material);
//		}
//
//		for(let node of visibleNodes){
//			if(!(node.sceneNode && node.sceneNode instanceof THREE.Points)){
//				continue;
//			}
//
//			let glObject = this.glObjects.get(node);
//			if(!glObject){
//				this.createObject(node);
//				glObject = this.glObjects.get(node);
//			}
//
//			for(let attribute of Object.keys(glObject.buffers)){
//				let value = glObject.buffers[attribute];
//
//				let type = null;
//				if(value.threeAttribute.array instanceof Float32Array){
//					type = gl.FLOAT;
//				}else if(value.threeAttribute.array instanceof Uint18Array){
//					type = gl.SHORT;
//				}else if(value.threeAttribute.array instanceof Uint18Array){
//					type = gl.BYTE;
//				}
//
//				let itemSize = value.threeAttribute.itemSize;
//
//				gl.bindBuffer(gl.ARRAY_BUFFER, value.vbo);
//				gl.vertexAttribPointer(vertexPositionAttribute, itemSize, type, false, 0, 0);
//			}
//
//			gl.drawArrays(gl.POINT, 0, glObject.buffers.threeAttribute.position.count);
//		}
//
//		gl.bindBuffer(gl.ARRAY_BUFFER, null);
//
//
//		this.threeRenderer.resetGLState();
//	}
//
//	createShader(type, source){
//		let gl = this.gl;
//
//		let shader = gl.createShader(type);
//		gl.shaderSource(shader, source);
//		gl.compileShader(shader);
//
//		let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
//		if(success){
//			return shader;
//		}else{
//			console.err("Shader compilation failed:");
//			console.err(gl.getShaderInfoLog(shader));
//			gl.deleteShader(shader);
//
//			return null;
//		}
//	}
//
//	createProgram(material){
//		let gl = this.gl;
//
//		let vsSource = material.vertexShader;
//		let fsSource = material.fragmentShader;
//
//		let vs = this.createShader(gl.VERTEX_SHADER, vsSource);
//		let fs = this.createShader(gl.FRAGMENT_SHADER, fsSource);
//
//		if(vs === null || fs === null){
//			return null;
//		}
//
//		let program = gl.createProgram();
//		gl.attachShader(program, vs);
//		gl.attachShader(program, fs);
//		gl.linkProgram(program);
//
//		let success = gl.getProgramParameter(program, gl.LINK_STATUS);
//		if(!success){
//			console.err("failed to create/link shader program");
//			console.err(gl.getProgramInfoLog(program));
//			gl.deleteProgram(program);
//
//			return null;
//		}
//
//		let glProgram = new Potree.GLProgram();
//
//
//	}
//
//	createObject(renderer, node){
//
//		let gl = renderer.getContext();
//
//		let bufferGeometry = node.sceneNode.geometry;
//
//		let buffers = {};
//
//		for(let attributeName of Object.keys(bufferGeometry.attributes)){
//			let attribute = bufferGeometry.attributes[attributeName];
//			let vbo = gl.createBuffer();
//			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
//			gl.bufferData(gl.ARRAY_BUFFER, attribute.array, gl.STATIC_DRAW);
//
//			buffers[attributeName] = {
//				threeAttribute: attribute,
//				vbo: vbo
//			};
//		}
//		gl.bindBuffer(gl.ARRAY_BUFFER, null);
//
//		let glObject = new Potree.GLObject(node);
//		let webgl = {
//			node: node,
//			geometry: bufferGeometry,
//			buffers
//		};
//
//		console.log(webgl);
//
//		this.wegbl.set(node, webgl);
//	}
//
//	freeObject(node){
//
//		// TODO destroy buffers
//
//		this.webgl.delete(node);
//
//	}
//
//
// };
