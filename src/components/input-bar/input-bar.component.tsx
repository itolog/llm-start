import React from "react";

import { Box, Text } from "ink";
import TextInput from "ink-text-input";

import { InputBarProps } from "./input-bar.type";

export const InputBar = ({ value, onChange, onSubmit }: InputBarProps) => (
  <Box>
    <Text color="yellow">&gt; </Text>
    <TextInput
      value={value}
      onChange={onChange}
      onSubmit={onSubmit}
      placeholder="Type to translate. /help for commands."
    />
  </Box>
);
