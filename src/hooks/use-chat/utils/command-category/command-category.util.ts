import { match } from "ts-pattern";

import { Command } from "@/utils/parse-command";

import { CommandCategory } from "./command-category.type";

/** Classifies a parsed command by how it may interact with a running translation. */
export function getCommandCategory(command: Command): CommandCategory {
  // Exhaustive on purpose: a newly added command must be classified here
  // rather than silently defaulting to "pure".
  return (
    match<Command, CommandCategory>(command)
      .with({ type: "translate" }, () => "translate")
      .with({ type: "model" }, { type: "temp" }, () => "chain-affecting")
      // The pickers are pure — they only open a UI; the chain is rebuilt later,
      // when a selection is applied.
      .with(
        { type: "from" },
        { type: "to" },
        { type: "models" },
        { type: "tempPicker" },
        { type: "clear" },
        { type: "help" },
        { type: "exit" },
        { type: "error" },
        () => "pure",
      )
      .exhaustive()
  );
}
