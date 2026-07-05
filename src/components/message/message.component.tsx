import React from "react";

import { Box, Text } from "ink";

import { LoadingIndicator } from "@/components/loading-indicator";

import { MessageItemProps } from "./message.type";

// Per-role accent color for the card border + role label.
const ROLE_COLOR = { You: "magenta", Bot: "cyan" } as const;

const pad = (n: number) => String(n).padStart(2, "0");
const formatTime = (ms: number) => {
  const date = new Date(ms);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const MessageItem = ({ msg }: MessageItemProps) => (
  <Box
    flexDirection="column"
    borderStyle="round"
    borderColor={ROLE_COLOR[msg.role]}
    paddingX={1}>
    {/* Header row: role on the left, timestamp on the right. */}
    <Box justifyContent="space-between">
      <Text color={ROLE_COLOR[msg.role]} bold>
        {msg.role}
      </Text>
      <Text dimColor>{formatTime(msg.createdAt)}</Text>
    </Box>
    {/* An empty bot card is the pending translation — show the spinner inside
        it (it fills with streamed tokens), instead of a separate loading row. */}
    {msg.text ? <Text>{msg.text}</Text> : <LoadingIndicator />}
  </Box>
);
