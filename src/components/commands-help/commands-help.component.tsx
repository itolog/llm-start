import React from "react";

import { Box, Text } from "ink";

import { COMMANDS } from "./commands-help.model";

// Renders the command reference as an aligned, highlighted table: the command
// token in the accent color, its args and description dimmed. Used for the
// welcome message and `/help` (a message with kind "commands").
export const CommandsHelp = () => {
  const width = Math.max(...COMMANDS.map((c) => c.usage.length));

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text bold>Commands:</Text>
      {COMMANDS.map(({ usage, description }) => {
        const [command, ...argParts] = usage.split(" ");
        const args = argParts.join(" ");

        return (
          <Box key={usage}>
            {/* Fixed-width cell keeps descriptions aligned regardless of the
                per-token styling above. */}
            <Box width={width}>
              <Text color="cyan" bold>
                {command}
              </Text>
              {args ? <Text dimColor> {args}</Text> : null}
            </Box>
            <Text dimColor>{`   ${description}`}</Text>
          </Box>
        );
      })}
    </Box>
  );
};
