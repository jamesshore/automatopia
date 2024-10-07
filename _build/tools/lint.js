// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "util/ensure.js";
import Reporter from "tasks/reporter.js";
import FileSystem from "infrastructure/file_system.js";
import TaskError from "tasks/task_error.js";
import Colors from "infrastructure/colors.js";
import { Linter, SourceCode } from "eslint";

export default class Lint {

	static create(fileSystem) {
		ensure.signature(arguments, [ FileSystem ]);

		return new Lint(fileSystem);
	}

	constructor(fileSystem) {
		this._fileSystem = fileSystem;
		this._linter = new Linter();
	}

	async validateAsync({ description, files, config, reporter }) {
		ensure.signature(arguments, [{
			description: String,
			files: Array,
			config: Array,
			reporter: Reporter,
		}]);

		await reporter.quietStartAsync(`Linting ${description}`, async (report) => {
			const filesToLint = await this._fileSystem.findNewerFilesAsync(files, "lint");
			const successes = await Promise.all(filesToLint.map(async (file) => {
				report.started();
				const sourceCode = await this._fileSystem.readTextFileAsync(file);

				const success = await this.#validateSource(report, sourceCode, config, file);

				if (success) await this._fileSystem.writeTimestampFileAsync(file, "lint");
				return success;
			}));
			if (!successes.every((success) => success === true)) throw new TaskError("Lint failed");
		});

	}

	#validateSource(report, sourceCode, options, filename) {
		const messages = this._linter.verify(sourceCode, options);
		const pass = (messages.length === 0);

		if (pass) {
			report.progress();
		}
		else {
			let failures = Colors.brightRed(`\n${this._fileSystem.renderFilename(filename)} failed\n`);
			messages.forEach(function(error) {
				if (error.line) {
					const code = SourceCode.splitLines(sourceCode)[error.line - 1];
					failures += Colors.brightWhite.bold(`${error.line}:`) + ` ${code.trim()}\n  ${error.message}\n`;
					if (error.ruleId !== null) failures += Colors.brightBlack(`  Rule: ${error.ruleId}\n\n`);
				}
				else {
					failures += `${error.message}\n\n`;
				}
			});
			report.failure(`${failures}`);
		}

		return pass;
	}

}
