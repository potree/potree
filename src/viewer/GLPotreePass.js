
import {ClipTask, ClipMethod, CameraMode, LengthUnits} from "../defines.js";
import { PotreeAsset } from "./PotreeAsset.js";
import { GLPotreeAsset } from "./GLPotreeAsset.js";

import { PotreePointsShader, PotreePointsGeomDataShader, PotreePointsHilighlightShader } from "./PotreePointsShader.js";
import "./PotreePointsShader.js";

export class GLPotreePass extends ZeaEngine.GLPass {
  constructor(){
    super();
    
    this.visiblePointsTarget = 2 * 1000 * 1000;
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

    // RENDER
    this.glpotreeAssets.forEach((a, index)=> {
      a.drawGeomData(renderstate)
    })
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