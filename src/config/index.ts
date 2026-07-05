import { Config } from "./config.type";
import { defaultConfig } from "./default-config";

// Active configuration. A mutable copy of the defaults so runtime overrides
// (the /model and /temp commands, applied via LlmModelService) layer on top
// without touching the frozen baseline in default-config.
export const config: Config = { ...defaultConfig };

export type { Config } from "./config.type";
