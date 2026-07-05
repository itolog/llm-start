export type Message = {
  role: "You" | "Bot";
  text: string;
  id: string;
  // Creation time (epoch ms) — rendered as HH:MM in the card title.
  createdAt: number;
  // Special render variant: "commands" appends the CommandsHelp table to the
  // card (used by the welcome message and /help). Plain text when omitted.
  kind?: "commands";
};
