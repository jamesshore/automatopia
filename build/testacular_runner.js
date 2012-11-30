// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
(function() {
	"use strict";

	var TESTACULAR = "node_modules/testacular/bin/testacular";
	var TESTACULAR_START = TESTACULAR + " start build/testacular.conf.js";
	var CONFIG = {};

	var sh = require("./sh.js");
	var runner = require("testacular/lib/runner");

	exports.serve = function(success, fail) {
		sh.run(TESTACULAR_START, success, function() {
			fail("Could not start Testacular server");
		});
	};

	exports.runTests = function(requiredBrowsers, success, fail) {
		var output = "";
		var oldStdout = process.stdout.write;
		process.stdout.write = function(data) {
			output += data;
			oldStdout.apply(this, arguments);
		};

		runner.run(CONFIG, function(exitCode) {
			process.stdout.write = oldStdout;

			if (exitCode) fail("Client tests failed (to start server, run 'jake testacular')");
			var browserMissing = false;
			requiredBrowsers.forEach(function(browser) {
				browserMissing = checkIfBrowserTested(browser, output) || browserMissing;
			});
			if (browserMissing && !process.env.loose) fail("Did not test all supported browsers (use 'loose=true' to suppress error)");
			if (output.indexOf("TOTAL: 0 SUCCESS") !== -1) fail("Client tests did not run!");

			success();
		});
	};

	function checkIfBrowserTested(browser, output) {
		var missing = output.indexOf(browser + ": Executed") === -1;
		if (missing) console.log(browser + " was not tested!");
		return missing;
	}


}());