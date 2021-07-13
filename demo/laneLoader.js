'use strict';
import { Measure } from "../src/utils/Measure.js";
import { LaneSegments } from "./LaneSegments.js"
import { visualizationMode, comparisonDatasets, s3, bucket, name, annotateAvailable, dataset, version, hostUrl, userToken } from "../demo/paramLoader.js"
import { updateLoadingBar, incrementLoadingBarTotal, resetProgressBars } from "../common/overlay.js";
import { getFbFileInfo, getFromRestApi } from "./loaderUtilities.js";
import { VolumeTool } from "../src/utils/VolumeTool.js";


let laneFiles = null;

export const laneDownloads = async (datasetFiles) => {
  laneFiles = await getFbFileInfo(datasetFiles,
                                  "lanes.fb",
                                  "2_Truth",
                                  "GroundTruth_generated.js", // 5_Schemas
                                  "../data/lanes.fb",
                                  "../schemas/GroundTruth_generated.js",
                                  true);

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
    const filePath = fname && name + "/2_Truth/" + fname || null;
    const request = s3.getObject({Bucket: bucket, Key: filePath || laneFiles.objectName, "ResponseCacheControl":"no-cache"});
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

    if (callback) {
      callback(laneGeometries);
    }

    return laneGeometries;
  } else {
    const response = await fetch(laneFiles.objectName);
    incrementLoadingBarTotal("lanes downloaded")
    const FlatbufferModule = await import(laneFiles.schemaFile);
    const laneGeometries = await parseLanes(await response.arrayBuffer(), FlatbufferModule, resolvedSupplierNum, annotationMode, volumes);
    incrementLoadingBarTotal("lanes loaded")

    if (callback) {
      callback(laneGeometries);
    }

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
window.usingInvalidLanesSchema = false; // Used to determine schema version being used
async function createLaneGeometries (lanes, supplierNum, annotationMode, volumes) {
  const material = getLaneColors(supplierNum);

  const laneLeft = new Measure(); laneLeft.name = "Lane Left"; laneLeft.closed = false; laneLeft.showCoordinates = true; laneLeft.showAngles = true;
  // const laneSpine = new Measure(); laneSpine.name = "Lane Spine"; //laneRight.closed = false;
  const laneRight = new Measure(); laneRight.name = "Lane Right"; laneRight.closed = false; laneRight.showCoordinates = true; laneRight.showAngles = true;

  const leftLaneSegments = new LaneSegments(); leftLaneSegments.name = "Left Lane Segments";
  const rightLaneSegments = new LaneSegments(); rightLaneSegments.name = "Right Lane Segments";

  const clonedBoxes = createClonedBoxes(volumes.filter(({name}) => name === "Volume"));

  const all = [];
  const leftAnomalies = [];
  const rightAnomalies = [];
  const leftInvalidAnnotations = [];
  const rightInvalidAnnotations = [];
  let allBoxes = new THREE.Geometry();
  let invalidBoxes = new THREE.Geometry();

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

    const leftValidities = [];
    const rightValidities = [];

    const romanNumerals = ["I", "II"];

    // const calcLoaded = async (prog, total) => {
    //   // always update # stages compelete
    //   if (prog == total-1) {
    //     stagesComplete++
    //   }
    // }

    // Determine the schema version being used
    window.usingInvalidLanesSchema = !!lane.leftPointAnomaly && !!lane.leftPointValidity;
    const anomalyMode = !!lane.leftPointValidity && !window.usingInvalidLanesSchema;

    for (let jj = 0, numVertices = lane.leftLength(); jj < numVertices; jj++) {
      // await calcLoaded(jj, numVertices)

      const left = lane.left(jj);
      if (annotationMode) {
        if (clonedBoxes.length === 0) {
          laneLeft.addMarker(new THREE.Vector3(left.x(), left.y(), left.z()), null, window.usingInvalidLanesSchema && lane.leftPointAnomaly(jj), window.usingInvalidLanesSchema && lane.leftPointValidity(jj));
        } else {
          isContains = leftLaneSegments.updateSegments(clonedBoxes, isContains, left, lane.leftPointValidity(jj), window.usingInvalidLanesSchema && lane.leftPointAnomaly(jj), lane.leftPointAnnotationStatus(jj), jj, numVertices);
        }
      } else {
        geometryLeft.vertices.push(new THREE.Vector3(left.x(), left.y(), left.z()));
        if (anomalyMode && lane.leftPointValidity(jj) === 1) {
          leftAnomalies.push({
            "layer": "Lane Anomalies",
            "position": new THREE.Vector3(left.x(), left.y(), left.z())
          });
        }
        else if (window.usingInvalidLanesSchema && lane.leftPointAnomaly(jj) > 0) {
          leftAnomalies.push({
            "layer": "Type " + romanNumerals[lane.leftPointAnomaly(jj) - 1] + " Lane Anomalies",
            "position": new THREE.Vector3(left.x(), left.y(), left.z())
          });
        }

        if (window.usingInvalidLanesSchema) {
          leftValidities.push(lane.leftPointValidity(jj));

          if (lane.leftPointValidity(jj)) {
            // If the end of an invalid region has been reached, mark the center of the region with an annotation
            if (jj === lane.leftLength() - 1 || !lane.leftPointValidity(jj + 1)) {
              const annotationPosition = lane.left(Math.floor((leftValidities.lastIndexOf(0) + jj + 1) / 2));
              leftInvalidAnnotations.push({
                "tag": "Invalid Lane",
                "position": new THREE.Vector3(annotationPosition.x(), annotationPosition.y(), annotationPosition.z())
              });
            }
          }
        }
        else {
          leftValidities.push(0);
        }
      }
    }

    isContains = false;
    for (let jj = 0, numVertices = lane.rightLength(); jj < numVertices; jj++) {
      // await calcLoaded(jj, numVertices)
      const right = lane.right(jj);

      if (annotationMode) {
        if (clonedBoxes.length === 0) {
          laneRight.addMarker(new THREE.Vector3(right.x(), right.y(), right.z()), null, window.usingInvalidLanesSchema && lane.rightPointAnomaly(jj), window.usingInvalidLanesSchema && lane.rightPointValidity(jj));
        } else {
          isContains = rightLaneSegments.updateSegments(clonedBoxes, isContains, right, lane.rightPointValidity(jj), window.usingInvalidLanesSchema && lane.rightPointAnomaly(jj), lane.rightPointAnnotationStatus(jj), jj, numVertices);
        }
      } else {
        geometryRight.vertices.push(new THREE.Vector3(right.x(), right.y(), right.z()));
        if (anomalyMode && lane.rightPointValidity(jj) === 1) {
          rightAnomalies.push({
            "layer": "Lane Anomalies",
            "position": new THREE.Vector3(right.x(), right.y(), right.z())
          });
        }
        else if (window.usingInvalidLanesSchema && lane.rightPointAnomaly(jj) > 0) {
          rightAnomalies.push({
            "layer": "Type " + romanNumerals[lane.rightPointAnomaly(jj) - 1] + " Lane Anomalies",
            "position": new THREE.Vector3(right.x(), right.y(), right.z())
          });
        }

        if (window.usingInvalidLanesSchema) {
          rightValidities.push(lane.rightPointValidity(jj));

          if (lane.rightPointValidity(jj)) {
            // If the end of an invalid region has been reached, mark the center of the region with an annotation
            if (jj === lane.rightLength() - 1 || !lane.rightPointValidity(jj + 1)) {
              const annotationPosition = lane.right(Math.floor((rightValidities.lastIndexOf(0) + jj + 1) / 2));
              rightInvalidAnnotations.push({
                "tag": "Invalid Lane",
                "position": new THREE.Vector3(annotationPosition.x(), annotationPosition.y(), annotationPosition.z())
              });
            }
          }
        }
        else {
          rightValidities.push(0);
        }
      }
    }

    const spineValidities = [];
    for (let jj = 0, numVertices = lane.spineLength(); jj < numVertices; jj++) {
      // await calcLoaded(jj, numVertices)
      const spine = lane.spine(jj);
      if (annotationMode) {
        // laneSpine.addMarker(new THREE.Vector3(spine.x(), spine.y(), spine.z()));
      } else {
        geometrySpine.vertices.push(new THREE.Vector3(spine.x(), spine.y(), spine.z()));
      }

      // Spine points use the closest left lane point to determine validity
      if (window.usingInvalidLanesSchema) {
        const spinePoint = new THREE.Vector3(spine.x(), spine.y(), spine.z());
        const closestLeftIndex = geometryLeft.vertices.reduce((acc, current, i) => {
          return current.distanceTo(spinePoint) < geometryLeft.vertices[acc].distanceTo(spinePoint) ? i : acc;
        }, 0);

        spineValidities.push(leftValidities[closestLeftIndex])
      }
      else {
        spineValidities.push(0);
      }
    }

    if (annotationMode) {
      continue;
    }

    let firstCenter, center, lastCenter;

    const invalidLaneColor = 0x888888;
    const invalidSpineColor = 0x008800;

    await createBoxes(geometryLeft.vertices, material.left, leftValidities, invalidLaneColor);
    await createBoxes(geometrySpine.vertices, material.spine, spineValidities, invalidSpineColor);
    await createBoxes(geometryRight.vertices, material.right, rightValidities, invalidLaneColor);

    async function createBoxes(vertices, material, validities, invalidColor) {
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
        if (validities && (validities[ii - 1] || validities[ii])) {
          invalidBoxes.merge(boxGeometry);
        }
        else {
          allBoxes.merge(boxGeometry);
        }

        if ((ii%100000)==0 || ii==(len-1)) {
          // let mesh = new THREE.Mesh(allBoxes, new THREE.MeshBasicMaterial({color:0x00ff00}));
          const mesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(allBoxes), material); // Buffergeometry
          mesh.position.copy(firstCenter);
          mesh.isInvalid = false;
          all.push(mesh);
          allBoxes = new THREE.Geometry();

          const hasInvalidLanes = window.usingInvalidLanesSchema && validities.some(validity => validity === 1);
          if (hasInvalidLanes) {
            const invalidMaterial = material.clone();
            invalidMaterial.color.setHex(invalidColor);
            const invalidMesh  = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(invalidBoxes), invalidMaterial);
            invalidMesh.position.copy(firstCenter);
            invalidMesh.isInvalid = true;
            all.push(invalidMesh);
            invalidBoxes = new THREE.Geometry();
          }

          firstCenter = center.clone();
        }
      }
    }
  }

  if (annotationMode) {
    if (clonedBoxes.length > 0) {
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
    rightAnomalies: rightAnomalies,
    leftInvalidAnnotations,
    rightInvalidAnnotations
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

// Adds invalid annotations
function addInvalidAnnotations (laneGeometries) {
  const { leftInvalidAnnotations, rightInvalidAnnotations } = laneGeometries;
  const aRoot = viewer.scene.annotations;

  const aInvalid = new Potree.Annotation({
    title: 'Invalid Lanes',
    position: null,
    collapseThreshold: 0
  });
  aRoot.add(aInvalid);

  if (leftInvalidAnnotations.length !== 0) {
    aInvalid.position = leftInvalidAnnotations[0].position;
    const aLeft = new Potree.Annotation({
      title: 'Left',
      position: leftInvalidAnnotations[0].position,
      collapseThreshold: 0
    });
    aLeft.visible = false;
    aInvalid.children.push(aLeft);
    aLeft.parent = aInvalid;

    const invalidArray = [];
    for (let ii = 0, len = leftInvalidAnnotations.length; ii < len; ii++) {
      const { tag, position } = leftInvalidAnnotations[ii];
      const invalidAnnotation = new Potree.Annotation({
        title: tag,
        position,
        cameraPosition: new THREE.Vector3(position.x, position.y, position.z + 20),
        cameraTarget: position
      });
      invalidArray.push(invalidAnnotation);
    }
    aLeft.addMultiple(viewer.scene.annotations, invalidArray);
  }

  if (rightInvalidAnnotations.length !== 0) {
    aInvalid.position = rightInvalidAnnotations[0].position;
    const aRight = new Potree.Annotation({
      title: 'Right',
      position: rightInvalidAnnotations[0].position,
      collapseThreshold: 0
    });
    aRight.visible = false;
    aInvalid.children.push(aRight);
    aRight.parent = aInvalid;

    const invalidArray = [];
    for (let ii = 0, len = rightInvalidAnnotations.length; ii < len; ii++) {
      const { tag, position } = rightInvalidAnnotations[ii];
      const invalidAnnotation = new Potree.Annotation({
        title: tag,
        position,
        cameraPosition: new THREE.Vector3(position.x, position.y, position.z + 20),
        cameraTarget: position
      });
      invalidArray.push(invalidAnnotation);
    }
    aRight.addMultiple(viewer.scene.annotations, invalidArray);
  }
}

// Adds invalid annotations split into multiple layers
function addInvalidAnnotationsSplit (laneGeometries, invalidLayerSize) {
  const { leftInvalidAnnotations, rightInvalidAnnotations } = laneGeometries;
  const aRoot = viewer.scene.annotations;

  const aInvalid = new Potree.Annotation({
    title: 'Invalid Lanes',
    position: null,
    collapseThreshold: 0
  });
  aRoot.add(aInvalid);

  if (leftInvalidAnnotations.length !== 0) {
    aInvalid.position = leftInvalidAnnotations[0].position;
    const leftLayer = new Potree.Annotation({
      title: "Left",
      position: null,
      collapseThreshold: 0
    });
    aInvalid.add(leftLayer);

    for (let i = 0, len = leftInvalidAnnotations.length; i < len; i += invalidLayerSize) {
      aInvalid.position = leftInvalidAnnotations[i].position;
      leftLayer.position = leftInvalidAnnotations[i].position;
      const aLeft = new Potree.Annotation({
        title: `${i + 1} - ${Math.min(i + invalidLayerSize, leftInvalidAnnotations.length)}`,
        position: leftInvalidAnnotations[i].position,
        collapseThreshold: 0
      });
      aLeft.visible = false;
      leftLayer.children.push(aLeft);
      aLeft.parent = leftLayer;

      const invalidArray = [];
      for (let ii = i, len = Math.min(i + invalidLayerSize, leftInvalidAnnotations.length); ii < len; ii++) {
        const { tag, position } = leftInvalidAnnotations[ii];
        const invalidAnnotation = new Potree.Annotation({
          title: tag,
          position,
          cameraPosition: new THREE.Vector3(position.x, position.y, position.z + 20),
          cameraTarget: position
        });
        invalidArray.push(invalidAnnotation);
      }
      aLeft.addMultiple(viewer.scene.annotations, invalidArray);
    }
  }

  if (rightInvalidAnnotations.length !== 0) {
    aInvalid.position = rightInvalidAnnotations[0].position;
    const rightLayer = new Potree.Annotation({
      title: "Right",
      position: null,
      collapseThreshold: 0
    });
    aInvalid.add(rightLayer);

    for (let i = 0, len = rightInvalidAnnotations.length; i < len; i += invalidLayerSize) {
      aInvalid.position = rightInvalidAnnotations[i].position;
      rightLayer.position = rightInvalidAnnotations[i].position;
      const aRight = new Potree.Annotation({
        title: `${i + 1} - ${Math.min(i + invalidLayerSize, rightInvalidAnnotations.length)}`,
        position: rightInvalidAnnotations[i].position,
        collapseThreshold: 0
      });
      aRight.visible = false;
      rightLayer.children.push(aRight);
      aRight.parent = rightLayer;

      const invalidArray = [];
      for (let ii = i, len = Math.min(i + invalidLayerSize, rightInvalidAnnotations.length); ii < len; ii++) {
        const { tag, position } = rightInvalidAnnotations[ii];
        const invalidAnnotation = new Potree.Annotation({
          title: tag,
          position,
          cameraPosition: new THREE.Vector3(position.x, position.y, position.z + 20),
          cameraTarget: position
        });
        invalidArray.push(invalidAnnotation);
      }
      aRight.addMultiple(viewer.scene.annotations, invalidArray);
    }
  }
}

// Adds anomaly annotations
function addAnnotations (laneGeometries) {
  const aRoot = viewer.scene.annotations;

  const anomalyLayers = [];
  [...laneGeometries.leftAnomalies, ...laneGeometries.rightAnomalies].forEach(({layer}) => {
    if (!anomalyLayers.includes(layer)) {
      anomalyLayers.push(layer);
    }
  });
  anomalyLayers.sort((a, b) => a.localeCompare(b));

  anomalyLayers.forEach(anomalyLayer => {
    const leftAnomalies = laneGeometries.leftAnomalies.filter(({layer}) => layer === anomalyLayer).map(({position}) => position);
    const rightAnomalies = laneGeometries.rightAnomalies.filter(({layer}) => layer === anomalyLayer).map(({position}) => position);

    const aAnomalies = new Potree.Annotation({
      title: anomalyLayer,
      position: null,
      collapseThreshold: 0
    });
    aAnomalies.visible = false;
    aRoot.add(aAnomalies);

    if (leftAnomalies.length !== 0) {
      aAnomalies.position = leftAnomalies[0];
      const aLeft = new Potree.Annotation({
        title: 'Left',
        position: leftAnomalies[0],
        collapseThreshold: 0
      });
      aAnomalies.children.push(aLeft);
      aLeft.parent = aAnomalies;
      populateAnomaliesHelper(aLeft, leftAnomalies, 'Left', 0);
    }

    if (rightAnomalies.length !== 0) {
      aAnomalies.position = rightAnomalies[0];
      const aRight = new Potree.Annotation({
        title: 'Right',
        position: rightAnomalies[0],
        collapseThreshold: 0
      });
      aAnomalies.children.push(aRight);
      aRight.parent = aAnomalies;
      populateAnomaliesHelper(aRight, rightAnomalies, 'Right', 0);
    }
  });
}

// Adds anomaly annotations split into multiple layers
function addAnnotationsSplit (laneGeometries, anomalyLayerSize) {
  const aRoot = viewer.scene.annotations;

  const anomalyLayers = [];
  [...laneGeometries.leftAnomalies, ...laneGeometries.rightAnomalies].forEach(({layer}) => {
    if (!anomalyLayers.includes(layer)) {
      anomalyLayers.push(layer);
    }
  });
  anomalyLayers.sort((a, b) => a.localeCompare(b));

  anomalyLayers.forEach(anomalyLayer => {
    const leftAnomalies = laneGeometries.leftAnomalies.filter(({layer}) => layer === anomalyLayer).map(({position}) => position);
    const rightAnomalies = laneGeometries.rightAnomalies.filter(({layer}) => layer === anomalyLayer).map(({position}) => position);

    const aAnomalies = new Potree.Annotation({
      title: anomalyLayer,
      position: null,
      collapseThreshold: 0
    });
    aRoot.add(aAnomalies);

    if (leftAnomalies.length > 0) {
      const leftLayer = new Potree.Annotation({
        title: "Left",
        position: null,
        collapseThreshold: 0
      });
      aAnomalies.add(leftLayer);

      for (let i = 0, len = leftAnomalies.length; i < len; i += anomalyLayerSize) {
        aAnomalies.position = leftAnomalies[i];
        leftLayer.position = leftAnomalies[i];
        const aLeft = new Potree.Annotation({
          title: `${i + 1} - ${Math.min(i + anomalyLayerSize, leftAnomalies.length)}`,
          position: leftAnomalies[i],
          collapseThreshold: 0
        });
        aLeft.visible = false;
        leftLayer.children.push(aLeft);
        aLeft.parent = leftLayer;
        populateAnomaliesHelper(aLeft, leftAnomalies.slice(i, Math.min(i + anomalyLayerSize, leftAnomalies.length)), 'Left', i);
      }
    }

    if (rightAnomalies.length > 0) {
      const rightLayer = new Potree.Annotation({
        title: "Right",
        position: null,
        collapseThreshold: 0
      });
      aAnomalies.add(rightLayer);

      for (let i = 0, len = Math.max(i + anomalyLayerSize, rightAnomalies.length); i < len; i += anomalyLayerSize) {
        aAnomalies.position = rightAnomalies[i];
        rightLayer.position = rightAnomalies[i];
        const aRight = new Potree.Annotation({
          title: `${i + 1} - ${Math.min(i + anomalyLayerSize, rightAnomalies.length)}`,
          position: rightAnomalies[i],
          collapseThreshold: 0
        });
        aRight.visible = false;
        rightLayer.children.push(aRight);
        aRight.parent = rightLayer;
        populateAnomaliesHelper(aRight, rightAnomalies.slice(i, Math.min(i + anomalyLayerSize, rightAnomalies.length)), 'Right', i);
      }
    }
  });
}

function populateAnomaliesHelper (annotation, anomalies, name, indexOffset) {
  const anomaliesArray = [];
  for (let ii = 0, len = anomalies.length; ii < len; ii++) {
    const point = anomalies[ii];
    const aAnomaly = new Potree.Annotation({
      title: `${name} ${ii + indexOffset + 1}`,
      position: point,
      cameraPosition: new THREE.Vector3(point.x, point.y, point.z + 20),
      cameraTarget: point
    });
    anomaliesArray.push(aAnomaly);
  }
  annotation.addMultiple(viewer.scene.annotations, anomaliesArray);
}

// Adds lane geometries to viewer
function addLaneGeometries (laneGeometries, lanesLayer, invalidLanesLayer) {
  for (let ii = 0, len = laneGeometries.all.length; ii < len; ii++) {
    if (invalidLanesLayer && laneGeometries.all[ii].isInvalid) {
      invalidLanesLayer.add(laneGeometries.all[ii]);
    }
    else {
      lanesLayer.add(laneGeometries.all[ii]);
    }
  }

  viewer.scene.scene.add(lanesLayer);
  const maxAnnotationLength = 500;

  if (invalidLanesLayer.children.length > 0 && annotateAvailable) {
    viewer.scene.scene.add(invalidLanesLayer);

    viewer.scene.dispatchEvent({
      "type": "truth_layer_added",
      "truthLayer": invalidLanesLayer
    });

    if (laneGeometries.leftInvalidAnnotations.length > maxAnnotationLength || laneGeometries.rightInvalidAnnotations.length > maxAnnotationLength) {
      addInvalidAnnotationsSplit(laneGeometries, maxAnnotationLength);
    }
    else if (laneGeometries.leftInvalidAnnotations.length !== 0 || laneGeometries.rightInvalidAnnotations.length !== 0) {
      addInvalidAnnotations(laneGeometries);
    }
  }

  // add lane anomaly geometries
  if (laneGeometries.leftAnomalies.length > maxAnnotationLength || laneGeometries.rightAnomalies.length > maxAnnotationLength) {
    addAnnotationsSplit(laneGeometries, maxAnnotationLength);
  }
  else if (laneGeometries.leftAnomalies.length !== 0 || laneGeometries.rightAnomalies.length !== 0) {
    addAnnotations(laneGeometries);
  }
}

// Load Lanes Truth Data:
export async function loadLanesCallback(s3, bucket, name, filename, callback) {
  let tmpSupplierNum;
  tmpSupplierNum = filename ? 1 : -1;
  const laneGeometries = await loadLanes(s3, bucket, name, filename, tmpSupplierNum, window.annotateLanesModeActive, viewer.scene.volumes);
  // need to have Annoted Lanes layer, so that can have original and edited lanes layers
  const lanesLayer = new THREE.Group();
  lanesLayer.name = filename && "Additional Lanes" || "Lanes"

  const invalidLanesLayer = new THREE.Group();
  invalidLanesLayer.name = filename && "Additional Invalid Lanes" || "Invalid Lanes";
  invalidLanesLayer.visible = false;

  const assessmentStatusUrl = `${hostUrl}get-assessment-status?dataset=${encodeURIComponent(dataset)}&bucket=${encodeURIComponent(bucket)}&version=${encodeURIComponent(parseInt(version))}&userToken=${encodeURIComponent(userToken)}`;
  const assessmentStatus = await getFromRestApi(assessmentStatusUrl);

  if (assessmentStatus || annotateAvailable) {
    addLaneGeometries(laneGeometries, lanesLayer, invalidLanesLayer);
    viewer.scene.dispatchEvent({
      "type": "truth_layer_added",
      "truthLayer": lanesLayer
    });
  }

  if (callback) {
    callback();
  }

  if (visualizationMode === "customerLanes") {
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
        viewer.scene.dispatchEvent({
          "type": "truth_layer_deleted",
          "truthLayer": removeLanes
        });
        removeLanes = viewer.scene.scene.getChildByName("Lanes");
        // TODO remove "Lanes" from sidebar
      }
      let removeInvalidLanes = viewer.scene.scene.getChildByName("Invalid Lanes");
      while (removeInvalidLanes) {
        viewer.scene.scene.remove(removeInvalidLanes);
        viewer.scene.dispatchEvent({
          "type": "truth_layer_deleted",
          "truthLayer": removeInvalidLanes
        });
        removeInvalidLanes = viewer.scene.scene.getChildByName("Invalid Lanes");
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
      loadLanesCallback(s3, bucket, name, null, () => {
        // TOGGLE BUTTON TEXT
        if (window.annotateLanesModeActive) {
          reload_lanes_button.innerText = "View Truth Lanes";
          document.getElementById("download_lanes_button").style.display = "block";
          document.getElementById("save_lanes_button").style.display = "block";
          document.getElementById("select_lanes_button").style.display = "block";
        } else {
          reload_lanes_button.innerText = "Annotate Truth Lanes";
          document.getElementById("download_lanes_button").style.display = "none";
          document.getElementById("save_lanes_button").style.display = "none";
          document.getElementById("select_lanes_button").style.display = "none";

          viewer.scene.volumes.filter(({name}) => name === "selected_lanes").forEach(volume => viewer.scene.removeVolume(volume));
        }
        reloadLanesButton.disabled = false;
      });
    }
  });

  const onSelectedLanesClicked = (e) => {
    if (window.annotateLanesModeActive && window.truthAnnotationMode > 0) {
      const volume = e.target;
      const clonedBox = volume.boundingBox.clone();
      clonedBox.applyMatrix4(volume.matrixWorld);

      const leftLane = viewer.scene.scene.getChildByName("Left Lane Segments") || viewer.scene.scene.getChildByName("Lane Left");
      const rightLane = viewer.scene.scene.getChildByName("Right Lane Segments") || viewer.scene.scene.getChildByName("Lane Right");

      const segmented = leftLane.name === "Left Lane Segments";

      if (segmented) {
        leftLane.segments.forEach(segment => {
          segment.spheres.filter(({position}) => clonedBox.containsPoint(position)).forEach(sphere => {
            if (window.truthAnnotationMode == 1) {
              const index = segment.spheres.indexOf(sphere);
              segment.removeMarker(index);
            }
            else if (window.truthAnnotationMode == 3) {
              sphere.validity = 1;
              segment.update();
            } else if (window.truthAnnotationMode == 4) {
              sphere.validity = 0;
              segment.update();
            }
          });
        });

        rightLane.segments.forEach(segment => {
          console.log(segment)
          segment.spheres.filter(({position}) => clonedBox.containsPoint(position)).forEach(sphere => {
            if (window.truthAnnotationMode == 1) {
              const index = segment.spheres.indexOf(sphere);
              segment.removeMarker(index);
            }
            else if (window.truthAnnotationMode == 3) {
              sphere.validity = 1;
              segment.update();
            } else if (window.truthAnnotationMode == 4) {
              sphere.validity = 0;
              segment.update();
            }
          });
        });
      }
      else {
        leftLane.spheres.filter(({position}) => clonedBox.containsPoint(position)).forEach(sphere => {
          if (window.truthAnnotationMode == 1) {
            const index = leftLane.spheres.indexOf(sphere);
            leftLane.removeMarker(index);
          }
          else if (window.truthAnnotationMode == 3) {
            sphere.validity = 1;
            leftLane.update();
          } else if (window.truthAnnotationMode == 4) {
            sphere.validity = 0;
            leftLane.update();
          }
        });

        rightLane.spheres.filter(({position}) => clonedBox.containsPoint(position)).forEach(sphere => {
          if (window.truthAnnotationMode == 1) {
            const index = rightLane.spheres.indexOf(sphere);
            rightLane.removeMarker(index);
          }
          else if (window.truthAnnotationMode == 3) {
            sphere.validity = 1;
            rightLane.update();
          } else if (window.truthAnnotationMode == 4) {
            sphere.validity = 0;
            rightLane.update();
          }
        });
      }
    }
  }

  const mouseover = (e) => {
    e.object.frame.material.color.setHex(0xFFFF00);
  }

  const mouseleave = (e) => {
    e.object.frame.material.color.setHex(0x000000);
  }

  const selectLanesButton = document.getElementById("select_lanes_button");
  selectLanesButton.addEventListener("mousedown", () => {
    viewer.scene.volumes.filter(({name}) => name === "selected_lanes").forEach(volume => viewer.scene.removeVolume(volume));

    const volumeTool = new VolumeTool(viewer);
    const volume = volumeTool.startInsertion({name: "selected_lanes", clip: true});

    volume.addEventListener("mouseup", onSelectedLanesClicked);
    volume.addEventListener("mouseover", mouseover);
    volume.addEventListener("mouseleave", mouseleave);

    const measurementsRoot = $("#jstree_scene").jstree().get_json("measurements");
    const jsonNode = measurementsRoot.children.find(child => child.data.uuid === volume.uuid);
    $.jstree.reference(jsonNode.id).deselect_all();
    $.jstree.reference(jsonNode.id).select_node(jsonNode.id);
  });
} // end of Reload Lanes Button Code
