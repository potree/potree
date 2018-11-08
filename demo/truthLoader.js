
function loadLanes(callback) {
  console.log("Hello World! -- Loading Lane Representation Truth Data");

  filename = "../data/lanes.bin";

  const xhr = new XMLHttpRequest();
  xhr.open("GET", filename);
  xhr.responseType = "arraybuffer";
  xhr.onprogress = function(event) {
    console.log("LANES -- Loaded ["+event.loaded+"] bytes")
  }

  xhr.onload = function(data) {

    response = data.target.response;
    if (!response) {
      console.error("Could not create buffer from lanes data");
      return;
    }

    let bytesArray = new Uint8Array(response);
    let numBytes = bytesArray.length;
    let lanes = [];

    let segOffset = 0;
    let segSize, viewSize, viewData;
    while (segOffset < numBytes) {

      // Read SegmentSize:
      viewSize = new DataView(bytesArray.buffer, segOffset, 4);
      segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian
      // debugger; // Segment Size

      segOffset += 4;
      let buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
      let fbuffer = new flatbuffers.ByteBuffer(buf);
      let lane = Flatbuffer.GroundTruth.Lane.getRootAsLane(fbuffer);

      // debugger;
      lanes.push(lane);
      segOffset += segSize;
    }

    laneGeometries = createLaneGeometries(lanes);
    callback(laneGeometries);

  }

  xhr.send();
}


function createLaneGeometries(lanes) {

  material = new THREE.LineBasicMaterial({
    color: 0x0000ff
  });

  let lane;
  let lefts = [];
  let rights = [];
  let spines = [];
  for(let ii=0, len=lanes.length; ii<len; ii++) {
    lane = lanes[ii];

    var geometryLeft = new THREE.Geometry();
    var geometrySpine = new THREE.Geometry();
    var geometryRight = new THREE.Geometry();

    let left, right, spine;
    for(let jj=0, numVertices=lane.leftLength(); jj<numVertices; jj++) {
      left = lane.left(jj);
      spine = lane.spine(jj);
      right = lane.right(jj);

      geometryLeft.vertices.push( new THREE.Vector3(left.x(), left.y(), left.z()));
      geometrySpine.vertices.push( new THREE.Vector3(spine.x(), spine.y(), spine.z()));
      geometryRight.vertices.push( new THREE.Vector3(right.x(), right.y(), right.z()));
    }

    lefts.push(new THREE.Line(geometryLeft, material) );
    spines.push(new THREE.Line(geometrySpine, material) );
    rights.push(new THREE.Line(geometryRight, material) );
  }

  output = {
    left: lefts,
    spine: spines,
    right: rights
  }
  return output;


}
