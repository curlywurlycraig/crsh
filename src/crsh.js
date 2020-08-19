import { startup } from "../startup.js";
import { run } from "./run.js";
import { readCommand } from "./tty.js";

await startup();

while (true) {
  const userInput = await readCommand();

  try {
    await run(userInput, true);
  } catch (err) {
    console.error(err);
  }
}
