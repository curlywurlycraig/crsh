import { readHistory } from "./util.js";
import { run } from "./run.js";

export const builtins = {
  exit: () => Deno.exit(0),
  cd: (args) => {
    let dir = args[0];

    if (dir === undefined) {
      Deno.env.set("OLDPWD", Deno.cwd());
      Deno.chdir(Deno.env.get("HOME"));
      return;
    }

    if (dir === "-") {
      Deno.chdir(Deno.env.get("OLDPWD"));
      return;
    }

    if (dir.startsWith("~")) {
      const homePath = Deno.env.get("HOME");
      dir = `${homePath}${dir.slice(1)}`;
    }

    Deno.env.set("OLDPWD", Deno.cwd());
    Deno.chdir(dir);
  },
  export: (args) => {
    args.forEach((pair) => {
      const [key, value] = pair.split("=");
      Deno.env.set(key, value);
    });
  },
  history: async () => {
    const crshHome = Deno.env.get("CRSH_HOME");
    return await run(`cat ${crshHome}/history.json | ({ json }) => json | less`);
  }
};

export const defaultExtraUnixArgs = {
  ls: (args) => {
    return ["-G", ...args];
  },
};
