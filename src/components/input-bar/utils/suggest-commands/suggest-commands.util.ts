import { CommandHelp, COMMANDS } from "@/components/commands-help";

/**
 * Returns the commands whose name starts with the typed `/`-prefix
 * (case-insensitive). Empty when the input isn't a command token: no leading
 * slash, or a space is already present (argument stage — the command itself
 * is complete, nothing left to autocomplete).
 */
export function suggestCommands(input: string): CommandHelp[] {
  if (!input.startsWith("/") || input.includes(" ")) {
    return [];
  }

  const prefix = input.toLowerCase();
  return COMMANDS.filter(({ name }) => name.startsWith(prefix));
}
