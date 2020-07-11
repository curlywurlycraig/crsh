import { prompt, promptLength } from "./prompt.js";
import { complete } from "./tabCompletion.js";

// Helpful reference: http://www.termsys.demon.co.uk/vtansi.htm#cursor
// Another helpful reference: http://www.pitt.edu/~jcaretto/text/cleanup/twproae.html
// An angry but helpful reference: http://xn--rpa.cc/irl/term.html
// https://en.wikipedia.org/wiki/ANSI_escape_code#Escape_sequences
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
  cursorRight: [27, 91, 67],
  eraseToEndOfLine: [27, 91, 75],
  saveCursor: [27, 91, 115],
  loadCursor: [27, 91, 117],
  queryCursorPosition: [27, 91, 54, 110],
};

export const setCursorPosition = (row, column) => {
  const positionSegment = new TextEncoder().encode(`${row};${column}H`);
  Deno.stdout.write(Uint8Array.from([27, 91, ...positionSegment]));
};

export const setCursorColumn = (column) => {
  const positionSegment = new TextEncoder().encode(`${column}G`);
  Deno.stdout.write(Uint8Array.from([27, 91, ...positionSegment]));
};

export const rewriteLineAfterPosition = async (text, position) => {
  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.saveCursor)
  );

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfLine)
  );

  // Rewrite text
  await Deno.stdout.write(new TextEncoder().encode(text.slice(position)));

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.loadCursor)
  );
};

export const replaceAllInput = async (text) => {
  await setCursorColumn(promptLength() + 1);

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfLine)
  );

  await Deno.stdout.write(new TextEncoder().encode(text));
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

    if (controlCharactersBytesMap[relevantBuf] !== "tab") {
      tabIndex = 0;
    }

    if (controlCharactersBytesMap[relevantBuf] === "ctrld") {
      Deno.exit(0);
    }

    if (controlCharactersBytesMap[relevantBuf] === "ctrlc") {
      userInput = "";
      cursorPosition = 0;

      await rewriteLineAfterPosition(userInput, cursorPosition);

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

      await Deno.stdout.write(
        Uint8Array.from(reverseControlCharactersBytesMap.cursorLeft)
      );

      await rewriteLineAfterPosition(userInput, cursorPosition);

      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "delete") {
      if (cursorPosition === userInput.length) {
        continue;
      }

      userInput =
        userInput.slice(0, cursorPosition) +
        userInput.slice(cursorPosition + 1, userInput.length);

      await rewriteLineAfterPosition(userInput, cursorPosition);

      continue;
    }

    if (controlCharactersBytesMap[relevantBuf] === "up") {
      if (currentHistoryIndex <= 0) {
        continue;
      }

      currentHistoryIndex--;
      userInput = history[currentHistoryIndex];
      cursorPosition = userInput.length;

      await replaceAllInput(userInput);
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

      await replaceAllInput(userInput);
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
      const { newInput, tokenIndex, tokenLength } = await complete(
        userInput,
        cursorPosition,
        tabIndex
      );
      userInput = newInput;

      setCursorColumn(promptLength() + 1);

      await Deno.stdout.write(
        Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfLine)
      );

      // Rewrite text
      await Deno.stdout.write(new TextEncoder().encode(userInput));

      cursorPosition = tokenIndex + tokenLength;
      setCursorColumn(promptLength() + cursorPosition + 1);

      tabIndex += 1;
      continue;
    }

    // All other text (hopefully normal characters)
    const decodedString = new TextDecoder().decode(relevantBuf);

    userInput =
      userInput.slice(0, cursorPosition) +
      decodedString +
      userInput.slice(cursorPosition, userInput.length);

    await rewriteLineAfterPosition(userInput, cursorPosition);
    Deno.stdout.write(
      Uint8Array.from(reverseControlCharactersBytesMap.cursorRight)
    );

    cursorPosition += decodedString.length;
  }

  // Disable raw mode while routing stdin to sub-processes.
  Deno.setRaw(0, false);

  if (userInput.length > 0) {
    history.push(userInput);
    currentHistoryIndex = history.length;
  }

  return userInput;
};
