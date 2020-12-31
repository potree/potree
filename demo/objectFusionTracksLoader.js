"use strict"
import { updateLoadingBar, incrementLoadingBarTotal } from "../common/overlay.js";
import { getFbFileInfo } from "./loaderUtilities.js";


// sets local variable and returns so # files can be counted
let trackFiles = null;
export const objectFusionTracksDownloads = async (datasetFiles) => {
  trackFiles = await getFbFileInfo(datasetFiles,
                                   "object_fusion_tracks.fb",
                                   "3_Assessments",
                                   "GroundTruth_generated.js", // 5_Schemas
                                   "../data/object_fusion_tracks.fb",
                                   "../schemas/GroundTruth_generated.js");
  return trackFiles;
}

export async function loadTracks(s3, bucket, name, trackFileName, shaderMaterial, animationEngine, callback) {
  if (!trackFiles) {
    console.log("No object fusion tracks files present")
    return
  }
  if (trackFileName) {
    trackFiles.objectName = `${name}/3_Assessments/${trackFileName}`;
  }

  // if (s3 && bucket && name) {
  //   const request = s3.getObject({Bucket: bucket,
  //                                 Key: trackFiles.objectName});
  //   request.on("httpDownloadProgress", async (e) => {
  //     await updateLoadingBar(e.loaded/e.total*100)
  //   });
  //   const data = await request.promise();
  //   incrementLoadingBarTotal("object fusion tracks downloaded")
  //   const schemaUrl = s3.getSignedUrl('getObject', {
  //     Bucket: bucket,
  //     Key: trackFiles.schemaFile
  //   });
  //   const FlatbufferModule = await import(schemaUrl);
  //   const trackGeometries = await parseTracks(data.Body, shaderMaterial, FlatbufferModule, animationEngine);
  //   incrementLoadingBarTotal("object fusion tracks loaded")
  //   return trackGeometries;
  // } else {
  //   const response = await fetch(trackFiles.objectName);
  //   incrementLoadingBarTotal("object fusion tracks downloaded")
  //   const FlatbufferModule = await import(trackFiles.schemaFile);
  //   const trackGeometries = await parseTracks(new Uint8Array(response),shaderMaterial, FlatbufferModule, animationEngine);
  //   incrementLoadingBarTotal("object fusion tracks loaded")
  //   return trackGeometries;
  // }

  if (s3 && bucket && name) {
    (async () => {
      const schemaUrl = s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: trackFiles.schemaFile
      });
      const request = await s3.getObject({Bucket: bucket,
        Key: trackFiles.objectName},
        async (err, data) => {
          if (err) {
            console.error("Error getting object fusion tracks file", err, err.stack);
          } else {
            const FlatbufferModule = await import(schemaUrl);
            const trackGeometries = await parseTracks(data.Body, shaderMaterial, FlatbufferModule, animationEngine);
            await callback(trackGeometries, );
          }
          incrementLoadingBarTotal("object fusion tracks loaded")
        });
      request.on("httpDownloadProgress", (e) => {
        updateLoadingBar(e.loaded/e.total * 100);
      });
      request.on("complete", () => {
        incrementLoadingBarTotal("object fusion tracks downloaded")
      });
    })();

  } else {
    let t0, t1;
    const xhr = new XMLHttpRequest();
    xhr.open("GET", trackFiles.objectName);
    xhr.responseType = "arraybuffer";
    xhr.onprogress = (e) => {
      updateLoadingBar(e.loaded/e.total*100)
      t1 = performance.now();
      t0 = t1;
    }
    xhr.onload = async (data) => {
      incrementLoadingBarTotal("object fusion tracks downloaded")
      const FlatbufferModule = await import(trackFiles.schemaFile);
      const response = data.target.response;
      if (!response) {
        console.error("Could not create buffer from object fusion tracks data");
        return;
      }
      const bytesArray = new Uint8Array(response);
      const trackGeometries = await parseTracks(bytesArray, shaderMaterial, FlatbufferModule, animationEngine);
      await callback(trackGeometries, );
      incrementLoadingBarTotal("object fusion tracks loaded")
    };
    t0 = performance.now();
    xhr.send();
  }
}

async function parseTracks(bytesArray, shaderMaterial, FlatbufferModule, animationEngine) {
  const numBytes = bytesArray.length;
  const tracks = [];
  let segOffset = 0;
  while (segOffset < numBytes) {
    // Read SegmentSize:
    const viewSize = new DataView(bytesArray.buffer, segOffset, 4);
    const segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

    // Get Flatbuffer Track Object:
    segOffset += 4;
    const buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
    const fbuffer = new flatbuffers.ByteBuffer(buf);
    const track = FlatbufferModule.Flatbuffer.GroundTruth.Track.getRootAsTrack(fbuffer);
    tracks.push(track);
    segOffset += segSize;
  }
  const anomalyTypes = FlatbufferModule.Flatbuffer.GroundTruth.TrackAnomalyType || FlatbufferModule.Flatbuffer.GroundTruth.AnomalyType;
  return await createTrackGeometries(shaderMaterial, tracks, animationEngine, anomalyTypes);
}

