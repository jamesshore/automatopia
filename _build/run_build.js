// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const Build = require("./build");

runAsync().then(result => {
	if (result === null) process.exit(0);
	else process.exit(1);
});

async function runAsync() {
	const build = await Build.createAsync();
	return await build.runAsync();
}