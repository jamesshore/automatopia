// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import OutputTracker from "./low_level/output_tracker.ts";
import EventEmitter from "node:events";

const WRITE_EVENT = "write";

interface OutputStream {
	write(text: string): unknown;
}

/** Wrapper for output streams such as `stdout` and `stderr`. */
export default class ConsoleOutput {

	readonly #stream: OutputStream;
	readonly #emitter: EventEmitter;

	/**
	 * Factory method. Wraps `stdout`.
	 * @returns {ConsoleOutput} The instance.
	 */
	static createStdout(): ConsoleOutput {
		ensure.signature(arguments, []);
		return new ConsoleOutput(process.stdout);
	}

	/**
	 * Factory method. Wraps `stderr`.
	 * @returns {ConsoleOutput} The instance.
	 */
	static createStderr(): ConsoleOutput {
		ensure.signature(arguments, []);
		return new ConsoleOutput(process.stderr);
	}

	/**
	 * Factory method. Discards writes.
	 * @returns {ConsoleOutput} The instance.
	 */
	static createNull(): ConsoleOutput {
		ensure.signature(arguments, []);
		return new ConsoleOutput(new NullStream());
	}

	/** For internal use only. (Use a factory method instead.) */
	constructor(stream: OutputStream) {
		this.#stream = stream;
		this.#emitter = new EventEmitter();
	}

	/**
	 * Write to the output stream.
	 * @param {string | Buffer} text The text to write.
	 */
	write(text: string | Buffer): void {
		ensure.signature(arguments, [ [ String, Buffer ] ]);
		if (typeof text !== "string") text = text.toString();

		this.#stream.write(text);
		this.#emitter.emit(WRITE_EVENT, text);
	}

	/**
	 * Track writes to the output stream.
	 * @returns {OutputTracker<string>} The output tracker.
	 */
	track(): OutputTracker<string> {
		ensure.signature(arguments, []);
		return OutputTracker.create<string>(this.#emitter, WRITE_EVENT);
	}

}

class NullStream implements OutputStream {
	write(): void {}
}
