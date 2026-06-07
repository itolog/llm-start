import { useState, useCallback } from "react";
import { translationChain } from "../llmModel/index.js";
import { cleanText } from "../helpers/index.js";
import { Message, createMessage } from "../types/message.js";
import { parseCommand } from "../commands/parseCommand.js";

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
      case "translate":
        addMessage("You", userText);
        setIsLoading(true);
        try {
          const res = await translationChain.invoke({
            input_language: fromLang,
            output_language: toLang,
            input: userText,
          });
          addMessage("Bot", cleanText(res.text));
        } catch (error) {
          addMessage(
            "Bot",
            `Error: ${error instanceof Error ? error.message : String(error)}`,
          );
        } finally {
          setIsLoading(false);
        }
        break;
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
