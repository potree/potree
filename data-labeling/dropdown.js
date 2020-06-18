"use strict"
/**
 * @file This file is intended to help add event listeners for the data-labeling on the dropdown menu
 * Used by potree/src/viewer/PropertyPanels/PropertiesPanel.js
 */

// single point of truth for labels export
const labelExportId = "export-labels-container"

/**
 * @brief Helper function that to set up the volume and label event listeners on the side panel
 * @param {Viewer} viewer The passed viewer object
 * @note Have to use jQuery due to element being modified being created through jQuery ("this.elContent")
 * Element created in potree/src/viewer/PropertyPanels/VolumePanel.js
 */
export function addVolLabelListeners(viewer) {
    // add event listener to each item within container
    const labelDropdown = $("#labelDropdown")
    const labelOpts = labelDropdown.children(".dropvalue")
    for (const item of labelOpts) {
        item.addEventListener("click", () => {
            labelDropdown.hide()
            const val = item.getAttribute("data-value")
            label(val, viewer)
            // only show label exports once first element is added
            $(`#${labelExportId}`).show()
        })
    }

    // add text, button, & event listeners for label exporting in sidebar
    addLabelExport()

    // When the user clicks on the button, toggle between hiding and showing the dropdown content
    $("#labelBtn").click( () => {
        if (labelDropdown.is(":visible")) labelDropdown.hide()
        else                              labelDropdown.show()
    })
}

function addLabelExport() {
    // if element already appended, do not duplicate
    if (document.getElementById(labelExportId)) {
        return
    }

    // create label export
    const geoJSONIcon = `${Potree.resourcePath}/icons/file_geojson.svg`
    const sceneExportContainer = $("#scene_export")
    const downloadLabelId = "download-label-btn"
    sceneExportContainer.append(`
        <div id="${labelExportId}" hidden>
            Labels: <br>
            <a href="#"><img id="${downloadLabelId}" src="${geoJSONIcon}" class="button-icon" style="height: 24px" /></a>
        </div>
    `)

    // download labels when "JSON" button is clicked
    $(`#${downloadLabelId}`).click(() => {
        const allMeasurements = getAllVolData()
        const outputJsonString = JSON.stringify(allMeasurements, null, 2)
        const timestamp = makeTimestampUTC()
        const filename = `${timestamp}_labels.json`
        console.log(`Saving label data to ${filename}`)
        // from potree/data-labeling/download.js
        download(filename, outputJsonString, 'text/plain')
    })
}

/**
 * @brief Helper function that labels based on input value
 * @param {Number} value The classification label based on the dropdown options
 * @param {Viewer} viewer The passed viewer object
 */
function label(value, viewer) {
    const currVolNode = getSelectedNode()
    if (currVolNode.text != "Volume") {
        window.alert("Select a Volume under 'Measurements' before labelling")
        return
    }

    // update info in .data portion of node (it already knows scale, position, and rotation)
    // WARN: any data saved outside of '.data' cannot be found when scanning tree with other methods
    currVolNode.data.t_valid_min = viewer.scene.pointclouds[0].material.uniforms.uFilterGPSTimeClipRange.value[0]
    currVolNode.data.t_valid_max = viewer.scene.pointclouds[0].material.uniforms.uFilterGPSTimeClipRange.value[1]
    currVolNode.data.timestamp = new Date().getTime()

    // add json key for label data before trying to add to it
    // (can't save to .data.label because it is already taken)
    if (currVolNode.data.labelData == null) currVolNode.data.labelData = {}
    currVolNode.data.labelData.metadata = prompt("Please enter metadata", "")
    currVolNode.data.labelData.label = value

    // update table on side nav
    const elLabel = $("#cell-label")
    const elMetadata = $("#cell-metadata")
    elLabel.html(currVolNode.data.labelData.label)
    elMetadata.html(currVolNode.data.labelData.metadata)
}

/**
 * @returns {Array<getVolData()>} List of relevant data for each volume measurement
 */
function getAllVolData() {
    const measurementsRoot = $("#jstree_scene").jstree().get_json("measurements")
    return Array.from(measurementsRoot.children).map(child => getVolData(child))
        .filter(volume => volume.label != null)
}

/**
 * @brief Helper function to get the volume's information
 * @param {JSTree} node (optional) The desired JSTree node you want to get information from (default = selected node)
 * @returns {{
    *  t_valid_min: String
    *  t_valid_max: String
    *  timestamp: Number
    *  position: {
    *      "x": Number,
    *      "y": Number,
    *      "z": Number
    *  },
    *  rotation: {
    *      "_x": Number,
    *      "_y": Number,
    *      "_z": Number,
    *      "_order": String
    *  },
    *  size: {
    *      "x": Number,
    *      "y": Number,
    *      "z": Number
    *  }
    *  label: Number
    *  metadata: String
    * }} The relevant info of the selected volume
 */
export function getVolData(node=null) {
    const currVol = node == null ? getSelectedNode() : node
    const volData =  {
        t_valid_min:    currVol.data.t_valid_min,
        t_valid_max:    currVol.data.t_valid_max,
        timestamp:      currVol.data.timestamp,
        position:       currVol.data.position,
        rotation:       currVol.data.rotation,
        size:           currVol.data.scale,
        label:          currVol.data.labelData ? currVol.data.labelData.label : "",
        metadata:       currVol.data.labelData ? currVol.data.labelData.metadata : ""
    }
    return volData
}

/**
 * @brief Helper function to get data from measurements tree
 * @note return json is strange in that it does not appear to contain position, rotation, & size (but it does)
 */
function getSelectedNode() {
    return $("#jstree_scene").jstree("get_selected", true)[0]
}

function pad(number, len=2, char='0') {
    if (number < 0) {
        throw "negative numbers not supported yet"
    }
    const strNum = String(number)
    const numCharsNeeded = len-strNum.length
    return strNum + char.repeat(numCharsNeeded)
}

function makeTimestampUTC () {
    const date = new Date()
    // const obj = (date.getTime())
    const year = date.getFullYear()
    const month = date.getMonth()
    const day =  date.getDay()
    const hour =  date.getHours()
    const min = date.getMinutes()
    const sec = date.getSeconds()
    const timestamp = pad(year,4)+"-"+pad(month)+"-"+pad(day)+"T"+pad(hour)+":"+pad(min)+":"+pad(sec)
    return timestamp
}
