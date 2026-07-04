import { ChatOllama } from "@langchain/ollama";
import { config } from "@/config";
import { prompt } from "./llm-prompt";
import { MODEL_CHECK_TIMEOUT_MS, OLLAMA_BASE_URL } from "@/constants";
import { OllamaTag } from "./llm-model.type";

export const llm = new ChatOllama({
  model: config.MODEL,
  temperature: config.LLM_TEMP,
});

export const translationChain = prompt.pipe(llm);

// Add the implicit ":latest" tag Ollama applies when a model is pulled without one.
function modelMatches(configured: string, tag: string): boolean {
  return (
    tag === configured ||
    tag === `${configured}:latest` ||
    `${tag}:latest` === configured
  );
}

// Checks the model exists via Ollama's /api/tags listing — no inference, fast.
export async function checkModelAvailable() {
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
