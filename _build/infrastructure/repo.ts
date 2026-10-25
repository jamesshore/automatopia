// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import Shell, { type ShellResult } from "./shell.ts";
import ConsoleOutput from "./console_output.ts";

/**
 * Represents a git repository (and the things that can be done to it).
 */
export default class Repo {

	private readonly _shell: Shell;
	private readonly _stdout: ConsoleOutput;
	private readonly _stderr: ConsoleOutput;

	static create(): Repo {
		// This factory method isn't tested, because that would require actually running git,
		// which seems like it would be more trouble than it's worth.
		ensure.signature(arguments, []);
		return new Repo(Shell.create(), ConsoleOutput.createStdout(), ConsoleOutput.createStderr());
	}

	static createNull(): Repo {
		return new Repo(Shell.createNull(), ConsoleOutput.createNull(), ConsoleOutput.createNull());
	}

	constructor(shell: Shell, stdout: ConsoleOutput, stderr: ConsoleOutput) {
		this._shell = shell;
		this._stdout = stdout;
		this._stderr = stderr;
	}

	async runBuildAsync(): Promise<void> {
		ensure.signature(arguments, []);
		await this.#runAsync("./build.sh");
	}

	async hasUncommittedChangesAsync(): Promise<boolean> {
		ensure.signature(arguments, []);

		const { stdout } = await this.#runAsync("git", "status", "--porcelain");
		return stdout !== "";
	}

	async checkoutBranchAsync(branch: string): Promise<void> {
		ensure.signature(arguments, [ String ]);
		await this.#runAsync("git", "checkout", branch);
	}

	async resetToFreshCheckoutAsync(branch: string): Promise<void> {
		ensure.signature(arguments, [ String ]);
		await this.#runAsync("git", "reset", "--hard");
		await this.#runAsync("git", "clean", "-fdx");
		await this.checkoutBranchAsync(branch);
	}

	async mergeBranchWithCommitAsync(fromBranch: string, toBranch: string, message: string): Promise<void> {
		ensure.signature(arguments, [ String, String, String ]);
		await this.checkoutBranchAsync(toBranch);
		await this.#runAsync("git", "merge", fromBranch, "--no-ff", "--log=9999", "-m", message);
		await this.checkoutBranchAsync("-");
		await this.#runAsync("git", "merge", toBranch, "--ff-only");
	}

	async tagCommitAsync(commit: string, tagName: string, message: string): Promise<void> {
		await this.#runAsync("git", "tag", "-a", tagName, "-m", message, commit);
	}

	async isHerokuLoggedIn(): Promise<boolean> {
		ensure.signature(arguments, []);

		const { code } = await this.#runAsyncWithoutCheckingErrorCode("heroku", "auth:whoami");
		return code === 0;
	}

	async herokuLogin(): Promise<void> {
		ensure.signature(arguments, []);
		await this.#runAsync("heroku", "auth:login");
	}

	async herokuDeployAsync(remoteRepo: string, branch: string): Promise<void> {
		ensure.signature(arguments, [ String, String ]);
		await this.#runAsync("git", "push", remoteRepo, `${branch}:master`);
	}

	async herokuRollbackAsync(herokuApp: string): Promise<void> {
		ensure.signature(arguments, [ String ]);
		await this.#runAsync("heroku", "rollback", "--app", herokuApp);
	}

	async resetToHerokuDeploymentStateAsync(): Promise<void> {
		ensure.signature(arguments, []);
		await this.#runAsync("git", "clean", "-fdx");
		await this.#runAsync("npm", "install", "--no-audit");
		await this.#runAsync("npm", "prune", "--production", "--no-audit");
	}

	async rebuildNpmPackagesAsync(): Promise<void> {
		ensure.signature(arguments, []);
		await this.#runAsync("npm", "rebuild");
	}

	async hasPackagesWithKnownSecurityFlawsAsync(): Promise<boolean> {
		ensure.signature(arguments, []);
		const { code } = await this.#runAsyncWithoutCheckingErrorCode("npm", "audit");

		return code !== 0;
	}


	async #runAsync(command: string, ...args: string[]): Promise<ShellResult> {
		const result = await this.#runAsyncWithoutCheckingErrorCode(command, ...args);
		if (result.code !== 0) throw new Error(`${command} ${args[0]} failed`);

		return result;
	}

	async #runAsyncWithoutCheckingErrorCode(command: string, ...args: string[]): Promise<ShellResult> {
		const argsRender = args.map(arg => {
			arg = arg.replaceAll('"', '\\"');
			if (arg.includes(" ")) return `"${arg}"`;
			else return arg;
		}).join(" ");

		this._stdout.write(`» ${command} ${argsRender}\n`);
		return await this._shell.execAsync(command, ...args);
	}

}