// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "../util/ensure.ts";
import TaskError from "../tasks/task_error.ts";
import Reporter from "../tasks/reporter.ts";
import Shell from "../infrastructure/shell.ts";

export default class TypeScript {

	readonly #shell: Shell;

	static create(): TypeScript {
		ensure.signature(arguments, []);

		return new TypeScript(Shell.create());
	}

	constructor(shell: Shell) {
		this.#shell = shell;
	}

	async typecheckAndEmitDeclarationFilesAsync({
		description,
		tscBinary,
		typescriptConfigFile,
		outputDir,
		reporter,
	}: {
		description: string;
		tscBinary: string;
		typescriptConfigFile: string;
		outputDir: string;
		reporter: Reporter;
	}): Promise<void> {
		ensure.signature(arguments, [{
			description: String,
			tscBinary: String,
			typescriptConfigFile: String,
			outputDir: String,
			reporter: Reporter,
		}]);

		await reporter.startAsync(`Type-checking ${description}`, async (report) => {
			const command: [string, ...string[]] = [
				tscBinary,
				"-p", typescriptConfigFile,
				"--outDir", outputDir,
				"--noEmit", "false",
				"--declaration", "--emitDeclarationOnly",
				"--pretty",
			];
			report.debug(`\n  Run '${command.join(" ")}'`);

			const { code } = await this.#shell.execWithPreambleAsync.apply(this.#shell, [ "\n\n", ...command ]);
			if (code !== 0) throw new TaskError("Type check failed");
		});
	}

}
