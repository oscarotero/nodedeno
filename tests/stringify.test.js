import { assertEquals } from "https://deno.land/std@0.77.0/testing/asserts.ts";
import { parseESM, stringify } from "../src/moduleParser.js";

Deno.test(`export * from "./filename.js";`, () => {
  const parsed = parseESM(`export * from "./filename.js";`);
  const expected = `export * from "./filename.js"`;

  assertEquals(stringify(parsed), expected);
});

Deno.test(`import "./filename.js"`, () => {
  const parsed = parseESM(`import "./filename.js"`);
  const expected = `import "./filename.js"`;

  assertEquals(stringify(parsed), expected);
});

Deno.test(`import type { foo } "./filename.js"`, () => {
  const parsed = parseESM(`import type { foo } from "./filename.js"`);
  const expected = `import type { foo } from "./filename.js"`;

  assertEquals(stringify(parsed), expected);
});
