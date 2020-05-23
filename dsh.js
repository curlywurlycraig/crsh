import { StringReader } from "https://deno.land/std@0.50.0/io/readers.ts";
import { StringWriter } from "https://deno.land/std@0.50.0/io/writers.ts";

import { builtins } from "./builtins.js";
import { readCommand } from "./tty.js";
import {
  mergeArgsBetweenQuotes,
  replaceEnvVars,
  evalAndInterpolateJS,
} from "./util.js";

while (true) {
  const userInput = await readCommand();
  if (userInput.length === 0) continue;

  if (userInput.endsWith(";")) {
    try {
      const result = Function(`return ${userInput}`)();
      console.log(result);
    } catch (err) {
      console.error(err.toString());
    }
    continue;
  }

  // Running as non semi-colon func.

  // TODO Parse more than just "|" (there are other separators! Error pipes, file pipes, etc)
  const [rawCommands, outputFilename] = userInput
    .trim()
    .split(" >")
    .map((untrimmed) => untrimmed.trim());

  const commands = rawCommands.split("|");

  const outputFile = outputFilename
    ? await Deno.open(outputFilename, { write: true, create: true })
    : null;

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
    const withEnvVarsReplaced = evalAndInterpolateJS(replaceEnvVars(trimmed));

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

        if (isLast && outputFile === null) {
          await Deno.stdout.write(new TextEncoder().encode(`${nextContent}\n`));
        } else if (isLast && outputFile !== null) {
          await outputFile.write(new TextEncoder().encode(`${nextContent}\n`));
          await outputFile.close();
        }
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
        stdout: isLast && outputFile === null ? "inherit" : "piped",
        stderr: isLast ? "inherit" : "piped",
      });

      if (!isFirst) {
        const prevOutput = lastIO.stdout;
        const currentInput = p.stdin;

        await Deno.copy(prevOutput, currentInput);
        await p.stdin.close();
      }

      if (isLast && outputFile !== null) {
        await Deno.copy(p.stdout, outputFile);
        await p.stdout?.close();
        await outputFile.close();
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
