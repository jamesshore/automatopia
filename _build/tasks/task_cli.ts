// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import CommandLine from "../infrastructure/command_line.ts";
import ConsoleOutput from "../infrastructure/console_output.ts";
import Colors from "../infrastructure/colors.ts";
import Clock from "../infrastructure/clock.ts";
import Tasks, { type ErrorWithFailedTask, type TaskOutput } from "./tasks.ts";
import TaskError from "./task_error.ts";

const ACTION = {
	START: "start",
	END: "end",
} as const;

const CLI_FAILURE = "__CLI__";
const BUILD_FAILURE = "__BUILD__";

export type BuildFunction = (taskNames: string[], options: Record<string, unknown>) => void | Promise<void>;

interface AnalyzedCommandLine {
	taskNames: string[];
	options: Record<string, unknown>;
	helpOption: unknown;
	debugOption: unknown;
}

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
	 * @param {(taskNames, options) => Promise<void>} buildFnAsync The build to run. It’s given the task names that were
	 *   provided on the command line and the command-line arguments that can be interpreted as options (that is, that
	 *   start with a hyphen), along with any values for those arguments. For example, `-T` will be returned as `{ T:
	 *   true }` and `--file=my_file` will be returned as `{ file: "my_file" }`. Performs basic type conversion on option
	 *   values.
	 * @returns {Promise<null|string>} The name of the task that failed, or null if the tasks were all successful.
	 *   Returns {@link TaskCli.CLI_FAILURE} when no tasks are run, such as when help is requested or an invalid task is
	 *  specified. Returns {@link TaskCli.BUILD_FAILURE} when the build throws an exception outside of a task.
	 */
	async runAsync<T_TaskParameters>(
		tasks: Tasks<T_TaskParameters>,
		successMessage: string,
		failureMessage: string,
		buildFnAsync: BuildFunction,
	): Promise<string | null> {
		ensure.signature(arguments, [ Tasks, String, String, Function ]);

		const { taskNames, options, helpOption, debugOption } = analyzeCommandLine(this.#commandLine, tasks);

		const showedHelp = showHelpIfNecessary(this.#stdout, tasks, taskNames, helpOption, failureMessage);
		if (showedHelp) return CLI_FAILURE;

		const stdout = this.#stdout;
		let timings: number[] = [];
		if (debugOption) tasks.on(Tasks.TASK_EVENT, writeTaskEvent);

		try {
			const startTime = this.#clock.now();
			await buildFnAsync(taskNames, options);
			writeSuccess(this.#stdout, successMessage, this.#clock.millisecondsSince(startTime) / 1000);
			return null;
		}
		catch (err) {
			ensure.error(err);

			const showStack = debugOption || !(err instanceof TaskError);
			writeFailure(this.#stdout, failureMessage, showStack ? err.stack! : err.message);
			return (err as ErrorWithFailedTask).failedTask ?? BUILD_FAILURE;
		}
		finally {
			if (debugOption) tasks.off(Tasks.TASK_EVENT, writeTaskEvent);
		}

		function writeTaskEvent({ task, action, timestamp }: TaskOutput): void {
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

function analyzeCommandLine<T_TaskParameters>(commandLine: CommandLine, tasks: Tasks<T_TaskParameters>): AnalyzedCommandLine {
	let taskNames = commandLine.commands;
	let options = commandLine.options;
	if (Object.keys(tasks.globalCommandLineOptions).length > 0) {
		const { tasks: parsedTasks, options: parsedOptions, error } = commandLine.parseArgs(tasks.globalCommandLineOptions);
		if (error !== undefined) throw new Error(error);
		taskNames = parsedTasks;
		options = parsedOptions;
	}

	if (taskNames.length === 0 && tasks.hasTask("default")) taskNames.push("default");

	const helpOption = options.help || options.h || options.tasks || options.T;
	const debugOption = options.debug;

	return { taskNames, options, helpOption, debugOption };
}

function showHelpIfNecessary<T_TaskParameters>(
	stdout: ConsoleOutput,
	tasks: Tasks<T_TaskParameters>,
	taskNames: string[],
	helpOption: unknown,
	failureMessage: string,
): boolean {
	const unknownTasks = determineUnknownTasks(tasks, taskNames);
	if (!helpOption && taskNames.length > 0 && unknownTasks === "") return false;

	if (unknownTasks !== "") {
		writeFailure(stdout, failureMessage, `Unrecognized task(s): ${unknownTasks}`);
		stdout.write("\n");
	}

	stdout.write("\n" + Colors.brightWhite("options:") + " <tasks> [-h|--help|-T|--tasks] [--debug]\n\n");
	stdout.write(Colors.brightWhite.underline("Available tasks:") + "\n");

	const maxLength = tasks.listTasks().reduce((memo, { name }) => Math.max(name.length, memo), 0);
	tasks.listTasks().forEach(({ name, description }) => {
		stdout.write(`  ${Colors.white.bold(name.padEnd(maxLength))}  ${description}\n`);
	});
	stdout.write("\n");

	return true;
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

