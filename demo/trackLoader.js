"use strict"
// import { Flatbuffer } from "../schemas/GroundTruth_generated.js";
// import { Flatbuffer } from "http://localhost:1234/schemas/GroundTruth_generated.js";
import { updateLoadingBar, incrementLoadingBarTotal } from "../common/overlay.js";
import { getFbFileInfo, removeFileExtension, indexOfClosestTimestamp } from "./loaderUtilities.js";
import { annotateAvailable } from "./paramLoader.js";


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

// Global colors used in numerous places
const propagatedTrackColor = new THREE.Color(0x55AAFF);
const startOrEndColor = new THREE.Color(0xFF55AA);
const selectedTrackColor = new THREE.Color(0xFFFFFF);

// Converts a three js color to a format readable by the shaders
function colorToAttributeArray(color) {
  return new Float32Array(72).fill(null).map((val, i) => color.toArray()[i % 3]);
}

// When a track is no longer selected, it needs its color reset
function resetColor(mesh, defaultColor) {
  if (mesh.isStart || mesh.isEnd) {
    mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(startOrEndColor), 3));
  }
  else if (mesh.isPropagated) {
    mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(propagatedTrackColor), 3));
  }
  else {
    mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(defaultColor), 3));
  }
}

// Reset all meshes to default color
function resetAllMeshColors(meshes, defaultColor) {
  Object.values(meshes).forEach(track => track.forEach(mesh => {
    mesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(defaultColor), 3));
  }));
}

// Global to determine if all mesh colors should be reset - must be global so button function can access
let resetAllColors = false;

// Updates a single track layer (i.e. updates mesh transforms and colors, discards unused meshes)
function updateTrackLayer(layer, trackInfo, meshes, defaultColor, shaderMaterial, minTime, maxTime) {
  if (layer.visible) {
    // Create base geometry for the track meshes
    const bufferGeo = new THREE.BoxBufferGeometry();
    const edgesGeo = new THREE.EdgesGeometry(bufferGeo);
    edgesGeo.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(defaultColor), 3));

    if (resetAllColors) {
      resetAllMeshColors(meshes, defaultColor);
      resetAllColors = false;
    }

    // Iterate over each track
    trackInfo.forEach(({ id, states, isAnomalous }) => {
      // Used to keep track of how many meshes have been updated - this is used later to delete tracks that have left the scene
      let meshCounter = 0;

      // Iterate each state of the track
      states.forEach(({position, scale, quaternion, timestamp, isPropagated, isStart, isEnd}) => {
        // Only do anything if the current state is within the time window
        if (timestamp >= minTime && timestamp <= maxTime) {
          // Add the current track's id to the dictionary of meshes if it hasn't been added already
          if(!meshes.hasOwnProperty(id)) {
            meshes[id] = [];
          }

          // If there are unused meshes available, use the next one. Otherwise add a new mesh
          let currentMesh;
          if (meshCounter < meshes[id].length) {
            currentMesh = meshes[id][meshCounter];

            // If the current mesh no longer requires a "special" color, set it back to the default
            // TODO - Only do this in annotate mode, it's a bit expensive
            if ((!isPropagated && currentMesh.isPropagated) || (!isStart && currentMesh.isStart) || (!isEnd && currentMesh.isEnd)) {
              currentMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(defaultColor), 3));
            }
          }
          else {
            currentMesh = new THREE.LineSegments(edgesGeo.clone(), shaderMaterial.clone());
            meshes[id].push(currentMesh);
            layer.add(currentMesh);
          }

          // Update the current mesh
          currentMesh.position.copy(position);
          currentMesh.quaternion.copy(quaternion);
          currentMesh.scale.copy(scale);

          currentMesh.track_id = id;
          currentMesh.timestamp = timestamp;
          currentMesh.isPropagated = isPropagated;
          currentMesh.isAnomalous = isAnomalous;
          currentMesh.isStart = isStart;
          currentMesh.isEnd = isEnd;

          // If annotate mode is active, there are special colors for certains states
          if (window.annotateTracksModeActive) {
            if (isStart || isEnd) {
              currentMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(startOrEndColor), 3));
            }
            else if (isPropagated) {
              currentMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(propagatedTrackColor), 3));
            }
          }

          meshCounter++;
        }
      });

      // Clean up - remove meshes that are no longer visible
      if (meshes.hasOwnProperty(id) && meshCounter < meshes[id].length) {
        meshes[id].slice(meshCounter).forEach(mesh => {
          mesh.geometry.dispose();
          mesh.material.dispose();
          layer.remove(mesh);
        });
        meshes[id] = meshes[id].slice(0, meshCounter);
      }
    });
  }
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
    const anomalousTrackInfo = trackGeometries.filter(track => track.isAnomalous);

    const normalTrackColor = getTrackColor(trackFileName);

    viewer.scene.scene.add(trackLayer);
		const e = new CustomEvent("truth_layer_added", { detail: trackLayer, writable: true });
		viewer.scene.dispatchEvent({
			"type": "truth_layer_added",
			"truthLayer": trackLayer
    });

    if (anomalousTrackInfo.length > 0 && annotateAvailable) {
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

          let intersects = raycaster.intersectObjects(trackLayer.children);
          if (!intersects || intersects?.length === 0) intersects = raycaster.intersectObjects(anomalousTrackLayer.children);

          if (intersects?.length > 0) {
            if (selectedTrack) {
              resetColor(selectedTrack, normalTrackColor);
            }

            selectedTrack = intersects[0].object;
            selectedTrack.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colorToAttributeArray(selectedTrackColor), 3));

            setSelectedTrackText(selectedTrack);
          }
        }
      }
      viewer.renderer.domElement.addEventListener('click', onMouseDown);
    }

    const meshes = {};
		animationEngine.tweenTargets.push((gpsTime) => {
      const currentTime = gpsTime - animationEngine.tstart;
      const minTime = currentTime + animationEngine.activeWindow.backward;
      const maxTime = currentTime + animationEngine.activeWindow.forward;

      updateTrackLayer(trackLayer, trackInfo, meshes, normalTrackColor, trackShaderMaterial, minTime, maxTime);
      updateTrackLayer(anomalousTrackLayer, anomalousTrackInfo, meshes, normalTrackColor, trackShaderMaterial, minTime, maxTime);

      if (selectedTrack) {
        resetColor(selectedTrack, normalTrackColor);
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

    resetAllColors = !window.annotateTracksModeActive;
    animationEngine.updateTimeForAll();
  });
}
