import chalk from "chalk";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import dotenv from "dotenv";
dotenv.config({
  debug: false,
});

import llm from "./llmModel";
import { config } from "./config";

const messages = [
  new SystemMessage("Translate the following from English into Italian"),
  new HumanMessage("hi!"),
];

const bootstrap = async () => {
  const res = await llm.invoke(messages);

  console.log(
    chalk.yellow("│"),
    chalk.yellow.bold("AI Response:"),
    chalk.yellow("│"),
  );

  console.log(chalk.cyanBright.bold(res.content));
};

bootstrap()
  .then(() => {
    console.log(chalk.green(`${config.MODEL} model successfully launched`));
  })
  .catch((e) => {
    console.error(e);
  });
