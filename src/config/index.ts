import { defaultModelConfig, ModelConfig } from "./model-config";

// Active model configuration. A mutable copy of the defaults so runtime
// overrides (the /model and /temp commands, applied via LlmModelService) layer
// on top without touching the frozen baseline in model-config.
export const config: ModelConfig = { ...defaultModelConfig };

export type { ModelConfig } from "./model-config";
export { appConfig } from "./app-config";
export type { AppConfig } from "./app-config";
