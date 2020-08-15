import { magenta, blue, gray } from "https://deno.land/std/fmt/colors.ts";

export const prompt = () => {
  const currentDir = magenta(Deno.cwd());
  return `${currentDir} › `;
};

export const reverseISearch = () => {
  return blue("search › ");
};

export const multilineGutter = () => {
  return gray("... › ");
};
