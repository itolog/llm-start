import { Message } from "@/types/message.type";
import { createMessage } from "@/utils/create-message";

// Greeting + the commands table (rendered by CommandsHelp via kind "commands").
export const WELCOME_MESSAGE: Message = createMessage(
  "Bot",
  "Hello! I am a TUI translator — type text to translate.",
  "commands",
);
