import { ChatPromptTemplate } from "@langchain/core/prompts";

export const systemTemplate =
  "Translate the following from English into {language}";

export const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", systemTemplate],
  ["user", "{text}"],
]);
