import { useCallback, useEffect, useRef, useState } from "react";

import { useApp } from "ink";
import { match } from "ts-pattern";

import { parseCommand } from "@/commands/parse-command";
import { appConfig, config } from "@/config";
import { llmModelService, TranslationStats } from "@/services/llm-model";
import { Message } from "@/types/message.type";
import { createMessage } from "@/utils/create-message";

import { HELP_MESSAGE, WELCOME_MESSAGE } from "./use-chat.model";
import { UseChatOptions } from "./use-chat.type";

export function useChat({
  fromLang,
  toLang,
  setFromLang,
  setToLang,
  setModel,
  setTemp,
}: UseChatOptions) {
  const { exit } = useApp();
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<TranslationStats | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const modelAvailableRef = useRef<boolean | null>(null);

  const addMessage = useCallback((role: "You" | "Bot", text: string) => {
    setMessages((prev) => {
      const newMessages = [...prev, createMessage(role, text)];
      if (newMessages.length > appConfig.MAX_MESSAGES) {
        return newMessages.slice(newMessages.length - appConfig.MAX_MESSAGES);
      }
      return newMessages;
    });
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const verifyModel = useCallback(async () => {
    const available = await llmModelService.checkModelAvailable();
    modelAvailableRef.current = available;
    if (!available) {
      addMessage(
        "Bot",
        `Error: Model "${config.MODEL}" is not available. Please pull the model first using: ollama pull ${config.MODEL}`,
      );
    }
  }, [addMessage]);

  useEffect(() => {
    verifyModel();
  }, [verifyModel]);

  const clear = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  const handleTranslate = useCallback(
    async (text: string) => {
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
        const { text: translation, stats: translationStats } =
          await llmModelService.translate({
            text,
            fromLang,
            toLang,
            signal: controller.signal,
          });
        addMessage("Bot", translation);
        setStats(translationStats);
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
    },
    [addMessage, fromLang, toLang],
  );

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
      .with({ type: "model" }, async ({ model }) => {
        llmModelService.setModel(model);
        setModel(model);
        addMessage("Bot", `Model changed to: ${model}`);
        await verifyModel();
      })
      .with({ type: "temp" }, ({ temp }) => {
        llmModelService.setTemperature(temp);
        setTemp(temp);
        addMessage("Bot", `Temperature changed to: ${temp}`);
      })
      .with({ type: "clear" }, clear)
      .with({ type: "help" }, () => addMessage("Bot", HELP_MESSAGE))
      .with({ type: "exit" }, () => exit())
      .with({ type: "translate" }, ({ text }) => handleTranslate(text))
      .exhaustive();
  }, [
    input,
    isLoading,
    addMessage,
    clear,
    exit,
    handleTranslate,
    setFromLang,
    setToLang,
    setModel,
    setTemp,
    verifyModel,
  ]);

  return { messages, isLoading, input, setInput, submit, clear, stats };
}
