// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ensure = require("util/ensure");
const eslint = require("eslint");
const linter = new (eslint).Linter();
const Reporter = require("tasks/reporter");
const FileSystem = require("infrastructure/file_system");
const lintConfig = require("../config/eslint.conf");
const TaskError = require("tasks/task_error");

module.exports = class Lint {

	static create(fileSystem) {
		ensure.signature(arguments, [ FileSystem ]);

		return new Lint(fileSystem);
	}

	constructor(fileSystem) {
		this._fileSystem = fileSystem;
	}

	async validateAsync({ description, files, config, reporter }) {
		ensure.signature(arguments, [{
			description: String,
			files: Array,
			config: { options: Object },
			reporter: Reporter,
		}]);

		await reporter.quietStartAsync(`Linting ${description}`, async (report) => {
			const filesToLint = await this._fileSystem.findNewerFilesAsync(files, "lint");
			const successes = await Promise.all(filesToLint.map(async (file) => {
				const sourceCode = await this._fileSystem.readTextFileAsync(file);

				const success = await validateSource(report, sourceCode, lintConfig.options, file);
				if (success) await this._fileSystem.writeTimestampFileAsync(file, "lint");
				return success;
			}));
			if (!successes.every((success) => success === true)) throw new TaskError("Lint failed");
		});

	}

};

function validateSource(report, sourceCode, options, filename) {
	const messages = linter.verify(sourceCode, options);
	const pass = (messages.length === 0);

	if (pass) {
		report.progress();
	}
	else {
		let failures = `${filename} failed\n`;
		messages.forEach(function(error) {
			const code = eslint.SourceCode.splitLines(sourceCode)[error.line - 1];
			failures += `${error.line}: ${code.trim()}\n   ${error.message}\n`;
		});
		report.footer(failures);
	}
	return pass;
}
