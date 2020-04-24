'use strict';

const numberOrZero = (string) => {
  const value = Number(string);
  return isNaN(value) ? 0 : value;
}

// sets up playbar in window
export function createPlaybar () {

  // Insert HTML for Playbar:
  var playbarhtml = $(`
    <div class="overlay">
      <div class="slidecontainer">
        <input type="range" min="0" max="100" value=0 step="any" class="slider" id="myRange">
        <div id="spacer">

          <div id="value" class="inline">

            <table id='play_pause_table'>
              <tr>
                <td><input type="checkbox" id="toggleplay">
                <button class="button" class="play" id="playbutton" class="inline"><i class="material-icons">play_arrow</i></button>
                <button class="button" class="pause" id="pausebutton"><i class="material-icons">pause</i></button></td>
                <td>Time (s): <input type="number" id="time_display" min=0 value=0 step="0.001"></td>
              </tr>
            </table>

            <table id="windows">
              <tr>
                <td style="text-align:right">Time Window:</td>
                <td>[<input type="number" id="playbar_tmin" value=-0.05 max=0.05 step="0.01">, <input type="number" id="playbar_tmax" value=0.05 min=-0.05 step="0.01">]</td>
                <td>(s)</td>
              </tr>
              <tr>
                <td style="text-align:right">Elevation Window:</td>
                <td>[<input type="number" id="elevation_min" value=-0.5 max=0.5 step="0.01">, <input type="number" id="elevation_max" value=0.5 min=-0.5 step="0.01">]</td>
                <td>(m)</td>
              </tr>
            </table>

            <label class="switch">
              <input type="checkbox" >
              <span class="toggleslider" id="toggleslider"></span>
            </label>
            <input type="range" name="playback_speed" id="playback_speed" min="1" max="8" value="4" step="any">
            <button name="toggle_calibration_panels" id="toggle_calibration_panels">Toggle<br/>Calibration<br/>Panels</button>
            <button name="toggle_hideshow" id="toggle_hideshow">Toggle Pointcloud<br/>Highlight Mode</button>
            <button name="load_detections_button" id="load_detections_button">Load<br/>Detections</button>
            <button name="load_gaps_button" id="load_gaps_button">Load<br/>Gaps</button>
            <button name="load_radar_button" id="load_radar_button">Load<br/>Radar</button>
            <button name="download_lanes_button" id="download_lanes_button">Download<br/>Lanes</button>
            <button name="reload_lanes_button" id="reload_lanes_button">Annotate<br/>Lanes</button>
          </div>
        </div>
      </div>
    </div>
    `);

    // Add to DOM:
    $("#potree_render_area").append(playbarhtml);

    function updateTimeWindow(disable=false) {

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
        $("#demo").html((t-lidarOffset).toFixed(4));

        // var dtMin = Number($("#playbar_tmin").val());
        // var dtMax = Number($("#playbar_tmax").val());

        const dtMin = window.animationEngine.activeWindow.backward;
        const dtMax = window.animationEngine.activeWindow.forward;

        const tmin = t + dtMin;
        const tmax = t + dtMax;

        window.viewer.setFilterGPSTimeRange(tmin, tmax);
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

    function updateSlider(slideval) {
      playbarhtml.find("#myRange").val(slideval);
      updateTimeWindow();
    }

    playbarhtml.find("#myRange").on('input', updateTimeWindow);

    playbarhtml.find("#myRange").on('wheel', function(e) {
      const slider = playbarhtml.find("#myRange");
      const slideval = numberOrZero(slider.val());

      const tmin = window.animationEngine.activeWindow.backward;
      const tmax = window.animationEngine.activeWindow.forward;

      const scalefactor = e.originalEvent.shiftKey ? 100 : 1;

      let lidarRange = 1;
      try {
       // lidarRange = window.viewer.scene.pointclouds[0].pcoGeometry.nodes.r.gpsTime.range;
        lidarRange = window.animationEngine.timeRange;
      } catch (e) {
      }
      const dt = Math.sign(e.originalEvent.deltaY) * (tmin - tmax) * scalefactor;
      const sliderange = Number(slider.attr("max")) - Number(slider.attr("min"));
      const stepY = sliderange*dt/lidarRange;

      updateSlider(slideval + stepY);
    });
    playbarhtml.find("#myRange").on("scroll", function(e) {
      console.log(e);
    });

    playbarhtml.find("#playbar_toggle").click(function() {
      updateTimeWindow(disable=this.checked);
    });
    playbarhtml.find("#playbar_toggle").trigger('click');

    playbarhtml.find("#playbutton").mousedown(function() {
      playbarhtml.find("#playbutton").hide();
      playbarhtml.find("#pausebutton").show();

    });

    playbarhtml.find("#pausebutton").mousedown(function() {
      playbarhtml.find("#playbutton").show();
      playbarhtml.find("#pausebutton").hide();

    });

    playbarhtml.find("#toggle_calibration_panels").mouseup(function() {

      // Find Calibration Panels:
      let panels = $(".draggable-overlay");
      for(let ii=0, len=panels.length; ii<len; ii++) {

        let panel = panels[ii];

        // Check is visible and toggle:
        if (panel.style.display == "none" || panel.style.display == "") {
          panel.style.display = "block";
        } else {
          panel.style.display = "none"
        }

      }

    });

    playbarhtml.find("#download_lanes_button").click(function() {

      function download(text, filename) {

        let blob = new Blob([text], {
          type: "data:text/plain;charset=utf-8"
        })

        let fileUrl = URL.createObjectURL(blob)

        var element = document.createElement('a');
        element.setAttribute('href', fileUrl)
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
      }

      // Download Left Lane Vertices:
      try {
        const laneLeftSegments = window.viewer.scene.scene.getChildByName("Left Lane Segments");
        if (laneLeftSegments == undefined) {
          const laneLeft = window.viewer.scene.scene.getChildByName("Lane Left");
          download(JSON.stringify(laneLeft.points, null, 2), "lane-left.json");
        } else {
          download(JSON.stringify(laneLeftSegments.getFinalPoints(), null, 2), "lane-left.json");
        }

      } catch (e) {
        console.error("Couldn't download left lane vertices: ", e);
      }

      // Download Lane Spine Vertices:
      try {
        const laneSpine = window.viewer.scene.scene.getChildByName("Lane Spine");
        download(JSON.stringify(laneSpine.points, null, 2), "lane-spine.json", "text/plain");
      } catch (e) {
        console.error("Couldn't download lane spine vertices: ", e);
      }

      // Download Right Lane Vertices:
      try {
        const laneRightSegments = window.viewer.scene.scene.getChildByName("Right Lane Segments");
        if (laneRightSegments == undefined) {
          const laneRight = window.viewer.scene.scene.getChildByName("Lane Right");
          download(JSON.stringify(laneRight.points, null, 2), "lane-right.json", "text/plain");
        } else {
          download(JSON.stringify(laneRightSegments.getFinalPoints(), null, 2), "lane-right.json", "text/plain");
        }
      } catch (e) {
        console.error("Couldn't download right lane vertices: ", e);
      }




    });

    window.addEventListener("message", e => {
     if (e.data === 'pause') {
       window.animationEngine.stop()
     }
    });

    playbarhtml.find("#toggle_hideshow").click(function() {
      for (let cloud of window.viewer.scene.pointclouds) {
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

	// originall from radar.html
	document.getElementById("playbar_tmax").disabled = false;
	document.getElementById("playbar_tmin").disabled = false;
	document.getElementById("elevation_max").display = false;
	document.getElementById("elevation_min").disabled = false;

	window.truthAnnotationMode = 0;	// 0: None, 1: Delete, 2: Add
	let annotationScreen = $(`<div id="annotationScreen"><p id="annotation-label">ANNOTATION MODE: <b id="annotation-mode-text"></b></p></div>`);
	$('body').prepend(annotationScreen);
	let div = document.getElementById("annotationScreen");
	div.style.opacity=0;

	// event listeners
	window.addEventListener('keydown', (e) => {
		if (window.annotateLanesModeActive) {
			if (e.code == "KeyA") {
				window.truthAnnotationMode = 2;
			} else if (e.code == "KeyS") {
				window.truthAnnotationMode = 1;
			} else if (e.shiftKey) {
				window.truthAnnotationMode = (window.truthAnnotationMode + 1) % 3;
			}

			let div = document.getElementById("annotationScreen");
			let label = document.getElementById("annotation-mode-text");
			if (window.truthAnnotationMode == 0) {
				div.style.background = "black";
				div.style.opacity=0;
				label.innerHTML = "NONE";
			}
			else if (window.truthAnnotationMode == 1) {
				div.style.background = "red";
				div.style.opacity=0.25;
				label.innerHTML = "DELETE POINTS";
			} else if (window.truthAnnotationMode == 2) {
				div.style.background = "green";
				div.style.opacity=0.25;
				label.innerHTML = "ADD POINTS";
			}
		}
	});

	window.addEventListener("keyup", (e) => {
		if (window.annotateLanesModeActive) {
			window.truthAnnotationMode = 0;
			let div = document.getElementById("annotationScreen");
			let label = document.getElementById("annotation-mode-text");
			div.style.background = "black";
			div.style.opacity=0;
			label.innerHTML = "NONE";
		}
	});
  addPlaybarListeners();
}


// adds event listeners to animate the viewer and playbar's slider and play/pause button
function addPlaybarListeners() {
    // create Animation Path & make light follow it
    // ANIMATION + SLIDER LOGIC:
    let slider = document.getElementById("myRange");
    let time_display = document.getElementById("time_display");
    let tmin = document.getElementById("playbar_tmin");
    let tmax = document.getElementById("playbar_tmax");
    let zmin = document.getElementById("elevation_min");
    let zmax = document.getElementById("elevation_max");
    let animationEngine = window.animationEngine;
    let toggleplay = document.getElementById("toggleplay");
    time_display.value = numberOrZero(slider.value).toFixed(3);

    // Playbar Button Functions:
    let playbutton = document.getElementById("playbutton");
    let pausebutton = document.getElementById("pausebutton");
    pausebutton.addEventListener("mousedown", () => {
        animationEngine.stop();
    });
    playbutton.addEventListener("mousedown", () => {
        animationEngine.start();
    });

	// Pre-Start/Stop Callbacks
	animationEngine.preStartCallback = function () {
		if (!animationEngine.isPlaying) {
			$("#playbutton").trigger("mousedown");
		}
	}

	animationEngine.preStopCallback = function () {
		if (animationEngine.isPlaying) {
			$("#pausebutton").trigger("mousedown");
		}
	}

	// Playbar:
    animationEngine.tweenTargets.push((gpsTime, updateDisplayedTime) => {
	  let t = (gpsTime - animationEngine.tstart) / (animationEngine.timeRange);
	  slider.value = 100*t;

          // If this change came from typing, don't rewrite it.
          if (updateDisplayedTime) {
            time_display.value = (gpsTime - animationEngine.tstart).toFixed(3) ; // Centered to zero
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
		if (e.key == "r") {
			let box = new THREE.Box3().setFromObject(viewer.scene.scene.getObjectByName("Vehicle").getObjectByName("Vehicle Mesh"));
			let node = new THREE.Object3D();
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
		let minGpsTime = gpsTime+animationEngine.activeWindow.backward;
		let maxGpsTime = gpsTime+animationEngine.activeWindow.forward;
		viewer.setFilterGPSTimeRange(minGpsTime, maxGpsTime);
		viewer.setFilterGPSTimeExtent(minGpsTime+1.5*animationEngine.activeWindow.backward, maxGpsTime+1.5*animationEngine.activeWindow.forward);
	});
}
