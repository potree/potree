import {
	Box3,
	ValueSetMode,
	NumberParameter,
	AssetItem,
} from '@zeainc/zea-engine'

import {POCLoader} from "../loader/POCLoader";

// Note: replaces PointCloudOctree.
// 
export class PointCloudAsset extends AssetItem {

  constructor(){
    super();
    
    this.loaded.setToggled(false)

    this.pointBudget = 5 * 1000 * 1000;
    this.minimumNodeVSize = 0.2; // Size, not in pixels, but a fraction of scnreen V height.
    this.level = 0;
    this.visibleNodes = [];

    this.__loaded = false;

    // this.fileParam = this.addParameter(new FilePathParameter('File'))
    // this.fileParam.valueChanged.connect(mode => {
    //   this.loaded.untoggle()
  	//   this.loadPointCloud(path, name)
    // })
    this.addParameter(new NumberParameter('Version', 0))
    this.addParameter(new NumberParameter('Num Points', 0))
  }

  getGlobalMat4() {
    return this.getGlobalXfo().toMat4();
  }
  
  _cleanBoundingBox(bbox) {
    bbox = super._cleanBoundingBox(bbox)
    const mat4 = this.getGlobalMat4();
    const geomBox = new Box3();
    const { min, max } = this.pcoGeometry.tightBoundingBox
    geomBox.min.set(min.x, min.y, min.z);
    geomBox.max.set(max.x, max.y, max.z);
    bbox.addBox3(geomBox, mat4)
    return bbox;
  }

  setGeometry(pcoGeometry) {

    this.pcoGeometry = pcoGeometry;
		const mode = ValueSetMode.DATA_LOAD;

    const xfo = this.getGlobalXfo();
    xfo.tr = this.pcoGeometry.offset;
    this.setGlobalXfo(xfo, mode)

		this.getParameter('Version').setValue(parseFloat(pcoGeometry.version), mode);
		if (pcoGeometry.numPoints)
			this.getParameter('Num Points').setValue(pcoGeometry.numPoints, mode);
    
    // this._setBoundingBoxDirty()

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
