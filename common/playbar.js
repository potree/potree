
"use strict"
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
                <td><span id='time_display_span'> Time (seconds): <input type="number" id="time_display" min=0 value=0 step="0.0001"> </span></td>
              </tr>
            </table>

            <table id="windows">
              <tr>
                <td style="text-align:right">Time Window:</td>
                <td>[<input type="number" id="playbar_tmin" value=-0.05 max=0 step="0.01">, <input type="number" id="playbar_tmax" value=0.05 min=0 step="0.01">]</td>
                <td>(s)</td>
              </tr>
              <tr>
                <td style="text-align:right">Elevation Window:</td>
                <td>[<input type="number" id="elevation_min" value=-0.5 max=0 step="0.01">, <input type="number" id="elevation_max" value=0.5 min=0 step="0.01">]</td>
                <td>(m)</td>
              </tr>
            </table>

            <label class="switch">
              <input type="checkbox" >
              <span class="toggleslider" id="toggleslider"></span>
            </label>
            <input type="range" name="playback_speed" id="playback_speed" min="1" max="8" value="4" step="any">
            <button name="toggle_calibration_panels" id="toggle_calibration_panels">Toggle Calibration Panels</button>
            <button name="toggle_hideshow" id="toggle_hideshow">Toggle Pointcloud Highlight Mode</button>
            <button name="load_detections_button" id="load_detections_button">Load Detections</button>
            <button name="load_gaps_button" id="load_gaps_button">Load Gaps</button>
            <button name="load_radar_button" id="load_radar_button">Load Radar</button>
            <button name="download_lanes_button" id="download_lanes_button">Download Lanes</button>
            <button name="reload_lanes_button" id="reload_lanes_button">Annotate Lanes</button>
          </div>
        </div>
      </div>
    </div>
    `);

    // Add to DOM:
    $("#potree_render_area").append(playbarhtml);

    // Define function to update clip range:
    function updateClip(disable=false) {

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

        var sliderVal = $("#myRange").val() / 100.;
        var t = sliderVal * lidarRange + lidarOffset;
        $("#demo").html((t-lidarOffset).toFixed(4));

        // var dtMin = Number($("#playbar_tmin").val());
        // var dtMax = Number($("#playbar_tmax").val());

        const dtMin = window.animationEngine.activeWindow.backward;
        const dtMax = window.animationEngine.activeWindow.forward;

        tmin = t - dtMin;
        tmax = t + dtMax;

        window.viewer.setFilterGPSTimeRange(tmin, tmax);
      }
    }

    // Function to update slider:
    function updateSlider(slideval=null) {

      if (slideval) {
        var slider = playbarhtml.find("#myRange");
        slider.val(slideval);
      }

      updateClip();

    }

    playbarhtml.find("#playbar_tmin").on('input', function() {
      const tmin = playbarhtml.find("#playbar_tmin");
      window.animationEngine.activeWindow.backward = Math.abs(Number(tmin.val()));
      updateClip();
      window.animationEngine.updateTimeForAll();
    });

    playbarhtml.find("#playbar_tmax").on('input', function() {
      const tmax = playbarhtml.find("#playbar_tmax");
      window.animationEngine.activeWindow.forward = Math.abs(Number(tmax.val()));
      updateClip();
      window.animationEngine.updateTimeForAll();
    });

    playbarhtml.find("#elevation_max").on('input', function() {
      const elevationMax = playbarhtml.find("#elevation_max");
      window.elevationWindow[1] = Math.abs(Number(elevationMax.val()));
    });

    playbarhtml.find("#elevation_min").on('input', function() {
      const elevationMin = playbarhtml.find("#elevation_min");
      window.elevationWindow[0] = Math.abs(Number(elevationMin.val()));
    });

    playbarhtml.find("#myRange").on('input', function() {
      updateSlider();
    });

    playbarhtml.find("#myRange").on('wheel', function(e) {
      var slider = playbarhtml.find("#myRange");
      // var tmin = playbarhtml.find("#playbar_tmin");
      // var tmax = playbarhtml.find("#playbar_tmax");
      var slideval = Number(slider.val());
      var dy = e.originalEvent.deltaY;

      const tmin = window.animationEngine.activeWindow.backward;
      const tmax = window.animationEngine.activeWindow.forward;

      var scalefactor = 1;
      if (e.originalEvent.shiftKey) {
        scalefactor = 100;
      }

      var lidarRange = 1;
      try {
       // lidarRange = window.viewer.scene.pointclouds[0].pcoGeometry.nodes.r.gpsTime.range;
       lidarRange = window.animationEngine.timeRange;
     } catch (e) {
     }
      var stepY = 0;
      if (dy < 0) {
        // dt = Number(tmax.val());
        dt = tmax;
      } else if (dy > 0) {
        // dt = Number(tmin.val());
        dt = -tmin;
      }
      dt = dt*scalefactor;
      var sliderange = Number(slider.attr("max")) - Number(slider.attr("min"));
      var stepY = sliderange*dt/lidarRange;

      slideval += stepY;

      updateSlider(slideval);
    });
    playbarhtml.find("#myRange").on("scroll", function(e) {
      console.log(e);
    });

    playbarhtml.find("#playbar_toggle").click(function() {
      updateClip(disable=this.checked);
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
    createPlaybarListeners(playbarhtml);

}

function createPlaybarListeners(playbarhtml) {

    window.addEventListener("message", e => {
     if (e.data === 'pause') {
       animationEngine.stop()
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
}


// adds event listeners to animate the viewer and playbar's slider and play/pause button
export function addPlaybarListeners() {
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
    time_display.value = Math.round(10000 * slider.value) / 10000;

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
	animationEngine.tweenTargets.push((gpsTime) => {
		// TODO add playbackSpeed
		time_display.value = Math.round(10000*slider.value)/10000;

		let t = (gpsTime - animationEngine.tstart) / (animationEngine.timeRange);
		slider.value = 100*t;
		time_display.value = Math.round(10000*(gpsTime - animationEngine.tstart))/10000; // Centered to zero
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

    time_display.addEventListener('keyup', function onEvent(e) {
        if (e.keyCode === 13) {
            console.log('Enter')
            animationEngine.stop();
            let val = parseFloat(time_display.value);
            val = Math.max(0, val);
            val = Math.min(animationEngine.timeRange - .001, val);
            animationEngine.timeline.t = val + animationEngine.tstart;
            animationEngine.updateTimeForAll();
        }
    });

    slider.addEventListener("input", () => {
        animationEngine.stop();
        var val = slider.value / 100.0;
        animationEngine.timeline.t = val * animationEngine.timeRange + animationEngine.tstart;
        animationEngine.updateTimeForAll();
    });

    slider.addEventListener("wheel", () => {
        animationEngine.stop();
        var val = slider.value / 100.0;
        animationEngine.timeline.t = val * animationEngine.timeRange + animationEngine.tstart;
        animationEngine.updateTimeForAll();
    });

    zmin.addEventListener("input", () => {
        window.elevationWindow.min = Math.abs(Number(zmin.value));
        window.elevationWindow.max = Math.abs(Number(zmax.value));
        animationEngine.updateTimeForAll();
    });

    zmax.addEventListener("input", () => {
        window.elevationWindow.min = Math.abs(Number(zmin.value));
        window.elevationWindow.max = Math.abs(Number(zmax.value));
        animationEngine.updateTimeForAll();
    });

	// PointCloud:
	animationEngine.tweenTargets.push((gpsTime) => {
		// debugger; // account for pointcloud offset
		let minGpsTime = gpsTime-animationEngine.activeWindow.backward;
		let maxGpsTime = gpsTime+animationEngine.activeWindow.forward;
		viewer.setFilterGPSTimeRange(minGpsTime, maxGpsTime);
		viewer.setFilterGPSTimeExtent(minGpsTime-1.5*animationEngine.activeWindow.backward, maxGpsTime+1.5*animationEngine.activeWindow.forward);
	});
}