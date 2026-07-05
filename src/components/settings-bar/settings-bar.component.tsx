import React from "react";

import { Box, Text } from "ink";

import { SettingsBarProps } from "./settings-bar.type";

export const SettingsBar = ({
  fromLang,
  toLang,
  model,
  temp,
}: SettingsBarProps) => (
  <Box backgroundColor="gray">
    <Text>
      {" "}
      Settings: {fromLang} ➔ {toLang} │ {model} @ temp {temp}{" "}
    </Text>
  </Box>
);
