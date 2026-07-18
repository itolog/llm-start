import { AppConfig } from "./app-config.type";

// Point at a remote/custom Ollama host without editing source. `||` (not `??`)
// so an unset *or* empty OLLAMA_URL both fall back to the local default.
const OLLAMA_BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// Static application config (network, timeouts, history cap). Unlike the model
// config these are fixed baselines, not runtime-mutable.
export const appConfig: AppConfig = {
  OLLAMA_BASE_URL,
  LLM_TIMEOUT_MS: 60000,
  MAX_MESSAGES: 200,
  MODEL_CHECK_TIMEOUT_MS: 5000,
};
