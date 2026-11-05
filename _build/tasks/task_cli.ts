// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import CommandLine, { type CommandLineOptions } from "../infrastructure/command_line.ts";
import ConsoleOutput from "../infrastructure/console_output.ts";
import Colors from "../infrastructure/colors.ts";
import Clock from "../infrastructure/clock.ts";
import Tasks, { type CommandLineOptionsSpec, type ErrorWithFailedTask, type TaskOutput } from "./tasks.ts";
import TaskError from "./task_error.ts";

const ACTION = {
	START: "start",
	END: "end",
} as const;

const CLI_FAILURE = "__CLI__";
const BUILD_FAILURE = "__BUILD__";
const RESERVED_OPTIONS = {
	help: { type: "boolean", short: "h", description: "Show help" },
	debug: { type: "boolean", description: "Show extra details, including error stack traces" },
} as const;

/**
 * A command-line interface (CLI) for running tasks.
 * @see Tasks
 */
export default class TaskCli {

	readonly #commandLine: CommandLine;
	readonly #stdout: ConsoleOutput;
	readonly #clock: Clock;

	/**
	 * An enum for {@link TaskCli#track}.
	 * @returns {{START: string, END: string}}
	 */
	static get ACTION(): typeof ACTION {
		return ACTION;
	}

	/**
	 * {@link TaskCli#runAsync} returns the name of the task that failed (when a failure occurs). If no tasks are run,
	 * for example if help is requested or an invalid task is specified, this magic string is returned.
	 */
	static get CLI_FAILURE(): typeof CLI_FAILURE {
		return CLI_FAILURE;
	}

	/**
	 * {@link TaskCli#runAsync} returns the name of the task that failed (when a failure occurs). If the build fails
	 * outside of running a task, this magic string is returned.
	 */
	static get BUILD_FAILURE(): typeof BUILD_FAILURE {
		return BUILD_FAILURE;
	}

	/**
	 * Factory method.
	 * @returns {TaskCli} The instance.
	 */
	static create(): TaskCli {
		ensure.signature(arguments, []);

		return new TaskCli(CommandLine.create(), ConsoleOutput.createStdout(), Clock.create());
	}

	/** Internal use only. (Use a factory method instead.) */
	constructor(commandLine: CommandLine, stdout: ConsoleOutput, clock: Clock) {
		this.#commandLine = commandLine;
		this.#stdout = stdout;
		this.#clock = clock;
	}

