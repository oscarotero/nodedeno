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
import dep from "./deps.js";
import otherModule from "./other-module.js";

export default function foo() {};
export const otherModule = function bar() {};
```

## Usage:

```js
import { convert } from "https://raw.githubusercontent.com/oscarotero/nodedeno/main/mod.js"

const fromDir = ;
const toDir = "deno-library/lib";
const depsFile = "deps.js";
const ignore =

convert({
  from: "node-library/lib",
  to: "deno-library/lib",
  depsFile: "deps.js",
  ignoredFiles: [
    "ignored-file-1.js",
    "ignored-file-2.js",
  ],
  onConvert(file, code) {
    // Here you can change the code or filename
    return [file, code];
  }
})
```
