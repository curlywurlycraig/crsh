import { completeFile } from "./file.js";

const gitCommands = [
  "clone",
  "init",
  "add",
  "mv",
  "reset",
  "rm",
  "bisect",
  "grep",
  "log",
  "show",
  "status",
  "branch",
  "checkout",
  "commit",
  "diff",
  "merge",
  "rebase",
  "tag",
  "fetch",
  "pull",
  "push",
];

const gitRules = [
  {
    match: /^git add /,
    complete: completeFile,
  },
  {
    match: /^git /,
    complete: async (token, tabIndex) => {
      const filteredCommands = gitCommands.filter((command) =>
        command.startsWith(token)
      );

      return filteredCommands[tabIndex % filteredCommands.length];
    },
  },
];

export default gitRules;
