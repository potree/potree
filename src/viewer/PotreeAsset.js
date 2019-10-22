
import {PointCloudMaterial} from "../materials/PointCloudMaterial.js";

// Note: replaces PointCloudOctree.
// 
export class PotreeAsset extends ZeaEngine.AssetItem {

  constructor(){
    super();
    
    // this.pointcloud;
    this.material = new ZeaEngine.Material("PoTreeMaterial", "Potree_PointCloudShader");
    
    this.visiblePointsTarget = 2 * 1000 * 1000;
    this.minimumNodePixelSize = 150;
    this.minimumNodeVSize = 0.05; // Size, not in pixels, but a fraction of scnreen V height.
    this.level = 0;

    this.boundingBoxNodes = [];
    this.loadQueue = [];
    // this.visibleBounds = new THREE.Box3();
    this.visibleNodes = [];
    this.visibleGeometry = [];

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
    bbox.addBox3(this.pcoGeometry.tightBoundingBox, mat4)
    return bbox;
  }

  setGeometry(pcoGeometry) {
    this.pcoGeometry = pcoGeometry;
    const xfo = this.getGlobalXfo();
    xfo.tr.set(this.pcoGeometry.offset.x, this.pcoGeometry.offset.y, this.pcoGeometry.offset.z);
    this.setGlobalXfo(xfo, ZeaEngine.ValueSetMode.DATA_LOAD);

    let bMin = box.min.z;
    let bMax = box.max.z;
    this.material.heightMin = bMin;
    this.material.heightMax = bMax;
    
		// TODO read projection from file instead
		this.projection = geometry.projection;
		this.fallbackProjection = geometry.fallbackProjection;

		// this.root = this.pcoGeometry.root;

    if (this.camera)
      this.update();
    this.loaded.emit();
  }

