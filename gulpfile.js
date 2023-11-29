
const path = require('path');
const gulp = require('gulp');
const exec = require('child_process').exec;

const fs = require("fs");
const fsp = fs.promises;
const concat = require('gulp-concat');
const connect = require('gulp-connect');
const {watch} = gulp;

const {createExamplesPage} = require("./src/tools/create_potree_page");
const {createGithubPage} = require("./src/tools/create_github_page");
const {createIconsPage} = require("./src/tools/create_icons_page");


let paths = {
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

let workers = {
	"LASLAZWorker": [
		"libs/plasio/workers/laz-perf.js",
		"libs/plasio/workers/laz-loader-worker.js"
	],
	"LASDecoderWorker": [
		"src/workers/LASDecoderWorker.js"
	],
	"EptLaszipDecoderWorker": [
		"libs/copc/index.js",
		"src/workers/EptLaszipDecoderWorker.js",
	],
	"EptBinaryDecoderWorker": [
		"libs/ept/ParseBuffer.js",
		"src/workers/EptBinaryDecoderWorker.js"
	],
	"EptZstandardDecoderWorker": [
		"src/workers/EptZstandardDecoder_preamble.js",
		'libs/zstd-codec/bundle.js',
		"libs/ept/ParseBuffer.js",
		"src/workers/EptZstandardDecoderWorker.js"
	]
};

// these libs are lazily loaded
// in order for the lazy loader to find them, independent of the path of the html file,
// we package them together with potree
let lazyLibs = {
	"geopackage": "libs/geopackage",
	"sql.js": "libs/sql.js"
};

let shaders = [
	"src/materials/shaders/pointcloud.vs",
	"src/materials/shaders/pointcloud.fs",
	"src/materials/shaders/pointcloud_sm.vs",
	"src/materials/shaders/pointcloud_sm.fs",
	"src/materials/shaders/normalize.vs",
	"src/materials/shaders/normalize.fs",
	"src/materials/shaders/normalize_and_edl.fs",
	"src/materials/shaders/edl.vs",
	"src/materials/shaders/edl.fs",
	"src/materials/shaders/blur.vs",
	"src/materials/shaders/blur.fs",
];

// For development, it is now possible to use 'gulp webserver'
// from the command line to start the server (default port is 8080)
gulp.task('webserver', gulp.series(async function() {
	server = connect.server({
		port: 1234,
		https: false,
	});
}));

gulp.task('examples_page', async function(done) {
	await Promise.all([
		createExamplesPage(),
		createGithubPage(),
	]);

	done();
});

gulp.task('icons_viewer', async function(done) {
	await createIconsPage();

	done();

});

gulp.task('test', async function() {

	console.log("asdfiae8ofh");

});

gulp.task("workers", async function(done){

	for(let workerName of Object.keys(workers)){

		gulp.src(workers[workerName])
			.pipe(concat(`${workerName}.js`))
			.pipe(gulp.dest('build/potree/workers'));
	}

	gulp.src('./libs/copc/laz-perf.wasm')
		.pipe(gulp.dest('./build/potree/workers'));

	done();
});

gulp.task("lazylibs", async function(done){

	for(let libname of Object.keys(lazyLibs)){

		const libpath = lazyLibs[libname];

		gulp.src([`${libpath}/**/*`])
			.pipe(gulp.dest(`build/potree/lazylibs/${libname}`));
	}

	done();
});

gulp.task("shaders", async function(){

	const components = [
		"let Shaders = {};"
	];

	for(let file of shaders){
		const filename = path.basename(file);

		const content = await fsp.readFile(file);

		const prep = `Shaders["${filename}"] = \`${content}\``;

		components.push(prep);
	}

	components.push("export {Shaders};");

	const content = components.join("\n\n");

	const targetPath = `./build/shaders/shaders.js`;

	if(!fs.existsSync("build/shaders")){
		fs.mkdirSync("build/shaders");
	}
	fs.writeFileSync(targetPath, content, {flag: "w"});
});

gulp.task('build', 
	gulp.series(
		gulp.parallel("workers", "lazylibs", "shaders", "icons_viewer", "examples_page"),
		async function(done){
			gulp.src(paths.html).pipe(gulp.dest('build/potree'));

			gulp.src(paths.resources).pipe(gulp.dest('build/potree/resources'));

			gulp.src(["LICENSE"]).pipe(gulp.dest('build/potree'));

			done();
		}
	)
);

gulp.task("pack", async function(){
	exec('rollup -c', function (err, stdout, stderr) {
		console.log(stdout);
		console.log(stderr);
	});
});

gulp.task('watch', gulp.parallel("build", "pack", "webserver", async function() {

	let watchlist = [
		'src/**/*.js',
		'src/**/**/*.js',
		'src/**/*.css',
		'src/**/*.html',
		'src/**/*.vs',
		'src/**/*.fs',
		'resources/**/*',
		'examples//**/*.json',
		'!resources/icons/index.html',
	];

	watch(watchlist, gulp.series("build", "pack"));

}));


