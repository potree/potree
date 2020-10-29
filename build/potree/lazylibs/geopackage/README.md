# GeoPackage JS

GeoPackage JS is an implementation of the OGC GeoPackage spec.  This library works in both the browser and Node 4+.

### Demo ###
[GeoPackage JS Demo Page](http://ngageoint.github.io/geopackage-js/)

Cloning this repository and opening the docs/index.html in your browser will run the demo locally.

### Installation ###

[![Build Status](https://travis-ci.org/ngageoint/geopackage-js.svg?branch=master)](https://travis-ci.org/ngageoint/geopackage-js)
[![NPM](https://img.shields.io/npm/v/@ngageoint/geopackage.svg)](https://www.npmjs.com/package/@ngageoint/geopackage)
[![Coverage Status](https://coveralls.io/repos/github/ngageoint/geopackage-js/badge.svg)](https://coveralls.io/github/ngageoint/geopackage-js)

```sh
$ npm install @ngageoint/geopackage
```

#### GeoPackage JS Library ####

The [GeoPackage Libraries](http://ngageoint.github.io/GeoPackage/) were developed at the [National Geospatial-Intelligence Agency (NGA)](http://www.nga.mil/) in collaboration with [BIT Systems](http://www.bit-sys.com/). The government has "unlimited rights" and is releasing this software to increase the impact of government investments by providing developers with the opportunity to take things in new directions. The software use, modification, and distribution rights are stipulated within the [MIT license](http://choosealicense.com/licenses/mit/).

### Pull Requests ###
If you'd like to contribute to this project, please make a pull request. We'll review the pull request and discuss the changes. All pull request contributions to this project will be released under the MIT license.

Software source code previously released under an open source license and then modified by NGA staff is considered a "joint work" (see 17 USC § 101); it is partially copyrighted, partially public domain, and as a whole is protected by the copyrights of the non-government authors and must be released according to the terms of the original open source license.

### About ###

[GeoPackage JS](https://github.com/ngageoint/geopackage-js) is a [GeoPackage Library](http://ngageoint.github.io/GeoPackage/) JavaScript implementation of the Open Geospatial Consortium [GeoPackage](http://www.geopackage.org/) [spec](http://www.geopackage.org/spec/).  It is listed as an [OGC GeoPackage Implementation](http://www.geopackage.org/#implementations_nga) by the National Geospatial-Intelligence Agency.

The GeoPackage JavaScript library currently provides the ability to read GeoPackage files.  This library works both in the browser and in Node.  In the browser tiles are rendered using HTML5 Canvas and GeoPackages are read using [sql.js](https://github.com/kripken/sql.js/).  In Node tiles are rendered  [PureImage](https://github.com/joshmarinacci/node-pureimage) and GeoPackages are read using [node-sqlite3](https://github.com/mapbox/node-sqlite3).

### Changelog

##### 2.1.0

- Implementation of the Feature Style Extension and Contents ID Extension

##### 2.0.8

- Checks for Electron when returning a tile creator

##### 2.0

- All new API utilizing Promises

##### 1.1.4

- Adds a method to retrieve tiles in EPSG:4326

##### 1.1.3

- Fixes issue #115

##### 1.1.2

- fix case where GeoPackage Zoom does not correspond to the web map zoom

##### 1.1.1

- fix more instances of proj4 bug for react
- fixed tile generation for images with different x and y pixel densities

##### 1.1.0

- accept pull request adding support for react
- fix bug with projected tiles that spanned the date line

##### 1.0.25

- ensure we use proj4 2.4.3 instead of 2.4.4

##### 1.0.22

- Fixed bug where querying for indexed features only returned the geometry instead of the entire feature

##### 1.0.19

- Remove dependency on Lwip

### Usage ###

View examples using [Bower](https://github.com/ngageoint/geopackage-js/tree/master/docs/bower) and [Browserify](https://github.com/ngageoint/geopackage-js/tree/master/docs)

View the latest [docs](http://ngageoint.github.io/geopackage-js/jsdoc/module-geoPackage-GeoPackage.html) (currently being updated).

#### Browser Usage ####
```javascript

// attach this method to a file input onchange event
window.loadGeoPackage = function(files) {
  var f = files[0];
  var r = new FileReader();
  r.onload = function() {
    var array = new Uint8Array(r.result);
    loadByteArray(array);
  }
  r.readAsArrayBuffer(f);
}

function loadByteArray(array, callback) {
  var db = new SQL.Database(array);
  GeoPackageConnection.connectWithDatabase(db, function(err, connection) {
    var geoPackage = new GeoPackage('', '', connection);

    // Now you can operate on the GeoPackage

    // get the tile table names
    geoPackage.getTileTables(function(err, tileTableNames) {
      // tileTableNames is an array of all tile table names

      // get the info for the first table
      geoPackage.getTileDaoWithTableName(tileTableNames[0], function(err, tileDao) {
        geoPackage.getInfoForTable(tileDao, function(err, info) {
          // do something with the tile table info
        });

        // draw a tile into a canvas for an XYZ tile
        var canvas = canvasFromSomewhere;
        var gpr = new GeoPackageTileRetriever(tileDao, 256, 256);
        var x = 0;
        var y = 0;
        var zoom = 0;

        console.time('Draw tile ' + x + ', ' + y + ' zoom: ' + zoom);
        gpr.drawTileIn(x, y, zoom, canvas, function() {
          console.timeEnd('Draw tile ' + x + ', ' + y + ' zoom: ' + zoom);
        });

        // or get a tile base64 data URL for an XYZ tile
        gpr.getTile(x, y, zoom, function(err, tileBase64DataURL) {
          console.log('got the base64 data url');
        });

        // or get a tile from a GeoPackage tile column and tile row
        tileDao.queryForTile(tileColumn, tileRow, zoom, function(err, tile) {
          var tileData = tile.getTileData();  // the raw bytes from the GeoPackage
        });

      });
    });

    // get the feature table names
    geoPackage.getFeatureTables(function(err, featureTableNames) {
      // featureTableNames is an array of all feature table names

      // get the info for the first table
      geoPackage.getFeatureDaoWithTableName(featureTableNames[0], function(err, featureDao) {
        geoPackage.getInfoForTable(featureDao, function(err, info) {
          // do something with the feature table info
        });

        // query for all features
        featureDao.queryForEach(function(err, row, rowDone) {
          var feature = featureDao.getFeatureRow(row);
          var geometry = currentRow.getGeometry();
          if (geometry) {
            var geom = geometry.geometry;
            var geoJson = geometry.geometry.toGeoJSON();

            geoJson.properties = {};
            for (var key in feature.values) {
              if(feature.values.hasOwnProperty(key) && key != feature.getGeometryColumn().name) {
                var column = info.columnMap[key];
                geoJson.properties[column.displayName] = currentRow.values[key];
              }
            }
          }
          rowDone();
        });
      });
    });
  });
}

```

#### NodeJS Usage ####

```javascript
var GeoPackageAPI = require('@ngageoint/geopackage')
  , GeoPackageManager = GeoPackageAPI.GeoPackageManager
  , GeoPackageConnection = GeoPackageAPI.GeoPackageConnection
  , GeoPackageTileRetriever = GeoPackageAPI.GeoPackageTileRetriever;

GeoPackageAPI.open(filename, function(err, geoPackage) {

  // Now you can operate on the GeoPackage

  // get the tile table names
  geoPackage.getTileTables(function(err, tileTableNames) {
    // tileTableNames is an array of all tile table names

    // get the info for the first table
    geoPackage.getTileDaoWithTableName(tileTableNames[0], function(err, tileDao) {
      geoPackage.getInfoForTable(tileDao, function(err, info) {
        // do something with the tile table info
      });

      // draw a tile into a canvas for an XYZ tile
      var canvas = canvasFromSomewhere;
      var gpr = new GeoPackageTileRetriever(tileDao, 256, 256);
      var x = 0;
      var y = 0;
      var zoom = 0;

      console.time('Draw tile ' + x + ', ' + y + ' zoom: ' + zoom);
      gpr.drawTileIn(x, y, zoom, canvas, function() {
        console.timeEnd('Draw tile ' + x + ', ' + y + ' zoom: ' + zoom);
      });

      // or get a tile base64 data URL for an XYZ tile
      gpr.getTile(x, y, zoom, function(err, tileBase64DataURL) {
        console.log('got the base64 data url');
      });

      // or get a tile from a GeoPackage tile column and tile row
      tileDao.queryForTile(tileColumn, tileRow, zoom, function(err, tile) {
        var tileData = tile.getTileData();  // the raw bytes from the GeoPackage
      });

    });
  });

  // get the feature table names
  geoPackage.getFeatureTables(function(err, featureTableNames) {
    // featureTableNames is an array of all feature table names

    // get the info for the first table
    geoPackage.getFeatureDaoWithTableName(featureTableNames[0], function(err, featureDao) {
      geoPackage.getInfoForTable(featureDao, function(err, info) {
        // do something with the feature table info
      });

      // query for all features
      featureDao.queryForEach(function(err, row, rowDone) {
        var feature = featureDao.getFeatureRow(row);
        var geometry = currentRow.getGeometry();
        if (geometry) {
          var geom = geometry.geometry;
          var geoJson = geometry.geometry.toGeoJSON();

          geoJson.properties = {};
          for (var key in feature.values) {
            if(feature.values.hasOwnProperty(key) && key != feature.getGeometryColumn().name) {
              var column = info.columnMap[key];
              geoJson.properties[column.displayName] = currentRow.values[key];
            }
          }
        }
        rowDone();
      });
    });
  });
});

```
