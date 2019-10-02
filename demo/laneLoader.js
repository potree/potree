import { Measure } from "../src/utils/Measure.js";



export async function loadLanes(s3, bucket, name, fname, supplierNum, annotationMode, callback) {
  const tstart = performance.now();

  // Logic for dealing with Map Supplier Data:
  const resolvedFilename = fname || 'lanes.fb';
  const resolvedSupplierNum = supplierNum || -1;
  let folderName = "2_Truth";
  let sep = "/";
  let datasetName = name;
  if (supplierNum > 0) {
    folderName = "";
    sep = "";
    datasetName = name.split("¶")[0];
  }

  if (s3 && bucket && name) {
    (async () => {
      const objectName = `${datasetName}/${folderName}${sep}${resolvedFilename}`;
      const schemaFile = `${name}/5_Schemas/GroundTruth_generated.js`;

      const schemaUrl = s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: schemaFile
      });

      s3.getObject({Bucket: bucket,
                    Key: objectName},
                   async (err, data) => {
                     if (err) {
                       console.log(err, err.stack);
                     } else {
                       const FlatbufferModule = await import(schemaUrl);
                       const laneGeometries = parseLanes(data.Body, FlatbufferModule, resolvedSupplierNum, annotationMode);
                       callback( laneGeometries );
                     }});
    })();

  } else {
    const filename = `../data/${resolvedFilename}`;
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
        console.error("Could not create buffer from lane data");
        return;
      }

      let bytesArray = new Uint8Array(response);
      const laneGeometries = parseLanes(bytesArray, FlatbufferModule, resolvedSupplierNum, annotationMode);
      callback( laneGeometries );
    };

    t0 = performance.now();
    xhr.send();
  }
}



function parseLanes(bytesArray, FlatbufferModule, supplierNum, annotationMode) {

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
    let lane = FlatbufferModule.Flatbuffer.GroundTruth.Lane.getRootAsLane(fbuffer);

    lanes.push(lane);
    segOffset += segSize;
  }
  return createLaneGeometriesOld(lanes, supplierNum, annotationMode);
}


function splitLaneVertices(lanes) {

  let leftVertices = [];
  let rightVertices = [];
  let spineVertices = [];

  let lane, vtx, laneVertices;
  for (let ii=0, numLanes=lanes.length; ii<numLanes; ii++) {

    lane = lanes[ii];

    laneVertices = [];
    for (let jj=0, numLeftVtx=lane.leftLength(); jj<numLeftVtx; jj++) {
      vtx = lane.left(jj);
      laneVertices.push( new THREE.Vector3(vtx.x(), vtx.y(), vtx.z()) );
    }
    leftVertices.push(laneVertices);

    laneVertices = [];
    for (let jj=0, numRightVtx=lane.rightLength(); jj<numRightVtx; jj++) {
      vtx = lane.right(jj);
      laneVertices.push( new THREE.Vector3(vtx.x(), vtx.y(), vtx.z()) );
    }
    rightVertices.push(laneVertices);

    laneVertices = [];
    for (let jj=0, numSpineVtx=lane.spineLength(); jj<numSpineVtx; jj++) {
      vtx = lane.spine(jj);
      spineVertices.push( new THREE.Vector3(vtx.x(), vtx.y(), vtx.z()) );
    }
    spineVertices.push(laneVertices);
  }

  let output = {
    leftGroups: leftVertices,
    rightGroups: rightVertices,
    spineGroups: spineVertices
  }

  return output;
}

function createLaneGeometries(vertexGroups, material) {

  let laneGeometries = [];
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
        laneGeometries.push(mesh);
        allBoxes = new THREE.Geometry();
        firstCenter = center.clone();
      }


    }
  }

  return laneGeometries;
}


