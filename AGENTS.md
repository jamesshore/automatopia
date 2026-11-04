# Validation

To validate code changes, run `./build.sh quick`. To also validate types, run `./build.sh quick typecheck`.

# Design

When working on a file, look at several nearby files for examples of expected design style.

Ease of understanding and modification is our top design priority. Use blank lines to clarify intent. Organize functions and methods within a file so they can be skimmed from top to bottom, with more-general and more-central concepts first and special cases coming later.

Tests are documentation. Each test tells a story: we have a system like this; then this happens; and this is the result. Use helper functions to make that story clear. If the helper is only relevant to one test, it can be nested at the bottom of the test. The collection of tests together also tell a story; the reader should be able to skim test names from top to bottom to understand how the system under tests work, with the most central and important behavior coming first and edge cases coming later.

# Documentation

The top-level `readme.md` describes the overall project. Public-facing classes and methods have JSDoc comments.

Other than mechanical changes, such as updating parameter names, types, filenames, etc., don't write documentation unless explicitly asked to do so. However, *do* inform me when a documentation change is needed. Draw my attention to it using the 📕emoji.