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
		this._reporter = Reporter.create();
		this._paths = undefined;
		this._tasks = undefined;
	}

	async runAsync({ resetTreeCache = false } = {}) {
		ensure.signature(arguments, [[ undefined, {
			resetTreeCache: [ undefined, Boolean ],
		}]]);

		if (resetTreeCache) this._paths = undefined;
		return await TaskCli.create().runAsync(this.#getTasksAsync(), "BUILD OK", "BUILD FAILURE");
	}

	async #getPathsAsync() {
		if (this._paths === undefined) {
			this._paths = await this._reporter.startAsync("Scanning file tree", async () => {
				const fileTree = await this._fileSystem.readFileTreeAsync(Paths.rootDir, Paths.universalGlobsToExclude);
				return Paths.create(fileTree);
			});
		}
		return this._paths;
	}

	#getTasksAsync() {
		if (this._tasks === undefined) {
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
		return this._tasks;
	}

	#defineTasks() {
		const tasks = Tasks.create({ fileSystem: this._fileSystem, incrementalDir: Paths.tasksDir });
		const version = Version.create(this._fileSystem);
		const lint = Lint.create(this._fileSystem);
		const tests = Tests.create(this._fileSystem, Paths.dependencyTreeGlobsToExclude);
		const typescript = TypeScript.create(this._fileSystem);

		tasks.defineTask("default", async() => {
			await tasks.runTasksAsync([ "clean", "quick", "typecheck" ]);
		});

		tasks.defineTask("clean", async () => {
			await this._reporter.startAsync("Deleting generated files", async () => {
				await this._fileSystem.deleteAsync(Paths.generatedDir);
			});
		});

		tasks.defineTask("quick", async () => {
			await tasks.runTasksAsync([ "version", "lint", "unittest" ]);
		});

		tasks.defineTask("version", async () => {
			await version.checkAsync({
				packageJson: Paths.packageJson,
				reporter: this._reporter,
			});
		});

		tasks.defineTask("lint", async () => {
			const paths = await this.#getPathsAsync();

			await lint.validateAsync({
				description: "JavaScript",
				files: paths.lintJavascriptFiles(),
				config: lintJavascriptConfig,
				reporter: this._reporter,
			});

			await lint.validateAsync({
				description: "TypeScript",
				files: paths.lintTypescriptFiles(),
				config: lintTypescriptConfig,
				reporter: this._reporter,
			});
		});

		tasks.defineTask("unittest", async () => {
			const paths = await this.#getPathsAsync();

			await tasks.runTasksAsync([ "compile" ]);

			await tests.runAsync({
				description: "JavaScript tests",
				files: paths.buildTestFiles(),
				config: testConfig,
				reporter: this._reporter,
			});

			await tests.runAsync({
				description: "TypeScript tests",
				files: typescript.mapTsToJs({
					files: paths.srcTestFiles(),
					sourceDir: Paths.typescriptSrcDir,
					outputDir: Paths.typescriptTargetDir,
				}),
				config: testConfig,
				reporter: this._reporter,
			});
		});

		tasks.defineTask("compile", async () => {
			const paths = await this.#getPathsAsync();

			await typescript.compileAsync({
				description: "TypeScript tree",
				files: paths.typescriptFiles(),
				sourceDir: Paths.typescriptSrcDir,
				outputDir: Paths.typescriptTargetDir,
				config: swcConfig,
				reporter: this._reporter,
			});
		});

		tasks.defineTask("typecheck", async () => {
			await typescript.typecheckAndEmitDeclarationFilesAsync({
				description: "TypeScript",
				tscBinary: Paths.tscBinary,
				typescriptConfigFile: Paths.typescriptConfigFile,
				outputDir: Paths.typescriptTargetDir,
				reporter: this._reporter,
			});
		});

		return tasks;
	}
}
