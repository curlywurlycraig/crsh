// Helpful reference: http://www.termsys.demon.co.uk/vtansi.htm#cursor
// Another helpful reference: http://www.pitt.edu/~jcaretto/text/cleanup/twproae.html
// An angry but helpful reference: http://xn--rpa.cc/irl/term.html
// https://en.wikipedia.org/wiki/ANSI_escape_code#Escape_sequences
export const controlCharactersBytesMap = {
  "3": "ctrlc",
  "4": "ctrld",
  "9": "tab",
  "13": "return",
  "18": "ctrlr",
  "27": "escape",
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
