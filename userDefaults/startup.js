import { run } from "./src/run.js";

export const startup = async () => {
  const home = await run("echo $HOME");

  const paths = [
    `${home}/go/bin`,
    `${home}/.yarn/bin`,
    `${home}/.deno/bin`,
    `${home}/.cargo/bin`,
    `${home}/Documents/google-cloud-sdk/bin`,
  ];

  const pathString = paths.join(":");

  await run(`export PATH=$PATH:${pathString}`);

  const crshHome = `${home}/.crsh/`;
  await run(`export CRSH_HOME=${crshHome}`);
};
