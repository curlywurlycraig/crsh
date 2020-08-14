import { prompt, promptLength, multilineGutter } from "./prompt.js";
import { complete } from "./tabCompletion.js";
import {
  getPreviousLine,
  getNextLine,
  getCursorPositionAfterMoveUp,
  getCursorPositionAfterMoveDown,
  getCursorColumn,
  getCursorRow,
  getPositionAtStartOfCurrentLine,
  getPositionAtEndOfCurrentLine,
} from "./cursor.js";
import {
  getTokenUnderCursor,
  cursorIsInFunction,
  cursorIsInQuotes,
} from "./util.js";

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
  "27,91,90": "shiftTab",
  "27,91,51,126": "delete",
  "27,27,91,68": "altLeft",
  "27,27,91,67": "altRight",
};

export const reverseControlCharactersBytesMap = {
  eraseLine: [27, 91, 50, 75],
  cursorUp: [27, 91, 65],
  cursorDown: [27, 91, 66],
  cursorRight: [27, 91, 67],
  cursorLeft: [27, 91, 68],
  eraseToEndOfLine: [27, 91, 75],
  eraseToEndOfScreen: [27, 91, 74],
  saveCursor: [27, 55],
  loadCursor: [27, 56],
  queryCursorPosition: [27, 91, 54, 110],
};

export const performTabCompletion = async (
  userInput,
  cursorPosition,
  tabIndex,
  resetCache
) => {
  const { newInput, tokenIndex, tokenLength } = await complete(
    userInput,
    cursorPosition,
    tabIndex,
    resetCache
  );

  await setCursorColumn(promptLength());

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfLine)
  );

  // Rewrite text
  await Deno.stdout.write(new TextEncoder().encode(newInput));

  cursorPosition = tokenIndex + tokenLength;
  await setCursorColumn(promptLength() + cursorPosition);

  return {
    newCursorPosition: tokenIndex + tokenLength,
    newUserInput: newInput,
  };
};

export const setCursorPosition = async (row, column) => {
  const positionSegment = new TextEncoder().encode(`${row};${column}H`);
  await Deno.stdout.write(Uint8Array.from([27, 91, ...positionSegment]));
};

export const setCursorColumn = async (column) => {
  const positionSegment = new TextEncoder().encode(`${column + 1}G`);
  await Deno.stdout.write(Uint8Array.from([27, 91, ...positionSegment]));
};

export const moveCursorUp = async (rowCount) => {
  if (rowCount === 0) {
    return;
  }

  const movementSegment = new TextEncoder().encode(`${rowCount}A`);
  await Deno.stdout.write(Uint8Array.from([27, 91, ...movementSegment]));
};

export const rewriteLineAfterPosition = async (text, position) => {
  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.saveCursor)
  );

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfScreen)
  );

  // Rewrite text
  await Deno.stdout.write(
    new TextEncoder().encode(addMultilineGutterToNewlines(text.slice(position)))
  );

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.loadCursor)
  );
};

const addMultilineGutterToNewlines = (text) => {
  const lines = text.split("\n");
  const linesWithGutter = lines
    .slice(1)
    .map((line) => `${multilineGutter()}${line}`);
  return [lines[0], ...linesWithGutter].join("\n");
};

