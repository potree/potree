'use strict';
import { incrementLoadingBarTotal, resetProgressBars, updateLoadingBar } from "../common/overlay.js";
import { s3, bucket, name, getShaderMaterial } from "../demo/paramLoader.js"
import { getFbFileInfo } from "./loaderUtilities.js";


let radarDetectionFiles = null;
export const radarDetectionDownloads = async (datasetFiles) => {
  radarDetectionFiles = await getFbFileInfo(datasetFiles,
                                       "detections.fb", // 2_Truth
                                       "GroundTruth_generated.js", // 5_Schemas
                                       "../data/detections.fb",
                                       "../schemas/GroundTruth_generated.js");
  return radarDetectionFiles;
}

async function loadDetections(s3, bucket, name, file, shaderMaterial, animationEngine) {

  if (!radarDetectionFiles) {
    console.log("No detection files present")
    return null
  } else {
    // prepare for progress tracking (currently only triggered on button click)
    resetProgressBars(2); // have to download & process/load detections
  }

  if (file) { radarDetectionFiles.objectName = `${name}/2_Truth/${file}`; }

  if (s3 && bucket && name) {
    const request = s3.getObject({
      Bucket: bucket,
      Key: radarDetectionFiles.objectName
    });
    request.on("httpDownloadProgress", async (e) => {
      await updateLoadingBar(e.loaded / e.total * 100);
    });
    const data = await request.promise();
    incrementLoadingBarTotal("detections downloaded");
    const schemaUrl = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: radarDetectionFiles.schemaFile
    });
    const FlatbufferModule = await import(schemaUrl);
    const detectionGeometries = await parseDetections(data.Body, shaderMaterial, FlatbufferModule, animationEngine);
    incrementLoadingBarTotal("detections loaded");
    return detectionGeometries;
  } else {
    const response = await fetch(radarDetectionFiles.objectName);
    incrementLoadingBarTotal("detections downloaded");
    const FlatbufferModule = await import(radarDetectionFiles.schemaFile);
    const detectionGeometries = await parseDetections(await response.arrayBuffer(), shaderMaterial, FlatbufferModule, animationEngine);
    incrementLoadingBarTotal("detections loaded");
    return detectionGeometries;
  }
}

async function parseDetections(bytesArray, shaderMaterial, FlatbufferModule, animationEngine) {

  const numBytes = bytesArray.length;
  const detections = [];

  let segOffset = 0;
  let segSize, viewSize;
  while (segOffset < numBytes) {

    // Read SegmentSize:
    viewSize = new DataView(bytesArray.buffer, segOffset, 4);
    segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

    // Get Flatbuffer Detection Object:
    segOffset += 4;
    const buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
    const fbuffer = new flatbuffers.ByteBuffer(buf);
    const detection = FlatbufferModule.Flatbuffer.GroundTruth.Detections.getRootAsDetections(fbuffer);

    detections.push(detection);
    segOffset += segSize;
  }

  return await createDetectionGeometries(shaderMaterial, detections, animationEngine);
}