	/**
	 * Interpret command-line arguments, run the build, and display success or failure. "Failure" means the build threw
	 * an exception. To show a prettier failure, without the exception stack trace, throw {@link TaskError} rather than
	 * Error.
	 * @param {Tasks} tasks The build tasks.
	 * @param {string} successMessage The message to display when all the tasks are successful.
	 * @param {string} failureMessage The message to display when one of the tasks throws an exception.
	 * @param {(commands, options) => void | Promise<void>} buildFnAsync The build to run. It receives the task names and
	 *   parsed command-line options. If no task names are supplied and a `default` task exists, it receives that task.
	 *   See {@link CommandLine#parse} for option parsing.
	 * @returns {Promise<null|string>} The name of the task that failed, or null if the tasks were all successful.
	 *   Returns {@link TaskCli.CLI_FAILURE} when no tasks are run, such as when help is requested or an invalid task is
	 *   specified. Returns {@link TaskCli.BUILD_FAILURE} when the build throws an exception outside of a task.
	 */
	async runAsync<T_TaskParameters>(
		tasks: Tasks<T_TaskParameters>,
		successMessage: string,
		failureMessage: string,
		buildFnAsync: (commands: string[], options: CommandLineOptions) => void | Promise<void>,
	): Promise<string | null> {
		ensure.signature(arguments, [ Tasks, String, String, Function ]);

		const result = this.#analyzeCommandLine(tasks, failureMessage);
		if (result === null) return CLI_FAILURE;

		return await this.#executeBuildAsync(
			tasks,
			result.commands,
			result.options,
			successMessage,
			failureMessage,
			buildFnAsync,
		);
	}

	#analyzeCommandLine<T>(tasks: Tasks<T>, failureMessage: string) {
		tasks = tasks.withReservedOptions(RESERVED_OPTIONS);

		const parserOptions = tasks.parserOptionsSpec;
		const { commands, options, error } = this.#commandLine.parse(parserOptions);
		if (error !== undefined) {
			writeFailure(this.#stdout, failureMessage, error);
			return null;
		}

		if (commands.length === 0 && tasks.hasTask("default")) commands.push("default");
		const unknownTasks = determineUnknownTasks(tasks, commands);

		if (unknownTasks !== "") {
			writeFailure(this.#stdout, failureMessage, `Unknown task(s): ${unknownTasks}`);
			return null;
		}
		else if (commands.length === 0 || options.help === true) {
			this.#showHelp(tasks);
			return null;
		}
		else {
			return { commands, options };
		}
	}

	#showHelp<T>(tasks: Tasks<T>): void {
		this.#showGlobalOptions(tasks);
		this.#showTasks(tasks);
		this.#stdout.write("\n");
	}

	#showGlobalOptions<T>(tasks: Tasks<T>) {
		this.#stdout.write(`\n${Colors.brightWhite.underline("Global options:")}\n`);
		const globalOptions = Object.entries(tasks.globalOptionsSpec)
			.sort(([ name1 ], [ name2 ]) => name1.localeCompare(name2))
			.map(([ name, spec ]) => optionRow(name, spec));

		const width = maxLabelLength(globalOptions);
		globalOptions.forEach(row => this.#writeHelpRow(row, width));
	}

	#showTasks<T>(tasks: Tasks<T>) {
		this.#stdout.write(`\n${Colors.brightWhite.underline("Tasks:")}\n`);
		const rows = tasks.listTasks().map(({ name, description, options }) => ({
			name,
			description,
			options: Object.entries(options ?? {}).map(([ optionName, spec ]) => optionRow(optionName, spec)),
		}));
		const maxTaskLength = rows.reduce((max, row) => Math.max(max, row.name.length), 0);
		const maxOptionLength = maxLabelLength(rows.flatMap(row => row.options));

		rows.forEach(({ name, description, options }) => {
			const taskWidth = Math.max(maxTaskLength, maxOptionLength === 0 ? 0 : maxOptionLength + 2);
			this.#writeHelpRow({ label: name, description }, taskWidth);
			options.forEach(option => this.#writeHelpRow(option, maxOptionLength + 2, "  "));
		});
	}

	#writeHelpRow(row: HelpRow, width: number, indent = ""): void {
		const label = Colors.white.bold(row.label.padEnd(width));
		this.#stdout.write(`${indent}${label}  ${row.description}\n`);
	}

	async #executeBuildAsync<T_TaskParameters>(
		tasks: Tasks<T_TaskParameters>,
		commands: string[],
		options: CommandLineOptions,
		successMessage: string,
		failureMessage: string,
		buildFnAsync: (commands: string[], options: CommandLineOptions) => void | Promise<void>,
	): Promise<string | null> {
		const stdout = this.#stdout;
		let timings: number[] = [];
		tasks.on(Tasks.TASK_EVENT, writeTaskEvent);

		try {
			const startTime = this.#clock.now();
			await buildFnAsync(commands, options);
			writeSuccess(stdout, successMessage, this.#clock.millisecondsSince(startTime) / 1000);
			return null;
		}
		catch (err) {
			ensure.error(err);

			const showStack = options.debug === true || !(err instanceof TaskError);
			writeFailure(stdout, failureMessage, showStack ? err.stack! : err.message);
			return (err as ErrorWithFailedTask).failedTask ?? BUILD_FAILURE;
		}
		finally {
			tasks.off(Tasks.TASK_EVENT, writeTaskEvent);
		}

		function writeTaskEvent({ task, action, timestamp }: TaskOutput): void {
			if (options.debug !== true) return;

			if (action === Tasks.ACTION.START) {
				timings.push(timestamp);
				stdout.write(Colors.white.inverse(`start: ${task}\n`));
			}
			else if (action === Tasks.ACTION.END) {
				const elapsedTime = timestamp - timings.pop()!;
				timings = timings.map(startTime => startTime + elapsedTime);
				stdout.write(Colors.white.inverse(`end: ${task} (${(elapsedTime / 1000).toFixed(2)}s)\n`));
			}
			else {
				ensure.unreachable(`Unrecognized action: ${action}`);
			}
		}
	}
}


type HelpRow = { label: string; description: string };

function optionRow(name: string, spec: CommandLineOptionsSpec[string]): HelpRow {
	const value = spec.type === "string" ? "=…" : "";
	const shortName = spec.short ? ` (-${spec.short})` : "";
	return { label: `--${name}${value}${shortName}`, description: spec.description ?? "" };
}

function maxLabelLength(rows: HelpRow[]): number {
	return rows.reduce((max, row) => Math.max(max, row.label.length), 0);
}

function writeSuccess(stdout: ConsoleOutput, successMessage: string, elapsedSeconds: number): void {
	stdout.write(
		"\n" +
		Colors.brightGreen.inverse(`   ${successMessage}   `) + "\n" +
		`(${elapsedSeconds.toFixed(2)}s)\n`,
	);
}

function writeFailure(stdout: ConsoleOutput, failureMessage: string, message: string): void {
	stdout.write(
		"\n" +
		Colors.brightRed.inverse(`   ${failureMessage}   `) + "\n" +
		Colors.brightRed.bold(message) + "\n",
	);
}

function determineUnknownTasks<T_TaskParameters>(tasks: Tasks<T_TaskParameters>, tasksToRun: string[]): string {
	return tasksToRun.filter(task => !tasks.hasTask(task)).join(", ");
}

