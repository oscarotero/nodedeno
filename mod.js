import { copy, existsSync } from "https://deno.land/std/fs/mod.ts";
import {
  dirname,
  extname,
  join,
  relative,
  resolve,
} from "https://deno.land/std/path/mod.ts";
import { replaceModules } from "./src/moduleParser.js";

const __dirname = `const __dirname = (() => {
  const { url } = import.meta;
  const u = new URL(url);
  return (u.protocol === "file:" ? u.pathname : url).replace(/[/][^/]*$/, '');
})();`;

const defaults = {
  ignoredFiles: [],
  modules: {},
  onConvert(file, code) {
    return [file, code];
  },
};

export async function convert(options = {}) {
  options = { ...defaults, ...options };

  options.ignoredFiles = new Set(options.ignoredFiles);
  options.modules = new Map(Object.entries(options.modules));

  try {
    await Deno.remove(options.to, { recursive: true });
  } catch (err) {}

  await copy(options.from, options.to);
  await convertDirectory(options.to, options);

  if (options.depsFile) {
    await copy(options.depsFile, join(options.to, "deps.js"));
  }
}

export async function convertDirectory(src, options) {
  for await (const entry of Deno.readDir(src)) {
    let path = join(src, entry.name);

    if (options.ignoredFiles.has(entry.name)) {
      await Deno.remove(path);
      continue;
    }

    if (entry.isDirectory) {
      await convertDirectory(path, options);
      continue;
    }

    //Remove types
    if (path.endsWith(".d.ts") && options.transpile) {
      await Deno.remove(path);
      continue;
    }

    let text = await Deno.readTextFile(path);

    //Transpile .ts => .js
    if (path.endsWith(".ts") && options.transpile) {
      const result = await Deno.transpileOnly({
        [path]: text,
      });

      await Deno.remove(path);
      text = result[path].source;
      text = text.replaceAll("// @ts-expect-error", "");
      text = text.replace(/\/\/\# sourceMappingURL=.*/, "");
      path = path.replace(/\.ts$/, ".js");
    }

    const [file, code] = options.onConvert(
      path,
      convertCode(path, text, options),
    );

    await Deno.writeTextFile(file, code);

    if (file !== path) {
      await Deno.remove(path);
    }
  }
}

export function convertCode(file, code, options) {
  code = replaceModules(code, (mod) => {
    if (!mod.path) {
      return mod;
    }

    mod.path = resolvePath(file, mod.path, options);

    //If it's a dependency force named import
    const names = Array.isArray(mod.import) ? mod.import : mod.export;

    if (mod.path.endsWith("/deps.js") && !Array.isArray(names[0])) {
      names[0] = [names[0]];
    }

    return mod;
  })
    .replace(/["']use strict['"]/, "")
    .trimStart();

  //Replace node global objects by Deno equivalents
  if (code.includes("Buffer.")) {
    code = `import { Buffer } from "./deps.js";\n${code}`;
  }
  if (code.includes("__dirname")) {
    code = `${__dirname}\n${code}`;
  }
  code = code.replace(/process\.env\./g, "Deno.env.");

  return code;
}

function resolvePath(file, path, options) {
  if (options.modules.has(path)) {
    path = relative(dirname(file), join(options.to, options.modules.get(path)));
  } else if (!path.startsWith(".")) {
    path = relative(dirname(file), join(options.to, "./deps.js"));
  }

  let absolute = resolve(dirname(file), path);

  //Resolve modules
  if (!extname(absolute)) {
    let module = `${absolute}.js`;

    if (!existsSync(module) && !options.transpile) {
      module = `${absolute}.ts`;
    }

    if (!existsSync(module)) {
      module = `${absolute}/index.js`;
    }

    if (!existsSync(module) && !options.transpile) {
      module = `${absolute}/index.ts`;
    }

    if (!existsSync(module)) {
      throw new Error(`Module ${absolute} not resolved`);
    }

    absolute = module;
  }

  const relativeModule = relative(dirname(file), absolute);

  return relativeModule.startsWith(".")
    ? relativeModule
    : `./${relativeModule}`;
}
