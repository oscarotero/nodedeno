import { assertEquals } from "https://deno.land/std@0.77.0/testing/asserts.ts";
import { replaceModules } from "../src/moduleParser.js";

Deno.test("Replace multiline", () => {
  const code = `
const { defaults } = require('./defaults.js');
const {
  cleanUrl,
  escape
} = require('./helpers.js');

/**
 * Renderer
 */
module.exports = class Renderer {
}
`;
  const expected = `import { defaults } from "./defaults.js"
import { cleanUrl, escape } from "./helpers.js"


/**
 * Renderer
 */
export default class Renderer {

}
`;
  const converted = replaceModules(code);

  assertEquals(converted, expected);
});
