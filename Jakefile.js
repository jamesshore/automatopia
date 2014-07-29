// Copyright (c) 2012-2014 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
/*global desc, task, jake, fail, complete, directory, require, console, process */
(function () {
	"use strict";

	// Uncomment and modify the following list to cause the build to fail unless these browsers are tested.
	var REQUIRED_BROWSERS = [
//		"IE 8.0.0 (Windows XP)",
//		"IE 9.0.0 (Windows 7)",
//		"Firefox 23.0.0 (Mac OS X 10.8)",
//		"Chrome 29.0.1547 (Mac OS X 10.8.5)",
//		"Safari 6.0.5 (Mac OS X 10.8.5)",
//		"Mobile Safari 6.0.0 (iOS 6.1)"
	];

	var jshint = require("simplebuild-jshint");
	var mocha = require("./build/util/mocha_runner.js");
	var karma = require("./build/util/karma_runner.js");

	desc("Lint and test");
	task("default", ["lint", "test"], function() {
		console.log("\n\nOK");
	});

	desc("Start Karma server -- run this first");
	task("karma", function() {
		karma.serve(complete, fail);
	}, {async: true});

	desc("Lint everything");
	task("lint", ["lintNode", "lintClient"]);

	task("lintNode", function() {
		process.stdout.write("Linting Node.js code: ");
		jshint.checkFiles({
			files: [ "Jakefile.js", "src/*.js", "src/server/**/*.js", "build/util/**/ *.js" ],
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

	desc("Test everything");
	task("test", ["testServer", "testClient"]);

	task("testServer", function() {
		mocha.runTests(nodeFilesToTest(), complete, fail);
	}, { async: true} );

	task("testClient", function() {
		karma.runTests(REQUIRED_BROWSERS, complete, fail);
	}, { async: true} );

	function nodeFilesToTest() {
		var testFiles = new jake.FileList();
		testFiles.include("src/_*_test.js");
		testFiles.include("src/server/**/_*_test.js");
		testFiles.exclude("node_modules");
		var tests = testFiles.toArray();
		return tests;
	}

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