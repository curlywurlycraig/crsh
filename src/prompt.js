import { stripColor } from "https://deno.land/std/fmt/colors.ts";
import {
  prompt as userPrompt,
  multilineGutter as userMultilineGutter,
  reverseISearch as userReverseISearch,
} from "../prompt.js";

// Just re-export. Non-user usage of import should import from here, not the user directory.
export const prompt = userPrompt;

export const getLengthOfLastLine = (potentiallyColouredInput) => {
  const split = stripColor(potentiallyColouredInput).split("\n");
  return split[split.length - 1].length;
}

export const promptHeight = (prompt) => stripColor(prompt).split("\n").length;

const gutterLength = () => stripColor(userMultilineGutter()).length;

export const multilineGutter = (prompt) => {
  const space = Array(getLengthOfLastLine(prompt) - gutterLength())
    .fill(" ")
    .join("");
  return `${space}${userMultilineGutter()}`;
};

export const reverseISearchPrompt = () => userReverseISearch();
