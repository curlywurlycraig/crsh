import { expandGlob, getTokenUnderCursor } from "./util.js";
import gitRules from "./completionRules/git.js";
import fileRule from "./completionRules/file.js";

// Cache the prefix so that autocompleting allows cycling through
// results
let textSoFarCache = null;
let cursorIndexCache = null;

// Prioritised order. Any matching rule will prevent later rules from executing
const rules = [...gitRules, fileRule];

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
