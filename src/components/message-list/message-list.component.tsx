import React from "react";

import { Box } from "ink";

import { MessageItem } from "@/components/message";

import { MessageListProps } from "./message-list.type";

// ! Plain map(), not <Static>: history is mutable (/clear, model-error replace,
// MAX_MESSAGES head-trim), and <Static> only ever appends — it never re-renders
// or drops already-printed rows, which silently breaks all three. The pending
// state is the empty bot card (spinner rendered inside MessageItem), so there is
// no separate loading row.
export const MessageList = ({ messages }: MessageListProps) => (
  <Box flexDirection="column" marginY={1} gap={1}>
    {messages.map((msg) => (
      <MessageItem key={msg.id} msg={msg} />
    ))}
  </Box>
);
