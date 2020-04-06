// this file is intended to call every other function in order to get potree to load
"use strict"
import {
	runForLocalDevelopment, params, bucket, region, names, name, visualizationMode,
	annotateLanesAvailable, downloadLanesAvailable, calibrationModeAvailable, accessKeyId,
	secretAccessKey, sessionToken, fonts, theme, comparisonDatasets, s3, getShaderMaterial
} from "../demo/paramLoader.js"
import { createViewer } from "../demo/viewer.js" 
import { AnimationEngine } from "../demo/animationEngine.js"
import { createPlaybar, addPlaybarListeners } from "../common/playbar.js"
import { loadRtkCallback } from "../demo/rtkLoaderFlatbuffer.js"
import { loadVelo2Rtk, loadRtk2Vehicle, storeCalibration } from "../demo/calibrationManager.js"
import { loadLanesCallback, addReloadLanesButton } from "../demo/laneLoader.js"
import { loadTracksCallback } from "../demo/trackLoader.js"
import { loadRemCallback } from "../demo/remLoader.js"
import { addLoadGapsButton } from "../demo/gapsLoader.js"
import { addLoadRadarButton } from "../demo/radarLoader.js"
import { addCalibrationButton } from "../demo/calibrationManager.js"
import { addDetectionButton } from "../demo/detectionLoader.js"


// event listener that spins off everything to load the page
$(document).ready(() => {
	loadPotree();
});

// Call all functions to load potree
export function loadPotree() {
	$(document).ready(() => {
		// Create AnimationEngine:
		createViewer();
		window.animationEngine = new AnimationEngine();
	
		// add html element with listeners to document
		createPlaybar(); 

		// create event listeners that animate the playbar
		addPlaybarListeners();
		addReloadLanesButton();
		addLoadGapsButton();
		addLoadRadarButton();
		addCalibrationButton();
		addDetectionButton();

		// load in actual data & configure playbar along the way
		loadDataIntoDocument();
	});
}

// loads all necessary data (car obj/texture, rtk, radar, tracks, etc...)
function loadDataIntoDocument() {
	// Load Data Sources in loadRtkCallback:
	loadRtkCallback(s3, bucket, name, () => {

		// Load Extrinsics:
		window.extrinsics = { rtk2Vehicle: null, velo2Rtk: {} };
		try {
			loadVelo2Rtk(s3, bucket, name, (velo2Rtk) => {

				if (!velo2Rtk) {
					disablePanels("Unable to load extrinsics file");
					return;
				}

				console.log("Velo2Rtk Extrinsics Loaded!");
				window.extrinsics.velo2Rtk = { old: velo2Rtk, new: velo2Rtk };
				storeVelo2Rtk(window.extrinsics.velo2Rtk.new);
				for (const cloud of viewer.scene.pointclouds) {

					let velo2RtkOld = window.extrinsics.velo2Rtk.old;
					let velo2RtkNew = window.extrinsics.velo2Rtk.new;

					cloud.material.uniforms.velo2RtkXYZOld.value.set(velo2RtkOld.x, velo2RtkOld.y, velo2RtkOld.z);
					cloud.material.uniforms.velo2RtkRPYOld.value.set(velo2RtkOld.roll, velo2RtkOld.pitch, velo2RtkOld.yaw);
					cloud.material.uniforms.velo2RtkXYZNew.value.set(velo2RtkNew.x, velo2RtkNew.y, velo2RtkNew.z);
					cloud.material.uniforms.velo2RtkRPYNew.value.set(velo2RtkNew.roll, velo2RtkNew.pitch, velo2RtkNew.yaw);
				}
			});

			loadRtk2Vehicle(s3, bucket, name, (rtk2Vehicle) => {
				console.log("Rtk2Vehicle Extrinsics Loaded!");
				window.extrinsics.rtk2Vehicle = { old: rtk2Vehicle, new: rtk2Vehicle };
				storeRtk2Vehicle(window.extrinsics.rtk2Vehicle.new);
			});
		} catch (e) {
			console.error("Could not load Calibrations: ", e);
		}

		// Load Lanes:
		try {
			loadLanesCallback(s3, bucket, name);
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

		try {
			loadRemCallback(s3, bucket, name, animationEngine);
		} catch (e) {
			console.error("No rem points: ", e);
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