// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
(function() {
	"use strict";

	var path = require("path");
	var server = require("./server/server.js");

	var port = process.argv[2];

	server.start(port, path.resolve(__dirname, "./client"), function() {
		console.log("Server started on port " + port);
	});
}());