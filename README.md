[![Build Status](https://travis-ci.org/potree/potree.svg?branch=master)](https://travis-ci.org/potree/potree) [![js-happiness-style](https://img.shields.io/badge/code%20style-happiness-brightgreen.svg)](https://github.com/JedWatson/happiness) [![Gitter potree/Lobby](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/potree/Lobby)

# README

* [Getting Started](./docs/getting_started.md)

## About

Potree is a free open-source WebGL based point cloud renderer for large point clouds.

It is based on the [TU Wien Scanopy project](https://www.cg.tuwien.ac.at/research/projects/Scanopy/)


<a href="http://potree.org/wp/demo/" target="_blank"> ![](./docs/images/potree_screens.png) </a>

Potree was part of the [Harvest4D Project](https://harvest4d.org/)

Newest information and work in progress is usually available on [twitter](https://twitter.com/m_schuetz)

General infos, downloads, showcase, etc. at [potree.org](http://potree.org/)

Contact: Markus Schütz - mschuetz@potree.org

## Downloads

[PotreeConverter source and Win64 binaries](https://github.com/potree/PotreeConverter/releases)

## Build

* Install [Node.js](https://nodejs.org/en/) and download this repository.
* Open a console window
* Change into the potree directory and install the dependencies:

```
cd <potree_directory>
npm install --save-dev
```

* Create the build, including a minified version:

```
npm run build
npm run min:script:*
```

Watch commands are helpful during development since they automatically rebuild the project whenever you modify a source file. The ```+webserver``` variant also starts a webserver, which is needed to test potree pages on your local machine.
The ```+liveserver``` version is the same as the webserver version, except it also automatically refreshes your browser when you modify the source.

It's recommended to use ```npm run watch+liveserver```. 
On startup, it will open a browser page at ```http://localhost:8080/```. Open the examples folder to select various demo pages.

```
npm run watch
npm run watch+webserver
npm run watch+liveserver
```



## Showcase

Take a look at the [potree showcase](http://potree.org/wp/demo/) for some live examples.

## Compatibility

| Browser              | OS      | Result        |
| -------------------- |:-------:|:-------------:|
| Chrome 56            | Win7    | works         |
| Firefox 51           | Win7    | works         |
| Internet Explorer 11 | Win7    | not supported |
| Chrome               | Android | works         |
| Opera                | Android | not supported |

## Credits

* The multi-res-octree algorithms used by this viewer were developed at the Vienna University of Technology by Michael Wimmer and Claus Scheiblauer as part of the [Scanopy Project](http://www.cg.tuwien.ac.at/research/projects/Scanopy/).
* [Three.js](https://github.com/mrdoob/three.js), the WebGL 3D rendering library on which potree is built.
* [plas.io](http://plas.io/) point cloud viewer. LAS and LAZ support have been taken from the laslaz.js implementation of plas.io. Thanks to [Uday Verma](https://twitter.com/udaykverma) and [Howard Butler](https://twitter.com/howardbutler) for this!
* [Harvest4D](https://harvest4d.org/) Potree currently runs as Master Thesis under the Harvest4D Project
* Christian Boucheny (EDL developer) and Daniel Girardeau-Montaut ([CloudCompare](http://www.danielgm.net/cc/)). The EDL shader was adapted from the CloudCompare source code!
* [Martin Isenburg](http://rapidlasso.com/), [Georepublic](http://georepublic.de/en/),
[Veesus](http://veesus.com/), [Sigeom Sa](http://www.sigeom.ch/), [SITN](http://www.ne.ch/sitn), [LBI ArchPro](http://archpro.lbg.ac.at/),  [Pix4D](http://pix4d.com/) as well as all the contributers to potree and PotreeConverter and many more for their support.
