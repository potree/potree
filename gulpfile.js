
const path = require('path');
const gulp = require('gulp');
const exec = require('child_process').exec;


const fs = require("fs");
const fsp = fs.promises;
const concat = require('gulp-concat');
//const gutil = require('gulp-util');
//const through = require('through');
//const File = gutil.File;
const connect = require('gulp-connect');
//const watch = require('glob-watcher');
const {watch} = gulp;


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
		"src/workers/EptLaszipDecoderWorker.js"
	],
	"EptBinaryDecoderWorker": [
		"src/workers/EptBinaryDecoderWorker.js"
	],
	"EptZstandardDecoderWorker": [
		"src/workers/EptZstandardDecoderWorker.js"
	],
	"GreyhoundBinaryDecoderWorker": [
		"libs/plasio/workers/laz-perf.js",
		"src/workers/GreyhoundBinaryDecoderWorker.js",
		"src/Version.js",
		"src/loader/PointAttributes.js",
		"src/InterleavedBuffer.js",
		"src/utils/toInterleavedBufferAttribute.js",
	]
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
	server = connect.server({port: 1234});
}));

gulp.task('examples_page', async function(done) {

	let settings = JSON.parse(fs.readFileSync("examples/page.json", 'utf8'));
	let files = fs.readdirSync("./examples");

	let unhandledCode = ``;
	let exampleCode = ``;
	let showcaseCode = ``;
	let thirdpartyCode = ``;

	{
		let urls = settings.examples.map(e => e.url);
		let unhandled = [];
		for(let file of files){
			let isHandled = false;
			for(let url of urls){

				if(file.indexOf(url) !== -1){
					isHandled = true;
				}
			}

			if(!isHandled){
				unhandled.push(file);
			}
		}
		unhandled = unhandled
			.filter(file => file.indexOf(".html") > 0)
			.filter(file => file !== "page.html");


		for(let file of unhandled){
			unhandledCode += `
				<a href="${file}" class="unhandled">${file}</a>
			`;
		}
	}

	for(let example of settings.examples){
		exampleCode += `
		<a href="${example.url}" target="_blank" style="display: inline-block">
			<div class="thumb" style="background-image: url('${example.thumb}'); ">
				<div class="thumb-label">${example.label}</div>
			</div>
		</a>
		`;
	}

	for(let showcaseItem of settings.showcase){
		showcaseCode += `<a href="${showcaseItem.url}" target="_blank" style="display: inline-block">
			<div class="thumb" style="background-image: url('${showcaseItem.thumb}'); ">
				<div class="thumb-label">${showcaseItem.label}</div>
			</div>
		</a>
		`;
	}

	for(let item of settings.thirdparty){
		thirdpartyCode += `<a href="${item.url}" target="_blank" style="display: inline-block">
			<div class="thumb" style="background-image: url('${item.thumb}'); ">
				<div class="thumb-label">${item.label}</div>
			</div>
		</a>
		`;
	}


	let page = `
		<html>
			<head>
			<style>

			body{
				background: #ECE9E9;
				padding: 30px;
			}

			.thumb{
				background-size: 140px 140px;
				width: 140px;
				height: 140px;
				border-radius: 5px;
				border: 1px solid black;
				box-shadow: 3px 3px 3px 0px #555;
				margin: 0px;
				float: left;
			}

			.thumb-label{
				font-size: large;
				text-align: center;
				font-weight: bold;
				color: #FFF;
				text-shadow:black 0 0 5px, black 0 0 5px, black 0 0 5px, black 0 0 5px, black 0 0 5px, black 0 0 5px;
				height: 100%;
			}

			.unhandled_container{
				max-width: 1200px;
				margin: auto;
				margin-top: 50px;

			}

			.unhandled{
				width: 30%;
				padding-top:8px;
				padding-bottom:8px;
				padding-left: 10px;
				float:left;
				font-family: "Helvetica Neue", "Lucida Grande", Arial;
				font-size: 13px;
				border: 1px solid rgba(0, 0, 0, 0);

			}

			.unhandled:hover{
				border: 1px solid rgba(200, 200, 200, 1);
				border-radius: 4px;
				background: white;
			}

			a{
				color: #555555;
			}

			h1{
				font-weight: 500;
				color: rgb(51, 51, 51);
				font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
			}

			#samples_container{
				display: grid;
				grid-template-columns: 70% 30%;
				grid-gap: 10px;
				grid-template-rows: auto auto;

				max-width: 1300px;
				margin: auto;
			}


			#thumb_container{
				grid-column-start: 1;
				grid-column-end: 1;
				grid-row-start: 1;
				grid-row-end: 1;

				max-width: 1200px;
				margin: auto;
				margin-top: 20px
			}

			#external_container{
				grid-column-start: 2;
				grid-column-end: 2;
				grid-row-start: 1;
				grid-row-end: span 2;

				margin-top: 20px
			}

			#showcase_container{
				grid-column-start: 1;
				grid-column-end: 1;
				grid-row-start: 2;
				grid-row-end: 2;

				max-width: 1200px;
				margin: auto;
				margin-top: 20px;
			}

			</style>
			</head>
			<body>

				<div id="samples_container">

					<div id="thumb_container">
						<h1>Examples</h1>
						${exampleCode}
					</div>

					<div id="showcase_container">
						<h1>Showcase</h1>
						${showcaseCode}
					</div>

					<div id="external_container">
						<h1>Third Party</h1>
						${thirdpartyCode}
					</div>

				</div>



				<div class="unhandled_container">
					<h1>Other</h1>
					${unhandledCode}
				</div>

			</body>
		</html>
	`;

	fs.writeFile(`examples/page.html`, page, (err) => {
		if(err){
			console.log(err);
		}else{
			console.log(`created examples/page.html`);
		}
	});

	done();

});

gulp.task('icons_viewer', async function(done) {
	let iconsPath = "resources/icons";

	fs.readdir(iconsPath, function(err, items) {

		let svgs = items.filter(item => item.endsWith(".svg"));
		let other = items.filter(item => !item.endsWith(".svg"));

		items = [...svgs, ...other];

		let iconsCode = ``;
		for(let item of items){
			let extension = path.extname(item);
			if(![".png", ".svg", ".jpg", ".jpeg"].includes(extension)){
				continue;
			}

			let iconCode = `
			<span class="icon_container" style="position: relative; float: left">
				<center>
				<img src="${item}" style="height: 32px;"/>
				<div style="font-weight: bold">${item}</div>
				</center>
			</span>
			`;

			//iconsCode += `<img src="${item}" />\n`;
			iconsCode += iconCode;
		}

		let page = `
			<html>
				<head>
					<style>
						.icon_container{
							border: 1px solid black;
							margin: 10px;
							padding: 10px;
						}
					</style>
				</head>
				<body>
					<div id="icons_container">
						${iconsCode}
					</div>
				</body>
			</html>
		`;

		fs.writeFile(`${iconsPath}/index.html`, page, (err) => {
			if(err){
				console.log(err);
			}else{
				console.log(`created ${iconsPath}/index.html`);
			}
		});

	});

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
		gulp.parallel("workers", "shaders", "icons_viewer", "examples_page"),
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


