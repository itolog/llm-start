import { Config } from "./config.type";

// Default model configuration. Used as the baseline at startup; runtime
// overrides (e.g. /model, /temp commands) will layer on top of this later.
export const defaultConfig: Config = {
  MODEL: "gemma4:12b-mlx",
  LLM_TEMP: 0.1,
};
