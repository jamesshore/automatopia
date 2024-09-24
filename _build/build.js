// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ensure = require("util/ensure");
const Tasks = require("tasks/tasks");
const TaskCli = require("tasks/task_cli");
const Reporter = require("tasks/reporter");
const FileSystem = require("infrastructure/file_system");
const Shell = require("infrastructure/shell");
const Version = require("./tools/version");
const Lint = require("./tools/lint");
const Tests = require("./tools/tests");
const Paths = require("./config/paths");
const testConfig = require("./config/tests.conf");
const lintConfig = require("./config/eslint.conf");

module.exports = class Build {

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

		if (this._paths === undefined || resetTreeCache) {
			this._paths = await scanFileTreeAsync(this._fileSystem, this._reporter);
		}
		if (this._tasks === undefined) {
			this._tasks = defineTasks(this);
			this._tasks.setDescriptions({
				default: "Clean and rebuild",
				clean: "Erase all generated and incremental files",
				quick: "Perform an incremental build",
				version: "Check Node.js version",
				lint: "Lint JavaScript code (incremental)",
				unittest: "Run unit tests (incremental)",
			});
		}

		return await TaskCli.create().runAsync(this._tasks, "BUILD OK", "BUILD FAILURE");
	}

};


async function scanFileTreeAsync(fileSystem, reporter) {
	return await reporter.startAsync("Scanning file tree", async () => {
		const fileTree = await fileSystem.readFileTreeAsync(Paths.rootDir, Paths.universalGlobsToExclude);
		return Paths.create(fileTree);
	});
}

function defineTasks(self) {
	const tasks = Tasks.create({ fileSystem: self._fileSystem, incrementalDir: self._paths.tasksDir });
	const lint = Lint.create(self._fileSystem);
	const tests = Tests.create(self._fileSystem, Paths.universalGlobsToExclude);
	const version = Version.create(self._fileSystem);

	tasks.defineTask("default", async() => {
		await tasks.runTasksAsync([ "clean", "quick" ]);
	});

	tasks.defineTask("clean", async () => {
		await self._reporter.startAsync("Deleting generated files", async () => {
			await self._fileSystem.deleteAsync(self._paths.generatedDir);
		});
	});

	tasks.defineTask("quick", async () => {
		await tasks.runTasksAsync([ "version", "lint", "unittest" ]);
	});

	tasks.defineTask("version", async () => {
		await version.checkAsync({
			packageJson: Paths.packageJson,
			reporter: self._reporter,
		});
	});

	tasks.defineTask("lint", async () => {
		await lint.validateAsync({
			description: "JavaScript",
			files: self._paths.lintFiles(),
			config: lintConfig,
			reporter: self._reporter,
		});
	});

	tasks.defineTask("unittest", async () => {
		await tests.runAsync({
			description: "unit tests",
			files: self._paths.unitTestFiles(),
			config: testConfig,
			reporter: self._reporter,
		});
	});

	return tasks;
}
