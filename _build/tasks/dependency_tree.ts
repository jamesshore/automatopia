// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import * as ensure from "../util/ensure.ts";
import FileSystem from "../infrastructure/file_system.ts";
import * as analyzer from "./low_level/source_code_analyzer.ts";
import path from "node:path";

// JDLS 1 Sep 2024: Once Node 22 enters LTS, this dependency can be replaced with path.matchesGlob(), which was
// introduced in Node 22.5.0. Node uses minimatch under the covers so it should be perfectly compatible.
import { minimatch as matchesGlob } from "minimatch";

const ERRORS = {
	ROOT_NOT_FOUND: "File not found",
	DEPENDENCY_NOT_FOUND: "Dependency not found",
} as const;

export interface RootNotFoundError {
	error: typeof ERRORS.ROOT_NOT_FOUND;
	file: string;
}

export interface DependencyNotFoundError {
	error: typeof ERRORS.DEPENDENCY_NOT_FOUND;
	file: string;
	dependency: string;
	line: number;
	source: string;
}

export type DependencyError = RootNotFoundError | DependencyNotFoundError;

export type DependencyResult =
	| { dependencies: string[], errors?: never }
	| { errors: DependencyError[], dependencies?: never };

export type ChangedFilesResult =
	| { changed: string[], errors?: never }
	| { errors: DependencyError[], changed?: never };

type NotifyFn = (filename: string) => void;

type FileError = Omit<Error, "message"> & {
	code?: string;
	message: string | DependencyError;
};

type ResolvedDependency =
	| { ignored: false, dependency: analyzer.SourceDependency, error?: never }
	| { ignored?: never, dependency?: never, error: { message: DependencyNotFoundError } };

type AnalyzedDependency = ResolvedDependency | { ignored: true };

interface CachedAnalysis {
	modified: number;
	dependencies: ResolvedDependency[];
}

/**
 * Analyzes source code dependencies for the purpose of discovering when files have changed. Caches the results for
 * performance, but automatically re-analyzes files whose timestamp has changed. Calls a notify function for each file
 * it analyzes.
 */
export default class DependencyTree {

	private readonly _fileSystem: FileSystem;
	private readonly _globsToIgnore: string[];
	private readonly _cache: Record<string, Promise<CachedAnalysis>>;

	/** The types of errors that can occur */
	static get ERRORS(): typeof ERRORS {
		return ERRORS;
	}

	/**
	 * Factory method.
	 * @param {FileSystem} fileSystem The files to analyze.
	 * @param {string[]} [globsToIgnore=[]] Ignore files matching these globs.
	 * @returns {DependencyTree} The instance.
	 */
	static create(fileSystem: FileSystem, globsToIgnore?: string[]): DependencyTree {
		ensure.signature(arguments, [ FileSystem, [ undefined, Array ]]);

		return new DependencyTree(fileSystem, globsToIgnore);
	}

	/**
	 * Only for use by tests. (Use the factory method instead.)
	 */
	constructor(fileSystem: FileSystem, globsToIgnore: string[] = []) {
		this._fileSystem = fileSystem;
		this._globsToIgnore = globsToIgnore;
		this._cache = {};
	}

	/**
	 * Find files that are newer than their corresponding timestamp file, or that recursively depend on any files newer
	 * than that timestamp file. Files matching {@link DependencyTree.create}'s "globsToIgnore" are ignored.
	 * @param {string[]} rootFiles Files to check.
	 * @param {string} timestampExtension Extension used by the timestamp file.
	 * @param {(filename: string) => void} [notifyFn] This function is called every time a file is analyzed.
	 * @returns {Promise<{changed: string[]} | {errors: string[]}} Either the list of rootFiles with newer dependencies,
	 *   or a list of errors.
	 * @see FileSystem#timestampFileFor
	 */
	async findChangedFilesAsync(rootFiles: string[], timestampExtension: string, notifyFn?: NotifyFn): Promise<ChangedFilesResult> {
		ensure.signature(arguments, [ Array, String, [ undefined, Function ]]);

		const changed: string[] = [];
		const allErrors = new Set<DependencyError>();

		for (let i = 0; i < rootFiles.length; i++) {
			const root = rootFiles[i];
			const timestampFile = this._fileSystem.timestampFileFor(root, timestampExtension);

			const { dependencies, errors } = await this.dependenciesForAsync(root, notifyFn);
			if (errors !== undefined) {
				errors.forEach(error => allErrors.add(error));
				continue;
			}

			const upToDate = await this._fileSystem.isFileNewerThanAllAsync(timestampFile, dependencies);

			if (!upToDate) changed.push(root);
		}

		if (allErrors.size !== 0) return { errors: [ ...allErrors ] };
		return { changed };
	}

	/**
	 * Find all files recursively depended upon by a file. Files matching {@link DependencyTree.create}'s "globsToIgnore"
	 * are ignored.
	 * @param {string} filename The file to analyze.
	 * @param {(filename: string) => void} [notifyFn] This function is called every time a file is read from the file
	 *   system.
	 * @returns {Promise<{dependencies: string[]} | {errors: string[]}>} Either the list of imported files, or a list of
	 *   errors.
	 */
	async dependenciesForAsync(filename: string, notifyFn: NotifyFn = () => {}): Promise<DependencyResult> {
		ensure.signature(arguments, [ String, [ undefined, Function ] ]);

		const dependencySet = new Set<string>();
		const errors: DependencyError[] = [];
		const rootNotFound: RootNotFoundError = {
			error: ERRORS.ROOT_NOT_FOUND,
			file: filename,
		};

		try {
			await this.#populateDependenciesAsync(notifyFn, filename, dependencySet, errors, rootNotFound);
		}
		catch (err) {
			if ((err as FileError).code === "ENOENT") errors.push(rootNotFound);
			else throw err;
		}

		if (errors.length !== 0) return { errors };
		return { dependencies: [ ...dependencySet ] };
	}

