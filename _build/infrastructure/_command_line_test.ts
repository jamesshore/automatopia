// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import { assert, describe, it } from "../util/tests.ts";
import path from "node:path";
import Shell from "./shell.ts";
import CommandLine from "./command_line.ts";
// dependency: ./_command_line_test_helper.ts

export default describe(() => {

	it("provides raw and cooked command-line arguments", async function() {
		const args = [
			"command1", "command2", "-abc", "--option", "--no-d", "-p1", "--parm=parm2", "--", "trailing", "values"
		];

		const stdout = await runModuleAsync(path.resolve(import.meta.dirname, "./_command_line_test_helper.ts"), args);
		assert.equal(stdout,
			`rawArguments: ${JSON.stringify(args)}\n` +
			`commands: ${JSON.stringify([ "command1", "command2" ])}\n` +
			`options: ${JSON.stringify({ 
				a: true,
				b: true,
				c: true,
				option: true,
				d: false,
				p: 1,
				parm: "parm2",
				"--": [ "trailing", "values" ],
			})}\n`
		);
	});


	describe("Nullability", () => {

		it("defaults to no arguments", function() {
			const commandLine = CommandLine.createNull();
			assert.equal(commandLine.rawArguments, []);
		});

		it("allows arguments to be configured", function() {
			const commandLine = CommandLine.createNull({ args: [ "one", "two" ]});
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
