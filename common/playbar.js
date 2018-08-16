$(document).ready(function () {

  // Insert HTML for Playbar:
  var playbarhtml = $(`
    <div class="overlay">
      <div class="slidecontainer">
        <input type="range" min="0" max="100" value=0 step="0.01" class="slider" id="myRange">
        <div id="spacer">

          <div id="value" class="inline">
            <button class="button" class="play" id="playbutton" class="inline"><i class="material-icons">play_arrow</i></button>
            <button class="button" class="pause" id="pausebutton"><i class="material-icons">pause</i></button>
            Time: <span id="demo">0.0000</span> seconds
            <span id="playbar_timewindows">
              <input type="number" id="playbar_tmin" value=-0.05 max=0 step="0.01">
              <input type="number" id="playbar_tmax" value=0.05 min=0 step="0.01">
            </span>
            <label class="switch">
              <input type="checkbox" id="playbar_toggle">
              <span class="toggleslider"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
    `);

    // Add to DOM:
    $("#potree_render_area").append(playbarhtml);

    // Define function to update clip range:
    function update(disable=false) {

      var lidarOffset = window.viewer.scene.pointclouds[0].pcoGeometry.nodes.r.gpsTime.offset;
      // lidarOffset = 1495189467.550001;  // TODO Hardcoded b/c PotreeConverter is throwing away initial offset
      var lidarRange = window.viewer.scene.pointclouds[0].pcoGeometry.nodes.r.gpsTime.range;

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
        console.log(document.getElementById("demo").innerHTML);

        var dtMin = Number($("#playbar_tmin").val());
        var dtMax = Number($("#playbar_tmax").val());

        tmin = t + dtMin;
        tmax = t + dtMax;

        window.viewer.setFilterGPSTimeRange(tmin, tmax);
      }
    }

    playbarhtml.find("#playbar_tmin").on('input', function() {
      console.log("TMIN");
      update();
    });

    playbarhtml.find("#playbar_tmax").on('input', function() {
      console.log("TMAX");
      update();
    });

    playbarhtml.find("#myRange").on('input', function() {
      console.log("SLIDER");
      update();
    });
    playbarhtml.find("#myRange").on("scroll", function(e) {
      console.log(e);
    });

    playbarhtml.find("#playbar_toggle").click(function() {
      console.log("Temp Button");
      update(disable=this.checked);
    })



});
