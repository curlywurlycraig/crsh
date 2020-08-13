export const getNumberOfRows = (text) => {
  const result = text.split("\n").length;
  return result;
};

export const getCursorRow = (text, cursorPosition) => {
  const upToCursor = text.slice(0, cursorPosition - 1);
  return getNumberOfRows(upToCursor) - 1;
};

export const getPreviousLine = (text, cursorPosition) => {
  const upToCursor = text.slice(0, cursorPosition);
  const asLines = upToCursor.split("\n");

  if (asLines.length < 2) {
    return null;
  }

  return asLines[asLines.length - 2];
};

export const getNextLine = (text, cursorPosition) => {
  const beyondCursor = text.slice(cursorPosition);
  const asLines = beyondCursor.split("\n");

  if (asLines.length < 2) {
    return null;
  }

  return asLines[1];
};

export const getLineUpToCursor = (text, cursorPosition) => {
  const upToCursor = text.slice(0, cursorPosition);
  const asLines = upToCursor.split("\n");
  return asLines[asLines.length - 1];
};

export const getCurrentLine = (Text, cursorPosition) => {
  return getLineUpToCursor() + getRestOfLine();
};

export const getRestOfLine = (text, cursorPosition) => {
  const upToCursor = text.slice(cursorPosition);
  const asLines = upToCursor.split("\n");
  return asLines[0];
};

export const getCursorColumn = (text, cursorPosition) => {
  return getLineUpToCursor(text, cursorPosition).length;
};

export const getCursorPositionAfterMoveUp = (text, cursorPosition) => {
  const currentCursorColumn = getCursorColumn(text, cursorPosition);
  const previousLine = getPreviousLine(text, cursorPosition);
  const newColumn = Math.min(currentCursorColumn, previousLine.length);

  return (
    cursorPosition - previousLine.length - currentCursorColumn + newColumn - 1
  );
};

export const getCursorPositionAfterMoveDown = (text, cursorPosition) => {
  const currentCursorColumn = getCursorColumn(text, cursorPosition);
  const nextLine = getNextLine(text, cursorPosition);
  const newColumn = Math.min(currentCursorColumn, nextLine.length);
  const restOfLine = getRestOfLine(text, cursorPosition);
  return currentCursorColumn + restOfLine.length + newColumn + 1;
};
