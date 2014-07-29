// Copyright (c) 2013 Titanium I.T. LLC. All rights reserved. See LICENSE.TXT for details.
"use strict";

var promisify = require("./extensions/simplebuild-ext-promisify.js")
	.map("../mappers/simplebuild-map-header.js")
	.map;

var jshint = promisify("../tasks/simplebuild-jshint.js");
var mocha = promisify("../tasks/simplebuild-mocha.js");

jshint.validate({
	files: [ "**/*.js", "!node_modules/**/*" ],
	options: lintOptions(),
	globals: {}
})
.then(function() {
	return mocha.runTests({
		files: [ "**/_*_test.js", "!node_modules/**/*" ]
	});
})
.then(function() {
	console.log("\n\nOK");
})
.fail(function(message) {
	console.log("\n\nFAILED: " + message);
});

function lintOptions() {
	return {
		bitwise: true,
		curly: false,
		eqeqeq: true,
		forin: true,
		immed: true,
		latedef: false,
		newcap: true,
		noarg: true,
		noempty: true,
		nonew: true,
		regexp: true,
		undef: true,
		strict: true,
		trailing: true,
		node: true
	};
}