import { Runnable } from "@langchain/core/runnables";
import { ChatOllama } from "@langchain/ollama";

import { appConfig, config } from "@/config";
import { cleanText } from "@/utils/clean-text";
import { withRetry } from "@/utils/with-retry";

import {
  OllamaTag,
  TranslateParams,
  TranslationResult,
  TranslationStats,
} from "./llm-model.type";
import { prompt } from "./llm-prompt";

// Add the implicit ":latest" tag Ollama applies when a model is pulled without one.
function modelMatches(configured: string, tag: string): boolean {
  return (
    tag === configured ||
    tag === `${configured}:latest` ||
    `${tag}:latest` === configured
  );
}

// Shape of the chain response we read: `.text` plus token metadata. LangChain
// surfaces standardized `usage_metadata`; Ollama's raw counts live under
// `response_metadata` (eval_count / prompt_eval_count) as a fallback.
interface ChainResponse {
  text: string;
  usage_metadata?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  response_metadata?: {
    prompt_eval_count?: number;
    eval_count?: number;
  };
}

// A streamed message chunk: a ChainResponse that also aggregates with the next
// chunk via `.concat` (AIMessageChunk's contract).
type ChainChunk = ChainResponse & {
  concat(next: ChainChunk): ChainChunk;
};

// Derives the stats-bar metrics from a chain response and the measured elapsed
// time, preferring LangChain's usage_metadata and falling back to Ollama's raw
// eval counts.
function buildStats(res: ChainResponse, elapsedMs: number): TranslationStats {
  const usage = res.usage_metadata;
  const meta = res.response_metadata;
  const promptTokens = usage?.input_tokens ?? meta?.prompt_eval_count ?? 0;
  const completionTokens = usage?.output_tokens ?? meta?.eval_count ?? 0;
  const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
  const elapsedSeconds = elapsedMs / 1000;
  const tokensPerSecond =
    elapsedSeconds > 0 ? completionTokens / elapsedSeconds : 0;

  return {
    elapsedMs,
    promptTokens,
    completionTokens,
    totalTokens,
    tokensPerSecond,
  };
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

  // Checks the configured model exists in the /api/tags listing.
  async checkModelAvailable(): Promise<boolean> {
    const tags = await this.fetchTags();
    return tags.some(
      (m) =>
        modelMatches(config.MODEL, m.name) ||
        modelMatches(config.MODEL, m.model),
    );
  }

  // Lists the installed model tags (e.g. "gemma3:4b") for the model picker.
  async listModels(): Promise<string[]> {
    const tags = await this.fetchTags();
    return tags.map((m) => m.name);
  }
}

export const llmModelService = new LlmModelService();
