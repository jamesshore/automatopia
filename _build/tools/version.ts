// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "../util/ensure.ts";
import Reporter from "../tasks/reporter.ts";
import TaskError from "../tasks/task_error.ts";
import FileSystem from "../infrastructure/file_system.ts";

export default class Version {

	private readonly _fileSystem: FileSystem;
	private _checked: boolean;

	static create(fileSystem: FileSystem): Version {
		ensure.signature(arguments, [ FileSystem ]);

		return new Version(fileSystem);
	}

	constructor(fileSystem: FileSystem) {
		this._fileSystem = fileSystem;
		this._checked = false;
	}

	async checkAsync({ packageJson, reporter }: {
		packageJson: string;
		reporter: Reporter;
	}): Promise<void> {
		ensure.signature(arguments, [{
			packageJson: String,
			reporter: Reporter,
		}]);

		if (this._checked) return;
		await reporter.startAsync("Checking Node.js version", async (report) => {
			const json = await this._fileSystem.readTextFileAsync(packageJson);
			const expectedVersion = "v" + JSON.parse(json).engines.node;
			const actualVersion = process.version;

			report.debug(`\n  Expected: ${expectedVersion}`);
			report.debug(`\n  Actual: ${actualVersion}`);

			if (expectedVersion !== actualVersion) {
				throw new TaskError(`Incorrect Node version. Expected ${expectedVersion}, but was ${actualVersion}.`);
			}
			this._checked = true;
		});
	}

}
