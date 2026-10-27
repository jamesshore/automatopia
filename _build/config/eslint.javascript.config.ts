// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import type { Linter } from "eslint";

import globalConfig from "./eslint.global.config.ts";

const ERROR = "error";
const IGNORE = "off";

const config: Linter.Config[] = [
	...globalConfig,
	{
		name: "JavaScript config",
	},
];

export default config;
