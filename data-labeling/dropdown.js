"use strict"
/**
 * @file This file is intended to help add event listeners for the data-labeling on the dropdown menu
 * Used by potree/src/viewer/PropertyPanels/PropertiesPanel.js
 */

/**
 * @brief Helper function that to set up the volume and label event listeners on the side panel
 * @param {Viewer} viewer The passed viewer object
 * @param {{
 *   "position": {
 *     "x": -0.061213016510009766,
 *     "y": -2.4204059839248653,
 *     "z": 4.487650059525813
 *   },
 *   "rotation": {
 *     "_x": 0,
 *     "_y": 0,
 *     "_z": 0,
 *     "_order": "XYZ"
 *   },
 *   "size": {
 *     "x": 1.50917380887355,
 *     "y": 1.50917380887355,
 *     "z": 2.6362620320941543
 *   }
 * }} measurement Cuboid information
 * @note Have to use jQuery due to element being modified being created through jQuery ("this.elContent")
 */
export function addVolLabelListeners(viewer, measurement) {
    // add event listener to each item within container
    const labelDropdown = $("#labelDropdown")
    const labelOpts = labelDropdown.children(".dropvalue")
    for (const item of labelOpts) {
        item.addEventListener("click", () => {
            const val = item.getAttribute("data-value")
            label(val, viewer, measurement)
        })
    }

    // When the user clicks on the button, toggle between hiding and showing the dropdown content
    $("#labelBtn").click( () => {
        if (labelDropdown.is(":visible")) labelDropdown.hide()
        else                              labelDropdown.show()
    })
}

/**
 * @Brief Helper function that labels based on input value
 * @param {Number} value The 
 * @param {Viewer} viewer The passed viewer object
 * @param {JSON} measurement Postioning of the cuboid (position, rotation, size)
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
 * }} The label JSON
 */
function label(value, viewer, measurement) {
    const metadata=prompt("Please enter metadata", "")

    const date = new Date()
    // const obj = (date.getTime())
    const year = date.getFullYear()
    const month = date.getMonth()
    const day =  date.getDay()
    const hour =  date.getHours()
    const min = date.getMinutes()
    const sec = date.getSeconds()
    const timestamp = pad(year,4)+"-"+pad(month)+"-"+pad(day)+"T"+pad(hour)+":"+pad(min)+":"+pad(sec)

    const output = {
        t_valid_min: viewer.scene.pointclouds[0].material.uniforms.uFilterGPSTimeClipRange.value[0],
        t_valid_max: viewer.scene.pointclouds[0].material.uniforms.uFilterGPSTimeClipRange.value[1],
        timestamp: date.getTime(),
        position: measurement.position,
        rotation: measurement.rotation,
        size: measurement.scale,
        label: value,
        metadata: metadata
    }

    const outputJsonString = JSON.stringify(output, null, 2)
    // console.log(outputJsonString)

    const filename = value+"_"+timestamp+".json"
    console.log(`saving label to ${filename}`)
    // download(outputJsonString, filename, "text/plain")
    return output
}

function pad(number, len=2, char='0') {
    if (number < 0) {
        throw "negative numbers not supported yet"
    }
    const strNum = String(number)
    const numCharsNeeded = len-strNum.length
    return strNum + char.repeat(numCharsNeeded)
}