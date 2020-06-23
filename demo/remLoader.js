'use strict';
import { getShaderMaterial } from "../demo/paramLoader.js"
import { updateLoadingBar, incrementLoadingBarTotal } from "../common/overlay.js";
import { existsOrNull } from "./loaderHelper.js"



// sets local variable and returns so # files can be counted
const remFiles = {objectName: null, schemaFile: null}
export const remDownloads = async (datasetFiles) => {
  const isLocalLoad = datasetFiles == null
  const localObj = `../data/control_point_3_rtk_relative.fb`;
  const localSchema = "../schemas/VisualizationPrimitives_generated.js";
  const objNameMatch = "control_point_3_rtk_relative.fb" // 3_Assessments
  const schemaMatch = "VisualizationPrimitives_generated.js" // 5_Schemas
  remFiles.objectName = isLocalLoad ?
    await existsOrNull(localObj) : datasetFiles.filter(path => path.endsWith(objNameMatch))[0]
  remFiles.schemaFile = isLocalLoad ?
    await existsOrNull(localSchema) : datasetFiles.filter(path => path.endsWith(schemaMatch))[0]
  return remFiles
}

export async function loadRem(s3, bucket, name, remShaderMaterial, animationEngine, callback) {
  const tstart = performance.now();
  if (remFiles.objectName == null || remFiles.schemaFile == null) {
    console.log("No REM files present")
    return
  }

  //is name here the dataset name? We should be more careful about that....
  if (s3 && bucket && name) {
    (async () => {
      const schemaUrl = s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: remFiles.schemaFile
      });
      const request = await s3.getObject({Bucket: bucket,
                    Key: remFiles.objectName},
                    async (err, data) => {
                    if (err) {
                      console.log(err, err.stack);
                    } else {
                      const FlatbufferModule = await import(schemaUrl);
                      const remSphereMeshes = await parseControlPoints(data.Body, remShaderMaterial, FlatbufferModule, animationEngine);
                      await callback( remSphereMeshes );
                    }
                    incrementLoadingBarTotal("loaded rem")
                  });
      request.on("httpDownloadProgress", async (e) => {
        await updateLoadingBar(e.loaded/e.total * 100)
      });
      
      request.on("complete", () => {
        incrementLoadingBarTotal("downloaded rem")
      });
    })();

  } else {
    let t0, t1;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", remFiles.objectName);
    xhr.responseType = "arraybuffer";

    xhr.onprogress = async (e) => {
      await updateLoadingBar(e.loaded/e.total*100)
      t1 = performance.now();
      t0 = t1;
    }

    xhr.onload = async function(data) {
      incrementLoadingBarTotal("downloaded rem")
      const FlatbufferModule = await import(remFiles.schemaFile);

      const response = data.target.response;
      if (!response) {
        console.error("Could not create buffer from lane data");
        return;
      }

      const bytesArray = new Uint8Array(response);
      const remSphereMeshes = await parseControlPoints(bytesArray, remShaderMaterial, FlatbufferModule, animationEngine);
      await callback( remSphereMeshes );
      incrementLoadingBarTotal("loaded rem")
    };

    t0 = performance.now();
    xhr.send();
  }
}

// parse control points from flatbuffers
async function parseControlPoints(bytesArray, remShaderMaterial, FlatbufferModule, animationEngine) {

  const numBytes = bytesArray.length;
  const controlPoints = [];

  let segOffset = 0;
  let segSize, viewSize, viewData;
  while (segOffset < numBytes) {

    // Read SegmentSize:
    viewSize = new DataView(bytesArray.buffer, segOffset, 4);
    segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

    // Get Flatbuffer Gap Object:
    segOffset += 4;
    const buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
    const fbuffer = new flatbuffers.ByteBuffer(buf);
    const point = FlatbufferModule.Flatbuffer.Primitives.Sphere3D.getRootAsSphere3D(fbuffer);

    controlPoints.push(point);
    segOffset += segSize;
  }
  return await createControlMeshes(controlPoints, remShaderMaterial, FlatbufferModule, animationEngine);
}


async function createControlMeshes(controlPoints, remShaderMaterial, FlatbufferModule, animationEngine) {
  const allSpheres = [];
  const controlTimes = [];
  for(let ii=0, len=controlPoints.length; ii<len; ii++) {
    if (ii % 1000 == 0) {
      await updateLoadingBar(ii/len * 100); // update individual task progress
    }
    const point = controlPoints[ii];

    const vertex = {x: point.pos().x(), y: point.pos().y(), z: point.pos().z()};
    const radius = 0.25;//point.radius();
    const timestamp = point.viz(new FlatbufferModule.Flatbuffer.Primitives.HideAndShowAnimation())
    .timestamp(new FlatbufferModule.Flatbuffer.Primitives.ObjectTimestamp())
    .value() - animationEngine.tstart;
    
    
    const timestampArray = new Float64Array(64).fill(timestamp)

    const sphereGeo = new THREE.SphereBufferGeometry(radius);
    remShaderMaterial.uniforms.color.value = new THREE.Color(0x00ffff);
    const sphereMesh = new THREE.Mesh(sphereGeo, remShaderMaterial);
    sphereMesh.position.set(vertex.x, vertex.y, vertex.z);
    sphereMesh.geometry.addAttribute('gpsTime', new THREE.Float32BufferAttribute(timestampArray, 1));
    allSpheres.push(sphereMesh);
  }
  return allSpheres;
}



//load REM control points
export async function loadRemCallback(s3, bucket, name, animationEngine) {
	const shaderMaterial = getShaderMaterial();
	const remShaderMaterial = shaderMaterial.clone();
	await loadRem(s3, bucket, name, remShaderMaterial, animationEngine, (sphereMeshes) => {
		const remLayer = new THREE.Group();
    remLayer.name = "REM Control Points";
    sphereMeshes.forEach(mesh => remLayer.add(mesh))

		viewer.scene.scene.add(remLayer);
		const e = new CustomEvent("truth_layer_added", {detail: remLayer, writable: true});
		viewer.scene.dispatchEvent({
			"type": "sensor_layer_added",
			"sensorLayer": remLayer
		});

		// TODO check if group works as expected, then trigger "truth_layer_added" event
		animationEngine.tweenTargets.push((gpsTime) => {
			const currentTime = gpsTime - animationEngine.tstart;
			remShaderMaterial.uniforms.minGpsTime.value = currentTime + animationEngine.activeWindow.backward;
			remShaderMaterial.uniforms.maxGpsTime.value = currentTime + animationEngine.activeWindow.forward;
		});
	});
}
