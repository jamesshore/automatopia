// Copyright (c) 2012-2014 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
/*global desc, task, jake, fail, complete, directory, require, console, process */

// Main build file. Contains all tasks needed for normal development.

(function() {
	"use strict";

	var startTime = Date.now();

	var jshint = require("simplebuild-jshint");
	var mocha = require("../util/mocha_runner.js");
	var karma = require("../util/karma_runner.js");
	var version = require("../util/version_checker.js");
	var browsers = require("../config/tested_browsers.js");

	var KARMA_CONFIG = "./build/config/karma.conf.js";

	var strict = !process.env.loose;


	//*** GENERAL

	desc("Lint and test");
	task("default", ["version", "lint", "test"], function() {
		var elapsedSeconds = (Date.now() - startTime) / 1000;
		console.log("\n\nBUILD OK  (" + elapsedSeconds.toFixed(2) + "s)");
	});

	desc("Start server (for manual testing)");
	task("run", function() {
		console.log("Starting server. Press Ctrl-C to exit.");
		jake.exec("node src/run.js 5000", { interactive: true }, complete);
	}, { async: true });


	//*** LINT

	desc("Lint everything");
	task("lint", ["lintNode", "lintClient"]);

	task("lintNode", function() {
		process.stdout.write("Linting Node.js code: ");
		jshint.checkFiles({
			files: [ "src/*.js", "src/server/**/*.js", "build/**/*.js" ],
			options: nodeLintOptions(),
			globals: nodeLintGlobals()
		}, complete, fail);
	}, { async: true });

	task("lintClient", function() {
		process.stdout.write("Linting browser code: ");
		jshint.checkFiles({
			files: [ "src/client/**/*.js" ],
			options: browserLintOptions()
		}, complete, fail);
	}, { async: true });


	//*** TEST

	desc("Start Karma server -- run this first");
	task("karma", function() {
		karma.serve(KARMA_CONFIG, complete, fail);
	}, { async: true });

	desc("Run tests");
	task("test", ["testServer", "testClient"]);

	task("testServer", function() {
		process.stdout.write("Testing Node.js code: ");
		mocha.runTests({
			files: [ "src/_*_test.js", "src/server/**/_*_test.js" ],
			options: {
				ui: "bdd",
				reporter: "dot"
			}
		}, complete, fail);
	}, { async: true });

	task("testClient", function() {
		console.log("Testing browser code: ");
		karma.runTests({
			configFile: KARMA_CONFIG,
			browsers: browsers,
			strict: strict
		}, complete, fail);
	}, { async: true });


	//*** VERSIONS

	desc("Check Node version");
	task("version", function() {
		console.log("Checking Node.js version: .");

		version.check({
			name: "Node",
			expected: require("../../package.json").engines.node,
			actual: process.version,
			strict: strict
		}, complete, fail);
	}, { async: true });



	//*** Helpers

	function globalLintOptions() {
		return {
			bitwise:true,
			curly:false,
			eqeqeq:true,
			forin:true,
			immed:true,
			latedef:false,
			newcap:true,
			noarg:true,
			noempty:true,
			nonew:true,
			regexp:true,
			undef:true,
			strict:true,
			trailing:true
		};
	}

	function nodeLintOptions() {
		var options = globalLintOptions();
		options.node = true;
		return options;
	}

	function browserLintOptions() {
		var options = globalLintOptions();
		options.browser = true;
		return options;
	}

	function nodeLintGlobals() {
		return {
			// Mocha globals
			beforeEach: false,
			afterEach: false,
			describe: false,
			it: false
		};
	}

}());