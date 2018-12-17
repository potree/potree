$(document).ready(function () {

  // Insert HTML for Playbar:
  var loadingscreen = $(`
    <div id="loading_overlay">
      <div id="loading-bar" class="ldBar label-center" data-preset="circle" data-stroke="data:ldbar/res,gradient(0,1,#f99,#ff9)" data-value="0">
      </div>
    </div>`);


  // Add to DOM:
  $('body').prepend(loadingscreen);

  // // NOTE: using https://loadingbar.io/progress
  // const loadingBar = new ldBar("#loading-bar"); // TODO not used -- how to export loadingBar variable?

});

export function setLoadingScreen() {
  window.loadingScreenUp = true;
  document.getElementById("loading_overlay").style.display = "table";
}

export function removeLoadingScreen() {
  window.loadingScreenUp = false;
  document.getElementById("loading_overlay").style.display = "none";
}

export function getLoadingBar() {
  // NOTE: using https://loadingbar.io/progress
  const loadingBar = new ldBar("#loading-bar");
  return loadingBar;
}
