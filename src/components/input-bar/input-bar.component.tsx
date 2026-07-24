import React, { useState } from "react";

import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { match } from "ts-pattern";

import { CommandSuggestions } from "@/components/command-suggestions";

import { InputBarProps } from "./input-bar.type";
import { suggestCommands } from "./utils/suggest-commands";

export const InputBar = ({
  value,
  onChange,
  onSubmit,
  isLoading,
  onCancel,
}: InputBarProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Esc hides the dropdown until the input changes again; without this flag
  // the suggestions (derived from `value`) would reappear on the next render.
  const [dismissed, setDismissed] = useState(false);
  // TextInput owns its cursor position and only sets it to the end of `value`
  // on mount — an external value replacement (completion) leaves the cursor
  // where the user last typed. Bumping this key remounts TextInput so the
  // cursor lands after the completed command.
  const [completionId, setCompletionId] = useState(0);

  const suggestions = dismissed ? [] : suggestCommands(value);
  const isOpen = suggestions.length > 0;

  const complete = () => {
    // Trailing space moves the user straight to the argument stage; for
    // argument-less commands parseCommand trims it away, and bare `/model` /
    // `/temp ` still open their pickers.
    onChange(`${suggestions[selectedIndex].name} `);
    setSelectedIndex(0);
    setCompletionId((id) => id + 1);
  };

  const handleChange = (next: string) => {
    setDismissed(false);
    setSelectedIndex(0);
    onChange(next);
  };

  // TextInput ignores ↑/↓/Tab, so intercepting them here can't fight its own
  // key handling; Enter goes through TextInput's onSubmit (handleSubmit below).
  useInput(
    (_input, key) => {
      match(key)
        .with({ upArrow: true }, () => {
          setSelectedIndex(
            (i) => (i - 1 + suggestions.length) % suggestions.length,
          );
        })
        .with({ downArrow: true }, () => {
          setSelectedIndex((i) => (i + 1) % suggestions.length);
        })
        .with({ tab: true }, complete)
        .with({ escape: true }, () => setDismissed(true))
        .otherwise(() => {});
    },
    { isActive: isOpen },
  );

  // ! Esc is contended. The two handlers are mutually exclusive by `isActive`
  // (`isOpen` vs `!isOpen`), so exactly one reacts per keypress: with the
  // dropdown open Esc dismisses it, otherwise it stops a running translation.
  // Pickers can't collide — App mounts only one of InputBar / ModelPicker /
  // TempPicker at a time.
  useInput(
    (_input, key) => {
      if (key.escape) {
        onCancel();
      }
    },
    { isActive: isLoading && !isOpen },
  );

  const handleSubmit = () => {
    if (isOpen) {
      complete();
    } else {
      onSubmit();
    }
  };

  // The dropdown renders ABOVE the prompt (opencode / Claude Code style): the
  // prompt is the last child, and App pins the whole frame to the bottom edge
  // (`minHeight={rows}` + `justifyContent="flex-end"`), so opening/closing the
  // list grows and shrinks the space *above* the prompt while the prompt itself
  // stays put at the bottom.
  return (
    <Box flexDirection="column">
      {isOpen ? (
        <CommandSuggestions
          suggestions={suggestions}
          selectedIndex={selectedIndex}
        />
      ) : null}
      <Box>
        <Text color="yellow">&gt; </Text>
        <TextInput
          key={completionId}
          value={value}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder="Type to translate. /help for commands."
        />
      </Box>
    </Box>
  );
};
