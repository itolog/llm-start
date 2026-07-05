import { describe, expect, it } from "vitest";

import { modelMatches } from "./model-matches.util";

describe("modelMatches", () => {
  it("matches an exact tag", () => {
    expect(modelMatches("gemma3:4b", "gemma3:4b")).toBe(true);
  });

  it("matches when the tag carries the implicit :latest and config does not", () => {
    expect(modelMatches("llama3", "llama3:latest")).toBe(true);
  });

  it("matches when config carries :latest and the tag does not", () => {
    expect(modelMatches("llama3:latest", "llama3")).toBe(true);
  });

  it("does not match different models", () => {
    expect(modelMatches("gemma3:4b", "llama3:latest")).toBe(false);
  });

  it("does not treat :latest as matching a specific version tag", () => {
    expect(modelMatches("gemma3:4b", "gemma3:latest")).toBe(false);
  });
});
