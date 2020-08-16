import {
  prompt,
  promptLength,
  multilineGutter,
  reverseISearchPrompt,
} from "./prompt.js";
import {
  controlCharactersBytesMap,
  reverseControlCharactersBytesMap,
  setCursorPosition,
  setCursorColumn,
  moveCursorUp,
} from "./vt100.js";
import searchHistory from "./searchHistory.js";
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
  getNumberOfRows,
} from "./cursor.js";
import {
  getTokenUnderCursor,
  cursorIsInFunction,
  cursorIsInQuotes,
} from "./util.js";

export const performTabCompletion = async (buffer, tabIndex, resetCache) => {
  const { newInput, tokenIndex, tokenLength } = await complete(
    buffer,
    tabIndex,
    resetCache
  );

  await setCursorColumn(promptLength());

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfLine)
  );

  // Rewrite text
  await Deno.stdout.write(new TextEncoder().encode(newInput));

  await setCursorColumn(promptLength() + buffer.cursorPosition);

  buffer.cursorPosition = tokenIndex;
  buffer.text = newInput;
};

export const rewriteLineAfterCursor = async ({ text, cursorPosition }) => {
  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.saveCursor)
  );

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfScreen)
  );

  // Rewrite text
  await Deno.stdout.write(
    new TextEncoder().encode(
      addMultilineGutterToNewlines(text.slice(cursorPosition))
    )
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

export const eraseAllIncludingPrompt = async (buffer) => {
  await setCursorColumn(0);

  await moveCursorUp(getCursorRow(buffer));

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfScreen)
  );
};

export const rewriteFromPrompt = async (buffer, newUserInput) => {
  await setCursorColumn(promptLength());

  await moveCursorUp(getCursorRow(buffer));

  await Deno.stdout.write(
    Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfScreen)
  );

  await Deno.stdout.write(
    new TextEncoder().encode(addMultilineGutterToNewlines(newUserInput))
  );
};

