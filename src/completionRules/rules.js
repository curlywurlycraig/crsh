import gitRules from "./git.js";
import fileRule from "./file.js";
import npmRules from "./npm.js";

// Add your rules here.
// Prioritised order. Any matching rule will prevent later rules from executing.
const rules = [...gitRules, ...npmRules, fileRule];

export default rules;
