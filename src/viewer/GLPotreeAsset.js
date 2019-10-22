class GLOctTreeNode  {
  constructor(gl, pointCloudOctreeGeometryNode) {

    this.pointCloudOctreeGeometryNode = pointCloudOctreeGeometryNode;
    this.__glattrbuffers = {}
    this.__shaderBindings = {}
    this.destructing = new Signal()
    this.updated = new Signal()

  this.genBuffers()
  }

  genBuffers() {

    const gl = this.__gl

    const attributeBuffers = this.pointCloudOctreeGeometryNode.attributeBuffers
    let numVerts = 0;
    for(let key in attributeBuffers){
      const buffer = buffers[key].buffer;
      const property = parseInt(key)

      const glBuffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW)

      let attrName;
      let dimension;
      if (property === PointAttributeNames.POSITION_CARTESIAN) {
        attrName = 'position';
        dimension = 3;
        numVerts = (new Float32Array(buffer)).length() / 3;
        // geometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer), 3));
      } else if (property === PointAttributeNames.COLOR_PACKED) {
        attrName = 'color';
        dimension = 4;
        // geometry.addAttribute('color', new THREE.BufferAttribute(new Uint8Array(buffer), 4, true));
      } else if (property === PointAttributeNames.INTENSITY) {
        attrName = 'intensity';
        dimension = 1;
        // geometry.addAttribute('intensity', new THREE.BufferAttribute(new Float32Array(buffer), 1));
      } else if (property === PointAttributeNames.CLASSIFICATION) {
        attrName = 'classification';
        dimension = 1;
        // geometry.addAttribute('classification', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
      } else if (property === PointAttributeNames.RETURN_NUMBER) {
        attrName = 'returnNumber';
        dimension = 1;
        // geometry.addAttribute('returnNumber', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
      } else if (property === PointAttributeNames.NUMBER_OF_RETURNS) {
        attrName = 'numberOfReturns';
        dimension = 1;
        // geometry.addAttribute('numberOfReturns', new THREE.BufferAttribute(new Uint8Array(buffer), 1));
      } else if (property === PointAttributeNames.SOURCE_ID) {
        attrName = 'pointSourceID';
        dimension = 1;
        // geometry.addAttribute('pointSourceID', new THREE.BufferAttribute(new Uint16Array(buffer), 1));
      } else if (property === PointAttributeNames.NORMAL_SPHEREMAPPED) {
        attrName = 'normal';
        dimension = 3;
        // geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
      } else if (property === PointAttributeNames.NORMAL_OCT16) {
        attrName = 'normal';
        dimension = 3;
        // geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
      } else if (property === PointAttributeNames.NORMAL) {
        attrName = 'normal';
        dimension = 3;
        // geometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer), 3));
      } else if (property === PointAttributeNames.INDICES) {
        attrName = 'indices';
        dimension = 4;
        // let bufferAttribute = new THREE.BufferAttribute(new Uint8Array(buffer), 4);
        // bufferAttribute.normalized = true;
        // geometry.addAttribute('indices', bufferAttribute);
      } else if (property === PointAttributeNames.SPACING) {
        attrName = 'spacing';
        dimension = 1;
        // let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
        // geometry.addAttribute('spacing', bufferAttribute);
      } else if (property === PointAttributeNames.GPS_TIME) {
        attrName = 'gpsTime';
        dimension = 1;
        // let bufferAttribute = new THREE.BufferAttribute(new Float32Array(buffer), 1);
        // geometry.addAttribute('gpsTime', bufferAttribute);

        // node.gpsTime = {
        //   offset: buffers[property].offset,
        //   range: buffers[property].range,
        // };
      }
      

      this.__glattrbuffers[attrName] = {
        buffer: glBuffer,
        dimension,
      }
    }

    this.__numVerts = numVerts;
    this.__vboState = 2
  }
}

