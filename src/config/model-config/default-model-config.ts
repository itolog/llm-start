import { ModelConfig } from "./model-config.type";

// Preferred model configuration — the baseline the app boots with. It does not
// have to be installed: on startup `resolveStartupModel()` falls back to an
// installed model if this one is missing (or prompts to pull one if none are).
export const defaultModelConfig: ModelConfig = {
  MODEL: "gemma4:12b-mlx",
  LLM_TEMP: 0.1,
};
