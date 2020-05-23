import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import { evalAndInterpolateJS } from "../../util.js";

Deno.test(
  "leaves command unchanged if there are no interpolation parts",
  () => {
    const result = evalAndInterpolateJS("command is here");

    assertEquals(result, "command is here");
  }
);

Deno.test("interpolates a global in the scope", () => {
  const result = evalAndInterpolateJS("has value: ${val}");
  assertEquals(result, "has value: 3");
});

Deno.test("interpolates a computed value", () => {
  const result = evalAndInterpolateJS("has value: ${val * 10}");
  assertEquals(result, "has value: 30");
});

Deno.test("interpolates multiple values", () => {
  const result = evalAndInterpolateJS("has value: ${val} and also ${val * 10}");
  assertEquals(result, "has value: 3 and also 30");
});
