// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
/*global desc, task, jake, fail, complete, directory, require, console, process */
(function () {
	"use strict";

	var REQUIRED_BROWSERS = [
		"IE 8.0"
	];

	var lint = require("./build/lint_runner.js");
	var nodeunit = require("./build/nodeunit_runner.js");

	desc("Lint and test");
	task("default", ["lint", "test"], function() {
		console.log("\n\nOK");
	});

	desc("Start Testacular server for testing");
	task("testacular", function() {
		testacular(["start", "build/testacular.conf.js"], "Could not start Testacular server", complete);
	}, {async: true});

	desc("Lint everything");
	task("lint", [], function () {
		var passed = lint.validateFileList(nodeFilesToLint(), nodeLintOptions(), {});
		if (!passed) fail("Lint failed");
	});

	desc("Test everything");
	task("test", [], function() {
		nodeunit.runTests(nodeFilesToTest(), function(failures) {
			if (failures) fail("Tests failed");
			complete();
		});
	}, {async: true});

	function testacular(args, errorMessage, callback) {
		args.unshift("node_modules/testacular/bin/testacular");
		sh("node", args, errorMessage, callback);
	}

	function sh(command, args, errorMessage, callback) {
		console.log("> " + command + " " + args.join(" "));

		// Not using jake.createExec as it adds extra line-feeds into output as of v0.3.7
		var child = require("child_process").spawn(command, args, { stdio: "pipe" });

		// redirect stdout
		var stdout = "";
		child.stdout.setEncoding("utf8");
		child.stdout.on("data", function(chunk) {
			stdout += chunk;
			process.stdout.write(chunk);
		});

		// redirect stderr
		var stderr = "";
		child.stderr.setEncoding("utf8");
		child.stderr.on("data", function(chunk) {
			stderr += chunk;
			process.stderr.write(chunk);
		});

		// handle process exit
		child.on("exit", function(exitCode) {
			if (exitCode !== 0) fail(errorMessage);
		});
		child.on("close", function() {      // 'close' event can happen after 'exit' event
			callback(stdout, stderr);
		});
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