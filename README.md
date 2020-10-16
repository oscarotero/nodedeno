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
  from: "node-library/lib",
  to: "deno-library/lib",
  depsFile: "deps.js",
  ignoredFiles: [
    "ignored-file-1.js",
    "ignored-file-2.js",
  ],
  modules: {
    "module-name": "./new-module.js"
  },
  onConvert(file, code) {
    // Here you can make additional changes to the code or filename
    return [file, code];
  }
})
```

## Options

- `from` The directory of the source files
- `to` The destination of the converted files
- `depsFile` The dependencies file that will be copied in the destination folder (and renamed to `deps.js`
- `ignoredFiles` An array of files that won't be copied
- `onConvert` A callback that will be invoked for every file copied. It allows to make additional changes
- `modules` An object to customize some modules resolution.
- `transpile` Set `true` to convert TypeScript files to Javascript.

## Used in

- [postcss-deno](https://github.com/oscarotero/postcss-deno)
