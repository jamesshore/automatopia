# Validation

To validate code changes, run `./build.sh quick`. To also validate types, run `./build.sh quick typecheck`.

This is an incremental build that only re-runs tests when files have changed or the tests have failed. I often run a watch script on my machine, so it may run the tests before you do. In that case, tests that pass in my build won't run in your build. You can take that as evidence that they passed.

# Design

When working on a file, look at several nearby files for examples of expected design style. Before starting work, summarize your understanding of my design principles and ask for corrections.

When writing tests, do not use loops or conditionals. It's better to make repeated calls to helper functions than to  

Within functions, use blank lines to clarify intent. Organize functions and methods with more-general and more-central concepts first and special cases coming later, and related functions/methods placed next to each other.

Tests follow the same principle. Central, happy-path usage comes first, edge cases come later.

# Documentation

The top-level `readme.md` describes the overall project. Public-facing classes and methods have JSDoc comments. Do not write or update documentation unless explicitly asked to do so, except for mechanical changes such as updating parameter names, types, filenames, etc. Instead, inform me when a documentation change is needed, and draw my attention to it using the 📕emoji.