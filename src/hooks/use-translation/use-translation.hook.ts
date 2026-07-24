import { useCallback, useEffect, useRef, useState } from "react";

import { llmModelService, TranslationStats } from "@/services/llm-model";
import { createMessage } from "@/utils/create-message";

import { UseTranslationOptions } from "./use-translation.type";

// Owns the per-request translation flow: loading state, latest stats, and the
// per-submit AbortController (aborted on unmount and superseded by each new
// submit). The service handles timeout/retry/cleaning; this hook only wires
// the streamed tokens into the transcript.
export function useTranslation({
  fromLang,
  toLang,
  modelAvailableRef,
  addMessage,
  appendMessage,
  updateMessage,
}: UseTranslationOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<TranslationStats | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleTranslate = useCallback(
    async (text: string) => {
      if (modelAvailableRef.current === false) {
        const active = llmModelService.getModel();
        addMessage(
          "Bot",
          `Model "${active}" is not available. Please pull it first: ollama pull ${active}`,
        );
        return;
      }
      addMessage("You", text);
      setIsLoading(true);
      // Drop the previous request's stats up front so a failed/cancelled
      // translation doesn't leave the StatsBar showing numbers for it — they
      // are only restored below on success.
      setStats(null);
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Empty bot message created up front; streamed tokens fill it in live.
      const botMessage = createMessage("Bot", "");
      appendMessage(botMessage);

      try {
        const { text: translation, stats: translationStats } =
          await llmModelService.translate({
            text,
            fromLang,
            toLang,
            signal: controller.signal,
            onToken: (partial) => updateMessage(botMessage.id, partial),
          });
        // Fall back to a placeholder so an empty result doesn't leave the card
        // stuck on the spinner (empty bot text renders the loading indicator).
        updateMessage(botMessage.id, translation || "(no translation)");
        setStats(translationStats);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          updateMessage(botMessage.id, "Request cancelled");
        } else {
          const message =
            error instanceof Error ? error.message : String(error);
          updateMessage(botMessage.id, `Error: ${message}`);
        }
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [
      addMessage,
      appendMessage,
      updateMessage,
      fromLang,
      toLang,
      modelAvailableRef,
    ],
  );

  const resetStats = useCallback(() => setStats(null), []);

  // User-triggered stop (Esc). No-op when idle — the ref is cleared in the
  // `finally` above. The aborted request's own `catch` writes "Request
  // cancelled" onto its card and clears `isLoading`, so there is nothing to
  // unwind here.
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return { isLoading, stats, handleTranslate, resetStats, cancel };
}
