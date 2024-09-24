// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const ConsoleOutput = require("./console_output");

ConsoleOutput.createStdout().write("string stdout\n");
ConsoleOutput.createStdout().write(Buffer.from("buffer stdout\n"));
ConsoleOutput.createStderr().write("string stderr\n");
ConsoleOutput.createNull().write("null stdout\n");
