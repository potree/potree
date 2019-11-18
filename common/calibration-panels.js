$(document).ready(function () {

  // Insert HTML for Playbar:
  var draggableOverlays = $(`
    <div class="draggable-overlay" id="calibration-overlay-rtk2vehicle">
      <div class="draggable-overlay-header" id="calibration-overlay-rtk2vehicle-header">RTK to Vehicle Mesh Extrinsics</div>
        <span class='disable-calibration-panel'> CALIBRATION PANEL DISABLED: <br> <span class="disable-calibration-panel-reason"></span> </span>
        <p><span>
            X: <span class="calibration-value" id="rtk2vehicle-x">0.0000</span> m
            Setpoint: <input class="calibration-setpoint" id="rtk2vehicle-setpoint-x" type="number" placeholder="" step='any' value='0'/> m
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> m
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Y: <span class="calibration-value" id="rtk2vehicle-y">0.0000</span> m
            Setpoint: <input class="calibration-setpoint" id="rtk2vehicle-setpoint-y" type="number" placeholder="" step='any' value='0'/> m
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> m
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Z: <span class="calibration-value" id="rtk2vehicle-z">0.0000</span> m
            Setpoint: <input class="calibration-setpoint" id="rtk2vehicle-setpoint-z" type="number" placeholder="" step='any' value='0'/> m
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> m
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Roll: <span class="calibration-value" id="rtk2vehicle-roll">0.0000</span> rad
            Setpoint: <input class="calibration-setpoint" id="rtk2vehicle-setpoint-roll" type="number" placeholder="" step='any' value='0'/> rad
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> rad
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Pitch: <span class="calibration-value" id="rtk2vehicle-pitch">0.0000</span> rad
            Setpoint: <input class="calibration-setpoint" id="rtk2vehicle-setpoint-pitch" type="number" placeholder="" step='any' value='0'/> rad
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> rad
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Yaw: <span class="calibration-value" id="rtk2vehicle-yaw">0.0000</span> rad
            Setpoint: <input class="calibration-setpoint" id="rtk2vehicle-setpoint-yaw" type="number" placeholder="" step='any' value='0'/> rad
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> rad
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        </div>
    </div>

    <div class="draggable-overlay" id="calibration-overlay-velo2rtk">
      <div class="draggable-overlay-header" id="calibration-overlay-velo2rtk-header">Velodyne to RTK Extrinsics</div>
        <span class='disable-calibration-panel'> CALIBRATION PANEL DISABLED: <br> <span class="disable-calibration-panel-reason"></span> </span>
        <p><span>
            X: <span class="calibration-value" id="velo2rtk-x">0.0000</span> m
            Setpoint: <input class="calibration-setpoint" id="velo2rtk-setpoint-x" type="number" placeholder="" step='any' value='0'/> m
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> m
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Y: <span class="calibration-value" id="velo2rtk-y">0.0000</span> m
            Setpoint: <input class="calibration-setpoint" id="velo2rtk-setpoint-y" type="number" placeholder="" step='any' value='0'/> m
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> m
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Z: <span class="calibration-value" id="velo2rtk-z">0.0000</span> m
            Setpoint: <input class="calibration-setpoint" id="velo2rtk-setpoint-z" type="number" placeholder="" step='any' value='0'/> m
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> m
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Roll: <span class="calibration-value" id="velo2rtk-roll">0.0000</span> rad
            Setpoint: <input class="calibration-setpoint" id="velo2rtk-setpoint-roll" type="number" placeholder="" step='any' value='0'/> rad
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> rad
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Pitch: <span class="calibration-value" id="velo2rtk-pitch">0.0000</span> rad
            Setpoint: <input class="calibration-setpoint" id="velo2rtk-setpoint-pitch" type="number" placeholder="" step='any' value='0'/> rad
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> rad
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Yaw: <span class="calibration-value" id="velo2rtk-yaw">0.0000</span> rad
            Setpoint: <input class="calibration-setpoint" id="velo2rtk-setpoint-yaw" type="number" placeholder="" step='any' value='0'/> rad
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> rad
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>
        <button type="button" id="download_cals_button" class="download-cals" onclick="downloadCals();">Download</button>
      </div>
    `);


              //
              // <p>
              //   <span>
              //     X: <span class="value" id="rtk2vehicle-x"></span>
              //     Setpoint: <input type="number" placeholder="" step='any' value='0'/> m
              //     <input type="range" min="0" max="10" step="any" />
              //     Range: <input type="number" step='any'/> m
              //     <button type="button">update</button>
              //   </span>
              // </p>



  // Add to DOM:
  $('body').prepend(draggableOverlays);

  // Make the DIV element draggable:
  // dragElement($(".draggable-overlay"));
  dragElement(document.getElementById("calibration-overlay-velo2rtk"));
  dragElement(document.getElementById("calibration-overlay-rtk2vehicle"));
  $("#download_cals_button").click = function() {downloadCals();};


  function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "-header")) { // TODO make jquery
      // if present, the header is where you move the DIV from:
      document.getElementById(elmnt.id + "-header").onmousedown = dragMouseDown;
    } else {
      // otherwise, move the DIV from anywhere inside the DIV:
      elmnt.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
      e = e || window.event;
      e.preventDefault();
      // get the mouse cursor position at startup:
      pos3 = e.clientX;
      pos4 = e.clientY;
      document.onmouseup = closeDragElement;
      // call a function whenever the cursor moves:
      document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
      e = e || window.event;
      e.preventDefault();
      // calculate the new cursor position:
      pos1 = pos3 - e.clientX;
      pos2 = pos4 - e.clientY;
      pos3 = e.clientX;
      pos4 = e.clientY;
      // set the element's new position:
      elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
      elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
      // stop moving when mouse button is released:
      document.onmouseup = null;
      document.onmousemove = null;
    }
  }

  // Set scale slider:
  let calibrationPanels = $(".draggable-overlay");
  for (let ii = 0, len=calibrationPanels.length; ii < len; ii++) {
    var calibrationPanel = calibrationPanels[ii];

    let pElements = calibrationPanel.getElementsByTagName("p");
    for (let jj = 0, len2=pElements.length; jj < len2; jj++) {
      let span = pElements[jj].children[0];

      let value = span.querySelector(".calibration-value");
      let setpoint = span.querySelector(".calibration-setpoint");
      let stepsize = span.querySelector(".calibration-step");
      let slider = span.querySelector(".calibration-slider");
      let reset = span.querySelector(".calibration-reset");

      slider.oninput = function() {
        let sliderVal = parseFloat(slider.value);
        let setpointVal = parseFloat(setpoint.value);
        let stepsizeVal = parseFloat(stepsize.value);
        let val = setpointVal+stepsizeVal*sliderVal;

        value.textContent = val.toFixed(4);

        let idComponents = value.id.split('-');
        let id = idComponents[0];
        let dim = idComponents[idComponents.length-1];

        let event = new CustomEvent("update-calibration-panel", {detail:{id:id, dim:dim, val:val}});
        window.dispatchEvent(event);
      }

      reset.onmouseup = function() {
        // setpoint.value = 0;
        stepsize.value = 1;
        slider.value = 0;
        let val = parseFloat(setpoint.value)+stepsize.value*slider.value;

        value.textContent = val.toFixed(4);

        let idComponents = value.id.split('-');
        let id = idComponents[0];
        let dim = idComponents[idComponents.length-1];

        let event = new CustomEvent("update-calibration-panel", {detail:{id:id, dim:dim, val:val}});
        window.dispatchEvent(event);
      }

    }
  }
  $(".draggable-overlay")[0].children[1].children[0].children; // Gives each span
});

