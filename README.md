# nodedeno

Script to convert Node libraries to Deno

- Transform CJS to ESM
- Transform TypeScript to JavaScript
- Any dependency is replaced with `./deps.js`
- Replace some Node global object like `process.env` or `__dirname` to Deno equivalents

## Example:

```js
const dep = require("my-dependency");
const otherModule = require("./other-module");

module.exports = function foo() {};
module.exports.otherModule = function bar() {};
```

Is converted to:

```js
import { dep } from "./deps.js";
import otherModule from "./other-module.js";

export default function foo() {};
export const otherModule = function bar() {};
```

## Usage:

```js
import { convert } from "https://deno.land/x/nodedeno/mod.js"

convert({
  src: "node-library",
  input: [ "lib" ]
  output: "deno-library",
  depsFiles: {
    "lib": "lib/deps.js"
  },
  copy: {
    "my-deps-file.js": "lib/deps.js"
  },
  ignoredFiles: [
    "ignored-file-1.js",
    "ignored-file-2.js",
  ],
  modules: {
    "module-name": "./new-module.js"
  },
  beforeConvert(src) {
    for (let [path, code] of src) {
      //path and code of all files
    }
  }
  afterConvert(src) {
    for (let [path, code] of src) {
      //path and code of all files
    }
  }
})
```

## Options

- `src` The root directory of the node package
- `input` An array with directories and files to convert
- `output` The destination of the converted files
- `depsFiles` An array of deps module files that should be used for dependencies
- `transpile` Set `true` to convert TypeScript files to Javascript and reference types.
- `modules` An object to customize some modules resolution.
- `copy` Object with files to copy without transform
- `ignoredFiles` An array of files to ignore
- `beforeConvert` A callback that will be invoked before convert the files.
- `afterConvert` A callback that will be invoked after convert the files.

## Used in

- [postcss-deno](https://github.com/postcss/postcss-deno)
