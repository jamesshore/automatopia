// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import FakeTimers from "@sinonjs/fake-timers";

const FAKE_START_TIME = 0;

type TimerHandle = ReturnType<typeof setTimeout> | FakeTimers.TimerId;

export interface NulledClockOptions {
	now?: number | Date;
}

interface ClockGlobals {
	Date: Pick<DateConstructor, "now">;
	setTimeout(fn: () => void, milliseconds: number): TimerHandle;
	clearTimeout(handle: TimerHandle): void;
	setInterval(fn: () => void, milliseconds: number): TimerHandle;
	clearInterval(handle: TimerHandle): void;
	tickAsync(milliseconds: number): Promise<void>;
	tickUntilTimersExpireAsync(): Promise<void>;
}

/** System clock. */
export default class Clock {

	readonly #globals: ClockGlobals;

	/**
	 * Factory method. Wraps the system clock.
	 * @returns {Clock} the wrapped clock
	 */
	static create(): Clock {
		ensure.signature(arguments, []);

		return new Clock({
			Date,
			setTimeout,
			clearTimeout: clearTimeout as ClockGlobals["clearTimeout"],
			setInterval,
			clearInterval: clearInterval as ClockGlobals["clearInterval"],
			tickAsync() { throw new Error("Can't advance the clock because it isn't a null clock"); },
			tickUntilTimersExpireAsync() { throw new Error("Can't advance the clock because it isn't a null clock"); }
		});
	}

	/**
	 * Factory method. Creates a simulated system clock.
	 * @param [options] overridable options for the simulated clock
	 * @param {number | Date} [options.now=0] simulated current time
	 * @returns {Clock} the simulated clock
	 */
	static createNull(options?: NulledClockOptions): Clock {
		return new Clock(nullGlobals(options));
	}

	/** Do not use. (Use a factory method instead.) */
	constructor(globals: ClockGlobals) {
		this.#globals = globals;
	}

	/**
	 * @returns {number} the current time in milliseconds (equivalent to `Date.now()`)
	 */
	now(): number {
		ensure.signature(arguments, []);
		return this.#globals.Date.now();
	}

