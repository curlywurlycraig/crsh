import { exec } from "../util.js";

const yarnCommands = [
  "access",
  "add",
  "audit",
  "autoclean",
  "bin",
  "cache",
  "check",
  "config",
  "create",
  "exec",
  "generateLockEntry",
  "global",
  "help",
  "import",
  "info",
  "init",
  "install",
  "licenses",
  "link",
  "list",
  "login",
  "logout",
  "node",
  "outdated",
  "owner",
  "pack",
  "policies",
  "publish",
  "remove",
  "run",
  "tag",
  "team",
  "unlink",
  "unplug",
  "upgrade",
  "upgradeInteractive",
  "version",
  "versions",
  "why",
  "workspace",
  "workspaces",
];

const npmRules = [
  {
    match: /^yarn /,
    complete: async (token, tabIndex) => {
      const packageJsonRaw = await exec("cat", ["package.json"]);
      const customCommands =
        packageJsonRaw.length > 0
          ? Object.keys(JSON.parse(packageJsonRaw).scripts)
          : [];

      const commands = [...customCommands, ...yarnCommands].filter((command) =>
        command.startsWith(token)
      );

      return commands[tabIndex % commands.length];
    },
  },
  {
    match: /^npm run /,
    complete: async (token, tabIndex) => {
      const packageJsonRaw = await exec("cat", ["package.json"]);
      const customCommands =
        packageJsonRaw.length > 0
          ? Object.keys(JSON.parse(packageJsonRaw).scripts)
          : [];

      const commands = customCommands.filter((command) =>
        command.startsWith(token)
      );

      return commands[tabIndex % commands.length];
    },
  },
];

export default npmRules;
