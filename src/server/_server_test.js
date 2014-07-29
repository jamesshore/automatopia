// Copyright (c) 2012-2014 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
(function () {
	"use strict";

	var expect = require("expect.js");
	var server = require("./server.js");
	var httpUtil = require("../__http_util.js");

	describe("Server", function() {

		beforeEach(function(done) {
			server.start(5000, function() {
				done();
			});
		});

		afterEach(function(done) {
			server.stop(function() {
				done();
			});
		});

		it("responds to requests", function(done) {
			httpUtil.getPage("http://localhost:5000", function(error, response, responseText) {
				expect(response.statusCode).to.equal(200);
				expect(responseText).to.equal("Hello World");
				done(error);
			});
		});

	});

}());
