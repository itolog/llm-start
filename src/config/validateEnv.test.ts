import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseConfig } from "./validateEnv.js";

describe("parseConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it("should return correct config for valid environment", () => {
    process.env.MODEL = "test-model";
    process.env.LLM_TEMP = "0.5";
    process.env.OLLAMA_BASE_URL = "http://test-url:11434";

    const config = parseConfig();

    expect(config).toEqual({
      MODEL: "test-model",
      LLM_TEMP: 0.5,
      OLLAMA_BASE_URL: "http://test-url:11434",
    });
  });

  it("should throw error if MODEL is missing", () => {
    delete process.env.MODEL;
    expect(() => parseConfig()).toThrow(/MODEL is missing/);
  });

  it("should throw error if LLM_TEMP is non-numeric", () => {
    process.env.MODEL = "test-model";
    process.env.LLM_TEMP = "not-a-number";
    expect(() => parseConfig()).toThrow(/Invalid LLM_TEMP value/);
  });

  it("should throw error if LLM_TEMP is out of range", () => {
    process.env.MODEL = "test-model";
    process.env.LLM_TEMP = "2.5";
    expect(() => parseConfig()).toThrow(/LLM_TEMP must be between 0 and 2/);
    
    process.env.LLM_TEMP = "-0.1";
    expect(() => parseConfig()).toThrow(/LLM_TEMP must be between 0 and 2/);
  });

  it("should use default LLM_TEMP when not set", () => {
    process.env.MODEL = "test-model";
    delete process.env.LLM_TEMP;

    const config = parseConfig();

    expect(config.LLM_TEMP).toBe(0.1);
  });

  it("should use default OLLAMA_BASE_URL when not set", () => {
    process.env.MODEL = "test-model";
    delete process.env.OLLAMA_BASE_URL;

    const config = parseConfig();

    expect(config.OLLAMA_BASE_URL).toBe("http://localhost:11434");
  });
});
