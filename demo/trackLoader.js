
function loadTracks(shaderMaterial, callback) {
  console.log("Hello World! -- Loading Tracking Truth Data");

  filename = "../data/tracks.bin";

  const xhr = new XMLHttpRequest();
  xhr.open("GET", filename);
  xhr.responseType = "arraybuffer";
  xhr.onprogress = function(event) {
    console.log("TRACKS -- Loaded ["+event.loaded+"] bytes")
  }

  xhr.onerror = function(e) {
    console.error("TRACKS -- Error loading tracks: ", e);
  }

  xhr.onload = function(data) {

    response = data.target.response;
    if (!response) {
      console.error("Could not create buffer from tracks data");
      return;
    }

    let bytesArray = new Uint8Array(response);
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
      let track = Flatbuffer.GroundTruth.Track.getRootAsTrack(fbuffer);
      // debugger;

      tracks.push(track);
      segOffset += segSize;
    }
    debugger;
    trackGeometries = createTrackGeometries(shaderMaterial, tracks);
    callback(trackGeometries, );
  }

  xhr.send();
}

function createTrackGeometries(shaderMaterial, tracks) {

  lineMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    transparent: true
  });

  boxMaterial = new THREE.MeshNormalMaterial();

  let material = lineMaterial;

  let state;
  let bbox;
  let bboxs = [];
  let trackPoints = [];
  let t0 = -1;
  let x0 = [];
  let y0 = [];
  let z0 = [];
  let firstTimestamp = true;
  for (let ss=0, numTracks=tracks.length; ss<numTracks; ss++) {
    let track = tracks[ss];

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

        // let boxGeometry = new THREE.BoxGeometry(10, 10, 100);
        let boxGeometry = new THREE.BoxBufferGeometry(length, width, height);
        var edges = new THREE.EdgesGeometry( boxGeometry ); // or WireframeGeometry( geometry )
        var wireframe = new THREE.LineSegments( edges, material.clone() ); // TODO don't clone material to assign to multiple meshes
        boxMesh = wireframe;

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
        let timestamps = [];
        for (let kk=0, numVertices=boxMesh.geometry.attributes.position.count; kk<numVertices; kk++) {
          timestamps.push(state.timestamps()-t0+16.8); // HACK -- 16.8 is a hack to get the tracked box timestamps to lineup with the rest of the animation
        }
        boxMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestamps, 1));

        output = {
          t0: t0,
          boxMesh: boxMesh
        }
        return output;
      }

      let result = getBoundingBoxGeometry(t0, state, material);
      t0 = result.t0;
      if (bboxs.length < 1000) {  // TODO only showing 1000 boxes because it of my inefficient way of updating them
      // if (true) {
        bboxs.push( result.boxMesh );
      }
    }
  }



  output = {
    bbox: bboxs,
    t0: t0,
    x0: x0,
    y0: y0,
    z0: z0
  }

  return output;
}