async function createTrackGeometries(shaderMaterial, tracks, animationEngine, anomalyTypes) {
  const bboxs = [];
  let t0 = -1;
  const x0 = [];
  const y0 = [];
  const z0 = [];
  let firstCentroid, delta;
  let allBoxes = new THREE.Geometry();
  let stateTimes = [];
  for (let ss=0, numTracks=tracks.length; ss<numTracks; ss++) {
    if (ss % 100 === 0) {
      await updateLoadingBar(ss/numTracks * 100);
    }

    const track = tracks[ss];
    const isAnomalous = !!track.trackType && track.trackType() !== anomalyTypes?.NOT_APPLICABLE || 0;

    for (let ii=0, len=track.statesLength(); ii<len; ii++) {
      // Assign Current Track State:
      const state = track.states(ii);

      function getBoundingBoxGeometry(t0, state, shaderMaterial) {
        // Initializations:
        let sumX = 0, sumY=0, sumZ=0;
        for (let jj=0; jj<8;jj++) {
          const bbox = state.bbox(jj);
          sumX += bbox.x();
          sumY += bbox.y();
          sumZ += bbox.z();
        }
        const centroidLocation = new THREE.Vector3( sumX/8.0, sumY/8.0, sumZ/8.0 );
        if (firstCentroid == undefined) {
          firstCentroid = centroidLocation;
        }
        delta = centroidLocation.clone().sub(firstCentroid);

        const p0 = new THREE.Vector3(state.bbox(0).x(), state.bbox(0).y(), state.bbox(0).z()); // Front Left Bottom Point (near front left tire on vehicle e.g.)
        const p1 = new THREE.Vector3(state.bbox(1).x(), state.bbox(1).y(), state.bbox(1).z()); // Front Right Bottom Point (near front right tire on vehicle e.g.)
        const p2 = new THREE.Vector3(state.bbox(2).x(), state.bbox(2).y(), state.bbox(2).z()); // Back Right Bottom Point (near back right tire on vehicle e.g.)
        const p3 = new THREE.Vector3(state.bbox(3).x(), state.bbox(3).y(), state.bbox(3).z());
        const p4 = new THREE.Vector3(state.bbox(4).x(), state.bbox(4).y(), state.bbox(4).z()); // Front Left Top Point (above front left tire at height of roof of a vehicle e.g.)
        const p5 = new THREE.Vector3(state.bbox(5).x(), state.bbox(5).y(), state.bbox(5).z());
        const p6 = new THREE.Vector3(state.bbox(6).x(), state.bbox(6).y(), state.bbox(6).z());
        const p7 = new THREE.Vector3(state.bbox(7).x(), state.bbox(7).y(), state.bbox(7).z());

        const length = p2.distanceTo(p1);
        const width = p1.distanceTo(p0);
        const height = 2; // TODO Remove once bbox vertices are fixed
        // const height = p4.distanceTo(p0);

        // const length = state.bbox(2) - state.bbox(1); // Length is the distance from the front to rear bumper of a car
        // const width = state.bbox(1) - state.bbox(0); // Width is the distance from the driver-side door to the passenger-side door of a car
        // const height = state.bbox(4) - state.bbox(0); // Height is the distance from the bottom of the tire to the roof of a car

        const boxGeometry = new THREE.BoxGeometry(length, width, height);
        const boxGeometry2 = boxGeometry.clone();

        const edges = new THREE.EdgesGeometry( boxGeometry ); // or WireframeGeometry( geometry )
        const wireframe = new THREE.LineSegments( edges, shaderMaterial.clone() ); // TODO don't clone shaderMaterial to assign to multiple meshes

        wireframe.position.copy(centroidLocation);

        // Rotate BoxGeometry:
        const yaw = state.yaw();
        const zAxis = new THREE.Vector3(0, 0, 1); // TODO Hack until fb data gets fixed
        wireframe.rotateOnAxis(zAxis, yaw);

        if (t0 == -1) {
          t0 = state.timestamps();
        }
        stateTimes.push(state.timestamps()-animationEngine.tstart); // HACK -- 16.8 is a hack to get the tracked box timestamps to lineup with the rest of the animation
        const se3 = new THREE.Matrix4();
        const quaternion = new THREE.Quaternion().setFromAxisAngle(zAxis,yaw);
        se3.makeRotationFromQuaternion(quaternion); // Rotation
        se3.setPosition(delta); // Translation

        boxGeometry2.applyMatrix( se3 );
        // TODO rotate boxGeometry.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
        allBoxes.merge(boxGeometry2);

        if ((ii%10000)==0 || ii==(len-1)) {
          const bufferBoxGeometry = new THREE.BufferGeometry().fromGeometry(allBoxes);
          const edges = new THREE.EdgesGeometry( bufferBoxGeometry ); // or WireframeGeometry( geometry )
          const timestamps = [];
          for (let tt=0, numTimes=stateTimes.length; tt<numTimes; tt++) {
            for (let kk=0, numVerticesPerBox=24; kk<numVerticesPerBox; kk++) {  // NOTE: 24 vertices per edgesBox
              timestamps.push(stateTimes[tt]);
            }
          }
          edges.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestamps, 1));
          const wireframe = new THREE.LineSegments( edges, shaderMaterial ); // NOTE don't clone shaderMaterial to assign to multiple meshes
          const mesh = wireframe;
          mesh.isAnomalous = isAnomalous;
          mesh.position.copy(firstCentroid);
          bboxs.push( mesh );
          allBoxes = new THREE.Geometry();
          firstCentroid = centroidLocation.clone();
          stateTimes = [];
        }
        const output = {
          t0: t0,
          wireframe: wireframe,
          boxGeometry: boxGeometry2
        }
        return output;
      }
      const result = getBoundingBoxGeometry(t0, state, shaderMaterial);
      t0 = result.t0;
    }
  }
  await updateLoadingBar(100);
  const output = {
    bbox: bboxs,
    t0: t0,
    x0: x0,
    y0: y0,
    z0: z0
  }
  return output;
}

