

## 2014.30.12

### features
* Rebuild the profile tool to behave more like the distant measure tool.
Visible points inside the profile can be retrieved with
```
var points = pointcloud.getPointsInProfile(profileTool.profiles[0], maxOctreeDepth);
```

* Added clip modes: DISABLED, CLIP_OUTSIDE, HIGHLIGHT_INSIDE. Clip mode can be set with
```
pointcloud.material.clipMode = Potree.ClipMode.CLIP_OUTSIDE;
```

* Added support for potree format 1.4. This format stores coordinates as integers instead of floats (for uniform precision). Additionaly, the *.bin extension has been added to all data/* files in order to avoid problems that occur with files witout extensions.

* Added [High Quality Splatting](http://graphics.ucsd.edu/~matthias/Papers/HighQualitySplattingOnGPUs.pdf) for screen aligned quads. See examples/viewer.html with quality set to "Splats".




## 2014.12.17

### features
* Added Area and Volume measurement tools.
* Made tool markers draggable.
* See examples/viewer.js for a demo of all measurement tools. In this demo, the volume can be translated, scaled and rotated by pressing e, r and t.
* Attenuated point sizes are differently scaled. Now, the point size specifies the radius of the point in scene coordinates.
* Adaptive point sizes are differently scaled. A size of 1 means that the point size is choosen to optimaly cover holes. Due   to this it is now necessary to pass the renderer to the pointcloud.update() function:

  ```
  pointcloud.update(camera, renderer);
  ```



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
* Added classification, return number and point source ID to Potree.PointColorType. These color modes only work with LAS and LAZ files.
* Replaced synchronous requests in favour of async requests.
  You must now provide a callback method in order to add a pointcloud to the scene:

  ```
  var pco = POCLoader.load(pointcloudPath, function(geometry){
  	pointcloud = new Potree.PointCloudOctree(geometry);
  	...
 	scene.add(pointcloud);
  });
  ```
  You must also make sure that the pointcloud has been loaded before operating on it:
  ```
  if(pointcloud){
  	// now you can safely use the pointcloud object
  }
  ```
