# Documentation

* [File Format Description](./file_format.md)
* [How Does Loading Nodes Work?](./how_does_loading_nodes_work.md)

## Introduction

Potree is a WebGL based viewer for large point clouds. The idea is that, similar to Google Maps, only visible parts up to a certain level of detail 
will be loaded and displayed. In order to achieve this, points are partitioned into an octree.
The root node r contains a sparse subset of the data. All of its children contain another sparse subset which, combined, will gradualy increase 
the level of detail.

| ![](./images/r.png "")        | ![](./images/r1.png "") | ![](./images/r_and_r1.png "") | ![](./images/r_and_rx.png "") |
| ------------- |:-------------:| -----:| --- |
| root          | r0, first child of root | root and r0 combined | root and all its children combined |

## Getting Started

1. Deploy potree on a webserver. 
2. Open lion.html.

This should be the result:

![](./images/lion_demo_screenshot.jpg)

And this is what happens inside lion.html:

Initialize potree inside the canvas element:

    var canvas = document.getElementById("canvas");
    var success = Potree.init(canvas);
    if(!success){
    	return;
    }
    
Load a point cloud and add it to the scene:

    var scene = Potree.currentScene;
    var cloudURL = "resources/pointclouds/lion_takanawa/cloud.js";    
    var pcoNode = POCLoader.load(cloudURL);
    scene.rootNode.addChild(pcoNode);
    
Directly manipulate the transformation matrix of the point cloud node:
In this case, the point cloud was upside down so it has to be mirrored along the y-axis.

    pcoNode.transform = [1, 0, 0, 0,
    				      0, -1, 0, 0,
    				      0, 0, 1, 0,
    				      0, 0, 0, 1];

Transform the camera:

    var cam = scene.activeCamera;
    cam.rotateY(Math.PI/2);
    cam.translate(-1,-1,-1);
    
Set the point Size:

    var material = MaterialManager.getMaterial("pointCloud");
    material.pointSize = 1;

A high LOD multiplicator will display more nodes that are small or far away:

	Potree.Settings.LODMultiplicator = 20.0;
	


## Compatibility

| Browser              | Result        |
| -------------------- |:-------------:|
| Chrome 32            | works         |
| Firefox 26           | works         |
| Safari               | works         |
| Opera 19             | works         |
| Internet Explorer 11 | does not work |


## License 

Potree is available under the [FreeBSD License](http://en.wikipedia.org/wiki/BSD_licenses) license.

