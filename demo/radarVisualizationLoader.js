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

export async function loadRadarVisualizationCallback (files) {
  for (let file of files) {
    // Remove prefix filepath
    file = file.split(/.*[\/|\\]/)[1].toLowerCase();
    if (file.includes('_visualization.fb')) {
      await loadRadarVisualizationCallbackHelper(file);
    }
  }
}

window.radarVisualizationBudget = 130;
async function loadRadarVisualizationCallbackHelper (radarVisualizationType) {
  const shaderMaterial = getShaderMaterial();
  const radarVisualizationShaderMaterial = shaderMaterial.clone();
  await loadRadarVisualization(radarVisualizationShaderMaterial, animationEngine, (meshData) => {
    const {meshes, radarData} = meshData;

    const radarVisualizationLayer = new THREE.Group();
    radarVisualizationLayer.name = getRadarVisualizationName(radarVisualizationType);
    radarVisualizationLayer.add(...meshes);

    const radarDataTimestamps = radarData.map((data, i) => ({
      timestamp: data.timestamp,
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

        radarData.filter((data, i) => i < window.radarVisualizationBudget).forEach((data) => {
          const newMeshGeo = new THREE.SphereBufferGeometry(0.15);
          const newMesh = new THREE.Mesh(newMeshGeo, radarVisualizationShaderMaterial);
          newMesh.name = "RadarVisualization"
          newMesh.position.set(data.position.x, data.position.y, data.position.z);
          newMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(new Float64Array(64).fill(data.timestamp), 1));
          radarVisualizationLayer.add(newMesh);
        });
      }

      radarVisualizationShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
      radarVisualizationShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;

      const currentData = radarDataTimestamps
        .filter(({timestamp}) => timestamp >= minActiveWindow && timestamp <= maxActiveWindow)
        .sort((a, b) => Math.abs(currentTime - a.timestamp) - Math.abs(currentTime - b.timestamp))
        .slice(0, window.radarVisualizationBudget);

      for (let i = 0; i < currentData.length; i++) {
        const newMeshGeo = new THREE.SphereBufferGeometry(0.15);
        const newMesh = new THREE.Mesh(newMeshGeo, radarVisualizationShaderMaterial);
        newMesh.name = "RadarVisualization"
        newMesh.position.set(radarData[currentData[i].index].position.x, radarData[currentData[i].index].position.y, radarData[currentData[i].index].position.z);
        newMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(new Float64Array(64).fill(radarData[currentData[i].index].timestamp), 1));

        radarVisualizationLayer.children[i].geometry.dispose();
        radarVisualizationLayer.children[i].material.dispose();
        radarVisualizationLayer.children[i] = newMesh;
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
  return await createRadarVisualizationMeshes(spheresBuffer, radarVisualizationShaderMaterial, FlatbufferModule, animationEngine, radarVisualizationType);
}

async function createRadarVisualizationMeshes (radarVisualizationData, radarVisualizationShaderMaterial, FlatbufferModule, animationEngine, radarVisualizationType) {
  radarVisualizationShaderMaterial.uniforms.color.value = getRadarVisualizationColor(radarVisualizationType);

  const length = radarVisualizationData.pointsLength();
  const allSpheres = new Array(window.radarVisualizationBudget);
  const radarData = new Array(length);

  for (let ii = 0; ii < length; ii++) {
    const point = radarVisualizationData.points(ii)
    const vertex = { x: point.pos().x(), y: point.pos().y(), z: point.pos().z() };
    const timestamp = point.timestamp - animationEngine.tstart;

    const data = {
      position: vertex,
      timestamp: timestamp
    };
    radarData[ii] = data;

    if (ii < window.radarVisualizationBudget) {
      const sphereGeo = new THREE.SphereBufferGeometry(0.15);
      const sphereMesh = new THREE.Mesh(sphereGeo, radarVisualizationShaderMaterial);
      sphereMesh.name = "RadarVisualization"
      sphereMesh.position.set(vertex.x, vertex.y, vertex.z);
      sphereMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(new Float64Array(64).fill(timestamp), 1));
      allSpheres[ii] = sphereMesh;
    }
  }
  return {meshes: allSpheres, radarData: radarData};
}

function getRadarVisualizationName(file) {
  if (file in radarVisualizationNameTable) { return radarVisualizationNameTable[file]; }
  return "Unknown Radar Data"
}

function getRadarVisualizationColor (file) {
  if (file in radarVisualizationColorTable) { return radarVisualizationColorTable[file]; }
  return new THREE.Color(0xFFFF00);
}

const radarVisualizationColorTable = {
  'mrr_detects_visualization.fb': new THREE.Color(0x689F38), // LG
  'mrr_tracks_visualization.fb': new THREE.Color(0x006400), // G
  'srr_detects_fr_visualization.fb': new THREE.Color(0x0099FF), // LB
  'srr_detects_fl_visualization.fb': new THREE.Color(0xDCB3FF), // LP
  'srr_detects_br_visualization.fb': new THREE.Color(0xFFF7B2), // LY
  'srr_detects_bl_visualization.fb': new THREE.Color(0xFF9A00), // LO
  'srr_tracks_fr_visualization.fb': new THREE.Color(0x0000FF), // B
  'srr_tracks_fl_visualization.fb': new THREE.Color(0xB967FF), // P
  'srr_tracks_br_visualization.fb': new THREE.Color(0xFFE700), // Y
  'srr_tracks_bl_visualization.fb': new THREE.Color(0xFF7400), // O
  'object_fusion_tracks_visualization.fb': new THREE.Color(0x00FFFF)
};

const radarVisualizationNameTable = {
  'mrr_detects_visualization.fb': 'MRR Detects',
  'mrr_tracks_visualization.fb': 'MRR Tracks',
  'srr_detects_fr_visualization.fb': 'SRR FR Detects',
  'srr_detects_fl_visualization.fb': 'SRR FL Detects',
  'srr_detects_br_visualization.fb': 'SRR BR Detects',
  'srr_detects_bl_visualization.fb': 'SRR BL Detects',
  'srr_tracks_fr_visualization.fb': 'SRR FR Tracks',
  'srr_tracks_fl_visualization.fb': 'SRR FL Tracks',
  'srr_tracks_br_visualization.fb': 'SRR BR Tracks',
  'srr_tracks_bl_visualization.fb': 'SRR BL Tracks',
  'object_fusion_tracks_visualization.fb': 'Object Fusion Tracks'
};
