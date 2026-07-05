import { AppConfig } from "./app-config.type";

// Static application config (network, timeouts, history cap). Unlike the model
// config these are fixed baselines, not runtime-mutable.
export const appConfig: AppConfig = {
  OLLAMA_BASE_URL: "http://localhost:11434",
  LLM_TIMEOUT_MS: 60000,
  MAX_MESSAGES: 200,
  MODEL_CHECK_TIMEOUT_MS: 5000,
};
