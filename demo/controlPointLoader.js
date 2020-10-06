'use strict';
import { getInstancedShaderMaterial } from '../demo/paramLoader.js';
import { updateLoadingBar, incrementLoadingBarTotal } from '../common/overlay.js';

// load control points
export async function loadControlPointsCallback (s3, bucket, name, animationEngine, files) {
  // Handle local files
  if (files) {
    // Handle s3 files
    for (let file of files) {
      // Remove prefix filepath
      file = file.split(/.*[\/|\\]/)[1];
      // Handle old naming and new naming schemas
      if (file.includes('control_point_3_rtk_relative.fb') || file.includes('viz_Spheres3D_')) {
        await loadControlPointsCallbackHelper(s3, bucket, name, animationEngine, file);
      }
    }
  }
}

function indexOfClosestTimestamp(controlPoints, timestamp) {
  if (timestamp <= controlPoints[0].timestamp) {
    return 0;
  }

  if (timestamp >= controlPoints[controlPoints.length - 1].timestamp) {
    return controlPoints.length - 1;
  }

  let start = 0;
  let end = controlPoints.length;
  let mid = 0;

  while (start < end) {
    mid = Math.floor((start + end) / 2);

    if (controlPoints[mid].timestamp === timestamp) {
      return mid;
    }
    else if (timestamp < controlPoints[mid].timestamp) {
      if (mid > 0 && timestamp > controlPoints[mid - 1].timestamp) {
        return Math.abs(timestamp - controlPoints[mid].timestamp) < Math.abs(timestamp - controlPoints[mid - 1].timestamp) ? mid : mid - 1;
      }

      end = mid;
    }
    else {
      if (mid < controlPoints.length - 1 && timestamp < controlPoints[mid + 1].timestamp) {
        return Math.abs(timestamp - controlPoints[mid].timestamp) < Math.abs(timestamp - controlPoints[mid + 1].timestamp) ? mid : mid + 1;
      }

      start = mid + 1;
    }
  }

  return mid;
}

window.controlPointBudget = 1000;
async function loadControlPointsCallbackHelper (s3, bucket, name, animationEngine, controlPointType) {
  const shaderMaterial = getInstancedShaderMaterial();
  const controlPointShaderMaterial = shaderMaterial.clone();
  await loadControlPoints(s3, bucket, name, controlPointShaderMaterial, animationEngine, (meshData) => {
    let {mesh, offset, controlPointData} = meshData;

    const controlPointLayer = new THREE.Group();
    controlPointLayer.name = getControlPointName(controlPointType);
    mesh.position.copy(offset)
    controlPointLayer.add(mesh);

    const controlPointTimestamps = controlPointData.map((data, i) => ({
      timestamp: data.timestamp,
      index: i
    })).sort((a, b) => a.timestamp - b.timestamp);

    viewer.scene.scene.add(controlPointLayer);
    const e = new CustomEvent('truth_layer_added', {detail: controlPointLayer, writable: true});
    viewer.scene.dispatchEvent({
      type: 'sensor_layer_added',
      sensorLayer: controlPointLayer
    });
    // TODO check if group works as expected, then trigger "truth_layer_added" event
    animationEngine.tweenTargets.push((gpsTime) => {
      const currentTime = gpsTime - animationEngine.tstart;
      controlPointShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
      controlPointShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;

      if (mesh.count !== window.controlPointBudget) {
        controlPointLayer.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();

        const sphereGeo = new THREE.InstancedBufferGeometry().copy(new THREE.SphereBufferGeometry(0.15));
        mesh = new THREE.InstancedMesh(sphereGeo, controlPointShaderMaterial, window.controlPointBudget);
        mesh.name = "ControlPoint"
        mesh.frustumCulled = false;
        mesh.position.copy(offset);

        controlPointLayer.add(mesh);
      }

      const currentIndex = indexOfClosestTimestamp(controlPointTimestamps, currentTime);
      const minIndex = Math.max(0, currentIndex - window.controlPointBudget / 2);
      const maxIndex = Math.min(controlPointTimestamps.length, currentIndex + Math.ceil(window.controlPointBudget / 2));
      const currentData = controlPointTimestamps.slice(minIndex, maxIndex);

        const timestamps = new Float32Array(window.controlPointBudget).fill(undefined);
        for (let i = 0; i < currentData.length; i++) {
          timestamps[i] = currentData[i].timestamp;

          const currentPosition = controlPointData[currentData[i].index].position;
          const newTransform = new THREE.Matrix4();
          newTransform.setPosition(currentPosition.x, currentPosition.y, currentPosition.z);

          mesh.setMatrixAt(i, newTransform);
          mesh.instanceMatrix.needsUpdate = true;
        }

        mesh.geometry.setAttribute('gpsTime', new THREE.InstancedBufferAttribute(timestamps, 1));
    });
  }, controlPointType);
}

