import chalk from "chalk";
import dotenv from "dotenv";
dotenv.config({
  debug: false,
});

import llm from "./llmModel";
import { config } from "./config";
import { promptTemplate } from "./llmModel/messages";
import { logStatistics } from "./logger";

const bootstrap = async () => {
  const promptValue = await promptTemplate.invoke({
    language: "polish",
    text: "hi",
  });

  const startTime = Date.now();

  const res = await llm.invoke(promptValue);

  const endTime = Date.now();
  const responseTime = endTime - startTime;

  console.log(
    chalk.yellow("│"),
    chalk.yellow.bold("AI Response:"),
    chalk.yellow("│"),
  );

  const cleanedContent = res.content
    .toString()
    .trim()
    .replace(/^\s+/gm, "")
    .replace(/\n\s*\n/g, "\n");

  console.log(chalk.cyanBright.bold(cleanedContent));

  logStatistics(res, responseTime);
};

bootstrap()
  .then(() => {
    console.log(chalk.green(`${config.MODEL} model successfully launched`));
  })
  .catch((e) => {
    console.error(e);
  });
