// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import Build from "./build.js";

runAsync().then(result => {
	if (result === null) process.exit(0);
	else process.exit(1);
});

async function runAsync() {
	return await Build.create().runAsync();
}