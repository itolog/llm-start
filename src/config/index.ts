// The active model/temperature are no longer duplicated here: LlmModelService
// owns them at runtime (seeded from `defaultModelConfig`) and is the single
// source React reads from. This module exposes only the static baselines.
export { defaultModelConfig } from "./model-config";
export type { ModelConfig } from "./model-config";
export { appConfig } from "./app-config";
export type { AppConfig } from "./app-config";
