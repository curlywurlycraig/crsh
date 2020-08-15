const searchHistory = (history, searchString, index) => {
  const matches = history
    .reverse()
    .filter((item) => item.includes(searchString));

  if (matches.length === 0) {
    return null;
  }

  if (matches[index]) {
    return matches[index];
  }

  return matches[matches.length - 1];
};

export default searchHistory;
