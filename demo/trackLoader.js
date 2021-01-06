"use strict"
// import { Flatbuffer } from "../schemas/GroundTruth_generated.js";
// import { Flatbuffer } from "http://localhost:1234/schemas/GroundTruth_generated.js";
import { updateLoadingBar, incrementLoadingBarTotal } from "../common/overlay.js";
import { getFbFileInfo, removeFileExtension } from "./loaderUtilities.js";


// sets local variable and returns so # files can be counted
let trackFiles = null;
export const trackDownloads = async (datasetFiles) => {
  trackFiles = await getFbFileInfo(datasetFiles,
                                   "tracks.fb",
                                   "2_Truth",
                                   "GroundTruth_generated.js", // 5_Schemas
                                   "../data/tracks.fb",
                                   "../schemas/GroundTruth_generated.js");
  return trackFiles;
}

export async function loadTracks(s3, bucket, name, trackFileName, shaderMaterial, animationEngine, callback) {
  const tstart = performance.now();
  if (!trackFiles) {
    console.log("No track files present")
    return
  }

  if (trackFileName) {
    trackFiles.objectName = `${name}/2_Truth/${trackFileName}`;
  }
  console.log("tracks", trackFileName);
  console.log("tracks load", trackFiles.objectName);
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
            console.error("Error getting tracks file", err, err.stack);
          } else {
            const FlatbufferModule = await import(schemaUrl);
            const trackGeometries = await parseTracks(data.Body, shaderMaterial, FlatbufferModule, animationEngine);
            await callback(trackGeometries, );
          }
          incrementLoadingBarTotal("tracks loaded")
        });
      request.on("httpDownloadProgress", async (e) => {
        await updateLoadingBar(e.loaded/e.total * 100);
      });

      request.on("complete", () => {
        incrementLoadingBarTotal("tracks downloaded")
      });
    })();

  } else {
    let t0, t1;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", trackFiles.objectName);
    xhr.responseType = "arraybuffer";

    xhr.onprogress = async (e) => {
      await updateLoadingBar(e.loaded/e.total*100)
      t1 = performance.now();
      t0 = t1;
    }

    xhr.onload = async (data) => {
      incrementLoadingBarTotal("tracks downloaded")
      const FlatbufferModule = await import(trackFiles.schemaFile);

      const response = data.target.response;
      if (!response) {
        console.error("Could not create buffer from tracks data");
        return;
      }

      let bytesArray = new Uint8Array(response);
      const trackGeometries = await parseTracks(bytesArray, shaderMaterial, FlatbufferModule, animationEngine);
      await callback(trackGeometries, );
      incrementLoadingBarTotal("tracks loaded")
    };

    t0 = performance.now();
    xhr.send();
  }
}

//
// function loadTracks(shaderMaterial, callback) {
//
//   filename = "../data/tracks.bin";
//
//   const xhr = new XMLHttpRequest();
//   xhr.open("GET", filename);
//   xhr.responseType = "arraybuffer";
//   xhr.onprogress = function(event) {
//     console.log("TRACKS -- Loaded ["+event.loaded+"] bytes")
//   }
//
//   xhr.onerror = function(e) {
//     console.error("TRACKS -- Error loading tracks: ", e);
//   }
//
//   xhr.onload = function() {
//     const trackGeometries = parseTracks(data.target.response, shaderMaterial);
//     callback(trackGeometries, );
//   }
//   xhr.send();
// }

