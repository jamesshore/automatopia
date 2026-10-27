// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import globals from "globals";
import eslint from "@eslint/js";
import tseslint, { type Config } from "typescript-eslint";

const ERROR = "error";
const IGNORE = "off";
const UNSUPPORTED = "off";     // turned off because this option doesn't work with TypeScript

const config: Config = [
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		name: "TypeScript config",

		"languageOptions": {
			globals: {
				...globals.node,
				globals: false,
			},
		},

		"rules": {
			// "Possible Errors" (according to ESLint docs)
			"no-compare-neg-zero": ERROR,
			"no-cond-assign": ERROR,
			"no-constant-condition": ERROR,
			"no-control-regex": ERROR,
			"no-duplicate-case": ERROR,
			"no-empty-character-class": ERROR,
			"no-ex-assign": ERROR,
			"no-extra-boolean-cast": ERROR,
			"no-extra-semi": ERROR,
			"no-inner-declarations": ERROR,
			"no-invalid-regexp": ERROR,
			"no-irregular-whitespace": ERROR,
			"no-sparse-arrays": ERROR,
			"no-template-curly-in-string": ERROR,
			"no-unexpected-multiline": ERROR,
			"no-unsafe-finally": ERROR,
			"use-isnan": ERROR,
			"valid-typeof": ERROR,

			// "Best Practices"
			"eqeqeq": ERROR,
			"no-caller": ERROR,
			"no-case-declarations": ERROR,
			"no-empty-pattern": ERROR,
			"no-eq-null": ERROR,
			"no-eval": ERROR,
			"no-extend-native": ERROR,
			"no-fallthrough": ERROR,
			"no-global-assign": ERROR,
			"no-implicit-globals": ERROR,
			"no-implied-eval": ERROR,
			"no-iterator": ERROR,
			"no-loop-func": ERROR,
			"no-octal": ERROR,
			"no-octal-escape": ERROR,
			"no-proto": ERROR,
			"no-restricted-properties": ERROR,
			"no-return-assign": ERROR,
			"no-return-await": IGNORE,
			"no-script-url": ERROR,
			"no-self-assign": ERROR,
			"no-self-compare": ERROR,
			"no-throw-literal": ERROR,
			"no-useless-escape": ERROR,
			"prefer-promise-reject-errors": ERROR,
			"radix": ERROR,
			"require-await": ERROR,

			// "Strict Mode"
			"strict": [ ERROR, "safe" ],

			// "Variables"
			"no-delete-var": ERROR,
			"no-undef-init": ERROR,

			// "Stylistic Issues"
			"new-cap": IGNORE,
			"no-bitwise": ERROR,
			"no-mixed-spaces-and-tabs": ERROR,
			"semi": [ ERROR, "always" ],

			// "ECMAScript 6"
			"no-confusing-arrow": ERROR,
			"no-duplicate-imports": ERROR,
			"no-var": ERROR,
			"require-yield": ERROR,

			// TypeScript
			"prefer-rest-params": IGNORE,  // arguments preserves actual caller inputs for runtime signature checks
			"prefer-spread": IGNORE,       // .apply() is intentional when forwarding arguments
			"@typescript-eslint/no-unused-vars": IGNORE,
			"no-regex-spaces": IGNORE,
			"no-unused-private-class-members": IGNORE,

			"no-use-before-define": UNSUPPORTED,
			"@typescript-eslint/no-use-before-define": [
				ERROR,
				{ functions: false, classes: false, variables: false, enums: false, typedefs: false },
			],
		}
	},
];

export default config;
