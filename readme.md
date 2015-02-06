Automatopia
===========

This repository contains build and test automation for JavaScript applications. It's intended as a starting point for your own JavaScript projects. It includes:

* Automated build (using Jake) with:
	* Linting (using JSHint)
	* Node.js tests (using Mocha)
	* Cross-browser tests (using Karma, Mocha, and expect.js)
	* Front-end modules (using Browserify)
* Automated continuous integration (using Git)
* Automated deployment (to Heroku)
* Example code (in the `src` directory):
	* Server-side integration test
	* Development smoke test
	* Release smoke test
	* Client-side DOM test

This code was originally developed for James Shore's [Let's Code: Test-Driven JavaScript](http://www.letscodejavascript.com) screencast. See Lessons Learned #16, [JavaScript Workflow 2015](http://www.letscodejavascript.com/v3/episodes/lessons_learned/16), for a detailed description of the front-end and continuous integration workflow.

You may wonder why this repository includes dependencies (in `node_modules`) and IDE settings (in `.idea`). The reasoning is explained in my essay, "[The Reliable Build](http://www.letscodejavascript.com/v3/blog/2014/12/the_reliable_build)." If you prefer not to include these sorts of things in your repo, it's fine to remove them.

__Change History:__

* *22 Jan 2015:* Front-end modules; `watch` script; improved documentation; `jake run`; latest npm dependencies; integration commit messages; general script improvements
* *29 Jul 2014:* Replaced NodeUnit with Mocha; updated npm dependencies to latest versions; documented process for installing npm packages; replaced JSHint runner with simplebuild-jshint module
* *22 Dec 2013:* Removed unneeded Karma plugins; cleaned up package.json; updated npm dependencies to latest versions
* *24 Sept 2013:* Upgraded to Karma 0.10 (also updated all other npm dependencies to latest versions)
* *30 Nov 2012:* Initial release


To Use
------

Start out by downloading the code as described in "Download and Setup," below. Then:

* If you're a solo developer using this repository as a starting point for a personal project, follow the steps under "Building and Testing."

* If you're part of a team and planning to use the continuous integration script, follow the steps under "Continuous Integration." (If you *don't* plan to use the CI script, follow the steps under "Building and Testing" and supply your own CI tool.)

* If you're part of a team and planning to use the Heroku deployment script, follow the steps under "Deploying to Heroku." Note that the deployment script assumes you're also using the CI script.

Once you have it working, delete anything you don't need and modify anything you like. Make it your own.


Finding Your Way Around
-----------------------

This repository consists of the following directories:

* `.idea`: WebStorm IDE settings. (Optional.)
* `build`: Build, CI, and deployment automation.
* `build/config`: Build configuration.
* `build/scripts`: Build scripts. Don't run them directly; they're used by the scripts in the root directory.
* `build/util`: Modules used by the build scripts.
* `node_modules`: npm dependencies. (Optional. See "Installing, Updating, and Removing npm Packages" below.)
* `src`: Example code.
* `src/client`: Front-end code.
* `src/server`: Node.js server code.

In the repository root, you'll find the following scripts. For each script, there's a `.sh` version for Unix and Mac and a `.bat` version for Windows:

* `ci`: Continuous integration automation.
* `deploy`: Automated deployment to Heroku.
* `jake`: Build and test automation.
* `watch`: Automatically runs `jake` when any files change. Any arguments are passed through to jake.

For all these scripts, use `-T` to see the available build targets and their documentation. If no target is provided, the script will run `default`. Use `--help` for additional options.

The `jake` script has this additional option:

* `loose=true`: Disable strict browser and version checks.


Download and Setup
------------------

To download the project:

