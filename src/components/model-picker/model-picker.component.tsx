import React from "react";

import { Box, Text, useInput } from "ink";
import SelectInput from "ink-select-input";

import { ModelPickerProps } from "./model-picker.type";

// Interactive picker shown in place of the InputBar when `/model` is typed with
// no argument. Arrow keys + Enter select; Esc cancels.
export const ModelPicker = ({
  items,
  onSelect,
  onCancel,
}: ModelPickerProps) => {
  useInput((_input, key) => {
    if (key.escape) onCancel();
  });

  const selectItems = items.map((model) => ({ label: model, value: model }));

  return (
    <Box flexDirection="column">
      <Text dimColor>Select a model (↑↓ · Enter · Esc to cancel):</Text>
      <SelectInput
        items={selectItems}
        onSelect={(item) => onSelect(item.value)}
      />
    </Box>
  );
};
