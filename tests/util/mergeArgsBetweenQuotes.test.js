import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import { mergeArgsBetweenQuotes } from "../../util.js";

Deno.test("removes quotes", () => {
  const result = mergeArgsBetweenQuotes([
    "list",
    "of",
    '"args',
    "with",
    'quotes"',
  ]);

  assertEquals(result, ["list", "of", "args with quotes"]);
});

Deno.test("merges if quotes are unclosed", () => {
  const result = mergeArgsBetweenQuotes([
    "list",
    "of",
    '"args',
    "with",
    "unclosed",
    "quotes",
  ]);

  assertEquals(result, ["list", "of", '"args with unclosed quotes']);
});
