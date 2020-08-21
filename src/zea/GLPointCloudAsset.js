import { GLPoints, GLPass } from '@zeainc/zea-engine'

let globalCounter = 0

class GLOctTreeNode extends GLPoints {
  constructor(gl, node) {
    super(gl, node.points)
    this.node = node

    // this.offset = node.offset;
    this.id = ++globalCounter
    this.loaded = true // only for LRU. Safely remove after refactoring.

    this.children = []
  }

  get numPoints() {
    return this.node.numPoints
  }

  dispose() {
    this.destroy()
  }
}

export class GLPointCloudAsset extends GLPass {
  constructor(gl, pointcloudAsset, glshader) {
    super()

    this.gl = gl
    this.pointcloudAsset = pointcloudAsset

    const xfoParam = pointcloudAsset.getParameter('GlobalXfo')
    const updateXfo = () => {
      const xfo = xfoParam.getValue()
      this.spacing = pointcloudAsset.pcoGeometry.spacing * Math.max(xfo.sc.x, xfo.sc.y, xfo.sc.z)
      this.modelMatrixArray = xfo.toMat4().asArray()
    }
    xfoParam.on('valueChanged', updateXfo)
    updateXfo()

    this.visible = pointcloudAsset.isVisible()
    pointcloudAsset.on('visibilityChanged', () => {
      this.visible = pointcloudAsset.isVisible()
      this.emit('updated')
    })

    this.octreeSize = pointcloudAsset.pcoGeometry.boundingBox.size().x
    this.pointSize = pointcloudAsset.getParameter('Point Size').getValue()
    pointcloudAsset.getParameter('Point Size').on('valueChanged', () => {
      this.pointSize = pointcloudAsset.getParameter('Point Size').getValue()
      this.emit('updated')
    })
    this.pointSizeAttenuation = pointcloudAsset.getParameter('Point Size Attenuation').getValue()
    pointcloudAsset.getParameter('Point Size Attenuation').on('valueChanged', () => {
      this.pointSizeAttenuation = pointcloudAsset.getParameter('Point Size').getValue()
      this.emit('updated')
    })

    this.visibleNodes = []
    this.visibleGLNodes = []
    this.gloctreenodes = []
    this.map = new Map()
    this.freeList = []
  }

  setVisibleNodes(visibleNodes, lru, offsets) {
    let visChanged = this.visibleNodes.length != visibleNodes.length
    if (!visChanged) {
      visChanged = visibleNodes.some((node, index) => {
        return this.visibleNodes[index] != node
      })
    }
    if (visChanged) {
      const gl = this.gl

      this.visibleGLNodes = []
      // Iterate backwards to lru touches the closests node last.
      for (let i = visibleNodes.length - 1; i >= 0; i--) {
        const node = visibleNodes[i]
        if (!this.map.has(node)) {
          // console.log("GLPoints:", node.name, node.offset);
          const gloctreenode = new GLOctTreeNode(gl, node)
          const index = this.freeList.length > 0 ? this.freeList.pop() : this.gloctreenodes.length
          this.gloctreenodes[index] = gloctreenode
          this.map.set(node, index)

          // Build the tree of gl nodes so we can clean them up later.
          // if (node.name.length > 1){
          //   const parentName = node.name.slice(0, -1);
          //   let parent = this.map.get(parentName);
          //   parent.children.push(gloctreenode);
          // }

          gloctreenode.on('destructing', () => {
            this.map.delete(node)
            this.freeList.push(index)
            this.gloctreenodes[index] = null

            const drawIndex = this.visibleGLNodes.indexOf(gloctreenode)
            if (drawIndex >= 0) this.visibleGLNodes.splice(drawIndex, 1)
          })
        }
        const gloctreenode = this.gloctreenodes[this.map.get(node)]
        this.visibleGLNodes.push(gloctreenode)

        // At every visiblity change, the offset in the texture changes.
        gloctreenode.vnStart = offsets.get(node)

        lru.touch(gloctreenode)
      }

      this.emit('updated')
    }
  }

  getGeomItem() {
    return this.pointcloudAsset
  }

  __drawNodes(renderstate) {
    const gl = this.gl
    const { unifs } = renderstate
    const {
      modelMatrix,
      offset,
      uOctreeSize,
      uOctreeSpacing,
      uVNStart,
      uLevel,
      PointSize,
      PointSizeAttenuation,
    } = unifs

    gl.uniformMatrix4fv(modelMatrix.location, false, this.modelMatrixArray)

    if (uOctreeSize) gl.uniform1f(uOctreeSize.location, this.octreeSize)

    if (uOctreeSpacing) gl.uniform1f(uOctreeSpacing.location, this.spacing)

    gl.uniform1f(PointSize.location, this.pointSize)
    gl.uniform1f(PointSizeAttenuation.location, this.pointSizeAttenuation)

    this.visibleGLNodes.forEach((glpoints) => {
      const node = glpoints.node

      gl.uniform3fv(offset.location, node.offset.asArray())

      if (uVNStart) gl.uniform1i(uVNStart.location, glpoints.vnStart)
      if (uLevel) gl.uniform1f(uLevel.location, node.level)

      glpoints.bind(renderstate)
      renderstate.bindViewports(unifs, () => {
        glpoints.draw(renderstate)
      })
    })
  }

  draw(renderstate) {
    if (this.visibleGLNodes.length == 0 || !this.visible) return

    this.__drawNodes(renderstate)
  }

  drawHighlightedGeoms(renderstate) {
    if (this.visibleGLNodes.length == 0 || !this.visible) return
    const gl = this.gl
    const { highlightColor } = renderstate.unifs
    if (highlightColor) {
      gl.uniform4fv(highlightColor.location, this.pointcloudAsset.getHighlight().asArray())
    }
    this.__drawNodes(renderstate)
  }

  drawGeomData(renderstate) {
    if (this.visibleGLNodes.length == 0 || !this.visible) return
    this.__drawNodes(renderstate)
  }
}
