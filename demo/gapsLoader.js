import { Vec3 } from "../schemas/BasicTypes_generated.js";
import { Flatbuffer } from "../schemas/VisualizationPrimitives_generated.js";

export function loadGaps(callback) {
  console.log("Hello World! -- Loading Gaps from VisualizationPrimitives");

  let filename = "../data/gaps.bin";

  const xhr = new XMLHttpRequest();
  xhr.open("GET", filename);
  xhr.responseType = "arraybuffer";
  xhr.onprogress = function(event) {
    console.log("GAPS -- Loaded ["+event.loaded+"] bytes")
  }


  xhr.onerror = function(e) {
    console.error("GAPS -- Error loading gaps: ", e);
  }

  xhr.onload = function(data) {

    const response = data.target.response;
    if (!response) {
      console.error("Could not create buffer from gaps data");
      return;
    }

    let bytesArray = new Uint8Array(response);
    let numBytes = bytesArray.length;
    let gaps = [];

    let segOffset = 0;
    let segSize, viewSize, viewData;
    while (segOffset < numBytes) {

      // Read SegmentSize:
      viewSize = new DataView(bytesArray.buffer, segOffset, 4);
      segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

      // Get Flatbuffer gao Object:
      segOffset += 4;
      let buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));

      let fbuffer = new flatbuffers.ByteBuffer(buf);
      let gap = Flatbuffer.Primitives.PolyLine3D.getRootAsPolyLine3D(fbuffer);
      gaps.push(gap);
      segOffset += segSize;
    }

    let gapGeometries = createGapGeometriesOld(gaps);

    callback(gapGeometries);
  }

  xhr.send();
}


function splitGapVertices(gaps) {
  debugger;

  let gapVertices = [];
  let gapLength, vtx, gapPoints;
  for (let ii=0, gapLength=gaps.length; ii<gapLength; ii++) {
    gap = gaps[ii];

    gapVertices = [];
    for (let jj=0, numGapVtx=gap.gapLength; jj<numGapVtx; jj++) {
      vtx = gap.vertices(jj);
      gapVertices.push( new THREE.Vector3(vtx.x(), vtx.y(), vtx.z()) );
    }
    gapVertices.push(gapVertices);


  }

  let output = {
      gapGroups: gapVertices,
  }

  return output;
}

function createGapGeometries(vertexGroups, material) {
  debugger;
  let gapGeometries = [];
  let allBoxes = new THREE.Geometry();

  let allLanes = [];
  let vertexGroup;
  let v1, v2;
  let length, width, height;
  let vector, axis;
  let center, firstCenter, delta;
  let boxGeometry, se3, quaternion;
  debugger; // vertexGroups.length
  for (let ii=0, len=vertexGroups.length; ii<len; ii++) {

    vertexGroup = vertexGroups[ii];

    for (let jj=1, numVertices=vertexGroup.length; jj<numVertices; jj++) {

      v1 = vertexGroup[jj-1];
      v2 = vertexGroup[jj];

      length = v1.distanceTo(v2);
      height = 0.01;
      width = 0.1;

      vector = v2.sub(v1);
      axis = new THREE.Vector3(1, 0, 0);
      center = v1.addScaledVector(vector, 0.5);

      if (firstCenter == undefined) {
        firstCenter = center.clone();
      }

      delta = center.clone().sub(firstCenter);
      lastCenter = center.clone();
      // debugger; // delta

      // Transform Box:
      boxGeometry = new THREE.BoxGeometry(length, width, height);
      se3 = new THREE.Matrix4();
      quaternion = new THREE.Quaternion().setFromUnitVectors(axis, vector.clone().normalize());
      // debugger; // se3;
      se3.makeRotationFromQuaternion(quaternion); // Rotation
      se3.setPosition(delta); // Translation

      boxGeometry.applyMatrix( se3 );
      allBoxes.merge(boxGeometry);

      if ((ii%10000)==0 || ii==(len-1)) {
        // let mesh = new THREE.Mesh(allBoxes, new THREE.MeshBasicMaterial({color:0x00ff00}));
        let mesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(allBoxes), material); // Buffergeometry
        mesh.position.copy(firstCenter);
        gapGeometries.push(mesh);
        allBoxes = new THREE.Geometry();
        firstCenter = center.clone();
      }


    }
  }

  return gapGeometries;
}


