"use strict";

import { getTxMat } from "../demo/calibrationManager.js";

$(document).ready(function () {

  // Insert HTML for Playbar:
  const draggableOverlays = $(`
    <div class="draggable-overlay" id="calibration-overlay-rtk2vehicle">
      <div class="draggable-overlay-header" id="calibration-overlay-rtk2vehicle-header">RTK to Vehicle Mesh Extrinsics</div>
      <span class='disable-calibration-panel'> CALIBRATION PANEL DISABLED: <br> <span class="disable-calibration-panel-reason"></span> </span>
      
      <table>
      <tr>
        <th>Parameter</th>
        <th>New Value</th>
        <th>Original Value</th>
        <th>Setpoint</th>
        <th>Slider</th>
        <th>Slider Range</th>
        <th>Reset to Loaded</th>
      </tr>

      <tr>
          <td>X</td>
          <td><span class="calibration-value" id="rtk2vehicle-x">0.0000</span> <span class="translation-unit">m</span></td>
          <td><input class="calibration-original" id="rtk2vehicle-loaded-x" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-setpoint" id="rtk2vehicle-setpoint-x" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="translation-unit">m</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Y</td>
          <td><span class="calibration-value" id="rtk2vehicle-y">0.0000</span> <span class="translation-unit">m</span></td>
          <td><input class="calibration-original" id="rtk2vehicle-loaded-y" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-setpoint" id="rtk2vehicle-setpoint-y" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="translation-unit">m</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Z</td>
          <td><span class="calibration-value" id="rtk2vehicle-z">0.0000</span> <span class="translation-unit">m</span></td>
          <td><input class="calibration-original" id="rtk2vehicle-loaded-z" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-setpoint" id="rtk2vehicle-setpoint-z" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="translation-unit">m</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Roll</td>
          <td><span class="calibration-value" id="rtk2vehicle-roll">0.0000</span> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-original" id="rtk2vehicle-loaded-roll" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-setpoint" id="rtk2vehicle-setpoint-roll" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="rotation-unit">rad</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Pitch</td>
          <td><span class="calibration-value" id="rtk2vehicle-pitch">0.0000</span> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-original" id="rtk2vehicle-loaded-pitch" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-setpoint" id="rtk2vehicle-setpoint-pitch" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="rotation-unit">rad</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Yaw</td>
          <td><span class="calibration-value" id="rtk2vehicle-yaw">0.0000</span> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-original" id="rtk2vehicle-loaded-yaw" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-setpoint" id="rtk2vehicle-setpoint-yaw" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="rotation-unit">rad</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>
      </table>
    </div>

    <div class="draggable-overlay" id="calibration-overlay-velo2rtk">
      <div class="draggable-overlay-header" id="calibration-overlay-velo2rtk-header">Velodyne to RTK Extrinsics</div>
      <span class='disable-calibration-panel'> CALIBRATION PANEL DISABLED: <br> <span class="disable-calibration-panel-reason"></span> </span>
      
      <table>
      <tr>
        <th>Parameter</th>
        <th>New Value</th>
        <th>Original Value</th>
        <th>Setpoint</th>
        <th>Slider</th>
        <th>Slider Range</th>
        <th>Reset to Loaded</th>
      </tr>

      <tr>
          <td>X</td>
          <td><span class="calibration-value" id="velo2rtk-x">0.0000</span> <span class="translation-unit">m</span></td>
          <td><input class="calibration-original" id="velo2rtk-loaded-x" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-setpoint" id="velo2rtk-setpoint-x" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="translation-unit">m</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Y</td>
          <td><span class="calibration-value" id="velo2rtk-y">0.0000</span> <span class="translation-unit">m</span></td>
          <td><input class="calibration-original" id="velo2rtk-loaded-y" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-setpoint" id="velo2rtk-setpoint-y" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="translation-unit">m</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Z</td>
          <td><span class="calibration-value" id="velo2rtk-z">0.0000</span> <span class="translation-unit">m</span></td>
          <td><input class="calibration-original" id="velo2rtk-loaded-z" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-setpoint" id="velo2rtk-setpoint-z" type="number" placeholder="" step='any' value='0'/> <span class="translation-unit">m</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="translation-unit">m</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Roll</td>
          <td><span class="calibration-value" id="velo2rtk-roll">0.0000</span> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-original" id="velo2rtk-loaded-roll" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-setpoint" id="velo2rtk-setpoint-roll" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="rotation-unit">rad</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Pitch</td>
          <td><span class="calibration-value" id="velo2rtk-pitch">0.0000</span> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-original" id="velo2rtk-loaded-pitch" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-setpoint" id="velo2rtk-setpoint-pitch" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="rotation-unit">rad</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>

      <tr>
          <td>Yaw</td>
          <td><span class="calibration-value" id="velo2rtk-yaw">0.0000</span> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-original" id="velo2rtk-loaded-yaw" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-setpoint" id="velo2rtk-setpoint-yaw" type="number" placeholder="" step='any' value='0'/> <span class="rotation-unit">rad</span></td>
          <td><input class="calibration-slider" type="range" min="-1" max="1" value="0" step="any" /></td>
          <td><input class="calibration-step" type="number" value="1" step='any'/> <span class="rotation-unit">rad</span></td>
          <td><button type="button" class="calibration-reset">Reset</button></td>
      </tr>
      </table>
      <button type="button" id="download_cals_button" class="download-cals" >Download</button>
    </div>
    `);

  // Add to DOM:
  $('body').prepend(draggableOverlays);

  // Make the DIV element draggable:
  dragElement(document.getElementById("calibration-overlay-velo2rtk"));
  dragElement(document.getElementById("calibration-overlay-rtk2vehicle"));
  $(document).on('click', '#download_cals_button', function() { downloadCals(); } );

  // Disable inputs where loaded calibration values are stored:
  $(".calibration-original").each( (i, elem) => {elem.disabled = true; });

  function dragElement(elmnt) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
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
  const calibrationPanels = $(".draggable-overlay");
  for (let ii = 0, len=calibrationPanels.length; ii < len; ii++) {
    const calibrationPanel = calibrationPanels[ii];

    const trElements = calibrationPanel.getElementsByTagName("tr");
    for (let jj = 1, len2=trElements.length; jj < len2; jj++) {
      const row = trElements[jj];

      const value = row.querySelector(".calibration-value");
      const loaded = row.querySelector(".calibration-original");
      const setpoint = row.querySelector(".calibration-setpoint");
      const stepsize = row.querySelector(".calibration-step");
      const slider = row.querySelector(".calibration-slider");
      const reset = row.querySelector(".calibration-reset");

      let updateValue = function() {
        // TODO Validate output of Number() below
        const sliderVal = Number(slider.value);
        const setpointVal = Number(setpoint.value);
        const stepsizeVal = Number(stepsize.value);
        const val = setpointVal+stepsizeVal*sliderVal;

        value.textContent = val.toFixed(4);

        const idComponents = value.id.split('-');
        const id = idComponents[0];
        const dim = idComponents[idComponents.length-1];

        const event = new CustomEvent("update-calibration-panel", {detail:{id:id, dim:dim, val:val}});
        window.dispatchEvent(event);
      }

      slider.oninput = updateValue;
      setpoint.oninput = updateValue;

      reset.onmouseup = function() {
        setpoint.value = loaded.value;
        stepsize.value = 1;
        slider.value = 0;
        const val = Number(setpoint.value)+stepsize.value*slider.value;

        value.textContent = val.toFixed(4);

        const idComponents = value.id.split('-');
        const id = idComponents[0];
        const dim = idComponents[idComponents.length-1];

        const event = new CustomEvent("update-calibration-panel", {detail:{id:id, dim:dim, val:val}});
        window.dispatchEvent(event);
      }

    }
  }
  $(".draggable-overlay")[0].children[1].children[0].children; // Gives each span
});

