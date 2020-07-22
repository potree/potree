'use strict';
import { incrementLoadingBarTotal, updateLoadingBar } from "../common/overlay.js";
import { RtkTrajectory } from "../demo/RtkTrajectory.js";
import { loadTexturedCar } from "../demo/textureLoader.js";
import { getFbFileInfo } from "./loaderUtilities.js";
import { visualizationMode } from "../demo/paramLoader.js";
import { applyRotation } from "../demo/loaderUtilities.js";

let rtkFiles = null;
// sets local variable and returns so # files can be counted
export const rtkFlatbufferDownloads = async (datasetFiles) => {
  rtkFiles = await getFbFileInfo(datasetFiles,
                                 "rtk.fb", // 0_Preprocessed
                                 "RTK_generated.js", // 5_Schemas
                                 "../data/rtk.fb",
                                 "../schemas/RTK_generated.js");
  return rtkFiles
}

export async function loadRtkFlatbuffer(s3, bucket, name, callback) {
  if (!rtkFiles) {
    console.log("No rtk files present")
    return
  }

  if (s3 && bucket && name) {
    const schemaUrl = s3.getSignedUrl('getObject', {
      Bucket: bucket,
      Key: rtkFiles.schemaFile
    });

    const request = await s3.getObject({Bucket: bucket,
                  Key: rtkFiles.objectName},
                  async (err, data) => {
                    if (err) {
                      console.log(err, err.stack);
                    } else {
                      // const string = new TextDecoder().decode(data.Body);
                      // const {mpos, orientations, t_init, t_range} = parseRTK(string);
                      const FlatbufferModule = await import(schemaUrl);
                      const {mpos, orientations, timestamps, t_init, t_range} = await parseRTK(data.Body, FlatbufferModule);
                      await callback(mpos, orientations, timestamps, t_init, t_range);
                    }
                    incrementLoadingBarTotal("rtk flatbuffer loaded")
                  });
    request.on("httpDownloadProgress", async (e) => {
      await updateLoadingBar(e.loaded/e.total*100)
    });

    request.on("complete", () => {
      incrementLoadingBarTotal("rtk flatbuffer downloaded")
    });

  } else {

    let t0, t1;
    const tstart = performance.now();

    const xhr = new XMLHttpRequest();
    xhr.open("GET", rtkFiles.objectName);
    xhr.responseType = "arraybuffer";

    xhr.onprogress = async (e) => {
      await updateLoadingBar(e.loaded/e.total*100)
      t1 = performance.now();
      t0 = t1;
    }

    xhr.onload = async (data) => {
      incrementLoadingBarTotal("rtk flatbuffer downloaded")
      const FlatbufferModule = await import(rtkFiles.schemaFile);

      let uint8Array = new Uint8Array(data.target.response);

      const {mpos, orientations, timestamps, t_init, t_range} = await parseRTK(uint8Array, FlatbufferModule);
      await callback(mpos, orientations, timestamps, t_init, t_range);
      incrementLoadingBarTotal("rtk flatbuffer loaded")
    };

    t0 = performance.now();
    xhr.send();
  }
}

async function parseRTK(bytesArray, FlatbufferModule) {
  const t0_loop = performance.now();

  let numBytes = bytesArray.length;
  let rtkPoses = [];
  let mpos = [];
  let timestamps = [];
  let orientations = [];
  let adjustedOrientations = [];
  let allAdjustedOrientationsAreZero = true;
  let t_init, t_range;
  let count = 0;

  let segOffset = 0;
  let segSize, viewSize, viewData;
  while (segOffset < numBytes) {
    await updateLoadingBar(segOffset/numBytes*100); // update individual task progress

    // Read SegmentSize:
    viewSize = new DataView(bytesArray.buffer, segOffset, 4);
    segSize = viewSize.getUint32(0, true); // True: little-endian | False: big-endian

    // Get Flatbuffer RTK Pose Object:
    segOffset += 4;
    let buf = new Uint8Array(bytesArray.buffer.slice(segOffset, segOffset+segSize));
    let fbuffer = new flatbuffers.ByteBuffer(buf);
    let rtkPosesFB = FlatbufferModule.Flatbuffer.RTK.Poses.getRootAsPoses(fbuffer);

    // Extract RTK Pose Information:
    const epsilonSec = 0.01;
    for (let ii = 0, numPoses = rtkPosesFB.posesLength(); ii < numPoses; ii++) {
      let pose = rtkPosesFB.poses(ii);

      if (pose.timestamp() < epsilonSec) { // (!pose.isValid()) {
        continue;
      }

      if (count == 0)  {
        t_init = pose.timestamp();
      }
      t_range = pose.timestamp() - t_init;

      // Get UTM Position Data:
      if (pose.locXY) {
        mpos.push( [pose.locXY().x(), pose.locXY().y(), pose.pos().z()] );
      } else {
        mpos.push( [pose.utm().x(), pose.utm().y(), pose.utm().z()] );
      }

      // Get Orientation Data:
      if (pose.orientation) {
        orientations.push( [pose.orientation().z(), pose.orientation().y(), pose.orientation().x()] );
        window.usingAdjustedHeading = false;
      } else {
        orientations.push( [pose.roll(), pose.pitch(), pose.utm().yaw()] ); // TODO USE UTM-ADJUSTED ROLL/PITCH EVENTUALLY
        window.usingAdjustedHeading = true;
      }

      timestamps.push(pose.timestamp());

      count += 1;
    }

    if (!window.usingAdjustedHeading) {
      console.error("NOT USING ADJUSTED HEADING FOR RTK POSES");
    }

    // rtkPoses.push(pose);
    segOffset += segSize;
  }
  return {mpos, orientations, timestamps, t_init, t_range};
}

