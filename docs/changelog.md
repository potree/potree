

# 2014.12.03

* Made measurement tool independant of scale. Spheres and Labels are displayed at the same size regardless of the distance to the camera.
  MeasurementTool now has to be rendered using 

```  
// render scene first, then measuring tool over the scene
renderer.render(scene, camera);
measuringTool.render();
```


  
* Support for binary files with .bin extension. Files without extension have shown to cause problems with FTP Uploaders and some WebServers.
* Added classification, return number and point source ID to Potree.PointColorType.
