import React from "react";
import { Text, Box } from "ink";

interface SettingsBarProps {
  fromLang: string;
  toLang: string;
}

export const SettingsBar = ({ fromLang, toLang }: SettingsBarProps) => (
  <Box backgroundColor="gray">
    <Text>
      {" "}
      Settings: {fromLang} ➔ {toLang}{" "}
    </Text>
  </Box>
);