async function parseTracks(bytesArray, shaderMaterial, FlatbufferModule, animationEngine) {

  let numBytes = bytesArray.length;
  let tracks = [];

  let segOffset = 0;
  let segSize, viewSize, viewData;
  while (segOffset < numBytes) {

    // Read SegmentSize:
    viewSize = new DataView(bytesArray.buffer, segOffset, 4);
    segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

    // Get Flatbuffer Track Object:
    segOffset += 4;
    let buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
    let fbuffer = new flatbuffers.ByteBuffer(buf);
    let track = FlatbufferModule.Flatbuffer.GroundTruth.Track.getRootAsTrack(fbuffer);
    // debugger;

    tracks.push(track);
    segOffset += segSize;
  }

  const anomalyTypes = FlatbufferModule.Flatbuffer.GroundTruth.TrackAnomalyType || FlatbufferModule.Flatbuffer.GroundTruth.AnomalyType;
  const associationTypes = FlatbufferModule.Flatbuffer.GroundTruth.AssociationType;

  return await createTrackGeometries(shaderMaterial, tracks, animationEngine, anomalyTypes, associationTypes);
  // callback(trackGeometries, );
}

async function createTrackGeometries(shaderMaterial, tracks, animationEngine, anomalyTypes, associationTypes) {
  const propagatedShaderMaterial = shaderMaterial.clone();

  const bboxs = [];
  for (let ss=0, numTracks=tracks.length; ss<numTracks; ss++) {
    if (ss % 100 === 0) {
      await updateLoadingBar(ss/numTracks * 100);
    }

    const track = tracks[ss];

    const stateTimes = [];
    const propagatedStateTimes = [];

    let firstCentroid;
    const allBoxes = new THREE.Geometry();
    const propagatedBoxes = new THREE.Geometry();

    for (let ii=0, len=track.statesLength(); ii<len; ii++) {
      // Assign Current Track State:
      const state = track.states(ii);

      // Initializations:
      let centroidLocation;
      let sumX = 0, sumY=0, sumZ=0;
      for (let jj=0; jj<8;jj++) {
        const bbox = state.bbox(jj);

        sumX += bbox.x();
        sumY += bbox.y();
        sumZ += bbox.z();
      }
      centroidLocation = new THREE.Vector3( sumX/8.0, sumY/8.0, sumZ/8.0 );

      if (firstCentroid == undefined) {
        firstCentroid = centroidLocation;
      }

      const delta = centroidLocation.clone().sub(firstCentroid);

      const p0 = new THREE.Vector3(state.bbox(0).x(), state.bbox(0).y(), state.bbox(0).z()); // Front Left Bottom Point (near front left tire on vehicle e.g.)
      const p1 = new THREE.Vector3(state.bbox(1).x(), state.bbox(1).y(), state.bbox(1).z()); // Front Right Bottom Point (near front right tire on vehicle e.g.)
      const p2 = new THREE.Vector3(state.bbox(2).x(), state.bbox(2).y(), state.bbox(2).z()); // Back Right Bottom Point (near back right tire on vehicle e.g.)

      const length = p2.distanceTo(p1);
      const width = p1.distanceTo(p0);
      const height = 2;

      const boxGeometry = new THREE.BoxGeometry(length, width, height);

      // Rotate BoxGeometry:
      const yaw = state.yaw();
      const zAxis = new THREE.Vector3(0, 0, 1);

      const se3 = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion().setFromAxisAngle(zAxis,yaw);
      se3.makeRotationFromQuaternion(quaternion); // Rotation
      se3.setPosition(delta); // Translation

      boxGeometry.applyMatrix( se3 );

      if (state?.associationType() === associationTypes?.PROPAGATE) {
        propagatedBoxes.merge(boxGeometry);
        propagatedStateTimes.push(state.timestamps() - animationEngine.tstart);
      } else {
        allBoxes.merge(boxGeometry);
        stateTimes.push(state.timestamps() - animationEngine.tstart);
      }
    }

    function createTrackMesh(geometries, stateTimes, material) {
      const bufferBoxGeometry = new THREE.BufferGeometry().fromGeometry(geometries);
      const edges = new THREE.EdgesGeometry( bufferBoxGeometry );

      const timestamps = [];
      for (let tt=0, numTimes=stateTimes.length; tt<numTimes; tt++) {
        for (let kk=0, numVerticesPerBox=24; kk<numVerticesPerBox; kk++) {  // NOTE: 24 vertices per edgesBox
          timestamps.push(stateTimes[tt]);
        }
      }
      edges.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestamps, 1));

      const mesh = new THREE.LineSegments( edges, material );

      mesh.track_id = track.id();
      mesh.isAnomalous = !!track.trackType && track.trackType() !== anomalyTypes?.NOT_APPLICABLE || 0;
      mesh.position.copy(firstCentroid);

      return mesh;
    }

    bboxs.push( createTrackMesh(allBoxes, stateTimes, shaderMaterial) );

    const propagatedMesh = createTrackMesh(propagatedBoxes, propagatedStateTimes, propagatedShaderMaterial);
    propagatedMesh.isPropagated = true;
    bboxs.push( propagatedMesh );
  }
  await updateLoadingBar(100);

  return { bbox: bboxs, propagatedShaderMaterial };
}