export const rewriteFromPrompt = async (
  currentUserInput,
  newUserInput,
  cursorPosition
) => {
  await setCursorColumn(promptLength());

  await moveCursorUp(getCursorRow(currentUserInput, cursorPosition));

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfScreen)
  );

  await Deno.stdout.write(
    new TextEncoder().encode(addMultilineGutterToNewlines(newUserInput))
  );
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
  let tabIndex = -1;

  while (true) {
    const buf = new Uint8Array(256);
    const numberOfBytesRead = await Deno.stdin.read(buf);
    const relevantBuf = buf.slice(0, numberOfBytesRead);

    // console.debug("got ", buf.slice(0, numberOfBytesRead));

    const controlCharacter = controlCharactersBytesMap[relevantBuf];

    if (!["tab", "shiftTab"].includes(controlCharacter)) {
      tabIndex = -1;
    }

    if (controlCharacter === "ctrld") {
      Deno.exit(0);
    }

    if (controlCharacter === "ctrlc") {
      await rewriteFromPrompt(userInput, "", cursorPosition);

      userInput = "";
      cursorPosition = 0;

      continue;
    }

    if (controlCharacter === "return") {
      const inFunction = cursorIsInFunction(userInput, cursorPosition);
      const inQuotes = cursorIsInQuotes(userInput, cursorPosition);
      if (inFunction || inQuotes) {
        const indentLevel = inFunction ? 2 : 0;

        await Deno.stdout.write(
          Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfScreen)
        );

        await Deno.stdout.write(
          new TextEncoder().encode(`\n${multilineGutter()}`)
        );

        await Deno.stdout.write(
          new TextEncoder().encode(new Array(indentLevel + 1).join(" "))
        );

        await Deno.stdout.write(
          new TextEncoder().encode(
            addMultilineGutterToNewlines(userInput.slice(cursorPosition))
          )
        );

        const numberOfNewlines =
          userInput.slice(cursorPosition).split("\n").length - 1;

        for (let i = 0; i < numberOfNewlines; i++) {
          await Deno.stdout.write(
            Uint8Array.from(reverseControlCharactersBytesMap.cursorUp)
          );
        }

        new TextEncoder().encode();

        await setCursorColumn(promptLength() + indentLevel);

        const additionalInput = inFunction ? "\n  " : "\n";
        userInput =
          userInput.slice(0, cursorPosition) +
          additionalInput +
          userInput.slice(cursorPosition, userInput.length);

        cursorPosition += 1 + indentLevel;

        continue;
      } else {
        await Deno.stdout.write(new TextEncoder().encode("\n"));
        break;
      }
    }

    if (controlCharacter === "backspace") {
      if (cursorPosition === 0) {
        continue;
      }

      if (userInput[cursorPosition - 1] === "\n") {
        // Move the cursor up a row
        await Deno.stdout.write(
          Uint8Array.from(reverseControlCharactersBytesMap.cursorUp)
        );

        const lastLine = getPreviousLine(userInput, cursorPosition);
        await setCursorColumn(promptLength() + lastLine.length);

        userInput =
          userInput.slice(0, cursorPosition - 1) +
          userInput.slice(cursorPosition, userInput.length);

        cursorPosition--;

        await rewriteLineAfterPosition(userInput, cursorPosition);
      } else {
        userInput =
          userInput.slice(0, cursorPosition - 1) +
          userInput.slice(cursorPosition, userInput.length);

        cursorPosition--;

        await Deno.stdout.write(
          Uint8Array.from(reverseControlCharactersBytesMap.cursorLeft)
        );

        await rewriteLineAfterPosition(userInput, cursorPosition);
      }

      continue;
    }

    if (controlCharacter === "delete") {
      if (cursorPosition === userInput.length) {
        continue;
      }

      userInput =
        userInput.slice(0, cursorPosition) +
        userInput.slice(cursorPosition + 1, userInput.length);

      await rewriteLineAfterPosition(userInput, cursorPosition);

      continue;
    }

    if (controlCharacter === "up") {
      const lastLine = getPreviousLine(userInput, cursorPosition);

      if (lastLine !== null) {
        await Deno.stdout.write(
          Uint8Array.from(reverseControlCharactersBytesMap.cursorUp)
        );

        cursorPosition = getCursorPositionAfterMoveUp(
          userInput,
          cursorPosition
        );

        const column = getCursorColumn(userInput, cursorPosition);
        await setCursorColumn(promptLength() + column);

        continue;
      }

      if (currentHistoryIndex <= 0) {
        continue;
      }

      currentHistoryIndex--;
      const newUserInput = history[currentHistoryIndex];
      await rewriteFromPrompt(userInput, newUserInput, cursorPosition);
      userInput = newUserInput;
      cursorPosition = userInput.length;

      continue;
    }

    if (controlCharacter === "down") {
      const nextLine = getNextLine(userInput, cursorPosition);
      if (nextLine !== null) {
        await Deno.stdout.write(
          Uint8Array.from(reverseControlCharactersBytesMap.cursorDown)
        );

        // console.log("cursor position before ", cursorPosition);
        cursorPosition = getCursorPositionAfterMoveDown(
          userInput,
          cursorPosition
        );
        // console.log("cursor position after ", cursorPosition);

        const column = getCursorColumn(userInput, cursorPosition);
        await setCursorColumn(promptLength() + column);

        continue;
      }

      if (currentHistoryIndex === history.length) {
        continue;
      }

      currentHistoryIndex++;
      const newUserInput =
        currentHistoryIndex === history.length
          ? ""
          : history[currentHistoryIndex];
      await rewriteFromPrompt(userInput, newUserInput, cursorPosition);
      userInput = newUserInput;
      cursorPosition = userInput.length;

      continue;
    }

    if (controlCharacter === "left") {
      if (cursorPosition === 0) continue;

      if (userInput[cursorPosition - 1] === "\n") {
        await Deno.stdout.write(
          Uint8Array.from(reverseControlCharactersBytesMap.cursorUp)
        );

        const column = getPreviousLine(userInput, cursorPosition).length;
        await setCursorColumn(promptLength() + column);
      } else {
        await Deno.stdout.write(relevantBuf);
      }

      cursorPosition--;
      continue;
    }

    if (controlCharacter === "right") {
      if (cursorPosition === userInput.length) continue;

      if (
        userInput[cursorPosition] === "\n" &&
        cursorPosition < userInput.length
      ) {
        await Deno.stdout.write(
          Uint8Array.from(reverseControlCharactersBytesMap.cursorDown)
        );

        await setCursorColumn(promptLength());
      } else {
        await Deno.stdout.write(relevantBuf);
      }

      cursorPosition++;
      continue;
    }

    if (controlCharacter === "altLeft") {
      if (cursorPosition === 0) {
        continue;
      }

      const { tokenIndex } = getTokenUnderCursor(userInput, cursorPosition);
      if (tokenIndex < cursorPosition) {
        cursorPosition = tokenIndex;
      } else {
        const { tokenIndex: previousTokenIndex } = getTokenUnderCursor(
          userInput,
          cursorPosition - 2
        );
        cursorPosition = previousTokenIndex;
      }

      await setCursorColumn(promptLength() + cursorPosition);
      continue;
    }

    if (controlCharacter === "altRight") {
      if (cursorPosition === userInput.length) {
        continue;
      }

      const { tokenIndex, token } = getTokenUnderCursor(
        userInput,
        cursorPosition
      );
      if (tokenIndex + token.length > cursorPosition) {
        cursorPosition = tokenIndex + token.length;
      } else {
        const { tokenIndex: nextTokenIndex } = getTokenUnderCursor(
          userInput,
          tokenIndex + token.length + 2
        );
        cursorPosition = nextTokenIndex;
      }

      await setCursorColumn(promptLength() + cursorPosition);
      continue;
    }

    if (controlCharacter === "home") {
      cursorPosition = getPositionAtStartOfCurrentLine(
        userInput,
        cursorPosition
      );
      await setCursorColumn(
        promptLength() + getCursorColumn(userInput, cursorPosition)
      );
      continue;
    }

    if (controlCharacter === "end") {
      cursorPosition = getPositionAtEndOfCurrentLine(userInput, cursorPosition);
      await setCursorColumn(
        promptLength() + getCursorColumn(userInput, cursorPosition)
      );
      continue;
    }

    if (controlCharacter === "tab") {
      const resetCache = tabIndex === -1;
      tabIndex += 1;

      const { newCursorPosition, newUserInput } = await performTabCompletion(
        userInput,
        cursorPosition,
        tabIndex,
        resetCache
      );

      userInput = newUserInput;
      cursorPosition = newCursorPosition;

      continue;
    }

    if (controlCharacter === "shiftTab") {
      if (tabIndex === -1) {
        continue;
      }

      tabIndex -= 1;

      const { newCursorPosition, newUserInput } = await performTabCompletion(
        userInput,
        cursorPosition,
        tabIndex,
        false
      );

      userInput = newUserInput;
      cursorPosition = newCursorPosition;

      continue;
    }

    // All other text (hopefully normal characters)
    const decodedString = new TextDecoder().decode(relevantBuf);

    userInput =
      userInput.slice(0, cursorPosition) +
      decodedString +
      userInput.slice(cursorPosition, userInput.length);

    await rewriteLineAfterPosition(userInput, cursorPosition);

    for (var i = 0; i < decodedString.length; i++) {
      await Deno.stdout.write(
        Uint8Array.from(reverseControlCharactersBytesMap.cursorRight)
      );

      cursorPosition += 1;
    }
  }

  // Disable raw mode while routing stdin to sub-processes.
  Deno.setRaw(0, false);

  if (userInput.length > 0) {
    history.push(userInput);
    currentHistoryIndex = history.length;
  }

  return userInput;
};
