// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

/**
 * A normal exception that's treated specially by command-line task runner. When this exception occurs, the command-line runner displays it without the stack trace, leading to a clean failure message. Throw this exception when a task fails for normal reasons.
 */
export default class TaskError extends Error {

	/**
	 * @param message The error message to display.
	 */
	constructor(message) {
		super(message);
	}

}