// Copyright Titanium I.T. LLC. License granted under terms of "The MIT License."

import Paths from "./paths.js";

export default {
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