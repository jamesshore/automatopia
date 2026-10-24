// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import ConsoleOutput from "./console_output.ts";
import OutputTracker from "./low_level/output_tracker.ts";
import child_process from "node:child_process";
import EventEmitter from "node:events";

const EXEC_EVENT = "exec";

export interface ShellResult {
	stdout: string;
	stderr: string;
	code: number | null;
}

export interface AsyncShellResult {
	execPromise: Promise<ShellResult>;
	cancelFnAsync: () => Promise<void>;
}

export interface ShellOutput {
	command: string;
	args: string[];
	preamble?: string;
	cancelled?: boolean;
}

export interface NulledShellResult {
	stdout?: string;
	stderr?: string;
	code?: number;
}

export type NulledShellOptions = NulledShellResult[];

interface NarrowedChild {
	stdout: Pick<EventEmitter, "on">;
	stderr: Pick<EventEmitter, "on">;
	exitCode: number | null;
	kill: () => boolean;

	on(event: "exit", handlerFn: (code: number | null) => void): void;

	on(event: "error", handlerFn: (error: unknown) => void): void;
}

interface NarrowedChildProcess {
	spawn(command: string, args: string[], options: { stdio: [ "inherit", "pipe", "pipe" ] }): NarrowedChild;
}

/**
 * Wraps Node's ability to shell out to a child process.
 */
export default class Shell {

	private readonly _childProcess: NarrowedChildProcess;
	private readonly _output: ConsoleOutput;
	private readonly _stderr: ConsoleOutput;
	private readonly _emitter: EventEmitter;

	/**
	 * Factory method. Creates a wrapper that shells out to processes and displays their output.
	 * @returns {Shell} The wrapper.
	 */
	static create(): Shell {
		ensure.signature(arguments, []);
		return new Shell(child_process, ConsoleOutput.createStdout(), ConsoleOutput.createStderr());
	}

	/**
	 * Factory method. Creates a wrapper that shells out to processes and discards their output.
	 * @returns {Shell} The wrapper.
	 */
	static createSilent(): Shell {
		ensure.signature(arguments, []);
		return new Shell(child_process, ConsoleOutput.createNull(), ConsoleOutput.createNull());
	}

	/**
	 * Factory method. Creates a Nulled wrapper that does nothing when told to shell out to a process.
	 * @param {object[]} [options] Simulated results from shells. Each shell command gets the next result.
	 * @param {string} [options.stdout] Simulated stdout response from the child process.
	 * @param {string} [options.stderr] Simulated stderr response from the child process.
	 * @param {number} [options.code] Simulated exit code from the child process.
	 * @returns {Shell} The Nulled wrapper.
	 */
	static createNull(options?: NulledShellOptions): Shell {
		return new Shell(new NullChildProcess(options), ConsoleOutput.createNull(), ConsoleOutput.createNull());
	}

	/** For internal use only. (Use a factory method instead.) */
	constructor(childProcess: NarrowedChildProcess, stdout: ConsoleOutput, stderr: ConsoleOutput) {
		this._childProcess = childProcess;
		this._output = stdout;
		this._stderr = stderr;
		this._emitter = new EventEmitter();
	}

	/**
	 * Track which shell commands are executed.
	 * @returns {OutputTracker<ShellOutput>} The output tracker.
	 */
	track(): OutputTracker<ShellOutput> {
		return OutputTracker.create<ShellOutput>(this._emitter, EXEC_EVENT);
	}

	/**
	 * Execute a shell command.
	 * @param {string} command The command.
	 * @param {string[]} args The command arguments, as a rest parameter (the function takes a variable number of
	 *   parameters).
	 * @returns {Promise<{stdout: string, stderr: string, code: number | null}>} Returns the child process's output in
	 *   `stdout` and `stderr`, and its exit code in `code`. The exit code will be `null` if the process was terminated.
	 */
	async execAsync(command: string, ...args: string[]): Promise<ShellResult> {
		return await this.execWithPreambleAsync.apply(this, [ "", command, ...args ]);
	}

	async execWithPreambleAsync(preamble: string, command: string, ...args: string[]): Promise<ShellResult> {
		/**
		 * Execute a shell command. If it has any output, write `preamble` text beforehand. If it doesn't have any output,
		 * don't write the preamable.
		 * @param {string} preamble The preamble text.
		 * @param {string} command The command.
		 * @param {string[]} args The command arguments, as a rest parameter (the function takes a variable number of
		 *   parameters).
		 * @returns {Promise<{stdout: string, stderr: string, code: number | null}>} Returns the child process's output in
		 *   `stdout` and `stderr`, and its exit code in `code`. The exit code will be `null` if the process was
		 *   terminated.
		 */
		const { execPromise } = this.execWithPreamble.apply(this, [ preamble, command, ...args ]);
		return await execPromise;
	}

