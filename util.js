// Rejoin args between "" or ''.
// Takes a list of tokens, some maybe beginning with a quote.
// Returns a list of tokens where tokens between quotes are merged into a single
// arg.
export const mergeArgsBetweenQuotes = (args) =>
  args.reduce((prev, curr) => {
    if (curr === null || curr === undefined) {
      return prev;
    }

    const last = prev[prev.length - 1];
    if (last === undefined) {
      return [...prev, curr];
    }

    const inDoubleQuotes = last.startsWith(`"`) && !last.endsWith(`"`);
    const inSingleQuotes = last.startsWith(`'`) && !last.endsWith(`'`);
    if (prev.length > 0 && (inDoubleQuotes || inSingleQuotes)) {
      const result = prev.slice(0, prev.length - 1);
      result.push(`${last} ${curr}`);
      return result;
    }

    return [...prev, curr];
  }, []);
