import { Message } from "@/types/message.type";
import { createMessage } from "@/utils/create-message";

export const WELCOME_MESSAGE: Message = createMessage(
  "Bot",
  [
    "Hello! I am a TUI translator.",
    "Commands: /from <lang>, /to <lang>, /model [name], /temp <0-2>, /clear, /help, /exit",
  ].join(" "),
);

export const HELP_MESSAGE = [
  "Commands:",
  "/from <lang> — set source language",
  "/to <lang> — set target language",
  "/model [name] — switch model, or omit the name to pick from a list",
  "/temp <0-2> — set the sampling temperature",
  "/clear — clear history",
  "/help — show this help",
  "/exit (or /quit, /q) — quit",
].join("\n");
