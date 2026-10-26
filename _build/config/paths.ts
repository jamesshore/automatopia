// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import FileTree from "../infrastructure/file_tree.ts";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "../..");
const generatedDir = `${rootDir}/generated`;
const incrementalBuildDir = `${generatedDir}/build`;

export default class Paths {

	private readonly _files: FileTree;

	static create(fileTree: FileTree): Paths {
		ensure.signature(arguments, [ FileTree ]);

		return new Paths(fileTree);
	}

	constructor(fileTree: FileTree) {
		this._files = fileTree;
	}

	static get rootDir(): string { return rootDir; }
	static get generatedDir(): string { return generatedDir; }
	static get scratchDir(): string { return `${generatedDir}/scratch`; }
	static get packageJson(): string { return `${rootDir}/package.json`; }
	static get timestampsBuildDir(): string { return `${incrementalBuildDir}/timestamps`; }
	static get tasksDir(): string { return `${incrementalBuildDir}/tasks`; }

	static get tscBinary(): string { return `${rootDir}/node_modules/typescript/bin/tsc`; }

	static get buildTypescriptConfigFile(): string { return `${rootDir}/_build/tsconfig.json`; }
	static get buildTypescriptTargetDir(): string { return `${generatedDir}/_build`; }

	static get srcTypescriptConfigFile(): string { return `${rootDir}/tsconfig.json`; }
	static get srcTypescriptTargetDir(): string { return `${generatedDir}/src`; }

	static get successSound(): string { return `${rootDir}/_build/sounds/success.mp3`; }
	static get failSound(): string { return `${rootDir}/_build/sounds/fail.m4a`; }
	static get lintErrorSound(): string { return `${rootDir}/_build/sounds/lint_error.mp3`; }

	static get buildWatchGlobs(): string[] {
		return [
			`${rootDir}/src/**`,
			`${rootDir}/tsconfig.json`,
		];
	}

	static get buildRestartGlobs(): string[] {
		return [
			`${rootDir}/_build/**`,
			`${this.packageJson}`,
		];
	}

	static get universalGlobsToExclude(): string[] {
		return [
			`${rootDir}/node_modules/**`,
			`${rootDir}/src/node_modules/tests/vendor/**`,
			`${rootDir}/generated/**`,
		];
	}

	static get dependencyTreeGlobsToExclude(): string[] {
		return [
			`${rootDir}/node_modules/**`,
			`${rootDir}/src/node_modules/tests/vendor/**`,
		];
	}

	lintJavascriptFiles(): string[] {
		return this._files.matchingFiles([
			"**/*.js",
		], [
		]);
	}

	lintTypescriptFiles(): string[] {
		return this._files.matchingFiles([
			"**/*.ts",
		]);
	}

	buildTestFiles(): string[] {
		return this._files.matchingFiles([
			`${rootDir}/_build/**/_*_test.js`,
			`${rootDir}/_build/**/_*_test.ts`,
		]);
	}

	srcTestFiles(): string[] {
		return this._files.matchingFiles([
			`${rootDir}/src/**/_*_test.ts`,
		]);
	}

	srcTestSetupFiles(): string[] {
		return this._files.matchingFiles([
			`${rootDir}/src/_test_setup.ts`,
		]);
	}
}
