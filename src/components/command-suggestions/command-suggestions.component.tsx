import React from "react";

import { Box, Text } from "ink";

import { CommandSuggestionsProps } from "./command-suggestions.type";

// Live-filtered dropdown shown below the prompt while a `/`-command is being
// typed. Mirrors the CommandsHelp row layout (aligned usage column + dimmed
// description) so the two command lists read the same; the active row is
// inverted instead of accent-colored.
export const CommandSuggestions = ({
  suggestions,
  selectedIndex,
}: CommandSuggestionsProps) => {
  const width = Math.max(...suggestions.map((c) => c.usage.length));

  return (
    <Box flexDirection="column">
      {suggestions.map(({ name, usage, description }, index) => {
        const isSelected = index === selectedIndex;

        return (
          <Box key={name}>
            <Box width={width + 2}>
              <Text color="cyan" bold inverse={isSelected}>
                {` ${usage} `}
              </Text>
            </Box>
            <Text dimColor>{` ${description}`}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
