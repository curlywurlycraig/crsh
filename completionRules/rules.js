import gitRules from "./git.js";
import fileRule from "./file.js";

// Add your rules here.
// Prioritised order. Any matching rule will prevent later rules from executing.
const rules = [...gitRules, fileRule];

export default rules;
