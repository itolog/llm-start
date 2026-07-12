import { CommandHelp } from "@/components/commands-help";

export interface CommandSuggestionsProps {
  suggestions: CommandHelp[];
  selectedIndex: number;
}
