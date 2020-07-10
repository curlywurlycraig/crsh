import { prompt } from "./prompt.js";
import { complete } from "./tabCompletion.js";

// Helpful reference: http://www.termsys.demon.co.uk/vtansi.htm#cursor
export const controlCharactersBytesMap = {
  "3": "ctrlc",
  "4": "ctrld",
  "9": "tab",
  "13": "return",
  "127": "backspace",
  "27,91,68": "left",
  "27,91,67": "right",
  "27,91,65": "up",
  "27,91,66": "down",
  "27,91,70": "end",
  "27,91,72": "home",
  "27,91,51,126": "delete",
};

export const reverseControlCharactersBytesMap = {
  eraseLine: [27, 91, 50, 75],
  cursorLeft: [27, 91, 68],
  queryCursorPosition: [27, 91, 54, 110],
};

export const getCursorPosition = async (stdout, stdin) => {
  stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.queryCursorPosition)
  );
  const cursorPositionBuf = new Uint8Array(100);
  const cursorNumberOfBytesRead = await stdin.read(cursorPositionBuf);
  const relevantCursorBuf = cursorPositionBuf.slice(0, cursorNumberOfBytesRead);
  const cursorInfoString = new TextDecoder().decode(relevantCursorBuf.slice(1));

  const [row, column] = cursorInfoString
    .slice(1, cursorInfoString.length - 1)
    .split(";");

  return [row, column];
};

export const setCursorPosition = (stdout, row, column) => {
  const positionSegment = new TextEncoder().encode(`${row};${column}H`);
  stdout.write(Uint8Array.from([27, 91, ...positionSegment]));
};

// Cursor ends up at the end of the new line. Remember to reposition after!
export const rewriteLine = async (stdin, stdout, text) => {
  // Erase whole line
  // TODO Erase more carefully to avoid flicker. No need to remove the whole line.
  // Just write over!
  stdout.write(Uint8Array.from(reverseControlCharactersBytesMap.eraseLine));

  // Get cursor position
  const [row, column] = await getCursorPosition(stdout, stdin);

  // Move cursor to beginning of line
  setCursorPosition(stdout, row, 0);

  // Rewrite text
  await stdout.write(new TextEncoder().encode(text));

  return [row, column];
};

// TODO Read history from a file
const history = [];
let currentHistoryIndex = history.length;

export const readCommand = async () => {
  // This sets the terminal to non-canonical mode.
  // That's essential for capturing raw key-presses.
  // It's what allows pressing up to navigate history, for example. Or moving the cursor left
  Deno.setRaw(0, true);

  await Deno.stdout.write(new TextEncoder().encode(prompt()));

  let userInput = "";
  let cursorPosition = 0;
  let tabIndex = 0;

  while (true) {
    const buf = new Uint8Array(256);
    const numberOfBytesRead = await Deno.stdin.read(buf);
    const relevantBuf = buf.slice(0, numberOfBytesRead);

    // console.debug("got ", buf.slice(0, numberOfBytesRead));

    if (controlCharactersBytesMap[relevantBuf] === "ctrld") {
      Deno.exit(0);
    }

    if (controlCharactersBytesMap[relevantBuf] === "ctrlc") {
      userInput = "";
      cursorPosition = 0;

      const [row, column] = await rewriteLine(
        Deno.stdin,
        Deno.stdout,
        `${prompt()}${userInput}`
      );

      continue;
    }

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

    if (controlCharactersBytesMap[relevantBuf] === "delete") {
      if (cursorPosition === userInput.length) {
        continue;
      }

      userInput =
        userInput.slice(0, cursorPosition) +
        userInput.slice(cursorPosition + 1, userInput.length);

      const [row, column] = await rewriteLine(
        Deno.stdin,
        Deno.stdout,
        `${prompt()}${userInput}`
      );

      setCursorPosition(Deno.stdout, row, prompt().length + cursorPosition - 9);
      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "up") {
      if (currentHistoryIndex <= 0) {
        continue;
      }

      currentHistoryIndex--;
      userInput = history[currentHistoryIndex];
      cursorPosition = userInput.length;

      await rewriteLine(Deno.stdin, Deno.stdout, `${prompt()}${userInput}`);
      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "down") {
      if (currentHistoryIndex === history.length) {
        continue;
      }

      currentHistoryIndex++;
      userInput =
        currentHistoryIndex === history.length
          ? ""
          : history[currentHistoryIndex];
      cursorPosition = userInput.length;

      await rewriteLine(Deno.stdin, Deno.stdout, `${prompt()}${userInput}`);
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

    if (controlCharactersBytesMap[relevantBuf] === "tab") {
      // Check autocompletion configs (for things like git)
      // If no match, should just do file.

      // TODO Track tab index

      userInput = await complete(userInput, tabIndex);
      cursorPosition = userInput.length;

      await rewriteLine(Deno.stdin, Deno.stdout, `${prompt()}${userInput}`);
      tabIndex += 1;
      continue;
    }

    // All other text
    const decodedString = new TextDecoder().decode(relevantBuf);

    userInput =
      userInput.slice(0, cursorPosition) +
      decodedString +
      userInput.slice(cursorPosition, userInput.length);

    cursorPosition += decodedString.length;

    const [row, column] = await rewriteLine(
      Deno.stdin,
      Deno.stdout,
      `${prompt()}${userInput}`
    );

    setCursorPosition(Deno.stdout, row, prompt().length + cursorPosition - 9);
  }

  // Disable raw mode while routing stdin to sub-processes.
  Deno.setRaw(0, false);

  if (userInput.length > 0) {
    history.push(userInput);
    currentHistoryIndex = history.length;
  }

  return userInput;
};
