import { expandGlob, getTokenUnderCursor } from "./util.js";

// TODO Also pass cursor position to complete only the relevant part (getTokenUnderCursor)
export const complete = async (textSoFar, cursorIndex, tabIndex) => {
  // Get files in the current dir
  const { token, tokenIndex } = getTokenUnderCursor(textSoFar, cursorIndex);
  const files = await expandGlob(`${token}*`);

  const currentFile = files[tabIndex % files.length];
  const newInput =
    textSoFar.slice(0, tokenIndex) +
    currentFile +
    textSoFar.slice(tokenIndex + token.length);

  return newInput;
};
