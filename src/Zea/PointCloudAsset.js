import { Box3, NumberParameter, AssetItem, Registry } from '@zeainc/zea-engine'
import { POCLoader } from '../loader/POCLoader'

// Note: replaces PointCloudOctree.
//
/**
 * The PointCloudAsset Class
 *
 * @extends {AssetItem}
 */
class PointCloudAsset extends AssetItem {
  /**
   * Creates an instance of PointCloudAsset.
   */
  constructor() {
    super()

    this.pointBudget = 5 * 1000 * 1000
    this.minimumNodeVSize = 0.2 // Size, not in pixels, but a fraction of screen V height.
    this.level = 0
    this.visibleNodes = []

    this.loaded = false

    // this.fileParam = this.addParameter(new FilePathParameter('File'))
    // this.fileParam.on('valueChanged', () => {
    //   this.loaded.untoggle()
    //   this.loadPointCloud(path, name)
    // })
    // this.addParameter(new NumberParameter('Version', 0))
    this.addParameter(new NumberParameter('Num Points', 0))
    this.addParameter(new NumberParameter('Point Size', 1))
    this.addParameter(new NumberParameter('Point Size Attenuation', 1.0))
  }

  /**
   * The getGlobalMat4 method
   *
   * @return {Mat4} - The global Mat4
   */
  getGlobalMat4() {
    return this.getParameter('GlobalXfo').getValue().toMat4()
  }

  /**
   * The _cleanBoundingBox method
   *
   * @param {*} bbox - 
   * @return {Box3} - The cleaned bounding box
   * @private
   */
  _cleanBoundingBox(bbox) {
    bbox = super._cleanBoundingBox(bbox)
    const mat4 = this.getGlobalMat4()
    const geomBox = new Box3()
    const { min, max } = this.pcoGeometry.tightBoundingBox
    geomBox.min.set(min.x, min.y, min.z)
    geomBox.max.set(max.x, max.y, max.z)
    bbox.addBox3(geomBox, mat4)
    return bbox
  }

  /**
   * the setGeometry method
   *
   * @param {any} pcoGeometry - The pcoGeometry value
   */
  setGeometry(pcoGeometry) {
    this.pcoGeometry = pcoGeometry

    const xfo = this.getParameter('GlobalXfo').getValue()
    xfo.tr = this.pcoGeometry.offset
    this.getParameter('GlobalXfo').setValue(xfo)

    // this.getParameter('Version').setValue(parseFloat(pcoGeometry.version));
    if (pcoGeometry.numPoints) this.getParameter('Num Points').setValue(pcoGeometry.numPoints)

    // this._setBoundingBoxDirty()

    this.loaded = false
    this.emit('loaded')

    // if (this.viewport)
    //   this.updateVisibility();
  }

  /**
   * The getGeometry method
   *
   * @return {any} - The pcoGeometry
   */
  getGeometry() {
    return this.pcoGeometry
  }

  // // Load and add point cloud to scene
  /**
   * The loadPointCloud method
   *
   * @param {*} path - The path value
   * @param {*} name - The name value
   * @return {Promise} - The result
   */
  loadPointCloud(path, name) {
    return new Promise((resolve, reject) => {
      POCLoader.load(path, (geometry) => {
        if (!geometry) {
          reject(`failed to load point cloud from URL: ${path}`)
        } else {
          this.setGeometry(geometry)
          resolve(geometry)
        }
      })
    })
  }
}

Registry.register('PointCloudAsset', PointCloudAsset)

export default PointCloudAsset
export { PointCloudAsset }
