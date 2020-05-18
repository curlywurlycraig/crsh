import { BufReader } from "https://deno.land/std@0.50.0/io/bufio.ts";

// TODO I don't think this should be necessary at all
export const readAll = async (reader) => {
  if (reader === null) return "";

  let lastOutput = "";
  const bufferedReader = new BufReader(reader);
  let nextBit = await bufferedReader.readString("\n");
  while (nextBit !== null) {
    lastOutput += nextBit;
    nextBit = await bufferedReader.readString("\n");
  }

  return lastOutput;
};
