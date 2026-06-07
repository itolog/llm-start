import React from "react";
import { Text, Box } from "ink";
import Spinner from "ink-spinner";

export const LoadingIndicator = () => (
  <Box flexDirection="row" gap={1}>
    <Text color={"yellowBright"}>
      <Spinner /> Translating <Spinner />
    </Text>
  </Box>
);
