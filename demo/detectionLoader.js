'use strict';
import { getLoadingBar, getLoadingBarTotal, setLoadingScreen, removeLoadingScreen } from "../common/overlay.js";
import { s3, bucket, name, getShaderMaterial } from "../demo/paramLoader.js"


export async function loadDetections(s3, bucket, name, shaderMaterial, animationEngine, callback) {
  let loadingBar = getLoadingBar();
  let loadingBarTotal = getLoadingBarTotal(); 
  let lastLoaded = 0;
  const tstart = performance.now();
  if (s3 && bucket && name) {
    (async () => {
      const objectName = `${name}/2_Truth/detections.fb`;
      const schemaFile = `${name}/5_Schemas/GroundTruth_generated.js`;

      const schemaUrl = s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: schemaFile
      });

      const request = s3.getObject({Bucket: bucket,
                    Key: objectName},
                   async (err, data) => {
                     if (err) {
                       console.log(err, err.stack);
                     } else {
                       const FlatbufferModule = await import(schemaUrl);
                       const detectionGeometries = parseDetections(data.Body, shaderMaterial, FlatbufferModule, animationEngine);
                       callback(detectionGeometries, );
                     }});
      request.on("httpDownloadProgress", (e) => {
        let val = e.loaded/e.total * 100;  
        val = Math.max(lastLoaded, val);
        loadingBar.set(val);
        lastLoaded = val;
      });
      
      request.on("complete", () => {
        loadingBar.set(100)
        loadingBarTotal.set(100);
        removeLoadingScreen();
      });
    })();

  } else {
    const filename = "../data/detections.fb";
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
        console.error("Could not create buffer from detection data");
        return;
      }

      let bytesArray = new Uint8Array(response);
      const detectionGeometries = parseDetections(bytesArray, shaderMaterial, FlatbufferModule, animationEngine);
      callback(detectionGeometries, );
    };

    t0 = performance.now();
    xhr.send();
  }
}

function parseDetections(bytesArray, shaderMaterial, FlatbufferModule, animationEngine) {

  let numBytes = bytesArray.length;
  let detections = [];

  let segOffset = 0;
  let segSize, viewSize, viewData;
  while (segOffset < numBytes) {

    // Read SegmentSize:
    viewSize = new DataView(bytesArray.buffer, segOffset, 4);
    segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

    // Get Flatbuffer Detection Object:
    segOffset += 4;
    let buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
    let fbuffer = new flatbuffers.ByteBuffer(buf);
    let detection = FlatbufferModule.Flatbuffer.GroundTruth.Detections.getRootAsDetections(fbuffer);

    detections.push(detection);
    segOffset += segSize;
  }

  return createDetectionGeometries(shaderMaterial, detections, animationEngine);
}

