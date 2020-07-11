import { expandGlob, getTokenUnderCursor } from "./util.js";

// Cache the prefix so that autocompleting allows cycling through
// results
let textSoFarCache = null;
let cursorIndexCache = null;

export const complete = async (textSoFar, cursorIndex, tabIndex) => {
  if (tabIndex === 0) {
    textSoFarCache = textSoFar;
    cursorIndexCache = cursorIndex;
  }

  const { token, tokenIndex } = getTokenUnderCursor(
    textSoFarCache,
    cursorIndexCache
  );
  const files = await expandGlob(`${token}*`);

  const currentFile = files[tabIndex % files.length];
  const newInput =
    textSoFarCache.slice(0, tokenIndex) +
    currentFile +
    textSoFarCache.slice(tokenIndex + token.length);

  return newInput;
};
