
# README

* [Getting Started](./docs/getting_started.md)

## About

Potree is a free open-source WebGL based point cloud renderer for large point clouds.
It is based on the [TU Wien Scanopy project](https://www.cg.tuwien.ac.at/research/projects/Scanopy/)
and it was part of the [Harvest4D Project](https://harvest4d.org/).


<a href="http://potree.org/wp/demo/" target="_blank"> ![](./docs/images/potree_screens.png) </a>

Newest information and work in progress is usually available on [twitter](https://twitter.com/m_schuetz)

Contact: Markus Schütz (mschuetz@potree.org)

Reference: [Potree: Rendering Large Point Clouds in Web Browsers](https://www.cg.tuwien.ac.at/research/publications/2016/SCHUETZ-2016-POT/SCHUETZ-2016-POT-thesis.pdf)

## Build

Make sure you have [node.js](http://nodejs.org/) installed

Install all dependencies, as specified in package.json, 
then, install the gulp build tool:

    cd <potree_directory>
    npm install --save
    npm install -g gulp
    npm install -g rollup

Use the ```gulp watch``` command to 

* create ./build/potree 
* watch for changes to the source code and automatically create a new build on change
* start a web server at localhost:1234. Go to http://localhost:1234/examples/ to test the examples.

```
gulp watch
```

## Deploy

Deploy potree to the EC2 instances serving the Veritas sites:

Active EC2 instances (as of 2019-05-16):

| Name                        | IPv4 Public IP | Keypair            | Potree Location                                  | Description |
| --------------------------- | -------------- | ------------------ | ------------------------------------------------ | ----------- |
| PotreeServer                | 34.207.247.239 | `NextDroidDev.pem` | `/usr/share/nginx/html/potree`                   | "Production" server - however this is running a very old version of potree currently (2019-05-16) |
| Veritas Dev (Potree Server) | 18.208.171.218 | `NextDroidDev.pem` | `~/git/GroundTruthVisualization/external/potree` | "Development" server - this is the primary server that we have ended up using and is currently client facing (2019-05-16) |

Steps for deploying (primarily for Veritas Dev server): 
1. ssh into the desired EC2 instance with the appropriate keypair
2. Activate ssh-agent by running `eval $(ssh-agent -s)` and adding your github ssh-key using `ssh-add /path/to/ssh-key/id_pub`
  - if you have not setup an ssh-key on this instance see here: [Adding a new SSH key to your GitHub account](https://help.github.com/en/enterprise/2.15/user/articles/adding-a-new-ssh-key-to-your-github-account)
3. Checkout the appropriate branch in potree (see table above for potree location on ec2 instance)
4. Compile the code using `gulp watch`. Note this both compiles the code and launches a gulp server, however, we use an Nginx server for serving on TCP ports, so you can kill the process after compiling (which takes about 1-2 seconds).
5. Check the visualization in a private browser on [dev.vts.nextdroid.com](https://dev.vts.nextdroid.com) - if you do not use a private browser then you will likely not see the updated visualization due to browser caching.


Sample Walkthrough for deploying to Development Server:
```
ssh -i /path/to/NextDroidDev.pem ubuntu@18.208.171.218

## Inside EC2 instance:
eval $(ssh-agent -s)		# activate ssh-agent
ssh-add /path/to/id_rsa		# add your ssh private key 
cd git/GroundTruthVisualization/external/potree/
git fetch
git checkout <branch> 
gulp watch 					# let it compile then you can kill the process with ctrl-C
```


## Downloads

[PotreeConverter source and Win64 binaries](https://github.com/potree/PotreeConverter/releases)

## Showcase

Take a look at the [potree showcase](http://potree.org/wp/demo/) for some live examples.

## Compatibility

| Browser              | OS      | Result        |   |
| -------------------- |:-------:|:-------------:|:-:|
| Chrome 64            | Win10   | works         |   |
| Firefox 58           | Win10   | works         |   |
| Edge                 | Win10   | not supported |   |
| Internet Explorer 11 | Win7    | not supported |   |
| Chrome               | Android | works         | Reduced functionality due to unsupported WebGL extensions |
| Opera                | Android | works         | Reduced functionality due to unsupported WebGL extensions |

## Credits

* The multi-res-octree algorithms used by this viewer were developed at the Vienna University of Technology by Michael Wimmer and Claus Scheiblauer as part of the [Scanopy Project](http://www.cg.tuwien.ac.at/research/projects/Scanopy/).
* [Three.js](https://github.com/mrdoob/three.js), the WebGL 3D rendering library on which potree is built.
* [plas.io](http://plas.io/) point cloud viewer. LAS and LAZ support have been taken from the laslaz.js implementation of plas.io. Thanks to [Uday Verma](https://twitter.com/udaykverma) and [Howard Butler](https://twitter.com/howardbutler) for this!
* [Harvest4D](https://harvest4d.org/) Potree currently runs as Master Thesis under the Harvest4D Project
* Christian Boucheny (EDL developer) and Daniel Girardeau-Montaut ([CloudCompare](http://www.danielgm.net/cc/)). The EDL shader was adapted from the CloudCompare source code!
* [Martin Isenburg](http://rapidlasso.com/), [Georepublic](http://georepublic.de/en/),
[Veesus](http://veesus.com/), [Sigeom Sa](http://www.sigeom.ch/), [SITN](http://www.ne.ch/sitn), [LBI ArchPro](http://archpro.lbg.ac.at/),  [Pix4D](http://pix4d.com/) as well as all the contributers to potree and PotreeConverter and many more for their support.
