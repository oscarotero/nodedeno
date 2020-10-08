import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { parseExportCJS, parseImportCJS } from "../src/moduleParser.js";

Deno.test("exports = foo", () => {
  assertEquals(
    parseExportCJS(`exports = foo`),
    {
      export: [],
      value: "foo",
    },
  );
});

Deno.test("module.exports = foo", () => {
  assertEquals(
    parseExportCJS(`module.exports = foo`),
    {
      export: [],
      value: "foo",
    },
  );
});

Deno.test("module.exports   =  function () {", () => {
  assertEquals(
    parseExportCJS(`module.exports =   function () {`),
    {
      export: [],
      value: "function () {",
    },
  );
});

Deno.test("module.exports.name1 = function () {", () => {
  assertEquals(
    parseExportCJS(`module.exports.name1 =   function () {`),
    {
      export: [{
        name: "name1",
      }],
      value: "function () {",
    },
  );
});

Deno.test("const moduleName = require('module-name');", () => {
  assertEquals(
    parseImportCJS(`const moduleName = require('module-name');`),
    {
      import: [{
        name: "moduleName",
      }],
      path: "module-name",
    },
  );
});

Deno.test("const { name1, name2 } = require('module-name');", () => {
  assertEquals(
    parseImportCJS(`const { name1, name2 } = require('module-name');`),
    {
      import: [
        [
          {
            name: "name1",
          },
          {
            name: "name2",
          },
        ],
      ],
      path: "module-name",
    },
  );
});

Deno.test("const { name1, name2: alias } = require('module-name');", () => {
  assertEquals(
    parseImportCJS(`const { name1, name2: alias2 } = require('module-name');`),
    {
      import: [
        [
          {
            name: "name1",
          },
          {
            name: "name2",
            as: "alias2",
          },
        ],
      ],
      path: "module-name",
    },
  );
});
