import { stripColor } from "https://deno.land/std/fmt/colors.ts";
import {
  prompt as userPrompt,
  multilineGutter as userMultilineGutter,
  reverseISearch as userReverseISearch,
} from "./user/prompt.js";

// Just re-export. Non-user usage of import should import from here, not the user directory.
export const prompt = userPrompt;

export const promptLength = () => stripColor(prompt()).length;

const gutterLength = () => stripColor(userMultilineGutter()).length;

const reverseISearchPromptLength = () =>
  stripColor(userReverseISearch()).length;

export const multilineGutter = () => {
  const space = Array(promptLength() - gutterLength())
    .fill(" ")
    .join("");
  return `${space}${userMultilineGutter()}`;
};

export const reverseISearchPrompt = () => {
  const space = Array(promptLength() - reverseISearchPromptLength())
    .fill(" ")
    .join("");
  return `${space}${userReverseISearch()}`;
};
