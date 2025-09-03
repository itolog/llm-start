import { ChatOllama } from "@langchain/ollama";
import { config } from "../config";

const llm = new ChatOllama({
  model: config.MODEL,
  temperature: config.TEMP,
  think: false,
});

export default llm;
