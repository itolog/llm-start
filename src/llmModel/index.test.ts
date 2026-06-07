import { describe, it, expect } from "vitest";
import { translationChain } from "./index.js";
import { Runnable } from "@langchain/core/runnables";

describe("LLM Chain", () => {
  it("should be an instance of Runnable", () => {
    expect(translationChain).toBeInstanceOf(Runnable);
  });
});
