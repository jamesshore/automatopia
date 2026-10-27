// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "../../util/ensure.ts";
import EventEmitter from "node:events";

/** A utility class for infrastructure wrappers. Used to track output */
export default class OutputTracker<T = unknown> {

	readonly #emitter: EventEmitter;
	readonly #event: string;
	readonly #data: T[];
	readonly #trackerFn: (text: T) => void;

	static create<T = unknown>(emitter: EventEmitter, event: string): OutputTracker<T> {
		ensure.signature(arguments, [ EventEmitter, String ]);
		return new OutputTracker<T>(emitter, event);
	}

	constructor(emitter: EventEmitter, event: string) {
		this.#emitter = emitter;
		this.#event = event;
		this.#data = [];

		this.#trackerFn = (text) => this.#data.push(text);
		this.#emitter.on(this.#event, this.#trackerFn);
	}

	get data(): T[] {
		return this.#data;
	}

	consume(): T[] {
		const result = [ ...this.#data ];
		this.#data.length = 0;
		return result;
	}

	off(): void {
		this.consume();
		this.#emitter.off(this.#event, this.#trackerFn);
	}

}