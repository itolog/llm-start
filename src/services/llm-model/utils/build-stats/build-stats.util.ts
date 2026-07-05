import { ChainResponse, TranslationStats } from "../../llm-model.type";

// Derives the stats-bar metrics from a chain response and the measured elapsed
// time, preferring LangChain's usage_metadata and falling back to Ollama's raw
// eval counts.
export function buildStats(
  res: ChainResponse,
  elapsedMs: number,
): TranslationStats {
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
