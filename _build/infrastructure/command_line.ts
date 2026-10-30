// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import EventEmitter from "node:events";
import * as util from "node:util";

interface NarrowedProcess {
	argv: string[];
}

export type ParsedCommandLine<S extends CommandLineOptionsSpec = Record<string, never>> =
	{ commands: string[]; options: CommandLineOptions<S>; error?: never }
	| { error: string; commands?: never; options?: never };

// This grotesque bit of type magic is used to automatically set the type of parse()'s return value to
// match what's supplied in the option spec.
export type CommandLineOptions<S extends CommandLineOptionsSpec> = {
	[K in keyof S]: OptionValue<S[K]> | (S[K] extends { default: NonNullable<unknown> } ? never : undefined);
};
type OptionValue<S> = S extends { type: "boolean" } ? boolean :
	S extends { type: "string"; multiple: true } ? string[] :
	S extends { type: "string" } ? string : never;

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
	 * Parse command-line arguments into commands and options.
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
	 * @returns {{commands: string[], options: CommandLineOptions} | CommandLineError} Commands and options, or an error
	 *   message if parsing fails. Options start with a hyphen; commands are everything else, returned in command-line
	 *   order.
	 */
	parse<S extends CommandLineOptionsSpec = Record<string, never>>(options: S = {} as S): ParsedCommandLine<S> {
		ensure.signature(arguments, [[ undefined, Object ]]);

		try {
			if (this.rawArguments.includes("--")) return { error: "Unknown option '--'" };

			const { positionals, values } = util.parseArgs({
				args: this.rawArguments,
				allowPositionals: true,
				allowNegative: true,
				options,
			});
			return { commands: positionals, options: { ...values } as unknown as CommandLineOptions<S> };
		}
		catch (err) {
			ensure.nodeError(err);
			if (!err.code.startsWith("ERR_PARSE_ARGS")) throw err;

			return { error: err.message.replace(/\. To specify a positional argument.*$/, "") };
		}
	}

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
