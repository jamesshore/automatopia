// Copyright (c) 2015 Titanium I.T. LLC. All rights reserved. For license, see "README" or "LICENSE" file.
"use strict";

var nodemon = require("nodemon");
var buildCommand = require("../util/build_command.js");

console.log("*** Using nodemon to run " + buildCommand.get() + ". Type 'rs<enter>' to force restart.");
nodemon({
	ext: "sh bat json js html css",
	exec: buildCommand.get() + " " + process.argv.slice(2).join(" "),
	execMap: {
		sh: "/bin/sh",
		bat: "cmd.exe /c",
		cmd: "cmd.exe /c"
	},
	quiet: false
}).on("restart", function(files) {
	console.log("*** Restarting due to", files);
});