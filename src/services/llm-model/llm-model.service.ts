import { Runnable } from "@langchain/core/runnables";
import { ChatOllama } from "@langchain/ollama";

import { appConfig, defaultModelConfig } from "@/config";
import { cleanText } from "@/utils/clean-text";
import { withRetry } from "@/utils/with-retry";

import {
  ChainChunk,
  ChainResponse,
  OllamaTag,
  StartupModel,
  TranslateParams,
  TranslationResult,
} from "./llm-model.type";
import { prompt } from "./llm-prompt";
import { buildStats } from "./utils/build-stats";
import { modelMatches } from "./utils/model-matches";

// Stateful wrapper around Ollama: the single source of truth for the active
// model + temperature (seeded from the defaults), owns the chat model +
// translation chain, and encapsulates the request orchestration (timeout,
// abort, retry, cleanup). React reads the active values via `subscribe` +
// `getModel`/`getTemperature` (useSyncExternalStore), so there is no duplicate
// copy of them in component state.
class LlmModelService {
  private llm!: ChatOllama;
  private chain!: Runnable;
  private model = defaultModelConfig.MODEL;
  private temperature = defaultModelConfig.LLM_TEMP;
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.rebuild();
  }

  // (Re)builds the chat model and translation chain from the active model +
  // temperature. Called on construction and whenever they change at runtime.
  private rebuild(): void {
    this.llm = new ChatOllama({
      model: this.model,
      temperature: this.temperature,
    });
    this.chain = prompt.pipe(this.llm);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  // External-store contract for React's useSyncExternalStore. Arrow fields so
  // the identities stay stable across renders.
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getModel = (): string => this.model;

  getTemperature = (): number => this.temperature;

  // Switches the active model (e.g. the /model command). Callers should re-run
  // checkModelAvailable() afterwards — the new model may not be pulled.
  setModel(model: string): void {
    this.model = model;
    this.rebuild();
    this.notify();
  }

  // Updates the sampling temperature (e.g. the /temp command).
  setTemperature(temperature: number): void {
    this.temperature = temperature;
    this.rebuild();
    this.notify();
  }

  // Translates `text`, streaming partial output through `onToken` and returning
  // the cleaned translation plus per-request stats (elapsed time, token usage,
  // tok/s). Retries once on failure; the request is aborted on timeout or when
  // `signal` fires. A mid-stream retry re-streams from scratch — `onToken`
  // replaces the partial text, so the display resets rather than duplicating.
  async translate({
    text,
    fromLang,
    toLang,
    signal,
    onToken,
  }: TranslateParams): Promise<TranslationResult> {
    const startedAt = Date.now();
    const res: ChainResponse = await withRetry(
      async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          appConfig.LLM_TIMEOUT_MS,
        );
        // Propagate the external signal (unmount / new submit) to close the
        // HTTP connection to Ollama, same as the timeout does.
        const onAbort = () => controller.abort();
        if (signal) {
          if (signal.aborted) controller.abort();
          else signal.addEventListener("abort", onAbort, { once: true });
        }
        try {
          const stream = await this.chain.stream(
            {
              input_language: fromLang,
              output_language: toLang,
              input: text,
            },
            { signal: controller.signal },
          );
          // Concatenate chunks so the aggregate carries the final token-usage
          // metadata (Ollama emits eval counts on the last chunk).
          let aggregate: ChainChunk | undefined;
          for await (const chunk of stream as AsyncIterable<ChainChunk>) {
            aggregate =
              aggregate === undefined ? chunk : aggregate.concat(chunk);
            onToken?.(cleanText(aggregate.text));
          }
          if (aggregate === undefined) {
            throw new Error("Ollama returned an empty stream");
          }
          return aggregate;
        } finally {
          clearTimeout(timeoutId);
          signal?.removeEventListener("abort", onAbort);
        }
      },
      { retries: 1, delayMs: 1000 },
    );
    const elapsedMs = Date.now() - startedAt;
    return { text: cleanText(res.text), stats: buildStats(res, elapsedMs) };
  }

  // Fetches Ollama's /api/tags listing (installed models) — no inference, fast.
  // Returns [] on any failure so callers can treat "unreachable" as "empty".
  private async fetchTags(): Promise<OllamaTag[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      appConfig.MODEL_CHECK_TIMEOUT_MS,
    );
    try {
      const res = await fetch(`${appConfig.OLLAMA_BASE_URL}/api/tags`, {
        signal: controller.signal,
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: OllamaTag[] };
      return data.models ?? [];
    } catch {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Checks the active model exists in the /api/tags listing.
  async checkModelAvailable(): Promise<boolean> {
    const tags = await this.fetchTags();
    return tags.some(
      (m) =>
        modelMatches(this.model, m.name) || modelMatches(this.model, m.model),
    );
  }

  // Lists the installed model tags (e.g. "gemma3:4b") for the model picker.
  async listModels(): Promise<string[]> {
    const tags = await this.fetchTags();
    return tags.map((m) => m.name);
  }

  // Resolves which model to use at startup from what Ollama has installed:
  // preferred model present → "ok"; nothing installed → "no-models"; preferred
  // model missing but others exist → "fallback" to the first installed one.
  async resolveStartupModel(): Promise<StartupModel> {
    const tags = await this.fetchTags();
    if (tags.length === 0) return { status: "no-models" };

    const available = tags.some(
      (m) =>
        modelMatches(this.model, m.name) || modelMatches(this.model, m.model),
    );
    if (available) return { status: "ok" };

    return { status: "fallback", model: tags[0].name };
  }
}

export const llmModelService = new LlmModelService();
