import { copy, ensureDir } from "https://deno.land/std@0.77.0/fs/mod.ts";
import { red } from "https://deno.land/std@0.77.0/fmt/colors.ts";

import {
  basename,
  dirname,
  extname,
  join,
  relative,
} from "https://deno.land/std@0.77.0/path/mod.ts";
import { replaceModules } from "./src/moduleParser.js";

const __dirname = `const __dirname = (() => {
  const { url } = import.meta;
  const u = new URL(url);
  return (u.protocol === "file:" ? u.pathname : url).replace(/[/][^/]*$/, '');
})();`;

const validExtensions = [".js", ".ts", ".mjs"];

export async function convert(options = {}) {
  options.ignoredFiles = new Set(options.ignoredFiles || []);
  options.modules = new Map(Object.entries(options.modules || {}));
  options.depsFiles = new Map(Object.entries(options.depsFiles || {}));

  if (!Array.isArray(options.input)) {
    options.input = [options.input];
  }

  //Copy files
  if (options.copy) {
    for (const [from, to] of Object.entries(options.copy)) {
      const dest = join(options.output, to);
      await ensureDir(dirname(dest));
      await copy(from, dest);
    }
  }

  //Read all src files
  const directory = new Map();

  options.input.forEach((path) => {
    if (typeof path === "object") {
      for (const [from, to] of Object.entries(path)) {
        directory.set(to, Deno.readTextFileSync(join(options.src, from)));

        if (!options.modules.has(from)) {
          options.modules.set(from, to);
        }
      }
    } else if (extname(path)) {
      directory.set(path, Deno.readTextFileSync(join(options.src, path)));
    } else {
      readDirectory(path, options, directory);
    }
  });

  //Convert the code
  await convertFiles(directory, options);

  //Save files
  for (const [file, code] of directory) {
    const path = join(options.output, file);
    await ensureDir(dirname(path));
    await Deno.writeTextFile(path, code);
  }
}

function readDirectory(src, options, directory) {
  const fullPath = join(options.src, src);

  for (const entry of Deno.readDirSync(fullPath)) {
    const path = join(src, entry.name);

    if (options.ignoredFiles.has(path)) {
      continue;
    }

    if (entry.isDirectory) {
      readDirectory(path, options, directory);
      continue;
    }

    if (!validExtensions.includes(extname(path))) {
      continue;
    }

    directory.set(path, Deno.readTextFileSync(join(options.src, path)));
  }

  return directory;
}

export async function convertFiles(directory, options) {
  for (let [file, code] of directory) {
    //Remove types
    if (file.endsWith(".d.ts") && options.transpile) {
      directory.delete(file);
      continue;
    }

    //Remove empty file
    if (!code.trim()) {
      directory.delete(file);
      continue;
    }

    //Transpile .ts => .js
    if (file.endsWith(".ts") && options.transpile) {
      const result = await Deno.transpileOnly({
        [file]: code,
      });

      directory.delete(file);

      code = result[file].source;
      code = code.replaceAll("// @ts-expect-error", "");
      code = code.replace(/\/\/\# sourceMappingURL=.*/, "");
      file = file.replace(/\.ts$/, ".js");
      directory.set(file, code);
    }

    //Reference types
    const refTypes = file.replace(/\.js$/, ".d.ts");
    if (
      file.endsWith(".js") &&
      directory.has(refTypes) &&
      !options.transpile
    ) {
      code = `/// <reference types="./${
        basename(file, ".js")
      }.d.ts" />\n ${code}`;

      directory.set(file, code);
    }
  }

  //Helpers
  const helpers = {
    rename(from, to, cb = (c) => c) {
      if (!directory.has(from)) {
        return;
      }

      directory.set(to, cb(directory.get(from)));
      directory.delete(from);
    },

    replace(file, cb) {
      if (!directory.has(file)) {
        return;
      }

      directory.set(file, cb(directory.get(file)));
    },

    replaceAll(cb) {
      for (const [file, content] of directory) {
        directory.set(file, cb(content));
      }
    },
  };

  //Convert code
  if (options.beforeConvert) {
    options.beforeConvert(directory, helpers);
  }

  for (const file of directory.keys()) {
    directory.set(file, convertCode(directory, file, options));
  }

  if (options.afterConvert) {
    options.afterConvert(directory, helpers);
  }
}

export function convertCode(directory, file, options) {
  let code = directory.get(file);

  console.log(`Converting: ${file}`);

  //Replace node global objects by Deno equivalents
  if (code.includes("Buffer.")) {
    code = `import { Buffer } from "Buffer";\n${code}`;
  }

  if (code.includes("__dirname")) {
    code = `${__dirname}\n\n${code}`;
  }

  code = code.replace(/process\.env\./g, "Deno.env.");
  code = code.replace(/process\.cwd\(\)/g, "Deno.cwd()");

  //Convert modules
  code = replaceModules(
    code,
    (mod) => mod.path ? resolveModule(mod, directory, file, options) : mod,
  )
    .replace(/["']use strict['"];?/, "")
    .trimStart();

  //Remove multiple empty lines before imports
  code = code.replaceAll(/([\n\r]+)import /g, "\nimport ");

  return code;
}

function resolveModule(mod, directory, file, options) {
  let path = mod.path;
  const basedir = getBasedir(options.modules, file);

  if (path.startsWith(".")) {
    path = join(basedir, path);
  } else if (!options.modules.has(path)) {
    path = getDepsFile(options.depsFiles, basedir);

    //If it's a dependency force named import
    const names = Array.isArray(mod.import) ? mod.import : mod.export;

    if (!Array.isArray(names[0])) {
      names[0] = [names[0]];
    }
  }

  const id = trimLeft(path);
  const modulePath = searchModule(options.modules, id);

  if (modulePath) {
    const modSettings = options.modules.get(modulePath);

    if (typeof modSettings === "string") {
      path = modSettings;
    } else {
      if (modSettings.path) {
        path = modSettings.path;
      }

      //Non default modules (import name => import * as name)
      if (modSettings.default === false) {
        const names = Array.isArray(mod.import) ? mod.import : mod.export;

        if (!Array.isArray(names[0]) && names[0].name !== "*") {
          names[0].as = names[0].name;
          names[0].name = "*";
        }
      }
    }
  }

  //Resolve modules
  if (!extname(path)) {
    const found = searchModule(directory, path);

    if (!found) {
      console.error(
        red(`Module "${path}" cannot be resolved from the file "${file}"`),
      );
      return;
    }

    path = found;
  }

  path = relative(dirname(file), path);

  mod.path = path.startsWith(".") ? path : `./${path}`;
}

function getBasedir(modules, file) {
  for (const [key, value] of modules) {
    if (value === file) {
      return dirname(key);
    }
  }

  return dirname(file);
}

function searchModule(modules, id) {
  if (modules.has(id)) {
    return id;
  }

  if (modules.has(`${id}.js`)) {
    return `${id}.js`;
  }

  if (modules.has(`${id}.ts`)) {
    return `${id}.ts`;
  }

  if (modules.has(`${id}/index.js`)) {
    return `${id}/index.js`;
  }

  if (modules.has(`${id}/index.ts`)) {
    return `${id}/index.ts`;
  }
}

function getDepsFile(deps, dir, fallback = "deps.js") {
  if (!deps) {
    return fallback;
  }

  while (dir && !deps.has(dir)) {
    dir = trimLeft(dirname(dir));
  }

  return deps.get(dir) || fallback;
}

function trimLeft(path) {
  return path.replace(/^[\s\.\/]+/, "");
}
