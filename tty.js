// Extremely helpful reference: http://www.termsys.demon.co.uk/vtansi.htm#cursor
export const controlCharactersBytesMap = {
  "13": "return",
  "127": "backspace",
  "27,91,68": "left",
  "27,91,65": "up",
  "27,91,70": "end",
  "27,91,72": "home",
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

export const positionCursor = async (stdout, stdin, row, column) {
//
}