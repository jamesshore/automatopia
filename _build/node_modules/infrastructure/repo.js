// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ensure = require("util/ensure");
const Shell = require("./shell");
const Output = require("infrastructure/console_output");

/**
 * Represents a git repository (and the things that can be done to it).
 */
module.exports = class Repo {

	static create() {
		// This factory method isn't tested, because that would require actually running git,
		// which seems like it would be more trouble than it's worth.
		ensure.signature(arguments, []);
		return new Repo(Shell.create(), Output.createStdout(), Output.createStderr());
	}

	static createNull({
		shell = Shell.createNull(),
		stdout = Output.createNull(),
		stderr = Output.createNull(),
	} = {}) {
		return new Repo(shell, stdout, stderr);
	}

	constructor(shell, stdout, stderr) {
		this._shell = shell;
		this._stdout = stdout;
		this._stderr = stderr;
	}

	async runBuildAsync() {
		ensure.signature(arguments, []);
		await runAsync(this, "./build.sh");
	}

	async hasUncommittedChangesAsync() {
		ensure.signature(arguments, []);

		const { stdout } = await runAsync(this, "git", "status", "--porcelain");
		return stdout !== "";
	}

	async checkoutBranchAsync(branch) {
		ensure.signature(arguments, [ String ]);
		await runAsync(this, "git", "checkout", branch);
	}

	async resetToFreshCheckoutAsync(branch) {
		ensure.signature(arguments, [ String ]);
		await runAsync(this, "git", "reset", "--hard");
		await runAsync(this, "git", "clean", "-fdx");
		await this.checkoutBranchAsync(branch);
	}

	async mergeBranchWithCommitAsync(fromBranch, toBranch, message) {
		ensure.signature(arguments, [ String, String, String ]);
		await this.checkoutBranchAsync(toBranch);
		await runAsync(this, "git", "merge", fromBranch, "--no-ff", "--log=9999", "-m", message);
		await this.checkoutBranchAsync("-");
		await runAsync(this, "git", "merge", toBranch, "--ff-only");
	}

	async tagCommitAsync(commit, tagName, message) {
		await runAsync(this, "git", "tag", "-a", tagName, "-m", message, commit);
	}

	async isHerokuLoggedIn() {
		ensure.signature(arguments, []);

		const { code } = await runAsyncWithoutCheckingErrorCode(this, "heroku", "auth:whoami");
		return code === 0;
	}

	async herokuLogin() {
		ensure.signature(arguments, []);
		await runAsync(this, "heroku", "auth:login");
	}

	async herokuDeployAsync(remoteRepo, branch) {
		ensure.signature(arguments, [ String, String ]);
		await runAsync(this, "git", "push", remoteRepo, `${branch}:master`);
	}

	async herokuRollbackAsync(herokuApp) {
		ensure.signature(arguments, [ String ]);
		await runAsync(this, "heroku", "rollback", "--app", herokuApp);
	}

	async resetToHerokuDeploymentStateAsync() {
		ensure.signature(arguments, []);
		await runAsync(this, "git", "clean", "-fdx");
		await runAsync(this, "npm", "install", "--no-audit");
		await runAsync(this, "npm", "prune", "--production", "--no-audit");
	}

	async rebuildNpmPackagesAsync() {
		ensure.signature(arguments, []);
		await runAsync(this, "npm", "rebuild");
	}

	async hasPackagesWithKnownSecurityFlawsAsync() {
		ensure.signature(arguments, []);
		const { code } = await runAsyncWithoutCheckingErrorCode(this, "npm", "audit");

		return code !== 0;
	}

};

async function runAsync(self, command, ...args) {
	const result = await runAsyncWithoutCheckingErrorCode(self, command, ...args);
	if (result.code !== 0) throw new Error(`${command} ${args[0]} failed`);

	return result;
}

async function runAsyncWithoutCheckingErrorCode(self, command, ...args) {
	const argsRender = args.map(arg => {
		arg = arg.replaceAll('"', '\\"');
		if (arg.includes(" ")) return `"${arg}"`;
		else return arg;
	}).join(" ");

	self._stdout.write(`» ${command} ${argsRender}\n`);
	return await self._shell.execAsync(command, ...args);
}