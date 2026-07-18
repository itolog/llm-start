import { afterEach, describe, expect, it, vi } from "vitest";

// app-config reads process.env at import time, so each case stubs the env and
// re-imports the module fresh.
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("appConfig.OLLAMA_BASE_URL", () => {
  it("defaults to localhost when OLLAMA_URL is unset", async () => {
    vi.stubEnv("OLLAMA_URL", "");
    vi.resetModules();
    const { appConfig } = await import("./app-config");
    expect(appConfig.OLLAMA_BASE_URL).toBe("http://localhost:11434");
  });

  it("honours OLLAMA_URL when set", async () => {
    vi.stubEnv("OLLAMA_URL", "http://remote-host:1234");
    vi.resetModules();
    const { appConfig } = await import("./app-config");
    expect(appConfig.OLLAMA_BASE_URL).toBe("http://remote-host:1234");
  });
});
