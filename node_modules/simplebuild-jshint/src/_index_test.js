// Copyright (c) 2014 Titanium I.T. LLC. All rights reserved. For license, see "README" or "LICENSE" file.
"use strict";

var expect = require("expect.js");
var jshint = require("./index.js");
var messages = require("./messages.js");
var stdout = require("./__stdout.js");
var testFiles = require("./__test_files.js");

describe("Simplebuild module", function() {

	var restoreStdout;
	var successArgs;
	var failureArgs;

	beforeEach(function() {
		successArgs = null;
		failureArgs = null;
		restoreStdout = stdout.ignore();
	});

	afterEach(function() {
		restoreStdout();
	});

	describe("source validator", function() {

		it("has descriptors", function() {
			expect(jshint.checkCode.descriptors).to.eql(messages.SOURCE_VALIDATOR_DESCRIPTORS);
		});

		it("calls success() callback on success", function() {
			jshint.checkCode({
				code: "var a = 1;"
			}, success, failure);
			expectSuccess();
		});

		it("calls failure() callback on failure", function() {
			jshint.checkCode({
				code: "bargledy-bargle"
			}, success, failure);
			expectFailure(messages.VALIDATION_FAILED);
		});

		it("passes 'options' option through to JSHint", function() {
			jshint.checkCode({
				code: "a = 1;",
				options: { undef: true },
			}, success, failure);
			expectFailure(messages.VALIDATION_FAILED);
		});

		it("passes 'global' option through to JSHint", function() {
			jshint.checkCode({
				code: "a = 1;",
				options: { undef: true },
				globals: { a: true }
			}, success, failure);
			expectSuccess();
		});

		it("fails when no code is provided", function() {
			jshint.checkCode({}, success, failure);
			expectFailure(messages.NO_CODE_OPTION);
		});

		it("fails when option variable isn't an object", function() {
			jshint.checkCode("foo", success, failure);
			expectFailure(messages.OPTIONS_MUST_BE_OBJECT);
		});

		it("fails when option variable is null", function() {
			jshint.checkCode(null, success, failure);
			expectFailure(messages.OPTIONS_MUST_NOT_BE_NULL);
		});
	});

	describe("single file validator", function() {
		it("has descriptors", function() {
			expect(jshint.checkOneFile.descriptors).to.eql(messages.ONE_FILE_VALIDATOR_DESCRIPTORS);
		});

		it("calls success() callback on success", function() {
			testFiles.write("var a = 1;", function(filenames) {
				jshint.checkOneFile({
					file: filenames[0]
				}, success, failure);
				expectSuccess();
			});
		});

		it("calls failure() callback on failure", function() {
			testFiles.write("why must you torment me so?", function(filenames) {
				jshint.checkOneFile({
					file: filenames[0]
				}, success, failure);
			});
			expectFailure(messages.VALIDATION_FAILED);
		});

		it("passes 'options' option through to JSHint", function() {
			testFiles.write("a = 1;", function(filenames) {
				jshint.checkOneFile({
					file: filenames[0],
					options: { undef: true },
				}, success, failure);
				expectFailure(messages.VALIDATION_FAILED);
			});
		});

		it("passes 'global' option through to JSHint", function() {
			testFiles.write("a = 1;", function(filenames) {
				jshint.checkOneFile({
					file: filenames[0],
					options: { undef: true },
					globals: { a: true }
				}, success, failure);
				expectSuccess();
			});
		});

		it("fails when no file is provided", function() {
			jshint.checkOneFile({}, success, failure);
			expectFailure(messages.NO_FILE_OPTION);
		});

		it("fails when option variable isn't an object", function() {
			jshint.checkOneFile("foo", success, failure);
			expectFailure(messages.OPTIONS_MUST_BE_OBJECT);
		});

		it("fails when option variable is null", function() {
			jshint.checkOneFile(null, success, failure);
			expectFailure(messages.OPTIONS_MUST_NOT_BE_NULL);
		});
	});

	describe("file list validator", function() {
		it("has descriptors", function() {
			expect(jshint.checkFiles.descriptors).to.eql(messages.FILE_LIST_VALIDATOR_DESCRIPTORS);
		});

		it("calls success() callback on success", function() {
			testFiles.write("var a = 1;", function(filenames) {
				jshint.checkFiles({
					files: filenames
				}, success, failure);
				expectSuccess();
			});
		});

		it("calls failure() callback on failure", function() {
			testFiles.write("bargledy-bargle", function(filenames) {
				jshint.checkFiles({
					files: filenames
				}, success, failure);
			});
			expectFailure(messages.VALIDATION_FAILED);
		});

		it("supports globs", function() {
			testFiles.write("var a = 1;", "bargledy-bargle", function(filenames) {
				jshint.checkFiles({
					files: [ "temp_files/*" ]
				}, success, failure);
				expectFailure(messages.VALIDATION_FAILED);
			});
		});

		it("passes 'options' option through to JSHint", function() {
			testFiles.write("a = 1;", function(filenames) {
				jshint.checkFiles({
					files: filenames,
					options: { undef: true },
				}, success, failure);
				expectFailure(messages.VALIDATION_FAILED);
			});
		});

		it("passes 'global' option through to JSHint", function() {
			testFiles.write("a = 1;", function(filenames) {
				jshint.checkFiles({
					files: filenames,
					options: { undef: true },
					globals: { a: true }
				}, success, failure);
				expectSuccess();
			});
		});

		it("fails when no code is provided", function() {
			jshint.checkFiles({}, success, failure);
			expectFailure(messages.NO_FILES_OPTION);
		});

		it("fails when option variable isn't an object", function() {
			jshint.checkFiles("foo", success, failure);
			expectFailure(messages.OPTIONS_MUST_BE_OBJECT);
		});

		it("fails when option variable is null", function() {
			jshint.checkFiles(null, success, failure);
			expectFailure(messages.OPTIONS_MUST_NOT_BE_NULL);
		});
	});

	function success() {
		successArgs = arguments;
	}

	function failure() {
		failureArgs = arguments;
	}

	function expectSuccess() {
		if (successArgs === null) throw new Error("Expected success callback to be called");
		if (failureArgs !== null) throw new Error("Did not expect failure callback to be called");
		expect(successArgs).to.eql([]);
	}

	function expectFailure(failureMessage) {
		if (failureArgs === null) throw new Error("Expected failure callback to be called");
		if (successArgs !== null) throw new Error("Did not expect success callback to be called");
		expect(failureArgs).to.eql([ failureMessage ]);
	}

});