export interface OllamaTag {
  name: string;
  model: string;
}

export interface TranslateParams {
  text: string;
  fromLang: string;
  toLang: string;
  // External signal (component lifecycle / user cancel); combined with the
  // internal request timeout inside the service.
  signal?: AbortSignal;
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
