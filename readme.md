# Automatopia

This repository contains TypeScript classes for creating high-performance task and build automation. Here are some of the highlights:

* **Task Automation**
  * [Tasks](_build/tasks/tasks.ts) - Define and run tasks
  * [TaskCli](_build/tasks/task_cli.ts) - A command-line interface to Tasks
  * [Reporter](_build/tasks/reporter.ts) - Provide tidy build progress
  * [Shell](_build/infrastructure/shell.ts) - Execute programs
  * [FileTree](_build/infrastructure/file_tree.ts) - Convert file globs to filenames
  * [Colors](_build/infrastructure/colors.ts) - Color-code build output

* **Incremental Builds**
  * [Tasks](_build/tasks/tasks.ts) - Define tasks that only run when their source files change
  * [FileSystem](_build/infrastructure/file_system.ts) - Determine if a file has changed since the last time you operated on it, or if a file is newer than a set of source files
  * [DependencyTree](_build/tasks/dependency_tree.ts) - Determine if a file *or anything in its dependency tree* has changed since the last time you operated on it

* **Watching**
  * [FileSystem](_build/infrastructure/file_system.ts) - Wait until a set of files change
  * [Clock](_build/infrastructure/clock.ts) - Wait for various conditions
  * [sounds](_build/sounds) - Pleasant sounds to play for different build outcomes 

* **Example Tools**
  * [version](_build/tools/version.ts) Check the Node.js version
  * [lint](_build/tools/lint.ts) - Run ESLint on files that have changed
  * [tests](_build/tools/tests.ts) - Run tests whose dependencies have changed

This repo is designed for you to copy and customize. Everything's documented with JSDoc comments, so look at the files in [_build](_build) to get started, or check out the highlights above.

To see the example build in action, run `./build.sh` or `./watch.sh quick` from the root of this repo. Use the `--help` option for command-line help.


## Examples

You can find example source code in the [_build](_build) directory. Check out [watch.ts](_build/watch.ts) and [build.ts](_build/build.ts) in particular.

The above examples are full-featured and derived from production builds. See below for simpler but complete examples:

### Define and run a build

```typescript
import Tasks from "./tasks/tasks.ts";
import TaskCli from "./tasks/task_cli.ts";
import Reporter from "./tasks/reporter.ts";
import FileSystem from "./infrastructure/file_system.ts";
import Version from "./tools/version.ts";
import Lint from "./tools/lint.ts";
import Tests from "./tools/tests.ts";
import lintConfig from "./config/eslint.config.ts";
import testConfig from "./config/tests.conf.ts";
import path from "node:path";
import type { Linter } from "eslint";

interface TaskParameters {
  reporter: Reporter;
}

const rootDir = path.resolve(import.meta.dirname, "..");
const generatedDir = `${rootDir}/generated`;
const incrementalDir = `${rootDir}/generated/incremental`;
const timestampDir = `${rootDir}/generated/timestamps`;
const universalExcludes = [ `${rootDir}/node_modules/**` ];
const packageJson = `${rootDir}/package.json`;
const lintGlobs = `${rootDir}/**/*.ts`;
const testGlobs = `${rootDir}/**/_*_test.ts`;

await main();

async function main(): Promise<void> {
  const tasks = await defineTasksAsync();
  tasks.setDescriptions({
    "default": "Build everything",
    "clean": "Erase incremental files",
    "version": "Check Node.js version",
    "lint": "Lint code",
    "unittest": "Run unit tests",
  });

  const result = await TaskCli.create().runAsync(tasks, "BUILD OK", "BUILD FAILURE", async (taskNames, options) => {
    const reporter = Reporter.create({ debug: options.debug === true });
    await tasks.runTasksAsync(taskNames, { reporter });
  });
  process.exitCode = result === null ? 0 : 1;
}

async function defineTasksAsync(): Promise<Tasks<TaskParameters>> {
  const fileSystem = FileSystem.create(rootDir, timestampDir);
  const fileTree = await fileSystem.readFileTreeAsync(rootDir, universalExcludes);

  const tasks = Tasks.create<TaskParameters>({ fileSystem, incrementalDir });
  const version = Version.create(fileSystem);
  const lint = Lint.create(fileSystem);
  const tests = Tests.create(fileSystem, universalExcludes);


  tasks.defineTask("default", async (options) => {
    await tasks.runTasksAsync([ "version", "lint", "unittest" ], options);
  });

  tasks.defineTask("clean", async () => {
    await fileSystem.deleteAsync(generatedDir);
  });

  tasks.defineTask("version", async ({ reporter }) => {
    await version.checkAsync({ packageJson, reporter });
  });

  tasks.defineTask("lint", async ({ reporter }) => {
    await lint.validateAsync({
      description: "TypeScript",
      files: fileTree.matchingFiles(lintGlobs),
      config: lintConfig as Linter.Config[],
      reporter,
    });
  });

  tasks.defineTask("unittest", async ({ reporter }) => {
    await tests.runAsync({
      description: "unit tests",
      testFiles: fileTree.matchingFiles(testGlobs),
      config: testConfig,
      reporter,
    });
  });

  return tasks;
}
```

