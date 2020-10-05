export function parseImportESM(code) {
  const matches = /import\s+((.*)\s*from\s*)?['"]([^'"]+)['"]/g.exec(code);

  if (!matches) {
    return;
  }

  const [, , names, path] = matches;

  if (!names) {
    return { path };
  }

  const imports = [];
  const pieces = names.split(",").map((name) => name.trim());
  let destructuring = false;

  while (pieces.length) {
    const name = pieces.shift();

    if (name.startsWith("{")) {
      destructuring = [];
      imports.push(destructuring);
    }

    const parsedName = parseNameImport(name);

    if (destructuring) {
      destructuring.push(parsedName);
    } else {
      imports.push(parsedName);
    }

    if (name.endsWith("}")) {
      destructuring = false;
    }
  }

  return { path, imports };
}

function parseNameImport(code) {
  const match = /^\{?\s*(\w+|\*)(\s*as\s*(\w+))?\s*\}?/.exec(code);

  if (!match) {
    throw new Error(`Error parsing the name "${code}"`);
  }

  let [, name, , as] = match;

  return as ? { name, as } : { name };
}
