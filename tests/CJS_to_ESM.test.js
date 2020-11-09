import { assertEquals } from "https://deno.land/std@0.77.0/testing/asserts.ts";
import { parseExportCJS, parseImportCJS } from "../src/moduleParser.js";
import { stringify } from "../src/moduleParser.js";

Deno.test("exports = foo", () => {
  const parsed = parseExportCJS(`exports = foo`);
  const expected = "export default foo";

  assertEquals(stringify(parsed), expected);
});

Deno.test("exports = function () {", () => {
  const parsed = parseExportCJS(`exports = function () {`);
  const expected = "export default function () {";

  assertEquals(stringify(parsed), expected);
});

Deno.test("exports.name1 = function () {", () => {
  const parsed = parseExportCJS(`exports.name1 = function () {`);
  const expected = "export function name1 () {";

  assertEquals(stringify(parsed), expected);
});

Deno.test("exports.name1 = class {", () => {
  const parsed = parseExportCJS(`exports.name1 = class {`);
  const expected = "export class name1 {";

  assertEquals(stringify(parsed), expected);
});

Deno.test("exports.name1 = foo()", () => {
  const parsed = parseExportCJS(`exports.name1 = foo()`);
  const expected = "export const name1 = foo()";

  assertEquals(stringify(parsed), expected);
});

Deno.test("const name1 = require('module-name');", () => {
  const parsed = parseImportCJS(`const name1 = require('module-name');`);
  const expected = `import name1 from "module-name"`;

  assertEquals(stringify(parsed), expected);
});

Deno.test("const { name1, name2: alias } = require('module-name');", () => {
  const parsed = parseImportCJS(
    `const { name1, name2: alias } = require('module-name');`,
  );
  const expected = `import { name1, name2 as alias } from "module-name"`;

  assertEquals(stringify(parsed), expected);
});

Deno.test("exports.name1 = function name2(arg) {", () => {
  const parsed = parseExportCJS(
    `exports.name1 = function name2(arg) {`,
  );
  const expected = `export function name1 (arg) {`;

  assertEquals(stringify(parsed), expected);
});

Deno.test("exports.name1 = require('module-name');", () => {
  const parsed = parseExportCJS(
    `exports.name1 = require('module-name');`,
  );
  const expected = `export * as name1 from "module-name"`;

  assertEquals(stringify(parsed), expected);
});

Deno.test("exports.name1 = name1;", () => {
  const parsed = parseExportCJS(
    `exports.name1 = name1;`,
  );
  const expected = `export { name1 }`;

  assertEquals(stringify(parsed), expected);
});
