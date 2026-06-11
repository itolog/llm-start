export const cleanText = (text: string): string => {
  return text
    .trim()
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
};
