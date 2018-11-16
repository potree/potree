
function loadLanes(callback) {
  console.log("Hello World! -- Loading Lane Representation Truth Data");

  filename = "../data/lanes.bin";

  const xhr = new XMLHttpRequest();
  xhr.open("GET", filename);
  xhr.responseType = "arraybuffer";
  xhr.onprogress = function(event) {
    console.log("LANES -- Loaded ["+event.loaded+"] bytes")
  }

  xhr.onerror = function(e) {
    console.error("LANES -- Error loading lanes: ", e);
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

      // Get Flatbuffer Lane Object:
      segOffset += 4;
      let buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
      let fbuffer = new flatbuffers.ByteBuffer(buf);
      let lane = Flatbuffer.GroundTruth.Lane.getRootAsLane(fbuffer);

      lanes.push(lane);
      segOffset += segSize;
    }

    laneGeometries = createLaneGeometries(lanes);
    callback(laneGeometries);
  }

  xhr.send();
}

function createLaneGeometries(lanes) {

  materialLeft = new THREE.LineBasicMaterial({
    color: 0xff0000
  });

  materialSpine = new THREE.LineBasicMaterial({
    color: 0x00ff00
  });

  materialRight = new THREE.LineBasicMaterial({
    color: 0x0000ff
  });

  let lane;
  let lefts = [];
  let rights = [];
  let spines = [];
  let all = [];
  let allBoxes = new THREE.Geometry();
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

    // // NOTE TRYING MESHLINE:
    // var leftLine = new MeshLine();
    // var spineLine = new MeshLine();
    // var rightLine = new MeshLine();
    //
    // leftLine.setGeometry(geometryLeft);
    // spineLine.setGeometry(geometrySpine);
    // rightLine.setGeometry(geometryRight);
    //
    // let leftMeshLineMaterial = new MeshLineMaterial();
    // // let spineMeshLineMaterial = new MeshLineMaterial();
    // // let rightMeshLineMaterial = new MeshLineMaterial();
    //
    // let leftMesh = new THREE.Mesh( leftLine.geometry, leftMeshLineMaterial );
    // // let spineMesh = new THREE.Mesh( spineLine.geometry, spineMeshLineMaterial );
    // // let rightMesh = new THREE.Mesh( rightLine.geometry, rightMeshLineMaterial );
    //
    // lefts.push(leftMesh);
    // // spines.push(spineMesh);
    // // rights.push(rightMesh);


    // NOTE TRYING BOXES:
    let tmp1, tmp2, p1, p2, v1, v2;
    let vertices = geometryLeft.vertices;
    let offset = new THREE.Vector3(300043.226, 4701247.907, 245.427); // TODO FIX THIS HARDCODED OFFSET (it's just a large number to bring the vertices below close to 0)
    for (let ii=1, len=vertices.length; ii<len; ii++) {
      tmp1 = geometryLeft.vertices[ii-1];
      tmp2 = geometryLeft.vertices[ii];

      p1 = new THREE.Vector3(tmp1.x, tmp1.y, tmp1.z);
      p2 = new THREE.Vector3(tmp2.x, tmp2.y, tmp2.z);

      let length = p1.distanceTo(p2);
      let height = 0.01;
      let width = 0.1;

      let vector = p2.sub(p1);
      let axis = new THREE.Vector3(1, 0, 0);
      let center = p1.addScaledVector(vector, 0.5);
      let centerNoOffset = new THREE.Vector3(center.x, center.y, center.z).sub(offset);
      // debugger; // vector

      let boxGeometry = new THREE.BoxGeometry(length, width, height);

      allBoxes.merge(boxGeometry);
      let boxMaterial = new THREE.MeshBasicMaterial({color: 0xffffff});
      let boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);

      boxMesh.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
      // boxMesh.geometry.translate(centerNoOffset.x, centerNoOffset.y, centerNoOffset.z);
      // boxMesh.position.copy(offset.clone());
      boxMesh.position.copy(center.clone());

      lefts.push(boxMesh);
      spines.push(boxMesh);
      rights.push(boxMesh);

      if ((all.length%1)==0 || ii==(len-1)) {
        all.push(new THREE.Mesh(allBoxes, new THREE.MeshBasicMaterial({color:0xffffff})));
        allBoxes = new THREE.Geometry();
      }
    }




    // NOTE ORIGINAL:
    // lefts.push(new THREE.Line(geometryLeft, materialLeft) );
    // spines.push(new THREE.Line(geometrySpine, materialSpine) );
    // rights.push(new THREE.Line(geometryRight, materialRight) );
  }

  output = {
    left: lefts,
    spine: spines,
    right: rights,
    all: all
  }
  return output;
}
