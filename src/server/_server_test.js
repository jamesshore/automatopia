// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
(function () {
	"use strict";

	var server = require("./server.js");
	var httpUtil = require("../_http_util.js");

	exports.setUp = function(done) {
		server.start(8080, function() {
			done();
		});
	};

	exports.tearDown = function(done) {
		server.stop(function() {
			done();
		});
	};

	exports.test_respondsToRequests = function(test) {
		httpUtil.getPage("http://localhost:8080", function(error, response, responseText) {
			test.equals(response.statusCode, 200, "status code");
			test.equals(responseText, "Hello World", "response text");
			test.done(error);
		});
	};
}());
