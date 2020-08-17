import { run } from "../run.js";

export const startup = async () => {
  const home = await run("echo $HOME");

  const paths = [
    `${home}/go/bin`,
    `${home}/.yarn/bin`,
    `${home}/.deno/bin`,
    `${home}/.cargo/bin`,
    `${home}/Documents/google-cloud-sdk/bin`,
    `/usr/local/bin`,
    `/usr/local/sbin`,
    `/usr/bin`,
    `/bin`,
    `/usr/sbin`,
    `/sbin`,
  ];

  const pathString = paths.join(":");

  await run(`export PATH=$PATH:${pathString}`);

  const crshHome = `${home}/Documents/projects/deno_shell`;
  await run(`export CRSH_HOME=${crshHome}`);
};
