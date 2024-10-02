// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const globalConfig = require("./eslint.global.config");

const ERROR = "error";
const IGNORE = "off";

module.exports = [
	...globalConfig,
	{
		name: "JavaScript config",

		"languageOptions": {
			sourceType: "commonjs",
		},
	},
];
