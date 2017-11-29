
const path = require('path');
const gulp = require('gulp');

const concat = require('gulp-concat');
const size = require('gulp-size');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const gutil = require('gulp-util');
const through = require('through');
const os = require('os');
const File = gutil.File;
const connect = require('gulp-connect');

var server;

var paths = {
	potree : [
		"src/Potree.js",
		"src/PotreeRenderer.js",
		"src/PointCloudTree.js",
		"src/WorkerPool.js",
		"build/shaders/shaders.js",
		"src/extensions/EventDispatcher.js",
		"src/extensions/PerspectiveCamera.js",
		"src/extensions/OrthographicCamera.js",
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
		"src/Actions.js",
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
		"src/utils/ClippingTool.js",
		"src/utils/ClipVolume.js",
		"src/utils/PolygonClipVolume.js",
		"src/utils/Box3Helper.js",
		"src/utils/PointCloudSM.js",
		"src/exporter/GeoJSONExporter.js",
		"src/exporter/DXFExporter.js",
		"src/exporter/CSVExporter.js",
		"src/exporter/LASExporter.js",
		"src/arena4d/PointCloudArena4D.js",
		"src/arena4d/PointCloudArena4DGeometry.js",
		"src/viewer/PotreeRenderer.js",
		"src/viewer/EDLRenderer.js",
		"src/viewer/RepRenderer.js",
		"src/viewer/viewer.js",
		"src/viewer/profile.js",
		"src/viewer/map.js",
		"src/viewer/sidebar.js",
		"src/viewer/NavigationCube.js",
		"src/stuff/HoverMenu.js",
		"src/webgl/GLProgram.js",
		"src/InterleavedBuffer.js",
		"src/utils/toInterleavedBufferAttribute.js",
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
	"LASLAZWorker": [
		"libs/plasio/workers/laz-perf.js",
		"libs/plasio/workers/laz-loader-worker.js"
	],
	"LASDecoderWorker": [
		"src/workers/LASDecoderWorker.js"
	],
	"BinaryDecoderWorker": [
		"src/workers/BinaryDecoderWorker.js",
		"src/Version.js",
		"src/loader/PointAttributes.js",
		"src/InterleavedBuffer.js",
		"src/utils/toInterleavedBufferAttribute.js",
	],
	"GreyhoundBinaryDecoderWorker": [
		"libs/plasio/workers/laz-perf.js",
		"src/workers/GreyhoundBinaryDecoderWorker.js",
		"src/Version.js",
		"src/loader/PointAttributes.js"
	]
};

var shaders = [
	"src/materials/shaders/pointcloud.vs",
	"src/materials/shaders/pointcloud.fs",
	"src/materials/shaders/pointcloud_sm.vs",
	"src/materials/shaders/pointcloud_sm.fs",
	"src/materials/shaders/normalize.vs",
	"src/materials/shaders/normalize.fs",
	"src/materials/shaders/edl.vs",
	"src/materials/shaders/edl.fs",
	"src/materials/shaders/blur.vs",
	"src/materials/shaders/blur.fs"
];


gulp.task("workers", function(){

	for(let workerName of Object.keys(workers)){
		
		gulp.src(workers[workerName])
			.pipe(concat(`${workerName}.js`))
			.pipe(size({showFiles: true}))
			.pipe(gulp.dest('build/potree/workers'));
		
	}

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

// For development, it is now possible to use 'gulp webserver'
// from the command line to start the server (default port is 8080)
gulp.task('webserver', function() {
	server = connect.server({port: 1234});
});

gulp.task('watch', function() {
	gulp.run("build");
	gulp.run("webserver");
	
    gulp.watch(['src/**/*.js', 'src/**/*.css', 'src/**/*.html', 'src/**/*.vs', 'src/**/*.fs'], ["build"]);
});


var encodeWorker = function(fileName, opt){
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
			
			let prep = `\nPotree.Shaders["${fname}"] = \`${content}\`\n`;

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
