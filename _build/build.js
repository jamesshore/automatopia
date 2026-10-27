// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "./util/ensure.ts";
import Tasks from "./tasks/tasks.ts";
import TaskCli from "./tasks/task_cli.ts";
import Reporter from "./tasks/reporter.ts";
import FileSystem from "./infrastructure/file_system.ts";
import Version from "./tools/version.ts";
import Lint from "./tools/lint.ts";
import Tests from "./tools/tests.ts";
import TypeScript from "./tools/typescript.ts";
import Paths from "./config/paths.ts";
import testConfig from "./config/tests.conf.ts";
import lintJavascriptConfig from "./config/eslint.javascript.config.ts";
import lintTypescriptConfig from "./config/eslint.typescript.config.ts";

export default class Build {

	static create() {
		ensure.signature(arguments, []);

		return new Build();
	}

	constructor() {
		this._fileSystem = FileSystem.create(Paths.rootDir, Paths.timestampsBuildDir);
		this._paths = undefined;

		this._tasks = this.#defineTasks();
		this._tasks.setDescriptions({
			default: "Clean and rebuild",
			clean: "Erase all generated files (resets incremental build)",
			quick: "Perform an incremental build",
			version: "Check Node.js version",
			lint: "Lint JavaScript code (incremental)",
			unittest: "Run unit tests (incremental)",
			typecheck: "Type-check TypeScript and create declaration files",
		});
	}

	async runAsync({ resetTreeCache = false } = {}) {
		ensure.signature(arguments, [[ undefined, {
			resetTreeCache: [ undefined, Boolean ],
		}]]);

		if (resetTreeCache) this._paths = undefined;
		return await TaskCli.create().runAsync(this._tasks, "BUILD OK", "BUILD FAILURE", async (taskNames, options) => {
			const reporter = Reporter.create({ debug: options.debug === true });

			await this._tasks.runTasksAsync(taskNames, { reporter });
		});
	}

	async #getPathsAsync(reporter) {
		if (this._paths === undefined) {
			this._paths = await reporter.startAsync("Scanning file tree", async (report) => {
				report.debug(`\n  Scan ${Paths.rootDir}`);
				report.debug(`\n  Ignore [\n    ${Paths.universalGlobsToExclude.join("\n    ")}\n  ]`);
				const fileTree = await this._fileSystem.readFileTreeAsync(Paths.rootDir, Paths.universalGlobsToExclude);
				return Paths.create(fileTree);
			});
		}
		return this._paths;
	}

	#defineTasks() {
		const tasks = Tasks.create({ fileSystem: this._fileSystem, incrementalDir: Paths.tasksDir });
		const version = Version.create(this._fileSystem);
		const lint = Lint.create(this._fileSystem);
		const tests = Tests.create(this._fileSystem, Paths.dependencyTreeGlobsToExclude);
		const typescript = TypeScript.create();

		tasks.defineTask("default", async(options) => {
			await tasks.runTasksAsync([ "clean", "quick", "typecheck" ], options);
		});

		tasks.defineTask("clean", async (options) => {
			await options.reporter.startAsync("Deleting generated files", async (report) => {
				report.debug(`\n  Delete ${Paths.generatedDir}`);
				await this._fileSystem.deleteAsync(Paths.generatedDir);
			});
		});

		tasks.defineTask("quick", async (options) => {
			await tasks.runTasksAsync([ "version", "lint", "unittest" ], options);
		});

		tasks.defineTask("version", async (options) => {
			await version.checkAsync({
				packageJson: Paths.packageJson,
				reporter: options.reporter,
			});
		});

		tasks.defineTask("lint", async (options) => {
			const paths = await this.#getPathsAsync(options.reporter);

			await lint.validateAsync({
				description: "JavaScript",
				files: paths.lintJavascriptFiles(),
				config: lintJavascriptConfig,
				reporter: options.reporter,
			});

			await lint.validateAsync({
				description: "TypeScript",
				files: paths.lintTypescriptFiles(),
				config: lintTypescriptConfig,
				reporter: options.reporter,
			});
		});

		tasks.defineTask("unittest", async (options) => {
			const paths = await this.#getPathsAsync(options.reporter);

			await tests.runAsync({
				description: "build tests",
				testFiles: paths.buildTestFiles(),
				config: testConfig,
				reporter: options.reporter,
			});

			await tests.runAsync({
				description: "src tests",
				testFiles: paths.srcTestFiles(),
				setupFiles: paths.srcTestSetupFiles(),
				config: testConfig,
				reporter: options.reporter,
			});
		});

		tasks.defineTask("typecheck", async (options) => {
			await typescript.typecheckAndEmitDeclarationFilesAsync({
				description: "build",
				tscBinary: Paths.tscBinary,
				typescriptConfigFile: Paths.buildTypescriptConfigFile,
				outputDir: Paths.buildTypescriptTargetDir,
				reporter: options.reporter,
			});

			await typescript.typecheckAndEmitDeclarationFilesAsync({
				description: "src",
				tscBinary: Paths.tscBinary,
				typescriptConfigFile: Paths.srcTypescriptConfigFile,
				outputDir: Paths.srcTypescriptTargetDir,
				reporter: options.reporter,
			});
		});

		return tasks;
	}
}
