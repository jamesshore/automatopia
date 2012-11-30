// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
(function() {
	"use strict";

	var TESTACULAR = "node_modules/testacular/bin/testacular";
	var TESTACULAR_START = TESTACULAR + " start build/testacular.conf.js";

	var sh = require("./sh.js");

	exports.serve = function(success, fail) {
		sh.run(TESTACULAR_START, success, function() {
			fail("Could not start Testacular server");
		});
	};

}());