$(document).ready(function () {

  // Insert HTML for Playbar:
  $("#potree_render_area").prepend(`
    <div class="overlay">
      <div class="slidecontainer">
        <input type="range" min="0" max="100" value=50 step="0.01" class="slider" id="myRange">
        <div id="spacer">

          <div id="value" class="inline">
            <button class="button" class="play" id="playbutton" class="inline"><i class="material-icons">play_arrow</i></button>
            <button class="button" class="pause" id="pausebutton"><i class="material-icons">pause</i></button>
            Time: <span id="demo">0.0000</span> seconds
            <span id="playbar_timewindows">
              <input type="number" id="playbar_tmin" value=0.05 max=0 step="any">
              <input type="number" id="playbar_tmax" value=0.05 min=0 step="any">
            </span>
          </div>
        </div>
      </div>
    </div>
    `);
});
