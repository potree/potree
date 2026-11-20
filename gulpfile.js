
const path = require('path');
const gulp = require('gulp');
const {spawnSync} = require('child_process');

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
	const {stdout, stderr} = spawnSync('rollup -c', {encoding: 'utf8', shell: true});
	console.log(stdout);
	console.log(stderr);
});

function getDistVersion(){
	const packageJsonVersion = require('./package.json').version;
	const envVersion = process.env.POTREE_DIST_VERSION;
	let gitTagVersion = null;

	try {
		// Use the version tag on the current commit (wihtout the "v" prefix), if available
		const {stdout, status} = spawnSync('git describe --tags --exact-match', {encoding: 'utf8', shell: true});
		if (status == 0) {
			gitTagVersion = stdout.trim().replace(/^v/, '');
		}

	} catch (e) {}

	return {packageJsonVersion, envVersion, gitTagVersion};
}

// Create the source for the "potree-dist" package in "build/dist",
// with the same layout as the original GitHub release ZIP.
// The README and LICENSE get copied from the base repo,
// and "package.json" gets generated.
gulp.task('dist', gulp.series(
	'build',
	'pack',
	async function(done){
		const {packageJsonVersion, envVersion, gitTagVersion} = getDistVersion();
		if ((gitTagVersion && gitTagVersion != packageJsonVersion) || (envVersion && envVersion != packageJsonVersion)) {
			console.log(
				`Several set sources for the version disagree with each other:
				environment: ${envVersion || "unset"}
				git tag: ${gitTagVersion || "unset"}
				package.json: ${packageJsonVersion}`
			);
			done(new Error("The version number sources disagree"));
			return
		}
    const version = envVersion || gitTagVersion || packageJsonVersion;

		const distDir = 'build/dist';
		fs.rmSync(distDir, {recursive: true, force: true});
		fs.mkdirSync(distDir, {recursive: true});

		fs.cpSync('build/potree', path.join(distDir, 'build/potree'), {recursive: true});
		fs.cpSync('libs', path.join(distDir, 'libs'), {recursive: true});

		fs.copyFileSync('LICENSE', path.join(distDir, 'LICENSE'));
		fs.copyFileSync('README.md', path.join(distDir, 'README.md'));

		const pkg = {
			name: '@potree/potree-dist',
			publishConfig: {access: 'public'},
			version: version,
			description: 'Prebuilt Potree WebGL point cloud viewer.',
			keywords: ['point', 'cloud', 'pointcloud', 'octree', 'entwine', 'viewer', 'threejs', 'webgl', 'browser', 'tool'],
			main: './build/potree/potree.js',
			license: 'BSD-2-CLAUSE',
			repository: {type: 'git', url: 'git+https://github.com/potree/potree.git'},
			author: 'Markus Schütz',
			files: ['build', 'libs', 'LICENSE', 'README.md'],
			scripts: {},
		};

		fs.writeFileSync(path.join(distDir, 'package.json'), JSON.stringify(pkg, null, '\t') + '\n');

		done();
	}
));

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