function getRtk2Vehicle() {
  let rtk2vehicle = {
    x: parseFloat($("#rtk2vehicle-x").text()),
    y: parseFloat($("#rtk2vehicle-y").text()),
    z: parseFloat($("#rtk2vehicle-z").text()),
    roll: parseFloat($("#rtk2vehicle-roll").text()),
    pitch: parseFloat($("#rtk2vehicle-pitch").text()),
    yaw: parseFloat($("#rtk2vehicle-yaw").text())
  }
  // debugger; // return
  return rtk2vehicle;
}

function getVelo2Rtk() {
  let velo2rtk = {
    x: parseFloat($("#velo2rtk-x").text()),
    y: parseFloat($("#velo2rtk-y").text()),
    z: parseFloat($("#velo2rtk-z").text()),
    roll: parseFloat($("#velo2rtk-roll").text()),
    pitch: parseFloat($("#velo2rtk-pitch").text()),
    yaw: parseFloat($("#velo2rtk-yaw").text())
  }
  // debugger; // return
  return velo2rtk;
}

function disablePanels(reason) {
  $("#calibration-overlay-velo2rtk :input").attr("disabled", true);
  $("#calibration-overlay-rtk2vehicle :input").attr("disabled", true);

  $('.disable-calibration-panel').each((i, obj) => obj.style.display = "block");
  $('.disable-calibration-panel-reason').each((i, obj) => obj.innerHTML = reason || "");
}

