import chalk from "chalk";
import dotenv from "dotenv";
dotenv.config({
  debug: false,
});

import llm from "./llmModel";
import { prompt } from "./llmModel/messages";
import { logStatistics } from "./logger";
import { cleanText, printChatMessage } from "./helpers";

const bootstrap = async () => {
  const chatPrompt = prompt.pipe(llm);

  const res = await chatPrompt.invoke({
    input_language: "english",
    output_language: "polish",
    input: "hello rooster",
  });

  printChatMessage("AI Response", cleanText(res.text), chalk.cyanBright.bold);

  logStatistics(res);
};

bootstrap().catch((e) => {
  console.error(e);
});
