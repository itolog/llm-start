import React from "react";

import { Box, Text } from "ink";

import { PillProps } from "./pill.type";

export const Pill = ({ label, value, color }: PillProps) => (
  <Box>
    <Text backgroundColor={color} color="black" bold>
      {" "}
      {label}{" "}
    </Text>
    <Text color={color}> {value}</Text>
  </Box>
);