function enablePanels() {
  $("#calibration-overlay-velo2rtk :input").attr("disabled", false);
  $("#calibration-overlay-rtk2vehicle :input").attr("disabled", false);

  $('.disable-calibration-panel').each((i, obj) => obj.style.display = "none");
  $('.disable-calibration-panel-reason').each((i, obj) => obj.innerHTML = "");
}


function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function downloadCals() {
  const x =  $("#velo2rtk-x").text()
  const y =  $("#velo2rtk-y").text()
  const z =  $("#velo2rtk-z").text()
  const roll =  $("#velo2rtk-roll").text()
  const pitch =  $("#velo2rtk-pitch").text()
  const yaw =  $("#velo2rtk-yaw").text()

  let version;
  if (window.usingAdjustedHeading) {
    version = '2.0';
  } else {
    version = '1.0';
  }

  let text = `${x}, ${y}, ${z}\n${roll}, ${pitch}, ${yaw}\nversion: ${version}`;

  let date = new Date();
  let year = `${date.getYear() + 1900}`.padStart(4, '0')
  let month = `${date.getMonth() + 1}`.padStart(2, '0')
  let day = `${date.getDate() + 0}`.padStart(2, '0')
  download(`EXTRINSICS_UNKNOWN_${year}${month}${day}_N001.txt`, text);
}


function storeRtk2Vehicle(rtk2vehicle) {
  try {
    $("#rtk2vehicle-setpoint-x").val(rtk2vehicle.x);
    $("#rtk2vehicle-x").text(rtk2vehicle.x.toFixed(4));
    $("#rtk2vehicle-x").trigger("input");
    $("#rtk2vehicle-setpoint-y").val(rtk2vehicle.y);
    $("#rtk2vehicle-y").text(rtk2vehicle.y.toFixed(4));
    $("#rtk2vehicle-y").trigger("input");
    $("#rtk2vehicle-setpoint-z").val(rtk2vehicle.z);
    $("#rtk2vehicle-z").text(rtk2vehicle.z.toFixed(4));
    $("#rtk2vehicle-z").trigger("input");
    $("#rtk2vehicle-setpoint-roll").val(rtk2vehicle.roll);
    $("#rtk2vehicle-roll").text(rtk2vehicle.roll.toFixed(4));
    $("#rtk2vehicle-roll").trigger("input");
    $("#rtk2vehicle-setpoint-pitch").val(rtk2vehicle.pitch);
    $("#rtk2vehicle-pitch").text(rtk2vehicle.pitch.toFixed(4));
    $("#rtk2vehicle-pitch").trigger("input");
    $("#rtk2vehicle-setpoint-yaw").val(rtk2vehicle.yaw);
    $("#rtk2vehicle-yaw").text(rtk2vehicle.yaw.toFixed(4));
    $("#rtk2vehicle-yaw").trigger("input");
    console.log("Stored Rtk to Vehicle Extrinsics");

  } catch (e) {
    console.error("Could not store RTK to Vehicle Calibration Extrinsics", e);
  }
}

function storeVelo2Rtk(velo2rtk) {
  try {
    $("#velo2rtk-setpoint-x").val(velo2rtk.x);
    $("#velo2rtk-x").text(velo2rtk.x.toFixed(4));
    $("#velo2rtk-x").trigger('input');
    $("#velo2rtk-setpoint-y").val(velo2rtk.y);
    $("#velo2rtk-y").text(velo2rtk.y.toFixed(4));
    $("#velo2rtk-y").trigger('input');
    $("#velo2rtk-setpoint-z").val(velo2rtk.z);
    $("#velo2rtk-z").text(velo2rtk.z.toFixed(4));
    $("#velo2rtk-z").trigger('input');
    $("#velo2rtk-setpoint-roll").val(velo2rtk.roll);
    $("#velo2rtk-roll").text(velo2rtk.roll.toFixed(4));
    $("#velo2rtk-roll").trigger('input');
    $("#velo2rtk-setpoint-pitch").val(velo2rtk.pitch);
    $("#velo2rtk-pitch").text(velo2rtk.pitch.toFixed(4));
    $("#velo2rtk-pitch").trigger('input');
    $("#velo2rtk-setpoint-yaw").val(velo2rtk.yaw);
    $("#velo2rtk-yaw").text(velo2rtk.yaw.toFixed(4));
    $("#velo2rtk-yaw").trigger('input');
    console.log("Stored Rtk to Vehicle Extrinsics");

  } catch (e) {
    console.error("Could not store Velodyne to RTK Calibration Extrinsics", e);
  }
}