	async #populateDependenciesAsync(
		notifyFn: NotifyFn,
		filename: string,
		dependencySet: Set<string>,
		errors: DependencyError[],
		errorToUseIfNotFound: DependencyError,
	): Promise<{ dependencySet: Set<string>, errors: DependencyError[] }> {
		// Have we processed this file already during this run?
		if (dependencySet.has(filename)) return { dependencySet, errors };
		dependencySet.add(filename);

		// Have we processed this file in a previous run? If not, process it now.
		if (this._cache[filename] === undefined) {
			this._cache[filename] = this.#readAndAnalyzeFileAsync(notifyFn, filename, errorToUseIfNotFound);
		}

		// Has this file changed since the last time we processed it?
		let fileChangedOrErrored: boolean;
		try {
			const { modified: cachedFileModified } = await this._cache[filename];
			const currentFileModified = await getFileModificationTimeAsync(this._fileSystem, filename, errorToUseIfNotFound);
			fileChangedOrErrored = cachedFileModified !== currentFileModified;
		}
		catch (err) {
			if ((err as FileError).code === "ENOENT") fileChangedOrErrored = true;
			else throw err;
		}

		// If file has changed, or it errored last time we read it, process it again
		if (fileChangedOrErrored) {
			this._cache[filename] = this.#readAndAnalyzeFileAsync(notifyFn, filename, errorToUseIfNotFound);
		}

		// Add this file's dependencies and errors to 'results' and 'errors'
		const { dependencies }  = await this._cache[filename];
		await Promise.all(dependencies.map(async ({ dependency, error }) => {
			if (error !== undefined) {
				errors.push(error.message);
				return;
			}

			const dependencyNotFound = notFound(filename, dependency.path, dependency.line, dependency.source);
			await this.#populateDependenciesAsync(notifyFn, dependency.path, dependencySet, errors, dependencyNotFound);
		}));

		return { dependencySet, errors };
	}

	async #readAndAnalyzeFileAsync(notifyFn: NotifyFn, filename: string, errorToUseIfNotFound: DependencyError): Promise<CachedAnalysis> {
		notifyFn(filename);

		const currentFileModified = await getFileModificationTimeAsync(this._fileSystem, filename, errorToUseIfNotFound);
		const sourceCode = await readTextFileAsync(this._fileSystem, filename, errorToUseIfNotFound);
		const rawDependencies = analyzer.analyze(sourceCode);

		const resolvedDependencies = await Promise.all(rawDependencies.map(async (dependency): Promise<AnalyzedDependency> => {
			try {
				if (dependency.path.startsWith("node:")) return { ignored: true };

				const baseDir = path.dirname(filename);
				const dependencyNotFound = notFound(filename, dependency.path, dependency.line, dependency.source);
				const resolvedPath = await resolveModulePathAsync(this._fileSystem, baseDir, dependency.path, dependencyNotFound);

				if (this._globsToIgnore.some(glob => matchesGlob(resolvedPath, glob))) return { ignored: true };

				dependency.path = resolvedPath;
				return {
					ignored: false,
					dependency,
				};
			}
			catch (error) {
				if ((error as FileError).code === "MODULE_NOT_FOUND") return { error: error as { message: DependencyNotFoundError } };
				else throw error;
			}
		}));

		return {
			modified: currentFileModified,
			dependencies: resolvedDependencies.filter((entry): entry is ResolvedDependency => !entry.ignored)
		};
	}

}

async function getFileModificationTimeAsync(fileSystem: FileSystem, filename: string, errorToUseIfNotFound: DependencyError): Promise<number> {
	try {
		return (await fileSystem.getFileModificationTimeAsync(filename)).valueOf();
	}
	catch(err) {
		if ((err as FileError).code === "ENOENT") (err as FileError).message = errorToUseIfNotFound;
		throw err;
	}
}

async function readTextFileAsync(fileSystem: FileSystem, filename: string, errorToUseIfNotFound: DependencyError): Promise<string> {
	try {
		return await fileSystem.readTextFileAsync(filename);
	}
	catch(err) {
		if ((err as FileError).code === "ENOENT") (err as FileError).message = errorToUseIfNotFound;
		throw err;
	}
}

async function resolveModulePathAsync(fileSystem: FileSystem, baseDir: string, module: string, errorToUseIfNotFound: DependencyNotFoundError): Promise<string> {
	try {
		return await fileSystem.resolveModulePathAsync(baseDir, module);
	}
	catch(err) {
		if ((err as FileError).code === "MODULE_NOT_FOUND") (err as FileError).message = errorToUseIfNotFound;
		throw err;
	}
}

function notFound(parent: string, child: string, line: number, source: string): DependencyNotFoundError {
	return {
		error: ERRORS.DEPENDENCY_NOT_FOUND,
		file: parent,
		dependency: child,
		line,
		source
	};
}
