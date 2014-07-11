// client.js
// Client side stuffs for greyhound web viewer
//

// Import all modules here even if we don't want to use them
// so that browserify can pick them up
var $ = require('jquery'),
	render = require('./render'),
	ui = require('./ui'),
	laslaz = require('./laslaz');


function endsWith(str, s) {
	return str.indexOf(s) === (str.length - s.length);
}

(function(w) {
	"use strict";

	// The NACL module calls method on the window, make sure the laslaz module
	// can see messages sent by NACL
	//
	window.handleMessage = laslaz.handleMessage;

	// show an error message to the user
	//
	var errorOut = function(msg) {
		$("#messages").html("<p class='error'>" + msg + "</p>");
		console.log('Error : ' + msg);
	};

	// show a status message to the user
	var message = function(msg) {
		$("#messages").html("<p class='message'>" + msg + "</p>");
		console.log('Status: ' + msg);
	};

	$(document).on("plasio.start", function() {
		render.startRenderer($("#container").get(0), message);
	});

})(window);

$(function() {
	setTimeout(function() {
		var isWebGLSupported = function() {
			if ("WebGLRenderingContext" in window) {
				// might have support
				//
				var e = document.createElement("canvas");
				var webgl = e.getContext("webgl");
				var experimental = false;
				if (webgl === null) {
					webgl = e.getContext("experimental-webgl");
					experimental = true;
				}

				return [webgl !== null, experimental];
			}

			return false;
		};

		// if we're good to go, trigger the plasio.start event, all initializers
		// should be hooked to this event, and not DOMContentLoaded
		//
		var r = isWebGLSupported();
		var supported = r[0];
		var experimental = r[1];
		if(supported) {
			$(".fullscreen").fadeOut(200);
			// we need to intialize the UI first, before we initialize everything else,
			// since UI has to show results and statuses about things as they initialize
			//
			$.event.trigger({
				type: "plasio.startUI"
			});

			$.event.trigger({
				type: "plasio.start"
			});

			if (experimental) {
				$.event.trigger({
					type: "plasio.webglIsExperimental"
				});
			}

			var parseURL = function(qs) {
				var name = qs.match(/\?s=(\S+)/);
				return name ? name[1] : null;
			};


			// If a URL is specified, load that now
			var query = window.location.search;
			if (query) {
				query = parseURL(query);
				if (query && query.length > 0) {
					$.event.trigger({
						type: "plasio.loadfiles.remote",
						url: query,
						name: query
					});
				}
			}
		}
		else {
			$("#no-support").css("opacity", 1.0);
		}
	}, 1000);
});
