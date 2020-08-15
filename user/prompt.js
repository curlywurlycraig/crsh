import { magenta, blue, gray } from "https://deno.land/std/fmt/colors.ts";

export const prompt = () => {
  const currentDir = magenta(Deno.cwd());
  return `${currentDir} › `;
};

export const reverseISearch = () => {
  const searchString = blue("search");
  return `${searchString} › `;
};

export const multilineGutter = () => {
  return gray("... › ");
};
