// This file is for managing input in non-canonical mode

import {
  reverseControlCharactersBytesMap,
  getCursorPosition,
  setCursorPosition,
} from "./tty.js";

// Cursor ends up at the end of the new line. Remember to reposition after!
export const rewriteLine = async (stdin, stdout, text) => {
  // Erase whole line
  stdout.write(Uint8Array.from(reverseControlCharactersBytesMap.eraseLine));

  // Get cursor position
  const [row, column] = await getCursorPosition(stdout, stdin);

  // Move cursor to beginning of line
  setCursorPosition(stdout, row, 0);

  // Rewrite text
  await stdout.write(new TextEncoder().encode(text));

  return [row, column];
};
