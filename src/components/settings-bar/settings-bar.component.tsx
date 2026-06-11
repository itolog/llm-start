import React from "react";
import { Text, Box } from "ink";
import { SettingsBarProps } from "./settings-bar.type";

export const SettingsBar = ({ fromLang, toLang }: SettingsBarProps) => (
  <Box backgroundColor="gray">
    <Text>
      {" "}
      Settings: {fromLang} ➔ {toLang}{" "}
    </Text>
  </Box>
);
