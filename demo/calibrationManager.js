'use strict';

import { updateLoadingBar, incrementLoadingBarTotal } from "../common/overlay.js";
import { getFileInfo } from "./loaderUtilities.js";
import { getVelo2Rtk, getRtk2Vehicle, storeVelo2Rtk, storeRtk2Vehicle } from "../common/calibration-panels.js"


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
  const extrinsicsCal = await getFileInfo(datasetFiles,
                               "extrinsics.txt",
                               "../cals/extrinsics.txt");

  const nominalCal = await getFileInfo(datasetFiles,
                               "extrinsics-nominal.txt",
                               "../cals/extrinsics-nominal.txt");
  const metadataCal = await getFileInfo(datasetFiles,
                               "metadata_processing.json",
                               "../cals/metadata_processing.json");

  if (extrinsicsCal || nominalCal || metadataCal) {
    calFiles = {
      extrinsics: extrinsicsCal ? extrinsicsCal : null,
      nominal: nominalCal ? nominalCal : null,
      metadata: metadataCal ? metadataCal : null
    };
  }

  return calFiles;
}

export const getCalibrationSettings = (correctionsCal, nominalCal, vatCal) => {

  const correctionsCalVersion = correctionsCal ? correctionsCal.version || 0.0 : 0.0;
  const nominalCalVersion = nominalCal ? nominalCal.version || 0.0 : 0.0;
  const vatCalVersion = vatCal ? vatCal.version || 0.0 : 0.0;

  let settings = {

    // Calibration File version 2+ uses adjusted UTM heading, while versions earlier do not
    useAdjustedUTMHeading: correctionsCalVersion >= 2.0, 

    // Calibration File version 3+ separates out VAT file from extrinsics
    // Meaning VAT parameters must be provided as input, and VAT transform must be used explicitly in reconstruction chain 
    // Nominal base calibration should also be specified, but can use default values (which may lead to incorrect reconstruction)
    useVatParameters: correctionsCalVersion >= 3.0,

    // Store which calibrations are specified as passive transforms:
    correctionsIsPassiveTransform: correctionsCalVersion >= 3.0 || correctionsCalVersion == 0.0, // Only version 3.0+ is specified as passive transform
    nominalIsPassiveTransform: true,   // Always specified as passive transform
    vatIsPassiveTransform: true        // Always specified as passive trasnform
  };

  // Check validity of settings and store in settings:
  settings.valid = validateCalibrationSettings(settings, correctionsCal, nominalCal, vatCal);

  // debugger;
  return settings;
}

function validateCalibrationSettings(settings, correctionsCal, nominalCal, vatCal) {
  
  let valid = true;

  // Check if corrections cal is present:
  if (!correctionsCal) {
    console.error("Calibration Settings INVALID - No extrinsics/corrections calibration file present, which is required for calibration");
    return false;
  }

  // Check 1: If using vat parameters, need to have all calibration files (corrections, nominal and vat)
  if (settings.useVatParameters && (!correctionsCal || !nominalCal || !vatCal)) {
    let missingFiles = [
      !correctionsCal ? "corrections" : null,
      !nominalCal ? "nominal" : null,
      !vatCal ? "metadata/VAT" : null
    ].filter(elem => elem);

    console.error(`Calibration Settings INVALID - calibration using VAT parameters specified however missing required calibration files [missing: ${missingFiles}]`);

    return false;
  } 

  // Other checks?

  return valid;
}

/**
 * Get 4x4 transformation matrix
 * @param extrinsics Object containing the fields [x, y, z, roll, pitch, yaw] (meters and radians)
 * @param isPassiveTransform flag indicating whether to return active or passive form of transformation matrix 
 * @return 4x4 transformation matrix
 */
export function getTxMat(extrinsics, isPassiveTransform) {

  // Initialize Transform Matrix (as identity)
  const transform = new THREE.Matrix4();
  
  // Generate Rotation from Euler Angles:
  const euler = new THREE.Euler(extrinsics.roll, extrinsics.pitch, extrinsics.yaw, 'ZYX');

  // Construct Transformation Matrix:
  transform.makeRotationFromEuler(euler);
  transform.setPosition(new THREE.Vector3(extrinsics.x, extrinsics.y, extrinsics.z));

  // Return inverse of transform if passive transform:
  return isPassiveTransform ? new THREE.Matrix4().getInverse(transform) : transform; 
}

function getAdjustedTransformSimple(originalExtrinsics, newExtrinsics, settings) {
  console.log("Updating Adjusted Transform [simple]");

  // Construct Reverse Transformation Matrices from newExtrinsics:
  const T_ISO2Velo = new THREE.Matrix4().getInverse(getTxMat(originalExtrinsics, settings.correctionsIsPassiveTransform)); // Inverse 

  // Construct Forward Transformation Matrices from originalExtrinsics:
  const T_Velo2ISO = getTxMat(newExtrinsics, settings.correctionsIsPassiveTransform);

  // Chain Reverse and Forward Transformations:
  const adjustedTransformSimple = new THREE.Matrix4().multiplyMatrices(T_ISO2Velo, T_Velo2ISO); // T_ISO2Velo x T_Velo2ISO

  return adjustedTransformSimple;
}

