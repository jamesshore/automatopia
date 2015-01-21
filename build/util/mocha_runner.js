// Copyright (c) 2014 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.

// Helper function for running Mocha

(function() {
	"use strict";

	var Mocha = require("mocha");
	var jake = require("jake");

	exports.runTests = function runTests(options, success, failure) {
		var mocha = new Mocha(options.options);
		var files = deglob(options.files);
		files.forEach(mocha.addFile.bind(mocha));

		mocha.run(function(failures) {
			if (failures) return failure("Tests failed");
			else return success();
		});
	};

	function deglob(globs) {
		return new jake.FileList(globs).toArray();
	}

}());
