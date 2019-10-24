
import {ClipTask, ClipMethod, CameraMode, LengthUnits} from "../defines.js";
import { PotreeAsset } from "./PotreeAsset.js";
import { GLPotreeAsset } from "./GLPotreeAsset.js";

import { PotreePointsShader, PotreePointsGeomDataShader, PotreePointsHilighlightShader } from "./PotreePointsShader.js";
import "./PotreePointsShader.js";

export class GLPotreePass extends ZeaEngine.GLPass {
  constructor(){
    super();
    
    this.visiblePointsTarget = 2 * 1000 * 1000;
    this.minimumNodeVSize = 0.2; // Size, not in pixels, but a fraction of scnreen V height.
    this.visibleNodes = [];
  }
  /**
   * The init method.
   * @param {any} renderer - The renderer param.
   * @param {any} passIndex - The passIndex param.
   */
  init(renderer, passIndex) {
    super.init(renderer, passIndex)
    const gl = renderer.gl;
    this.glpotreeAssets = [];
    this.hilghlightedAssets = [];
    // this.glshader = new PotreePointsShader(gl);
    this.glshader = ZeaEngine.sgFactory.constructClass('PotreePointsShader', gl);
    
    this.glgeomdataShader = new PotreePointsGeomDataShader(gl);
    this.glhighlightShader = new PotreePointsHilighlightShader(gl);

    this.__renderer.registerPass(
      treeItem => {
        if (treeItem instanceof PotreeAsset) {
          this.addPotreeasset(treeItem)
          return true
        }
        return false
      },
      treeItem => {
        if (treeItem instanceof PotreeAsset) {
          this.removePotreeasset(treeItem)
          return true
        }
        return false
      }
    )
  }

  addPotreeasset(potreeAsset){
    const __bindAsset = potreeAsset => {
      const glpotreeAsset = new GLPotreeAsset(this.__gl, potreeAsset, this.glshader);
      glpotreeAsset.updated.connect(() => this.updated.emit());
      potreeAsset.highlightChanged.connect(() => {
        if (potreeAsset.isHighlighted()) {
          if (this.hilghlightedAssets.indexOf(glpotreeAsset) == -1)
            this.hilghlightedAssets.push(glpotreeAsset);
        } else {
          if (this.hilghlightedAssets.indexOf(glpotreeAsset) != -1)
            this.hilghlightedAssets.splice(this.hilghlightedAssets.indexOf(glpotreeAsset), 1);
        }
      });

      this.glpotreeAssets.push(glpotreeAsset);
    }
    if (potreeAsset.isLoaded())
      __bindAsset(potreeAsset);
    else {
      potreeAsset.loaded.connect(() => __bindAsset(potreeAsset));
    }
  }

  removePotreeasset(potreeAsset){


  }

  // ///////////////////////////////////
  // Visiblity

  setViewport(viewport){
    this.viewport = viewport;
    this.viewport.viewChanged.connect(()=>{
      this.updateVisibility();
    })
    this.viewport.resized.connect(()=>{
      this.updateVisibility();
    })
  }
  
  updateVisibilityStructures(priorityQueue) {
    
    const camera = this.viewport.getCamera();
    const view = camera.getGlobalXfo().toMat4();
    const viewI = this.viewport.getViewMatrix();
    const proj = this.viewport.getProjectionMatrix();
    const viewProj = proj.multiply(viewI)
    const result = []
    this.glpotreeAssets.forEach((glpotreeAsset, index)=> {
        const potreeAsset = glpotreeAsset.getGeomItem()
        const model = potreeAsset.getGlobalMat4()
        const modelViewProj = viewProj.multiply(model);
        const frustum = new ZeaEngine.Frustum();
        frustum.setFromMatrix(modelViewProj);

        // camera  position in object space
        const modelInv = model.inverse();
        const camMatrixObject = modelInv.multiply(view);
        const camObjPos = camMatrixObject.translation

        if (potreeAsset.getVisible() && potreeAsset.pcoGeometry !== null) {
            priorityQueue.push({ index, node: potreeAsset.pcoGeometry.root, weight: Number.MAX_VALUE});
        }

        result.push({
            glpotreeAsset,
            frustum,
            camObjPos,
        });
    });

    return result
  };


