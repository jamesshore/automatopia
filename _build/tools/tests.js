// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ensure = require("util/ensure");
const Reporter = require("tasks/reporter");
const TaskError = require("tasks/task_error");
const Colors = require("infrastructure/colors");
const FileSystem = require("infrastructure/file_system");
const DependencyTree = require("tasks/dependency_tree");
const TestRunner = require("tests/test_runner");
const TestResult = require("tests/test_result");
const path = require("node:path");

const failColor = Colors.brightRed;
const timeoutColor = Colors.purple;
const skipColor = Colors.cyan;
const passColor = Colors.green;
const summaryColor = Colors.brightWhite.dim;

module.exports = class Tests {

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

		const filesToRun = await findTestFilesAsync(this._fileSystem, reporter, description, this._dependencyTree, files);
		if (filesToRun.length === 0) return;

		await runTestsAsync(reporter, description, this._testRunner, filesToRun, config, this._fileSystem);
	}

};

async function findTestFilesAsync(fileSystem, reporter, description, dependencyTree, files) {
	return await reporter.quietStartAsync(`Finding ${description}`, async (report) => {
		const { changed, errors } = await dependencyTree.findChangedFilesAsync(
			files,
			"test",
			filename => report.progress({ debug: filename }),
		);

		reportErrors(fileSystem, report, errors);
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
						const resolvesTo = path.resolve(file, dependency);
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

async function runTestsAsync(reporter, description, testRunner, filesToRun, config, fileSystem) {
	await reporter.startAsync(`Running ${description}`, async (report) => {
		const testResult = await testRunner.runIsolatedAsync(filesToRun, {
			config,
			notifyFn: testResult => {
				report.progress({ text: testResult.renderCharacter() });
				// if (testResult.isSkip()) report.footer(testResult.renderSingleLine());
			},
		});
		const testCount = testResult.count();

		reportFailures(report, testResult);
		reportSummary(report, testCount);
		await writeTimestampFilesAsync(fileSystem, testResult);

		if (testCount.fail + testCount.timeout > 0) throw new TaskError("Tests failed");
		if (testCount.total - testCount.skip === 0) throw new TaskError("No tests found");
	});
}

async function writeTimestampFilesAsync(fileSystem, testResult) {
	await Promise.all(testResult.allPassingFiles().map(async (testFile) => {
		await fileSystem.writeTimestampFileAsync(testFile, "test");
	}));
}

function reportFailures(report, testResult) {
	const failures = testResult.allMatchingTests(TestResult.STATUS.FAIL, TestResult.STATUS.TIMEOUT);
	failures.forEach(failure => {
		report.footer("\n" + failure.renderMultiLine() + "\n");
	});
}

function reportSummary(report, testCount) {
	const { total, pass, fail, timeout, skip } = testCount;

	report.footer(
		summaryColor("(") +
		renderCount(fail, "failed", failColor) +
		renderCount(timeout, "timed out", timeoutColor) +
		renderCount(skip, "skipped", skipColor) +
		renderCount(pass, "passed", passColor) +
		renderMsEach(report.elapsedMs, total, skip) +
		summaryColor(")") + "\n"
	);

	function renderCount(number, description, color) {
		if (number === 0) {
			return "";
		}
		else {
			return color(`${number} ${description}; `);
		}
	}

	function renderMsEach(elapsedMs, total, skip) {
		if (total - skip === 0) return summaryColor("none ran");

		const msEach = (elapsedMs / (total - skip)).toFixed(1);
		return summaryColor(`${msEach}ms avg.`);
	}
}