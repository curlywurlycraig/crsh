// TODO Test all these

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

export const expandGlobs = async (stringInput) => {
  // Find unescaped asterisks
  const globRegex = /[^\\ ]*\*[^ \*]?/g;

  let result = stringInput;

  const matchResults = matchAll(globRegex, stringInput);
  let matchResult = globRegex.exec(stringInput);

  while (matchResult !== null) {
    // TODO Cover things like "../*" "*.extension" "../*.extension"
    //      Probably do that by splitting into the dir portion + filename portion
    let filesInCurrentDir = [];
    for await (const dirEntry of Deno.readDir(".")) {
      filesInCurrentDir.push(dirEntry.name);
    }

    // Replace glob with list of dirs
    const globToken = matchResult[0];
    const globIndex = matchResult.index;
    result =
      result.slice(0, globIndex) +
      filesInCurrentDir.join(" ") +
      result.slice(globIndex + globToken.length);

    matchResult = globRegex.exec(result);
  }

  return result;
};

export const matchAll = (re, str) => {
  let results = [];
  let matchResult = re.exec(str);
  while (matchResult !== null) {
    results.push(matchResult);
    matchResult = re.exec(str);
  }

  return results;
};
