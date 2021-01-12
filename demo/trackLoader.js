"use strict"
// import { Flatbuffer } from "../schemas/GroundTruth_generated.js";
// import { Flatbuffer } from "http://localhost:1234/schemas/GroundTruth_generated.js";
import { updateLoadingBar, incrementLoadingBarTotal } from "../common/overlay.js";
import { getFbFileInfo, removeFileExtension, indexOfClosestTimestamp } from "./loaderUtilities.js";


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

function getTrackStateParams(state, animationEngine, associationTypes) {
  let sumX = 0, sumY = 0, sumZ = 0;
  for (let i = 0; i < 8; i++) {
    const bbox = state.bbox(i);

    sumX += bbox.x();
    sumY += bbox.y();
    sumZ += bbox.z();
  }
  const centroidLocation = new THREE.Vector3(sumX / 8.0, sumY / 8.0, sumZ / 8.0);

  const p0 = new THREE.Vector3(state.bbox(0).x(), state.bbox(0).y(), state.bbox(0).z()); // Front Left Bottom Point (near front left tire on vehicle e.g.)
  const p1 = new THREE.Vector3(state.bbox(1).x(), state.bbox(1).y(), state.bbox(1).z()); // Front Right Bottom Point (near front right tire on vehicle e.g.)
  const p2 = new THREE.Vector3(state.bbox(2).x(), state.bbox(2).y(), state.bbox(2).z()); // Back Right Bottom Point (near back right tire on vehicle e.g.)
  const scale = new THREE.Vector3(p2.distanceTo(p1), p1.distanceTo(p0), 2);

  const yaw = state.yaw();
  const zAxis = new THREE.Vector3(0, 0, 1);
  const quaternion = new THREE.Quaternion().setFromAxisAngle(zAxis, yaw);

  const timestamp = state.timestamps() - animationEngine.tstart;
  const isPropagated = state?.associationType() === associationTypes?.PROPAGATE;

  return { position: centroidLocation, scale, quaternion, timestamp, isPropagated };
}

async function createTrackGeometries(shaderMaterial, tracks, animationEngine, anomalyTypes, associationTypes) {
  const trackData = [];

  for (let ss = 0, numTracks = tracks.length; ss < numTracks; ss++) {
    if (ss % 100 === 0) {
      await updateLoadingBar(ss / numTracks * 100);
    }

    const track = tracks[ss];
    const states = [];

    const trackId = track.id();
    const isAnomalous = !!track.trackType && track.trackType() !== anomalyTypes?.NOT_APPLICABLE || 0;

    for (let ii = 0, len = track.statesLength(); ii < len; ii++) {
      const state = track.states(ii);

      const stateInfo = getTrackStateParams(state, animationEngine, associationTypes);
      stateInfo.isStart = ii === 0;
      stateInfo.isEnd = ii === track.statesLength() - 1;

      states.push(stateInfo);
    }

    states.sort((a, b) => a.timestamp - b.timestamp);
    const completeTrack = { id: trackId, isAnomalous, states };

    trackData.push(completeTrack);
  }
  await updateLoadingBar(100);

  return trackData;
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
        loadTracksCallbackHelper(s3, bucket, name, newTrackShaderMaterial, animationEngine, file, getTrackName(file));
      }
    }
  } else {
    loadTracksCallbackHelper(s3, bucket, name, trackShaderMaterial, animationEngine, 'tracks.fb', 'Tracked Objects');
  }
}

function setSelectedTrackText(selectedTrack) {
  if (selectedTrack) {
    document.getElementById("track_annotation_tools").removeChild(document.getElementById("track_annotation_tools_selected"));
    $("#track_annotation_tools").append(`
      <div id="track_annotation_tools_selected">
        Selected Track:<br/>
        - ID: ${selectedTrack.track_id}<br/>
        - Timestamp: ${selectedTrack.timestamp}<br/>
        - Anomalous: ${selectedTrack.isAnomalous ? "Yes" : "No"}<br/>
        - Propagated: ${selectedTrack.isPropagated ? "Yes" : "No"}<br/>
        ${selectedTrack.isStart && "* Start of Track" || selectedTrack.isEnd && "* End of Track" || ""}
      </div>
    `);
  }
  else {
    document.getElementById("track_annotation_tools").removeChild(document.getElementById("track_annotation_tools_selected"));
    $("#track_annotation_tools").append(`
      <div id="track_annotation_tools_selected">
        Selected Track:<br/>
        Nothing selected
      </div>
    `)
  }
}

function colorToAttributeArray(color) {
  return new Float32Array(72).fill(null).map((val, i) => color.toArray()[i % 3]);
}

