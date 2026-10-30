// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "../util/ensure.ts";
import Clock from "../infrastructure/clock.ts";
import OutputTracker from "../infrastructure/low_level/output_tracker.ts";
import FileSystem from "../infrastructure/file_system.ts";
import EventEmitter from "node:events";
import { ANY_TYPE } from "../util/ensure.ts";
import type { ParserOptionsSpec } from "../infrastructure/command_line.ts";

export interface CommandLineOptionsSpec {
	[optionLongName: string]: ParserOptionsSpec[string] & { description?: string };
}

const TASK_EVENT = "task";
const ACTION = {
	START: "start",
	END: "end",
} as const;

export interface NulledTasksOptions<S extends CommandLineOptionsSpec = CommandLineOptionsSpec> {
	incrementalDir?: string;
	clock?: Clock;
	fileSystem?: FileSystem;
	globalCommandLineOptions?: S;
}

export type TaskFunction<T_TaskParameters> = (parms: T_TaskParameters) => void | Promise<void>;

export type TaskOutput =
	| { action: typeof ACTION.START, task: string, timestamp: number }
	| { action: typeof ACTION.END, task: string, timestamp: number };

export interface TaskDescription {
	name: string;
	description: string;
}

export interface ErrorWithFailedTask extends Error {
	failedTask?: string;
}

/**
 * A set of tasks. Each task consists of a name and an associated function. The tasks can be run programmatically or
 * from the command-line.
 */
export default class Tasks<T_TaskParameters, S extends CommandLineOptionsSpec = CommandLineOptionsSpec> extends EventEmitter<{ task: [TaskOutput] }> {

	readonly #taskFns: Record<string, TaskFunction<T_TaskParameters>>;
	readonly #descriptions: Record<string, string>;
	readonly #incrementalDir: string;
	readonly #clock: Clock;
	readonly #fileSystem: FileSystem;
	readonly #globalCommandLineOptions: S;

	/**
	 * Task tracking event.
	 */
	static get TASK_EVENT(): typeof TASK_EVENT {
		return TASK_EVENT;
	}

	/**
	 * An enum for {@link Tasks#track} and the event emitter.
	 * @returns {{START: string, END: string}}
	 */
	static get ACTION(): typeof ACTION {
		return ACTION;
	}

	/**
	 * Factory method.
	 * @param {string} incrementalDir Path to a directory to use for incremental tasks (see
	 *   {@link Tasks#defineIncrementalTask}).
	 * @param {FileSystem} fileSystem The file system that contains `incrementalDir`.
	 * @param {CommandLineOptionsSpec} [globalCommandLineOptions] Global command-line option specifications. Each option
	 *   may also include a `description` string. See {@link CommandLine#parse} for the other specification fields.
	 * @returns {Tasks} The instance.
	 */
	static create<T_TaskParameters, S extends CommandLineOptionsSpec = CommandLineOptionsSpec>(args: {
		incrementalDir: string;
		fileSystem: FileSystem;
	} & (CommandLineOptionsSpec extends S ? { globalCommandLineOptions?: S } : { globalCommandLineOptions: S })): Tasks<T_TaskParameters, S> {
		const { incrementalDir, fileSystem, globalCommandLineOptions = {} as S } = args;
		ensure.signature(arguments, [{
			incrementalDir: String,
			fileSystem: FileSystem,
			globalCommandLineOptions: [ undefined, Object ],
		}]);

		return new Tasks<T_TaskParameters, S>(incrementalDir, Clock.create(), fileSystem, globalCommandLineOptions);
	}

	/**
	 * Factory method. Creates a Nulled instance that doesn't write to the file system.
	 * @param {string} [incrementalDir="/nulled_incremental_dir"] Path to a directory to use for incremental tasks (see
	 *   {@link Tasks#defineIncrementalTask}).
	 * @param {Clock} [clock] System clock. Defaults to a Nulled instance.
	 * @param {FileSystem} [fileSystem] File system. Defaults to a Nulled instance.
	 * @param {CommandLineOptionsSpec} [globalCommandLineOptions] Global command-line option specifications. Each option
	 *   may also include a `description` string. See {@link CommandLine#parse} for the other specification fields.
	 * @returns {Tasks} The instance.
	 */
	static createNull<T_TaskParameters, S extends CommandLineOptionsSpec = CommandLineOptionsSpec>(...args: CommandLineOptionsSpec extends S
		? [options?: NulledTasksOptions<S>]
		: [options: NulledTasksOptions<S> & { globalCommandLineOptions: S }]): Tasks<T_TaskParameters, S> {
		const {
		incrementalDir = "/nulled_incremental_dir",
		clock = Clock.createNull(),
		fileSystem = FileSystem.createNull(),
		globalCommandLineOptions = {} as S,
		} = args[0] ?? {};
		ensure.signature(arguments, [[ undefined, {
			incrementalDir: [ undefined, String ],
			clock: [ undefined, Clock ],
			fileSystem: [ undefined, FileSystem ],
			globalCommandLineOptions: [ undefined, Object ],
		}]]);

		return new Tasks<T_TaskParameters, S>(incrementalDir, clock, fileSystem, globalCommandLineOptions);
	}

	/** Only for use by tests. (Use a factory method instead.) */
	constructor(incrementalDir: string, clock: Clock, fileSystem: FileSystem,
		...args: CommandLineOptionsSpec extends S ? [options?: S] : [options: S]) {
		super();
		this.#taskFns = {};
		this.#descriptions = {};
		this.#incrementalDir = incrementalDir;
		this.#clock = clock;
		this.#fileSystem = fileSystem;
		this.#globalCommandLineOptions = args[0] ?? {} as S;
	}

