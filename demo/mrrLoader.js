'use strict';
import { getShaderMaterial } from '../demo/paramLoader.js';
import { updateLoadingBar, incrementLoadingBarTotal } from '../common/overlay.js';

// load mid-range radar tracks
export async function loadMRRCallback (s3, bucket, name, animationEngine, files) {
  if (files) {
    for (let file of files) {
      // Remove prefix filepath
      file = file.split(/.*[\/|\\]/)[1];
      if (file.endsWith("radar.fb")) {
        await loadMRRCallbackHelper(s3, bucket, name, animationEngine, file);
      }
    }
  }
}

window.mrrBudget = 100;
async function loadMRRCallbackHelper (s3, bucket, name, animationEngine, mrrType) {
  const shaderMaterial = getShaderMaterial();
  const mrrShaderMaterial = shaderMaterial.clone();
  await loadMRR(s3, bucket, name, mrrShaderMaterial, animationEngine, (mrrMeshes) => {
    const mrrLayer = new THREE.Group();
    mrrLayer.name = getMRRName(mrrType);
    mrrLayer.add(...mrrMeshes.filter((mesh, i) => i < window.mrrBudget));

    const mrrMeshTimestamps = mrrMeshes.map((mesh, i) => ({
      minGpsTime: Math.min(...mesh.geometry.attributes.gpsTime.array),
      maxGpsTime: Math.max(...mesh.geometry.attributes.gpsTime.array),
      index: i
    }));

    viewer.scene.scene.add(mrrLayer);
    const e = new CustomEvent('truth_layer_added', {detail: mrrLayer, writable: true});
    viewer.scene.dispatchEvent({
      type: 'sensor_layer_added',
      sensorLayer: mrrLayer
    });
    // TODO check if group works as expected, then trigger "truth_layer_added" event
    animationEngine.tweenTargets.push((gpsTime) => {
      const currentTime = gpsTime - animationEngine.tstart;
      const minActiveWindow = currentTime + animationEngine.activeWindow.backward;
      const maxActiveWindow = currentTime + animationEngine.activeWindow.forward;

      if (mrrLayer.children.length !== window.mrrBudget) {
        mrrLayer.remove(...mrrLayer.children);
        mrrLayer.add(...mrrMeshes.filter((mesh, i) => i < window.mrrBudget));
      }

      mrrShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
      mrrShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;

      const currentMeshes = mrrMeshTimestamps
        .filter(({minGpsTime, maxGpsTime}) => minGpsTime >= minActiveWindow && maxGpsTime <= maxActiveWindow)
        .sort((a, b) => Math.abs(currentTime - a.minGpsTime) - Math.abs(currentTime - b.minGpsTime))
        .slice(0, window.mrrBudget);

      for (let i = 0; i < currentMeshes.length; i++) {
        mrrLayer.children[i] = mrrMeshes[currentMeshes[i].index];
      }
    });
  }, mrrType);
}

export async function loadMRR (s3, bucket, name, mrrShaderMaterial, animationEngine, callback, mrrType) {
  var objectName;

  if (s3 && bucket && name) {
    (async () => {
      const tstart = performance.now();
      if (mrrType == null) {
        console.log(`No MRR ${mrrType} files present`);
        return;
      }
      objectName = `${name}/3_Assessments/${mrrType}`;
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
          const mrrMeshes = await parseMRR(data.Body, mrrShaderMaterial, FlatbufferModule, animationEngine, mrrType);
          await callback(mrrMeshes);
        }
      });
    })();
  } else {
    const filename = `../data/${mrrType}`;
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
      incrementLoadingBarTotal(`downloaded cp ${mrrType}`);
      const FlatbufferModule = await import(schemaFile);
      const response = data.target.response;
      if (!response) {
        console.error('Could not create buffer from lane data');
        return;
      }
      const bytesArray = new Uint8Array(response);
      const mrrMeshes = await parseMRR(bytesArray, mrrShaderMaterial, FlatbufferModule, animationEngine, mrrType);
      await callback(mrrMeshes);
      incrementLoadingBarTotal(`loaded cp ${mrrType}`);
    };
    t0 = performance.now();
    xhr.send();
  }
}

async function parseMRR (bytesArray, mrrShaderMaterial, FlatbufferModule, animationEngine, mrrType) {
  const dataBuffer = bytesArray.buffer;
  const dataView = new DataView(dataBuffer);
  const segmentSize = dataView.getUint32(0, true);
  const buffer = new Uint8Array(dataBuffer.slice(4, segmentSize));
  const byteBuffer = new flatbuffers.ByteBuffer(buffer);
  const mrrBuffer = FlatbufferModule.Flatbuffer.Primitives.Spheres3D.getRootAsSpheres3D(byteBuffer);
  const mrrArray = [];
  const length = mrrBuffer.pointsLength();
  for (let ii = 0; ii < length; ii++) {
    mrrArray.push(mrrBuffer.points(ii));
  }
  return await createControlMeshes(mrrArray, mrrShaderMaterial, FlatbufferModule, animationEngine, mrrType);
}

async function createControlMeshes (mrr, mrrShaderMaterial, FlatbufferModule, animationEngine, mrrType) {
  const allMRR = [];
  const length = mrr.length;
  for (let ii = 0; ii < length; ii++) {
    // if (ii % 1000 === 0) {
    //   await updateLoadingBar(ii / length * 100); // update individual task progress
    // }
    const point = mrr[ii];
    const vertex = { x: point.pos().x(), y: point.pos().y(), z: point.pos().z() };
    const timestamp = point.viz(new FlatbufferModule.Flatbuffer.Primitives.HideAndShowAnimation())
      .timestamp(new FlatbufferModule.Flatbuffer.Primitives.ObjectTimestamp())
      .value() - animationEngine.tstart;
    const timestampArray = new Float64Array(64).fill(timestamp)
    const mrrGeo = new THREE.BoxBufferGeometry(0.3, 0.3, 0.3);

    mrrShaderMaterial.uniforms.color.value = getMRRColor(mrrType);
    const mrrMesh = new THREE.Mesh(mrrGeo, mrrShaderMaterial);
    mrrMesh.name = "MRR"
    mrrMesh.position.set(vertex.x, vertex.y, vertex.z);
    mrrMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestampArray, 1));
    allMRR.push(mrrMesh);
  }
  return allMRR;
}

function getMRRColor (mrrType) {
  return new THREE.Color(0x0000ff);
}

function getMRRName (mrrType) {
  // slice off file extension
  let words = mrrType.slice(0, -3);
  // split on '_', join into display name
  words = words.split("_");
  words = words.join(" ");
  return words;
}
