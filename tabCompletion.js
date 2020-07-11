import { expandGlob, getTokenUnderCursor } from "./util.js";

export const complete = async (textSoFar, cursorIndex, tabIndex) => {
  const { token, tokenIndex } = getTokenUnderCursor(textSoFar, cursorIndex);
  const files = await expandGlob(`${token}*`);

  const currentFile = files[tabIndex % files.length];
  const newInput =
    textSoFar.slice(0, tokenIndex) +
    currentFile +
    textSoFar.slice(tokenIndex + token.length);

  return newInput;
};
