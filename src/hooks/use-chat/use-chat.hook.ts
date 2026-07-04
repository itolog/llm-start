import { useCallback, useEffect, useRef, useState } from "react";

import { useApp } from "ink";
import { match } from "ts-pattern";

import { parseCommand } from "@/commands/parse-command";
import { config } from "@/config";
import { LLM_TIMEOUT_MS, MAX_MESSAGES } from "@/constants";
import { checkModelAvailable, translationChain } from "@/llm-model";
import { Message } from "@/types/message.type";
import { cleanText } from "@/utils/clean-text";
import { createMessage } from "@/utils/create-message";
import { withRetry } from "@/utils/with-retry";

import { UseChatOptions } from "./use-chat.type";

const WELCOME_MESSAGE: Message = createMessage(
  "Bot",
  [
    "Hello! I am a TUI translator.",
    "Commands: /from <lang>, /to <lang>, /clear, /help, /exit",
  ].join(" "),
);

export function useChat({
  fromLang,
  toLang,
  setFromLang,
  setToLang,
}: UseChatOptions) {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");

  const abortControllerRef = useRef<AbortController | null>(null);
  const modelAvailableRef = useRef<boolean | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const checkModel = async () => {
      const available = await checkModelAvailable();
      modelAvailableRef.current = available;
      if (!available) {
        setMessages([
          createMessage(
            "Bot",
            `Error: Model "${config.MODEL}" is not available. Please pull the model first using: ollama pull ${config.MODEL}`,
          ),
        ]);
      }
    };
    checkModel();
  }, []);

  const addMessage = useCallback((role: "You" | "Bot", text: string) => {
    setMessages((prev) => {
      const newMessages = [...prev, createMessage(role, text)];
      if (newMessages.length > MAX_MESSAGES) {
        return newMessages.slice(newMessages.length - MAX_MESSAGES);
      }
      return newMessages;
    });
  }, []);

  const clear = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  const submit = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    const command = parseCommand(userText);

    setInput("");

    await match(command)
      .with({ type: "error" }, ({ message }) => addMessage("Bot", message))
      .with({ type: "from" }, ({ lang }) => {
        setFromLang(lang);
        addMessage("Bot", `Source language changed to: ${lang}`);
      })
      .with({ type: "to" }, ({ lang }) => {
        setToLang(lang);
        addMessage("Bot", `Target language changed to: ${lang}`);
      })
      .with({ type: "clear" }, () => clear())
      .with({ type: "help" }, () =>
        addMessage(
          "Bot",
          "Commands:\n/from <lang> — set source language\n/to <lang> — set target language\n/clear — clear history\n/help — show this help\n/exit (or /quit) — quit",
        ),
      )
      .with({ type: "exit" }, () => exit())
      .with({ type: "translate" }, async ({ text }) => {
        if (modelAvailableRef.current === false) {
          addMessage(
            "Bot",
            `Model "${config.MODEL}" is not available. Please pull it first: ollama pull ${config.MODEL}`,
          );
          return;
        }
        addMessage("You", text);
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
                    input: text,
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
            const message =
              error instanceof Error ? error.message : String(error);
            addMessage("Bot", `Error: ${message}`);
          }
        } finally {
          setIsLoading(false);
          abortControllerRef.current = null;
        }
      })
      .exhaustive();
  }, [
    input,
    isLoading,
    addMessage,
    clear,
    exit,
    fromLang,
    toLang,
    setFromLang,
    setToLang,
  ]);

  return { messages, isLoading, input, setInput, submit, clear };
}