  updateVisibility() {
    const priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });
    const camera = this.viewport.getCamera();

    this.numVisiblePoints = 0;
    let numVisiblePoints = 0;
    const visibleNodes = [];
    const unloadedGeometry = [];

    // calculate object space frustum and cam pos and setup priority queue
    const result = this.updateVisibilityStructures(priorityQueue);

    while (priorityQueue.size() > 0) {
      const element = priorityQueue.pop();
      const index = element.index;
      const node = element.node;

      if (!visibleNodes[index])
          visibleNodes[index] = [];

    //   const potreeAsset = this.glpotreeAssets[index].getGeomItem()
      if (numVisiblePoints + node.numPoints > this.pointBudget) {
        break;
      }

      const frustum = result[index].frustum;
      const insideFrustum = frustum.intersectsBox(node.boundingBox);
      if (!insideFrustum) {
        continue;
      }
      numVisiblePoints += node.numPoints;
      this.numVisiblePoints += node.numPoints;

      const parent = element.parent;
      if (!parent || parent.isLoaded()) {
        if (node.isLoaded()) {
          visibleNodes[index].push(node);
        } else {
          unloadedGeometry.push(node);
        }
      }

      // add child nodes to priorityQueue
      const camObjPos = result[index].camObjPos;
      const children = node.getChildren();
      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        let weight = 0; 
        if(true || camera.isPerspectiveCamera){
          const sphere = child.getBoundingSphere();
          const distance = sphere.center.distanceTo(camObjPos);
          const radius = sphere.radius;
          if(distance - radius < 0){
            weight = Number.MAX_VALUE;
          } else {
            const fov = camera.getFov();
            const slope = Math.tan(fov / 2);

            const projFactor = 0.5 / (slope * distance);
            const screenVRadius = radius * projFactor;
            
            if(screenVRadius < this.minimumNodeVSize){
              continue;
            }
            weight = screenVRadius;
          }

        } else {
          // TODO ortho visibility
          let bb = child.getBoundingBox();				
          let distance = child.getBoundingSphere().center.distanceTo(camObjPos);
          let diagonal = bb.max.clone().sub(bb.min).length();
          //weight = diagonal / distance;

          weight = diagonal;
        }

        priorityQueue.push({ index, node: child, parent: node, weight: weight});
      }
    }// end priority queue loop

    visibleNodes.forEach((assetVisibleNodes, index) => {
      this.glpotreeAssets[index].setVisibleNodes(assetVisibleNodes);
    });

    if (unloadedGeometry.length > 0) {
      // Disabled temporarily
      // for (let i = 0; i < Math.min(Potree.maxNodesLoading, unloadedGeometry.length); i++) {
      const promises = []
      for (let i = 0; i < unloadedGeometry.length; i++) {
          // console.log("load:", unloadedGeometry[i].name);
          promises.push(unloadedGeometry[i].load());
      }
      if (promises.length > 0) {
        // After all the loads have finished. 
        // update again so we can recompute and visiblity.
        Promise.all(promises).then(()=>{
          // for (let i = 0; i < unloadedGeometry.length; i++) {
          //   console.log("loaded:", unloadedGeometry[i].name);
          // }
          this.updateVisibility();
        });
      }
    }
  }

  // ///////////////////////////////////
  // Rendering

  /**
   * The draw method.
   * @param {any} renderstate - The renderstate param.
   */
  draw(renderstate) {
    if (this.glpotreeAssets.length == 0) return;

    const gl = this.__gl;
  
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);

    this.glshader.bind(renderstate);

    // RENDER
    this.glpotreeAssets.forEach( a => a.draw(renderstate))

  }

  /**
   * The drawHighlightedGeoms method.
   * @param {any} renderstate - The renderstate param.
   */
  drawHighlightedGeoms(renderstate) {
    if (this.hilghlightedAssets.length == 0) return;
    const gl = this.__gl;
  
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);

    this.glhighlightShader.bind(renderstate);
    this.hilghlightedAssets.forEach( a => a.drawHighlightedGeoms(renderstate))
  }

  /**
   * The drawGeomData method.
   * @param {any} renderstate - The renderstate param.
   */
  drawGeomData(renderstate) {
    if (this.glpotreeAssets.length == 0) return;
    const gl = this.__gl;
  
    gl.disable(gl.BLEND);
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);

    this.glgeomdataShader.bind(renderstate);

    // RENDER
    this.glpotreeAssets.forEach((a, index)=> {
      const { passId, assetId } = renderstate.unifs;
      if (passId) {
        gl.uniform1i(passId.location, this.__passIndex);
      }
      if (assetId) {
        gl.uniform1i(assetId.location, index);
      }
      a.drawGeomData(renderstate)
    })
  }

  /**
   * The getGeomItemAndDist method.
   * @param {any} geomData - The geomData param.
   */
  getGeomItemAndDist(geomData) {
    const itemId = Math.round(geomData[1])
    const dist = geomData[3]
    const glpotreeAsset = this.glpotreeAssets[itemId]
    if (glpotreeAsset) {
      return {
        geomItem: glpotreeAsset.getGeomItem(),
        dist,
      }
    }
  }
}