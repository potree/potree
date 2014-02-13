# Documentation

* [File Format](./file_format.md)

Potree is a WebGL based viewer for large point clouds. The idea is that, similar to Google Maps, only visible parts up to a certain level of detail 
will be loaded and display. In order to achieve this, points are partitioned into an octree.
The root node r contains a sparse subset of the data. All of its children contain another sparse subset which, combined, will gradualy increase 
the level of detail.

| ![](./images/r.png "")        | ![](./images/r1.png "") | ![](./images/r_and_r1.png "") | ![](./images/r_and_rx.png "") |
| ------------- |:-------------:| -----:| --- |
| root          | r0, first child of root | root and r0 combined | root and all its children combined |
