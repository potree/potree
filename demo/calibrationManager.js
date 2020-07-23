'use strict';

import { updateLoadingBar, incrementLoadingBarTotal } from "../common/overlay.js";
import { getFileInfo } from "./loaderUtilities.js";

export async function storeCalibration(s3, bucket, name, callback) {
  // TODO
}

export async function loadRtk2Vehicle(s3, bucket, name) {

  // TODO Hardcoded defaults for now
  const rtk2Vehicle = {
    x:0, y:0, z:-2,
    roll:0, pitch:0, yaw:Math.PI/2
  }

  return rtk2Vehicle;
}

let calFiles = null;
export const calDownloads = async (datasetFiles) => {
  // ${name}/7_cals/extrinsics.txt
  calFiles = await getFileInfo(datasetFiles,
                               "extrinsics.txt",
                               "../cals/extrinsics.txt");
  return calFiles;
}

export async function loadVelo2Rtk(s3, bucket, name) {
  if (!calFiles) {
    console.log("No calibration files present")
    return null;
  }

  //is name here the dataset name? We should be more careful about that....
  if (s3 && bucket && name) {
    try {
      const request = s3.getObject({Bucket: bucket,
                                    Key: calFiles.objectName});
      request.on("httpDownloadProgress", async (e) => {
        await updateLoadingBar(e.loaded/e.total*100)
      });
      const data = await request.promise();
      incrementLoadingBarTotal("cals downloaded")
      const schemaUrl = s3.getSignedUrl('getObject', {
        Bucket: bucket,
        Key: calFiles.schemaFile
      });
      const calibrationText = new TextDecoder("utf-8").decode(data.Body);
      const extrinsics = parseCalibrationFile(calibrationText);
      incrementLoadingBarTotal("cals loaded")
      return extrinsics;
    } catch (err) {
      console.error('Error loading extrinsics.txt', err, err.stack);
      return null;
    }
  } else {
    try {
      const response = await fetch(calFiles.objectName);
      incrementLoadingBarTotal("cals downloaded")
      const extrinsics = parseCalibrationFile(response.text());
      incrementLoadingBarTotal("cals loaded")
      return extrinsics;
    } catch (err) {
      console.error('Error loading extrinsics.txt', err, err.stack);
      return null;
    }
  }
}

function parseCalibrationFile(calibrationText){

  let velo2Rtk = {
    x: 0, y:0, z:0, roll:0, pitch:0, yaw:0, version:1.0
  }

  const lines = calibrationText.split("\n");
  const stringXYZ = lines[0].split(", ");
  const stringRPY = lines[1].split(", ");

  // TODO add validation for results from Number() below:
  velo2Rtk.x = Number(stringXYZ[0]);
  velo2Rtk.y = Number(stringXYZ[1]);
  velo2Rtk.z = Number(stringXYZ[2]);

  velo2Rtk.roll  = Number(stringRPY[0]);
  velo2Rtk.pitch = Number(stringRPY[1]);
  velo2Rtk.yaw   = Number(stringRPY[2]);

  let vals = Object.values(velo2Rtk);
  const allValid = vals.reduce((acc, cur) => acc && !isNaN(cur), true)

  if (!allValid){
    console.error("Error parsing extrinsics file ", velo2Rtk);
    return null;
  }

  if (lines.length > 2) {
    const versionStr = lines[2].split("version: ")[1];
    velo2Rtk.version = Number(versionStr);
  }

  return velo2Rtk;
}

export function addCalibrationButton() {
	// Listener to store pointcloud material as calibration extrinsics get updated
	window.addEventListener("update-calibration-panel", (e) => {
		console.log("calibration panel updated: ", e.detail);
		const id = e.detail.id;
		const dim = e.detail.dim;
		const val = e.detail.value;

		for (const cloud of viewer.scene.pointclouds) {
			let material = cloud.material;

			if (id == "rtk2vehicle") {
				let rtk2Vehicle = getRtk2Vehicle();
				let vehicleMesh = viewer.scene.scene.getObjectByName("Vehicle").getObjectByName("Vehicle Mesh");

				// Apply Transformations to Vehicle:
				let translation = new THREE.Vector3(rtk2Vehicle.x, rtk2Vehicle.y, rtk2Vehicle.z);
				vehicleMesh.position.copy(translation);
				vehicleMesh.rotation.set(rtk2Vehicle.roll, rtk2Vehicle.pitch, rtk2Vehicle.yaw);

				// Store updated values in mesh:
				material.uniforms.rtk2VehicleXYZNew = { type: "v3", value: new THREE.Vector3(rtk2Vehicle.x, rtk2Vehicle.y, rtk2Vehicle.z) };
				material.uniforms.rtk2VehicleRPYNew = { type: "v3", value: new THREE.Vector3(rtk2Vehicle.roll, rtk2Vehicle.pitch, rtk2Vehicle.yaw) };

			} else if (id == "velo2rtk") {

				let velo2Rtk = getVelo2Rtk();
				material.uniforms.velo2RtkXYZNew = { type: "v3", value: new THREE.Vector3(velo2Rtk.x, velo2Rtk.y, velo2Rtk.z) };
				material.uniforms.velo2RtkRPYNew = { type: "v3", value: new THREE.Vector3(velo2Rtk.roll, velo2Rtk.pitch, velo2Rtk.yaw) };

			} else {
				console.error("Unknown Calibration Extrinsics Id:", id);
			}
		}
	});

	window.canEnableCalibrationPanels = true;
}
