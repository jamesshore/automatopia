// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "../util/ensure.ts";
import Reporter from "../tasks/reporter.ts";
import FileSystem from "../infrastructure/file_system.ts";
import TaskError from "../tasks/task_error.ts";
import Colors from "../infrastructure/colors.ts";
import { Linter, SourceCode } from "eslint";

type Report = InstanceType<typeof Reporter.Report>;

export default class Lint {

	private readonly _fileSystem: FileSystem;
	private readonly _linter: Linter;

	static create(fileSystem: FileSystem): Lint {
		ensure.signature(arguments, [ FileSystem ]);

		return new Lint(fileSystem);
	}

	constructor(fileSystem: FileSystem) {
		this._fileSystem = fileSystem;
		this._linter = new Linter();
	}

	async validateAsync({ description, files, config, reporter }: {
		description: string;
		files: string[];
		config: Linter.Config[];
		reporter: Reporter;
	}): Promise<void> {
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
				report.debug(`\n  Lint ${file}`);

				const success = await this.#validateSource(report, sourceCode, config, file);

				if (success) await this._fileSystem.writeTimestampFileAsync(file, "lint");
				return success;
			}));
			if (!successes.every((success) => success === true)) throw new TaskError("Lint failed");
		});

	}

	#validateSource(report: Report, sourceCode: string, options: Linter.Config[], filename: string): boolean {
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
