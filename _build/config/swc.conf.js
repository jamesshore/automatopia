// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."
"use strict";

const Paths = require("./paths");

module.exports = {
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": true,
      "decorators": false,
      "dynamicImport": false
    },
    "transform": {
      "react": {
        "runtime": "automatic"
      }
    },
    "target": "esnext",
    "baseUrl": Paths.rootDir,
    "loose": false,
    "externalHelpers": false,
    "keepClassNames": false
  },
  "sourceMaps": true,
  "isModule": true,
};