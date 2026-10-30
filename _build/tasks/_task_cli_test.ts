// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import { assert, describe, it } from "../util/tests.ts";
import * as ensure from "../util/ensure.ts";
import TaskCli from "./task_cli.ts";
import Tasks from "./tasks.ts";
import CommandLine, { type CommandLineOptionsSpec } from "../infrastructure/command_line.ts";
import Colors from "../infrastructure/colors.ts";
import ConsoleOutput from "../infrastructure/console_output.ts";
import Clock from "../infrastructure/clock.ts";
import TaskError from "./task_error.ts";

const IRRELEVANT_FN = () => {};
const IRRELEVANT_OPTIONS = { irrelevantOptions: true };

export default describe(() => {

	describe("running tasks", () => {

		it("provides build with the tasks specified on command line", async () => {
			const { tasks, cli } = createCli({
				args: [ "task1", "task3" ],
			});

			tasks.defineTask("task1", IRRELEVANT_FN);
			tasks.defineTask("task2", IRRELEVANT_FN);
			tasks.defineTask("task3", IRRELEVANT_FN);

			const { taskNames } = await runAsync({ cli, tasks });
			assert.equal(taskNames, [ "task1", "task3" ]);
		});

		it("provides 'default' task if it exists and no tasks provided", async () => {
			const { tasks, cli } = createCli({
				args: [],
			});

			tasks.defineTask("default", IRRELEVANT_FN);

			const { taskNames } = await runAsync({ cli, tasks });
			assert.equal(taskNames, [ "default" ]);
		});

		it("does not provide 'default' task if tasks are provided", async () => {
			const { tasks, cli } = createCli({
				args: [ "my_task" ],
			});

			tasks.defineTask("default", IRRELEVANT_FN);
			tasks.defineTask("my_task", IRRELEVANT_FN);

			const { taskNames } = await runAsync({ cli, tasks });
			assert.equal(taskNames, [ "my_task" ]);
		});

		it("doesn't run build function if no arguments are provided and 'default' task doesn't exist", async () => {
			const { tasks, cli } = createCli({
				args: [],
			});

			const { taskNames } = await runAsync({ cli, tasks });
			assert.isUndefined(taskNames);
		});

		it("returns null if build succeeds", async () => {
			const { tasks, cli } = createCli({});
			tasks.defineTask("default", IRRELEVANT_FN);

			const buildFnAsync = async () => {};
			const { returnValue } = await runAsync({ cli, tasks, failureMessage: "my message", buildFnAsync });

			assert.equal(returnValue, null);
		});

		it("returns magic string if build fails outside of a task", async () => {
			const { tasks, cli } = createCli({});
			tasks.defineTask("default", IRRELEVANT_FN);

			const buildFnAsync = () => {
				throw new Error("my error");
			};
			const { returnValue } = await runAsync({ cli, tasks, failureMessage: "my message", buildFnAsync });

			assert.equal(returnValue, TaskCli.BUILD_FAILURE);
		});

		it("returns name of failed task if build fails in a task", async () => {
			const { tasks, cli } = createCli({
				args: [ "my_task" ],
			});
			tasks.defineTask("my_task", () => {
				throw new Error("my_error");
			});

			const buildFnAsync = async () => {
				await tasks.runTasksAsync([ "my_task" ], IRRELEVANT_OPTIONS);
			};

			const { returnValue } = await runAsync({ cli, tasks, failureMessage: "my message", buildFnAsync });

			assert.equal(returnValue, "my_task");
		});

	});


	describe("command-line options", () => {

		it("provides options specified on the command line to the build", async () => {
			const { tasks, cli } = createCli({
				args: [ "task", "--option1", "--option2=my option" ],
				globalOptions: {
					option1: { type: "boolean" },
					option2: { type: "string" },
				},
			});

			tasks.defineTask("task", IRRELEVANT_FN);

			const { taskNames, options } = await runAsync({ cli, tasks });
			assert.equal(taskNames, [ "task" ]);
			assert.equal(options, {
				option1: true,
				option2: "my option",
			});
		});

		it("throws error if tasks specify --help, --tasks, or --debug options", async () => {
			await assertError("help");
			await assertError("tasks");
			await assertError("debug");

			async function assertError(option: string): Promise<void> {
				const { tasks, cli } = createCli({ args: [ "task" ], globalOptions: { [option]: { type: "boolean" } } });
				tasks.defineTask("task", IRRELEVANT_FN);

				await assert.errorAsync(() => runAsync({ cli, tasks }), new RegExp(option), `--${option} should fail`);
			}
		});

		it("throws error if option specification is invalid");
		it("displays error when command-line options are invalid");
		it("lists options on the help screen (put this in 'help' describe block");

	});


	describe("output", () => {

		it("displays success banner and elapsed time when build completes successfully", async () => {
			const { tasks, cli, stdout, clock } = createCli();
			tasks.defineTask("default", IRRELEVANT_FN);

			const buildFnAsync = async () => {
				await clock.tickAsync(1237);
			};

			const { returnValue } = await runAsync({ cli, tasks, successMessage: "my message", buildFnAsync });

			assert.equal(returnValue, null, "should have no failed task");
			assert.equal(stdout, [
				"\n" +
				Colors.brightGreen.inverse("   my message   ") + "\n" +
				"(1.24s)\n",
			]);
		});

		it("displays failure banner when build throws exception", async () => {
			const { tasks, cli, stdout } = createCli();
			tasks.defineTask("default", IRRELEVANT_FN);

			const buildFnAsync = () => {
				throw new Error("my error");
			};

			await runAsync({ cli, tasks, failureMessage: "my message", buildFnAsync });

			assert.includes(stdout[0], "my error");
			assert.includes(stdout[0], " at ", "should contain stack trace");
			assert.includes(stdout[0],
				"\n" +
				Colors.brightRed.inverse("   my message   ") + "\n"
			);
		});

		it("doesn't display stack trace when tasks throw special TaskError", async () => {
			const { tasks, cli, stdout } = createCli();
			tasks.defineTask("default", IRRELEVANT_FN);

			const buildFnAsync = () => {
				throw new TaskError("my_failure");
			};

			await runAsync({ cli, tasks, failureMessage: "my failure message", buildFnAsync });

			assert.equal(stdout, [
				"\n" +
				Colors.brightRed.inverse("   my failure message   ") + "\n" +
				Colors.brightRed.bold("my_failure") + "\n"
			]);
		});

	});


	describe("Debug mode", () => {

		it("displays exception stack trace for TaskErrors when --debug parameter specified", async () => {
			const { tasks, cli, stdout } = createCli({
				args: [ "my_task", "--debug" ],
			});
			tasks.defineTask("my_task", IRRELEVANT_FN);

			const buildFnAsync = () => {
				throw new TaskError("my error");
			};

			await runAsync({ cli, tasks, buildFnAsync });

			assert.includes(stdout[0], " at ");
		});

		it("displays task start, stop, and timing when --debug parameter specified", async () => {
			const { tasks, cli, clock, stdoutTracker } = createCli({
				args: [ "parent_task", "--debug" ],
			});

			tasks.defineTask("parent_task", async () => {
				await tasks.runTasksAsync([ "child_task" ], IRRELEVANT_OPTIONS);
				await clock.tickAsync(100);
			});
			tasks.defineTask("child_task", async () => {
				await tasks.runTasksAsync([ "grandchild_task1", "grandchild_task2" ], IRRELEVANT_OPTIONS);
				await clock.tickAsync(200);
			});
			tasks.defineTask("grandchild_task1", async () => {
				await clock.tickAsync(300);
			});
			tasks.defineTask("grandchild_task2", async () => {
				await clock.tickAsync(400);
			});

			const buildFnAsync = async () => {
				await tasks.runTasksAsync([ "parent_task" ], IRRELEVANT_OPTIONS);
			};

			// run CLI twice to ensure it turns off event tracker (or we'll get doubled-up data in output)
			await runAsync({ cli, tasks, buildFnAsync });
			stdoutTracker.consume();

			await runAsync({ cli, tasks, successMessage: "my success", buildFnAsync });

			assert.equal(stdoutTracker.data, [
				Colors.white.inverse("start: parent_task\n"),
				Colors.white.inverse("start: child_task\n"),
				Colors.white.inverse("start: grandchild_task1\n"),
				Colors.white.inverse("end: grandchild_task1 (0.30s)\n"),
				Colors.white.inverse("start: grandchild_task2\n"),
				Colors.white.inverse("end: grandchild_task2 (0.40s)\n"),
				Colors.white.inverse("end: child_task (0.20s)\n"),
				Colors.white.inverse("end: parent_task (0.10s)\n"),
				"\n" +
				Colors.brightGreen.inverse(`   my success   `) + "\n" +
				"(1.00s)\n",
			]);
		});

	});


	describe("Command-line help", () => {

		it("displays available tasks when --help, -h, --tasks, or -T provided", async () => {
			await assertTasksShown("--help");
			await assertTasksShown("-h");
			await assertTasksShown("--tasks");
			await assertTasksShown("-T");

			async function assertTasksShown(arg: string): Promise<void> {
				const { tasks, cli, stdoutTracker } = createCli({ args: [ arg ] });
				tasks.defineTask("task1", IRRELEVANT_FN);
				tasks.defineTask("task3", IRRELEVANT_FN);
				tasks.defineTask("task2", IRRELEVANT_FN);

				const { returnValue } = await runAsync({ cli, tasks });
				assert.equal(returnValue, "__CLI__", "should have failed CLI task");
				assert.equal(stdoutTracker.data, [
					"\n" + Colors.brightWhite("options:") + " <tasks> [-h|--help|-T|--tasks] [--debug]\n\n",
					Colors.brightWhite.underline("Available tasks:") + "\n",
					`  ${Colors.white.bold("task1")}  \n`,
					`  ${Colors.white.bold("task3")}  \n`,
					`  ${Colors.white.bold("task2")}  \n`,
					"\n",
				]);
				stdoutTracker.consume();
			}
		});

		it("displays task descriptions where available", async () => {
			const { tasks, cli, stdout } = createCli({ args: [ "-T" ] });
			tasks.defineTask("task1", () => {});
			tasks.defineTask("task2Longer", () => {});
			tasks.defineTask("task3", () => {});

			tasks.setDescriptions({
				task3: "Task 3 description",
				task2Longer: "Task 2 description",
			});

			await runAsync({ cli, tasks });
			assert.equal(stdout, [
				"\n" + Colors.brightWhite("options:") + " <tasks> [-h|--help|-T|--tasks] [--debug]\n\n",
				Colors.brightWhite.underline("Available tasks:") + "\n",
				`  ${Colors.white.bold("task1      ")}  \n`,
				`  ${Colors.white.bold("task2Longer")}  Task 2 description\n`,
				`  ${Colors.white.bold("task3      ")}  Task 3 description\n`,
				"\n",
			]);
		});

		it("displays available tasks when no arguments provided and 'default' task doesn't exist", async () => {
			const { tasks, cli, stdout } = createCli({ args: [] });
			tasks.defineTask("my_task", () => {});

			await runAsync({ cli, tasks });

			assert.equal(stdout, [
				"\n" + Colors.brightWhite("options:") + " <tasks> [-h|--help|-T|--tasks] [--debug]\n\n",
				Colors.brightWhite.underline("Available tasks:") + "\n",
				`  ${Colors.white.bold("my_task")}  \n`,
				"\n",
			]);
		});

		it("displays error and available tasks when requested task doesn't exist", async () => {
			const { tasks, cli, stdout } = createCli({
				args: [ "my_task", "no_task1", "no_task2" ],
			});
			tasks.defineTask("my_task", IRRELEVANT_FN);

			const { taskNames, returnValue } = await runAsync({ cli, tasks, failureMessage: "my failure message" });

			assert.equal(stdout, [
				"\n" +
				Colors.brightRed.inverse("   my failure message   ") + "\n" +
				Colors.brightRed.bold("Unrecognized task(s): no_task1, no_task2") + "\n",
				"\n",
				"\n" + Colors.brightWhite("options:") + " <tasks> [-h|--help|-T|--tasks] [--debug]\n\n",
				Colors.brightWhite.underline("Available tasks:") + "\n",
				`  ${Colors.white.bold("my_task")}  \n`,
				"\n",
			]);
			assert.isUndefined(taskNames, "should not have run any tasks");
			assert.equal(returnValue, "__CLI__", "should have failed CLI task");
		});

	});

});


