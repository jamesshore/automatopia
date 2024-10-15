// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import * as ensure from "util/ensure.js";
import Colors from "infrastructure/colors.js";
import FileSystem from "infrastructure/file_system.js";
import TaskError from "tasks/task_error.js";
import Reporter from "tasks/reporter.js";
import Shell from "infrastructure/shell.js";
import swc from "@swc/core";
import path from "node:path";

export default class TypeScript {

	static create(fileSystem) {
		ensure.signature(arguments, [ FileSystem ]);

		return new TypeScript(fileSystem, Shell.create());
	}

	constructor(fileSystem, shell) {
		this._fileSystem = fileSystem;
		this._shell = shell;
	}

	async compileAsync({
		description,
		files,
		sourceDir,
		outputDir,
		config,
		reporter,
	}) {
		ensure.signature(arguments, [{
			description: String,
			files: Array,
			sourceDir: String,
			outputDir: String,
			config: Object,
			reporter: Reporter,
		}]);

		const typescriptToCompile = await this.#synchronizeSourceTreeToTarget(reporter, description, sourceDir, outputDir);
		await this.#runCompiler(reporter, description, typescriptToCompile, sourceDir, outputDir, config);
	}

	mapTsToJs({ files, sourceDir, outputDir }) {
		ensure.signature(arguments, [{ files: Array, sourceDir: String, outputDir: String }]);

		return files.map(file => {
			const relativeFile = path.relative(sourceDir, file);
			const relocatedFile = path.resolve(outputDir, relativeFile);
			if (file.endsWith(".ts")) {
				return `${path.dirname(relocatedFile)}/${path.basename(relocatedFile, "ts")}js`;
			}
			else {
				return relocatedFile;
			}
		});
	}

	async #synchronizeSourceTreeToTarget(reporter, description, sourceDir, outputDir) {
		return await reporter.quietStartAsync(`Synchronizing ${description}`, async (report) => {
			const tsToJsFn = (sourceFile) => {
				if (!sourceFile.endsWith(".ts")) return sourceFile;

				const noExtension = `${path.dirname(sourceFile)}/${path.basename(sourceFile, "ts")}`;
				return [ `${noExtension}js`, `${noExtension}js.map` ];
			};

			const { added, removed, changed } = await this._fileSystem.compareDirectoriesAsync(
				sourceDir, outputDir, tsToJsFn,
			);

			const filesToCopy = [ ...added, ...changed ];
			const filesToDelete = removed;

			const typescriptToCompile = new Set();
			const copyPromises = filesToCopy.map(async ({ source, target }) => {
				if (source.endsWith(".ts")) {
					typescriptToCompile.add(source);
				}
				else {
					await this._fileSystem.copyAsync(source, target);
					report.debug(`\nCopy: ${source} --> ${target}`);
				}
			});
			const deletePromises = filesToDelete.map(async ({ source, target }) => {
				await this._fileSystem.deleteAsync(target);
				report.debug(`\nDelete: ${target}`);
			});

			await Promise.all([ ...copyPromises, ...deletePromises ]);

			return [ ...typescriptToCompile ];
		});
	}

	async #runCompiler(reporter, description, files, sourceDir, outputDir, config) {
		await reporter.quietStartAsync(`Compiling ${description}`, async (report) => {
			const successes = await Promise.all(files.map(async (sourceFile) => {
				const compiledFile = outputFilename(sourceFile, ".js", sourceDir, outputDir);
				const sourceMapFile = outputFilename(sourceFile, ".js.map", sourceDir, outputDir);

				try {
					report.started();
					const { code, map } = await swc.transformFile(sourceFile, config);
					const sourceMapLink = `\n//# sourceMappingURL=${sourceMapFile}\n`;

					await this._fileSystem.writeTextFileAsync(compiledFile, code + sourceMapLink);
					await this._fileSystem.writeTextFileAsync(sourceMapFile, map);

					report.debug(`\n  Compile: ${sourceFile}`);
					report.debug(`\n    Target: ${compiledFile}`);
					report.debug(`\n    Source Map: ${sourceMapFile}`);
					return true;
				}
				catch(err) {
					const filename = Colors.brightRed(`${this._fileSystem.renderFilename(sourceFile)} failed:\n`);
					report.failure(`\n${filename}${err.message}\n\n`, {
						debug: `\nCompile (FAILED): ${sourceFile} --> ${compiledFile} -+- ${sourceMapFile}`
					});
					return false;
				}
			}));

			const failed = successes.some(entry => entry === false);
			if (failed) throw new TaskError("Compile failed");
		});
	}

	async typecheckAndEmitDeclarationFilesAsync({
		description,
		tscBinary,
		typescriptConfigFile,
		outputDir,
		reporter,
	}) {
		ensure.signature(arguments, [{
			description: String,
			tscBinary: String,
			typescriptConfigFile: String,
			outputDir: String,
			reporter: Reporter,
		}]);


		await reporter.startAsync(`Type-checking ${description}`, async (report) => {
			const command = [
				tscBinary,
				"-p", typescriptConfigFile,
				"--outDir", outputDir,
				"--noEmit", "false",
				"--declaration", "--emitDeclarationOnly",
				"--pretty",
			];
			report.debug(`\n  Run '${command.join(" ")}'`);

			const { code } = await this._shell.execWithPreambleAsync.apply(this._shell, [ "\n\n", ...command ]);
			if (code !== 0) throw new TaskError("Type check failed");
		});
	}

}

function outputFilename(filename, extension, sourceDir, outputDir) {
	const parsedFilename = path.parse(filename);
	const jsFilename = `${parsedFilename.dir}/${parsedFilename.name}${extension}`;
	return `${outputDir}/${path.relative(sourceDir, jsFilename)}`;
}
