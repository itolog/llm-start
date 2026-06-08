import { useState, useCallback, useEffect, useRef } from "react";
import { translationChain } from "../llmModel/index.js";
import { cleanText } from "../helpers/index.js";
import { Message, createMessage } from "../types/message.js";
import { parseCommand } from "../commands/parseCommand.js";
import { LLM_TIMEOUT_MS } from "../constants.js";
import { withRetry } from "../helpers/retry.js";

const WELCOME_MESSAGE: Message = createMessage(
  "Bot",
  "Hello! I am a TUI translator. Use /from <lang> and /to <lang> to change settings.",
);

export interface UseChatOptions {
  fromLang: string;
  toLang: string;
  setFromLang: (lang: string) => void;
  setToLang: (lang: string) => void;
}

export function useChat({
  fromLang,
  toLang,
  setFromLang,
  setToLang,
}: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const addMessage = useCallback((role: "You" | "Bot", text: string) => {
    setMessages((prev) => [...prev, createMessage(role, text)]);
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  const submit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const command = parseCommand(userText);

    setInput("");

    switch (command.type) {
      case "error":
        addMessage("Bot", command.message);
        break;
      case "from":
        setFromLang(command.lang);
        addMessage("Bot", `Source language changed to: ${command.lang}`);
        break;
      case "to":
        setToLang(command.lang);
        addMessage("Bot", `Target language changed to: ${command.lang}`);
        break;
      case "clear":
        clear();
        break;
      case "help":
        addMessage(
          "Bot",
          "Commands:\n/from <lang> — set source language\n/to <lang> — set target language\n/clear — clear history\n/help — show this help\n/exit (or /quit) — quit",
        );
        break;
      case "exit":
        process.exit(0);
        break;
      case "translate": {
        addMessage("You", userText);
        setIsLoading(true);
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const res = await withRetry(
            () => {
              const timeoutId = setTimeout(
                () => controller.abort(),
                LLM_TIMEOUT_MS,
              );
              return translationChain
                .invoke(
                  {
                    input_language: fromLang,
                    output_language: toLang,
                    input: userText,
                  },
                  { signal: controller.signal },
                )
                .finally(() => clearTimeout(timeoutId));
            },
            { retries: 1, delayMs: 1000 },
          );
          addMessage("Bot", cleanText(res.text));
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            addMessage("Bot", "Request cancelled");
          } else {
            addMessage(
              "Bot",
              `Error: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        } finally {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
        break;
      }
    }
  }, [
    input,
    isLoading,
    addMessage,
    clear,
    fromLang,
    toLang,
    setFromLang,
    setToLang,
  ]);

  return { messages, isLoading, input, setInput, submit, clear };
}