function getAdjustedTransformFull(originalCorrections, nominalCal, vatCal, newCorrections, settings) {
  console.log("Updating Adjusted Transform [full]");

  // Helper Function to define inverse
  const inverse = (transform) => { 
    return new THREE.Matrix4().getInverse(transform) 
  };

  // Construct Forward Transformation Matrices:
  const T1_Velo2Corr = getTxMat(newCorrections, settings.correctionsIsPassiveTransform);
  const T2_Corr2IMU = getTxMat(nominalCal, settings.nominalIsPassiveTransform);
  const T3_IMU2Veh = getTxMat(vatCal, settings.vatIsPassiveTransform);
  const T4_Veh2ISO = getTxMat({x:0, y:0, z:0, roll:Math.PI, pitch:0, yaw:0}, true); // Transform from OxTS Vehicle Frame to ISO 8855 Vehicle frame is defined as a roll of 180 degrees

  // Forward Chain:
  // T_forward = T4_Veh2ISO * T3_IMU2Veh * T2_Corr2IMU * T1_Velo2Corr 
  const T_forward = new THREE.Matrix4().premultiply(T1_Velo2Corr)
                                       .premultiply(T2_Corr2IMU)
                                       .premultiply(T3_IMU2Veh)
                                       .premultiply(T4_Veh2ISO);

  // Construct Reverse Transformation Matrices:
  const T5_ISO2Veh = inverse(T4_Veh2ISO);
  const T6_Veh2IMU = inverse(T3_IMU2Veh);
  const T7_IMU2Corr = inverse(T2_Corr2IMU);
  const T8_Corr2Velo = inverse(getTxMat(originalCorrections, settings.correctionsIsPassiveTransform));

  // Reverse Chain: 
  // T_reverse =  T8_Velo2Corr * T7_IMU2Corr * T6_Veh2IMU * T5_ISO2Veh 
  const T_reverse = new THREE.Matrix4().premultiply(T5_ISO2Veh)
                                       .premultiply(T6_Veh2IMU)
                                       .premultiply(T7_IMU2Corr)
                                       .premultiply(T8_Corr2Velo);

  // Full Chain: 
  // T_full = T_forward * T_reverse
  // Explanation: This transform takes a point from ISO 8855 Vehicle Frame to Velodyne Frame (using the reverse transform based on original extrinsics), 
  //              and then from Velodyne Frame to the new ISO Vehicle Frame (using the forward transform based on new extrinsics) 
  const adjustedTransformFull = new THREE.Matrix4().multiplyMatrices(T_forward, T_reverse);

  return adjustedTransformFull;
}

export const getAdjustedTransform = (correctionsCal, nominalCal, vatCal, calibrationPanelCorrections, settings) => {

  let transform =  new THREE.Matrix4(); // Identity matrix

  if (settings.valid) {
    if (settings.useVatParameters) {

      transform = getAdjustedTransformFull(correctionsCal, nominalCal, vatCal, calibrationPanelCorrections, settings);

    } else {

      transform = getAdjustedTransformSimple(correctionsCal, calibrationPanelCorrections, settings);

    }
  }

  return transform;
} 

// NOTE: calType is one of the following: ["extrinsics", "nominal", "metadata"]
export async function loadCalibrationFile(s3, bucket, name, calType) {
  if (!calFiles) {
    console.log("No calibration files present")
    return null;
  }

  //is name here the dataset name? We should be more careful about that....
  if (s3 && bucket && name) {
    try {
      const request = s3.getObject({
        Bucket: bucket,
        Key: calFiles[calType].objectName,
      });
      request.on("httpDownloadProgress", async (e) => {
        await updateLoadingBar(e.loaded/e.total*100)
      });
      const data = await request.promise();
      incrementLoadingBarTotal("cals downloaded");

      let calibration;
      const calibrationText = new TextDecoder("utf-8").decode(data.Body);
      if (calType === 'metadata') {
        calibration = parseMetadataFile(calibrationText, calType);
      } else if (calType === 'extrinsics' || calType === 'nominal') {
        calibration = parseCalibrationFile(calibrationText, calType);
      } else {
        console.error("Cannot parse unknown calibration file type: ", calType);
      }
      incrementLoadingBarTotal("cals loaded");
      return calibration;
    } catch (err) {
      console.error(`Error loading calibration file: ${calType}`, err, err.stack);
      incrementLoadingBarTotal("cals loaded");
      return null;
    }
  } else {
    try {
      const response = await fetch(calFiles[calType].objectName);
      incrementLoadingBarTotal("cals downloaded");

      let calibration;
      if (calType === 'metadata') {
        calibration = parseMetadataFile(await response.text(), calType); 
      } else if (calType === 'extrinsics' || calType === 'nominal') {
        calibration = parseCalibrationFile(await response.text(), calType);
      } else {
        console.error("Cannot parse unknown calibration file type: ", calType);
      }
      incrementLoadingBarTotal("cals loaded");
      return calibration;
    } catch (err) {
      console.error('Error loading calibration file', err, err.stack);
      incrementLoadingBarTotal("cals loaded");
      return null;
    }
  }
}

function parseMetadataFile(calibrationText, calibrationType) {

  const calibration = JSON.parse(calibrationText);

  // Convert vat params from degrees to radians:
  calibration.vat["roll"] = Math.PI * calibration.vat["roll"] / 180.0; 
  calibration.vat["pitch"] = Math.PI * calibration.vat["pitch"] / 180.0; 
  calibration.vat["yaw"] = Math.PI * calibration.vat["yaw"] / 180.0; 

  // Add translational components:
  // Note: VAT parameters by definition specify only the rotational component, so translational offsets are zero
  calibration.vat.x = 0.0;
  calibration.vat.y = 0.0;
  calibration.vat.z = 0.0;

  return calibration;
}

function parseCalibrationFile(calibrationText, calibrationType){

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
  window.disableReason = "";
  window.calibrationPanelDegrees = true;
  window.setCalibrationPanelsToDegrees = function () {
    window.calibrationPanelDegrees = true;
    storeVelo2Rtk(window.extrinsics.velo2Rtk.old);
  };
  window.setCalibrationPanelsToRadians = function () {
    window.calibrationPanelDegrees = false;
    storeVelo2Rtk(window.extrinsics.velo2Rtk.old);
  };
}
