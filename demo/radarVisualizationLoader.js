'use strict';
import { incrementLoadingBarTotal, resetProgressBars, updateLoadingBar } from "../common/overlay.js";
import { getS3, getAWSObjectVariables, getInstancedShaderMaterial } from "../demo/paramLoader.js"
import { getFbFileInfo } from "./loaderUtilities.js";

let radarVisualizationFiles = null;
export const radarVisualizationDownloads = async (datasetFiles) => {
  radarVisualizationFiles = await getFbFileInfo(datasetFiles,
                                       "visualization.fb",
                                       "2_Truth",
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

function indexOfClosestTimestamp(radarData, timestamp) {
  if (timestamp <= radarData[0].timestamp) {
    return 0;
  }

  if (timestamp >= radarData[radarData.length - 1].timestamp) {
    return radarData.length - 1;
  }

  let start = 0;
  let end = radarData.length;
  let mid = 0;

  while (start < end) {
    mid = Math.floor((start + end) / 2);

    if (radarData[mid].timestamp === timestamp) {
      return mid;
    }
    else if (timestamp < radarData[mid].timestamp) {
      if (mid > 0 && timestamp > radarData[mid - 1].timestamp) {
        return Math.abs(timestamp - radarData[mid].timestamp) < Math.abs(timestamp - radarData[mid - 1].timestamp) ? mid : mid - 1;
      }

      end = mid;
    }
    else {
      if (mid < radarData.length - 1 && timestamp < radarData[mid + 1].timestamp) {
        return Math.abs(timestamp - radarData[mid].timestamp) < Math.abs(timestamp - radarData[mid + 1].timestamp) ? mid : mid + 1;
      }

      start = mid + 1;
    }
  }

  return mid;
}

window.radarVisualizationBudget = 1000;
async function loadRadarVisualizationCallbackHelper (radarVisualizationType) {
  const shaderMaterial = getInstancedShaderMaterial();
  const radarVisualizationShaderMaterial = shaderMaterial.clone();
  await loadRadarVisualization(radarVisualizationShaderMaterial, animationEngine, (meshData) => {
    let {mesh, offset, radarData} = meshData;

    const radarVisualizationLayer = new THREE.Group();
    radarVisualizationLayer.name = getRadarVisualizationName(radarVisualizationType);
    mesh.position.copy(offset);
    radarVisualizationLayer.add(mesh);

    const radarDataTimestamps = radarData.map((data, i) => ({
      timestamp: data.timestamp,
      index: i
    })).sort((a, b) => a.timestamp - b.timestamp);

    viewer.scene.scene.add(radarVisualizationLayer);
    const e = new CustomEvent('truth_layer_added', {detail: radarVisualizationLayer, writable: true});
    viewer.scene.dispatchEvent({
      type: 'sensor_layer_added',
      sensorLayer: radarVisualizationLayer
    });
    // TODO check if group works as expected, then trigger "truth_layer_added" event
    animationEngine.tweenTargets.push((gpsTime) => {
      const currentTime = gpsTime - animationEngine.tstart;
      radarVisualizationShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
      radarVisualizationShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;

      if (mesh.count !== window.radarVisualizationBudget) {
        radarVisualizationLayer.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();

        const sphereGeo = new THREE.InstancedBufferGeometry().copy(new THREE.SphereBufferGeometry(0.15));
        mesh = new THREE.InstancedMesh(sphereGeo, radarVisualizationShaderMaterial, window.radarVisualizationBudget);
        mesh.name = "RadarVisualization"
        mesh.frustumCulled = false;
        mesh.position.copy(offset);

        radarVisualizationLayer.add(mesh);
      }

      const currentIndex = indexOfClosestTimestamp(radarDataTimestamps, currentTime);
      const minIndex = Math.max(0, currentIndex - window.radarVisualizationBudget / 2);
      const maxIndex = Math.min(radarDataTimestamps.length, currentIndex + Math.ceil(window.radarVisualizationBudget / 2));
      const currentData = radarDataTimestamps.slice(minIndex, maxIndex);

      const timestamps = new Float32Array(window.radarVisualizationBudget).fill(undefined);
      for (let i = 0; i < currentData.length; i++) {
        timestamps[i] = currentData[i].timestamp;

        const currentPosition = radarData[currentData[i].index].position;
        const newTransform = new THREE.Matrix4();
        newTransform.setPosition(currentPosition.x, currentPosition.y, currentPosition.z);

        mesh.setMatrixAt(i, newTransform);
      }

      mesh.geometry.setAttribute('gpsTime', new THREE.InstancedBufferAttribute(timestamps, 1));
      mesh.instanceMatrix.needsUpdate = true;
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
  const radarData = new Array(length);
  const timestamps = new Float32Array(window.radarVisualizationBudget);
  const newSchemaFlag = (length > 0) && !!radarVisualizationData.points(0).timestamp;

  const initialPosition = radarVisualizationData.points(0).pos();
  const offset = new THREE.Vector3(initialPosition.x(), initialPosition.y(), initialPosition.z());

  const sphereGeo = new THREE.InstancedBufferGeometry().copy(new THREE.SphereBufferGeometry(0.15));
  const mesh = new THREE.InstancedMesh(sphereGeo, radarVisualizationShaderMaterial, window.radarVisualizationBudget);
  mesh.name = "RadarVisualization"
  mesh.frustumCulled = false;

  for (let ii = 0; ii < length; ii++) {
    const point = radarVisualizationData.points(ii);
    const position = { x: point.pos().x() - offset.x, y: point.pos().y() - offset.y, z: point.pos().z() - offset.z };
    const timestamp = newSchemaFlag ? (point.timestamp() - animationEngine.tstart) :
      point.viz(new FlatbufferModule.Flatbuffer.Primitives.HideAndShowAnimation())
        .timestamp(new FlatbufferModule.Flatbuffer.Primitives.ObjectTimestamp())
        .value() - animationEngine.tstart;

        radarData[ii] = { position, timestamp };

    if (ii < window.radarVisualizationBudget) {
      timestamps[ii] = timestamp;

      const transform = new THREE.Object3D();
      transform.position.set(position.x, position.y, position.z);
      mesh.setMatrixAt(ii, transform.matrix);
    }
  }

  mesh.instanceMatrix.needsUpdate = true;
  mesh.geometry.setAttribute('gpsTime', new THREE.InstancedBufferAttribute(timestamps, 1));

  return {mesh, offset, radarData};
}

function getRadarVisualizationName(file) {
  return (file in radarVisualizationNameTable) ? radarVisualizationNameTable[file] : "Unknown Radar Data";
}

function getRadarVisualizationColor (file) {
  return (file in radarVisualizationColorTable) ? radarVisualizationColorTable[file] : new THREE.Color(0xFFFF00);
}

const radarVisualizationColorTable = {
  'mrr_detects_visualization.fb': new THREE.Color(0x689F38), // LG
  'mrr_tracks_visualization.fb': new THREE.Color(0x006400), // G
  'srr_fr_detects_visualization.fb': new THREE.Color(0x0099FF), // LB
  'srr_fl_detects_visualization.fb': new THREE.Color(0xDCB3FF), // LP
  'srr_br_detects_visualization.fb': new THREE.Color(0xFFF7B2), // LY
  'srr_bl_detects_visualization.fb': new THREE.Color(0xFF9A00), // LO
  'srr_fr_tracks_visualization.fb': new THREE.Color(0x0000FF), // B
  'srr_fl_tracks_visualization.fb': new THREE.Color(0xB967FF), // P
  'srr_br_tracks_visualization.fb': new THREE.Color(0xFFE700), // Y
  'srr_bl_tracks_visualization.fb': new THREE.Color(0xFF7400), // O
  'object_fusion_tracks_visualization.fb': new THREE.Color(0x00FFFF)
};

const radarVisualizationNameTable = {
  'mrr_detects_visualization.fb': 'MRR Detects',
  'mrr_tracks_visualization.fb': 'MRR Tracks',
  'srr_fr_detects_visualization.fb': 'SRR FR Detects',
  'srr_fl_detects_visualization.fb': 'SRR FL Detects',
  'srr_br_detects_visualization.fb': 'SRR BR Detects',
  'srr_bl_detects_visualization.fb': 'SRR BL Detects',
  'srr_fr_tracks_visualization.fb': 'SRR FR Tracks',
  'srr_fl_tracks_visualization.fb': 'SRR FL Tracks',
  'srr_br_tracks_visualization.fb': 'SRR BR Tracks',
  'srr_bl_tracks_visualization.fb': 'SRR BL Tracks',
  'object_fusion_tracks_visualization.fb': 'Object Fusion Tracks',
  // Assessment Visualizations
  'mrr_detects_assessments_visualization.fb': 'Assessed MRR Detects',
  'mrr_tracks_assessments_visualization.fb': 'Assessed MRR Tracks',
  'srr_fr_detects_assessments_visualization.fb': 'Assessed SRR FR Detects',
  'srr_fl_detects_assessments_visualization.fb': 'Assessed SRR FL Detects',
  'srr_br_detects_assessments_visualization.fb': 'Assessed SRR BR Detects',
  'srr_bl_detects_assessments_visualization.fb': 'Assessed SRR BL Detects',
  'srr_fr_tracks_assessments_visualization.fb': 'Assessed SRR FR Tracks',
  'srr_fl_tracks_assessments_visualization.fb': 'Assessed SRR FL Tracks',
  'srr_br_tracks_assessments_visualization.fb': 'Assessed SRR BR Tracks',
  'srr_bl_tracks_assessments_visualization.fb': 'Assessed SRR BL Tracks',
  'object_fusion_tracks_assessments_visualization.fb': 'Assessed Object Fusion Tracks'
};
