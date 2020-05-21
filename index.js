import { StringReader } from "https://deno.land/std@0.50.0/io/readers.ts";
import { StringWriter } from "https://deno.land/std@0.50.0/io/writers.ts";

import { prompt } from "./prompt.js";
import { builtins } from "./builtins.js";
import { fetchBody } from "./functions.js";
import {
  setCursorPosition,
  controlCharactersBytesMap,
  rewriteLine,
} from "./tty.js";
import { readAll } from "./readUtil.js";

// TODO Read history from a file
const history = [];
let currentHistoryIndex = history.length;

// This sets the terminal to non-canonical mode.
// That's essential for capturing raw key-presses.
// It's what allows pressing up to navigate history, for example. Or moving the cursor left
Deno.setRaw(0, true);

// Rejoin args between "" or ''.
// Takes a list of tokens, some maybe beginning with a quote.
// Returns a list of tokens where tokens between quotes are merged into a single
// arg.
const mergeArgsBetweenQuotes = (args) =>
  args.reduce((prev, curr) => {
    if (curr === null || curr === undefined) {
      return prev;
    }

    const last = prev[prev.length - 1];
    if (last === undefined) {
      return [...prev, curr];
    }

    const inDoubleQuotes = last.startsWith(`"`) && !last.endsWith(`"`);
    const inSingleQuotes = last.startsWith(`'`) && !last.endsWith(`'`);
    if (prev.length > 0 && (inDoubleQuotes || inSingleQuotes)) {
      const result = prev.slice(0, prev.length - 1);
      result.push(`${last} ${curr}`);
      return result;
    }

    return [...prev, curr];
  }, []);

while (true) {
  await Deno.stdout.write(new TextEncoder().encode(prompt()));

  ///////////////
  // Read input
  ///////////////
  let userInput = "";
  let cursorPosition = 0;
  while (true) {
    const buf = new Uint8Array(100);
    const numberOfBytesRead = await Deno.stdin.read(buf);
    const relevantBuf = buf.slice(0, numberOfBytesRead);

    // console.debug("got ", buf.slice(0, numberOfBytesRead));

    if (controlCharactersBytesMap[relevantBuf] === "return") {
      await Deno.stdout.write(new TextEncoder().encode("\n"));
      break;
    }

    if (controlCharactersBytesMap[relevantBuf] === "backspace") {
      if (cursorPosition === 0) {
        continue;
      }

      userInput =
        userInput.slice(0, cursorPosition - 1) +
        userInput.slice(cursorPosition, userInput.length);

      cursorPosition--;

      const [row, column] = await rewriteLine(
        Deno.stdin,
        Deno.stdout,
        `${prompt()}${userInput}`
      );

      setCursorPosition(Deno.stdout, row, prompt().length + cursorPosition - 9);
      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "up") {
      if (currentHistoryIndex === 0) {
        continue;
      }

      currentHistoryIndex--;
      userInput = history[currentHistoryIndex];
      cursorPosition = userInput.length;

      await rewriteLine(Deno.stdin, Deno.stdout, `${prompt()}${userInput}`);
      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "down") {
      // Read history and update print
      cursorPosition = 0;
      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "left") {
      if (cursorPosition === 0) continue;

      await Deno.stdout.write(relevantBuf);
      cursorPosition--;
      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "right") {
      if (cursorPosition === userInput.length) continue;

      await Deno.stdout.write(relevantBuf);
      cursorPosition++;
      continue;
    }

    // All other text
    const decodedString = new TextDecoder().decode(relevantBuf);

    userInput =
      userInput.slice(0, cursorPosition) +
      decodedString +
      userInput.slice(cursorPosition, userInput.length);

    cursorPosition++;

    const [row, column] = await rewriteLine(
      Deno.stdin,
      Deno.stdout,
      `${prompt()}${userInput}`
    );

    setCursorPosition(Deno.stdout, row, prompt().length + cursorPosition - 9);
  }

  history.push(userInput);
  currentHistoryIndex = history.length;

  ///////////
  // Execute input
  ///////////

  // TODO Parse more than just "|" (there are other separators! Error pipes, file pipes, etc)
  const commands = userInput.trim().split("|");

  if (commands.length === 1 && commands[0] === "") {
    continue;
  }

  let lastIO = {
    stdin: new StringWriter(),
    stdout: new StringReader(),
    stderr: new StringReader(),
  };

  const processes = [];

  for (let index = 0; index < commands.length; index++) {
    const isFirst = index === 0;
    const isLast = index === commands.length - 1;
    const command = commands[index];
    const trimmed = command.trim();

    if (/^\(.*\) ?=> ?.*$/.test(trimmed)) {
      const lastOutput = await readAll(lastIO.stdout);

      let json = undefined;
      try {
        json = JSON.parse(lastOutput.trim());
      } catch (err) {
      } finally {
      }

      const lines = lastOutput.split("\n");

      // TODO Capture console logs and other stdout/err writes here.
      // This can be done by somehow setting the stdout for this execution.
      // How can I do that?
      const func = eval(trimmed);
      const result = func({
        raw: lastOutput,
        lines,
        json,
      });

      let nextContent;
      if (result instanceof Array) {
        nextContent = result.join("\n");
      } else if (result instanceof Object) {
        nextContent = JSON.stringify(result, null, 4);
      } else {
        nextContent = result ? result.toString() : "";
      }

      lastIO = {
        stdout: new StringReader(`${nextContent}\n`),
        stderr: new StringReader(),
        stdin: new StringWriter(),
      };

      if (isLast) {
        Deno.stdout.write(new TextEncoder().encode(nextContent));
      }

      continue;
    }

    if (/^[a-zA-Z0-9]*\(.*\)$/.test(trimmed)) {
      const output = await eval(trimmed);

      lastIO = {
        stdout: new StringReader(`${output.toString()}\n`),
        stderr: new StringReader(),
        stdin: new StringWriter(),
      };
      continue;
    }

    const splitCommand = trimmed.split(" ");
    const executable = splitCommand[0].trim();

    const args = mergeArgsBetweenQuotes(splitCommand.slice(1));

    if (builtins[executable] !== undefined) {
      try {
        const lastOutput = await readAll(lastIO.stdout);
        const result = await builtins[executable](args, lastOutput);
        const nextContent = result ? result.toString() : "";
        lastIO = {
          stdout: new StringReader(`${nextContent}\n`),
          stderr: new StringReader(),
          stdin: new StringWriter(),
        };
      } catch (err) {
        console.error(
          `Failed to execute command ${executable}: ${err.toString()}`
        );
      }
      continue;
    }

    try {
      // TODO Support stderr pipes, and also file output
      const p = Deno.run({
        cmd: [executable, ...args],
        stdin: isFirst ? "inherit" : "piped",
        stdout: isLast ? "inherit" : "piped",
        stderr: isLast ? "inherit" : "piped",
      });

      if (!isFirst) {
        const prevOutput = lastIO.stdout;
        const currentInput = p.stdin;

        await Deno.copy(prevOutput, currentInput);
        await p.stdin.close();
      }

      lastIO = {
        stdout: p.stdout,
        stdin: p.stdin,
        stderr: p.stderr,
      };

      processes.push(p);
    } catch (err) {
      //   console.debug("err is this ", err);
      if (err instanceof Deno.errors.NotFound) {
        console.error(`Couldn't find command "${executable}"`);
      }
    }
  }

  for (let i = 0; i < processes.length; i++) {
    const process = processes[i];
    await process.status();
    await process.close();
  }
}
