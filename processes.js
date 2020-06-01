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
  return new TextDecoder().decode(resultByteArray);
};
