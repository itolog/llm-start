import { RefObject } from "react";

import { Message } from "@/types/message.type";

export interface UseTranslationOptions {
  fromLang: string;
  toLang: string;
  // Set by useModel's startup/verify flow; `false` blocks translation because
  // the active model is not pulled in Ollama.
  modelAvailableRef: RefObject<boolean | null>;
  addMessage: (role: "You" | "Bot", text: string) => void;
  appendMessage: (message: Message) => void;
  updateMessage: (id: string, text: string) => void;
}
