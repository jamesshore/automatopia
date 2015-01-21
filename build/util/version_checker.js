// Copyright (c) 2013 Titanium I.T. LLC. All rights reserved. See LICENSE.TXT for details.
(function() {
	"use strict";

	var semver = require("semver");

	exports.check = function(name, strict, expected, actual, fail) {
		if (strict) {
			if (semver.neq(expected, actual)) return failWithQualifier("exactly");
		}
		else {
			if (semver.lt(actual, expected)) return failWithQualifier("at least");
			if (semver.neq(expected, actual)) console.log("Warning: Newer " + name + " version than expected. Expected " +
				expected + ", but was " + actual + ".");
		}

		function failWithQualifier(qualifier) {
			return fail("Incorrect " + name + " version. Expected " + qualifier +
				" " + expected + ", but was " + actual + ".");
		}
	};

}());