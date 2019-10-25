
import {LRU} from "../LRU.js";

let globalCounter = 0;

class GLOctTreeNode extends ZeaEngine.GLPoints {
  constructor(gl, node) {
    super(gl, node.points)
    this.node = node;

    // this.offset = node.offset;
    this.id = ++globalCounter;
    this.loaded = true; // only for LRU. Safely remove after refactoring.
    
  }

  get numPoints(){
    return this.node.numPoints;
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

    this.visibleNodes = [];
    this.visibleGLNodes = [];
    this.gloctreenodes = [];
    this.map = new Map();
    this.freeList = [];

    this.updated = new ZeaEngine.Signal();
  }

  setVisibleNodes(visibleNodes){
    let visChanged = this.visibleNodes.length != visibleNodes.length
    if(!visChanged) {
      visChanged = visibleNodes.some((node, index) => {
            return this.visibleNodes[index] != node;
      })
    }
    if(visChanged) {
      const gl = this.gl;

      this.visibleGLNodes = []
      // Iterate backwards to lru touches the closests node last.
      for(let i=visibleNodes.length-1; i>=0; i--) {
        const node = visibleNodes[i];
        if (!this.map.has(node)) {
          // console.log("GLPoints:", node.name, node.offset);
          const gloctreenode = new GLOctTreeNode(gl, node);
          const index = this.freeList.length > 0 ? this.freeList.pop() : this.gloctreenodes.length;
          this.gloctreenodes[index] = gloctreenode;
          this.map.set(node, index);

          gloctreenode.destructing.connect(() => {
            this.map.delete(node);
            this.freeList.push(index);
            const drawIndex = this.visibleGLNodes.indexOf(gloctreenode);
            if (drawIndex >= 0)
              this.visibleGLNodes.splice(drawIndex, 1);
          });
        }
        const gloctreenode = this.gloctreenodes[this.map.get(node)];
        this.lru.touch(gloctreenode);
        this.visibleGLNodes.push(gloctreenode);
      };
      // Causes unused nodes to be flushed.
      this.lru.freeMemory();

      this.updated.emit();
    }
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
      this.gl.uniform3fv(offsetUnif.location, glpoints.node.offset.asArray())
      glpoints.bind(renderstate)
      renderstate.bindViewports(unifs, () => {
        glpoints.draw(renderstate)
      })
    });
  }

  draw(renderstate) {
    if (this.visibleGLNodes.length == 0) return;
    this.__drawNodes(this.visibleGLNodes, renderstate)
  }

  drawHighlightedGeoms(renderstate) {
    const gl = this.gl;
    const { highlightColor } = renderstate.unifs;
    if (highlightColor) {
        gl.uniform4fv(highlightColor.location, this.potreeAsset.getHighlight().asArray());
    }
    this.__drawNodes(this.visibleGLNodes, renderstate)
  }

  drawGeomData(renderstate) {
    if (this.visibleGLNodes.length == 0) return;
    this.__drawNodes(this.visibleGLNodes, renderstate)
  }

}