
Potree.PointCloudSM = class PointCloudSM{

    constructor(potreeRenderer){

        this.potreeRenderer = potreeRenderer;
        this.threeRenderer = this.potreeRenderer.threeRenderer;
        this.gl = this.threeRenderer.getContext();
        this.vsSource = Potree.Shaders['pointcloud_sm.vs'];
        this.fsSource = Potree.Shaders['pointcloud_sm.fs'];
        this.shader = new Potree.Shader(this.gl, "shadow_map", this.vsSource, this.fsSource);
        this.lightPos = new THREE.Vector3();

        this.target = new THREE.WebGLRenderTarget(4*1024, 4*1024, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.FloatType
        });
        this.target.depthTexture = new THREE.DepthTexture();
        this.target.depthTexture.type = THREE.UnsignedIntType;
        
        this.vnTexture = null;

        {
            let gl = this.gl;
            this.vnTexture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, this.vnTexture);

            const level = 0;
            const internalFormat = gl.RGB;
            const width = 2048;
            const height = 1;
            const border = 0;
            const srcFormat = gl.RGB;
            const srcType = gl.UNSIGNED_BYTE;
            const pixel = new Uint8Array(3*width);
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                          width, height, border, srcFormat, srcType,
                          pixel);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        
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
        let material = octree.material;

        let vsSource = `#define adaptive_point_size\n` + this.vsSource;
        let fsSource = `#define adaptive_point_size\n` + this.fsSource;
        shader.update(vsSource, fsSource);

        gl.useProgram(shader.program);

        this.threeRenderer.setClearColor(0x00ff00, 0);
        this.threeRenderer.clearTarget( this.target, true, true, true );
        this.threeRenderer.setClearColor(0x000000, 0);

        let view = new THREE.Matrix4().makeTranslation(...this.lightPos.clone().multiplyScalar(-1).toArray());

        let visibilityTextureData = octree.computeVisibilityTextureData(nodes);
        gl.bindTexture(gl.TEXTURE_2D, this.vnTexture);
        let vnData = new Uint8Array(3*2048);
        vnData.set(visibilityTextureData.data);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 2048, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, vnData);
        gl.bindTexture(gl.TEXTURE_2D, null);


        shader.setUniform1i("visibleNodes", 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.vnTexture);


        let near = 0.1;
        let far = 1000.0;
        shader.setUniform1f("near", near);
        shader.setUniform1f("far", far);
        shader.setUniform1f("uScreenWidth", this.target.width);
        shader.setUniform1f("uScreenHeight", this.target.height);

        shader.setUniform1f("uSpacing", material.spacing);
        shader.setUniform("uOctreeSize", material.uniforms.octreeSize.value);

        for(let node of nodes){
            let world = node.sceneNode.matrixWorld;
            let worldView = new THREE.Matrix4().multiplyMatrices(view, world);

            shader.setUniformMatrix4(`uWorldView`, worldView);

            let vnStart = visibilityTextureData.offsets.get(node);
            shader.setUniform1f("uVNStart", vnStart);

            let level = node.getLevel();
            shader.setUniform1f("uLevel", level);

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