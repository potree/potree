'use strict';
import { incrementLoadingBarTotal, resetProgressBars, updateLoadingBar } from "../common/overlay.js";
import { getS3, getAWSObjectVariables, getShaderMaterial } from "../demo/paramLoader.js"
import { getFbFileInfo } from "./loaderUtilities.js";

let radarVisualizationFiles = null;
export const radarVisualizationDownloads = async (datasetFiles) => {
  radarVisualizationFiles = await getFbFileInfo(datasetFiles,
                                       "visualization.fb", // 2_Truth
                                       "GroundTruth_generated.js", // 5_Schemas
                                       "../data/visualization.fb",
                                       "../schemas/GroundTruth_generated.js");
  return radarVisualizationFiles;
};

export async function loadRadarVisualizationCallback(files) {
  for (let file of files) {
    // Remove prefix filepath
    file = file.split(/.*[\/|\\]/)[1].toLowerCase();
    if (file.includes('_visualization.fb')) {
      await loadRadarVisualizationCallbackHelper(file);
    }
  }
}

window.radarVisualizationBudget = 10000;
async function loadRadarVisualizationCallbackHelper (radarVisualizationType) {
  const shaderMaterial = getShaderMaterial();
  const radarVisualizationShaderMaterial = shaderMaterial.clone();
  await loadRadarVisualization(radarVisualizationShaderMaterial, animationEngine, (sphereMeshes) => {
    const radarVisualizationLayer = new THREE.Group();
    radarVisualizationLayer.name = getRadarVisualizationName(radarVisualizationType);
    radarVisualizationLayer.add(...sphereMeshes.filter((mesh, i) => i < window.radarVisualizationBudget));

    const sphereMeshTimestamps = sphereMeshes.map((mesh, i) => ({
      minGpsTime: Math.min(...mesh.geometry.attributes.gpsTime.array),
      maxGpsTime: Math.max(...mesh.geometry.attributes.gpsTime.array),
      index: i
    }));

    viewer.scene.scene.add(radarVisualizationLayer);
    const e = new CustomEvent('truth_layer_added', {detail: radarVisualizationLayer, writable: true});
    viewer.scene.dispatchEvent({
      type: 'sensor_layer_added',
      sensorLayer: radarVisualizationLayer
    });
    // TODO check if group works as expected, then trigger "truth_layer_added" event
    animationEngine.tweenTargets.push((gpsTime) => {
      const currentTime = gpsTime - animationEngine.tstart;
      const minActiveWindow = currentTime + animationEngine.activeWindow.backward;
      const maxActiveWindow = currentTime + animationEngine.activeWindow.forward;

      if (radarVisualizationLayer.children.length !== window.radarVisualizationBudget) {
        radarVisualizationLayer.remove(...radarVisualizationLayer.children);
        radarVisualizationLayer.add(...sphereMeshes.filter((mesh, i) => i < window.radarVisualizationBudget));
      }

      radarVisualizationShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
      radarVisualizationShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;

      const currentMeshes = sphereMeshTimestamps
        .filter(({minGpsTime, maxGpsTime}) => minGpsTime >= minActiveWindow && maxGpsTime <= maxActiveWindow)
        .sort((a, b) => Math.abs(currentTime - a.minGpsTime) - Math.abs(currentTime - b.minGpsTime))
        .slice(0, window.radarVisualizationBudget);

      for (let i = 0; i < currentMeshes.length; i++) {
        radarVisualizationLayer.children[i] = sphereMeshes[currentMeshes[i].index];
      }
    });
  }, radarVisualizationType);
}

async function loadRadarVisualization (radarVisualizationShaderMaterial, animationEngine, callback, radarVisualizationType) {
  var objectName;
  const s3 = getS3();
  const awsVariables = getAWSObjectVariables();
  const bucket = awsVariables.bucket;
  const name = awsVariables.name;

  if (s3 && bucket && name) {
    (async () => {
      const tstart = performance.now();
      if (radarVisualizationType == null) {
        console.log(`No radar ${radarVisualizationType} files present`);
        return;
      }
      objectName = `${name}/3_Assessments/${radarVisualizationType}`;
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
        } else {
          const FlatbufferModule = await import(schemaUrl);
          const radarVisualizationMeshes = await parseRadarVisualizationData(data.Body.buffer, radarVisualizationShaderMaterial, FlatbufferModule, animationEngine, radarVisualizationType);
          await callback(radarVisualizationMeshes);
        }
      });
    })();
  } else {
    const filename = `../data/${radarVisualizationType}`;
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
      incrementLoadingBarTotal(`downloaded radar ${radarVisualizationType}`);
      const FlatbufferModule = await import(schemaFile);
      const response = data.target.response;
      if (!response) {
        console.error('Could not create buffer from lane data');
        return;
      }
      const bytesArray = new Uint8Array(response);
      const radarVisualizationMeshes = await parseRadarVisualizationData(bytesArray.buffer, radarVisualizationShaderMaterial, FlatbufferModule, animationEngine, radarVisualizationType);
      await callback(radarVisualizationMeshes);
      incrementLoadingBarTotal(`loaded radar ${radarVisualizationType}`);
    };
    t0 = performance.now();
    xhr.send();
  }
}

async function parseRadarVisualizationData (dataBuffer, radarVisualizationShaderMaterial, FlatbufferModule, animationEngine, radarVisualizationType) {
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
  return await createRadarVisualizationMeshes(spheresArray, radarVisualizationShaderMaterial, FlatbufferModule, animationEngine, radarVisualizationType);
}

async function createRadarVisualizationMeshes (radarVisualizationData, radarVisualizationShaderMaterial, FlatbufferModule, animationEngine, radarVisualizationType) {
  const allSpheres = [];
  const length = radarVisualizationData.length;
  for (let ii = 0; ii < length; ii++) {
    if (ii % 1000 === 0) {
      await updateLoadingBar(ii / length * 100); // update individual task progress
    }
    const point = radarVisualizationData[ii];

    const vertex = { x: point.pos().x(), y: point.pos().y(), z: point.pos().z() };
    const timestamp = point.viz(new FlatbufferModule.Flatbuffer.Primitives.HideAndShowAnimation())
      .timestamp(new FlatbufferModule.Flatbuffer.Primitives.ObjectTimestamp())
      .value() - animationEngine.tstart;
    const timestampArray = new Float64Array(64).fill(timestamp)
    const sphereGeo = new THREE.SphereBufferGeometry(0.25);
    radarVisualizationShaderMaterial.uniforms.color.value = getRadarVisualizationColor(radarVisualizationType);
    const sphereMesh = new THREE.Mesh(sphereGeo, radarVisualizationShaderMaterial);
    sphereMesh.name = "RadarVisualization"
    sphereMesh.position.set(vertex.x, vertex.y, vertex.z);
    sphereMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestampArray, 1));
    allSpheres.push(sphereMesh);
  }
  return allSpheres;
}

function getRadarVisualizationName(file) {
  // slice off file extension
  let words = file.slice(0, -3);
  // split on '_', join into display name
  words = words.split("_");
  return words.join(" ");
}

function getRadarVisualizationColor(file) {
  if (file.toLowerCase().includes("mrr_detections")) {
    return new THREE.Color(0x00FFFF);
  } else if (file.includes("srr_detections")) {
    return new THREE.Color(0x0000FF);
  } else if (file.includes("mrr_tracks")) {
    return new THREE.Color(0xFFFF00);
  } else {
    return new THREE.Color(0xFFFF00);
  }
}
