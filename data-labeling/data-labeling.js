function initLabeler(viewer) {

  lidarOffset = 1495189467.550001;  // TODO Hardcoded b/c PotreeConverter is throwing away initial offset
  // lidarOffset = viewer.scene.pointclouds[0].pcoGeometry.nodes['r'].gpsTime.offset;
  lidarRange = viewer.scene.pointclouds[0].pcoGeometry.nodes['r'].gpsTime.range;

}


function updateTimeWindow() {
  console.log(window.viewer);
}

$("#playbar_tmin").click(function () {

  updateTimeWindow();

});
