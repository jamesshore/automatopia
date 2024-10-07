// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import globalConfig from "./eslint.global.config.js";
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

const ERROR = "error";
const IGNORE = "off";
const UNSUPPORTED = "off";     // turned off because this option doesn't work with TypeScript
const DEPRECATED = "off";     // turned off because this option has been deprecated

export default [
  ...globalConfig,
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    name: "TypeScript config",

    languageOptions: {
      parserOptions: {
        // warnOnUnsupportedTypeScriptVersion: false,
      }
    },

    rules: {
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