/**
 *  gulp.js to build the library
 */
var path = require('path');
var gulp = require('gulp');
var gutil = require('gulp-util');

var tap = require('gulp-tap');
var size = require('gulp-size');
var clean = require('gulp-clean');
var serve = require('gulp-serve');
var mdown = require('gulp-markdown');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var minify = require('gulp-minify-css');
var htmlreplace = require('gulp-html-replace');

var paths = {
	mjs: [
		"./libs/mjs/mjs.js"
	],
	potree: [
		"./src/License.js",
		"./src/extensions/Array.js",
		"./src/extensions/mjs.js",
		"./src/extensions/String.js",
		"./src/extensions/ArrayBuffer.js",
		"./src/extensions/Float32Array.js",
		"./src/utils/utils.js",
		"./src/KeyListener.js",
		"./src/KeyCodes.js",
		"./src/MouseListener.js",
		"./src/Mouse.js",
		"./src/ResourceManager/TextureManager.js",
		"./src/ResourceManager/MaterialManager.js",
		"./src/shader/Shader.js",
		"./src/utils/Plane.js",
		"./src/utils/Frustum.js",
		"./src/rendering/Renderer.js",
		"./src/scenegraph/AABB.js",
		"./src/scenegraph/SceneNode.js",
		"./src/scenegraph/Camera.js",
		"./src/scenegraph/Scene.js",
		"./src/scenegraph/MeshNode.js",
		"./src/scenegraph/Light.js",
		"./src/scenegraph/Sphere.js",
		//"./src/scenegraph/Plane.js",
		"./src/objects/Mesh.js",
		"./src/Viewport.js",
		"./src/navigation/CamHandler.js",
		"./src/navigation/FreeFlightCamHandler.js",
		"./src/navigation/OrbitCamHandler.js",
		"./src/Framebuffer.js",
		"./src/FramebufferFloat32.js",
		"./src/ResourceManager/ShaderManager.js",
		"./src/utils/MeshUtils.js",
		"./src/scenegraph/PointcloudOctreeSceneNode.js",
		"./src/scenegraph/PointCloudSceneNode.js",
		"./src/objects/PointCloud.js",
		"./src/objects/PointcloudOctreeNode.js",
		"./src/objects/PointcloudOctree.js",
		"./src/materials/Material.js",
		"./src/materials/WeightedPointSizeMaterial.js",
		"./src/materials/FixedPointSizeMaterial.js",
		"./src/materials/PointCloudMaterial.js",
		"./src/materials/FlatMaterial.js",
		"./src/materials/PhongMaterial.js",
		"./src/materials/FilteredSplatsMaterial.js",
		"./src/materials/GaussFillMaterial.js",
		"./src/loader/POCLoader.js",
		"./src/loader/PointAttributes.js",
		"./src/loader/ProceduralPointcloudGenerator.js",
		"./src/loader/PlyLoader.js",
		"./src/utils/LRU.js",
		"./src/Potree.js"
	]
};

gulp.task('scripts', function() {
	// Copy all JavaScript into build directory
	gulp.src(paths.mjs)
		.pipe(concat('mjs.js'))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/js'))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify({preserveComments: 'some'}))
		.pipe(size({showFiles: true}))
		.pipe(gulp.dest('build/js'));

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

gulp.task('styles', function() {
	// Copy all Stylesheets into build directory
	return gulp.src('./resources/css/*.css')
		.pipe(concat('potree.css'))
		.pipe(gulp.dest('build/css'))
		.pipe(rename({suffix: '.min'}))
		.pipe(minify())
		.pipe(gulp.dest('build/css'));
});

gulp.task('docs', function() {
	// Build documentation
	return gulp.src('./docs/*.md')
		.pipe(mdown())
		.pipe(gulp.dest('build/docs'));
});

gulp.task('examples', function() {
	// Build examples
	var list = [];
	gulp.src('./examples/*.html')
		.pipe(tap(function (file,t) {
			var name = path.basename(file.path);
			var item = '<a href="' + name + '">' + name + '</a>';
			list.push('<li>' + item + '</li>');
		}))
		.pipe(gulp.dest('build'))
		.on('end', function () {
			gulp.src('./examples/index.tpl')
				.pipe(htmlreplace('toc', list.join(''), '<ul>%s</ul>'))
				.pipe(rename({extname: '.html'}))
				.pipe(gulp.dest('build'))
		});

	// Copy resources
	gulp.src('./resources/**/*')
		.pipe(gulp.dest('build'));
});

gulp.task('test', function() {
	// Test Javascript source files
	gulp.src(paths.mjs)
		.pipe(jshint())
		.pipe(jshint.reporter('default'));

	gulp.src(paths.potree)
		.pipe(jshint())
		.pipe(jshint.reporter('default'));
	return;
});

gulp.task('clean', function() {
	// Clean the following directories
	return gulp.src(['build'], { read: false })
		.pipe(clean());
});

gulp.task('watch', function () {
	// Watch the following files for changes
	gulp.watch(paths.scripts, ['scripts']);
	gulp.watch(paths.styles, ['styles']);
});

// Simple webserver
gulp.task('serve', serve('build'));

// called when you run `gulp` from cli
gulp.task('build', ['examples', 'scripts', 'styles']);
gulp.task('debug', ['build', 'watch', 'serve']);
