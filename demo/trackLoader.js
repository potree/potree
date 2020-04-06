"use strict"
// import { Flatbuffer } from "../schemas/GroundTruth_generated.js";
// import { Flatbuffer } from "http://localhost:1234/schemas/GroundTruth_generated.js";
import { getLoadingBar, getLoadingBarTotal, numberTasks, removeLoadingScreen, pause} from "../common/overlay.js";


export async function loadTracks(s3, bucket, name, shaderMaterial, animationEngine, callback) {
  let loadingBar = getLoadingBar();
  let loadingBarTotal = getLoadingBarTotal(); 
  let lastLoaded = 0;
  const tstart = performance.now();
  if (s3 && bucket && name) {
    (async () => {
      const objectName = `${name}/2_Truth/tracks.fb`;
      const schemaFile = `${name}/5_Schemas/GroundTruth_generated.js`;

      const schemaUrl = s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: schemaFile
      });
      const request = await s3.getObject({Bucket: bucket,
                    Key: objectName},
                   async (err, data) => {
                     if (err) {
                        console.log(err, err.stack);
                        // have to increment progress bar since function that would isnt going to be called
                        loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100/numberTasks))), 100);
                     } else {
                       const FlatbufferModule = await import(schemaUrl);
                       const trackGeometries = await parseTracks(data.Body, shaderMaterial, FlatbufferModule, animationEngine);
                       loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100/numberTasks))), 100);
                       loadingBar.set(0);
                       if (loadingBarTotal.value >= 100) {
                         removeLoadingScreen();
                       }
                       await pause();
                       await callback(trackGeometries, );
                     }
                     if (loadingBarTotal.value  >= 100) {
                      removeLoadingScreen();
                     }});
      request.on("httpDownloadProgress", async (e) => {
        let val = e.loaded/e.total * 100; 
        val = Math.max(lastLoaded, val);
        loadingBar.set(Math.max(val, loadingBar.value));
        lastLoaded = val;
        await pause();
      });

      request.on("complete", async () => {
        // Don't check for 100% when done loading tracks because callback still has work to do
        loadingBarTotal.set(Math.min(Math.ceil(loadingBarTotal.value + (100/numberTasks))), 100);
        loadingBar.set(0);
        if (loadingBarTotal.value >= 100) {
          removeLoadingScreen();
        }
        await pause();
      });
    })();

  } else {
    const filename = "../data/tracks.fb";
    const schemaFile = "../schemas/GroundTruth_generated.js";
    let t0, t1;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", filename);
    xhr.responseType = "arraybuffer";

    xhr.onprogress = function(event) {
      t1 = performance.now();
      t0 = t1;
    }

    xhr.onload = async function(data) {

      const FlatbufferModule = await import(schemaFile);

      const response = data.target.response;
      if (!response) {
        console.error("Could not create buffer from tracks data");
        return;
      }

      let bytesArray = new Uint8Array(response);
      const trackGeometries = parseTracks(bytesArray, shaderMaterial, FlatbufferModule, animationEngine);
      await callback(trackGeometries, );
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

  return await createTrackGeometries(shaderMaterial, tracks, animationEngine);
  // callback(trackGeometries, );
}

async function createTrackGeometries(shaderMaterial, tracks, animationEngine) {

  let lineMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    transparent: true
  });

  let boxMaterial = new THREE.MeshNormalMaterial();

  let material = shaderMaterial;

  let state;
  let bbox;
  let bboxs = [];
  let trackPoints = [];
  let t0 = -1;
  let x0 = [];
  let y0 = [];
  let z0 = [];
  let firstTimestamp = true;
  let firstCentroid, delta;
  let allBoxes = new THREE.Geometry();
  let stateTimes = [];
  let all = [];
  let loadingBar = getLoadingBar()
  for (let ss=0, numTracks=tracks.length; ss<numTracks; ss++) {
    let track = tracks[ss];
    loadingBar.set(Math.max(ss/numTracks * 100, loadingBar.value));
    // put in pause so running javascript can hand over temp control to the UI
    // gives it an opportunity to repaint the UI for the loading bar element
    await pause(); 

    for (let ii=0, len=track.statesLength(); ii<len; ii++) {

      // Assign Current Track State:
      state = track.states(ii);

      function getBoundingBoxGeometry(t0, state, material) {

        // Initializations:
        let centroidLocation;
        let sumX = 0, sumY=0, sumZ=0;
        for (let jj=0; jj<8;jj++) {
          bbox = state.bbox(jj);
          // vertices.push( new THREE.Vector3(bbox.x(), bbox.y(), bbox.z()));
          sumX += bbox.x();
          sumY += bbox.y();
          sumZ += bbox.z();
        }
        centroidLocation = new THREE.Vector3( sumX/8.0, sumY/8.0, sumZ/8.0 );
        if (firstCentroid == undefined) {
          firstCentroid = centroidLocation;
        }
        // debugger; // delta
        delta = centroidLocation.clone().sub(firstCentroid);

        let p0 = new THREE.Vector3(state.bbox(0).x(), state.bbox(0).y(), state.bbox(0).z()); // Front Left Bottom Point (near front left tire on vehicle e.g.)
        let p1 = new THREE.Vector3(state.bbox(1).x(), state.bbox(1).y(), state.bbox(1).z()); // Front Right Bottom Point (near front right tire on vehicle e.g.)
        let p2 = new THREE.Vector3(state.bbox(2).x(), state.bbox(2).y(), state.bbox(2).z()); // Back Right Bottom Point (near back right tire on vehicle e.g.)
        let p3 = new THREE.Vector3(state.bbox(3).x(), state.bbox(3).y(), state.bbox(3).z());
        let p4 = new THREE.Vector3(state.bbox(4).x(), state.bbox(4).y(), state.bbox(4).z()); // Front Left Top Point (above front left tire at height of roof of a vehicle e.g.)
        let p5 = new THREE.Vector3(state.bbox(5).x(), state.bbox(5).y(), state.bbox(5).z());
        let p6 = new THREE.Vector3(state.bbox(6).x(), state.bbox(6).y(), state.bbox(6).z());
        let p7 = new THREE.Vector3(state.bbox(7).x(), state.bbox(7).y(), state.bbox(7).z());



        let length = p2.distanceTo(p1);
        let width = p1.distanceTo(p0);
        let height = 2; // TODO Remove once bbox vertices are fixed
        // let height = p4.distanceTo(p0);

        // let length = state.bbox(2) - state.bbox(1); // Length is the distance from the front to rear bumper of a car
        // let width = state.bbox(1) - state.bbox(0); // Width is the distance from the driver-side door to the passenger-side door of a car
        // let height = state.bbox(4) - state.bbox(0); // Height is the distance from the bottom of the tire to the roof of a car

        let boxGeometry = new THREE.BoxGeometry(length, width, height);
        let boxGeometry2 = boxGeometry.clone();

        var edges = new THREE.EdgesGeometry( boxGeometry ); // or WireframeGeometry( geometry )
        var wireframe = new THREE.LineSegments( edges, material.clone() ); // TODO don't clone material to assign to multiple meshes
        var boxMesh = wireframe;

        boxMesh.position.copy(centroidLocation);

        // Rotate BoxGeometry:
        let yaw = state.yaw();
        let zAxis = new THREE.Vector3(0, 0, 1); // TODO Hack until fb data gets fixed
        // let zAxis = p4.sub(p0);
        // zAxis.normalize();
        boxMesh.rotateOnAxis(zAxis, yaw);

        // debugger; // lhw yaw/rotation
        if (t0 == -1) {
          t0 = state.timestamps();
        }
        // x0.push(centroidLocation.x); // TODO Not needed?
        // y0.push(centroidLocation.y); // TODO Not needed?
        // z0.push(centroidLocation.z); // TODO Not needed?
        // let timestamps = [];
        // for (let kk=0, numVertices=boxMesh.geometry.attributes.position.count; kk<numVertices; kk++) {
        //   timestamps.push(state.timestamps()-t0+16.8); // HACK -- 16.8 is a hack to get the tracked box timestamps to lineup with the rest of the animation
        // }
        // boxMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestamps, 1));

        stateTimes.push(state.timestamps()-animationEngine.tstart); // HACK -- 16.8 is a hack to get the tracked box timestamps to lineup with the rest of the animation


        let se3 = new THREE.Matrix4();
        let quaternion = new THREE.Quaternion().setFromAxisAngle(zAxis,yaw);
        se3.makeRotationFromQuaternion(quaternion); // Rotation
        se3.setPosition(delta); // Translation
        // debugger; // se3

        boxGeometry2.applyMatrix( se3 );
        // TODO rotate boxGeometry.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
        allBoxes.merge(boxGeometry2);

        if ((ii%10000)==0 || ii==(len-1)) {
          let bufferBoxGeometry = new THREE.BufferGeometry().fromGeometry(allBoxes);
          let edges = new THREE.EdgesGeometry( bufferBoxGeometry ); // or WireframeGeometry( geometry )
          // debugger; //edges, stateTimes
          let timestamps = [];
          for (let tt=0, numTimes=stateTimes.length; tt<numTimes; tt++) {
            for (let kk=0, numVerticesPerBox=24; kk<numVerticesPerBox; kk++) {  // NOTE: 24 vertices per edgesBox
              timestamps.push(stateTimes[tt]);
            }
          }
          edges.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestamps, 1));

          // let bufferBoxGeometry = allBoxes;
          let wireframe = new THREE.LineSegments( edges, material ); // NOTE don't clone material to assign to multiple meshes
          let mesh = wireframe;
          mesh.position.copy(firstCentroid);
          bboxs.push( mesh );
          allBoxes = new THREE.Geometry();
          firstCentroid = centroidLocation.clone();
          stateTimes = [];
        }


        const output = {
          t0: t0,
          boxMesh: boxMesh,
          boxGeometry: boxGeometry2
        }
        return output;
      }

      let result = getBoundingBoxGeometry(t0, state, material);
      t0 = result.t0;
      // if (bboxs.length < 1000) {  // TODO only showing 1000 boxes because it of my inefficient way of updating them
      // if (true) {
      //   // bboxs.push( result.boxMesh );
      //
      //   // // let mesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(allBoxes), material); // Buffergeometry
      //   //
      //   // // let bufferBoxGeometry = new THREE.BufferGeometry().fromGeometry(allBoxes);
      //   // let bufferBoxGeometry = allBoxes;
      //   // let edges = new THREE.EdgesGeometry( bufferBoxGeometry ); // or WireframeGeometry( geometry )
      //   // let wireframe = new THREE.LineSegments( edges, material.clone() ); // TODO don't clone material to assign to multiple meshes
      //   // let mesh = wireframe;
      //   // mesh.position.copy(firstCentroid);
      //   // // bboxs.push(mesh);
      //   // // TODO edges then wireframe mesh here then push into bboxs
      //
      //
      // }
    }
  }



  const output = {
    bbox: bboxs,
    t0: t0,
    x0: x0,
    y0: y0,
    z0: z0
  }

  return output;
}

export async function loadTracksCallback(s3, bucket, name, trackShaderMaterial, animationEngine) {

	await loadTracks(s3, bucket, name, trackShaderMaterial, animationEngine, (trackGeometries) => {
		let trackLayer = new THREE.Group();
		trackLayer.name = "Tracked Objects";
		for (let ii = 0, len = trackGeometries.bbox.length; ii < len; ii++) {
			trackLayer.add(trackGeometries.bbox[ii]);
			// viewer.scene.scene.add(trackGeometries.bbox[ii]); // Original
		}

		viewer.scene.scene.add(trackLayer);
		let e = new CustomEvent("truth_layer_added", { detail: trackLayer, writable: true });
		viewer.scene.dispatchEvent({
			"type": "truth_layer_added",
			"truthLayer": trackLayer
		});

		// TODO check if group works as expected, then trigger "truth_layer_added" event
		animationEngine.tweenTargets.push((gpsTime) => {
			let currentTime = gpsTime - animationEngine.tstart;
			trackShaderMaterial.uniforms.minGpsTime.value = currentTime - animationEngine.activeWindow.backward;
			trackShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;
		});
	});
}  // end of loadTracksCallback