async function loadTracksCallbackHelper (s3, bucket, name, trackShaderMaterial, animationEngine, trackFileName, trackName) {
	await loadTracks(s3, bucket, name, trackFileName, trackShaderMaterial, animationEngine, (trackGeometries) => {
		const trackLayer = new THREE.Group();
    trackLayer.name = trackName;
    trackLayer.visible = trackName === 'Tracked Objects'
    const trackInfo = trackGeometries.filter(track => !track.isAnomalous);

    const anomalousTrackLayer = new THREE.Group();
    anomalousTrackLayer.name = `Anomalous ${trackName}`
    anomalousTrackLayer.visible = false;
    const anomlousTrackInfo = trackGeometries.filter(track => track.isAnomalous);

    const normalTrackColor = getTrackColor(trackFileName);
    const propagatedTrackColor = new THREE.Color(0x55AAFF);
    const startOrEndColor = new THREE.Color(0xFF55AA);
    const selectedTrackColor = new THREE.Color(0xFFFF00);

    viewer.scene.scene.add(trackLayer);
		const e = new CustomEvent("truth_layer_added", { detail: trackLayer, writable: true });
		viewer.scene.dispatchEvent({
			"type": "truth_layer_added",
			"truthLayer": trackLayer
    });

    if (anomlousTrackInfo.length > 0) {
      viewer.scene.scene.add(anomalousTrackLayer);
      const e = new CustomEvent("truth_layer_added", { detail: anomalousTrackLayer, writable: true });
      viewer.scene.dispatchEvent({
        "type": "truth_layer_added",
        "truthLayer": anomalousTrackLayer
      });
    }

    let selectedTrack;
    if (trackLayer.name === 'Tracked Objects') {
      let onMouseDown = (event) => {
        if (event.button === THREE.MOUSE.LEFT && window.annotateTracksModeActive) {
          const bounds = viewer.renderer.domElement.getBoundingClientRect();
          let mouse = new THREE.Vector2();
          mouse.x = ( (event.clientX - bounds.left) / bounds.width ) * 2 - 1;
          mouse.y = - ( (event.clientY - bounds.top) / bounds.height ) * 2 + 1;

          let raycaster = new THREE.Raycaster();
          raycaster.setFromCamera(mouse.clone(), viewer.scene.getActiveCamera());

          let intersects = raycaster.intersectObjects(trackLayer.children, true);
          if (!intersects || intersects?.length === 0) intersects = raycaster.intersectObjects(anomalousTrackLayer.children, true);

          if (intersects?.length > 0) {
            if (selectedTrack) {
              if (isStart || isEnd) {
                selectedTrack.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(startOrEndColor), 3));
              }
              else if (isPropagated) {
                selectedTrack.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(propagatedTrackColor), 3));
              }
            }

            selectedTrack = intersects[0].object;
            selectedTrack.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(selectedTrackColor), 3));

            setSelectedTrackText(selectedTrack);
          }
        }
      }
      viewer.renderer.domElement.addEventListener('click', onMouseDown);
    }

		animationEngine.tweenTargets.push((gpsTime) => {
      const currentTime = gpsTime - animationEngine.tstart;
      const minTime = currentTime + animationEngine.activeWindow.backward;
      const maxTime = currentTime + animationEngine.activeWindow.forward;

      if (trackLayer.visible) {
        trackLayer.remove(...trackLayer.children);

        const bufferGeo = new THREE.BoxBufferGeometry();
        const edgesGeo = new THREE.EdgesGeometry(bufferGeo);
        edgesGeo.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(normalTrackColor), 3));

        const meshes = [];
        trackInfo.forEach(({ id, states }) => {
          states.forEach(({position, scale, quaternion, timestamp, isPropagated, isStart, isEnd}) => {
            if (timestamp >= minTime && timestamp <= maxTime) {
              const currentMesh = new THREE.LineSegments(edgesGeo.clone(), trackShaderMaterial.clone());

              currentMesh.position.copy(position);
              currentMesh.quaternion.copy(quaternion);
              currentMesh.scale.copy(scale);

              currentMesh.track_id = id;
              currentMesh.timestamp = timestamp;
              currentMesh.isPropagated = isPropagated;
              currentMesh.isStart = isStart;
              currentMesh.isEnd = isEnd;

              if (window.annotateTracksModeActive) {
                if (isStart || isEnd) {
                  currentMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(startOrEndColor), 3));
                }
                else if (isPropagated) {
                  currentMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(propagatedTrackColor), 3));
                }
              }

              meshes.push(currentMesh);
            }
          });
        });

        if (meshes.length > 0) {
          trackLayer.add(...meshes);
        }
      }

      if (selectedTrack) {
        selectedTrack = undefined;
        setSelectedTrackText();
      }
		});
	});
}  // end of loadTracksCallback

function getTrackName(file) {
  return (file in trackNames) ? trackNames[file] : removeFileExtension(file);
}

function getTrackColor (file) {
  return (file in trackColors) ? trackColors[file] : new THREE.Color(0x00FF00);
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

  $("#track_annotation_tools_divider").hide();
  $("#track_annotation_tools").hide();

  $("#track_annotation_tools").append(`
    <div id="track_annotation_tools_selected">
      Selected Track:<br/>
      Nothing selected
    </div>
  `)

  annotateTracksButton.addEventListener("mousedown", () => {
    window.annotateTracksModeActive = !window.annotateTracksModeActive;
    annotateTracksButton.style.backgroundColor = window.annotateTracksModeActive ? "#AAAAA0" : "";

    if (window.annotateTracksModeActive) {
      $("#track_annotation_tools_divider").show();
      $("#track_annotation_tools").show();
    }
    else {
      $("#track_annotation_tools_divider").hide();
      $("#track_annotation_tools").hide();

      setSelectedTrackText();
    }

    animationEngine.updateTimeForAll();
  });
}
