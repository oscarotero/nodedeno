import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { parseImportESM } from "../src/moduleParser.js";

Deno.test("import defaultExport", () => {
  assertEquals(
    parseImportESM(`import defaultExport from "./module-file.js";`),
    {
      imports: [
        {
          name: "defaultExport",
        },
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("import * as name", () => {
  assertEquals(
    parseImportESM(`import * as name from "./module-file.js";`),
    {
      imports: [
        {
          name: "*",
          as: "name",
        },
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("import { export1 }", () => {
  assertEquals(
    parseImportESM(`import { export1 } from "./module-file.js";`),
    {
      imports: [
        [
          {
            name: "export1",
          },
        ],
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("import { export1 as alias1 }", () => {
  assertEquals(
    parseImportESM(`import { export1 as alias1 } from "./module-file.js";`),
    {
      imports: [
        [
          {
            name: "export1",
            as: "alias1",
          },
        ],
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("import { export1, export2 }", () => {
  assertEquals(
    parseImportESM(`import { export1, export2 } from "./module-file.js";`),
    {
      imports: [
        [
          {
            name: "export1",
          },
          {
            name: "export2",
          },
        ],
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("import { export1, export2 as alias2 }", () => {
  assertEquals(
    parseImportESM(
      `import { export1, export2 as alias2 } from "./module-file.js";`,
    ),
    {
      imports: [
        [
          {
            name: "export1",
          },
          {
            name: "export2",
            as: "alias2",
          },
        ],
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("import 'path'", () => {
  assertEquals(
    parseImportESM(`import "./module-file.js";`),
    {
      path: "./module-file.js",
    },
  );
});

Deno.test("import defaultExport, { export1 }", () => {
  assertEquals(
    parseImportESM(
      `import defaultExport, { export1 } from "./module-file.js";`,
    ),
    {
      imports: [
        {
          name: "defaultExport",
        },
        [
          {
            name: "export1",
          },
        ],
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("import defaultExport, * as name", () => {
  assertEquals(
    parseImportESM(
      `import defaultExport, * as name from "./module-file.js";`,
    ),
    {
      imports: [
        {
          name: "defaultExport",
        },
        {
          name: "*",
          as: "name",
        },
      ],
      path: "./module-file.js",
    },
  );
});
