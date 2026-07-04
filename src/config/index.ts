import { Config } from "./config.type";
import { defaultConfig } from "./default-config";

// Active configuration. For now it is just the defaults; runtime overrides
// (e.g. /model, /temp commands) will layer on top of this later.
export const config: Config = defaultConfig;

export type { Config } from "./config.type";
