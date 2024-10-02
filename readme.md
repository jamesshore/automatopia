# Automatopia

This repository contains JavaScript classes for creating high-performance task and build automation. Here are some of the highlights:

* **Task Automation**
  * [Tasks](_build/node_modules/tasks/tasks.js) - Define and run tasks
  * [TaskCli](_build/node_modules/tasks/task_cli.js) - A command-line interface to Tasks
  * [Reporter](_build/node_modules/tasks/reporter.js) - Provide tidy build progress
  * [Shell](_build/node_modules/infrastructure/shell.js) - Execute programs
  * [FileTree](_build/node_modules/infrastructure/file_tree.js) - Convert file globs to filenames
  * [Colors](_build/node_modules/infrastructure/colors.js) - Color-code build output

* **Incremental Builds**
  * [Tasks](_build/node_modules/tasks/tasks.js) - Define tasks that only run when their source files change
  * [FileSystem](_build/node_modules/infrastructure/file_system.js) - Determine if a file has changed since the last time you operated on it, or if a file is newer than a set of source files
  * [DependencyTree](_build/node_modules/tasks/dependency_tree.js) - Determine if a file *or anything in its dependency tree* has changed since the last time you operated on it 

* **Watching**
  * [FileSystem](_build/node_modules/infrastructure/file_system.js) - Wait until a set of files change
  * [Clock](_build/node_modules/infrastructure/clock.js) - Wait for various conditions
  * [sounds](_build/sounds) - Pleasant sounds to play for different build outcomes 

* **Example Tools**
  * [version](_build/tools/version.js) Check the Node.js version
  * [lint](_build/tools/lint.js) - Run ESLint on files that have changed
  * [tests](_build/tools/tests.js) - Run tests whose dependencies have changed 

This repo is designed for you to copy and customize. Everything's documented with JSDoc comments, so look at the files in [_build](_build) to get started, or check out the highlights above.

To see the example build in action, run `./build.sh` or `./watch.sh quick` from the root of this repo. Use the `--help` option for command-line help.


## Examples

You can find example source code in the [_build](_build) directory. Check out [watch.js](_build/watch.js) and [build.js](_build/build.js) in particular.

The above examples are full-featured and derived from production builds. See below for simpler but complete examples:

### Define and run a build

```javascript
"use strict";

const Tasks = require("tasks/tasks");
const TaskCli = require("tasks/task_cli");
const Reporter = require("tasks/reporter");
const FileSystem = require("infrastructure/file_system");
const Version = require("./tools/version");
const Lint = require("./tools/lint");
const Tests = require("./tools/tests");
const lintConfig = require("./config/eslint.conf");
const testConfig = require("./config/tests.conf");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const generatedDir = `${rootDir}/generated`;
const incrementalDir = `${rootDir}/generated/incremental`;
const timestampDir = `${rootDir}/generated/timestamps`;
const universalExcludes = [ `${rootDir}/node_modules/**`, `${rootDir}/_build/node_modules/tests/vendor/**` ];
const packageJson = `${rootDir}/package.json`;
const lintGlobs = `${rootDir}/**/*.js`;
const testGlobs = `${rootDir}/**/_*_test.js`;

main();

async function main() {
  const tasks = await defineTasksAsync();
  tasks.setDescriptions({
    "default": "Build everything",
    "clean": "Erase incremental files",
    "version": "Check Node.js version",
    "lint": "Lint code",
    "unittest": "Run unit tests",
  });

  TaskCli.create().runAsync(tasks, "BUILD OK", "BUILD FAILURE");
}

async function defineTasksAsync() {
  const fileSystem = FileSystem.create(rootDir, timestampDir);
  const fileTree = await fileSystem.readFileTreeAsync(rootDir, universalExcludes);

  const tasks = Tasks.create({ fileSystem, incrementalDir });
  const version = Version.create(fileSystem);
  const lint = Lint.create(fileSystem);
  const tests = Tests.create(fileSystem, universalExcludes);
  const reporter = Reporter.create();


  tasks.defineTask("default", async () => {
    await tasks.runTasksAsync([ "version", "lint", "unittest" ]);
  });

  tasks.defineTask("clean", async () => {
    await fileSystem.deleteAsync(generatedDir);
  });

  tasks.defineTask("version", async () => {
    await version.checkAsync({ packageJson, reporter });
  });

  tasks.defineTask("lint", async () => {
    await lint.validateAsync({
      description: "JavaScript",
      files: fileTree.matchingFiles(lintGlobs),
      config: lintConfig,
      reporter,
    });
  });

  tasks.defineTask("unittest", async () => {
    await tests.runAsync({
      description: "unit tests",
      files: fileTree.matchingFiles(testGlobs),
      config: testConfig,
      reporter,
    });
  });

  return tasks;
}
```

### Automatically run the build on changes
```javascript
"use strict";

const Build = require("./build");
const FileSystem = require("infrastructure/file_system");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const timestampDir = `${rootDir}/generated/timestamps`;
const watchGlobs = [ `${rootDir}/_build/**`, `${rootDir}/src/**` ];

main();

async function main() {
  const fileSystem = FileSystem.create(rootDir, timestampDir);
  const build = Build.create();

  while (true) {
    console.log("\n*** Building...\n");
    const waitPromise = fileSystem.waitForChangeAsync(watchGlobs);
    await build.runAsync();
    await waitPromise;
  }
}
```


## License

MIT License. See [LICENSE.TXT](LICENSE.TXT).


## Change History

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