function createGapGeometriesOld(gaps) {
  const materialLeft = new THREE.LineBasicMaterial({
    color: 0xff0000
  });



  let gap;
  let lefts = [];

  let all = [];
  let allBoxes = new THREE.Geometry();
  for(let ii=0, len=gaps.length; ii<len; ii++) {
    gap = gaps[ii];

    var geometryLeft = new THREE.Geometry();  // TODO this is just a temporary variable to get an array of vertices later, do this in a better way

    let left;
    for(let jj=0, numVertices=gap.verticesLength(); jj<numVertices; jj++) {
      left = gap.vertices(jj);


      geometryLeft.vertices.push( new THREE.Vector3(left.x(), left.y(), left.z()));

    }




    // NOTE TRYING BOXES:
    let tmp1, tmp2, p1, p2, v1, v2;
    let firstCenter, center, lastCenter;
    let vertices = geometryLeft.vertices;
    let offset = new THREE.Vector3(300043.226, 4701247.907, 245.427); // TODO FIX THIS HARDCODED OFFSET (it's just a large number to bring the vertices below close to 0)

    createBoxes(geometryLeft.vertices, new THREE.MeshBasicMaterial({color:0xff0000}));

    function createBoxes(vertices, material) {
      for (let ii=1, len=vertices.length; ii<len; ii++) {
        tmp1 = vertices[ii-1];
        tmp2 = vertices[ii];

        p1 = new THREE.Vector3(tmp1.x, tmp1.y, tmp1.z);
        p2 = new THREE.Vector3(tmp2.x, tmp2.y, tmp2.z);




        let length = p1.distanceTo(p2);
        let width = 0.1;
        let height = 0.01;

        let vector = p2.sub(p1);
        let axis = new THREE.Vector3(1, 0, 0);
        center = p1.addScaledVector(vector, 0.5);
        let centerNoOffset = new THREE.Vector3(center.x, center.y, center.z).sub(offset);
        if (lastCenter == undefined) {
          lastCenter = center.clone();
          firstCenter = center.clone();
        }
        // debugger; // lastCenter.sub(center) or center.sub(lastCenter);
        // let delta = lastCenter.clone().sub(center);
        // let delta = center.clone().sub(lastCenter);
        let delta = center.clone().sub(firstCenter);
        lastCenter = center.clone();
        // debugger; // delta
        let geometry = new THREE.BoxGeometry(length, width, height);

        // for allBoxes:
        let boxGeometry = new THREE.BoxGeometry(length, width, height);
        let se3 = new THREE.Matrix4();
        let quaternion = new THREE.Quaternion().setFromUnitVectors(axis, vector.clone().normalize()); // TODO NOTE: This aligns the yaw but also applies a roll/pitch as well
        // debugger; // se3;
        se3.makeRotationFromQuaternion(quaternion); // Rotation
        se3.setPosition(delta); // Translation

        boxGeometry.applyMatrix( se3 );
        // TODO rotate boxGeometry.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
        allBoxes.merge(boxGeometry);


        let boxMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
        let boxMesh = new THREE.Mesh(geometry, boxMaterial);


        boxMesh.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
        // boxMesh.geometry.translate(centerNoOffset.x, centerNoOffset.y, centerNoOffset.z);
        // boxMesh.position.copy(offset.clone());
        boxMesh.position.copy(center.clone());

        lefts.push(boxMesh);



        if ((ii%100000)==0 || ii==(len-1)) {
          // let mesh = new THREE.Mesh(allBoxes, new THREE.MeshBasicMaterial({color:0x00ff00}));
          let mesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(allBoxes), material); // Buffergeometry
          mesh.name = "Gaps";
          mesh.position.copy(firstCenter);
          all.push(mesh);
          allBoxes = new THREE.Geometry();
          firstCenter = center.clone();
        }
      }
    }
  }

  const output = {
    left: lefts
  }
  return output;
}
