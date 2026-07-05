import { Command } from "./parse-command.type";

export function parseCommand(input: string): Command {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "/help") {
    return { type: "help" };
  }

  if (lower === "/clear") {
    return { type: "clear" };
  }

  if (lower === "/exit" || lower === "/quit" || lower === "/q") {
    return { type: "exit" };
  }

  if (lower.startsWith("/from ")) {
    const lang = trimmed.slice(6).trim();
    if (!lang) {
      return {
        type: "error",
        message: "Usage: /from <language> — argument is empty.",
      };
    }
    return { type: "from", lang };
  }

  if (lower === "/from") {
    return {
      type: "error",
      message: "Usage: /from <language> — argument is empty.",
    };
  }

  if (lower.startsWith("/to ")) {
    const lang = trimmed.slice(4).trim();
    if (!lang) {
      return {
        type: "error",
        message: "Usage: /to <language> — argument is empty.",
      };
    }
    return { type: "to", lang };
  }

  if (lower === "/to") {
    return {
      type: "error",
      message: "Usage: /to <language> — argument is empty.",
    };
  }

  if (trimmed.startsWith("/")) {
    return {
      type: "error",
      message: `Unknown command: ${trimmed.split(" ")[0]}`,
    };
  }

  return { type: "translate", text: trimmed };
}
