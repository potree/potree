"use strict"
import { runForLocalDevelopment, s3, bucket, name } from "../demo/paramLoader.js"
import { PointAttributeNames } from "../src/loader/PointAttributes.js";
import { togglePointClass } from "../common/custom-sidebar.js"

export async function storeCalibration(s3, bucket, name, callback) {
  // TODO
}

export async function loadRtk2Vehicle(s3, bucket, name, callback) {

  // TODO Hardcoded defaults for now
  const rtk2Vehicle = {
    x:0, y:0, z:-2,
    roll:0, pitch:0, yaw:Math.PI/2
  }

  callback(rtk2Vehicle);
}

export async function loadVelo2Rtk(s3, bucket, name, callback) {
  const tstart = performance.now();
  //is name here the dataset name? We should be more careful about that....
  if (s3 && bucket && name) {
    (async () => {
      const objectName = `${name}/7_Cals/extrinsics.txt`

      try {
        const data = await s3.getObject({Bucket: bucket, Key: objectName}).promise();
        const calibrationText = new TextDecoder("utf-8").decode(data.Body);
        const extrinsics = parseCalibrationFile(calibrationText);
        await callback( extrinsics );
      } catch (err) {
        console.log(err, err.stack);
        await callback(null);
      }

    })();

  } else {
    const filename = `../cals/extrinsics.txt`;
    let t0, t1;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", filename);
    xhr.responseType = "text";

    xhr.onprogress = function(event) {
      t1 = performance.now();
      t0 = t1;
    }

    xhr.onload = function(data) {

      const calibrationText = data.target.responseText;
      if (!calibrationText) {
        console.error("Could not create load calbiration file");
        return;
      }

      const velo2Rtk = parseCalibrationFile(calibrationText);
      callback( velo2Rtk );
    };

    xhr.onerror = function(err) {
      console.log(err, err.stack);
      callback(null);
    }

    t0 = performance.now();
    xhr.send();
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
	function canUseCalibrationPanels(attributes) {
		let hasRtkPose = false;
		let hasRtkOrient = false;
		for (let attr of attributes) {
			hasRtkPose = hasRtkPose || (attr.name === PointAttributeNames.RTK_POSE);
			hasRtkOrient = hasRtkOrient || (attr.name === PointAttributeNames.RTK_ORIENT);
		}
		return hasRtkPose && hasRtkOrient
	}

	// Load Pointclouds
	if (runForLocalDevelopment) {
		Potree.loadPointCloud("../pointclouds/test/cloud.js", "full-cloud", e => {
			const pointcloud = e.pointcloud;
			const material = pointcloud.material;
			viewer.scene.addPointCloud(pointcloud);
			material.pointColorType = Potree.PointColorType.INTENSITY; // any Potree.PointColorType.XXXX
			material.gradient = Potree.Gradients.GRAYSCALE; // Can define custom gradient or look up in Potree.Gradients
			material.size = 0.09;
			material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
			material.shape = Potree.PointShape.SQUARE;

			let cloudCanUseCalibrationPanels = canUseCalibrationPanels(pointcloud.pcoGeometry.pointAttributes.attributes);
			window.canEnableCalibrationPanels = window.canEnableCalibrationPanels && cloudCanUseCalibrationPanels;

			if (window.canEnableCalibrationPanels) {
				$(document).ready(() => enablePanels());

			} else {
				$(document).ready(() => {
					let reason = "Pointcloud was not serialized with the necessary point attributes"
					disablePanels(reason);
					console.error("Cannot use calibration panels: ", reason);
				});
			}
		});

	} else {
		Potree.loadPointCloud({ s3, bucket, name }, name.substring(5), e => {
			const pointcloud = e.pointcloud;
			const material = pointcloud.material;
			viewer.scene.addPointCloud(pointcloud);
			material.pointColorType = Potree.PointColorType.INTENSITY; // any Potree.PointColorType.XXXX
			material.gradient = Potree.Gradients.GRAYSCALE;
			material.size = 0.09;
			material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
			material.shape = Potree.PointShape.SQUARE;

			let cloudCanUseCalibrationPanels = canUseCalibrationPanels(pointcloud.pcoGeometry.pointAttributes.attributes);
			window.canEnableCalibrationPanels = window.canEnableCalibrationPanels && cloudCanUseCalibrationPanels;

			if (window.canEnableCalibrationPanels) {
				$(document).ready(() => enablePanels());

			} else {
				$(document).ready(() => {
					disablePanels("Pointcloud was not serialized with the necessary point attributes");
					console.error("Cannot use calibration panels");
				});
			}

			$("#playbutton").click();
		});
	}
}