  getGeometry() {
      return this.pcoGeometry;
  };

  
  // // Load and add point cloud to scene
  loadPointCloud(path, name) {
      // return new Promise((resolve, reject) => {
      //     Potree.loadPointCloud(path, name, e => {
  // 	    this.pointcloud = e.pointcloud;
  // 		if (this.camera)
  // 			this.update();
      // 		this.loaded.emit();
      //         resolve(e);
      //     });
      // });
  
    return new Promise((resolve, reject) => {
      POCLoader.load(path, function (geometry) {
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
		material.fov = camera.getFov() * (Math.PI / 180);
		material.screenWidth = this.viewport.getWidth();
		material.screenHeight = this.viewport.getHeight();
		material.near = camera.getNear();
		material.far = camera.getFar();
		material.spacing = this.pcoGeometry.spacing * Math.max(this.scale.x, this.scale.y, this.scale.z);
		material.uniforms.octreeSize.value = this.pcoGeometry.boundingBox.getSize(new THREE.Vector3()).x;
	}

  updateVisibilityStructures() {
    
    const camera = this.viewport.getCamera();
    const view = camera.getGlobalXfo().toMat4();
    const viewI = this.viewwport.getViewMatrix();
    const proj = this.viewwport.getProjectionMatrix();

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

      if (this.visible && this.pcoGeometry !== null) {
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

    // const numVisibleNodes = 0
    const numVisiblePoints = 0;

    // const numVisiblePointsInPointclouds = [pc, 0];

    // const visibleNodes = [];
    const unloadedGeometry = [];

    const lowestSpacing = Infinity;

    // calculate object space frustum and cam pos and setup priority queue
    const s = this.updateVisibilityStructures();
    const frustum = s.frustum;
    const camObjPos = s.camObjPos;
    const priorityQueue = s.priorityQueue;

    // const loadedToGPUThisFrame = 0;
    
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
      // let pointcloud = pointclouds[element.pointcloud];

      // { // restrict to certain nodes for debugging
      //	let allowedNodes = ["r", "r0", "r4"];
      //	if(!allowedNodes.includes(node.name)){
      //		continue;
      //	}
      // }

      const box = node.getBoundingBox();
      // const frustum = frustums[element.pointcloud];
      // const camObjPos = camObjPositions[element.pointcloud];

      const insideFrustum = frustum.intersectsBox(box);
      const maxLevel = this.maxLevel || Infinity;
      const level = node.getLevel();
      const visible = insideFrustum;
      visible = visible && !(numVisiblePoints + node.getNumPoints() > Potree.pointBudget);
      // visible = visible && !(numVisiblePointsInPointclouds.get(pointcloud) + node.getNumPoints() > pointcloud.pointBudget);
      visible = visible && level < maxLevel;
      //visible = visible && node.name !== "r613";
/*
      let clipBoxes = this.material.clipBoxes;
      if(true && clipBoxes.length > 0){

        //node.debug = false;

        let numIntersecting = 0;
        let numIntersectionVolumes = 0;

        //if(node.name === "r60"){
        //	var a = 10;
        //}

        for(let clipBox of clipBoxes){

          let pcWorldInverse = new THREE.Matrix4().getInverse(pointcloud.matrixWorld);
          let toPCObject = pcWorldInverse.multiply(clipBox.box.matrixWorld);

          let px = new THREE.Vector3(+0.5, 0, 0).applyMatrix4(pcWorldInverse);
          let nx = new THREE.Vector3(-0.5, 0, 0).applyMatrix4(pcWorldInverse);
          let py = new THREE.Vector3(0, +0.5, 0).applyMatrix4(pcWorldInverse);
          let ny = new THREE.Vector3(0, -0.5, 0).applyMatrix4(pcWorldInverse);
          let pz = new THREE.Vector3(0, 0, +0.5).applyMatrix4(pcWorldInverse);
          let nz = new THREE.Vector3(0, 0, -0.5).applyMatrix4(pcWorldInverse);

          let pxN = new THREE.Vector3().subVectors(nx, px).normalize();
          let nxN = pxN.clone().multiplyScalar(-1);
          let pyN = new THREE.Vector3().subVectors(ny, py).normalize();
          let nyN = pyN.clone().multiplyScalar(-1);
          let pzN = new THREE.Vector3().subVectors(nz, pz).normalize();
          let nzN = pzN.clone().multiplyScalar(-1);

          let pxPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(pxN, px);
          let nxPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(nxN, nx);
          let pyPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(pyN, py);
          let nyPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(nyN, ny);
          let pzPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(pzN, pz);
          let nzPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(nzN, nz);

          //if(window.debugdraw !== undefined && window.debugdraw === true && node.name === "r60"){

          //	Potree.utils.debugPlane(viewer.scene.scene, pxPlane, 1, 0xFF0000);
          //	Potree.utils.debugPlane(viewer.scene.scene, nxPlane, 1, 0x990000);
          //	Potree.utils.debugPlane(viewer.scene.scene, pyPlane, 1, 0x00FF00);
          //	Potree.utils.debugPlane(viewer.scene.scene, nyPlane, 1, 0x009900);
          //	Potree.utils.debugPlane(viewer.scene.scene, pzPlane, 1, 0x0000FF);
          //	Potree.utils.debugPlane(viewer.scene.scene, nzPlane, 1, 0x000099);

          //	Potree.utils.debugBox(viewer.scene.scene, box, new THREE.Matrix4(), 0x00FF00);
          //	Potree.utils.debugBox(viewer.scene.scene, box, pointcloud.matrixWorld, 0xFF0000);
          //	Potree.utils.debugBox(viewer.scene.scene, clipBox.box.boundingBox, clipBox.box.matrixWorld, 0xFF0000);

          //	window.debugdraw = false;
          //}

          let frustum = new THREE.Frustum(pxPlane, nxPlane, pyPlane, nyPlane, pzPlane, nzPlane);
          let intersects = frustum.intersectsBox(box);

          if(intersects){
            numIntersecting++;
          }
          numIntersectionVolumes++;
        }

        let insideAny = numIntersecting > 0;
        let insideAll = numIntersecting === numIntersectionVolumes;

        if(pointcloud.material.clipTask === ClipTask.SHOW_INSIDE){
          if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ANY && insideAny){
            //node.debug = true
          }else if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ALL && insideAll){
            //node.debug = true;
          }else{
            visible = false;
          }
        } else if(pointcloud.material.clipTask === ClipTask.SHOW_OUTSIDE){
          //if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ANY && !insideAny){
          //	//visible = true;
          //	let a = 10;
          //}else if(pointcloud.material.clipMethod === ClipMethod.INSIDE_ALL && !insideAll){
          //	//visible = true;
          //	let a = 20;
          //}else{
          //	visible = false;
          //}
        }
        

      }
*/

      // visible = ["r", "r0", "r06", "r060"].includes(node.name);
      // visible = ["r"].includes(node.name);

      if (node.spacing) {
        lowestSpacing = Math.min(lowestSpacing, node.spacing);
      } else if (node.geometryNode && node.geometryNode.spacing) {
        lowestSpacing = Math.min(lowestSpacing, node.geometryNode.spacing);
      }

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
        if (node.isLoaded()/* && loadedToGPUThisFrame < 2*/) {
      //     // This seems to convert the Potree oct node to a 
      //     // ThreeJS scene node, which shouldn't be necessary.
      //     // I guess it triggers uploading to the GPU.
      //     node = pointcloud.toTreeNode(node, parent);
      //     // loadedToGPUThisFrame++;
        } else {
          unloadedGeometry.push(node);
        }
      }

      // if (node.isTreeNode()) {
        exports.lru.touch(node);
        // node.sceneNode.visible = true;
        // node.sceneNode.material = pointcloud.material;

        // visibleNodes.push(node);// 
        this.visibleNodes.push(node);

        // if(node._transformVersion === undefined){
        //   node._transformVersion = -1;
        // }
        // let transformVersion = pointcloudTransformVersion.get(pointcloud);
        // if(node._transformVersion !== transformVersion.number){
        //   node.sceneNode.updateMatrix();
        //   node.sceneNode.matrixWorld.multiplyMatrices(pointcloud.matrixWorld, node.sceneNode.matrix);	
        //   node._transformVersion = transformVersion.number;
        // }

        // if (pointcloud.showBoundingBox && !node.boundingBoxNode && node.getBoundingBox) {
        //   let boxHelper = new Box3Helper(node.getBoundingBox());
        //   boxHelper.matrixAutoUpdate = false;
        //   pointcloud.boundingBoxNodes.push(boxHelper);
        //   node.boundingBoxNode = boxHelper;
        //   node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
        // } else if (pointcloud.showBoundingBox) {
        //   node.boundingBoxNode.visible = true;
        //   node.boundingBoxNode.matrix.copy(pointcloud.matrixWorld);
        // } else if (!pointcloud.showBoundingBox && node.boundingBoxNode) {
        //   node.boundingBoxNode.visible = false;
        // }
      // }

      // add child nodes to priorityQueue
      const children = node.getChildren();
      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        let weight = 0; 
        if(true || camera.isPerspectiveCamera){
          const sphere = child.getBoundingSphere();
          const distance = sphere.center.distanceTo(camObjPos);
          const radius = sphere.radius;
          
          const fov = (camera.fov * Math.PI) / 180;
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
        // const camera = this.camera;
    
    Potree.pointLoadLimit = Potree.pointBudget * 2;
    this.updateVisibility()

		this.updateMaterial();

	  exports.lru.freeMemory();
  }
  
};
