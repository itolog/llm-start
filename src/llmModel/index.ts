import { ChatOllama } from "@langchain/ollama";
import { config } from "../config.js";

const llm = new ChatOllama({
  model: config.MODEL,
  temperature: config.TEMP,
  // verbose: false,
});

export default llm;