export async function loadTracksCallback(s3, bucket, name, trackShaderMaterial, animationEngine, files) {
  if (files) {
    for (let file of files) {
      file = file.split(/.*[\/|\\]/)[1];
      if (!file.endsWith('tracks.fb')) {
        continue;
      } else if (file === 'tracks.fb') {
        loadTracksCallbackHelper(s3, bucket, name, trackShaderMaterial, animationEngine, file, 'Tracked Objects');
      } else {
        const newTrackShaderMaterial = trackShaderMaterial.clone();
        newTrackShaderMaterial.uniforms.color.value = getTrackColor(file);
        loadTracksCallbackHelper(s3, bucket, name, newTrackShaderMaterial, animationEngine, file, getTrackName(file));
      }
    }
  } else {
    loadTracksCallbackHelper(s3, bucket, name, trackShaderMaterial, animationEngine, 'tracks.fb', 'Tracked Objects');
  }
}

async function loadTracksCallbackHelper (s3, bucket, name, trackShaderMaterial, animationEngine, trackFileName, trackName) {
	await loadTracks(s3, bucket, name, trackFileName, trackShaderMaterial, animationEngine, (trackGeometries) => {
		const trackLayer = new THREE.Group();
    trackLayer.name = trackName;
    trackLayer.visible = trackName === 'Tracked Objects'

    const anomalousTrackLayer = new THREE.Group();
    anomalousTrackLayer.name = `Anomalous ${trackName}`
    anomalousTrackLayer.visible = false;

		for (let ii = 0, len = trackGeometries.bbox.length; ii < len; ii++) {
      if (trackGeometries.bbox[ii].isAnomalous) {
        anomalousTrackLayer.add(trackGeometries.bbox[ii]);
      }
      else {
        trackLayer.add(trackGeometries.bbox[ii]);
      }
    }

    viewer.scene.scene.add(trackLayer);
		const e = new CustomEvent("truth_layer_added", { detail: trackLayer, writable: true });
		viewer.scene.dispatchEvent({
			"type": "truth_layer_added",
			"truthLayer": trackLayer
    });

    if (anomalousTrackLayer.children.length > 0) {
      viewer.scene.scene.add(anomalousTrackLayer);
      const e = new CustomEvent("truth_layer_added", { detail: anomalousTrackLayer, writable: true });
      viewer.scene.dispatchEvent({
        "type": "truth_layer_added",
        "truthLayer": anomalousTrackLayer
      });
    }

    /*if (trackLayer.name === 'Tracked Objects' || trackLayer.name === 'Anomalous Tracked Objects') {
      let onMouseDown = (event) => {
        if (window.annotateTracksModeActive && event.button === THREE.MOUSE.LEFT) {
          const currentAnnotation = viewer.scene.annotations.children.find(({_title}) => _title.startsWith("Track ID: "));
          if (currentAnnotation) viewer.scene.annotations.remove(currentAnnotation);

          let mouse = new THREE.Vector2();
          mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
          mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

          let raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse.clone(), viewer.scene.getActiveCamera());

          let intersects = raycaster.intersectObjects(trackLayer.children, true);

          if (intersects?.length > 0) {
            viewer.scene.annotations.add(new Potree.Annotation({
              title: "Track ID: " + intersects[0].object.track_id + (intersects[0].object.isPropagated ? ", PROPAGATED" : ""),
              position: intersects[0].point
            }));
          }
        }
      }
      viewer.renderer.domElement.addEventListener('mousedown', onMouseDown);
    }*/

		animationEngine.tweenTargets.push((gpsTime) => {
      if (window.annotateTracksModeActive) {
        trackGeometries.propagatedShaderMaterial.uniforms.color.value.setHex(0x1055FF);
      }
      else {
        trackGeometries.propagatedShaderMaterial.uniforms.color.value.set(trackShaderMaterial.uniforms.color.value);
      }

			const currentTime = gpsTime - animationEngine.tstart;
			trackShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
      trackShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;

      trackGeometries.propagatedShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
      trackGeometries.propagatedShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;
		});
	});
}  // end of loadTracksCallback

