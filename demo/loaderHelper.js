'use strict';

// this file is intended to call every other function in order to get potree to load
import {
	runLocalPointCloud, isLocalDevelopment, params, bucket, region, names, name, visualizationMode,
	annotateLanesAvailable, downloadLanesAvailable, calibrationModeAvailable, accessKeyId,
	secretAccessKey, sessionToken, fonts, theme, comparisonDatasets, s3, getShaderMaterial,
	defaultTimeRange
} from "../demo/paramLoader.js"
import { createViewer } from "../demo/viewer.js"
import { AnimationEngine } from "../demo/animationEngine.js"
import { createPlaybar } from "../common/playbar.js"
import { loadRtkCallback, rtkDownloads } from "../demo/rtkLoader.js"
import { textureDownloads } from "../demo/textureLoader.js"
import { loadCalibrationFile, loadRtk2Vehicle, storeCalibration, calDownloads, addCalibrationButton } from "../demo/calibrationManager.js"
import { loadLanesCallback, addReloadLanesButton, laneDownloads } from "../demo/laneLoader.js"
import { loadTracksCallback, trackDownloads } from "../demo/trackLoader.js"
import { loadRemCallback, remDownloads } from "../demo/remLoader.js"
import { addLoadGapsButton, gapDownloads } from "../demo/gapsLoader.js"
import { addLoadRadarButton, radarDownloads } from "../demo/radarLoader.js"
import { addDetectionButton, detectionDownloads } from "../demo/detectionLoader.js"
import { PointAttributeNames } from "../src/loader/PointAttributes.js";
import { setNumTasks } from "../common/overlay.js"
import { loadControlPointsCallback } from "../demo/controlPointLoader.js"
import { getS3Files } from "../demo/loaderUtilities.js"


function canUseCalibrationPanels(attributes) {
  let hasRtkPose = false;
  let hasRtkOrient = false;
  for (const attr of attributes) {
    hasRtkPose = hasRtkPose || (attr.name === PointAttributeNames.RTK_POSE);
    hasRtkOrient = hasRtkOrient || (attr.name === PointAttributeNames.RTK_ORIENT);
  }
  return hasRtkPose && hasRtkOrient
}

function finishLoading({pointcloud}) {
  const material = pointcloud.material;
  viewer.scene.addPointCloud(pointcloud);
  material.pointColorType = Potree.PointColorType.INTENSITY; // any Potree.PointColorType.XXXX
  material.gradient = Potree.Gradients.GRAYSCALE; // Can define custom gradient or look up in Potree.Gradients
  material.size = 0.09;
  material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
  material.shape = Potree.PointShape.SQUARE;

  const cloudCanUseCalibrationPanels = canUseCalibrationPanels(pointcloud.pcoGeometry.pointAttributes.attributes);
  window.canEnableCalibrationPanels = window.canEnableCalibrationPanels && cloudCanUseCalibrationPanels;

  if (window.velo2RtkExtrinsicsLoaded) {

    let velo2RtkOld = window.extrinsics.velo2Rtk.old;
    let velo2RtkNew = window.extrinsics.velo2Rtk.new;

    material.uniforms.velo2RtkXYZOld.value.set(velo2RtkOld.x, velo2RtkOld.y, velo2RtkOld.z);
    material.uniforms.velo2RtkRPYOld.value.set(velo2RtkOld.roll, velo2RtkOld.pitch, velo2RtkOld.yaw);
    material.uniforms.velo2RtkXYZNew.value.set(velo2RtkNew.x, velo2RtkNew.y, velo2RtkNew.z);
    material.uniforms.velo2RtkRPYNew.value.set(velo2RtkNew.roll, velo2RtkNew.pitch, velo2RtkNew.yaw);
  }

  if (window.canEnableCalibrationPanels) {
    enablePanels();

  } else {
    const reason = "Pointcloud was not serialized with the necessary point attributes"
    disablePanels(reason);
    console.error("Cannot use calibration panels: ", reason);
  }
}

// event listener that spins off everything to load the page
$(document).ready(() => {
	loadPotree();
});


// Call all functions to load potree
export async function loadPotree() {
  // Create AnimationEngine:
  const viewer = createViewer();
  window.viewer = viewer;
  const animationEngine = new AnimationEngine({
    activeWindow: {backward: defaultTimeRange.min, forward: defaultTimeRange.max, step: 0.01},
    elevationWindow: {min: -1.00, max: 2.00, step: 0.01}
  });
  window.animationEngine = animationEngine;

  // now that animation engine has been created, can add event listeners
  createPlaybar();

  // get files from s3
  const filesArray = await getS3Files(s3, bucket, name)
  const datasetFiles = filesArray[0];
  const filesTable = filesArray[1];

  // TODO get local files

  const numTasks = await determineNumTasks(datasetFiles)
  setNumTasks(numTasks)

  const otherDownloads = [detectionDownloads, gapDownloads, radarDownloads]
  otherDownloads.forEach(async (getRelevantFiles) => await getRelevantFiles(datasetFiles))

  if (annotateLanesAvailable) {
    addReloadLanesButton();
  }
  addLoadGapsButton();
  addLoadRadarButton();
  addCalibrationButton();
  addDetectionButton();
  // load in actual data & configure playbar along the way
  await loadDataIntoDocument(filesTable);

  // Load Pointclouds
  if (runLocalPointCloud) {
    Potree.loadPointCloud("../pointclouds/test/cloud.js", "full-cloud", finishLoading);
    Potree.loadPointCloud("../pointclouds/test_2/cloud.js", "full-cloud-2", finishLoading);
  } else {
    Potree.loadPointCloud({ s3, bucket, name }, name.substring(5), e => {
      finishLoading(e);
      $("#playbutton").click();
    });
  }
}

