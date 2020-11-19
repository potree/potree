'use strict';
import { Measure } from "../src/utils/Measure.js";
import { LaneSegments } from "./LaneSegments.js"
import { visualizationMode, comparisonDatasets, s3, bucket, name } from "../demo/paramLoader.js"
import { updateLoadingBar, incrementLoadingBarTotal, resetProgressBars } from "../common/overlay.js";
import { getFbFileInfo } from "./loaderUtilities.js";


let laneFiles = null;
export const laneDownloads = async (datasetFiles) => {
  laneFiles = await getFbFileInfo(datasetFiles,
                                  "lanes.fb",
                                  "2_Truth",
                                  "GroundTruth_generated.js", // 5_Schemas
                                  "../data/lanes.fb",
                                  "../schemas/GroundTruth_generated.js");
  if (laneFiles?.hasOwnProperty("fileCount")) laneFiles.fileCount = 1;
  return laneFiles
}

async function loadLanes(s3, bucket, name, fname, supplierNum, annotationMode, volumes, callback) {
  // Logic for dealing with Map Supplier Data:
  const resolvedSupplierNum = supplierNum || -1;

  if (!laneFiles) {
    console.log("No lane files present")
    return
  }

  if (s3 && bucket && name) {
    const request = s3.getObject({Bucket: bucket,
                                  Key: laneFiles.objectName});
    request.on("httpDownloadProgress", async (e) => {
      await updateLoadingBar(e.loaded/e.total*100)
    });
    const data = await request.promise();
    incrementLoadingBarTotal("lanes downloaded")
    const schemaUrl = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: laneFiles.schemaFile
    });
    const FlatbufferModule = await import(schemaUrl);
    const laneGeometries = await parseLanes(data.Body.buffer, FlatbufferModule, resolvedSupplierNum, annotationMode, volumes);
    incrementLoadingBarTotal("lanes loaded")
    return laneGeometries;
  } else {
    const response = await fetch(laneFiles.objectName);
    incrementLoadingBarTotal("lanes downloaded")
    const FlatbufferModule = await import(laneFiles.schemaFile);
    const laneGeometries = await parseLanes(await response.arrayBuffer(), FlatbufferModule, resolvedSupplierNum, annotationMode, volumes);
    incrementLoadingBarTotal("lanes loaded")
    return laneGeometries;
  }
}


async function parseLanes(arrayBuffer, FlatbufferModule, supplierNum, annotationMode, volumes) {

  const numBytes = arrayBuffer.byteLength;
  const lanes = [];

  let segOffset = 0;
  let segSize, viewSize;
  while (segOffset < numBytes) {

    // Read SegmentSize:
    viewSize = new DataView(arrayBuffer, segOffset, 4);
    segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

    // Get Flatbuffer Lane Object:
    segOffset += 4;
    const buf = new Uint8Array(arrayBuffer.slice(segOffset, segOffset + segSize));
    const fbuffer = new flatbuffers.ByteBuffer(buf);
    const lane = FlatbufferModule.Flatbuffer.GroundTruth.Lane.getRootAsLane(fbuffer);

    lanes.push(lane);
    segOffset += segSize;
  }
  return await createLaneGeometries(lanes, supplierNum, annotationMode, volumes);
}

