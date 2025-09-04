import { ChatPromptTemplate } from "@langchain/core/prompts";

export const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a translation assistant. Translate the text from {input_language} to {output_language}.Respond with only the translated text, without explanations, alternatives, or transliterations.",
  ],
  ["human", "{input}"],
]);
