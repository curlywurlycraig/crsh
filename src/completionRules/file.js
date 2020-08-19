import { expandGlob, expandHome } from "../util.js";

export const completeFile = async (token, tabIndex) => {
  const withHomeExpanded = expandHome(token);
  const files = await expandGlob(`${withHomeExpanded}*`);
  const currentFile = files[tabIndex % files.length];

  return currentFile;
};

const fileRule = {
  name: "File",
  match: /^.*/,
  complete: completeFile,
};

export default fileRule;
