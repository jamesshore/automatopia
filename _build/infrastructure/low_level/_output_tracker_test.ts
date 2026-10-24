// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import { assert, describe, it } from "../../util/test.ts";
import OutputTracker from "./output_tracker.ts";
import EventEmitter from "node:events";

export default describe("OutputTracker", () => {

	const EVENT = "my_event";

	it("tracks emitted events", function() {
		const { emitter, tracker } = createTracker<string>();

		emitter.emit(EVENT, "my output 1");
		emitter.emit(EVENT, "my output 2");

		assert.equal(tracker.data,  [ "my output 1", "my output 2" ]);
	});

	it("can be turned off", function() {
		const { emitter, tracker } = createTracker<string>();

		emitter.emit(EVENT, "my output 1");
		tracker.off();
		emitter.emit(EVENT, "my output 2");

		assert.equal(tracker.data,  []);
	});

	it("tracker allows output to be consumed", function() {
		const { emitter, tracker } = createTracker<string>();

		emitter.emit(EVENT, "my output 1");
		assert.equal(tracker.consume(), [ "my output 1" ]);

		emitter.emit(EVENT, "my output 2");
		assert.equal(tracker.consume(), [ "my output 2" ]);
	});

	it("supports arbitrary data types", function() {
		const { emitter, tracker } = createTracker();

		emitter.emit(EVENT, { data: [ "nested", 3.14 ]});
		assert.equal(tracker.data,  [
			{ data: [ "nested", 3.14 ]}
		]);
	});

	function createTracker<T = unknown>() {
		const emitter = new EventEmitter();
		const tracker = OutputTracker.create<T>(emitter, EVENT);
		return { emitter, tracker };
	}

});