import { Runnable } from "@langchain/core/runnables";
import { ChatOllama } from "@langchain/ollama";

import { config } from "@/config";
import {
  LLM_TIMEOUT_MS,
  MODEL_CHECK_TIMEOUT_MS,
  OLLAMA_BASE_URL,
} from "@/constants";
import { cleanText } from "@/utils/clean-text";
import { withRetry } from "@/utils/with-retry";

import { OllamaTag, TranslateParams } from "./llm-model.type";
import { prompt } from "./llm-prompt";

// Add the implicit ":latest" tag Ollama applies when a model is pulled without one.
function modelMatches(configured: string, tag: string): boolean {
  return (
    tag === configured ||
    tag === `${configured}:latest` ||
    `${tag}:latest` === configured
  );
}

// Stateful wrapper around Ollama: owns the chat model + translation chain and
// encapsulates the request orchestration (timeout, abort, retry, cleanup).
class LlmModelService {
  private llm!: ChatOllama;
  private chain!: Runnable;

  constructor() {
    this.rebuild();
  }

  // (Re)builds the chat model and translation chain from the current config.
  // Called on construction and whenever MODEL/LLM_TEMP change at runtime.
  private rebuild(): void {
    this.llm = new ChatOllama({
      model: config.MODEL,
      temperature: config.LLM_TEMP,
    });
    this.chain = prompt.pipe(this.llm);
  }

  // Switches the active model (e.g. the /model command). Callers should re-run
  // checkModelAvailable() afterwards — the new model may not be pulled.
  setModel(model: string): void {
    config.MODEL = model;
    this.rebuild();
  }

  // Updates the sampling temperature (e.g. the /temp command).
  setTemperature(temperature: number): void {
    config.LLM_TEMP = temperature;
    this.rebuild();
  }

  // Translates `text`, returning the cleaned translation. Retries once on
  // failure; the request is aborted on timeout or when `signal` fires.
  async translate({
    text,
    fromLang,
    toLang,
    signal,
  }: TranslateParams): Promise<string> {
    const res = await withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
        // Propagate the external signal (unmount / new submit) to close the
        // HTTP connection to Ollama, same as the timeout does.
        const onAbort = () => controller.abort();
        if (signal) {
          if (signal.aborted) controller.abort();
          else signal.addEventListener("abort", onAbort, { once: true });
        }
        try {
          return await this.chain.invoke(
            {
              input_language: fromLang,
              output_language: toLang,
              input: text,
            },
            { signal: controller.signal },
          );
        } finally {
          clearTimeout(timeoutId);
          signal?.removeEventListener("abort", onAbort);
        }
      },
      { retries: 1, delayMs: 1000 },
    );
    return cleanText(res.text);
  }

  // Checks the model exists via Ollama's /api/tags listing — no inference, fast.
  async checkModelAvailable(): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      MODEL_CHECK_TIMEOUT_MS,
    );
    try {
      const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
        signal: controller.signal,
      });
      if (!res.ok) return false;
      const data = (await res.json()) as { models?: OllamaTag[] };
      return (data.models ?? []).some(
        (m) =>
          modelMatches(config.MODEL, m.name) ||
          modelMatches(config.MODEL, m.model),
      );
    } catch {
      return false;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const llmModelService = new LlmModelService();
