import { assertEquals } from "https://deno.land/std/testing/asserts.ts";

import { replaceEnvVars } from "../../util.js";

Deno.test("leaves command unchanged if there are no env vars", () => {
  const result = replaceEnvVars("command is here");

  assertEquals(result, "command is here");
});

Deno.test("interpolates an env var", () => {
  Deno.env.set("TEST", "value");

  const result = replaceEnvVars("env has value: $TEST");
  assertEquals(result, "env has value: value");
});
