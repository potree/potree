'use strict';
const path = require('path');
const gulp = require('gulp');
const size = require('gulp-size');
const gutil = require('gulp-util');
const browserSync = require('browser-sync');
const reload = browserSync.reload;
const connect = require('gulp-connect');
const del = require('del');
const through = require('through');

{
	const browserify = require('browserify');
	const uglifyify = require('uglifyify');
	const watchify = require('watchify');
	const source = require('vinyl-source-stream');
	const browserifyShader = require('browserify-shader');
	const rename = require('gulp-rename');

	const SCRIPTS = {
		main: {source: 'src/index.js', target: 'build/potree/potree.js', args: {standalone: 'Potree'}},
		bin: {source: 'src/workers/BinaryDecoderWorker.js', target: 'build/potree/workers/BinaryDecoderWorker.js'},
		dem: {source: 'src/workers/DEMWorker.js', target: 'build/potree/workers/DEMWorker.js'},
		gre: {source: 'src/workers/GreyhoundBinaryDecoderWorker.js', target: 'build/potree/workers/GreyhoundBinaryDecoderWorker.js'},
		las: {source: 'src/workers/LASDecoderWorker.js', target: 'build/potree/workers/LASDecoderWorker.js'},
		laz: {source: 'libs/plasio/workers/laz-loader-worker.js', target: 'build/potree/workers/LASLAZWorker.js'}
	};

	function createArgs (script, isMin) {
		return Object.assign({
			entries: script.source,
			noParse: [
 				// laz-perf has been generated, is huge and supports Node.js optionally. Better to leave it as-is.
				path.join(__dirname, 'libs/plasio/workers/laz-perf.js')
			],
			transform: [browserifyShader],
			cache: {},
			debug: !isMin
		}, script.args || {})
	}

	Object.keys(SCRIPTS).forEach((key) => {
		const script = SCRIPTS[key];
		script.source = path.join(__dirname, script.source);
		script.target = path.join(__dirname, script.target);
		const b = browserify(createArgs(script, false));
		const bMin = browserify(createArgs(script, true))
			.transform(uglifyify, {global: true});
		const bundle = (b, isMin) => b
			.bundle()
			.pipe(source(path.basename(script.target)))
			.pipe(rename(path => {
				if (isMin) {
					path.basename += '.min';
				}
			}))
			.pipe(gulp.dest(path.dirname(script.target)))
			.pipe(reload({stream: true}))
			.pipe(through(file => gutil.log(`Finished writing ${file.path}`)));

		gulp.task(`script:${key}`, bundle.bind(null, b, false));
		gulp.task(`min:script:${key}`, bundle.bind(null, bMin, true));
		gulp.task(`watch:script:${key}`, () => {
			const w = watchify(b)
			w.on('update', bundle); // on any dep update, runs the bundler
			w.on('log', gutil.log); // output build logs to terminal
			w.on('error', gutil.log.bind(gutil, 'Browserify Error'))

			return bundle(b);
		});
	});

	gulp.task('script:*', Object.keys(SCRIPTS).map(key => `script:${key}`));
	gulp.task('min:script:*', Object.keys(SCRIPTS).map(key => `min:script:${key}`))
	gulp.task('watch:script:*', Object.keys(SCRIPTS).map(key => `watch:script:${key}`));
}

{
	const COPY = {
		resources: {source: 'resources/**/*', target: 'build/potree/resources'},
		license: {source: 'LICENSE', target: 'build/potree'},
		extra: {source: 'src/viewer/{potree.css,profile.html,sidebar.html}', target: 'build/potree'}
	};
	const mappings = {};
	Object.keys(COPY).forEach((key) => {
		const copy = COPY[key];
		gulp.task(`copy:${key}`, () => gulp
			.src(path.join(__dirname, copy.source))
			.pipe(through(function (file) {
				mappings[file.path] = path.join(__dirname, copy.target, file.relative);
				this.queue(file);
			}))
			.pipe(gulp.dest(path.join(__dirname, copy.target)))
			.pipe(reload({stream: true})));
		gulp.task(`watch:copy:${key}`, [`copy:${key}`], () => gulp.watch(copy.source, [`copy:${key}`])
			.on('change', (event) => {
				if (event.type === 'deleted') {
					const targetPath = mappings[event.path];
					if (targetPath) {
						delete mappings[event.path];
						gutil.log(`Deleting ${targetPath}`);
						del.sync(targetPath);
					}
				}
			})
		);
	});
	gulp.task('copy:*', Object.keys(COPY).map(key => `copy:${key}`));
	gulp.task('watch:copy:*', Object.keys(COPY).map(key => `watch:copy:${key}`));
}

gulp.task('clean', () => del(path.join(__dirname, 'build')));
gulp.task('clean+build', ['clean'], () => gulp.run('build'));
gulp.task('build', ['script:*', 'copy:*']);
gulp.task('release', ['clean'], () => gulp.run('build', 'min:script:*'));
gulp.task('watch:*', ['watch:script:*', 'watch:copy:*']);

// For development, it is now possible to use 'gulp webserver'
// from the command line to start the server (default port is 8080)
gulp.task('webserver', () => connect.server());
gulp.task('watch+webserver', ['watch:*', 'webserver']);

// Liveserver will automatically update once resources change.
const liveServer = () => {
	browserSync.bind(null, {
		port: 8080,
		server: {
			baseDir: __dirname,
			directory: true
		}
	});
};
gulp.task('liveserver', liveServer);
gulp.task('watch+liveserver', ['watch:*'], liveServer);
