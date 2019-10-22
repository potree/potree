import {POCLoader} from "../loader/POCLoader";

// Note: replaces PointCloudOctree.
// 
export class PotreeAsset extends ZeaEngine.AssetItem {

  constructor(){
    super();
    
    this.loaded.setToggled(false)
    
    // this.pointcloud;
    this.material = new ZeaEngine.Material("PoTreeMaterial", "Potree_PointCloudShader");
    this.material.size = 1;
    this.material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
    this.material.shape = Potree.PointShape.SQUARE;
    
    this.visiblePointsTarget = 2 * 1000 * 1000;
    this.minimumNodePixelSize = 150;
    this.minimumNodeVSize = 0.05; // Size, not in pixels, but a fraction of scnreen V height.
    this.level = 0;

    this.boundingBoxNodes = [];
    this.loadQueue = [];
    // this.visibleBounds = new THREE.Box3();
    this.visibleNodes = [];
    this.visibleGeometry = [];

    this.__loaded = false;
    this.visibleNodesChanged = new ZeaEngine.Signal();

    // this.initialize();
  }

  setViewport(viewport){
    this.viewport = viewport;
    if (this.pointcloud)
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
    const xfo = this.getGlobalXfo();
    xfo.tr.set(this.pcoGeometry.offset.x, this.pcoGeometry.offset.y, this.pcoGeometry.offset.z);
    this.setGlobalXfo(xfo, ZeaEngine.ValueSetMode.DATA_LOAD);
    
    this._setBoundingBoxDirty()
    const box = this.getBoundingBox()
    const bMin = box.p0.z;
    const bMax = box.p1.z;
    this.material.heightMin = bMin;
    this.material.heightMax = bMax;
    
    // TODO read projection from file instead
    this.projection = pcoGeometry.projection;
    this.fallbackProjection = pcoGeometry.fallbackProjection;

    // this.root = this.pcoGeometry.root;

    if (this.viewport)
      this.update();
    this.loaded.emit();
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
    this.material.fov = camera.getFov() * (Math.PI / 180);
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

    // for (let i = 0; i < pointclouds.length; i++) {
    //   let pointcloud = pointclouds[i];

      // if (!this.initialized()) {
      //   // continue;
      //   return;
      // }

      this.numVisibleNodes = 0;
      this.numVisiblePoints = 0;
      this.deepestVisibleLevel = 0;
      this.visibleNodes = [];
      this.visibleGeometry = [];
      
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

    // let numVisibleNodes = 0
    let numVisiblePoints = 0;

    // const numVisiblePointsInPointclouds = [pc, 0];

    // const visibleNodes = [];
    const unloadedGeometry = [];

    let lowestSpacing = Infinity;

    // calculate object space frustum and cam pos and setup priority queue
    const s = this.updateVisibilityStructures();
    const frustum = s.frustum;
    const camObjPos = s.camObjPos;
    const priorityQueue = s.priorityQueue;

    // let loadedToGPUThisFrame = 0;
    
    // const domWidth;
    const domHeight = this.viewport.getHeight();

    // check if pointcloud has been transformed
    // some code will only be executed if changes have been detected
    // if(!Potree._pointcloudTransformVersion){
    //   Potree._pointcloudTransformVersion = new Map();
    // }
    // let pointcloudTransformVersion = Potree._pointcloudTransformVersion;
    // for(let pointcloud of pointclouds){

      // if(!this.visible){
      //   continue;
      // }

      // pointcloud.updateMatrixWorld();

    //   if(!pointcloudTransformVersion.has(pointcloud)){
    //     pointcloudTransformVersion.set(pointcloud, {number: 0, transform: pointcloud.matrixWorld.clone()});
    //   }else{
    //     let version = pointcloudTransformVersion.get(pointcloud);

    //     if(!version.transform.equals(pointcloud.matrixWorld)){
    //       version.number++;
    //       version.transform.copy(pointcloud.matrixWorld);

    //       pointcloud.dispatchEvent({
    //         type: "transformation_changed",
    //         target: pointcloud
    //       });
    //     }
    //   }
    // }

    while (priorityQueue.size() > 0) {
      const element = priorityQueue.pop();
      const node = element.node;
      const parent = element.parent;
      const box = node.getBoundingBox();

      const insideFrustum = frustum.intersectsBox(box);
      const maxLevel = this.maxLevel || Infinity;
      const level = node.getLevel();
      let visible = insideFrustum;
      visible = visible && !(numVisiblePoints + node.getNumPoints() > Potree.pointBudget);
      // visible = visible && !(numVisiblePointsInPointclouds.get(pointcloud) + node.getNumPoints() > pointcloud.pointBudget);
      visible = visible && level < maxLevel;

      lowestSpacing = Math.min(lowestSpacing, node.spacing);

      if (numVisiblePoints + node.getNumPoints() > Potree.pointBudget) {
        break;
      }

      if (!visible) {
        continue;
      }

      // TODO: not used, same as the declaration?
      // numVisibleNodes++;
      numVisiblePoints += node.getNumPoints();
      // let numVisiblePointsInPointcloud = numVisiblePointsInPointclouds.get(pointcloud);
      // numVisiblePointsInPointclouds.set(pointcloud, numVisiblePointsInPointcloud + node.getNumPoints());

      this.numVisibleNodes++;
      this.numVisiblePoints += node.getNumPoints();

      if (node.isGeometryNode() && (!parent || parent.isTreeNode())) {
      //   // Only load a maximum of 2 nodes per update.
        if (node.isLoaded()) {
          exports.lru.touch(node);
          this.visibleNodes.push(node);
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
          
          const fov = (camera.getFov() * Math.PI) / 180;
          const slope = Math.tan(fov / 2);

          const projFactor = 0.5 / (slope * distance);
          const screenVRadius = radius * projFactor;
          
          if(screenVRadius < this.minimumNodeVSize){
            continue;
          }
        
          weight = screenVRadius;

          if(distance - radius < 0){
            weight = Number.MAX_VALUE;
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

    // { // update DEM
    //   let maxDEMLevel = 4;
    //   let candidates = pointclouds
    //     .filter(p => (p.generateDEM && p.dem instanceof Potree.DEM));
    //   for (let pointcloud of candidates) {
    //     let updatingNodes = pointcloud.visibleNodes.filter(n => n.getLevel() <= maxDEMLevel);
    //     pointcloud.dem.update(updatingNodes);
    //   }
    // }

    for (let i = 0; i < Math.min(Potree.maxNodesLoading, unloadedGeometry.length); i++) {
      unloadedGeometry[i].load();
    }

    // return {
    //   visibleNodes: visibleNodes,
    //   numVisiblePoints: numVisiblePoints,
    //   lowestSpacing: lowestSpacing
    // };
  }

    // From viewer.js
  update() {
    
    Potree.pointLoadLimit = Potree.pointBudget * 2;
    this.updateVisibility()

    this.updateMaterial();

    exports.lru.freeMemory();
  }
  
};
