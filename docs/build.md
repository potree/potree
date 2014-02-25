# How to use gulp.js to build the library

## Installation

	npm install -g gulp
	npm install --save-dev 

## Usage

	gulp clean     // Deletes the build directory
	gulp test      // Runs Javascript test "jshint"
	gulp docs      // Build documentation

	gulp debug     // Builds script files, watches for changes
	               // and starts a simple webserver (port:3000)
	gulp build     // Builds script files

If Gulp.js is watching for changes, stop with `ctrl+c`.
