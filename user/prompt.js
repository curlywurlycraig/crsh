import { magenta, gray } from "https://deno.land/std/fmt/colors.ts";

export const prompt = () => {
  const currentDir = magenta(Deno.cwd());
  return `${currentDir} › `;
};

export const multilineGutter = () => {
  return gray("... › ");
};
