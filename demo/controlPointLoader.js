'use strict';
import { getShaderMaterial } from '../demo/paramLoader.js';
import { getLoadingBar, getLoadingBarTotal, numberTasks, removeLoadingScreen, pause } from '../common/overlay.js';
export async function loadControlPoints (s3, bucket, name, controlPointShaderMaterial, animationEngine, callback, controlPointType) {
  const tstart = performance.now();
  const loadingBar = getLoadingBar();
  const loadingBarTotal = getLoadingBarTotal();
  let lastLoaded = 0;
  var objectName;

  if (s3 && bucket && name) {
    (async () => {
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
          loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100 / numberTasks))), 100);
        } else {
          const FlatbufferModule = await import(schemaUrl);
          const controlPointSphereMeshes = await parseControlPoints(data.Body, controlPointShaderMaterial, FlatbufferModule, animationEngine);
          await callback(controlPointSphereMeshes);
        }
        if (loadingBarTotal.value === 100) {
          removeLoadingScreen();
        }
      });

      request.on('httpDownloadProgress', async (e) => {
        let val = e.loaded / e.total * 100;
        val = Math.max(lastLoaded, val);
        loadingBar.set(Math.max(val, loadingBar.value));
        lastLoaded = val;
        await pause();
      });
      request.on('complete', async () => {
        loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100 / numberTasks))), 100);
        loadingBar.set(0);
        if (loadingBarTotal.value >= 100) {
          removeLoadingScreen();
        }
        await pause();
      });
    })();
  } else {
    // TODO change for CP
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
      const FlatbufferModule = await import(schemaFile);

      const response = data.target.response;
      if (!response) {
        console.error('Could not create buffer from lane data');
        return;
      }

      const bytesArray = new Uint8Array(response);
      const controlPointSphereMeshes = await parseControlPoints(bytesArray, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType);
      await callback(controlPointSphereMeshes);
    };

    t0 = performance.now();
    xhr.send();
  }
}

// parse control points from flatbuffers
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
    return await createControlMeshes(controlPoint, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType);
  } else {
    const dataBuffer = bytesArray.buffer;
    const dataView = new DataView(dataBuffer);

    const segmentSize = dataView.getUint32(0, true);

    const buffer = new Uint8Array(dataBuffer.slice(4, segmentSize));
    const byteBuffer = new flatbuffers.flatbuffers.ByteBuffer(buffer);
    const spheres = FlatbufferModule.Flatbuffer.VisualizationPrimitives.Spheres3D.getRootAsSpheres3D(byteBuffer);
    console.log(spheres.points(10).pos().x());
    return await createControlMeshes(spheres.points, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType);
  }
}


async function createControlMeshes (controlPoint, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType) {
  const loadingBar = getLoadingBar();
  const loadingBarTotal = getLoadingBarTotal();

  const allSpheres = [];
  for (let ii = 0, len = controlPoint.length; ii < len; ii++) {
    if (ii % 1000 === 0) {
      loadingBar.set(Math.max(ii / len * 100, loadingBar.value)); // update individual task progress
      await pause();
    }
    const point = controlPoint[ii];

    const vertex = { x: point.pos().x(), y: point.pos().y(), z: point.pos().z() };
    const radius = 0.25; // point.radius();
    const timestamp = point.viz(new FlatbufferModule.Flatbuffer.Primitives.HideAndShowAnimation())
      .timestamp(new FlatbufferModule.Flatbuffer.Primitives.ObjectTimestamp())
      .value() - animationEngine.tstart;
    const timestampArray = new Float64Array(64).fill(timestamp);

    const sphereGeo = new THREE.SphereBufferGeometry(radius);

    controlPointShaderMaterial.uniforms.color.value = colorPicker(controlPointType);

    const sphereMesh = new THREE.Mesh(sphereGeo, controlPointShaderMaterial);
    sphereMesh.position.set(vertex.x, vertex.y, vertex.z);
    sphereMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestampArray, 1));
    allSpheres.push(sphereMesh);
  }

  // update total progress
  loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100 / numberTasks))), 100);
  loadingBar.set(0);
  if (loadingBarTotal.value >= 100) {
    removeLoadingScreen();
  }
  await pause();
  return allSpheres;
}

function colorPicker (controlPointType) {
  if (controlPointType === 'control_point_3_rtk_relative.fb') {
    return new THREE.Color(0x00ffff);
  } else if (controlPointType === 'viz_Spheres3D_LaneSense_cp1_0.7s_left.fb' ||
            controlPointType === 'viz_Spheres3D_LaneSense_cp2_1.0s_left.fb' ||
            controlPointType === 'viz_Spheres3D_LaneSense_cp3_1.3s_left.fb' ||
            controlPointType === 'viz_Spheres3D_LaneSense_cp4_2.0s_left.fb') {
    return new THREE.Color(0xffff00);
  } else if (controlPointType === 'viz_Spheres3D_LaneSense_cp1_0.7s_right.fb' ||
            controlPointType === 'viz_Spheres3D_LaneSense_cp2_1.0s_right.fb' ||
            controlPointType === 'viz_Spheres3D_LaneSense_cp3_1.3s_right.fb' ||
            controlPointType === 'viz_Spheres3D_LaneSense_cp4_2.0s_right.fb') {
    return new THREE.Color(0x0000ff);
  } else {
    console.log(`ERROR: unknown controlPointType ${controlPointType}`);
    return new THREE.Color(0xff0000);
  }
}

// load control points
export async function loadControlPointsCallback (s3, bucket, name, animationEngine, controlPointType) {
  const shaderMaterial = getShaderMaterial();
  const controlPointShaderMaterial = shaderMaterial.clone();
  await loadControlPoints(s3, bucket, name, controlPointShaderMaterial, animationEngine, (sphereMeshes) => {
    const controlPointLayer = new THREE.Group();
    controlPointLayer.name = controlPointType;
    sphereMeshes.forEach(mesh => controlPointLayer.add(mesh));

    viewer.scene.scene.add(controlPointLayer);
    const e = new CustomEvent('truth_layer_added', { detail: controlPointLayer, writable: true });
    viewer.scene.dispatchEvent({
      type: 'sensor_layer_added',
      sensorLayer: controlPointLayer
    });

    // TODO check if group works as expected, then trigger 'truth_layer_added' event
    animationEngine.tweenTargets.push((gpsTime) => {
      const currentTime = gpsTime - animationEngine.tstart;
      controlPointShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
      controlPointShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;
    });
  }, controlPointType);
}
