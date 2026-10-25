// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import { assert, describe, it } from "../util/tests.ts";
import * as ensure from "../util/ensure.ts";
import path from "node:path";
import childProcess from "node:child_process";
import ConsoleOutput from "./console_output.ts";
// dependency: ./_console_output_test_helper.ts

export default describe(() => {

	it("real version writes to stdout (or stderr), null version doesn't", async () => {
		const { stdout, stderr } = await runModuleAsync(
			import.meta.dirname,
			"./_console_output_test_helper.ts",
			{ failOnStderr: false }
		);
		assert.equal(stdout, "string stdout\nbuffer stdout\n");
		assert.equal(stderr, "string stderr\n");
	});

	it("tracks writes", () => {
		const stdout = ConsoleOutput.createNull();
		const track = stdout.track().data;

		stdout.write("string stdout");
		stdout.write(Buffer.from("buffer stdout"));
		assert.equal(track, [
			"string stdout",
			"buffer stdout",
		]);
	});

});

function runModuleAsync(cwd: string, modulePath: string, {
	args = [],
	failOnStderr = true,
}: { args?: string[], failOnStderr?: boolean } = {}): Promise<{ stdout: string, stderr: string }> {
	return new Promise((resolve, reject) => {
		ensure.signature(arguments, [ String, String, [ undefined, {
			args: [ undefined, Array ],
			failOnStderr: [ undefined, Boolean ],
		}]], [ "cwd", "modulePath", "options" ]);

		const absolutePath = path.resolve(cwd, modulePath);
		const options: childProcess.ForkOptions = {
			stdio: "pipe",
		};
		const child = childProcess.fork(absolutePath, args, options);

		let stdout = "";
		let stderr = "";
		child.stdout!.on("data", (data: Buffer) => {
			stdout += data;
		});
		child.stderr!.on("data", (data: Buffer) => {
			stderr += data;
		});

		child.on("exit", () => {
			if (failOnStderr && stderr !== "") {
				console.log(stderr);
				return reject(new Error("Runner failed"));
			}
			else {
				return resolve({ stdout, stderr });
			}
		});
	});
}
