const searchHistory = (history, searchString, index) => {
  const matches = history
    .slice(0)
    .reverse()
    .filter((item) => item.includes(searchString));

  if (matches.length === 0) {
    return { match: null, matchIndex: 0 };
  }

  const selectedMatch = matches[index]
    ? matches[index]
    : matches[matches.length - 1];

  return {
    match: selectedMatch,
    matchIndex: selectedMatch.indexOf(searchString),
  };
};

export default searchHistory;
