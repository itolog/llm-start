import React from "react";

import { Box } from "ink";

import { LoadingIndicator } from "@/components/loading-indicator";
import { MessageItem } from "@/components/message";

import { MessageListProps } from "./message-list.type";

// Plain map(), not <Static>: history is mutable (/clear, model-error replace,
// MAX_MESSAGES head-trim), and <Static> only ever appends — it never re-renders
// or drops already-printed rows, which silently breaks all three.
export const MessageList = ({ messages, isLoading }: MessageListProps) => (
  <Box flexDirection="column" marginY={1}>
    {messages.map((msg) => (
      <MessageItem key={msg.id} msg={msg} />
    ))}
    {isLoading && <LoadingIndicator />}
  </Box>
);