export async function loadControlPoints (s3, bucket, name, controlPointShaderMaterial, animationEngine, callback, controlPointType) {
  var objectName;

  if (s3 && bucket && name) {
    (async () => {
      const tstart = performance.now();
      if (controlPointType == null) {
        console.log(`No cp ${controlPointType} files present`);
        return;
      }
      objectName = `${name}/3_Assessments/${controlPointType}`;
      const schemaFile = `${name}/5_Schemas/VisualizationPrimitives_generated.js`;
      const schemaUrl = s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: schemaFile
      });
      const request = await s3.getObject({
        Bucket: bucket,
        Key: objectName
      }, async (err, data) => {
        if (err) {
          console.log(err, err.stack);
          // have to increment progress bar since 'parseControlPoints' will not be called
          // loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100 / numberTasks))), 100);
        } else {
          const FlatbufferModule = await import(schemaUrl);
          const controlPointSphereMeshes = await parseControlPoints(data.Body, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType);
          await callback(controlPointSphereMeshes);
        }
      });
    })();
  } else {
    const filename = `../data/${controlPointType}`;
    const schemaFile = '../schemas/VisualizationPrimitives_generated.js';
    let t0, t1;

    const xhr = new XMLHttpRequest();
    xhr.open('GET', filename);
    xhr.responseType = 'arraybuffer';
    xhr.onprogress = function (event) {
      t1 = performance.now();
      t0 = t1;
    };
    xhr.onload = async function (data) {
      incrementLoadingBarTotal(`downloaded cp ${controlPointType}`);
      const FlatbufferModule = await import(schemaFile);
      const response = data.target.response;
      if (!response) {
        console.error('Could not create buffer from lane data');
        return;
      }
      const bytesArray = new Uint8Array(response);
      const controlPointSphereMeshes = await parseControlPoints(bytesArray, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType);
      await callback(controlPointSphereMeshes);
      incrementLoadingBarTotal(`loaded cp ${controlPointType}`);
    };
    t0 = performance.now();
    xhr.send();
  }
}

async function parseControlPoints (bytesArray, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType) {
  if (controlPointType === 'control_point_3_rtk_relative.fb') {
    const numBytes = bytesArray.length;
    const controlPoint = [];
    let segOffset = 0;
    while (segOffset < numBytes) {
      // Read SegmentSize:
      const viewSize = new DataView(bytesArray.buffer, segOffset, 4);
      const segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

      // Get Flatbuffer Gap Object:
      segOffset += 4;
      const buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset + segSize));
      const fbuffer = new flatbuffers.ByteBuffer(buf);
      const point = FlatbufferModule.Flatbuffer.Primitives.Sphere3D.getRootAsSphere3D(fbuffer);
      controlPoint.push(point);
      segOffset += segSize;
    }
    return await createREMControlMeshes(controlPoint, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType);
  } else {
    const dataBuffer = bytesArray.buffer;
    const dataView = new DataView(dataBuffer);
    const segmentSize = dataView.getUint32(0, true);
    const buffer = new Uint8Array(dataBuffer.slice(4, segmentSize));
    const byteBuffer = new flatbuffers.ByteBuffer(buffer);
    const spheresBuffer = FlatbufferModule.Flatbuffer.Primitives.Spheres3D.getRootAsSpheres3D(byteBuffer);

    return await createControlMeshes(spheresBuffer, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType);
  }
}

