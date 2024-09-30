// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import FakeTimers, { NodeTimer } from "@sinonjs/fake-timers";
import * as ensure from "../util/ensure.js";

const FAKE_START_TIME = 0;

export interface NulledClockConfiguration {
	now?: number | Date,
}

type TimeoutHandle = number;
type Runnable<T> = ( () => T ) | ( () => Promise<T> );

interface ClockGlobals {
	Date: typeof Date,
	setTimeout: (fn: (...args: unknown[]) => void, milliseconds: number) => TimeoutHandle,
	clearTimeout: (handle: TimeoutHandle) => void,
	setInterval: (fn: (...args: unknown[]) => void, milliseconds: number) => TimeoutHandle,
	clearInterval: (handle: TimeoutHandle) => void,
	tickAsync: (milliseconds: number) => void,
	tickUntilTimersExpireAsync: () => void,
}

/** System clock. */
export class Clock {

	/**
	 * Factory method. Wraps the system clock.
	 * @returns {Clock} the wrapped clock
	 */
	static create(): Clock {
		ensure.signature(arguments, []);

		return new Clock({
			Date,
			setTimeout,
			clearTimeout,
			setInterval,
			clearInterval,
			tickAsync() { throw new Error("Can't advance the clock because it isn't a null clock"); },
			tickUntilTimersExpireAsync() { throw new Error("Can't advance the clock because it isn't a null clock"); }
		});
	}

	/**
	 * Factory method. Creates a simulated system clock.
	 * @param [options] overridable options for the simulated clock
	 * @param {number} [options.now=0] simulated current time
	 * @returns {Clock} the simulated clock
	 */
	static createNull(options?: NulledClockConfiguration) {
		return new Clock(nullGlobals(options));
	}

	private _globals: ClockGlobals;

	/** Only for use by tests. (Use a factory method instead.) */
	constructor(globals: ClockGlobals) {
		this._globals = globals;
	}

	/**
	 * @returns {number} the current time in milliseconds (equivalent to `Date.now()`)
	 */
	now(): number {
		ensure.signature(arguments, []);
		return this._globals.Date.now();
	}

	/**
	 * Wait for a certain amount of time has passed. Equivalent to `setTimeout()`, which is not guaranteed to be exact.
	 * Special note for nulled clocks: time doesn't pass automatically for nulled clocks, so this method won't return
	 * unless one of the tick methods is called.
	 * @param {number} milliseconds the approximate number of milliseconds to wait
	 */
	async waitAsync(milliseconds: number): Promise<void> {
		ensure.signature(arguments, [ Number ]);
		await new Promise((resolve) => {
			this._globals.setTimeout(resolve, milliseconds);
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

		const handle = this._globals.setInterval(fn, milliseconds);
		return () => this._globals.clearInterval(handle);
	}

	/**
	 * The number of milliseconds that have elapsed since a particular time.
	 * @param { Date | number } startAsDateOrMilliseconds
	 * @returns {number} The elapsed milliseconds.
	 */
	millisecondsSince(startAsDateOrMilliseconds: number | Date): number {
		ensure.signature(arguments, [[ Number, Date ]]);
		return this.now() - startAsDateOrMilliseconds.valueOf();
	}

	/**
	 * The number of milliseconds until a particular time.
	 * @param { Date | number } endAsDateOrMilliseconds
	 * @returns {number} The milliseconds remaining.
	 */
	millisecondsUntil(endAsDateOrMilliseconds: number | Date): number {
		ensure.signature(arguments, [[ Number, Date ]]);
		return endAsDateOrMilliseconds.valueOf() - this.now();
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
		let handle : TimeoutHandle;

		startTimer(this);

		return {
			aliveFn: () => {
				if (cancelled) return;
				this._globals.clearTimeout(handle);
				startTimer(this);
			},

			cancelFn: () => {
				cancelled = true;
				this._globals.clearTimeout(handle);
			},
		};

		function startTimer(self: Clock): void {
			handle = self._globals.setTimeout(timeoutFn, milliseconds);
		}
	}

	/**
	 * Wait for a promise to resolve and return its value. If it hasn't completed in a certain amount of time, run a
	 * timeout function and return its value instead. Note that this DOES NOT CANCEL the original promise, which will
	 * still run to completion, although its return value will be discarded. (Promises cannot be cancelled.) Any
	 * cancellation mechanism you want to use must be programmed into the promise and timeout function.
	 * @template T
	 * @param {number} milliseconds the approximate number of milliseconds to wait
	 * @param {() => T | Promise<T>} fnAsync the promise to wait for
	 * @param {() => T | Promise<T>} timeoutFnAsync the function to run when the time is up
	 * @returns {Promise<T>} the promise's return value (if the promise resolves in time) or the timeout function's
	 *   return value (if it doesn't)
	 */
	async timeoutAsync<T>(milliseconds: number, fnAsync: Runnable<T>, timeoutFnAsync: Runnable<T>): Promise<T> {
		ensure.signature(arguments, [ Number, Function, Function ]);

		return await new Promise((resolve, reject) => {
			const timeoutToken = this._globals.setTimeout(() => {
				Promise.resolve(timeoutFnAsync()).then(resolve).catch(reject);
			}, milliseconds);

			Promise.resolve(fnAsync())
				.then(resolve)
				.catch(reject)
				.finally(() => this._globals.clearTimeout(timeoutToken));
		});
	}

	/**
	 * Advance a nulled clock forward in time. Throws an exception if the clock isn't nulled. (For
	 * non-nulled clocks, use waitAsync() instead.)
	 * @param {number} milliseconds the number of milliseconds to advance the clock
	 */
	async tickAsync(milliseconds: number): Promise<void> {
		ensure.signature(arguments, [ Number ]);
		await this._globals.tickAsync(milliseconds);
	}

	/**
	 * Advance a nulled clock forward in time until all timers expire. Throws an exception if the
	 * clock isn't nulled.
	 */
	async tickUntilTimersExpireAsync(): Promise<void> {
		ensure.signature(arguments, []);
		await this._globals.tickUntilTimersExpireAsync();
	}

}

function nullGlobals({
	now = FAKE_START_TIME,
}: NulledClockConfiguration = {}) {
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

		setTimeout(fn: () => void, milliseconds: number): TimeoutHandle {
			return fake.setTimeout(fn, milliseconds) as TimeoutHandle;
		},

		clearTimeout(handle: TimeoutHandle): void {
			return fake.clearTimeout(handle as number & NodeTimer);
		},

		setInterval(fn: () => void, milliseconds: number): TimeoutHandle {
			return fake.setInterval(fn, milliseconds) as TimeoutHandle;
		},

		clearInterval(handle: TimeoutHandle): void {
			return fake.clearInterval(handle as number & NodeTimer);
		},
	};

}
