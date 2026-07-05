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
  // Non-null while the model picker is open (holds the installed model tags).
  const [modelItems, setModelItems] = useState<string[] | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const modelAvailableRef = useRef<boolean | null>(null);

  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => {
      const newMessages = [...prev, message];
      if (newMessages.length > appConfig.MAX_MESSAGES) {
        return newMessages.slice(newMessages.length - appConfig.MAX_MESSAGES);
      }
      return newMessages;
    });
  }, []);

  const addMessage = useCallback(
    (role: "You" | "Bot", text: string) => {
      appendMessage(createMessage(role, text));
    },
    [appendMessage],
  );

  // Replaces the text of an existing message (by id) — used to fill the bot
  // message in as streamed tokens arrive.
  const updateMessage = useCallback((id: string, text: string) => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === id ? { ...message, text } : message,
      ),
    );
  }, []);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Re-check the active model after a manual /model switch (it may not be
  // pulled) and warn if it is missing.
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

  // Startup: adapt to whatever Ollama has installed instead of trusting the
  // configured default blindly (it may not be pulled on this machine).
  const initModel = useCallback(async () => {
    const result = await llmModelService.resolveStartupModel();

    if (result.status === "no-models") {
      modelAvailableRef.current = false;
      addMessage(
        "Bot",
        "No models are installed. Pull one first, e.g.: ollama pull gemma3:4b",
      );
      return;
    }

    if (result.status === "fallback") {
      const wanted = config.MODEL;
      llmModelService.setModel(result.model);
      setModel(result.model);
      addMessage(
        "Bot",
        `Model "${wanted}" is not installed — switched to "${result.model}". Use /model to pick another.`,
      );
    }

    modelAvailableRef.current = true;
  }, [addMessage, setModel]);

  useEffect(() => {
    initModel();
  }, [initModel]);

  const clear = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  // Switches the active model (shared by `/model <name>` and the picker).
  const applyModel = useCallback(
    async (model: string) => {
      llmModelService.setModel(model);
      setModel(model);
      addMessage("Bot", `Model changed to: ${model}`);
      await verifyModel();
    },
    [setModel, addMessage, verifyModel],
  );

  // Picker selection: close it, then apply the chosen model.
  const selectModel = useCallback(
    async (model: string) => {
      setModelItems(null);
      await applyModel(model);
    },
    [applyModel],
  );

  const cancelModelPicker = useCallback(() => setModelItems(null), []);

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
    [addMessage, appendMessage, updateMessage, fromLang, toLang],
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
      .with({ type: "model" }, ({ model }) => applyModel(model))
      .with({ type: "models" }, async () => {
        const items = await llmModelService.listModels();
        if (items.length === 0) {
          addMessage(
            "Bot",
            "No models found. Pull one first: ollama pull <name>",
          );
          return;
        }
        setModelItems(items);
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
    applyModel,
    setFromLang,
    setToLang,
    setTemp,
  ]);

  return {
    messages,
    isLoading,
    input,
    setInput,
    submit,
    clear,
    stats,
    modelItems,
    selectModel,
    cancelModelPicker,
  };
}
