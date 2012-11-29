// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
(function() {
	"use strict";
	var child_process = require("child_process");
	var http = require("http");

	var PORT = "5000";
	var BASE_URL = "http://localhost:" + PORT;

	var child;

	exports.setUp = function(done) {
		child = child_process.spawn("node", ["src/run.js", PORT], { stdio: "pipe" });
		var stdout = "";

		child.stdout.setEncoding("utf8");
		child.stdout.on("data", function(chunk) {
			stdout += chunk;
			if (stdout.trim() === "Server started") {
				done();
			}
		});
	};

	exports.tearDown = function(done) {
		child.on("exit", function() {
			done();
		});
		child.kill();
	};

	exports.test_getHomePage = function(test) {
		checkMarker(BASE_URL, "Hello World", function(foundMarker) {
			test.ok(foundMarker, "should have found home page marker");
			test.done();
		});
	};

	function checkMarker(url, marker, callback) {
		var request = http.get(url);
		request.on("response", function(response) {
			var data = "";
			response.setEncoding("utf8");

			response.on("data", function(chunk) {
				data += chunk;
			});
			response.on("end", function() {
				var foundMarker = data.indexOf(marker) !== -1;
				callback(foundMarker);
			});
		});
	}
}());