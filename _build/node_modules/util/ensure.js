// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const type = require("./type.js");

/**
 * General-purpose runtime assertion. Throws an exception if the expression isn't true.
 * @param {boolean} expression the expression to check
 * @param {string} message the exception message to throw
 */
exports.that = function(variable, message) {
	if (message === undefined) message = "Expected condition to be true";

	if (variable === false) throw new EnsureError(message, exports.that);
	if (variable !== true) throw new EnsureError("Expected condition to be true or false", exports.that);
};

/**
 * Runtime assertion for code that shouldn't be reachable. Throws an exception.
 * @param {string} [message] the exception message to throw
 */
exports.unreachable = function(message) {
	if (!message) message = "Unreachable code executed";

	throw new EnsureError(message, exports.unreachable);
};

/**
 * Runtime assertion for variables that should be defined. Throws an exception if the variable is undefined.
 * @param {any} variable the variable to check
 * @param {string} variableName the name of the variable, which will be included in the exception message
 */
exports.defined = function(variable, variableName) {
	if (variable === undefined) {
		throw new EnsureError(`${normalize(variableName)} was not defined`, exports.defined);
	}
};

/**
 * Runtime assertion for function signatures. Throws an exception if the function parameters don't match the expected types exactly.
 * @param {any[]} args the function parameters (call it with 'arguments')
 * @param {any[]} sig The function signature as an array. Each element in the array describes the corresponding function parameter. Use JavaScript's class names for each type: String, Number, Array, etc. You can also use 'undefined', 'null', and 'NaN'. For instances, use the name of your class or constructor function (e.g., 'MyClass'). For objects with specific properties, provide an object, and specify the type(s) of each property (e.g., { a: Number, b: [ undefined, String ]}). For parameters that allow multiple types, provide an array containing each type. For optional parameters, provide an array and include 'undefined' as one of the options (e.g., [ undefined, String ].
 * @param {string[]} [names] the names of each parameter (used in error messages)
 */
exports.signature = function(args, signature, names) {
	checkSignature(false, args, signature, names, exports.signature);
};

/**
 * Runtime assertion for function signatures. Throws an exception if the function parameters don't match the expected types, but doesn't complain if there are more parameters or object properties than expected.
 * @param {any[]} args the function parameters (call it with 'arguments')
 * @param {any[]} sig The function signature as an array. Each element in the array describes the corresponding function parameter. Use JavaScript's class names for each type: String, Number, Array, etc. You can also use 'undefined', 'null', and 'NaN'. For instances, use the name of your class or constructor function (e.g., 'MyClass'). For objects with specific properties, provide an object, and specify the type(s) of each property (e.g., { a: Number, b: [ undefined, String ]}). For parameters that allow multiple types, provide an array containing each type. For optional parameters, provide an array and include 'undefined' as one of the options (e.g., [ undefined, String ].
 * @param {string[]} [names] the names of each parameter (used in error messages)
 */
exports.signatureMinimum = function(args, signature, names) {
	checkSignature(true, args, signature, names);
};

/**
 * Runtime assertion for variable types. Throws an exception if the variable doesn't match the expected type exactly.
 * @param {any} variable the variable
 * @param {any} expectedType The expected type. Use JavaScript's class names: String, Number, Array, etc. You can also use 'undefined', 'null', and 'NaN'. For instances, use the name of your class or constructor function (e.g., 'MyClass'). For objects with specific properties, provide an object, and specify the type(s) of each property (e.g., { a: Number, b: [ undefined, String ]}). For parameters that allow multiple types, provide an array containing each type. For optional parameters, provide an array and include 'undefined' as one of the options (e.g., [ undefined, String ].
 * @param {string} name the name of the variable (used in error messages)
 */
exports.type = function(variable, expectedType, name) {
	checkType(variable, expectedType, false, name, exports.type);
};

/**
 * Runtime assertion for variable types. Throws an exception if the variable doesn't match the expected type, but doesn't complain if there are more object properties than expected.
 * @param {any} variable the variable
 * @param {any} expectedType The expected type. Use JavaScript's class names: String, Number, Array, etc. You can also use 'undefined', 'null', and 'NaN'. For instances, use the name of your class or constructor function (e.g., 'MyClass'). For objects with specific properties, provide an object, and specify the type(s) of each property (e.g., { a: Number, b: [ undefined, String ]}). For parameters that allow multiple types, provide an array containing each type. For optional parameters, provide an array and include 'undefined' as one of the options (e.g., [ undefined, String ].
 * @param {string} name the name of the variable (used in error messages)
 */
exports.typeMinimum = function(variable, expectedType, name) {
	checkType(variable, expectedType, true, name, exports.typeMinimum);
};

function checkSignature(allowExtra, args, signature = [], names = [], fnToRemoveFromStackTrace) {
	exports.that(Array.isArray(signature), "ensure.signature(): signature parameter must be an array");
	exports.that(Array.isArray(names), "ensure.signature(): names parameter must be an array");

	const expectedArgCount = signature.length;
	const actualArgCount = args.length;

	if (!allowExtra && (actualArgCount > expectedArgCount)) {
		throw new EnsureError(
			`Function called with too many arguments: expected ${expectedArgCount} but got ${actualArgCount}`,
			fnToRemoveFromStackTrace,
		);
	}

	signature.forEach(function(expectedType, i) {
		const name = names[i] ? names[i] : `Argument #${(i + 1)}`;
		checkType(args[i], expectedType, allowExtra, name, fnToRemoveFromStackTrace);
	});
}

function checkType(variable, expectedType, allowExtraKeys, name, fnToRemoveFromStackTrace) {
	const error = type.check(variable, expectedType, { name: normalize(name), allowExtraKeys });
	if (error !== null) throw new EnsureError(error, fnToRemoveFromStackTrace);
}

function normalize(variableName) {
	return variableName ? variableName : "variable";
}


class EnsureError extends Error {

	constructor(message, fnToRemoveFromStackTrace) {
		super(message);
		Error.captureStackTrace(this, fnToRemoveFromStackTrace);
	}

}