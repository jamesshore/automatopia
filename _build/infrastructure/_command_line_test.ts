// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import { assert, describe, it } from "../util/tests.ts";
import path from "node:path";
import Shell from "./shell.ts";
import CommandLine from "./command_line.ts";
// dependency: ./_command_line_test_helper.ts

export default describe(() => {

	it("provides raw command-line arguments", async function() {
		const args = [
			"command1", "command2", "-abc", "--option", "--no-d", "-p1", "--parm=parm2", "--", "trailing", "values",
		];

		const stdout = await runModuleAsync(path.resolve(import.meta.dirname, "./_command_line_test_helper.ts"), args);
		assert.equal(
			stdout,
			`rawArguments: ${JSON.stringify(args)}\n`,
		);

	});

	describe("parsing", () => {

		it("does nothing when the command line is empty", () => {
			const commandLine = create([]);

			assert.equal(commandLine.parse(), {
				tasks: [],
				options: {},
			});
		});

		it("parses tasks", () => {
			const commandLine = create([ "task1", "task2", "task3" ]);

			assert.equal(commandLine.parse(), {
				tasks: [ "task1", "task2", "task3" ],
				options: {},
			});
		});

		it("parses options", () => {
			const commandLine = create([ "--option1", "--option2" ]);

			assert.equal(commandLine.parse({
				option1: { type: "boolean" },
				option2: { type: "boolean" },
				optionNotPresent: { type: "boolean" },
			}), {
				tasks: [],
				options: { option1: true, option2: true },
			});
		});

		it("parses tasks and options together", () => {
			const commandLine = create([ "task1", "--option1", "--option2", "task2" ]);

			assert.equal(commandLine.parse({
				option1: { type: "boolean" },
				option2: { type: "boolean" },
			}), {
				tasks: [ "task1", "task2" ],
				options: { option1: true, option2: true },
			});
		});

		it("allows tasks to be specified multiple times", () => {
			const commandLine = create([ "task1", "task2", "task1" ]);

			assert.equal(commandLine.parse(), {
				tasks: [ "task1", "task2", "task1" ],
				options: {},
			});
		});

		it("supports 'no' prefixes", () => {
			const commandLine = create([ "--no-option" ]);

			assert.equal(commandLine.parse({ option: { type: "boolean" } }), {
				tasks: [],
				options: { option: false },
			});
		});

		it("supports options with values", () => {
			const commandLine = create([ "--option1=value1", "--option2", "value2" ]);

			assert.equal(commandLine.parse({
				option1: { type: "string" },
				option2: { type: "string" }
			}), {
				tasks: [],
				options: { option1: "value1", option2: "value2" },
			});
		});

		it("supports options with multiple values", () => {
			const commandLine = create([ "--option=one", "--option=two" ]);

			assert.equal(commandLine.parse({
				option: { type: "string", multiple: true },
				notPresent: { type: "string", multiple: true },
			}), {
				tasks: [],
				options: { option: [ "one", "two" ] },
			});
		});

		it("only looks at last option when multiple are supplied but only one is expected", () => {
			const commandLine = create([ "--option=first", "--option=last" ]);

			assert.equal(commandLine.parse({ option: { type: "string" } }), {
				tasks: [],
				options: { option: "last" },
			});
		});

		it("supports default options", () => {
			const commandLine = create([ "--option3=myOption" ]);

			assert.equal(
				commandLine.parse({
					option1: { type: "string", default: "value" },
					option2: { type: "boolean", default: false },
					option3: { type: "string", default: "overridden" }
				}),
				{
					tasks: [],
					options: { option1: "value", option2: false, option3: "myOption" },
				},
			);
		});

		it("supports short aliases for options", () => {
			const commandLine = create([ "-o" ]);

			assert.equal(commandLine.parse({ option: { type: "boolean", short: "o" } }), {
				tasks: [],
				options: { option: true },
			});
		});


		describe("errors", () => {

			it("returns error when a boolean option is given an argument", () => {
				const commandLine = create([ "--option=value" ]);

				assert.equal(commandLine.parse({ option: { type: "boolean" } }),
					{ error: "Option '--option' does not take an argument" },
				);
			});
			
			it("returns error when a string option isn't given an argument", () => {
				const commandLine = create([ "--option" ]);

				assert.equal(commandLine.parse({ option: { type: "string" } }),
					{ error: "Option '--option <value>' argument missing" },
				);
			});

			it("returns error when a string option isn't given an argument, even if there is a default", () => {
				const commandLine = create([ "--option" ]);

				assert.equal(commandLine.parse({ option: { type: "string", default: "fallback" } }),
					{ error: "Option '--option <value>' argument missing" },
				);
			});

			it("returns error when an unspecified option is present", () => {
				const commandLine = create([ "--option" ]);

				assert.equal(commandLine.parse(), {
					error: "Unknown option '--option'",
				});
			});
			
			it("returns error when -- is present", () => {
				const commandLine = create([ "--" ]);

				assert.equal(commandLine.parse(), {
					error: "Unknown option '--'",
				});
			});

			it("throws when option configuration is invalid", () => {
				const commandLine = create();

				assert.error(
					() => commandLine.parse({ option: { type: "boolean", short: "long" } }),
					/short/,
				);
			});

		});

		function create(args: string[] = []): CommandLine {
			return CommandLine.createNull({ args });
		}

	});


	describe("Nullability", () => {

		it("defaults to no arguments", function() {
			const commandLine = CommandLine.createNull();
			assert.equal(commandLine.rawArguments, []);
		});

		it("allows arguments to be configured", function() {
			const commandLine = CommandLine.createNull({ args: [ "one", "two" ] });
			assert.equal(commandLine.rawArguments, [ "one", "two" ]);
		});

	});

});

async function runModuleAsync(modulePath: string, args: string[] = []): Promise<string> {
	const { stdout, stderr, code } = await Shell.createSilent().execAsync(process.execPath, modulePath, ...args);

	assert.equal(stderr, "", "test helper stderr");
	assert.equal(code, 0, "test helper exit code");

	return stdout;
}
