// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ensure = require("util/ensure");
const child_process = require("node:child_process");
const Output = require("infrastructure/console_output");
const EventEmitter = require("node:events");
const OutputTracker = require("./low_level/output_tracker");

const EXEC_EVENT = "exec";

/**
 * Wraps Node's ability to shell out to a child process.
 */
module.exports = class Shell {

	/**
	 * Factory method. Creates a wrapper that shells out to processes and displays their output.
	 * @returns {Shell} The wrapper.
	 */
	static create() {
		ensure.signature(arguments, []);
		return new Shell(child_process, Output.createStdout(), Output.createStderr());
	}

	/**
	 * Factory method. Creates a wrapper that shells out to processes and discards their output.
	 * @returns {Shell} The wrapper.
	 */
	static createSilent() {
		ensure.signature(arguments, []);
		return new Shell(child_process, Output.createNull(), Output.createNull());
	}

	/**
	 * Factory method. Creates a Nulled wrapper that does nothing when told to shell out to a process.
	 * @param {object[]} [options] Simulated results from shells. Each shell command gets the next result.
	 * @param {string} [options.stdout] Simulated stdout response from the child process.
	 * @param {string} [options.stderr] Simulated stderr response from the child process.
	 * @param {string} [options.code] Simulated exit code from the child process.
	 * @returns {Shell} The Nulled wrapper.
	 */
	static createNull(options) {
		return new Shell(new NullChildProcess(options), Output.createNull(), Output.createNull());
	}

	/** For internal use only. (Use a factory method instead.) */
	constructor(childProcess, stdout, stderr) {
		this._childProcess = childProcess;
		this._output = stdout;
		this._stderr = stderr;
		this._emitter = new EventEmitter();
	}

	/**
	 * Track which shell commands are executed.
	 * @returns {OutputTracker} The output tracker.
	 */
	track() {
		return OutputTracker.create(this._emitter, EXEC_EVENT);
	}

	/**
	 * Execute a shell command.
	 * @param {string} command The command
	 * @param {string[]} args The command arguments, as a rest parameter (the function takes a variable number of
	 *   parameters).
	 * @returns {Promise<{stdout: string, stderr: string, code: number}>} Returns the child process's output in `stdout`
	 *   and `stderr`, and its exit code in `code`.
	 */
	async execAsync(command, ...args) {
		const { execPromise } = this.exec.apply(this, [ command, ...args ]);
		return await execPromise;
	}

	/**
	 * Execute a shell command with the ability to cancel it.
	 * @param {string} command The command
	 * @param {string[]} args The command arguments, as a rest parameter (the function takes a variable number of
	 *   parameters).
	 * @returns {{ cancelFnAsync: () => void, execPromise: Promise<{stdout: string, stderr: string, code: number}>} Call
	 *   `cancelFnAsync` to kill the child process. `execPromise` resolves when the process exits (even if it's killed),
	 *   and contains the child process's output in `stdout` and `stderr`, and its exit code in `code`.
	 */
	exec(command, ...args) {
		ensure.signatureMinimum(arguments, [ String ]);
		args.forEach((arg, i) => ensure.type(arg, String, `shell argument #${i + 1}`));

		const child = this._childProcess.spawn(command, args, { stdio: [ "inherit", "pipe", "pipe" ] });
		const eventData = { command, args };
		this._emitter.emit(EXEC_EVENT, eventData);

		const cancelFnAsync = async () => {
			await new Promise((resolve, reject) => {
				if (child.exitCode !== null) return resolve();

				child.on("exit", () => resolve());
				const success = child.kill();
				if (!success) return reject(new Error("Failed to kill child process")); // this line not tested
				this._emitter.emit(EXEC_EVENT, { ...eventData, cancelled: true });
			});
		};

		const execPromise = new Promise((resolve, reject) => {
			let stdout = "";
			let stderr = "";

			child.stdout.on("data", (data) => {
				stdout += data;
				this._output.write(data);
			});
			child.stderr.on("data", (data) => {
				stderr += data;
				this._stderr.write(data);
			});
			child.on("error", reject);    // this line not tested (not sure how to make it happen)
			child.on("exit", (code) => {
				resolve({ stdout, stderr, code });
			});
		});

		return { execPromise, cancelFnAsync };
	}

};


class NullChildProcess {
	constructor(options = []) {
		ensure.signature(arguments, [[ undefined, Array ]]);
		options.forEach((option, i) => ensure.type(option, {
			stdout: [ undefined, String ],
			stderr: [ undefined, String ],
			code: [ undefined, Number ],
		}, `options[${i}]`));

		this._options = options;
	}

	spawn() {
		return new NullChild(this._options.shift());
	}
}

class NullChild {
	constructor({
		stdout = "",
		stderr = "",
		code = 0,
	} = {}) {
		this.stdout = new EventEmitter();
		this.stderr = new EventEmitter();
		this.exitCode = code;

		setImmediate(() => {
			this.stdout.emit("data", stdout);
			this.stderr.emit("data", stderr);
		});
	}

	on(eventName, handlerFn) {
		if (eventName === "exit") setImmediate(() => handlerFn(this.exitCode));
	}
}
