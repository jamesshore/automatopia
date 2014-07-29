// Copyright (c) 2014 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
"use strict";

var Mocha = require("mocha");

exports.runTests = function runTests(files, success, failure) {
	var mocha = new Mocha({ui: "bdd"});
	files.forEach(mocha.addFile.bind(mocha));

	mocha.run(function(failures) {
		if (failures) return failure("Tests failed");
		else return success();
	});
};
