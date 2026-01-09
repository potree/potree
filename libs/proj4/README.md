# PROJ4JS [![Build Status](https://api.travis-ci.org/proj4js/proj4js.svg?branch=master)](https://travis-ci.org/proj4js/proj4js)

Proj4js is a JavaScript library to transform point coordinates from one coordinate system to another, including datum transformations.
Originally a port of [PROJ](https://proj.org/) ([then known as PROJ.4](https://proj.org/faq.html#what-happened-to-proj-4)) and GCTCP C ([Archive](https://web.archive.org/web/20130523091752/http://edcftp.cr.usgs.gov/pub/software/gctpc/)) it is
a part of the [MetaCRS](https://trac.osgeo.org/metacrs/wiki) group of projects.

## Installing

Depending on your preferences

```bash
npm install proj4
bower install proj4
component install proj4js/proj4js
```

or just manually grab the file `proj4.js` from the [latest release](https://github.com/proj4js/proj4js/releases)'s `dist/` folder.

If you do not want to download anything, Proj4js is also hosted on [cdnjs](https://www.cdnjs.com/libraries/proj4js) for direct use in your browser applications.

## Using

The basic signature is:

```javascript
proj4([fromProjection, ]toProjection[, coordinates])
```

Projections can be proj or wkt strings.

Coordinates may be an object of the form `{x:x,y:y}` or an array of the form `[x,y]`.

When all 3 arguments  are given, the result is that the coordinates are transformed from projection1 to projection 2. And returned in the same format that they were given in.

```javascript
var firstProjection = 'PROJCS["NAD83 / Massachusetts Mainland",GEOGCS["NAD83",DATUM["North_American_Datum_1983",SPHEROID["GRS 1980",6378137,298.257222101,AUTHORITY["EPSG","7019"]],AUTHORITY["EPSG","6269"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.01745329251994328,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4269"]],UNIT["metre",1,AUTHORITY["EPSG","9001"]],PROJECTION["Lambert_Conformal_Conic_2SP"],PARAMETER["standard_parallel_1",42.68333333333333],PARAMETER["standard_parallel_2",41.71666666666667],PARAMETER["latitude_of_origin",41],PARAMETER["central_meridian",-71.5],PARAMETER["false_easting",200000],PARAMETER["false_northing",750000],AUTHORITY["EPSG","26986"],AXIS["X",EAST],AXIS["Y",NORTH]]';
var secondProjection = "+proj=gnom +lat_0=90 +lon_0=0 +x_0=6300000 +y_0=6300000 +ellps=WGS84 +datum=WGS84 +units=m +no_defs";
//I'm not going to redefine those two in latter examples.
proj4(firstProjection,secondProjection,[-122.305887, 58.9465872]);
// [-2690575.447893817, 36622916.8071244564]
```

The library can also parse coordinates provided with an elevation and measure, again as an object of the form `{x:x,y:y,z:z,m:m}` or an array of the form `[x,y,z,m]`.

```javascript
proj4(firstProjection,secondProjection,[-122.305887, 58.9465872,10]);
// [-2690575.447893817, 36622916.8071244564, 10]
```

If only 1 projection is given then it is assumed that it is being projected *from* WGS84 (fromProjection is WGS84).

```javascript
proj4(firstProjection,[-71,41]);
// [242075.00535055372, 750123.32090043]
```

If no coordinates are given an object with two methods is returned, its methods are `forward` which projects from the first projection to the second and `inverse` which projects from the second to the first.

```javascript
proj4(firstProjection,secondProjection).forward([-122.305887, 58.9465872]);
// [-2690575.447893817, 36622916.8071244564]
proj4(secondProjection,firstProjection).inverse([-122.305887, 58.9465872]);
// [-2690575.447893817, 36622916.8071244564]
```

And as above if only one projection is given, it's assumed to be coming from wgs84:

```javascript
proj4(firstProjection).forward([-71,41]);
// [242075.00535055372, 750123.32090043]
proj4(firstProjection).inverse([242075.00535055372, 750123.32090043]);
// [-71, 40.99999999999986]
```
Note: The generation of the floating point value `40.99999999999986` in this example represents the fact that some variance in precision is involved in any conversion between one coordinate reference system and another.

## Named Projections

If you prefer to define a projection as a string and reference it that way, you may use the proj4.defs method which can be called 2 ways, with a name and projection:

```js
proj4.defs('WGS84', "+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees");
```

or with an array

```js
proj4.defs([
  [
    'EPSG:4326',
    '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees'],
  [
    'EPSG:4269',
    '+title=NAD83 (long/lat) +proj=longlat +a=6378137.0 +b=6356752.31414036 +ellps=GRS80 +datum=NAD83 +units=degrees'
  ]
]);
```

you can then do

```js
proj4('EPSG:4326');
```

instead of writing out the whole proj definition, by default proj4 has the following projections predefined:

- 'EPSG:4326', which has the following alias
    - 'WGS84'
- 'EPSG:4269'
- 'EPSG:3857', which has the following aliases
    - 'EPSG:3785'
    - 'GOOGLE'
    - 'EPSG:900913'
    - 'EPSG:102113'

Defined projections can also be accessed through the proj4.defs function (`proj4.defs('EPSG:4326')`).

proj4.defs can also be used to define a named alias:

```javascript
proj4.defs('urn:x-ogc:def:crs:EPSG:4326', proj4.defs('EPSG:4326'));
```

## Axis order

By default, proj4 uses `[x,y]` axis order for projected (cartesian) coordinate systems and `[x=longitude,y=latitude]` for geographic coordinates. To enforce the axis order of the provided proj or wkt string, use the
```javascript
proj4(fromProjection, toProjection).forward(coordinate, enforceAxis);
proj4(fromProjection, toProjection).inverse(coordinate, enforceAxis);
```
signatures with `enforceAxis` set to `true`:
```javascript
proj4('+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees +axis=neu', firstProjection).forward([41, -71], true);
// [242075.00535055372, 750123.32090043]
proj4('+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees +axis=neu', firstProjection).inverse([242075.00535055372, 750123.32090043], true);
//[40.99999999999986, -71]
//the floating points to answer your question
```

## Grid Based Datum Adjustments

To use `+nadgrids=` in a proj definition, first read your NTv2 `.gsb` file (e.g. from https://github.com/OSGeo/proj-datumgrid) into an ArrayBuffer, then pass it to `proj4.nadgrid`. E.g:

```javascript
const buffer = fs.readFileSync('ntv2.gsb').buffer
proj4.nadgrid('key', buffer);
```

then use the given key in your definition, e.g. `+nadgrids=@key,null`. See [Grid Based Datum Adjustments](https://proj.org/usage/transformation.html?highlight=nadgrids#grid-based-datum-adjustments).

## TypeScript

TypeScript implementation was added to the [DefinitelyTyped repository](https://github.com/DefinitelyTyped/DefinitelyTyped).

```bash
$ npm install --save @types/proj4
```

## Developing
To set up build tools make sure you have node and grunt-cli installed and then run `npm install`.

To do the complete build and browser tests run

```bash
node_modules/.bin/grunt
```

To run node tests run

```bash
npm test
```

To run node tests with coverage run

```bash
npm test --coverage
```

To create a build with only default projections (latlon and Mercator) run

```bash
node_modules/.bin/grunt build
```

To create a build with only custom projections include a comma separated list of projections codes (the file name in 'lib/projections' without the '.js') after a colon, e.g.

```bash
node_modules/.bin/grunt build:tmerc
#includes transverse Mercator
node_modules/.bin/grunt build:lcc
#includes lambert conformal conic
node_modules/.bin/grunt build:omerc,moll
#includes oblique Mercator and Mollweide
```
