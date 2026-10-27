// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import ConsoleOutput from "../infrastructure/console_output.ts";
import Clock from "../infrastructure/clock.ts";
import OutputTracker from "../infrastructure/low_level/output_tracker.ts";
import Colors from "../infrastructure/colors.ts";
import EventEmitter from "node:events";

const DEFAULT_PROGRESS_TEXT = ".";
const DEFAULT_FAILURE_TEXT = Colors.brightRed.inverse("X");

const USAGE_EVENT = "usage";

const ACTION = {
	START: "start",
	PROGRESS: "progress",
	DEBUG: "debug",
	FAILURE: "failure",
	FOOTER: "footer",
	END: "end",
} as const;

export interface ReporterOptions {
	debug?: boolean;
	stdout?: ConsoleOutput;
}

export interface NulledReporterOptions {
	stdout?: ConsoleOutput;
	clock?: Clock;
}

export type ReporterOutput =
	| { action: typeof ACTION.START, report: string }
	| { action: typeof ACTION.PROGRESS, report: string, text?: string }
	| { action: typeof ACTION.DEBUG, report: string, text: string }
	| { action: typeof ACTION.FAILURE, report: string, footer?: string, progress?: string, debug?: string }
	| { action: typeof ACTION.FOOTER, report: string, text: string }
	| { action: typeof ACTION.END, report: string };

type ReportFunction<T> = (report: Report) => T | Promise<T>;

/**
 * Writes build progress as a headline, a series of dots, and an elapsed time.
 */
export default class Reporter {

	readonly #stdout: ConsoleOutput;
	readonly #clock: Clock;
	readonly #debug: boolean | undefined;
	readonly #emitter: EventEmitter;

	/**
	 * An enum for {@link Reporter#track}.
	 * @returns {{STARTED: string, PROGRESS: string, FOOTER: string, END: string}}
	 */
	static get ACTION(): typeof ACTION {
		return ACTION;
	}

	/**
	 * Used for runtime type checking.
	 * @returns {Report} The Reporter.Report class.
	 */
	static get Report(): typeof Report {
		return Report;
	}

	/**
	 * Factory method. Creates the reporter.
	 * @param {boolean} [debug=false] Whether to write debug logs. Defaults to false.
	 * @param {ConsoleOutput} [stdout] Where to write the output. Defaults to stdout.
	 * @returns {Reporter} The reporter.
	 */
	static create({
		debug = false,
		stdout = ConsoleOutput.createStdout(),
	}: ReporterOptions = {}): Reporter {
		ensure.signature(arguments, [[ undefined, {
			debug: [ undefined, Boolean ],
			stdout: [ undefined, ConsoleOutput ],
		}]]);

		return new this(stdout, Clock.create(), debug);
	}

	/**
	 * Factory method. Creates a 'nulled' reporter that discards its output.
	 * @param {ConsoleOutput} [stdout] Where to write the output. Defaults to discarding the output.
	 * @param {Clock} [clock] The system clock. Defaults to a 'nulled' clock that doesn't advance.
	 * @returns {Reporter} The reporter.
	 */
	static createNull({
		stdout = ConsoleOutput.createNull(),
		clock = Clock.createNull(),
	}: NulledReporterOptions = {}): Reporter {
		ensure.signature(arguments, [[ undefined, {
			stdout: [ undefined, ConsoleOutput ],
			clock: [ undefined, Clock ],
		}]]);

		return new this(stdout, clock);
	}

	/** Only for use by tests. (Use a factory method instead.) */
	constructor(stdout: ConsoleOutput, clock: Clock, debug?: boolean) {
		this.#stdout = stdout;
		this.#clock = clock;
		this.#debug = debug;
		this.#emitter = new EventEmitter();
	}

