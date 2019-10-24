import {POCLoader} from "../loader/POCLoader";

// Note: replaces PointCloudOctree.
// 
export class PotreeAsset extends ZeaEngine.AssetItem {

  constructor(){
    super();
    
    this.loaded.setToggled(false)
    
    this.material = new ZeaEngine.Material("PoTreeMaterial", "Potree_PointCloudShader");
    this.material.size = 1;
    this.material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
    this.material.shape = Potree.PointShape.SQUARE;
    
    this.visiblePointsTarget = 2 * 1000 * 1000;
    this.minimumNodePixelSize = 150;
    this.minimumNodeVSize = 0.2; // Size, not in pixels, but a fraction of scnreen V height.
    this.level = 0;

    this.boundingBoxNodes = [];
    this.loadQueue = [];
    // this.visibleBounds = new THREE.Box3();
    this.visibleNodes = [];
    this.visibleGeometry = [];


    this.__loaded = false;
    this.visibleNodesChanged = new ZeaEngine.Signal();
  }

  setViewport(viewport){
    this.viewport = viewport;
    if (this.pcoGeometry)
      this.update();
    this.viewport.viewChanged.connect(()=>{
      this.update();
    })
    this.viewport.resized.connect(()=>{
      this.update();
    })
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
    // const xfo = this.getGlobalXfo();
    // xfo.tr = this.pcoGeometry.offset;// TODO: try me. should work
    // xfo.tr.set(this.pcoGeometry.offset.x, this.pcoGeometry.offset.y, this.pcoGeometry.offset.z);
    // this.setGlobalXfo(xfo, ZeaEngine.ValueSetMode.DATA_LOAD);
    
    this._setBoundingBoxDirty()
    const box = this.getBoundingBox()
    const bMin = box.p0.z;
    const bMax = box.p1.z;
    this.material.heightMin = bMin;
    this.material.heightMax = bMax;
    
    // TODO read projection from file instead
    this.projection = pcoGeometry.projection;
    this.fallbackProjection = pcoGeometry.fallbackProjection;

    this.loaded.emit();

    if (this.viewport)
      this.update();
  }

  getGeometry() {
      return this.pcoGeometry;
  };

  
  // // Load and add point cloud to scene
  loadPointCloud(path, name) {
    return new Promise((resolve, reject) => {
      POCLoader.load(path, geometry => {
        if (!geometry) {
          //callback({type: 'loading_failed'});
          console.error(new Error(`failed to load point cloud from URL: ${path}`));
        } else {
          this.setGeometry(geometry)
          resolve(geometry);
        }
      });
    });
  }
  
  updateMaterial () {
    const camera = this.viewport.getCamera();
    this.material.fov = camera.getFov();// * (Math.PI / 180);
    this.material.screenWidth = this.viewport.getWidth();
    this.material.screenHeight = this.viewport.getHeight();
    this.material.near = camera.getNear();
    this.material.far = camera.getFar();
    const sc = this.getGlobalXfo().sc
    this.material.spacing = this.pcoGeometry.spacing * Math.max(sc.x, sc.y, sc.z);

    // ??
    // this.material.uniforms.octreeSize.value = this.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;
  }

  updateVisibilityStructures() {
    
    const camera = this.viewport.getCamera();
    const view = camera.getGlobalXfo().toMat4();
    const viewI = this.viewport.getViewMatrix();
    const proj = this.viewport.getProjectionMatrix();

    const priorityQueue = new BinaryHeap(function (x) { return 1 / x.weight; });

    //   this.numVisibleNodes = 0; // Never used.
      this.numVisiblePoints = 0;
    //   this.deepestVisibleLevel = 0; // Never used.
    //   this.visibleNodes = [];
    //   this.visibleGeometry = [];
      
      const world = this.getGlobalMat4()
      const fm = proj.multiply(viewI).multiply(world);
      const frustum = new ZeaEngine.Frustum();
      frustum.setFromMatrix(fm);

      // camera  position in object space
      const worldI = world.inverse();
      const camMatrixObject = worldI.multiply(view);
      const camObjPos = camMatrixObject.translation

      if (this.getVisible() && this.pcoGeometry !== null) {
        priorityQueue.push({node: this.pcoGeometry.root, weight: Number.MAX_VALUE});
      }

      // hide all previously visible nodes
      // if(this.root instanceof PointCloudOctreeNode){
      //	this.hideDescendants(this.root.sceneNode);
      // }
      // if (this.root.isTreeNode()) {
      //   this.hideDescendants(this.root.sceneNode);
      // }

      // for (let j = 0; j < this.boundingBoxNodes.length; j++) {
      //   this.boundingBoxNodes[j].visible = false;
      // }
    // }

    return {
      'frustum': frustum,
      'camObjPos': camObjPos,
      'priorityQueue': priorityQueue
    };
  };


  updateVisibility(){
    const camera = this.viewport.getCamera();

    let numVisiblePoints = 0;
    const visibleNodes = [];
    const unloadedGeometry = [];

    // calculate object space frustum and cam pos and setup priority queue
    const s = this.updateVisibilityStructures();
    const frustum = s.frustum;
    const camObjPos = s.camObjPos;
    const priorityQueue = s.priorityQueue;

    while (priorityQueue.size() > 0) {
      const element = priorityQueue.pop();
      const node = element.node;
      if (numVisiblePoints + node.numPoints > Potree.pointBudget) {
        break;
      }

      const insideFrustum = frustum.intersectsBox(node.boundingBox);
      if (!insideFrustum) {
        continue;
      }
      numVisiblePoints += node.numPoints;
      this.numVisiblePoints += node.numPoints;

		  const parent = element.parent;
      if (!parent || parent.isLoaded()) {
        if (node.isLoaded()) {
          visibleNodes.push(node);
        } else {
          unloadedGeometry.push(node);
        }
      }

      // add child nodes to priorityQueue
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

        priorityQueue.push({node: child, parent: node, weight: weight});
      }
    }// end priority queue loop

    let visChanged = this.visibleNodes.length != visibleNodes.length
    if(!visChanged) {
      visChanged = visibleNodes.some((node, index) => {
        return this.visibleNodes[index] != node;
      })
    }
    if(visChanged) {
      // const nodeNames = [];
      // visibleNodes.forEach(node => nodeNames.push(node.name))
      // console.log("visibleNodes:", nodeNames);

      this.visibleNodes = visibleNodes;
      this.visibleNodesChanged.emit(visibleNodes)
    }


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
          this.update();
        });
      }
    }
  }

  update() {
    this.updateVisibility()
    this.updateMaterial();
  }
  
};
