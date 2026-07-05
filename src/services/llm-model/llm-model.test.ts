import { describe, expect, it } from "vitest";

import { llmModelService } from "./llm-model.service";

describe("llmModelService", () => {
  it("exposes translate and checkModelAvailable methods", () => {
    expect(typeof llmModelService.translate).toBe("function");
    expect(typeof llmModelService.checkModelAvailable).toBe("function");
  });
});
