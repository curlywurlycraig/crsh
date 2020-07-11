import { exec } from "../util.js";

// TODO Make work with yarn AND npm
const npmRules = [
  {
    match: /^yarn /,
    complete: async (token, tabIndex) => {
      const packageJsonRaw = await exec("cat", ["package.json"]);
      const commands = Object.keys(
        JSON.parse(packageJsonRaw).scripts
      ).filter((command) => command.startsWith(token));

      return commands[tabIndex % commands.length];
    },
  },
];

export default npmRules;
