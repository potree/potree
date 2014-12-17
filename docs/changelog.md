

## 2014.12.17

### features
* Added Area and Volume measurement tools. 
* Made tool markers draggable.
* See examples/viewer.js for a demo of all measurement tools. In this demo, the volume can be translated, scaled and rotated by pressing e, r and t.

### bugfixes
* LAS and LAZ format now support point picking, too.
* Using mediump precision instead of highp. Highp is not supported on all devices and it seems like it's generaly adviced not to use it.


## 2014.12.03

* Made measurement tool independant of scale. Spheres and Labels are displayed at the same size regardless of the distance to the camera.
  MeasurementTool now has to be rendered using 
  ```  
  // render scene first, then measuring tool over the scene
  renderer.render(scene, camera);
  measuringTool.render();
  ```
  
* Support for binary files with .bin extension. Files without extension have shown to cause problems with FTP Uploaders and some WebServers.
* Added classification, return number and point source ID to Potree.PointColorType.
* Replaced synchronous requests in favour of async requests.
  You must now provide a callback method in order to add a pointcloud to the scene:

  ```
  var pco = POCLoader.load(pointcloudPath, function(geometry){
  	pointcloud = new Potree.PointCloudOctree(geometry);
  	...
 	scene.add(pointcloud);
  }
  ```
  You must also make sure that the pointcloud has been loaded before operating on it:
  ```
  if(pointcloud){
  	// now you can safely use the pointcloud object
  }
  ```
