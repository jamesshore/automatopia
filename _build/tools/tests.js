// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "util/ensure.js";
import Reporter from "tasks/reporter.js";
import TaskError from "tasks/task_error.js";
import Colors from "infrastructure/colors.js";
import FileSystem from "infrastructure/file_system.js";
import DependencyTree from "tasks/dependency_tree.js";
import { TestRunner } from "tests/test_runner.js";
import path from "node:path";

export default class Tests {

	static create(fileSystem, globsToIgnore) {
		ensure.signature(arguments, [ FileSystem, Array ]);

		return new Tests(fileSystem, globsToIgnore);
	}

	constructor(fileSystem, globsToIgnore) {
		this._fileSystem = fileSystem;
		this._dependencyTree = DependencyTree.create(fileSystem, globsToIgnore);
		this._testRunner = TestRunner.create();
	}

	async runAsync({ description, files, config, reporter }) {
		ensure.signature(arguments, [{
			description: String,
			files: Array,
			config: Object,
			reporter: Reporter,
		}]);

		const filesToRun = await this.#findTestFilesAsync(reporter, description, files);
		if (filesToRun.length === 0) return;

		await this.#runTestsAsync(reporter, description, filesToRun, config);
	}

	async #findTestFilesAsync(reporter, description, files) {
		return await reporter.quietStartAsync(`Finding ${description}`, async (report) => {
			const { changed, errors } = await this._dependencyTree.findChangedFilesAsync(
				files,
				"test",
				(filename) => {
					report.debug(`\n  Analyze ${filename}`);
					report.progress();
				},
			);

			reportErrors(this._fileSystem, report, errors);
			if (errors.length !== 0) throw new TaskError("Dependency analysis failed");

			return changed;
		});

		function reportErrors(fileSystem, report, errors) {
			const errorsByFile = {};

			errors.forEach((error) => {
				if (errorsByFile[error.file] === undefined) errorsByFile[error.file] = [];
				errorsByFile[error.file].push(error);
			});

			Object.keys(errorsByFile).forEach(file => {
				report.footer(Colors.brightRed(`\n${fileSystem.renderFilename(file)} failed`));

				errorsByFile[file].forEach(({ error, file, dependency, line, source }) => {
					if (error === DependencyTree.ERRORS.DEPENDENCY_NOT_FOUND) {
						let failure = Colors.brightWhite.bold(`\n${line}: `) + `${source}\n  ${error}\n`;
						if (dependency.startsWith(".")) {
							const resolvesTo = path.resolve(path.dirname(file), dependency);
							failure += Colors.brightBlack(`  Resolves to: ${fileSystem.renderFilename(resolvesTo)}\n`);
						}
						report.footer(failure);
					}
					else {
						report.footer(`\n${error}\n`);
					}
				});
				report.footer("\n");
			});
		}
	}

	async #runTestsAsync(reporter, description, filesToRun, config) {
		await reporter.startAsync(`Running ${description}`, async (report) => {
			const testResult = await this._testRunner.runInChildProcessAsync(filesToRun, {
				config,
				notifyFn: testResult => {
					report.debug("\n  " + testResult.renderAsSingleLine());
					report.progress(testResult.renderAsCharacter());
				},
			});
			await this.#writeTimestampFilesAsync(testResult);

			report.footer(testResult.render("\n", report.elapsedMs) + "\n");

			const testCount = testResult.count();
			if (testCount.fail + testCount.timeout > 0) throw new TaskError("Tests failed");
			if (testCount.total - testCount.skip === 0) throw new TaskError("No tests found");
		});
	}

	async #writeTimestampFilesAsync(testResult) {
		await Promise.all(testResult.allPassingFiles().map(async (testFile) => {
			await this._fileSystem.writeTimestampFileAsync(testFile, "test");
		}));
	}

}
