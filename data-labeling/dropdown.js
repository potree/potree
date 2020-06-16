/**
 * @file This file is intended to help add event listeners for the data-labeling on the dropdown menu
 * Used by potree/src/viewer/PropertyPanels/VolumePanel.js
 */

/**
 * @brief Helper function that to set up the volume and label event listeners on the side panel
 * @param {Viewer} viewer The passed viewer object
 * @note Have to use jQuery due to element being modified being created through jQuery ("this.elContent")
 */
export function addLabelListeners(viewer) {
    // add event listener to each item within container
    const labelDropdown = $("#labelDropdown")
    const labelOpts = labelDropdown.children(".dropvalue")
    for (const item of labelOpts) {
        item.addEventListener("click", () => {
            const val = $(this).data("value")
            console.log(`val = ${val}`)
            label(val, viewer)
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
 * 
 */
function label(value, viewer) {
    var metadata=prompt("Please enter metadata", "")

    var date = new Date()
    // var obj = (date.getTime())
    var year = date.getFullYear()
    var month = date.getMonth()
    var day =  date.getDay()
    var hour =  date.getHours()
    var min = date.getMinutes()
    var sec = date.getSeconds()
    var timestamp = pad(year,4)+"-"+pad(month)+"-"+pad(day)+"T"+pad(hour)+":"+pad(min)+":"+pad(sec)

    var output = {
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
    console.log(outputJsonString)

    // var config = {
    // 	quotes: false,
    // 	quoteChar: '"',
    // 	escapeChar: '"',
    // 	delimiter: ",",
    // 	header: true,
    // 	newline: "\r\n"
    // }
    // var outputCsvString = Papa.unparse([{
    // 	"t_valid_min": output.t_valid_min,
    // 	"t_valid_max": output.t_valid_max,
    // 	"labeling_timestamp": output.timestamp,
    // 	"position_x": output.position.x,
    // 	"position_y": output.position.y,
    // 	"position_z": output.position.z,
    // 	"rotation_x": output.rotation._x,
    // 	"rotation_y": output.rotation._y,
    // 	"rotation_z": output.rotation._z,
    // 	"rotation_order": output.rotation._order,
    // 	"label": output.label,
    // 	"metadata": output.metadata
    // }], config)

    const filename = value+"_"+timestamp+".json"
    console.log(`saving label to ${filename}`)
    // download(outputJsonString, filename, "text/plain")
}
