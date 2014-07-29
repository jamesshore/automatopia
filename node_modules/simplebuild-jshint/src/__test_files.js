// Copyright (c) 2014 Titanium I.T. LLC. All rights reserved. For license, see "README" or "LICENSE" file.
"use strict";

var fs = require("fs");
var assert = require("assert");

var testRoot = "temp_files/file-list-validation.js-";

exports.write = function write() {
	var fileBodies = allButLastArgument(arguments);
	var callback = lastArgument(arguments);

	var filenames = fileBodies.map(createFile);
	try {
		callback(filenames);
	}
	finally {
		filenames.forEach(deleteFile);
	}
};

function createFile(fileBody, index) {
	var testFile = testRoot + index;
	fs.writeFileSync(testFile, fileBody);
	return testFile;
}

function deleteFile(testFile) {
	fs.unlinkSync(testFile);
	assert.ok(!fs.existsSync(testFile), "Could not delete test file: " + testFile);
}

function allButLastArgument(args) {
	return Array.prototype.slice.call(args, 0, -1);
}

function lastArgument(args) {
	return args[args.length - 1];
}
