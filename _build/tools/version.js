// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ensure = require("util/ensure");
const Reporter = require("tasks/reporter");
const TaskError = require("tasks/task_error");
const FileSystem = require("infrastructure/file_system");

module.exports = class Version {

	static create(fileSystem) {
		ensure.signature(arguments, [ FileSystem ]);

		return new Version(fileSystem);
	}

	constructor(fileSystem) {
		this._fileSystem = fileSystem;
		this._checked = false;
	}

	async checkAsync({ packageJson, reporter }) {
		ensure.signature(arguments, [{
			packageJson: String,
			reporter: Reporter,
		}]);

		if (this._checked) return;
		await reporter.startAsync("Checking Node.js version", async () => {
			const json = await this._fileSystem.readTextFileAsync(packageJson);
			const expectedVersion = "v" + JSON.parse(json).engines.node;
			const actualVersion = process.version;

			if (expectedVersion !== actualVersion) {
				throw new TaskError(`Incorrect Node version. Expected ${expectedVersion}, but was ${actualVersion}.`);
			}
			this._checked = true;
		});
	}

};
