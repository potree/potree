function initLabeler(viewer) {

  lidarOffset = 1495189467.550001;  // TODO Hardcoded b/c PotreeConverter is throwing away initial offset
  // lidarOffset = viewer.scene.pointclouds[0].pcoGeometry.nodes['r'].gpsTime.offset;
  lidarRange = viewer.scene.pointclouds[0].pcoGeometry.nodes['r'].gpsTime.range;
  console.log("lidarRange", lidarRange);
  console.log("lidarOffset", lidarOffset);

}


function updateTimeWindow() {
  console.log(window.viewer);
}

$("#playbar_tmin").click(function () {

  updateTimeWindow();
  // lidarOffset = 1495189467.550001;  // TODO Hardcoded b/c PotreeConverter is throwing away initial offset
  // // lidarOffset = window.viewer.scene.pointclouds[0].pcoGeometry.nodes['r'].gpsTime.offset;
  // lidarRange = window.viewer.scene.pointclouds[0].pcoGeometry.nodes['r'].gpsTime.range;
  // console.log("lidarRange", lidarRange);
  // console.log("lidarOffset", lidarOffset);
  //
  // window.setViewerTime

});
