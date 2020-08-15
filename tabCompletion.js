import { expandGlob, getTokenUnderCursor } from "./util.js";
import rules from "./completionRules/rules.js";

// Cache the prefix so that autocompleting allows cycling through
// results
let textSoFarCache = null;
let cursorIndexCache = null;

export const complete = async (buffer, tabIndex, resetCache = false) => {
  if (resetCache) {
    textSoFarCache = buffer.text;
    cursorIndexCache = buffer.cursorPosition;
  }

  const { token, tokenIndex } = getTokenUnderCursor({
    text: textSoFarCache,
    cursorPosition: cursorIndexCache,
  });

  if (tabIndex === -1) {
    return {
      newInput: textSoFarCache,
      tokenIndex: textSoFarCache.length,
      tokenLength: 0,
    };
  }

  //   console.log("token length is ", token.length);
  try {
    // Run through autocompletion rules
    const completedToken = await rules
      .find((rule) => rule.match.exec(textSoFarCache) !== null)
      ?.complete(token, tabIndex);

    const newInput =
      textSoFarCache.slice(0, tokenIndex) +
      completedToken +
      textSoFarCache.slice(tokenIndex + token.length);

    return {
      newInput,
      tokenIndex,
      tokenLength: completedToken.length,
    };
  } catch {
    return {
      newInput: buffer.text,
      tokenIndex,
      tokenLength: token.length,
    };
  }
};
