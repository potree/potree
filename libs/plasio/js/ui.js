// ui.js
// All UI stuff goes here
//

var Promise = require("bluebird"),
	$ = require('jquery'),
	render = require("./render"),
	laslaz = require('./laslaz'),
	React = require('react'),
	_ = require('lodash');

	require("jqueryui");
	require("jquery-layout");
	require("jquery-nouislider");
	require("bootstrap");

(function(scope) {
	"use strict";

	function ColormapRange(canvasElement) {
		this.img = null;
		this.range = [0.0, 1.0];
		this.canvas = $(canvasElement);

		console.log('Drawing');
		this._refresh();

		var o = this;
		$(scope).on('broadcast.resize resize', function(e) {
			console.log('Canvas resized');
			o._refresh();
		});
	}

	ColormapRange.prototype.setImage = function(img, cb) {
		this.img = new Image(256, 1);
		this.img.src = img;

		var o = this;
		this.img.onload = function() {
			o._refresh();
			if (cb) cb(); // since this is a delayed function, we may to trigger re-draw
		};
	};

	ColormapRange.prototype.setRange = function(n, x) {
		this.range = [n, x];
		this._refresh();
	};

	ColormapRange.prototype._refresh = function() {
		// refresh all the things
		var w = this.canvas.width(),
			h = this.canvas.height();

		var domCanvas = this.canvas.get(0);

		domCanvas.width = w;
		domCanvas.height = h;

		console.log(w, h);
		var ctx = domCanvas.getContext('2d');

		// first clear background
		//
		ctx.fillStyle = "#fff";
		ctx.fillRect(0, 0, w, h);

		// Draw image if need be
		if (this.img) {
			// Draw first column
			var f1 = Math.floor(this.range[0] * w);
			var f2 = Math.floor(this.range[1] * w);

			console.log(this.img.width, this.img.height);

			console.log(f1, f2);

			var y = 0,
				yh = h;

			// first band
			ctx.drawImage(this.img, 0, 0, 1, 1, 0, y, f1, yh);
			// second band
			ctx.drawImage(this.img, 1, 0, this.img.width-2, 1, f1, y, f2 - f1, yh);
			// third band
			ctx.drawImage(this.img, this.img.width-1, 0, 1, 1, f2, y, w - f2, yh);
		}
	};

	var colormapRange = new ColormapRange(document.getElementById('colorCanvasObject'));

	var withRefresh = function(f) {
		// return f wrapped around with a call to renderer.needRefresh
		return function() {
			var r = f.apply(this, arguments);
			$.event.trigger({
				type: 'plasio.renderer.needRefresh'
			});

			return r;
		};
	};

	// convert from array like object to an array
	var toArray = function(m) {
		var a = [];
		for (var i = 0, il = m.length ; i < il ; i ++) {
			a.push(m[i]);
		}
		return a;
	};



	// some globals we need
	//
	var fileLoadInProgress = false;
	var allBatches = []; // all the loaded batches

	// Start UI
	$(document).on("plasio.startUI", function() {
		var layout = $("body").layout({
			applyDefaultStyles: true,
			east: {
				resizable: true,
				resize: true,
				togglerContent_open:   "&#8250;",
				togglerContent_closed: "&#8249;",
				minSize: 200,
				maxSize: 600,
				size: 400
			},

			onresize: function() {
				render.doRenderResize();
				$.event.trigger({
					type: 'broadcast.resize'
				});
			}});


		// TODO: Evaluate if its a good idea to have plane based projection
		setupKeyboardHooks();
		setupProgressHandlers();
		setupFileOpenHandlers();
		setupSliders();
		setupComboBoxActions();
		setupCameraActions();
		setupNaclErrorHandler();
		setupWebGLStateErrorHandler();
		setupDragHandlers();
		makePanelsSlidable();
		setupLoadHandlers();
		setupProjectionHandlers();
		setupMensurationHandlers();
		setupScaleObjectsHandlers();
		setupRegionHandlers();
		setupDocHandlers();


		// get the currently selected image
		var imgElement = $("#colorSwatches a:first img");
		colormapRange.setImage(imgElement.attr("src"));
	});

	// some progress events arrive after hideProgress since certain operations are not
	// completely cancellable.
	//
	var setupProgressHandlers = function() {
		var inProgress = false;
		var startProgress = function() {
			$("#progressBar").width('0%').show();
			inProgress = true;
		};

		var showProgress = function(percent, msg) {
			if (inProgress) {
				console.log('showing progress', percent);
				$("#progressBar").width(Math.round(percent) + '%');

				if (msg)
					$("#loadingStatus").html(msg);
			}
		};

		var hideProgress = function() {
			$("#progressBar").hide();
			$("#loadingStatus").html("");

			inProgress = false;
		};

		$(document).on('plasio.progress.start', startProgress);
		$(document).on('plasio.progress.progress', function(d) {
			showProgress(d.percent, d.message);
		});
		$(document).on('plasio.progress.end', hideProgress);
	};

	var numberWithCommas = function(x) {
		return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	};

	var getBinary = function(url, cb) {
		var oReq = new XMLHttpRequest();
		return new Promise(function(resolve, reject) {
			oReq.open("GET", url, true);
			oReq.responseType = "arraybuffer";

			oReq.onprogress = function(e) {
				cb(e.loaded / e.total);
			};

			oReq.onload = function(oEvent) {
				if (oReq.status == 200) {
					console.log(oReq.getAllResponseHeaders());
					return resolve(oReq.response);
				}
				reject(new Error("Could not get binary data"));
			};

			oReq.onerror = function(err) {
				reject(err);
			};

			oReq.send();
		}).cancellable().catch(Promise.CancellationError, function(e) {
			oReq.abort();
			throw e;
		});
	};

	var getBinaryLocal = function(file, cb) {
		var fr = new FileReader();
		var p = Promise.defer();

		fr.onprogress = function(e) {
			cb(e.loaded / e.total);
		};
		fr.onload = function(e) {
			p.resolve(e.target.result);
		};

		fr.readAsArrayBuffer(file);

		return p.promise.cancellable().catch(Promise.CancellationError, function(e) {
			fr.abort();
			throw e;
		});
	};

	var loadFileInformation = function(header) {
		$(".props table").html(
			"<tr><td>Name</td><td>" + header.name + "</td></tr>" +
			"<tr><td>File Version</td><td>" + header.versionAsString + "</td></tr>" +
			"<tr><td>Compressed?</td><td>" + (header.isCompressed ? "Yes" : "No") + "</td></tr>" +
			//"<tr><td>Color?</td><td>" + (batcherHasColor ? "Yes" : "No") + "</td></tr>" +
			//"<tr><td>Intensity?</td><td>" + (batcherHasIntensity ? "Yes" : "No") + "</td></tr>" +
			"<tr><td>Total Points</td><td>" + numberWithCommas(header.pointsCount) + " (" +
			numberWithCommas(header.totalRead) + ") " + "</td></tr>" +
			"<tr><td>Point Format ID</td><td>" + header.pointsFormatId + "</td></tr>" +
			"<tr><td>Point Record Size</td><td>" + header.pointsStructSize + "</td></tr>").show();
	};

	var setupLoadHandlers = function() {
		// setup handlers which listens for notifications on how to do things
		//
		// Actions to trigger file loading
		//
		$(document).on("plasio.loadfiles.local", function(e) {
			cancellableLoad(getBinaryLocal, e.files, e.name);
		});

		$(document).on("plasio.loadfiles.remote", function(e) {
			cancellableLoad(getBinary, [e.url], e.name);
		});

		$(document).on("plasio.load.started", function() {
			scope.stopAllPlayback();
			$.event.trigger({
				type: 'plasio.progress.start'
			});

			$.event.trigger({
				type: 'plasio.progress.progress',
				percent: 0
			});

			$("#loadError").html("").hide();
			$("#browse button").attr("disabled", true);
			$("#browse").hide();
			$("#browseCancel").show();

			fileLoadInProgress = true;
		});

		$(document).on("plasio.load.progress", function(e) {
			$.event.trigger({
				type: 'plasio.progress.progress',
				percent: e.percent,
				message: e.message
			});
		});

		var cleanup = function() {
			$.event.trigger({
				type: 'plasio.progress.end'
			});

			$("#browseCancel").hide();
			$("#browse button").attr("disabled", false);
			$("#browse").show();
			fileLoadInProgress = false;
		};

		var getScaleFromUser = function() {
			var p = Promise.defer();
			var $modal = $("#scalesPage");

			$modal.modal();
			$modal.on('hidden.bs.modal', function (e) {
				var chosen = $modal.attr("data-selection");
				var proj = null;
				switch(chosen) {
					case "0": proj = new THREE.Vector3(1, 1, 1); break;
					case "1": proj = new THREE.Vector3(111000, 111000, 1); break;
					case "2": proj = new THREE.Vector3(111000, 111000, 3.28084); break;
				}

				return p.resolve(proj);
			});

			return p.promise;
		};

		$(document).on("plasio.load.completed", function(e) {
			console.log(e.batches);

			console.log('Loaded batches:', e.batches);
			var batcherHasColor = false,
				batcherHasIntensity = false,
				batcherInSmallRange = false;

			for (var i = 0, il = e.batches.length ; i < il; i ++) {
				var batcher = e.batches[i].batcher;

				batcherHasColor = batcherHasColor ||
					(batcher.cx.r - batcher.cn.r) > 0.0 ||
					(batcher.cx.g - batcher.cn.g) > 0.0 ||
					(batcher.cx.b - batcher.cn.b) > 0.0;

				batcherHasIntensity = batcherHasIntensity ||
					(batcher.in_x - batcher.in_y) > 0.0;

				batcherInSmallRange = batcherInSmallRange ||
					(batcher.mn.x > -180.0 && batcher.mx.x < 180.0) &&
					(batcher.mn.y > -180.0 && batcher.mx.y < 180.0);
			}

			console.log('Has color:', batcherHasColor);
			console.log('Has intensity:', batcherHasIntensity);
			console.log('Has in range:', batcherInSmallRange);

			var p = batcherInSmallRange ? getScaleFromUser() : Promise.resolve(new THREE.Vector3(1, 1, 1));

			p.then(function(scale) {
				// load the batcher
				//
				var maxColorComponent = 0.0;

				var b = [];
				for (var i = 0, il = e.batches.length ; i < il ; i ++) {
					var batcher = e.batches[i].batcher;
					var header = e.batches[i].header;

					console.log('Loading batch:', batcher);
					maxColorComponent = Math.max(maxColorComponent,
												 batcher.cx.r, batcher.cx.g, batcher.cx.b);
					batcher.scale = scale;
					b.push({
						batcher: batcher,
						header: header
					});
				}

				allBatches = b;
				if (batcherHasColor && batcherHasIntensity) {
					// enable both intensity and color, and set blend to 50
					$("#rgb").trigger("click");
					$("#intensity").trigger("click");
					$("#blending").val(50, true);
				}
				else if (batcherHasColor && !batcherHasIntensity) {
					$("#rgb").trigger("click");
					$("#blending").val(0, true);
				}
				else if (!batcherHasColor && batcherHasIntensity) {
					$("#intensity").click();
					$("#blending").val(100, true);
				}
				else {
					// no color, no intensity
					$(".default-if-no-color").trigger("click");
					$("#blending").val(0, true);
				}

				console.log('Max color component', maxColorComponent);

				$.event.trigger({
					type: "plasio.maxColorComponent",
					maxColorComponent: maxColorComponent
				});

				$.event.trigger({
					type: "plasio.mensuration.pointsReset"
				});

				$.event.trigger({
					type: "plasio.scalegeoms.reset"
				});

				$.event.trigger({
					type: "plasio.regions.reset"
				});

				$.event.trigger({
					type: "plasio.newBatches"
				});
			}).finally(cleanup);
		});

		$(document).on("plasio.load.cancelled", function(e) {
			$("#loadError").html(
				'<div class="alert alert-info alert-dismissable">' +
				'<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
				'The file load operation was cancelled' +
				'</div>').show();

			console.log("Operation cancelled!!");
			cleanup();
		});

		$(document).on("plasio.load.failed", function(e) {
			$("#loadError").html(
				'<div class="alert alert-danger alert-dismissable">' +
				'<button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' +
				'<strong>Error!</strong> ' + e.error +
				'</div>').show();

			cleanup();
		});
	};
	

	var loadData = function(buffer, progressCB) {
		var lf = new laslaz.LASFile(buffer);

		return Promise.resolve(lf).cancellable().then(function(lf) {
			return lf.open().then(function() {
				lf.isOpen = true;
				return lf;
			})
			.catch(Promise.CancellationError, function(e) {
				// open message was sent at this point, but then handler was not called
				// because the operation was cancelled, explicitly close the file
				return lf.close().then(function() {
					throw e;
				});
			});
		}).then(function(lf) {
			console.log("getting header");
			return lf.getHeader().then(function(h) {
				console.log("got header", h);
				return [lf, h];
			});
		}).then(function(v) {
			var lf = v[0];
			var header = v[1];

			var batcher = new render.ParticleSystemBatcher(
				$("#vertexshader").text(),
				$("#fragmentshader").text());

				var skip = Math.round((10 - currentLoadFidelity()));
				var totalRead = 0;
				var totalToRead = (skip <= 1 ? header.pointsCount : header.pointsCount / skip);
				var reader = function() {
					var p = lf.readData(1000000, 0, skip);
					return p.then(function(data) {
						console.log(header);
						batcher.push(new laslaz.LASDecoder(data.buffer,
														   header.pointsFormatId,
														   header.pointsStructSize,
														   data.count,
														   header.scale,
														   header.offset,
														   header.mins, header.maxs));

						totalRead += data.count;
						progressCB(totalRead / totalToRead);

						if (data.hasMoreData)
							return reader();
						else {

							header.totalRead = totalRead;
							header.versionAsString = lf.versionAsString;
							header.isCompressed = lf.isCompressed;
							return [lf, header, batcher];
						}
					});
				};

				// return the lead reader
				return reader();
		}).then(function(v) {
			var lf = v[0];
			// we're done loading this file
			//
			progressCB(1);

			// Close it
			return lf.close().then(function() {
				lf.isOpen = false;
				// Delay this a bit so that the user sees 100% completion
				//
				return Promise.delay(200).cancellable();
			}).then(function() {
				// trim off the first element (our LASFile which we don't really want to pass to the user)
				//
				return v.slice(1);
			});
		}).catch(Promise.CancellationError, function(e) {
			// If there was a cancellation, make sure the file is closed, if the file is open
			// close and then fail
			if (lf.isOpen) 
				return lf.close().then(function() {
					lf.isOpen = false;
					console.log("File was closed");
					throw e;
				});
			throw e;
		});
	};

	var setupFileOpenHandlers = function() {
		$("#browseCancel button").on("click", withRefresh(function() {
			$.event.trigger({
				type: "plasio.load.cancel"
			});
		}));

		$(".btn-file").on("click", function(e) {
			e.preventDefault();
			console.log("Doing shit!");
			console.log($("#filebrowser"));
			$("#filebrowser").click();
		});


		$(document).on('change', '#filebrowser', withRefresh(function(e) {
			e.preventDefault();

			console.log("Selected a file");

			var input = $(this);
			var files = input.get(0).files;

			$.event.trigger({
				type: "plasio.loadfiles.local",
				files: toArray(files),
				name: files.length === 1 ? files[0].name : 'Multiple Files'
			});
		}));

		$("#browse").on("click", "a", withRefresh(function(e) {
			e.preventDefault();

			var target = $(this).attr("href");

			// if we don't have LAZ available, we download the LAS version
			//
			console.log("Will load", target);

			var name = target.substring(target.lastIndexOf('/')+1);

			$.event.trigger({
				type: "plasio.loadfiles.remote",
				url: target,
				name: name
			});
		}));
	};

	var cancellableLoad = function(fDataLoader, files, name) {
		//  fDataLoader should be a function that when called returns a promise which
		//  can be cancelled, the fDataLoader should resolve to an array buffer of loaded file
		//  and should correctly handle cancel requets.
		//
		var progress = function(pc, msg) {
			console.log("progress: ", pc, msg);
			var obj = {
				type: "plasio.load.progress",
				percent: Math.round(pc * 100)
			};

			if (msg !== undefined) obj.message = msg;
			$.event.trigger(obj);
		};
		
		var loaderPromise = null;
		$(document).on("plasio.load.cancel", function() {
			if (loaderPromise === null) return;
			var a = loaderPromise;
			loaderPromise = null;

			progress(1, "Cancelling...");
			setTimeout(function() {
				a.cancel();
				console.log('Cancellation done!');
			}, 0);
		});

		$.event.trigger({
			type: "plasio.load.started"
		});

		progress(0, "Fetching " + name + "...");

		var currentLoadIndex = 0;
		var maxLoadIndex = files.length;

		var sofar = [];

		var pfuncDataLoad = function(p, msg) {
			progress((currentLoadIndex + p*0.5) / maxLoadIndex, msg);
		};

		var pfuncDecompress = function(p, msg) {
			progress((currentLoadIndex + 0.5 + p*0.5) / maxLoadIndex, msg);
		};

		var cur = Promise.resolve().cancellable();

		files.forEach(function(fname) {
			cur = cur.then(function() {
				return fDataLoader(fname, pfuncDataLoad).then(function(data) {
					console.log(fname.name, 'Done loading file, loading data...');
					return loadData(data, pfuncDecompress);
				})
				.then(function(r) {
					console.log(fname.name, 'Done loading data...');
					var ret = {
						header: r[0],
						batcher: r[1]
					};

					// TODO: This needs to be fixed for mutliple URLs
					//
					ret.header.name = fname.name || name;
					currentLoadIndex ++;
					sofar.push(ret);
				});
			});
		});

		loaderPromise = cur.then(function() {
			$.event.trigger({
				type: "plasio.load.completed",
				batches: sofar
			});
		})
		.catch(Promise.CancellationError, function(e) {
			console.log(e, e.stack);

			$.event.trigger({
				type: "plasio.load.cancelled",
			});
		})
		.catch(function(e) {
			console.log(e, e.stack);

			$.event.trigger({
				type: "plasio.load.failed",
				error: "Failed to load file"
			});
		})
		.finally(function() {
			progress(1);

			loaderPromise = null;
		});
	};

	var setupSliders = function() {
		// setup any react classes we may need
		//
		var InundationControls = React.createClass({
			getInitialState: function() {
				return { enabled: false,
						 slider: false,
						 opacity: 50,
						 value: 0};
			},

			componentDidMount: function() {
			},

			componentDidUpdate: function() {
				// if we have #inun, make it into a slider
				if (!this.state.slider) {
					var n = $("#inun").get(0);
					var m = $("#inun-opacity").get(0);

					var o = this;

					$(n).noUiSlider({
						range:[0, 1000],
						start: o.state.value,
						handles: 1,
						connect: "lower",
						slide: withRefresh(function() {
							$.event.trigger({
								type: 'plasio.inundationChanged'
							});

							o.setState({value: $(n).val()});
						})
					});

					$(m).noUiSlider({
						range:[0, 100],
						start: o.state.opacity,
						handles: 1,
						connect: "lower",
						slide: withRefresh(function() {
							$.event.trigger({
								type: 'plasio.inundationOpacityChanged'
							});

							o.setState({opacity: $(m).val()});
						})
					});

					o.setState({slider: true});
				}
			},

			render: function() {
				var classes = React.addons.classSet({
					'btn btn-block btn-sm': true,
					'btn-default': !this.state.enabled,
					'btn-success active': this.state.enabled
				});

				return React.DOM.div(null, [
					React.DOM.button({
						type: "button",
						className: classes,
						style: {marginBottom: '15px'},
						onClick: withRefresh(this.toggle),
					}, this.state.enabled ? "Disable" : "Enable"),
					this.state.enabled ? React.DOM.div({id: "inun"}) : null,
					this.state.enabled ? React.DOM.h5({className:"not-first"}, "Adjust opacity of inundation plane") : null,
					this.state.enabled ? React.DOM.div({id: "inun-opacity"}) : null
				]);
			},

			toggle: function() {
				var nextEnabled = !this.state.enabled;
				this.setState({enabled: nextEnabled,
							   slider: false});

				$.event.trigger({
					type: 'plasio.inundationEnable',
					enable: nextEnabled
				});
			}
		});

		// Mount any React components
		React.renderComponent(InundationControls(), $("#inun-container").get(0));

		// Setup UI sliders
		$("#loadFidelity").noUiSlider({
			range: [1, 9],
			start: 5,
			handles: 1,
			connect: "lower",
			step: 1
		});

		$("#fov").noUiSlider({
			range: [30, 110],
			start: 60,
			handles: 1,
			connect: "lower",
			slide: withRefresh(function() {
				$.event.trigger({
					type: 'plasio.cameraFOVChanged'
				});
			})
		});

		$("#intensity").noUiSlider({
			range: [0, 100],
			start: [0, 100],
			connect: true,
			slide: withRefresh(function() {
				$.event.trigger({
					type: 'plasio.intensityClampChanged'
				});
			})
		});

		var $pbfps = $("#playback-fps");
		var $pbr = $("#playback-rate");

		var currentPlaybackRate = function() {
			return ($pbr.val() - 6) * 5;
		};

		var handlePlaybackRateChange = function() {
			$pbfps.html(currentPlaybackRate() + "fps");
			$.event.trigger({
				type: 'plasio.playRateChanged'
			});
		};

		$pbr.noUiSlider({
			range: [0, 12],
			start: 6,
			handles: 1,
			step: 1,
			connect: false,
			slide: handlePlaybackRateChange,
		});

		$pbfps.html(currentPlaybackRate() + "fps");

		var setCurrentBatcher = function(index, resetCamera) {
			console.log('Setting active batcher at index:', index);

			var b = allBatches[index];
			render.loadBatcher(b.batcher, resetCamera);
			loadFileInformation(b.header);

			$.event.trigger({
				type: "plasio.needRefresh"
			});
		};

		var pbTimeout = null;
		var setBatchPlayAtRate = function(rate, sliderToUpdate) {
			console.log('Setting play rate at:', rate);
			if (pbTimeout !== null) {
				clearTimeout(pbTimeout);
				pbTimeout = 0;
			}
			
			if (rate === 0)
				return;

			if (!allBatches || allBatches.length === 0)
				return;

			var frames = [];
			for (var i = 0, il = allBatches.length ; i < il ; i ++) {
				frames.push(rate > 0 ? i : (il - i - 1));
			}

			var freq = 1000 / Math.abs(rate);
			var index = 0;

			var nextFrame = function() {
				var thisIndex = frames[index];
				setCurrentBatcher(thisIndex, false);
				if (sliderToUpdate !== undefined && sliderToUpdate.length > 0) {
					sliderToUpdate.val(thisIndex);
				}

				index ++;
				if (index > frames.length - 1)
					index = 0;

				pbTimeout = setTimeout(nextFrame, freq);
			};

			pbTimeout = setTimeout(nextFrame, freq);
		};

		var stopAllPlayback = function() {
			setBatchPlayAtRate(0);
			$pbr.val(6);
			$pbfps.html("0fps");
		};

		var $sliderToUpdate = null;
		$(document).on("plasio.newBatches", function() {
			// New batches have arrived, set the range accordingly on our slider and
			// set start to 0
			console.log('Got new batches!');

			var $h5 = $(".switch-inst");
			$h5.html("Some information about the loaded data.");
			$("#multi-files").html("");
			$(".auto-play").hide();


			if (allBatches.length > 1) {
				$("#multi-files").html("<div></div>");
				var $slider = $("#multi-files div");

				$h5.html("Use slider to switch between data sets and view their properties.");

				$sliderToUpdate = $slider;
				var correctedCG = allBatches[0].batcher.cg.clone();

				// renormlize all batchers with the given CG
				//
				allBatches.forEach(function(b) {
					b.batcher.normalizePositionsWithOffset(correctedCG);
				});

				// renormalization means that we use no offsets in our shaders
				$slider.noUiSlider({
					range: [0, allBatches.length - 1],
					start: 0,
					handles: 1,
					step: 1,
					slide: function() {
						stopAllPlayback();
						setCurrentBatcher(parseInt($slider.val()), false);
					},
				});

				$(".auto-play").show();

			}
			else {
				// still normalize stuff to our cg
				allBatches[0].batcher.normalizePositionsWithOffset(allBatches[0].batcher.cg);
			}

			setCurrentBatcher(0, true);
			$(".props").show();
		});

		$(document).on("plasio.playRateChanged", function() {
			setBatchPlayAtRate(currentPlaybackRate(), $sliderToUpdate);
		});

		var blendUpdate = function() {
			$.event.trigger({
				type: 'plasio.intensityBlendChanged'
			});
		};

		$("#blending").noUiSlider({
			range: [0, 100],
			start: 0,
			handles: 1,
			slide: withRefresh(blendUpdate),
			set: withRefresh(blendUpdate)
		});

		$("#pointsize").noUiSlider({
			range: [1, 15],
			start: 3,
			handles: 1,
			step: 1,
			slide: withRefresh(function() {
				$.event.trigger({
					type: 'plasio.pointSizeChanged'
				});
			})
		});

		var $colormapClamp = $("#colormapClamp");
		var currentColorClamp = function() {
			var val  = $("#colormapClamp").val();
			var n = parseInt(val[0]) / 100.0,
				x = parseInt(val[1]) / 100.0;

			return [n, x];
		};

		$("#colormapClamp").noUiSlider({
			range: [0, 100],
			start: [0, 100],
			handles: 2,
			connect: true,
			slide: withRefresh(function() {
				var r = currentColorClamp();
				colormapRange.setRange(r[0], r[1]);

				$.event.trigger({
					type: 'plasio.colorClampChanged'
				});
			})
		});

		scope.currentFOV = function() {
			return $("#fov").val();
		};

		scope.currentInundationLevel = function() {
			var $n = $("#inun");
			if ($n.length === 0)
				return 0.0;

			return $n.val();
		};

		scope.currentInundationOpacity = function() {
			var $n = $("#inun-opacity");
			if ($n.length === 0)
				return 0.0;

			return $n.val();
		};

		scope.currentLoadFidelity = function() {
			return $("#loadFidelity").val();
		};

		scope.currentIntensityClamp = function() {
			return $("#intensity").val();
		};

		scope.currentIntensityBlend = function() {
			return $("#blending").val();
		};

		scope.currentPointSize = function() {
			return $("#pointsize").val();
		};

		scope.currentColorClamp = currentColorClamp;
		scope.currentPlaybackRate = currentPlaybackRate;
		scope.stopAllPlayback = stopAllPlayback;
	};

	var setupComboBoxActions = function() {
		$("#colorsource").on("click", "a", withRefresh(function(e) {
			e.preventDefault();
			var $a = $(this);
			console.log($a);

			var option = $a.text();
			var target = $a.attr("href").substring(1);
			$("#colorsource").find("button")
				.html(option + "&nbsp;<span class='caret'></span>")
				.attr("target", target);

			$.event.trigger({
				type: "plasio.colorsourceChanged"
			});
		}));

		$("#intensitysource").on("click", "a", withRefresh(function(e) {
			e.preventDefault();
			var $a = $(this);
			console.log($a);

			var option = $a.text();
			var target = $a.attr("href").substring(1);
			$("#intensitysource").find("button")
				.html(option + "&nbsp;<span class='caret'></span>")
				.attr("target", target);

			$.event.trigger({
				type: "plasio.intensitysourceChanged"
			});
		}));


		var activeColorMap = "colormaps/blue-red.png";
		$("#colorSwatches").on("click", "a", function(e) {
			e.preventDefault();

			var $a = $(this);
			var $img = $a.find('img');
			var imgUrl = $img.attr('src');

			activeColorMap = imgUrl;
			colormapRange.setImage(imgUrl, withRefresh(function() {
				$.event.trigger({
					type: "plasio.colormapChanged"
				});
			}));
		});

		colormapRange.setImage(activeColorMap);

		scope.currentColorSource = function() {
			var source = $("#colorsource button").attr('target');
			return source;
		};

		scope.currentIntensitySource = function() {
			var source = $("#intensitysource button").attr('target');
			return source;
		};

		scope.currentColorMap = function() {
			return activeColorMap;
		};
	};

	var setupCameraActions = function() {
		$("#perspective").on("click", withRefresh(function() {
			$.event.trigger({
				type: 'plasio.camera.perspective'
			});
		}));

		$("#ortho").on("click", withRefresh(function() {
			$.event.trigger({
				type: 'plasio.camera.ortho'
			});
		}));

		$("#top-view").on("click", withRefresh(function() {
			$.event.trigger({
				type: 'plasio.camera.topView'
			});
		}));

		$("#camera-reset").on("click", withRefresh(function() {
			$.event.trigger({
				type: 'plasio.camera.reset'
			});
		}));
		
	};

	var setupNaclErrorHandler = function() {
		$(document).on("plasio.nacl.error", function(err) {
			console.log(err);
		});
	};

	var setupWebGLStateErrorHandler = function() {
		$(document).on("plasio.webglIsExperimental", function() {
			$("#webglinfo").html("<div class='alert alert-warning'>" +
								"<span class='glyphicon glyphicon-info-sign'></span>&nbsp;" +
								 "<strong>Experimental WebGL!</strong><br>" + 
								 "Your browser reports that its WebGL support is experimental." +
								 "  You may experience rendering problems.</div>");
			$("#webglinfo").show();
		});
	};

	var setupDragHandlers = function() {
		var ignore = function(e) {
			e.originalEvent.stopPropagation();
			e.originalEvent.preventDefault();
		};

		var dragEnter = function() {
			$(".drag-and-drop").show();
		};

		var dragLeave = function() {
			$(".drag-and-drop").hide();
		};

		var hideto = null;
		$("body").on("dragover", function(e) {
			ignore(e);

			// no drag drop indication when file load is in progress
			if (fileLoadInProgress)
				return;

			if (hideto === null)
				dragEnter();
			else
				clearTimeout(hideto);

			hideto = setTimeout(function() {
				dragLeave();
				hideto = null;
			}, 100);
		});

		$("body").on("dragenter", ignore);
		$("body").on("dragleave", ignore);

		$("body").on("drop", withRefresh(function(e) {
			ignore(e);
			if (fileLoadInProgress)
				return;

			var dt = e.originalEvent.dataTransfer;
			var droppedFiles = dt.files;

			$.event.trigger({
				type: "plasio.loadfiles.local",
				files: toArray(droppedFiles),
				name: (droppedFiles.length === 1? droppedFiles[0].name : "Multiple Files")
			});
		}));
	};

	var makePanelsSlidable = function() {
		var totalPanels = $(".section").length;
		var colors = _.times(totalPanels, function(i) {
			return "hsl(" + Math.floor((i + 1) * 360 / totalPanels) + ", 40%, 95%)";
		});

		$(".section").each(function(index, e) {
			var $e = $(e);
			$e.attr('target-bg-color', colors[index]);
			$e.find('.labeled-controls').css('background-color', colors[index]);
		});

		// find all panel headers and add make them into slidable widgets
		//
		$(".p-head")
			.addClass("clearfix p-collapse-open")
			.css("cursor", "pointer")
			.append("<div class='toggle-control'>" +
					"<span class='glyphicon glyphicon-chevron-up'></span></div>");
		$(".p-head h3").css("float", "left");

		$("body").on("click", ".p-head", function() {
			var $control = $(this);
			var isOpen = $control.hasClass("p-collapse-open");
			var $scroller = $control.next(".p-body");
			var $span = $control.find(".toggle-control span");
			var bgcolor = $control.closest('.section').attr('target-bg-color');
			if (isOpen)
				$scroller.slideUp(200, function() {
					$control
						.removeClass("p-collapse-open")
						.addClass("p-collapse-close")
						.css('background-color', bgcolor);

					$span.attr("class", "glyphicon glyphicon-chevron-down");
				});
			else {
				// when scrolling down appply styles first, for awesomeness effect
				$control
					.removeClass("p-collapse-close")
					.addClass("p-collapse-open")
					.css('background-color', '');

				$span.attr("class", "glyphicon glyphicon-chevron-up");
				$scroller.slideDown(200);
			}
		});
	};

	var setupProjectionHandlers = function() {
		$("#scalesPage").on("click", "button", function(e) {
			e.preventDefault();

			var $button = $(this);
			var $modal = $(this).closest(".modal");

			$modal.attr("data-selection", $button.attr("data-value"));
			$modal.modal('hide');
		});
	};

	var setupKeyboardHooks = function() {
		$(document).on('keypress', withRefresh(function(e) {
			console.log('Keypress', e);

			var keyCode = e.key || e.which || e.keyCode;

			// we hold the space down to get into mensuration mode
			//
			if (keyCode === 84 || keyCode === 116) {
				e.preventDefault();
				e.stopPropagation();

				$.event.trigger({
					type: 'plasio.render.toggleClip'
				});
			}
		}));
	};

	var setupMensurationHandlers = function() {
		$("#mensuration-reset").on("click", function(e) {
			e.preventDefault();
			$.event.trigger({
				type: 'plasio.mensuration.pointsReset'
			});
		});

		// TODO: This information should come down from somewhere, the UI module
		// should not assume that we know where the renderer is.  The render module has
		// a function to query this, but the renderer hasn't been initialized yet
		//
		$("#container").on("dblclick", function(e) {
			if (!e.altKey) {
				e.preventDefault();

				$.event.trigger({
					type: 'plasio.mensuration.addPoint',
					x: e.clientX, y: e.clientY,
					startNew: e.shiftKey
				});
			}
		});

		var LineSegment = React.createClass({
			render: function() {
				return React.DOM.tr({
					style: { backgroundColor: '#' + this.props.start.color.getHexString() } }, [
						React.DOM.td(null, this.props.lineIndex),
						React.DOM.td({style: {textAlign: 'right'}}, this.props.start.distanceTo(this.props.end).toFixed(1)),
						React.DOM.td(null, React.DOM.a({ href: "#", onClick: this.addRegion }, React.DOM.span({className: "glyphicon glyphicon-picture"}, '')))
					]);
			},
			addRegion: function(e) {
				render.createNewRegion(this.props.start, this.props.end, this.props.start.color);
			}
		});

		var LineSegmentsBox = React.createClass({
			getInitialState: function() {
				return { points: [] };
			},
			componentWillMount: function() {
				var c = this;
				$(document).on('plasio.mensuration.pointAdded', function(e) {
					c.setState({ points: c.state.points.concat([e.point])});
				});

				$(document).on('plasio.mensuration.pointRemoved', function(e) {
					c.setState({ points: _.without(c.state.points, e.point) });
				});

				$(document).on('plasio.mensuration.pointsReset', function(e) {
					console.log("Resetting all points");
					c.setState({ points: [] });
				});
			},
			render: function() {
				var lines = [];
				var index = 0;
				for (var i = 0 ; i < this.state.points.length - 1 ; i ++) {
					var p1 = this.state.points[i],
						p2 = this.state.points[i+1];
					if (p1.id === p2.id) {
						lines.push(LineSegment({ lineIndex: index+1, start: p1, end: p2 }));
						index ++;
					}
				}

				if (lines.length === 0)
					return React.DOM.div({ className: "its-empty" },
										 "No Measurement Segments");
				return React.DOM.table({
					class: "table"
				}, [
					React.DOM.thead(null, [
						React.DOM.tr(null, [
							React.DOM.td(null, 'Index'),
							React.DOM.td({style: {textAlign: 'right'}}, 'Length'),
							React.DOM.td(null, '')
						])
					]),
					React.DOM.tbody(null, lines)
				]);
			}
		});

		React.renderComponent(LineSegmentsBox({}), $("#points-list-table").get(0));
	};

	function nameToScale(name) {
		var scale = 1.0;
		switch(name) {
			case "meters": scale = 1.0; break;
			case "feet": scale = 3.28; break;
			case "inches": scale = 39.37; break;
		}

		return scale;
	}

	var setupScaleObjectsHandlers = function() {
		// TODO: Don't assume where the renderer is running
		//
		$("#container").on('dblclick', function(e) {
			console.log('dbl-click', e);
			if (e.altKey) {
				e.preventDefault();

				var scale = $("#scale-geoms-scale button").attr("target");

				$.event.trigger({
					type: 'plasio.scalegeoms.place',
					url: '/scale-objects/EmpireStateBuilding/EmpireStateBuilding.js',
					x: e.clientX,
					y: e.clientY,
					scale: nameToScale(scale)
				});
			}
		});

		$("#scale-geoms-clear").on('click', function(e) {
			e.preventDefault();

			$.event.trigger({
				type: 'plasio.scalegeoms.reset'
			});
		});

		$("#scale-geoms-scale").on("click", "a", withRefresh(function(e) {
			e.preventDefault();
			var $a = $(this);
			console.log($a);

			var option = $a.text();
			var target = $a.attr("href").substring(1);
			$("#scale-geoms-scale").find("button")
				.html(option + "&nbsp;<span class='caret'></span>")
				.attr("target", target);

			var scale = nameToScale(target);
			console.log('Setting scale to:', scale);
			$.event.trigger({
				type: "plasio.scalegeoms.scale",
				scale: nameToScale(target)
			});
		}));
	};

	var setupRegionHandlers = function() {
		$(document).on('click', 'a.make-region', function(e) {
			e.preventDefault();

			var index = parseInt($(this).attr('href').substring(1));
			console.log('Making a region out of segment out of index', index);

			var currentPoints = render.getCurrentPoints();
			var p1 = currentPoints[index];
			var p2 = currentPoints[index+1];

			render.createNewRegion(p1, p2);
		});

		var RegionViewport = React.createClass({
			render: function() {
				var classes = React.addons.classSet({
					'btn btn-block btn-sm': true,
					'btn-default': !this.props.region.active,
					'btn-success active': this.props.region.active
				});
				return React.DOM.button({
					className: classes,
					onClick: this.props.toggle
				},
				this.props.region.active ? "Deactivate" : "Activate");
			}
		});

		var RegionSizeSlider = React.createClass({
			componentDidMount: function() {
				var a = this.getDOMNode();
				$(a).noUiSlider({
					range: [1, 10],
					start: Math.round(this.props.startScale),
					step: 1,
					handles: 1,
					connect: false,
					slide: this.setSize
				});
			},
			render: function() {
				return React.DOM.div({style: { marginBottom: '15px' }});
			},
			setSize: function() {
				var v = $(this.getDOMNode()).val();
				this.props.setSize(v);
			},
		});

		var Region = React.createClass({
			render: function() {
				var cx = React.addons.classSet;
				var classesFor = function(active) {
					return cx({
						'btn': true,
						'btn-default': true,
						'btn-sm': true,
						'active': active });
				};

				console.log('Rendering');

				return React.DOM.div({ style: {
					borderLeft: '10px solid #' + this.props.region.color.getHexString(),
					marginBottom: '5px',
					paddingLeft: '5px',
					boxSizing: 'border-box'
				}}, [
					React.DOM.div({ 
						style: { float: 'right', padding: '0px' },
						className: "btn btn-link btn-sm",
						onClick: _.partial(this.props.remove, this.props.index),
						type: "button" }, React.DOM.span({ className: "glyphicon glyphicon-remove"})),
					React.DOM.div({ className: "btn-group btn-group-justified", style: { marginBottom: '10px' }}, [
						React.DOM.div({
							className: classesFor(this.props.region.type == 1),
							onClick: _.partial(this.props.setRibbon, this.props.index),
							type: "button" }, "Ribbon"),
						React.DOM.div({
							className: classesFor(this.props.region.type == 2),
							onClick: _.partial(this.props.setAxisAligned, this.props.index),
							type: "button" }, "Axis-Aligned")
					]),
					this.props.region.type === 1 ? RegionSizeSlider({
						region: this.props.region,
						startScale: this.props.region.widthScale,
						setSize: _.partial(this.props.setWidth, this.props.index)
					}) : '',
					this.props.region.type === 1 ? RegionSizeSlider({
						region: this.props.region,
						startScale: this.props.region.heightScale,
						setSize: _.partial(this.props.setHeight, this.props.index)
					}) : '',
					RegionViewport({
						region: this.props.region,
						toggle: _.partial(this.props.toggle, this.props.index)
					})
				]);
			},
		});

		var RegionsBox = React.createClass({
			getInitialState: function() {
				return { regions: [] };
			},
			componentWillMount: function() {
				var o = this;
				$(document).on("plasio.regions.new", function(e) {
					o.setState({ regions: o.state.regions.concat(e.region) });
				});

				$(document).on("plasio.regions.reset", function() {
					o.setState({ regions: [] });
				});

			},
			render: function() {
				if (this.state.regions.length === 0)
					return React.DOM.div({ className: 'its-empty' }, 'No regions defined');

				var o = this;
				var resetButton = React.DOM.button({
					className: 'btn btn-info btn-sm btn-block',
					style: { marginBottom: '10px' },
					onClick: withRefresh(function() { $.event.trigger({ type: 'plasio.render.toggleClip' }); })
				}, 'Toggle Regions View (T)');

				return React.DOM.div({
					class: "all-regions" },
					[resetButton].concat(
						_.times(this.state.regions.length, function(i) {
							var r = o.state.regions[i];
							return Region({ 
								index: i,
								region: o.state.regions[i],
								setRibbon: o.setRibbon,
								setAxisAligned: o.setAxisAligned,
								setWidth: o.setWidth,
								setHeight: o.setHeight,
								remove: o.remove,
								toggle: o.toggle });
						})));
			},

			setRibbon: withRefresh(function(i) {
				this.state.regions[i].type = 1;
				this.setState({ regions: this.state.regions });
			}),
			setAxisAligned: withRefresh(function(i) {
				this.state.regions[i].type = 2;
				this.setState({ regions: this.state.regions });
			}),

			setWidth: withRefresh(function(i, w) {
				this.state.regions[i].widthScale = w;
				this.setState({ regions: this.state.regions });
			}),

			setHeight: withRefresh(function(i, h) {
				this.state.regions[i].heightScale = h;

				this.setState({ regions: this.state.regions });
			}),

			remove: withRefresh(function(i) {
				console.log('Removing region');
				var r = this.state.regions[i];
				this.setState({ regions: _.without(this.state.regions, r) });

				$.event.trigger({
					type: 'plasio.regions.remove',
					region: r
				});
			}),
			toggle: withRefresh(function(i) {
				this.state.regions[i].active = !this.state.regions[i].active;
				this.setState({ regions: this.state.regions });
			})
		});

		React.renderComponent(RegionsBox({}), $("#clipping-regions").get(0));
	};

	var setupDocHandlers = function() {
		var $modal = $("#docsPage");

		var url = null;
		$(document).on('click', 'a.doc-tag', function(e) {
			e.preventDefault();

			url = $(this).attr('href');
			$modal.modal('show');
		});

		$modal.on('click', '.tags button', function(e) {
			e.preventDefault();

			var offset = parseInt($(this).attr('data-offset'));
			var video = $(".modal-body video").get(0);

			if (video)
				video.currentTime = offset;
		});

		$modal.on('hidden.bs.modal', function() {
			var $title = $modal.find('.modal-title');
			var $body = $modal.find('.modal-body');

			$title.html('plasio Documentation');
			$body.html('');
		});


		$modal.on('shown.bs.modal', function() {
			$.get(url, function(data) {
				var $title = $modal.find('.modal-title');
				var $body = $modal.find('.modal-body');

				$title.text(data.title);

				$body.
					html('').
					append(
						$('<p>').html(data.summary),
						$('<video>', { controls: true, autoplay: true, style: 'width:100%;height:auto;' }).append(
							$('<source>', { src: data.video, type: 'video/webm' }),
							"Your player does not support HTML5 video, you can still download the video from <a href='" + data.video + "'>here</a>"
						),
						$('<div>', { class: 'tags' }).append(
							$('<p>').text('Tags'),
							data.tags.map(function(t) {
								return $('<button>', { type: 'button', class:'btn btn-sm btn-default', 'data-offset': t.offset}).text(t.title);
							})));
			});
		});
	};
})(window);

