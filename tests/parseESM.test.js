import { assertEquals } from "https://deno.land/std@0.77.0/testing/asserts.ts";
import { parseESM } from "../src/moduleParser.js";

Deno.test("import defaultExport", () => {
  assertEquals(
    parseESM(`import defaultExport from "./module-file.js";`),
    {
      import: [
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
    parseESM(`import * as name from "./module-file.js";`),
    {
      import: [
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
    parseESM(`import {\nexport1\n} from "./module-file.js";`),
    {
      import: [
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
    parseESM(`import { export1 as alias1 } from "./module-file.js";`),
    {
      import: [
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
    parseESM(`import { export1, export2 } from "./module-file.js";`),
    {
      import: [
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

Deno.test("import { export1, export2, }", () => {
  assertEquals(
    parseESM(`import { export1, export2, } from "./module-file.js";`),
    {
      import: [
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
    parseESM(
      `import { export1, export2 as alias2 } from "./module-file.js";`,
    ),
    {
      import: [
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
    parseESM(`import "./module-file.js";`),
    {
      import: [],
      path: "./module-file.js",
    },
  );
});

Deno.test("import defaultExport, { export1 }", () => {
  assertEquals(
    parseESM(
      `import defaultExport, { export1 } from "./module-file.js";`,
    ),
    {
      import: [
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
    parseESM(
      `import defaultExport, * as name from "./module-file.js";`,
    ),
    {
      import: [
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

Deno.test("export *", () => {
  assertEquals(
    parseESM(
      `export * from "./module-file.js";`,
    ),
    {
      export: [
        {
          name: "*",
        },
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("export * as name1", () => {
  assertEquals(
    parseESM(
      `export * as name1 from "./module-file.js";`,
    ),
    {
      export: [
        {
          name: "*",
          as: "name1",
        },
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("export { name1, name2 }", () => {
  assertEquals(
    parseESM(
      `export { name1, name2 } from "./module-file.js";`,
    ),
    {
      export: [
        [
          {
            name: "name1",
          },
          {
            name: "name2",
          },
        ],
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("export { name1 as alias1, name2 as alias2 }", () => {
  assertEquals(
    parseESM(
      `export { name1 as alias1, name2 as alias2 } from "./module-file.js";`,
    ),
    {
      export: [
        [
          {
            name: "name1",
            as: "alias1",
          },
          {
            name: "name2",
            as: "alias2",
          },
        ],
      ],
      path: "./module-file.js",
    },
  );
});

Deno.test("export { default }", () => {
  assertEquals(
    parseESM(
      `export { default } from "./module-file.js";`,
    ),
    {
      export: [
        [
          {
            name: "default",
          },
        ],
      ],
      path: "./module-file.js",
    },
  );
});