function rad2Deg(objectRad) {
  let output = {...objectRad};

  output.roll = objectRad.roll / Math.PI * 180.0; 
  output.pitch = objectRad.pitch / Math.PI * 180.0; 
  output.yaw = objectRad.yaw/ Math.PI * 180.0; 
  output.isDegrees = false;

  return output;
}

function deg2Rad(objectDeg) {
  let output = {...objectDeg};

  output.roll = objectDeg.roll / 180.0 * Math.PI;
  output.pitch = objectDeg.pitch / 180.0 * Math.PI;
  output.yaw = objectDeg.yaw / 180.0 * Math.PI;
  output.isDegrees = true;

  return output;
}

function convertToCorrectUnits(object) {
  if (window.calibrationPanelDegrees && object.isDegrees) {
    return object;
  } else if (window.calibrationPanelDegrees && !object.isDegrees) {
    return rad2Deg(object);
  } else if (!window.calibrationPanelDegrees && !object.isDegrees) {
    return object;
  } else if (!window.calibrationPanelDegrees && object.isDegrees) {
    return deg2Rad(object);
  } else {
    console.error("Should not be here");
  }
}

export function getRtk2Vehicle() {
  const rtk2vehicle = {
    x: Number($("#rtk2vehicle-x").text()),
    y: Number($("#rtk2vehicle-y").text()),
    z: Number($("#rtk2vehicle-z").text()),
    roll: Number($("#rtk2vehicle-roll").text()),
    pitch: Number($("#rtk2vehicle-pitch").text()),
    yaw: Number($("#rtk2vehicle-yaw").text())
  }

  // Always return values in radians:
  if (storedRtk2VehicleUnit === 'deg') {
    return deg2Rad(rtk2vehicle);
  } else {
    return rtk2vehicle;
  }
}

