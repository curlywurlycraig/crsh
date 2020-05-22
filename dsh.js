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
import { mergeArgsBetweenQuotes, replaceEnvVars } from "./util.js";

// TODO Read history from a file
const history = [];
let currentHistoryIndex = history.length;

while (true) {
  // This sets the terminal to non-canonical mode.
  // That's essential for capturing raw key-presses.
  // It's what allows pressing up to navigate history, for example. Or moving the cursor left
  Deno.setRaw(0, true);

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

  // Disable raw mode while routing stdin to sub-processes.
  Deno.setRaw(0, false);

  ///////////
  // Execute input
  ///////////

  // TODO Parse more than just "|" (there are other separators! Error pipes, file pipes, etc)
  const commands = userInput.trim().split("|");

  if (commands.length === 1 && commands[0] === "") {
    continue;
  }

  history.push(userInput);
  currentHistoryIndex = history.length;

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
    const withEnvVarsReplaced = replaceEnvVars(trimmed);

    if (/^\(.*\) ?=> ?.*$/.test(withEnvVarsReplaced)) {
      const lastOutput = new TextDecoder().decode(
        await Deno.readAll(lastIO.stdout)
      );

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
      try {
        const func = eval(withEnvVarsReplaced);
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
          Deno.stdout.write(new TextEncoder().encode(`${nextContent}\n`));
        }
      } catch (err) {
        console.error(`Failed to execute command: ${err.toString()}`);
      }

      continue;
    }

    if (/^[a-zA-Z0-9]*\(.*\)$/.test(withEnvVarsReplaced)) {
      try {
        const output = await eval(withEnvVarsReplaced);

        lastIO = {
          stdout: new StringReader(`${output.toString()}\n`),
          stderr: new StringReader(),
          stdin: new StringWriter(),
        };
      } catch (err) {
        console.error(`Failed to execute command: ${err.toString()}`);
      }

      continue;
    }

    const splitCommand = withEnvVarsReplaced.split(" ");
    const executable = splitCommand[0].trim();
    const args = mergeArgsBetweenQuotes(splitCommand.slice(1));

    if (builtins[executable] !== undefined) {
      try {
        const lastOutput = new TextDecoder().decode(
          await Deno.readAll(lastIO.stdout)
        );
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
      } else {
        console.error(`Failed to execute command: ${err.toString()}`);
      }
    }
  }

  for (let i = 0; i < processes.length; i++) {
    const process = processes[i];
    await process.status();
    await process.close();
  }
}
