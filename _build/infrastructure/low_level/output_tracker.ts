// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "../../util/ensure.ts";
import EventEmitter from "node:events";

/** A utility class for infrastructure wrappers. Used to track output */
export default class OutputTracker<T = unknown> {

	private readonly _emitter: EventEmitter;
	private readonly _event: string;
	private readonly _data: T[];
	private readonly _trackerFn: (text: T) => void;

	static create<T = unknown>(emitter: EventEmitter, event: string): OutputTracker<T> {
		ensure.signature(arguments, [ EventEmitter, String ]);
		return new OutputTracker<T>(emitter, event);
	}

	constructor(emitter: EventEmitter, event: string) {
		this._emitter = emitter;
		this._event = event;
		this._data = [];

		this._trackerFn = (text) => this._data.push(text);
		this._emitter.on(this._event, this._trackerFn);
	}

	get data(): T[] {
		return this._data;
	}

	consume(): T[] {
		const result = [ ...this._data ];
		this._data.length = 0;
		return result;
	}

	off(): void {
		this.consume();
		this._emitter.off(this._event, this._trackerFn);
	}

}