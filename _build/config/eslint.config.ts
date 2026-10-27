// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import globals from "globals";
import eslint from "@eslint/js";
import tseslint, { type Config } from "typescript-eslint";

const ERROR = "error";
const IGNORE = "off";

const config: Config = [
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		name: "TypeScript config",

		"languageOptions": {
			globals: {
				...globals.node,
			},
		},

		"rules": {
			// Expression mistakes
			"eqeqeq": ERROR,
			"no-bitwise": ERROR,
			"no-return-assign": ERROR,
			"no-self-compare": ERROR,
			"no-template-curly-in-string": ERROR,
			"radix": ERROR,

			// Scope and initialization
			"@typescript-eslint/no-use-before-define": [
				ERROR,
				{ functions: false, classes: false, variables: false, enums: false, typedefs: false },
			],
			"no-implicit-globals": ERROR,
			"no-inner-declarations": ERROR,
			"no-loop-func": ERROR,
			"no-undef-init": ERROR,

			// Unsafe and legacy features
			"no-caller": ERROR,
			"no-eval": ERROR,
			"no-extend-native": ERROR,
			"no-implied-eval": ERROR,
			"no-iterator": ERROR,
			"no-octal-escape": ERROR,
			"no-proto": ERROR,
			"no-script-url": ERROR,
			"strict": [ ERROR, "safe" ],

			// Errors and async functions
			"no-throw-literal": ERROR,
			"prefer-promise-reject-errors": ERROR,
			"require-await": ERROR,

			// Source clarity
			"no-duplicate-imports": ERROR,
			"no-extra-semi": ERROR,
			"no-mixed-spaces-and-tabs": ERROR,
			"semi": [ ERROR, "always" ],

			// Intentional allowances
			"@typescript-eslint/no-unused-vars": IGNORE,
			"no-regex-spaces": IGNORE,
			"no-unused-private-class-members": IGNORE,
			"prefer-rest-params": IGNORE,                     // ensure.signature() works best with 'arguments'
			"prefer-spread": IGNORE,                          // Allow .apply() when forwarding arguments.
		}
	},
];

export default config;
