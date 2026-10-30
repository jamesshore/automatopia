// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
import CommandLine from "./command_line.ts";

const commandLine = CommandLine.create();

process.stdout.write(`rawArguments: ${JSON.stringify(commandLine.rawArguments)}\n`);
