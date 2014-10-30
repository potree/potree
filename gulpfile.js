
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


var paths = {
	potree : [
		"src/Potree.js",
		"src/WorkerManager.js",
		"src/extensions/PerspectiveCamera.js",
		"src/extensions/Ray.js",
		"src/loader/POCLoader.js",
		"src/loader/PointAttributes.js",
		"src/loader/LasLazLoader.js",
		"src/materials/PointCloudRGBMaterial.js",
		"src/materials/PointCloudRGBInterpolationMaterial.js",
		"src/materials/PointCloudIntensityMaterial.js",
		"src/materials/PointCloudHeightMaterial.js",
		"src/materials/PointCloudColorMaterial.js",
		"src/FirstPersonControls.js",
		"src/LRU.js",
		"src/PointCloudOctree.js",
		"src/PointCloudOctreeGeometry.js",
		"src/utils.js",
		"src/TextSprite.js",
		"src/utils/MeasuringTool.js",
		"src/utils/ProfileTool.js",
		"src/utils/TranslationTool.js"
	],
	laslaz: [
		"build/workers/laslaz-worker.js",
		"build/workers/lasdecoder-worker.js",
	]
};

var workers = {
	"laslaz": [
		"libs/plasio/workers/laz-perf.js",
		"libs/plasio/workers/laz-loader-worker.js"
	],
	"LASDecoder": [
		"src/workers/LASDecoderWorker.js"
	]
};


gulp.task("workers", function(){
	gulp.src(workers.laslaz)
		.pipe(encodeWorker('laslaz-worker.js', "Potree.workers.laslaz"))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/workers'));
		
	gulp.src(workers.LASDecoder)
		.pipe(encodeWorker('lasdecoder-worker.js', "Potree.workers.lasdecoder"))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/workers'));
});


gulp.task("scripts", function(){
	gulp.src(paths.potree)
		.pipe(concat('potree.js'))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/js'))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify({preserveComments: 'some'}))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/js'));
		
	gulp.src(paths.laslaz)
		.pipe(concat('laslaz.js'))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/js'))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify({preserveComments: 'some'}))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/js'));

	return;
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
		//var content = varname + " = {\n";
		//content += "\tcode:\tatob(\"" + new Buffer(joinedContents).toString('base64') + "\"),\n";
		//content += "\tinstances:\t[]\n";
		//content += "};";
		var content = varname + " = new Potree.WorkerManager(atob(\"" + new Buffer(joinedContents).toString('base64') + "\"));";
		
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