	/**
	 * Execute a shell command with the ability to cancel it.
	 * @param {string} command The command.
	 * @param {string[]} args The command arguments, as a rest parameter (the function takes a variable number of
	 *   parameters).
	 * @returns {{ cancelFnAsync: () => void, execPromise: Promise<{stdout: string, stderr: string, code: number}>} Call
	 *   `cancelFnAsync` to kill the child process. `execPromise` resolves when the process exits (even if it's killed),
	 *   and contains the child process's output in `stdout` and `stderr`, and its exit code in `code`. The exit code
	 *   will be `null` if the process was terminated.
	 */
	exec(command: string, ...args: string[]): AsyncShellResult {
		return this.execWithPreamble.apply(this, [ "", command, ...args ]);
	}

	/**
	 * Execute a shell command with the ability to cancel it. If it has any output, write `preamble` text beforehand. If
	 * it doesn't have any output, don't write the preamable.
	 * @param {string} preamble The preamble text.
	 * @param {string} command The command.
	 * @param {string[]} args The command arguments, as a rest parameter (the function takes a variable number of
	 *   parameters).
	 * @returns {{ cancelFnAsync: () => void, execPromise: Promise<{stdout: string, stderr: string, code: number}>} Call
	 *   `cancelFnAsync` to kill the child process. `execPromise` resolves when the process exits (even if it's killed),
	 *   and contains the child process's output in `stdout` and `stderr`, and its exit code in `code`. The exit code
	 *   will be `null` if the process was terminated.
	 */
	execWithPreamble(preamble: string, command: string, ...args: string[]): AsyncShellResult {
		ensure.signatureMinimum(arguments, [ String ]);
		args.forEach((arg, i) => ensure.type(arg, String, `shell argument #${i + 1}`));

		const child = this._childProcess.spawn(command, args, { stdio: [ "inherit", "pipe", "pipe" ] });
		const eventData: ShellOutput = preamble === "" ? { command, args } : { command, args, preamble };
		this._emitter.emit(EXEC_EVENT, eventData);

		const cancelFnAsync = async (): Promise<void> => {
			await new Promise<void>((resolve, reject) => {
				if (child.exitCode !== null) return resolve();

				child.on("exit", () => resolve());
				const success = child.kill!();
				if (!success) return reject(new Error("Failed to kill child process")); // this line not tested
				this._emitter.emit(EXEC_EVENT, { ...eventData, cancelled: true });
			});
		};

		const execPromise = new Promise<ShellResult>((resolve, reject) => {
			let stdout = "";
			let stderr = "";

			child.stdout.on("data", (data: string | Buffer) => {
				stdout += data;
				writePreamble(this._output);
				this._output.write(data);
			});
			child.stderr.on("data", (data: string | Buffer) => {
				stderr += data;
				writePreamble(this._output);
				this._stderr.write(data);
			});
			child.on("error", reject);    // this line not tested (not sure how to make it happen)
			child.on("exit", (code) => {
				resolve({ stdout, stderr, code });
			});
		});

		return { execPromise, cancelFnAsync };

		function writePreamble(output: ConsoleOutput): void {
			output.write(preamble);
			preamble = "";
		}
	}

}


class NullChildProcess implements NarrowedChildProcess {
	private readonly _options: NulledShellOptions;

	constructor(options: NulledShellOptions = []) {
		ensure.signature(arguments, [ [ undefined, Array ] ]);
		options.forEach((option, i) => ensure.type(option, {
			stdout: [ undefined, String ],
			stderr: [ undefined, String ],
			code: [ undefined, Number ],
		}, `options[${i}]`));

		this._options = options;
	}

	spawn(): NullChild {
		return new NullChild(this._options.shift());
	}
}

class NullChild implements NarrowedChild {
	readonly stdout: EventEmitter;
	readonly stderr: EventEmitter;
	readonly exitCode: number;

	constructor({
		stdout = "",
		stderr = "",
		code = 0,
	}: NulledShellResult = {}) {
		this.stdout = new EventEmitter();
		this.stderr = new EventEmitter();
		this.exitCode = code;

		setImmediate(() => {
			this.stdout.emit("data", stdout);
			this.stderr.emit("data", stderr);
		});
	}

	on(eventName: "exit" | "error", handlerFn: (code: number | null) => void): void {
		if (eventName === "exit") setImmediate(() => handlerFn(this.exitCode));
	}

	kill(): never {
		ensure.unreachable();
	}
}