const doSearchAndUpdateResults = async (
  buffer,
  history,
  reverseISearchIndex
) => {
  const match = searchHistory(history, buffer.text, reverseISearchIndex);
  if (match) {
    await Deno.stdout.write(
      Uint8Array.from(reverseControlCharactersBytesMap.eraseToEndOfScreen)
    );

    await Deno.stdout.write(
      new TextEncoder().encode(addMultilineGutterToNewlines(`\n${match}`))
    );

    await moveCursorUp(getNumberOfRows(match));
    await setCursorColumn(promptLength() + buffer.cursorPosition);
  }

  return match;
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

  const commandBuffer = {
    text: "",
    cursorPosition: 0,
  };

  const reverseISearchBuffer = {
    text: "",
    cursorPosition: 0,
  };

  let tabIndex = -1;
  let isReverseISearching = false;
  let reverseISearchIndex = 0;
  let currentBuffer = commandBuffer;
  let reverseISearchResult = null;

  const writingCommandPromise = new Promise(async (resolve, reject) => {
    let running = true;
    while (running) {
      const buf = new Uint8Array(256);
      const numberOfBytesRead = await Deno.stdin.read(buf);
      const relevantBuf = buf.slice(0, numberOfBytesRead);

      // console.debug("got ", buf.slice(0, numberOfBytesRead));

      const commonMap = {
        ctrlc: async () => {
          await rewriteFromPrompt(currentBuffer, "");

          currentBuffer.text = "";
          currentBuffer.cursorPosition = 0;
        },
        ctrld: async () => {
          Deno.exit(0);
        },
        left: async () => {
          if (currentBuffer.cursorPosition === 0) return;

          if (currentBuffer.text[currentBuffer.cursorPosition - 1] === "\n") {
            await Deno.stdout.write(
              Uint8Array.from(reverseControlCharactersBytesMap.cursorUp)
            );

            const column = getPreviousLine(currentBuffer).length;
            await setCursorColumn(promptLength() + column);
          } else {
            await Deno.stdout.write(relevantBuf);
          }

          currentBuffer.cursorPosition--;
        },
        right: async () => {
          if (currentBuffer.cursorPosition === currentBuffer.text.length)
            return;

          if (
            currentBuffer.text[currentBuffer.cursorPosition] === "\n" &&
            currentBuffer.cursorPosition < currentBuffer.text.length
          ) {
            await Deno.stdout.write(
              Uint8Array.from(reverseControlCharactersBytesMap.cursorDown)
            );

            await setCursorColumn(promptLength());
          } else {
            await Deno.stdout.write(relevantBuf);
          }

          currentBuffer.cursorPosition++;
        },
        altLeft: async () => {
          if (currentBuffer.cursorPosition === 0) {
            return;
          }

          const { tokenIndex } = getTokenUnderCursor(currentBuffer);
          if (tokenIndex < currentBuffer.cursorPosition) {
            currentBuffer.cursorPosition = tokenIndex;
          } else {
            const { tokenIndex: previousTokenIndex } = getTokenUnderCursor({
              text: currentBuffer.text,
              cursorPosition: currentBuffer.cursorPosition - 2,
            });
            currentBuffer.cursorPosition = previousTokenIndex;
          }

          await setCursorColumn(promptLength() + currentBuffer.cursorPosition);
        },
        altRight: async () => {
          if (currentBuffer.cursorPosition === currentBuffer.text.length) {
            return;
          }

          const { tokenIndex, token } = getTokenUnderCursor(currentBuffer);
          if (tokenIndex + token.length > currentBuffer.cursorPosition) {
            currentBuffer.cursorPosition = tokenIndex + token.length;
          } else {
            const { tokenIndex: nextTokenIndex } = getTokenUnderCursor({
              ...currentBuffer,
              cursorPosition: tokenIndex + token.length + 2,
            });
            currentBuffer.cursorPosition = nextTokenIndex;
          }

          await setCursorColumn(promptLength() + currentBuffer.cursorPosition);
        },
        home: async () => {
          currentBuffer.cursorPosition = getPositionAtStartOfCurrentLine(
            currentBuffer
          );
          await setCursorColumn(
            promptLength() + getCursorColumn(currentBuffer)
          );
        },
        end: async () => {
          currentBuffer.cursorPosition = getPositionAtEndOfCurrentLine(
            currentBuffer
          );
          await setCursorColumn(
            promptLength() + getCursorColumn(currentBuffer)
          );
        },
        backspace: async () => {
          if (currentBuffer.cursorPosition === 0) {
            return;
          }

          if (currentBuffer.text[currentBuffer.cursorPosition - 1] === "\n") {
            // Move the cursor up a row
            await Deno.stdout.write(
              Uint8Array.from(reverseControlCharactersBytesMap.cursorUp)
            );

            const lastLine = getPreviousLine(currentBuffer);
            await setCursorColumn(promptLength() + lastLine.length);

            currentBuffer.text =
              currentBuffer.text.slice(0, currentBuffer.cursorPosition - 1) +
              currentBuffer.text.slice(
                currentBuffer.cursorPosition,
                currentBuffer.text.length
              );

            currentBuffer.cursorPosition--;

            await rewriteLineAfterCursor(currentBuffer);
          } else {
            currentBuffer.text =
              currentBuffer.text.slice(0, currentBuffer.cursorPosition - 1) +
              currentBuffer.text.slice(
                currentBuffer.cursorPosition,
                currentBuffer.text.length
              );

            currentBuffer.cursorPosition--;

            await Deno.stdout.write(
              Uint8Array.from(reverseControlCharactersBytesMap.cursorLeft)
            );

            await rewriteLineAfterCursor(currentBuffer);
          }
        },
        delete: async () => {
          if (currentBuffer.cursorPosition === currentBuffer.text.length) {
            return;
          }

          currentBuffer.text =
            currentBuffer.text.slice(0, currentBuffer.cursorPosition) +
            currentBuffer.text.slice(
              currentBuffer.cursorPosition + 1,
              currentBuffer.text.length
            );

          await rewriteLineAfterCursor(currentBuffer);
        },
        default: async () => {
          // All other text (hopefully normal characters)
          const decodedString = new TextDecoder().decode(relevantBuf);

          currentBuffer.text =
            currentBuffer.text.slice(0, currentBuffer.cursorPosition) +
            decodedString +
            currentBuffer.text.slice(
              currentBuffer.cursorPosition,
              currentBuffer.text.length
            );

          await rewriteLineAfterCursor(currentBuffer);

          for (var i = 0; i < decodedString.length; i++) {
            await Deno.stdout.write(
              Uint8Array.from(reverseControlCharactersBytesMap.cursorRight)
            );

            currentBuffer.cursorPosition += 1;
          }
        },
      };

      const commandMap = {
        ctrlr: async () => {
          await eraseAllIncludingPrompt(currentBuffer);

          await Deno.stdout.write(
            new TextEncoder().encode(reverseISearchPrompt())
          );

          currentBuffer = reverseISearchBuffer;
          currentBuffer.cursorPosition = 0;
          currentBuffer.text = "";
          isReverseISearching = true;
        },
        return: async () => {
          const inFunction = cursorIsInFunction(currentBuffer);
          const inQuotes = cursorIsInQuotes(currentBuffer);
          if (inFunction || inQuotes) {
            const indentLevel = inFunction ? 2 : 0;

            await Deno.stdout.write(
              Uint8Array.from(
                reverseControlCharactersBytesMap.eraseToEndOfScreen
              )
            );

            await Deno.stdout.write(
              new TextEncoder().encode(`\n${multilineGutter()}`)
            );

            await Deno.stdout.write(
              new TextEncoder().encode(new Array(indentLevel + 1).join(" "))
            );

            await Deno.stdout.write(
              new TextEncoder().encode(
                addMultilineGutterToNewlines(
                  currentBuffer.text.slice(currentBuffer.cursorPosition)
                )
              )
            );

            const numberOfNewlines =
              currentBuffer.text.slice(currentBuffer.cursorPosition).split("\n")
                .length - 1;

            for (let i = 0; i < numberOfNewlines; i++) {
              await Deno.stdout.write(
                Uint8Array.from(reverseControlCharactersBytesMap.cursorUp)
              );
            }

            await setCursorColumn(promptLength() + indentLevel);

            const additionalInput = inFunction ? "\n  " : "\n";
            currentBuffer.text =
              currentBuffer.text.slice(0, currentBuffer.cursorPosition) +
              additionalInput +
              currentBuffer.text.slice(
                currentBuffer.cursorPosition,
                currentBuffer.text.length
              );

            currentBuffer.cursorPosition += 1 + indentLevel;
          } else {
            await Deno.stdout.write(new TextEncoder().encode("\n"));
            running = false;
            resolve();
          }
        },
        up: async () => {
          const lastLine = getPreviousLine(currentBuffer);

          if (lastLine !== null) {
            await Deno.stdout.write(
              Uint8Array.from(reverseControlCharactersBytesMap.cursorUp)
            );

            currentBuffer.cursorPosition = getCursorPositionAfterMoveUp(
              currentBuffer
            );

            const column = getCursorColumn(currentBuffer);
            await setCursorColumn(promptLength() + column);

            return;
          }

          if (currentHistoryIndex <= 0) {
            return;
          }

          currentHistoryIndex--;
          const newUserInput = history[currentHistoryIndex];
          await rewriteFromPrompt(currentBuffer, newUserInput);
          currentBuffer.text = newUserInput;
          currentBuffer.cursorPosition = currentBuffer.text.length;
        },
        down: async () => {
          const nextLine = getNextLine(currentBuffer);
          if (nextLine !== null) {
            await Deno.stdout.write(
              Uint8Array.from(reverseControlCharactersBytesMap.cursorDown)
            );

            currentBuffer.cursorPosition = getCursorPositionAfterMoveDown(
              currentBuffer
            );

            const column = getCursorColumn(currentBuffer);
            await setCursorColumn(promptLength() + column);

            return;
          }

          if (currentHistoryIndex === history.length) {
            return;
          }

          currentHistoryIndex++;
          const newUserInput =
            currentHistoryIndex === history.length
              ? ""
              : history[currentHistoryIndex];
          await rewriteFromPrompt(currentBuffer, newUserInput);
          currentBuffer.text = newUserInput;
          currentBuffer.cursorPosition = currentBuffer.text.length;
        },
        tab: async () => {
          const resetCache = tabIndex === -1;
          tabIndex += 1;

          await performTabCompletion(currentBuffer, tabIndex, resetCache);
        },
        shiftTab: async () => {
          if (tabIndex === -1) {
            return;
          }

          tabIndex -= 1;

          await performTabCompletion(currentBuffer, tabIndex, false);
        },
      };

      const reverseISearchMap = {
        ctrlr: async () => {
          reverseISearchIndex += 1;

          if (!currentBuffer.text) {
            return;
          }

          const match = await doSearchAndUpdateResults(
            currentBuffer,
            history,
            reverseISearchIndex
          );

          if (match) {
            reverseISearchResult = match;
          }
        },
        escape: async () => {
          await eraseAllIncludingPrompt(currentBuffer);

          reverseISearchBuffer.text = "";
          reverseISearchBuffer.cursorPosition = 0;
          currentBuffer = commandBuffer;
          isReverseISearching = false;

          await Deno.stdout.write(new TextEncoder().encode(prompt()));
          await Deno.stdout.write(
            new TextEncoder().encode(
              addMultilineGutterToNewlines(currentBuffer.text)
            )
          );
        },
        any: async () => {
          if (!currentBuffer.text) {
            return;
          }

          const match = await doSearchAndUpdateResults(
            currentBuffer,
            history,
            reverseISearchIndex
          );

          if (match) {
            reverseISearchResult = match;
          }

          reverseISearchIndex = 0;
        },
        return: async () => {
          await eraseAllIncludingPrompt(currentBuffer);

          if (reverseISearchResult) {
            commandBuffer.text = reverseISearchResult;
            commandBuffer.cursorPosition = commandBuffer.text.length;
          }

          reverseISearchBuffer.text = "";
          reverseISearchBuffer.cursorPosition = 0;
          currentBuffer = commandBuffer;
          isReverseISearching = false;

          await Deno.stdout.write(new TextEncoder().encode(prompt()));
          await Deno.stdout.write(
            new TextEncoder().encode(
              addMultilineGutterToNewlines(currentBuffer.text)
            )
          );
        },
      };

      const controlCharacter = controlCharactersBytesMap[relevantBuf];

      if (!["tab", "shiftTab"].includes(controlCharacter)) {
        tabIndex = -1;
      }

      if (commonMap[controlCharacter]) {
        await commonMap[controlCharacter]();
      } else if (commandMap[controlCharacter] && !isReverseISearching) {
        await commandMap[controlCharacter]();
      } else if (reverseISearchMap[controlCharacter] && isReverseISearching) {
        await reverseISearchMap[controlCharacter]();
      } else {
        await commonMap.default();
      }

      if (isReverseISearching && !reverseISearchMap[controlCharacter]) {
        await reverseISearchMap.any();
      }
    }
  });

  await writingCommandPromise;

  // Disable raw mode while routing stdin to sub-processes.
  Deno.setRaw(0, false);

  if (currentBuffer.text.length > 0) {
    history.push(currentBuffer.text);
    currentHistoryIndex = history.length;
  }

  return currentBuffer.text;
};
