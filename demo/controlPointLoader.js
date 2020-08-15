'use strict';
import { getShaderMaterial } from '../demo/paramLoader.js';
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
      if (file.includes('rtk_relative') || file.includes('viz_Spheres3D_')) {
        await loadControlPointsCallbackHelper(s3, bucket, name, animationEngine, file);
      }
    }
  }
}

async function loadControlPointsCallbackHelper (s3, bucket, name, animationEngine, controlPointType) {
  const shaderMaterial = getShaderMaterial();
  const controlPointShaderMaterial = shaderMaterial.clone();
  await loadControlPoints(s3, bucket, name, controlPointShaderMaterial, animationEngine, (sphereMeshes) => {
    const controlPointLayer = new THREE.Group();
    controlPointLayer.name = getControlPointName(controlPointType);
    sphereMeshes.forEach(mesh => controlPointLayer.add(mesh));

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
    return await createControlMeshes(controlPoint, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType);
  } else {
    const dataBuffer = bytesArray.buffer;
    const dataView = new DataView(dataBuffer);
    const segmentSize = dataView.getUint32(0, true);
    const buffer = new Uint8Array(dataBuffer.slice(4, segmentSize));
    const byteBuffer = new flatbuffers.ByteBuffer(buffer);
    const spheresBuffer = FlatbufferModule.Flatbuffer.Primitives.Spheres3D.getRootAsSpheres3D(byteBuffer);
    const spheresArray = [];
    const length = spheresBuffer.pointsLength();
    for (let ii = 0; ii < length; ii++) {
      spheresArray.push(spheresBuffer.points(ii));
    }
    return await createControlMeshes(spheresArray, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType);
  }
}

async function createControlMeshes (controlPoints, controlPointShaderMaterial, FlatbufferModule, animationEngine, controlPointType) {
  const allSpheres = [];
  const length = controlPoints.length;
  for (let ii = 0; ii < length; ii++) {
    if (ii % 1000 === 0) {
      await updateLoadingBar(ii / length * 100); // update individual task progress
    }
    const point = controlPoints[ii];

    const vertex = { x: point.pos().x(), y: point.pos().y(), z: point.pos().z() };
    const radius = 0.25;// point.radius();
    const timestamp = point.viz(new FlatbufferModule.Flatbuffer.Primitives.HideAndShowAnimation())
      .timestamp(new FlatbufferModule.Flatbuffer.Primitives.ObjectTimestamp())
      .value() - animationEngine.tstart;
    const timestampArray = new Float64Array(64).fill(timestamp)
    const sphereGeo = new THREE.SphereBufferGeometry(radius);

    controlPointShaderMaterial.uniforms.color.value = getControlPointColor(controlPointType);
    const sphereMesh = new THREE.Mesh(sphereGeo, controlPointShaderMaterial);
    sphereMesh.position.set(vertex.x, vertex.y, vertex.z);
    sphereMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestampArray, 1));
    allSpheres.push(sphereMesh);
  }
  return allSpheres;
}

function getControlPointColor (controlPointType) {
  if (controlPointType.includes("rtk")) {
    return new THREE.Color(0x00ffff);
  } else if (controlPointType.includes("left")) {
    return new THREE.Color(0xffff00);
  } else if (controlPointType.includes("right")) {
    return new THREE.Color(0x0000ff);
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
  'viz_Spheres3D_LaneSense_cp4_2.0s_right.fb': '2.0s Right Control Points',
  'viz_Spheres3D_SPP_cp1_5.0m_spp.fb': '5m SPP Control Points',
  'viz_Spheres3D_SPP_cp2_10.0m_spp.fb': '10m SPP Control Points',
  'viz_Spheres3D_SPP_cp3_15.0m_spp.fb': '15m SPP Control Points',
  'viz_Spheres3D_SPP_cp4_20.0m_spp.fb': '20m SPP Control Points',
  'viz_Spheres3D_SPP_cp5_25.0m_spp.fb': '25m SPP Control Points',
  'viz_Spheres3D_SPP_cp6_30.0m_spp.fb': '30m SPP Control Points',
  'viz_Spheres3D_SPP_cp7_35.0m_spp.fb': '35m SPP Control Points',
  'viz_Spheres3D_SPP_cp8_40.0m_spp.fb': '40m SPP Control Points',
  'viz_Spheres3D_SPP_cp9_45.0m_spp.fb': '45m SPP Control Points',
  'viz_Spheres3D_SPP_cp10_50.0m_spp.fb': '50m SPP Control Points'
};

function getControlPointName (controlPointType) {
  if (controlPointType.includes('viz_Spheres3D_')) {
    return controlPointNamesTable[controlPointType];
  } else if (controlPointType.includes("rtk_relative")) {
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
