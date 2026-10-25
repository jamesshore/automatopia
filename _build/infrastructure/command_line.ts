// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import minimist from "minimist";
import EventEmitter from "node:events";

interface NarrowedProcess {
	argv: string[];
}

export type NulledCommandLineOptions = { args?: string[] };

/** Wrapper for command-line parameters. */
export default class CommandLine {

	private readonly _process: NarrowedProcess;
	private readonly _emitter: EventEmitter;

	/**
	 * Factory method. Wraps the process's command-line arguments.
	 * @returns {CommandLine} The instance.
	 */
	static create(): CommandLine {
		ensure.signature(arguments, []);
		return new CommandLine(process);
	}

	/**
	 * Factory method. Simulates command-line arguments.
	 * @param {string[]} [args] Simulated arguments. Defaults to none.
	 * @returns {CommandLine} The instance.
	 */
	static createNull({ args = [] }: NulledCommandLineOptions = {}): CommandLine {
		ensure.signature(arguments, [[ undefined, { args: Array } ]]);

		return new CommandLine(new NullProcess(args));
	}

	/** For internal use only. (Use a factory method instead.) */
	constructor(proc: NarrowedProcess) {
		this._process = proc;
		this._emitter = new EventEmitter();
	}

	/**
	 * @returns {string[]} The raw command-line arguments provided to Node, not including 'node' or the filename.
	 */
	get rawArguments(): string[] {
		ensure.signature(arguments, []);
		return this._process.argv.slice(2);
	}

	/**
	 * @returns {string[]} The command-line arguments that can be interpreted as commands (that is, that don't start with
	 *   a hyphen).
	 */
	get commands(): string[] {
		ensure.signature(arguments, []);

		const parsedArgs = parseArgs(this.rawArguments);
		return parsedArgs._;
	}

	/**
	 * @returns {object>} The command-line arguments that can be interpreted as options (that is, that start with a
	 *   hyphen), along with any values for those arguments. For example, `-T` will be returned as `{ T: true }` and
	 *   `--file=my_file` will be returned as `{ file: "my_file" }`. Performs basic type conversion on option values.
	 */
	get options(): Record<string, unknown> {
		ensure.signature(arguments, []);

		const parsedArgs: Record<string, unknown> = parseArgs(this.rawArguments);
		delete parsedArgs._;
		return parsedArgs;
	}

}

function parseArgs(args: string[]): minimist.ParsedArgs {
	return minimist(args, { "--": true });
}



class NullProcess implements NarrowedProcess {

	private readonly _args: string[];

	constructor(args: string[]) {
		this._args = args;
	}

	get argv(): string[] {
		return [ "null_process_node", "null_process_script.js", ...this._args ];
	}

}