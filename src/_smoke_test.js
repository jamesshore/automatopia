// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
(function() {
	"use strict";
	var child_process = require("child_process");
	var fs = require("fs");
	var procfile = require("procfile");
	var httpUtil = require("./_http_util.js");

	var PORT = "5000";
	var BASE_URL = "http://localhost:" + PORT;

	var child;

	exports.setUp = function(done) {
		var stdout = "";

		var web = parseProcfile();
		child = child_process.spawn(web.command, web.options, { stdio: "pipe" });
		child.stdout.setEncoding("utf8");
		child.stdout.on("data", function(chunk) {
			if (stdout !== null) stdout += chunk;
			if (stdout.trim() === "Server started") {
				stdout = null;
				done();
			}
		});
	};

	function parseProcfile() {
		var file = fs.readFileSync("Procfile", "utf8");
		var web = procfile.parse(file).web;
		web.options = web.options.map(function(option) {
			if (option === "$PORT") return PORT;
			else return option;
		});
		return web;
	}

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
		httpUtil.getPage(url, function(error, response, responseText) {
				var foundMarker = responseText.indexOf(marker) !== -1;
				callback(foundMarker);
		});
	}
}());