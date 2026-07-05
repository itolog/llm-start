export interface CommandHelp {
  usage: string;
  description: string;
}

export const COMMANDS: CommandHelp[] = [
  { usage: "/from <lang>", description: "Set the source language" },
  { usage: "/to <lang>", description: "Set the target language" },
  {
    usage: "/model [name]",
    description: "Switch model — omit the name to pick from a list",
  },
  {
    usage: "/temp [0-2]",
    description:
      "Set the temperature — omit the value to adjust with a stepper",
  },
  { usage: "/clear", description: "Clear the chat history" },
  { usage: "/help", description: "Show this help" },
  { usage: "/exit", description: "Quit (also /quit, /q)" },
];
