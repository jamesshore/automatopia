// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import Build from "./build.ts";

runAsync().then(result => {
	if (result === null) process.exit(0);
	else process.exit(1);
});

async function runAsync(): Promise<string | null> {
	return await Build.create().runAsync();
}
