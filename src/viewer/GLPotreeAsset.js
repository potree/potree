
import {LRU} from "../LRU.js";

let globalCounter = 0;

class GLOctTreeNode extends ZeaEngine.GLPoints {
  constructor(gl, pointCloudOctreeGeometryNode) {
    super(gl, pointCloudOctreeGeometryNode.points)
    this.pointCloudOctreeGeometryNode = pointCloudOctreeGeometryNode;

    this.id = ++globalCounter;
    this.loaded = true; // only for LRU. Safely remove after refactoring.
    
  }

  get numPoints(){
    return this.pointCloudOctreeGeometryNode.numPoints;
  }

  dispose() {
    this.destroy()
  }
}

export class GLPotreeAsset extends ZeaEngine.GLPass {
  constructor(gl, potreeAsset, glshader){

    super();

    this.gl = gl;
    this.lru = new LRU();
    this.lru.pointLoadLimit = Potree.pointBudget * 2;
    this.potreeAsset = potreeAsset;
    this.modelMatrixArray =  potreeAsset.getGlobalMat4().asArray()

    const gloctreenodes = [];
    const map = new Map();
    const freeList = [];
    this.visibleNodes = [];
    this.hilightedNodes = [];

    potreeAsset.visibleNodesChanged.connect((visibleNodes) => {
      this.visibleNodes = []
      // Iterate backwards to lru touches the closests node last.
      for(let i=visibleNodes.length-1; i>=0; i--) {
        const node = visibleNodes[i];
        if (!map.has(node)) {
          // console.log("GLPoints:", node.name, node.offset);
          const gloctreenode = new GLOctTreeNode(gl, node);
          gloctreenode.offset = [node.offset.x, node.offset.y, node.offset.z];
          const index = freeList.length > 0 ? freeList.pop() : gloctreenodes.length;
          gloctreenodes[index] = gloctreenode;
          map.set(node, index);

          gloctreenode.destructing.connect(() => {
            map.delete(node);
            freeList.push(index);
            const drawIndex = this.visibleNodes.indexOf(gloctreenode);
            if (drawIndex >= 0)
              this.visibleNodes.splice(drawIndex, 1);
          });
        }
        const gloctreenode = gloctreenodes[map.get(node)];
        this.lru.touch(gloctreenode);
        this.visibleNodes.push(gloctreenode);
      };
      // Causes unused nodes to be flushed.
      this.lru.freeMemory();

      this.updated.emit();
    })
    this.updated = new ZeaEngine.Signal();
  }

  getGeomItem(){
    return this.potreeAsset;
  }

  __drawNodes(nodes, renderstate){
    const gl = this.gl;
    const { unifs } = renderstate;
    const modelMatrixunif = unifs.modelMatrix
    if (modelMatrixunif) {
      gl.uniformMatrix4fv(
        modelMatrixunif.location,
        false,
        this.modelMatrixArray
      )
    }
    const offsetUnif = unifs.offset;
    nodes.forEach(glpoints => {
      this.gl.uniform3fv(offsetUnif.location, glpoints.offset)
      glpoints.bind(renderstate)
      renderstate.bindViewports(unifs, () => {
        glpoints.draw(renderstate)
      })
    });
  }

  draw(renderstate) {
    if (this.visibleNodes.length == 0) return;
    this.__drawNodes(this.visibleNodes, renderstate)
  }

  drawHighlightedGeoms(renderstate) {
    if (this.hilightedNodes.length == 0) return;

    const { highlightColor } = renderstate.unifs;
    if (highlightColor) {
        gl.uniform4fv(highlightColor.location, this.potreeAsset.getHighlight().asArray());
    }
    this.__drawNodes(this.hilightedNodes, renderstate)
  }

  drawGeomData(renderstate) {
    if (this.visibleNodes.length == 0) return;
    this.__drawNodes(this.visibleNodes, renderstate)
  }

}