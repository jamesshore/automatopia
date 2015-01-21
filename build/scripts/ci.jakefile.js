// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
/*global desc, task, jake, fail, complete */

// Integration build file. Automates the continuous integration process.

(function() {
	"use strict";

	var build_command = require("./../config/build_command.js");
	var sh = require("./../util/sh.js");


	desc("Quick reference");
	task("default", function() {
		console.log(
			"Integration quick reference:\n" +
			"   On development machine:\n" +
			"     1. Confirm good build\n" +
			"     2. 'pull', then confirm good build\n" +
			"     3. 'push[<workstation_name>]'\n" +
			"   On integration machine:\n" +
			"     4. 'promote[<workstation_name>]'\n" +
			"\n" +
			"Start over if someone else integrates after you 'pull' and before you finish.\n" +
			"\n" +
			"For full usage instructions, run `ci usage`.\n" +
			"For setup instructions, run `ci init`."
		);
	});

	desc("Usage instructions");
	task("usage", function() {
		console.log(
			"Usage:\n" +
			"For instructions on setting up your repository, run the 'init' target.\n" +
			"\n" +
			"To reset your repository to known-good state:\n" +
			"   1. Run the 'reset' target with 'y' parameter, like this: `ci reset[y]`.\n" +
			"      (WARNING: deletes ALL changes on your machine since the last successful\n" +
			"      integration, INCLUDING commits.)\n" +
			"\n" +
			"To integrate your changes:\n" +
			"  On your development machine:\n" +
			"    1. Confirm the code builds clean.\n" +
			"    2. Commit your changes.\n" +
			"    3. Run `ci pull` to merge the latest known-good code into your local copy.\n" +
			"       ==> If there's a merge conflict, fix it and commit.\n" +
			"    4. Confirm the merged code builds clean.\n" +
			"       ==> If it doesn't, fix the problem and start over.\n" +
			"    5. Confirm that the integration machine is available and no one has\n" +
			"       integrated since you pulled.\n" +
			"       ==> If they have, start over when they're done integrating.\n" +
			"    6. Run `ci push[<workstation_name>]` to copy your code to the integration\n" +
			"       machine.\n" +
			"  On the integration machine:\n" +
			"    7. Run `ci promote[<workstation_name>]` to build the code and merge it into\n" +
			"       the integration branch.\n" +
			"       ==> If the build fails, fix the problem on your machine and start over.\n"
		);
	});

	desc("Instructions for setting up repository");
	task("init", function() {
		console.log(
			"To set up your Git repository for continuous integration:\n" +
			"1. Choose an unused development workstation to use as the integration machine.\n" +
			"2. Merge all your unintegrated code into a single repository and get it to\n" +
			"   build clean. This will be your master integration repository.\n" +
			"3. Copy your master integration repository to the integration machine.\n" +
			"4. Make sure the repository HEAD points to your integrated, known-good code.\n" +
			"5. Create an integration branch by running 'git checkout -b integration'.\n" +
			"   (This will also switch you to that branch.)\n" +
			"6. Create a branch for each development workstation by running\n" +
			"   'git branch <workstation_name>' for each one.\n" +
			"7. Clone the integration machine's repository to each development machine by\n" +
			"   running 'git clone <integration_repository_url>' on each dev machine.\n" +
			"8. Switch each development workstation to use its own branch by running\n" +
			"   'git checkout <workstation_name>' on each one.\n" +
			"9. Start developing. Integrate every few hours. When you're ready to integrate,\n" +
			"   run `ci usage` for instructions, or `ci` for a quick reference.\n"
		);
	});

	desc("Reset repository to integration branch. DESTRUCTIVE.");
	task("reset", function(confirm) {
		if (confirm !== "y") {
			console.log(
				"WARNING: This command will erase all your un-integrated work, INCLUDING\n" +
				"any un-integrated commits. To confirm, run using 'reset[y].'\n"
			);
			fail("Reset not confirmed");
		}

		run([
			"git clean -fdx",                           // Remove extraneous files
			"git fetch origin",                         // Get latest from integration machine
			"git reset --hard origin/integration"       // Sync with latest position of integration branch
		], function() {
			console.log("\nOK. Current branch has been reset to match integration branch.");
			complete();
		});
	}, {async: true});

	desc("Merge integration branch into current branch.");
	task("pull", ["status"], function() {
		run([
			"git pull origin integration"
		], function() {
			console.log("\nOK. Integration branch has been merged into current branch.");
			complete();
		});
	}, {async: true});

	desc("Push commits to integration machine for validation.");
	task("push", ["status"], function(branch) {
		if (!branch) {
			console.log(
				"This command will push your code to the integration machine. Pass your\n" +
				"branch name as a parameter (e.g., 'push[workstation_name]').\n"
			);
			fail("No branch provided");
		}
		run([
			"git push origin " + branch
		], function() {
			console.log("\nOK. Current branch has been copied to integration machine.");
			complete();
		});
	}, {async: true});

	desc("Merge to integration branch. INTEGRATION BOX ONLY.");
	task("promote", ["status"], function(branch) {
		if (!branch) {
			console.log(
				"This command will build your code and merge it into the integration\n" +
				"branch. Pass your branch name as a parameter ('promote[workstation_name]').\n" +
				"CAREFUL: This command must only be run on the master integration machine.\n"
			);
			fail("No branch provided");
		}

		checkoutAndBuild(afterSuccessfulBuild, afterFailedBuild);

		function checkoutAndBuild(successCallback, failureCallback) {
			sh.runMany([
				"git checkout " + branch,
				"git merge integration --ff-only",   // make sure integration branch has already been merged
				build_command.get()
			], successCallback, failureCallback);
		}
		function afterSuccessfulBuild() {
			run([
				"git checkout integration",
				"git merge " + branch + " --no-ff --log=500 -m INTEGRATE: --edit"
			], function() {
				console.log("\nINTEGRATION OK. " + branch + " has been merged into integration branch.");
				complete();
			});
		}
		function afterFailedBuild() {
			run([
				"git checkout integration"
			], function() {
				fail("Integration failed.");
			});
		}
	}, {async:true});

	// Ensure there aren't any files that need to be checked in or ignored
	task("status", function() {
		run(["git status --porcelain"], function(stdout) {
			if (stdout[0]) fail("Working directory contains changes. Commit or ignore them first.");
			complete();
		});
	}, {async:true});

	function run(commands, callback, errorMessage) {
		errorMessage = errorMessage || "shell command exited with error code";
		sh.runMany(commands, callback, function() {
			fail(errorMessage);
		});
	}
}());