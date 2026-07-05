import { describe, expect, it } from "vitest";

import { buildStats } from "./build-stats.util";

describe("buildStats", () => {
  it("reads token counts from usage_metadata", () => {
    const stats = buildStats(
      {
        text: "bonjour",
        usage_metadata: {
          input_tokens: 10,
          output_tokens: 20,
          total_tokens: 30,
        },
      },
      2000,
    );

    expect(stats).toEqual({
      elapsedMs: 2000,
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
      tokensPerSecond: 10, // 20 completion / 2s
    });
  });

  it("falls back to Ollama response_metadata eval counts", () => {
    const stats = buildStats(
      {
        text: "bonjour",
        response_metadata: { prompt_eval_count: 5, eval_count: 7 },
      },
      1000,
    );

    expect(stats.promptTokens).toBe(5);
    expect(stats.completionTokens).toBe(7);
    expect(stats.totalTokens).toBe(12); // derived when total is absent
    expect(stats.tokensPerSecond).toBe(7);
  });

  it("defaults counts to zero and avoids dividing by zero elapsed", () => {
    const stats = buildStats({ text: "" }, 0);

    expect(stats).toEqual({
      elapsedMs: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      tokensPerSecond: 0,
    });
  });
});