async function createControlMeshes (controlPoints, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType) {
  controlPointShaderMaterial.uniforms.color.value = getControlPointColor(controlPointType);

  const length = controlPoints.pointsLength();
  const controlPointData = new Array(length);
  const timestamps = new Float32Array(window.controlPointBudget);
  const newSchemaFlag = (length > 0) && !!controlPoints.points(0).timestamp;

  const initialPosition = controlPoints.points(0).pos();
  const offset = new THREE.Vector3(initialPosition.x(), initialPosition.y(), initialPosition.z());

  const sphereGeo = new THREE.InstancedBufferGeometry().copy(new THREE.SphereBufferGeometry(0.25));
  const mesh = new THREE.InstancedMesh(sphereGeo, controlPointShaderMaterial, window.controlPointBudget);
  mesh.name = "ControlPoint"
  mesh.frustumCulled = false;

  for (let ii = 0; ii < length; ii++) {
    const point = controlPoints.points(ii);
    const position = { x: point.pos().x() - offset.x, y: point.pos().y() - offset.y, z: point.pos().z() - offset.z };
    const timestamp = newSchemaFlag ? (point.timestamp() - animationEngine.tstart) :
      point.viz(new FlatbufferModule.Flatbuffer.Primitives.HideAndShowAnimation())
        .timestamp(new FlatbufferModule.Flatbuffer.Primitives.ObjectTimestamp())
        .value() - animationEngine.tstart;

    controlPointData[ii] = { position, timestamp };

    if (ii < window.radarVisualizationBudget) {
      timestamps[ii] = timestamp;

      const transform = new THREE.Object3D();
      transform.position.set(position.x, position.y, position.z);
      mesh.setMatrixAt(ii, transform.matrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('gpsTime', new THREE.InstancedBufferAttribute(timestamps, 1));

  return {mesh, offset, controlPointData};
}

async function createREMControlMeshes (controlPoints, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType) {
  const length = controlPoints.length;
  const controlPointData = new Array(length);
  const timestamps = new Float32Array(window.controlPointBudget);
  const newSchemaFlag = (length > 0) && !!controlPoints[0].timestamp;

  const initialPosition = controlPoints[0].pos();
  const offset = new THREE.Vector3(initialPosition.x(), initialPosition.y(), initialPosition.z());

  const sphereGeo = new THREE.InstancedBufferGeometry().copy(new THREE.SphereBufferGeometry(0.25));
  const mesh = new THREE.InstancedMesh(sphereGeo, controlPointShaderMaterial, window.controlPointBudget);
  mesh.name = "ControlPoint"
  mesh.frustumCulled = false;

  for (let ii = 0; ii < length; ii++) {
    if (ii % 1000 === 0) {
      await updateLoadingBar(ii / length * 100); // update individual task progress
    }
    const point = controlPoints[ii];

    const position = { x: point.pos().x() - offset.x, y: point.pos().y() - offset.y, z: point.pos().z() - offset.z };
    const timestamp = newSchemaFlag ? (point.timestamp() - animationEngine.tstart) :
      point.viz(new FlatbufferModule.Flatbuffer.Primitives.HideAndShowAnimation())
        .timestamp(new FlatbufferModule.Flatbuffer.Primitives.ObjectTimestamp())
        .value() - animationEngine.tstart;

    controlPointData[ii] = { position, timestamp };

    if (ii < window.radarVisualizationBudget) {
      timestamps[ii] = timestamp;

      const transform = new THREE.Object3D();
      transform.position.set(position.x, position.y, position.z);
      mesh.setMatrixAt(ii, transform.matrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('gpsTime', new THREE.InstancedBufferAttribute(timestamps, 1));

  return {mesh, offset, controlPointData};
}

function getControlPointColor (controlPointType) {
  const lowerCaseControlPoint = controlPointType.toLowerCase();
  if (lowerCaseControlPoint.includes("control_point_3_rtk_relative.fb")) {
    return new THREE.Color(0x00ffff);
  } else if (lowerCaseControlPoint.includes("left")) {
    return new THREE.Color(0xffff00);
  } else if (lowerCaseControlPoint.includes("right")) {
    return new THREE.Color(0x0000ff);
  } else if (lowerCaseControlPoint.includes("spp")) {
    return new THREE.Color(0xff66ff);
  }
  return new THREE.Color(0x0000ff);
}

const controlPointNamesTable = {
  'control_point_3_rtk_relative.fb': 'REM Control Points',
  'viz_Spheres3D_LaneSense_cp1_0.7s_left.fb': '0.7s Left Control Points',
  'viz_Spheres3D_LaneSense_cp2_1.0s_left.fb': '1.0s Left Control Points',
  'viz_Spheres3D_LaneSense_cp3_1.3s_left.fb': '1.3s Left Control Points',
  'viz_Spheres3D_LaneSense_cp4_2.0s_left.fb': '2.0s Left Control Points',
  'viz_Spheres3D_LaneSense_cp1_0.7s_right.fb': '0.7s Right Control Points',
  'viz_Spheres3D_LaneSense_cp2_1.0s_right.fb': '1.0s Right Control Points',
  'viz_Spheres3D_LaneSense_cp3_1.3s_right.fb': '1.3s Right Control Points',
  'viz_Spheres3D_LaneSense_cp4_2.0s_right.fb': '2.0s Right Control Points'
};

function getControlPointName (controlPointType) {
  // Handle backwards compatibility
  if (controlPointType.includes('LaneSense_cp') || controlPointType.includes("rtk_relative")) {
    return controlPointNamesTable[controlPointType];
  }
  // slice off file extension
  let words = controlPointType.slice(0, -3);
  // remove 'viz_Spheres3D_' prefix
  words = words.substring(13);
  // split on '_', join into display name
  words = words.split("_");
  words = words.join(" ");
  return words;
}