### Automatically run the build on changes
```typescript
import Build from "./build.ts";
import FileSystem from "./infrastructure/file_system.ts";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const timestampDir = `${rootDir}/generated/timestamps`;
const watchGlobs = [ `${rootDir}/_build/**`, `${rootDir}/src/**` ];

await main();

async function main(): Promise<void> {
  const fileSystem = FileSystem.create(rootDir, timestampDir);
  const build = Build.create();

  while (true) {
    console.log("\n*** Building...\n");
    const waitPromise = fileSystem.waitForChangeAsync(watchGlobs);
    await build.runAsync({ resetTreeCache: true });
    await waitPromise;
  }
}
```


## License

MIT License. See [LICENSE.TXT](LICENSE.TXT).


## Change History

* *27 Oct 2026:* Fix linter to pass through filename so file-specific rules apply, particularly TypeScript.
* *27 Oct 2026:* Convert to TypeScript. Includes BREAKING CHANGES:
  * DependencyTree methods exclude inappropriate values instead of returning an empty array. For example, if there are no errors, there will be no "errors" property at all, instead of an empty "errors" array.
  * FileSystem.readFileTreeAsync()'s "globsToExclude" parameter must be an array.
* *23 Oct 2026:* Remove compile step (uses Node's built-in type stripping instead)
* *23 Oct 2026:* Clean up directory structure
* *23 Oct 2026:* Fix tests to work with ergotest 0.14.0
* *24 May 2026:* Update for ergotest 0.14.0
* *9 Nov 2024:* Prevent dangling Node processes by waiting until build finishes before restarting when build files change
* *14 Oct 2024:* TaskCli provides runs build function and provides command-line options; add detailed debug logs
* *13 Oct 2024:* Remove test runner into separate "ergotest" npm package
* *6 Oct 2024:* Convert to ES Modules
* *1 Oct 2024:* More beautification (especially file names and dependency errors)
* *30 Sep 2024:* Make type-checking more strict, beautify shell output (particularly TypeScript errors)
* *29 Sep 2024:* Add TypeScript support, stop vendoring `node_modules`
* *23 Sep 2024:* Rebuild from current production codebase
* *21 Sep 2016:* Latest npm dependencies; Node LTS v4.5.0
* *13 Jun 2016:* Latest npm dependencies; Node LTS v4.4.5
* *22 Jan 2015:* Front-end modules; `watch` script; improved documentation; `jake run`; latest npm dependencies; integration commit messages; general script improvements
* *29 Jul 2014:* Replaced NodeUnit with Mocha; updated npm dependencies to latest versions; documented process for installing npm packages; replaced JSHint runner with simplebuild-jshint module
* *22 Dec 2013:* Removed unneeded Karma plugins; cleaned up package.json; updated npm dependencies to latest versions
* *24 Sep 2013:* Upgraded to Karma 0.10 (also updated all other npm dependencies to latest versions)
* *30 Nov 2012:* Initial release
