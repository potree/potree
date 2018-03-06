
# How to build the library

## Installation

Make sure you have [node.js](http://nodejs.org/) installed

First, install all dependencies, as specified in package.json, 
then, install the gulp build tool.

    cd <potree_directory>
    npm install 
    npm install -g gulp

## Usage

Use this command to 

* create ./build/potree 
* watch for changes to the source code and automatically create a new build on change
* start a web server at localhost:1234. Go to http://localhost:1234/examples/ to test the examples.

If the source code changes, a new build will be done automatically.

    gulp watch

Or do a build once, without watching for changes.

    gulp build