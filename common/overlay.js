"use strict"
$(document).ready(function () {
  
  // get correct fonts/themes
  const params = new URLSearchParams(location.search);
  const theme = JSON.parse(params.get("theme")) // material-ui theme 
  const loadingBarColor = theme.palette.secondary.main;

  // Insert HTML for Playbar/Loading Bars:
  // data-stroke-width & data-stroke-width determines the height of the bar
  // style width determines how long the bar is   
  var loadingscreen = $(`
    <div id="loading_overlay">
      <div id="loading-bar"
        class="ldBar label-center" 
        data-preset="line" 
        data-stroke="<<loadingBarColor>>" 
        data-stroke-trail-background="<<loadingBarColor>>" 
        data-value="0"
        data-stroke-width="5"       
        data-stroke-trail-width="5"
        style="
          color:  white; 
          width:  30%;
          height: 10%;
        "> 
      </div>
      <div id="loading-bar-total"
        class="ldBar label-center" 
        data-preset="line" 
        data-stroke="<<loadingBarColor>>" 
        data-stroke-trail-background="<<loadingBarColor>>" 
        data-value="0"
        data-stroke-width="5"       
        data-stroke-trail-width="5"
        style="
          color:  white; 
          width:  30%;
          height: 10%;
        "> 
      </div>
    </div>`.replace(/<<loadingBarColor>>/gm, loadingBarColor));

  // Add to DOM:
  $('body').prepend(loadingscreen);

  // // NOTE: using https://loadingbar.io/progress
  // const loadingBar = new ldBar("#loading-bar"); // TODO not used -- how to export loadingBar variable?

});


// 6 downloads:  loadRtkFlatbuffer, loadRtkCallback(car texture and object), loadLanesCallback, loadTracksCallback, loadRemCallback
// 4 loadings: 	parseRTK, parseLanes, parseTracks, parseControlPoints(remLoader.js)
export const numberTasks = 10; // TODO: find a way to make this dynamic 

/* 
 * Function that hands back control of the thread to the window such that it can update the progress bar.
 * Without using it whenever setting the loading bar, the javascript code will run and block the UI that 
 * needs to update the loading bar  
 * CURRENTLY: even though everything should be 
*/
export async function pause(name) {
  // argument for debugging if user wants to log what is currently trying to set the progress bar
  if (name) { console.log("pause " + name);}
  return new Promise(resolve => setTimeout(() => {resolve()}, 0));
}

export function setLoadingScreen() {
  // set style of loading screen
  $("#loading-bar-total")[0].style.display = "inline-block";
  $("#loading-bar")[0].style.display = "inline-block";
  document.getElementById("loading_overlay").style.display = "flex";

  // set starting position of loading bars
  let loadingBar = getLoadingBar();
  let loadingBarTotal = getLoadingBarTotal();
  loadingBar.set(0);
  loadingBarTotal.set(0);
  window.loadingScreenUp = true;
}

export function removeLoadingScreen() {
  window.loadingScreenUp = false;
  document.getElementById("loading_overlay").style.display = "none";
}

// Tracks individual progress
export function getLoadingBar() {
  const loadingBar = new ldBar("#loading-bar");
  return loadingBar;
}

// Tracks total progress
export function getLoadingBarTotal() {
  const totalLoadingBar = new ldBar("#loading-bar-total");
  return totalLoadingBar;
}
