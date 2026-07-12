import React, { useState } from "react";

import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

import { CommandSuggestions } from "@/components/command-suggestions";

import { InputBarProps } from "./input-bar.type";
import { suggestCommands } from "./utils/suggest-commands";

export const InputBar = ({ value, onChange, onSubmit }: InputBarProps) => {
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
      if (key.upArrow) {
        setSelectedIndex(
          (i) => (i - 1 + suggestions.length) % suggestions.length,
        );
      } else if (key.downArrow) {
        setSelectedIndex((i) => (i + 1) % suggestions.length);
      } else if (key.tab) {
        complete();
      } else if (key.escape) {
        setDismissed(true);
      }
    },
    { isActive: isOpen },
  );

  const handleSubmit = () => {
    if (isOpen) {
      complete();
    } else {
      onSubmit();
    }
  };

  // The dropdown renders BELOW the prompt (not above): the frame grows and
  // shrinks from its bottom edge, so the prompt never jumps and closing the
  // list leaves no stale blank region where taller content used to be.
  return (
    <Box flexDirection="column">
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
      {isOpen ? (
        <CommandSuggestions
          suggestions={suggestions}
          selectedIndex={selectedIndex}
        />
      ) : null}
    </Box>
  );
};
