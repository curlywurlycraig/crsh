import { completeFile } from "./file.js";
import { exec } from "../util.js";

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
    match: /^git checkout /,
    complete: async (token, tabIndex) => {
      const branches = (await exec("git", ["branch"]))
        .split("\n")
        .map((branch) => branch.trim())
        .filter(
          (branch) => branch.startsWith(token) && !branch.startsWith("*")
        );

      return branches[tabIndex % branches.length];
    },
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
