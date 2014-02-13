/**
 *  gulp.js to build the library
 */
var gulp = require('gulp');
var gutil = require('gulp-util');

var concat = require('gulp-concat');
var uglify = require('gulp-uglify');

var paths = {
	scripts: [
		"libs/mjs/mjs.js",
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
		//	"src/scenegraph/Plane.js",
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
		"src/loader/ProceduralPointcloudGenerator.js",
		"src/loader/PlyLoader.js",
		"src/utils/LRU.js",
	]
};

gulp.task('scripts', function() {
	// Minify and copy all JavaScript (except vendor scripts)
	return gulp.src(paths.scripts)
		.pipe(uglify())
		.pipe(concat('potree.min.js'))
		.pipe(gulp.dest('build/'));
});

// Rerun the task when a file changes
gulp.task('watch', function () {
	gulp.watch(paths.scripts, ['scripts']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['scripts', 'watch']);
