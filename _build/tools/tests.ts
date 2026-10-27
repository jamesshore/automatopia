// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "../util/ensure.ts";
import Reporter from "../tasks/reporter.ts";
import TaskError from "../tasks/task_error.ts";
import Colors from "../infrastructure/colors.ts";
import FileSystem from "../infrastructure/file_system.ts";
import DependencyTree, { type DependencyError } from "../tasks/dependency_tree.ts";
import { TestRunner, type TestSuiteResult } from "ergotest";
import path from "node:path";

type Report = InstanceType<typeof Reporter.Report>;
type TestConfig = NonNullable<NonNullable<Parameters<TestRunner["runInChildProcessAsync"]>[1]>["config"]>;

export default class Tests {

	readonly #fileSystem: FileSystem;
	readonly #dependencyTree: DependencyTree;
	readonly #testRunner: TestRunner;

	static create(fileSystem: FileSystem, globsToIgnore: string[]): Tests {
		ensure.signature(arguments, [ FileSystem, Array ]);

		return new Tests(fileSystem, globsToIgnore);
	}

	constructor(fileSystem: FileSystem, globsToIgnore: string[]) {
		this.#fileSystem = fileSystem;
		this.#dependencyTree = DependencyTree.create(fileSystem, globsToIgnore);
		this.#testRunner = TestRunner.create();
	}

	async runAsync({
		description,
		testFiles,
		setupFiles = [],
		config,
		failOnSkip = false,
		reporter
	}: {
		description: string;
		testFiles: string[];
		setupFiles?: string[];
		config: TestConfig;
		failOnSkip?: boolean;
		reporter: Reporter;
	}): Promise<void> {
		ensure.signature(arguments, [{
			description: String,
			testFiles: Array,
			setupFiles: [ undefined, Array ],
			config: Object,
			failOnSkip: [ undefined, Boolean ],
			reporter: Reporter,
		}]);

		const filesToRun = await this.#findTestFilesAsync(reporter, description, setupFiles, testFiles);

		if (filesToRun.length !== 0) {
			await this.#runTestsAsync(reporter, description, filesToRun, setupFiles, failOnSkip, config);
		}
	}

	async #findTestFilesAsync(reporter: Reporter, description: string, setupFiles: string[], testFiles: string[]): Promise<string[]> {
		const dependencyTree = this.#dependencyTree;
		const fileSystem = this.#fileSystem;

		return await reporter.quietStartAsync(`Finding ${description}`, async (report) => {
			const setupFilesChanged = await findChangedFilesAsync(setupFiles, report);

			if (setupFilesChanged.length > 0) return testFiles;
			else return await findChangedFilesAsync(testFiles, report);
		});

		async function findChangedFilesAsync(filesToCheck: string[], report: Report): Promise<string[]> {
			const result = await dependencyTree.findChangedFilesAsync(
				filesToCheck,
				"test",
				(filename) => {
					report.debug(`\n  Analyze ${filename}`);
					report.progress();
				},
			);

			if (result.errors !== undefined) {
				reportErrors(fileSystem, report, result.errors);
				throw new TaskError("Dependency analysis failed");
			}

			return result.changed;
		}

		function reportErrors(fileSystem: FileSystem, report: Report, errors: DependencyError[]): void {
			const errorsByFile: Record<string, DependencyError[]> = {};

			errors.forEach((error) => {
				if (errorsByFile[error.file] === undefined) errorsByFile[error.file] = [];
				errorsByFile[error.file].push(error);
			});

			Object.keys(errorsByFile).forEach(file => {
				report.footer(Colors.brightRed(`\n${fileSystem.renderFilename(file)} failed`));

				errorsByFile[file].forEach((entry) => {
					if (entry.error === DependencyTree.ERRORS.DEPENDENCY_NOT_FOUND) {
						const { error, file, dependency, line, source } = entry;
						let failure = Colors.brightWhite.bold(`\n${line}: `) + `${source}\n  ${error}\n`;
						if (dependency.startsWith(".")) {
							const resolvesTo = path.resolve(path.dirname(file), dependency);
							failure += Colors.brightBlack(`  Resolves to: ${fileSystem.renderFilename(resolvesTo)}\n`);
						}
						report.footer(failure);
					}
					else {
						report.footer(`\n${entry.error}\n`);
					}
				});
				report.footer("\n");
			});
		}
	}

	async #runTestsAsync(reporter: Reporter, description: string, filesToRun: string[], setupFiles: string[], failOnSkip: boolean, config: TestConfig): Promise<void> {
		await reporter.startAsync(`Running ${description}`, async (report) => {
			const testResult = await this.#testRunner.runInChildProcessAsync(filesToRun, {
				setupModulePaths: setupFiles,
				timeout: 10000,
				config,
				onTestCaseResult: testResult => {
					report.debug("\n  " + testResult.renderAsSingleLine());
					report.progress(testResult.renderAsCharacter());
				},
			});
			await this.#writeTimestampFilesAsync(testResult);

			report.footer(testResult.render("\n", report.elapsedMs) + "\n");

			const testCount = testResult.count();
			if (testCount.fail + testCount.timeout > 0) throw new TaskError("Tests failed");
			if (failOnSkip && testCount.skip > 0) throw new TaskError("Tests were skipped");
			if (testCount.total - testCount.skip === 0) throw new TaskError("No tests found");
		});
	}

	async #writeTimestampFilesAsync(testResult: TestSuiteResult): Promise<void> {
		await Promise.all(testResult.allPassingFiles().map(async (testFile) => {
			await this.#fileSystem.writeTimestampFileAsync(testFile, "test");
		}));
	}

}