// loads all necessary data (car obj/texture, rtk, radar, tracks, etc...)
async function loadDataIntoDocument(filesTable) {
	        // Load Data Sources in loadRtkCallback:
                await loadRtkCallback(s3, bucket, name, async () => {
		// Load Extrinsics:
		window.extrinsics = { rtk2Vehicle: null, velo2Rtk: {}, nominal: null, vat: null };
		try {
		  const velo2Rtk = await loadCalibrationFile(s3, bucket, name, 'extrinsics');
		  if (velo2Rtk) {
		    console.log("Velo2Rtk Extrinsics Loaded!");
		    window.extrinsics.velo2Rtk = { old: velo2Rtk, new: velo2Rtk };
		    storeVelo2Rtk(window.extrinsics.velo2Rtk.new);
		    window.velo2RtkExtrinsicsLoaded = true;
                  } else {
		    disablePanels("Unable to load extrinsics file");
                  }

		  const rtk2Vehicle = await loadRtk2Vehicle(s3, bucket, name);
		  console.log("Rtk2Vehicle Extrinsics Loaded!");
		  window.extrinsics.rtk2Vehicle = { old: rtk2Vehicle, new: rtk2Vehicle };
		  // storeRtk2Vehicle(window.extrinsics.rtk2Vehicle.new);


		  // Try to load nominal calibration
		  const nominalExtrinsics = await loadCalibrationFile(s3, bucket, name, 'nominal');
		  if (nominalExtrinsics) {
		  	console.log("Nominal Extrinsics Loaded!");
		  	window.extrinsics.nominal = nominalExtrinsics;
		  }

		  // Try to load metadata file
		  const metadataCals = await loadCalibrationFile(s3, bucket, name, 'metadata');
		  if (metadataCals) {
		  	console.log("Metadata Calibrations Loaded!");
		  	window.extrinsics.vat = metadataCals.vat;
		  }
		} catch (e) {
		  console.error("Could not load Calibrations: ", e);
		}

		// Load Lanes:
		try {
		  await loadLanesCallback(s3, bucket, name);
		} catch (e) {
		  console.error("Could not load Lanes: ", e);
		}

		// Load Tracks:
		try {
			// TODO shaderMaterial
			let shaderMaterial = getShaderMaterial();
			let trackShaderMaterial = shaderMaterial.clone();
			loadTracksCallback(s3, bucket, name, trackShaderMaterial, animationEngine);
		} catch (e) {
			console.error("Could not load Tracks: ", e);
		}

    // Load Control Points (REM, LaneSense, SPP)
		try {
			loadControlPointsCallback(s3, bucket, name, animationEngine, filesTable['3_Assessments']);
		} catch (e) {
			console.error("No control points: ", e);
		}

		// Load Radar:
		try {
			// await loadRadarCallback(s3, bucket, name);
		} catch (e) {
			console.error("Could not load Radar Detections: ", e);
		}

		// Load Detections:
		// TODO

		// Load Gaps:
		// TODO

		// Configure AnimationEngine:
		// let tstart = window.timeframe.tstart;	// Set in loadRtkCallback
		// let tend = window.timeframe.tend;			// Set in loadRtkCallback
		// let playbackRate = 1.0;
		// animationEngine.configure(tstart, tend, playbackRate);
		// animationEngine.launch();
	}); // END loadRtkCallback()
}

/**
 * @brief Function that determines the number of downloads & post-download loading needed to render potree
 * @note Amount of downloads based on # relevant files present in s3
 * @param { Array | null } datasetFiles (null if running local point cloud) List containing all files in the s3 dataset
 */
async function determineNumTasks(datasetFiles) {
	// list of functions which determine which (if any) files from s3 need to be downloaded on page load
	const downloadList = [
		rtkDownloads, calDownloads, remDownloads,
		textureDownloads, laneDownloads, trackDownloads
	]

	// downloads & loads that happen on page load and need to be tracked
	let numDownloads = 0 // generally incremented by if objectName is present in the returned dictionary
	let numLoads = 0 // normally incremented with numDownloads except when texture/mesh is present (increment solely)
	for (const getRelevantFiles of downloadList) {
	  const relevantFiles = await getRelevantFiles(datasetFiles)
	  if (relevantFiles) {
            if (relevantFiles.texture && relevantFiles.mesh) {
	      // special case for textureLoader (loads 2 things, but only one is trackable, so combine)
              numLoads++;
            } else {
	      numDownloads++;
	      numLoads++;
	    }
          }
	}
  return numLoads + numDownloads;
}