function getTrackName(file) {
  return (file in trackNames) ? trackNames[file] : removeFileExtension(file);
}

function getTrackColor (file) {
  return (file in trackColors) ? trackColors[file] : new THREE.Color(0xFFFF00);
}

const trackColors = {
  'srr_detects_association_regions_tracks.fb': new THREE.Color(0xB967FF), // P
  'srr_detects_interpolated_states_tracks.fb': new THREE.Color(0xB967FF), // P
  'mrr_detects_association_regions_tracks.fb': new THREE.Color(0xFF7400), // O
  'mrr_detects_interpolated_states_tracks.fb': new THREE.Color(0xFF7400), // O
  'srr_tracks_association_regions_tracks.fb': new THREE.Color(0x0000FF),  // B
  'srr_tracks_interpolated_states_tracks.fb': new THREE.Color(0x0000FF),  // B
  'mrr_tracks_association_regions_tracks.fb': new THREE.Color(0x006400),  // G
  'mrr_tracks_interpolated_states_tracks.fb': new THREE.Color(0x006400),  // G,
  'interpolated_states_tracks.fb' : new THREE.Color(0xB967FF),            // P
  'association_regions_tracks.fb' : new THREE.Color(0xB967FF),            // P
};

const trackNames = {
  'srr_detects_association_regions_tracks.fb': "SRR Detects Association Regions",
  'srr_detects_interpolated_states_tracks.fb': "SRR Detects Interpolated States",
  'mrr_detects_association_regions_tracks.fb': "MRR Detects Association Regions",
  'mrr_detects_interpolated_states_tracks.fb': "MRR Detects Interpolated States",
  'srr_tracks_association_regions_tracks.fb': "SRR Tracklets Association Regions",
  'srr_tracks_interpolated_states_tracks.fb': "SRR Tracklets Interpolated States",
  'mrr_tracks_association_regions_tracks.fb': "MRR Tracklets Association Regions",
  'mrr_tracks_interpolated_states_tracks.fb': "MRR Tracklets Interpolated States",
  'interpolated_states_tracks.fb' : 'Interpolated Truth Tracks',
  'association_regions_tracks.fb' : 'Association Region Tracks',
};

// add an event listener for the annotate tracks button
export function addAnnotateTracksButton() {
  window.annotateTracksModeActive = false; // starts off false

  const annotateTracksButton = $("#annotate_tracks_button")[0];
  annotateTracksButton.style.display = "block";

  annotateTracksButton.addEventListener("mousedown", () => {
    window.annotateTracksModeActive = !window.annotateTracksModeActive;
    annotateTracksButton.style.backgroundColor = window.annotateTracksModeActive ? "#AAAAA0" : "";

    animationEngine.updateTimeForAll();
  });
}
