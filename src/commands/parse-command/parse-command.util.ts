import { USAGE_FROM, USAGE_TEMP, USAGE_TO } from "./parse-command.model";
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
      return { type: "error", message: USAGE_FROM };
    }
    return { type: "from", lang };
  }

  if (lower === "/from") {
    return { type: "error", message: USAGE_FROM };
  }

  if (lower.startsWith("/to ")) {
    const lang = trimmed.slice(4).trim();
    if (!lang) {
      return { type: "error", message: USAGE_TO };
    }
    return { type: "to", lang };
  }

  if (lower === "/to") {
    return { type: "error", message: USAGE_TO };
  }

  if (lower.startsWith("/model ")) {
    // Input is already trimmed, so a trailing "/model " with no argument
    // collapses to bare "/model" (the picker) below — the model is non-empty.
    const model = trimmed.slice(7).trim();
    return { type: "model", model };
  }

  // Bare `/model` (or "/model " with no argument) opens the interactive picker.
  if (lower === "/model") {
    return { type: "models" };
  }

  if (lower.startsWith("/temp ")) {
    const raw = trimmed.slice(6).trim();
    const temp = Number(raw);
    if (!raw || Number.isNaN(temp) || temp < 0 || temp > 2) {
      return { type: "error", message: USAGE_TEMP };
    }
    return { type: "temp", temp };
  }

  if (lower === "/temp") {
    return { type: "error", message: USAGE_TEMP };
  }

  if (trimmed.startsWith("/")) {
    return {
      type: "error",
      message: `Unknown command: ${trimmed.split(" ")[0]}`,
    };
  }

  return { type: "translate", text: trimmed };
}