function createLaneGeometriesOld(lanes, supplierNum, annotationMode) {

  let materialLeft, materialSpine, materialRight;
  switch (supplierNum) {

    case -2:
      materialLeft = new THREE.MeshBasicMaterial({color: 0x11870a});
      materialSpine = new THREE.MeshBasicMaterial({color: 0x11870a});
      materialRight = new THREE.MeshBasicMaterial({color: 0x11870a});
      break;

    case 1:
      materialLeft = new THREE.MeshBasicMaterial({color: 0x3aaeb7});
      materialSpine = new THREE.MeshBasicMaterial({color: 0x3aaeb7});
      materialRight = new THREE.MeshBasicMaterial({color: 0x3aaeb7});
      break;

    case 2:
      materialLeft = new THREE.MeshBasicMaterial({color: 0x3e3ab7});
      materialSpine = new THREE.MeshBasicMaterial({color: 0x3e3ab7});
      materialRight = new THREE.MeshBasicMaterial({color: 0x3e3ab7});
      break;

    case 3:
      materialLeft = new THREE.MeshBasicMaterial({color: 0xa63ab7});
      materialSpine = new THREE.MeshBasicMaterial({color: 0xa63ab7});
      materialRight = new THREE.MeshBasicMaterial({color: 0xa63ab7});
      break;

    default:
      materialLeft = new THREE.MeshBasicMaterial({color: 0xffffff});
      materialSpine = new THREE.MeshBasicMaterial({color: 0x00ff00});
      materialRight = new THREE.MeshBasicMaterial({color: 0xffffff});
  }

  let laneLeft, laneRight, laneSpine;
  laneLeft = new Measure(); laneLeft.name = "Lane Left"; laneLeft.closed = false; laneLeft.showCoordinates = true; laneLeft.showAngles = true;
  // laneSpine = new Measure(); laneSpine.name = "Lane Spine"; //laneRight.closed = false;
  laneRight = new Measure(); laneRight.name = "Lane Right"; laneRight.closed = false; laneRight.showCoordinates = true; laneRight.showAngles = true;


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

      if (annotationMode) {
        laneLeft.addMarker(new THREE.Vector3(left.x(), left.y(), left.z()));
      } else {
        geometryLeft.vertices.push( new THREE.Vector3(left.x(), left.y(), left.z()));
      }
    }

    for(let jj=0, numVertices=lane.rightLength(); jj<numVertices; jj++) {
      right = lane.right(jj);

      if (annotationMode) {
        laneRight.addMarker(new THREE.Vector3(right.x(), right.y(), right.z()));
      } else {
        geometryRight.vertices.push( new THREE.Vector3(right.x(), right.y(), right.z()));
      }
    }

    for(let jj=0, numVertices=lane.spineLength(); jj<numVertices; jj++) {
      spine = lane.spine(jj);

      if (annotationMode) {
        // laneSpine.addMarker(new THREE.Vector3(spine.x(), spine.y(), spine.z()));
      } else {
        geometrySpine.vertices.push( new THREE.Vector3(spine.x(), spine.y(), spine.z()));
      }
    }

    if (annotationMode) {
      continue;
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
    let firstCenter, center, lastCenter;
    let vertices = geometryLeft.vertices;

    createBoxes(geometryLeft.vertices, materialLeft);
    createBoxes(geometrySpine.vertices, materialSpine);
    createBoxes(geometryRight.vertices, materialRight);

    function createBoxes(vertices, material) {
      for (let ii=1, len=vertices.length; ii<len; ii++) {
        tmp1 = vertices[ii-1];
        tmp2 = vertices[ii];

        p1 = new THREE.Vector3(tmp1.x, tmp1.y, tmp1.z);
        p2 = new THREE.Vector3(tmp2.x, tmp2.y, tmp2.z);




        let length = Math.max(p1.distanceTo(p2), 0.001); // Clamp distance to min value of 1mm 
        let height = 0.01;
        let width = 0.1;

        let vector = p2.sub(p1);
        let axis = new THREE.Vector3(1, 0, 0);
        center = p1.addScaledVector(vector, 0.5);
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
        let quaternion = new THREE.Quaternion().setFromUnitVectors(axis, vector.clone().normalize());
        // debugger; // se3;
        se3.makeRotationFromQuaternion(quaternion); // Rotation
        se3.setPosition(delta); // Translation

        boxGeometry.applyMatrix( se3 );
        // TODO rotate boxGeometry.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
        allBoxes.merge(boxGeometry);

        if ((ii%100000)==0 || ii==(len-1)) {
          // let mesh = new THREE.Mesh(allBoxes, new THREE.MeshBasicMaterial({color:0x00ff00}));
          let mesh = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(allBoxes), material); // Buffergeometry
          mesh.position.copy(firstCenter);
          all.push(mesh);
          allBoxes = new THREE.Geometry();
          firstCenter = center.clone();
        }
      }
    }





    // NOTE ORIGINAL:
    // lefts.push(new THREE.Line(geometryLeft, materialLeft) );
    // spines.push(new THREE.Line(geometrySpine, materialSpine) );
    // rights.push(new THREE.Line(geometryRight, materialRight) );
  }

  if (annotationMode) {
    all.push(laneLeft);
    // all.push(laneSpine);
    all.push(laneRight);
  }

  let output = {
    all: all
  }
  return output;
}
