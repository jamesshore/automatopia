// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
/*global desc, task, jake, fail, complete, directory, require, console, process */
(function () {
	"use strict";

	var TESTED_BROWSERS = [
		"Safari 6.0"
	];

	var lint = require("./build/lint_runner.js");
	var nodeunit = require("./build/nodeunit_runner.js");
	var testacular = require("./build/testacular_runner.js");

	desc("Lint and test");
	task("default", ["lint", "test"], function() {
		console.log("\n\nOK");
	});

	desc("Start Testacular server for testing");
	task("testacular", function() {
		testacular.serve(complete, fail);
	}, {async: true});

	desc("Lint everything");
	task("lint", [], function () {
		var passed = lint.validateFileList(nodeFilesToLint(), nodeLintOptions(), {});
		if (!passed) fail("Lint failed");
	});

	desc("Test everything");
	task("test", ["testClient"], function() {
		nodeunit.runTests(nodeFilesToTest(), function(failures) {
			if (failures) fail("Tests failed");
			complete();
		});
	}, {async: true});

	desc("Test client code");
	task("testClient", function() {
		var config = {};

		var output = "";
		var oldStdout = process.stdout.write;
		process.stdout.write = function(data) {
			output += data;
			oldStdout.apply(this, arguments);
		};

		require("testacular/lib/runner").run(config, function(exitCode) {
			process.stdout.write = oldStdout;

			if (exitCode) fail("Client tests failed (to start server, run 'jake testacular')");
			var browserMissing = false;
			TESTED_BROWSERS.forEach(function(browser) {
				browserMissing = checkIfBrowserTested(browser, output) || browserMissing;
			});
			if (browserMissing && !process.env.loose) fail("Did not test all supported browsers (use 'loose=true' to suppress error)");
			if (output.indexOf("TOTAL: 0 SUCCESS") !== -1) fail("Client tests did not run!");

			complete();
		});
	}, {async: true});

	function checkIfBrowserTested(browser, output) {
		var missing = output.indexOf(browser + ": Executed") === -1;
		if (missing) console.log(browser + " was not tested!");
		return missing;
	}

	function nodeFilesToTest() {
		var testFiles = new jake.FileList();
		testFiles.include("**/_*_test.js");
		testFiles.exclude("node_modules");
		var tests = testFiles.toArray();
		return tests;
	}

	function nodeFilesToLint() {
		var files = new jake.FileList();
		files.include("src/**/*.js");
		files.include("build/**/*.js");
		files.include("Jakefile.js");
		var fileList = files.toArray();
		return fileList;
	}

	function nodeLintOptions() {
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
			trailing:true,
			node:true
		};
	}
}());