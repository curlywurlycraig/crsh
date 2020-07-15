import { magenta, stripColor, gray } from "https://deno.land/std/fmt/colors.ts";

export const prompt = () => {
  const currentDir = magenta(Deno.cwd());
  return `${currentDir} › `;
};

export const promptLength = () => stripColor(prompt()).length;

export const multilineGutter = () => {
  const space = Array(promptLength() - 6)
    .fill(" ")
    .join("");
  return gray(`${space}... › `);
};