export class GLPotreeAsset extends ZeaEngine.GLPass {
  constructor(gl, potreeAsset, glshader){

    super();

    this.gl = gl;
    this.potreeAsset = potreeAsset;

    this.gloctreenodes = [];
    if(potreeAsset.pcoGeometry.root.loaded){
      this.gloctreenodes.push(new GLOctTreeNode(potreeAsset.pcoGeometry));
    } else {
      potreeAsset.pcoGeometry.root.addEventListener('loaded', e=>{
        this.gloctreenodes.push(new GLOctTreeNode(potreeAsset.pcoGeometry.root));
      });
    }

    potreeAsset.visibleNodesChanged.connect(() => {
      const visibilityTextureData = octree.computeVisibilityTextureData(potreeAsset.visibleNodes);
      
      const vnt = material.visibleNodesTexture;
      const data = vnt.image.data;
      // data.set(visibilityTextureData.data);
      // Find the 'visibleNodes' uniform and set the texture data.
      // vnt.needsUpdate = true;

      this.updated.emit();
    })
  
    const material = potreeAsset.material;
    this.glmaterial = new ZeaEngine.GLMaterial(gl, material, glshader)
    this.glmaterial.updated.connect(() => {
      this.updated.emit();
    })

    this.updated = new ZeaEngine.Signal();
  }

