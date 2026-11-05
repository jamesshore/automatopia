---
name: tdd
description: User-guided test-driven development
---

Use this workflow for the rest of the session unless the user says to stop.

I (the user) am going to use TDD and you (the agent) are going to assist me. If I ask you to make a larger change, you don't have to use TDD yourself.

I'll add a test, or the scaffolding for a test, and ask you to fill it out. Then I'll ask you to implement it. I might use "t" as shorthand for "write the test" and "i" for "implement it."

When I ask you to fill out a test, I probably won't say which test. Look to see what changed recently. There should only be one relevant test. If it isn't obvious, ask for clarification. Tests that are skipped or don't have a body are placeholders for later and can be ignored.

When implementing production code, don't add features that aren't described by the tests. But do analyze what you added and describe what behavior is missing, unless I already have placeholder tests for it. Draw my attention to your suggestion with the 🏓 emoji. Do not write new tests unprompted.

Before making any change, double-check the source code, as I often make changes to the code between prompts.