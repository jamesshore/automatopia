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
			// "Possible Errors" (according to ESLint docs)
			"no-extra-semi": ERROR,
			"no-inner-declarations": ERROR,
			"no-template-curly-in-string": ERROR,

			// "Best Practices"
			"eqeqeq": ERROR,
			"no-caller": ERROR,
			"no-eval": ERROR,
			"no-extend-native": ERROR,
			"no-implicit-globals": ERROR,
			"no-implied-eval": ERROR,
			"no-iterator": ERROR,
			"no-loop-func": ERROR,
			"no-octal-escape": ERROR,
			"no-proto": ERROR,
			"no-return-assign": ERROR,
			"no-script-url": ERROR,
			"no-self-compare": ERROR,
			"no-throw-literal": ERROR,
			"prefer-promise-reject-errors": ERROR,
			"radix": ERROR,
			"require-await": ERROR,

			// "Strict Mode"
			"strict": [ ERROR, "safe" ],

			// "Variables"
			"no-undef-init": ERROR,

			// "Stylistic Issues"
			"no-bitwise": ERROR,
			"no-mixed-spaces-and-tabs": ERROR,
			"semi": [ ERROR, "always" ],

			// "ECMAScript 6"
			"no-duplicate-imports": ERROR,

			// TypeScript
			"prefer-rest-params": IGNORE,  // arguments preserves actual caller inputs for runtime signature checks
			"prefer-spread": IGNORE,       // .apply() is intentional when forwarding arguments
			"@typescript-eslint/no-unused-vars": IGNORE,
			"no-regex-spaces": IGNORE,
			"no-unused-private-class-members": IGNORE,

			"@typescript-eslint/no-use-before-define": [
				ERROR,
				{ functions: false, classes: false, variables: false, enums: false, typedefs: false },
			],
		}
	},
];

export default config;
