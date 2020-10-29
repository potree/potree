# MeshLine
Mesh replacement for ```THREE.Line```

Instead of using GL_LINE, it uses a strip of triangles billboarded. Some examples:

[![Demo](screenshots/demo.jpg)](https://www.clicktorelease.com/code/THREE.MeshLine/demo/index.html)
[![Graph](screenshots/graph.jpg)](https://www.clicktorelease.com/code/THREE.MeshLine/demo/graph.html)
[![Spinner](screenshots/spinner.jpg)](https://www.clicktorelease.com/code/THREE.MeshLine/demo/spinner.html)
[![SVG](screenshots/svg.jpg)](https://www.clicktorelease.com/code/THREE.MeshLine/demo/svg.html)
[![Shape](screenshots/shape.jpg)](https://www.clicktorelease.com/code/THREE.MeshLine/demo/shape.html)
[![Shape](screenshots/birds.jpg)](https://www.clicktorelease.com/code/THREE.MeshLine/demo/birds.html)

* [Demo](https://www.clicktorelease.com/code/THREE.MeshLine/demo/index.html): play with the different settings of materials
* [Graph](https://www.clicktorelease.com/code/THREE.MeshLine/demo/graph.html): example of using ```MeshLine``` to plot graphs
* [Spinner](https://www.clicktorelease.com/code/THREE.MeshLine/demo/spinner.html): example of dynamic ```MeshLine``` with texture
* [SVG](https://www.clicktorelease.com/code/THREE.MeshLine/demo/svg.html): example of ```MeshLine``` rendering SVG Paths
* [Shape](https://www.clicktorelease.com/code/THREE.MeshLine/demo/shape.html): example of ```MeshLine``` created from a mesh
* [Birds](https://www.clicktorelease.com/code/THREE.MeshLine/demo/birds.html): example of ```MeshLine.advance()``` by @caramelcode (Jared Sprague) and @mwcz (Michael Clayton)

### How to use ####

* Include script
* Create and populate a geometry
* Create a MeshLine and assign the geometry
* Create a MeshLineMaterial
* Use MeshLine and MeshLineMaterial to create a THREE.Mesh

#### Include the script

Include script after THREE is included
```js
<script src="THREE.MeshLine.js"></script>
```
or use npm to install it
```
npm i three.meshline
```
and include it in your code (don't forget to require three.js)
```js
var THREE = require( 'three' );
var MeshLine = require( 'three.meshline' );
```

##### Create and populate a geometry #####

First, create the list of vertices that will define the line. ```MeshLine``` accepts ```THREE.Geometry``` (looking up the ```.vertices``` in it) and ```Array```/```Float32Array```. ```THREE.BufferGeometry``` coming soon, and may be others like ```Array``` of ```THREE.Vector3```.

```js
var geometry = new THREE.Geometry();
for( var j = 0; j < Math.PI; j += 2 * Math.PI / 100 ) {
	var v = new THREE.Vector3( Math.cos( j ), Math.sin( j ), 0 );
	geometry.vertices.push( v );
}
```

##### Create a MeshLine and assign the geometry #####

Once you have that, you can create a new ```MeshLine```, and call ```.setGeometry()``` passing the vertices.

```js
var line = new MeshLine();
line.setGeometry( geometry );
```

Note: ```.setGeometry``` accepts a second parameter, which is a function to define the width in each point along the line. By default that value is 1, making the line width 1 * lineWidth.

```js
line.setGeometry( geometry, function( p ) { return 2; } ); // makes width 2 * lineWidth
line.setGeometry( geometry, function( p ) { return 1 - p; } ); // makes width taper
line.setGeometry( geometry, function( p ) { return 2 + Math.sin( 50 * p ); } ); // makes width sinusoidal
```

##### Create a MeshLineMaterial #####

A ```MeshLine``` needs a ```MeshLineMaterial```:

```js
var material = new MeshLineMaterial();
```

By default it's a white material of width 1 unit.

```MeshLineMaterial``` has several attributes to control the appereance of the ```MeshLine```:

* ```map``` - a ```THREE.Texture``` to paint along the line (requires ```useMap``` set to true)
* ```useMap``` - tells the material to use ```map``` (0 - solid color, 1 use texture)
* ```alphaMap``` - a ```THREE.Texture``` to use as alpha along the line (requires ```useAlphaMap``` set to true)
* ```useAlphaMap``` - tells the material to use ```alphaMap``` (0 - no alpha, 1 modulate alpha)
* ```repeat``` - THREE.Vector2 to define the texture tiling (applies to map and alphaMap - MIGHT CHANGE IN THE FUTURE)
* ```color``` - ```THREE.Color``` to paint the line width, or tint the texture with
* ```opacity``` - alpha value from 0 to 1 (requires ```transparent``` set to ```true```)
* ```alphaTest``` - cutoff value from 0 to 1
* ```dashArray``` - THREE.Vector2 to define the dashing (NOT IMPLEMENTED YET)
* ```resolution``` - ```THREE.Vector2``` specifying the canvas size (REQUIRED)
* ```sizeAttenuation``` - makes the line width constant regardless distance (1 unit is 1px on screen) (0 - attenuate, 1 - don't attenuate)
* ```lineWidth``` - float defining width (if ```sizeAttenuation``` is true, it's world units; else is screen pixels)
* ```near``` - camera near clip plane distance  (REQUIRED if ```sizeAttenuation``` set to false)
* ```far``` - camera far clip plane distance  (REQUIRED if ```sizeAttenuation``` set to false)

If you're rendering transparent lines or using a texture with alpha map, you should set ```depthTest``` to ```false```, ```transparent``` to ```true``` and ```blending``` to an appropriate blending mode, or use ```alphaTest```.

##### Use MeshLine and MeshLineMaterial to create a THREE.Mesh #####

Finally, we create a mesh and add it to the scene:

```js
var mesh = new THREE.Mesh( line.geometry, material ); // this syntax could definitely be improved!
scene.add( mesh );
```

### TODO ###

* Better miters
* Proper sizes
* Support for dashArray

### Support ###

Tested successfully on

* Chrome OSX, Windows, Android
* Firefox OSX, Windows, Anroid
* Safari OSX, iOS
* Internet Explorer 11 (SVG and Shape demo won't work because they use Promises)
* Opera OSX, Windows

### References ###

* [Drawing lines is hard](http://mattdesl.svbtle.com/drawing-lines-is-hard)
* [WebGL rendering of solid trails](http://codeflow.org/entries/2012/aug/05/webgl-rendering-of-solid-trails/)
* [Drawing Antialiased Lines with OpenGL](https://www.mapbox.com/blog/drawing-antialiased-lines/)

#### License ####

MIT licensed

Copyright (C) 2015-2016 Jaume Sanchez Elias, http://www.clicktorelease.com
