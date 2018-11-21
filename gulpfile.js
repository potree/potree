
const path = require('path');
const gulp = require('gulp');
const exec = require('child_process').exec;


const fs = require("fs");
const concat = require('gulp-concat');
const gutil = require('gulp-util');
const through = require('through');
const File = gutil.File;
const connect = require('gulp-connect');
const watch = require('glob-watcher');


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

	"src/materials/shaders/pointcloud.gl2.vs",
	"src/materials/shaders/pointcloud.gl2.fs",
];


gulp.task("workers", function(){

	for(let workerName of Object.keys(workers)){
		
		gulp.src(workers[workerName])
			.pipe(concat(`${workerName}.js`))
			.pipe(gulp.dest('build/potree/workers'));
		
	}

});

gulp.task("shaders", function(){
	return gulp.src(shaders)
		.pipe(encodeShader('shaders.js', "Potree.Shader"))
		.pipe(gulp.dest('build/shaders'));
});

gulp.task("build", ['workers','shaders', "icons_viewer", "examples_page"], function(){

	gulp.src(paths.html)
		.pipe(gulp.dest('build/potree'));

	gulp.src(paths.resources)
		.pipe(gulp.dest('build/potree/resources'));

	gulp.src(["LICENSE"])
		.pipe(gulp.dest('build/potree'));

	return;
});

// For development, it is now possible to use 'gulp webserver'
// from the command line to start the server (default port is 8080)
gulp.task('webserver', function() {
	server = connect.server({port: 1234});
});

gulp.task('examples_page', function() {

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



});

gulp.task('icons_viewer', function() {
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

});

gulp.task('watch', ["build", "webserver"], function() {
	//gulp.run("build");

	exec('rollup -c', function (err, stdout, stderr) {
		console.log(stdout);
		console.log(stderr);
	});

	//gulp.run("webserver");

	let watchlist = [
		'src/**/*.js', 
		'src/**/*.css', 
		'src/**/*.html', 
		'src/**/*.vs', 
		'src/**/*.fs', 
		'resources/**/*',
		'examples//**/*.json',
	];

	let blacklist = [
		'resources/icons/index.html'
	];
	
	let watcher = watch(watchlist, cb => {

		{ // abort if blacklisted
			let file = cb.path.replace(/\\/g, "/");
			let isOnBlacklist = blacklist.some(blacklisted => file.indexOf(blacklisted) >= 0);
			if(isOnBlacklist){
				return;
			}
		}

		console.log("===============================");
		console.log("watch event:");
		console.log(cb);
		gulp.run("build");

		exec('rollup -c', function (err, stdout, stderr) {
			console.log(stdout);
			console.log(stderr);
			//cb(err);
		});
	});

});


let encodeWorker = function(fileName, opt){
	if (!fileName) throw new PluginError('gulp-concat',  'Missing fileName option for gulp-concat');
	if (!opt) opt = {};
	if (!opt.newLine) opt.newLine = gutil.linefeed;

	let buffer = [];
	let firstFile = null;

	function bufferContents(file){
		if (file.isNull()) return; // ignore
		if (file.isStream()) return this.emit('error', new PluginError('gulp-concat',  'Streaming not supported'));

		if (!firstFile) firstFile = file;

		let string = file.contents.toString('utf8');
		buffer.push(string);
	}

	function endStream(){
		if (buffer.length === 0) return this.emit('end');

		let joinedContents = buffer.join("");
		let content = joinedContents;

		let joinedPath = path.join(firstFile.base, fileName);

		let joinedFile = new File({
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

let encodeShader = function(fileName, varname, opt){
	if (!fileName) throw new PluginError('gulp-concat',  'Missing fileName option for gulp-concat');
	if (!opt) opt = {};
	if (!opt.newLine) opt.newLine = gutil.linefeed;

	let buffer = [];
	let files = [];
	let firstFile = null;

	function bufferContents(file){
		if (file.isNull()) return; // ignore
		if (file.isStream()) return this.emit('error', new PluginError('gulp-concat',  'Streaming not supported'));

		if (!firstFile) firstFile = file;

		let string = file.contents.toString('utf8');
		buffer.push(string);
		files.push(file);
	}

	function endStream(){
		if (buffer.length === 0) return this.emit('end');

		let joinedContent = `let Shaders = {};\n\n`;
		for(let i = 0; i < buffer.length; i++){
			let b = buffer[i];
			let file = files[i];

			let fname = file.path.replace(file.base, "");
			//console.log(fname);

			let content = new Buffer(b).toString();
			
			let prep = `\Shaders["${fname}"] = \`${content}\`\n`;

			joinedContent += prep;
		}

		joinedContent += "\nexport {Shaders};";

		let joinedPath = path.join(firstFile.base, fileName);

		let joinedFile = new File({
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
