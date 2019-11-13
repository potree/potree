$(document).ready(function () {

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
      for(ii=0, len=panels.length; ii<len; ii++) {

        let panel = panels[ii];

        // Check is visible and toggle:
        // panel.style.display = "none";
        // debugger;
        if (panel.style.display == "none") {
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
       animationEngine.stop()
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
});
