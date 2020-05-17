import { magenta } from "https://deno.land/std/fmt/colors.ts";

export const prompt = () => {
  const currentDir = magenta(Deno.cwd());
  return `${currentDir} 🌝 `;
};
