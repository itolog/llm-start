import React from "react";

import { Box } from "ink";

import { Pill } from "./components/pill";
import { SettingsBarProps } from "./settings-bar.type";

export const SettingsBar = ({
  fromLang,
  toLang,
  model,
  temp,
}: SettingsBarProps) => (
  <Box flexWrap="wrap" columnGap={2}>
    <Pill label="LANG" value={`${fromLang} → ${toLang}`} color="cyan" />
    <Pill label="MODEL" value={model} color="magenta" />
    <Pill label="TEMP" value={String(temp)} color="yellow" />
  </Box>
);
