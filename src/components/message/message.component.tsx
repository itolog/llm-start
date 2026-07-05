import React from "react";

import { TitledBox } from "@mishieck/ink-titled-box";
import { Text } from "ink";

import { LoadingIndicator } from "@/components/loading-indicator";

import { MessageItemProps } from "./message.type";

// Per-role accent color for the card border + title.
const ROLE_COLOR = { You: "magenta", Bot: "cyan" } as const;

export const MessageItem = ({ msg }: MessageItemProps) => (
  <TitledBox
    titles={[msg.role]}
    borderStyle="round"
    borderColor={ROLE_COLOR[msg.role]}
    paddingX={1}
    flexDirection="column">
    {/* An empty bot card is the pending translation — show the spinner inside
        it (it fills with streamed tokens), instead of a separate loading row. */}
    {msg.text ? <Text>{msg.text}</Text> : <LoadingIndicator />}
  </TitledBox>
);
