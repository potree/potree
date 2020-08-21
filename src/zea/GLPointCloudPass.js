import { Frustum, NumberParameter, GLTexture2D, GLPass } from '@zeainc/zea-engine'

import { PointCloudAsset } from './PointCloudAsset.js'
import { GLPointCloudAsset } from './GLPointCloudAsset.js'
import { BinaryHeap } from '../../libs/other/BinaryHeap.js'
import { PotreePointsShader, PotreePointsGeomDataShader, PotreePointsHilighlightShader } from './PotreePointsShader.js'
import { LRU } from '../LRU.js'

export class GLPointCloudPass extends GLPass {
  constructor() {
    super()

    this.visiblePointsTarget = 2 * 1000 * 1000
    this.lru = new LRU()
    this.minimumNodeVSize = 0.2
    this.glpointcloudAssets = []
    this.hilghlightedAssets = []

    this.visibleNodesNeedUpdating = false

    // Size, not in pixels, but a fraction of scnreen V height.
    const minimumNodeVSizeParam = this.addParameter(new NumberParameter('minimumNodeVSize', 0.0))
    minimumNodeVSizeParam.on('valueChanged', () => {
      this.minimumNodeVSize = minimumNodeVSizeParam.getValue()
    })

    const visiblePointsTargetParam = this.addParameter(new NumberParameter('visiblePointsTarget', 0))
    visiblePointsTargetParam.on('valueChanged', () => {
      this.pointBudget = visiblePointsTargetParam.getValue()
      this.lru.pointLoadLimit = this.pointBudget * 2
    })

    // const pointSizeParam = this.addParameter(new NumberParameter('Points Size', 0))
    // pointSizeParam.on('valueChanged', () => {
    //   this.pointSize = pointSizeParam.getValue()
    // });

    minimumNodeVSizeParam.setValue(0.2)
    visiblePointsTargetParam.setValue(2 * 1000 * 1000)
    // pointSizeParam.setValue(1.25)
  }
  /**
   * The init method.
   * @param {any} renderer - The renderer param.
   * @param {any} passIndex - The passIndex param.
   */
  init(renderer, passIndex) {
    super.init(renderer, passIndex)
    const gl = renderer.gl
    this.glshader = new PotreePointsShader(gl)
    this.glgeomdataShader = new PotreePointsGeomDataShader(gl)
    this.glhighlightShader = new PotreePointsHilighlightShader(gl)

    const size = 2048
    const data = new Uint8Array(size * 4)
    for (let i = 0; i < size * 4; i++) data[i] = 255

    this.visibleNodesTexture = new GLTexture2D(gl, {
      format: 'RGBA',
      type: 'UNSIGNED_BYTE',
      width: size,
      height: 1,
      filter: 'NEAREST',
      wrap: 'CLAMP_TO_EDGE',
      mipMapped: false,
      data,
    })

    this.__renderer.registerPass(
      (treeItem) => {
        if (treeItem instanceof PointCloudAsset) {
          this.addPotreeasset(treeItem)
          return true
        }
        return false
      },
      (treeItem) => {
        if (treeItem instanceof PointCloudAsset) {
          this.removePotreeasset(treeItem)
          return true
        }
        return false
      }
    )

    this.setViewport(renderer.getViewport())
  }

  addPotreeasset(pointcloudAsset) {
    const __bindAsset = (pointcloudAsset) => {
      const glpointcloudAsset = new GLPointCloudAsset(this.__gl, pointcloudAsset, this.glshader)
      glpointcloudAsset.on('updated', () => this.emit('updated'))
      pointcloudAsset.on('highlightChanged', () => {
        if (pointcloudAsset.isHighlighted()) {
          if (this.hilghlightedAssets.indexOf(glpointcloudAsset) == -1) this.hilghlightedAssets.push(glpointcloudAsset)
        } else {
          if (this.hilghlightedAssets.indexOf(glpointcloudAsset) != -1)
            this.hilghlightedAssets.splice(this.hilghlightedAssets.indexOf(glpointcloudAsset), 1)
        }
      })

      this.glpointcloudAssets.push(glpointcloudAsset)
    }
    if (pointcloudAsset.isLoaded()) __bindAsset(pointcloudAsset)
    else {
      pointcloudAsset.on('loaded', () => __bindAsset(pointcloudAsset))
    }
  }

  removePotreeasset(pointcloudAsset) {}

  // ///////////////////////////////////
  // Visiblity

  setViewport(viewport) {
    this.viewport = viewport
    this.viewport.on('viewChanged', () => {
      this.visibleNodesNeedUpdating = true
    })
    this.viewport.on('resized', () => {
      this.visibleNodesNeedUpdating = true
    })
    this.visibleNodesNeedUpdating = true
  }

