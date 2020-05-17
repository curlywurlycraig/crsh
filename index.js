import { BufReader, BufWriter } from "https://deno.land/std@0.50.0/io/bufio.ts";
import { StringReader } from "https://deno.land/std@0.50.0/io/readers.ts";
import { StringWriter } from "https://deno.land/std@0.50.0/io/writers.ts";

import { prompt } from "./prompt.js";
import { builtins } from "./builtins.js";
import { fetchBody } from "./functions.js";
import {
  getCursorPosition,
  setCursorPosition,
  reverseControlCharactersBytesMap,
  controlCharactersBytesMap,
} from "./tty.js";

const readAll = async (reader) => {
  if (reader === null) return "";

  let lastOutput = "";
  const bufferedReader = new BufReader(reader);
  let nextBit = await bufferedReader.readString("\n");
  while (nextBit !== null) {
    lastOutput += nextBit;
    nextBit = await bufferedReader.readString("\n");
  }

  return lastOutput;
};

// This sets the terminal to non-canonical mode.
// That's essential for capturing raw key-presses.
// It's what allows pressing up to navigate history, for example. Or moving the cursor left
Deno.setRaw(0, true);

while (true) {
  await Deno.stdout.write(new TextEncoder().encode(prompt()));

  const reader = new BufReader(Deno.stdin);

  // Read input
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
      // Remove character before current cursor position
      userInput =
        userInput.slice(0, cursorPosition - 1) +
        userInput.slice(cursorPosition, userInput.length);

      // Update cursor position
      cursorPosition--;

      // Erase whole line
      Deno.stdout.write(
        Uint8Array.from(reverseControlCharactersBytesMap.eraseLine)
      );

      // Get cursor position
      const [row, column] = await getCursorPosition(Deno.stdout, Deno.stdin);

      // Move cursor to beginning of line
      setCursorPosition(Deno.stdout, row, 0);

      // Rewrite prompt
      await Deno.stdout.write(new TextEncoder().encode(prompt()));

      // Rewrite user input
      await Deno.stdout.write(new TextEncoder().encode(userInput));

      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "up") {
      // Read history and update print
      cursorPosition = 0;
      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "down") {
      // Read history and update print
      cursorPosition = 0;
      continue;
    }

    const decodedString = new TextDecoder().decode(relevantBuf);

    await Deno.stdout.write(relevantBuf);

    userInput += decodedString;
  }

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
    const command = commands[index];

    const trimmed = command.trim();

    if (/^\(.*\) ?=> ?.*$/.test(trimmed)) {
      const func = eval(trimmed);

      const lastOutput = await readAll(lastIO.stdout);

      let json = undefined;
      try {
        json = JSON.parse(lastOutput.trim());
      } catch (err) {
      } finally {
      }

      // TODO Capture console logs and other stdout/err writes here
      const result = func({
        raw: lastOutput,
        lines: lastOutput.split("\n"),
        json,
      });

      let nextContent;
      try {
        nextContent = JSON.stringify(result);
      } catch {
        nextContent = result ? result.toString() : "";
      }

      lastIO = {
        stdout: new StringReader(`${nextContent}\n`),
        stderr: new StringReader(),
        stdin: new StringWriter(),
      };

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
    const args = splitCommand.slice(1);

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
      const isFirst = index === 0;
      const isLast = index === commands.length - 1;
      const p = Deno.run({
        cmd: splitCommand,
        stdin: isFirst ? "inherit" : "piped",
        stdout: isLast ? "inherit" : "piped",
        stderr: isLast ? "inherit" : "piped",
      });

      if (!isFirst && !isLast) {
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
      console.log("err is this ", err);
      if (err instanceof Deno.errors.NotFound) {
        console.error(`Couldn't find command "${executable}"`);
      }
    }
  }

  if (processes[0]) {
    let status = await processes[0].status();
    await processes[0].close();
  }
}