// async function in order to enable a real time loading bar (caller functions must also use async/await)
// without it the javascript code will run and block the UI that needs to update the loading bar (remove at your own risk)
async function createLaneGeometries (lanes, supplierNum, annotationMode, volumes) {
  const material = getLaneColors(supplierNum);

  const laneLeft = new Measure(); laneLeft.name = "Lane Left"; laneLeft.closed = false; laneLeft.showCoordinates = true; laneLeft.showAngles = true;
  // const laneSpine = new Measure(); laneSpine.name = "Lane Spine"; //laneRight.closed = false;
  const laneRight = new Measure(); laneRight.name = "Lane Right"; laneRight.closed = false; laneRight.showCoordinates = true; laneRight.showAngles = true;

  const leftLaneSegments = new LaneSegments(); leftLaneSegments.name = "Left Lane Segments";
  const rightLaneSegments = new LaneSegments(); rightLaneSegments.name = "Right Lane Segments";

  const clonedBoxes = createClonedBoxes(volumes);

  const all = [];
  const leftAnomalies = [];
  const rightAnomalies = [];
  let allBoxes = new THREE.Geometry();

  // have to load left, right, spine and creatingBoxes for each (split 100% evenly)
  // const numLaneTasks = 6*lanes.length // 6 for each iteration
  // const toLoad = 100/numLaneTasks
  // let stagesComplete = 0

  for (let ii = 0, len = lanes.length; ii < len; ii++) {

    const lane = lanes[ii];

    var geometryLeft = new THREE.Geometry();
    var geometrySpine = new THREE.Geometry();
    var geometryRight = new THREE.Geometry();
    let isContains = false;

    // const calcLoaded = async (prog, total) => {
    //   // always update # stages compelete
    //   if (prog == total-1) {
    //     stagesComplete++
    //   }
    // }

    const anomalyMode = !!lane.leftPointValidity;

    for (let jj = 0, numVertices = lane.leftLength(); jj < numVertices; jj++) {
      // await calcLoaded(jj, numVertices)

      const left = lane.left(jj);
      if (annotationMode) {
        if (volumes.length === 0) {
          laneLeft.addMarker(new THREE.Vector3(left.x(), left.y(), left.z()));
        } else {
          isContains = leftLaneSegments.updateSegments(clonedBoxes, isContains, left, lane.leftPointValidity(jj), lane.leftPointAnnotationStatus(jj), jj, numVertices);
        }
      } else {
        geometryLeft.vertices.push(new THREE.Vector3(left.x(), left.y(), left.z()));
        if (anomalyMode && lane.leftPointValidity(jj) === 1) {
          leftAnomalies.push(new THREE.Vector3(left.x(), left.y(), left.z()));
        }
      }
    }

    isContains = false;
    for (let jj = 0, numVertices = lane.rightLength(); jj < numVertices; jj++) {
      // await calcLoaded(jj, numVertices)
      const right = lane.right(jj);

      if (annotationMode) {
        if (volumes.length === 0) {
          laneRight.addMarker(new THREE.Vector3(right.x(), right.y(), right.z()));
        } else {
          isContains = rightLaneSegments.updateSegments(clonedBoxes, isContains, right, lane.rightPointValidity(jj), lane.rightPointAnnotationStatus(jj), jj, numVertices);
        }
      } else {
        geometryRight.vertices.push(new THREE.Vector3(right.x(), right.y(), right.z()));
        if (anomalyMode && lane.rightPointValidity(jj) === 1) {
          rightAnomalies.push(new THREE.Vector3(right.x(), right.y(), right.z()));
        }
      }
    }

    for (let jj = 0, numVertices = lane.spineLength(); jj < numVertices; jj++) {
      // await calcLoaded(jj, numVertices)
      const spine = lane.spine(jj);
      if (annotationMode) {
        // laneSpine.addMarker(new THREE.Vector3(spine.x(), spine.y(), spine.z()));
      } else {
        geometrySpine.vertices.push(new THREE.Vector3(spine.x(), spine.y(), spine.z()));
      }
    }

    if (annotationMode) {
      continue;
    }

    let firstCenter, center, lastCenter;

    await createBoxes(geometryLeft.vertices, material.left);
    await createBoxes(geometrySpine.vertices, material.spine);
    await createBoxes(geometryRight.vertices, material.right);

    async function createBoxes(vertices, material) {
      for (let ii=1, len=vertices.length; ii<len; ii++) {
        // await calcLoaded(ii, len)
        const tmp1 = vertices[ii-1];
        const tmp2 = vertices[ii];

        const p1 = new THREE.Vector3(tmp1.x, tmp1.y, tmp1.z);
        const p2 = new THREE.Vector3(tmp2.x, tmp2.y, tmp2.z);

        const length = Math.max(p1.distanceTo(p2), 0.001); // Clamp distance to min value of 1mm
        const height = 0.01;
        const width = 0.1;

        const vector = p2.sub(p1);
        const axis = new THREE.Vector3(1, 0, 0);
        center = p1.addScaledVector(vector, 0.5);
        if (lastCenter === undefined) {
          lastCenter = center.clone();
          firstCenter = center.clone();
        }
        // debugger; // lastCenter.sub(center) or center.sub(lastCenter);
        // let delta = lastCenter.clone().sub(center);
        // let delta = center.clone().sub(lastCenter);
        const delta = center.clone().sub(firstCenter);
        lastCenter = center.clone();
        // debugger; // delta
        // const geometry = new THREE.BoxGeometry(length, width, height);

        // for allBoxes:
        const boxGeometry = new THREE.BoxGeometry(length, width, height);
        const se3 = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, vector.clone().normalize());
        // debugger; // se3;
        se3.makeRotationFromQuaternion(quaternion); // Rotation
        se3.setPosition(delta); // Translation

        boxGeometry.applyMatrix( se3 );
        // TODO rotate boxGeometry.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
        allBoxes.merge(boxGeometry);

        if ((ii%100000)==0 || ii==(len-1)) {
          // let mesh = new THREE.Mesh(allBoxes, new THREE.MeshBasicMaterial({color:0x00ff00}));
          const mesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(allBoxes), material); // Buffergeometry
          mesh.position.copy(firstCenter);
          all.push(mesh);
          allBoxes = new THREE.Geometry();
          firstCenter = center.clone();
        }
      }
    }
  }

  if (annotationMode) {
    if (volumes.length > 0) {
      all.push(leftLaneSegments);
      all.push(rightLaneSegments);
    } else {
      all.push(laneLeft);
      // all.push(laneSpine);
      all.push(laneRight);
    }
  }

  const output = {
    all: all,
    leftAnomalies: leftAnomalies,
    rightAnomalies: rightAnomalies
  };
  return output;
}

