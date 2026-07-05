export interface OllamaTag {
  name: string;
  model: string;
}

// Outcome of resolving which model to use at startup, based on what Ollama has
// installed: the preferred model is present ("ok"), nothing is installed
// ("no-models"), or the preferred model is missing so we fall back to another.
export type StartupModel =
  | { status: "ok" }
  | { status: "no-models" }
  | { status: "fallback"; model: string };

export interface TranslateParams {
  text: string;
  fromLang: string;
  toLang: string;
  // External signal (component lifecycle / user cancel); combined with the
  // internal request timeout inside the service.
  signal?: AbortSignal;
  // Streamed progress: called with the cleaned text accumulated so far on each
  // token, so the caller can render the translation as it fills in. The value
  // replaces (not appends) the previous partial, so a mid-stream retry that
  // re-streams from scratch resets the displayed text cleanly.
  onToken?: (partial: string) => void;
}

// Per-translation metrics surfaced to the stats bar (C6).
export interface TranslationStats {
  // Wall-clock duration of the request (submit → completion), in milliseconds.
  elapsedMs: number;
  // Prompt (input) tokens spent on the request.
  promptTokens: number;
  // Completion (output) tokens generated.
  completionTokens: number;
  // prompt + completion tokens.
  totalTokens: number;
  // Generation throughput: completionTokens / elapsedSeconds.
  tokensPerSecond: number;
}

export interface TranslationResult {
  text: string;
  stats: TranslationStats;
}

// Shape of the chain response we read: `.text` plus token metadata. LangChain
// surfaces standardized `usage_metadata`; Ollama's raw counts live under
// `response_metadata` (eval_count / prompt_eval_count) as a fallback.
export interface ChainResponse {
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
export type ChainChunk = ChainResponse & {
  concat(next: ChainChunk): ChainChunk;
};
