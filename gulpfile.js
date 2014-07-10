
var path = require('path');
var gulp = require('gulp');

var concat = require('gulp-concat');
var size = require('gulp-size');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');

var paths = {
	potree : [
		"src/Potree.js",
		"src/extensions/PerspectiveCamera.js",
		"src/extensions/Ray.js",
		"src/loader/POCLoader.js",
		"src/loader/PointAttributes.js",
		"src/FirstPersonControls.js",
		"src/LRU.js",
		"src/PointCloudOctree.js",
		"src/PointCloudOctreeGeometry.js",
		"src/utils.js"
	]

};




gulp.task("scripts", function(){
	gulp.src(paths.potree)
		.pipe(concat('potree.js'))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/js'))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify({preserveComments: 'some'}))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/js'));

	return;
});