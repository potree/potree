
Potree.PointCloudSM = class PointCloudSM{

    constructor(potreeRenderer){

        this.potreeRenderer = potreeRenderer;
        this.threeRenderer = this.potreeRenderer.threeRenderer;
        this.gl = this.threeRenderer.getContext();
        this.vsSource = Potree.Shaders['pointcloud_sm.vs'];
        this.fsSource = Potree.Shaders['pointcloud_sm.fs'];
        this.shader = new Potree.Shader(this.gl, "shadow_map", this.vsSource, this.fsSource);
        this.lightPos = new THREE.Vector3();

        this.target = new THREE.WebGLRenderTarget(1024, 1024, {
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
        });
        this.target.depthTexture = new THREE.DepthTexture();
		this.target.depthTexture.type = THREE.UnsignedIntType;
        
    }

    setLightPos(pos){
        this.lightPos.copy(pos);
    }

    setSize(width, height){
        if(this.target.width !== width || this.target.height !== height){
            this.target.dispose();
        }
        this.target.setSize(width, height);
    }

    renderOctree(octree, nodes){

        let gl = this.gl;
        let shader = this.shader;

        gl.useProgram(shader.program);

        this.threeRenderer.setClearColor(0x00ff00, 0);
        this.threeRenderer.clearTarget( this.target, true, true, true );
        this.threeRenderer.setClearColor(0x000000, 0);

        let view = new THREE.Matrix4().makeTranslation(...this.lightPos.clone().multiplyScalar(-1).toArray());


        let near = 0.1;
        let far = 1000.0;
        shader.setUniform1f("near", near);
        shader.setUniform1f("far", far);

        for(let node of nodes){
            let world = node.sceneNode.matrixWorld;
            let worldView = new THREE.Matrix4().multiplyMatrices(view, world);

            shader.setUniformMatrix4(`uWorldView`, worldView);

            let iBuffer = node.geometryNode.buffer;
			
			if(!this.potreeRenderer.buffers.has(iBuffer)){
				let buffers = this.potreeRenderer.createBuffer(iBuffer);
				this.potreeRenderer.buffers.set(iBuffer, buffers);
			}
			
			let buffer = this.potreeRenderer.buffers.get(iBuffer);

            gl.bindVertexArray(buffer.vao);
			
			let numPoints = iBuffer.numElements;
			gl.drawArrays(gl.POINTS, 0, numPoints);

        }

        gl.bindVertexArray(null);

    }

};