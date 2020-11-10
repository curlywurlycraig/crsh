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

export const expandGlob = async (token) => {
  let dir = ".";
  if (token.includes("/")) {
    dir = token.slice(0, token.lastIndexOf("/"));
  }

  const suffix = token.slice(token.indexOf("*") + 1);
  const prefix = token.slice(0, token.indexOf("*"));

  let filesInCurrentDir = [];

  const withHomeExpanded = expandHome(dir);

  for await (const dirEntry of Deno.readDir(withHomeExpanded)) {
    const fileSuffix = dirEntry.isDirectory ? "/" : "";
    const name = `${dirEntry.name}${fileSuffix}`;
    const fileName = dir === "." ? name : `${dir}/${name}`;

    if (fileName.endsWith(suffix) && fileName.startsWith(prefix)) {
      filesInCurrentDir.push(fileName);
    }
  }

  return filesInCurrentDir;
};

export const getTokenUnderCursor = ({ text, cursorPosition }) => {
  const tokenRegex = /[^ ]+/g;

  let matchResult = tokenRegex.exec(text);

  while (matchResult !== null) {
    const token = matchResult[0];
    const tokenIndex = matchResult.index;

    if (
      tokenIndex <= cursorPosition &&
      tokenIndex + token.length >= cursorPosition
    ) {
      // console.log("token is ", token, tokenIndex);
      return {
        token,
        tokenIndex,
      };
    }

    matchResult = tokenRegex.exec(text);
  }

  return {
    token: "",
    tokenIndex: cursorPosition,
  };
};

export const expandGlobs = async (stringInput) => {
  // Find unescaped asterisks
  const globRegex = /[^\\ ]*\*[^ \*]*/g;

  let result = stringInput;

  let matchResult = globRegex.exec(stringInput);

  while (matchResult !== null) {
    const globToken = matchResult[0];
    const globIndex = matchResult.index;

    try {
      const filesInCurrentDir = await expandGlob(globToken);

      result =
        result.slice(0, globIndex) +
        filesInCurrentDir.join(" ") +
        result.slice(globIndex + globToken.length);

      matchResult = globRegex.exec(result);
    } catch (e) {
      return stringInput;
    }
  }

  return result;
};

export const expandDoubleBang = (command) => {
  const doubleBangRegex = /!!/g;

  if (command.search("!!") === -1) {
    return command;
  }

  const history = readHistory();
  const lastCommand = history[history.length - 1];
  return command.replace(doubleBangRegex, lastCommand)
}

export const expandCommand = async (command) => {
  return await expandGlobs(
    expandHome(
      command
    )
  );
};

export const expandHome = (stringInput) => {
  // Only match at start of line or after space. So that e.g. HEAD~2 in git still works.
  const homeRegex = /(?<=\ |^)\~/g;

  return stringInput.replace(homeRegex, Deno.env.get("HOME"));
};

// Runs a command line process and returns the resulting stdout
export const exec = async (command, args) => {
  const p = Deno.run({
    cmd: [command, ...args],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });

  const resultByteArray = await Deno.readAll(p.stdout);
  await p.stdout?.close();
  await p.stdin?.close();
  await p.stderr?.close();
  await p.close();
  return new TextDecoder().decode(resultByteArray);
};

export const cursorIsInFunction = ({ text, cursorPosition }) => {
  const unclosedFunctionRegex = /[^\{]*\{[^\}]*$/g;

  const upToPosition = text.slice(0, cursorPosition);

  return unclosedFunctionRegex.exec(upToPosition) !== null;
};

export const cursorIsInQuotes = ({ text, cursorPosition }) => {
  const upToPosition = text.slice(0, cursorPosition);
  const upToPositionAsList = [...upToPosition];
  const isInQuotes =
    upToPositionAsList.filter((c) => c === '"').length % 2 === 1;
  const isInSingleQuotes =
    upToPositionAsList.filter((c) => c === "'").length % 2 === 1;

  return isInQuotes || isInSingleQuotes;
};

const getHistoryFileLocation = () => {
  const crshHome = Deno.env.get("CRSH_HOME");
  return `${crshHome}/history.json`;
};

const healHistoryFile = () => {
  Deno.writeFileSync(
    getHistoryFileLocation(),
    new TextEncoder().encode(JSON.stringify([], null, 2))
  );
};

export const readHistory = () => {
  try {
    const historyBytes = Deno.readFileSync(getHistoryFileLocation());
    return JSON.parse(new TextDecoder().decode(historyBytes));
  } catch (e) {
    console.log('what the');
    if (e instanceof Deno.errors.NotFound) {
      healHistoryFile();

      return [];
    } else {
      throw e;
    }
  }
};

export const addToHistory = (history) => {
  Deno.writeFileSync(
    getHistoryFileLocation(),
    new TextEncoder().encode(JSON.stringify(history, null, 2))
  );
};