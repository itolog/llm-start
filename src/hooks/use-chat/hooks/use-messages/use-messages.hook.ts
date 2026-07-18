import { useCallback, useState } from "react";

import { appConfig } from "@/config";
import { Message } from "@/types/message.type";
import { createMessage } from "@/utils/create-message";

import { WELCOME_MESSAGE } from "./use-messages.model";

// Owns the chat transcript and its mutations: append (with history cap), the
// role/text convenience wrapper, in-place update (for streaming), and reset.
export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);

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

  const clear = useCallback(() => {
    setMessages([WELCOME_MESSAGE]);
  }, []);

  return { messages, appendMessage, addMessage, updateMessage, clear };
}
