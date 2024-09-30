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

	static get tscBinary() { return `${rootDir}/node_modules/typescript/bin/tsc`; }
	static get typescriptConfigFile() { return `${rootDir}/tsconfig.json`; }

	static get typescriptSrcDir() { return `${rootDir}/src`; }
	static get typescriptTargetDir() { return `${generatedDir}/src`; }

	static get successSound() { return `${rootDir}/_build/sounds/success.mp3`; }
	static get failSound() { return `${rootDir}/_build/sounds/fail.m4a`; }
	static get lintErrorSound() { return `${rootDir}/_build/sounds/lint_error.mp3`; }

	static get buildWatchGlobs() {
		return [
			`${rootDir}/src/**`,
			`${rootDir}/tsconfig.json`,
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
			`${rootDir}/src/node_modules/tests/vendor/**`,
			`${rootDir}/generated/**`,
		];
	}

	static get dependencyTreeGlobsToExclude() {
		return [
			`${rootDir}/node_modules/**`,
			`${rootDir}/_build/node_modules/tests/vendor/**`,
			`${rootDir}/src/node_modules/tests/vendor/**`,
		];
	}

	lintJavascriptFiles() {
		return this._files.matchingFiles([
			"**/*.js",
		], [
		]);
	}

	lintTypescriptFiles() {
		return this._files.matchingFiles([
			"**/*.ts",
		]);
	}

	buildTestFiles() {
		return this._files.matchingFiles([
			`${rootDir}/_build/**/_*_test.js`,
		]);
	}

	srcTestFiles() {
		return this._files.matchingFiles([
			`${rootDir}/src/**/_*_test.ts`,
		]);
	}

	typescriptFiles() {
		return this._files.matchingFiles([
			`${rootDir}/src/**/*.ts`,
		]);
	}

};
