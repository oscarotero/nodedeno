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

await convert({
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

### src

The source directory of the node package

### input

An array with files and directories to load from the node package.

```js
{
  input: [
    "lib",
    "index.js"
  ]
}
```

### output

The folder destination of the Deno files

### depsFiles

By default, all external dependencies will be replaced by `deps.js` module. For example:

```js
const path = require("path");
```

will be converted to:

```js
import { path } from "./deps.js";
```

Use this option to customize the dependencies file, for example:

```js
{
  depsFiles: {
    "": "deps.js",
    "subdirectory": "subdirectory/deps.js"
  }
}
```

### modules

This option allows to customize some modules resolution. Useful if you want to provide a different file for some modules instead using `deps.js`.

```js
{
  modules: {
    // Use a string to set a new path for a module name:
    "url": "https://deno.land/std/url/mod.ts",

    // Or an object with options
    "mime": {
      default: false,
      path: "https://deno.land/std/mime/mod.ts",
    }
  }
}
```

The available options for modules are:

- `default`: Set `false` to indicate that the module does not export a default value, so any `const name = require("module-file")` will be converted to `import * as name from "module-file.js"` instead `import name from "module-file.js"`.
- `path`: To change the path of the module.

### copy

To copy files to the output without transform it. The object keys are the source files (relative to cwd) and the value is the destination (relative to `output`):

```js
{
  copy: {
    "my-dependencies.js": "deps.js"
  }
}
```

### transpile

Set `true` to converts all `.ts` code to `.js` and remove the reference types (`.d.ts`). This is useful if the typescript version fails in Deno.

### ignoredFiles

An array of files that must be ignored (relative to the `src` folder)

### beforeConvert

A callback that will be invoked before the file conversion. This is useful to perform some manual changes and substitutions. The first argument is a `Map` with all files that are going to be converted:

```js
{
  beforeConvert(files) {
    for (let [path, code] of files) {
      code = code.replace("foo", "bar");
      
      //To rename a file, just remove and add again with different key
      if (path === "my-file.js") {
        files.remove(path);
        path = "renamed-file.js";
      }

      //Save the changes again in the Map.
      files.set(path, code);
    }
  }
}
```

### afterConvert

It's the same than `beforeConvert` but executed after the conversion.

## Used in

- [postcss-deno](https://github.com/postcss/postcss-deno)
