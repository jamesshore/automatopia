// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import FileTree from "../infrastructure/file_tree.ts";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "../..");
const generatedDir = `${rootDir}/generated`;
const incrementalBuildDir = `${generatedDir}/build`;

export default class Paths {

	static create(fileTree) {
		ensure.signature(arguments, [ FileTree ]);

		return new Paths(fileTree);
	}

	constructor(fileTree) {
		this._files = fileTree;
	}

	static get rootDir() { return rootDir; }
	static get generatedDir() { return generatedDir; }
	static get scratchDir() { return `${generatedDir}/scratch`; }
	static get packageJson() { return `${rootDir}/package.json`; }
	static get timestampsBuildDir() { return `${incrementalBuildDir}/timestamps`; }
	static get tasksDir() { return `${incrementalBuildDir}/tasks`; }

	static get tscBinary() { return `${rootDir}/node_modules/typescript/bin/tsc`; }

	static get buildTypescriptConfigFile() { return `${rootDir}/_build/tsconfig.json`; }
	static get buildTypescriptTargetDir() { return `${generatedDir}/_build`; }

	static get srcTypescriptConfigFile() { return `${rootDir}/tsconfig.json`; }
	static get srcTypescriptTargetDir() { return `${generatedDir}/src`; }

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
			`${this.packageJson}`,
		];
	}

	static get universalGlobsToExclude() {
		return [
			`${rootDir}/node_modules/**`,
			`${rootDir}/src/node_modules/tests/vendor/**`,
			`${rootDir}/generated/**`,
		];
	}

	static get dependencyTreeGlobsToExclude() {
		return [
			`${rootDir}/node_modules/**`,
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
			`${rootDir}/_build/**/_*_test.ts`,
		]);
	}

	srcTestFiles() {
		return this._files.matchingFiles([
			`${rootDir}/src/**/_*_test.ts`,
		]);
	}

	srcTestSetupFiles() {
		return this._files.matchingFiles([
			`${rootDir}/src/_test_setup.ts`,
		]);
	}
}