export async function loadObjectFusionTracksCallback(s3, bucket, name, trackShaderMaterial, animationEngine, files) {
  if (files) {
    for (let file of files) {
      file = file.split(/.*[\/|\\]/)[1];
      if (file === 'object_fusion_tracks.fb') {
        trackShaderMaterial.uniforms.color.value = new THREE.Color(0x00FFFF);
        loadTracksCallbackHelper(s3, bucket, name, trackShaderMaterial, animationEngine, file, 'Object Fusion Tracks');
      }
    }
  } else {
    loadTracksCallbackHelper(s3, bucket, name, trackShaderMaterial, animationEngine, 'object_fusion_tracks.fb', 'Object Fusion Tracks');
  }
}

async function loadTracksCallbackHelper (s3, bucket, name, trackShaderMaterial, animationEngine, trackFileName, trackName) {
	await loadTracks(s3, bucket, name, trackFileName, trackShaderMaterial, animationEngine, (trackGeometries) => {
		const objectFusionTrackLayer = new THREE.Group();
    objectFusionTrackLayer.name = trackName;
    objectFusionTrackLayer.visible = trackName === 'Object Fusion Tracks'

    const anomalousObjectFusionTrackLayer = new THREE.Group();
    anomalousObjectFusionTrackLayer.name = `Anomalous ${trackName}`
    anomalousObjectFusionTrackLayer.visible = false;

		for (let ii = 0, len = trackGeometries.bbox.length; ii < len; ii++) {
      if (trackGeometries.bbox[ii].isAnomalous) {
        anomalousObjectFusionTrackLayer.add(trackGeometries.bbox[ii]);
      }
      else {
        objectFusionTrackLayer.add(trackGeometries.bbox[ii]);
      }
    }

    viewer.scene.scene.add(objectFusionTrackLayer);
		const e = new CustomEvent("truth_layer_added", { detail: objectFusionTrackLayer, writable: true });
		viewer.scene.dispatchEvent({
			type: "sensor_layer_added",
			sensorLayer: objectFusionTrackLayer
    });

    if (anomalousObjectFusionTrackLayer.children.length > 0) {
      viewer.scene.scene.add(anomalousObjectFusionTrackLayer);
      const e = new CustomEvent("truth_layer_added", { detail: anomalousObjectFusionTrackLayer, writable: true });
      viewer.scene.dispatchEvent({
        "type": "sensor_layer_added",
        "sensorLayer": anomalousObjectFusionTrackLayer
      });
    }

		// TODO check if group works as expected, then trigger "truth_layer_added" event
		animationEngine.tweenTargets.push((gpsTime) => {
			const currentTime = gpsTime - animationEngine.tstart;
			trackShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
			trackShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;
		});
	});
}  // end of loadObjectFusionTracksCallback
