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
import lintConfig from "./config/eslint.config.ts";
import type { Linter } from "eslint";

interface TaskParameters {
	reporter: Reporter;
}

export default class Build {

	readonly #fileSystem: FileSystem;
	readonly #tasks: Tasks<TaskParameters>;
	#paths: Paths | undefined;

	static create(): Build {
		ensure.signature(arguments, []);

		return new Build();
	}

	constructor() {
		this.#fileSystem = FileSystem.create(Paths.rootDir, Paths.timestampsBuildDir);
		this.#paths = undefined;

		this.#tasks = this.#defineTasks();
		this.#tasks.setDescriptions({
			default: "Clean and rebuild",
			clean: "Erase all generated files (resets incremental build)",
			quick: "Perform an incremental build",
			version: "Check Node.js version",
			lint: "Lint TypeScript code",
			unittest: "Run unit tests",
			typecheck: "Type-check TypeScript and create declaration files",
		});
	}

	async runAsync({ resetTreeCache = false }: { resetTreeCache?: boolean } = {}): Promise<string | null> {
		ensure.signature(arguments, [[ undefined, {
			resetTreeCache: [ undefined, Boolean ],
		}]]);

		if (resetTreeCache) this.#paths = undefined;
		return await TaskCli.create().runAsync(this.#tasks, "BUILD OK", "BUILD FAILURE", async (taskNames, options) => {
			const reporter = Reporter.create({ debug: options.debug === true });

			await this.#tasks.runTasksAsync(taskNames, { reporter });
		});
	}

	async #getPathsAsync(reporter: Reporter): Promise<Paths> {
		if (this.#paths === undefined) {
			this.#paths = await reporter.startAsync("Scanning file tree", async (report) => {
				report.debug(`\n  Scan ${Paths.rootDir}`);
				report.debug(`\n  Ignore [\n    ${Paths.globsToExclude.join("\n    ")}\n  ]`);
				const fileTree = await this.#fileSystem.readFileTreeAsync(Paths.rootDir, Paths.globsToExclude);
				return Paths.create(fileTree);
			});
		}
		return this.#paths;
	}

	#defineTasks(): Tasks<TaskParameters> {
		const tasks = Tasks.create<TaskParameters>({ fileSystem: this.#fileSystem, incrementalDir: Paths.tasksDir });
		const version = Version.create(this.#fileSystem);
		const lint = Lint.create(this.#fileSystem);
		const tests = Tests.create(this.#fileSystem, Paths.globsToExclude);
		const typescript = TypeScript.create();

		tasks.defineTask("default", async(options) => {
			await tasks.runTasksAsync([ "clean", "quick", "typecheck" ], options);
		});

		tasks.defineTask("clean", async (options) => {
			await options.reporter.startAsync("Deleting generated files", async (report) => {
				report.debug(`\n  Delete ${Paths.generatedDir}`);
				await this.#fileSystem.deleteAsync(Paths.generatedDir);
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
				description: "TypeScript",
				files: paths.lintFiles(),
				config: lintConfig as Linter.Config[],
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
