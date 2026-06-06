import dotenv from "dotenv";

dotenv.config();

export interface Config {
  MODEL: string;
  LLM_TEMP: number;
  OLLAMA_BASE_URL: string;
}

export function parseConfig(): Config {
  const model = process.env.MODEL;
  if (!model) {
    throw new Error(
      "Environment variable MODEL is missing. Please specify the Ollama model name in your .env file (e.g., MODEL=gemma4:e4b-mlx)."
    );
  }

  const rawTemp = process.env.LLM_TEMP;
  let temp = 0.1;

  if (rawTemp !== undefined) {
    const parsedTemp = Number.parseFloat(rawTemp);
    if (!Number.isFinite(parsedTemp)) {
      throw new Error(`Invalid LLM_TEMP value: "${rawTemp}". It must be a valid number.`);
    }
    temp = parsedTemp;
  }

  if (temp < 0 || temp > 2) {
    throw new Error(`LLM_TEMP must be between 0 and 2. Received: ${temp}`);
  }

  return {
    MODEL: model,
    LLM_TEMP: temp,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  };
}
