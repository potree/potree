import {POCLoader} from "../loader/POCLoader";

// Note: replaces PointCloudOctree.
// 
export class PotreeAsset extends ZeaEngine.AssetItem {

  constructor(){
    super();
    
    this.loaded.setToggled(false)

    this.pointBudget = 5 * 1000 * 1000;
    this.minimumNodeVSize = 0.2; // Size, not in pixels, but a fraction of scnreen V height.
    this.level = 0;
    this.visibleNodes = [];

    this.__loaded = false;
    this.visibleNodesChanged = new ZeaEngine.Signal();
  }

  getGlobalMat4() {
    return this.getGlobalXfo().toMat4();
  }
  
  _cleanBoundingBox(bbox) {
    bbox = super._cleanBoundingBox(bbox)
    const mat4 = this.getGlobalMat4();
    const geomBox = new ZeaEngine.Box3();
    const { min, max } = this.pcoGeometry.tightBoundingBox
    geomBox.min.set(min.x, min.y, min.z);
    geomBox.max.set(max.x, max.y, max.z);
    bbox.addBox3(geomBox, mat4)
    return bbox;
  }

  setGeometry(pcoGeometry) {

    this.pcoGeometry = pcoGeometry;
    const xfo = this.getGlobalXfo();
    xfo.tr = this.pcoGeometry.offset;// TODO: try me. should work
    xfo.tr.set(this.pcoGeometry.offset.x, this.pcoGeometry.offset.y, this.pcoGeometry.offset.z);
    this.setGlobalXfo(xfo, ZeaEngine.ValueSetMode.DATA_LOAD);
    
    this._setBoundingBoxDirty()

    this.loaded.emit();

    // if (this.viewport)
    //   this.updateVisibility();
  }

  getGeometry() {
      return this.pcoGeometry;
  };
  
  // // Load and add point cloud to scene
  loadPointCloud(path, name) {
    return new Promise((resolve, reject) => {
      POCLoader.load(path, geometry => {
        if (!geometry) {
          reject(`failed to load point cloud from URL: ${path}`);
        } else {
          this.setGeometry(geometry)
          resolve(geometry);
        }
      });
    });
  }
};
