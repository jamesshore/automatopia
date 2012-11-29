// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
(function () {
	"use strict";

	var server = require("./server.js");
	var http = require("http");

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
		httpGet("http://localhost:8080", function(response, responseText) {
			test.equals(response.statusCode, 200, "status code");
			test.equals(responseText, "Hello World", "response text");
			test.done();
		});
	};

	function httpGet(url, callback) {
		var request = http.get(url);
		request.on("response", function(response) {
			var responseText = "";
			response.setEncoding("utf8");

			response.on("data", function(chunk) {
				responseText += chunk;
			});
			response.on("end", function() {
				callback(response, responseText);
			});
		});
	}
}());