function getLaneColors (supplierNum) {
  let materialLeft, materialSpine, materialRight;
  switch (supplierNum) {
    case -2:
      materialLeft = new THREE.MeshBasicMaterial({color: 0x11870a});
      materialSpine = new THREE.MeshBasicMaterial({color: 0x11870a});
      materialRight = new THREE.MeshBasicMaterial({color: 0x11870a});
      break;

    case 1:
      materialLeft = new THREE.MeshBasicMaterial({color: 0x3aaeb7});
      materialSpine = new THREE.MeshBasicMaterial({color: 0x3aaeb7});
      materialRight = new THREE.MeshBasicMaterial({color: 0x3aaeb7});
      break;

    case 2:
      materialLeft = new THREE.MeshBasicMaterial({color: 0x3e3ab7});
      materialSpine = new THREE.MeshBasicMaterial({color: 0x3e3ab7});
      materialRight = new THREE.MeshBasicMaterial({color: 0x3e3ab7});
      break;

    case 3:
      materialLeft = new THREE.MeshBasicMaterial({color: 0xa63ab7});
      materialSpine = new THREE.MeshBasicMaterial({color: 0xa63ab7});
      materialRight = new THREE.MeshBasicMaterial({color: 0xa63ab7});
      break;

    default:
      materialLeft = new THREE.MeshBasicMaterial({color: 0xffffff});
      materialSpine = new THREE.MeshBasicMaterial({color: 0x00ff00});
      materialRight = new THREE.MeshBasicMaterial({color: 0xffffff});
  }
  return {
    left: materialLeft,
    right: materialRight,
    spine: materialSpine
  }
}

function createClonedBoxes (volumes) {
  const clonedBoxes = [];
  for (let vi=0, vlen=volumes.length; vi<vlen; vi++) {
    if (volumes[vi].clip) {
      const clonedBbox = volumes[vi].boundingBox.clone();
      clonedBbox.applyMatrix4(volumes[vi].matrixWorld);
      clonedBoxes.push(clonedBbox);
    }
  }
  return clonedBoxes;
}

// Adds anomaly annotations
function addAnnotations (laneGeometries) {
  const aRoot = viewer.scene.annotations;
  const aAnomalies = new Potree.Annotation({
    title: 'Lane Anomalies',
    position: null,
    collapseThreshold: 0
  });
  aAnomalies.visible = false;
  aRoot.add(aAnomalies);

  if (laneGeometries.leftAnomalies.length !== 0) {
    aAnomalies.position = laneGeometries.leftAnomalies[0];
    const aLeft = new Potree.Annotation({
      title: 'Left',
      position: laneGeometries.leftAnomalies[0],
      collapseThreshold: 0
    });
    aAnomalies.add(populateAnomaliesHelper(aLeft, laneGeometries.leftAnomalies, 'Left'))
  }

  if (laneGeometries.rightAnomalies.length !== 0) {
    aAnomalies.position = laneGeometries.rightAnomalies[0];
    const aRight = new Potree.Annotation({
      title: 'Right',
      position: laneGeometries.rightAnomalies[0],
      collapseThreshold: 0
    });
    aAnomalies.add(populateAnomaliesHelper(aRight, laneGeometries.rightAnomalies, 'Right'))
  }
}

function populateAnomaliesHelper (annotation, anomalies, name) {
  for (let ii = 0, len = anomalies.length; ii < len; ii++) {
    const point = anomalies[ii];
    const aAnomaly = new Potree.Annotation({
      title: `${name} ${ii + 1}`,
      position: point,
      cameraPosition: new THREE.Vector3(point.x, point.y, point.z + 20),
      cameraTarget: point
    });
    annotation.add(aAnomaly);
  }
  return annotation;
}

