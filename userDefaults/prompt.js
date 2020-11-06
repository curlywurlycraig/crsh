import { magenta, blue, gray } from "https://deno.land/std/fmt/colors.ts";
import { run } from "./src/run.js";

const getCurrentGitBranch = async () => {
  const gitBranch = await run("git rev-parse --abbrev-ref HEAD");

  if (!gitBranch) {
    return '';
  }

  return `· ${gitBranch}`;
}

export const prompt = async () => {
  const git = blue(await getCurrentGitBranch());
  const currentDir = magenta(Deno.cwd());
  const pipeTop = gray('╭');
  const pipeBottom = gray('╰─');
  return `${pipeTop} ${currentDir} ${git}\n${pipeBottom} `;
};

export const reverseISearch = () => {
  const searchString = blue("search");
  const pipeTop = gray('╭');
  const pipeBottom = gray('╰─');
  return `${pipeTop} ${searchString}\n${pipeBottom} `;
};

export const multilineGutter = () => {
  return gray(" › ");
};