  // Reference: ../PotreeRenderer.renderOctree(){
  render(renderstate) {

    // const camera = this.scene.getActiveCamera();
    // this.pRenderer.render(this.scene.scenePointCloud, camera, null, {
    // 	clipSpheres: this.scene.volumes.filter(v => (v instanceof Potree.SphereVolume)),
    // });

    
    let nodes = this.octree.visibleNodes;

    let gl = this.gl;

    let material = params.material ? params.material : octree.material;
    // let shadowMaps = params.shadowMaps == null ? [] : params.shadowMaps;
    let view = renderstate.viewMatrix;
    let worldView = new THREE.Matrix4();

    // let mat4holder = new Float32Array(16);
/*
    let gpsMin = Infinity;
    let gpsMax = -Infinity
    for (let node of nodes) {

      if(node instanceof PointCloudOctreeNode){
        let geometryNode = node.geometryNode;

        if(geometryNode.gpsTime){
          let {offset, range} = geometryNode.gpsTime;
          let nodeMin = offset;
          let nodeMax = offset + range;

          gpsMin = Math.min(gpsMin, nodeMin);
          gpsMax = Math.max(gpsMax, nodeMax);
        }
      }
      break;
    }
*/

    let i = 0;
    for (let node of nodes) {

      // if(exports.debug.allowedNodes !== undefined){
      // 	if(!exports.debug.allowedNodes.includes(node.name)){
      // 		continue;
      // 	}
      // }

      //if(![
      //	"r42006420226",
      //	]
      //	.includes(node.name)){
      //	continue;
      //}

      let world = node.sceneNode.matrixWorld;
      worldView.multiplyMatrices(view, world);
      //this.multiplyViewWithScaleTrans(view, world, worldView);

      if (visibilityTextureData) {
        let vnStart = visibilityTextureData.offsets.get(node);
        shader.setUniform1f("uVNStart", vnStart);
      }


      let level = node.getLevel();

      if(node.debug){
        shader.setUniform("uDebug", true);
      }else{
        shader.setUniform("uDebug", false);
      }

      let isLeaf;
      if(node instanceof PointCloudOctreeNode){
        isLeaf = Object.keys(node.children).length === 0;
      }else if(node instanceof PointCloudArena4DNode){
        isLeaf = node.geometryNode.isLeaf;
      }
      shader.setUniform("uIsLeafNode", isLeaf);


      // TODO consider passing matrices in an array to avoid uniformMatrix4fv overhead
      const lModel = shader.uniformLocations["modelMatrix"];
      if (lModel) {
        mat4holder.set(world.elements);
        gl.uniformMatrix4fv(lModel, false, mat4holder);
      }

      const lModelView = shader.uniformLocations["modelViewMatrix"];
      //mat4holder.set(worldView.elements);
      // faster then set in chrome 63
      for(let j = 0; j < 16; j++){
        mat4holder[j] = worldView.elements[j];
      }
      gl.uniformMatrix4fv(lModelView, false, mat4holder);

/*
      { // Clip Polygons
        if(material.clipPolygons && material.clipPolygons.length > 0){

          let clipPolygonVCount = [];
          let worldViewProjMatrices = [];

          for(let clipPolygon of material.clipPolygons){

            let view = clipPolygon.viewMatrix;
            let proj = clipPolygon.projMatrix;

            let worldViewProj = proj.clone().multiply(view).multiply(world);

            clipPolygonVCount.push(clipPolygon.markers.length);
            worldViewProjMatrices.push(worldViewProj);
          }

          let flattenedMatrices = [].concat(...worldViewProjMatrices.map(m => m.elements));

          let flattenedVertices = new Array(8 * 3 * material.clipPolygons.length);
          for(let i = 0; i < material.clipPolygons.length; i++){
            let clipPolygon = material.clipPolygons[i];
            for(let j = 0; j < clipPolygon.markers.length; j++){
              flattenedVertices[i * 24 + (j * 3 + 0)] = clipPolygon.markers[j].position.x;
              flattenedVertices[i * 24 + (j * 3 + 1)] = clipPolygon.markers[j].position.y;
              flattenedVertices[i * 24 + (j * 3 + 2)] = clipPolygon.markers[j].position.z;
            }
          }

          const lClipPolygonVCount = shader.uniformLocations["uClipPolygonVCount[0]"];
          gl.uniform1iv(lClipPolygonVCount, clipPolygonVCount);

          const lClipPolygonVP = shader.uniformLocations["uClipPolygonWVP[0]"];
          gl.uniformMatrix4fv(lClipPolygonVP, false, flattenedMatrices);

          const lClipPolygons = shader.uniformLocations["uClipPolygonVertices[0]"];
          gl.uniform3fv(lClipPolygons, flattenedVertices);

        }
      }
*/

      //shader.setUniformMatrix4("modelMatrix", world);
      //shader.setUniformMatrix4("modelViewMatrix", worldView);
      shader.setUniform1f("uLevel", level);
      shader.setUniform1f("uNodeSpacing", node.geometryNode.estimatedSpacing);

      shader.setUniform1f("uPCIndex", i);
      // uBBSize
/*
      if (shadowMaps.length > 0) {

        const lShadowMap = shader.uniformLocations["uShadowMap[0]"];

        shader.setUniform3f("uShadowColor", material.uniforms.uShadowColor.value);

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
            .map(sm => sm.camera.matrixWorldInverse)
            .map(view => new THREE.Matrix4().multiplyMatrices(view, world))

          let flattenedMatrices = [].concat(...worldViewMatrices.map(c => c.elements));
          const lWorldView = shader.uniformLocations["uShadowWorldView[0]"];
          gl.uniformMatrix4fv(lWorldView, false, flattenedMatrices);
        }

        {
          let flattenedMatrices = [].concat(...shadowMaps.map(sm => sm.camera.projectionMatrix.elements));
          const lProj = shader.uniformLocations["uShadowProj[0]"];
          gl.uniformMatrix4fv(lProj, false, flattenedMatrices);
        }
      }
*/

      let geometry = node.geometryNode.geometry;
/*
      if(node.geometryNode.gpsTime){
        let nodeMin = node.geometryNode.gpsTime.offset;
        let nodeMax = nodeMin + node.geometryNode.gpsTime.range;

        let gpsOffset = (+nodeMin - gpsMin);
        let gpsRange = (gpsMax - gpsMin);

        shader.setUniform1f("uGPSOffset", gpsOffset);
        shader.setUniform1f("uGPSRange", gpsRange);
      }
*/
      {
        let uFilterReturnNumberRange = material.uniforms.uFilterReturnNumberRange.value;
        let uFilterNumberOfReturnsRange = material.uniforms.uFilterNumberOfReturnsRange.value;
        let uFilterGPSTimeClipRange = material.uniforms.uFilterGPSTimeClipRange.value;
        
        let gpsCliPRangeMin = uFilterGPSTimeClipRange[0] - gpsMin;
        let gpsCliPRangeMax = uFilterGPSTimeClipRange[1] - gpsMin;
        
        shader.setUniform2f("uFilterReturnNumberRange", uFilterReturnNumberRange);
        shader.setUniform2f("uFilterNumberOfReturnsRange", uFilterNumberOfReturnsRange);
        shader.setUniform2f("uFilterGPSTimeClipRange", [gpsCliPRangeMin, gpsCliPRangeMax]);
      }

      let webglBuffer = null;
      if(!this.buffers.has(geometry)){
        webglBuffer = this.createBuffer(geometry);
        this.buffers.set(geometry, webglBuffer);
      }else{
        webglBuffer = this.buffers.get(geometry);
        for(let attributeName in geometry.attributes){
          let attribute = geometry.attributes[attributeName];

          if(attribute.version > webglBuffer.vbos.get(attributeName).version){
            this.updateBuffer(geometry);
          }
        }
      }

      gl.bindVertexArray(webglBuffer.vao);

      let numPoints = webglBuffer.numElements;
      gl.drawArrays(gl.POINTS, 0, numPoints);

      i++;
    }

    gl.bindVertexArray(null);

    if (exports.measureTimings) {
      performance.mark("renderNodes-end");
      performance.measure("render.renderNodes", "renderNodes-start", "renderNodes-end");
    }

  }

}