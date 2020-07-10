import { expandGlob } from "./util.js";

// TODO Also pass cursor position to complete only the relevant part (getTokenUnderCursor)
export const complete = async (textSoFar, tabIndex) => {
  // Get files in the current dir
  const split = textSoFar.split(" ");
  const relevantPart = split[split.length - 1];
  const files = await expandGlob(`${relevantPart}*`);
  //   console.log("files: ", files);
  // TODO Replace the token under cursor, rather than just appending
  return `${textSoFar}${files[tabIndex % files.length]}`;
};
