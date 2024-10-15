// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "util/ensure.js";
import Tasks from "tasks/tasks.js";
import TaskCli from "tasks/task_cli.js";
import Reporter from "tasks/reporter.js";
import FileSystem from "infrastructure/file_system.js";
import Version from "./tools/version.js";
import Lint from "./tools/lint.js";
import Tests from "./tools/tests.js";
import TypeScript from "./tools/typescript.js";
import Paths from "./config/paths.js";
import testConfig from "./config/tests.conf.js";
import lintJavascriptConfig from "./config/eslint.javascript.config.js";
import lintTypescriptConfig from "./config/eslint.typescript.config.js";
import swcConfig from "./config/swc.conf.js";

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
			compile: "Compile TypeScript (incremental)",
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
		const typescript = TypeScript.create(this._fileSystem);

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

			await tasks.runTasksAsync([ "compile" ], options);

			await tests.runAsync({
				description: "JavaScript tests",
				files: paths.buildTestFiles(),
				config: testConfig,
				reporter: options.reporter,
			});

			await tests.runAsync({
				description: "TypeScript tests",
				files: typescript.mapTsToJs({
					files: paths.srcTestFiles(),
					sourceDir: Paths.typescriptSrcDir,
					outputDir: Paths.typescriptTargetDir,
				}),
				config: testConfig,
				reporter: options.reporter,
			});
		});

		tasks.defineTask("compile", async (options) => {
			const paths = await this.#getPathsAsync(options.reporter);

			await typescript.compileAsync({
				description: "TypeScript tree",
				files: paths.typescriptFiles(),
				sourceDir: Paths.typescriptSrcDir,
				outputDir: Paths.typescriptTargetDir,
				config: swcConfig,
				reporter: options.reporter,
			});
		});

		tasks.defineTask("typecheck", async (options) => {
			await typescript.typecheckAndEmitDeclarationFilesAsync({
				description: "TypeScript",
				tscBinary: Paths.tscBinary,
				typescriptConfigFile: Paths.typescriptConfigFile,
				outputDir: Paths.typescriptTargetDir,
				reporter: options.reporter,
			});
		});

		return tasks;
	}
}