  updateVisibilityStructures(priorityQueue) {
    const camera = this.viewport.getCamera()
    const view = camera.getParameter('GlobalXfo').getValue().toMat4()
    const viewI = this.viewport.getViewMatrix()
    const proj = this.viewport.getProjectionMatrix()
    const viewProj = proj.multiply(viewI)
    const result = []
    this.glpointcloudAssets.forEach((glpointcloudAsset, index) => {
      const pointcloudAsset = glpointcloudAsset.getGeomItem()
      const model = pointcloudAsset.getGlobalMat4()
      const modelViewProj = viewProj.multiply(model)
      const frustum = new Frustum()
      frustum.setFromMatrix(modelViewProj)

      // camera  position in object space
      const modelInv = model.inverse()
      const camMatrixObject = modelInv.multiply(view)
      const camObjPos = camMatrixObject.translation

      if (pointcloudAsset.isVisible() && pointcloudAsset.pcoGeometry !== null) {
        priorityQueue.push({
          index,
          node: pointcloudAsset.pcoGeometry.root,
          weight: Number.MAX_VALUE,
        })
      }

      result.push({
        glpointcloudAsset,
        frustum,
        camObjPos,
      })
    })

    return result
  }

  updateVisibility() {
    const priorityQueue = new BinaryHeap(function (x) {
      return 1 / x.weight
    })
    const camera = this.viewport.getCamera()

    this.numVisiblePoints = 0
    let numVisiblePoints = 0
    const visibleNodesByAsset = []
    let visibleNodes = []
    const unloadedGeometry = []

    // calculate object space frustum and cam pos and setup priority queue
    const result = this.updateVisibilityStructures(priorityQueue)

    while (priorityQueue.size() > 0) {
      const element = priorityQueue.pop()
      const index = element.index
      const node = element.node

      if (numVisiblePoints + node.numPoints > this.pointBudget) {
        break
      }

      const frustum = result[index].frustum
      const insideFrustum = frustum.intersectsBox(node.boundingBox)
      if (!insideFrustum) {
        continue
      }
      numVisiblePoints += node.numPoints
      this.numVisiblePoints += node.numPoints

      const parent = element.parent
      if (!parent || parent.isLoaded()) {
        if (node.isLoaded()) {
          if (!visibleNodesByAsset[index]) visibleNodesByAsset[index] = []
          visibleNodesByAsset[index].push(node)

          visibleNodes.push(node)
        } else {
          unloadedGeometry.push(node)
        }
      }

      // add child nodes to priorityQueue
      const camObjPos = result[index].camObjPos
      const children = node.getChildren()
      for (let i = 0; i < children.length; i++) {
        const child = children[i]

        let weight = 0
        if (true || camera.isPerspectiveCamera) {
          const sphere = child.getBoundingSphere()
          const distance = sphere.pos.distanceTo(camObjPos)
          const radius = sphere.radius
          if (distance - radius < 0) {
            weight = Number.MAX_VALUE
          } else {
            const fov = camera.getFov()
            const slope = Math.tan(fov / 2)

            const projFactor = 0.5 / (slope * distance)
            const screenVRadius = radius * projFactor

            if (screenVRadius < this.minimumNodeVSize) {
              continue
            }
            weight = screenVRadius
          }
        } else {
          // TODO ortho visibility
          let bb = child.getBoundingBox()
          let distance = child.getBoundingSphere().pos.distanceTo(camObjPos)
          let diagonal = bb.max.clone().sub(bb.min).length()
          //weight = diagonal / distance;

          weight = diagonal
        }

        priorityQueue.push({
          index,
          node: child,
          parent: node,
          weight: weight,
        })
      }
    } // end priority queue loop

    const visibleNodeTextureOffsets = this.computeVisibilityTextureData(visibleNodes)

    visibleNodesByAsset.forEach((assetVisibleNodes, index) => {
      this.glpointcloudAssets[index].setVisibleNodes(assetVisibleNodes, this.lru, visibleNodeTextureOffsets)
    })

    if (unloadedGeometry.length > 0) {
      // Disabled temporarily
      // for (let i = 0; i < Math.min(Potree.maxNodesLoading, unloadedGeometry.length); i++) {
      const promises = []
      for (let i = 0; i < unloadedGeometry.length; i++) {
        // console.log("load:", unloadedGeometry[i].name);
        promises.push(unloadedGeometry[i].load())
      }
      if (promises.length > 0) {
        // After all the loads have finished.
        // update again so we can recompute and visiblity.
        Promise.all(promises).then(() => {
          // for (let i = 0; i < unloadedGeometry.length; i++) {
          //   console.log("loaded:", unloadedGeometry[i].name);
          // }
          this.visibleNodesNeedUpdating = true
          this.emit('updated')
        })
      }
    }

    // Causes unused nodes to be flushed.
    this.lru.freeMemory()

    // this.emit('updated');
  }

