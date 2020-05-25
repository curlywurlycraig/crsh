// Rejoin args between "" or ''.
// Takes a list of tokens, some maybe beginning with a quote.
// Returns a list of tokens where tokens between quotes are merged into a single
// arg.
// The surrounding quotes are removed.
export const mergeArgsBetweenQuotes = (args) =>
  args
    .reduce((prev, curr) => {
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
    }, [])
    .map((arg) =>
      (arg.startsWith('"') && arg.endsWith('"')) ||
      (arg.startsWith("'") && arg.endsWith("'"))
        ? arg.slice(1, arg.length - 1)
        : arg
    );

export const replaceEnvVars = (stringInput) => {
  const envVarRegex = /\$[a-zA-Z0-9]+/g;
  let matchResults = [];
  let matchResult = envVarRegex.exec(stringInput);
  while (matchResult !== null) {
    matchResults.push(matchResult);
    matchResult = envVarRegex.exec(stringInput);
  }

  let result = stringInput;
  matchResults.forEach((currentMatchResult) => {
    const envVar = Deno.env.get(currentMatchResult[0].slice(1));
    result =
      result.slice(0, currentMatchResult.index) +
      envVar?.toString() +
      result.slice(currentMatchResult.index + currentMatchResult[0].length);
  });

  return result;
};

export const evalAndInterpolateJS = (stringInput) => {
  // Find parts to be eval'd
  const evalRegex = /\$\{[^\}]+\}/g;

  let result = stringInput;

  let matchResult = evalRegex.exec(result);
  while (matchResult !== null) {
    const matchString = matchResult[0].slice(2, matchResult[0].length - 1);
    const evalResult = Function(`return (${matchString})`)();
    result = result.replace(matchResult[0], evalResult);

    matchResult = evalRegex.exec(result);
  }
  // Replace the result in the command

  return result;
};

export const expandGlobs = (stringInput) => {
  // Find unescaped asterisks
  return stringInput; // TODO
  const globRegex = /[^\\ ]*\*[^ \*]/g;

  let result = stringInput;

  let matchResult = evalRegex.exec(result);
  while (matchResult !== null) {
    const matchString = matchResult[0].slice(2, matchResult[0].length - 1);
    const evalResult = Function(`return (${matchString})`)();
    result = result.replace(matchResult[0], evalResult);

    matchResult = evalRegex.exec(result);
  }
  // Replace the result in the command

  return result;
};
