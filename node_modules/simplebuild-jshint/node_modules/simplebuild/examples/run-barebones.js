// Copyright (c) 2013 Titanium I.T. LLC. All rights reserved. See LICENSE.TXT for details.
(function() {
	"use strict";

	var extensions = require("../mappers/simplebuild-map-header.js")
		.map("../mappers/simplebuild-map-running.js");

	var barebones = extensions.map("../examples/simplebuild-barebones.js");

	barebones.succeed({}, success, failure);
	barebones.fail({}, success, failure);
	barebones.succeedOrFail({ fail: true }, success, failure);

	function success() {
		console.log("Succeeded!");
	}

	function failure(message) {
		console.log("Failed! " + message);
	}

}());