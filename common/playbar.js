'use strict';

import { bucket, name, getLambda, getAWSCredentials } from "../demo/paramLoader.js";
import { resetProgressBars, incrementLoadingBarTotal } from "../common/overlay.js";

const numberOrZero = (string) => {
  const value = Number(string);
  return isNaN(value) ? 0 : value;
};

// sets up playbar in window
export function createPlaybar () {
  // Get HTML for Playbar:
  const playbarhtml = $("#playbarhtml");

  function updateTimeWindow (disable = false) {
    const lidarOffset = window.animationEngine.tstart;
    const lidarRange = window.animationEngine.timeRange;

    if (disable) {
      // NOTE: is there a better way of disabling the gps clip range filter?
      window.viewer.setFilterGPSTimeRange(lidarOffset-1, lidarOffset+lidarRange+1);
      $( "#playbar_tmin" ).prop( "disabled", true ); //Disable
      $( "#playbar_tmax" ).prop( "disabled", true ); //Disable
    } else {
      $( "#playbar_tmin" ).prop( "disabled", false ); //Enable
      $( "#playbar_tmax" ).prop( "disabled", false ); //Enable

      const sliderVal = $("#myRange").val() / 100.;
      const t = sliderVal * lidarRange + lidarOffset;
      $("#demo").html((t - lidarOffset).toFixed(4));

      const dtMin = numberOrZero(window.animationEngine.activeWindow.backward);
      const dtMax = numberOrZero(window.animationEngine.activeWindow.forward);
      window.viewer.setFilterGPSTimeRange(t + dtMin, t + dtMax);
    }
  }

  const tmin = document.getElementById('playbar_tmin');
  const tmax = document.getElementById('playbar_tmax');

  // Initialize DOM element values from initial activeWindow values
  tmin.value = window.animationEngine.activeWindow.backward;
  tmin.max = window.animationEngine.activeWindow.forward;
  tmin.step = window.animationEngine.activeWindow.step;
  tmax.value = window.animationEngine.activeWindow.forward;
  tmax.min = window.animationEngine.activeWindow.backward;
  tmax.step = window.animationEngine.activeWindow.step;

  tmin.addEventListener('input',
    () => {
      const min = numberOrZero(tmin.value);
      window.animationEngine.activeWindow.backward = min;
      tmax.min = min;
      updateTimeWindow();
      window.animationEngine.updateTimeForAll();
    });

  tmax.addEventListener('input',
    () => {
      const max = numberOrZero(tmax.value);
      window.animationEngine.activeWindow.forward = max;
      tmin.max = max;
      updateTimeWindow();
      window.animationEngine.updateTimeForAll();
    });

  function updateSlider (slideval) {
    playbarhtml.find("#myRange").val(slideval);
    updateTimeWindow();
  }

  // Make sure to call updateTimeWindow with disable false
  playbarhtml.find("#myRange").on('input', () => updateTimeWindow());

  playbarhtml.find("#myRange").on('wheel', function (e) {
    const slider = playbarhtml.find("#myRange");
    const slideval = numberOrZero(slider.val());

    const tmin = window.animationEngine.activeWindow.backward;
    const tmax = window.animationEngine.activeWindow.forward;

    const scalefactor = e.originalEvent.shiftKey ? 100 : 1;

    const lidarRange = window?.animationEngine?.timeRange;
    const dt = Math.sign(e.originalEvent.deltaY) * (tmin - tmax) * scalefactor;
    const sliderange = Number(slider.attr("max")) - Number(slider.attr("min"));
    const stepY = sliderange * dt / lidarRange;

    updateSlider(slideval + stepY);
  });
  playbarhtml.find("#myRange").on("scroll", function (e) {
    console.log(e);
  });

  playbarhtml.find("#playbar_toggle").click(function () {
    updateTimeWindow(disable = this.checked);
  });
  playbarhtml.find("#playbar_toggle").trigger('click');

  playbarhtml.find("#playbutton").mousedown(function () {
    playbarhtml.find("#playbutton").hide();
    playbarhtml.find("#pausebutton").show();
  });

  playbarhtml.find("#pausebutton").mousedown(function () {
    playbarhtml.find("#playbutton").show();
    playbarhtml.find("#pausebutton").hide();
  });

  playbarhtml.find("#toggle_calibration_panels").mouseup(function () {
    // Find Calibration Panels:
    const panels = $(".draggable-overlay");
    for (let ii = 0, len = panels.length; ii < len; ii++) {
      const panel = panels[ii];

      // Don't show rtk2vehicle mesh unless overridden:
      if (panel.id.includes("rtk2vehicle") && window.hideRtk2VehicleCalibrationPanel) {
          panel.style.display = "none";
      } else {
        // Check if visible and toggle:
        if (panel.style.display === "none" || panel.style.display === "") {
          panel.style.display = "block";
        } else {
          panel.style.display = "none";
        }
      }
    }
  });

  playbarhtml.find("#download_lanes_button").click(function () {
    function download (text, filename) {
      const blob = new Blob([text], {
        type: "data:text/plain;charset=utf-8"
      });

      const fileUrl = URL.createObjectURL(blob);

      var element = document.createElement('a');
      element.setAttribute('href', fileUrl);
      element.setAttribute('download', filename);

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    }

    // Download Left Lane Vertices:
    try {
      const laneLeftSegments = window.viewer.scene.scene.getChildByName("Left Lane Segments");
      if (laneLeftSegments === undefined) {
        const laneLeft = window.viewer.scene.scene.getChildByName("Lane Left");
        download(JSON.stringify(laneLeft.points, null, 2), "lane-left.json");
      } else {
        const polyline = laneLeftSegments.getFinalPoints();
        download(JSON.stringify(polyline.points, null, 2), "lane-left.json");
        download(JSON.stringify(polyline.pointValidities, null, 2), "lane-left-validities.json");
        download(JSON.stringify(polyline.pointAnnotations, null, 2), "lane-left-annotations.json");
      }
    } catch (e) {
      console.error("Couldn't download left lane vertices: ", e);
    }

    // Download Lane Spine Vertices:
    // try {
    //   const laneSpine = window.viewer.scene.scene.getChildByName("Lane Spine");
    //   download(JSON.stringify(laneSpine.points, null, 2), "lane-spine.json", "text/plain");
    // } catch (e) {
    //   console.error("Couldn't download lane spine vertices: ", e);
    // }

    // Download Right Lane Vertices:
    try {
      const laneRightSegments = window.viewer.scene.scene.getChildByName("Right Lane Segments");
      if (laneRightSegments === undefined) {
        const laneRight = window.viewer.scene.scene.getChildByName("Lane Right");
        download(JSON.stringify(laneRight.points, null, 2), "lane-right.json", "text/plain");
      } else {
        const polyline = laneRightSegments.getFinalPoints();
        download(JSON.stringify(polyline.points, null, 2), "lane-right.json");
        download(JSON.stringify(polyline.pointValidities, null, 2), "lane-right-validities.json");
        download(JSON.stringify(polyline.pointAnnotations, null, 2), "lane-right-annotations.json");
      }
    } catch (e) {
      console.error("Couldn't download right lane vertices: ", e);
    }
  });

  playbarhtml.find("#save_lanes_button").click(function () {
    const proceed = window.annotateLanesModeActive ?
      confirm("Saving updated lanes will overwrite old lane data. Are you sure you want to proceed?") :
      true;
    if (proceed) {
      resetProgressBars(1);
      saveLaneChanges();
    }
  });



  window.addEventListener("message", e => {
    if (e.data === 'pause') {
      window.animationEngine.stop()
    }
  });

  playbarhtml.find("#toggle_hideshow").click(function () {
    for (const cloud of window.viewer.scene.pointclouds) {
      cloud.material.uniforms.uExtrinsicsMode.value = !cloud.material.uniforms.uExtrinsicsMode.value;
    }
  });

  $(document).tooltip();

  // Configure Playbar Appearance:
  // document.getElementById("playbar_tmin").style.display = "none";
  // document.getElementById("playbar_tmax").style.display = "none";
  // document.getElementById("elevation_max").style.display = "none";
  // document.getElementById("elevation_min").style.display = "none";
  document.getElementById("playback_speed").style.display = "none";
  document.getElementById("toggleslider").style.display = "none";
  // document.getElementById("toggle_calibration_panels").style.display = "none";
  document.getElementById("load_detections_button").style.display = "none";
  document.getElementById("load_gaps_button").style.display = "none";
  document.getElementById("download_lanes_button").style.display = "none";
  document.getElementById("save_lanes_button").style.display = "none";

  // original from radar.html
  document.getElementById("playbar_tmax").disabled = false;
  document.getElementById("playbar_tmin").disabled = false;
  document.getElementById("elevation_max").display = false;
  document.getElementById("elevation_min").disabled = false;

  window.truthAnnotationMode = 0;	// 0: None, 1: Delete, 2: Add
  const annotationScreen = $(`<div id="annotationScreen"><p id="annotation-label">ANNOTATION MODE: <b id="annotation-mode-text"></b></p></div>`);
  $('body').prepend(annotationScreen);
  const div = document.getElementById("annotationScreen");
  div.style.opacity = 0;

  // event listeners
  window.addEventListener('keydown', (e) => {
    if (window.annotateLanesModeActive) {
      if (e.code === "KeyA") {
        window.truthAnnotationMode = 2;
      } else if (e.code === "KeyS") {
        window.truthAnnotationMode = 1;
      } else if (e.shiftKey) {
        window.truthAnnotationMode = (window.truthAnnotationMode + 1) % 3;
      }

      const div = document.getElementById("annotationScreen");
      const label = document.getElementById("annotation-mode-text");
      if (window.truthAnnotationMode === 0) {
        div.style.background = "black";
        div.style.opacity = 0;
        label.innerHTML = "NONE";
      } else if (window.truthAnnotationMode === 1) {
        div.style.background = "red";
        div.style.opacity = 0.25;
        label.innerHTML = "DELETE POINTS";
      } else if (window.truthAnnotationMode === 2) {
        div.style.background = "green";
        div.style.opacity = 0.25;
        label.innerHTML = "ADD POINTS";
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (window.annotateLanesModeActive) {
      window.truthAnnotationMode = 0;
      const div = document.getElementById("annotationScreen");
      const label = document.getElementById("annotation-mode-text");
      div.style.background = "black";
      div.style.opacity = 0;
      label.innerHTML = "NONE";
    }
  });
  addPlaybarListeners();
}


// adds event listeners to animate the viewer and playbar's slider and play/pause button
function addPlaybarListeners () {
  // create Animation Path & make light follow it
  // ANIMATION + SLIDER LOGIC:
  const slider = document.getElementById("myRange");
  const time_display = document.getElementById("time_display");
  const tmin = document.getElementById("playbar_tmin");
  const tmax = document.getElementById("playbar_tmax");
  const zmin = document.getElementById("elevation_min");
  const zmax = document.getElementById("elevation_max");
  const animationEngine = window.animationEngine;
  const toggleplay = document.getElementById("toggleplay");
  time_display.value = numberOrZero(slider.value).toFixed(3);

  // Playbar Button Functions:
  const playbutton = document.getElementById("playbutton");
  const pausebutton = document.getElementById("pausebutton");
  pausebutton.addEventListener("mousedown", () => {
    animationEngine.stop();
  });
  playbutton.addEventListener("mousedown", () => {
    animationEngine.start();
  });

  // Pre-Start/Stop Callbacks
  animationEngine.preStartCallback = function () {
    if (!animationEngine.isPlaying) { $("#playbutton").trigger("mousedown"); }
  };

  animationEngine.preStopCallback = function () {
    if (animationEngine.isPlaying) { $("#pausebutton").trigger("mousedown"); }
  };

  // Playbar:
  animationEngine.tweenTargets.push((gpsTime, updateDisplayedTime) => {
    const t = (gpsTime - animationEngine.tstart) / (animationEngine.timeRange);
    slider.value = 100 * t;

    // If this change came from typing, don't rewrite it.
    if (updateDisplayedTime) {
      time_display.value = (gpsTime - animationEngine.tstart).toFixed(3); // Centered to zero
    }
  });

  // Camera:
  // let updateCamera = false;
  // let lag = 1.01; // seconds
  // let camPointZOffset = 10; // meters
  // window.camControlInitialized = false;
  // window.camPointNeedsToBeComputed = true;
  // window.camControlInUse = false;
  // window.camDeltaTransform = {camStart: new THREE.Matrix4(), vehicleStart: new THREE.Vector3(), camEnd: new THREE.Matrix4(), vehicleEnd: new THREE.Vector3()};
  // window.camPointLocalFrame = {position: new THREE.Vector3(-10,0,10)};
  // window.camTargetLocalFrame = {position: new THREE.Vector3(0, 0, 0)};
  viewer.renderArea.addEventListener("keypress", (e) => {
    if (e.key === "r") {
      const box = new THREE.Box3().setFromObject(viewer.scene.scene.getObjectByName("Vehicle").getObjectByName("Vehicle Mesh"));
      const node = new THREE.Object3D();
      node.boundingBox = box;
      viewer.zoomTo(node, 5, 500);
    }
  });

  time_display.addEventListener('input',
    e => {
      animationEngine.stop();
      const time = numberOrZero(time_display.value);
      const clipped = Math.min(Math.max(0, time), animationEngine.timeRange - .001);
      animationEngine.timeline.t = clipped + animationEngine.tstart;
      animationEngine.updateTimeForAll();
    });

  slider.addEventListener("input", () => {
    animationEngine.stop();
    var val = slider.value / 100.0;
    animationEngine.timeline.t = val * animationEngine.timeRange + animationEngine.tstart;
    animationEngine.updateTimeForAll(true);
  });

  slider.addEventListener("wheel", () => {
    animationEngine.stop();
    var val = slider.value / 100.0;
    animationEngine.timeline.t = val * animationEngine.timeRange + animationEngine.tstart;
    animationEngine.updateTimeForAll(true);
  });

  // Initialize DOM element values from initial elevationWindow values
  zmin.value = window.animationEngine.elevationWindow.min;
  zmin.max = window.animationEngine.elevationWindow.max;
  zmin.step = window.animationEngine.elevationWindow.step;
  zmax.value = window.animationEngine.elevationWindow.max;
  zmax.min = window.animationEngine.elevationWindow.min;
  zmax.step = window.animationEngine.elevationWindow.step;

  zmin.addEventListener("input", () => {
    const min = numberOrZero(zmin.value);
    window.animationEngine.elevationWindow.min = min;
    window.animationEngine.elevationWindow.max = numberOrZero(zmax.value);
    zmax.min = min;
    animationEngine.updateTimeForAll();
  });

  zmax.addEventListener("input", () => {
    const max = numberOrZero(zmax.value);
    window.animationEngine.elevationWindow.min = numberOrZero(zmin.value);
    window.animationEngine.elevationWindow.max = max;
    zmin.max = max;
    animationEngine.updateTimeForAll();
  });

  // PointCloud:
  animationEngine.tweenTargets.push((gpsTime) => {
  // debugger; // account for pointcloud offset
    const { backward, forward } = animationEngine.activeWindow;
    const timeMin = numberOrZero(backward);
    const timeMax = numberOrZero(forward);
    viewer.setFilterGPSTimeRange(gpsTime + timeMin, gpsTime + timeMax);
    viewer.setFilterGPSTimeExtent(gpsTime + 2.5 * timeMin, gpsTime + 2.5 * timeMax);
  });
}

/**
 * @brief Function that saves changes made to lanes when annotating in potree. Calls the AWS Lambda function 'UpdateLanes'
 */
function saveLaneChanges () {
  const lane = {
    id: 0,
    timestamp: [],
    left: [],
    right: [],
    spine: [],
    laneTypeLeft: [],
    laneTypeRight: [],
    leftPointValidity: [],
    rightPointValidity: [],
    leftPointAnnotationStatus: [],
    rightPointAnnotationStatus: []
  };

  // Left Lane Vertices:
  const laneLeftSegments = window.viewer.scene.scene.getChildByName("Left Lane Segments");
  if (laneLeftSegments === undefined) {
    const laneLeft = window.viewer.scene.scene.getChildByName("Lane Left");
    lane.left = laneLeft.points;
  } else {
    const polyline = laneLeftSegments.getFinalPoints();
    lane.left = polyline.points;
    lane.leftPointValidity = polyline.pointValidities;
    lane.leftPointAnnotationStatus = polyline.pointAnnotations;
  }

  // Right Lane Vertices:
  const laneRightSegments = window.viewer.scene.scene.getChildByName("Right Lane Segments");
  if (laneRightSegments === undefined) {
    const laneRight = window.viewer.scene.scene.getChildByName("Lane Right");
    lane.right = laneRight.points;
  } else {
    const polyline = laneRightSegments.getFinalPoints();
    lane.right = polyline.points;
    lane.rightPointValidity = polyline.pointValidities;
    lane.rightPointAnnotationStatus = polyline.pointAnnotations;
  }
  callUpdateLanesLambdaFunction(bucket, name, lane);
}

function callUpdateLanesLambdaFunction (bucket, name, lane) {
  const credentials = getAWSCredentials();
  const payload = {
    region: credentials.region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
    sessionToken: credentials.sessionToken,
    bucket: bucket,
    name: name,
    left: lane.left,
    leftPointValidity: lane.leftPointValidity,
    leftPointAnnotationStatus: lane.leftPointAnnotationStatus,
    right: lane.right,
    rightPointValidity: lane.rightPointValidity,
    rightPointAnnotationStatus: lane.rightPointAnnotationStatus
  };
  const lambda = getLambda();
  lambda.invoke({
    FunctionName: 'UpdateLanes:7',
    LogType: 'None',
    Payload: JSON.stringify(payload)
  }, function (err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      console.log("Successfully Uploaded lanes", data);
    }
    incrementLoadingBarTotal('lanes uploaded')
  });
}
