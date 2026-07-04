import { Runnable } from "@langchain/core/runnables";
import { describe, expect, it } from "vitest";

import { translationChain } from "./llm-model.service";

describe("LLM Chain", () => {
  it("should be an instance of Runnable", () => {
    expect(translationChain).toBeInstanceOf(Runnable);
  });
});
