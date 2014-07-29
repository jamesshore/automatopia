// Copyright (c) 2014 Titanium I.T. LLC. All rights reserved. For license, see "README" or "LICENSE" file.
"use strict";

var simplebuild = require("simplebuild");
var jshint = require("./jshint_runner.js");
var messages = require("./messages.js");

exports.checkFiles = function checkFiles(options, success, failure) {
	if (typeof options !== "object") return failure(messages.OPTIONS_MUST_BE_OBJECT);
	if (options === null) return failure(messages.OPTIONS_MUST_NOT_BE_NULL);
	if (options.files === undefined) return failure(messages.NO_FILES_OPTION);

	var files = simplebuild.deglobSync(options.files);

	var passed = jshint.validateFileList(files, options.options, options.globals);
	if (passed) success();
	else failure(messages.VALIDATION_FAILED);
};
exports.checkFiles.descriptors = messages.FILE_LIST_VALIDATOR_DESCRIPTORS;


exports.checkOneFile = function checkOneFile(options, success, failure) {
	if (typeof options !== "object") return failure(messages.OPTIONS_MUST_BE_OBJECT);
	if (options === null) return failure(messages.OPTIONS_MUST_NOT_BE_NULL);
	if (options.file === undefined) return failure(messages.NO_FILE_OPTION);

	var passed = jshint.validateFile(options.file, options.options, options.globals);
	if (passed) success();
	else failure(messages.VALIDATION_FAILED);
};
exports.checkOneFile.descriptors = messages.ONE_FILE_VALIDATOR_DESCRIPTORS;


exports.checkCode = function checkCode(options, success, failure) {
	if (typeof options !== "object") return failure(messages.OPTIONS_MUST_BE_OBJECT);
	if (options === null) return failure(messages.OPTIONS_MUST_NOT_BE_NULL);
	if (options.code === undefined) return failure(messages.NO_CODE_OPTION);

	var passed = jshint.validateSource(options.code, options.options, options.globals);
	if (passed) success();
	else failure(messages.VALIDATION_FAILED);
};
exports.checkCode.descriptors = messages.SOURCE_VALIDATOR_DESCRIPTORS;
