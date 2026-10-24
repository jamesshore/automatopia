// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import { assert, describe, it } from "./tests.ts";
import * as ensure from "./ensure.ts";

interface NodeError extends Error {
	stack: string;
}

export default describe(() => {

	describe("condition checking", () => {

		it("checks if condition is true", () => {
			const that = wrap(ensure.that);

			assert.notError(that(true));
			assertEnsureError(that(false), /Expected condition to be true/);
			assertEnsureError(that(false, "a message"), /a message/);
			assertEnsureError(that("foo"), /Expected condition to be true or false/);
			assertEnsureError(that("foo", "ignored"), /Expected condition to be true or false/);
		});

		it("fails when unreachable code is executed", () => {
			const unreachable = wrap(ensure.unreachable);

			assertEnsureError(unreachable(), /Unreachable code executed/);
			assertEnsureError(unreachable("foo"), /foo/);
		});

	});

	describe("signature checking", () => {

		const signature = wrap(ensure.signature);
		const signatureMinimum = wrap(ensure.signatureMinimum);

		it("checks no arguments", () => {
			assert.notError(signature([]));
			assertEnsureError(signature([ "foo" ]), /Function called with too many arguments: expected 0 but got 1/);
		});

		it("checks one argument", () => {
			assert.notError(signature([ "foo" ], [ String ]));
			assertEnsureError(
				signature([ "foo", "bar" ], [ String ]),
				/Function called with too many arguments: expected 1 but got 2/,
				"# of arguments"
			);
			assertEnsureError(signature([ 42 ], [ String ]), /Argument #1 must be a string, but it was a number/, "invalid");
		});

		it("checks multiple arguments", () => {
			assert.notError(signature([ "foo", "bar", "baz" ], [ String, String, String ]));
			assertEnsureError(
				signature([ "foo", "bar", "baz" ], [ String, String]),
				/Function called with too many arguments: expected 2 but got 3/,
				"# of arguments"
			);
			assertEnsureError(
				signature( [ "foo", 42, 36 ], [ String, String, String ]),
				/Argument #2 must be a string, but it was a number/,
				"fails on first wrong parameter"
			);
		});

		it("supports custom names", () => {
			assertEnsureError(
				signature([ 1, 2, 3 ], [ Number, String, Number ], [ "a", "b", "c" ]),
				/b must be a string, but it was a number/,
				"all names specified"
			);
			assertEnsureError(
				signature([ 1, 2, 3 ], [ Number, String, Number ], [ "a" ]),
				/Argument #2 must be a string, but it was a number/,
				"falls back to generic names if some names not specified"
			);
		});

		it("signatureMinimum allows extra keys in object signatures", () => {
			assert.notError(
				signatureMinimum([ { requiredParm: true, extraParm: true } ], [ { requiredParm: Boolean } ])
			);
		});

		it("signatureMinimum allows extra parameters", () => {
			assert.notError(signatureMinimum([ 1, 2 ], [ Number ]));
		});

		it("supports built-in types", () => {
			assert.notError(signature([ false ], [ Boolean ]));
			assertEnsureError(signature([ false ], [ String ]));

			assert.notError(signature([ "1" ], [ String ]));
			assertEnsureError(signature([ "1" ], [ Number ]));

			assert.notError(signature([ 1 ], [ Number ]));
			assertEnsureError(signature([ 1 ], [ Function ]));

			assert.notError(signature([ function() {} ], [ Function ]));
			assertEnsureError(signature([ function() {} ], [ Object ]));

			assert.notError(signature([ {} ], [ Object ]));
			assertEnsureError(signature([ {} ], [ Array ]));

			assert.notError(signature([ [] ], [ Array ]));
			assertEnsureError(signature([ [] ], [ RegExp ]));

			assert.notError(signature([ /foo/ ], [ RegExp ]));
			assertEnsureError(signature([ /foo/ ], [ Boolean ]));
		});

		it("supports weird types (primarily for allowing nullable objects, etc.)", () => {
			assert.notError(signature([ undefined ], [ undefined ]));
			assertEnsureError(signature([ undefined ], [ null ]), /Argument #1 must be null, but it was undefined/);

			assert.notError(signature([ null ], [ null ]));
			assertEnsureError(signature([ null ], [ NaN ]), /Argument #1 must be NaN, but it was null/);

			assert.notError(signature([ NaN ], [ NaN ]));
			assertEnsureError(signature([ NaN ], [ undefined ]), /Argument #1 must be undefined, but it was NaN/);
		});

		it("supports custom types", () => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const MyClass = function MyClass() {} as any;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const NoName = function() {} as any;
			delete NoName.name;

			assert.notError(signature([ new MyClass() ], [ MyClass ]));
			assert.notError(signature([ new NoName() ], [ NoName ]));
			assertEnsureError(
				signature([ {} ], [ MyClass ]),
				/Argument #1 must be a MyClass instance, but it was an object/,
				"invalid MyClass"
			);
			assertEnsureError(
				signature([ {} ], [ NoName ]),
				/Argument #1 must be an <anon> instance, but it was an object/,
				"invalid anon class"
			);
			assertEnsureError(
				signature([ new NoName() ], [ MyClass ]),
				/Argument #1 must be a MyClass instance, but it was an <anon> instance/,
				"invalid anon instance"
			);
		});

		it("supports multiple types", () => {
			assert.notError(signature([ 1 ], [[ String, Number ]]));
			assertEnsureError(
				signature([ 1 ], [ [ String, Boolean, function MyClass() {} ] ]),
				/Argument #1 must be a string, a boolean, or a MyClass instance, but it was a number/,
				"invalid"
			);
		});

		it("allows optional arguments", () => {
			assert.notError(signature([ 1 ], [ Number, [ undefined, String ] ]));
			assertEnsureError(
				signature([], [ Number ]),
				/Argument #1 must be a number, but it was undefined/,
				"required parameter"
			);

			assert.notError(signature([ {} ], [ [undefined, Object] ]));

			assertEnsureError(
				signature([ "foo" ], [ [undefined, Object] ]),
				/Argument #1 must be undefined or an object, but it was a string/,
				"optional parameter filled in with wrong type"
			);
		});

	});

	describe("type checking", () => {

		it("checks if variable is defined", () => {
			const defined = wrap(ensure.defined);

			assert.notError(defined("foo"));
			assert.notError(defined(null));
			assertEnsureError(defined(undefined), /variable was not defined/);
			assertEnsureError(defined(undefined, "myVariable"), /myVariable was not defined/);
		});

		it("checks if variable is a particular type", () => {
			const type = wrap(ensure.type);
			assertEnsureError(type("string", Number, "const name"), /const name must be a number, but it was a string/);
		});

		it("type checking supports extra keys in object signatures", () => {
			assert.notError(
				() => ensure.typeMinimum({ requiredParm: true, extraParm: true }, { requiredParm: Boolean })
			);
		});

	});

});

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function wrap<T extends Function>(fn: T): (...args: unknown[]) => T {
	return function() {
		const outerArgs = arguments;
		return function() {
			fn.apply(null, outerArgs);
		};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	} as any;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function assertEnsureError(fn: Function, expectedRegexOrExactString?: RegExp | string, message?: string) {
	try {
		fn();
		assert.fail("Expected exception");
	}
	catch (err) {
		const typedErr = err as NodeError;

		if (expectedRegexOrExactString === undefined) return;
		if (typeof expectedRegexOrExactString === "string") {
			assert.equal(typedErr.message, expectedRegexOrExactString, message);
		}
		else {
			assert.match(typedErr.message, expectedRegexOrExactString, message);
		}
		assert.notIncludes(typedErr.stack, "ensure.js", "should filter stack trace");
		return;
	}
}
