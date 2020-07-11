import { expandGlob, getTokenUnderCursor } from "./util.js";
import rules from "./completionRules/rules.js";

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

  // Run through autocompletion rules
  const completedToken = await rules
    .find((rule) => rule.match.exec(textSoFarCache) !== null)
    ?.complete(token, tabIndex);

  const newInput =
    textSoFarCache.slice(0, tokenIndex) +
    completedToken +
    textSoFarCache.slice(tokenIndex + token.length);

  return newInput;
};
