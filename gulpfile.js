
var path = require('path');
var gulp = require('gulp');

var concat = require('gulp-concat');
var size = require('gulp-size');
var rename = require('gulp-rename');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var through = require('through');
var os = require('os');
var File = gutil.File;

//We need this one for the in-built webserver
var connect = require('gulp-connect');


var paths = {
	potree : [
		"src/Potree.js",
		"src/PointCloudTree.js",
		"src/WorkerPool.js",
		"build/shaders/shaders.js",
		"src/extensions/EventDispatcher.js",
		"src/extensions/PerspectiveCamera.js",
		"src/extensions/Ray.js",
		"src/loader/POCLoader.js",
		"src/loader/PointAttributes.js",
		"src/loader/BinaryLoader.js",
		"src/loader/GreyhoundBinaryLoader.js",
		"src/loader/GreyhoundLoader.js",
		"src/loader/LasLazLoader.js",
		"src/materials/PointCloudMaterial.js",
		"src/materials/EyeDomeLightingMaterial.js",
		"src/materials/BlurMaterial.js",
		"src/navigation/InputHandler.js",
		"src/navigation/FirstPersonControls.js",
		"src/navigation/GeoControls.js",
		"src/navigation/OrbitControls.js",
		"src/navigation/EarthControls.js",
		"src/LRU.js",
		"src/Annotation.js",
		"src/ProfileRequest.js",
		"src/PointCloudOctree.js",
		"src/PointCloudOctreeGeometry.js",
		"src/PointCloudGreyhoundGeometry.js",
		"src/PointCloudGreyhoundGeometryNode.js",
		"src/utils.js",
		"src/Features.js",
		"src/TextSprite.js",
		"src/AnimationPath.js",
		"src/Version.js",
		"src/utils/Measure.js",
		"src/utils/MeasuringTool.js",
		"src/utils/Profile.js",
		"src/utils/ProfileTool.js",
		"src/utils/TransformationTool.js",
		"src/utils/Volume.js",
		"src/utils/VolumeTool.js",
		"src/exporter/GeoJSONExporter.js",
		"src/exporter/DXFExporter.js",
		"src/arena4d/PointCloudArena4D.js",
		"src/arena4d/PointCloudArena4DGeometry.js",
		"src/viewer/ProgressBar.js",
		"src/viewer/viewer.js",
		"src/viewer/profile.js",
		"src/viewer/map.js",
		"src/viewer/sidebar.js",
		"src/stuff/HoverMenu.js"
	],
	laslaz: [
		"build/workers/laslaz-worker.js",
		"build/workers/lasdecoder-worker.js",
	],
	html: [
		"src/viewer/potree.css",
		"src/viewer/sidebar.html",
		"src/viewer/profile.html"
	],
	resources: [
		"resources/**/*"
	]
};

var workers = {
	"laslaz": [
		"libs/plasio/workers/laz-perf.js",
		"libs/plasio/workers/laz-loader-worker.js"
	],
	"LASDecoder": [
		"src/workers/LASDecoderWorker.js"
	],
	"BinaryDecoder": [
		"src/workers/BinaryDecoderWorker.js",
		"src/Version.js",
		"src/loader/PointAttributes.js"
	],
	"GreyhoundBinaryDecoder": [
		"libs/plasio/workers/laz-perf.js",
		"src/workers/GreyhoundBinaryDecoderWorker.js",
		"src/Version.js",
		"src/loader/PointAttributes.js"
	]
};

var shaders = [
	"src/materials/shaders/pointcloud.vs",
	"src/materials/shaders/pointcloud.fs",
	"src/materials/shaders/normalize.vs",
	"src/materials/shaders/normalize.fs",
	"src/materials/shaders/edl.vs",
	"src/materials/shaders/edl.fs",
	"src/materials/shaders/blur.vs",
	"src/materials/shaders/blur.fs"
];


gulp.task("workers", function(){
	gulp.src(workers.laslaz)
		.pipe(encodeWorker('laslaz-worker.js', "Potree.workers.laslaz"))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/potree/workers'));

	gulp.src(workers.LASDecoder)
		.pipe(encodeWorker('lasdecoder-worker.js', "Potree.workers.lasdecoder"))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/potree/workers'));

	gulp.src(workers.BinaryDecoder)
		.pipe(encodeWorker('BinaryDecoderWorker.js', "Potree.workers.binaryDecoder"))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/potree/workers'));

	gulp.src(workers.GreyhoundBinaryDecoder)
		.pipe(encodeWorker('GreyhoundBinaryDecoderWorker.js', "Potree.workers.greyhoundBinaryDecoder"))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/potree/workers'));
});

