/**
 *  gulp.js to build the library
 */
var gulp = require('gulp');
var gutil = require('gulp-util');

var clean = require('gulp-clean');
var serve = require('gulp-serve');
var mdown = require('gulp-markdown');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var minify = require('gulp-minify-css');

var paths = {
	mjs: [
		"libs/mjs/mjs.js"
	],
	potree: [
		"src/License.js",
		"src/extensions/Array.js",
		"src/extensions/mjs.js",
		"src/extensions/String.js",
		"src/extensions/ArrayBuffer.js",
		"src/extensions/Float32Array.js",
		"src/utils/utils.js",
		"src/KeyListener.js",
		"src/KeyCodes.js",
		"src/MouseListener.js",
		"src/Mouse.js",
		"src/ResourceManager/TextureManager.js",
		"src/ResourceManager/MaterialManager.js",
		"src/shader/Shader.js",
		"src/utils/Plane.js",
		"src/utils/Frustum.js",
		"src/rendering/Renderer.js",
		"src/scenegraph/AABB.js",
		"src/scenegraph/SceneNode.js",
		"src/scenegraph/Camera.js",
		"src/scenegraph/Scene.js",
		"src/scenegraph/MeshNode.js",
		"src/scenegraph/Light.js",
		"src/scenegraph/Sphere.js",
		"src/objects/Mesh.js",
		"src/Viewport.js",
		"src/navigation/CamHandler.js",
		"src/navigation/FreeFlightCamHandler.js",
		"src/navigation/OrbitCamHandler.js",
		"src/Framebuffer.js",
		"src/FramebufferFloat32.js",
		"src/ResourceManager/ShaderManager.js",
		"src/utils/MeshUtils.js",
		"src/scenegraph/PointcloudOctreeSceneNode.js",
		"src/scenegraph/PointCloudSceneNode.js",
		"src/objects/PointCloud.js",
		"src/objects/PointcloudOctreeNode.js",
		"src/objects/PointcloudOctree.js",
		"src/materials/Material.js",
		"src/materials/WeightedPointSizeMaterial.js",
		"src/materials/FixedPointSizeMaterial.js",
		"src/materials/PointCloudMaterial.js",
		"src/materials/FlatMaterial.js",
		"src/materials/PhongMaterial.js",
		"src/materials/FilteredSplatsMaterial.js",
		"src/materials/GaussFillMaterial.js",
		"src/loader/POCLoader.js",
		"src/loader/PointAttributes.js",
		"src/loader/PlyLoader.js",
		"src/utils/LRU.js",
		"src/Potree.js"
	],
	styles: "resources/css/*.css",
	docs: [
		"docs/*.md"
	]
};

gulp.task('scripts', function() {
	// Copy all JavaScript into build directory
	gulp.src(paths.mjs)
		.pipe(concat('mjs.js'))
		.pipe(gulp.dest('build/js'))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify({preserveComments: 'some'}))
		.pipe(gulp.dest('build/js'));

	gulp.src(paths.potree)
		.pipe(concat('potree.js'))
		.pipe(gulp.dest('build/js'))
		.pipe(rename({suffix: '.min'}))
		.pipe(uglify({preserveComments: 'some'}))
		.pipe(gulp.dest('build/js'));
	return;
});

gulp.task('styles', function() {
	// Copy all Stylesheets into build directory
	return gulp.src(paths.styles)
		.pipe(concat('potree.css'))
		.pipe(gulp.dest('build/css'))
		.pipe(rename({suffix: '.min'}))
		.pipe(minify())
		.pipe(gulp.dest('build/css'));
});

gulp.task('docs', function() {
	// Build documentation
	return gulp.src(paths.docs)
		.pipe(mdown())
		.pipe(gulp.dest('build/docs'));
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
gulp.task('debug', ['styles', 'scripts', 'watch', 'serve']);
gulp.task('build', ['clean', 'styles', 'scripts']);

