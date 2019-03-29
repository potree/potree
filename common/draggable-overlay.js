$(document).ready(function () {

  // Insert HTML for Playbar:
  var draggableOverlays = $(`
    <div class="draggable-overlay" id="calibration-overlay-velo2rtk">
      <div class="draggable-overlay-header" id="calibration-overlay-velo2rtk-header">Velodyne to RTK Extrinsics</div>
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
      </div>

      <div class="draggable-overlay" id="calibration-overlay-rtk2vehicle">
        <div class="draggable-overlay-header" id="calibration-overlay-rtk2vehicle-header">RTK to Vehicle Extrinsics</div>

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
            Roll: <span class="calibration-value" id="rtk2vehicle-roll">0.0000</span> m
            Setpoint: <input class="calibration-setpoint" id="rtk2vehicle-setpoint-roll" type="number" placeholder="" step='any' value='0'/> rad
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> rad
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Pitch: <span class="calibration-value" id="rtk2vehicle-pitch">0.0000</span> m
            Setpoint: <input class="calibration-setpoint" id="rtk2vehicle-setpoint-pitch" type="number" placeholder="" step='any' value='0'/> rad
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> rad
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        <p><span>
            Yaw: <span class="calibration-value" id="rtk2vehicle-yaw">0.0000</span> m
            Setpoint: <input class="calibration-setpoint" id="rtk2vehicle-setpoint-yaw" type="number" placeholder="" step='any' value='0'/> rad
            <input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" />
            Range: <input class="calibration-step" type="number" value="1" step='any'/> rad
            <button type="button" class="calibration-reset">Reset</button>
        </span></p>

        </div>
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

  function dragElement(elmnt) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (document.getElementById(elmnt.id + "-header")) { // TODO make jquery
      console.log(elmnt.id+"-header Exists!");
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
  calibrationPanels = $(".draggable-overlay");
  for (let ii = 0, len=calibrationPanels.length; ii < len; ii++) {
    var calibrationPanel = calibrationPanels[ii];

    pElements = calibrationPanel.children;
    for (let jj = 1, len2=pElements.length; jj < len2; jj++) {
      let span = pElements[jj].children[0];
      // let span = $(".draggable-overlay")[0].children[1].children[0];

      let value = span.querySelector(".calibration-value");
      let setpoint = span.querySelector(".calibration-setpoint");
      let stepsize = span.querySelector(".calibration-step");
      let slider = span.querySelector(".calibration-slider");
      let reset = span.querySelector(".calibration-reset");

      slider.oninput = function() {
        console.log('TESTING SLIDER VALUE', slider.value+17);
        console.log('TESTING:', value);
        sliderVal = parseFloat(slider.value);
        setpointVal = parseFloat(setpoint.value);
        stepsizeVal = parseFloat(stepsize.value);
        val = setpointVal+stepsizeVal*sliderVal;

        value.textContent = val.toFixed(4);
        console.log("TESTING RESULT: ", val);
        // debugger; //id

        let idComponents = value.id.split('-');
        let id = idComponents[0];
        let dim = idComponents[idComponents.length-1];

        let event = new CustomEvent("update-calibration-panel", {detail:{id:id, dim:dim, val:val}});
        window.dispatchEvent(event);
      }

      reset.onmouseup = function() {
        console.log("Reset Calibration Value");
        setpoint.value = 0;
        stepsize.value = 1;
        slider.value = 0;
        value.textContent = (0).toFixed(4);

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
