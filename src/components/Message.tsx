import React from "react";
import { Text } from "ink";
import { Message } from "../types/message.js";

export const MessageItem = ({ msg }: { msg: Message }) => (
  <Text>
    <Text color={msg.role === "Bot" ? "cyan" : "magenta"} bold>
      {msg.role}:{" "}
    </Text>
    {msg.text}
  </Text>
);
