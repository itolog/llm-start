import React from "react";
import { Text } from "ink";
import { MessageItemProps } from "./message.type";

export const MessageItem = ({ msg }: MessageItemProps) => (
  <Text>
    <Text color={msg.role === "Bot" ? "cyan" : "magenta"} bold>
      {msg.role}:{" "}
    </Text>
    {msg.text}
  </Text>
);
