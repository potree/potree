$(document).ready(function () {

  // Insert HTML for Playbar:
  var loadingscreen = $(`
    <div id="loading_overlay">
      <div id="loading-bar" class="ldBar label-center" data-preset="circle" data-stroke="data:ldbar/res,gradient(0,1,#f99,#ff9)" style="color:white" data-value="0"></div>
      <div id="loading-bar-total" class="ldBar label-center" data-preset="circle" data-stroke="data:ldbar/res,gradient(0,1,#f99,#ff9)" style="color:white" data-value="0"></div>
    </div>`);


  // Add to DOM:
  $('body').prepend(loadingscreen);

  // // NOTE: using https://loadingbar.io/progress
  // const loadingBar = new ldBar("#loading-bar"); // TODO not used -- how to export loadingBar variable?

});

export const numberDownloads = 6; // TODO: find a way to make this dynamic 


export function setLoadingScreen() {
  $("#loading-bar-total")[0].style.display = "inline-block";
  $("#loading-bar")[0].style.display = "inline-block";
  window.loadingScreenUp = true;
  document.getElementById("loading_overlay").style.display = "flex";
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
