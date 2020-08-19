export const getNumberOfRows = (text) => {
  const result = text.split("\n").length;
  return result;
};

export const getCursorRow = (buffer) => {
  const upToCursor = buffer.text.slice(0, buffer.cursorPosition);
  return getNumberOfRows(upToCursor) - 1;
};

export const getPreviousLine = (buffer) => {
  const upToCursor = buffer.text.slice(0, buffer.cursorPosition);
  const asLines = upToCursor.split("\n");

  if (asLines.length < 2) {
    return null;
  }

  return asLines[asLines.length - 2];
};

export const getNextLine = (buffer) => {
  const beyondCursor = buffer.text.slice(buffer.cursorPosition);
  const asLines = beyondCursor.split("\n");

  if (asLines.length < 2) {
    return null;
  }

  return asLines[1];
};

export const getLineUpToCursor = (buffer) => {
  const upToCursor = buffer.text.slice(0, buffer.cursorPosition);
  const asLines = upToCursor.split("\n");
  return asLines[asLines.length - 1];
};

export const getCurrentLine = (buffer) => {
  return getLineUpToCursor(buffer) + getRestOfLine(buffer);
};

export const getRestOfLine = (buffer) => {
  const upToCursor = buffer.text.slice(buffer.cursorPosition);
  const asLines = upToCursor.split("\n");
  return asLines[0];
};

export const getCursorColumn = (buffer) => {
  return getLineUpToCursor(buffer).length;
};

export const getCursorPositionAfterMoveUp = (buffer) => {
  const currentCursorColumn = getCursorColumn(buffer);
  const previousLine = getPreviousLine(buffer);
  const newColumn = Math.min(currentCursorColumn, previousLine.length);

  return (
    buffer.cursorPosition -
    previousLine.length -
    currentCursorColumn +
    newColumn -
    1
  );
};

export const getCursorPositionAfterMoveDown = (buffer) => {
  const currentCursorColumn = getCursorColumn(buffer);
  const nextLine = getNextLine(buffer);
  const newColumn = Math.min(currentCursorColumn, nextLine.length);
  const restOfLine = getRestOfLine(buffer);
  return buffer.cursorPosition + restOfLine.length + newColumn + 1;
};

export const getPositionAtStartOfCurrentLine = (buffer) => {
  const textToCurrentPosition = buffer.text.slice(0, buffer.cursorPosition);
  const linesToNow = textToCurrentPosition.split("\n");
  const linesExceptCurrent = linesToNow.slice(0, linesToNow.length - 1);
  const result = linesExceptCurrent.join("\n").length + 1;
  return result === 1 ? 0 : result;
};

export const getPositionAtEndOfCurrentLine = (buffer) => {
  return getRestOfLine(buffer).length + buffer.cursorPosition;
};