export function getVelo2Rtk() {
  const velo2rtk = {
    x: Number($("#velo2rtk-x").text()),
    y: Number($("#velo2rtk-y").text()),
    z: Number($("#velo2rtk-z").text()),
    roll: Number($("#velo2rtk-roll").text()),
    pitch: Number($("#velo2rtk-pitch").text()),
    yaw: Number($("#velo2rtk-yaw").text())
  }

  // Always return values in radians:
  if (storedVelo2RtkUnit === 'deg') {
    return deg2Rad(velo2rtk);
  } else {
    return velo2rtk;
  }
}

export function disablePanels(reason) {
  console.error("Calibration Panels DISABLED - ", reason);

  $("#calibration-overlay-velo2rtk :input").attr("disabled", true);
  $("#calibration-overlay-rtk2vehicle :input").attr("disabled", true);

  $('.disable-calibration-panel').each((i, obj) => obj.style.display = "block");
  $('.disable-calibration-panel-reason').each((i, obj) => obj.innerHTML = reason || "");
}

export function enablePanels() {
  console.log("Calibration Panels ENABLED");
  $("#calibration-overlay-velo2rtk :input").attr("disabled", false);
  $("#calibration-overlay-rtk2vehicle :input").attr("disabled", false);

  // Leave the "loaded" input disabled (this is where the original cals are displayed):
  $(".calibration-original").each( (i, elem) => {elem.disabled = true} );


  $('.disable-calibration-panel').each((i, obj) => obj.style.display = "none");
  $('.disable-calibration-panel-reason').each((i, obj) => obj.innerHTML = "");
}


