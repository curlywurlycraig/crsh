import { StringReader } from "https://deno.land/std@0.50.0/io/readers.ts";
import { StringWriter } from "https://deno.land/std@0.50.0/io/writers.ts";

import { run } from "./run.js";
import { builtins, defaultExtraUnixArgs } from "./builtins.js";
import { readCommand } from "./tty.js";
import {
  mergeArgsBetweenQuotes,
  replaceEnvVars,
  evalAndInterpolateJS,
  expandGlobs,
  expandHome,
} from "./util.js";

while (true) {
  const userInput = await readCommand();

  try {
    await run(userInput);
  } catch (err) {
    console.error(err);
  }
}
