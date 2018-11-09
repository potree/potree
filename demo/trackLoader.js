
function loadTracks(callback) {
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
    trackGeometries = createTrackGeometries(tracks);
    callback(trackGeometries);
  }

  xhr.send();
}

function createTrackGeometries(tracks) {

  lineMaterial = new THREE.LineBasicMaterial({
    color: 0x0000ff
  });

  boxMaterial = new THREE.MeshNormalMaterial();

  let state;
  let bbox;
  let bboxs = [];
  debugger; // tracks.statesLength()
  for (let ss=0, numTracks=tracks.length; ss<numTracks; ss++) {
    let track = tracks[ss];

    for (let ii=0, len=track.statesLength(); ii<len; ii++) {

      // Assign Current Track State:
      state = track.states(ii);

      // let vertices = [];
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

      let length = state.bbox(2) - state.bbox(1); // Length is the distance from the front to rear bumper of a car
      let width = state.bbox(1) - state.bbox(0); // Width is the distance from the driver-side door to the passenger-side door of a car
      let height = state.bbox(4) - state.bbox(0); // Height is the distance from the bottom of the tire to the roof of a car

      // let boxGeometry = new THREE.BoxGeometry(10, 10, 100);
      let boxGeometry = new THREE.BoxBufferGeometry(length, width, height);
      let boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
      boxMesh.position.copy(centroidLocation);
      // TODO rotation needed?
      // debugger; // BoxGeometry

      bboxs.push( boxMesh );

    }
  }



  output = {
    bbox: bboxs
  }

  return output;

  // let lane;
  // let lefts = [];
  // let rights = [];
  // let spines = [];
  // for(let ii=0, len=lanes.length; ii<len; ii++) {
  //   lane = lanes[ii];
  //
  //   var geometryLeft = new THREE.Geometry();
  //   var geometrySpine = new THREE.Geometry();
  //   var geometryRight = new THREE.Geometry();
  //
  //   let left, right, spine;
  //   for(let jj=0, numVertices=lane.leftLength(); jj<numVertices; jj++) {
  //     left = lane.left(jj);
  //     spine = lane.spine(jj);
  //     right = lane.right(jj);
  //
  //     geometryLeft.vertices.push( new THREE.Vector3(left.x(), left.y(), left.z()));
  //     geometrySpine.vertices.push( new THREE.Vector3(spine.x(), spine.y(), spine.z()));
  //     geometryRight.vertices.push( new THREE.Vector3(right.x(), right.y(), right.z()));
  //   }
  //
  //   lefts.push(new THREE.Line(geometryLeft, materialLeft) );
  //   spines.push(new THREE.Line(geometrySpine, materialSpine) );
  //   rights.push(new THREE.Line(geometryRight, materialRight) );
  // }
  //
  // output = {
  //   left: lefts,
  //   spine: spines,
  //   right: rights
  // }
  // return output;
}
