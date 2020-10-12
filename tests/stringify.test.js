import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { parseESM, stringify } from "../src/moduleParser.js";

Deno.test(`export * from "./filename.js";`, () => {
  const parsed = parseESM(`export * from "./filename.js";`);
  const expected = `export * from "./filename.js"`;

  assertEquals(stringify(parsed), expected);
});