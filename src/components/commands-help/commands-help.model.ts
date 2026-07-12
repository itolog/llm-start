export interface CommandHelp {
  /** Canonical command token (e.g. "/model") — the part autocomplete matches on. */
  name: string;
  usage: string;
  description: string;
}

export const COMMANDS: CommandHelp[] = [
  {
    name: "/from",
    usage: "/from <lang>",
    description: "Set the source language",
  },
  { name: "/to", usage: "/to <lang>", description: "Set the target language" },
  {
    name: "/model",
    usage: "/model [name]",
    description: "Switch model — omit the name to pick from a list",
  },
  {
    name: "/temp",
    usage: "/temp [0-2]",
    description:
      "Set the temperature — omit the value to adjust with a stepper",
  },
  { name: "/clear", usage: "/clear", description: "Clear the chat history" },
  { name: "/help", usage: "/help", description: "Show this help" },
  { name: "/exit", usage: "/exit", description: "Quit (also /quit, /q)" },
];
