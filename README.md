# Potree - WebGL Pointcloud Viewer

## About

Potree is a WebGL based point cloud viewer for large datasets.
Thanks to WebGL, it runs in all major browsers without plugins.

Homepage: <a href="http://potree.org/">potree.org</a>
<img src="http://potree.org/resources/images/pompei.jpg">

## Demos

This video shows a point cloud of the St. Stephens Cathedral. It consists of ~700m points.
<a href="http://www.youtube.com/watch?v=p9e6xElafJU" target="_blank"><img src="http://img.youtube.com/vi/p9e6xElafJU/0.jpg"></a>

Take a look at the [online showcase](http://potree.org/wp/demo/)

## Getting Started
1. Deploy potree on a webserver.
2. Open one of the demos in the examples directory. <br>
Potree pages must run on a webserver so the url
should be something like "localhost/potree/examples/lion.html". URLs starting with "file:///" will not work.

For more details, read the [Getting Started Section](./docs/getting_started.md)

## Convert Your Own Pointclouds
Use the [PotreeConverter](https://github.com/potree/PotreeConverter) to convert your own point clouds into the potree format.

## Compatibility

| Browser              | OS      | Result        |
| -------------------- |:-------:|:-------------:|
| Chrome 32            | Win7    | works         |
| Firefox 26           | Win7    | works         |
| Opera 19             | Win7    | works         |
| Internet Explorer 11 | Win7    | technically works, if you don't expect performance |
| Safari               | Mac     | works         |
| Firefox              | Android | partially works, GUI and stability issues |
| Opera                | Android | partially works, GUI and stabilty issues and slow |


## License
Potree is available under the FreeBSD license.
