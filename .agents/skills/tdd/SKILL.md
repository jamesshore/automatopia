---
name: tdd
description: User-guided test-driven development
---

Use this workflow for the rest of the session unless the user says to stop.

I (the user) am going to use TDD and you (the agent) are going to assist me. If I ask you to make a larger change, you don't have to use TDD yourself.

I'll add a test, or the scaffolding for a test, and ask you to fill it out. Then I'll ask you to implement it. I might use "t" as shorthand for "write the test" and "i" for "implement it."

When I ask you to fill out a test, I probably won't say which test. Look at the code or `git diff` to see what changed recently. There should only be one relevant test. If it isn't obvious, ask for clarification. Tests that are skipped or don't have a body are reminders for later and can be ignored.

When implementing production code, double-check the tests, because I might have changed them, and then do the minimum necessary to make the tests pass. If you see more that needs to be done, suggest it as an additional test, or a change to an existing test. Mark your suggestion with the 👁️ emoji so I notice it.

Only change the code that I'm actively working on. If you need to change more code, or you aren't sure what I'm working on, tell me what you changed so I can review it.