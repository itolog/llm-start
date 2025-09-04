import { type ChalkInstance } from "chalk";

export const cleanText = (text: string): string => {
  return text
    .trim()
    .split("\n")
    .map((line) => line.trimStart())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
};

export const printChatMessage = (
  sender: string,
  message: string,
  color: ChalkInstance,
) => {
  const maxWidth = 60;
  const lines = message.split("\n");

  console.log(color(`╭${"─".repeat(maxWidth + 2)}╮`));
  console.log(color(`│ ${sender.padEnd(maxWidth)} │`));
  console.log(color(`├${"─".repeat(maxWidth + 2)}┤`));

  lines.forEach((line) => {
    if (line.length === 0) {
      console.log(color(`│${" ".repeat(maxWidth + 2)}│`));
    } else {
      const words = line.split(" ");
      let currentLine = "";

      words.forEach((word) => {
        if ((currentLine + word).length <= maxWidth) {
          currentLine += (currentLine ? " " : "") + word;
        } else {
          if (currentLine) {
            console.log(color(`│ ${currentLine.padEnd(maxWidth)} │`));
          }
          currentLine = word;
        }
      });

      if (currentLine) {
        console.log(color(`│ ${currentLine.padEnd(maxWidth)} │`));
      }
    }
  });

  console.log(color(`╰${"─".repeat(maxWidth + 2)}╯`));
};
