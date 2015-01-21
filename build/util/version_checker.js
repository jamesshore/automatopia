// Copyright (c) 2013 Titanium I.T. LLC. All rights reserved. See LICENSE.TXT for details.
(function() {
	"use strict";

	exports.check = function(name, strict, expectedString, actualString, fail) {
		var expected = parseVersion("expected " + name + " version", expectedString, fail);
		var actual = parseVersion(name + " version", actualString, fail);

		if (actual[0] !== expected[0] || actual[1] !== expected[1] || actual[2] !== expected[2]) {
			if (strict) {
				return failWithQualifier("exactly");
			}
			else {
				if (actual[0] < expected[0]) return failWithQualifier("at least");
				if (actual[0] === expected[0] && actual[1] < expected[1]) return failWithQualifier("at least");
				if (actual[0] === expected[0] && actual[1] === expected[1] && actual[2] < expected[2]) return failWithQualifier("at least");
				console.log("Warning: Newer " + name + " version than expected. Expected " + expectedString +
					", but was " + actualString + ".");
			}
		}

		function failWithQualifier(qualifier) {
			return fail("Incorrect " + name + " version. Expected " + qualifier +
				" " + expectedString + ", but was " + actualString + ".");
		}
	};

	function parseVersion(description, versionString, fail) {
		var versionMatcher = /^v(\d+)\.(\d+)\.(\d+)(\-|$)/;    // v[major].[minor].[bugfix]
		var versionInfo = versionString.match(versionMatcher);
		if (versionInfo === null) fail("Could not parse " + description + " (was '" + versionString + "')");

		var major = parseInt(versionInfo[1], 10);
		var minor = parseInt(versionInfo[2], 10);
		var bugfix = parseInt(versionInfo[3], 10);
		return [major, minor, bugfix];
	}

}());