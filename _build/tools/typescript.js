// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "../util/ensure.ts";
import TaskError from "../tasks/task_error.js";
import Reporter from "../tasks/reporter.js";
import Shell from "../infrastructure/shell.js";

export default class TypeScript {

	static create() {
		ensure.signature(arguments, []);

		return new TypeScript(Shell.create());
	}

	constructor(shell) {
		this._shell = shell;
	}

	async typecheckAndEmitDeclarationFilesAsync({
		description,
		tscBinary,
		typescriptConfigFile,
		outputDir,
		reporter,
	}) {
		ensure.signature(arguments, [{
			description: String,
			tscBinary: String,
			typescriptConfigFile: String,
			outputDir: String,
			reporter: Reporter,
		}]);


		await reporter.startAsync(`Type-checking ${description}`, async (report) => {
			const command = [
				tscBinary,
				"-p", typescriptConfigFile,
				"--outDir", outputDir,
				"--noEmit", "false",
				"--declaration", "--emitDeclarationOnly",
				"--pretty",
			];
			report.debug(`\n  Run '${command.join(" ")}'`);

			const { code } = await this._shell.execWithPreambleAsync.apply(this._shell, [ "\n\n", ...command ]);
			if (code !== 0) throw new TaskError("Type check failed");
		});
	}

}
