import React from "react";
import { Box } from "ink";
import { Message } from "../types/message.js";
import { MessageItem } from "./Message.js";
import { LoadingIndicator } from "./LoadingIndicator.js";

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export const MessageList = ({ messages, isLoading }: MessageListProps) => (
  <Box flexDirection="column" marginY={1}>
    {messages.map((msg) => (
      <MessageItem key={msg.id} msg={msg} />
    ))}
    {isLoading && <LoadingIndicator />}
  </Box>
);
