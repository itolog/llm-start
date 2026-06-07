import React from "react";
import { Text, Box } from "ink";
import TextInput from "ink-text-input";

interface InputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
}

export const InputBar = ({ value, onChange, onSubmit }: InputBarProps) => (
  <Box>
    <Text color="yellow">&gt; </Text>
    <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
  </Box>
);
