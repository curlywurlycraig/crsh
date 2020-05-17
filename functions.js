export const fetchBody = async (url) => {
  const result = await fetch(url);
  return await result.text();
};
