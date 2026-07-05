import React, { useState } from "react";

import { Box, Text, useInput } from "ink";

import { TempPickerProps } from "./temp-picker.type";

const MIN = 0;
const MAX = 2;
const STEP = 0.1;
const BAR_WIDTH = 20;

const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));
// Round to 1 decimal to avoid float drift (0.30000000000000004).
const round1 = (v: number) => Math.round(v * 10) / 10;

// Interactive temperature stepper shown in place of the InputBar for bare
// `/temp`. ←/→ adjust by 0.1 (clamped 0–2); Enter applies, Esc cancels.
export const TempPicker = ({
  initial,
  onSelect,
  onCancel,
}: TempPickerProps) => {
  const [value, setValue] = useState(round1(clamp(initial)));

  useInput((_input, key) => {
    if (key.leftArrow) setValue((v) => round1(clamp(v - STEP)));
    else if (key.rightArrow) setValue((v) => round1(clamp(v + STEP)));
    else if (key.return) onSelect(value);
    else if (key.escape) onCancel();
  });

  const filled = Math.round((value / MAX) * BAR_WIDTH);
  const bar = "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);

  return (
    <Box flexDirection="column">
      <Text dimColor>Temperature (←/→ · Enter · Esc)</Text>
      <Box>
        <Text>{"  ◀ "}</Text>
        <Text color="cyan" bold>
          {value.toFixed(1)}
        </Text>
        <Text>{" ▶  "}</Text>
        <Text dimColor>[{bar}]</Text>
      </Box>
    </Box>
  );
};