	/**
	 * Track when tasks start and end. Each action is tracked with its task, action, and timestamp.
	 * @returns {OutputTracker} The tracker.
	 * @see Tasks.ACTION
	 */
	track(): OutputTracker<TaskOutput> {
		ensure.signature(arguments, []);

		return new OutputTracker<TaskOutput>(this, TASK_EVENT);
	}

	/**
	 * @returns {CommandLineOptionsSpec} The global option specifications, or an empty object if none have been defined.
	 * @see CommandLine#parse
	 */
	get globalCommandLineOptions(): S {
		return this.#globalCommandLineOptions;
	}

	/**
	 * Add a task.
	 * @param {string} name The name of the task.
	 * @param {() => void} fn The function to run when the task executes.
	 * @throws Error Throws an error if the task name has already been used.
	 */
	defineTask(name: string, fn: TaskFunction<T_TaskParameters>): void {
		ensure.signature(arguments, [ String, Function ]);

		if (this.#taskFns[name] === undefined) this.#taskFns[name] = fn;
		else throw new Error(`Task already defined: ${name}`);
	}

	/**
	 * Add a special task that only runs when `sourceFiles` have changed. When the task finishes without an error, it
	 * writes a special task file to the `incrementalDir` (see {@link Tasks.create}. Whenever the task is supposed to
	 * run, it checks for the existance of that task file, and skips the task if it's newer than all the `sourceFiles`.
	 * @param {string} name The name of the task.
	 * @param {string[]} sourceFiles The files to compare to the task file.
	 * @param {(parms) => void} fn The function to run when the task executes. It will be provided with the `parms`
	 *   variable that was passed into {@link Tasks.runTasksAsync}.
	 * @throws Error Throws an error if the task name has already been used.
	 */
	defineIncrementalTask(name: string, sourceFiles: string[], fn: TaskFunction<T_TaskParameters>): void {
		ensure.signature(arguments, [ String, Array, Function ]);

		this.defineTask(name, async (parms) => {
			const taskFile = `${this.#incrementalDir}/${name}.task`;
			if (await this.#fileSystem.isFileNewerThanAllAsync(taskFile, sourceFiles)) return;

			await fn(parms);
			await this.#fileSystem.writeTextFileAsync(taskFile, "ok");
		});
	}

	/**
	 * Add natural-language descriptions to the tasks. You're not required to give every task a description, but every
	 * task you describe must have already been defined.
	 * @param {Object.<name: string, description: string>} namesAndDescriptions An object containing the descriptions,
	 *   where the keys are the task names and the values are the task descriptions.
	 * @throws {Error} Throws error if any of the task names don't exist.
	 */
	setDescriptions(namesAndDescriptions: Record<string, string>): void {
		ensure.signature(arguments, [ Object ]);

		Object.entries(namesAndDescriptions).forEach(([ key, value ]) => {
			ensure.that(
				this.#taskFns[key] !== undefined,
				`Attempted to set description for '${key}', but that task hasn't been defined`,
			);
			ensure.that(
				this.#descriptions[key] === undefined,
				`Attempted to set description for '${key}', but that task already has a description`,
			);

			this.#descriptions[key] = value;
		});
	}

	/**
	 * Provides a list of all the tasks that have been added, along with their descriptions, if any. (Tasks without
	 * descriptions default to an empty string.)
	 * @returns {{name: string, description: string}[]} Each task in the order it was added.
	 */
	listTasks(): TaskDescription[] {
		return Object.keys(this.#taskFns).map(name => {
			const description = this.#descriptions[name] ?? "";
			return { name, description };
		});
	}

	/**
	 * Checks if a task has been defined.
	 * @param {string} name The name of the task to check.
	 * @returns {boolean} True if the task has been defined.
	 */
	hasTask(name: string): boolean {
		return this.#taskFns[name] !== undefined;
	}

	/**
	 * Runs the requested tasks. Each task is run one at a time in the order provided.
	 * @param {string[]} tasksToRun The names of the tasks to run.
	 * @param {parms} parms An arbitrary object to provide to tasks when they run.
	 * @returns {Promise<void>}
	 * @throws Error Throws an error, without running any tasks, if any of the task names haven't been defined.
	 */
	async runTasksAsync(tasksToRun: string[], parms: T_TaskParameters): Promise<void> {
		ensure.signature(arguments, [ Array, ANY_TYPE ]);

		const unknownTasks = determineUnknownTasks(this.#taskFns, tasksToRun);
		if (unknownTasks !== "") {
			throw new Error(`Unrecognized task(s): ${unknownTasks}`);
		}

		for (const task of tasksToRun) {
			try {
				this.emit(TASK_EVENT, { task, action: ACTION.START, timestamp: this.#clock.now() });
				await this.#taskFns[task](parms);
				this.emit(TASK_EVENT, { task, action: ACTION.END, timestamp: this.#clock.now() });
			}
			catch (err) {
				ensure.error(err);

				if ((err as ErrorWithFailedTask).failedTask === undefined) (err as ErrorWithFailedTask).failedTask = task;
				throw err;
			}
		}
	}

}

function determineUnknownTasks(taskFns: Record<string, unknown>, tasksToRun: string[]): string {
	return tasksToRun.filter((task) => taskFns[task] === undefined).join(", ");
}
