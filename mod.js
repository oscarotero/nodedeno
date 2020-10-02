import { copy } from "https://deno.land/std/fs/mod.ts";
import { join } from "https://deno.land/std/path/mod.ts";

const __dirname = `const __dirname = (() => {
  const { url } = import.meta;
  const u = new URL(url);
  return (u.protocol === "file:" ? u.pathname : url).replace(/[/][^/]*$/, '');
})();`;

const defaults = {
  ignoredFiles: [],
  onConvert(file, code) {
    return [file, code];
  },
};

export async function convert(options = {}) {
  options = { ...defaults, ...options };

  try {
    await Deno.remove(options.to, { recursive: true });
  } catch (err) {}

  await copy(options.from, options.to);
  await convertDirectory(
    options.to,
    new Set(options.ignoredFiles),
    options.onConvert,
  );

  if (options.depsFile) {
    await copy(options.depsFile, join(options.to, "deps.js"));
  }
}

export async function convertDirectory(src, ignored, onConvert) {
  for await (const entry of Deno.readDir(src)) {
    let path = join(src, entry.name);

    if (ignored.has(entry.name)) {
      await Deno.remove(path);
      continue;
    }

    if (path.endsWith(".d.ts")) {
      await Deno.remove(path);
      continue;
    }

    if (entry.isDirectory) {
      await convertDirectory(path);
      continue;
    }

    let text = await Deno.readTextFile(path);

    //Transpile .ts => .js
    if (path.endsWith(".ts")) {
      const result = await Deno.transpileOnly({
        [path]: text,
      });

      await Deno.remove(path);
      text = result[path].source;
      text = text.replaceAll("// @ts-expect-error", "");
      text = text.replace(/\/\/\# sourceMappingURL=.*/, "");
      path = path.replace(/\.ts$/, ".js");
    }

    const [file, code] = onConvert(path, convertCode(text));

    await Deno.writeTextFile(file, code);

    if (file !== path) {
      await Deno.remove(path);
    }
  }
}

export function convertCode(code) {
  code = code
    //Remove "use strict" because ES5 modules are always strict
    .replace(/["']use strict['"]/, "")
    //Replace default module.exports
    .replace(/module\.exports\s*=\s*\S/g, (str) => {
      const postfix = str.slice(-1);

      if (postfix === "{") {
        return `export ${postfix}`;
      }

      return `export default ${postfix}`;
    })
    //Replace named module.exports
    .replace(/module\.exports\.(\w+)\s*=\s*\S/g, (str, name) => {
      const postfix = str.slice(-1);

      return `export const ${name} = ${postfix}`;
    })
    //Fix current import
    .replace(
      /import\s+({[^}]+}|\S+)\s*from\s*['"]([^'"]+)['"]/g,
      (str, name, path) => importFrom(name, path),
    )
    //Replace require()
    .replace(
      /(let|const|var)\s+({[^}]+}|\S+)\s*=\s*require\(['"]([^'"]+)['"]\)/g,
      (str, prefix, name, path) => importFrom(name, path),
    )
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

function importFrom(name, path) {
  //Relative import
  if (path.startsWith(".")) {
    if (path.endsWith("..")) { // require("..");
      path = join(path, "lib/mod.js");
    } else if (!path.endsWith(".js")) {
      path = `${path}.js`;
    }

    return `import ${name} from "${path}";`;
  }

  //Import dependency
  if (name.startsWith("{")) {
    return `import ${name} from "./deps.js";`;
  }

  return `import { ${name} } from "./deps.js";`;
}
