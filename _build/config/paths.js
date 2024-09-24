// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ensure = require("util/ensure");
const path = require("node:path");
const FileTree = require("infrastructure/file_tree");

const rootDir = path.resolve(__dirname, "../..");
const generatedDir = `${rootDir}/generated`;
const incrementalBuildDir = `${generatedDir}/build`;

module.exports = class Paths {

	static create(fileTree) {
		ensure.signature(arguments, [ FileTree ]);

		return new Paths(fileTree);
	}

	constructor(fileTree) {
		this.tasksDir = `${incrementalBuildDir}/tasks`;
		this.generatedDir = generatedDir;

		this._files = fileTree;
	}

	static get rootDir() { return rootDir; }
	static get scratchDir() { return `${generatedDir}/scratch`; }
	static get packageJson() { return `${rootDir}/package.json`; }
	static get timestampsBuildDir() { return `${incrementalBuildDir}/timestamps`; }
	static get successSound() { return `${rootDir}/_build/sounds/success.mp3`; }
	static get failSound() { return `${rootDir}/_build/sounds/fail.m4a`; }
	static get lintErrorSound() { return `${rootDir}/_build/sounds/lint_error.mp3`; }

	static get buildWatchGlobs() {
		return [
			`${rootDir}/_build/**`,
			`${rootDir}/src/**`,
		];
	}

	static get buildRestartGlobs() {
		return [
			`${rootDir}/_build/**`,
			`${rootDir}/package.json`,
		];
	}

	static get universalGlobsToExclude() {
		return [
			`${rootDir}/node_modules/**`,
			`${rootDir}/_build/node_modules/tests/vendor/**`,
		];
	}

	lintFiles() {
		return this._files.matchingFiles("**/*.js");
	}

	unitTestFiles() {
		return this._files.matchingFiles([
			"**/_*_test.js",
		]);
	}

};
