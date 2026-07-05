import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
});

describe("llmModelService", () => {
  it("exposes translate and checkModelAvailable methods", () => {
    expect(typeof llmModelService.translate).toBe("function");
    expect(typeof llmModelService.checkModelAvailable).toBe("function");
  });

  it("resolves the cleaned translation and passes the prompt variables", async () => {
    mockInvoke.mockResolvedValue({ text: "  bonjour  " });

    await expect(llmModelService.translate(params)).resolves.toBe("bonjour");
    expect(mockInvoke).toHaveBeenCalledWith(
      {
        input_language: "english",
        output_language: "polish",
        input: "hello",
      },
      expect.objectContaining({ signal: expect.anything() }),
    );
  });

  it("retries once on failure, then resolves", async () => {
    vi.useFakeTimers();
    mockInvoke
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ text: "bonjour" });

    const promise = llmModelService.translate(params);
    // withRetry waits delayMs (1000) between the two attempts.
    await vi.advanceTimersByTimeAsync(1000);

    await expect(promise).resolves.toBe("bonjour");
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
});
