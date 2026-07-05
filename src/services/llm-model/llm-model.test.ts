import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { config } from "@/config";

// Hoisted so the vi.mock factory below can close over it. Replacing the chain
// keeps the whole test off Ollama — the service constructor builds its chain
// from `prompt.pipe(llm)`, so stubbing `prompt.pipe` hands it our fake invoke.
const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }));

vi.mock("./llm-prompt", () => ({
  prompt: { pipe: () => ({ invoke: mockInvoke }) },
}));

import { llmModelService } from "./llm-model.service";

const abortError = () =>
  Object.assign(new Error("aborted"), { name: "AbortError" });

// A chain that never resolves on its own — it only rejects once the invoke's
// signal fires, mirroring how LangChain aborts an in-flight request.
const invokeRejectingOnAbort = () =>
  mockInvoke.mockImplementation(
    (_input, opts: { signal?: AbortSignal }) =>
      new Promise((_resolve, reject) => {
        const signal = opts.signal;
        if (signal?.aborted) return reject(abortError());
        signal?.addEventListener("abort", () => reject(abortError()), {
          once: true,
        });
      }),
  );

const params = {
  text: "hello",
  fromLang: "english",
  toLang: "polish",
};

beforeEach(() => {
  mockInvoke.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const stubFetch = (impl: () => Promise<unknown>) =>
  vi.stubGlobal("fetch", vi.fn(impl));

describe("llmModelService", () => {
  it("exposes translate and checkModelAvailable methods", () => {
    expect(typeof llmModelService.translate).toBe("function");
    expect(typeof llmModelService.checkModelAvailable).toBe("function");
  });

  it("resolves the cleaned translation and passes the prompt variables", async () => {
    mockInvoke.mockResolvedValue({ text: "  bonjour  " });

    await expect(llmModelService.translate(params)).resolves.toMatchObject({
      text: "bonjour",
    });
    expect(mockInvoke).toHaveBeenCalledWith(
      {
        input_language: "english",
        output_language: "polish",
        input: "hello",
      },
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("returns token usage stats from usage_metadata", async () => {
    mockInvoke.mockResolvedValue({
      text: "bonjour",
      usage_metadata: {
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
      },
    });

    const { stats } = await llmModelService.translate(params);

    expect(stats.promptTokens).toBe(10);
    expect(stats.completionTokens).toBe(20);
    expect(stats.totalTokens).toBe(30);
    expect(stats.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(stats.tokensPerSecond).toBeGreaterThanOrEqual(0);
  });

  it("falls back to Ollama response_metadata for token counts", async () => {
    mockInvoke.mockResolvedValue({
      text: "bonjour",
      response_metadata: { prompt_eval_count: 5, eval_count: 7 },
    });

    const { stats } = await llmModelService.translate(params);

    expect(stats.promptTokens).toBe(5);
    expect(stats.completionTokens).toBe(7);
    expect(stats.totalTokens).toBe(12);
  });

  it("defaults token counts to zero when no metadata is present", async () => {
    mockInvoke.mockResolvedValue({ text: "bonjour" });

    const { stats } = await llmModelService.translate(params);

    expect(stats.promptTokens).toBe(0);
    expect(stats.completionTokens).toBe(0);
    expect(stats.totalTokens).toBe(0);
    expect(stats.tokensPerSecond).toBe(0);
  });

  it("retries once on failure, then resolves", async () => {
    vi.useFakeTimers();
    mockInvoke
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ text: "bonjour" });

    const promise = llmModelService.translate(params);
    // withRetry waits delayMs (1000) between the two attempts.
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toMatchObject({ text: "bonjour" });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it("does not retry when the invoke fails with AbortError", async () => {
    mockInvoke.mockRejectedValue(abortError());

    await expect(llmModelService.translate(params)).rejects.toMatchObject({
      name: "AbortError",
    });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("aborts the in-flight request when the external signal fires", async () => {
    invokeRejectingOnAbort();
    const controller = new AbortController();

    const promise = llmModelService.translate({
      ...params,
      signal: controller.signal,
    });
    promise.catch(() => {}); // avoid an unhandled rejection before the assert
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it("aborts the request when the timeout elapses", async () => {
    vi.useFakeTimers();
    invokeRejectingOnAbort();

    const promise = llmModelService.translate(params);
    promise.catch(() => {});
    // LLM_TIMEOUT_MS is 60000; advancing past it trips the internal abort.
    await vi.advanceTimersByTimeAsync(60000);

    await expect(promise).rejects.toMatchObject({ name: "AbortError" });
  });

  describe("runtime reconfiguration", () => {
    it("setModel updates the active model and keeps translating", async () => {
      const original = config.MODEL;
      try {
        llmModelService.setModel("llama3");
        expect(config.MODEL).toBe("llama3");

        mockInvoke.mockResolvedValue({ text: "ok" });
        await expect(llmModelService.translate(params)).resolves.toMatchObject({
          text: "ok",
        });
      } finally {
        llmModelService.setModel(original);
      }
    });

    it("setTemperature updates the active temperature", () => {
      const original = config.LLM_TEMP;
      try {
        llmModelService.setTemperature(0.9);
        expect(config.LLM_TEMP).toBe(0.9);
      } finally {
        llmModelService.setTemperature(original);
      }
    });
  });

  describe("checkModelAvailable", () => {
    it("returns true when the configured model is listed", async () => {
      stubFetch(async () => ({
        ok: true,
        json: async () => ({
          models: [{ name: config.MODEL, model: config.MODEL }],
        }),
      }));

      await expect(llmModelService.checkModelAvailable()).resolves.toBe(true);
    });

    it("matches a model pulled with the implicit :latest tag", async () => {
      stubFetch(async () => ({
        ok: true,
        json: async () => ({
          models: [
            { name: `${config.MODEL}:latest`, model: `${config.MODEL}:latest` },
          ],
        }),
      }));

      await expect(llmModelService.checkModelAvailable()).resolves.toBe(true);
    });

    it("returns false when the configured model is absent", async () => {
      stubFetch(async () => ({
        ok: true,
        json: async () => ({
          models: [{ name: "other-model", model: "other-model" }],
        }),
      }));

      await expect(llmModelService.checkModelAvailable()).resolves.toBe(false);
    });

    it("returns false on a non-ok response", async () => {
      stubFetch(async () => ({ ok: false, json: async () => ({}) }));

      await expect(llmModelService.checkModelAvailable()).resolves.toBe(false);
    });

    it("returns false when the request throws", async () => {
      stubFetch(async () => {
        throw new Error("ECONNREFUSED");
      });

      await expect(llmModelService.checkModelAvailable()).resolves.toBe(false);
    });
  });
});
