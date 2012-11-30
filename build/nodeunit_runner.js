// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
(function() {
	"use strict";

	var nodeunit = require("nodeunit");

	var REPORTER = "default";

	exports.runTests = function(testFiles, callback) {
		nodeunit.reporters[REPORTER].run(testFiles, null, callback);
	};

}());