gulp.task("shaders", function(){
	return gulp.src(shaders)
		.pipe(encodeShader('shaders.js', "Potree.Shader"))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/shaders'));
});

gulp.task("scripts", ['workers','shaders'], function(){
	gulp.src(paths.potree)
		.pipe(concat('potree.js'))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/potree'));

	gulp.src(paths.laslaz)
		.pipe(concat('laslaz.js'))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/potree'));

	gulp.src(paths.html)
		.pipe(gulp.dest('build/potree'));

	gulp.src(paths.resources)
		.pipe(gulp.dest('build/potree/resources'));

	gulp.src(["LICENSE"])
		.pipe(gulp.dest('build/potree'));

	return;
});

gulp.task('build', ['scripts']);

gulp.task('watch', function() {
    gulp.watch('src/**/*.js', ['scripts']);
})

// For development, it is now possible to use 'gulp webserver'
// from the command line to start the server (default port is 8080)
gulp.task('webserver', function() {
  connect.server();
});


var encodeWorker = function(fileName, varname, opt){
	if (!fileName) throw new PluginError('gulp-concat',  'Missing fileName option for gulp-concat');
	if (!opt) opt = {};
	if (!opt.newLine) opt.newLine = gutil.linefeed;

	var buffer = [];
	var firstFile = null;

	function bufferContents(file){
		if (file.isNull()) return; // ignore
		if (file.isStream()) return this.emit('error', new PluginError('gulp-concat',  'Streaming not supported'));

		if (!firstFile) firstFile = file;

		var string = file.contents.toString('utf8');
		buffer.push(string);
	}

	function endStream(){
		if (buffer.length === 0) return this.emit('end');

		var joinedContents = buffer.join("");
		//var content = varname + " = new Potree.WorkerManager(atob(\"" + new Buffer(joinedContents).toString('base64') + "\"));";
		let content = joinedContents;

		var joinedPath = path.join(firstFile.base, fileName);

		var joinedFile = new File({
			cwd: firstFile.cwd,
			base: firstFile.base,
			path: joinedPath,
			contents: new Buffer(content)
		});

		this.emit('data', joinedFile);
		this.emit('end');
	}

	return through(bufferContents, endStream);
};

var encodeShader = function(fileName, varname, opt){
	if (!fileName) throw new PluginError('gulp-concat',  'Missing fileName option for gulp-concat');
	if (!opt) opt = {};
	if (!opt.newLine) opt.newLine = gutil.linefeed;

	var buffer = [];
	var files = [];
	var firstFile = null;

	function bufferContents(file){
		if (file.isNull()) return; // ignore
		if (file.isStream()) return this.emit('error', new PluginError('gulp-concat',  'Streaming not supported'));

		if (!firstFile) firstFile = file;

		var string = file.contents.toString('utf8');
		buffer.push(string);
		files.push(file);
	}

	function endStream(){
		if (buffer.length === 0) return this.emit('end');

		var joinedContent = "";
		for(var i = 0; i < buffer.length; i++){
			var b = buffer[i];
			var file = files[i];

			var fname = file.path.replace(file.base, "");
			console.log(fname);

			var content = new Buffer(b).toString();
			var prep = "Potree.Shaders[\"" + fname  + "\"] = [\n";
			var lines = content.split("\n");
			for(var j = 0; j < lines.length; j++){
				var line = lines[j];
				line = line.replace(/(\r\n|\n|\r)/gm,"");
				prep += " \"" + line + "\",\n";
			}
			prep += "].join(\"\\n\");\n\n";

			joinedContent += prep;
		}

		var joinedPath = path.join(firstFile.base, fileName);

		var joinedFile = new File({
			cwd: firstFile.cwd,
			base: firstFile.base,
			path: joinedPath,
			contents: new Buffer(joinedContent)
		});

		this.emit('data', joinedFile);
		this.emit('end');
	}

	return through(bufferContents, endStream);
};
