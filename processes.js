// Runs a command line process
export const exec = async (command, args) => {
  const p = Deno.run({
    cmd: [command, ...args],
    stdin: "piped",
    stdout: "piped",
    stderr: "piped",
  });
};
