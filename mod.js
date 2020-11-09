import { copy, ensureDir } from "https://deno.land/std@0.77.0/fs/mod.ts";
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
    }
  }

  //Convert code
  if (options.beforeConvert) {
    options.beforeConvert(directory);
  }

  for (const file of directory.keys()) {
    directory.set(file, convertCode(directory, file, options));
  }

  if (options.afterConvert) {
    options.afterConvert(directory);
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

  return code;
}

function resolveModule(mod, directory, file, options) {
  let path = mod.path;
  const basedir = dirname(file);

  if (path.startsWith(".")) {
    path = join(basedir, path);
  } else {
    path = getDepsFile(options.depsFiles, basedir);

    //If it's a dependency force named import
    const names = Array.isArray(mod.import) ? mod.import : mod.export;

    if (!Array.isArray(names[0])) {
      names[0] = [names[0]];
    }
  }

  const id = trimLeft(path);

  if (options.modules.has(id)) {
    const modSettings = options.modules.get(id);

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
    if (directory.has(`${path}.js`)) {
      path = `${path}.js`;
    } else if (directory.has(`${path}.ts`)) {
      path = `${path}.ts`;
    } else if (directory.has(`${path}/index.js`)) {
      path = `${path}/index.js`;
    } else if (directory.has(`${path}/index.ts`)) {
      path = `${path}/index.ts`;
    } else {
      throw new Error(
        `Module ${path} cannot be resolved from the file ${file}`,
      );
    }
  }

  path = relative(basedir, path);

  mod.path = path.startsWith(".") ? path : `./${path}`;
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
