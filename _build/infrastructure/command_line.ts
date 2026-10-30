// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import minimist from "minimist";
import EventEmitter from "node:events";
import * as util from "node:util";

interface NarrowedProcess {
	argv: string[];
}

// This grotesque bit of type magic is used to automatically set the type of parseArgs()'s return value to
// match what's supplied in the option spec.
export type CommandLineOptions<S extends CommandLineOptionsSpec> = {
	[K in keyof S]: OptionValue<S[K]> | (S[K] extends { default: NonNullable<unknown> } ? never : undefined);
};
type OptionValue<S> = S extends { type: "boolean" } ? boolean :
	S extends { type: "string"; multiple: true } ? string[] :
	S extends { type: "string" } ? string : never;

export interface CommandLineError {
	error: string;
}

export interface CommandLineOptionsSpec {
	[optionLongName: string]:
		BooleanCommandLineOptionSpec | SingleStringCommandLineOptionSpec | MultipleStringCommandLineOptionSpec;
}

interface CommandLineOption {
	short?: string;
}

export interface BooleanCommandLineOptionSpec extends CommandLineOption {
	type: "boolean";
	default?: boolean;
}

interface StringCommandLineOptionSpec extends CommandLineOption {
	type: "string";
}

export interface SingleStringCommandLineOptionSpec extends StringCommandLineOptionSpec {
	multiple?: false;
	default?: string;
}

export interface MultipleStringCommandLineOptionSpec extends StringCommandLineOptionSpec {
	multiple: true;
	default?: string[];
}

export type NulledCommandLineOptions = { args?: string[] };

/** Wrapper for command-line parameters. */
export default class CommandLine {

	readonly #process: NarrowedProcess;
	readonly #emitter: EventEmitter;

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
		this.#process = proc;
		this.#emitter = new EventEmitter();
	}

	/**
	 * @returns {string[]} The raw command-line arguments provided to Node, not including 'node' or the filename.
	 */
	get rawArguments(): string[] {
		ensure.signature(arguments, []);
		return this.#process.argv.slice(2);
	}

	/**
	 * Parse command-line arguments into tasks and options.
	 *
	 * @param {CommandLineOptionsSpec} [options] An object containing the options that are allowed. Put the long name of
	 *   each option in the key and its specification in the value. E.g., "--myOption" is specified as `{ myOption: {...}
	 *   }`. The specification object may contain the following values:
	 *   - "type": Use `{ type: "boolean" }` for flags or `{ type: "string" }` for options that take a value.
	 *     Boolean options return `true` when supplied as `--option` and `false` when supplied as `--no-option`.
	 *     String option values can be provided as `--option=value` or `--option value`.
	 *   - "short": The one-character version of this option.
	 *   - "multiple": For string options only. Set to `true` to allow an option to be supplied multiple times. Its
	 *     values are returned in an array in command-line order. If false, the last supplied value is returned for a
	 *     repeated option. Defaults to false.
	 *   - "default": The value returned when the option is not supplied.
	 *
	 *   If an unknown option is encountered, an error will be returned. Node also reports errors for invalid option
	 *   values, including passing a value to a boolean option. Repeated options use Node's behavior: the last value wins
	 *   unless `multiple` is `true`.
	 *
	 * @returns {{tasks: string[], options: CommandLineOptions} | CommandLineError} Tasks and options, or an error
	 *   message if parsing fails. Options start with a hyphen; tasks are everything else, returned in command-line
	 *   order.
	 */
	parseArgs<S extends CommandLineOptionsSpec = Record<string, never>>(options: S = {} as S): { tasks: string[]; options: CommandLineOptions<S> } | CommandLineError {
		ensure.signature(arguments, [[ undefined, Object ]]);

		try {
			if (this.rawArguments.includes("--")) return { error: "Unknown option '--'" };

			const { positionals, values } = util.parseArgs({
				args: this.rawArguments,
				allowPositionals: true,
				allowNegative: true,
				options,
			});
			return { tasks: positionals, options: { ...values } as unknown as CommandLineOptions<S> };
		}
		catch (err) {
			ensure.nodeError(err);
			if (!err.code.startsWith("ERR_PARSE_ARGS")) throw err;

			return { error: err.message.replace(/\. To specify a positional argument.*$/, "") };
		}
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
	 * @returns {object} The command-line arguments that can be interpreted as options (that is, that start with a
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

	readonly #args: string[];

	constructor(args: string[]) {
		this.#args = args;
	}

	get argv(): string[] {
		return [ "null_process_node", "null_process_script.js", ...this.#args ];
	}

}