function createDetectionGeometries(shaderMaterial, detections, animationEngine) {

  let loadingBar = getLoadingBar();
  loadingBar.set(0);

  let lineMaterial = new THREE.LineBasicMaterial({
    color: 0x00ff00,
    transparent: true
  });

  let boxMaterial = new THREE.MeshNormalMaterial();

  let material = shaderMaterial;

  let detect;
  let bbox;
  let bboxs = [];
  let detectionPoints = [];
  let x0 = [];
  let y0 = [];
  let z0 = [];
  let firstTimestamp = true;
  let firstCentroid, delta;
  let allBoxes = new THREE.Geometry();
  let boxGeometry2;
  let detectTimes = [];
  let all = [];
  for (let ss=0, numDetections=detections.length; ss<numDetections; ss++) {
    let detection = detections[ss];

    for (let ii=0, len=detection.detectionsLength(); ii<len; ii++) {

      // Assign Current Detection:
      detect = detection.detections(ii);

      // Initializations:
      let centroidLocation = new THREE.Vector3( detect.centroid().x(), detect.centroid().y(), detect.centroid().z() );
      if (firstCentroid == undefined) {
        firstCentroid = centroidLocation;
      }

      delta = centroidLocation.clone().sub(firstCentroid);

      let length = detect.majorAxis();
      let width = detect.minorAxis();
      let height = detect.height();

      let boxGeometry = new THREE.BoxGeometry(length, width, height);
      boxGeometry2 = boxGeometry.clone();

      var edges = new THREE.EdgesGeometry( boxGeometry ); // or WireframeGeometry( geometry )
      var wireframe = new THREE.LineSegments( edges, material.clone() ); // TODO don't clone material to assign to multiple meshes
      var boxMesh = wireframe;

      boxMesh.position.copy(centroidLocation);

      // Rotate BoxGeometry:
      let yaw = detect.heading();
      let zAxis = new THREE.Vector3(0, 0, 1); // TODO Hack until fb data gets fixed
      // let zAxis = p4.sub(p0);
      // zAxis.normalize();
      boxMesh.rotateOnAxis(zAxis, yaw);

      // debugger; // lhw yaw/rotation
      detectTimes.push(detect.timestamp()-animationEngine.tstart);


      let se3 = new THREE.Matrix4();
      let quaternion = new THREE.Quaternion().setFromAxisAngle(zAxis,yaw);
      se3.makeRotationFromQuaternion(quaternion); // Rotation
      se3.setPosition(delta); // Translation
      // debugger; // se3

      boxGeometry2.applyMatrix( se3 );
      // TODO rotate boxGeometry.quaternion.setFromUnitVectors(axis, vector.clone().normalize());
      allBoxes.merge(boxGeometry2);

      if ((ss%1000)==0 || ss==(numDetections-1)) {
        let bufferBoxGeometry = new THREE.BufferGeometry().fromGeometry(allBoxes);
        let edges = new THREE.EdgesGeometry( bufferBoxGeometry ); // or WireframeGeometry( geometry )
        let timestamps = [];
        for (let tt=0, numTimes=detectTimes.length; tt<numTimes; tt++) {
          for (let kk=0, numVerticesPerBox=24; kk<numVerticesPerBox; kk++) {  // NOTE: 24 vertices per edgesBox
            timestamps.push(detectTimes[tt]);
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
        detectTimes = [];
      }
    }
  }

  const output = {
    bbox: bboxs,
    x0: x0,
    y0: y0,
    z0: z0
  }

  return output;
}


export function addDetectionButton() {
window.detectionsLoaded = false;
	// Configure Playbar
	$("#load_detections_button")[0].style.display = "block"
	let loadDetectionsButton = $("#load_detections_button")[0];
	loadDetectionsButton.addEventListener("mousedown", () => {
		if (!window.detectionsLoaded) {
			$("#loading-bar")[0].style.display = "none";
			setLoadingScreen();
			let shaderMaterial = getShaderMaterial();
			let detectionShaderMaterial = shaderMaterial.clone();
			detectionShaderMaterial.uniforms.color.value = new THREE.Color(0xFFA500);
			loadDetections(s3, bucket, name, detectionShaderMaterial, animationEngine, (detectionGeometries) => {
				let detectionLayer = new THREE.Group();
				detectionLayer.name = "Object Detections";
				for (let ii = 0, len = detectionGeometries.bbox.length; ii < len; ii++) {
					detectionLayer.add(detectionGeometries.bbox[ii]);
				}
				viewer.scene.scene.add(detectionLayer);
				viewer.scene.dispatchEvent({
					"type": "truth_layer_added",
					"truthLayer": detectionLayer
				});
				animationEngine.tweenTargets.push((gpsTime) => {
					let currentTime = gpsTime - animationEngine.tstart;
					detectionShaderMaterial.uniforms.minGpsTime.value = currentTime - animationEngine.activeWindow.backward;
					detectionShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;
				});
				window.detectionsLoaded = true;
				loadDetectionsButton.disabled = true;
			});
			removeLoadingScreen();
		}
	});
}
