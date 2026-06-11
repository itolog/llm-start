import { RetryOptions } from "./with-retry.type";

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { retries: 1, delayMs: 1000 },
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= options.retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") throw error;
      lastError = error;
      if (i < options.retries) {
        await new Promise((resolve) => setTimeout(resolve, options.delayMs));
      }
    }
  }
  throw lastError;
}
