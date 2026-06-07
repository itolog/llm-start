import { ChatOllama } from "@langchain/ollama";
import { config } from "../config.js";
import { prompt } from "./messages.js";

export const llm = new ChatOllama({
  model: config.MODEL,
  temperature: config.LLM_TEMP,
});

export const translationChain = prompt.pipe(llm);