// Load RTK: utilizes loadRtkFlatbuffer and adds callbacks to it
export function loadRtkCallback(s3, bucket, name, callback) {
	// loadRtk(s3, bucket, name, (pos, rot, timestamps, t_init, t_range) => {
	loadRtkFlatbuffer(s3, bucket, name, (pos, rot, timestamps, t_init, t_range) => {
		window.timeframe = { "tstart": t_init, "tend": t_init + t_range };

		let tstart = window.timeframe.tstart;	// Set in loadRtkCallback
		let tend = window.timeframe.tend;			// Set in loadRtkCallback
		let playbackRate = 1.0;
		animationEngine.configure(tstart, tend, playbackRate);
		animationEngine.launch();

		if (callback) {
			callback();
		}

		const path = pos.map(v => new THREE.Vector3(...v));
		const orientations = rot.map(v => new THREE.Vector3(...v));
		const samplingFreq = 100; // Hertz TODO hardcoded
		const rtkTrajectory = new RtkTrajectory(path, orientations, timestamps, samplingFreq);

		// load the car's object into the viewer with texture
		loadTexturedCar(rtkTrajectory, pos, rot);

		// RTK TweenTarget Callback:
		animateRTK();
	});
}


 // animates the viewer camera and TweenTarget for RTK
// once textured vehicle object is created
function animateRTK() {
	window.updateCamera = true;
	window.pitchThreshold = 1.00;
	animationEngine.tweenTargets.push((gpsTime) => {
		try {
			let t = (gpsTime - animationEngine.tstart) / (animationEngine.timeRange);
			// vehicle contains all the work done by textureLoader
			let vehicle = viewer.scene.scene.getObjectByName("Vehicle");
                        const mesh = vehicle.getObjectByName("Vehicle Mesh");
                        const meshPosition = new THREE.Vector3();
		        let lastRtkPoint = vehicle.position.clone();
			let lastRtkOrientation = vehicle.rotation.clone();
			let lastTransform = vehicle.matrixWorld.clone();
			// debugger; //vehicle
			let state = vehicle.rtkTrajectory.getState(gpsTime);
			let rtkPoint = state.pose.clone();
			let vehicleOrientation = state.orient.clone();
			vehicle.position.copy(rtkPoint);
			if (visualizationMode == "aptivLanes") {
				vehicle.position.add(new THREE.Vector3(0, 0, 1000));
			}
			applyRotation(vehicle, vehicleOrientation.x, vehicleOrientation.y, vehicleOrientation.z);
			vehicle.updateMatrixWorld();

			// Apply Transformation to Camera and Target:
			if (window.updateCamera) {
				let newTransform = vehicle.matrixWorld.clone();
				let lastTransformInverse = lastTransform.getInverse(lastTransform);
				let deltaTransform = lastTransformInverse.premultiply(newTransform);
				let target = viewer.scene.view.position.clone();
				let direction = viewer.scene.view.direction.clone();
				let radius = viewer.scene.view.radius;
				target.add(direction.multiplyScalar(radius));
				viewer.scene.view.position.applyMatrix4(deltaTransform);
				if (Math.abs(viewer.scene.view.pitch) < window.pitchThreshold) {
					viewer.scene.view.lookAt(target.applyMatrix4(deltaTransform));
				}
			}

			// Set Elevation:
			// let elevationDeltaMin = -0;
			// let elevationDeltaMax = 2;
			let clouds = viewer.scene.pointclouds;
                        const elevationWindow = window.animationEngine.elevationWindow;
                        const {min, max} = elevationWindow;
                        const elevationMin = Number(min);
                        const elevationMax = Number(max);
			for (let ii = 0, numClouds = clouds.length; ii < numClouds; ii++) {
                                meshPosition.setFromMatrixPosition(mesh.matrixWorld);
                                const zheight = meshPosition.z;
                                // Is this setting ever used?
			        elevationWindow.z = zheight;
			        viewer.scene.pointclouds[ii].material.elevationRange = [zheight + elevationMin, zheight + elevationMax];
				// TODO set elevation slider range extent
			}

			// Save Current RTK Pose in Uniforms:
			for (let ii = 0, numClouds = clouds.length; ii < numClouds; ii++) {
				let material = clouds[ii].material;
				material.uniforms.currentRtkPosition.value = state.pose.clone();
				material.uniforms.currentRtkOrientation.value = state.orient.clone();
			}
		} catch (e) {
			console.error("Caught error: ", e);
		}
	});
}
