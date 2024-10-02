#!/usr/local/bin/node
// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

// Automatically runs build when files change.

"use strict";

const Build = require("./build");
const path = require("node:path");
const Colors = require("infrastructure/colors");
const Shell = require("infrastructure/shell");
const Paths = require("./config/paths");
const FileSystem = require("infrastructure/file_system");
const Clock = require("infrastructure/clock");
const TaskCli = require("tasks/task_cli");


const watchColor = Colors.cyan;

const DEBOUNCE_MS = 100;

const args = process.argv.slice(2);
const clock = Clock.create();
const noOutputShell = Shell.createSilent();


let fileTreeChanged = false;
runAsync();

async function runAsync() {
	const build = await Build.create();
	const fileSystem = FileSystem.create(Paths.rootDir, Paths.timestampsBuildDir);

	// run all of these functions in the background, in parallel
	restartWhenBuildFilesChangeAsync(fileSystem);
	markTreeChangedWhenFilesAddedRemovedOrRenamed(fileSystem);
	runBuildWhenAnyFilesChangeAsync(fileSystem, build);
}

async function restartWhenBuildFilesChangeAsync(fileSystem) {
	await fileSystem.waitForChangeAsync(Paths.buildRestartGlobs);
	console.log(watchColor("\n*** Build files changed"));
	process.exit(0);
	// watch.sh will detect that the process exited cleanly and restart it
}

async function markTreeChangedWhenFilesAddedRemovedOrRenamed(fileSystem) {
	while (true) {
		const { changed } = await fileSystem.waitForChangeAsync(Paths.buildWatchGlobs);
		if (changed === FileSystem.CHANGED.TREE) fileTreeChanged = true;
	}
}

async function runBuildWhenAnyFilesChangeAsync(fileSystem, build) {
	while (true) {
		const changePromise = debouncedWaitForChangeAsync(fileSystem);
		await runBuildAsync(build);
		await changePromise;
	}
}

async function runBuildAsync(build) {
	console.log(watchColor(`\n\n\n\n*** BUILD> ${args.join(" ")}`));
	const buildPromise = build.runAsync({ resetTreeCache: fileTreeChanged });
	fileTreeChanged = false;
	const buildResult = await buildPromise;

	if (buildResult === TaskCli.CLI_FAILURE) process.exit(1);

	// We don't 'await' this because we want it to run in the background.
	playBuildResultSoundAsync(buildResult);
}

async function debouncedWaitForChangeAsync(fileSystem) {
	await clock.waitAsync(DEBOUNCE_MS);
	await fileSystem.waitForChangeAsync(Paths.buildWatchGlobs);
	console.log(watchColor("\n*** Build queued"));
}

async function playBuildResultSoundAsync(buildResult) {
	if (buildResult === null) {
		await playSoundAsync(Paths.successSound);
	}
	else if (buildResult === "lint") {
		await playSoundAsync(Paths.lintErrorSound);
	}
	else {
		await playSoundAsync(Paths.failSound);
	}
}

async function playSoundAsync(filename) {
	try {
		const file = path.resolve(__dirname, filename);
		if (process.platform === "darwin") {
			// MacOS has a built-in 'afplay' command
			await noOutputShell.execAsync("afplay", file, "--volume", "0.3");
		}
		else if(process.platform === 'win32') {
			// Use Powershell to create a Media.SoundPlayer .Net object. (Only works on .wav files.)
			await noOutputShell.execAsync(`powershell`, '-c', `(New-Object Media.SoundPlayer "${file}").PlaySync();`);
		}
		else {
			// aplay is part of the alsa-utils package
			await noOutputShell.execAsync("aplay", file);
		}
	}
	catch {
		// If audio player isn't found, or other error occurs, just ignore it
	}
}