function download(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function downloadCals() {

  // Get final values from calibration panels:
  let calPanelValues = {
    x :  Number($("#velo2rtk-x").text()),
    y :  Number($("#velo2rtk-y").text()),
    z :  Number($("#velo2rtk-z").text()),
    roll :  Number($("#velo2rtk-roll").text()),
    pitch :  Number($("#velo2rtk-pitch").text()),
    yaw :  Number($("#velo2rtk-yaw").text()),
  };

  // Convert to radians if in degrees: 
  if (storedVelo2RtkUnit === 'deg') {
    calPanelValues = deg2Rad(calPanelValues);
  }

  const version = Number(window.extrinsics.velo2Rtk.old.version).toFixed(1);

  const velo2Rtk = getVelo2Rtk();
  const txMat = getTxMat(velo2Rtk, window.calibrationSettings.correctionsIsPassiveTransform);
  const transformString = txMat.elements.join(", ");

  let description="";
  if (version <= 2.0) {
    description += "\n\tLine 1: X, Y, Z in meters - representing the position of the RT origin from the Velodyne’s reference frame.";
    description += "\n\tLine 2: Roll, Pitch, Yaw in radians - representing the relative rotation needed to transform the Velodyne Coordinate Frame to the RT Coordinate Frame. The rotation can be constructed from these euler angles using the ZYX intrinsic convention."
    description += "\n\tLine 3: Version 2.0 - The calibration parameters in this file represent the full Velodyne to ISO 8855 Vehicle Frame transform (and using the adjusted UTM heading). In version 2.0, these parameters define an active transformation.";
    description += "\n\tLine 4: Transform matrix generated from parameters as specified in lines 1-3 in column-major order."; 
  } else if (version > 2.0) {
    description += "\n\tLine 1: X, Y, Z in meters - representing the position of the RT origin from the Velodyne’s reference frame.";
    description += "\n\tLine 2: Roll, Pitch, Yaw in radians - representing the relative rotation needed to transform the Velodyne Coordinate Frame to the RT Coordinate Frame. The rotation can be constructed from these euler angles using the ZYX intrinsic convention.";
    description += "\n\tLine 3: Version 3.0 - The calibration parameters in this file represent the correction needed on top of the nominal SLED extrinsics (physically this correction represents the difference the physical hardware mounting and the SLED CAD model). In version 3.0, these parameters define a passive transformation.";
    description += "\n\tLine 4: Transform matrix generated from parameters as specified in lines 1-3 in column-major order."; 
  }

  const text = `${calPanelValues.x}, ${calPanelValues.y}, ${calPanelValues.z}\n${calPanelValues.roll}, ${calPanelValues.pitch}, ${calPanelValues.yaw}\nVersion: ${version}\nTransform Matrix (column-major): ${transformString}\nDescription: ${description}`;

  const date = new Date();
  const year = `${date.getYear() + 1900}`.padStart(4, '0')
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate() + 0}`.padStart(2, '0')
  download(`EXTRINSICS_UNKNOWN_${year}${month}${day}_N001.txt`, text);
}


export function storeRtk2Vehicle(rtk2VehicleInput) {

  const rtk2vehicle = convertToCorrectUnits(rtk2VehicleInput);

  try {
    $("#rtk2vehicle-loaded-x").val(Number(rtk2vehicle.x).toFixed(4));
    $("#rtk2vehicle-setpoint-x").val(Number(rtk2vehicle.x).toFixed(4));
    $("#rtk2vehicle-x").text(rtk2vehicle.x.toFixed(4));
    $("#rtk2vehicle-x").trigger("input");
    $("#rtk2vehicle-loaded-y").val(Number(rtk2vehicle.y).toFixed(4));
    $("#rtk2vehicle-setpoint-y").val(Number(rtk2vehicle.y).toFixed(4));
    $("#rtk2vehicle-y").text(rtk2vehicle.y.toFixed(4));
    $("#rtk2vehicle-y").trigger("input");
    $("#rtk2vehicle-loaded-z").val(Number(rtk2vehicle.z).toFixed(4));
    $("#rtk2vehicle-setpoint-z").val(Number(rtk2vehicle.z).toFixed(4));
    $("#rtk2vehicle-z").text(rtk2vehicle.z.toFixed(4));
    $("#rtk2vehicle-z").trigger("input");
    $("#rtk2vehicle-loaded-roll").val(Number(rtk2vehicle.roll).toFixed(4));
    $("#rtk2vehicle-setpoint-roll").val(Number(rtk2vehicle.roll).toFixed(4));
    $("#rtk2vehicle-roll").text(rtk2vehicle.roll.toFixed(4));
    $("#rtk2vehicle-roll").trigger("input");
    $("#rtk2vehicle-loaded-pitch").val(Number(rtk2vehicle.pitch).toFixed(4));
    $("#rtk2vehicle-setpoint-pitch").val(Number(rtk2vehicle.pitch).toFixed(4));
    $("#rtk2vehicle-pitch").text(rtk2vehicle.pitch.toFixed(4));
    $("#rtk2vehicle-pitch").trigger("input");
    $("#rtk2vehicle-loaded-yaw").val(Number(rtk2vehicle.yaw).toFixed(4));
    $("#rtk2vehicle-setpoint-yaw").val(Number(rtk2vehicle.yaw).toFixed(4));
    $("#rtk2vehicle-yaw").text(rtk2vehicle.yaw.toFixed(4));
    $("#rtk2vehicle-yaw").trigger("input");

    // Update units:
    const unit = window.calibrationPanelDegrees ? "deg" : "rad";
    $('.rotation-unit').each((i, elem) => { elem.innerHTML = unit });
    storedRtk2VehicleUnit = 'deg';

    console.log("Stored Rtk to Vehicle Extrinsics");

  } catch (e) {
    console.error("Could not store RTK to Vehicle Calibration Extrinsics", e);
  }
}

export function storeVelo2Rtk(velo2RtkInput) {

const velo2rtk = convertToCorrectUnits(velo2RtkInput);

  try {
    $("#velo2rtk-loaded-x").val(Number(velo2rtk.x).toFixed(4));
    $("#velo2rtk-setpoint-x").val(Number(velo2rtk.x).toFixed(4));
    $("#velo2rtk-x").text(velo2rtk.x.toFixed(4));
    $("#velo2rtk-x").trigger('input');
    $("#velo2rtk-loaded-y").val(Number(velo2rtk.y).toFixed(4));
    $("#velo2rtk-setpoint-y").val(Number(velo2rtk.y).toFixed(4));
    $("#velo2rtk-y").text(velo2rtk.y.toFixed(4));
    $("#velo2rtk-y").trigger('input');
    $("#velo2rtk-loaded-z").val(Number(velo2rtk.z).toFixed(4));
    $("#velo2rtk-setpoint-z").val(Number(velo2rtk.z).toFixed(4));
    $("#velo2rtk-z").text(velo2rtk.z.toFixed(4));
    $("#velo2rtk-z").trigger('input');
    $("#velo2rtk-loaded-roll").val(Number(velo2rtk.roll).toFixed(4));
    $("#velo2rtk-setpoint-roll").val(Number(velo2rtk.roll).toFixed(4));
    $("#velo2rtk-roll").text(velo2rtk.roll.toFixed(4));
    $("#velo2rtk-roll").trigger('input');
    $("#velo2rtk-loaded-pitch").val(Number(velo2rtk.pitch).toFixed(4));
    $("#velo2rtk-setpoint-pitch").val(Number(velo2rtk.pitch).toFixed(4));
    $("#velo2rtk-pitch").text(velo2rtk.pitch.toFixed(4));
    $("#velo2rtk-pitch").trigger('input');
    $("#velo2rtk-loaded-yaw").val(Number(velo2rtk.yaw).toFixed(4));
    $("#velo2rtk-setpoint-yaw").val(Number(velo2rtk.yaw).toFixed(4));
    $("#velo2rtk-yaw").text(velo2rtk.yaw.toFixed(4));
    $("#velo2rtk-yaw").trigger('input');

    // Update units:
    const unit = window.calibrationPanelDegrees ? "deg" : "rad";
    $('.rotation-unit').each((i, elem) => { elem.innerHTML = unit });
    storedVelo2RtkUnit = unit;

    console.log("Stored Rtk to Vehicle Extrinsics");

  } catch (e) {
    console.error("Could not store Velodyne to RTK Calibration Extrinsics", e);
  }
}

// Units stored in the calibration panel are degrees by default:
let storedVelo2RtkUnit = 'deg';   
let storedRtk2VehicleUnit = 'deg'; 

// Add functions to toggle calibration panel units from console:
window.calibrationPanelDegrees = true;
window.setCalibrationPanelsToDegrees = function () {
  console.log("Resetting calibration panel values to loaded values");
  window.calibrationPanelDegrees = true;
  storeVelo2Rtk(window.extrinsics.velo2Rtk.old);
  window.dispatchEvent( new CustomEvent("update-calibration-panel", {}));
};
window.setCalibrationPanelsToRadians = function () {
  console.log("Resetting calibration panel values to loaded values");
  window.calibrationPanelDegrees = false;
  storeVelo2Rtk(window.extrinsics.velo2Rtk.old);
  window.dispatchEvent( new CustomEvent("update-calibration-panel", {}));
};

// Add functions to enable/disable rtk2mesh calibration panel from console:
window.hideRtk2VehicleCalibrationPanel = true;
window.enableRtk2VehicleCalibrationPanel = function() {
  window.hideRtk2VehicleCalibrationPanel = false;
  $("#calibration-overlay-rtk2vehicle")[0].style.display = $("#calibration-overlay-velo2rtk")[0].style.display;
}
window.disableRtk2VehicleCalibrationPanel = function() {
  window.hideRtk2VehicleCalibrationPanel = true;
  $("#calibration-overlay-rtk2vehicle")[0].style.display = "none";
}