	/**
	 * Start a new report by writing a headline and then running a function. When the function ends, a dot will be
	 * written (if the function didn't call {@link Report#progress}) along with the elapsed time.
	 * @template T
	 * @param {string} headline The headline to write.
	 * @param {(report: Report) => Promise<T>} fnAsync The function to call. Use the `report` parameter to write to the
	 *   report.
	 * @returns {Promise<T>} The value returned by `fnAsync`.
	 */
	async startAsync<T>(headline: string, fnAsync: ReportFunction<T>): Promise<T> {
		ensure.signature(arguments, [ String, Function ]);

		const report = new Report(this.#stdout, this.#clock, this.#debug, this.#emitter, headline, false);
		return await runReportBodyAsync(report, fnAsync);
	}

	/**
	 * Start a 'quiet' report. It's just like {@link Report#startAsync}, except that it only writes the headline and
	 * elapsed time if the function writes something to the report.
	 * @param {string} headline The headline to write.
	 * @param {(report: Report) => Promise<T>} fnAsync The function to call. Use the `report` parameter to write to the
	 *   report.
	 * @returns {Promise<T>} The value returned by `fnAsync`.
	 */
	async quietStartAsync<T>(headline: string, fnAsync: ReportFunction<T>): Promise<T> {
		ensure.signature(arguments, [ String, Function ]);

		const report = new Report(this.#stdout, this.#clock, this.#debug, this.#emitter, headline, true);
		return await runReportBodyAsync(report, fnAsync);
	}

	/**
	 * Track what this reporter outputs. Each action is tracked by its headline, an action, and associated data.
	 * @returns {OutputTracker} The tracker.
	 * @see Reporter.ACTION
	 */
	track(): OutputTracker<ReporterOutput> {
		return new OutputTracker<ReporterOutput>(this.#emitter, USAGE_EVENT);
	}

}

async function runReportBodyAsync<T>(report: Report, bodyFnAsync: ReportFunction<T>): Promise<T> {
	try {
		return await bodyFnAsync(report);
	}
	catch (err) {
		report.started();
		throw err;
	}
	finally {
		report._end();
	}
}


/**
 * An individual report. A report consists of a headline, a series of dots, the elapsed time (which is added
 * automatically), and optional footers.
 */
class Report {

	readonly #stdout: ConsoleOutput;
	readonly #clock: Clock;
	readonly #debug: boolean | undefined;
	readonly #headline: string;
	readonly #isQuiet: boolean;
	readonly #emitter: EventEmitter;
	#started: boolean;
	readonly #startTime: number;
	#wroteProgress: boolean;
	#footer: string;
	#ended: boolean;

	/**
	 * Internal use only. (Use {@link Reporter}'s factory methods instead.)
	 */
	constructor(stdout: ConsoleOutput, clock: Clock, debug: boolean | undefined, emitter: EventEmitter, headline: string, isQuiet: boolean) {
		this.#stdout = stdout;
		this.#clock = clock;
		this.#debug = debug;
		this.#headline = headline;
		this.#isQuiet = isQuiet;
		this.#emitter = emitter;

		this.#started = false;
		this.#startTime = this.#clock.now();
		this.#wroteProgress = false;
		this.#footer = "";
		this.#ended = false;

		if (!this.#isQuiet) this.started();
	}

	/**
	 * @returns {number} The amount of time, in milliseconds, since the report began.
	 */
	get elapsedMs(): number {
		return this.#clock.millisecondsSince(this.#startTime);
	}

	/**
	 * Write the report headline, if it hasn't already been written.
	 * @see Reporter.quietStartAsync
	 */
	started(): void {
		ensure.signature(arguments, []);

		if (!this.#started) {
			this.#stdout.write(`${this.#headline}: `);
			this.#started = true;
			this.#emitter.emit(USAGE_EVENT, { report: this.#headline, action: ACTION.START });
		}
	}

	/**
	 * Write a dot (or other text), indicating that work is progressing.
	 * @param {string} [text="."] The text to write.
	 */
	progress(text?: string): void {
		ensure.signature(arguments, [[ undefined, String ]]);

		this.#writeProgress(text);

		const textEvent = text === undefined ? {} : { text };
		this.#emitter.emit(USAGE_EVENT, { report: this.#headline, action: ACTION.PROGRESS, ...textEvent });
	}

	/**
	 * Write text if the reporter is in debug mode; otherwise, write nothing.
	 * @param {string} text The text to write
	 */
	debug(text: string): void {
		ensure.signature(arguments, [ String ]);

		this.#writeDebug(text);
		if (this.#debug) this.#emitter.emit(USAGE_EVENT, { report: this.#headline, action: ACTION.DEBUG, text });
	}

	/**
	 * Write a red X (or other text) along with an optional footer, indicating that something failed.
	 * @param {string} [footer] The footer to write, if any.
	 * @param {string} [progress="X"] The progress text to write. Defaults to a red "X".
	 * @param {string} [debug] Text to write if the reporter is in debug mode.
	 */
	failure(footer = "", {
		progress,
		debug,
	}: {
		progress?: string;
		debug?: string;
	} = {}): void {
		ensure.signature(arguments, [[ undefined, String ], [ undefined, {
			progress: [ undefined, String ],
			debug: [ undefined, String ],
		}]]);

		this.#writeFooter(footer);
		this.#writeProgress(progress ?? DEFAULT_FAILURE_TEXT);
		this.#writeDebug(debug);

		const footerEvent = footer === "" ? {} : { footer };
		const progressEvent = progress === undefined ? {} : { progress };
		const debugEvent = debug === undefined ? {} : { debug };
		this.#emitter.emit(USAGE_EVENT, {
			report: this.#headline,
			action: ACTION.FAILURE,
			...footerEvent,
			...progressEvent,
			...debugEvent,
		});
	}

	/**
	 * Additional text to write after the function ends. Useful for errors and summary information.
	 * @param {string} text The text to write.
	 */
	footer(text: string): void {
		ensure.signature(arguments, [ String ]);
		if (text === "") return;

		this.#writeFooter(text);
		this.#emitter.emit(USAGE_EVENT, { report: this.#headline, action: ACTION.FOOTER, text });
	}

	/** Internal use only. Called automatically when the report function returns. */
	_end(): void {
		if (this.#isQuiet && !this.#started && this.#footer === "") return;

		if (!this.#wroteProgress) this.#writeProgress();

		const elapsedSec = this.elapsedMs / 1000;
		this.#stdout.write(Colors.brightWhite.dim(` (${elapsedSec.toFixed(2)}s)\n`));

		this.#stdout.write(this.#footer);
		this.#ended = true;
		this.#emitter.emit(USAGE_EVENT, { report: this.#headline, action: ACTION.END });
	}

	#writeProgress(text: string = DEFAULT_PROGRESS_TEXT): void {
		this.started();
		this.#stdout.write(text);
		this.#wroteProgress = true;
	}

	#writeDebug(text: string | undefined): void {
		if (this.#debug && text !== undefined) {
			this.started();
			this.#stdout.write(text);
		}
	}

	#writeFooter(text: string): void {
		this.#footer += text;
	}
}