// Adds lane geometries to viewer
function addLaneGeometries (laneGeometries, lanesLayer) {
  for (let ii = 0, len = laneGeometries.all.length; ii < len; ii++) {
    lanesLayer.add(laneGeometries.all[ii]);
  }
  viewer.scene.scene.add(lanesLayer);

  // add lane anomaly geometries
  if (laneGeometries.leftAnomalies.length !== 0 ||
    laneGeometries.rightAnomalies.length !== 0) {
    addAnnotations(laneGeometries);
  }
}


// Load Lanes Truth Data:
export async function loadLanesCallback(s3, bucket, name, callback) {
  let filename, tmpSupplierNum;
  tmpSupplierNum = -1;
  const laneGeometries = await loadLanes(s3, bucket, name, filename, tmpSupplierNum, window.annotateLanesModeActive, viewer.scene.volumes);
  // need to have Annoted Lanes layer, so that can have original and edited lanes layers
  const lanesLayer = new THREE.Group();
  lanesLayer.name = "Lanes";
  addLaneGeometries(laneGeometries, lanesLayer);
  viewer.scene.dispatchEvent({
    "type": "truth_layer_added",
    "truthLayer": lanesLayer
  });
  if (callback) {
    callback();
  }

  if (visualizationMode === "aptivLanes") {
    for (const s of [1, 2, 3]) {
      for (const d of ['EB', 'WB']) {
        for (const n of [1, 2, 3]) {
          const layerName = `Supplier${s}_${d}_Lane${n}`;
          const filename = `Supplier${s}_${d}_Lane${n}.fb`;
          loadLanesHelper(layerName, filename, s);
        }
      }
    }
    loadLanesHelper('TomTom', 'I-75-North_potree.fb', 1);
  }
  // Load Comparison Dataset (hardcoded to one for now)
  if (comparisonDatasets.length > 0) {
    filename = 'lanes.fb';
    tmpSupplierNum = -2;
    await loadLanes(s3, bucket, comparisonDatasets[0], filename, tmpSupplierNum, window.annotateLanesModeActive, viewer.scene.volumes, (laneGeometries) => {
      const lanesLayer = new THREE.Group();
      lanesLayer.name = `Lanes-${comparisonDatasets[0].split("Data/")[1]}`;
      addLaneGeometries(laneGeometries, lanesLayer);
      viewer.scene.dispatchEvent({
        "type": "truth_layer_added",
        "truthLayer": lanesLayer
      });
    });
  }
} // end of loadLanesCallback

async function loadLanesHelper (layerName, filename, s) {
  try {
    await loadLanes(s3, bucket, name, filename, s, window.annotateLanesModeActive, viewer.scene.volumes, (laneGeometries) => {
      const lanesLayer = new THREE.Group();
      lanesLayer.name = layerName;
      addLaneGeometries(laneGeometries, lanesLayer);
      viewer.scene.dispatchEvent({
        type: 'map_provider_layer_added',
        mapLayer: lanesLayer
      });
    });
  } catch (e) {
    console.error(`Couldn't load ${filename}`, e);
  }
}

// add an event listener for the reload lanes button
export function addReloadLanesButton() {
  window.annotateLanesModeActive = false; // starts off false

  $("#reload_lanes_button")[0].style.display = "block";
  const reloadLanesButton = $("#reload_lanes_button")[0];
  reloadLanesButton.addEventListener("mousedown", () => {
    const proceed = window.annotateLanesModeActive ?
      confirm("Proceed? Lanes will be reloaded, so ensure that annotations have been saved if you want to keep them.") :
      true;
    if (proceed) {
      // REMOVE LANES
      let removeLanes = viewer.scene.scene.getChildByName("Lanes");
      while (removeLanes) {
        viewer.scene.scene.remove(removeLanes);
        removeLanes = viewer.scene.scene.getChildByName("Lanes");
        // TODO remove "Lanes" from sidebar
      }
      // Pause animation:
      animationEngine.stop();
      // TOGGLE window.annotateLanesModeActive
      window.annotateLanesModeActive = !window.annotateLanesModeActive;
      // Disable Button:
      reloadLanesButton.disabled = true;
      // prepare for progress tracking (currently only triggered on button click)
      resetProgressBars(2) // have to download & process/load lanes
      loadLanesCallback(s3, bucket, name, () => {
        // TOGGLE BUTTON TEXT
        if (window.annotateLanesModeActive) {
          reload_lanes_button.innerText = "View Truth Lanes";
          document.getElementById("download_lanes_button").style.display = "block";
          document.getElementById("save_lanes_button").style.display = "block";
        } else {
          reload_lanes_button.innerText = "Annotate Truth Lanes";
          document.getElementById("download_lanes_button").style.display = "none";
          document.getElementById("save_lanes_button").style.display = "none";
        }
        reloadLanesButton.disabled = false;
      });
    }
  });
} // end of Reload Lanes Button Code
