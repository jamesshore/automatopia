// Copyright (c) 2012-2015 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.

// Runs the smoke tests against a localhost server.

(function() {
	"use strict";

	var expect = require("expect.js");
	var child_process = require("child_process");
	var fs = require("fs");
	var procfile = require("procfile");
	var smoketest = require("./__smoketest_runner.js");

	var PORT = "5020";
	var BASE_URL = "http://localhost:" + PORT;

	describe("Localhost server", function() {

		var child = null;

		beforeEach(function(done) {
			var cmdLine = parseProcfile();
			child = child_process.spawn(cmdLine.command, cmdLine.options, { stdio: [ "pipe", "pipe", process.stderr ]});

			child.stdout.setEncoding("utf8");
			child.stdout.on("data", function(chunk) {
				if (chunk.trim().indexOf("Server started") !== -1) return done();
			});

			child.once("exit", function() {
				child = null;
			});
		});

		afterEach(function(done) {
			if (child === null) return done();

			child.once("exit", function() {
				done();
			});
			child.kill();
		});

		it("passes smoke tests", function(done) {
			smoketest.runTests(BASE_URL, function(success) {
				expect(success).to.be(true);
				done();
			});
		});

		function parseProcfile() {
			var file = fs.readFileSync("Procfile", "utf8");
			var web = procfile.parse(file).web;
			web.options = web.options.map(function(option) {
				if (option === "$PORT") return PORT;
				else return option;
			});
			return web;
		}
	});

}());