import { describe, it, expect, vi } from "vitest";
import { withRetry } from "./retry.js";

describe("withRetry", () => {
  it("should return result on success first try", async () => {
    const fn = vi.fn().mockResolvedValue("success");
    const res = await withRetry(fn);
    expect(res).toBe("success");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should retry on failure and then succeed", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockResolvedValueOnce("success");
    const res = await withRetry(fn, { retries: 1, delayMs: 0 });
    expect(res).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should throw after exhausted retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("permanent fail"));
    await expect(withRetry(fn, { retries: 1, delayMs: 0 })).rejects.toThrow(
      "permanent fail",
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("should not retry AbortError", async () => {
    const abortError = Object.assign(new Error("aborted"), {
      name: "AbortError",
    });
    const fn = vi.fn().mockRejectedValue(abortError);
    await expect(withRetry(fn, { retries: 2, delayMs: 0 })).rejects.toThrow(
      "aborted",
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