  computeVisibilityTextureData(nodes) {
    const data = new Uint8Array(nodes.length * 4)
    const visibleNodeTextureOffsets = new Map()

    // copy array
    nodes = nodes.slice()

    // sort by level and index, e.g. r, r0, r3, r4, r01, r07, r30, ...
    const sort = function (a, b) {
      const na = a.name
      const nb = b.name
      if (na.length !== nb.length) return na.length - nb.length
      if (na < nb) return -1
      if (na > nb) return 1
      return 0
    }
    nodes.sort(sort)

    // const nodeMap = new Map();
    const offsetsToChild = new Array(nodes.length).fill(Infinity)

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i]
      // nodeMap.set(node.name, node);
      visibleNodeTextureOffsets.set(node, i)

      if (i > 0) {
        const index = node.index //parseInt(node.name.slice(-1));
        // console.log(node.name, node.index, node.name.slice(-1))
        // const parentName = node.name.slice(0, -1);
        const parent = node.parent //nodeMap.get(parentName);
        // console.log(node.parent.name, parent.name, node.parent === parent)

        const parentIndex = visibleNodeTextureOffsets.get(parent)

        const parentOffsetToChild = i - parentIndex

        const childOffset = Math.min(offsetsToChild[parentIndex], parentOffsetToChild)

        // Add this bit to the parent's chils bit mask.
        data[parentIndex * 4 + 0] = data[parentIndex * 4 + 0] | (1 << index)
        data[parentIndex * 4 + 1] = childOffset >> 8
        data[parentIndex * 4 + 2] = childOffset % 256
        offsetsToChild[parentIndex] = childOffset
      }

      data[i * 4 + 3] = node.name.length - 1
    }

    this.visibleNodesTexture.populate(data, nodes.length, 1)
    return visibleNodeTextureOffsets
  }

  // ///////////////////////////////////
  // Rendering

  /**
   * The draw method.
   * @param {any} renderstate - The renderstate param.
   */
  draw(renderstate) {
    if (this.glpointcloudAssets.length == 0) return

    if (this.visibleNodesNeedUpdating) {
      this.updateVisibility()
      this.visibleNodesNeedUpdating = false
    }

    const gl = this.__gl

    gl.disable(gl.BLEND)
    gl.depthMask(true)
    gl.enable(gl.DEPTH_TEST)

    this.glshader.bind(renderstate)

    const { visibleNodes } = renderstate.unifs
    if (visibleNodes) this.visibleNodesTexture.bindToUniform(renderstate, visibleNodes)

    // gl.uniform1f(PointSize.location, this.pointSize);

    // RENDER
    this.glpointcloudAssets.forEach((a) => a.draw(renderstate))
  }

  /**
   * The drawHighlightedGeoms method.
   * @param {any} renderstate - The renderstate param.
   */
  drawHighlightedGeoms(renderstate) {
    if (this.hilghlightedAssets.length == 0) return
    const gl = this.__gl

    gl.disable(gl.BLEND)
    gl.depthMask(true)
    gl.enable(gl.DEPTH_TEST)

    this.glhighlightShader.bind(renderstate)

    const { visibleNodes, PointSize } = renderstate.unifs
    if (visibleNodes) this.visibleNodesTexture.bindToUniform(renderstate, visibleNodes)

    gl.uniform1f(PointSize.location, this.pointSize)

    this.hilghlightedAssets.forEach((a) => a.drawHighlightedGeoms(renderstate))
  }

  /**
   * The drawGeomData method.
   * @param {any} renderstate - The renderstate param.
   */
  drawGeomData(renderstate) {
    if (this.glpointcloudAssets.length == 0) return
    const gl = this.__gl

    gl.disable(gl.BLEND)
    gl.depthMask(true)
    gl.enable(gl.DEPTH_TEST)

    this.glgeomdataShader.bind(renderstate)

    const { visibleNodes, PointSize } = renderstate.unifs
    if (visibleNodes) this.visibleNodesTexture.bindToUniform(renderstate, visibleNodes)

    gl.uniform1f(PointSize.location, this.pointSize)

    // RENDER
    this.glpointcloudAssets.forEach((a, index) => {
      const { passId, assetId } = renderstate.unifs
      if (passId) {
        gl.uniform1i(passId.location, this.__passIndex)
      }
      if (assetId) {
        gl.uniform1i(assetId.location, index)
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
    const glpointcloudAsset = this.glpointcloudAssets[itemId]
    if (glpointcloudAsset) {
      return {
        geomItem: glpointcloudAsset.getGeomItem(),
        dist,
      }
    }
  }
}
