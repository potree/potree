# Potree - WebGL Pointcloud Viewer

Homepage: <a href="http://potree.org/">potree.org</a>
<img src="http://potree.org/resources/images/pompei.jpg">

## Demos
* <a href="http://potree.org/demo/pompei/pompei.html" target="_blank">pompei</a>
* <a href="http://potree.org/demo/potree_2014.01.22/skatepark.html" target="_blank">skatepark</a>

This video shows a point cloud of the St. Stephens Cathedral. It consists of ~700m points. 
<a href="http://www.youtube.com/watch?v=p9e6xElafJU" target="_blank"><img src="http://img.youtube.com/vi/p9e6xElafJU/0.jpg"></a>

## Getting Started
1. Deploy potree on a webserver. 
2. Open one of the demos in the examples directory. <br>
Potree pages must run on a webserver so the url 
should be something like "localhost/potree/examples/lion.html". URLs starting with "file:///" will not work.

This is what the lion demo looks like:

![http://img.youtube.com/vi/p9e6xElafJU/0.jpg](./docs/images/lion_demo_screenshot.jpg)


## Convert Your Own Pointclouds
Use the PotreeConverter to convert your own point clouds into the potree format.

* PotreeConverter binaries for windows are available here:
http://potree.org/downloads/PotreeConverter_2014.01.22.zip
* PotreeConverter source is available here:
https://github.com/potree/PotreeConverter

## Compatibility

| Browser              | OS   | Result        |
| -------------------- |:----:|:-------------:|
| Chrome 32            | Win7 | works         |
| Firefox 26           | Win7 | works         |
| Safari               | Mac  | works         |
| Opera 19             | Win7 | works         |
| Internet Explorer 11 | Win7 | does not work |


## License
Potree is available under the FreeBSD license.