1. Install [Git](http://git-scm.com/downloads).
2. Clone the latest code only (to save time): `git clone --depth 1 https://github.com/jamesshore/automatopia.git`
3. Delete the `.git` directory so you start fresh
4. Run `git init`, `git add .`, and `git commit -am "Initial commit"` to initialize the git repository.
5. Follow the instructions under "Building and Testing" to make sure everything works.

(Note: You can also download [a zip file of the source code](https://github.com/jamesshore/automatopia/archive/master.zip), but that won't preserve permissions like Git does.)

To customize the project for your needs:

1. Modify `LICENSE.TXT` to contain your copyright and license. 
2. To cause the build to fail unless certain browsers are tested, edit `build/config/tested_browsers.js`. Otherwise, comment those lines out.
3. Modify `package.json` to include your Node version.


Building and Testing
--------------------

Before building for the first time:

1. Install [Node.js](http://nodejs.org/download/).
2. Download the project as described above.
3. All commands must run from the root of the source tree.

To build (and test):

1. Run `./jake.sh karma` (Unix/Mac) or `jake karma` (Windows) to start the Karma server.
2. Start the browsers you want to test and point each one at `http://localhost:9876`.
3. Run `./jake.sh` (Unix/Mac) or `jake` (Windows) every time you want to build and test. Alternatively, use `./watch.sh` (Unix/Mac) or `watch` (Windows) to automatically run `jake` whenever files change.

To run the app for manual testing:

1. Run `./jake.sh run` (Unix/Mac) or `jake run` (Windows).


Continuous Integration
----------------------

To set up continuous integration for a team of developers:

1. Choose a machine to be the integration machine.
2. Follow the steps for "Building and Testing" on the integration machine.
3. Run `git checkout -b integration` to create and checkout the integration branch.

To set up each development workstation:

1. Choose an easy-to-type name for the development workstation, such as `dev1`. Put a label on the machine with this name so you don't forget it--you'll use it when you integrate.
2. *On the integration machine*, run `git branch <name>` to create a branch for the development workstation.
3. Clone the integration machine's repository to the development workstation. (The steps here depend on your network configuration. Talk to your local Git expert.)
4. *On the development workstation,* run `git checkout <name>` to switch to the development branch.
5. Now you can build and test as described above.

To integrate:

1. Run `./ci.sh usage` (Unix/Mac) or `ci usage` (Windows) for instructions.


Deploying to Heroku
-------------------

Before deploying for the first time:

1. Follow the steps for "Continuous Integration" first.
3. Sign up for a [Heroku account](https://api.heroku.com/signup).
2. *On the integration machine,* install the [Heroku Toolbelt](https://toolbelt.heroku.com/).
4. Create a Heroku application: `heroku create <app_name>`. If you've already created the application, you can reconnect to it with `heroku git:remote --app <app_name>`.
5. *On a development machine,* change `PRODUCTION_URL` at the top of `build/scripts/deploy.jakefile` to `http://<app_name>.herokuapp.com`.
6. Update the `engines` section of `package.json` to match your installed versions of Node and npm. (Use `node --version` and `npm --version` to get the version numbers.)
7. Integrate as described above.

To deploy:

1. *On the integration machine,* run `./deploy.sh latest` (Unix/Mac) or `deploy latest` (Windows) to deploy the integration branch to Heroku. The script will tag your git repository with `deploy-<timestamp>` if the deploy succeeds and passes the smoke tests.

In case of a bad deployment:

1. *On the integration machine,* run `./deploy.sh rollback` (Unix/Mac) or `deploy rollback` (Windows) to do a band-aid rollback to the previous Heroku deployment. This rollback won't "stick", so you'll need to deploy new code soon.
2. If you aren't able to deploy new code right away, choose a previous, good commit to deploy. `gitk` and the `deploy-<timestamp>` tags may be helpful here.
3. Check out the commit: `git checkout <commit_id>`
4. Run `./deploy.sh head` (Unix/Mac) or `deploy head` (Windows) to deploy the commit to Heroku. As above, the script will tag the git repository with `deploy-<timestamp>` if the deploy succeeds and passes the smoke tests.


Installing, Updating, and Removing npm Packages
-----------------------------------------------

This repository assumes you check your npm modules into git. (Why? [See here.](http://www.letscodejavascript.com/v3/blog/2014/12/the_reliable_build)) Some modules come pre-installed. To update those packages, or install new ones, use the following process to ensure that you don't check in binaries:

1. Install the package without building it: `npm install <package> --ignore-scripts --save-dev` (or `--save` instead of `--save-dev`)
2. Check in the new module: `git add . && git commit -a`
3. Build the package: `npm rebuild`
4. Check for files created by the npm build: `git status`
5. Add any new files from the previous step to the `.gitignore` file and check it in.

To update all npm dependencies at once:

1. Delete the `node_modules` directory.
2. Modify `.gitignore` and remove all references to npm module binaries.
3. Install dependencies without building them: `npm install --ignore-scripts`
4. Check everything in: `git add . && git commit -am "Updated npm dependencies"`
5. Rebuild everything: `npm rebuild`
6. Check for files created by the npm build: `git status`
7. Add any new files from the previous step to the `.gitignore` file and check it in.

If you would rather not check your npm modules into git, you can remove them like this:

1. Delete the node_modules directory.
2. Modify `.gitignore` and replace the references to npm module binaries with `node_modules/`.
3. Modify `build/scripts/run_jake.sh` and `build/scripts/run_jake.bat` to say `npm install` instead of `npm rebuild`.
4. Check everything in: `git add . && git commit -am "Removed node_modules"`.


License
-------

MIT License. See `LICENSE.TXT`.