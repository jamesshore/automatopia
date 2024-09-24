// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const commandLine = require("./command_line").create();

process.stdout.write(
	`rawArguments: ${JSON.stringify(commandLine.rawArguments)}\n` +
	`commands: ${JSON.stringify(commandLine.commands)}\n` +
	`options: ${JSON.stringify(commandLine.options)}\n`
);