function createCli({
	args = [],
	globalOptions = {},
}: { args?: string[]; globalOptions?: CommandLineOptionsSpec } = {}) {
	const commandLine = CommandLine.createNull({ args });
	const stdout = ConsoleOutput.createNull();
	const stdoutTracker = stdout.track();
	const clock = Clock.createNull();
	const cli = new TaskCli(commandLine, stdout, clock);

	return {
		tasks: Tasks.createNull({ clock, globalCommandLineOptions: globalOptions }),
		cli,
		stdoutTracker,
		stdout: stdoutTracker.data,
		clock,
	};
}

async function runAsync({
	cli,
	tasks,
	successMessage = "irrelevant_success_message",
	failureMessage = "irrelevant_failure_message",
	buildFnAsync = IRRELEVANT_FN,
}: {
	cli: TaskCli;
	tasks: Tasks<unknown>;
	successMessage?: string;
	failureMessage?: string;
	buildFnAsync?: () => void | Promise<void>;
}) {
	ensure.signature(arguments, [{
		cli: TaskCli,
		tasks: Tasks,
		successMessage: [ undefined, String ],
		failureMessage: [ undefined, String ],
		buildFnAsync: [ undefined, Function ],
	}]);

	let buildParms: {
		taskNames: string[];
		options: Record<string, unknown>;
	} | undefined;
	const returnValue = await cli.runAsync(tasks, successMessage, failureMessage, async (taskNames, options) => {
		buildParms = { taskNames, options };
		await buildFnAsync();
	});
	return { ...buildParms, returnValue };
}
