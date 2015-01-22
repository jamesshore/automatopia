// Copyright (c) 2012 Titanium I.T. LLC. All rights reserved. See LICENSE.txt for details.
/*global desc, task, jake, fail, complete */

// Release build file. Automates our deployment process.

(function() {
	"use strict";

	var PRODUCTION_URL = "http://tdjs-ll8.herokuapp.com";

	var INTEGRATION_BRANCH = "integration";
	var GIT_HEAD = "HEAD";

	var DEPLOY_LATEST = "git push -f heroku " + INTEGRATION_BRANCH + ":master";
	var DEPLOY_HEAD = "git push -f heroku " + GIT_HEAD + ":master";
	var ROLLBACK = "heroku rollback";

	var http = require("http");
	var sh = require("./../util/sh.js");
	var build_command = require("./../config/build_command.js");
	var paths = require("../config/paths.js");
	var smoketest = require("./../../src/__smoketest_runner.js");

	task("default", function() {
		console.log("This Jakefile deploys the application. Use -T option to see targets.\n");
	});

	desc("Deploy integration branch to Heroku");
	task("latest", [ "git", "commitDist" ], function() {
		deploy(DEPLOY_LATEST, INTEGRATION_BRANCH, function() {
			console.log("\nDEPLOY OK.");
			complete();
		});
	}, { async: true });

	desc("Deploy git HEAD to Heroku (for fixing bad release)");
	task("head", ["build", "git"], function() {
		deploy(DEPLOY_HEAD, GIT_HEAD, function() {
			console.log("\nDEPLOY OK.");
			complete();
		});
	}, { async: true });

	desc("Tell Heroku to rollback to previous release");
	task("rollback", function() {
		function onSuccess() {
			console.log("Rollback complete.");
			runSmokeTests(function(passed) {
				if (passed) complete();
				else fail("Rollback complete but application is still offline! Fix manually.");
			});
		}
		function onFailure() {
			console.log("Rollback failed.");
			runSmokeTests(function(passed) {
				if (passed) fail("Rollback failed but application is online.");
				else fail("Rollback failed and application is still offline! Fix manually.");
			});
		}

		sh.run(ROLLBACK, onSuccess, onFailure);
	}, { async: true });

	desc("Smoke test release");
	task("smoketest", function() {
		runSmokeTests(function(passed) {
			if (!passed) fail("Smoke tests failed");
			complete();
		});
	}, { async: true });

	// Ensure that Git status is clean
	task("git", function() {
		run("git status --porcelain", function(stdout) {
			if (stdout[0]) fail("Cannot deploy until all files checked into git (or added to .gitignore).");
			complete();
		});
	}, { async: true });

	// Check in 'dist' directory
	task("commitDist", [ "build" ], function() {
		console.log("Checking in distribution files...");
		sh.runMany([
			"git add -f " + paths.distDir,
			'git commit --allow-empty -m "Commit distribution files"'
		], complete, onFailure);

		function onFailure() {
			fail("Unable to check in distribution files. Must be cleaned up manually.");
		}
	}, { async: true });

	// Make sure build is clean
	task("build", function() {
		run(build_command.get(), complete, "Cannot deploy until build passes.");
	}, { async: true });

	function deploy(deployCommand, commitToTag, complete) {
		console.log("Deploying...");
		sh.run(deployCommand, onSuccess, onFailure);

		function onSuccess() {
			runSmokeTests(function(passed) {
				if (passed) tagCommit();
				else fail("Smoke test failed. Run rollback target.");
			});
		}

		function onFailure() {
			runSmokeTests(function(passed) {
				if (passed) fail("Deploy failed but application is still online.");
				else fail("Deploy failed and application is offline. Run rollback target.");
			});
		}

		function tagCommit(tagRoot) {
			var deployedAt = new Date();
			var tagMessage = "Application successfully deployed at " + deployedAt.toUTCString() + "\nLocal time: " + deployedAt.toLocaleString();
			var tagCommand = "git tag -a '" + tagName(deployedAt) + "' -m '" + tagMessage + "' " + commitToTag;

			sh.run(tagCommand, complete, function() {
				fail("Application deployed and online, but failed to tag repository.");
			});
		}

		function tagName(date) {
			var humanReadableDate = date.getFullYear() + "." + (date.getMonth() + 1) + "." + date.getDate() + "-";
			var timestamp = date.getTime();
			return "deploy-" + humanReadableDate + timestamp;
		}
	}

	function runSmokeTests(callback) {
		console.log("Testing release...");
		smoketest.runTests(PRODUCTION_URL, function(passed) {
			if (passed) console.log("Application online.");
			else console.log("APPLICATION OFFLINE!");
			callback(passed);
		});
	}

	function run(command, callback, errorMessage) {
		errorMessage = errorMessage || "shell command exited with error code";
		sh.run(command, callback, function() {
			fail(errorMessage);
		});
	}

}());