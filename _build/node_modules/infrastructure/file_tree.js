// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ensure = require("util/ensure");
const { minimatch } = require("minimatch");

/** Represents a list of files. This is a purely in-memory representation. It's immutable and does not change when the file system changes. To keep the list up to date, use {@FileSystem#waitForChangeAsync} and look for `TREE` changes. Then create a new `FileTree` using {@FileSystem#readFileTreeAsync}. */
module.exports = class FileTree {

	/**
	 * Factory method. Create the tree. You'll typically call {@FileSystem#readFileTreeAsync} instead.
	 * @param {string[]} filenames The files in the tree.
	 * @param {string | string[]} globsToExclude Discard any `filenames` that match this list of file globs.
	 * @returns {FileTree} The tree.
	 */
	static create(filenames, globsToExclude = []) {
		ensure.signature(arguments, [ Array, [ undefined, String, Array ]]);

		const filteredFiles = filter(new Set(filenames), globsToExclude);
		return new FileTree(filteredFiles);
	}

	/** For internal use only. (Use {@FileSystem#readFileTreeAsync} or a factory method instead.) */
	constructor(files) {
		ensure.signature(arguments, [ Set ]);

		this._files = [ ...files ].sort();
		this._matchCache = {};
	}

	/**
	 * Detect if a file is included in the tree's list of files. Note that the tree only includes files, not directories.
	 * @param {string} file The file to check.
	 * @returns {boolean} True if the file is in the tree's list.
	 */
	has(file) {
		return this._files.includes(file);
	}

	/**
	 * Find all files that match any one `globsToInclude` while not matching all `globsToExclude`. Remember that the FileTree is a purely in-memory representation, and doesn't check the actual files on disk. The results are cached for speed.
	 * @param {string | string[]} globsToInclude Only include files that match any of these file globs.
	 * @param {string | string[]} globsToExclude Don't include any files that match one of these file globs, even if they match one of the `globsToInclude`.
	 * @returns {string[]} The files that match.
	 */
	matchingFiles(globsToInclude, globsToExclude = []) {
		ensure.signature(arguments, [[ String, Array ], [ undefined, String, Array ]]);
		if (!Array.isArray(globsToInclude)) globsToInclude = [ globsToInclude ];
		if (!Array.isArray(globsToExclude)) globsToExclude = [ globsToExclude ];

		const cacheKey = `INCLUDE:\n${globsToInclude.join("\n")}\nEXCLUDE:\n${globsToExclude.join("\n")}`;

		if (this._matchCache[cacheKey] === undefined) {
			const result = new Set();
			globsToInclude
				.forEach(glob => minimatch.match(this._files, glob)
					.forEach(file => result.add(file)));
			this._matchCache[cacheKey] = [ ...filter(result, globsToExclude) ];
		}

		return this._matchCache[cacheKey];
	}

	/**
	 * Check if this FileTree is the same as another FileTree.
	 * @param {FileTree} that The other FileTree.
	 * @returns {boolean} True is the FileTrees have the same list of files, regardless of order.
	 */
	equals(that) {
		ensure.signature(arguments, [ FileTree ]);

		if (this._files.size !== that._files.size) return false;

		// JDLS 16 Sep 2024: When Node supports Set.symmetricDifference(), use it instead.
		const thisCopy = new Set([ ...this._files ]);
		that._files.forEach(file => thisCopy.delete(file));
		return thisCopy.size === 0;
	}

};

function filter(files, globsToExclude) {
	// Caution: Mutates 'files'
	globsToExclude
		.forEach(glob => minimatch.match([ ...files ], glob)
			.forEach(path => files.delete(path)));
	return files;
}
