import { run } from "../run.js";

export const startup = async () => {
  const home = await run("echo $HOME");

  const paths = [
    `${home}/go/bin`,
    `/usr/local/sbin`,
    `${home}/.yarn/bin`,
    `${home}/.deno/bin`,
    `${home}/.cargo/bin`,
    `${home}/Documents/google-cloud-sdk/bin`,
    `/usr/local/bin`,
    `/usr/bin`,
    `/bin`,
    `/usr/sbin`,
    `/sbin`,
  ];

  const pathString = paths.join(":");

  run(`export PATH=$PATH:${pathString}`);
};