async function createDetectionGeometries(shaderMaterial, detections, animationEngine) {
  const material = shaderMaterial;

  let detect, firstCentroid, delta, boxGeometry2;
  const bboxs = [];
  const x0 = [];
  const y0 = [];
  const z0 = [];
  let detectTimes = [];

  let allBoxes = new THREE.Geometry();

  for (let ss=0, numDetections=detections.length; ss<numDetections; ss++) {
    await updateLoadingBar(ss/numDetections*100)
    const detection = detections[ss];

    for (let ii=0, len=detection.detectionsLength(); ii<len; ii++) {

      // Assign Current Detection:
      detect = detection.detections(ii);

      // Initializations:
      const centroidLocation = new THREE.Vector3( detect.centroid().x(), detect.centroid().y(), detect.centroid().z() );
      if (firstCentroid == undefined) {
        firstCentroid = centroidLocation;
      }

      delta = centroidLocation.clone().sub(firstCentroid);

      const length = detect.majorAxis();
      const width = detect.minorAxis();
      const height = detect.height();

      const boxGeometry = new THREE.BoxGeometry(length, width, height);
      boxGeometry2 = boxGeometry.clone();

      var edges = new THREE.EdgesGeometry( boxGeometry ); // or WireframeGeometry( geometry )
      var wireframe = new THREE.LineSegments( edges, material.clone() ); // TODO don't clone material to assign to multiple meshes
      var boxMesh = wireframe;

      boxMesh.position.copy(centroidLocation);

      // Rotate BoxGeometry:
      const yaw = detect.heading();
      const zAxis = new THREE.Vector3(0, 0, 1); // TODO Hack until fb data gets fixed
      // let zAxis = p4.sub(p0);
      // zAxis.normalize();
      boxMesh.rotateOnAxis(zAxis, yaw);

      // debugger; // lhw yaw/rotation
      detectTimes.push(detect.timestamp()-animationEngine.tstart);


      const se3 = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion().setFromAxisAngle(zAxis,yaw);
      se3.makeRotationFromQuaternion(quaternion); // Rotation
      se3.setPosition(delta); // Translation
      // debugger; // se3

      boxGeometry2.applyMatrix( se3 );
      // TODO rotate boxGeometry.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
      allBoxes.merge(boxGeometry2);

      if ((ss%1000)==0 || ss==(numDetections-1)) {
        const bufferBoxGeometry = new THREE.BufferGeometry().fromGeometry(allBoxes);
        const edges = new THREE.EdgesGeometry( bufferBoxGeometry ); // or WireframeGeometry( geometry )
        const timestamps = [];
        for (let tt=0, numTimes=detectTimes.length; tt<numTimes; tt++) {
          for (let kk=0, numVerticesPerBox=24; kk<numVerticesPerBox; kk++) {  // NOTE: 24 vertices per edgesBox
            timestamps.push(detectTimes[tt]);
          }
        }
        edges.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestamps, 1));

        // let bufferBoxGeometry = allBoxes;
        const wireframe = new THREE.LineSegments( edges, material ); // NOTE don't clone material to assign to multiple meshes
        const mesh = wireframe;
        mesh.position.copy(firstCentroid);
        bboxs.push( mesh );
        allBoxes = new THREE.Geometry();
        firstCentroid = centroidLocation.clone();
        detectTimes = [];
      }
    }
  }
  const output = {
    bbox: bboxs,
    x0: x0,
    y0: y0,
    z0: z0
  };
  return output;
}

export async function loadRadarDetectionsCallback(files) {
  for (let file of files) {
    // Remove prefix filepath
    file = file.split(/.*[\/|\\]/)[1];
    if (file.includes('srr_detections.fb') || file.includes('mrr_detections.fb')) {
      await loadRadarDetectionsCallbackHelper(file);
    }
  }
}

async function loadRadarDetectionsCallbackHelper(file) {
  const shaderMaterial = getShaderMaterial();
  const detectionShaderMaterial = shaderMaterial.clone();
  detectionShaderMaterial.uniforms.color.value = getRadarDetectionColor(file);
  const detectionGeometries = await loadDetections(s3, bucket, name, file, detectionShaderMaterial, animationEngine);

  if (detectionGeometries != null) {
    const detectionLayer = new THREE.Group();
    detectionLayer.name = getRadarDetectionName(file);
    for (let ii = 0, len = detectionGeometries.bbox.length; ii < len; ii++) {
      detectionLayer.add(detectionGeometries.bbox[ii]);
    }
    viewer.scene.scene.add(detectionLayer);
    viewer.scene.dispatchEvent({
      type: "truth_layer_added",
      truthLayer: detectionLayer
    });
    animationEngine.tweenTargets.push((gpsTime) => {
      const currentTime = gpsTime - animationEngine.tstart;
      detectionShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
      detectionShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;
    });
  }
}

function getRadarDetectionName(file) {
  // slice off file extension
  let words = file.slice(0, -3);
  // split on '_', join into display name
  words = words.split("_");
  return words.join(" ");
}

function getRadarDetectionColor(file) {
  if (file.toLowerCase().includes("mrr_detections.fb")) {
    return new THREE.Color(0x00FFFF)
  } else if (file.includes("srr_detections.fb")) {
    return new THREE.Color(0x0000FF)
  } else {
    return new THREE.Color(0xFFFF00)
  }
}
