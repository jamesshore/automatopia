// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ensure = require("util/ensure");
const EventEmitter = require("node:events");
const OutputTracker = require("./low_level/output_tracker");

const WRITE_EVENT = "write";

/** Wrapper for output streams such as `stdout` and `stderr`. */
module.exports = class ConsoleOutput {

	/**
	 * Factory method. Wraps `stdout`.
	 * @returns {CommandLine} The instance.
	 */
	static createStdout() {
		ensure.signature(arguments, []);
		return new ConsoleOutput(process.stdout);
	}

	/**
	 * Factory method. Wraps `stderr`.
	 * @returns {CommandLine} The instance.
	 */
	static createStderr() {
		ensure.signature(arguments, []);
		return new ConsoleOutput(process.stderr);
	}

	/**
	 * Factory method. Discards writes.
	 * @returns {CommandLine} The instance.
	 */
	static createNull() {
		ensure.signature(arguments, []);
		return new ConsoleOutput(new NullStream());
	}

	/** For internal use only. (Use a factory method instead.) */
	constructor(stream) {
		this._stream = stream;
		this._emitter = new EventEmitter();
	}

	/**
	 * Write to the output stream.
	 * @param {string | Buffer} text The text to write.
	 */
	write(text) {
		ensure.signature(arguments, [ [ String, Buffer ] ]);
		if (text instanceof Buffer) text = text.toString();

		this._stream.write(text);
		this._emitter.emit(WRITE_EVENT, text);
	}

	/**
	 * Track writes to the output stream.
	 * @returns {OutputTracker} The output tracker.
	 */
	track() {
		ensure.signature(arguments, []);
		return OutputTracker.create(this._emitter, WRITE_EVENT);
	}

};

class NullStream {
	write() {}
}