	/**
	 * @returns {number} the current year, assuming UTC time zone
	 */
	currentYearForUtc(): number {
		ensure.signature(arguments, []);
		return new Date(this.#globals.Date.now()).getUTCFullYear();
	}

	/**
	 * Wait for a certain amount of time has passed. Equivalent to `setTimeout()`, which is not guaranteed to be exact.
	 * Special note for nulled clocks: time doesn't pass automatically for nulled clocks, so this method won't return
	 * unless one of the tick methods is called.
	 * @param {number} milliseconds the approximate number of milliseconds to wait
	 */
	async waitAsync(milliseconds: number): Promise<void> {
		ensure.signature(arguments, [ Number ]);

		await new Promise<void>((resolve) => {
			this.#globals.setTimeout(resolve, milliseconds);
		});
	}

	/**
	 * Run a function approximately every N milliseconds. Equivalent to `setInterval()`, which is not guaranteed to be
	 * exact. Special note for nulled clocks: time doesn't pass automatically for nulled clocks, so this method won't
	 * return unless one of the tick methods is called.
	 * @param {number} milliseconds
	 * @param {() => void} fn The function to run.
	 * @returns {() => void} A function that will cancel the repetition (equivalent to `clearInterval()`).
	 */
	repeat(milliseconds: number, fn: () => void): () => void {
		ensure.signature(arguments, [ Number, Function ]);

		const handle = this.#globals.setInterval(fn, milliseconds);
		return () => this.#globals.clearInterval(handle);
	}

	/**
	 * The number of milliseconds that have elapsed since a particular time.
	 * @param { Date | number } startAsDateOrMilliseconds
	 * @returns {number} The elapsed milliseconds.
	 */
	millisecondsSince(startAsDateOrMilliseconds: Date | number): number {
		ensure.signature(arguments, [[ Number, Date ]]);
		return this.now() - Number(startAsDateOrMilliseconds);
	}

	/**
	 * The number of milliseconds until a particular time.
	 * @param { Date | number } endAsDateOrMilliseconds
	 * @returns {number} The milliseconds remaining.
	 */
	millisecondsUntil(endAsDateOrMilliseconds: Date | number): number {
		ensure.signature(arguments, [[ Number, Date ]]);
		return Number(endAsDateOrMilliseconds) - this.now();
	}

	/**
	 * A "dead man's switch." Calls `timeoutFn` if `aliveFn` hasn't been called in the last N milliseconds. Special note
	 * for nulled clocks: time doesn't pass automatically for nulled clocks, so this method won't time out unless one of
	 * the tick methods is called.
	 * @param {number} milliseconds The number of milliseconds to wait before calling `timeoutFn`.
	 * @param {() => void} timeoutFn The function to call if aliveFn() isn't called after `milliseconds`.
	 * @returns {{aliveFn: () => void, cancelFn: () => void}} Call aliveFn() to reset the timeout. Call cancelFn() to
	 *   stop the timeout.
	 */
	keepAlive(milliseconds: number, timeoutFn: () => void): { aliveFn: () => void, cancelFn: () => void } {
		ensure.signature(arguments, [ Number, Function ]);

		let cancelled = false;
		let handle: TimerHandle;

		startTimer(this);

		return {
			aliveFn: () => {
				if (cancelled) return;
				this.#globals.clearTimeout(handle);
				startTimer(this);
			},

			cancelFn: () => {
				cancelled = true;
				this.#globals.clearTimeout(handle);
			},
		};

		function startTimer(self: Clock): void {
			handle = self.#globals.setTimeout(timeoutFn, milliseconds);
		}
	}

	/**
	 * Wait for a promise to resolve and return its value. If it hasn't completed in a certain amount of time, run a
	 * timeout function and return its value instead. Note that this DOES NOT CANCEL the original promise, which will
	 * still run to completion, although its return value will be discarded. (Promises cannot be canceled.) Any
	 * cancellation mechanism you want to use must be programmed into the promise and timeout function.
	 * @template T
	 * @param {number} milliseconds the approximate number of milliseconds to wait
	 * @param {() => T | Promise<T>} fnAsync the promise to wait for
	 * @param {() => T | Promise<T>} timeoutFnAsync the function to run when the time is up
	 * @returns {Promise<T>} the promise's return value (if the promise resolves in time) or the timeout function's
	 *   return value (if it doesn't)
	 */
	async timeoutAsync<T>(milliseconds: number, fnAsync: () => T | Promise<T>, timeoutFnAsync: () => T | Promise<T>): Promise<T> {
		ensure.signature(arguments, [ Number, Function, Function ]);

		let timeoutToken!: TimerHandle;
		const timeoutPromise = new Promise<T>((resolve, reject) => {
			timeoutToken = this.#globals.setTimeout(async () => {
				try {
					const result = await timeoutFnAsync();
					resolve(result);
				}
				catch (err) {
					reject(err);
				}
			}, milliseconds);
		});

		try {
			return await Promise.race([ fnAsync(), timeoutPromise ]);
		}
		finally {
			this.#globals.clearTimeout(timeoutToken);
		}
	}

	/**
	 * Advance a nulled clock forward in time. Throws an exception if the clock isn't nulled. (For
	 * non-nulled clocks, use waitAsync() instead.)
	 * @param {number} milliseconds the number of milliseconds to advance the clock
	 */
	async tickAsync(milliseconds: number): Promise<void> {
		ensure.signature(arguments, [ Number ]);
		await this.#globals.tickAsync(milliseconds);
	}

	/**
	 * Advance a nulled clock forward in time until all timers expire. Throws an exception if the
	 * clock isn't nulled.
	 */
	async tickUntilTimersExpireAsync(): Promise<void> {
		ensure.signature(arguments, []);
		await this.#globals.tickUntilTimersExpireAsync();
	}

}


function nullGlobals({
	now = FAKE_START_TIME,
}: NulledClockOptions = {}): ClockGlobals {
	ensure.signature(arguments, [[ undefined, {
		now: [ undefined, Number, Date ],
	}]]);

	const fake = FakeTimers.createClock(now);

	return {
		Date: fake.Date,

		async tickAsync(milliseconds: number): Promise<void> {
			await fake.tickAsync(milliseconds);
		},

		async tickUntilTimersExpireAsync(): Promise<void> {
			await fake.runAllAsync();
		},

		setTimeout(fn: () => void, milliseconds: number): TimerHandle {
			return fake.setTimeout(fn, milliseconds);
		},

		clearTimeout(handle: TimerHandle): void {
			return fake.clearTimeout(handle);
		},

		setInterval(fn: () => void, milliseconds: number): TimerHandle {
			return fake.setInterval(fn, milliseconds);
		},

		clearInterval(handle: TimerHandle): void {
			return fake.clearInterval(handle);
		},
	};

}
